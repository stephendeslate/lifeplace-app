# backend/core/domains/events/services/rebook_service.py
"""
Event Rebook Service

Handles rebooking of cancelled events, allowing clients to create new bookings
with pre-populated data from their cancelled events.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from django.db.models import QuerySet

from ..models import Event

logger = logging.getLogger(__name__)


class EventRebookService:
    """
    Handles rebooking of cancelled events.

    Allows clients to create new booking sessions pre-populated with data
    from their cancelled events, avoiding the need to re-enter all information.
    """

    REBOOKABLE_CANCELLATION_REASONS = [
        'PAYMENT_TIMEOUT',
        'DATE_TAKEN',
        'CLIENT_REQUEST',
    ]

    @staticmethod
    def can_rebook(event: Event) -> Tuple[bool, str]:
        """
        Check if an event can be rebooked.

        Args:
            event: The event to check

        Returns:
            Tuple[bool, str]: (can_rebook, reason)
        """
        # Check if event is cancelled
        if event.status != 'CANCELLED':
            return False, "Only cancelled events can be rebooked"

        # Check if can_rebook flag is set
        if not event.can_rebook:
            return False, "This event is not eligible for rebooking"

        # Check if cancellation reason is rebookable
        if event.cancelled_reason and event.cancelled_reason not in EventRebookService.REBOOKABLE_CANCELLATION_REASONS:
            return False, f"Events cancelled for reason '{event.cancelled_reason}' cannot be rebooked"

        # Check if original event date is in the past
        if event.start_date and event.start_date < datetime.now():
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
        return Event.objects.filter(
            client=client,
            status='CANCELLED',
            can_rebook=True,
            cancelled_reason__in=EventRebookService.REBOOKABLE_CANCELLATION_REASONS
        ).exclude(
            # Exclude events that have already been rebooked
            rebooked_events__isnull=False
        ).select_related('event_type').order_by('-cancelled_at')

    @staticmethod
    def create_rebook_session(event: Event, new_date: datetime = None) -> 'BookingSession':
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
            booking_flow = BookingFlow.objects.filter(
                event_type=event.event_type,
                is_active=True
            ).first()

        if not booking_flow:
            # Fall back to any active booking flow
            booking_flow = BookingFlow.objects.filter(is_active=True).first()

        if not booking_flow:
            raise ValueError("No active booking flow available for rebooking")

        # Build booking data from original event
        booking_data = EventRebookService._extract_booking_data_from_event(event, new_date)

        # Generate session expiry (24 hours from now)
        expires_at = datetime.now() + timedelta(hours=24)

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
        booking_data['rebook_from_event_id'] = event.id
        session.booking_data = booking_data
        session.save()

        logger.info(
            f"Created rebook session {session.session_id} for cancelled event {event.id} "
            f"(client: {event.client_id}, reason: {event.cancelled_reason})"
        )

        return session

    @staticmethod
    def _extract_booking_data_from_event(event: Event, new_date: datetime = None) -> Dict:
        """
        Extract booking data from an event for pre-populating a new booking session.

        Args:
            event: The original event
            new_date: Optional new date to use instead of original

        Returns:
            dict: Booking data for the new session
        """
        booking_data = {
            'rebook_source': 'cancelled_event',
            'original_event_id': event.id,
            'is_rebook': True,
        }

        # Extract date/time information
        if new_date:
            booking_data['start_date'] = new_date.strftime('%Y-%m-%d')
            booking_data['start_time'] = new_date.strftime('%H:%M')
        elif event.start_date:
            # Use original date/time as reference (client will likely change it)
            booking_data['original_start_date'] = event.start_date.strftime('%Y-%m-%d')
            booking_data['original_start_time'] = event.start_date.strftime('%H:%M')

        if event.end_date:
            booking_data['original_end_date'] = event.end_date.strftime('%Y-%m-%d')
            booking_data['original_end_time'] = event.end_date.strftime('%H:%M')

        # Extract guest count
        if event.guest_count:
            booking_data['guest_count'] = event.guest_count

        # Extract event name/description
        if event.name:
            booking_data['event_name'] = event.name
        if event.description:
            booking_data['description'] = event.description

        # Extract selected packages from EventProductOption
        selected_packages = []
        selected_addons = []

        for product_option in event.event_products.all():
            product_data = {
                'product_id': product_option.product_option_id,
                'quantity': product_option.quantity,
                'price': str(product_option.final_price) if product_option.final_price else '0',
            }

            if product_option.num_participants:
                product_data['num_participants'] = product_option.num_participants
            if product_option.num_nights:
                product_data['num_nights'] = product_option.num_nights
            if product_option.excess_hours:
                product_data['excess_hours'] = product_option.excess_hours

            # Determine if package or addon based on product type
            if product_option.product_option and hasattr(product_option.product_option, 'category'):
                category = product_option.product_option.category
                if category and category.name and 'addon' in category.name.lower():
                    selected_addons.append(product_data)
                else:
                    selected_packages.append(product_data)
            else:
                # Default to package if we can't determine
                selected_packages.append(product_data)

        if selected_packages:
            booking_data['selected_packages'] = selected_packages
        if selected_addons:
            booking_data['selected_addons'] = selected_addons

        # Extract questionnaire responses if available
        try:
            from core.domains.questionnaires.models import EventQuestionnaireResponse

            responses = EventQuestionnaireResponse.objects.filter(event=event)
            questionnaire_responses = []

            for response in responses:
                questionnaire_responses.append({
                    'field': response.field_id,
                    'value': response.value
                })

            if questionnaire_responses:
                booking_data['questionnaire_responses'] = questionnaire_responses
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
            new_event.save(update_fields=['original_event'])

            # Mark original as no longer rebookable
            original_event.can_rebook = False
            original_event.save(update_fields=['can_rebook'])

            logger.info(
                f"Completed rebook: new event {new_event.id} linked to original {original_event_id}"
            )
        except Event.DoesNotExist:
            logger.warning(f"Original event {original_event_id} not found for rebook completion")

    @staticmethod
    def get_rebook_history(event: Event) -> List[Dict]:
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
            history.append({
                'event_id': current.original_event_id,
                'cancelled_at': current.original_event.cancelled_at,
                'cancelled_reason': current.original_event.cancelled_reason,
                'rebooked_to': current.id,
            })
            current = current.original_event

        # Get any events rebooked from this one
        for rebooked in event.rebooked_events.all():
            history.append({
                'event_id': event.id,
                'cancelled_at': event.cancelled_at,
                'cancelled_reason': event.cancelled_reason,
                'rebooked_to': rebooked.id,
            })

        return history


# Create singleton instance
rebook_service = EventRebookService()
