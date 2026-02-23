# backend/core/domains/events/services/rebook_service.py
"""
Event Rebook Service

Handles rebooking of cancelled events, allowing clients to create new bookings
with pre-populated data from their cancelled events.
"""

import logging
import uuid
from datetime import datetime, timedelta

from django.db.models import QuerySet
from django.utils import timezone

from ..models import Event

logger = logging.getLogger(__name__)


class EventRebookService:
    """
    Handles rebooking of cancelled events.

    Allows clients to create new booking sessions pre-populated with data
    from their cancelled events, avoiding the need to re-enter all information.
    """

    REBOOKABLE_CANCELLATION_REASONS = [
        "PAYMENT_TIMEOUT",
        "DATE_TAKEN",
        "CLIENT_REQUEST",
    ]

    @staticmethod
    def can_rebook(event: Event) -> tuple[bool, str]:
        """
        Check if an event can be rebooked.

        Args:
            event: The event to check

        Returns:
            Tuple[bool, str]: (can_rebook, reason)
        """
        # Check if event is cancelled
        if event.status != "CANCELLED":
            return False, "Only cancelled events can be rebooked"

        # Check if can_rebook flag is set
        if not event.can_rebook:
            return False, "This event is not eligible for rebooking"

        # Check if cancellation reason is rebookable
        if event.cancelled_reason and event.cancelled_reason not in EventRebookService.REBOOKABLE_CANCELLATION_REASONS:
            return False, f"Events cancelled for reason '{event.cancelled_reason}' cannot be rebooked"

        # Check if original event date is in the past
        if event.start_date and event.start_date < timezone.now():
            return False, "Cannot rebook events with past dates"

        # Check if there's already a rebooked event
        if event.rebooked_events.exists():
            return False, "This event has already been rebooked"

        return True, "Event can be rebooked"

    @staticmethod
    def get_rebookable_events(client) -> QuerySet:
        """
        Get all rebookable cancelled events for a client.

        Args:
            client: The client user

        Returns:
            QuerySet of rebookable events
        """
        return (
            Event.objects.filter(
                client=client,
                status="CANCELLED",
                can_rebook=True,
                cancelled_reason__in=EventRebookService.REBOOKABLE_CANCELLATION_REASONS,
            )
            .exclude(
                # Exclude events that have already been rebooked
                rebooked_events__isnull=False
            )
            .select_related("event_type")
            .order_by("-cancelled_at")
        )

    @staticmethod
    def create_rebook_session(event: Event, new_date: datetime = None) -> "BookingSession":
        """
        Create a new booking session pre-populated with original event data.

        Args:
            event: The cancelled event to rebook
            new_date: Optional new date for the rebooked event

        Returns:
            BookingSession: New booking session with pre-populated data

        Raises:
            ValueError: If event cannot be rebooked
        """
        from core.domains.bookingflow.models import BookingFlow, BookingSession

        # Validate can rebook
        can_rebook, reason = EventRebookService.can_rebook(event)
        if not can_rebook:
            raise ValueError(reason)

        # Find the appropriate booking flow
        booking_flow = None

        if event.event_type:
            booking_flow = BookingFlow.objects.filter(event_type=event.event_type, is_active=True).first()

        if not booking_flow:
            # Fall back to any active booking flow
            booking_flow = BookingFlow.objects.filter(is_active=True).first()

        if not booking_flow:
            raise ValueError("No active booking flow available for rebooking")

        # Build booking data from original event
        booking_data = EventRebookService._extract_booking_data_from_event(event, new_date)

        # Generate session expiry (24 hours from now)
        expires_at = timezone.now() + timedelta(hours=24)

        # Get first step
        first_step = booking_flow.enabled_steps.first()

        # Create new session
        session = BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=booking_flow,
            client=event.client,
            current_step=first_step,
            booking_data=booking_data,
            expires_at=expires_at,
        )

        # Store reference to original event
        booking_data["rebook_from_event_id"] = event.id
        session.booking_data = booking_data
        session.save()

        logger.info(
            f"Created rebook session {session.session_id} for cancelled event {event.id} "
            f"(client: {event.client_id}, reason: {event.cancelled_reason})"
        )

        return session

    @staticmethod
    def _extract_booking_data_from_event(event: Event, new_date: datetime = None) -> dict:
        """
        Extract booking data from an event for pre-populating a new booking session.

        Args:
            event: The original event
            new_date: Optional new date to use instead of original

        Returns:
            dict: Booking data for the new session
        """
        booking_data = {
            "rebook_source": "cancelled_event",
            "original_event_id": event.id,
            "is_rebook": True,
        }

        # Extract date/time information
        if new_date:
            booking_data["start_date"] = new_date.strftime("%Y-%m-%d")
            booking_data["start_time"] = new_date.strftime("%H:%M")
        elif event.start_date:
            # Use original date/time as reference (client will likely change it)
            booking_data["original_start_date"] = event.start_date.strftime("%Y-%m-%d")
            booking_data["original_start_time"] = event.start_date.strftime("%H:%M")

        if event.end_date:
            booking_data["original_end_date"] = event.end_date.strftime("%Y-%m-%d")
            booking_data["original_end_time"] = event.end_date.strftime("%H:%M")

        # Extract guest count
        if event.guest_count:
            booking_data["guest_count"] = event.guest_count

        # Extract event name/description
        if event.name:
            booking_data["event_name"] = event.name
        if event.description:
            booking_data["description"] = event.description

        # Extract selected packages from EventProductOption
        selected_packages = []
        selected_addons = []

        for product_option in event.event_products.all():
            product_data = {
                "product_id": product_option.product_option_id,
                "quantity": product_option.quantity,
                "price": str(product_option.final_price) if product_option.final_price else "0",
            }

            if product_option.num_participants:
                product_data["num_participants"] = product_option.num_participants
            if product_option.num_nights:
                product_data["num_nights"] = product_option.num_nights
            if product_option.excess_hours:
                product_data["excess_hours"] = product_option.excess_hours

            # Determine if package or addon based on product type
            if product_option.product_option and hasattr(product_option.product_option, "category"):
                category = product_option.product_option.category
                if category and category.name and "addon" in category.name.lower():
                    selected_addons.append(product_data)
                else:
                    selected_packages.append(product_data)
            else:
                # Default to package if we can't determine
                selected_packages.append(product_data)

        if selected_packages:
            booking_data["selected_packages"] = selected_packages
        if selected_addons:
            booking_data["selected_addons"] = selected_addons

        # Extract questionnaire responses if available
        try:
            from core.domains.questionnaires.models import EventQuestionnaireResponse

            responses = EventQuestionnaireResponse.objects.filter(event=event)
            questionnaire_responses = []

            for response in responses:
                questionnaire_responses.append({"field": response.field_id, "value": response.value})

            if questionnaire_responses:
                booking_data["questionnaire_responses"] = questionnaire_responses
        except Exception as e:
            logger.warning(f"Could not extract questionnaire responses: {e}")

        return booking_data

    @staticmethod
    def complete_rebook(new_event: Event, original_event_id: int) -> None:
        """
        Complete the rebooking process by linking the new event to the original.

        Called after a rebook session creates a new event.

        Args:
            new_event: The newly created event
            original_event_id: ID of the original cancelled event
        """
        try:
            original_event = Event.objects.get(id=original_event_id)

            # Link new event to original
            new_event.original_event = original_event
            new_event.save(update_fields=["original_event"])

            # Mark original as no longer rebookable
            original_event.can_rebook = False
            original_event.save(update_fields=["can_rebook"])

            logger.info(f"Completed rebook: new event {new_event.id} linked to original {original_event_id}")
        except Event.DoesNotExist:
            logger.warning(f"Original event {original_event_id} not found for rebook completion")

    @staticmethod
    def get_rebook_history(event: Event) -> list[dict]:
        """
        Get the rebooking history for an event.

        Args:
            event: The event to get history for

        Returns:
            List of dicts with rebook history information
        """
        history = []

        # Trace back to original event
        current = event
        while current.original_event:
            history.append(
                {
                    "event_id": current.original_event_id,
                    "cancelled_at": current.original_event.cancelled_at,
                    "cancelled_reason": current.original_event.cancelled_reason,
                    "rebooked_to": current.id,
                }
            )
            current = current.original_event

        # Get any events rebooked from this one
        for rebooked in event.rebooked_events.all():
            history.append(
                {
                    "event_id": event.id,
                    "cancelled_at": event.cancelled_at,
                    "cancelled_reason": event.cancelled_reason,
                    "rebooked_to": rebooked.id,
                }
            )

        return history

    # ============================================================
    # RESCHEDULING FEE CALCULATION
    # ============================================================

    @staticmethod
    def calculate_rescheduling_fee(event: Event) -> dict:
        """
        Calculate the rescheduling fee for an event.

        Args:
            event: The event being rescheduled

        Returns:
            dict: Fee calculation details
        """
        from decimal import Decimal

        from core.domains.payments.models import PaymentSettings

        result = {
            "fee_applicable": False,
            "fee_amount": Decimal("0.00"),
            "fee_type": None,
            "fee_percentage": None,
            "within_grace_period": False,
            "grace_period_hours": 0,
            "hours_since_booking": 0,
            "reason": None,
        }

        try:
            settings = PaymentSettings.get_default_settings()

            if not settings.rescheduling_fee_enabled:
                result["reason"] = "Rescheduling fees not enabled"
                return result

            # Check if within grace period
            if event.created_at:
                hours_since_booking = (timezone.now() - event.created_at.replace(tzinfo=None)).total_seconds() / 3600
                result["hours_since_booking"] = round(hours_since_booking, 2)
                result["grace_period_hours"] = settings.rescheduling_grace_period_hours

                if hours_since_booking <= settings.rescheduling_grace_period_hours:
                    result["within_grace_period"] = True
                    result["reason"] = f"Within {settings.rescheduling_grace_period_hours}h grace period"
                    return result

            # Calculate fee based on type
            result["fee_applicable"] = True
            result["fee_type"] = settings.rescheduling_fee_type

            if settings.rescheduling_fee_type == "PERCENTAGE":
                # Get contract/quote total for percentage calculation
                contract_total = EventRebookService._get_event_contract_total(event)
                fee_rate = settings.rescheduling_fee_percentage / Decimal("100")
                result["fee_amount"] = (contract_total * fee_rate).quantize(Decimal("0.01"))
                result["fee_percentage"] = settings.rescheduling_fee_percentage
                result["reason"] = f"{settings.rescheduling_fee_percentage}% of contract total"
            else:  # FIXED
                result["fee_amount"] = settings.rescheduling_fee_fixed_amount or Decimal("0.00")
                result["reason"] = "Fixed rescheduling fee"

            return result

        except Exception as e:
            logger.error(f"Error calculating rescheduling fee: {e}")
            result["reason"] = f"Error: {e!s}"
            return result

    @staticmethod
    def _get_event_contract_total(event: Event) -> "Decimal":
        """Get the contract/quote total for an event."""
        from decimal import Decimal

        # Try to get from accepted quote
        try:
            from core.domains.sales.models import EventQuote

            accepted_quote = EventQuote.objects.filter(event=event, status="ACCEPTED").first()
            if accepted_quote:
                return accepted_quote.total_amount
        except Exception:
            pass

        # Try to get from invoice
        try:
            from core.domains.payments.models import Invoice

            invoice = Invoice.objects.filter(event=event).first()
            if invoice:
                return invoice.total_amount
        except Exception:
            pass

        # Fallback to event total_price
        return event.total_price or Decimal("0.00")

    @staticmethod
    def process_reschedule(
        event: Event, new_start_date: datetime, new_end_date: datetime = None, apply_fee: bool = True, notes: str = None
    ) -> dict:
        """
        Process event rescheduling with fee calculation.

        Args:
            event: The event to reschedule
            new_start_date: New start date/time
            new_end_date: New end date/time (optional)
            apply_fee: Whether to apply the rescheduling fee
            notes: Optional notes about the rescheduling

        Returns:
            dict: Result of the rescheduling operation
        """
        from django.utils import timezone

        result = {
            "success": False,
            "fee_applied": False,
            "fee_amount": None,
            "error": None,
        }

        try:
            # Validate event status
            if event.status == "CANCELLED":
                result["error"] = "Cannot reschedule a cancelled event"
                return result

            if event.status == "COMPLETED":
                result["error"] = "Cannot reschedule a completed event"
                return result

            # Store original date if this is the first reschedule
            if not event.original_start_date:
                event.original_start_date = event.start_date

            # Calculate fee if applicable
            fee_info = EventRebookService.calculate_rescheduling_fee(event)

            if apply_fee and fee_info["fee_applicable"]:
                result["fee_applied"] = True
                result["fee_amount"] = fee_info["fee_amount"]
                # Note: Actual fee charging would be handled separately
                # This just tracks that a fee should be applied

            # Update event dates
            event.start_date = new_start_date
            if new_end_date:
                event.end_date = new_end_date

            # Update tracking fields
            event.reschedule_count = (event.reschedule_count or 0) + 1
            event.last_rescheduled_at = timezone.now()

            event.save(
                update_fields=[
                    "start_date",
                    "end_date",
                    "original_start_date",
                    "reschedule_count",
                    "last_rescheduled_at",
                ]
            )

            # Log timeline entry
            try:
                from core.domains.events.models import EventTimeline

                EventTimeline.objects.create(
                    event=event,
                    action_type="STATUS_CHANGE",
                    description=f"Event rescheduled to {new_start_date.strftime('%B %d, %Y')}"
                    + (f" (Fee: {fee_info['fee_amount']})" if result["fee_applied"] else " (No fee)"),
                    is_public=True,
                    action_data={
                        "previous_date": str(event.original_start_date) if event.original_start_date else None,
                        "new_date": str(new_start_date),
                        "reschedule_count": event.reschedule_count,
                        "fee_applied": result["fee_applied"],
                        "fee_amount": str(fee_info["fee_amount"]) if fee_info["fee_amount"] else None,
                    },
                )
            except Exception as e:
                logger.warning(f"Could not create timeline entry for reschedule: {e}")

            result["success"] = True
            logger.info(
                f"Rescheduled event {event.id} to {new_start_date} "
                f"(count: {event.reschedule_count}, fee: {result['fee_amount']})"
            )

            return result

        except Exception as e:
            logger.error(f"Error processing reschedule for event {event.id}: {e}")
            result["error"] = str(e)
            return result

    @staticmethod
    def preview_rescheduling_fee(event: Event) -> dict:
        """
        Preview the rescheduling fee without actually rescheduling.

        Args:
            event: The event to preview fee for

        Returns:
            dict: Fee preview information
        """
        fee_info = EventRebookService.calculate_rescheduling_fee(event)

        return {
            "fee_applicable": fee_info["fee_applicable"],
            "fee_amount": str(fee_info["fee_amount"]),
            "fee_type": fee_info["fee_type"],
            "fee_percentage": str(fee_info["fee_percentage"]) if fee_info["fee_percentage"] else None,
            "within_grace_period": fee_info["within_grace_period"],
            "grace_period_hours": fee_info["grace_period_hours"],
            "hours_since_booking": fee_info["hours_since_booking"],
            "reason": fee_info["reason"],
            "reschedule_count": event.reschedule_count or 0,
        }


# Create singleton instance
rebook_service = EventRebookService()
