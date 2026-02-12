# backend/core/domains/events/services/atomic_availability_service.py
"""
Atomic Availability Service

Provides atomic availability checking with row-level locking for payment validation.
Uses pessimistic locking to prevent race conditions during the booking completion flow.

Key Features:
- Uses SELECT FOR UPDATE to lock events on target date
- Creates temporary reservations (5-minute window) during payment processing
- Ensures only one booking can successfully complete for a date
"""

import logging
from datetime import timedelta
from typing import Dict, Optional
import uuid

from django.db import connection, transaction
from django.utils import timezone

from ..models import Event, DateReservation
from ..exceptions import (
    DateNoLongerAvailableException,
    DateAlreadyReservedException,
    ReservationExpiredException,
    ReservationNotFoundException,
)

logger = logging.getLogger(__name__)

# Fixed reservation timeout (5 minutes)
RESERVATION_TIMEOUT_SECONDS = 300


class AtomicAvailabilityService:
    """
    Atomic availability checking with row-level locking for payment validation.

    This service implements pessimistic locking to prevent race conditions
    during the booking completion flow. It uses PostgreSQL's SELECT FOR UPDATE
    to ensure only one booking can successfully complete for a date.
    """

    @staticmethod
    @transaction.atomic
    def validate_and_reserve_date(
        event_date,
        booking_session_id: str,
        event_type_id: Optional[int] = None,
        venue_id: Optional[int] = None,
        timeout_seconds: int = RESERVATION_TIMEOUT_SECONDS
    ) -> Dict:
        """
        Atomically check availability and create a temporary reservation.

        This method:
        1. Locks all events on the target date using SELECT FOR UPDATE
        2. Checks if any event has date_blocked=True
        3. Checks for active reservations from other sessions
        4. If available, creates a temporary DateReservation record
        5. Returns reservation_token for payment processing

        Args:
            event_date: The date to check (date or datetime object)
            booking_session_id: The booking session ID requesting the reservation
            event_type_id: Optional event type ID for filtering (future use)
            venue_id: Optional venue ID for filtering (future use)
            timeout_seconds: Reservation timeout in seconds (default 300 = 5 minutes)

        Returns:
            dict: {
                'available': bool,
                'reservation_token': str or None,
                'blocking_event_id': int or None,
                'expires_at': datetime or None,
                'error': str or None
            }
        """
        # Normalize date to date object
        if hasattr(event_date, 'date'):
            check_date = event_date.date()
        else:
            check_date = event_date

        result = {
            'available': False,
            'reservation_token': None,
            'blocking_event_id': None,
            'expires_at': None,
            'error': None
        }

        try:
            # Acquire advisory lock keyed on the date to serialize concurrent
            # reservation attempts for the same date. Without this, two sessions
            # can simultaneously pass the "existing reservation" check below and
            # both create reservations. The lock is released when the transaction
            # (from @transaction.atomic) commits or rolls back.
            date_lock_key = int(check_date.strftime('%Y%m%d'))
            with connection.cursor() as cursor:
                cursor.execute('SELECT pg_advisory_xact_lock(%s)', [date_lock_key])

            # Step 1: Check for existing reservation from THIS session
            # (allows retry without creating duplicate reservations)
            existing_own_reservation = DateReservation.objects.filter(
                booking_session_id=booking_session_id,
                target_date=check_date,
                status='PENDING',
                expires_at__gt=timezone.now()
            ).first()

            if existing_own_reservation:
                # Return existing active reservation
                logger.info(
                    f"Returning existing reservation {existing_own_reservation.token} "
                    f"for session {booking_session_id}"
                )
                result['available'] = True
                result['reservation_token'] = str(existing_own_reservation.token)
                result['expires_at'] = existing_own_reservation.expires_at
                return result

            # Step 2: Lock all events on this date to prevent concurrent modifications
            # Using nowait=False to wait for lock if another transaction holds it
            # Use all_objects to bypass OptimizedEventManager's select_related,
            # which adds LEFT JOINs on nullable FKs incompatible with FOR UPDATE
            blocking_events = Event.all_objects.select_for_update(nowait=False).filter(
                start_date__date=check_date,
                date_blocked=True
            ).exclude(status='CANCELLED')

            if blocking_events.exists():
                blocking_event = blocking_events.first()
                result['blocking_event_id'] = blocking_event.id
                result['error'] = f"Date is blocked by event {blocking_event.id}"
                logger.info(
                    f"Date {check_date} is blocked by event {blocking_event.id} "
                    f"(session {booking_session_id})"
                )
                return result

            # Step 3: Check for active reservations from OTHER sessions
            active_reservations = DateReservation.objects.select_for_update(nowait=False).filter(
                target_date=check_date,
                status='PENDING',
                expires_at__gt=timezone.now()
            ).exclude(booking_session_id=booking_session_id)

            if active_reservations.exists():
                # Another session has an active reservation
                # They have priority during their payment window
                existing_reservation = active_reservations.first()
                result['error'] = "Date is currently being reserved by another booking"
                logger.info(
                    f"Date {check_date} has active reservation from another session "
                    f"(expires at {existing_reservation.expires_at})"
                )
                return result

            # Step 4: Create new reservation
            expires_at = timezone.now() + timedelta(seconds=timeout_seconds)

            reservation = DateReservation.objects.create(
                token=uuid.uuid4(),
                target_date=check_date,
                booking_session_id=booking_session_id,
                status='PENDING',
                expires_at=expires_at
            )

            result['available'] = True
            result['reservation_token'] = str(reservation.token)
            result['expires_at'] = expires_at

            logger.info(
                f"Created reservation {reservation.token} for date {check_date} "
                f"(session {booking_session_id}, expires {expires_at})"
            )

            return result

        except Exception as e:
            logger.error(f"Error in validate_and_reserve_date: {e}")
            result['error'] = str(e)
            raise

    @staticmethod
    @transaction.atomic
    def release_reservation(reservation_token: str) -> Dict:
        """
        Release a reservation if payment fails or is cancelled.

        Args:
            reservation_token: The reservation token to release

        Returns:
            dict: {'success': bool, 'error': str or None}
        """
        result = {'success': False, 'error': None}

        try:
            # Parse token if string
            if isinstance(reservation_token, str):
                try:
                    token_uuid = uuid.UUID(reservation_token)
                except ValueError:
                    result['error'] = "Invalid reservation token format"
                    return result
            else:
                token_uuid = reservation_token

            # Lock and update the reservation
            reservation = DateReservation.objects.select_for_update().filter(
                token=token_uuid
            ).first()

            if not reservation:
                # Reservation not found — treat as already released (idempotent).
                # This handles concurrent release calls and retries gracefully.
                result['success'] = True
                logger.info(f"Reservation {reservation_token} not found, treating as already released")
                return result

            if reservation.status != 'PENDING':
                # Already released/confirmed/expired — return success (idempotent)
                result['success'] = True
                logger.info(f"Reservation {reservation_token} is already {reservation.status}")
                return result

            reservation.status = 'RELEASED'
            reservation.save(update_fields=['status', 'updated_at'])

            result['success'] = True
            logger.info(f"Released reservation {reservation_token}")

            return result

        except Exception as e:
            logger.error(f"Error releasing reservation: {e}")
            result['error'] = str(e)
            raise

    @staticmethod
    @transaction.atomic
    def confirm_reservation(reservation_token: str, event_id: int) -> Dict:
        """
        Convert a reservation to a confirmed booking.

        Called after successful payment and event creation to mark
        the reservation as confirmed.

        Args:
            reservation_token: The reservation token to confirm
            event_id: The event ID that was created

        Returns:
            dict: {'success': bool, 'error': str or None}
        """
        result = {'success': False, 'error': None}

        try:
            # Parse token if string
            if isinstance(reservation_token, str):
                try:
                    token_uuid = uuid.UUID(reservation_token)
                except ValueError:
                    result['error'] = "Invalid reservation token format"
                    return result
            else:
                token_uuid = reservation_token

            # Lock and update the reservation
            reservation = DateReservation.objects.select_for_update().filter(
                token=token_uuid
            ).first()

            if not reservation:
                result['error'] = "Reservation not found"
                logger.warning(f"Reservation {reservation_token} not found for confirmation")
                return result

            if reservation.status == 'CONFIRMED':
                # Already confirmed (idempotent)
                result['success'] = True
                return result

            if reservation.status != 'PENDING':
                result['error'] = f"Reservation is {reservation.status}, cannot confirm"
                return result

            # Check if expired
            if reservation.is_expired:
                result['error'] = "Reservation has expired"
                return result

            reservation.status = 'CONFIRMED'
            reservation.confirmed_event_id = event_id
            reservation.save(update_fields=['status', 'confirmed_event_id', 'updated_at'])

            result['success'] = True
            logger.info(f"Confirmed reservation {reservation_token} for event {event_id}")

            return result

        except Exception as e:
            logger.error(f"Error confirming reservation: {e}")
            result['error'] = str(e)
            raise

    @staticmethod
    def get_reservation_by_token(reservation_token: str) -> Optional[DateReservation]:
        """
        Get a reservation by its token.

        Args:
            reservation_token: The reservation token

        Returns:
            DateReservation or None
        """
        try:
            if isinstance(reservation_token, str):
                token_uuid = uuid.UUID(reservation_token)
            else:
                token_uuid = reservation_token

            return DateReservation.objects.filter(token=token_uuid).first()
        except (ValueError, Exception):
            return None

    @staticmethod
    def validate_reservation_for_completion(
        reservation_token: str,
        booking_session_id: str
    ) -> Dict:
        """
        Validate that a reservation is still valid for booking completion.

        Called just before processing payment to ensure the reservation
        is still active and belongs to the correct session.

        Args:
            reservation_token: The reservation token to validate
            booking_session_id: The session ID that should own the reservation

        Returns:
            dict: {
                'valid': bool,
                'error': str or None,
                'reservation': DateReservation or None
            }
        """
        result = {'valid': False, 'error': None, 'reservation': None}

        reservation = AtomicAvailabilityService.get_reservation_by_token(reservation_token)

        if not reservation:
            result['error'] = "Reservation not found"
            return result

        if reservation.booking_session_id != booking_session_id:
            result['error'] = "Reservation belongs to a different session"
            return result

        if reservation.status != 'PENDING':
            result['error'] = f"Reservation is {reservation.status}"
            return result

        if reservation.is_expired:
            result['error'] = "Reservation has expired"
            return result

        result['valid'] = True
        result['reservation'] = reservation
        return result

    @staticmethod
    @transaction.atomic
    def cleanup_expired_reservations() -> int:
        """
        Clean up expired reservations.

        Should be called periodically (e.g., every minute via Celery).

        Returns:
            int: Number of reservations cleaned up
        """
        expired_count = DateReservation.objects.filter(
            status='PENDING',
            expires_at__lt=timezone.now()
        ).update(status='EXPIRED')

        if expired_count > 0:
            logger.info(f"Cleaned up {expired_count} expired reservations")

        return expired_count


# Singleton instance for convenience
atomic_availability_service = AtomicAvailabilityService()
