# backend/core/domains/notifications/signals/user_signals.py
"""
User-related notification signals

Handles notifications for user creation, status changes, and preference management.
"""

import logging
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.apps import apps

from ..exceptions import InvalidNotificationDataException

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def create_notification_preferences(sender, instance, created, **kwargs):
    """Create default notification preferences for new users

    For admin users, ensures critical notification categories are always enabled.
    Admin notifications (new leads, events, payments) are operational and fall
    under "legitimate interest" for GDPR - they're not opt-in marketing emails.
    """
    if not created:
        return

    try:
        # Import here to avoid circular imports during app initialization
        NotificationPreference = apps.get_model('notifications', 'NotificationPreference')
        prefs = NotificationPreference.objects.create(user=instance)

        # For admin users, ensure critical notification categories are explicitly enabled
        # Model defaults should already have these as True, but we explicitly set them
        # to protect against any future changes to model defaults
        if instance.role == 'ADMIN':
            prefs.email_enabled = True
            prefs.event_email = True      # New events/leads - critical for business
            prefs.client_email = True     # New clients
            prefs.payment_email = True    # Payment notifications
            prefs.contract_email = True   # Contract notifications
            prefs.system_email = True     # System notifications
            prefs.task_email = True       # Task assignments
            prefs.save()
            logger.info(f"Created notification preferences for admin with critical emails enabled: {instance.email}")
        else:
            logger.info(f"Created notification preferences for user: {instance.email}")
    except LookupError:
        logger.warning("NotificationPreference model not found, skipping preference creation")
    except Exception as e:
        logger.error(f"Failed to create notification preferences for {instance.email}: {str(e)}")


@receiver(post_save, sender=User)
def user_notifications(sender, instance, created, **kwargs):
    """Generate notifications for user changes"""
    if not created and not hasattr(instance, '_previous_is_active'):
        return
        
    try:
        # Import service here to avoid circular imports
        from ..services import NotificationService
        
        if created:
            if instance.role == "CLIENT":
                logger.info(f"CLIENT created signal fired for user: {instance.id} - {instance.email}")
                
                # Notify admins about new client
                admin_users = User.objects.filter(role='ADMIN', is_active=True)
                for admin in admin_users:
                    try:
                        NotificationService.create_notification(
                            recipient=admin,
                            notification_type_code='CLIENT_CREATED',
                            context={
                                'client_id': instance.id,
                                'client_name': instance.get_display_name(),
                                'client_email': instance.email,
                                'action_url': f'/clients/{instance.id}',
                            },
                            client=instance
                        )
                    except InvalidNotificationDataException as e:
                        logger.warning(f"Notification rate-limited for admin {admin.email}: {str(e)}")
                    except Exception as e:
                        logger.error(f"Failed to create client notification for admin {admin.email}: {str(e)}")

            elif instance.role == "ADMIN":
                logger.info(f"ADMIN created signal fired for user: {instance.id} - {instance.email}")
                
                # Notify other admins about new admin
                other_admins = User.objects.filter(
                    role='ADMIN', 
                    is_active=True
                ).exclude(id=instance.id)
                
                for admin in other_admins:
                    try:
                        NotificationService.create_notification(
                            recipient=admin,
                            notification_type_code='ADMIN_ADDED',
                            context={
                                'admin_id': instance.id,
                                'admin_name': instance.get_display_name(),
                                'admin_email': instance.email,
                                'action_url': f'/settings/account/admin-users',
                            }
                        )
                    except InvalidNotificationDataException as e:
                        logger.warning(f"Notification rate-limited for admin {admin.email}: {str(e)}")
                    except Exception as e:
                        logger.error(f"Failed to create admin notification for {admin.email}: {str(e)}")
        
        # Handle status changes for existing users
        elif hasattr(instance, '_previous_is_active'):
            if instance._previous_is_active != instance.is_active:
                admin_users = User.objects.filter(role='ADMIN', is_active=True)
                notification_code = 'USER_REACTIVATED' if instance.is_active else 'USER_DEACTIVATED'
                
                for admin in admin_users:
                    try:
                        NotificationService.create_notification(
                            recipient=admin,
                            notification_type_code=notification_code,
                            context={
                                'user_id': instance.id,
                                'user_name': instance.get_display_name(),
                                'user_email': instance.email,
                                'user_role': instance.get_role_display(),
                                'action_url': f'/settings/account/admin-users' if instance.role == 'ADMIN' else f'/clients/{instance.id}',
                            }
                        )
                    except InvalidNotificationDataException as e:
                        logger.warning(f"Notification rate-limited for status change: {str(e)}")
                    except Exception as e:
                        logger.error(f"Failed to create user status notification: {str(e)}")
    
    except ImportError as e:
        logger.warning(f"Could not import NotificationService: {str(e)}")
    except Exception as e:
        logger.error(f"Error in user_notifications signal: {str(e)}")


@receiver(pre_save, sender=User)
def track_user_status_changes(sender, instance, **kwargs):
    """Track user status changes"""
    if instance.pk:
        try:
            previous = sender.objects.get(pk=instance.pk)
            instance._previous_is_active = previous.is_active
        except sender.DoesNotExist:
            instance._previous_is_active = None