# backend/core/domains/events/tasks.py
"""
Celery tasks for the Events domain.

Handles deadline checking, cancellation processing, and date blocking tasks.
"""

import logging
from datetime import datetime
from django.utils import timezone

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
        now = timezone.now()

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

    now = timezone.now()
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

    now = timezone.now()
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


# ============================================================
# DATE HOLD EXPIRATION TASKS
# ============================================================

@shared_task(
    bind=True,
    max_retries=1,
)
def expire_date_holds(self):
    """
    Periodic task to expire temporary date holds.

    Finds all events with expired temporary holds and releases them.
    Runs via Celery beat schedule (recommended: every 15 minutes).
    """
    from .models import Event
    from .services.date_holding_service import DateHoldingService

    logger.info("Starting date hold expiration sweep")

    now = timezone.now()
    expired_count = 0
    error_count = 0

    # Find events with expired temporary holds
    expired_holds = Event.objects.filter(
        date_hold_status='TEMPORARY_HOLD',
        date_hold_expires_at__lte=now
    ).exclude(status='CANCELLED')

    total_count = expired_holds.count()
    logger.info(f"Found {total_count} expired date holds")

    for event in expired_holds:
        try:
            DateHoldingService.release_hold(event, reason='Automatic expiration')
            expired_count += 1

            # Send notification to client
            send_hold_expired_notification.delay(event.id)
        except Exception as e:
            logger.error(f"Error expiring hold for event {event.id}: {e}")
            error_count += 1

    logger.info(
        f"Date hold expiration completed: "
        f"{expired_count} expired, {error_count} errors, {total_count} total"
    )

    return {'total': total_count, 'expired': expired_count, 'errors': error_count}


@shared_task(
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
    from .models import Event
    from core.domains.notifications.services import NotificationService

    try:
        event = Event.objects.get(id=event_id)

        NotificationService.create_notification(
            recipient=event.client,
            notification_type='DATE_HOLD_EXPIRED',
            title='Date Hold Expired',
            message=(
                f'Your hold on {event.start_date.strftime("%B %d, %Y")} has expired. '
                f'The date is now available for other bookings. '
                f'To secure this date, please complete your booking with payment.'
            ),
            related_event=event,
            priority='HIGH',
            channels=['IN_APP', 'EMAIL']
        )

        logger.info(f"Sent hold expiration notification for event {event_id}")
        return {'status': 'sent', 'event_id': event_id}

    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found for hold expiration notification")
        return {'status': 'error', 'reason': 'event_not_found'}
    except Exception as e:
        logger.error(f"Error sending hold expiration notification: {e}")
        raise


@shared_task(
    bind=True,
    max_retries=1,
)
def send_hold_expiring_soon_reminders(self):
    """
    Send reminders for holds expiring within 24 hours.

    Runs via Celery beat schedule (recommended: daily).
    """
    from datetime import timedelta
    from .models import Event

    logger.info("Scheduling hold expiration reminders")

    now = timezone.now()
    threshold = now + timedelta(hours=24)
    scheduled_count = 0

    # Find events with holds expiring within 24 hours
    expiring_soon = Event.objects.filter(
        date_hold_status='TEMPORARY_HOLD',
        date_hold_expires_at__gt=now,
        date_hold_expires_at__lte=threshold
    ).exclude(status='CANCELLED')

    for event in expiring_soon:
        try:
            send_hold_expiring_reminder.delay(event.id)
            scheduled_count += 1
        except Exception as e:
            logger.error(f"Error scheduling hold reminder for event {event.id}: {e}")

    logger.info(f"Scheduled {scheduled_count} hold expiration reminders")
    return {'scheduled': scheduled_count}


@shared_task(
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
    from .models import Event
    from core.domains.notifications.services import NotificationService

    try:
        event = Event.objects.get(id=event_id)

        if event.date_hold_status != 'TEMPORARY_HOLD':
            return {'status': 'skipped', 'reason': 'not_held'}

        hours_remaining = (event.date_hold_expires_at - timezone.now()).total_seconds() / 3600

        NotificationService.create_notification(
            recipient=event.client,
            notification_type='HOLD_EXPIRING_REMINDER',
            title='Date Hold Expiring Soon',
            message=(
                f'Your hold on {event.start_date.strftime("%B %d, %Y")} expires in '
                f'{int(hours_remaining)} hours. Complete your payment to secure this date.'
            ),
            related_event=event,
            priority='HIGH',
            channels=['IN_APP', 'EMAIL']
        )

        logger.info(f"Sent hold expiring reminder for event {event_id}")
        return {'status': 'sent', 'event_id': event_id, 'hours_remaining': int(hours_remaining)}

    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found for hold reminder")
        return {'status': 'error', 'reason': 'event_not_found'}
    except Exception as e:
        logger.error(f"Error sending hold reminder: {e}")
        raise


# ============================================================
# EVENT DATE REMINDER TASKS
# ============================================================

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_event_date_reminder(self, event_id: int, days_before_event: int):
    """
    Send a reminder email to the client about their upcoming event.

    Uses the reminder_email_template configured on the event's booking flow.
    Creates an EventDateReminder record to prevent duplicate sends.

    Args:
        event_id: ID of the event
        days_before_event: Number of days before event this reminder is for
    """
    from datetime import timedelta
    from django.utils import timezone
    from .models import Event, EventDateReminder
    from core.domains.bookingflow.models import BookingSession
    from core.domains.communications.services import CommunicationService
    from core.domains.communications.context_service import (
        CommunicationContextService, ContextType
    )
    from core.domains.notifications.services import NotificationService

    try:
        event = Event.objects.select_related(
            'client', 'event_type', 'venue'
        ).get(id=event_id)

        # Skip if event is cancelled
        if event.status == 'CANCELLED':
            logger.info(f"Skipping event date reminder for event {event_id}: cancelled")
            return {'status': 'skipped', 'reason': 'event_cancelled'}

        # Check if reminder was already sent for this interval
        if EventDateReminder.objects.filter(event=event, days_before=days_before_event).exists():
            logger.info(
                f"Skipping event date reminder for event {event_id}: "
                f"already sent for {days_before_event} days"
            )
            return {'status': 'skipped', 'reason': 'already_sent'}

        client = event.client
        if not client:
            logger.warning(f"Event {event_id} has no client")
            return {'status': 'skipped', 'reason': 'no_client'}

        # Get the booking flow via BookingSession
        booking_session = BookingSession.objects.filter(
            created_event=event
        ).select_related('booking_flow__reminder_email_template').first()

        if not booking_session or not booking_session.booking_flow:
            logger.info(f"No booking flow found for event {event_id}")
            return {'status': 'skipped', 'reason': 'no_booking_flow'}

        reminder_template = booking_session.booking_flow.reminder_email_template
        if not reminder_template:
            logger.info(
                f"No reminder template configured for booking flow "
                f"{booking_session.booking_flow.id} ('{booking_session.booking_flow.name}')"
            )
            return {'status': 'skipped', 'reason': 'no_reminder_template'}

        # Generate context for the email
        context_data = CommunicationContextService.generate_context(
            context_type=ContextType.EVENT,
            client=client,
            event=event,
        )
        context_data['days_until_event'] = days_before_event

        # Send email using the configured reminder template
        comm_service = CommunicationService()
        record = comm_service.send_communication_by_template(
            template=reminder_template,
            recipient=client.email,
            context_data=context_data,
            client=client,
            event=event,
        )

        communication_record_id = None
        if record:
            communication_record_id = record.id

            # Record that reminder was sent
            EventDateReminder.objects.create(
                event=event,
                days_before=days_before_event,
                communication_record_id=communication_record_id
            )

            # Also create in-app notification
            event_name = event.name or f"Event on {event.start_date.strftime('%B %d, %Y')}"
            NotificationService.create_notification(
                recipient=client,
                notification_type='EVENT_REMINDER',
                title=f'Upcoming Event Reminder - {days_before_event} day(s)',
                message=(
                    f'Your event "{event_name}" is scheduled for '
                    f'{event.start_date.strftime("%B %d, %Y at %I:%M %p")}. '
                    f'We look forward to seeing you!'
                ),
                related_event=event,
                priority='HIGH' if days_before_event <= 1 else 'NORMAL',
                channels=['IN_APP']
            )

            logger.info(
                f"Sent event date reminder for event {event_id} "
                f"({days_before_event} days before)"
            )
            return {
                'status': 'sent',
                'event_id': event_id,
                'days_before': days_before_event,
                'communication_record_id': str(communication_record_id) if communication_record_id else None
            }
        else:
            logger.warning(f"Email send returned no record for event {event_id}")
            return {'status': 'failed', 'reason': 'email_send_failed'}

    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found for event date reminder")
        return {'status': 'error', 'reason': 'event_not_found'}
    except Exception as e:
        logger.error(f"Error sending event date reminder for event {event_id}: {e}")
        raise  # Let Celery retry


@shared_task(
    bind=True,
    max_retries=1,
)
def schedule_event_date_reminders(self):
    """
    Daily task to schedule event date reminders.

    Finds events with start_date in the configured reminder windows
    (7, 3, 1 days before) and schedules reminder notifications.

    Called daily via Celery beat.
    """
    from datetime import timedelta
    from django.utils import timezone
    from .models import Event, EventDateReminder
    from core.domains.bookingflow.models import BookingSession

    logger.info("Scheduling event date reminders")

    today = timezone.now().date()
    scheduled_count = 0
    skipped_count = 0

    # Define reminder intervals (days before event)
    reminder_days = [7, 3, 1]  # 7 days, 3 days, and 1 day before event

    for days in reminder_days:
        # Find events starting in exactly X days
        target_date = today + timedelta(days=days)

        # Get events with start_date on target_date
        events = Event.objects.filter(
            start_date__date=target_date,
            status__in=['LEAD', 'CONFIRMED'],
            client__isnull=False,
        ).exclude(
            status='CANCELLED'
        ).select_related('client')

        for event in events:
            try:
                # Check if reminder already sent
                if EventDateReminder.objects.filter(event=event, days_before=days).exists():
                    skipped_count += 1
                    continue

                # Check if booking flow has a reminder template
                booking_session = BookingSession.objects.filter(
                    created_event=event
                ).select_related('booking_flow__reminder_email_template').first()

                if not booking_session or not booking_session.booking_flow:
                    skipped_count += 1
                    continue

                if not booking_session.booking_flow.reminder_email_template:
                    skipped_count += 1
                    continue

                # Schedule reminder
                send_event_date_reminder.delay(event.id, days)
                scheduled_count += 1
                logger.info(f"Scheduled {days}-day event reminder for event {event.id}")

            except Exception as e:
                logger.error(f"Error scheduling event reminder for event {event.id}: {e}")

    logger.info(
        f"Event date reminders scheduling completed: "
        f"{scheduled_count} scheduled, {skipped_count} skipped"
    )
    return {'scheduled': scheduled_count, 'skipped': skipped_count}


# ============================================================
# DATE RESERVATION CLEANUP TASKS (for race condition prevention)
# ============================================================

# ============================================================
# AUTOMATIC EVENT COMPLETION TASKS
# ============================================================

@shared_task(
    bind=True,
    max_retries=1,
)
def mark_past_events_completed(self):
    """
    Daily task to automatically mark past events as COMPLETED.

    Finds all events where:
    - status is CONFIRMED (not already completed or cancelled)
    - start_date has passed (event date is in the past)

    For each event:
    1. Updates status to COMPLETED
    2. Triggers workflow progression to POST_PRODUCTION stage
    3. Sends completion notification

    This task should run daily via Celery beat to ensure events
    transition to POST_PRODUCTION for follow-up automations.

    Returns:
        dict: {'completed': int, 'errors': int, 'total': int}
    """
    from .models import Event
    from core.domains.workflows.engine import WorkflowEngine

    logger.info("Starting automatic event completion sweep")

    now = timezone.now()
    today = now.date()
    completed_count = 0
    error_count = 0

    # Find CONFIRMED events where event date has passed
    # Use end_date if available, otherwise use start_date
    past_events = Event.objects.filter(
        status='CONFIRMED',
    ).exclude(
        status__in=['COMPLETED', 'CANCELLED']
    )

    # Filter to events where the event has ended
    events_to_complete = []
    for event in past_events:
        # Determine the event end datetime
        if event.end_date:
            event_end = event.end_date
        else:
            event_end = event.start_date

        # Check if event has ended (compare dates)
        if hasattr(event_end, 'date'):
            event_end_date = event_end.date()
        else:
            event_end_date = event_end

        if event_end_date < today:
            events_to_complete.append(event)

    total_count = len(events_to_complete)
    logger.info(f"Found {total_count} past events to mark as COMPLETED")

    for event in events_to_complete:
        try:
            logger.info(f"Marking event {event.id} as COMPLETED (event date: {event.start_date})")

            # Update status to COMPLETED
            event.status = 'COMPLETED'
            event.save(update_fields=['status', 'updated_at'])

            # Trigger workflow progression to POST_PRODUCTION
            try:
                WorkflowEngine.progress_workflow(
                    event=event,
                    trigger_type='STATUS_CHANGE',
                    data={
                        'old_status': 'CONFIRMED',
                        'new_status': 'COMPLETED',
                        'auto_completed': True,
                    }
                )
                logger.info(f"Triggered workflow progression for event {event.id}")
            except Exception as workflow_error:
                logger.warning(f"Failed to trigger workflow for event {event.id}: {workflow_error}")

            completed_count += 1

        except Exception as e:
            logger.error(f"Error completing event {event.id}: {e}")
            error_count += 1

    logger.info(
        f"Automatic event completion sweep completed: "
        f"{completed_count} completed, {error_count} errors, {total_count} total"
    )

    return {
        'total': total_count,
        'completed': completed_count,
        'errors': error_count,
    }


# ============================================================
# DATE RESERVATION CLEANUP TASKS (for race condition prevention)
# ============================================================

@shared_task(
    bind=True,
    max_retries=1,
)
def cleanup_expired_reservations(self):
    """
    Clean up expired date reservations.

    Finds all DateReservation records that have expired (expires_at < now)
    and marks them as EXPIRED. This frees up dates that were temporarily
    reserved but never completed.

    This task should run frequently (every 1-2 minutes) via Celery beat
    to ensure reservations are released promptly.

    Returns:
        dict: {'expired_count': int, 'released_count': int}
    """
    from .services import AtomicAvailabilityService
    from .services.websocket_service import AvailabilityWebSocketService
    from .models import DateReservation
    from django.utils import timezone

    logger.info("Starting expired reservation cleanup")

    try:
        # Use the atomic service to clean up expired reservations
        expired_count = AtomicAvailabilityService.cleanup_expired_reservations()

        # Also find reservations that expired and broadcast availability
        # This ensures the frontend is notified that dates are available again
        recently_expired = DateReservation.objects.filter(
            status='EXPIRED',
            # Only broadcast for reservations expired in the last 5 minutes
            expires_at__gte=timezone.now() - timezone.timedelta(minutes=5)
        )

        released_count = 0
        for reservation in recently_expired:
            try:
                AvailabilityWebSocketService.broadcast_reservation_released(
                    date=reservation.target_date,
                    reason='EXPIRED'
                )
                released_count += 1
            except Exception as e:
                logger.warning(f"Failed to broadcast reservation release for {reservation.target_date}: {e}")

        logger.info(
            f"Expired reservation cleanup completed: "
            f"{expired_count} expired, {released_count} broadcasts sent"
        )

        return {'expired_count': expired_count, 'released_count': released_count}

    except Exception as e:
        logger.error(f"Error in cleanup_expired_reservations: {e}")
        return {'expired_count': 0, 'released_count': 0, 'error': str(e)}
