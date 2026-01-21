# backend/core/domains/events/services/date_blocking_service.py
"""
Date Blocking Service

Manages date blocking based on payment terms configuration.
Implements the first-to-pay-wins logic for the ON_DOWNPAYMENT policy.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from django.db import transaction
from django.db.models import Q, QuerySet
from django.utils import timezone

from ..models import Event, DateReservation

logger = logging.getLogger(__name__)


class DateBlockingService:
    """
    Manages date blocking based on payment terms configuration.

    Key responsibility: First-to-pay-wins logic

    Blocking Policies:
    - IMMEDIATE: Date is blocked as soon as booking is confirmed
    - ON_DOWNPAYMENT: Date is blocked when downpayment is received
    """

    @staticmethod
    def get_effective_payment_terms(event_or_flow) -> dict:
        """
        Get effective payment terms including date blocking policy.

        Args:
            event_or_flow: Either an Event instance or a BookingFlow instance

        Returns:
            dict: Effective payment terms
        """
        from core.domains.bookingflow.models import BookingFlow, PaymentTermsConfiguration
        from core.domains.payments.models import PaymentSettings

        # Get global defaults
        global_settings = PaymentSettings.get_default_settings()

        # Build default terms from global settings
        default_terms = {
            'date_blocking_policy': global_settings.date_blocking_policy,
            'downpayment_due_reference': global_settings.downpayment_due_reference,
            'downpayment_deadline_days': global_settings.downpayment_deadline_days,
            'downpayment_percentage': global_settings.downpayment_percentage,
            'downpayment_due_days': global_settings.downpayment_due_days,
        }

        # Try to get flow-specific overrides
        booking_flow = None

        if isinstance(event_or_flow, Event):
            # Get booking flow from event's type if available
            if event_or_flow.event_type:
                booking_flow = BookingFlow.objects.filter(
                    event_type=event_or_flow.event_type,
                    is_active=True
                ).first()
        elif isinstance(event_or_flow, BookingFlow):
            booking_flow = event_or_flow

        if booking_flow:
            # Look for PaymentTermsConfiguration
            try:
                payment_step = booking_flow.steps.filter(
                    step_type='payment_info',
                    is_enabled=True
                ).first()

                if payment_step and hasattr(payment_step, 'payment_terms_config'):
                    flow_terms = payment_step.payment_terms_config.get_effective_settings()
                    return flow_terms
            except Exception as e:
                logger.warning(f"Error getting flow payment terms: {e}")

        return default_terms

    @staticmethod
    def is_date_blocked(target_date, exclude_event_id: Optional[int] = None) -> bool:
        """
        Check if a date is already blocked by another event.

        Args:
            target_date: The date to check (date or datetime)
            exclude_event_id: Event ID to exclude from check (for updates)

        Returns:
            bool: True if date is blocked
        """
        if hasattr(target_date, 'date'):
            check_date = target_date.date()
        else:
            check_date = target_date

        query = Event.objects.filter(
            date_blocked=True,
            start_date__date=check_date
        ).exclude(status='CANCELLED')

        if exclude_event_id:
            query = query.exclude(id=exclude_event_id)

        return query.exists()

    @staticmethod
    def get_blocking_event(target_date) -> Optional[Event]:
        """
        Get the event that is blocking a specific date.

        Args:
            target_date: The date to check

        Returns:
            Event or None
        """
        if hasattr(target_date, 'date'):
            check_date = target_date.date()
        else:
            check_date = target_date

        return Event.objects.filter(
            date_blocked=True,
            start_date__date=check_date
        ).exclude(status='CANCELLED').first()

    @staticmethod
    def block_date(event: Event, reason: str = None) -> None:
        """
        Block the date for this event.

        Sets date_blocked=True, date_blocked_at=now()

        Args:
            event: The event to block the date for
            reason: Optional reason for blocking (for logging)
        """
        event.date_blocked = True
        event.date_blocked_at = timezone.now()
        event.save(update_fields=['date_blocked', 'date_blocked_at'])

        logger.info(
            f"Date blocked for event {event.id} on {event.start_date.date()}"
            f"{f' - Reason: {reason}' if reason else ''}"
        )

    @staticmethod
    def unblock_date(event: Event, reason: str = None) -> None:
        """
        Unblock the date for this event.

        Args:
            event: The event to unblock the date for
            reason: Optional reason for unblocking (for logging)
        """
        event.date_blocked = False
        event.date_blocked_at = None
        event.save(update_fields=['date_blocked', 'date_blocked_at'])

        logger.info(
            f"Date unblocked for event {event.id} on {event.start_date.date()}"
            f"{f' - Reason: {reason}' if reason else ''}"
        )

    @staticmethod
    def get_competing_events(event: Event) -> QuerySet:
        """
        Get other unpaid events on the same date.

        Args:
            event: The reference event

        Returns:
            QuerySet of competing events
        """
        return Event.objects.filter(
            start_date__date=event.start_date.date(),
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID'
        ).exclude(id=event.id)

    @staticmethod
    def process_downpayment_received(event: Event, payment=None) -> Dict:
        """
        CRITICAL: Handle first-to-pay-wins logic.

        1. Check if date is already blocked by another event
           - If yes: raise exception or return error
        2. Block the date for this event
        3. Find all other CONFIRMED but unpaid events on same date
        4. Cancel those events with reason='DATE_TAKEN'
        5. Return summary of actions taken

        Args:
            event: The event that received the downpayment
            payment: The payment that triggered this (optional, for logging)

        Returns:
            dict: Summary of actions taken
        """
        result = {
            'success': False,
            'blocked': False,
            'cancelled_events': [],
            'error': None,
        }

        # Check if date is already blocked
        if DateBlockingService.is_date_blocked(event.start_date, exclude_event_id=event.id):
            blocking_event = DateBlockingService.get_blocking_event(event.start_date)
            result['error'] = f"Date already blocked by event {blocking_event.id if blocking_event else 'unknown'}"
            logger.warning(
                f"Cannot block date for event {event.id} - "
                f"already blocked by event {blocking_event.id if blocking_event else 'unknown'}"
            )
            return result

        # Block the date for this event
        DateBlockingService.block_date(
            event,
            reason=f"Downpayment received (payment {payment.id if payment else 'N/A'})"
        )
        result['blocked'] = True

        # Find and cancel competing events
        competing_events = DateBlockingService.get_competing_events(event)
        cancelled_events = []

        for competing_event in competing_events:
            DateBlockingService.cancel_event_for_date_taken(competing_event, event)
            cancelled_events.append(competing_event)
            logger.info(
                f"Cancelled event {competing_event.id} (client: {competing_event.client_id}) "
                f"because date was taken by event {event.id}"
            )

        result['cancelled_events'] = cancelled_events
        result['success'] = True

        logger.info(
            f"Downpayment processed for event {event.id}: "
            f"date blocked, {len(cancelled_events)} competing events cancelled"
        )

        return result

    @staticmethod
    @transaction.atomic
    def atomic_process_downpayment_received(
        event: Event,
        payment=None,
        reservation_token: str = None
    ) -> Dict:
        """
        ATOMIC version of first-to-pay-wins logic using SELECT FOR UPDATE.

        This method uses pessimistic locking to prevent race conditions:
        1. Lock the event row with SELECT FOR UPDATE
        2. Lock all competing events on the same date
        3. Atomically check and block

        Args:
            event: The event that received the downpayment
            payment: The payment that triggered this (optional, for logging)
            reservation_token: Optional reservation token to confirm

        Returns:
            dict: Summary of actions taken {
                'success': bool,
                'blocked': bool,
                'cancelled_events': list,
                'error': str or None
            }
        """
        result = {
            'success': False,
            'blocked': False,
            'cancelled_events': [],
            'error': None,
        }

        try:
            # Lock OUR event first with SELECT FOR UPDATE
            locked_event = Event.objects.select_for_update(nowait=False).get(id=event.id)
        except Event.DoesNotExist:
            result['error'] = 'Event not found'
            return result

        # Skip if already blocked or cancelled
        if locked_event.date_blocked:
            logger.info(f"Event {event.id} already has date blocked")
            result['success'] = True
            result['blocked'] = True
            return result

        if locked_event.status == 'CANCELLED':
            result['error'] = 'Event is cancelled'
            return result

        # Lock ALL events on this date (including competitors)
        events_on_date = Event.objects.select_for_update(nowait=False).filter(
            start_date__date=locked_event.start_date.date(),
            status__in=['CONFIRMED', 'LEAD']
        ).exclude(status='CANCELLED')

        # Check if another event has already blocked this date
        blocking_event = events_on_date.filter(date_blocked=True).exclude(id=locked_event.id).first()
        if blocking_event:
            result['error'] = f"Date already blocked by event {blocking_event.id}"
            logger.warning(
                f"Cannot block date for event {event.id} - "
                f"already blocked by event {blocking_event.id}"
            )
            return result

        # ATOMIC BLOCK: We have the lock, block the date now
        locked_event.date_blocked = True
        locked_event.date_blocked_at = timezone.now()
        locked_event.save(update_fields=['date_blocked', 'date_blocked_at'])
        result['blocked'] = True

        logger.info(
            f"Date blocked atomically for event {event.id} on {locked_event.start_date.date()}"
            f" (payment {payment.id if payment else 'N/A'})"
        )

        # Confirm the reservation if provided
        if reservation_token:
            try:
                from .atomic_availability_service import AtomicAvailabilityService
                AtomicAvailabilityService.confirm_reservation(reservation_token, locked_event.id)
            except Exception as e:
                logger.warning(f"Failed to confirm reservation {reservation_token}: {e}")

        # Find and cancel competing events (already locked)
        competing_events = events_on_date.filter(
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID'
        ).exclude(id=locked_event.id)

        cancelled_events = []
        for competing_event in competing_events:
            DateBlockingService.cancel_event_for_date_taken(competing_event, locked_event)
            cancelled_events.append({
                'id': competing_event.id,
                'client_id': competing_event.client_id
            })
            logger.info(
                f"Cancelled event {competing_event.id} (client: {competing_event.client_id}) "
                f"because date was taken by event {event.id}"
            )

        result['cancelled_events'] = cancelled_events
        result['success'] = True

        # Broadcast availability change via WebSocket
        try:
            from .websocket_service import AvailabilityWebSocketService
            AvailabilityWebSocketService.broadcast_date_blocked(
                date=locked_event.start_date.date(),
                blocking_event_id=locked_event.id
            )
        except ImportError:
            logger.debug("WebSocket service not available yet")
        except Exception as e:
            logger.warning(f"Failed to broadcast date_blocked: {e}")

        logger.info(
            f"Atomic downpayment processed for event {event.id}: "
            f"date blocked, {len(cancelled_events)} competing events cancelled"
        )

        return result

    @staticmethod
    def cancel_event_for_date_taken(event: Event, blocking_event: Event) -> None:
        """
        Cancel an event because another event took the date.

        Sets status='CANCELLED', cancelled_reason='DATE_TAKEN'
        Triggers notification to client.

        Args:
            event: The event to cancel
            blocking_event: The event that took the date
        """
        event.status = 'CANCELLED'
        event.cancelled_reason = 'DATE_TAKEN'
        event.cancelled_at = timezone.now()
        event.can_rebook = True  # Allow rebooking
        event.save(update_fields=['status', 'cancelled_reason', 'cancelled_at', 'can_rebook'])

        # Trigger notification (using existing notification system)
        DateBlockingService._send_date_taken_notification(event, blocking_event)

        logger.info(
            f"Event {event.id} cancelled - date taken by event {blocking_event.id}"
        )

    @staticmethod
    def cancel_event_for_timeout(event: Event) -> None:
        """
        Cancel an event due to payment deadline expiry.

        Sets status='CANCELLED', cancelled_reason='PAYMENT_TIMEOUT'
        Triggers notification to client.

        Args:
            event: The event to cancel
        """
        event.status = 'CANCELLED'
        event.cancelled_reason = 'PAYMENT_TIMEOUT'
        event.cancelled_at = timezone.now()
        event.can_rebook = True  # Allow rebooking
        event.save(update_fields=['status', 'cancelled_reason', 'cancelled_at', 'can_rebook'])

        # Trigger notification (using existing notification system)
        DateBlockingService._send_timeout_notification(event)

        logger.info(
            f"Event {event.id} cancelled - payment deadline expired"
        )

    @staticmethod
    def check_deadline_expiry(event: Event) -> bool:
        """
        Check if event's downpayment deadline has passed.

        Args:
            event: The event to check

        Returns:
            bool: True if deadline has expired
        """
        if not event.downpayment_deadline:
            return False

        now = timezone.now()
        return now >= event.downpayment_deadline

    @staticmethod
    def set_downpayment_deadline(event: Event, deadline_days: int) -> None:
        """
        Set the downpayment deadline for an event.

        Args:
            event: The event
            deadline_days: Number of days from now until deadline
        """
        event.downpayment_deadline = timezone.now() + timedelta(days=deadline_days)
        event.save(update_fields=['downpayment_deadline'])

        logger.info(
            f"Set downpayment deadline for event {event.id}: "
            f"{event.downpayment_deadline.strftime('%Y-%m-%d %H:%M')}"
        )

    @staticmethod
    def should_block_on_booking_completion(event: Event) -> Tuple[bool, str]:
        """
        Determine if date should be blocked immediately on booking completion.

        Args:
            event: The newly created event

        Returns:
            Tuple[bool, str]: (should_block, policy_name)
        """
        terms = DateBlockingService.get_effective_payment_terms(event)
        policy = terms.get('date_blocking_policy', 'IMMEDIATE')

        if policy == 'IMMEDIATE':
            return True, 'IMMEDIATE'
        return False, policy

    @staticmethod
    def _send_date_taken_notification(event: Event, blocking_event: Event) -> None:
        """
        Send notification to client that their date was taken by another booking.

        Args:
            event: The cancelled event
            blocking_event: The event that took the date
        """
        try:
            from core.domains.notifications.services import NotificationService

            NotificationService.create_notification(
                recipient=event.client,
                notification_type='EVENT_CANCELLED',
                title='Booking Cancelled - Date No Longer Available',
                message=(
                    f'Your booking for {event.start_date.strftime("%B %d, %Y")} has been cancelled '
                    f'because another client secured the date first. '
                    f'You can rebook for a different date through your account.'
                ),
                related_event=event,
                priority='HIGH',
                channels=['IN_APP', 'EMAIL']
            )
        except Exception as e:
            logger.error(f"Failed to send date taken notification for event {event.id}: {e}")

    @staticmethod
    def _send_timeout_notification(event: Event) -> None:
        """
        Send notification to client that their booking was cancelled due to payment timeout.

        Args:
            event: The cancelled event
        """
        try:
            from core.domains.notifications.services import NotificationService

            NotificationService.create_notification(
                recipient=event.client,
                notification_type='EVENT_CANCELLED',
                title='Booking Cancelled - Payment Deadline Expired',
                message=(
                    f'Your booking for {event.start_date.strftime("%B %d, %Y")} has been cancelled '
                    f'because the payment deadline has passed. '
                    f'You can rebook for a new date through your account.'
                ),
                related_event=event,
                priority='HIGH',
                channels=['IN_APP', 'EMAIL']
            )
        except Exception as e:
            logger.error(f"Failed to send timeout notification for event {event.id}: {e}")


# Create singleton instance
date_blocking_service = DateBlockingService()
