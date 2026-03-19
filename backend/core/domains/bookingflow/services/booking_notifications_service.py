"""Booking notification operations: confirmation emails, admin alerts.

Handles sending quote request acknowledgments, admin new lead notifications,
and booking confirmation emails.
"""
import logging

from ..models import BookingSession

logger = logging.getLogger(__name__)


def send_quote_request_acknowledgment(session, event):
    """Send acknowledgment email when client submits a quote request

    This is NOT the final quote email - this is just acknowledging receipt of the request.
    The actual quote email will be sent later when admin reviews and sends the quote.
    """
    from core.domains.communications.context_service import CommunicationContextService, ContextType
    from core.domains.communications.services import CommunicationService

    try:
        # Initialize communication service
        comm_service = CommunicationService()

        # Extract client message from booking session
        from .session_lifecycle_service import extract_booking_metadata

        metadata = extract_booking_metadata(session)

        # Generate context using the centralized context service
        context_data = CommunicationContextService.generate_context(
            context_type=ContextType.EVENT,
            client=session.client,
            event=event,
        )

        # Add custom context specific to this template
        context_data["client_message"] = metadata.get("combined_message", "")

        # Send acknowledgment using "Events - Welcome New Lead" template
        # This template is designed for initial inquiry acknowledgments
        comm_service.send_communication(
            template_name="Events - Welcome New Lead",
            recipient=session.client.email,
            context_data=context_data,
            client=session.client,
            sent_by=None,
            use_async=True,  # ASYNC: Queue email for background processing
            event=event,
        )

        logger.info(f"Sent quote request acknowledgment to {session.client.email} for event {event.id}")

    except Exception as e:
        logger.error(f"Failed to send quote request acknowledgment: {e}")
        # Don't raise exception as quote was created successfully


def send_admin_new_lead_notification(session, event):
    """Send email notification to admin users when a new quote request is submitted.

    This ensures admins are directly notified about new leads via email,
    complementing the in-app notification created by the EVENT_CREATED signal.
    """
    from core.domains.communications.context_service import CommunicationContextService, ContextType
    from core.domains.communications.services import CommunicationService
    from core.domains.users.models import User

    try:
        admin_emails = list(
            User.objects.filter(role="ADMIN", is_active=True).exclude(email="").values_list("email", flat=True)
        )

        if not admin_emails:
            logger.warning("No admin users found to notify about new lead")
            return

        comm_service = CommunicationService()

        # Generate context using the centralized context service
        context_data = CommunicationContextService.generate_context(
            context_type=ContextType.EVENT,
            client=session.client,
            event=event,
        )

        # Add custom context specific to admin notification
        from .session_lifecycle_service import extract_booking_metadata

        metadata = extract_booking_metadata(session)
        context_data["client_message"] = metadata.get("combined_message", "")

        for admin_email in admin_emails:
            try:
                comm_service.send_communication(
                    template_name="New Lead Admin Notification",
                    recipient=admin_email,
                    context_data=context_data,
                    use_async=True,
                    event=event,
                )
            except Exception as e:
                logger.warning(f"Failed to send new lead admin notification to {admin_email}: {e}")

        logger.info(f"Queued new lead admin notifications to {len(admin_emails)} admin(s) for event {event.id}")

    except Exception as e:
        logger.error(f"Failed to send admin new lead notifications: {e}")
        # Don't raise - admin notification failure should not block the booking flow


def send_booking_confirmation(session, event):
    """Send booking confirmation email after successful payment

    This sends a detailed confirmation email with all booking details including
    event info, packages, addons, pricing, and dates.
    """
    from core.domains.communications.context_service import CommunicationContextService, ContextType
    from core.domains.communications.services import CommunicationService

    try:
        # Check if confirmation email template is configured
        if not session.booking_flow.confirmation_email_template:
            logger.info(
                f"No confirmation email template configured for booking flow {session.booking_flow.id} "
                f"('{session.booking_flow.name}'). To enable confirmation emails, assign a template in "
                f"Django admin: BookingFlow > confirmation_email_template"
            )
            return

        # Instantiate communication service
        comm_service = CommunicationService()

        # Get invoice for financial context
        from core.domains.payments.models import Invoice

        invoice = None
        try:
            invoice = Invoice.objects.filter(event=event).first()
        except Exception as e:
            logger.warning(f"Could not fetch invoice for email context: {e}")

        # Generate context using the unified context service
        context_data = CommunicationContextService.generate_context(
            context_type=ContextType.BOOKING,
            client=session.client,
            event=event,
            booking_session=session,
            invoice=invoice,
        )

        # Add booking-specific extras not covered by context service
        booking_data = session.booking_data
        selected_packages = booking_data.get("selected_packages", [])
        selected_addons = booking_data.get("selected_addons", [])

        context_data["selected_packages"] = selected_packages
        context_data["selected_addons"] = selected_addons
        context_data["services_description"] = (
            ", ".join([pkg.get("name", "") for pkg in selected_packages if isinstance(pkg, dict)])
            if selected_packages
            else ""
        )

        # Send confirmation email
        comm_service.send_communication(
            template_name=session.booking_flow.confirmation_email_template.name,
            recipient=session.client.email,
            context_data=context_data,
            client=session.client,
            sent_by=None,
            use_async=True,  # ASYNC: Queue email for background processing
            event=event,
        )

        logger.info(f"Sent booking confirmation email to {session.client.email} for event {event.id}")

    except Exception as e:
        logger.error(f"Failed to send booking confirmation email: {e}")
        # Don't raise exception as booking was created successfully
