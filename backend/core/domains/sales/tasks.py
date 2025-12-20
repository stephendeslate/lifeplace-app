# backend/core/domains/sales/tasks.py

from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task(name='sales.expire_sent_quotes')
def expire_sent_quotes():
    """
    Mark quotes past their valid_until date OR past their event date as EXPIRED.

    This task runs daily to automatically expire quotes that have:
    1. Passed their validity period (valid_until < today), OR
    2. Passed their event date (event.start_date < today)

    Both conditions are checked to handle edge cases where a quote's valid_until
    might still be in the future but the event has already occurred.
    """
    from django.db.models import Q
    from .models import EventQuote, QuoteActivity

    today = timezone.now().date()

    # Find all SENT quotes that have expired OR whose event has passed
    expired_quotes = EventQuote.objects.filter(
        status='SENT'
    ).filter(
        Q(valid_until__lt=today) | Q(event__start_date__date__lt=today)
    )

    count = 0
    for quote in expired_quotes:
        try:
            quote.status = 'EXPIRED'
            quote.save(update_fields=['status', 'updated_at'])

            # Determine expiry reason for activity notes
            event_date = quote.event.start_date.date() if hasattr(quote.event.start_date, 'date') else quote.event.start_date
            if event_date < today:
                expiry_reason = f"Event has already occurred on {event_date}"
            else:
                expiry_reason = f"Quote validity expired on {quote.valid_until}"

            # Log the activity
            QuoteActivity.objects.create(
                quote=quote,
                action='EXPIRED',
                notes=f"Quote automatically expired: {expiry_reason}"
            )

            logger.info(f"Expired quote {quote.id} for event {quote.event_id}: {expiry_reason}")
            count += 1

        except Exception as e:
            logger.error(f"Failed to expire quote {quote.id}: {e}")

    logger.info(f"Quote expiry task completed: expired {count} quotes")
    return count


@shared_task(name='sales.send_quote_expiry_reminders')
def send_quote_expiry_reminders():
    """
    Send reminder emails for quotes expiring soon (within 3 days).

    This task runs daily to remind clients about quotes that will expire soon.
    """
    from .models import EventQuote, QuoteReminder
    from datetime import timedelta

    today = timezone.now().date()
    reminder_threshold = today + timedelta(days=3)

    # Find quotes expiring within 3 days that haven't had a reminder sent recently
    expiring_quotes = EventQuote.objects.filter(
        status='SENT',
        valid_until__gte=today,
        valid_until__lte=reminder_threshold
    )

    count = 0
    for quote in expiring_quotes:
        try:
            # Check if a reminder was already sent for this quote recently
            recent_reminder = QuoteReminder.objects.filter(
                quote=quote,
                is_sent=True,
                created_at__gte=timezone.now() - timedelta(days=2)
            ).exists()

            if not recent_reminder:
                # Create and send reminder
                reminder = QuoteReminder.objects.create(
                    quote=quote,
                    scheduled_date=timezone.now(),
                    is_sent=True,
                    sent_at=timezone.now(),
                    message=f"Quote expiry reminder: expires on {quote.valid_until}"
                )

                # Send reminder email using communication service and context service
                from core.domains.communications.services import CommunicationService
                from core.domains.communications.context_service import (
                    CommunicationContextService, ContextType
                )

                client = quote.event.client
                if client and client.email:
                    comm_service = CommunicationService()

                    # Generate context using the unified context service
                    template_data = CommunicationContextService.generate_context(
                        context_type=ContextType.QUOTE,
                        client=client,
                        event=quote.event,
                        quote=quote,
                    )

                    comm_service.send_communication(
                        template_name='quote_expiry_reminder',
                        recipient=client.email,
                        context_data=template_data,
                        client=client,
                        sent_by=None,
                        use_async=True,
                        event=quote.event
                    )

                logger.info(f"Sent expiry reminder for quote {quote.id}")
                count += 1

        except Exception as e:
            logger.error(f"Failed to send reminder for quote {quote.id}: {e}")

    logger.info(f"Quote reminder task completed: sent {count} reminders")
    return count
