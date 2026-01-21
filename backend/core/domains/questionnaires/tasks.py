# backend/core/domains/questionnaires/tasks.py
"""
Celery tasks for the Questionnaires domain.

Handles questionnaire reminder notifications and completion alerts.
"""

import logging
from datetime import timedelta
from typing import Optional

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Count, Q
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()

# Cache key prefix for tracking reminders sent
REMINDER_CACHE_PREFIX = 'questionnaire_reminder'

# Maximum reminders per event to avoid spam
MAX_REMINDERS_PER_EVENT = 3


def _get_reminder_count_key(event_id: int) -> str:
    """Generate cache key for tracking reminder count per event."""
    return f"{REMINDER_CACHE_PREFIX}:count:{event_id}"


def _get_reminder_count(event_id: int) -> int:
    """Get the number of reminders already sent for an event."""
    return cache.get(_get_reminder_count_key(event_id), 0)


def _increment_reminder_count(event_id: int) -> int:
    """Increment and return the reminder count for an event."""
    key = _get_reminder_count_key(event_id)
    count = cache.get(key, 0) + 1
    # Keep track for 30 days
    cache.set(key, count, timeout=30 * 24 * 60 * 60)
    return count


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_questionnaire_reminder(self, event_id: int, reminder_reason: str = 'incomplete'):
    """
    Send a reminder notification to the client about incomplete questionnaire.

    Args:
        event_id: ID of the event with incomplete questionnaire
        reminder_reason: Reason for reminder ('incomplete', 'approaching_deadline', etc.)
    """
    from core.domains.events.models import Event
    from core.domains.notifications.services import NotificationService
    from .models import Questionnaire, QuestionnaireField, QuestionnaireResponse

    try:
        event = Event.objects.select_related('client', 'event_type').get(id=event_id)

        # Check reminder limit
        reminder_count = _get_reminder_count(event_id)
        if reminder_count >= MAX_REMINDERS_PER_EVENT:
            logger.info(f"Skipping questionnaire reminder for event {event_id}: max reminders ({MAX_REMINDERS_PER_EVENT}) reached")
            return {'status': 'skipped', 'reason': 'max_reminders_reached', 'count': reminder_count}

        # Skip if event is cancelled or completed
        if event.status in ['CANCELLED', 'COMPLETED']:
            logger.info(f"Skipping questionnaire reminder for event {event_id}: event status is {event.status}")
            return {'status': 'skipped', 'reason': f'event_{event.status.lower()}'}

        client = event.client
        if not client:
            logger.warning(f"Event {event_id} has no client")
            return {'status': 'skipped', 'reason': 'no_client'}

        # Get questionnaire for this event type
        questionnaire = None
        if event.event_type:
            questionnaire = Questionnaire.objects.filter(
                event_type=event.event_type,
                is_active=True
            ).first()

        if not questionnaire:
            # Try to find a general questionnaire (no specific event type)
            questionnaire = Questionnaire.objects.filter(
                event_type__isnull=True,
                is_active=True
            ).first()

        if not questionnaire:
            logger.info(f"No questionnaire found for event {event_id}")
            return {'status': 'skipped', 'reason': 'no_questionnaire'}

        # Get required fields and check completion
        required_fields = QuestionnaireField.objects.filter(
            questionnaire=questionnaire,
            required=True
        ).values_list('id', flat=True)

        answered_fields = QuestionnaireResponse.objects.filter(
            event=event,
            field_id__in=required_fields
        ).exclude(value='').values_list('field_id', flat=True)

        missing_count = len(required_fields) - len(set(answered_fields))

        if missing_count == 0:
            logger.info(f"Questionnaire for event {event_id} is complete, skipping reminder")
            return {'status': 'skipped', 'reason': 'already_complete'}

        # Format event date
        event_date_formatted = (
            event.start_date.strftime("%B %d, %Y")
            if event.start_date else "your upcoming event"
        )

        # Determine priority based on how close the event is
        days_until_event = (event.start_date.date() - timezone.now().date()).days if event.start_date else 30
        priority = 'CRITICAL' if days_until_event <= 7 else 'HIGH' if days_until_event <= 14 else 'NORMAL'

        # Send reminder notification
        NotificationService.create_notification(
            recipient=client,
            notification_type_code='QUESTIONNAIRE_REMINDER',
            context={
                'event_name': event.name or event_date_formatted,
                'event_date': event_date_formatted,
                'missing_fields_count': missing_count,
                'questionnaire_name': questionnaire.name,
                'days_until_event': days_until_event,
            },
            delivery_methods=['IN_APP', 'EMAIL'],
            event=event,
            client=client,
        )

        # Increment reminder count
        new_count = _increment_reminder_count(event_id)

        logger.info(f"Sent questionnaire reminder for event {event_id} (reminder #{new_count})")
        return {
            'status': 'sent',
            'event_id': event_id,
            'missing_fields': missing_count,
            'reminder_number': new_count,
        }

    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found for questionnaire reminder")
        return {'status': 'error', 'reason': 'event_not_found'}
    except Exception as e:
        logger.error(f"Error sending questionnaire reminder for event {event_id}: {e}")
        raise  # Let Celery retry


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def notify_questionnaire_completed(self, event_id: int):
    """
    Send confirmation notification to client when questionnaire is completed.

    Args:
        event_id: ID of the event whose questionnaire was completed
    """
    from core.domains.events.models import Event
    from core.domains.notifications.services import NotificationService

    try:
        event = Event.objects.select_related('client', 'event_type').get(id=event_id)

        client = event.client
        if not client:
            logger.warning(f"Event {event_id} has no client for completion notification")
            return {'status': 'skipped', 'reason': 'no_client'}

        # Format event date
        event_date_formatted = (
            event.start_date.strftime("%B %d, %Y")
            if event.start_date else "your upcoming event"
        )

        # Send confirmation notification
        NotificationService.create_notification(
            recipient=client,
            notification_type_code='QUESTIONNAIRE_COMPLETED',
            context={
                'event_name': event.name or event_date_formatted,
                'event_date': event_date_formatted,
            },
            delivery_methods=['IN_APP', 'EMAIL'],
            event=event,
            client=client,
        )

        logger.info(f"Sent questionnaire completion confirmation for event {event_id}")
        return {'status': 'sent', 'event_id': event_id}

    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found for completion notification")
        return {'status': 'error', 'reason': 'event_not_found'}
    except Exception as e:
        logger.error(f"Error sending questionnaire completion notification for event {event_id}: {e}")
        raise


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def notify_admin_questionnaire_submission(self, event_id: int, submitted_by_id: Optional[int] = None):
    """
    Notify admin staff when a client submits/updates their questionnaire.

    Args:
        event_id: ID of the event
        submitted_by_id: ID of the user who submitted (if known)
    """
    from core.domains.events.models import Event
    from core.domains.notifications.services import NotificationService

    try:
        event = Event.objects.select_related('client', 'event_type').get(id=event_id)

        # Get admin users to notify
        admin_users = User.objects.filter(role='ADMIN', is_active=True)

        if not admin_users.exists():
            logger.warning("No active admin users to notify about questionnaire submission")
            return {'status': 'skipped', 'reason': 'no_admin_users'}

        # Format details
        client_name = event.client.get_full_name() if event.client else "Unknown Client"
        event_date_formatted = (
            event.start_date.strftime("%B %d, %Y")
            if event.start_date else "TBD"
        )
        event_type_name = event.event_type.name if event.event_type else "Event"

        notifications_sent = 0
        for admin in admin_users:
            try:
                NotificationService.create_notification(
                    recipient=admin,
                    notification_type_code='QUESTIONNAIRE_SUBMITTED',
                    context={
                        'client_name': client_name,
                        'event_name': event.name or f"{event_type_name} - {event_date_formatted}",
                        'event_date': event_date_formatted,
                        'event_type': event_type_name,
                        'event_id': event.id,
                    },
                    delivery_methods=['IN_APP'],  # Only in-app for admin notifications
                    event=event,
                    client=event.client,
                )
                notifications_sent += 1
            except Exception as e:
                logger.error(f"Failed to notify admin {admin.id} about questionnaire: {e}")

        logger.info(f"Notified {notifications_sent} admins about questionnaire submission for event {event_id}")
        return {'status': 'sent', 'event_id': event_id, 'admins_notified': notifications_sent}

    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found for admin notification")
        return {'status': 'error', 'reason': 'event_not_found'}
    except Exception as e:
        logger.error(f"Error sending admin notification for event {event_id}: {e}")
        raise


@shared_task(
    bind=True,
    max_retries=1,
)
def schedule_questionnaire_reminders(self):
    """
    Daily task to schedule questionnaire reminders for events with incomplete questionnaires.

    Finds events with:
    - Upcoming event dates (within next 30 days)
    - Incomplete questionnaire responses
    - Not already sent max reminders

    Called daily via Celery beat.
    """
    from core.domains.events.models import Event
    from .models import Questionnaire, QuestionnaireField, QuestionnaireResponse

    logger.info("Starting questionnaire reminder scheduling")

    today = timezone.now().date()
    # Look for events in the next 30 days
    deadline = today + timedelta(days=30)

    scheduled_count = 0
    skipped_count = 0

    # Get active events with upcoming dates
    events = Event.objects.filter(
        start_date__date__gte=today,
        start_date__date__lte=deadline,
        status__in=['LEAD', 'CONFIRMED'],
        client__isnull=False,
    ).select_related('client', 'event_type')

    for event in events:
        try:
            # Check reminder count
            reminder_count = _get_reminder_count(event.id)
            if reminder_count >= MAX_REMINDERS_PER_EVENT:
                skipped_count += 1
                continue

            # Get questionnaire for this event type
            questionnaire = None
            if event.event_type:
                questionnaire = Questionnaire.objects.filter(
                    event_type=event.event_type,
                    is_active=True
                ).first()

            if not questionnaire:
                questionnaire = Questionnaire.objects.filter(
                    event_type__isnull=True,
                    is_active=True
                ).first()

            if not questionnaire:
                continue

            # Get required fields
            required_fields = QuestionnaireField.objects.filter(
                questionnaire=questionnaire,
                required=True
            ).values_list('id', flat=True)

            if not required_fields:
                continue

            # Check if all required fields are answered
            answered_fields = QuestionnaireResponse.objects.filter(
                event=event,
                field_id__in=required_fields
            ).exclude(value='').values_list('field_id', flat=True)

            missing_count = len(required_fields) - len(set(answered_fields))

            if missing_count > 0:
                # Determine reminder timing based on event proximity
                days_until_event = (event.start_date.date() - today).days

                # Send reminders more frequently as event approaches
                should_remind = (
                    (days_until_event <= 7 and reminder_count < 3) or
                    (days_until_event <= 14 and reminder_count < 2) or
                    (days_until_event <= 21 and reminder_count < 1)
                )

                if should_remind:
                    send_questionnaire_reminder.delay(event.id, 'incomplete')
                    scheduled_count += 1
                    logger.info(f"Scheduled questionnaire reminder for event {event.id} ({days_until_event} days away)")

        except Exception as e:
            logger.error(f"Error processing event {event.id} for questionnaire reminders: {e}")

    logger.info(f"Questionnaire reminder scheduling completed: {scheduled_count} scheduled, {skipped_count} skipped")
    return {'scheduled': scheduled_count, 'skipped': skipped_count}


@shared_task(
    bind=True,
    max_retries=1,
)
def check_questionnaire_completion(self, event_id: int):
    """
    Check if a questionnaire is complete after a response is saved.
    If complete, trigger completion notifications.

    Args:
        event_id: ID of the event to check
    """
    from core.domains.events.models import Event
    from .models import Questionnaire, QuestionnaireField, QuestionnaireResponse

    try:
        event = Event.objects.select_related('event_type').get(id=event_id)

        # Get questionnaire for this event type
        questionnaire = None
        if event.event_type:
            questionnaire = Questionnaire.objects.filter(
                event_type=event.event_type,
                is_active=True
            ).first()

        if not questionnaire:
            questionnaire = Questionnaire.objects.filter(
                event_type__isnull=True,
                is_active=True
            ).first()

        if not questionnaire:
            return {'status': 'skipped', 'reason': 'no_questionnaire'}

        # Get required fields
        required_fields = set(QuestionnaireField.objects.filter(
            questionnaire=questionnaire,
            required=True
        ).values_list('id', flat=True))

        if not required_fields:
            # No required fields means "complete" by default
            return {'status': 'complete', 'reason': 'no_required_fields'}

        # Get answered fields
        answered_fields = set(QuestionnaireResponse.objects.filter(
            event=event,
            field_id__in=required_fields
        ).exclude(value='').values_list('field_id', flat=True))

        if required_fields == answered_fields:
            # Questionnaire is complete - send notifications
            logger.info(f"Questionnaire complete for event {event_id}, triggering notifications")

            # Notify client
            notify_questionnaire_completed.delay(event_id)

            # Notify admins
            notify_admin_questionnaire_submission.delay(event_id)

            return {'status': 'complete', 'event_id': event_id, 'notifications_triggered': True}
        else:
            missing = required_fields - answered_fields
            return {
                'status': 'incomplete',
                'event_id': event_id,
                'missing_fields': len(missing),
            }

    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found for completion check")
        return {'status': 'error', 'reason': 'event_not_found'}
    except Exception as e:
        logger.error(f"Error checking questionnaire completion for event {event_id}: {e}")
        raise
