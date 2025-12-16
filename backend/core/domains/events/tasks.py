# backend/core/domains/events/tasks.py
"""
Celery tasks for the Events domain.

Handles deadline checking, cancellation processing, and date blocking tasks.
"""

import logging
from datetime import datetime

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
)
def check_downpayment_deadline(self, event_id: int):
    """
    Check if an event's downpayment deadline has passed.

    Called at the scheduled deadline time via Celery eta.
    If deadline passed and downpayment not received:
    1. Cancel event with reason='PAYMENT_TIMEOUT'
    2. Send notification to client
    3. Send notification to admin (if configured)

    Args:
        event_id: ID of the event to check
    """
    from .models import Event
    from .services.date_blocking_service import DateBlockingService

    try:
        event = Event.objects.get(id=event_id)
        logger.info(f"Checking downpayment deadline for event {event_id}")

        # Skip if already cancelled or date already blocked
        if event.status == 'CANCELLED':
            logger.info(f"Event {event_id} already cancelled - skipping deadline check")
            return {'status': 'skipped', 'reason': 'already_cancelled'}

        if event.date_blocked:
            logger.info(f"Event {event_id} date already blocked - skipping deadline check")
            return {'status': 'skipped', 'reason': 'date_already_blocked'}

        # Check if deadline has passed (naive datetime comparison - both PHT)
        now = datetime.now()

        if not event.downpayment_deadline:
            logger.warning(f"Event {event_id} has no downpayment deadline set")
            return {'status': 'skipped', 'reason': 'no_deadline_set'}

        if now >= event.downpayment_deadline:
            # Check if payment was received
            if event.payment_status == 'UNPAID':
                logger.info(f"Event {event_id} deadline expired without payment - cancelling")
                DateBlockingService.cancel_event_for_timeout(event)
                return {
                    'status': 'cancelled',
                    'event_id': event_id,
                    'reason': 'payment_timeout',
                    'deadline': event.downpayment_deadline.isoformat(),
                }
            else:
                logger.info(
                    f"Event {event_id} deadline passed but payment received "
                    f"(status: {event.payment_status}) - no action needed"
                )
                return {
                    'status': 'skipped',
                    'reason': 'payment_received',
                    'payment_status': event.payment_status,
                }
        else:
            # Deadline not yet passed - this shouldn't happen with eta scheduling
            # but handle gracefully
            logger.warning(
                f"Event {event_id} deadline check called before deadline "
                f"(deadline: {event.downpayment_deadline}, now: {now})"
            )
            return {'status': 'skipped', 'reason': 'deadline_not_reached'}

    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found for deadline check")
        return {'status': 'error', 'reason': 'event_not_found'}
    except Exception as e:
        logger.error(f"Error checking deadline for event {event_id}: {e}")
        raise  # Let Celery retry


@shared_task(
    bind=True,
    max_retries=1,
)
def daily_deadline_sweep(self):
    """
    Daily task to catch any missed deadline checks.

    Finds all events with expired deadlines that are still unpaid
    and not cancelled, then cancels them.

    Runs via Celery beat schedule.
    """
    from .models import Event
    from .services.date_blocking_service import DateBlockingService

    logger.info("Starting daily deadline sweep")

    now = datetime.now()
    cancelled_count = 0
    error_count = 0

    # Find events past deadline that are still unpaid and not cancelled
    expired_events = Event.objects.filter(
        downpayment_deadline__lte=now,
        payment_status='UNPAID',
        status='CONFIRMED',
        date_blocked=False
    ).exclude(
        status='CANCELLED'
    )

    total_count = expired_events.count()
    logger.info(f"Found {total_count} events with expired deadlines")

    for event in expired_events:
        try:
            logger.info(f"Processing expired event {event.id}")
            DateBlockingService.cancel_event_for_timeout(event)
            cancelled_count += 1
        except Exception as e:
            logger.error(f"Error cancelling event {event.id}: {e}")
            error_count += 1

    logger.info(
        f"Daily deadline sweep completed: "
        f"{cancelled_count} cancelled, {error_count} errors, {total_count} total"
    )

    return {
        'total': total_count,
        'cancelled': cancelled_count,
        'errors': error_count,
    }


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_deadline_reminder(self, event_id: int, days_before_deadline: int = 1):
    """
    Send a reminder notification to the client about approaching payment deadline.

    Args:
        event_id: ID of the event
        days_before_deadline: Number of days before deadline this reminder is for
    """
    from .models import Event
    from core.domains.notifications.services import NotificationService

    try:
        event = Event.objects.get(id=event_id)

        # Skip if already cancelled, paid, or date blocked
        if event.status == 'CANCELLED' or event.date_blocked:
            logger.info(f"Skipping reminder for event {event_id}: cancelled or blocked")
            return {'status': 'skipped', 'reason': 'cancelled_or_blocked'}

        if event.payment_status != 'UNPAID':
            logger.info(f"Skipping reminder for event {event_id}: payment received")
            return {'status': 'skipped', 'reason': 'payment_received'}

        if not event.downpayment_deadline:
            logger.warning(f"Event {event_id} has no deadline set")
            return {'status': 'skipped', 'reason': 'no_deadline'}

        # Send reminder notification
        NotificationService.create_notification(
            recipient=event.client,
            notification_type='PAYMENT_REMINDER',
            title=f'Payment Deadline Reminder - {days_before_deadline} day(s) remaining',
            message=(
                f'Your booking for {event.start_date.strftime("%B %d, %Y")} requires '
                f'a downpayment by {event.downpayment_deadline.strftime("%B %d, %Y at %I:%M %p")}. '
                f'Please complete your payment to secure your date.'
            ),
            related_event=event,
            priority='HIGH',
            channels=['IN_APP', 'EMAIL']
        )

        logger.info(f"Sent deadline reminder for event {event_id} ({days_before_deadline} days)")
        return {'status': 'sent', 'event_id': event_id, 'days_before': days_before_deadline}

    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found for reminder")
        return {'status': 'error', 'reason': 'event_not_found'}
    except Exception as e:
        logger.error(f"Error sending reminder for event {event_id}: {e}")
        raise


@shared_task(
    bind=True,
    max_retries=1,
)
def schedule_deadline_reminders(self):
    """
    Schedule deadline reminders for events with upcoming deadlines.

    Finds events with deadlines in the next few days and schedules
    reminder notifications. Called daily via Celery beat.
    """
    from datetime import timedelta
    from .models import Event

    logger.info("Scheduling deadline reminders")

    now = datetime.now()
    scheduled_count = 0

    # Define reminder intervals (days before deadline)
    reminder_days = [3, 1]  # 3 days and 1 day before deadline

    for days in reminder_days:
        # Find events with deadline in exactly X days
        target_time = now + timedelta(days=days)
        target_date = target_time.date()

        events = Event.objects.filter(
            downpayment_deadline__date=target_date,
            payment_status='UNPAID',
            status='CONFIRMED',
            date_blocked=False
        ).exclude(
            status='CANCELLED'
        )

        for event in events:
            try:
                # Schedule reminder for midday
                send_deadline_reminder.delay(event.id, days)
                scheduled_count += 1
                logger.info(f"Scheduled {days}-day reminder for event {event.id}")
            except Exception as e:
                logger.error(f"Error scheduling reminder for event {event.id}: {e}")

    logger.info(f"Scheduled {scheduled_count} deadline reminders")
    return {'scheduled': scheduled_count}


@shared_task(
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
    from .models import Event
    from core.domains.notifications.services import NotificationService

    try:
        cancelled_event = Event.objects.get(id=cancelled_event_id)
        blocking_event = Event.objects.get(id=blocking_event_id)

        # Send notification to client
        NotificationService.create_notification(
            recipient=cancelled_event.client,
            notification_type='EVENT_CANCELLED',
            title='Booking Cancelled - Date No Longer Available',
            message=(
                f'Your booking for {cancelled_event.start_date.strftime("%B %d, %Y")} has been cancelled '
                f'because another client secured the date first. '
                f'You can rebook for a different date through your account.'
            ),
            related_event=cancelled_event,
            priority='HIGH',
            channels=['IN_APP', 'EMAIL']
        )

        logger.info(
            f"Sent cancellation notification for event {cancelled_event_id} "
            f"(blocked by event {blocking_event_id})"
        )

        return {
            'status': 'sent',
            'cancelled_event_id': cancelled_event_id,
            'blocking_event_id': blocking_event_id,
        }

    except Event.DoesNotExist as e:
        logger.warning(f"Event not found for cancellation notification: {e}")
        return {'status': 'error', 'reason': 'event_not_found'}
    except Exception as e:
        logger.error(f"Error sending cancellation notification: {e}")
        raise
