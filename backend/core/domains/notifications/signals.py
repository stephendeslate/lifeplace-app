# backend/core/domains/notifications/signals.py
import logging
from django.db.models.signals import post_save, post_migrate
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType

from .services import NotificationDispatchService
from .models import NotificationTemplate, NotificationRule

User = get_user_model()
logger = logging.getLogger(__name__)


# Client domain signals
@receiver(post_save, sender=User)
def handle_user_created(sender, instance, created, **kwargs):
    """Handle user creation notifications"""
    if created and instance.role == 'CLIENT':
        try:
            NotificationDispatchService.dispatch_from_event(
                event_type='client.created',
                event_data={
                    'client_id': instance.id,
                    'client_email': instance.email,
                    'client_name': instance.get_full_name() or instance.email,
                    'client_first_name': instance.first_name,
                    'client_last_name': instance.last_name,
                    'date_joined': instance.date_joined.isoformat() if instance.date_joined else None,
                },
                source_object=instance
            )
            logger.info(f"Triggered client.created notification for user {instance.email}")
        except Exception as e:
            logger.error(f"Failed to trigger client.created notification: {str(e)}")


# Event domain signals
def handle_event_created(sender, instance, created, **kwargs):
    """Handle event creation notifications"""
    if created:
        try:
            NotificationDispatchService.dispatch_from_event(
                event_type='event.created',
                event_data={
                    'event_id': instance.id,
                    'event_name': instance.name or f"Event for {instance.client.get_full_name()}",
                    'client_id': instance.client.id,
                    'client_name': instance.client.get_full_name() or instance.client.email,
                    'client_email': instance.client.email,
                    'event_type': instance.event_type.name if instance.event_type else 'Unknown',
                    'status': instance.status,
                    'start_date': instance.start_date.isoformat() if instance.start_date else None,
                    'end_date': instance.end_date.isoformat() if instance.end_date else None,
                    'total_price': str(instance.total_price) if instance.total_price else None,
                },
                source_object=instance
            )
            logger.info(f"Triggered event.created notification for event {instance.id}")
        except Exception as e:
            logger.error(f"Failed to trigger event.created notification: {str(e)}")


def handle_event_status_changed(sender, instance, **kwargs):
    """Handle event status change notifications"""
    if instance.pk:  # Only for existing objects
        try:
            # Get the previous state
            old_instance = sender.objects.get(pk=instance.pk)
            if old_instance.status != instance.status:
                NotificationDispatchService.dispatch_from_event(
                    event_type='event.status_changed',
                    event_data={
                        'event_id': instance.id,
                        'event_name': instance.name or f"Event for {instance.client.get_full_name()}",
                        'client_id': instance.client.id,
                        'client_name': instance.client.get_full_name() or instance.client.email,
                        'client_email': instance.client.email,
                        'old_status': old_instance.status,
                        'new_status': instance.status,
                        'event_type': instance.event_type.name if instance.event_type else 'Unknown',
                        'start_date': instance.start_date.isoformat() if instance.start_date else None,
                        'total_price': str(instance.total_price) if instance.total_price else None,
                    },
                    source_object=instance
                )
                logger.info(f"Triggered event.status_changed notification for event {instance.id}")
        except Exception as e:
            logger.error(f"Failed to trigger event.status_changed notification: {str(e)}")


# Task domain signals
def handle_task_created(sender, instance, created, **kwargs):
    """Handle task creation notifications"""
    if created:
        try:
            NotificationDispatchService.dispatch_from_event(
                event_type='task.created',
                event_data={
                    'task_id': instance.id,
                    'task_title': instance.title,
                    'task_description': instance.description,
                    'event_id': instance.event.id,
                    'event_name': instance.event.name or f"Event for {instance.event.client.get_full_name()}",
                    'client_id': instance.event.client.id,
                    'client_name': instance.event.client.get_full_name() or instance.event.client.email,
                    'client_email': instance.event.client.email,
                    'due_date': instance.due_date.isoformat() if instance.due_date else None,
                    'priority': instance.priority,
                    'assigned_to_id': instance.assigned_to.id if instance.assigned_to else None,
                    'assigned_to_name': instance.assigned_to.get_full_name() if instance.assigned_to else None,
                    'is_visible_to_client': instance.is_visible_to_client,
                },
                source_object=instance
            )
            logger.info(f"Triggered task.created notification for task {instance.id}")
        except Exception as e:
            logger.error(f"Failed to trigger task.created notification: {str(e)}")


def handle_task_completed(sender, instance, **kwargs):
    """Handle task completion notifications"""
    if instance.pk:  # Only for existing objects
        try:
            # Get the previous state
            old_instance = sender.objects.get(pk=instance.pk)
            if old_instance.status != 'COMPLETED' and instance.status == 'COMPLETED':
                NotificationDispatchService.dispatch_from_event(
                    event_type='task.completed',
                    event_data={
                        'task_id': instance.id,
                        'task_title': instance.title,
                        'event_id': instance.event.id,
                        'event_name': instance.event.name or f"Event for {instance.event.client.get_full_name()}",
                        'client_id': instance.event.client.id,
                        'client_name': instance.event.client.get_full_name() or instance.event.client.email,
                        'client_email': instance.event.client.email,
                        'completed_by_id': instance.completed_by.id if instance.completed_by else None,
                        'completed_by_name': instance.completed_by.get_full_name() if instance.completed_by else None,
                        'completed_at': instance.completed_at.isoformat() if instance.completed_at else None,
                        'completion_notes': instance.completion_notes,
                        'is_visible_to_client': instance.is_visible_to_client,
                    },
                    source_object=instance
                )
                logger.info(f"Triggered task.completed notification for task {instance.id}")
        except Exception as e:
            logger.error(f"Failed to trigger task.completed notification: {str(e)}")


# Feedback domain signals
def handle_feedback_received(sender, instance, created, **kwargs):
    """Handle feedback submission notifications"""
    if created:
        try:
            NotificationDispatchService.dispatch_from_event(
                event_type='feedback.received',
                event_data={
                    'feedback_id': instance.id,
                    'event_id': instance.event.id,
                    'event_name': instance.event.name or f"Event for {instance.event.client.get_full_name()}",
                    'client_id': instance.event.client.id,
                    'client_name': instance.event.client.get_full_name() or instance.event.client.email,
                    'client_email': instance.event.client.email,
                    'overall_rating': instance.overall_rating,
                    'comments': instance.comments,
                    'testimonial': instance.testimonial,
                    'is_public': instance.is_public,
                    'submitted_by_name': instance.submitted_by.get_full_name() if instance.submitted_by else None,
                },
                source_object=instance
            )
            logger.info(f"Triggered feedback.received notification for feedback {instance.id}")
        except Exception as e:
            logger.error(f"Failed to trigger feedback.received notification: {str(e)}")


# Client invitation signals
def handle_client_invitation_sent(sender, instance, created, **kwargs):
    """Handle client invitation sent notifications"""
    if created:
        try:
            NotificationDispatchService.dispatch_from_event(
                event_type='client.invitation_sent',
                event_data={
                    'invitation_id': str(instance.id),
                    'client_id': instance.client.id,
                    'client_name': instance.client.get_full_name() or instance.client.email,
                    'client_email': instance.client.email,
                    'invited_by_id': instance.invited_by.id if instance.invited_by else None,
                    'invited_by_name': instance.invited_by.get_full_name() if instance.invited_by else None,
                    'expires_at': instance.expires_at.isoformat() if instance.expires_at else None,
                },
                source_object=instance
            )
            logger.info(f"Triggered client.invitation_sent notification for invitation {instance.id}")
        except Exception as e:
            logger.error(f"Failed to trigger client.invitation_sent notification: {str(e)}")


def handle_client_invitation_accepted(sender, instance, **kwargs):
    """Handle client invitation acceptance notifications"""
    if instance.pk:  # Only for existing objects
        try:
            # Get the previous state
            old_instance = sender.objects.get(pk=instance.pk)
            if not old_instance.is_accepted and instance.is_accepted:
                NotificationDispatchService.dispatch_from_event(
                    event_type='client.invitation_accepted',
                    event_data={
                        'invitation_id': str(instance.id),
                        'client_id': instance.client.id,
                        'client_name': instance.client.get_full_name() or instance.client.email,
                        'client_email': instance.client.email,
                        'invited_by_id': instance.invited_by.id if instance.invited_by else None,
                        'invited_by_name': instance.invited_by.get_full_name() if instance.invited_by else None,
                        'accepted_at': instance.updated_at.isoformat() if instance.updated_at else None,
                    },
                    source_object=instance
                )
                logger.info(f"Triggered client.invitation_accepted notification for invitation {instance.id}")
        except Exception as e:
            logger.error(f"Failed to trigger client.invitation_accepted notification: {str(e)}")


# Workflow domain signals
def handle_workflow_stage_changed(sender, instance, **kwargs):
    """Handle workflow stage change notifications"""
    if instance.pk:  # Only for existing objects
        try:
            # Get the previous state
            old_instance = sender.objects.get(pk=instance.pk)
            if old_instance.current_stage_id != instance.current_stage_id:
                NotificationDispatchService.dispatch_from_event(
                    event_type='workflow.stage_changed',
                    event_data={
                        'event_id': instance.id,
                        'event_name': instance.name or f"Event for {instance.client.get_full_name()}",
                        'client_id': instance.client.id,
                        'client_name': instance.client.get_full_name() or instance.client.email,
                        'client_email': instance.client.email,
                        'old_stage_id': old_instance.current_stage_id,
                        'old_stage_name': old_instance.current_stage.name if old_instance.current_stage else None,
                        'new_stage_id': instance.current_stage_id,
                        'new_stage_name': instance.current_stage.name if instance.current_stage else None,
                        'workflow_template_id': instance.workflow_template.id if instance.workflow_template else None,
                        'workflow_template_name': instance.workflow_template.name if instance.workflow_template else None,
                        'progress': instance.workflow_progress,
                    },
                    source_object=instance
                )
                logger.info(f"Triggered workflow.stage_changed notification for event {instance.id}")
        except Exception as e:
            logger.error(f"Failed to trigger workflow.stage_changed notification: {str(e)}")


# Connect signals when models are available
def connect_domain_signals():
    """Connect signals to models from other domains"""
    try:
        # Event domain signals
        from core.domains.events.models import Event, EventTask, EventFeedback
        
        post_save.connect(handle_event_created, sender=Event)
        post_save.connect(handle_event_status_changed, sender=Event)
        post_save.connect(handle_workflow_stage_changed, sender=Event)
        post_save.connect(handle_task_created, sender=EventTask)
        post_save.connect(handle_task_completed, sender=EventTask)
        post_save.connect(handle_feedback_received, sender=EventFeedback)
        
        logger.info("Connected event domain signals")
    except ImportError:
        logger.warning("Could not connect event domain signals - models not available")
    
    try:
        # Client domain signals
        from core.domains.clients.models import ClientInvitation
        
        post_save.connect(handle_client_invitation_sent, sender=ClientInvitation)
        post_save.connect(handle_client_invitation_accepted, sender=ClientInvitation)
        
        logger.info("Connected client domain signals")
    except ImportError:
        logger.warning("Could not connect client domain signals - models not available")


# System template creation signal
@receiver(post_migrate)
def create_system_notification_templates(sender, **kwargs):
    """Create system notification templates after migrations"""
    if sender.name != 'core.domains.notifications':
        return
    
    templates_to_create = [
        {
            'name': 'New Client Registration',
            'notification_type': 'CLIENT_NEW',
            'channels': ['EMAIL', 'IN_APP'],
            'email_subject': 'New Client Registration - {{ client_name }}',
            'email_body': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>New Client Registration</h2>
    <p>A new client has registered on the platform:</p>
    <ul>
        <li><strong>Name:</strong> {{ client_name }}</li>
        <li><strong>Email:</strong> {{ client_email }}</li>
        <li><strong>Registration Date:</strong> {{ date_joined }}</li>
    </ul>
    <p>Please review the client details and ensure they have access to appropriate services.</p>
</div>
            ''',
            'in_app_title': 'New Client Registration',
            'in_app_body': 'New client {{ client_name }} has registered',
            'priority': 'MEDIUM',
            'is_system': True,
            'variables_schema': {
                'required': ['client_name', 'client_email'],
                'optional': ['date_joined', 'client_id']
            }
        },
        {
            'name': 'Event Created',
            'notification_type': 'EVENT_CREATED',
            'channels': ['EMAIL', 'IN_APP'],
            'email_subject': 'New Event Created - {{ event_name }}',
            'email_body': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>New Event Created</h2>
    <p>A new event has been created:</p>
    <ul>
        <li><strong>Event:</strong> {{ event_name }}</li>
        <li><strong>Client:</strong> {{ client_name }}</li>
        <li><strong>Type:</strong> {{ event_type }}</li>
        <li><strong>Start Date:</strong> {{ start_date }}</li>
        {% if total_price %}<li><strong>Total Price:</strong> ${{ total_price }}</li>{% endif %}
    </ul>
    <p>Please review the event details and begin planning accordingly.</p>
</div>
            ''',
            'in_app_title': 'New Event Created',
            'in_app_body': 'New event "{{ event_name }}" created for {{ client_name }}',
            'priority': 'MEDIUM',
            'is_system': True,
            'variables_schema': {
                'required': ['event_name', 'client_name', 'event_type'],
                'optional': ['start_date', 'end_date', 'total_price', 'event_id', 'client_id']
            }
        },
        {
            'name': 'Event Status Changed',
            'notification_type': 'EVENT_STATUS_CHANGE',
            'channels': ['EMAIL', 'IN_APP'],
            'email_subject': 'Event Status Update - {{ event_name }}',
            'email_body': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Event Status Update</h2>
    <p>An event status has been updated:</p>
    <ul>
        <li><strong>Event:</strong> {{ event_name }}</li>
        <li><strong>Client:</strong> {{ client_name }}</li>
        <li><strong>Previous Status:</strong> {{ old_status }}</li>
        <li><strong>New Status:</strong> {{ new_status }}</li>
        <li><strong>Start Date:</strong> {{ start_date }}</li>
    </ul>
    <p>Please review any required actions for this status change.</p>
</div>
            ''',
            'in_app_title': 'Event Status Changed',
            'in_app_body': '{{ event_name }} status changed from {{ old_status }} to {{ new_status }}',
            'priority': 'HIGH',
            'is_system': True,
            'variables_schema': {
                'required': ['event_name', 'client_name', 'old_status', 'new_status'],
                'optional': ['start_date', 'event_id', 'client_id']
            }
        },
        {
            'name': 'Task Completed',
            'notification_type': 'TASK_COMPLETED',
            'channels': ['EMAIL', 'IN_APP'],
            'email_subject': 'Task Completed - {{ task_title }}',
            'email_body': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Task Completed</h2>
    <p>A task has been completed:</p>
    <ul>
        <li><strong>Task:</strong> {{ task_title }}</li>
        <li><strong>Event:</strong> {{ event_name }}</li>
        <li><strong>Client:</strong> {{ client_name }}</li>
        <li><strong>Completed By:</strong> {{ completed_by_name }}</li>
        <li><strong>Completed At:</strong> {{ completed_at }}</li>
    </ul>
    {% if completion_notes %}
    <p><strong>Notes:</strong> {{ completion_notes }}</p>
    {% endif %}
</div>
            ''',
            'in_app_title': 'Task Completed',
            'in_app_body': 'Task "{{ task_title }}" completed by {{ completed_by_name }}',
            'priority': 'MEDIUM',
            'is_system': True,
            'variables_schema': {
                'required': ['task_title', 'event_name', 'client_name'],
                'optional': ['completed_by_name', 'completed_at', 'completion_notes', 'task_id', 'event_id']
            }
        },
        {
            'name': 'Feedback Received',
            'notification_type': 'FEEDBACK_RECEIVED',
            'channels': ['EMAIL', 'IN_APP'],
            'email_subject': 'New Feedback Received - {{ event_name }}',
            'email_body': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>New Feedback Received</h2>
    <p>New feedback has been submitted:</p>
    <ul>
        <li><strong>Event:</strong> {{ event_name }}</li>
        <li><strong>Client:</strong> {{ client_name }}</li>
        <li><strong>Rating:</strong> {{ overall_rating }}/5</li>
        <li><strong>Submitted By:</strong> {{ submitted_by_name }}</li>
    </ul>
    {% if comments %}
    <p><strong>Comments:</strong> {{ comments }}</p>
    {% endif %}
    {% if testimonial %}
    <p><strong>Testimonial:</strong> {{ testimonial }}</p>
    {% endif %}
</div>
            ''',
            'in_app_title': 'New Feedback Received',
            'in_app_body': 'New feedback ({{ overall_rating }}/5) received for {{ event_name }}',
            'priority': 'MEDIUM',
            'is_system': True,
            'variables_schema': {
                'required': ['event_name', 'client_name', 'overall_rating'],
                'optional': ['comments', 'testimonial', 'submitted_by_name', 'feedback_id', 'event_id']
            }
        },
        {
            'name': 'Daily Summary',
            'notification_type': 'DAILY_SUMMARY',
            'channels': ['EMAIL'],
            'email_subject': 'Daily Summary - {{ date }}',
            'email_body': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Daily Summary for {{ date }}</h2>
    <p>Hello {{ user_name }},</p>
    <p>Here's your daily summary of notifications:</p>
    
    <p><strong>Total Notifications:</strong> {{ notification_count }}</p>
    
    {% if notifications %}
    <h3>Recent Notifications:</h3>
    <ul>
    {% for notification in notifications %}
        <li>
            <strong>{{ notification.title }}</strong><br>
            {{ notification.content }}<br>
            <small>{{ notification.sent_at }} - {{ notification.channel }}</small>
        </li>
    {% endfor %}
    </ul>
    {% endif %}
    
    <p>Have a great day!</p>
</div>
            ''',
            'priority': 'LOW',
            'is_system': True,
            'variables_schema': {
                'required': ['user_name', 'date', 'notification_count'],
                'optional': ['notifications']
            }
        }
    ]
    
    for template_data in templates_to_create:
        template, created = NotificationTemplate.objects.get_or_create(
            name=template_data['name'],
            defaults=template_data
        )
        if created:
            logger.info(f"Created system notification template: {template.name}")


# System rules creation signal
@receiver(post_migrate)
def create_system_notification_rules(sender, **kwargs):
    """Create system notification rules after migrations"""
    if sender.name != 'core.domains.notifications':
        return
    
    # Wait for templates to be created first
    try:
        rules_to_create = [
            {
                'name': 'Admin New Client Alert',
                'event_type': 'client.created',
                'template_name': 'New Client Registration',
                'target_roles': ['ADMIN'],
                'conditions': {},
                'delay_minutes': 0,
                'max_frequency_hours': 0,
                'is_active': True
            },
            {
                'name': 'Admin New Event Alert',
                'event_type': 'event.created',
                'template_name': 'Event Created',
                'target_roles': ['ADMIN'],
                'conditions': {},
                'delay_minutes': 5,  # Small delay to ensure event is fully created
                'max_frequency_hours': 0,
                'is_active': True
            },
            {
                'name': 'Admin Event Status Change Alert',
                'event_type': 'event.status_changed',
                'template_name': 'Event Status Changed',
                'target_roles': ['ADMIN'],
                'conditions': {},
                'delay_minutes': 0,
                'max_frequency_hours': 1,  # Max once per hour per status change
                'is_active': True
            },
            {
                'name': 'Admin Task Completion Alert',
                'event_type': 'task.completed',
                'template_name': 'Task Completed',
                'target_roles': ['ADMIN'],
                'conditions': {'is_visible_to_client': True},  # Only for client-visible tasks
                'delay_minutes': 0,
                'max_frequency_hours': 0,
                'is_active': True
            },
            {
                'name': 'Admin Feedback Alert',
                'event_type': 'feedback.received',
                'template_name': 'Feedback Received',
                'target_roles': ['ADMIN'],
                'conditions': {},
                'delay_minutes': 0,
                'max_frequency_hours': 0,
                'is_active': True
            }
        ]
        
        for rule_data in rules_to_create:
            try:
                template = NotificationTemplate.objects.get(name=rule_data['template_name'])
                
                rule, created = NotificationRule.objects.get_or_create(
                    name=rule_data['name'],
                    event_type=rule_data['event_type'],
                    defaults={
                        'template': template,
                        'target_roles': rule_data['target_roles'],
                        'conditions': rule_data['conditions'],
                        'delay_minutes': rule_data['delay_minutes'],
                        'max_frequency_hours': rule_data['max_frequency_hours'],
                        'is_active': rule_data['is_active']
                    }
                )
                
                if created:
                    logger.info(f"Created system notification rule: {rule.name}")
                    
            except NotificationTemplate.DoesNotExist:
                logger.warning(f"Template not found for rule: {rule_data['name']}")
                
    except Exception as e:
        logger.error(f"Error creating system notification rules: {str(e)}")


# Connect signals after apps are ready
@receiver(post_migrate)
def connect_signals_after_migrate(sender, **kwargs):
    """Connect domain signals after all apps are migrated"""
    if sender.name == 'core.domains.notifications':
        # Delay signal connection to ensure all models are available
        from django.utils import timezone
        import threading
        
        def delayed_connect():
            import time
            time.sleep(1)  # Wait for other apps to finish loading
            connect_domain_signals()
        
        thread = threading.Thread(target=delayed_connect)
        thread.daemon = True
        thread.start()