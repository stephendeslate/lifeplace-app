# backend/core/domains/notifications/services.py
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from celery import shared_task
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.template import Template, Context
from django.utils import timezone
from django.conf import settings
from django.db.models import Count, Q

from core.domains.communications.services import CommunicationService
from .exceptions import (
    NotificationTemplateNotFound,
    NotificationPreferenceNotFound,
    NotificationRuleNotFound,
    InvalidNotificationRule,
    NotificationDispatchFailed,
    InvalidNotificationChannel,
    NotificationQuotaExceeded,
    DuplicateNotificationRule
)
from .models import (
    NotificationTemplate,
    NotificationPreference,
    NotificationRule,
    NotificationQueue,
    NotificationHistory,
    InAppNotification
)

User = get_user_model()
logger = logging.getLogger(__name__)


class NotificationTemplateService:
    """Service for managing notification templates"""
    
    @staticmethod
    def get_all_templates(notification_type=None, is_active=None):
        """Get all notification templates with optional filtering"""
        queryset = NotificationTemplate.objects.all()
        
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
            
        return queryset.order_by('notification_type', 'name')
    
    @staticmethod
    def get_template_by_id(template_id):
        """Get template by ID"""
        try:
            return NotificationTemplate.objects.get(id=template_id)
        except NotificationTemplate.DoesNotExist:
            raise NotificationTemplateNotFound()
    
    @staticmethod
    def get_template_by_type(notification_type):
        """Get active template by notification type"""
        try:
            return NotificationTemplate.objects.get(
                notification_type=notification_type,
                is_active=True
            )
        except NotificationTemplate.DoesNotExist:
            raise NotificationTemplateNotFound(
                detail=f"No active template found for type: {notification_type}"
            )
    
    @staticmethod
    def create_template(template_data):
        """Create a new notification template"""
        # Validate channels
        channels = template_data.get('channels', [])
        valid_channels = [choice[0] for choice in NotificationTemplate.CHANNEL_CHOICES]
        for channel in channels:
            if channel not in valid_channels:
                raise InvalidNotificationChannel(detail=f"Invalid channel: {channel}")
        
        template = NotificationTemplate.objects.create(**template_data)
        logger.info(f"Created notification template: {template.name}")
        return template
    
    @staticmethod
    def update_template(template_id, template_data):
        """Update an existing template"""
        template = NotificationTemplateService.get_template_by_id(template_id)
        
        # Validate channels if provided
        if 'channels' in template_data:
            channels = template_data['channels']
            valid_channels = [choice[0] for choice in NotificationTemplate.CHANNEL_CHOICES]
            for channel in channels:
                if channel not in valid_channels:
                    raise InvalidNotificationChannel(detail=f"Invalid channel: {channel}")
        
        for key, value in template_data.items():
            setattr(template, key, value)
        
        template.save()
        logger.info(f"Updated notification template: {template.name}")
        return template
    
    @staticmethod
    def delete_template(template_id):
        """Delete a template (only if not system template)"""
        template = NotificationTemplateService.get_template_by_id(template_id)
        
        if template.is_system:
            raise InvalidNotificationRule(detail="Cannot delete system template")
        
        template.delete()
        logger.info(f"Deleted notification template: {template.name}")
        return True
    
    @staticmethod
    def render_template_content(template, channel, context_data=None):
        """Render template content for a specific channel"""
        if context_data is None:
            context_data = {}
        
        context = Context(context_data)
        
        try:
            if channel == 'EMAIL':
                subject = Template(template.email_subject).render(context) if template.email_subject else ''
                body = Template(template.email_body).render(context) if template.email_body else ''
                return {'subject': subject, 'content': body}
            
            elif channel == 'SMS':
                content = Template(template.sms_body).render(context) if template.sms_body else ''
                return {'subject': '', 'content': content}
            
            elif channel == 'PUSH':
                title = Template(template.push_title).render(context) if template.push_title else ''
                body = Template(template.push_body).render(context) if template.push_body else ''
                return {'subject': title, 'content': body}
            
            elif channel == 'IN_APP':
                title = Template(template.in_app_title).render(context) if template.in_app_title else ''
                body = Template(template.in_app_body).render(context) if template.in_app_body else ''
                return {'subject': title, 'content': body}
            
            else:
                raise InvalidNotificationChannel(detail=f"Unsupported channel: {channel}")
                
        except Exception as e:
            logger.error(f"Error rendering template {template.name} for channel {channel}: {str(e)}")
            raise InvalidNotificationRule(detail=f"Template rendering error: {str(e)}")


class NotificationPreferenceService:
    """Service for managing user notification preferences"""
    
    @staticmethod
    def get_or_create_preferences(user):
        """Get or create notification preferences for a user"""
        preferences, created = NotificationPreference.objects.get_or_create(
            user=user,
            defaults={
                'email_enabled': True,
                'sms_enabled': False,
                'push_enabled': True,
                'in_app_enabled': True,
                'digest_frequency': 'REAL_TIME',
                'notification_settings': {}
            }
        )
        
        if created:
            logger.info(f"Created default notification preferences for user: {user.email}")
        
        return preferences
    
    @staticmethod
    def update_preferences(user, preferences_data):
        """Update user notification preferences"""
        preferences = NotificationPreferenceService.get_or_create_preferences(user)
        
        for key, value in preferences_data.items():
            setattr(preferences, key, value)
        
        preferences.save()
        logger.info(f"Updated notification preferences for user: {user.email}")
        return preferences
    
    @staticmethod
    def update_notification_setting(user, notification_type, channel, enabled):
        """Update specific notification setting"""
        preferences = NotificationPreferenceService.get_or_create_preferences(user)
        
        if notification_type not in preferences.notification_settings:
            preferences.notification_settings[notification_type] = {}
        
        preferences.notification_settings[notification_type][f'{channel.lower()}_enabled'] = enabled
        preferences.save()
        
        logger.info(f"Updated {notification_type} {channel} setting to {enabled} for user: {user.email}")
        return preferences
    
    @staticmethod
    def is_notification_allowed(user, notification_type, channel):
        """Check if a notification is allowed for a user"""
        try:
            preferences = NotificationPreference.objects.get(user=user)
        except NotificationPreference.DoesNotExist:
            # Create default preferences
            preferences = NotificationPreferenceService.get_or_create_preferences(user)
        
        # Check if notification is enabled for this type and channel
        return preferences.is_notification_enabled(notification_type, channel)
    
    @staticmethod
    def is_in_quiet_hours(user):
        """Check if user is currently in quiet hours"""
        try:
            preferences = NotificationPreference.objects.get(user=user)
        except NotificationPreference.DoesNotExist:
            return False
        
        if not preferences.quiet_hours_enabled:
            return False
        
        if not preferences.quiet_hours_start or not preferences.quiet_hours_end:
            return False
        
        # Get current time in user's timezone
        import pytz
        try:
            user_tz = pytz.timezone(preferences.quiet_hours_timezone)
            current_time = timezone.now().astimezone(user_tz).time()
            
            # Check if current time is within quiet hours
            if preferences.quiet_hours_start <= preferences.quiet_hours_end:
                # Same day range
                return preferences.quiet_hours_start <= current_time <= preferences.quiet_hours_end
            else:
                # Overnight range
                return current_time >= preferences.quiet_hours_start or current_time <= preferences.quiet_hours_end
                
        except Exception as e:
            logger.error(f"Error checking quiet hours for user {user.email}: {str(e)}")
            return False


class NotificationRuleService:
    """Service for managing notification rules"""
    
    @staticmethod
    def get_all_rules(event_type=None, is_active=None):
        """Get all notification rules with optional filtering"""
        queryset = NotificationRule.objects.select_related('template').prefetch_related('target_users')
        
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
            
        return queryset.order_by('event_type', 'name')
    
    @staticmethod
    def get_rule_by_id(rule_id):
        """Get rule by ID"""
        try:
            return NotificationRule.objects.select_related('template').get(id=rule_id)
        except NotificationRule.DoesNotExist:
            raise NotificationRuleNotFound()
    
    @staticmethod
    def create_rule(rule_data):
        """Create a new notification rule"""
        # Check for duplicate rules
        existing_rule = NotificationRule.objects.filter(
            name=rule_data['name'],
            event_type=rule_data['event_type']
        ).first()
        
        if existing_rule:
            raise DuplicateNotificationRule(
                detail=f"Rule with name '{rule_data['name']}' already exists for event type '{rule_data['event_type']}'"
            )
        
        rule = NotificationRule.objects.create(**rule_data)
        logger.info(f"Created notification rule: {rule.name}")
        return rule
    
    @staticmethod
    def update_rule(rule_id, rule_data):
        """Update an existing rule"""
        rule = NotificationRuleService.get_rule_by_id(rule_id)
        
        for key, value in rule_data.items():
            setattr(rule, key, value)
        
        rule.save()
        logger.info(f"Updated notification rule: {rule.name}")
        return rule
    
    @staticmethod
    def delete_rule(rule_id):
        """Delete a notification rule"""
        rule = NotificationRuleService.get_rule_by_id(rule_id)
        rule.delete()
        logger.info(f"Deleted notification rule: {rule.name}")
        return True
    
    @staticmethod
    def get_matching_rules(event_type, event_data=None):
        """Get rules that match the given event"""
        rules = NotificationRule.objects.filter(
            event_type=event_type,
            is_active=True
        ).select_related('template').prefetch_related('target_users')
        
        matching_rules = []
        
        for rule in rules:
            if NotificationRuleService._evaluate_conditions(rule.conditions, event_data):
                matching_rules.append(rule)
        
        return matching_rules
    
    @staticmethod
    def _evaluate_conditions(conditions, event_data):
        """Evaluate rule conditions against event data"""
        if not conditions or not event_data:
            return True
        
        try:
            for field, condition in conditions.items():
                if field not in event_data:
                    return False
                
                event_value = event_data[field]
                
                if isinstance(condition, dict):
                    # Complex condition with operators
                    for operator, expected_value in condition.items():
                        if operator == 'eq' and event_value != expected_value:
                            return False
                        elif operator == 'ne' and event_value == expected_value:
                            return False
                        elif operator == 'in' and event_value not in expected_value:
                            return False
                        elif operator == 'not_in' and event_value in expected_value:
                            return False
                        elif operator == 'gt' and event_value <= expected_value:
                            return False
                        elif operator == 'gte' and event_value < expected_value:
                            return False
                        elif operator == 'lt' and event_value >= expected_value:
                            return False
                        elif operator == 'lte' and event_value > expected_value:
                            return False
                else:
                    # Simple equality condition
                    if event_value != condition:
                        return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error evaluating rule conditions: {str(e)}")
            return False


class NotificationDispatchService:
    """Service for dispatching notifications"""
    
    @staticmethod
    def dispatch_notification(
        notification_type: str,
        recipients: List[Any],
        context_data: Dict[str, Any] = None,
        source_object=None,
        priority: str = 'MEDIUM',
        delay_minutes: int = 0
    ):
        """Dispatch notification to multiple recipients"""
        if context_data is None:
            context_data = {}
        
        try:
            template = NotificationTemplateService.get_template_by_type(notification_type)
        except NotificationTemplateNotFound:
            logger.error(f"No template found for notification type: {notification_type}")
            return []
        
        queued_notifications = []
        
        for recipient in recipients:
            # Check user preferences for each supported channel
            for channel in template.channels:
                if NotificationPreferenceService.is_notification_allowed(recipient, notification_type, channel):
                    # Check quiet hours for non-urgent notifications
                    if priority != 'URGENT' and NotificationPreferenceService.is_in_quiet_hours(recipient):
                        # Schedule for after quiet hours
                        delay_minutes = max(delay_minutes, 60)  # At least 1 hour delay
                    
                    notification = NotificationDispatchService._queue_notification(
                        template=template,
                        recipient=recipient,
                        channel=channel,
                        context_data=context_data,
                        source_object=source_object,
                        priority=priority,
                        delay_minutes=delay_minutes
                    )
                    
                    if notification:
                        queued_notifications.append(notification)
        
        # Process notifications asynchronously
        if queued_notifications:
            process_notification_queue.delay()
        
        return queued_notifications
    
    @staticmethod
    def dispatch_from_event(event_type: str, event_data: Dict[str, Any], source_object=None):
        """Dispatch notifications based on event rules"""
        matching_rules = NotificationRuleService.get_matching_rules(event_type, event_data)
        
        if not matching_rules:
            logger.debug(f"No matching rules for event type: {event_type}")
            return []
        
        all_notifications = []
        
        for rule in matching_rules:
            # Get target recipients
            recipients = NotificationDispatchService._get_rule_recipients(rule)
            
            if recipients:
                # Check frequency limits
                if NotificationDispatchService._check_frequency_limit(rule, recipients):
                    notifications = NotificationDispatchService.dispatch_notification(
                        notification_type=rule.template.notification_type,
                        recipients=recipients,
                        context_data=event_data,
                        source_object=source_object,
                        priority=rule.template.priority,
                        delay_minutes=rule.delay_minutes
                    )
                    all_notifications.extend(notifications)
        
        return all_notifications
    
    @staticmethod
    def _queue_notification(template, recipient, channel, context_data, source_object, priority, delay_minutes):
        """Queue a single notification for delivery"""
        try:
            # Render template content
            rendered = NotificationTemplateService.render_template_content(
                template, channel, context_data
            )
            
            # Calculate scheduled time
            scheduled_at = timezone.now()
            if delay_minutes > 0:
                scheduled_at += timedelta(minutes=delay_minutes)
            
            # Get content type and object id if source object provided
            content_type = None
            object_id = None
            if source_object:
                content_type = ContentType.objects.get_for_model(source_object)
                object_id = source_object.id
            
            notification = NotificationQueue.objects.create(
                template=template,
                recipient=recipient,
                channel=channel,
                subject=rendered['subject'],
                content=rendered['content'],
                context_data=context_data,
                priority=priority,
                scheduled_at=scheduled_at,
                content_type=content_type,
                object_id=object_id
            )
            
            logger.info(f"Queued {channel} notification for {recipient.email}: {template.name}")
            return notification
            
        except Exception as e:
            logger.error(f"Error queueing notification: {str(e)}")
            return None
    
    @staticmethod
    def _get_rule_recipients(rule):
        """Get recipients for a notification rule"""
        recipients = []
        
        # Add specific target users
        recipients.extend(rule.target_users.filter(is_active=True))
        
        # Add users by role
        if rule.target_roles:
            role_users = User.objects.filter(
                role__in=rule.target_roles,
                is_active=True
            )
            recipients.extend(role_users)
        
        # Remove duplicates
        return list(set(recipients))
    
    @staticmethod
    def _check_frequency_limit(rule, recipients):
        """Check if frequency limit allows sending notification"""
        if rule.max_frequency_hours == 0:
            return True  # No frequency limit
        
        # Check if any recipient has received this notification type recently
        cutoff_time = timezone.now() - timedelta(hours=rule.max_frequency_hours)
        
        recent_notifications = NotificationHistory.objects.filter(
            notification_type=rule.template.notification_type,
            recipient__in=recipients,
            sent_at__gt=cutoff_time
        )
        
        if recent_notifications.exists():
            logger.debug(f"Frequency limit reached for rule: {rule.name}")
            return False
        
        return True


class NotificationAnalyticsService:
    """Service for notification analytics and reporting"""
    
    @staticmethod
    def get_delivery_stats(days=30, notification_type=None, user_id=None):
        """Get notification delivery statistics"""
        from django.db.models import Count, Q
        
        start_date = timezone.now() - timedelta(days=days)
        queryset = NotificationHistory.objects.filter(sent_at__gte=start_date)
        
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        if user_id:
            queryset = queryset.filter(recipient_id=user_id)
        
        stats = queryset.aggregate(
            total_sent=Count('id'),
            delivered=Count('id', filter=Q(delivery_status='DELIVERED')),
            opened=Count('id', filter=Q(delivery_status='OPENED')),
            clicked=Count('id', filter=Q(delivery_status='CLICKED')),
            failed=Count('id', filter=Q(delivery_status='FAILED')),
            bounced=Count('id', filter=Q(delivery_status='BOUNCED'))
        )
        
        # Calculate rates
        total = stats['total_sent'] or 1
        stats['delivery_rate'] = round((stats['delivered'] / total) * 100, 2)
        stats['open_rate'] = round((stats['opened'] / total) * 100, 2)
        stats['click_rate'] = round((stats['clicked'] / total) * 100, 2)
        stats['failure_rate'] = round((stats['failed'] / total) * 100, 2)
        
        return stats
    
    @staticmethod
    def get_channel_performance(days=30):
        """Get performance stats by channel"""
        from django.db.models import Count
        
        start_date = timezone.now() - timedelta(days=days)
        
        channel_stats = NotificationHistory.objects.filter(
            sent_at__gte=start_date
        ).values('channel').annotate(
            total=Count('id'),
            delivered=Count('id', filter=Q(delivery_status='DELIVERED')),
            failed=Count('id', filter=Q(delivery_status='FAILED'))
        ).order_by('-total')
        
        return list(channel_stats)
    
    @staticmethod
    def get_user_engagement(user_id, days=30):
        """Get engagement stats for a specific user"""
        start_date = timezone.now() - timedelta(days=days)
        
        user_stats = NotificationHistory.objects.filter(
            recipient_id=user_id,
            sent_at__gte=start_date
        ).aggregate(
            total_received=Count('id'),
            total_opened=Count('id', filter=Q(is_read=True)),
            total_clicked=Count('id', filter=Q(delivery_status='CLICKED'))
        )
        
        # Get in-app notification stats
        in_app_stats = InAppNotification.objects.filter(
            recipient_id=user_id,
            created_at__gte=start_date
        ).aggregate(
            total_in_app=Count('id'),
            read_in_app=Count('id', filter=Q(is_read=True))
        )
        
        user_stats.update(in_app_stats)
        return user_stats


class InAppNotificationService:
    """Service for in-app notifications"""
    
    @staticmethod
    def create_notification(
        recipient: Any,
        title: str,
        message: str,
        notification_type: str,
        priority: str = 'MEDIUM',
        action_url: str = None,
        action_data: Dict[str, Any] = None,
        source_object=None,
        expires_hours: int = 168  # 7 days default
    ):
        """Create an in-app notification"""
        
        # Calculate expiration time
        expires_at = timezone.now() + timedelta(hours=expires_hours)
        
        # Get content type and object id if source object provided
        content_type = None
        object_id = None
        if source_object:
            content_type = ContentType.objects.get_for_model(source_object)
            object_id = source_object.id
        
        notification = InAppNotification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
            priority=priority,
            action_url=action_url or '',
            action_data=action_data or {},
            expires_at=expires_at,
            content_type=content_type,
            object_id=object_id
        )
        
        logger.info(f"Created in-app notification for {recipient.email}: {title}")
        return notification
    
    @staticmethod
    def get_user_notifications(user, limit=50, unread_only=False):
        """Get in-app notifications for a user"""
        queryset = InAppNotification.objects.filter(recipient=user)
        
        if unread_only:
            queryset = queryset.filter(is_read=False)
        
        # Exclude expired notifications
        queryset = queryset.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        )
        
        return queryset.order_by('-created_at')[:limit]
    
    @staticmethod
    def mark_as_read(notification_id, user):
        """Mark notification as read"""
        try:
            notification = InAppNotification.objects.get(
                id=notification_id,
                recipient=user
            )
            notification.mark_as_read()
            return notification
        except InAppNotification.DoesNotExist:
            logger.warning(f"In-app notification {notification_id} not found for user {user.email}")
            return None
    
    @staticmethod
    def mark_all_as_read(user):
        """Mark all notifications as read for a user"""
        count = InAppNotification.objects.filter(
            recipient=user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        logger.info(f"Marked {count} notifications as read for user {user.email}")
        return count
    
    @staticmethod
    def cleanup_expired_notifications():
        """Remove expired notifications"""
        expired_notifications = InAppNotification.objects.filter(
            expires_at__lt=timezone.now()
        )
        
        count = expired_notifications.count()
        expired_notifications.delete()
        
        logger.info(f"Cleaned up {count} expired in-app notifications")
        return count


# Celery Tasks
@shared_task
def process_notification_queue():
    """Process queued notifications"""
    logger.info("Processing notification queue...")
    
    # Get pending notifications that are ready to send
    pending_notifications = NotificationQueue.objects.filter(
        status='PENDING',
        scheduled_at__lte=timezone.now()
    ).order_by('priority', 'scheduled_at')[:100]  # Process in batches
    
    if not pending_notifications:
        logger.debug("No pending notifications to process")
        return
    
    communication_service = CommunicationService()
    processed_count = 0
    
    for notification in pending_notifications:
        try:
            # Mark as processing
            notification.status = 'PROCESSING'
            notification.attempts += 1
            notification.save()
            
            # Send notification based on channel
            if notification.channel in ['EMAIL', 'SMS']:
                # Use existing communication service
                record = communication_service.send_communication_by_template(
                    template=None,  # We already have rendered content
                    recipient=notification.recipient.email if notification.channel == 'EMAIL' else getattr(notification.recipient.profile, 'phone', ''),
                    context_data=notification.context_data,
                    client=notification.recipient,
                    sent_by=None
                )
                
                if record:
                    # Create notification history
                    NotificationHistory.objects.create(
                        template_name=notification.template.name,
                        notification_type=notification.template.notification_type,
                        channel=notification.channel,
                        recipient=notification.recipient,
                        recipient_email=notification.recipient.email,
                        subject=notification.subject,
                        content=notification.content,
                        context_data=notification.context_data,
                        external_message_id=record.external_message_id,
                        sent_at=timezone.now(),
                        delivery_status='SENT',
                        content_type=notification.content_type,
                        object_id=notification.object_id,
                        queue_id=notification.id
                    )
                    
                    notification.status = 'SENT'
                    notification.save()
                    processed_count += 1
                    
                else:
                    raise Exception("Communication service returned None")
            
            elif notification.channel == 'IN_APP':
                # Create in-app notification
                InAppNotificationService.create_notification(
                    recipient=notification.recipient,
                    title=notification.subject,
                    message=notification.content,
                    notification_type=notification.template.notification_type,
                    priority=notification.priority,
                    source_object=notification.content_object
                )
                
                notification.status = 'SENT'
                notification.save()
                processed_count += 1
            
            elif notification.channel == 'PUSH':
                # TODO: Implement push notification service
                logger.warning(f"Push notifications not yet implemented for notification {notification.id}")
                notification.status = 'FAILED'
                notification.error_message = "Push notifications not implemented"
                notification.save()
            
        except Exception as e:
            logger.error(f"Error processing notification {notification.id}: {str(e)}")
            
            notification.error_message = str(e)
            
            if notification.attempts >= notification.max_attempts:
                notification.status = 'FAILED'
            else:
                notification.status = 'PENDING'
                # Reschedule for retry (exponential backoff)
                notification.scheduled_at = timezone.now() + timedelta(
                    minutes=2 ** notification.attempts
                )
            
            notification.save()
    
    logger.info(f"Processed {processed_count} notifications")


@shared_task
def cleanup_notification_history(days_to_keep=90):
    """Clean up old notification history"""
    cutoff_date = timezone.now() - timedelta(days=days_to_keep)
    
    deleted_count = NotificationHistory.objects.filter(
        sent_at__lt=cutoff_date
    ).delete()[0]
    
    logger.info(f"Cleaned up {deleted_count} old notification history records")
    return deleted_count


@shared_task
def cleanup_expired_in_app_notifications():
    """Clean up expired in-app notifications"""
    count = InAppNotificationService.cleanup_expired_notifications()
    return count


@shared_task
def send_daily_digest():
    """Send daily digest notifications"""
    logger.info("Sending daily digest notifications...")
    
    # Get users who have daily digest enabled
    users_with_digest = NotificationPreference.objects.filter(
        digest_frequency='DAILY',
        email_enabled=True
    ).select_related('user')
    
    for preferences in users_with_digest:
        user = preferences.user
        
        # Get today's notifications for this user
        today = timezone.now().date()
        start_of_day = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        end_of_day = timezone.make_aware(datetime.combine(today, datetime.max.time()))
        
        daily_notifications = NotificationHistory.objects.filter(
            recipient=user,
            sent_at__range=(start_of_day, end_of_day)
        ).order_by('-sent_at')
        
        if daily_notifications.exists():
            # Create digest context
            context_data = {
                'user_name': user.get_full_name() or user.email,
                'notification_count': daily_notifications.count(),
                'notifications': [
                    {
                        'title': notif.subject or notif.template_name,
                        'content': notif.content[:100] + '...' if len(notif.content) > 100 else notif.content,
                        'sent_at': notif.sent_at,
                        'channel': notif.channel
                    }
                    for notif in daily_notifications[:10]  # Limit to 10 most recent
                ],
                'date': today.strftime('%B %d, %Y')
            }
            
            # Send digest notification
            NotificationDispatchService.dispatch_notification(
                notification_type='DAILY_SUMMARY',
                recipients=[user],
                context_data=context_data,
                priority='LOW'
            )
    
    logger.info("Daily digest notifications sent")