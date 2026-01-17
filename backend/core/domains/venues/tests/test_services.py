"""
Unit tests for venues domain services.

Tests:
- VenueService (get venues, calculate event times, validate bookings, calculate fees)
- VenueAvailabilityService (check availability, blocked dates, package availability)
"""

import pytest
from decimal import Decimal
from datetime import date, time, timedelta
from django.utils import timezone

from core.domains.venues.services import VenueService, VenueAvailabilityService
from core.domains.venues.services.venue_service import (
    CalculatedEventTimes,
    ValidationResult,
)
from core.domains.venues.services.venue_availability_service import (
    VenueAvailabilityResult,
)
from core.domains.venues.models import (
    Venue,
    VenueOperatingRules,
    PackageVenue,
    VenueBlockedDate,
)


# =============================================================================
# VENUE SERVICE TESTS
# =============================================================================

@pytest.mark.django_db
class TestVenueServiceGetMethods:
    """Tests for VenueService query methods."""

    def test_get_active_venues(self, venue_factory, venue_operating_rules_factory):
        """Test get_active_venues returns only active and bookable venues."""
        # Create various venues
        active_bookable = venue_factory(is_active=True, is_bookable=True)
        venue_operating_rules_factory(venue=active_bookable)

        inactive = venue_factory(is_active=False, is_bookable=True)
        not_bookable = venue_factory(is_active=True, is_bookable=False)

        result = VenueService.get_active_venues()

        assert active_bookable in result
        assert inactive not in result
        assert not_bookable not in result

    def test_get_active_venues_ordering(self, venue_factory):
        """Test get_active_venues returns venues ordered by sort_order, then name."""
        venue_c = venue_factory(name='Charlie', sort_order=2, is_active=True, is_bookable=True)
        venue_a = venue_factory(name='Alpha', sort_order=1, is_active=True, is_bookable=True)
        venue_b = venue_factory(name='Bravo', sort_order=1, is_active=True, is_bookable=True)

        result = list(VenueService.get_active_venues())

        assert result[0] == venue_a
        assert result[1] == venue_b
        assert result[2] == venue_c

    def test_get_venue_by_id_found(self, venue_factory, venue_operating_rules_factory):
        """Test get_venue_by_id returns venue when found."""
        venue = venue_factory()
        venue_operating_rules_factory(venue=venue)

        result = VenueService.get_venue_by_id(venue.id)

        assert result == venue
        assert hasattr(result, 'venue_operating_rules')

    def test_get_venue_by_id_not_found(self):
        """Test get_venue_by_id returns None when not found."""
        result = VenueService.get_venue_by_id(99999)

        assert result is None

    def test_get_venue_by_code_found(self, venue_factory, venue_operating_rules_factory):
        """Test get_venue_by_code returns venue when found."""
        venue = venue_factory(code='CABANA')
        venue_operating_rules_factory(venue=venue)

        result = VenueService.get_venue_by_code('cabana')  # Test case-insensitivity

        assert result == venue

    def test_get_venue_by_code_not_found(self):
        """Test get_venue_by_code returns None when not found."""
        result = VenueService.get_venue_by_code('NONEXISTENT')

        assert result is None

    def test_get_package_venues(self, package_with_venues):
        """Test get_package_venues returns venues for a package."""
        package = package_with_venues['package']

        result = list(VenueService.get_package_venues(package.id))

        assert len(result) == 2
        assert result[0].venue == package_with_venues['primary_venue']
        assert result[1].venue == package_with_venues['secondary_venue']

    def test_get_package_venues_empty(self, product_option_factory):
        """Test get_package_venues returns empty queryset for package with no venues."""
        package = product_option_factory(type='PACKAGE')

        result = list(VenueService.get_package_venues(package.id))

        assert result == []

    def test_get_primary_venue_for_package(self, package_with_venues):
        """Test get_primary_venue_for_package returns primary venue."""
        package = package_with_venues['package']

        result = VenueService.get_primary_venue_for_package(package.id)

        assert result == package_with_venues['primary_venue']

    def test_get_primary_venue_for_package_no_primary(
        self, product_option_factory, venue_factory
    ):
        """Test get_primary_venue_for_package falls back to first venue."""
        package = product_option_factory(type='PACKAGE')
        venue = venue_factory()
        PackageVenue.objects.create(
            package=package,
            venue=venue,
            is_primary=False,
            access_order=1
        )

        result = VenueService.get_primary_venue_for_package(package.id)

        assert result == venue

    def test_get_primary_venue_for_package_no_venues(self, product_option_factory):
        """Test get_primary_venue_for_package returns None when no venues."""
        package = product_option_factory(type='PACKAGE')

        result = VenueService.get_primary_venue_for_package(package.id)

        assert result is None


@pytest.mark.django_db
class TestVenueServiceCalculateEventTimes:
    """Tests for VenueService.calculate_event_times."""

    def test_calculate_basic_event_times(self, venue_factory, venue_operating_rules_factory):
        """Test basic event time calculation."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            ingress_hours=Decimal('1.0'),
            egress_hours=Decimal('0.5')
        )

        result = VenueService.calculate_event_times(
            venue=venue,
            program_date=date(2025, 6, 15),
            program_start_time=time(14, 0),
            program_hours=Decimal('4.0')
        )

        assert isinstance(result, CalculatedEventTimes)
        assert result.program_date == date(2025, 6, 15)
        assert result.program_hours == Decimal('4.0')
        assert result.ingress_hours == Decimal('1.0')
        assert result.egress_hours == Decimal('0.5')
        assert result.total_hours == Decimal('5.5')

    def test_calculate_event_times_with_custom_ingress_egress(
        self, venue_factory, venue_operating_rules_factory
    ):
        """Test event times with custom ingress/egress."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            ingress_hours=Decimal('1.0'),
            egress_hours=Decimal('0.5'),
            allow_custom_ingress=True,
            allow_custom_egress=True
        )

        result = VenueService.calculate_event_times(
            venue=venue,
            program_date=date(2025, 6, 15),
            program_start_time=time(14, 0),
            program_hours=Decimal('4.0'),
            custom_ingress_hours=Decimal('2.0'),
            custom_egress_hours=Decimal('1.0')
        )

        assert result.ingress_hours == Decimal('2.0')
        assert result.egress_hours == Decimal('1.0')
        assert result.total_hours == Decimal('7.0')

    def test_calculate_event_times_overnight_venue(
        self, venue_factory, venue_operating_rules_factory
    ):
        """Test event times for overnight venue with next day checkout."""
        venue = venue_factory(is_overnight=True)
        venue_operating_rules_factory(
            venue=venue,
            checkout_next_day=True,
            default_check_in_time=time(14, 0),
            default_checkout_time=time(12, 0)
        )

        result = VenueService.calculate_event_times(
            venue=venue,
            program_date=date(2025, 6, 15),
            program_start_time=time(14, 0),
            program_hours=Decimal('6.0')
        )

        # Checkout should be on June 16th at 12:00
        assert result.scheduled_checkout.date() == date(2025, 6, 16)
        assert result.scheduled_checkout.time() == time(12, 0)

    def test_calculate_event_times_with_early_checkin(
        self, venue_factory, venue_operating_rules_factory
    ):
        """Test event times with early check-in."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            default_check_in_time=time(14, 0),
            early_checkin_allowed=True,
            early_checkin_fee_per_hour=Decimal('300.00')
        )

        result = VenueService.calculate_event_times(
            venue=venue,
            program_date=date(2025, 6, 15),
            program_start_time=time(14, 0),
            program_hours=Decimal('4.0'),
            early_checkin_hours=Decimal('2.0')
        )

        assert result.early_checkin_time is not None
        assert result.early_checkin_hours == Decimal('2.0')
        assert result.early_checkin_fee == Decimal('600.00')

    def test_calculate_event_times_with_late_checkout(
        self, venue_factory, venue_operating_rules_factory
    ):
        """Test event times with late checkout."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            default_checkout_time=time(12, 0),
            late_checkout_allowed=True,
            late_checkout_fee_per_hour=Decimal('250.00'),
            late_checkout_max_hours=4
        )

        result = VenueService.calculate_event_times(
            venue=venue,
            program_date=date(2025, 6, 15),
            program_start_time=time(8, 0),
            program_hours=Decimal('3.0'),
            late_checkout_hours=Decimal('2.0')
        )

        assert result.late_checkout_time is not None
        assert result.late_checkout_hours == Decimal('2.0')
        assert result.late_checkout_fee == Decimal('500.00')

    def test_calculate_event_times_no_rules(self, venue_factory):
        """Test event times when venue has no operating rules."""
        venue = venue_factory()  # No rules

        result = VenueService.calculate_event_times(
            venue=venue,
            program_date=date(2025, 6, 15),
            program_start_time=time(14, 0),
            program_hours=Decimal('4.0')
        )

        # Should still work with defaults
        assert result.program_hours == Decimal('4.0')
        assert result.ingress_hours == Decimal('0')
        assert result.egress_hours == Decimal('0')


@pytest.mark.django_db
class TestVenueServiceValidateBookingRequest:
    """Tests for VenueService.validate_booking_request."""

    def test_validate_valid_booking(self, venue_factory, venue_operating_rules_factory):
        """Test validation passes for valid booking."""
        venue = venue_factory(minimum_capacity=10, maximum_capacity=100)
        venue_operating_rules_factory(
            venue=venue,
            minimum_program_hours=Decimal('2.0'),
            maximum_program_hours=Decimal('8.0')
        )
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueService.validate_booking_request(
            venue=venue,
            program_date=future_date,
            program_start_time=time(14, 0),
            program_hours=Decimal('4.0'),
            guest_count=50
        )

        assert result.is_valid is True
        assert result.errors == []

    def test_validate_no_operating_rules(self, venue_factory):
        """Test validation with no operating rules returns warning."""
        venue = venue_factory()
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueService.validate_booking_request(
            venue=venue,
            program_date=future_date,
            program_start_time=time(14, 0),
            program_hours=Decimal('4.0')
        )

        assert result.is_valid is True
        assert 'No operating rules configured' in result.warnings[0]

    def test_validate_program_too_short(self, venue_factory, venue_operating_rules_factory):
        """Test validation fails when program is too short."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            minimum_program_hours=Decimal('3.0')
        )
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueService.validate_booking_request(
            venue=venue,
            program_date=future_date,
            program_start_time=time(14, 0),
            program_hours=Decimal('2.0')
        )

        assert result.is_valid is False
        assert any('at least 3.0 hours' in err for err in result.errors)

    def test_validate_program_too_long(self, venue_factory, venue_operating_rules_factory):
        """Test validation fails when program is too long."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            maximum_program_hours=Decimal('6.0')
        )
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueService.validate_booking_request(
            venue=venue,
            program_date=future_date,
            program_start_time=time(14, 0),
            program_hours=Decimal('8.0')
        )

        assert result.is_valid is False
        assert any('cannot exceed 6.0 hours' in err for err in result.errors)

    def test_validate_guest_count_too_low(self, venue_factory, venue_operating_rules_factory):
        """Test validation fails when guest count below minimum."""
        venue = venue_factory(minimum_capacity=20, maximum_capacity=100)
        venue_operating_rules_factory(venue=venue)
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueService.validate_booking_request(
            venue=venue,
            program_date=future_date,
            program_start_time=time(14, 0),
            program_hours=Decimal('4.0'),
            guest_count=10
        )

        assert result.is_valid is False
        assert any('below minimum capacity' in err for err in result.errors)

    def test_validate_guest_count_too_high(self, venue_factory, venue_operating_rules_factory):
        """Test validation fails when guest count exceeds maximum."""
        venue = venue_factory(minimum_capacity=10, maximum_capacity=50)
        venue_operating_rules_factory(venue=venue)
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueService.validate_booking_request(
            venue=venue,
            program_date=future_date,
            program_start_time=time(14, 0),
            program_hours=Decimal('4.0'),
            guest_count=100
        )

        assert result.is_valid is False
        assert any('exceeds maximum capacity' in err for err in result.errors)

    def test_validate_start_time_too_early(self, venue_factory, venue_operating_rules_factory):
        """Test validation fails when start time is before earliest allowed."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            earliest_start_time=time(10, 0)
        )
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueService.validate_booking_request(
            venue=venue,
            program_date=future_date,
            program_start_time=time(8, 0),
            program_hours=Decimal('4.0')
        )

        assert result.is_valid is False
        assert any('cannot start before' in err for err in result.errors)

    def test_validate_past_date(self, venue_factory, venue_operating_rules_factory):
        """Test validation fails for past dates."""
        venue = venue_factory()
        venue_operating_rules_factory(venue=venue)
        past_date = timezone.now().date() - timedelta(days=1)

        result = VenueService.validate_booking_request(
            venue=venue,
            program_date=past_date,
            program_start_time=time(14, 0),
            program_hours=Decimal('4.0')
        )

        assert result.is_valid is False
        assert any('past date' in err for err in result.errors)

    def test_validate_end_time_warning(self, venue_factory, venue_operating_rules_factory):
        """Test validation adds warning when program ends after music curfew."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            latest_end_time=time(21, 0)  # 9 PM music curfew
        )
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueService.validate_booking_request(
            venue=venue,
            program_date=future_date,
            program_start_time=time(19, 0),  # 7 PM start
            program_hours=Decimal('4.0')  # Ends at 11 PM
        )

        # Should pass but with warning
        assert result.is_valid is True
        assert any('after the recommended end time' in warn for warn in result.warnings)


@pytest.mark.django_db
class TestVenueServiceGetAvailableTimeSlots:
    """Tests for VenueService.get_available_time_slots."""

    def test_get_available_time_slots_with_rules(
        self, venue_factory, venue_operating_rules_factory
    ):
        """Test getting available time slots."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            earliest_start_time=time(10, 0),
            minimum_program_hours=Decimal('2.0')
        )
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueService.get_available_time_slots(
            venue=venue,
            program_date=future_date,
            program_hours=Decimal('3.0')
        )

        assert len(result) > 0
        assert all('time' in slot for slot in result)
        assert all('is_available' in slot for slot in result)

    def test_get_available_time_slots_no_rules(self, venue_factory):
        """Test getting time slots when no rules (returns generic slots)."""
        venue = venue_factory()
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueService.get_available_time_slots(
            venue=venue,
            program_date=future_date
        )

        # Should return slots from 8 AM to 10 PM
        assert len(result) == 14  # 8-21 inclusive


@pytest.mark.django_db
class TestVenueServiceCalculateTotalFees:
    """Tests for VenueService.calculate_total_fees."""

    def test_calculate_fees_early_and_late(self, venue_factory, venue_operating_rules_factory):
        """Test calculating both early check-in and late checkout fees."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            early_checkin_allowed=True,
            early_checkin_fee_per_hour=Decimal('300.00'),
            late_checkout_allowed=True,
            late_checkout_fee_per_hour=Decimal('250.00'),
            late_checkout_max_hours=4
        )

        result = VenueService.calculate_total_fees(
            venue=venue,
            program_hours=Decimal('4.0'),
            early_checkin_hours=Decimal('2.0'),
            late_checkout_hours=Decimal('2.0')
        )

        assert result['early_checkin_fee'] == Decimal('600.00')
        assert result['late_checkout_fee'] == Decimal('500.00')
        assert result['total_fees'] == Decimal('1100.00')

    def test_calculate_fees_no_rules(self, venue_factory):
        """Test fee calculation when no rules."""
        venue = venue_factory()

        result = VenueService.calculate_total_fees(
            venue=venue,
            program_hours=Decimal('4.0'),
            early_checkin_hours=Decimal('2.0'),
            late_checkout_hours=Decimal('2.0')
        )

        assert result['early_checkin_fee'] == Decimal('0.00')
        assert result['late_checkout_fee'] == Decimal('0.00')
        assert result['total_fees'] == Decimal('0.00')

    def test_calculate_fees_not_allowed(self, venue_factory, venue_operating_rules_factory):
        """Test fees when early/late not allowed."""
        venue = venue_factory()
        venue_operating_rules_factory(
            venue=venue,
            early_checkin_allowed=False,
            late_checkout_allowed=False
        )

        result = VenueService.calculate_total_fees(
            venue=venue,
            program_hours=Decimal('4.0'),
            early_checkin_hours=Decimal('2.0'),
            late_checkout_hours=Decimal('2.0')
        )

        assert result['total_fees'] == Decimal('0.00')


# =============================================================================
# VENUE AVAILABILITY SERVICE TESTS
# =============================================================================

@pytest.mark.django_db
class TestVenueAvailabilityServiceCheckBlockedDate:
    """Tests for VenueAvailabilityService.check_venue_blocked_date."""

    def test_check_available_date(self, venue_factory):
        """Test checking an available date."""
        venue = venue_factory()
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueAvailabilityService.check_venue_blocked_date(
            venue=venue,
            check_date=future_date
        )

        assert isinstance(result, VenueAvailabilityResult)
        assert result.is_available is True
        assert result.venue_id == venue.id

    def test_check_full_day_blocked(self, venue_factory, venue_blocked_date_factory):
        """Test checking a full day blocked date."""
        venue = venue_factory()
        block_date = timezone.now().date() + timedelta(days=7)
        venue_blocked_date_factory(
            venue=venue,
            date=block_date,
            reason='Maintenance',
            is_full_day=True
        )

        result = VenueAvailabilityService.check_venue_blocked_date(
            venue=venue,
            check_date=block_date
        )

        assert result.is_available is False
        assert 'Maintenance' in result.reason

    def test_check_partial_day_blocked_overlapping(self, venue_factory, venue_blocked_date_factory):
        """Test partial day block with overlapping times."""
        venue = venue_factory()
        block_date = timezone.now().date() + timedelta(days=7)
        venue_blocked_date_factory(
            venue=venue,
            date=block_date,
            reason='Morning Event',
            is_full_day=False,
            blocked_start_time=time(8, 0),
            blocked_end_time=time(12, 0)
        )

        # Check overlapping time
        result = VenueAvailabilityService.check_venue_blocked_date(
            venue=venue,
            check_date=block_date,
            start_time=time(10, 0),
            end_time=time(14, 0)
        )

        assert result.is_available is False
        assert result.blocked_times is not None
        assert len(result.blocked_times) == 1

    def test_check_partial_day_blocked_no_overlap(self, venue_factory, venue_blocked_date_factory):
        """Test partial day block with no overlapping times."""
        venue = venue_factory()
        block_date = timezone.now().date() + timedelta(days=7)
        venue_blocked_date_factory(
            venue=venue,
            date=block_date,
            reason='Morning Event',
            is_full_day=False,
            blocked_start_time=time(8, 0),
            blocked_end_time=time(12, 0)
        )

        # Check non-overlapping time
        result = VenueAvailabilityService.check_venue_blocked_date(
            venue=venue,
            check_date=block_date,
            start_time=time(14, 0),
            end_time=time(18, 0)
        )

        assert result.is_available is True


@pytest.mark.django_db
class TestVenueAvailabilityServiceMultipleVenues:
    """Tests for VenueAvailabilityService.check_multiple_venues_availability."""

    def test_check_multiple_venues_all_available(self, venue_factory):
        """Test checking multiple venues all available."""
        venue1 = venue_factory()
        venue2 = venue_factory()
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueAvailabilityService.check_multiple_venues_availability(
            venue_ids=[venue1.id, venue2.id],
            check_date=future_date
        )

        assert venue1.id in result
        assert venue2.id in result
        assert result[venue1.id].is_available is True
        assert result[venue2.id].is_available is True

    def test_check_multiple_venues_one_blocked(
        self, venue_factory, venue_blocked_date_factory
    ):
        """Test checking multiple venues with one blocked."""
        venue1 = venue_factory()
        venue2 = venue_factory()
        block_date = timezone.now().date() + timedelta(days=7)

        venue_blocked_date_factory(
            venue=venue1,
            date=block_date,
            reason='Maintenance',
            is_full_day=True
        )

        result = VenueAvailabilityService.check_multiple_venues_availability(
            venue_ids=[venue1.id, venue2.id],
            check_date=block_date
        )

        assert result[venue1.id].is_available is False
        assert result[venue2.id].is_available is True


@pytest.mark.django_db
class TestVenueAvailabilityServicePackageVenues:
    """Tests for VenueAvailabilityService.check_package_venues_availability."""

    def test_check_package_venues_all_available(self, package_with_venues):
        """Test checking package venues all available."""
        package = package_with_venues['package']
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueAvailabilityService.check_package_venues_availability(
            package_id=package.id,
            check_date=future_date
        )

        assert result['is_available'] is True
        assert len(result['venues']) == 2

    def test_check_package_venues_one_blocked(
        self, package_with_venues, venue_blocked_date_factory
    ):
        """Test package unavailable when one venue is blocked."""
        package = package_with_venues['package']
        primary_venue = package_with_venues['primary_venue']
        block_date = timezone.now().date() + timedelta(days=7)

        venue_blocked_date_factory(
            venue=primary_venue,
            date=block_date,
            reason='Blocked',
            is_full_day=True
        )

        result = VenueAvailabilityService.check_package_venues_availability(
            package_id=package.id,
            check_date=block_date
        )

        assert result['is_available'] is False
        assert 'One or more venues unavailable' in result['reason']

    def test_check_package_venues_no_venues(self, product_option_factory):
        """Test package with no venues assigned."""
        package = product_option_factory(type='PACKAGE')
        future_date = timezone.now().date() + timedelta(days=7)

        result = VenueAvailabilityService.check_package_venues_availability(
            package_id=package.id,
            check_date=future_date
        )

        assert result['is_available'] is True
        assert 'No venues assigned' in result['reason']


@pytest.mark.django_db
class TestVenueAvailabilityServiceBlockedDates:
    """Tests for VenueAvailabilityService blocked date queries."""

    def test_get_blocked_dates_for_venue(self, venue_factory, venue_blocked_date_factory):
        """Test getting blocked dates for a venue in date range."""
        venue = venue_factory()
        today = timezone.now().date()
        block1 = venue_blocked_date_factory(
            venue=venue,
            date=today + timedelta(days=5),
            reason='Block 1',
            is_full_day=True
        )
        block2 = venue_blocked_date_factory(
            venue=venue,
            date=today + timedelta(days=10),
            reason='Block 2',
            is_full_day=False,
            blocked_start_time=time(10, 0),
            blocked_end_time=time(14, 0)
        )

        result = VenueAvailabilityService.get_blocked_dates_for_venue(
            venue=venue,
            start_date=today,
            end_date=today + timedelta(days=30)
        )

        assert len(result) == 2
        assert result[0]['reason'] == 'Block 1'
        assert result[0]['is_full_day'] is True
        assert result[1]['start_time'] == '10:00'

    def test_get_blocked_dates_out_of_range(self, venue_factory, venue_blocked_date_factory):
        """Test blocked dates outside range not returned."""
        venue = venue_factory()
        today = timezone.now().date()
        venue_blocked_date_factory(
            venue=venue,
            date=today + timedelta(days=60),
            reason='Far Future',
            is_full_day=True
        )

        result = VenueAvailabilityService.get_blocked_dates_for_venue(
            venue=venue,
            start_date=today,
            end_date=today + timedelta(days=30)
        )

        assert len(result) == 0

    def test_get_available_dates_for_venue(self, venue_factory, venue_blocked_date_factory):
        """Test getting available dates for a venue."""
        venue = venue_factory()
        today = timezone.now().date()

        # Block a specific date
        venue_blocked_date_factory(
            venue=venue,
            date=today + timedelta(days=3),
            reason='Blocked',
            is_full_day=True
        )

        result = VenueAvailabilityService.get_available_dates_for_venue(
            venue=venue,
            start_date=today,
            end_date=today + timedelta(days=5)
        )

        # Should have 5 dates minus 1 blocked = 5 (includes today)
        blocked_date = today + timedelta(days=3)
        assert blocked_date not in result
        assert len(result) == 5  # 0, 1, 2, 4, 5 days from today

    def test_get_available_dates_with_day_filter(self, venue_factory):
        """Test getting available dates filtered by day of week."""
        venue = venue_factory()
        today = timezone.now().date()

        # Get only weekends (Saturday=5, Sunday=6)
        result = VenueAvailabilityService.get_available_dates_for_venue(
            venue=venue,
            start_date=today,
            end_date=today + timedelta(days=14),
            days_of_week=[5, 6]
        )

        for d in result:
            assert d.weekday() in [5, 6]


@pytest.mark.django_db
class TestVenueAvailabilityServiceBlockUnblock:
    """Tests for VenueAvailabilityService block/unblock methods."""

    def test_block_date_full_day(self, venue_factory, user_factory):
        """Test blocking a full day."""
        venue = venue_factory()
        user = user_factory(admin=True)
        block_date = timezone.now().date() + timedelta(days=7)

        result = VenueAvailabilityService.block_date(
            venue=venue,
            block_date=block_date,
            reason='Maintenance',
            created_by=user
        )

        assert result.venue == venue
        assert result.date == block_date
        assert result.is_full_day is True
        assert result.created_by == user

    def test_block_date_partial(self, venue_factory, user_factory):
        """Test blocking partial day."""
        venue = venue_factory()
        user = user_factory(admin=True)
        block_date = timezone.now().date() + timedelta(days=7)

        result = VenueAvailabilityService.block_date(
            venue=venue,
            block_date=block_date,
            reason='Morning Event',
            created_by=user,
            is_full_day=False,
            start_time=time(8, 0),
            end_time=time(12, 0)
        )

        assert result.is_full_day is False
        assert result.blocked_start_time == time(8, 0)
        assert result.blocked_end_time == time(12, 0)

    def test_unblock_date(self, venue_factory, venue_blocked_date_factory):
        """Test unblocking a date."""
        venue = venue_factory()
        block_date = timezone.now().date() + timedelta(days=7)

        venue_blocked_date_factory(
            venue=venue,
            date=block_date,
            reason='Block 1'
        )
        venue_blocked_date_factory(
            venue=venue,
            date=block_date,
            reason='Block 2',
            is_full_day=False,
            blocked_start_time=time(14, 0),
            blocked_end_time=time(18, 0)
        )

        deleted_count = VenueAvailabilityService.unblock_date(
            venue=venue,
            block_date=block_date
        )

        assert deleted_count == 2
        assert not VenueBlockedDate.objects.filter(venue=venue, date=block_date).exists()

    def test_unblock_date_no_blocks(self, venue_factory):
        """Test unblocking when no blocks exist."""
        venue = venue_factory()
        block_date = timezone.now().date() + timedelta(days=7)

        deleted_count = VenueAvailabilityService.unblock_date(
            venue=venue,
            block_date=block_date
        )

        assert deleted_count == 0
