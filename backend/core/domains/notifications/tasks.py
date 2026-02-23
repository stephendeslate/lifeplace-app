# backend/core/domains/notifications/tasks.py

import logging
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from celery import shared_task

from .exceptions import (
    InvalidNotificationDataException,
    NotificationTypeNotFoundException,
)
from .models import (
    Notification,
)
from .security import NotificationRateLimiter
from .services import NotificationDigestService, NotificationService

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def create_notification_async(
    self,
    recipient_id: int,
    notification_type_code: str,
    context: dict[str, Any] | None = None,
    delivery_methods: list[str] | None = None,
    event_id: int | None = None,
    client_id: int | None = None,
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
        # Rate limiting check (uses the canonical NotificationRateLimiter)
        can_create, limit_message = NotificationRateLimiter.check_creation_limit(
            user_id=recipient_id, notification_type_code=notification_type_code
        )
        if not can_create:
            logger.warning(
                f"Notification creation skipped due to rate limiting: "
                f"user={recipient_id}, type={notification_type_code}, reason={limit_message}"
            )
            return {"status": "rate_limited", "notification_id": None}

        # Get recipient
        try:
            recipient = User.objects.get(id=recipient_id, is_active=True)
        except User.DoesNotExist:
            logger.error(f"Recipient user not found: {recipient_id}")
            return {"status": "error", "message": "Recipient not found"}

        # Get related objects
        event = None
        client = None

        if event_id:
            try:
                from core.domains.events.models import Event

                event = Event.objects.get(id=event_id)
            except Exception:
                logger.warning(f"Event not found: {event_id}")

        if client_id:
            try:
                client = User.objects.get(id=client_id, role="CLIENT")
            except User.DoesNotExist:
                logger.warning(f"Client not found: {client_id}")

        # Create notification
        notification = NotificationService.create_notification(
            recipient=recipient,
            notification_type_code=notification_type_code,
            context=context or {},
            delivery_methods=delivery_methods,
            event=event,
            client=client,
            use_async=False,  # Already in async task, prevent recursive async call
        )

        if notification:
            logger.info(f"✅ Notification created successfully: {notification.id} for {recipient.email}")

            # Update metrics
            update_notification_metrics.delay(
                notification_type_code=notification_type_code, delivery_methods=notification.delivered_via, success=True
            )

            return {
                "status": "success",
                "notification_id": notification.id,
                "delivered_via": notification.delivered_via,
            }
        else:
            logger.info(f"Notification creation skipped (user preferences): {recipient.email}")
            return {"status": "skipped", "notification_id": None}

    except NotificationTypeNotFoundException as e:
        logger.error(f"Notification type not found: {notification_type_code}")
        return {"status": "error", "message": str(e)}

    except InvalidNotificationDataException as e:
        logger.warning(f"Invalid notification data: {e!s}")
        return {"status": "error", "message": str(e)}

    except Exception as e:
        logger.error(f"❌ Notification creation failed: {e!s} (user={recipient_id}, type={notification_type_code})")

        # Retry on failure
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying notification creation (attempt {self.request.retries + 1})")
            raise self.retry(countdown=60 * (2**self.request.retries))

        # Update failure metrics
        update_notification_metrics.delay(
            notification_type_code=notification_type_code, delivery_methods=[], success=False, error=str(e)
        )

        return {"status": "error", "message": str(e)}


@shared_task(bind=True, max_retries=3)
def bulk_create_notifications_async(
    self,
    recipient_ids: list[int],
    notification_type_code: str,
    context: dict[str, Any] | None = None,
    delivery_methods: list[str] | None = None,
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
                delivery_methods=delivery_methods,
            )
            results.append({"recipient_id": recipient_id, "task_id": result.id, "status": "queued"})
        except Exception as e:
            logger.error(f"Failed to queue notification for user {recipient_id}: {e!s}")
            results.append({"recipient_id": recipient_id, "task_id": None, "status": "error", "error": str(e)})

    logger.info(f"Queued {len(results)} notification tasks for type {notification_type_code}")
    return results


@shared_task
def cleanup_old_notifications():
    """Clean up old read notifications based on configured retention period"""
    try:
        cleanup_days = getattr(settings, "NOTIFICATION_CLEANUP_DAYS", 90)
        count = NotificationService.cleanup_old_notifications(days=cleanup_days)

        logger.info(f"🧹 Cleaned up {count} old notifications (older than {cleanup_days} days)")

        # Update cleanup metrics
        cache.set("notification_cleanup_last_run", timezone.now().isoformat(), timeout=86400)
        cache.set("notification_cleanup_last_count", count, timeout=86400)

        return {"status": "success", "cleaned_count": count}

    except Exception as e:
        logger.error(f"❌ Notification cleanup failed: {e!s}")
        return {"status": "error", "message": str(e)}


@shared_task
def auto_expire_notifications():
    """Mark notifications as expired based on their expiry settings"""
    try:
        count = NotificationService.auto_expire_notifications()

        logger.info(f"⏰ Marked {count} notifications as expired")

        # Update expiry metrics
        cache.set("notification_expiry_last_run", timezone.now().isoformat(), timeout=86400)
        cache.set("notification_expiry_last_count", count, timeout=86400)

        return {"status": "success", "expired_count": count}

    except Exception as e:
        logger.error(f"❌ Notification expiry task failed: {e!s}")
        return {"status": "error", "message": str(e)}


@shared_task
def auto_read_old_notifications():
    """Automatically mark very old notifications as read"""
    try:
        auto_read_days = getattr(settings, "NOTIFICATION_AUTO_READ_DAYS", 30)
        cutoff_date = timezone.now() - timedelta(days=auto_read_days)

        with transaction.atomic():
            count = Notification.objects.filter(created_at__lt=cutoff_date, is_read=False, is_expired=False).update(
                is_read=True, read_at=timezone.now(), updated_at=timezone.now()
            )

        logger.info(f"📖 Auto-marked {count} old notifications as read")

        return {"status": "success", "auto_read_count": count}

    except Exception as e:
        logger.error(f"❌ Auto-read notifications task failed: {e!s}")
        return {"status": "error", "message": str(e)}


@shared_task
def send_notification_digest(user_id: int, frequency: str):
    """Send notification digest to a user"""
    try:
        user = User.objects.get(id=user_id)

        # Calculate period based on frequency
        now = timezone.now()
        if frequency == "HOURLY":
            period_start = now - timedelta(hours=1)
        elif frequency == "DAILY":
            period_start = now - timedelta(days=1)
        elif frequency == "WEEKLY":
            period_start = now - timedelta(weeks=1)
        else:
            logger.error(f"Invalid digest frequency: {frequency}")
            return {"status": "error", "message": "Invalid frequency"}

        # Create digest
        digest = NotificationDigestService.create_digest(
            user=user, frequency=frequency, period_start=period_start, period_end=now
        )

        if digest:
            # Send digest
            NotificationDigestService.send_digest(digest.id)

            logger.info(f"📬 Sent {frequency} digest to {user.email} ({digest.notification_count} notifications)")

            return {"status": "success", "digest_id": digest.id, "notification_count": digest.notification_count}
        else:
            logger.info(f"No notifications for digest: {user.email} ({frequency})")
            return {"status": "no_notifications"}

    except User.DoesNotExist:
        logger.error(f"User not found for digest: {user_id}")
        return {"status": "error", "message": "User not found"}

    except Exception as e:
        logger.error(f"❌ Digest sending failed for user {user_id}: {e!s}")
        return {"status": "error", "message": str(e)}


@shared_task
def collect_delivery_metrics():
    """Collect notification delivery metrics for monitoring"""
    try:
        # Get metrics for the last hour
        one_hour_ago = timezone.now() - timedelta(hours=1)

        recent_notifications = Notification.objects.filter(created_at__gte=one_hour_ago)

        metrics = {
            "total_created": recent_notifications.count(),
            "total_delivered": recent_notifications.exclude(delivered_via=[]).count(),
            "delivery_methods": {},
            "by_category": {},
            "errors": 0,
            "timestamp": timezone.now().isoformat(),
        }

        # Count by delivery methods
        for method in ["in_app", "email", "sms", "push"]:
            metrics["delivery_methods"][method] = recent_notifications.filter(delivered_via__contains=[method]).count()

        # Count by category
        categories = recent_notifications.values_list("notification_type__category", flat=True).distinct()

        for category in categories:
            if category:
                metrics["by_category"][category] = recent_notifications.filter(
                    notification_type__category=category
                ).count()

        # Store metrics in cache
        cache.set("notification_delivery_metrics", metrics, timeout=3600)

        logger.debug(f"📊 Collected delivery metrics: {metrics['total_created']} notifications")

        return metrics

    except Exception as e:
        logger.error(f"❌ Metrics collection failed: {e!s}")
        return {"status": "error", "message": str(e)}


@shared_task
def update_notification_metrics(
    notification_type_code: str, delivery_methods: list[str], success: bool, error: str | None = None
):
    """Update notification metrics in cache"""
    try:
        cache_key = f"notification_metrics:{notification_type_code}"
        metrics = cache.get(
            cache_key,
            {
                "total_sent": 0,
                "total_successful": 0,
                "total_failed": 0,
                "delivery_methods": {},
                "last_updated": timezone.now().isoformat(),
            },
        )

        metrics["total_sent"] += 1

        if success:
            metrics["total_successful"] += 1
            for method in delivery_methods:
                metrics["delivery_methods"][method] = metrics["delivery_methods"].get(method, 0) + 1
        else:
            metrics["total_failed"] += 1

        metrics["last_updated"] = timezone.now().isoformat()

        # Store metrics for 24 hours
        cache.set(cache_key, metrics, timeout=86400)

    except Exception as e:
        logger.error(f"Failed to update metrics: {e!s}")


@shared_task
def health_check():
    """Health check task to ensure Celery is working"""
    try:
        logger.info("💚 Notification system health check passed")
        return {
            "status": "healthy",
            "timestamp": timezone.now().isoformat(),
            "message": "Notification system is operational",
        }
    except Exception as e:
        logger.error(f"❌ Health check failed: {e!s}")
        return {"status": "unhealthy", "message": str(e)}


# =============================================================================
# Push Notification Tasks
# =============================================================================


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_push_notification_task(
    self,
    user_id: int,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
    badge: int | None = None,
    priority: str = "default",
    channel_id: str = "default",
    category_id: str | None = None,
):
    """
    Async task to send push notification to a user's devices

    Args:
        user_id: User to send notification to
        title: Notification title
        body: Notification body
        data: Custom data payload
        badge: Badge count (iOS)
        priority: Push priority
        channel_id: Android notification channel
        category_id: iOS category identifier
    """
    try:
        from .services import PushNotificationService

        result = PushNotificationService.send_push_to_user(
            user_id=user_id,
            title=title,
            body=body,
            data=data,
            badge=badge,
            priority=priority,
            channel_id=channel_id,
            category_id=category_id,
        )

        logger.info(
            f"📱 Push sent to user {user_id}: {result['successful']}/{result['total_devices']} devices succeeded"
        )

        return {"status": "success", "user_id": user_id, **result}

    except Exception as e:
        logger.error(f"❌ Push notification task failed: {e!s}")

        if self.request.retries < self.max_retries:
            raise self.retry(countdown=30 * (2**self.request.retries))

        return {"status": "error", "user_id": user_id, "message": str(e)}


@shared_task
def check_push_receipts():
    """
    Check push notification receipts from Expo

    This task should run periodically (e.g., every 15 minutes) to check
    delivery receipts and deactivate tokens that are no longer valid.
    """
    try:
        from .services import PushNotificationService

        # Get all cached ticket IDs
        ticket_ids = []
        ticket_keys = cache.keys("push_ticket:*")

        if not ticket_keys:
            logger.debug("No push tickets to check")
            return {"status": "success", "checked": 0}

        for key in ticket_keys:
            ticket_id = key.replace("push_ticket:", "")
            ticket_ids.append(ticket_id)

        if not ticket_ids:
            return {"status": "success", "checked": 0}

        # Check receipts in batches of 100
        batch_size = 100
        total_checked = 0
        total_delivered = 0
        total_failed = 0

        for i in range(0, len(ticket_ids), batch_size):
            batch = ticket_ids[i : i + batch_size]

            try:
                results = PushNotificationService.check_receipts(batch)

                for _ticket_id, result in results.items():
                    total_checked += 1
                    if result.get("status") == "delivered":
                        total_delivered += 1
                    elif result.get("status") == "failed":
                        total_failed += 1

            except Exception as e:
                logger.error(f"Error checking receipt batch: {e!s}")

        logger.info(f"📋 Checked {total_checked} push receipts: {total_delivered} delivered, {total_failed} failed")

        return {"status": "success", "checked": total_checked, "delivered": total_delivered, "failed": total_failed}

    except Exception as e:
        logger.error(f"❌ Check push receipts task failed: {e!s}")
        return {"status": "error", "message": str(e)}


@shared_task
def cleanup_inactive_push_tokens(days: int = 90):
    """
    Clean up inactive or stale push tokens

    This task should run daily (e.g., at 3 AM) to remove:
    - Deactivated tokens
    - Tokens not used in X days
    - Tokens created X days ago that were never used

    Args:
        days: Number of days of inactivity before cleanup (default 90)
    """
    try:
        from .services import PushNotificationService

        deleted_count = PushNotificationService.cleanup_inactive_tokens(days=days)

        logger.info(f"🧹 Cleaned up {deleted_count} inactive push tokens (> {days} days)")

        # Update cleanup metrics
        cache.set("push_token_cleanup_last_run", timezone.now().isoformat(), timeout=86400)
        cache.set("push_token_cleanup_last_count", deleted_count, timeout=86400)

        return {"status": "success", "deleted_count": deleted_count, "days_threshold": days}

    except Exception as e:
        logger.error(f"❌ Push token cleanup task failed: {e!s}")
        return {"status": "error", "message": str(e)}


@shared_task
def send_bulk_push_notifications(
    user_ids: list[int], title: str, body: str, data: dict[str, Any] | None = None, **kwargs
):
    """
    Send push notifications to multiple users

    Queues individual push tasks for each user to allow for parallel processing.
    """
    results = []

    for user_id in user_ids:
        try:
            task = send_push_notification_task.delay(user_id=user_id, title=title, body=body, data=data, **kwargs)
            results.append({"user_id": user_id, "task_id": task.id, "status": "queued"})
        except Exception as e:
            logger.error(f"Failed to queue push for user {user_id}: {e!s}")
            results.append({"user_id": user_id, "task_id": None, "status": "error", "error": str(e)})

    logger.info(f"📱 Queued {len(results)} push notification tasks")
    return results
