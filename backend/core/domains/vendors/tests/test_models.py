"""
Unit tests for vendors domain models.

Tests:
- Vendor model (service providers with categories and contact info)
- VendorOperatingRules model (lead time, service duration constraints)
- PackageVendor model (package-vendor junction table)
"""

from decimal import Decimal

from django.db import IntegrityError

import pytest

from core.domains.vendors.models import PackageVendor, Vendor, VendorOperatingRules
from core.factories.products import ProductOptionFactory


@pytest.fixture
def vendor_factory(db):
    """Factory function for creating Vendor instances."""

    def _create_vendor(**kwargs):
        defaults = {
            "name": "Test Vendor",
            "code": f"VENDOR_{kwargs.get('name', 'TEST').upper().replace(' ', '_')}_{id(kwargs)}",
            "service_category": "CATERING",
            "is_active": True,
            "is_bookable": True,
        }
        defaults.update(kwargs)
        return Vendor.objects.create(**defaults)

    return _create_vendor


@pytest.fixture
def operating_rules_factory(db, vendor_factory):
    """Factory function for creating VendorOperatingRules instances."""

    def _create_rules(vendor=None, **kwargs):
        if vendor is None:
            vendor = vendor_factory()
        defaults = {
            "vendor": vendor,
            "minimum_lead_days": 7,
            "minimum_service_hours": Decimal("2.0"),
            "maximum_service_hours": Decimal("8.0"),
            "setup_hours": Decimal("1.0"),
            "teardown_hours": Decimal("0.5"),
        }
        defaults.update(kwargs)
        return VendorOperatingRules.objects.create(**defaults)

    return _create_rules


@pytest.fixture
def package_vendor_factory(db, vendor_factory):
    """Factory function for creating PackageVendor instances."""

    def _create_package_vendor(vendor=None, package=None, **kwargs):
        if vendor is None:
            vendor = vendor_factory()
        if package is None:
            package = ProductOptionFactory(package=True)
        defaults = {
            "vendor": vendor,
            "package": package,
            "notes": "",
            "sort_order": 0,
        }
        defaults.update(kwargs)
        return PackageVendor.objects.create(**defaults)

    return _create_package_vendor


@pytest.mark.django_db
class TestVendorModel:
    """Unit tests for the Vendor model."""

    def test_create_vendor_with_required_fields(self, vendor_factory):
        """Test creating a vendor with minimum required fields."""
        vendor = vendor_factory(name="ABC Catering", code="VENDOR_ABC_CATERING")

        assert vendor.name == "ABC Catering"
        assert vendor.code == "VENDOR_ABC_CATERING"
        assert vendor.service_category == "CATERING"
        assert vendor.is_active
        assert vendor.is_bookable

    def test_vendor_string_representation(self, vendor_factory):
        """Test Vendor __str__ returns name."""
        vendor = vendor_factory(name="ABC Catering")

        assert str(vendor) == "ABC Catering"

    def test_vendor_code_uniqueness(self, vendor_factory):
        """Test that vendor code must be unique."""
        vendor_factory(code="VENDOR_UNIQUE")

        with pytest.raises(IntegrityError):
            vendor_factory(code="VENDOR_UNIQUE", name="Different Vendor")

    def test_vendor_service_category_choices(self, vendor_factory):
        """Test vendor can be created with different service categories."""
        categories = ["CATERING", "PHOTOGRAPHY", "DJ", "FLORIST", "OTHER"]

        for category in categories:
            vendor = vendor_factory(name=f"{category} Vendor", code=f"VENDOR_{category}", service_category=category)
            assert vendor.service_category == category

    def test_vendor_with_contact_information(self, vendor_factory):
        """Test vendor with full contact information."""
        vendor = vendor_factory(
            name="Full Contact Vendor",
            contact_name="John Smith",
            contact_email="john@vendor.com",
            contact_phone="+1234567890",
            company_name="Smith Catering Inc.",
            address="123 Main St, City",
            website="https://smithcatering.com",
        )

        assert vendor.contact_name == "John Smith"
        assert vendor.contact_email == "john@vendor.com"
        assert vendor.contact_phone == "+1234567890"
        assert vendor.company_name == "Smith Catering Inc."
        assert vendor.address == "123 Main St, City"
        assert vendor.website == "https://smithcatering.com"

    def test_vendor_default_values(self, vendor_factory):
        """Test vendor default values are set correctly."""
        vendor = vendor_factory(name="Default Vendor")

        assert vendor.is_active is True
        assert vendor.is_bookable is True
        assert vendor.sort_order == 0
        assert vendor.description == ""
        assert vendor.pricing_notes == ""

    def test_vendor_inactive_status(self, vendor_factory):
        """Test vendor can be set as inactive."""
        vendor = vendor_factory(is_active=False)

        assert not vendor.is_active

    def test_vendor_not_bookable_status(self, vendor_factory):
        """Test vendor can be set as not bookable."""
        vendor = vendor_factory(is_bookable=False)

        assert not vendor.is_bookable

    def test_vendor_ordering(self, vendor_factory):
        """Test vendor ordering by sort_order and name."""
        vendor_factory(name="C Vendor", sort_order=1)
        vendor_factory(name="A Vendor", sort_order=0)
        vendor_factory(name="B Vendor", sort_order=0)

        vendors = list(Vendor.objects.all())

        # Should be ordered by sort_order first, then by name
        assert vendors[0].name == "A Vendor"
        assert vendors[1].name == "B Vendor"
        assert vendors[2].name == "C Vendor"

    def test_vendor_operating_rules_property(self, vendor_factory, operating_rules_factory):
        """Test the operating_rules property returns rules when they exist."""
        vendor = vendor_factory()
        rules = operating_rules_factory(vendor=vendor)

        assert vendor.operating_rules == rules

    def test_vendor_operating_rules_property_returns_none(self, vendor_factory):
        """Test the operating_rules property returns None when no rules exist."""
        vendor = vendor_factory()

        assert vendor.operating_rules is None

    def test_vendor_pricing_notes(self, vendor_factory):
        """Test vendor with pricing notes."""
        vendor = vendor_factory(pricing_notes="Starting at $50/hour. Package deals available.")

        assert "Starting at $50/hour" in vendor.pricing_notes

    def test_vendor_service_description(self, vendor_factory):
        """Test vendor with service description."""
        vendor = vendor_factory(service_description="Full-service catering for events of all sizes.")

        assert "Full-service catering" in vendor.service_description


@pytest.mark.django_db
class TestVendorOperatingRulesModel:
    """Tests for VendorOperatingRules model."""

    def test_create_operating_rules(self, vendor_factory, operating_rules_factory):
        """Test creating operating rules for a vendor."""
        vendor = vendor_factory()
        rules = operating_rules_factory(
            vendor=vendor,
            minimum_lead_days=14,
            minimum_service_hours=Decimal("3.0"),
            maximum_service_hours=Decimal("10.0"),
            setup_hours=Decimal("2.0"),
            teardown_hours=Decimal("1.0"),
        )

        assert rules.vendor == vendor
        assert rules.minimum_lead_days == 14
        assert rules.minimum_service_hours == Decimal("3.0")
        assert rules.maximum_service_hours == Decimal("10.0")
        assert rules.setup_hours == Decimal("2.0")
        assert rules.teardown_hours == Decimal("1.0")

    def test_operating_rules_string_representation(self, vendor_factory, operating_rules_factory):
        """Test VendorOperatingRules __str__ returns informative string."""
        vendor = vendor_factory(name="ABC Catering")
        rules = operating_rules_factory(vendor=vendor)

        assert str(rules) == "Operating Rules for ABC Catering"

    def test_operating_rules_one_to_one_relationship(self, vendor_factory, operating_rules_factory):
        """Test that each vendor can only have one set of operating rules."""
        vendor = vendor_factory()
        operating_rules_factory(vendor=vendor)

        # Attempting to create another set of rules for the same vendor should fail
        with pytest.raises(IntegrityError):
            operating_rules_factory(vendor=vendor)

    def test_operating_rules_default_values(self, vendor_factory):
        """Test operating rules default values."""
        vendor = vendor_factory()
        rules = VendorOperatingRules.objects.create(vendor=vendor)

        assert rules.minimum_lead_days == 0
        assert rules.minimum_service_hours is None
        assert rules.maximum_service_hours is None
        assert rules.setup_hours == Decimal("0.0")
        assert rules.teardown_hours == Decimal("0.0")
        assert rules.custom_rules == {}

    def test_operating_rules_custom_rules_json(self, vendor_factory, operating_rules_factory):
        """Test custom rules JSON field."""
        vendor = vendor_factory()
        custom_rules = {
            "requires_deposit": True,
            "deposit_percentage": 25,
            "blackout_dates": ["2024-12-25", "2024-12-31"],
        }
        rules = operating_rules_factory(vendor=vendor, custom_rules=custom_rules)

        assert rules.custom_rules["requires_deposit"] is True
        assert rules.custom_rules["deposit_percentage"] == 25
        assert len(rules.custom_rules["blackout_dates"]) == 2

    def test_operating_rules_cascade_delete(self, vendor_factory, operating_rules_factory):
        """Test that operating rules are deleted when vendor is deleted."""
        vendor = vendor_factory()
        rules = operating_rules_factory(vendor=vendor)
        rules_id = rules.id

        vendor.delete()

        assert not VendorOperatingRules.objects.filter(id=rules_id).exists()

    def test_operating_rules_nullable_service_hours(self, vendor_factory, operating_rules_factory):
        """Test that service hours can be null."""
        vendor = vendor_factory()
        rules = operating_rules_factory(vendor=vendor, minimum_service_hours=None, maximum_service_hours=None)

        assert rules.minimum_service_hours is None
        assert rules.maximum_service_hours is None


@pytest.mark.django_db
class TestPackageVendorModel:
    """Tests for PackageVendor model."""

    def test_create_package_vendor(self, vendor_factory, package_vendor_factory):
        """Test creating a package-vendor assignment."""
        vendor = vendor_factory(name="Test Caterer")
        package = ProductOptionFactory(package=True, name="Premium Package")

        pv = package_vendor_factory(
            vendor=vendor, package=package, notes="Provides catering for the package", sort_order=1
        )

        assert pv.vendor == vendor
        assert pv.package == package
        assert pv.notes == "Provides catering for the package"
        assert pv.sort_order == 1

    def test_package_vendor_string_representation(self, vendor_factory, package_vendor_factory):
        """Test PackageVendor __str__ returns informative string."""
        vendor = vendor_factory(name="Test Caterer")
        package = ProductOptionFactory(package=True, name="Premium Package")
        pv = package_vendor_factory(vendor=vendor, package=package)

        assert str(pv) == "Premium Package - Test Caterer"

    def test_package_vendor_unique_constraint(self, vendor_factory, package_vendor_factory):
        """Test that the same vendor cannot be assigned to the same package twice."""
        vendor = vendor_factory()
        package = ProductOptionFactory(package=True)
        package_vendor_factory(vendor=vendor, package=package)

        # Attempting to create another assignment with the same vendor and package should fail
        with pytest.raises(IntegrityError):
            package_vendor_factory(vendor=vendor, package=package)

    def test_package_vendor_ordering(self, vendor_factory, package_vendor_factory):
        """Test package vendor ordering by sort_order and vendor name."""
        package = ProductOptionFactory(package=True)
        vendor1 = vendor_factory(name="A Vendor")
        vendor2 = vendor_factory(name="B Vendor")
        vendor3 = vendor_factory(name="C Vendor")

        package_vendor_factory(vendor=vendor3, package=package, sort_order=1)
        package_vendor_factory(vendor=vendor1, package=package, sort_order=0)
        package_vendor_factory(vendor=vendor2, package=package, sort_order=0)

        # Filter by package to get consistent ordering
        pvs = list(PackageVendor.objects.filter(package=package))

        # Should be ordered by sort_order first, then by vendor name
        assert pvs[0].vendor.name == "A Vendor"
        assert pvs[1].vendor.name == "B Vendor"
        assert pvs[2].vendor.name == "C Vendor"

    def test_package_vendor_cascade_delete_on_vendor(self, vendor_factory, package_vendor_factory):
        """Test that package-vendor assignment is deleted when vendor is deleted."""
        vendor = vendor_factory()
        package = ProductOptionFactory(package=True)
        pv = package_vendor_factory(vendor=vendor, package=package)
        pv_id = pv.id

        vendor.delete()

        assert not PackageVendor.objects.filter(id=pv_id).exists()

    def test_package_vendor_cascade_delete_on_package(self, vendor_factory, package_vendor_factory):
        """Test that package-vendor assignment is deleted when package is deleted."""
        vendor = vendor_factory()
        package = ProductOptionFactory(package=True)
        pv = package_vendor_factory(vendor=vendor, package=package)
        pv_id = pv.id

        package.delete()

        assert not PackageVendor.objects.filter(id=pv_id).exists()

    def test_multiple_vendors_per_package(self, vendor_factory, package_vendor_factory):
        """Test that a package can have multiple vendors."""
        package = ProductOptionFactory(package=True)
        vendor1 = vendor_factory(name="Caterer")
        vendor2 = vendor_factory(name="Photographer")
        vendor3 = vendor_factory(name="DJ")

        package_vendor_factory(vendor=vendor1, package=package)
        package_vendor_factory(vendor=vendor2, package=package)
        package_vendor_factory(vendor=vendor3, package=package)

        assert package.package_vendors.count() == 3

    def test_multiple_packages_per_vendor(self, vendor_factory, package_vendor_factory):
        """Test that a vendor can be assigned to multiple packages."""
        vendor = vendor_factory()
        package1 = ProductOptionFactory(package=True, name="Package 1")
        package2 = ProductOptionFactory(package=True, name="Package 2")
        package3 = ProductOptionFactory(package=True, name="Package 3")

        package_vendor_factory(vendor=vendor, package=package1)
        package_vendor_factory(vendor=vendor, package=package2)
        package_vendor_factory(vendor=vendor, package=package3)

        assert vendor.vendor_packages.count() == 3

    def test_package_vendor_default_sort_order(self, vendor_factory, package_vendor_factory):
        """Test that package vendor default sort_order is 0."""
        vendor = vendor_factory()
        package = ProductOptionFactory(package=True)
        pv = PackageVendor.objects.create(vendor=vendor, package=package)

        assert pv.sort_order == 0

    def test_package_vendor_empty_notes(self, vendor_factory, package_vendor_factory):
        """Test package vendor with empty notes."""
        vendor = vendor_factory()
        package = ProductOptionFactory(package=True)
        pv = PackageVendor.objects.create(vendor=vendor, package=package)

        assert pv.notes == ""


@pytest.mark.django_db
class TestVendorServiceCategoryChoices:
    """Tests for service category choices validation."""

    def test_all_service_categories(self, vendor_factory):
        """Test all defined service categories."""
        categories = [
            "CATERING",
            "PHOTOGRAPHY",
            "VIDEOGRAPHY",
            "DJ",
            "FLORIST",
            "DECORATOR",
            "ENTERTAINMENT",
            "TRANSPORTATION",
            "MAKEUP",
            "RENTALS",
            "OFFICIANT",
            "COORDINATION",
            "OTHER",
        ]

        for i, category in enumerate(categories):
            vendor = vendor_factory(
                name=f"{category} Vendor {i}", code=f"VENDOR_{category}_{i}", service_category=category
            )
            assert vendor.service_category == category

    def test_service_category_display_values(self):
        """Test service category display values."""
        expected_displays = {
            "CATERING": "Catering",
            "PHOTOGRAPHY": "Photography",
            "VIDEOGRAPHY": "Videography",
            "DJ": "DJ / Music",
            "FLORIST": "Florist",
            "DECORATOR": "Decorator",
            "ENTERTAINMENT": "Entertainment",
            "TRANSPORTATION": "Transportation",
            "MAKEUP": "Makeup & Styling",
            "RENTALS": "Equipment Rentals",
            "OFFICIANT": "Officiant",
            "COORDINATION": "Event Coordination",
            "OTHER": "Other",
        }

        for code, display in expected_displays.items():
            found = False
            for choice in Vendor.SERVICE_CATEGORY_CHOICES:
                if choice[0] == code:
                    assert choice[1] == display
                    found = True
                    break
            assert found, f"Category {code} not found in choices"
