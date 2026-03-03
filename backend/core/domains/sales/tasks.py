# backend/core/domains/sales/tasks.py

import logging

from django.utils import timezone

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="sales.expire_sent_quotes")
def expire_sent_quotes():
    """
    Mark quotes past their valid_until date OR past their event date as EXPIRED.

    This task runs daily to automatically expire quotes that have:
    1. Passed their validity period (valid_until < today), OR
    2. Passed their event date (event.start_date < today)

    Both conditions are checked to handle edge cases where a quote's valid_until
    might still be in the future but the event has already occurred.

    Also triggers the QUOTE_EXPIRED workflow event for each expired quote.
    """
    from django.db.models import Q

    from core.domains.workflows.engine import WorkflowEngine

    from .models import EventQuote, QuoteActivity

    today = timezone.now().date()

    # Find all SENT quotes that have expired OR whose event has passed
    expired_quotes = (
        EventQuote.objects.filter(status="SENT")
        .filter(Q(valid_until__lt=today) | Q(event__start_date__date__lt=today))
        .select_related("event")
    )

    count = 0
    for quote in expired_quotes:
        try:
            quote.status = "EXPIRED"
            quote.save(update_fields=["status", "updated_at"])

            # Determine expiry reason for activity notes
            event_date = (
                quote.event.start_date.date() if hasattr(quote.event.start_date, "date") else quote.event.start_date
            )
            if event_date < today:
                expiry_reason = f"Event has already occurred on {event_date}"
            else:
                expiry_reason = f"Quote validity expired on {quote.valid_until}"

            # Log the activity
            QuoteActivity.objects.create(
                quote=quote, action="EXPIRED", notes=f"Quote automatically expired: {expiry_reason}"
            )

            # Trigger QUOTE_EXPIRED workflow event
            try:
                WorkflowEngine.progress_workflow(
                    event=quote.event,
                    trigger_type="QUOTE_EXPIRED",
                    data={
                        "quote_id": quote.id,
                        "expiry_reason": expiry_reason,
                        "valid_until": str(quote.valid_until) if quote.valid_until else None,
                    },
                )
            except Exception as workflow_error:
                logger.warning(f"Failed to trigger QUOTE_EXPIRED workflow for quote {quote.id}: {workflow_error}")

            # Send admin notification about expired quote
            try:
                from core.domains.communications.context_service import CommunicationContextService, ContextType
                from core.domains.communications.services import CommunicationService
                from core.domains.users.models import User

                client = quote.event.client
                admin_emails = list(User.objects.get_active_admins().exclude(email="").values_list("email", flat=True))

                if admin_emails:
                    comm_service = CommunicationService()
                    template_data = CommunicationContextService.generate_context(
                        context_type=ContextType.QUOTE,
                        client=client,
                        event=quote.event,
                        quote=quote,
                    )

                    for admin_email in admin_emails:
                        try:
                            comm_service.send_communication(
                                template_name="Quote Expired Admin Notification",
                                recipient=admin_email,
                                context_data=template_data,
                                use_async=True,
                            )
                        except Exception as email_error:
                            logger.warning(f"Failed to send admin notification to {admin_email}: {email_error}")

                    logger.info(f"Sent Quote Expired Admin Notification for quote {quote.id}")
            except Exception as admin_notify_error:
                logger.warning(f"Failed to send admin notifications for expired quote {quote.id}: {admin_notify_error}")

            logger.info(f"Expired quote {quote.id} for event {quote.event_id}: {expiry_reason}")
            count += 1

        except Exception as e:
            logger.error(f"Failed to expire quote {quote.id}: {e}")

    logger.info(f"Quote expiry task completed: expired {count} quotes")
    return count


@shared_task(name="sales.send_quote_expiry_reminders")
def send_quote_expiry_reminders():
    """
    Send reminder emails for quotes expiring soon (within 3 days).

    This task runs daily to remind clients about quotes that will expire soon.
    """
    from datetime import timedelta

    from .models import EventQuote, QuoteReminder

    today = timezone.now().date()
    reminder_threshold = today + timedelta(days=3)

    # Find quotes expiring within 3 days that haven't had a reminder sent recently
    expiring_quotes = EventQuote.objects.filter(
        status="SENT", valid_until__gte=today, valid_until__lte=reminder_threshold
    )

    count = 0
    for quote in expiring_quotes:
        try:
            # Check if a reminder was already sent for this quote recently
            recent_reminder = QuoteReminder.objects.filter(
                quote=quote, is_sent=True, created_at__gte=timezone.now() - timedelta(days=2)
            ).exists()

            if not recent_reminder:
                # Create and send reminder
                QuoteReminder.objects.create(
                    quote=quote,
                    scheduled_date=timezone.now(),
                    is_sent=True,
                    sent_at=timezone.now(),
                    message=f"Quote expiry reminder: expires on {quote.valid_until}",
                )

                # Send reminder email using communication service and context service
                from core.domains.communications.context_service import CommunicationContextService, ContextType
                from core.domains.communications.services import CommunicationService

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
                        template_name="Quote Expiry Reminder",
                        recipient=client.email,
                        context_data=template_data,
                        client=client,
                        sent_by=None,
                        use_async=True,
                        event=quote.event,
                    )

                    # Also send admin notification about expiring quote
                    try:
                        from core.domains.users.models import User

                        admin_emails = list(
                            User.objects.get_active_admins().exclude(email="").values_list("email", flat=True)
                        )

                        for admin_email in admin_emails:
                            try:
                                comm_service.send_communication(
                                    template_name="Quote Expiring Soon Admin Notification",
                                    recipient=admin_email,
                                    context_data=template_data,
                                    use_async=True,
                                )
                            except Exception as admin_email_error:
                                logger.warning(
                                    f"Failed to send admin notification to {admin_email}: {admin_email_error}"
                                )
                    except Exception as admin_notify_error:
                        logger.warning(
                            f"Failed to send admin notifications for expiring quote {quote.id}: {admin_notify_error}"
                        )

                logger.info(f"Sent expiry reminder for quote {quote.id}")
                count += 1

        except Exception as e:
            logger.error(f"Failed to send reminder for quote {quote.id}: {e}")

    logger.info(f"Quote reminder task completed: sent {count} reminders")
    return count
