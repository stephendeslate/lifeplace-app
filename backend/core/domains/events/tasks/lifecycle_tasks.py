import logging

from django.utils import timezone

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name="core.domains.events.tasks.send_event_date_reminder",
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
    from core.domains.bookingflow.models import BookingSession
    from core.domains.communications.context_service import CommunicationContextService, ContextType
    from core.domains.communications.services import CommunicationService
    from core.domains.notifications.services import NotificationService

    from ..models import Event, EventDateReminder

    try:
        event = Event.objects.select_related("client", "event_type", "venue").get(id=event_id)

        # Skip if event is cancelled
        if event.status == "CANCELLED":
            logger.info(f"Skipping event date reminder for event {event_id}: cancelled")
            return {"status": "skipped", "reason": "event_cancelled"}

        # Check if reminder was already sent for this interval
        if EventDateReminder.objects.filter(event=event, days_before=days_before_event).exists():
            logger.info(f"Skipping event date reminder for event {event_id}: already sent for {days_before_event} days")
            return {"status": "skipped", "reason": "already_sent"}

        client = event.client
        if not client:
            logger.warning(f"Event {event_id} has no client")
            return {"status": "skipped", "reason": "no_client"}

        # Get the booking flow via BookingSession
        booking_session = (
            BookingSession.objects.filter(created_event=event)
            .select_related("booking_flow__reminder_email_template")
            .first()
        )

        if not booking_session or not booking_session.booking_flow:
            logger.info(f"No booking flow found for event {event_id}")
            return {"status": "skipped", "reason": "no_booking_flow"}

        reminder_template = booking_session.booking_flow.reminder_email_template
        if not reminder_template:
            logger.info(
                f"No reminder template configured for booking flow "
                f"{booking_session.booking_flow.id} ('{booking_session.booking_flow.name}')"
            )
            return {"status": "skipped", "reason": "no_reminder_template"}

        # Generate context for the email
        context_data = CommunicationContextService.generate_context(
            context_type=ContextType.EVENT,
            client=client,
            event=event,
        )
        context_data["days_until_event"] = days_before_event

        # Send email using the configured reminder template
        comm_service = CommunicationService()
        record = comm_service.send_communication_by_template(
            template=reminder_template,
            recipient=client.email,
            context_data=context_data,
            client=client,
            event=event,
            skip_preference_check=True,
        )

        communication_record_id = None
        if record:
            communication_record_id = record.id

            # Record that reminder was sent
            EventDateReminder.objects.create(
                event=event, days_before=days_before_event, communication_record_id=communication_record_id
            )

            # Also create in-app notification
            event_name = event.name or f"Event on {event.start_date.strftime('%B %d, %Y')}"
            NotificationService.create_notification(
                recipient=client,
                notification_type_code="EVENT_REMINDER",
                context={
                    "event_name": event_name,
                    "event_date": event.start_date.strftime("%B %d, %Y at %I:%M %p"),
                    "days_before_event": days_before_event,
                },
                delivery_methods=["IN_APP"],
                event=event,
                client=client,
            )

            logger.info(f"Sent event date reminder for event {event_id} ({days_before_event} days before)")
            return {
                "status": "sent",
                "event_id": event_id,
                "days_before": days_before_event,
                "communication_record_id": str(communication_record_id) if communication_record_id else None,
            }
        else:
            logger.warning(f"Email send returned no record for event {event_id}")
            return {"status": "failed", "reason": "email_send_failed"}

    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found for event date reminder")
        return {"status": "error", "reason": "event_not_found"}
    except Exception as e:
        logger.error(f"Error sending event date reminder for event {event_id}: {e}")
        raise  # Let Celery retry


@shared_task(
    name="core.domains.events.tasks.schedule_event_date_reminders",
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

    from core.domains.bookingflow.models import BookingSession

    from ..models import Event, EventDateReminder

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
        events = (
            Event.objects.filter(
                start_date__date=target_date,
                status__in=["LEAD", "CONFIRMED"],
                client__isnull=False,
            )
            .exclude(status="CANCELLED")
            .select_related("client")
        )

        for event in events:
            try:
                # Check if reminder already sent
                if EventDateReminder.objects.filter(event=event, days_before=days).exists():
                    skipped_count += 1
                    continue

                # Check if booking flow has a reminder template
                booking_session = (
                    BookingSession.objects.filter(created_event=event)
                    .select_related("booking_flow__reminder_email_template")
                    .first()
                )

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

    logger.info(f"Event date reminders scheduling completed: {scheduled_count} scheduled, {skipped_count} skipped")
    return {"scheduled": scheduled_count, "skipped": skipped_count}


@shared_task(
    name="core.domains.events.tasks.mark_past_events_completed",
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
    from core.domains.workflows.engine import WorkflowEngine

    from ..models import Event

    logger.info("Starting automatic event completion sweep")

    now = timezone.now()
    today = now.date()
    completed_count = 0
    error_count = 0

    # Find CONFIRMED events where event date has passed
    # Use end_date if available, otherwise use start_date
    past_events = Event.objects.filter(
        status="CONFIRMED",
    ).exclude(status__in=["COMPLETED", "CANCELLED"])

    # Filter to events where the event has ended
    events_to_complete = []
    for event in past_events:
        # Determine the event end datetime
        if event.end_date:
            event_end = event.end_date
        else:
            event_end = event.start_date

        # Check if event has ended (compare dates)
        if hasattr(event_end, "date"):
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
            event.status = "COMPLETED"
            event.save(update_fields=["status", "updated_at"])

            # Trigger workflow progression to POST_PRODUCTION
            try:
                WorkflowEngine.progress_workflow(
                    event=event,
                    trigger_type="STATUS_CHANGE",
                    data={
                        "old_status": "CONFIRMED",
                        "new_status": "COMPLETED",
                        "auto_completed": True,
                    },
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
        "total": total_count,
        "completed": completed_count,
        "errors": error_count,
    }


@shared_task(
    name="core.domains.events.tasks.cleanup_expired_reservations",
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
    from django.utils import timezone

    from ..models import DateReservation
    from ..services import AtomicAvailabilityService
    from ..services.websocket_service import AvailabilityWebSocketService

    logger.info("Starting expired reservation cleanup")

    try:
        # Use the atomic service to clean up expired reservations
        expired_count = AtomicAvailabilityService.cleanup_expired_reservations()

        # Also find reservations that expired and broadcast availability
        # This ensures the frontend is notified that dates are available again
        recently_expired = DateReservation.objects.filter(
            status="EXPIRED",
            # Only broadcast for reservations expired in the last 5 minutes
            expires_at__gte=timezone.now() - timezone.timedelta(minutes=5),
        )

        released_count = 0
        for reservation in recently_expired:
            try:
                AvailabilityWebSocketService.broadcast_reservation_released(
                    date=reservation.target_date, reason="EXPIRED"
                )
                released_count += 1
            except Exception as e:
                logger.warning(f"Failed to broadcast reservation release for {reservation.target_date}: {e}")

        logger.info(f"Expired reservation cleanup completed: {expired_count} expired, {released_count} broadcasts sent")

        return {"expired_count": expired_count, "released_count": released_count}

    except Exception as e:
        logger.error(f"Error in cleanup_expired_reservations: {e}")
        return {"expired_count": 0, "released_count": 0, "error": str(e)}
