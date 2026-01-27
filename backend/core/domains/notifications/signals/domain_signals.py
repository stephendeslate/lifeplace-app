# backend/core/domains/notifications/signals/domain_signals.py
"""
Cross-domain notification signals

Handles notifications for events, tasks, payments, contracts, and other domain changes.
These signals are connected dynamically when the respective models are available.
"""

import logging
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.apps import apps

User = get_user_model()
logger = logging.getLogger(__name__)


def connect_domain_signals():
    """Connect signals for other domains dynamically when they're available"""
    try:
        # Import service here to avoid circular imports
        from ..services import NotificationService
        
        # Event domain signals
        _connect_event_signals(NotificationService)
        
        # Task domain signals
        _connect_task_signals(NotificationService)
        
        # Contract domain signals
        _connect_contract_signals(NotificationService)
        
        # Payment domain signals
        _connect_payment_signals(NotificationService)
        
        # Communication domain signals
        _connect_communication_signals(NotificationService)
        
        # Client invitation signals
        _connect_client_invitation_signals(NotificationService)

        # Support/messaging signals
        _connect_support_signals(NotificationService)

        logger.info("Successfully connected all domain signals")
        
    except ImportError as e:
        logger.warning(f"Could not import NotificationService for domain signals: {str(e)}")
    except Exception as e:
        logger.error(f"Error connecting domain signals: {str(e)}")


def _connect_event_signals(NotificationService):
    """Connect event-related signals"""
    if not apps.is_installed('core.domains.events'):
        return
        
    try:
        Event = apps.get_model('events', 'Event')
        
        @receiver(post_save, sender=Event)
        def event_notifications(sender, instance, created, **kwargs):
            """Generate notifications for event changes"""
            try:
                if created:
                    # Notify admins about new event
                    admin_users = User.objects.filter(role='ADMIN', is_active=True)
                    for admin in admin_users:
                        try:
                            NotificationService.create_notification(
                                recipient=admin,
                                notification_type_code='EVENT_CREATED',
                                context={
                                    'event_id': instance.id,
                                    'event_name': instance.name or f"{getattr(instance, 'event_type', 'Event')}",
                                    'client_name': instance.client.get_display_name(),
                                    'event_date': instance.start_date.strftime('%B %d, %Y'),
                                    'action_url': f'/events/{instance.id}',
                                },
                                event=instance,
                                client=instance.client
                            )
                        except Exception as e:
                            logger.error(f"Failed to create event notification for admin {admin.email}: {str(e)}")
                
                else:
                    # Check for status changes
                    if hasattr(instance, '_previous_status') and instance._previous_status != instance.status:
                        if instance.status == 'CONFIRMED':
                            # Notify admins about event confirmation
                            admin_users = User.objects.filter(role='ADMIN', is_active=True)
                            for admin in admin_users:
                                try:
                                    NotificationService.create_notification(
                                        recipient=admin,
                                        notification_type_code='EVENT_CONFIRMED',
                                        context={
                                            'event_id': instance.id,
                                            'event_name': instance.name or f"{getattr(instance, 'event_type', 'Event')}",
                                            'client_name': instance.client.get_display_name(),
                                            'event_date': instance.start_date.strftime('%B %d, %Y'),
                                            'action_url': f'/events/{instance.id}',
                                        },
                                        event=instance,
                                        client=instance.client
                                    )
                                except Exception as e:
                                    logger.error(f"Failed to create event confirmation notification: {str(e)}")
                            
                            # Notify client about confirmation
                            try:
                                NotificationService.create_notification(
                                    recipient=instance.client,
                                    notification_type_code='YOUR_EVENT_CONFIRMED',
                                    context={
                                        'event_id': instance.id,
                                        'event_name': instance.name or f"{getattr(instance, 'event_type', 'Event')}",
                                        'event_date': instance.start_date.strftime('%B %d, %Y'),
                                        'action_url': f'/client/events/{instance.id}',
                                    },
                                    event=instance
                                )
                            except Exception as e:
                                logger.error(f"Failed to create client event confirmation notification: {str(e)}")
                        
                        elif instance.status == 'COMPLETED':
                            # Notify client about event completion
                            try:
                                NotificationService.create_notification(
                                    recipient=instance.client,
                                    notification_type_code='EVENT_COMPLETED',
                                    context={
                                        'event_id': instance.id,
                                        'event_name': instance.name or f"{getattr(instance, 'event_type', 'Event')}",
                                        'action_url': f'/client/events/{instance.id}',
                                    },
                                    event=instance
                                )
                            except Exception as e:
                                logger.error(f"Failed to create event completion notification: {str(e)}")
            
            except Exception as e:
                logger.error(f"Error in event_notifications signal: {str(e)}")

        @receiver(pre_save, sender=Event)
        def track_event_status_changes(sender, instance, **kwargs):
            """Track status changes for events"""
            if instance.pk:
                try:
                    previous = sender.objects.get(pk=instance.pk)
                    instance._previous_status = previous.status
                    instance._previous_stage_id = getattr(previous, 'current_stage_id', None)
                except sender.DoesNotExist:
                    instance._previous_status = None
                    instance._previous_stage_id = None

        # Workflow stage change notifications
        @receiver(post_save, sender=Event)
        def workflow_stage_notifications(sender, instance, created, **kwargs):
            """Generate notifications for workflow stage changes"""
            if created or not hasattr(instance, '_previous_stage_id'):
                return
                
            try:
                current_stage_id = getattr(instance, 'current_stage_id', None)
                if (instance._previous_stage_id != current_stage_id and 
                    hasattr(instance, 'current_stage') and instance.current_stage):
                    
                    # Notify admins about workflow progression
                    admin_users = User.objects.filter(role='ADMIN', is_active=True)
                    for admin in admin_users:
                        try:
                            NotificationService.create_notification(
                                recipient=admin,
                                notification_type_code='WORKFLOW_STAGE_CHANGED',
                                context={
                                    'event_id': instance.id,
                                    'event_name': instance.name or f"{getattr(instance, 'event_type', 'Event')}",
                                    'client_name': instance.client.get_display_name(),
                                    'new_stage': instance.current_stage.name,
                                    'workflow_name': getattr(instance.workflow_template, 'name', 'Custom Workflow') if hasattr(instance, 'workflow_template') and instance.workflow_template else 'Custom Workflow',
                                    'action_url': f'/events/{instance.id}',
                                },
                                event=instance,
                                client=instance.client
                            )
                        except Exception as e:
                            logger.error(f"Failed to create workflow stage notification: {str(e)}")
                    
                    # Notify client if stage is client-visible
                    if (hasattr(instance.current_stage, 'is_client_visible') and 
                        getattr(instance.current_stage, 'is_client_visible', False)):
                        try:
                            NotificationService.create_notification(
                                recipient=instance.client,
                                notification_type_code='EVENT_PROGRESS_UPDATE',
                                context={
                                    'event_name': instance.name or f"{getattr(instance, 'event_type', 'Event')}",
                                    'stage_name': instance.current_stage.name,
                                    'stage_description': getattr(instance.current_stage, 'description', ''),
                                    'action_url': f'/client/events/{instance.id}',
                                },
                                event=instance
                            )
                        except Exception as e:
                            logger.error(f"Failed to create client workflow notification: {str(e)}")
            
            except Exception as e:
                logger.error(f"Error in workflow_stage_notifications signal: {str(e)}")

    except LookupError:
        logger.info("Event model not found, skipping event signal connections")
    except Exception as e:
        logger.error(f"Failed to connect event signals: {str(e)}")


def _connect_task_signals(NotificationService):
    """Connect task-related signals"""
    if not apps.is_installed('core.domains.events'):  # Tasks are in events domain
        return
        
    try:
        EventTask = apps.get_model('events', 'EventTask')
        
        @receiver(post_save, sender=EventTask)
        def task_notifications(sender, instance, created, **kwargs):
            """Generate notifications for task changes"""
            try:
                if created and instance.assigned_to:
                    # Notify assigned user about new task
                    try:
                        NotificationService.create_notification(
                            recipient=instance.assigned_to,
                            notification_type_code='TASK_ASSIGNED',
                            context={
                                'task_id': instance.id,
                                'task_title': instance.title,
                                'event_name': instance.event.name or f"{getattr(instance.event, 'event_type', 'Event')}",
                                'due_date': instance.due_date.strftime('%B %d, %Y at %I:%M %p') if instance.due_date else 'No due date',
                                'priority': instance.get_priority_display() if hasattr(instance, 'get_priority_display') else 'Normal',
                                'action_url': f'/events/{instance.event.id}',
                            },
                            event=instance.event,
                            client=instance.event.client
                        )
                    except Exception as e:
                        logger.error(f"Failed to create task assignment notification: {str(e)}")
                
                else:
                    # Check for status changes
                    if hasattr(instance, '_previous_status') and instance._previous_status != instance.status:
                        if instance.status == 'COMPLETED':
                            # Notify client if task is visible to them
                            if hasattr(instance, 'is_visible_to_client') and instance.is_visible_to_client and instance.event.client:
                                try:
                                    NotificationService.create_notification(
                                        recipient=instance.event.client,
                                        notification_type_code='TASK_COMPLETED',
                                        context={
                                            'task_title': instance.title,
                                            'event_name': instance.event.name or f"{getattr(instance.event, 'event_type', 'Event')}",
                                            'action_url': f'/client/events/{instance.event.id}',
                                        },
                                        event=instance.event
                                    )
                                except Exception as e:
                                    logger.error(f"Failed to create task completion notification: {str(e)}")
                            
                            # Notify admins about task completion
                            admin_users = User.objects.filter(role='ADMIN', is_active=True)
                            for admin in admin_users:
                                try:
                                    NotificationService.create_notification(
                                        recipient=admin,
                                        notification_type_code='TASK_COMPLETED_ADMIN',
                                        context={
                                            'task_title': instance.title,
                                            'assigned_to': instance.assigned_to.get_display_name() if instance.assigned_to else 'Unassigned',
                                            'event_name': instance.event.name or f"{getattr(instance.event, 'event_type', 'Event')}",
                                            'client_name': instance.event.client.get_display_name(),
                                            'action_url': f'/events/{instance.event.id}',
                                        },
                                        event=instance.event,
                                        client=instance.event.client
                                    )
                                except Exception as e:
                                    logger.error(f"Failed to create admin task completion notification: {str(e)}")
            
            except Exception as e:
                logger.error(f"Error in task_notifications signal: {str(e)}")

        @receiver(pre_save, sender=EventTask)
        def track_task_status_changes(sender, instance, **kwargs):
            """Track status changes for tasks"""
            if instance.pk:
                try:
                    previous = sender.objects.get(pk=instance.pk)
                    instance._previous_status = getattr(previous, 'status', None)
                except sender.DoesNotExist:
                    instance._previous_status = None
    
    except LookupError:
        logger.info("EventTask model not found, skipping task signal connections")
    except Exception as e:
        logger.error(f"Failed to connect task signals: {str(e)}")


def _connect_contract_signals(NotificationService):
    """Connect contract-related signals"""
    if not apps.is_installed('core.domains.contracts'):
        return
        
    try:
        EventContract = apps.get_model('contracts', 'EventContract')
        
        @receiver(post_save, sender=EventContract)
        def contract_notifications(sender, instance, created, **kwargs):
            """Generate notifications for contract changes"""
            try:
                if created:
                    # Notify client about new contract
                    try:
                        NotificationService.create_notification(
                            recipient=instance.event.client,
                            notification_type_code='CONTRACT_SENT',
                            context={
                                'contract_id': instance.id,
                                'contract_name': getattr(instance, 'template_name', 'Contract'),
                                'event_name': instance.event.name or f"{getattr(instance.event, 'event_type', 'Event')}",
                                'action_url': f'/client/contracts/{instance.id}',
                            },
                            event=instance.event
                        )
                    except Exception as e:
                        logger.error(f"Failed to create contract sent notification: {str(e)}")
                
                else:
                    # Check for status changes
                    if hasattr(instance, '_previous_status') and instance._previous_status != instance.status:
                        if instance.status == 'SIGNED':
                            # Notify admins about contract signing
                            admin_users = User.objects.filter(role='ADMIN', is_active=True)
                            for admin in admin_users:
                                try:
                                    NotificationService.create_notification(
                                        recipient=admin,
                                        notification_type_code='CONTRACT_SIGNED',
                                        context={
                                            'contract_id': instance.id,
                                            'contract_name': getattr(instance, 'template_name', 'Contract'),
                                            'event_name': instance.event.name or f"{getattr(instance.event, 'event_type', 'Event')}",
                                            'client_name': instance.event.client.get_display_name(),
                                            'action_url': f'/events/{instance.event.id}',
                                        },
                                        event=instance.event,
                                        client=instance.event.client
                                    )
                                except Exception as e:
                                    logger.error(f"Failed to create contract signed notification: {str(e)}")
            
            except Exception as e:
                logger.error(f"Error in contract_notifications signal: {str(e)}")

        @receiver(pre_save, sender=EventContract)
        def track_contract_status_changes(sender, instance, **kwargs):
            """Track status changes for contracts"""
            if instance.pk:
                try:
                    previous = sender.objects.get(pk=instance.pk)
                    instance._previous_status = getattr(previous, 'status', None)
                except sender.DoesNotExist:
                    instance._previous_status = None
    
    except LookupError:
        logger.info("EventContract model not found, skipping contract signal connections")
    except Exception as e:
        logger.error(f"Failed to connect contract signals: {str(e)}")


def _connect_payment_signals(NotificationService):
    """Connect payment-related signals"""
    if not apps.is_installed('core.domains.payments'):
        return
        
    try:
        Payment = apps.get_model('payments', 'Payment')
        
        @receiver(post_save, sender=Payment)
        def payment_notifications(sender, instance, created, **kwargs):
            """Generate notifications for payment changes"""
            try:
                if not created:
                    # Check for status changes
                    if hasattr(instance, '_previous_status') and instance._previous_status != instance.status:
                        if instance.status == 'COMPLETED':
                            # Notify admins about payment completion
                            admin_users = User.objects.filter(role='ADMIN', is_active=True)
                            for admin in admin_users:
                                try:
                                    NotificationService.create_notification(
                                        recipient=admin,
                                        notification_type_code='PAYMENT_RECEIVED',
                                        context={
                                            'payment_id': instance.id,
                                            'payment_number': getattr(instance, 'payment_number', f'#{instance.id}'),
                                            'amount': f"${instance.amount:,.2f}",
                                            'event_name': instance.event.name or f"{getattr(instance.event, 'event_type', 'Event')}",
                                            'client_name': instance.event.client.get_display_name(),
                                            'action_url': f'/events/{instance.event.id}',
                                        },
                                        event=instance.event,
                                        client=instance.event.client
                                    )
                                except Exception as e:
                                    logger.error(f"Failed to create payment received notification: {str(e)}")
                            
                            # Notify client about payment confirmation
                            try:
                                NotificationService.create_notification(
                                    recipient=instance.event.client,
                                    notification_type_code='PAYMENT_CONFIRMED',
                                    context={
                                        'payment_number': getattr(instance, 'payment_number', f'#{instance.id}'),
                                        'amount': f"${instance.amount:,.2f}",
                                        'event_name': instance.event.name or f"{getattr(instance.event, 'event_type', 'Event')}",
                                        'action_url': f'/client/events/{instance.event.id}',
                                    },
                                    event=instance.event
                                )
                            except Exception as e:
                                logger.error(f"Failed to create payment confirmation notification: {str(e)}")
                        
                        elif instance.status == 'FAILED':
                            # Notify client about payment failure
                            try:
                                NotificationService.create_notification(
                                    recipient=instance.event.client,
                                    notification_type_code='PAYMENT_FAILED',
                                    context={
                                        'payment_number': getattr(instance, 'payment_number', f'#{instance.id}'),
                                        'amount': f"${instance.amount:,.2f}",
                                        'event_name': instance.event.name or f"{getattr(instance.event, 'event_type', 'Event')}",
                                        'action_url': f'/client/events/{instance.event.id}',
                                    },
                                    event=instance.event,
                                    delivery_methods=['email', 'sms', 'in_app']  # Force all methods for payment failures
                                )
                            except Exception as e:
                                logger.error(f"Failed to create payment failure notification: {str(e)}")
            
            except Exception as e:
                logger.error(f"Error in payment_notifications signal: {str(e)}")

        @receiver(pre_save, sender=Payment)
        def track_payment_status_changes(sender, instance, **kwargs):
            """Track status changes for payments"""
            if instance.pk:
                try:
                    previous = sender.objects.get(pk=instance.pk)
                    instance._previous_status = getattr(previous, 'status', None)
                except sender.DoesNotExist:
                    instance._previous_status = None
    
    except LookupError:
        logger.info("Payment model not found, skipping payment signal connections")
    except Exception as e:
        logger.error(f"Failed to connect payment signals: {str(e)}")


def _connect_communication_signals(NotificationService):
    """Connect communication-related signals"""
    if not apps.is_installed('core.domains.communications'):
        return
        
    try:
        CommunicationRecord = apps.get_model('communications', 'CommunicationRecord')
        
        @receiver(post_save, sender=CommunicationRecord)
        def communication_notifications(sender, instance, created, **kwargs):
            """Generate notifications for communication events"""
            try:
                if created and instance.category == 'MANUAL' and instance.client:
                    # Notify client about manual message received
                    try:
                        NotificationService.create_notification(
                            recipient=instance.client,
                            notification_type_code='MESSAGE_RECEIVED',
                            context={
                                'sender_name': instance.sent_by.get_display_name() if instance.sent_by else 'LifePlace Team',
                                'subject': getattr(instance, 'subject', None) or 'New Message',
                                'channel': instance.get_channel_display() if hasattr(instance, 'get_channel_display') else instance.channel,
                                'action_url': f'/client/messages/{instance.id}',
                            },
                            client=instance.client
                        )
                    except Exception as e:
                        logger.error(f"Failed to create message received notification: {str(e)}")
            
            except Exception as e:
                logger.error(f"Error in communication_notifications signal: {str(e)}")
    
    except LookupError:
        logger.info("CommunicationRecord model not found, skipping communication signal connections")
    except Exception as e:
        logger.error(f"Failed to connect communication signals: {str(e)}")


def _connect_client_invitation_signals(NotificationService):
    """Connect client invitation-related signals"""
    if not apps.is_installed('core.domains.clients'):
        return
        
    try:
        ClientInvitation = apps.get_model('clients', 'ClientInvitation')
        
        @receiver(post_save, sender=ClientInvitation)
        def client_invitation_notifications(sender, instance, created, **kwargs):
            """Generate notifications for client invitations"""
            try:
                if created:
                    # Notify admins about invitation sent
                    admin_users = User.objects.filter(role='ADMIN', is_active=True).exclude(id=instance.invited_by.id)
                    for admin in admin_users:
                        try:
                            NotificationService.create_notification(
                                recipient=admin,
                                notification_type_code='CLIENT_INVITATION_SENT',
                                context={
                                    'invitation_id': instance.id,
                                    'client_name': instance.client.get_display_name(),
                                    'client_email': instance.client.email,
                                    'invited_by': instance.invited_by.get_display_name(),
                                    'action_url': f'/clients/{instance.client.id}',
                                },
                                client=instance.client
                            )
                        except Exception as e:
                            logger.error(f"Failed to create client invitation notification: {str(e)}")
                
                else:
                    # Check for acceptance
                    if hasattr(instance, '_previous_is_accepted') and not instance._previous_is_accepted and instance.is_accepted:
                        # Notify admins about invitation acceptance
                        admin_users = User.objects.filter(role='ADMIN', is_active=True)
                        for admin in admin_users:
                            try:
                                NotificationService.create_notification(
                                    recipient=admin,
                                    notification_type_code='CLIENT_INVITATION_ACCEPTED',
                                    context={
                                        'client_name': instance.client.get_display_name(),
                                        'client_email': instance.client.email,
                                        'action_url': f'/clients/{instance.client.id}',
                                    },
                                    client=instance.client
                                )
                            except Exception as e:
                                logger.error(f"Failed to create invitation acceptance notification: {str(e)}")
            
            except Exception as e:
                logger.error(f"Error in client_invitation_notifications signal: {str(e)}")

        @receiver(pre_save, sender=ClientInvitation)
        def track_invitation_acceptance(sender, instance, **kwargs):
            """Track invitation acceptance changes"""
            if instance.pk:
                try:
                    previous = sender.objects.get(pk=instance.pk)
                    instance._previous_is_accepted = getattr(previous, 'is_accepted', False)
                except sender.DoesNotExist:
                    instance._previous_is_accepted = False
    
    except LookupError:
        logger.info("ClientInvitation model not found, skipping client invitation signal connections")
    except Exception as e:
        logger.error(f"Failed to connect client invitation signals: {str(e)}")


def _connect_support_signals(NotificationService):
    """Connect support/messaging-related signals"""
    if not apps.is_installed('core.domains.messaging'):
        return

    try:
        MessageThread = apps.get_model('messaging', 'MessageThread')
        Message = apps.get_model('messaging', 'Message')

        @receiver(post_save, sender=MessageThread)
        def support_thread_notifications(sender, instance, created, **kwargs):
            """Generate notifications for new support inquiries"""
            if not created or instance.thread_type != 'support':
                return

            try:
                # Notify all admins about new support inquiry
                admin_users = User.objects.filter(role='ADMIN', is_active=True)
                for admin in admin_users:
                    try:
                        NotificationService.create_notification(
                            recipient=admin,
                            notification_type_code='SUPPORT_INQUIRY_CREATED',
                            context={
                                'subject': instance.subject,
                                'client_name': instance.client.get_display_name(),
                                'client_email': instance.client.email,
                                'category': instance.get_category_display() if instance.category else 'General',
                                'priority': instance.priority or 'normal',
                                'action_url': f'/support/{instance.id}',
                            },
                            client=instance.client
                        )
                    except Exception as e:
                        logger.error(f"Failed to create support inquiry notification for admin {admin.email}: {str(e)}")
            except Exception as e:
                logger.error(f"Error in support_thread_notifications signal: {str(e)}")

        @receiver(post_save, sender=Message)
        def support_message_notifications(sender, instance, created, **kwargs):
            """Generate notifications for support replies"""
            if not created:
                return

            thread = instance.thread
            if thread.thread_type != 'support':
                return

            # Skip internal notes
            if instance.is_internal_note:
                return

            try:
                # If admin sent message, notify client
                if instance.sender.role == 'ADMIN':
                    NotificationService.create_notification(
                        recipient=thread.client,
                        notification_type_code='SUPPORT_INQUIRY_REPLY',
                        context={
                            'subject': thread.subject,
                            'action_url': f'/client/support/{thread.id}',
                        },
                    )
            except Exception as e:
                logger.error(f"Failed to create support reply notification: {str(e)}")

        @receiver(pre_save, sender=MessageThread)
        def track_support_status_changes(sender, instance, **kwargs):
            """Track status changes for support threads"""
            if instance.pk and instance.thread_type == 'support':
                try:
                    previous = sender.objects.get(pk=instance.pk)
                    instance._previous_status = previous.status
                except sender.DoesNotExist:
                    instance._previous_status = None

        @receiver(post_save, sender=MessageThread)
        def support_status_notifications(sender, instance, created, **kwargs):
            """Notify client when support inquiry is resolved"""
            if created or instance.thread_type != 'support':
                return

            previous_status = getattr(instance, '_previous_status', None)
            if previous_status and previous_status != 'resolved' and instance.status == 'resolved':
                try:
                    NotificationService.create_notification(
                        recipient=instance.client,
                        notification_type_code='SUPPORT_INQUIRY_RESOLVED',
                        context={
                            'subject': instance.subject,
                            'action_url': f'/client/support/{instance.id}',
                        },
                    )
                except Exception as e:
                    logger.error(f"Failed to create support resolved notification: {str(e)}")

        logger.info("Successfully connected support signals")

    except LookupError:
        logger.info("MessageThread/Message models not found, skipping support signal connections")
    except Exception as e:
        logger.error(f"Failed to connect support signals: {str(e)}")


# Future domain signal connections can be added here following the same pattern
# See documentation for template on how to add new domain signal connections