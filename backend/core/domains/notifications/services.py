# backend/core/domains/notifications/services.py
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, Count
from django.template import Context, Template
from django.utils import timezone

from .exceptions import (
    InvalidNotificationDataException,
    NotificationNotFoundException,
    NotificationPreferenceNotFoundException,
    NotificationTypeNotFoundException,
)
from .security import (
    NotificationSecurityService,
    NotificationRateLimiter,
    NotificationContentValidator,
)
from .models import (
    Notification,
    NotificationDigest,
    NotificationPreference,
    NotificationType,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class NotificationService:
    """Enhanced service for handling notification operations"""

    @staticmethod
    def get_notifications(
        user, 
        is_read: Optional[bool] = None, 
        notification_type: Optional[str] = None,
        category: Optional[str] = None,
        limit: Optional[int] = None
    ):
        """Get notifications for a user with filtering"""
        query = Q(recipient=user)
        
        if is_read is not None:
            query &= Q(is_read=is_read)
            
        if notification_type is not None:
            query &= Q(notification_type__code=notification_type)
            
        if category is not None:
            query &= Q(notification_type__category=category)
            
        notifications = Notification.objects.filter(query).select_related(
            'notification_type', 'recipient', 'event', 'client'
        ).order_by('-created_at')
        
        if limit:
            notifications = notifications[:limit]
            
        return notifications
    
    @staticmethod
    def get_notification_by_id(notification_id: int, user=None):
        """Get a notification by ID, optionally filtered by user"""
        query = Q(id=notification_id)
        if user:
            query &= Q(recipient=user)
            
        try:
            return Notification.objects.select_related(
                'notification_type', 'recipient', 'event', 'client'
            ).get(query)
        except Notification.DoesNotExist:
            raise NotificationNotFoundException()
    
    @staticmethod
    def mark_as_read(notification_id: int, user=None):
        """Mark a notification as read"""
        with transaction.atomic():
            notification = NotificationService.get_notification_by_id(notification_id, user)
            notification.mark_as_read()
            return notification
    
    @staticmethod
    def mark_as_unread(notification_id: int, user=None):
        """Mark a notification as unread"""
        with transaction.atomic():
            notification = NotificationService.get_notification_by_id(notification_id, user)
            if notification.is_read:
                notification.is_read = False
                notification.read_at = None
                notification.save(update_fields=['is_read', 'read_at', 'updated_at'])
            return notification
    
    @staticmethod
    def mark_all_as_read(user):
        """Mark all notifications as read for a user"""
        with transaction.atomic():
            now = timezone.now()
            updated = Notification.objects.filter(
                recipient=user, 
                is_read=False
            ).update(
                is_read=True, 
                read_at=now,
                updated_at=now
            )
            return updated
    
    @staticmethod
    def delete_notification(notification_id: int, user=None):
        """Delete a notification"""
        notification = NotificationService.get_notification_by_id(notification_id, user)
        notification.delete()
        return True
    
    @staticmethod
    def create_notification(
        recipient, 
        notification_type_code: str, 
        context: Optional[Dict[str, Any]] = None,
        delivery_methods: Optional[List[str]] = None,
        event=None,
        client=None,
        use_async: bool = True
    ):
        """
        Create and deliver a new notification
        
        Args:
            recipient: User to receive the notification
            notification_type_code: Code of the notification type
            context: Dictionary of context variables for templates
            delivery_methods: List of delivery methods to force (overrides preferences)
            event: Related event object
            client: Related client object
            use_async: Whether to process asynchronously (default True)
        
        Returns:
            Created notification object or async task result if use_async=True
        """
        if not context:
            context = {}
        
        # Security: Rate limiting check
        can_create, limit_message = NotificationRateLimiter.check_creation_limit(
            user_id=recipient.id,
            notification_type_code=notification_type_code
        )
        
        if not can_create:
            logger.warning(f"Rate limit exceeded for user {recipient.id}: {limit_message}")
            raise InvalidNotificationDataException(f"Rate limit exceeded: {limit_message}")
        
        # If async processing is enabled and we're not in testing mode
        if use_async and not getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            try:
                # Import tasks here to avoid circular imports
                from .tasks import create_notification_async
                
                # Queue async task
                task_result = create_notification_async.delay(
                    recipient_id=recipient.id,
                    notification_type_code=notification_type_code,
                    context=context,
                    delivery_methods=delivery_methods,
                    event_id=event.id if event else None,
                    client_id=client.id if client else None
                )
                
                logger.info(f"Queued async notification creation: task_id={task_result.id}")
                return task_result
                
            except ImportError:
                logger.warning("Celery not available, falling back to synchronous processing")
            except Exception as e:
                logger.warning(f"Async task failed, falling back to sync: {str(e)}")
            
        # Get notification type
        try:
            notification_type = NotificationType.objects.get(
                code=notification_type_code, 
                is_active=True
            )
        except NotificationType.DoesNotExist:
            raise NotificationTypeNotFoundException(
                f"Notification type with code {notification_type_code} not found"
            )
            
        # Get or create user notification preferences
        preferences = NotificationService.get_or_create_user_preferences(recipient.id)
        
        # Determine delivery methods
        if delivery_methods:
            # Use forced delivery methods
            enabled_methods = delivery_methods
        else:
            # Check user preferences for each method
            enabled_methods = []
            
            if preferences.is_notification_enabled(notification_type, 'in_app'):
                enabled_methods.append('in_app')
                
            if preferences.is_notification_enabled(notification_type, 'email'):
                enabled_methods.append('email')
                
            if preferences.is_notification_enabled(notification_type, 'sms'):
                enabled_methods.append('sms')
        
        # If no delivery methods are enabled and it's not a system notification, skip
        if not enabled_methods and not notification_type.is_system:
            logger.info(f"Skipping notification {notification_type_code} for {recipient.email} - no enabled delivery methods")
            return None
        
        # Security: Sanitize context data
        sanitized_context = NotificationSecurityService.validate_context_data(context)
        
        # Prepare context with additional data
        enhanced_context = {
            **sanitized_context,
            'recipient_name': recipient.get_display_name(),
            'recipient_first_name': recipient.first_name,
            'recipient_last_name': recipient.last_name,
            'site_name': getattr(settings, 'SITE_NAME', 'LifePlace'),
        }
        
        # Add event context if provided
        if event:
            enhanced_context.update({
                'event_id': event.id,
                'event_name': event.name or f"{event.event_type} Event",
                'event_start_date': event.start_date.isoformat() if event.start_date else None,
            })
            
        # Add client context if provided
        if client:
            enhanced_context.update({
                'client_id': client.id,
                'client_name': client.get_display_name(),
                'client_email': client.email,
            })
        
        # Render templates with context
        template_context = Context(enhanced_context)
        
        try:
            raw_title = Template(notification_type.default_title_template).render(template_context)
            raw_content = Template(notification_type.default_content_template).render(template_context)
            
            # Security: Sanitize rendered content
            title = NotificationSecurityService.sanitize_title(raw_title)
            content = NotificationSecurityService.sanitize_content(raw_content)
            action_url = NotificationSecurityService.validate_action_url(context.get('action_url', ''))
            
            # Security: Validate final notification data
            notification_data = {
                'title': title,
                'content': content,
                'action_url': action_url or ''
            }
            
            is_valid, validation_errors = NotificationContentValidator.validate_notification_data(notification_data)
            if not is_valid:
                logger.warning(f"Notification validation failed: {validation_errors}")
                raise InvalidNotificationDataException(f"Content validation failed: {'; '.join(validation_errors)}")
            
        except Exception as e:
            logger.error(f"Error rendering notification template: {str(e)}")
            raise InvalidNotificationDataException(f"Template rendering error: {str(e)}")
        
        # Create the notification
        with transaction.atomic():
            notification = Notification.objects.create(
                recipient=recipient,
                notification_type=notification_type,
                title=title,
                content=content,
                action_url=action_url or '',
                context_data=enhanced_context,
                event=event,
                client=client,
                expires_at=context.get('expires_at')
            )
            
            # Deliver via enabled methods
            for method in enabled_methods:
                try:
                    if method == 'in_app':
                        # In-app notification is already created
                        notification.add_delivery_method('in_app', success=True)
                        
                    elif method == 'email':
                        NotificationService._send_email_notification(
                            notification, notification_type, enhanced_context
                        )
                        
                    elif method == 'sms':
                        NotificationService._send_sms_notification(
                            notification, notification_type, enhanced_context
                        )
                        
                except Exception as e:
                    logger.error(f"Failed to deliver notification via {method}: {str(e)}")
                    notification.add_delivery_method(method, success=False, error=str(e))
            
            # Security: Record creation for rate limiting
            NotificationRateLimiter.record_creation(
                user_id=recipient.id,
                notification_type_code=notification_type_code,
                title=title
            )
            
            logger.info(f"Created notification {notification_type_code} for {recipient.email}")
            return notification
    
    @staticmethod
    def _send_email_notification(notification, notification_type, context):
        """Send email notification using the communication service"""
        try:
            from core.domains.communications.services import CommunicationService
            from core.domains.communications.context_service import (
                CommunicationContextService, ContextType
            )

            communication_service = CommunicationService()

            # Render email template
            if notification_type.default_email_template:
                email_body = Template(notification_type.default_email_template).render(Context(context))
            else:
                # Fallback to content with basic HTML wrapper
                email_body = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>{notification.title}</h2>
                    <div style="margin: 20px 0;">
                        {notification.content.replace('\n', '<br>')}
                    </div>
                    {f'<p><a href="{context.get("action_url", "")}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Details</a></p>' if context.get("action_url") else ''}
                </div>
                """

            # Send via communication service using config
            from core.domains.communications.config import communication_config

            try:
                email_template_name = communication_config.get_template_name('EMAIL_LAYOUT')
            except ValueError:
                # Fallback to notification-specific template
                email_template_name = communication_config.get_template_name('NOTIFICATION_EMAIL')

            # Generate base context using the unified context service
            base_context = CommunicationContextService.generate_context(
                context_type=ContextType.NOTIFICATION,
                user=notification.recipient,
                notification=notification,
            )

            # Merge with caller context and add custom fields
            context_data = {
                **base_context,
                **context,
                'custom_subject': notification.title,
                'custom_body': email_body,
            }

            record = communication_service.send_communication_by_template(
                template_name=email_template_name,
                recipient=notification.recipient.email,
                context_data=context_data,
                sent_by=None  # System notification
            )
            
            if record:
                notification.add_delivery_method('email', success=True)
                logger.info(f"Email notification sent successfully to {notification.recipient.email}")
            else:
                raise Exception("Communication service returned None")
                
        except ImportError:
            logger.warning("Communication service not available for email notifications")
            raise Exception("Email service not available")
        except Exception as e:
            logger.error(f"Failed to send email notification: {str(e)}")
            raise e
    
    @staticmethod
    def _send_sms_notification(notification, notification_type, context):
        """Send SMS notification using the communication service"""
        try:
            from core.domains.communications.services import CommunicationService
            from core.domains.communications.context_service import (
                CommunicationContextService, ContextType
            )

            communication_service = CommunicationService()

            # Render SMS template (limited to 160 characters)
            if notification_type.default_sms_template:
                sms_content = Template(notification_type.default_sms_template).render(Context(context))
            else:
                # Fallback to truncated title
                sms_content = f"{notification.title[:140]}... - LifePlace"

            # Get user's phone number from profile
            phone_number = getattr(notification.recipient.profile, 'phone', None) if hasattr(notification.recipient, 'profile') else None

            if not phone_number:
                raise Exception("Recipient has no phone number configured")

            # Send via communication service using config
            from core.domains.communications.config import communication_config

            try:
                sms_template_name = communication_config.get_template_name('SMS_LAYOUT')
            except ValueError:
                # Fallback to notification-specific template
                sms_template_name = communication_config.get_template_name('NOTIFICATION_SMS')

            # Generate base context using the unified context service
            base_context = CommunicationContextService.generate_context(
                context_type=ContextType.NOTIFICATION,
                user=notification.recipient,
                notification=notification,
            )

            # Merge with caller context and add custom fields
            context_data = {
                **base_context,
                **context,
                'custom_body': sms_content,
            }

            record = communication_service.send_communication_by_template(
                template_name=sms_template_name,
                recipient=phone_number,
                context_data=context_data,
                sent_by=None  # System notification
            )
            
            if record:
                notification.add_delivery_method('sms', success=True)
                logger.info(f"SMS notification sent successfully to {phone_number}")
            else:
                raise Exception("Communication service returned None")
                
        except ImportError:
            logger.warning("Communication service not available for SMS notifications")
            raise Exception("SMS service not available")
        except Exception as e:
            logger.error(f"Failed to send SMS notification: {str(e)}")
            raise e
    
    @staticmethod
    def bulk_action(user_id: int, notification_ids: List[int], action: str):
        """Perform bulk actions on multiple notifications"""
        if not notification_ids:
            raise InvalidNotificationDataException("No notification IDs provided")
            
        notifications = Notification.objects.filter(
            recipient_id=user_id,
            id__in=notification_ids
        )
        
        if not notifications.exists():
            raise NotificationNotFoundException("No matching notifications found")
            
        with transaction.atomic():
            if action == 'mark_read':
                now = timezone.now()
                return notifications.filter(is_read=False).update(
                    is_read=True, 
                    read_at=now, 
                    updated_at=now
                )
            elif action == 'mark_unread':
                now = timezone.now()
                return notifications.filter(is_read=True).update(
                    is_read=False, 
                    read_at=None, 
                    updated_at=now
                )
            elif action == 'delete':
                count = notifications.count()
                notifications.delete()
                return count
    
    @staticmethod
    def get_notification_counts(user_id: int):
        """Get detailed notification counts for a user"""
        base_query = Notification.objects.filter(recipient_id=user_id)
        
        total = base_query.count()
        unread = base_query.filter(is_read=False).count()
        
        # Count by category
        by_category = {}
        categories = base_query.values('notification_type__category').annotate(
            count=Count('id')
        )
        for item in categories:
            by_category[item['notification_type__category']] = item['count']
        
        # Count by priority
        by_priority = {}
        priorities = base_query.values('notification_type__priority').annotate(
            count=Count('id')
        )
        for item in priorities:
            by_priority[item['notification_type__priority']] = item['count']
        
        return {
            'total': total,
            'unread': unread,
            'by_category': by_category,
            'by_priority': by_priority
        }
    
    @staticmethod
    def get_or_create_user_preferences(user_id: int):
        """Get or create notification preferences for a user"""
        try:
            return NotificationPreference.objects.get(user_id=user_id)
        except NotificationPreference.DoesNotExist:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(id=user_id)
                return NotificationPreference.objects.create(user=user)
            except User.DoesNotExist:
                raise NotificationPreferenceNotFoundException("User not found")
    
    @staticmethod
    def update_user_preferences(user_id: int, preference_data: Dict[str, Any]):
        """Update notification preferences for a user"""
        with transaction.atomic():
            preferences = NotificationService.get_or_create_user_preferences(user_id)
            
            # Update boolean fields
            boolean_fields = [
                'email_enabled', 'sms_enabled', 'in_app_enabled',
                'system_email', 'system_sms', 'system_in_app',
                'event_email', 'event_sms', 'event_in_app',
                'task_email', 'task_sms', 'task_in_app',
                'payment_email', 'payment_sms', 'payment_in_app',
                'client_email', 'client_sms', 'client_in_app',
                'contract_email', 'contract_sms', 'contract_in_app',
                'workflow_email', 'workflow_sms', 'workflow_in_app',
                'communication_email', 'communication_sms', 'communication_in_app',
                'marketing_email', 'marketing_sms', 'marketing_in_app',
                'quiet_hours_enabled'
            ]
            
            for field in boolean_fields:
                if field in preference_data:
                    setattr(preferences, field, preference_data[field])
            
            # Update time fields
            if 'quiet_hours_start' in preference_data:
                preferences.quiet_hours_start = preference_data['quiet_hours_start']
            if 'quiet_hours_end' in preference_data:
                preferences.quiet_hours_end = preference_data['quiet_hours_end']
            
            # Update digest frequency
            if 'digest_frequency' in preference_data:
                preferences.digest_frequency = preference_data['digest_frequency']
            
            # Update disabled types
            if 'disabled_types' in preference_data:
                preferences.disabled_types.clear()
                if preference_data['disabled_types']:
                    notification_types = NotificationType.objects.filter(
                        id__in=preference_data['disabled_types'],
                        is_active=True
                    )
                    preferences.disabled_types.add(*notification_types)
            
            preferences.save()
            return preferences
    
    @staticmethod
    def cleanup_old_notifications(days: int = 90):
        """Clean up old read notifications"""
        cutoff_date = timezone.now() - timedelta(days=days)
        
        deleted_count = Notification.objects.filter(
            created_at__lt=cutoff_date,
            is_read=True
        ).delete()[0]
        
        logger.info(f"Cleaned up {deleted_count} old notifications")
        return deleted_count
    
    @staticmethod
    def auto_expire_notifications():
        """Mark expired notifications as expired"""
        now = timezone.now()
        
        updated_count = Notification.objects.filter(
            expires_at__lt=now,
            is_expired=False
        ).update(is_expired=True, updated_at=now)
        
        logger.info(f"Marked {updated_count} notifications as expired")
        return updated_count


class NotificationTypeService:
    """Service for managing notification types"""
    
    @staticmethod
    def get_all_notification_types(category: Optional[str] = None, is_active: Optional[bool] = None):
        """Get all notification types with optional filtering"""
        queryset = NotificationType.objects.all()
        
        if category:
            queryset = queryset.filter(category=category)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
            
        return queryset.order_by('category', 'name')
    
    @staticmethod
    def get_notification_type_by_code(code: str):
        """Get notification type by code"""
        try:
            return NotificationType.objects.get(code=code, is_active=True)
        except NotificationType.DoesNotExist:
            raise NotificationTypeNotFoundException()
    
    @staticmethod
    def create_notification_type(type_data: Dict[str, Any]):
        """Create a new notification type"""
        return NotificationType.objects.create(**type_data)
    
    @staticmethod
    def update_notification_type(type_id: int, type_data: Dict[str, Any]):
        """Update an existing notification type"""
        try:
            notification_type = NotificationType.objects.get(id=type_id)
        except NotificationType.DoesNotExist:
            raise NotificationTypeNotFoundException()
        
        for key, value in type_data.items():
            setattr(notification_type, key, value)
        
        notification_type.save()
        return notification_type


class NotificationStatsService:
    """Service for notification analytics and statistics"""
    
    @staticmethod
    def get_user_stats(user_id: int, days: int = 30):
        """Get notification statistics for a user"""
        start_date = timezone.now() - timedelta(days=days)
        
        notifications = Notification.objects.filter(
            recipient_id=user_id,
            created_at__gte=start_date
        )
        
        total_sent = notifications.count()
        total_read = notifications.filter(is_read=True).count()
        read_rate = (total_read / total_sent * 100) if total_sent > 0 else 0
        
        # Delivery rates by method
        delivery_rates = {}
        for method in ['email', 'sms', 'in_app']:
            successful = notifications.filter(delivered_via__contains=[method]).count()
            attempted = notifications.filter(
                delivery_attempts__has_key=method
            ).count()
            delivery_rates[method] = (successful / attempted * 100) if attempted > 0 else 0
        
        # Popular notification types
        popular_types = notifications.values(
            'notification_type__name', 'notification_type__code'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        return {
            'period': f"{days} days",
            'total_sent': total_sent,
            'total_read': total_read,
            'read_rate': round(read_rate, 2),
            'delivery_rates': delivery_rates,
            'popular_types': list(popular_types)
        }
    
    @staticmethod
    def get_system_stats(days: int = 30):
        """Get system-wide notification statistics"""
        start_date = timezone.now() - timedelta(days=days)
        
        notifications = Notification.objects.filter(created_at__gte=start_date)
        
        total_sent = notifications.count()
        total_users = notifications.values('recipient').distinct().count()
        total_read = notifications.filter(is_read=True).count()
        
        # Stats by category
        by_category = notifications.values('notification_type__category').annotate(
            total=Count('id'),
            read=Count('id', filter=Q(is_read=True))
        ).order_by('-total')
        
        # Stats by delivery method
        delivery_stats = {}
        for method in ['email', 'sms', 'in_app']:
            delivered = notifications.filter(delivered_via__contains=[method]).count()
            delivery_stats[method] = delivered
        
        return {
            'period': f"{days} days",
            'total_sent': total_sent,
            'total_users': total_users,
            'total_read': total_read,
            'read_rate': round((total_read / total_sent * 100) if total_sent > 0 else 0, 2),
            'by_category': list(by_category),
            'delivery_stats': delivery_stats
        }


class NotificationDigestService:
    """Service for handling notification digests"""
    
    @staticmethod
    def create_digest(user, frequency: str, period_start: datetime, period_end: datetime):
        """Create a notification digest for a user"""
        # Get notifications for the period
        notifications = Notification.objects.filter(
            recipient=user,
            created_at__gte=period_start,
            created_at__lt=period_end,
            is_read=False
        ).order_by('-created_at')
        
        if not notifications.exists():
            return None
        
        # Create digest
        digest = NotificationDigest.objects.create(
            user=user,
            frequency=frequency,
            period_start=period_start,
            period_end=period_end,
            notification_count=notifications.count()
        )
        
        # Add notifications to digest
        digest.notifications.add(*notifications)
        
        return digest
    
    @staticmethod
    def send_digest(digest_id: int):
        """Send a notification digest"""
        try:
            digest = NotificationDigest.objects.get(id=digest_id)
        except NotificationDigest.DoesNotExist:
            raise Exception("Digest not found")
        
        if digest.is_sent:
            return digest
        
        # Get user preferences
        preferences = NotificationService.get_or_create_user_preferences(digest.user.id)
        
        # Determine delivery methods
        delivery_methods = []
        if preferences.email_enabled:
            delivery_methods.append('email')
        if preferences.sms_enabled:
            delivery_methods.append('sms')
        
        # Send digest via enabled methods
        for method in delivery_methods:
            try:
                if method == 'email':
                    NotificationDigestService._send_email_digest(digest)
                elif method == 'sms':
                    NotificationDigestService._send_sms_digest(digest)
            except Exception as e:
                logger.error(f"Failed to send digest via {method}: {str(e)}")
        
        # Mark as sent
        digest.is_sent = True
        digest.sent_at = timezone.now()
        digest.delivery_methods = delivery_methods
        digest.save()
        
        return digest
    
    @staticmethod
    def _send_email_digest(digest):
        """Send email digest"""
        try:
            from core.domains.communications.services import CommunicationService
            from core.domains.communications.context_service import (
                CommunicationContextService, ContextType
            )

            communication_service = CommunicationService()

            # Prepare digest content
            notifications_list = []
            for notification in digest.notifications.all()[:10]:  # Limit to 10 for email
                notifications_list.append({
                    'title': notification.title,
                    'content': notification.content[:100] + '...' if len(notification.content) > 100 else notification.content,
                    'action_url': notification.action_url
                })

            # Create email content
            email_content = f"""
            <h2>Your {digest.get_frequency_display()} Notification Digest</h2>
            <p>You have {digest.notification_count} unread notifications:</p>
            <ul>
            """

            for notif in notifications_list:
                email_content += f"""
                <li>
                    <strong>{notif['title']}</strong><br>
                    {notif['content']}
                    {f'<br><a href="{notif["action_url"]}">View Details</a>' if notif['action_url'] else ''}
                </li>
                """

            email_content += "</ul>"

            if digest.notification_count > 10:
                email_content += f"<p>And {digest.notification_count - 10} more notifications...</p>"

            # Send via communication service using config
            from core.domains.communications.config import communication_config

            try:
                digest_template_name = communication_config.get_template_name('DIGEST_EMAIL')
            except ValueError:
                # Fallback to manual layout
                digest_template_name = communication_config.get_template_name('EMAIL_LAYOUT')

            # Generate base context using the unified context service
            # For digests, we skip validation since we don't have a single notification object
            base_context = CommunicationContextService.generate_context(
                context_type=ContextType.NOTIFICATION,
                user=digest.user,
                validate=False,  # No single notification for digest
            )

            # Merge with digest-specific context
            context_data = {
                **base_context,
                'custom_subject': f'Your {digest.get_frequency_display()} Notification Digest',
                'custom_body': email_content,
                'first_name': digest.user.first_name,
                'last_name': digest.user.last_name,
                'title': f'Your {digest.get_frequency_display()} Notification Digest',
                'content': f'You have {digest.notification_count} unread notifications',
            }

            record = communication_service.send_communication_by_template(
                template_name=digest_template_name,
                recipient=digest.user.email,
                context_data=context_data,
                sent_by=None
            )

            if not record:
                raise Exception("Failed to send digest email")

        except Exception as e:
            logger.error(f"Failed to send email digest: {str(e)}")
            raise e
    
    @staticmethod
    def _send_sms_digest(digest):
        """Send SMS digest summary"""
        try:
            from core.domains.communications.services import CommunicationService
            from core.domains.communications.context_service import (
                CommunicationContextService, ContextType
            )
            from core.domains.communications.config import communication_config

            communication_service = CommunicationService()

            # Get user's phone number
            phone_number = getattr(digest.user.profile, 'phone', None) if hasattr(digest.user, 'profile') else None

            if not phone_number:
                raise Exception("User has no phone number configured")

            # Create SMS content (limited)
            sms_content = f"You have {digest.notification_count} unread notifications. Check your portal for details. - LifePlace"

            # Send via communication service using config
            try:
                sms_template_name = communication_config.get_template_name('SMS_LAYOUT')
            except ValueError:
                # Fallback to notification SMS template
                sms_template_name = communication_config.get_template_name('NOTIFICATION_SMS')

            # Generate base context using the unified context service
            # For digests, we skip validation since we don't have a single notification object
            base_context = CommunicationContextService.generate_context(
                context_type=ContextType.NOTIFICATION,
                user=digest.user,
                validate=False,  # No single notification for digest
            )

            # Merge with digest-specific context
            context_data = {
                **base_context,
                'custom_body': sms_content,
                'first_name': digest.user.first_name,
                'title': 'Notification Digest',
                'content': f'You have {digest.notification_count} unread notifications',
            }

            record = communication_service.send_communication_by_template(
                template_name=sms_template_name,
                recipient=phone_number,
                context_data=context_data,
                sent_by=None
            )

            if not record:
                raise Exception("Failed to send digest SMS")
                
        except Exception as e:
            logger.error(f"Failed to send SMS digest: {str(e)}")
            raise e