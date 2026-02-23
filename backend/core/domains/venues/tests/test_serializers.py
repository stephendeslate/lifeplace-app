"""
Unit tests for venues domain serializers.

Tests:
- VenueSerializer (validation, code uppercase)
- VenueListSerializer (packages_count, has_operating_rules)
- VenueDetailSerializer (related data)
- VenueWithRulesSerializer (nested create/update)
- VenueOperatingRulesSerializer
- PackageVenueSerializer (package type validation)
- VenueBlockedDateSerializer (time validation)
- PublicVenueSerializer (client-facing data)
- RentableVenueSerializer (standalone venues)
- VenueEventTypeConfigurationSerializer
"""

from datetime import date, time, timedelta
from decimal import Decimal

from django.utils import timezone

import pytest

from core.domains.venues.models import (
    PackageVenue,
    VenueBlockedDate,
    VenueEventTypeConfiguration,
)
from core.domains.venues.serializers import (
    PackageVenueInlineSerializer,
    PackageVenueSerializer,
    PublicVenueOperatingRulesSerializer,
    PublicVenueSerializer,
    RentableVenueSerializer,
    RentableVenueWithEventTypeSerializer,
    VenueBlockedDateSerializer,
    VenueDetailSerializer,
    VenueEventTypeConfigurationSerializer,
    VenueListSerializer,
    VenueOperatingRulesSerializer,
    VenueSerializer,
    VenueWithRulesSerializer,
)


@pytest.mark.django_db
class TestVenueSerializer:
    """Unit tests for VenueSerializer."""

    def test_serialize_venue(self, venue_factory, venue_operating_rules_factory):
        """Test serializing a venue with operating rules."""
        venue = venue_factory(name="Cabana", code="cabana", maximum_capacity=50)
        venue_operating_rules_factory(venue=venue)

        serializer = VenueSerializer(venue)
        data = serializer.data

        assert data["name"] == "Cabana"
        assert data["code"] == "cabana"
        assert data["maximum_capacity"] == 50
        assert "operating_rules" in data

    def test_validate_code_uppercase(self, venue_factory):
        """Test code is converted to uppercase."""
        data = {
            "name": "Test Venue",
            "code": "test_venue",
            "maximum_capacity": 50,
        }

        serializer = VenueSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        assert serializer.validated_data["code"] == "TEST_VENUE"

    def test_validate_min_capacity_exceeds_max(self):
        """Test validation fails when min > max capacity."""
        data = {
            "name": "Test Venue",
            "code": "TEST",
            "minimum_capacity": 100,
            "maximum_capacity": 50,
        }

        serializer = VenueSerializer(data=data)
        assert not serializer.is_valid()
        assert "minimum_capacity" in serializer.errors

    def test_validate_recommended_capacity_in_range(self):
        """Test recommended capacity must be within min-max range."""
        data = {
            "name": "Test Venue",
            "code": "TEST",
            "minimum_capacity": 10,
            "maximum_capacity": 50,
            "recommended_capacity": 100,  # Out of range
        }

        serializer = VenueSerializer(data=data)
        assert not serializer.is_valid()
        assert "recommended_capacity" in serializer.errors

    def test_packages_count(self, venue_factory, product_option_factory):
        """Test packages_count returns correct count."""
        venue = venue_factory()
        package1 = product_option_factory(type="PACKAGE", is_active=True)
        package2 = product_option_factory(type="PACKAGE", is_active=True)
        package3 = product_option_factory(type="PACKAGE", is_active=False)  # Inactive

        PackageVenue.objects.create(package=package1, venue=venue)
        PackageVenue.objects.create(package=package2, venue=venue)
        PackageVenue.objects.create(package=package3, venue=venue)

        serializer = VenueSerializer(venue)

        assert serializer.data["packages_count"] == 2  # Only active packages


@pytest.mark.django_db
class TestVenueListSerializer:
    """Unit tests for VenueListSerializer."""

    def test_has_operating_rules_true(self, venue_factory, venue_operating_rules_factory):
        """Test has_operating_rules returns True when rules exist."""
        venue = venue_factory()
        venue_operating_rules_factory(venue=venue)

        serializer = VenueListSerializer(venue)

        assert serializer.data["has_operating_rules"] is True

    def test_has_operating_rules_false(self, venue_factory):
        """Test has_operating_rules returns False when no rules."""
        venue = venue_factory()

        serializer = VenueListSerializer(venue)

        assert serializer.data["has_operating_rules"] is False

    def test_includes_standalone_pricing_fields(self, venue_factory):
        """Test serializer includes standalone pricing fields."""
        venue = venue_factory(
            is_rentable_standalone=True,
            standalone_base_price=Decimal("5000.00"),
            standalone_included_hours=Decimal("3.0"),
            standalone_excess_hour_price=Decimal("500.00"),
        )

        serializer = VenueListSerializer(venue)
        data = serializer.data

        assert data["standalone_base_price"] == "5000.00"
        assert data["standalone_included_hours"] == "3.0"
        assert data["standalone_excess_hour_price"] == "500.00"


@pytest.mark.django_db
class TestVenueDetailSerializer:
    """Unit tests for VenueDetailSerializer."""

    def test_includes_packages(self, venue_factory, product_option_factory):
        """Test detail serializer includes package list."""
        venue = venue_factory()
        package = product_option_factory(name="Wedding Package", type="PACKAGE", is_active=True)

        PackageVenue.objects.create(
            package=package, venue=venue, is_primary=True, access_order=1, notes="Main ceremony venue"
        )

        serializer = VenueDetailSerializer(venue)
        data = serializer.data

        assert len(data["packages"]) == 1
        assert data["packages"][0]["name"] == "Wedding Package"
        assert data["packages"][0]["is_primary"] is True
        assert data["packages"][0]["notes"] == "Main ceremony venue"

    def test_includes_blocked_dates(self, venue_factory):
        """Test detail serializer includes upcoming blocked dates."""
        venue = venue_factory()
        future_date = timezone.now().date() + timedelta(days=7)

        VenueBlockedDate.objects.create(venue=venue, date=future_date, reason="Maintenance", is_full_day=True)

        serializer = VenueDetailSerializer(venue)
        data = serializer.data

        assert len(data["blocked_dates"]) == 1
        assert data["blocked_dates"][0]["reason"] == "Maintenance"


@pytest.mark.django_db
class TestVenueWithRulesSerializer:
    """Unit tests for VenueWithRulesSerializer."""

    def test_create_venue_with_rules(self):
        """Test creating venue with nested operating rules."""
        data = {
            "name": "New Cabana",
            "code": "new_cabana",
            "maximum_capacity": 30,
            "operating_rules": {
                "default_check_in_time": "14:00:00",
                "default_checkout_time": "12:00:00",
                "checkout_next_day": True,
                "minimum_program_hours": "2.0",
                "default_program_hours": "4.0",
                "ingress_hours": "1.0",
                "egress_hours": "0.5",
            },
        }

        serializer = VenueWithRulesSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        venue = serializer.save()

        assert venue.name == "New Cabana"
        assert venue.code == "NEW_CABANA"
        assert hasattr(venue, "venue_operating_rules")
        assert venue.venue_operating_rules.checkout_next_day is True

    def test_create_venue_without_rules(self):
        """Test creating venue without operating rules."""
        data = {
            "name": "Simple Venue",
            "code": "simple",
            "maximum_capacity": 100,
        }

        serializer = VenueWithRulesSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        venue = serializer.save()

        assert venue.name == "Simple Venue"
        assert not hasattr(venue, "venue_operating_rules")

    def test_update_venue_with_rules(self, venue_factory, venue_operating_rules_factory):
        """Test updating venue and operating rules together."""
        venue = venue_factory(name="Old Name")
        venue_operating_rules_factory(venue=venue, default_check_in_time=time(14, 0))

        data = {
            "name": "Updated Name",
            "code": venue.code,
            "maximum_capacity": venue.maximum_capacity,
            "operating_rules": {
                "default_check_in_time": "10:00:00",
                "default_checkout_time": "18:00:00",
            },
        }

        serializer = VenueWithRulesSerializer(venue, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors

        updated_venue = serializer.save()

        assert updated_venue.name == "Updated Name"
        assert updated_venue.venue_operating_rules.default_check_in_time == time(10, 0)


@pytest.mark.django_db
class TestVenueOperatingRulesSerializer:
    """Unit tests for VenueOperatingRulesSerializer."""

    def test_serialize_rules(self, venue_factory, venue_operating_rules_factory):
        """Test serializing operating rules."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(
            venue=venue,
            default_check_in_time=time(14, 0),
            default_checkout_time=time(12, 0),
            early_checkin_allowed=True,
            early_checkin_fee_per_hour=Decimal("300.00"),
        )

        serializer = VenueOperatingRulesSerializer(rules)
        data = serializer.data

        assert data["default_check_in_time"] == "14:00:00"
        assert data["default_checkout_time"] == "12:00:00"
        assert data["early_checkin_allowed"] is True
        assert data["early_checkin_fee_per_hour"] == "300.00"


@pytest.mark.django_db
class TestPackageVenueSerializer:
    """Unit tests for PackageVenueSerializer."""

    def test_validate_package_type(self, venue_factory, product_option_factory):
        """Test validation rejects non-PACKAGE products."""
        venue = venue_factory()
        product = product_option_factory(type="PRODUCT")  # Not a package

        data = {
            "package": product.id,
            "venue": venue.id,
            "is_primary": True,
        }

        serializer = PackageVenueSerializer(data=data)
        assert not serializer.is_valid()
        assert "package" in serializer.errors

    def test_serialize_package_venue(self, venue_factory, product_option_factory):
        """Test serializing package venue assignment."""
        venue = venue_factory(name="Garden", code="GARDEN", is_overnight=False)
        package = product_option_factory(name="Wedding Package", type="PACKAGE")

        pv = PackageVenue.objects.create(
            package=package,
            venue=venue,
            is_primary=True,
            access_order=1,
            access_duration_hours=Decimal("4.0"),
            notes="Main venue",
        )

        serializer = PackageVenueSerializer(pv)
        data = serializer.data

        assert data["venue_name"] == "Garden"
        assert data["venue_code"] == "GARDEN"
        assert data["venue_is_overnight"] is False
        assert data["package_name"] == "Wedding Package"
        assert data["is_primary"] is True
        assert data["access_duration_hours"] == "4.0"


@pytest.mark.django_db
class TestPackageVenueInlineSerializer:
    """Unit tests for PackageVenueInlineSerializer."""

    def test_operating_rules_only_for_primary(
        self, venue_factory, venue_operating_rules_factory, product_option_factory
    ):
        """Test operating rules only included for primary venue."""
        venue1 = venue_factory()
        venue2 = venue_factory()
        venue_operating_rules_factory(venue=venue1)
        venue_operating_rules_factory(venue=venue2)
        package = product_option_factory(type="PACKAGE")

        pv_primary = PackageVenue.objects.create(package=package, venue=venue1, is_primary=True)
        pv_secondary = PackageVenue.objects.create(package=package, venue=venue2, is_primary=False)

        serializer_primary = PackageVenueInlineSerializer(pv_primary)
        serializer_secondary = PackageVenueInlineSerializer(pv_secondary)

        assert serializer_primary.data["operating_rules"] is not None
        assert serializer_secondary.data["operating_rules"] is None


@pytest.mark.django_db
class TestVenueBlockedDateSerializer:
    """Unit tests for VenueBlockedDateSerializer."""

    def test_validate_partial_block_requires_times(self, venue_factory):
        """Test partial day blocks require start and end times."""
        venue = venue_factory()

        data = {
            "venue": venue.id,
            "date": (date.today() + timedelta(days=7)).isoformat(),
            "reason": "Test",
            "is_full_day": False,
            # Missing times
        }

        serializer = VenueBlockedDateSerializer(data=data)
        assert not serializer.is_valid()
        assert "non_field_errors" in serializer.errors

    def test_validate_end_time_after_start_time(self, venue_factory):
        """Test end time must be after start time."""
        venue = venue_factory()

        data = {
            "venue": venue.id,
            "date": (date.today() + timedelta(days=7)).isoformat(),
            "reason": "Test",
            "is_full_day": False,
            "blocked_start_time": "14:00:00",
            "blocked_end_time": "10:00:00",  # Before start
        }

        serializer = VenueBlockedDateSerializer(data=data)
        assert not serializer.is_valid()
        assert "blocked_end_time" in serializer.errors

    def test_valid_partial_block(self, venue_factory):
        """Test creating valid partial block."""
        venue = venue_factory()

        data = {
            "venue": venue.id,
            "date": (date.today() + timedelta(days=7)).isoformat(),
            "reason": "Morning Event",
            "is_full_day": False,
            "blocked_start_time": "08:00:00",
            "blocked_end_time": "12:00:00",
        }

        serializer = VenueBlockedDateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_created_by_name(self, venue_factory, user_factory):
        """Test created_by_name field returns user name."""
        venue = venue_factory()
        user = user_factory(first_name="John", last_name="Doe")

        block = VenueBlockedDate.objects.create(
            venue=venue, date=date.today() + timedelta(days=7), reason="Test", is_full_day=True, created_by=user
        )

        serializer = VenueBlockedDateSerializer(block)
        assert serializer.data["created_by_name"] == "John Doe"


@pytest.mark.django_db
class TestPublicVenueSerializer:
    """Unit tests for PublicVenueSerializer."""

    def test_excludes_internal_fields(self, venue_factory, venue_operating_rules_factory):
        """Test public serializer excludes internal fields."""
        venue = venue_factory(is_active=True, is_bookable=True)
        venue_operating_rules_factory(venue=venue)

        serializer = PublicVenueSerializer(venue)
        data = serializer.data

        # Should include public fields
        assert "name" in data
        assert "description" in data
        assert "amenities" in data
        assert "operating_rules" in data

        # Should not include internal/admin fields
        assert "is_active" not in data
        assert "is_bookable" not in data
        assert "created_at" not in data
        assert "updated_at" not in data


@pytest.mark.django_db
class TestPublicVenueOperatingRulesSerializer:
    """Unit tests for PublicVenueOperatingRulesSerializer."""

    def test_includes_client_facing_fields(self, venue_factory, venue_operating_rules_factory):
        """Test includes fields needed by clients."""
        venue = venue_factory()
        rules = venue_operating_rules_factory(
            venue=venue,
            default_check_in_time=time(14, 0),
            default_checkout_time=time(12, 0),
            early_checkin_allowed=True,
            early_checkin_fee_per_hour=Decimal("300.00"),
        )

        serializer = PublicVenueOperatingRulesSerializer(rules)
        data = serializer.data

        assert data["default_check_in_time"] == "14:00:00"
        assert data["default_checkout_time"] == "12:00:00"
        assert data["early_checkin_allowed"] is True
        assert data["early_checkin_fee_per_hour"] == "300.00"


@pytest.mark.django_db
class TestRentableVenueSerializer:
    """Unit tests for RentableVenueSerializer."""

    def test_serialize_rentable_venue(self, venue_factory, venue_operating_rules_factory):
        """Test serializing a rentable venue."""
        venue = venue_factory(
            is_rentable_standalone=True,
            standalone_base_price=Decimal("5000.00"),
            standalone_included_hours=Decimal("3.0"),
            standalone_excess_hour_price=Decimal("500.00"),
            amenities=["Pool", "WiFi"],
        )
        venue_operating_rules_factory(venue=venue, default_check_in_time=time(14, 0), default_checkout_time=time(12, 0))

        serializer = RentableVenueSerializer(venue)
        data = serializer.data

        assert data["standalone_base_price"] == "5000.00"
        assert data["standalone_included_hours"] == "3.0"
        assert data["standalone_excess_hour_price"] == "500.00"
        assert data["amenities"] == ["Pool", "WiFi"]
        assert data["operating_rules"]["default_check_in_time"] == time(14, 0)

    def test_operating_rules_structure(self, venue_factory, venue_operating_rules_factory):
        """Test operating rules has simplified structure."""
        venue = venue_factory(is_rentable_standalone=True)
        venue_operating_rules_factory(
            venue=venue,
            minimum_program_hours=Decimal("2.0"),
            maximum_program_hours=Decimal("8.0"),
            earliest_start_time=time(8, 0),
            latest_end_time=time(21, 0),
        )

        serializer = RentableVenueSerializer(venue)
        rules = serializer.data["operating_rules"]

        assert "minimum_program_hours" in rules
        assert "maximum_program_hours" in rules
        assert "earliest_start_time" in rules
        assert "latest_end_time" in rules


@pytest.mark.django_db
class TestRentableVenueWithEventTypeSerializer:
    """Unit tests for RentableVenueWithEventTypeSerializer."""

    def test_effective_pricing_with_config(self, venue_factory, venue_operating_rules_factory, event_type_factory):
        """Test effective pricing uses event type config when available."""
        venue = venue_factory(
            is_rentable_standalone=True,
            standalone_base_price=Decimal("5000.00"),
            standalone_included_hours=Decimal("3.0"),
            standalone_excess_hour_price=Decimal("500.00"),
        )
        venue_operating_rules_factory(venue=venue)
        event_type = event_type_factory()

        VenueEventTypeConfiguration.objects.create(
            venue=venue,
            event_type=event_type,
            base_price=Decimal("8000.00"),
            included_hours=Decimal("5.0"),
            excess_hour_price=Decimal("800.00"),
        )

        serializer = RentableVenueWithEventTypeSerializer(venue, context={"event_type_id": event_type.id})
        data = serializer.data

        assert data["effective_base_price"] == "8000.00"
        assert data["effective_included_hours"] == "5.0"
        assert data["effective_excess_hour_price"] == "800.00"
        assert data["has_event_type_config"] is True

    def test_effective_pricing_without_config(self, venue_factory, venue_operating_rules_factory, event_type_factory):
        """Test effective pricing falls back to venue defaults."""
        venue = venue_factory(
            is_rentable_standalone=True,
            standalone_base_price=Decimal("5000.00"),
            standalone_included_hours=Decimal("3.0"),
            standalone_excess_hour_price=Decimal("500.00"),
        )
        venue_operating_rules_factory(venue=venue)
        event_type = event_type_factory()

        # No VenueEventTypeConfiguration created

        serializer = RentableVenueWithEventTypeSerializer(venue, context={"event_type_id": event_type.id})
        data = serializer.data

        assert data["effective_base_price"] == Decimal("5000.00")
        assert data["effective_included_hours"] == Decimal("3.0")
        assert data["effective_excess_hour_price"] == Decimal("500.00")
        assert data["has_event_type_config"] is False

    def test_all_day_access(self, venue_factory, venue_operating_rules_factory, event_type_factory):
        """Test all-day access flag."""
        venue = venue_factory(is_rentable_standalone=True)
        venue_operating_rules_factory(venue=venue)
        event_type = event_type_factory()

        VenueEventTypeConfiguration.objects.create(venue=venue, event_type=event_type, is_all_day_access=True)

        serializer = RentableVenueWithEventTypeSerializer(venue, context={"event_type_id": event_type.id})
        data = serializer.data

        assert data["is_all_day_access"] is True
        assert data["effective_included_hours"] == "24.0"
        assert data["effective_excess_hour_price"] == "0"


@pytest.mark.django_db
class TestVenueEventTypeConfigurationSerializer:
    """Unit tests for VenueEventTypeConfigurationSerializer."""

    def test_serialize_configuration(self, venue_factory, event_type_factory):
        """Test serializing venue event type configuration."""
        venue = venue_factory(name="Garden")
        event_type = event_type_factory(name="Wedding")

        config = VenueEventTypeConfiguration.objects.create(
            venue=venue,
            event_type=event_type,
            base_price=Decimal("10000.00"),
            included_hours=Decimal("6.0"),
            excess_hour_price=Decimal("1000.00"),
            is_all_day_access=False,
            notes="Special wedding pricing",
        )

        serializer = VenueEventTypeConfigurationSerializer(config)
        data = serializer.data

        assert data["venue_name"] == "Garden"
        assert data["event_type_name"] == "Wedding"
        assert data["base_price"] == "10000.00"
        assert data["included_hours"] == "6.0"
        assert data["excess_hour_price"] == "1000.00"
        assert data["notes"] == "Special wedding pricing"

    def test_create_configuration(self, venue_factory, event_type_factory):
        """Test creating configuration via serializer."""
        venue = venue_factory()
        event_type = event_type_factory()

        data = {
            "venue": venue.id,
            "event_type": event_type.id,
            "base_price": "15000.00",
            "included_hours": "8.0",
            "is_all_day_access": True,
        }

        serializer = VenueEventTypeConfigurationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        config = serializer.save()

        assert config.venue == venue
        assert config.event_type == event_type
        assert config.base_price == Decimal("15000.00")
        assert config.is_all_day_access is True
