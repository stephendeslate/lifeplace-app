"""
Unit tests for vendors domain serializers.

Tests:
- VendorSerializer (basic vendor serialization)
- VendorListSerializer (lightweight list serialization)
- VendorDetailSerializer (detailed vendor with packages)
- VendorWithRulesSerializer (vendor with nested operating rules)
- VendorOperatingRulesSerializer (operating rules only)
- PackageVendorSerializer (package-vendor assignments)
- PackageVendorInlineSerializer (inline vendor info for packages)
- PublicVendorSerializer (client-facing vendor info)
"""

from decimal import Decimal

import pytest

from core.domains.vendors.models import PackageVendor, Vendor, VendorOperatingRules
from core.domains.vendors.serializers import (
    PackageVendorInlineSerializer,
    PackageVendorSerializer,
    PublicPackageVendorSerializer,
    PublicVendorOperatingRulesSerializer,
    PublicVendorSerializer,
    VendorDetailSerializer,
    VendorListSerializer,
    VendorOperatingRulesSerializer,
    VendorSerializer,
    VendorWithRulesSerializer,
)
from core.factories.products import ProductOptionFactory


@pytest.fixture
def vendor(db):
    """Create a basic vendor for testing."""
    return Vendor.objects.create(
        name="Test Catering Co.",
        code="VENDOR_TEST_CATERING",
        description="Professional catering services",
        service_category="CATERING",
        service_description="Full-service catering for all events",
        contact_name="John Smith",
        contact_email="john@catering.com",
        contact_phone="+1234567890",
        company_name="Test Catering Co. LLC",
        address="123 Main St",
        website="https://testcatering.com",
        pricing_notes="Starting at $50/person",
        is_active=True,
        is_bookable=True,
        sort_order=1,
    )


@pytest.fixture
def vendor_with_rules(vendor):
    """Create a vendor with operating rules."""
    VendorOperatingRules.objects.create(
        vendor=vendor,
        minimum_lead_days=7,
        minimum_service_hours=Decimal("2.0"),
        maximum_service_hours=Decimal("8.0"),
        setup_hours=Decimal("1.0"),
        teardown_hours=Decimal("0.5"),
        custom_rules={"requires_deposit": True},
    )
    return vendor


@pytest.fixture
def vendor_with_packages(vendor):
    """Create a vendor with package assignments."""
    package1 = ProductOptionFactory(package=True, name="Basic Package", is_active=True)
    package2 = ProductOptionFactory(package=True, name="Premium Package", is_active=True)
    package3 = ProductOptionFactory(package=True, name="Inactive Package", is_active=False)

    PackageVendor.objects.create(vendor=vendor, package=package1, notes="Basic catering", sort_order=0)
    PackageVendor.objects.create(vendor=vendor, package=package2, notes="Premium catering", sort_order=1)
    PackageVendor.objects.create(vendor=vendor, package=package3, notes="Inactive", sort_order=2)

    return vendor


@pytest.mark.django_db
class TestVendorSerializer:
    """Tests for VendorSerializer."""

    def test_serialize_vendor(self, vendor):
        """Test basic vendor serialization."""
        serializer = VendorSerializer(vendor)
        data = serializer.data

        assert data["id"] == vendor.id
        assert data["name"] == "Test Catering Co."
        assert data["code"] == "VENDOR_TEST_CATERING"
        assert data["description"] == "Professional catering services"
        assert data["service_category"] == "CATERING"
        assert data["service_description"] == "Full-service catering for all events"
        assert data["contact_name"] == "John Smith"
        assert data["contact_email"] == "john@catering.com"
        assert data["is_active"] is True
        assert data["is_bookable"] is True

    def test_serialize_vendor_with_operating_rules(self, vendor_with_rules):
        """Test vendor serialization includes operating rules."""
        serializer = VendorSerializer(vendor_with_rules)
        data = serializer.data

        assert data["operating_rules"] is not None
        assert data["operating_rules"]["minimum_lead_days"] == 7
        assert data["operating_rules"]["minimum_service_hours"] == "2.0"

    def test_serialize_vendor_without_operating_rules(self, vendor):
        """Test vendor serialization when no operating rules exist."""
        serializer = VendorSerializer(vendor)
        data = serializer.data

        assert data["operating_rules"] is None

    def test_packages_count(self, vendor_with_packages):
        """Test packages_count includes only active packages."""
        serializer = VendorSerializer(vendor_with_packages)
        data = serializer.data

        # Should only count active packages (2 out of 3)
        assert data["packages_count"] == 2

    def test_validate_code_uppercase(self):
        """Test code is converted to uppercase during validation."""
        serializer = VendorSerializer(
            data={
                "name": "Test Vendor",
                "code": "vendor_lowercase",
                "description": "Test",
                "service_category": "CATERING",
                "is_active": True,
                "is_bookable": True,
                "sort_order": 0,
            }
        )

        serializer.is_valid(raise_exception=True)
        assert serializer.validated_data["code"] == "VENDOR_LOWERCASE"

    def test_read_only_fields(self, vendor):
        """Test that read-only fields are not writable."""
        serializer = VendorSerializer(
            vendor,
            data={
                "id": 9999,
                "name": "Updated Name",
                "code": "UPDATED_CODE",
                "created_at": "2020-01-01T00:00:00Z",
            },
            partial=True,
        )

        serializer.is_valid(raise_exception=True)
        # id and created_at should not be in validated_data
        assert "id" not in serializer.validated_data
        assert "created_at" not in serializer.validated_data


@pytest.mark.django_db
class TestVendorListSerializer:
    """Tests for VendorListSerializer."""

    def test_serialize_vendor_list(self, vendor):
        """Test lightweight vendor list serialization."""
        serializer = VendorListSerializer(vendor)
        data = serializer.data

        # Should include essential fields only
        assert data["id"] == vendor.id
        assert data["name"] == "Test Catering Co."
        assert data["code"] == "VENDOR_TEST_CATERING"
        assert data["service_category"] == "CATERING"
        assert data["is_active"] is True
        assert data["is_bookable"] is True
        assert data["sort_order"] == 1

    def test_list_serializer_excludes_detailed_fields(self, vendor):
        """Test that list serializer excludes detailed contact fields."""
        serializer = VendorListSerializer(vendor)
        data = serializer.data

        # These detailed fields should NOT be included
        assert "description" not in data
        assert "service_description" not in data
        assert "contact_name" not in data
        assert "contact_email" not in data
        assert "address" not in data
        assert "website" not in data
        assert "pricing_notes" not in data

    def test_has_operating_rules_true(self, vendor_with_rules):
        """Test has_operating_rules is True when rules exist."""
        serializer = VendorListSerializer(vendor_with_rules)
        data = serializer.data

        assert data["has_operating_rules"] is True

    def test_has_operating_rules_false(self, vendor):
        """Test has_operating_rules is False when no rules exist."""
        serializer = VendorListSerializer(vendor)
        data = serializer.data

        assert data["has_operating_rules"] is False

    def test_packages_count_all(self, vendor_with_packages):
        """Test packages_count includes all packages (not just active)."""
        serializer = VendorListSerializer(vendor_with_packages)
        data = serializer.data

        # List serializer counts ALL packages (3 total)
        assert data["packages_count"] == 3


@pytest.mark.django_db
class TestVendorDetailSerializer:
    """Tests for VendorDetailSerializer."""

    def test_serialize_vendor_detail(self, vendor_with_packages):
        """Test detailed vendor serialization includes packages."""
        vendor_with_packages.refresh_from_db()
        serializer = VendorDetailSerializer(vendor_with_packages)
        data = serializer.data

        # Should include all VendorSerializer fields plus packages
        assert "packages" in data
        assert len(data["packages"]) == 2  # Only active packages

    def test_packages_include_correct_fields(self, vendor_with_packages):
        """Test packages array includes expected fields."""
        serializer = VendorDetailSerializer(vendor_with_packages)
        data = serializer.data

        # Check first package has correct structure
        package = data["packages"][0]
        assert "id" in package
        assert "name" in package
        assert "notes" in package
        assert "sort_order" in package

    def test_packages_ordered_by_sort_order(self, vendor_with_packages):
        """Test packages are ordered by sort_order."""
        serializer = VendorDetailSerializer(vendor_with_packages)
        data = serializer.data

        packages = data["packages"]
        assert packages[0]["notes"] == "Basic catering"  # sort_order=0
        assert packages[1]["notes"] == "Premium catering"  # sort_order=1


@pytest.mark.django_db
class TestVendorWithRulesSerializer:
    """Tests for VendorWithRulesSerializer (create/update with nested rules)."""

    def test_create_vendor_without_rules(self, db):
        """Test creating vendor without operating rules."""
        data = {
            "name": "New Vendor",
            "code": "VENDOR_NEW",
            "description": "Description",
            "service_category": "PHOTOGRAPHY",
            "is_active": True,
            "is_bookable": True,
            "sort_order": 0,
        }

        serializer = VendorWithRulesSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()

        assert vendor.name == "New Vendor"
        assert vendor.code == "VENDOR_NEW"
        assert not hasattr(vendor, "vendor_operating_rules") or vendor.operating_rules is None

    def test_create_vendor_with_rules(self, db):
        """Test creating vendor with operating rules in one request."""
        data = {
            "name": "New Vendor With Rules",
            "code": "VENDOR_WITH_RULES",
            "description": "Description",
            "service_category": "DJ",
            "is_active": True,
            "is_bookable": True,
            "sort_order": 0,
            "operating_rules": {
                "minimum_lead_days": 14,
                "minimum_service_hours": "3.0",
                "maximum_service_hours": "6.0",
                "setup_hours": "1.5",
                "teardown_hours": "1.0",
            },
        }

        serializer = VendorWithRulesSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()

        assert vendor.name == "New Vendor With Rules"
        assert vendor.vendor_operating_rules is not None
        assert vendor.vendor_operating_rules.minimum_lead_days == 14
        assert vendor.vendor_operating_rules.minimum_service_hours == Decimal("3.0")

    def test_update_vendor_add_rules(self, vendor):
        """Test updating vendor to add operating rules."""
        data = {
            "name": vendor.name,
            "code": vendor.code,
            "operating_rules": {
                "minimum_lead_days": 10,
                "setup_hours": "2.0",
            },
        }

        serializer = VendorWithRulesSerializer(vendor, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_vendor = serializer.save()

        assert updated_vendor.vendor_operating_rules is not None
        assert updated_vendor.vendor_operating_rules.minimum_lead_days == 10

    def test_update_vendor_existing_rules(self, vendor_with_rules):
        """Test updating vendor's existing operating rules."""
        data = {
            "operating_rules": {
                "minimum_lead_days": 21,
            }
        }

        serializer = VendorWithRulesSerializer(vendor_with_rules, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_vendor = serializer.save()

        assert updated_vendor.vendor_operating_rules.minimum_lead_days == 21

    def test_update_vendor_fields_without_rules(self, vendor_with_rules):
        """Test updating vendor fields without affecting rules."""
        original_lead_days = vendor_with_rules.vendor_operating_rules.minimum_lead_days

        data = {
            "name": "Updated Name",
        }

        serializer = VendorWithRulesSerializer(vendor_with_rules, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_vendor = serializer.save()

        assert updated_vendor.name == "Updated Name"
        assert updated_vendor.vendor_operating_rules.minimum_lead_days == original_lead_days


@pytest.mark.django_db
class TestVendorOperatingRulesSerializer:
    """Tests for VendorOperatingRulesSerializer."""

    def test_serialize_operating_rules(self, vendor_with_rules):
        """Test operating rules serialization."""
        rules = vendor_with_rules.vendor_operating_rules
        serializer = VendorOperatingRulesSerializer(rules)
        data = serializer.data

        assert data["id"] == rules.id
        assert data["minimum_lead_days"] == 7
        assert data["minimum_service_hours"] == "2.0"
        assert data["maximum_service_hours"] == "8.0"
        assert data["setup_hours"] == "1.0"
        assert data["teardown_hours"] == "0.5"
        assert data["custom_rules"] == {"requires_deposit": True}

    def test_create_operating_rules(self, vendor):
        """Test creating operating rules through serializer."""
        data = {
            "minimum_lead_days": 5,
            "minimum_service_hours": "1.5",
            "maximum_service_hours": "4.0",
            "setup_hours": "0.5",
            "teardown_hours": "0.5",
        }

        serializer = VendorOperatingRulesSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        rules = serializer.save(vendor=vendor)

        assert rules.minimum_lead_days == 5
        assert rules.vendor == vendor


@pytest.mark.django_db
class TestPackageVendorSerializer:
    """Tests for PackageVendorSerializer."""

    def test_serialize_package_vendor(self, vendor):
        """Test package-vendor assignment serialization."""
        package = ProductOptionFactory(package=True, name="Test Package")
        pv = PackageVendor.objects.create(vendor=vendor, package=package, notes="Test notes", sort_order=2)

        serializer = PackageVendorSerializer(pv)
        data = serializer.data

        assert data["id"] == pv.id
        assert data["vendor"] == vendor.id
        assert data["vendor_name"] == vendor.name
        assert data["vendor_code"] == vendor.code
        assert data["vendor_service_category"] == vendor.service_category
        assert data["package"] == package.id
        assert data["package_name"] == "Test Package"
        assert data["notes"] == "Test notes"
        assert data["sort_order"] == 2

    def test_validate_package_must_be_package_type(self, vendor):
        """Test validation that package must be of type PACKAGE."""
        # Create a PRODUCT, not a PACKAGE
        product = ProductOptionFactory(type="PRODUCT", name="Regular Product")

        data = {"vendor": vendor.id, "package": product.id, "notes": "", "sort_order": 0}

        serializer = PackageVendorSerializer(data=data)
        assert not serializer.is_valid()
        assert "package" in serializer.errors

    def test_create_package_vendor(self, vendor):
        """Test creating package-vendor assignment."""
        package = ProductOptionFactory(package=True)

        data = {"vendor": vendor.id, "package": package.id, "notes": "New assignment", "sort_order": 1}

        serializer = PackageVendorSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        pv = serializer.save()

        assert pv.vendor == vendor
        assert pv.package == package
        assert pv.notes == "New assignment"


@pytest.mark.django_db
class TestPackageVendorInlineSerializer:
    """Tests for PackageVendorInlineSerializer."""

    def test_serialize_inline_package_vendor(self, vendor_with_rules):
        """Test inline package vendor serialization."""
        package = ProductOptionFactory(package=True)
        pv = PackageVendor.objects.create(vendor=vendor_with_rules, package=package, notes="Inline test", sort_order=0)

        serializer = PackageVendorInlineSerializer(pv)
        data = serializer.data

        assert data["vendor"] == vendor_with_rules.id
        assert data["vendor_name"] == vendor_with_rules.name
        assert data["vendor_code"] == vendor_with_rules.code
        assert data["vendor_service_category"] == vendor_with_rules.service_category
        assert data["notes"] == "Inline test"
        assert data["sort_order"] == 0

        # Should include operating rules
        assert data["operating_rules"] is not None
        assert data["operating_rules"]["minimum_lead_days"] == 7

    def test_inline_serializer_excludes_package_info(self, vendor):
        """Test that inline serializer doesn't include package fields."""
        package = ProductOptionFactory(package=True)
        pv = PackageVendor.objects.create(vendor=vendor, package=package)

        serializer = PackageVendorInlineSerializer(pv)
        data = serializer.data

        # Should NOT include package info (that's the point of inline)
        assert "package" not in data
        assert "package_name" not in data

    def test_operating_rules_none_when_not_exists(self, vendor):
        """Test operating_rules is None when vendor has no rules."""
        package = ProductOptionFactory(package=True)
        pv = PackageVendor.objects.create(vendor=vendor, package=package)

        serializer = PackageVendorInlineSerializer(pv)
        data = serializer.data

        assert data["operating_rules"] is None


@pytest.mark.django_db
class TestPublicVendorSerializer:
    """Tests for PublicVendorSerializer (client-facing)."""

    def test_serialize_public_vendor(self, vendor):
        """Test public vendor serialization."""
        serializer = PublicVendorSerializer(vendor)
        data = serializer.data

        # Should include only public fields
        assert data["id"] == vendor.id
        assert data["name"] == "Test Catering Co."
        assert data["code"] == "VENDOR_TEST_CATERING"
        assert data["description"] == "Professional catering services"
        assert data["service_category"] == "CATERING"
        assert data["service_description"] == "Full-service catering for all events"

    def test_public_serializer_excludes_admin_fields(self, vendor):
        """Test that public serializer excludes admin-only fields."""
        serializer = PublicVendorSerializer(vendor)
        data = serializer.data

        # Should NOT include admin/internal fields
        assert "contact_name" not in data
        assert "contact_email" not in data
        assert "contact_phone" not in data
        assert "company_name" not in data
        assert "address" not in data
        assert "website" not in data
        assert "pricing_notes" not in data
        assert "is_active" not in data
        assert "is_bookable" not in data
        assert "sort_order" not in data


@pytest.mark.django_db
class TestPublicVendorOperatingRulesSerializer:
    """Tests for PublicVendorOperatingRulesSerializer."""

    def test_serialize_public_operating_rules(self, vendor_with_rules):
        """Test public operating rules serialization."""
        rules = vendor_with_rules.vendor_operating_rules
        serializer = PublicVendorOperatingRulesSerializer(rules)
        data = serializer.data

        assert data["minimum_lead_days"] == 7
        assert data["minimum_service_hours"] == "2.0"
        assert data["maximum_service_hours"] == "8.0"
        assert data["setup_hours"] == "1.0"
        assert data["teardown_hours"] == "0.5"

    def test_public_rules_excludes_custom_rules(self, vendor_with_rules):
        """Test that public serializer excludes custom_rules JSON field."""
        rules = vendor_with_rules.vendor_operating_rules
        serializer = PublicVendorOperatingRulesSerializer(rules)
        data = serializer.data

        # Should NOT include custom_rules (internal use)
        assert "custom_rules" not in data
        assert "id" not in data
        assert "created_at" not in data
        assert "updated_at" not in data


@pytest.mark.django_db
class TestPublicPackageVendorSerializer:
    """Tests for PublicPackageVendorSerializer."""

    def test_serialize_public_package_vendor(self, vendor_with_rules):
        """Test public package vendor serialization."""
        package = ProductOptionFactory(package=True)
        pv = PackageVendor.objects.create(vendor=vendor_with_rules, package=package, notes="Public notes", sort_order=1)

        serializer = PublicPackageVendorSerializer(pv)
        data = serializer.data

        assert data["notes"] == "Public notes"
        assert data["sort_order"] == 1

        # Should include nested vendor info
        assert "vendor" in data
        assert data["vendor"]["name"] == vendor_with_rules.name

        # Should include operating rules
        assert data["operating_rules"] is not None
        assert data["operating_rules"]["minimum_lead_days"] == 7

    def test_public_package_vendor_excludes_ids(self, vendor):
        """Test that public serializer excludes internal IDs."""
        package = ProductOptionFactory(package=True)
        pv = PackageVendor.objects.create(vendor=vendor, package=package)

        serializer = PublicPackageVendorSerializer(pv)
        data = serializer.data

        # Should NOT include internal IDs
        assert "id" not in data
        assert "package" not in data
