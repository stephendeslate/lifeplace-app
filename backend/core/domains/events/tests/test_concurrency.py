"""
Concurrency tests for double-booking and race condition prevention.

Tests:
- Double-booking prevention via atomic availability service
- Concurrent reservation attempts
- Race conditions in date blocking
"""

import pytest
import uuid
import threading
import time
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.db import connection, transaction
from django.utils import timezone

from core.domains.events.services.atomic_availability_service import (
    AtomicAvailabilityService,
)
from core.domains.events.models import Event, DateReservation


@pytest.fixture
def test_date():
    """Provide a test date for reservations."""
    return date.today() + timedelta(days=60)


@pytest.fixture(autouse=True)
def cleanup_reservations():
    """Clean up reservations after each test."""
    yield
    DateReservation.objects.all().delete()


# =============================================================================
# Double-Booking Prevention Tests
# =============================================================================

@pytest.mark.django_db(transaction=True)
class TestDoubleBookingPrevention:
    """Tests for preventing double-booking scenarios."""

    def test_concurrent_reservations_only_one_succeeds(self, test_date):
        """
        Test that when multiple sessions try to reserve the same date
        concurrently, only one succeeds.
        """
        num_concurrent_sessions = 5
        results = []
        session_ids = [str(uuid.uuid4()) for _ in range(num_concurrent_sessions)]

        def attempt_reservation(session_id):
            """Attempt to reserve the test date."""
            try:
                result = AtomicAvailabilityService.validate_and_reserve_date(
                    event_date=test_date,
                    booking_session_id=session_id
                )
                return {'session_id': session_id, 'result': result}
            except Exception as e:
                return {'session_id': session_id, 'error': str(e)}

        # Run concurrent reservation attempts
        with ThreadPoolExecutor(max_workers=num_concurrent_sessions) as executor:
            futures = [
                executor.submit(attempt_reservation, session_id)
                for session_id in session_ids
            ]
            results = [f.result() for f in as_completed(futures)]

        # Analyze results
        successful = [r for r in results if r.get('result', {}).get('available')]
        failed = [r for r in results if not r.get('result', {}).get('available')]

        # Only ONE session should have succeeded
        assert len(successful) == 1, f"Expected 1 successful reservation, got {len(successful)}"
        assert len(failed) == num_concurrent_sessions - 1

        # Verify only one reservation exists
        reservations = DateReservation.objects.filter(
            target_date=test_date,
            status='PENDING'
        )
        assert reservations.count() == 1

    def test_same_session_can_retry_reservation(self, test_date):
        """
        Test that the same session can retry and get the same reservation.
        """
        session_id = str(uuid.uuid4())

        # First attempt
        result1 = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=session_id
        )

        # Second attempt from same session
        result2 = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=session_id
        )

        # Both should succeed and return the same token
        assert result1['available'] is True
        assert result2['available'] is True
        assert result1['reservation_token'] == result2['reservation_token']

    def test_expired_reservation_allows_new_booking(self, test_date):
        """
        Test that an expired reservation allows a new session to book.
        """
        first_session = str(uuid.uuid4())
        second_session = str(uuid.uuid4())

        # First session creates reservation
        result1 = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=first_session
        )
        assert result1['available'] is True

        # Manually expire the reservation
        reservation = DateReservation.objects.get(token=result1['reservation_token'])
        reservation.expires_at = timezone.now() - timedelta(minutes=1)
        reservation.save()

        # Second session should now be able to reserve
        result2 = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=second_session
        )

        assert result2['available'] is True
        assert result2['reservation_token'] != result1['reservation_token']


@pytest.mark.django_db(transaction=True)
class TestDateBlockingRaceConditions:
    """Tests for race conditions in date blocking."""

    def test_reservation_blocked_by_confirmed_event(
        self, test_date, event_factory
    ):
        """
        Test that a reservation is blocked if an event confirms the date
        before the reservation is made.
        """
        session_id = str(uuid.uuid4())

        # Create a blocking event first
        event = event_factory(
            start_date=timezone.now().replace(
                year=test_date.year,
                month=test_date.month,
                day=test_date.day
            ),
            date_blocked=True,
            status='CONFIRMED'
        )

        # Try to reserve
        result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=session_id
        )

        assert result['available'] is False
        assert result['blocking_event_id'] == event.id

    def test_released_reservation_allows_other_sessions(self, test_date):
        """
        Test that releasing a reservation immediately allows other sessions.
        """
        first_session = str(uuid.uuid4())
        second_session = str(uuid.uuid4())

        # First session reserves
        result1 = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=first_session
        )
        assert result1['available'] is True

        # First session releases
        release_result = AtomicAvailabilityService.release_reservation(
            result1['reservation_token']
        )
        assert release_result['success'] is True

        # Second session should now succeed
        result2 = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=second_session
        )
        assert result2['available'] is True


# =============================================================================
# Cleanup Race Condition Tests
# =============================================================================

@pytest.mark.django_db(transaction=True)
class TestCleanupRaceConditions:
    """Tests for race conditions during cleanup operations."""

    def test_cleanup_during_confirmation(self, test_date, event_factory):
        """
        Test that cleanup doesn't affect reservations being confirmed.
        """
        session_id = str(uuid.uuid4())

        # Create reservation
        result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=session_id
        )
        token = result['reservation_token']

        # Create event
        event = event_factory()

        # Run cleanup and confirm in parallel
        def run_cleanup():
            AtomicAvailabilityService.cleanup_expired_reservations()

        def run_confirm():
            return AtomicAvailabilityService.confirm_reservation(token, event.id)

        # Execute both operations
        with ThreadPoolExecutor(max_workers=2) as executor:
            cleanup_future = executor.submit(run_cleanup)
            confirm_future = executor.submit(run_confirm)

            cleanup_result = cleanup_future.result()
            confirm_result = confirm_future.result()

        # Confirmation should succeed (not expired yet)
        assert confirm_result['success'] is True

        # Verify reservation is confirmed
        reservation = DateReservation.objects.get(token=token)
        assert reservation.status == 'CONFIRMED'

    def test_multiple_cleanup_runs_are_safe(self, test_date):
        """
        Test that running cleanup multiple times concurrently is safe.
        """
        session_id = str(uuid.uuid4())

        # Create and expire a reservation
        result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=session_id
        )

        reservation = DateReservation.objects.get(token=result['reservation_token'])
        reservation.expires_at = timezone.now() - timedelta(minutes=1)
        reservation.save()

        # Run cleanup concurrently multiple times
        num_cleanups = 5
        cleanup_results = []

        def run_cleanup():
            return AtomicAvailabilityService.cleanup_expired_reservations()

        with ThreadPoolExecutor(max_workers=num_cleanups) as executor:
            futures = [executor.submit(run_cleanup) for _ in range(num_cleanups)]
            cleanup_results = [f.result() for f in as_completed(futures)]

        # Total cleaned up should be 1 (across all runs)
        total_cleaned = sum(cleanup_results)
        assert total_cleaned == 1

        # Reservation should be expired
        reservation.refresh_from_db()
        assert reservation.status == 'EXPIRED'
