"""
Unit tests for AtomicAvailabilityService.

Tests:
- validate_and_reserve_date (core availability checking with locking)
- release_reservation (reservation release)
- confirm_reservation (converting reservation to confirmed booking)
- get_reservation_by_token
- validate_reservation_for_completion
- cleanup_expired_reservations

This is a HIGHEST PRIORITY test file for race condition prevention.
"""

import pytest
import uuid
from datetime import date, timedelta
from unittest.mock import patch, MagicMock
from django.utils import timezone
from django.db import transaction

from core.domains.events.services.atomic_availability_service import (
    AtomicAvailabilityService,
    RESERVATION_TIMEOUT_SECONDS,
)
from core.domains.events.models import Event, DateReservation


@pytest.fixture
def test_date():
    """Provide a test date for reservations."""
    return date.today() + timedelta(days=30)


@pytest.fixture
def booking_session_id():
    """Provide a test booking session ID."""
    return str(uuid.uuid4())


@pytest.fixture
def another_booking_session_id():
    """Provide another booking session ID for testing conflicts."""
    return str(uuid.uuid4())


@pytest.fixture(autouse=True)
def cleanup_reservations():
    """Clean up reservations after each test."""
    yield
    DateReservation.objects.all().delete()


# =============================================================================
# validate_and_reserve_date Tests
# =============================================================================

@pytest.mark.django_db
class TestValidateAndReserveDate:
    """Tests for the validate_and_reserve_date method."""

    def test_reserve_available_date_success(self, test_date, booking_session_id):
        """Test successful reservation of an available date."""
        result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )

        assert result['available'] is True
        assert result['reservation_token'] is not None
        assert result['expires_at'] is not None
        assert result['error'] is None
        assert result['blocking_event_id'] is None

        # Verify reservation was created
        reservation = DateReservation.objects.filter(
            token=result['reservation_token']
        ).first()
        assert reservation is not None
        assert reservation.status == 'PENDING'
        assert reservation.booking_session_id == booking_session_id

    def test_reserve_returns_existing_reservation_for_same_session(
        self, test_date, booking_session_id
    ):
        """Test that requesting again from same session returns existing reservation."""
        # First request
        result1 = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )

        # Second request from same session
        result2 = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )

        # Should return the same reservation token
        assert result1['reservation_token'] == result2['reservation_token']

        # Should only have one reservation
        count = DateReservation.objects.filter(
            target_date=test_date,
            status='PENDING'
        ).count()
        assert count == 1

    def test_reserve_blocked_by_existing_event(
        self, test_date, booking_session_id, event_factory
    ):
        """Test that date blocked by existing event returns unavailable."""
        # Create a blocking event
        blocking_event = event_factory(
            start_date=timezone.now().replace(
                year=test_date.year,
                month=test_date.month,
                day=test_date.day
            ),
            date_blocked=True,
            status='CONFIRMED'
        )

        result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )

        assert result['available'] is False
        assert result['reservation_token'] is None
        assert result['blocking_event_id'] == blocking_event.id
        assert 'blocked' in result['error'].lower()

    def test_reserve_blocked_by_other_session_reservation(
        self, test_date, booking_session_id, another_booking_session_id
    ):
        """Test that date with active reservation from another session is blocked."""
        # First session creates reservation
        result1 = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=another_booking_session_id
        )
        assert result1['available'] is True

        # Second session tries to reserve same date
        result2 = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )

        assert result2['available'] is False
        assert result2['reservation_token'] is None
        assert 'reserved' in result2['error'].lower() or 'another' in result2['error'].lower()

    def test_reserve_with_datetime_input(self, booking_session_id):
        """Test that datetime input is normalized to date."""
        test_datetime = timezone.now() + timedelta(days=30)

        result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_datetime,
            booking_session_id=booking_session_id
        )

        assert result['available'] is True

        # Verify the target_date is the date portion
        reservation = DateReservation.objects.filter(
            token=result['reservation_token']
        ).first()
        assert reservation.target_date == test_datetime.date()

    def test_reserve_with_custom_timeout(self, test_date, booking_session_id):
        """Test reservation with custom timeout."""
        custom_timeout = 120  # 2 minutes

        result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id,
            timeout_seconds=custom_timeout
        )

        assert result['available'] is True

        reservation = DateReservation.objects.filter(
            token=result['reservation_token']
        ).first()

        # Check expiry is approximately correct (within 5 seconds tolerance)
        expected_expiry = timezone.now() + timedelta(seconds=custom_timeout)
        delta = abs((reservation.expires_at - expected_expiry).total_seconds())
        assert delta < 5


# =============================================================================
# release_reservation Tests
# =============================================================================

@pytest.mark.django_db
class TestReleaseReservation:
    """Tests for the release_reservation method."""

    def test_release_pending_reservation_success(self, test_date, booking_session_id):
        """Test successful release of pending reservation."""
        # Create reservation
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']

        # Release it
        result = AtomicAvailabilityService.release_reservation(token)

        assert result['success'] is True
        assert result['error'] is None

        # Verify status changed
        reservation = DateReservation.objects.filter(token=token).first()
        assert reservation.status == 'RELEASED'

    def test_release_nonexistent_reservation(self):
        """Test releasing a reservation that doesn't exist."""
        fake_token = str(uuid.uuid4())

        result = AtomicAvailabilityService.release_reservation(fake_token)

        assert result['success'] is False
        assert 'not found' in result['error'].lower()

    def test_release_invalid_token_format(self):
        """Test releasing with invalid token format."""
        result = AtomicAvailabilityService.release_reservation('invalid-token')

        assert result['success'] is False
        assert 'invalid' in result['error'].lower()

    def test_release_already_released_reservation(self, test_date, booking_session_id):
        """Test releasing an already released reservation."""
        # Create and release
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']

        AtomicAvailabilityService.release_reservation(token)

        # Try to release again
        result = AtomicAvailabilityService.release_reservation(token)

        assert result['success'] is False
        assert 'already' in result['error'].lower()


# =============================================================================
# confirm_reservation Tests
# =============================================================================

@pytest.mark.django_db
class TestConfirmReservation:
    """Tests for the confirm_reservation method."""

    def test_confirm_pending_reservation_success(
        self, test_date, booking_session_id, event_factory
    ):
        """Test successful confirmation of pending reservation."""
        # Create reservation
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']

        # Create an event
        event = event_factory()

        # Confirm reservation
        result = AtomicAvailabilityService.confirm_reservation(token, event.id)

        assert result['success'] is True
        assert result['error'] is None

        # Verify reservation status and event ID
        reservation = DateReservation.objects.filter(token=token).first()
        assert reservation.status == 'CONFIRMED'
        assert reservation.confirmed_event_id == event.id

    def test_confirm_already_confirmed_is_idempotent(
        self, test_date, booking_session_id, event_factory
    ):
        """Test that confirming already confirmed reservation succeeds."""
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']
        event = event_factory()

        # Confirm twice
        result1 = AtomicAvailabilityService.confirm_reservation(token, event.id)
        result2 = AtomicAvailabilityService.confirm_reservation(token, event.id)

        assert result1['success'] is True
        assert result2['success'] is True

    def test_confirm_nonexistent_reservation(self):
        """Test confirming a reservation that doesn't exist."""
        fake_token = str(uuid.uuid4())

        result = AtomicAvailabilityService.confirm_reservation(fake_token, 1)

        assert result['success'] is False
        assert 'not found' in result['error'].lower()

    def test_confirm_released_reservation_fails(
        self, test_date, booking_session_id, event_factory
    ):
        """Test that confirming a released reservation fails."""
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']

        # Release it first
        AtomicAvailabilityService.release_reservation(token)

        # Try to confirm
        event = event_factory()
        result = AtomicAvailabilityService.confirm_reservation(token, event.id)

        assert result['success'] is False
        assert 'RELEASED' in result['error']

    def test_confirm_expired_reservation_fails(self, test_date, booking_session_id, event_factory):
        """Test that confirming an expired reservation fails."""
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']

        # Manually expire the reservation
        reservation = DateReservation.objects.filter(token=token).first()
        reservation.expires_at = timezone.now() - timedelta(minutes=1)
        reservation.save()

        # Try to confirm
        event = event_factory()
        result = AtomicAvailabilityService.confirm_reservation(token, event.id)

        assert result['success'] is False
        assert 'expired' in result['error'].lower()


# =============================================================================
# get_reservation_by_token Tests
# =============================================================================

@pytest.mark.django_db
class TestGetReservationByToken:
    """Tests for the get_reservation_by_token method."""

    def test_get_existing_reservation(self, test_date, booking_session_id):
        """Test getting an existing reservation by token."""
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']

        reservation = AtomicAvailabilityService.get_reservation_by_token(token)

        assert reservation is not None
        assert str(reservation.token) == token
        assert reservation.booking_session_id == booking_session_id

    def test_get_nonexistent_reservation_returns_none(self):
        """Test that nonexistent reservation returns None."""
        fake_token = str(uuid.uuid4())

        reservation = AtomicAvailabilityService.get_reservation_by_token(fake_token)

        assert reservation is None

    def test_get_with_invalid_token_returns_none(self):
        """Test that invalid token format returns None."""
        reservation = AtomicAvailabilityService.get_reservation_by_token('invalid')

        assert reservation is None


# =============================================================================
# validate_reservation_for_completion Tests
# =============================================================================

@pytest.mark.django_db
class TestValidateReservationForCompletion:
    """Tests for the validate_reservation_for_completion method."""

    def test_valid_pending_reservation(self, test_date, booking_session_id):
        """Test validation of a valid pending reservation."""
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']

        result = AtomicAvailabilityService.validate_reservation_for_completion(
            token, booking_session_id
        )

        assert result['valid'] is True
        assert result['error'] is None
        assert result['reservation'] is not None

    def test_validation_fails_for_different_session(
        self, test_date, booking_session_id, another_booking_session_id
    ):
        """Test that validation fails for different session."""
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']

        # Try to validate with different session
        result = AtomicAvailabilityService.validate_reservation_for_completion(
            token, another_booking_session_id
        )

        assert result['valid'] is False
        assert 'different session' in result['error'].lower()

    def test_validation_fails_for_nonexistent_reservation(self, booking_session_id):
        """Test validation fails for nonexistent reservation."""
        fake_token = str(uuid.uuid4())

        result = AtomicAvailabilityService.validate_reservation_for_completion(
            fake_token, booking_session_id
        )

        assert result['valid'] is False
        assert 'not found' in result['error'].lower()

    def test_validation_fails_for_released_reservation(
        self, test_date, booking_session_id
    ):
        """Test validation fails for released reservation."""
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']

        # Release it
        AtomicAvailabilityService.release_reservation(token)

        result = AtomicAvailabilityService.validate_reservation_for_completion(
            token, booking_session_id
        )

        assert result['valid'] is False
        assert 'RELEASED' in result['error']

    def test_validation_fails_for_expired_reservation(
        self, test_date, booking_session_id
    ):
        """Test validation fails for expired reservation."""
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']

        # Manually expire
        reservation = DateReservation.objects.filter(token=token).first()
        reservation.expires_at = timezone.now() - timedelta(minutes=1)
        reservation.save()

        result = AtomicAvailabilityService.validate_reservation_for_completion(
            token, booking_session_id
        )

        assert result['valid'] is False
        assert 'expired' in result['error'].lower()


# =============================================================================
# cleanup_expired_reservations Tests
# =============================================================================

@pytest.mark.django_db
class TestCleanupExpiredReservations:
    """Tests for the cleanup_expired_reservations method."""

    def test_cleanup_marks_expired_reservations(self, test_date, booking_session_id):
        """Test that expired reservations are marked as EXPIRED."""
        # Create reservation
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']

        # Manually expire it
        reservation = DateReservation.objects.filter(token=token).first()
        reservation.expires_at = timezone.now() - timedelta(minutes=1)
        reservation.save()

        # Run cleanup
        count = AtomicAvailabilityService.cleanup_expired_reservations()

        assert count == 1

        # Verify status changed
        reservation.refresh_from_db()
        assert reservation.status == 'EXPIRED'

    def test_cleanup_ignores_non_pending_reservations(self, test_date, booking_session_id):
        """Test that non-pending reservations are not affected by cleanup."""
        create_result = AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )
        token = create_result['reservation_token']

        # Release and expire
        AtomicAvailabilityService.release_reservation(token)
        reservation = DateReservation.objects.filter(token=token).first()
        reservation.expires_at = timezone.now() - timedelta(minutes=1)
        reservation.save()

        # Run cleanup
        count = AtomicAvailabilityService.cleanup_expired_reservations()

        assert count == 0  # Already RELEASED, not cleaned up

    def test_cleanup_returns_zero_when_no_expired(self, test_date, booking_session_id):
        """Test cleanup returns 0 when no expired reservations."""
        # Create fresh reservation (not expired)
        AtomicAvailabilityService.validate_and_reserve_date(
            event_date=test_date,
            booking_session_id=booking_session_id
        )

        count = AtomicAvailabilityService.cleanup_expired_reservations()

        assert count == 0
