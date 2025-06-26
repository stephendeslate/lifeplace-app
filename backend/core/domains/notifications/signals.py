# backend/core/domains/notifications/signals.py
import logging
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_save, post_migrate, post_delete
from django.dispatch import receiver
from django.apps import apps
from django.utils import timezone
from datetime import timedelta

from .models import NotificationPreference, NotificationType
from .services import NotificationService

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_migrate)
def create_notification_types(sender, **kwargs):
    """Create default notification types after migrations"""
    if sender.name != 'core.domains.notifications':
        return
    
    try:
        # Create default notification types
        default_types = [
            # System notifications
            {
                'code': 'SYSTEM_NOTIFICATION',
                'name': 'System Notification',
                'description': 'General system notifications and announcements',
                'category': 'SYSTEM',
                'priority': 'NORMAL',
                'default_title_template': 'System Notification',
                'default_content_template': '{{ message|default:"You have a new system notification." }}',
                'default_email_template': '''
                <h2>{{ title }}</h2>
                <p>{{ content }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Details</a></p>{% endif %}
                ''',
                'default_sms_template': '{{ title }}: {{ content|truncatechars:100 }}',
                'supports_email': True,
                'supports_sms': True,
                'is_system': True,
            },
            
            # User management notifications
            {
                'code': 'CLIENT_CREATED',
                'name': 'New Client Registration',
                'description': 'Notification when a new client registers',
                'category': 'CLIENT',
                'priority': 'NORMAL',
                'default_title_template': 'New Client: {{ client_name }}',
                'default_content_template': '{{ client_name }} ({{ client_email }}) has registered as a new client.',
                'default_email_template': '''
                <h2>New Client Registration</h2>
                <p><strong>{{ client_name }}</strong> has joined your platform.</p>
                <p>Email: {{ client_email }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Client Profile</a></p>{% endif %}
                ''',
                'default_sms_template': 'New client: {{ client_name }} ({{ client_email }})',
                'supports_email': True,
                'supports_sms': False,
            },
            
            {
                'code': 'ADMIN_ADDED',
                'name': 'New Administrator Added',
                'description': 'Notification when a new admin user is added',
                'category': 'SYSTEM',
                'priority': 'HIGH',
                'default_title_template': 'New Admin: {{ admin_name }}',
                'default_content_template': '{{ admin_name }} ({{ admin_email }}) has been added as an administrator.',
                'default_email_template': '''
                <h2>New Administrator Added</h2>
                <p><strong>{{ admin_name }}</strong> has been granted administrator access.</p>
                <p>Email: {{ admin_email }}</p>
                ''',
                'default_sms_template': 'New admin added: {{ admin_name }}',
                'supports_email': True,
                'supports_sms': False,
            },
            
            # Event management notifications
            {
                'code': 'EVENT_CREATED',
                'name': 'New Event Created',
                'description': 'Notification when a new event is created',
                'category': 'EVENT',
                'priority': 'NORMAL',
                'default_title_template': 'New Event: {{ event_name }}',
                'default_content_template': 'A new event "{{ event_name }}" has been created for {{ client_name }} on {{ event_date }}.',
                'default_email_template': '''
                <h2>New Event Created</h2>
                <p><strong>{{ event_name }}</strong></p>
                <p>Client: {{ client_name }}</p>
                <p>Date: {{ event_date }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Event Details</a></p>{% endif %}
                ''',
                'default_sms_template': 'New event: {{ event_name }} for {{ client_name }}',
                'supports_email': True,
                'supports_sms': False,
            },
            
            {
                'code': 'EVENT_CONFIRMED',
                'name': 'Event Confirmed',
                'description': 'Notification when an event is confirmed',
                'category': 'EVENT',
                'priority': 'HIGH',
                'default_title_template': 'Event Confirmed: {{ event_name }}',
                'default_content_template': 'The event "{{ event_name }}" for {{ client_name }} on {{ event_date }} has been confirmed.',
                'default_email_template': '''
                <h2>Event Confirmed</h2>
                <p><strong>{{ event_name }}</strong> has been confirmed!</p>
                <p>Client: {{ client_name }}</p>
                <p>Date: {{ event_date }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Event Details</a></p>{% endif %}
                ''',
                'default_sms_template': 'Event confirmed: {{ event_name }} on {{ event_date }}',
                'supports_email': True,
                'supports_sms': True,
            },
            
            {
                'code': 'YOUR_EVENT_CONFIRMED',
                'name': 'Your Event Confirmed',
                'description': 'Client notification when their event is confirmed',
                'category': 'EVENT',
                'priority': 'HIGH',
                'default_title_template': 'Your Event is Confirmed!',
                'default_content_template': 'Great news! Your event "{{ event_name }}" on {{ event_date }} has been confirmed.',
                'default_email_template': '''
                <h2>Your Event is Confirmed!</h2>
                <p>We're excited to let you know that <strong>{{ event_name }}</strong> has been confirmed.</p>
                <p>Event Date: {{ event_date }}</p>
                <p>We'll be in touch with more details soon.</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Event Details</a></p>{% endif %}
                ''',
                'default_sms_template': 'Your event {{ event_name }} on {{ event_date }} is confirmed!',
                'supports_email': True,
                'supports_sms': True,
            },
            
            {
                'code': 'EVENT_COMPLETED',
                'name': 'Event Completed',
                'description': 'Notification when an event is marked as completed',
                'category': 'EVENT',
                'priority': 'NORMAL',
                'default_title_template': 'Event Completed: {{ event_name }}',
                'default_content_template': 'Your event "{{ event_name }}" has been completed. Thank you for choosing us!',
                'default_email_template': '''
                <h2>Event Completed</h2>
                <p>Thank you for choosing us for <strong>{{ event_name }}</strong>!</p>
                <p>We hope you had a wonderful experience. We'd love to hear your feedback.</p>
                {% if action_url %}<p><a href="{{ action_url }}">Leave Feedback</a></p>{% endif %}
                ''',
                'default_sms_template': 'Your event {{ event_name }} is complete! Thank you!',
                'supports_email': True,
                'supports_sms': False,
            },
            
            # Task management notifications
            {
                'code': 'TASK_ASSIGNED',
                'name': 'Task Assigned',
                'description': 'Notification when a task is assigned to a user',
                'category': 'TASK',
                'priority': 'NORMAL',
                'default_title_template': 'Task Assigned: {{ task_title }}',
                'default_content_template': 'You have been assigned the task "{{ task_title }}" for {{ event_name }}. Due: {{ due_date }}',
                'default_email_template': '''
                <h2>New Task Assignment</h2>
                <p>You have been assigned: <strong>{{ task_title }}</strong></p>
                <p>Event: {{ event_name }}</p>
                <p>Due Date: {{ due_date }}</p>
                <p>Priority: {{ priority }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Task</a></p>{% endif %}
                ''',
                'default_sms_template': 'Task assigned: {{ task_title }} due {{ due_date }}',
                'supports_email': True,
                'supports_sms': False,
            },
            
            {
                'code': 'TASK_COMPLETED',
                'name': 'Task Completed (Client)',
                'description': 'Client notification when a task is completed',
                'category': 'TASK',
                'priority': 'NORMAL',
                'default_title_template': 'Progress Update: {{ task_title }}',
                'default_content_template': 'Good news! We\'ve completed "{{ task_title }}" for your {{ event_name }}.',
                'default_email_template': '''
                <h2>Progress Update</h2>
                <p>Great news! We've completed another milestone for your event.</p>
                <p>Completed: <strong>{{ task_title }}</strong></p>
                <p>Event: {{ event_name }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Progress</a></p>{% endif %}
                ''',
                'default_sms_template': 'Progress update: {{ task_title }} completed for {{ event_name }}',
                'supports_email': True,
                'supports_sms': False,
            },
            
            {
                'code': 'TASK_COMPLETED_ADMIN',
                'name': 'Task Completed (Admin)',
                'description': 'Admin notification when a task is completed',
                'category': 'TASK',
                'priority': 'NORMAL',
                'default_title_template': 'Task Completed: {{ task_title }}',
                'default_content_template': '{{ assigned_to }} completed "{{ task_title }}" for {{ event_name }} ({{ client_name }}).',
                'default_email_template': '''
                <h2>Task Completed</h2>
                <p><strong>{{ task_title }}</strong> has been completed.</p>
                <p>Completed by: {{ assigned_to }}</p>
                <p>Event: {{ event_name }}</p>
                <p>Client: {{ client_name }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Event</a></p>{% endif %}
                ''',
                'default_sms_template': 'Task completed: {{ task_title }} by {{ assigned_to }}',
                'supports_email': True,
                'supports_sms': False,
            },
            
            # Contract notifications
            {
                'code': 'CONTRACT_SENT',
                'name': 'Contract Sent',
                'description': 'Client notification when a contract is sent',
                'category': 'CONTRACT',
                'priority': 'HIGH',
                'default_title_template': 'Contract Ready: {{ contract_name }}',
                'default_content_template': 'Your contract for {{ event_name }} is ready for review and signature.',
                'default_email_template': '''
                <h2>Contract Ready for Signature</h2>
                <p>Your contract <strong>{{ contract_name }}</strong> is ready for review.</p>
                <p>Event: {{ event_name }}</p>
                <p>Please review and sign at your earliest convenience.</p>
                {% if action_url %}<p><a href="{{ action_url }}">Review Contract</a></p>{% endif %}
                ''',
                'default_sms_template': 'Contract ready for {{ event_name }}. Please review and sign.',
                'supports_email': True,
                'supports_sms': True,
            },
            
            {
                'code': 'CONTRACT_SIGNED',
                'name': 'Contract Signed',
                'description': 'Admin notification when a contract is signed',
                'category': 'CONTRACT',
                'priority': 'HIGH',
                'default_title_template': 'Contract Signed: {{ contract_name }}',
                'default_content_template': '{{ client_name }} has signed the contract for {{ event_name }}.',
                'default_email_template': '''
                <h2>Contract Signed</h2>
                <p><strong>{{ contract_name }}</strong> has been signed!</p>
                <p>Client: {{ client_name }}</p>
                <p>Event: {{ event_name }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Contract</a></p>{% endif %}
                ''',
                'default_sms_template': 'Contract signed by {{ client_name }} for {{ event_name }}',
                'supports_email': True,
                'supports_sms': False,
            },
            
            # Payment notifications
            {
                'code': 'PAYMENT_RECEIVED',
                'name': 'Payment Received',
                'description': 'Admin notification when a payment is received',
                'category': 'PAYMENT',
                'priority': 'HIGH',
                'default_title_template': 'Payment Received: {{ amount }}',
                'default_content_template': 'Payment of {{ amount }} received from {{ client_name }} for {{ event_name }}.',
                'default_email_template': '''
                <h2>Payment Received</h2>
                <p>Payment confirmation for <strong>{{ amount }}</strong></p>
                <p>From: {{ client_name }}</p>
                <p>Event: {{ event_name }}</p>
                <p>Payment #: {{ payment_number }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Payment Details</a></p>{% endif %}
                ''',
                'default_sms_template': 'Payment received: {{ amount }} from {{ client_name }}',
                'supports_email': True,
                'supports_sms': False,
            },
            
            {
                'code': 'PAYMENT_CONFIRMED',
                'name': 'Payment Confirmed',
                'description': 'Client notification when payment is confirmed',
                'category': 'PAYMENT',
                'priority': 'HIGH',
                'default_title_template': 'Payment Confirmed: {{ amount }}',
                'default_content_template': 'Your payment of {{ amount }} for {{ event_name }} has been confirmed.',
                'default_email_template': '''
                <h2>Payment Confirmed</h2>
                <p>Thank you! Your payment has been successfully processed.</p>
                <p>Amount: <strong>{{ amount }}</strong></p>
                <p>Event: {{ event_name }}</p>
                <p>Payment #: {{ payment_number }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Receipt</a></p>{% endif %}
                ''',
                'default_sms_template': 'Payment confirmed: {{ amount }} for {{ event_name }}',
                'supports_email': True,
                'supports_sms': True,
            },
            
            {
                'code': 'PAYMENT_FAILED',
                'name': 'Payment Failed',
                'description': 'Client notification when payment fails',
                'category': 'PAYMENT',
                'priority': 'URGENT',
                'default_title_template': 'Payment Issue: {{ amount }}',
                'default_content_template': 'There was an issue processing your payment of {{ amount }} for {{ event_name }}.',
                'default_email_template': '''
                <h2>Payment Processing Issue</h2>
                <p>We encountered an issue processing your payment.</p>
                <p>Amount: {{ amount }}</p>
                <p>Event: {{ event_name }}</p>
                <p>Payment #: {{ payment_number }}</p>
                <p>Please contact us or try again with a different payment method.</p>
                {% if action_url %}<p><a href="{{ action_url }}">Retry Payment</a></p>{% endif %}
                ''',
                'default_sms_template': 'Payment issue for {{ event_name }}. Please contact us.',
                'supports_email': True,
                'supports_sms': True,
            },
            
            # Communication notifications
            {
                'code': 'MESSAGE_RECEIVED',
                'name': 'New Message',
                'description': 'Client notification when they receive a message',
                'category': 'COMMUNICATION',
                'priority': 'NORMAL',
                'default_title_template': 'New Message from {{ sender_name }}',
                'default_content_template': 'You have received a new {{ channel }} message: {{ subject }}',
                'default_email_template': '''
                <h2>New Message</h2>
                <p>You have received a new message from <strong>{{ sender_name }}</strong></p>
                <p>Subject: {{ subject }}</p>
                <p>Channel: {{ channel }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Message</a></p>{% endif %}
                ''',
                'default_sms_template': 'New message from {{ sender_name }}: {{ subject }}',
                'supports_email': True,
                'supports_sms': False,
            },
            
            # Workflow notifications
            {
                'code': 'WORKFLOW_STAGE_CHANGED',
                'name': 'Workflow Progress',
                'description': 'Admin notification when workflow stage changes',
                'category': 'WORKFLOW',
                'priority': 'NORMAL',
                'default_title_template': 'Workflow Update: {{ event_name }}',
                'default_content_template': '{{ event_name }} ({{ client_name }}) moved to {{ new_stage }} in {{ workflow_name }}.',
                'default_email_template': '''
                <h2>Workflow Progress Update</h2>
                <p><strong>{{ event_name }}</strong> has progressed to a new stage.</p>
                <p>Client: {{ client_name }}</p>
                <p>New Stage: {{ new_stage }}</p>
                <p>Workflow: {{ workflow_name }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Event</a></p>{% endif %}
                ''',
                'default_sms_template': '{{ event_name }} moved to {{ new_stage }}',
                'supports_email': True,
                'supports_sms': False,
            },
            
            {
                'code': 'EVENT_PROGRESS_UPDATE',
                'name': 'Event Progress Update',
                'description': 'Client notification when their event progresses',
                'category': 'EVENT',
                'priority': 'NORMAL',
                'default_title_template': 'Progress Update: {{ event_name }}',
                'default_content_template': 'Your event has progressed to: {{ stage_name }}. {{ stage_description }}',
                'default_email_template': '''
                <h2>Event Progress Update</h2>
                <p>Great news! Your event <strong>{{ event_name }}</strong> has reached a new milestone.</p>
                <p>Current Stage: {{ stage_name }}</p>
                {% if stage_description %}<p>{{ stage_description }}</p>{% endif %}
                {% if action_url %}<p><a href="{{ action_url }}">View Progress</a></p>{% endif %}
                ''',
                'default_sms_template': '{{ event_name }} progress: {{ stage_name }}',
                'supports_email': True,
                'supports_sms': False,
            },
            
            # Client invitation notifications
            {
                'code': 'CLIENT_INVITATION_SENT',
                'name': 'Client Invitation Sent',
                'description': 'Admin notification when client invitation is sent',
                'category': 'CLIENT',
                'priority': 'NORMAL',
                'default_title_template': 'Invitation Sent: {{ client_name }}',
                'default_content_template': '{{ invited_by }} sent an invitation to {{ client_name }} ({{ client_email }}).',
                'default_email_template': '''
                <h2>Client Invitation Sent</h2>
                <p>An invitation has been sent to <strong>{{ client_name }}</strong></p>
                <p>Email: {{ client_email }}</p>
                <p>Invited by: {{ invited_by }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Client</a></p>{% endif %}
                ''',
                'default_sms_template': 'Invitation sent to {{ client_name }}',
                'supports_email': True,
                'supports_sms': False,
            },
            
            {
                'code': 'CLIENT_INVITATION_ACCEPTED',
                'name': 'Client Invitation Accepted',
                'description': 'Admin notification when client accepts invitation',
                'category': 'CLIENT',
                'priority': 'NORMAL',
                'default_title_template': 'Invitation Accepted: {{ client_name }}',
                'default_content_template': '{{ client_name }} ({{ client_email }}) has accepted their invitation and activated their account.',
                'default_email_template': '''
                <h2>Invitation Accepted</h2>
                <p><strong>{{ client_name }}</strong> has accepted their invitation!</p>
                <p>Email: {{ client_email }}</p>
                <p>Their account is now active and they can access the client portal.</p>
                {% if action_url %}<p><a href="{{ action_url }}">View Client Profile</a></p>{% endif %}
                ''',
                'default_sms_template': '{{ client_name }} accepted invitation',
                'supports_email': True,
                'supports_sms': False,
            },
            
            # System maintenance notifications
            {
                'code': 'USER_DEACTIVATED',
                'name': 'User Account Deactivated',
                'description': 'Admin notification when a user account is deactivated',
                'category': 'SYSTEM',
                'priority': 'NORMAL',
                'default_title_template': 'Account Deactivated: {{ user_name }}',
                'default_content_template': '{{ user_name }} ({{ user_email }}) - {{ user_role }} account has been deactivated.',
                'default_email_template': '''
                <h2>User Account Deactivated</h2>
                <p>User account has been deactivated:</p>
                <p>Name: <strong>{{ user_name }}</strong></p>
                <p>Email: {{ user_email }}</p>
                <p>Role: {{ user_role }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View User</a></p>{% endif %}
                ''',
                'default_sms_template': 'User deactivated: {{ user_name }}',
                'supports_email': True,
                'supports_sms': False,
            },
            
            {
                'code': 'USER_REACTIVATED',
                'name': 'User Account Reactivated',
                'description': 'Admin notification when a user account is reactivated',
                'category': 'SYSTEM',
                'priority': 'NORMAL',
                'default_title_template': 'Account Reactivated: {{ user_name }}',
                'default_content_template': '{{ user_name }} ({{ user_email }}) - {{ user_role }} account has been reactivated.',
                'default_email_template': '''
                <h2>User Account Reactivated</h2>
                <p>User account has been reactivated:</p>
                <p>Name: <strong>{{ user_name }}</strong></p>
                <p>Email: {{ user_email }}</p>
                <p>Role: {{ user_role }}</p>
                {% if action_url %}<p><a href="{{ action_url }}">View User</a></p>{% endif %}
                ''',
                'default_sms_template': 'User reactivated: {{ user_name }}',
                'supports_email': True,
                'supports_sms': False,
            },
        ]
        
        # Create or update notification types
        for type_data in default_types:
            notification_type, created = NotificationType.objects.get_or_create(
                code=type_data['code'],
                defaults=type_data
            )
            if created:
                logger.info(f"Created notification type: {type_data['code']}")
            else:
                # Update existing type with new fields if needed
                updated = False
                for key, value in type_data.items():
                    if key != 'code' and getattr(notification_type, key, None) != value:
                        setattr(notification_type, key, value)
                        updated = True
                
                if updated:
                    notification_type.save()
                    logger.info(f"Updated notification type: {type_data['code']}")
        
        logger.info("Successfully created/updated notification types")
    except Exception as e:
        logger.error(f"Failed to create notification types: {str(e)}")


@receiver(post_save, sender=User)
def create_notification_preferences(sender, instance, created, **kwargs):
    """Create default notification preferences for new users"""
    if created:
        try:
            NotificationPreference.objects.create(user=instance)
            logger.info(f"Created notification preferences for user: {instance.email}")
        except Exception as e:
            logger.error(f"Failed to create notification preferences for {instance.email}: {str(e)}")


# User-related notification signals
@receiver(post_save, sender=User)
def user_notifications(sender, instance, created, **kwargs):
    """Generate notifications for user changes"""
    try:
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
                    except Exception as e:
                        logger.error(f"Failed to create user status notification: {str(e)}")
    
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


# Dynamic signal connections for other domains
def connect_domain_signals():
    """Connect signals for other domains dynamically"""
    try:
        # Event domain signals
        if apps.is_installed('core.domains.events'):
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
                                        'event_name': instance.name or f"{instance.event_type} Event",
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
                                                'event_name': instance.name or f"{instance.event_type} Event",
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
                                            'event_name': instance.name or f"{instance.event_type} Event",
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
                                            'event_name': instance.name or f"{instance.event_type} Event",
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
                try:
                    if not created and hasattr(instance, '_previous_stage_id'):
                        if instance._previous_stage_id != getattr(instance, 'current_stage_id', None) and hasattr(instance, 'current_stage') and instance.current_stage:
                            # Notify admins about workflow progression
                            admin_users = User.objects.filter(role='ADMIN', is_active=True)
                            for admin in admin_users:
                                try:
                                    NotificationService.create_notification(
                                        recipient=admin,
                                        notification_type_code='WORKFLOW_STAGE_CHANGED',
                                        context={
                                            'event_id': instance.id,
                                            'event_name': instance.name or f"{instance.event_type} Event",
                                            'client_name': instance.client.get_display_name(),
                                            'new_stage': instance.current_stage.name,
                                            'workflow_name': instance.workflow_template.name if hasattr(instance, 'workflow_template') and instance.workflow_template else 'Custom Workflow',
                                            'action_url': f'/events/{instance.id}',
                                        },
                                        event=instance,
                                        client=instance.client
                                    )
                                except Exception as e:
                                    logger.error(f"Failed to create workflow stage notification: {str(e)}")
                            
                            # Notify client if stage is client-visible
                            if hasattr(instance.current_stage, 'is_client_visible') and getattr(instance.current_stage, 'is_client_visible', False):
                                try:
                                    NotificationService.create_notification(
                                        recipient=instance.client,
                                        notification_type_code='EVENT_PROGRESS_UPDATE',
                                        context={
                                            'event_name': instance.name or f"{instance.event_type} Event",
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

        # Task domain signals
        if apps.is_installed('core.domains.events'):  # Tasks are in events domain
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
                                        'event_name': instance.event.name or f"{instance.event.event_type} Event",
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
                                                    'event_name': instance.event.name or f"{instance.event.event_type} Event",
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
                                                    'event_name': instance.event.name or f"{instance.event.event_type} Event",
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
            
            except Exception as e:
                logger.error(f"Failed to connect task signals: {str(e)}")

        # Contract domain signals
        if apps.is_installed('core.domains.contracts'):
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
                                        'event_name': instance.event.name or f"{instance.event.event_type} Event",
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
                                                    'event_name': instance.event.name or f"{instance.event.event_type} Event",
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
            
            except Exception as e:
                logger.error(f"Failed to connect contract signals: {str(e)}")

        # Payment domain signals
        if apps.is_installed('core.domains.payments'):
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
                                                    'event_name': instance.event.name or f"{instance.event.event_type} Event",
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
                                                'event_name': instance.event.name or f"{instance.event.event_type} Event",
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
                                                'event_name': instance.event.name or f"{instance.event.event_type} Event",
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
            
            except Exception as e:
                logger.error(f"Failed to connect payment signals: {str(e)}")

        # Communication domain signals
        if apps.is_installed('core.domains.communications'):
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
            
            except Exception as e:
                logger.error(f"Failed to connect communication signals: {str(e)}")

        # Client invitation signals
        if apps.is_installed('core.domains.clients'):
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
            
            except Exception as e:
                logger.error(f"Failed to connect client invitation signals: {str(e)}")

    except Exception as e:
        logger.error(f"Error connecting domain signals: {str(e)}")


# Auto-cleanup task signals
@receiver(post_save, sender=NotificationType)
def schedule_notification_cleanup(sender, instance, **kwargs):
    """Schedule cleanup tasks when notification types are updated"""
    try:
        # Import here to avoid circular imports
        from django.core.management import call_command
        
        # Schedule cleanup of old notifications (can be done via Celery in production)
        if instance.auto_read_after_days:
            logger.info(f"Scheduling cleanup for notification type: {instance.code}")
            # In production, you would schedule this with Celery
            # cleanup_old_notifications.apply_async(args=[instance.auto_read_after_days])
    except Exception as e:
        logger.error(f"Failed to schedule notification cleanup: {str(e)}")


# Connect all domain signals when the app is ready
def ready():
    """Connect all domain signals when the notifications app is ready"""
    connect_domain_signals()


# Connect signals immediately for testing
connect_domain_signals()