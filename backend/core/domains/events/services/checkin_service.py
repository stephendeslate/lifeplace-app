# backend/core/domains/events/services/checkin_service.py
"""
Check-In/Out Service

Manages event check-in and checkout operations, including status tracking
and integration with late checkout fee calculation.
"""

import logging
from datetime import datetime
from typing import Dict, Optional

from django.utils import timezone

from ..models import Event, EventTimeline

logger = logging.getLogger(__name__)


class CheckInService:
    """
    Handles check-in and checkout operations for events.

    Status Flow:
    PENDING -> CHECKED_IN -> CHECKED_OUT
    PENDING -> NO_SHOW
    """

    @staticmethod
    def check_in(event: Event, staff_user=None, notes: str = "") -> Dict:
        """
        Process event check-in.

        Args:
            event: The event to check in
            staff_user: Staff user performing the check-in
            notes: Optional notes about the check-in

        Returns:
            dict: Result with status and details
        """
        result = {
            'success': False,
            'checked_in': False,
            'check_in_time': None,
            'error': None,
        }

        # Validate event status
        if event.status != 'CONFIRMED':
            result['error'] = f"Cannot check in event with status '{event.status}'. Event must be CONFIRMED."
            return result

        if event.check_in_status == 'CHECKED_IN':
            result['error'] = "Event is already checked in"
            return result

        if event.check_in_status == 'CHECKED_OUT':
            result['error'] = "Event has already been checked out"
            return result

        if event.check_in_status == 'NO_SHOW':
            result['error'] = "Event was marked as no-show"
            return result

        # Perform check-in
        now = timezone.now()

        event.check_in_status = 'CHECKED_IN'
        event.actual_check_in_time = now
        event.checked_in_by = staff_user
        event.check_in_notes = notes
        event.save(update_fields=[
            'check_in_status', 'actual_check_in_time',
            'checked_in_by', 'check_in_notes'
        ])

        # Record in timeline
        EventTimeline.objects.create(
            event=event,
            action_type='STATUS_CHANGE',
            description=f"Event checked in{' by ' + staff_user.get_full_name() if staff_user else ''}",
            actor=staff_user,
            is_public=False,
            action_data={
                'check_in_time': now.isoformat(),
                'notes': notes,
                'previous_status': 'PENDING',
                'new_status': 'CHECKED_IN',
            }
        )

        logger.info(f"Event {event.id} checked in at {now}")

        result['success'] = True
        result['checked_in'] = True
        result['check_in_time'] = now

        return result

    @staticmethod
    def checkout(event: Event, staff_user=None, notes: str = "",
                 calculate_late_fee: bool = True) -> Dict:
        """
        Process event checkout.

        Args:
            event: The event to check out
            staff_user: Staff user performing the checkout
            notes: Optional notes about the checkout
            calculate_late_fee: Whether to calculate and apply late checkout fee

        Returns:
            dict: Result with status, late fee info, etc.
        """
        result = {
            'success': False,
            'checked_out': False,
            'checkout_time': None,
            'late_fee_applied': False,
            'late_fee_amount': None,
            'late_fee_details': None,
            'error': None,
        }

        # Validate event status
        if event.check_in_status != 'CHECKED_IN':
            result['error'] = f"Cannot checkout event with check-in status '{event.check_in_status}'. Event must be CHECKED_IN."
            return result

        # Perform checkout
        now = timezone.now()

        event.check_in_status = 'CHECKED_OUT'
        event.actual_checkout_time = now
        event.checked_out_by = staff_user
        event.checkout_notes = notes

        # Calculate late checkout fee if applicable
        if calculate_late_fee:
            from .late_checkout_service import LateCheckoutService

            fee_result = LateCheckoutService.calculate_late_checkout_fee(event, now)
            fee_amount = fee_result.get('fee_amount', 0)

            if fee_amount and fee_amount > 0:
                # Apply the fee
                apply_result = LateCheckoutService.apply_late_checkout_fee(event, now)

                result['late_fee_applied'] = apply_result.get('fee_applied', False)
                result['late_fee_amount'] = fee_amount
                result['late_fee_details'] = fee_result.get('details')

        event.save(update_fields=[
            'check_in_status', 'actual_checkout_time',
            'checked_out_by', 'checkout_notes'
        ])

        # Record in timeline
        EventTimeline.objects.create(
            event=event,
            action_type='STATUS_CHANGE',
            description=f"Event checked out{' by ' + staff_user.get_full_name() if staff_user else ''}",
            actor=staff_user,
            is_public=False,
            action_data={
                'checkout_time': now.isoformat(),
                'notes': notes,
                'previous_status': 'CHECKED_IN',
                'new_status': 'CHECKED_OUT',
                'late_fee_applied': result['late_fee_applied'],
                'late_fee_amount': str(result['late_fee_amount']) if result['late_fee_amount'] else None,
            }
        )

        # Update event status to COMPLETED
        event.status = 'COMPLETED'
        event.save(update_fields=['status'])

        logger.info(f"Event {event.id} checked out at {now}")

        result['success'] = True
        result['checked_out'] = True
        result['checkout_time'] = now

        return result

    @staticmethod
    def mark_no_show(event: Event, staff_user=None, notes: str = "") -> Dict:
        """
        Mark an event as no-show.

        Args:
            event: The event to mark as no-show
            staff_user: Staff user marking the no-show
            notes: Optional notes

        Returns:
            dict: Result with status
        """
        result = {
            'success': False,
            'marked': False,
            'error': None,
        }

        if event.check_in_status not in ['PENDING']:
            result['error'] = f"Cannot mark no-show for event with check-in status '{event.check_in_status}'"
            return result

        now = timezone.now()

        event.check_in_status = 'NO_SHOW'
        event.save(update_fields=['check_in_status'])

        # Record in timeline
        EventTimeline.objects.create(
            event=event,
            action_type='STATUS_CHANGE',
            description=f"Event marked as no-show{' by ' + staff_user.get_full_name() if staff_user else ''}",
            actor=staff_user,
            is_public=False,
            action_data={
                'marked_at': now.isoformat(),
                'notes': notes,
                'previous_status': 'PENDING',
                'new_status': 'NO_SHOW',
            }
        )

        logger.info(f"Event {event.id} marked as no-show")

        result['success'] = True
        result['marked'] = True

        return result

    @staticmethod
    def get_check_in_status(event: Event) -> Dict:
        """
        Get comprehensive check-in/out status for an event.

        Args:
            event: The event to get status for

        Returns:
            dict: Comprehensive status information
        """
        scheduled_checkin = event.scheduled_check_in_time or event.start_date
        scheduled_checkout = event.scheduled_checkout_time or event.end_date

        is_late_checkout = False
        if event.actual_checkout_time and scheduled_checkout:
            is_late_checkout = event.actual_checkout_time > scheduled_checkout

        return {
            'status': event.check_in_status,
            'scheduled_check_in': scheduled_checkin,
            'scheduled_checkout': scheduled_checkout,
            'actual_check_in': event.actual_check_in_time,
            'actual_checkout': event.actual_checkout_time,
            'checked_in_by': event.checked_in_by_id,
            'checked_out_by': event.checked_out_by_id,
            'check_in_notes': event.check_in_notes,
            'checkout_notes': event.checkout_notes,
            'is_late_checkout': is_late_checkout,
            'late_checkout_fee_applied': event.late_checkout_fee_applied,
            'late_checkout_fee_amount': event.late_checkout_fee_amount,
            'can_check_in': event.check_in_status == 'PENDING' and event.status == 'CONFIRMED',
            'can_checkout': event.check_in_status == 'CHECKED_IN',
            'can_mark_no_show': event.check_in_status == 'PENDING',
        }

    @staticmethod
    def get_events_pending_checkin(start_date=None, end_date=None):
        """
        Get events that are pending check-in within a date range.

        Args:
            start_date: Start of date range (defaults to today)
            end_date: End of date range (defaults to today)

        Returns:
            QuerySet: Events pending check-in
        """
        from django.db.models import Q

        if start_date is None:
            start_date = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        if end_date is None:
            end_date = start_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        return Event.objects.filter(
            status='CONFIRMED',
            check_in_status='PENDING',
            start_date__gte=start_date,
            start_date__lte=end_date
        ).order_by('start_date')

    @staticmethod
    def get_events_currently_checked_in():
        """
        Get all events that are currently checked in.

        Returns:
            QuerySet: Events currently checked in
        """
        return Event.objects.filter(
            status='CONFIRMED',
            check_in_status='CHECKED_IN'
        ).order_by('start_date')
