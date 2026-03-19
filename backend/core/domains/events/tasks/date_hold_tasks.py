import logging

from django.utils import timezone

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name="core.domains.events.tasks.notify_competing_event_cancelled",
    bind=True,
    max_retries=3,
)
def notify_competing_event_cancelled(self, cancelled_event_id: int, blocking_event_id: int):
    """
    Send notification when an event is cancelled because another event took the date.

    Args:
        cancelled_event_id: ID of the cancelled event
        blocking_event_id: ID of the event that blocked the date
    """
    from core.domains.notifications.services import NotificationService

    from ..models import Event

    try:
        cancelled_event = Event.objects.get(id=cancelled_event_id)
        Event.objects.get(id=blocking_event_id)

        # Send notification to client
        NotificationService.create_notification(
            recipient=cancelled_event.client,
            notification_type_code="EVENT_CANCELLED",
            context={
                "event_name": cancelled_event.name or cancelled_event.start_date.strftime("%B %d, %Y"),
                "event_date": cancelled_event.start_date.strftime("%B %d, %Y"),
                "reason": "Another client secured the date first.",
            },
            delivery_methods=["IN_APP", "EMAIL"],
            event=cancelled_event,
            client=cancelled_event.client,
        )

        logger.info(
            f"Sent cancellation notification for event {cancelled_event_id} (blocked by event {blocking_event_id})"
        )

        return {
            "status": "sent",
            "cancelled_event_id": cancelled_event_id,
            "blocking_event_id": blocking_event_id,
        }

    except Event.DoesNotExist as e:
        logger.warning(f"Event not found for cancellation notification: {e}")
        return {"status": "error", "reason": "event_not_found"}
    except Exception as e:
        logger.error(f"Error sending cancellation notification: {e}")
        raise


@shared_task(
    name="core.domains.events.tasks.expire_date_holds",
    bind=True,
    max_retries=1,
)
def expire_date_holds(self):
    """
    Periodic task to expire temporary date holds.

    Finds all events with expired temporary holds and releases them.
    Runs via Celery beat schedule (recommended: every 15 minutes).
    """
    from ..models import Event
    from ..services.date_holding_service import DateHoldingService

    logger.info("Starting date hold expiration sweep")

    now = timezone.now()
    expired_count = 0
    error_count = 0

    # Find events with expired temporary holds
    expired_holds = Event.objects.filter(date_hold_status="TEMPORARY_HOLD", date_hold_expires_at__lte=now).exclude(
        status="CANCELLED"
    )

    total_count = expired_holds.count()
    logger.info(f"Found {total_count} expired date holds")

    for event in expired_holds:
        try:
            DateHoldingService.release_hold(event, reason="Automatic expiration")
            expired_count += 1

            # Send notification to client
            send_hold_expired_notification.delay(event.id)
        except Exception as e:
            logger.error(f"Error expiring hold for event {event.id}: {e}")
            error_count += 1

    logger.info(f"Date hold expiration completed: {expired_count} expired, {error_count} errors, {total_count} total")

    return {"total": total_count, "expired": expired_count, "errors": error_count}


@shared_task(
    name="core.domains.events.tasks.send_hold_expired_notification",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_hold_expired_notification(self, event_id: int):
    """
    Send notification when a date hold expires.

    Args:
        event_id: ID of the event whose hold expired
    """
    from core.domains.notifications.services import NotificationService

    from ..models import Event

    try:
        event = Event.objects.get(id=event_id)

        NotificationService.create_notification(
            recipient=event.client,
            notification_type_code="DATE_HOLD_EXPIRED",
            context={
                "event_name": event.name or event.start_date.strftime("%B %d, %Y"),
                "event_date": event.start_date.strftime("%B %d, %Y"),
            },
            delivery_methods=["IN_APP", "EMAIL"],
            event=event,
            client=event.client,
        )

        logger.info(f"Sent hold expiration notification for event {event_id}")
        return {"status": "sent", "event_id": event_id}

    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found for hold expiration notification")
        return {"status": "error", "reason": "event_not_found"}
    except Exception as e:
        logger.error(f"Error sending hold expiration notification: {e}")
        raise


@shared_task(
    name="core.domains.events.tasks.send_hold_expiring_soon_reminders",
    bind=True,
    max_retries=1,
)
def send_hold_expiring_soon_reminders(self):
    """
    Send reminders for holds expiring within 24 hours.

    Runs via Celery beat schedule (recommended: daily).
    """
    from datetime import timedelta

    from ..models import Event

    logger.info("Scheduling hold expiration reminders")

    now = timezone.now()
    threshold = now + timedelta(hours=24)
    scheduled_count = 0

    # Find events with holds expiring within 24 hours
    expiring_soon = Event.objects.filter(
        date_hold_status="TEMPORARY_HOLD", date_hold_expires_at__gt=now, date_hold_expires_at__lte=threshold
    ).exclude(status="CANCELLED")

    for event in expiring_soon:
        try:
            send_hold_expiring_reminder.delay(event.id)
            scheduled_count += 1
        except Exception as e:
            logger.error(f"Error scheduling hold reminder for event {event.id}: {e}")

    logger.info(f"Scheduled {scheduled_count} hold expiration reminders")
    return {"scheduled": scheduled_count}


@shared_task(
    name="core.domains.events.tasks.send_hold_expiring_reminder",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_hold_expiring_reminder(self, event_id: int):
    """
    Send reminder that a date hold is expiring soon.

    Args:
        event_id: ID of the event with expiring hold
    """
    from core.domains.notifications.services import NotificationService

    from ..models import Event

    try:
        event = Event.objects.get(id=event_id)

        if event.date_hold_status != "TEMPORARY_HOLD":
            return {"status": "skipped", "reason": "not_held"}

        hours_remaining = (event.date_hold_expires_at - timezone.now()).total_seconds() / 3600

        NotificationService.create_notification(
            recipient=event.client,
            notification_type_code="HOLD_EXPIRING_REMINDER",
            context={
                "event_name": event.name or event.start_date.strftime("%B %d, %Y"),
                "event_date": event.start_date.strftime("%B %d, %Y"),
                "hours_remaining": int(hours_remaining),
            },
            delivery_methods=["IN_APP", "EMAIL"],
            event=event,
            client=event.client,
        )

        logger.info(f"Sent hold expiring reminder for event {event_id}")
        return {"status": "sent", "event_id": event_id, "hours_remaining": int(hours_remaining)}

    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found for hold reminder")
        return {"status": "error", "reason": "event_not_found"}
    except Exception as e:
        logger.error(f"Error sending hold reminder: {e}")
        raise
