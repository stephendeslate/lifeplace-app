"""
Unit tests for venues domain models.

Tests:
- Venue model (creation, validation, properties)
- VenueOperatingRules model (time calculations, fee calculations, validation)
- PackageVenue model (primary venue logic, unique constraints)
- VenueEventTypeConfiguration model (effective pricing)
- VenueBlockedDate model (full day and partial day blocks)
"""

from datetime import date, time, timedelta
from decimal import Decimal

from django.db import IntegrityError

import pytest

from core.domains.venues.models import (
    PackageVenue,
    Venue,
    VenueBlockedDate,
    VenueEventTypeConfiguration,
)


@pytest.mark.django_db
class TestVenueModel:
    """Unit tests for the Venue model."""

    def test_create_venue_with_required_fields(self, venue_factory):
        """Test creating a venue with required fields."""
        venue = venue_factory(name="Test Cabana", code="TEST_CABANA", maximum_capacity=50)

        assert venue.name == "Test Cabana"
        assert venue.code == "TEST_CABANA"
        assert venue.maximum_capacity == 50
        assert venue.minimum_capacity == 1  # Default
        assert venue.is_active is True
        assert venue.is_bookable is True

    def test_venue_string_representation(self, venue_factory):
        """Test Venue __str__ returns name."""
        venue = venue_factory(name="Beautiful Garden")

        assert str(venue) == "Beautiful Garden"

    def test_venue_code_must_be_unique(self, venue_factory):
        """Test that venue codes must be unique."""
        venue_factory(code="UNIQUE_CODE")

        # Use Venue.objects.create directly to bypass factory's
        # django_get_or_create which would return the existing instance
        with pytest.raises(IntegrityError):
            Venue.objects.create(
                name="Duplicate Code Venue",
                code="UNIQUE_CODE",
                maximum_capacity=50,
            )

    def test_venue_overnight_flag(self, venue_factory):
        """Test overnight venue flag."""
        day_venue = venue_factory(is_overnight=False)
        overnight_venue = venue_factory(is_overnight=True)

        assert day_venue.is_overnight is False
        assert overnight_venue.is_overnight is True

    def test_venue_capacity_fields(self, venue_factory):
        """Test venue capacity fields."""
        venue = venue_factory(minimum_capacity=10, maximum_capacity=100, recommended_capacity=50)

        assert venue.minimum_capacity == 10
        assert venue.maximum_capacity == 100
        assert venue.recommended_capacity == 50

    def test_venue_standalone_pricing_fields(self, venue_factory):
        """Test standalone rental pricing fields."""
        venue = venue_factory(
            is_rentable_standalone=True,
            standalone_base_price=Decimal("5000.00"),
            standalone_included_hours=Decimal("3.0"),
            standalone_excess_hour_price=Decimal("500.00"),
        )

        assert venue.is_rentable_standalone is True
        assert venue.standalone_base_price == Decimal("5000.00")
        assert venue.standalone_included_hours == Decimal("3.0")
        assert venue.standalone_excess_hour_price == Decimal("500.00")

    def test_venue_gallery_images_default(self, venue_factory):
        """Test gallery_images defaults to empty list."""
        venue = venue_factory()

        assert venue.gallery_images == []

    def test_venue_amenities_json_field(self, venue_factory):
        """Test amenities JSON field."""
        amenities = ["Pool", "WiFi", "Parking", "Sound System"]
        venue = venue_factory(amenities=amenities)

        assert venue.amenities == amenities
        assert "Pool" in venue.amenities

    def test_venue_operating_rules_property(self, venue_factory, venue_operating_rules_factory):
        """Test operating_rules property returns rules when they exist."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(venue=venue)

        assert venue.operating_rules == rules

    def test_venue_operating_rules_property_none(self, venue_factory):
        """Test operating_rules property returns None when no rules."""
        venue = venue_factory()

        assert venue.operating_rules is None

    def test_venue_ordering(self, venue_factory):
        """Test venues are ordered by sort_order then name."""
        venue_c = venue_factory(name="Charlie", sort_order=2)
        venue_a = venue_factory(name="Alpha", sort_order=1)
        venue_b = venue_factory(name="Bravo", sort_order=1)

        venues = list(Venue.objects.all())

        # First by sort_order, then by name
        assert venues[0] == venue_a
        assert venues[1] == venue_b
        assert venues[2] == venue_c


@pytest.mark.django_db
class TestVenueOperatingRulesModel:
    """Unit tests for VenueOperatingRules model."""

    def test_create_operating_rules(self, venue_factory, venue_operating_rules_factory):
        """Test creating operating rules for a venue."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(
            venue=venue, default_check_in_time=time(14, 0), default_checkout_time=time(12, 0), checkout_next_day=True
        )

        assert rules.venue == venue
        assert rules.default_check_in_time == time(14, 0)
        assert rules.default_checkout_time == time(12, 0)
        assert rules.checkout_next_day is True

    def test_operating_rules_string_representation(self, venue_factory, venue_operating_rules_factory):
        """Test __str__ returns descriptive string."""
        venue = venue_factory(name="Cabana")
        rules = venue_operating_rules_factory(venue=venue)

        assert str(rules) == "Operating Rules for Cabana"

    def test_calculate_total_venue_hours(self, venue_factory, venue_operating_rules_factory):
        """Test total venue hours calculation."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(venue=venue, ingress_hours=Decimal("2.0"), egress_hours=Decimal("1.0"))

        result = rules.calculate_total_venue_hours(Decimal("4.0"))

        assert result["program_hours"] == Decimal("4.0")
        assert result["ingress_hours"] == Decimal("2.0")
        assert result["egress_hours"] == Decimal("1.0")
        assert result["total_hours"] == Decimal("7.0")

    def test_validate_program_duration_valid(self, venue_factory, venue_operating_rules_factory):
        """Test program duration validation with valid duration."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(
            venue=venue, minimum_program_hours=Decimal("2.0"), maximum_program_hours=Decimal("8.0")
        )

        result = rules.validate_program_duration(Decimal("4.0"))

        assert result["is_valid"] is True
        assert result["errors"] == []

    def test_validate_program_duration_too_short(self, venue_factory, venue_operating_rules_factory):
        """Test program duration validation fails when too short."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(venue=venue, minimum_program_hours=Decimal("3.0"))

        result = rules.validate_program_duration(Decimal("2.0"))

        assert result["is_valid"] is False
        assert "at least 3.0 hours" in result["errors"][0]

    def test_validate_program_duration_too_long(self, venue_factory, venue_operating_rules_factory):
        """Test program duration validation fails when too long."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(venue=venue, maximum_program_hours=Decimal("6.0"))

        result = rules.validate_program_duration(Decimal("8.0"))

        assert result["is_valid"] is False
        assert "cannot exceed 6.0 hours" in result["errors"][0]

    def test_validate_fixed_duration(self, venue_factory, venue_operating_rules_factory):
        """Test fixed duration validation."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(venue=venue, is_fixed_duration=True, default_program_hours=Decimal("4.0"))

        # Wrong duration should fail
        result = rules.validate_program_duration(Decimal("3.0"))
        assert result["is_valid"] is False
        assert "exactly 4.0 hours" in result["errors"][0]

        # Correct duration should pass
        result = rules.validate_program_duration(Decimal("4.0"))
        assert result["is_valid"] is True

    def test_calculate_early_checkin_fee(self, venue_factory, venue_operating_rules_factory):
        """Test early check-in fee calculation."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(
            venue=venue, early_checkin_allowed=True, early_checkin_fee_per_hour=Decimal("300.00")
        )

        fee = rules.calculate_early_checkin_fee(Decimal("2.0"))

        assert fee == Decimal("600.00")

    def test_calculate_early_checkin_fee_not_allowed(self, venue_factory, venue_operating_rules_factory):
        """Test early check-in fee when not allowed returns zero."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(venue=venue, early_checkin_allowed=False)

        fee = rules.calculate_early_checkin_fee(Decimal("2.0"))

        assert fee == Decimal("0.00")

    def test_calculate_late_checkout_fee(self, venue_factory, venue_operating_rules_factory):
        """Test late checkout fee calculation."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(
            venue=venue,
            late_checkout_allowed=True,
            late_checkout_fee_per_hour=Decimal("250.00"),
            late_checkout_max_hours=4,
        )

        fee = rules.calculate_late_checkout_fee(Decimal("2.0"))

        assert fee == Decimal("500.00")

    def test_calculate_late_checkout_fee_capped(self, venue_factory, venue_operating_rules_factory):
        """Test late checkout fee is capped at max hours."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(
            venue=venue,
            late_checkout_allowed=True,
            late_checkout_fee_per_hour=Decimal("100.00"),
            late_checkout_max_hours=2,
        )

        # Request 5 hours but max is 2
        fee = rules.calculate_late_checkout_fee(Decimal("5.0"))

        assert fee == Decimal("200.00")  # 2 hours * 100


@pytest.mark.django_db
class TestPackageVenueModel:
    """Unit tests for PackageVenue model."""

    def test_create_package_venue(self, venue_factory, product_option_factory):
        """Test creating a package-venue assignment."""
        venue = venue_factory()
        package = product_option_factory(type="PACKAGE")

        pv = PackageVenue.objects.create(package=package, venue=venue, is_primary=True, access_order=1)

        assert pv.package == package
        assert pv.venue == venue
        assert pv.is_primary is True
        assert pv.access_order == 1

    def test_package_venue_string_representation(self, venue_factory, product_option_factory):
        """Test __str__ returns descriptive string with primary label."""
        venue = venue_factory(name="Garden")
        package = product_option_factory(name="Wedding Package", type="PACKAGE")

        pv = PackageVenue.objects.create(package=package, venue=venue, is_primary=True)

        assert str(pv) == "Wedding Package - Garden (Primary)"

    def test_package_venue_unique_together(self, venue_factory, product_option_factory):
        """Test that package-venue pairs must be unique."""
        venue = venue_factory()
        package = product_option_factory(type="PACKAGE")

        PackageVenue.objects.create(package=package, venue=venue)

        with pytest.raises(IntegrityError):
            PackageVenue.objects.create(package=package, venue=venue)

    def test_only_one_primary_venue_per_package(self, venue_factory, product_option_factory):
        """Test that setting primary unsets other primaries."""
        venue1 = venue_factory()
        venue2 = venue_factory()
        package = product_option_factory(type="PACKAGE")

        pv1 = PackageVenue.objects.create(package=package, venue=venue1, is_primary=True)

        # Create second primary - should unset first
        pv2 = PackageVenue.objects.create(package=package, venue=venue2, is_primary=True)

        pv1.refresh_from_db()
        assert pv1.is_primary is False
        assert pv2.is_primary is True

    def test_package_venue_ordering(self, venue_factory, product_option_factory):
        """Test package venues are ordered by access_order."""
        venue1 = venue_factory(name="Venue A")
        venue2 = venue_factory(name="Venue B")
        venue3 = venue_factory(name="Venue C")
        package = product_option_factory(type="PACKAGE")

        pv3 = PackageVenue.objects.create(package=package, venue=venue3, access_order=3)
        pv1 = PackageVenue.objects.create(package=package, venue=venue1, access_order=1)
        pv2 = PackageVenue.objects.create(package=package, venue=venue2, access_order=2)

        ordered = list(package.package_venues.all())
        assert ordered == [pv1, pv2, pv3]


@pytest.mark.django_db
class TestVenueEventTypeConfigurationModel:
    """Unit tests for VenueEventTypeConfiguration model."""

    def test_create_event_type_configuration(self, venue_factory, event_type_factory):
        """Test creating venue event type configuration."""
        venue = venue_factory(
            standalone_base_price=Decimal("5000.00"),
            standalone_included_hours=Decimal("3.0"),
            standalone_excess_hour_price=Decimal("500.00"),
        )
        event_type = event_type_factory(name="Wedding")

        config = VenueEventTypeConfiguration.objects.create(
            venue=venue, event_type=event_type, base_price=Decimal("8000.00"), included_hours=Decimal("5.0")
        )

        assert config.venue == venue
        assert config.event_type == event_type
        assert config.base_price == Decimal("8000.00")
        assert config.included_hours == Decimal("5.0")

    def test_get_effective_base_price_with_override(self, venue_factory, event_type_factory):
        """Test effective base price uses override when set."""
        venue = venue_factory(standalone_base_price=Decimal("5000.00"))
        event_type = event_type_factory()

        config = VenueEventTypeConfiguration.objects.create(
            venue=venue, event_type=event_type, base_price=Decimal("8000.00")
        )

        assert config.get_effective_base_price() == Decimal("8000.00")

    def test_get_effective_base_price_fallback(self, venue_factory, event_type_factory):
        """Test effective base price falls back to venue default."""
        venue = venue_factory(standalone_base_price=Decimal("5000.00"))
        event_type = event_type_factory()

        config = VenueEventTypeConfiguration.objects.create(
            venue=venue,
            event_type=event_type,
            base_price=None,  # No override
        )

        assert config.get_effective_base_price() == Decimal("5000.00")

    def test_get_effective_included_hours_all_day(self, venue_factory, event_type_factory):
        """Test all-day access returns 24 hours."""
        venue = venue_factory(standalone_included_hours=Decimal("3.0"))
        event_type = event_type_factory()

        config = VenueEventTypeConfiguration.objects.create(venue=venue, event_type=event_type, is_all_day_access=True)

        assert config.get_effective_included_hours() == Decimal("24.0")

    def test_get_effective_excess_hour_price_all_day(self, venue_factory, event_type_factory):
        """Test all-day access returns zero excess charge."""
        venue = venue_factory(standalone_excess_hour_price=Decimal("500.00"))
        event_type = event_type_factory()

        config = VenueEventTypeConfiguration.objects.create(venue=venue, event_type=event_type, is_all_day_access=True)

        assert config.get_effective_excess_hour_price() == Decimal("0.00")

    def test_unique_venue_event_type(self, venue_factory, event_type_factory):
        """Test venue-event type pairs must be unique."""
        venue = venue_factory()
        event_type = event_type_factory()

        VenueEventTypeConfiguration.objects.create(venue=venue, event_type=event_type)

        with pytest.raises(IntegrityError):
            VenueEventTypeConfiguration.objects.create(venue=venue, event_type=event_type)


@pytest.mark.django_db
class TestVenueBlockedDateModel:
    """Unit tests for VenueBlockedDate model."""

    def test_create_full_day_block(self, venue_factory, user_factory):
        """Test creating a full day blocked date."""
        venue = venue_factory()
        user = user_factory(admin=True)
        block_date = date.today() + timedelta(days=7)

        block = VenueBlockedDate.objects.create(
            venue=venue, date=block_date, reason="Maintenance", is_full_day=True, created_by=user
        )

        assert block.venue == venue
        assert block.date == block_date
        assert block.reason == "Maintenance"
        assert block.is_full_day is True
        assert block.created_by == user

    def test_create_partial_day_block(self, venue_factory, user_factory):
        """Test creating a partial day blocked date."""
        venue = venue_factory()
        user = user_factory(admin=True)
        block_date = date.today() + timedelta(days=7)

        block = VenueBlockedDate.objects.create(
            venue=venue,
            date=block_date,
            reason="Private Event",
            is_full_day=False,
            blocked_start_time=time(10, 0),
            blocked_end_time=time(14, 0),
            created_by=user,
        )

        assert block.is_full_day is False
        assert block.blocked_start_time == time(10, 0)
        assert block.blocked_end_time == time(14, 0)

    def test_blocked_date_string_full_day(self, venue_factory):
        """Test __str__ for full day block."""
        venue = venue_factory(name="Garden")
        block_date = date(2024, 6, 15)

        block = VenueBlockedDate.objects.create(venue=venue, date=block_date, reason="Cleaning", is_full_day=True)

        assert str(block) == "Garden blocked on 2024-06-15: Cleaning"

    def test_blocked_date_string_partial_day(self, venue_factory):
        """Test __str__ for partial day block."""
        venue = venue_factory(name="Garden")
        block_date = date(2024, 6, 15)

        block = VenueBlockedDate.objects.create(
            venue=venue,
            date=block_date,
            reason="Morning Event",
            is_full_day=False,
            blocked_start_time=time(8, 0),
            blocked_end_time=time(12, 0),
        )

        assert str(block) == "Garden blocked on 2024-06-15 08:00:00-12:00:00: Morning Event"

    def test_blocked_date_ordering(self, venue_factory):
        """Test blocked dates are ordered by date then start time."""
        venue = venue_factory()

        block3 = VenueBlockedDate.objects.create(
            venue=venue, date=date(2024, 6, 17), reason="Block 3", is_full_day=True
        )
        block1 = VenueBlockedDate.objects.create(
            venue=venue,
            date=date(2024, 6, 15),
            reason="Block 1",
            is_full_day=False,
            blocked_start_time=time(8, 0),
            blocked_end_time=time(12, 0),
        )
        block2 = VenueBlockedDate.objects.create(
            venue=venue,
            date=date(2024, 6, 15),
            reason="Block 2",
            is_full_day=False,
            blocked_start_time=time(14, 0),
            blocked_end_time=time(18, 0),
        )

        blocks = list(VenueBlockedDate.objects.filter(venue=venue))
        assert blocks == [block1, block2, block3]
