# backend/core/domains/notifications/tasks.py
import logging
from datetime import datetime, timedelta
from celery import shared_task
from django.utils import timezone
from django.db.models import Q

from .models import NotificationQueue, NotificationHistory, InAppNotification
from .services import (
    NotificationDispatchService,
    InAppNotificationService,
    process_notification_queue,
    cleanup_notification_history,
    cleanup_expired_in_app_notifications,
    send_daily_digest
)

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_notification_queue_task(self):
    """Celery task to process notification queue"""
    try:
        return process_notification_queue()
    except Exception as e:
        logger.error(f"Error processing notification queue: {str(e)}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task
def cleanup_old_notifications():
    """Clean up old notification records"""
    try:
        # Clean up notification history older than 90 days
        history_count = cleanup_notification_history(days_to_keep=90)
        
        # Clean up expired in-app notifications
        in_app_count = cleanup_expired_in_app_notifications()
        
        # Clean up old failed queue items (older than 7 days)
        failed_cutoff = timezone.now() - timedelta(days=7)
        failed_count = NotificationQueue.objects.filter(
            status='FAILED',
            created_at__lt=failed_cutoff
        ).delete()[0]
        
        logger.info(f"Cleanup completed: {history_count} history, {in_app_count} in-app, {failed_count} failed queue items")
        
        return {
            'history_cleaned': history_count,
            'in_app_cleaned': in_app_count,
            'failed_queue_cleaned': failed_count
        }
        
    except Exception as e:
        logger.error(f"Error during notification cleanup: {str(e)}")
        raise


@shared_task
def send_daily_digest_task():
    """Send daily digest notifications"""
    try:
        return send_daily_digest()
    except Exception as e:
        logger.error(f"Error sending daily digest: {str(e)}")
        raise


@shared_task
def send_weekly_report():
    """Send weekly report notifications"""
    from django.contrib.auth import get_user_model
    from .services import NotificationAnalyticsService
    
    User = get_user_model()
    
    try:
        # Get all admin users
        admin_users = User.objects.filter(role='ADMIN', is_active=True)
        
        # Generate weekly stats
        stats = NotificationAnalyticsService.get_delivery_stats(days=7)
        channel_stats = NotificationAnalyticsService.get_channel_performance(days=7)
        
        # Create context for weekly report
        context_data = {
            'week_start': (timezone.now() - timedelta(days=7)).strftime('%B %d, %Y'),
            'week_end': timezone.now().strftime('%B %d, %Y'),
            'total_sent': stats['total_sent'],
            'delivery_rate': stats['delivery_rate'],
            'open_rate': stats['open_rate'],
            'failure_rate': stats['failure_rate'],
            'channel_performance': channel_stats,
        }
        
        # Send weekly report to admins
        notifications = NotificationDispatchService.dispatch_notification(
            notification_type='WEEKLY_REPORT',
            recipients=list(admin_users),
            context_data=context_data,
            priority='LOW'
        )
        
        logger.info(f"Sent weekly report to {len(admin_users)} admin users")
        return {'reports_sent': len(notifications)}
        
    except Exception as e:
        logger.error(f"Error sending weekly report: {str(e)}")
        raise


@shared_task
def check_overdue_tasks():
    """Check for overdue tasks and send notifications"""
    try:
        from core.domains.events.models import EventTask
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Get overdue tasks
        overdue_tasks = EventTask.objects.filter(
            status__in=['PENDING', 'IN_PROGRESS'],
            due_date__lt=timezone.now()
        ).select_related('event', 'event__client', 'assigned_to')
        
        notification_count = 0
        
        for task in overdue_tasks:
            # Check if we've already sent an overdue notification recently
            recent_notification = NotificationHistory.objects.filter(
                notification_type='TASK_OVERDUE',
                context_data__contains={'task_id': task.id},
                sent_at__gt=timezone.now() - timedelta(hours=24)
            ).exists()
            
            if not recent_notification:
                # Send overdue notification
                recipients = []
                
                # Add assigned user if exists
                if task.assigned_to and task.assigned_to.is_active:
                    recipients.append(task.assigned_to)
                
                # Add admin users
                admin_users = User.objects.filter(role='ADMIN', is_active=True)
                recipients.extend(admin_users)
                
                if recipients:
                    NotificationDispatchService.dispatch_notification(
                        notification_type='TASK_OVERDUE',
                        recipients=list(set(recipients)),  # Remove duplicates
                        context_data={
                            'task_id': task.id,
                            'task_title': task.title,
                            'task_description': task.description,
                            'due_date': task.due_date.isoformat(),
                            'days_overdue': (timezone.now().date() - task.due_date.date()).days,
                            'event_id': task.event.id,
                            'event_name': task.event.name or f"Event for {task.event.client.get_full_name()}",
                            'client_id': task.event.client.id,
                            'client_name': task.event.client.get_full_name() or task.event.client.email,
                            'client_email': task.event.client.email,
                            'assigned_to_id': task.assigned_to.id if task.assigned_to else None,
                            'assigned_to_name': task.assigned_to.get_full_name() if task.assigned_to else None,
                            'priority': task.priority,
                        },
                        source_object=task,
                        priority='HIGH'
                    )
                    notification_count += 1
        
        logger.info(f"Sent {notification_count} overdue task notifications")
        return {'overdue_notifications_sent': notification_count}
        
    except Exception as e:
        logger.error(f"Error checking overdue tasks: {str(e)}")
        raise


@shared_task
def check_upcoming_deadlines():
    """Check for upcoming event deadlines and send notifications"""
    try:
        from core.domains.events.models import Event
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Check for events starting in 24-48 hours
        tomorrow = timezone.now() + timedelta(days=1)
        day_after = timezone.now() + timedelta(days=2)
        
        upcoming_events = Event.objects.filter(
            start_date__range=(tomorrow, day_after),
            status__in=['CONFIRMED', 'LEAD']
        ).select_related('client', 'event_type')
        
        notification_count = 0
        
        for event in upcoming_events:
            # Check if we've already sent a deadline notification recently
            recent_notification = NotificationHistory.objects.filter(
                notification_type='EVENT_DEADLINE_APPROACHING',
                context_data__contains={'event_id': event.id},
                sent_at__gt=timezone.now() - timedelta(hours=12)
            ).exists()
            
            if not recent_notification:
                # Send deadline notification
                admin_users = User.objects.filter(role='ADMIN', is_active=True)
                
                if admin_users.exists():
                    hours_until = int((event.start_date - timezone.now()).total_seconds() / 3600)
                    
                    NotificationDispatchService.dispatch_notification(
                        notification_type='EVENT_DEADLINE_APPROACHING',
                        recipients=list(admin_users),
                        context_data={
                            'event_id': event.id,
                            'event_name': event.name or f"Event for {event.client.get_full_name()}",
                            'client_id': event.client.id,
                            'client_name': event.client.get_full_name() or event.client.email,
                            'client_email': event.client.email,
                            'event_type': event.event_type.name if event.event_type else 'Unknown',
                            'start_date': event.start_date.isoformat(),
                            'end_date': event.end_date.isoformat() if event.end_date else None,
                            'status': event.status,
                            'hours_until': hours_until,
                            'total_price': str(event.total_price) if event.total_price else None,
                        },
                        source_object=event,
                        priority='HIGH'
                    )
                    notification_count += 1
        
        logger.info(f"Sent {notification_count} deadline approaching notifications")
        return {'deadline_notifications_sent': notification_count}
        
    except Exception as e:
        logger.error(f"Error checking upcoming deadlines: {str(e)}")
        raise


@shared_task
def update_notification_delivery_status():
    """Update notification delivery status from external providers"""
    try:
        from core.domains.communications.services import CommunicationService
        
        # Get notifications that were sent but don't have final delivery status
        pending_notifications = NotificationHistory.objects.filter(
            delivery_status__in=['SENT', 'PENDING'],
            external_message_id__isnull=False,
            sent_at__gt=timezone.now() - timedelta(days=7)  # Only check recent notifications
        )
        
        communication_service = CommunicationService()
        updated_count = 0
        
        for notification in pending_notifications[:100]:  # Process in batches
            try:
                # Try to get updated status from provider
                new_status = communication_service.provider.get_delivery_status(
                    notification.external_message_id
                )
                
                if new_status and new_status != notification.delivery_status:
                    notification.delivery_status = new_status
                    
                    if new_status == 'DELIVERED' and not notification.delivered_at:
                        notification.delivered_at = timezone.now()
                    
                    notification.save()
                    updated_count += 1
                    
            except Exception as e:
                logger.warning(f"Failed to update status for notification {notification.id}: {str(e)}")
                continue
        
        logger.info(f"Updated delivery status for {updated_count} notifications")
        return {'status_updates': updated_count}
        
    except Exception as e:
        logger.error(f"Error updating notification delivery status: {str(e)}")
        raise


@shared_task
def generate_notification_metrics():
    """Generate and cache notification metrics for dashboard"""
    try:
        from django.core.cache import cache
        from .services import NotificationAnalyticsService
        
        # Generate metrics for different time periods
        time_periods = [1, 7, 30, 90]
        metrics = {}
        
        for days in time_periods:
            stats = NotificationAnalyticsService.get_delivery_stats(days=days)
            channel_stats = NotificationAnalyticsService.get_channel_performance(days=days)
            
            metrics[f'{days}_day'] = {
                'delivery_stats': stats,
                'channel_performance': channel_stats,
                'generated_at': timezone.now().isoformat()
            }
        
        # Cache metrics for 1 hour
        cache.set('notification_metrics', metrics, 3600)
        
        logger.info("Generated and cached notification metrics")
        return {'metrics_generated': True, 'periods': time_periods}
        
    except Exception as e:
        logger.error(f"Error generating notification metrics: {str(e)}")
        raise


# Periodic task to ensure queue processing
@shared_task
def ensure_queue_processing():
    """Ensure notification queue is being processed regularly"""
    try:
        # Check if there are pending notifications
        pending_count = NotificationQueue.objects.filter(
            status='PENDING',
            scheduled_at__lte=timezone.now()
        ).count()
        
        if pending_count > 0:
            logger.info(f"Found {pending_count} pending notifications, triggering queue processing")
            process_notification_queue_task.delay()
        
        # Check for stuck processing notifications (processing for more than 10 minutes)
        stuck_notifications = NotificationQueue.objects.filter(
            status='PROCESSING',
            updated_at__lt=timezone.now() - timedelta(minutes=10)
        )
        
        if stuck_notifications.exists():
            stuck_count = stuck_notifications.update(status='PENDING')
            logger.warning(f"Reset {stuck_count} stuck notifications back to pending")
        
        return {
            'pending_notifications': pending_count,
            'stuck_notifications_reset': stuck_notifications.count() if stuck_notifications.exists() else 0
        }
        
    except Exception as e:
        logger.error(f"Error ensuring queue processing: {str(e)}")
        raise