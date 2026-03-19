"""Booking completion operations: orchestrates the complete_booking flow.

Handles booking completion including validation, event creation, quote generation,
payment processing, and notification dispatch.
"""
import logging
import time
import traceback

from django.db import transaction
from django.utils import timezone

from ..exceptions import (
    BookingSessionNotFound,
    EventCreationFailed,
    StepValidationError,
)
from ..models import BookingSession

logger = logging.getLogger(__name__)


def extract_payment_data(session):
    """Extract payment data from session booking data"""
    for _step_key, step_data in session.booking_data.items():
        if isinstance(step_data, dict):
            if any(
                key in step_data
                for key in ["gateway_id", "payment_gateway_id", "payment_method_token", "payment_method_id"]
            ):
                return step_data
    return None


def apply_marketing_consent(user, marketing_consent):
    """Apply marketing consent from booking to user's preferences"""
    if not user:
        return

    try:
        profile = getattr(user, "profile", None)
        if profile:
            profile.marketing_consent = bool(marketing_consent)
            profile.save(update_fields=["marketing_consent"])
    except Exception as e:
        logger.warning(f"Could not update marketing consent for user {user.id}: {e}")


def complete_booking(session_id, completion_type="payment", reservation_token=None):
    """Complete the booking and create event with payment processing or quote generation

    Args:
        session_id: The booking session ID
        completion_type: 'payment' for immediate payment, 'quote' for quote request
        reservation_token: Optional reservation token from pre-payment availability validation
    """
    # Log completion request (sanitized - no tokens)
    time.time()
    logger.info(
        f"Complete booking: session_id={session_id}, completion_type='{completion_type}', has_token={bool(reservation_token)}"
    )

    # ENHANCED SAFEGUARD: Use atomic transaction with row-level locking to prevent race conditions
    with transaction.atomic():
        try:
            # Get session with SELECT FOR UPDATE to prevent concurrent modifications
            session = BookingSession.objects.select_for_update().get(session_id=session_id)
            logger.info(f"🔥 ACQUIRED LOCK on session {session_id} at {time.time()}")
        except BookingSession.DoesNotExist:
            logger.error(f"🔥 CRITICAL: Session {session_id} not found during completion attempt")
            raise BookingSessionNotFound()

        # ENHANCED DUPLICATE PROTECTION: Check completion status with detailed logging
        if session.is_completed:
            logger.warning(
                f"🔥 DUPLICATE COMPLETION ATTEMPT BLOCKED: session_id={session_id}, "
                f"completion_type='{completion_type}', original_completed_at={session.completed_at}, "
                f"existing_event={session.created_event.id if session.created_event else 'None'}"
            )

            # CRITICAL FIX: Check if event exists but link is missing (repair scenario)
            if not session.created_event:
                potential_event = None
                completion_result = session.booking_data.get("booking_completion_result", {})

                if not completion_result:
                    for _step_key, step_data in session.booking_data.items():
                        if isinstance(step_data, dict) and "booking_completion_result" in step_data:
                            completion_result = step_data["booking_completion_result"]
                            break

                if completion_result and "event" in completion_result:
                    event_id = completion_result["event"].get("id")
                    if event_id:
                        try:
                            from core.domains.events.models import Event

                            potential_event = Event.objects.get(id=event_id)
                            logger.info(f"🔧 LINK REPAIR: Found orphaned event {event_id} for session {session_id}")

                            session.created_event = potential_event
                            session.save(update_fields=["created_event"])
                            logger.info(
                                f"🔧 LINK REPAIR: Successfully linked session {session_id} to event {event_id}"
                            )

                            return potential_event
                        except Event.DoesNotExist:
                            logger.warning(
                                f"🔧 LINK REPAIR FAILED: Event {event_id} referenced in session data no longer exists"
                            )

            # Log which endpoint/path triggered this duplicate attempt
            stack_trace = traceback.format_stack()
            completion_caller = "unknown"
            for frame in reversed(stack_trace):
                if "complete_booking_public" in frame:
                    completion_caller = "PUBLIC_ENDPOINT"
                    break
                elif "complete_booking" in frame and "views" in frame:
                    completion_caller = "AUTHENTICATED_ENDPOINT"
                    break
                elif "update_session_data" in frame:
                    completion_caller = "UPDATE_ENDPOINT_IMMEDIATE_CREATION"
                    break

            logger.warning(f"🔥 DUPLICATE ATTEMPT SOURCE: {completion_caller}")

            # Return existing event to maintain idempotency
            return session.created_event

        # Log session info (sanitized - no full data)
        logger.debug(
            f"Session booking data keys: {list(session.booking_data.keys()) if session.booking_data else []}"
        )

    # Validate required steps based on completion type
    completed_step_ids = set(session.completed_steps.values_list("id", flat=True))

    if completion_type == "quote":
        contact_info_step = session.booking_flow.steps.filter(step_type="contact_info", is_enabled=True).first()
        if contact_info_step and contact_info_step.id not in completed_step_ids:
            raise StepValidationError("Contact information must be completed before requesting a quote")
    else:
        required_steps = session.booking_flow.steps.filter(is_required=True, is_enabled=True)
        for step in required_steps:
            if step.id not in completed_step_ids:
                raise StepValidationError(f"Required step '{step.get_step_type_display()}' is not completed")

    # Validate completion type against payment step configuration
    payment_step = session.booking_flow.steps.filter(step_type="payment_info").first()
    if payment_step and hasattr(payment_step, "payment_config"):
        payment_config = payment_step.payment_config
        if completion_type == "quote" and not payment_config.allow_quote_request:
            raise StepValidationError("Quote requests are not allowed for this booking flow")
        if completion_type == "payment" and payment_config.require_immediate_payment:
            payment_data = extract_payment_data(session)
            if not payment_data:
                raise StepValidationError("Payment is required but no payment data provided")

    # ENHANCED SAFEGUARD: Final completion status check before event creation
    if session.is_completed or session.created_event:
        logger.warning(
            f"🔥 FINAL SAFEGUARD TRIGGERED: Session {session_id} already completed "
            f"during event creation phase (is_completed={session.is_completed}, "
            f"created_event_id={session.created_event.id if session.created_event else 'None'})"
        )
        return session.created_event

    with transaction.atomic():
        # Mark session as being completed to prevent concurrent access
        session.is_completed = True
        session.completed_at = timezone.now()

        if reservation_token:
            session.booking_data["_reservation_token"] = reservation_token
            logger.info(f"🔥 Stored reservation_token in booking_data for later use: {reservation_token}")

        session.save()
        logger.info(f"🔥 COMPLETION_LOCK: Session {session_id} marked as completed at {session.completed_at}")

        try:
            # Lazy imports to avoid circular dependencies
            from .booking_notifications_service import (
                send_admin_new_lead_notification,
                send_booking_confirmation,
                send_quote_request_acknowledgment,
            )
            from .event_creation_service import create_event_from_session
            from .payment_processing_service import process_booking_payment_for_invoice
            from .quote_creation_service import create_quote_from_booking_session
            from .session_lifecycle_service import extract_booking_metadata

            # Create event from booking data
            event = create_event_from_session(session, completion_type)

            # Always create quote first
            logger.info(
                f"Creating quote from booking session for event {event.id} (current event status: {event.status})"
            )
            quote = create_quote_from_booking_session(session, event, completion_type)
            logger.info(
                f"Quote {quote.id} created with status '{quote.status}' for event {event.id} (event status: {event.status})"
            )

            if completion_type == "quote":
                logger.info(f"Processing quote completion for session {session.session_id}")
                logger.info(f"Quote request completed - event {event.id} remains as LEAD, no invoice created yet")

                try:
                    send_quote_request_acknowledgment(session, event)
                    logger.info(f"Quote request acknowledgment queued for session {session.session_id}")
                except Exception as e:
                    logger.warning(f"Failed to queue quote request acknowledgment: {e}")

                try:
                    send_admin_new_lead_notification(session, event)
                except Exception as e:
                    logger.warning(f"Failed to queue admin new lead notification: {e}")

            elif completion_type == "payment":
                logger.info(f"Processing payment completion for session {session.session_id}")

                logger.info(
                    f"Processing quote {quote.id} for payment completion (quote status: {quote.status}, event status: {event.status})"
                )

                if quote.status == "ACCEPTED":
                    if event.status != "CONFIRMED":
                        event.status = "CONFIRMED"
                    if event.accepted_quote != quote:
                        event.accepted_quote = quote
                    event.save()
                    logger.info(
                        f"Quote {quote.id} already accepted - ensured event fields are set (event status: {event.status})"
                    )
                elif quote.status == "SENT":
                    quote.accept()
                    event.refresh_from_db()
                    logger.info(f"Quote {quote.id} accepted via standard flow - event status: {event.status}")
                else:
                    logger.warning(
                        f"Quote {quote.id} has unexpected status '{quote.status}' - attempting to set event fields"
                    )
                    event.status = "CONFIRMED"
                    event.accepted_quote = quote
                    event.save()

                # Create invoice from the accepted quote
                logger.info(f"Creating invoice from accepted quote {quote.id}")
                from core.domains.payments.services.invoice_service import InvoiceService

                invoice = InvoiceService.create_from_quote(quote, booking_flow_id=session.booking_flow_id)
                logger.info(f"Created invoice {invoice.invoice_id} from quote")

                # Synchronize invoice total with correct event pricing
                if event.total_price and event.total_price > 0:
                    original_total = invoice.total_amount
                    invoice.total_amount = event.total_price
                    invoice.save(update_fields=["total_amount"])
                    logger.info(
                        f"Synchronized invoice total: {invoice.total_amount} (was {original_total}) to match event.total_price"
                    )
                else:
                    logger.warning(
                        f"Event total_price is invalid: {event.total_price}, keeping invoice.total_amount: {invoice.total_amount}"
                    )

                # Handle payment completion
                payment_data = extract_payment_data(session)
                if payment_data is None:
                    payment_data = {}

                payment = process_booking_payment_for_invoice(session, event, invoice, payment_data)

                payment.refresh_from_db()
                logger.info(f"Payment status after processing: {payment.status}")

                payment_successful = (
                    payment.status == "COMPLETED" or payment.transactions.filter(status="COMPLETED").exists()
                )

                if payment_successful:
                    invoice.mark_as_paid()
                    logger.info(
                        f"Invoice {invoice.invoice_id} payment status updated to '{invoice.status}' "
                        f"(paid: {invoice.paid_amount}, remaining: {invoice.remaining_amount}) "
                        f"for event {event.id}"
                    )

                    try:
                        send_booking_confirmation(session, event)
                        logger.info(f"Booking confirmation email queued for session {session.session_id}")
                    except Exception as e:
                        logger.warning(f"Failed to queue booking confirmation email: {e}")
                else:
                    logger.error(f"Payment processing failed - payment status: {payment.status}")
                    raise EventCreationFailed("Payment processing failed")

            else:
                # Default case: create invoice and issue it but don't process payment immediately
                logger.info(f"Processing default completion type for session {session.session_id}")
                from core.domains.payments.services.invoice_service import InvoiceService

                invoice = InvoiceService.create_from_quote(quote, booking_flow_id=session.booking_flow_id)
                invoice.issue()
                logger.info(f"Invoice {invoice.invoice_id} created and issued for later payment")

            # FINALIZE: Link the created event to the session
            session.created_event = event
            session.save()

            # Apply marketing consent
            try:
                metadata = extract_booking_metadata(session)
                marketing_consent = metadata.get("marketing_consent", False)
                if session.client:
                    apply_marketing_consent(session.client, marketing_consent)
                    logger.info(f"Applied marketing consent ({marketing_consent}) for user {session.client.id}")
            except Exception as e:
                logger.warning(f"Failed to apply marketing consent: {e}")

            # ASYNC: Update analytics in background
            try:
                from core.domains.analytics.tasks import update_funnel_analytics

                if (
                    hasattr(session.booking_flow, "conversion_funnel_id")
                    and session.booking_flow.conversion_funnel_id
                ):
                    update_funnel_analytics.delay(
                        funnel_id=session.booking_flow.conversion_funnel_id,
                        date_str=timezone.now().date().isoformat(),
                    )
                    logger.info(f"Queued funnel analytics update for session {session.session_id}")
            except ImportError:
                logger.warning("Analytics tasks not available - skipping async analytics update")
            except Exception as e:
                logger.warning(f"Failed to queue analytics update: {e}")

            logger.info(
                f"🔥 COMPLETION_SUCCESS: Completed booking session {session.session_id} with {completion_type}, created event: {event.id}"
            )
            return event

        except Exception as e:
            logger.error(f"🔥 COMPLETION_FAILED: Failed to create event from session {session.session_id}: {e!s}")
            # Note: No manual rollback needed - the atomic block automatically rolls back
            raise EventCreationFailed(f"Failed to create event: {e!s}")
