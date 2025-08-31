# backend/core/domains/notifications/tasks.py

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from .exceptions import (
    InvalidNotificationDataException,
    NotificationDeliveryException,
    NotificationTypeNotFoundException,
)
from .models import (
    Notification,
    NotificationDigest,
    NotificationPreference,
    NotificationType,
)
from .services import NotificationService, NotificationDigestService

User = get_user_model()
logger = logging.getLogger(__name__)

# Rate limiting decorator
def rate_limit_check(user_id: int, notification_type_code: str) -> bool:
    """Check if user has exceeded rate limits for notifications"""
    cache_key = f"notification_rate_limit:{user_id}:{notification_type_code}"
    current_count = cache.get(cache_key, 0)
    
    # Get rate limit from settings (default 100/hour)
    rate_limit = getattr(settings, 'NOTIFICATION_RATE_LIMIT', '100/hour')
    limit_count = int(rate_limit.split('/')[0])
    
    if current_count >= limit_count:
        logger.warning(f"Rate limit exceeded for user {user_id}, type {notification_type_code}")
        return False
    
    # Increment counter with 1-hour expiry
    cache.set(cache_key, current_count + 1, timeout=3600)
    return True


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def create_notification_async(
    self,
    recipient_id: int,
    notification_type_code: str,
    context: Optional[Dict[str, Any]] = None,
    delivery_methods: Optional[List[str]] = None,
    event_id: Optional[int] = None,
    client_id: Optional[int] = None
):
    """
    Asynchronously create and deliver a notification
    
    Args:
        recipient_id: ID of the user to receive notification
        notification_type_code: Code of the notification type
        context: Template context data
        delivery_methods: List of delivery methods to use
        event_id: Related event ID
        client_id: Related client ID
    """
    try:
        # Rate limiting check
        if not rate_limit_check(recipient_id, notification_type_code):
            logger.warning(
                f"Notification creation skipped due to rate limiting: "
                f"user={recipient_id}, type={notification_type_code}"
            )
            return {'status': 'rate_limited', 'notification_id': None}
        
        # Get recipient
        try:
            recipient = User.objects.get(id=recipient_id, is_active=True)
        except User.DoesNotExist:
            logger.error(f"Recipient user not found: {recipient_id}")
            return {'status': 'error', 'message': 'Recipient not found'}
        
        # Get related objects
        event = None
        client = None
        
        if event_id:
            try:
                from core.domains.events.models import Event
                event = Event.objects.get(id=event_id)
            except:
                logger.warning(f"Event not found: {event_id}")
        
        if client_id:
            try:
                client = User.objects.get(id=client_id, role='CLIENT')
            except User.DoesNotExist:
                logger.warning(f"Client not found: {client_id}")
        
        # Create notification
        notification = NotificationService.create_notification(
            recipient=recipient,
            notification_type_code=notification_type_code,
            context=context or {},
            delivery_methods=delivery_methods,
            event=event,
            client=client
        )
        
        if notification:
            logger.info(
                f"✅ Notification created successfully: {notification.id} "
                f"for {recipient.email}"
            )
            
            # Update metrics
            update_notification_metrics.delay(
                notification_type_code=notification_type_code,
                delivery_methods=notification.delivered_via,
                success=True
            )
            
            return {
                'status': 'success',
                'notification_id': notification.id,
                'delivered_via': notification.delivered_via
            }
        else:
            logger.info(f"Notification creation skipped (user preferences): {recipient.email}")
            return {'status': 'skipped', 'notification_id': None}
            
    except NotificationTypeNotFoundException as e:
        logger.error(f"Notification type not found: {notification_type_code}")
        return {'status': 'error', 'message': str(e)}
        
    except InvalidNotificationDataException as e:
        logger.error(f"Invalid notification data: {str(e)}")
        return {'status': 'error', 'message': str(e)}
        
    except Exception as e:
        logger.error(
            f"❌ Notification creation failed: {str(e)} "
            f"(user={recipient_id}, type={notification_type_code})"
        )
        
        # Retry on failure
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying notification creation (attempt {self.request.retries + 1})")
            raise self.retry(countdown=60 * (2 ** self.request.retries))
        
        # Update failure metrics
        update_notification_metrics.delay(
            notification_type_code=notification_type_code,
            delivery_methods=[],
            success=False,
            error=str(e)
        )
        
        return {'status': 'error', 'message': str(e)}


@shared_task(bind=True, max_retries=3)
def bulk_create_notifications_async(
    self,
    recipient_ids: List[int],
    notification_type_code: str,
    context: Optional[Dict[str, Any]] = None,
    delivery_methods: Optional[List[str]] = None
):
    """
    Create notifications for multiple recipients asynchronously
    """
    results = []
    
    for recipient_id in recipient_ids:
        try:
            # Create individual notification task
            result = create_notification_async.delay(
                recipient_id=recipient_id,
                notification_type_code=notification_type_code,
                context=context,
                delivery_methods=delivery_methods
            )
            results.append({
                'recipient_id': recipient_id,
                'task_id': result.id,
                'status': 'queued'
            })
        except Exception as e:
            logger.error(f"Failed to queue notification for user {recipient_id}: {str(e)}")
            results.append({
                'recipient_id': recipient_id,
                'task_id': None,
                'status': 'error',
                'error': str(e)
            })
    
    logger.info(f"Queued {len(results)} notification tasks for type {notification_type_code}")
    return results


@shared_task
def cleanup_old_notifications():
    """Clean up old read notifications based on configured retention period"""
    try:
        cleanup_days = getattr(settings, 'NOTIFICATION_CLEANUP_DAYS', 90)
        count = NotificationService.cleanup_old_notifications(days=cleanup_days)
        
        logger.info(f"🧹 Cleaned up {count} old notifications (older than {cleanup_days} days)")
        
        # Update cleanup metrics
        cache.set('notification_cleanup_last_run', timezone.now().isoformat(), timeout=86400)
        cache.set('notification_cleanup_last_count', count, timeout=86400)
        
        return {'status': 'success', 'cleaned_count': count}
        
    except Exception as e:
        logger.error(f"❌ Notification cleanup failed: {str(e)}")
        return {'status': 'error', 'message': str(e)}


@shared_task
def auto_expire_notifications():
    """Mark notifications as expired based on their expiry settings"""
    try:
        count = NotificationService.auto_expire_notifications()
        
        logger.info(f"⏰ Marked {count} notifications as expired")
        
        # Update expiry metrics
        cache.set('notification_expiry_last_run', timezone.now().isoformat(), timeout=86400)
        cache.set('notification_expiry_last_count', count, timeout=86400)
        
        return {'status': 'success', 'expired_count': count}
        
    except Exception as e:
        logger.error(f"❌ Notification expiry task failed: {str(e)}")
        return {'status': 'error', 'message': str(e)}


@shared_task
def auto_read_old_notifications():
    """Automatically mark very old notifications as read"""
    try:
        auto_read_days = getattr(settings, 'NOTIFICATION_AUTO_READ_DAYS', 30)
        cutoff_date = timezone.now() - timedelta(days=auto_read_days)
        
        with transaction.atomic():
            count = Notification.objects.filter(
                created_at__lt=cutoff_date,
                is_read=False,
                is_expired=False
            ).update(
                is_read=True,
                read_at=timezone.now(),
                updated_at=timezone.now()
            )
        
        logger.info(f"📖 Auto-marked {count} old notifications as read")
        
        return {'status': 'success', 'auto_read_count': count}
        
    except Exception as e:
        logger.error(f"❌ Auto-read notifications task failed: {str(e)}")
        return {'status': 'error', 'message': str(e)}


@shared_task
def send_notification_digest(user_id: int, frequency: str):
    """Send notification digest to a user"""
    try:
        user = User.objects.get(id=user_id)
        
        # Calculate period based on frequency
        now = timezone.now()
        if frequency == 'HOURLY':
            period_start = now - timedelta(hours=1)
        elif frequency == 'DAILY':
            period_start = now - timedelta(days=1)
        elif frequency == 'WEEKLY':
            period_start = now - timedelta(weeks=1)
        else:
            logger.error(f"Invalid digest frequency: {frequency}")
            return {'status': 'error', 'message': 'Invalid frequency'}
        
        # Create digest
        digest = NotificationDigestService.create_digest(
            user=user,
            frequency=frequency,
            period_start=period_start,
            period_end=now
        )
        
        if digest:
            # Send digest
            result = NotificationDigestService.send_digest(digest.id)
            
            logger.info(f"📬 Sent {frequency} digest to {user.email} ({digest.notification_count} notifications)")
            
            return {
                'status': 'success',
                'digest_id': digest.id,
                'notification_count': digest.notification_count
            }
        else:
            logger.info(f"No notifications for digest: {user.email} ({frequency})")
            return {'status': 'no_notifications'}
            
    except User.DoesNotExist:
        logger.error(f"User not found for digest: {user_id}")
        return {'status': 'error', 'message': 'User not found'}
        
    except Exception as e:
        logger.error(f"❌ Digest sending failed for user {user_id}: {str(e)}")
        return {'status': 'error', 'message': str(e)}


@shared_task
def collect_delivery_metrics():
    """Collect notification delivery metrics for monitoring"""
    try:
        # Get metrics for the last hour
        one_hour_ago = timezone.now() - timedelta(hours=1)
        
        recent_notifications = Notification.objects.filter(
            created_at__gte=one_hour_ago
        )
        
        metrics = {
            'total_created': recent_notifications.count(),
            'total_delivered': recent_notifications.exclude(delivered_via=[]).count(),
            'delivery_methods': {},
            'by_category': {},
            'errors': 0,
            'timestamp': timezone.now().isoformat()
        }
        
        # Count by delivery methods
        for method in ['in_app', 'email', 'sms']:
            metrics['delivery_methods'][method] = recent_notifications.filter(
                delivered_via__contains=[method]
            ).count()
        
        # Count by category
        categories = recent_notifications.values_list(
            'notification_type__category', flat=True
        ).distinct()
        
        for category in categories:
            if category:
                metrics['by_category'][category] = recent_notifications.filter(
                    notification_type__category=category
                ).count()
        
        # Store metrics in cache
        cache.set('notification_delivery_metrics', metrics, timeout=3600)
        
        logger.debug(f"📊 Collected delivery metrics: {metrics['total_created']} notifications")
        
        return metrics
        
    except Exception as e:
        logger.error(f"❌ Metrics collection failed: {str(e)}")
        return {'status': 'error', 'message': str(e)}


@shared_task
def update_notification_metrics(
    notification_type_code: str,
    delivery_methods: List[str],
    success: bool,
    error: Optional[str] = None
):
    """Update notification metrics in cache"""
    try:
        cache_key = f"notification_metrics:{notification_type_code}"
        metrics = cache.get(cache_key, {
            'total_sent': 0,
            'total_successful': 0,
            'total_failed': 0,
            'delivery_methods': {},
            'last_updated': timezone.now().isoformat()
        })
        
        metrics['total_sent'] += 1
        
        if success:
            metrics['total_successful'] += 1
            for method in delivery_methods:
                metrics['delivery_methods'][method] = metrics['delivery_methods'].get(method, 0) + 1
        else:
            metrics['total_failed'] += 1
            
        metrics['last_updated'] = timezone.now().isoformat()
        
        # Store metrics for 24 hours
        cache.set(cache_key, metrics, timeout=86400)
        
    except Exception as e:
        logger.error(f"Failed to update metrics: {str(e)}")


@shared_task
def health_check():
    """Health check task to ensure Celery is working"""
    try:
        logger.info("💚 Notification system health check passed")
        return {
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'message': 'Notification system is operational'
        }
    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        return {'status': 'unhealthy', 'message': str(e)}