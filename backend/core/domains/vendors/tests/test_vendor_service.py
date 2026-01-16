"""
Unit tests for VendorService.

Tests:
- get_active_vendors
- get_vendor_by_id
- get_vendor_by_code
- get_package_vendors
- get_vendors_by_category
- get_packages_for_vendor
- assign_vendor_to_package
- bulk_assign_vendors
"""

import pytest
from decimal import Decimal

from core.domains.vendors.models import Vendor, VendorOperatingRules, PackageVendor
from core.domains.vendors.services import VendorService
from core.factories.products import ProductOptionFactory


@pytest.fixture
def vendor_factory(db):
    """Factory function for creating Vendor instances."""
    counter = [0]

    def _create_vendor(**kwargs):
        counter[0] += 1
        defaults = {
            'name': f'Test Vendor {counter[0]}',
            'code': f'VENDOR_TEST_{counter[0]}',
            'service_category': 'CATERING',
            'is_active': True,
            'is_bookable': True,
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
            'vendor': vendor,
            'minimum_lead_days': 7,
            'minimum_service_hours': Decimal('2.0'),
            'maximum_service_hours': Decimal('8.0'),
        }
        defaults.update(kwargs)
        return VendorOperatingRules.objects.create(**defaults)
    return _create_rules


@pytest.mark.django_db
class TestGetActiveVendors:
    """Tests for VendorService.get_active_vendors()"""

    def test_returns_active_bookable_vendors(self, vendor_factory):
        """Test that only active and bookable vendors are returned."""
        # Create active and bookable vendors
        vendor1 = vendor_factory(name='Active Vendor 1', is_active=True, is_bookable=True)
        vendor2 = vendor_factory(name='Active Vendor 2', is_active=True, is_bookable=True)

        # Create inactive vendor
        vendor_factory(name='Inactive Vendor', is_active=False, is_bookable=True)

        # Create active but not bookable vendor
        vendor_factory(name='Not Bookable Vendor', is_active=True, is_bookable=False)

        result = VendorService.get_active_vendors()

        assert result.count() == 2
        assert vendor1 in result
        assert vendor2 in result

    def test_excludes_inactive_vendors(self, vendor_factory):
        """Test that inactive vendors are excluded."""
        vendor_factory(is_active=False)

        result = VendorService.get_active_vendors()

        assert result.count() == 0

    def test_excludes_not_bookable_vendors(self, vendor_factory):
        """Test that non-bookable vendors are excluded."""
        vendor_factory(is_bookable=False)

        result = VendorService.get_active_vendors()

        assert result.count() == 0

    def test_ordered_by_sort_order_and_name(self, vendor_factory):
        """Test vendors are ordered by sort_order, then name."""
        vendor3 = vendor_factory(name='C Vendor', sort_order=1)
        vendor1 = vendor_factory(name='A Vendor', sort_order=0)
        vendor2 = vendor_factory(name='B Vendor', sort_order=0)

        result = list(VendorService.get_active_vendors())

        assert result[0] == vendor1  # A Vendor, sort_order=0
        assert result[1] == vendor2  # B Vendor, sort_order=0
        assert result[2] == vendor3  # C Vendor, sort_order=1


@pytest.mark.django_db
class TestGetVendorById:
    """Tests for VendorService.get_vendor_by_id()"""

    def test_returns_vendor_when_exists(self, vendor_factory, operating_rules_factory):
        """Test that vendor is returned with prefetched operating rules."""
        vendor = vendor_factory()
        rules = operating_rules_factory(vendor=vendor)

        result = VendorService.get_vendor_by_id(vendor.id)

        assert result is not None
        assert result.id == vendor.id
        assert result.vendor_operating_rules == rules

    def test_returns_none_when_not_exists(self, db):
        """Test that None is returned when vendor doesn't exist."""
        result = VendorService.get_vendor_by_id(99999)

        assert result is None

    def test_prefetches_operating_rules(self, vendor_factory, operating_rules_factory):
        """Test that operating rules are prefetched to avoid extra queries."""
        vendor = vendor_factory()
        operating_rules_factory(vendor=vendor, minimum_lead_days=14)

        result = VendorService.get_vendor_by_id(vendor.id)

        # Accessing operating rules should not cause additional query
        assert result.vendor_operating_rules.minimum_lead_days == 14


@pytest.mark.django_db
class TestGetVendorByCode:
    """Tests for VendorService.get_vendor_by_code()"""

    def test_returns_vendor_when_exists(self, vendor_factory):
        """Test that vendor is returned by code."""
        vendor = vendor_factory(code='VENDOR_ABC')

        result = VendorService.get_vendor_by_code('VENDOR_ABC')

        assert result is not None
        assert result.code == 'VENDOR_ABC'

    def test_case_insensitive_lookup(self, vendor_factory):
        """Test that code lookup is case-insensitive."""
        vendor = vendor_factory(code='VENDOR_ABC')

        result = VendorService.get_vendor_by_code('vendor_abc')

        assert result is not None
        assert result.id == vendor.id

    def test_returns_none_when_not_exists(self, db):
        """Test that None is returned when vendor code doesn't exist."""
        result = VendorService.get_vendor_by_code('NONEXISTENT_CODE')

        assert result is None

    def test_prefetches_operating_rules(self, vendor_factory, operating_rules_factory):
        """Test that operating rules are prefetched."""
        vendor = vendor_factory(code='VENDOR_WITH_RULES')
        operating_rules_factory(vendor=vendor)

        result = VendorService.get_vendor_by_code('VENDOR_WITH_RULES')

        assert hasattr(result, 'vendor_operating_rules')


@pytest.mark.django_db
class TestGetPackageVendors:
    """Tests for VendorService.get_package_vendors()"""

    def test_returns_vendors_for_package(self, vendor_factory):
        """Test that all vendors for a package are returned."""
        package = ProductOptionFactory(package=True)
        vendor1 = vendor_factory(name='Vendor 1')
        vendor2 = vendor_factory(name='Vendor 2')

        PackageVendor.objects.create(vendor=vendor1, package=package)
        PackageVendor.objects.create(vendor=vendor2, package=package)

        result = VendorService.get_package_vendors(package.id)

        assert result.count() == 2

    def test_returns_empty_for_package_without_vendors(self, db):
        """Test that empty queryset is returned for package without vendors."""
        package = ProductOptionFactory(package=True)

        result = VendorService.get_package_vendors(package.id)

        assert result.count() == 0

    def test_ordered_by_sort_order_and_vendor_name(self, vendor_factory):
        """Test that results are ordered by sort_order, then vendor name."""
        package = ProductOptionFactory(package=True)
        vendor_c = vendor_factory(name='C Vendor')
        vendor_a = vendor_factory(name='A Vendor')
        vendor_b = vendor_factory(name='B Vendor')

        PackageVendor.objects.create(vendor=vendor_c, package=package, sort_order=1)
        PackageVendor.objects.create(vendor=vendor_a, package=package, sort_order=0)
        PackageVendor.objects.create(vendor=vendor_b, package=package, sort_order=0)

        result = list(VendorService.get_package_vendors(package.id))

        assert result[0].vendor == vendor_a  # sort_order=0, A
        assert result[1].vendor == vendor_b  # sort_order=0, B
        assert result[2].vendor == vendor_c  # sort_order=1

    def test_prefetches_vendor_and_rules(self, vendor_factory, operating_rules_factory):
        """Test that vendor and operating rules are prefetched."""
        package = ProductOptionFactory(package=True)
        vendor = vendor_factory()
        operating_rules_factory(vendor=vendor, minimum_lead_days=10)

        PackageVendor.objects.create(vendor=vendor, package=package)

        result = list(VendorService.get_package_vendors(package.id))

        # Should be able to access without additional queries
        assert result[0].vendor.name == vendor.name
        assert result[0].vendor.vendor_operating_rules.minimum_lead_days == 10


@pytest.mark.django_db
class TestGetVendorsByCategory:
    """Tests for VendorService.get_vendors_by_category()"""

    def test_returns_vendors_in_category(self, vendor_factory):
        """Test that vendors in the specified category are returned."""
        catering1 = vendor_factory(name='Caterer 1', service_category='CATERING')
        catering2 = vendor_factory(name='Caterer 2', service_category='CATERING')
        vendor_factory(name='Photographer', service_category='PHOTOGRAPHY')

        result = VendorService.get_vendors_by_category('CATERING')

        assert result.count() == 2
        assert catering1 in result
        assert catering2 in result

    def test_case_insensitive_category(self, vendor_factory):
        """Test that category lookup is case-insensitive."""
        vendor = vendor_factory(service_category='PHOTOGRAPHY')

        result = VendorService.get_vendors_by_category('photography')

        assert result.count() == 1
        assert vendor in result

    def test_excludes_inactive_vendors(self, vendor_factory):
        """Test that inactive vendors are excluded."""
        vendor_factory(service_category='DJ', is_active=False)
        vendor_factory(service_category='DJ', is_active=True)

        result = VendorService.get_vendors_by_category('DJ')

        assert result.count() == 1

    def test_excludes_not_bookable_vendors(self, vendor_factory):
        """Test that non-bookable vendors are excluded."""
        vendor_factory(service_category='FLORIST', is_bookable=False)
        vendor_factory(service_category='FLORIST', is_bookable=True)

        result = VendorService.get_vendors_by_category('FLORIST')

        assert result.count() == 1

    def test_returns_empty_for_unknown_category(self, vendor_factory):
        """Test that empty queryset is returned for unknown category."""
        vendor_factory(service_category='CATERING')

        result = VendorService.get_vendors_by_category('UNKNOWN')

        assert result.count() == 0


@pytest.mark.django_db
class TestGetPackagesForVendor:
    """Tests for VendorService.get_packages_for_vendor()"""

    def test_returns_packages_for_vendor(self, vendor_factory):
        """Test that all packages for a vendor are returned."""
        vendor = vendor_factory()
        package1 = ProductOptionFactory(package=True, name='Package 1', is_active=True)
        package2 = ProductOptionFactory(package=True, name='Package 2', is_active=True)

        PackageVendor.objects.create(vendor=vendor, package=package1)
        PackageVendor.objects.create(vendor=vendor, package=package2)

        result = VendorService.get_packages_for_vendor(vendor.id)

        assert result.count() == 2

    def test_excludes_inactive_packages(self, vendor_factory):
        """Test that inactive packages are excluded."""
        vendor = vendor_factory()
        active_package = ProductOptionFactory(package=True, is_active=True)
        inactive_package = ProductOptionFactory(package=True, is_active=False)

        PackageVendor.objects.create(vendor=vendor, package=active_package)
        PackageVendor.objects.create(vendor=vendor, package=inactive_package)

        result = VendorService.get_packages_for_vendor(vendor.id)

        assert result.count() == 1
        assert result.first().package == active_package

    def test_ordered_by_package_name(self, vendor_factory):
        """Test that results are ordered by package name."""
        vendor = vendor_factory()
        package_b = ProductOptionFactory(package=True, name='B Package', is_active=True)
        package_a = ProductOptionFactory(package=True, name='A Package', is_active=True)

        PackageVendor.objects.create(vendor=vendor, package=package_b)
        PackageVendor.objects.create(vendor=vendor, package=package_a)

        result = list(VendorService.get_packages_for_vendor(vendor.id))

        assert result[0].package.name == 'A Package'
        assert result[1].package.name == 'B Package'

    def test_returns_empty_for_vendor_without_packages(self, vendor_factory):
        """Test that empty queryset is returned for vendor without packages."""
        vendor = vendor_factory()

        result = VendorService.get_packages_for_vendor(vendor.id)

        assert result.count() == 0


@pytest.mark.django_db
class TestAssignVendorToPackage:
    """Tests for VendorService.assign_vendor_to_package()"""

    def test_creates_package_vendor_assignment(self, vendor_factory):
        """Test creating a new package-vendor assignment."""
        vendor = vendor_factory()
        package = ProductOptionFactory(package=True)

        result = VendorService.assign_vendor_to_package(
            package_id=package.id,
            vendor_id=vendor.id,
            notes='Test assignment',
            sort_order=5
        )

        assert result.vendor == vendor
        assert result.package == package
        assert result.notes == 'Test assignment'
        assert result.sort_order == 5

    def test_default_values(self, vendor_factory):
        """Test that default values are used when not provided."""
        vendor = vendor_factory()
        package = ProductOptionFactory(package=True)

        result = VendorService.assign_vendor_to_package(
            package_id=package.id,
            vendor_id=vendor.id
        )

        assert result.notes == ''
        assert result.sort_order == 0


@pytest.mark.django_db
class TestBulkAssignVendors:
    """Tests for VendorService.bulk_assign_vendors()"""

    def test_creates_multiple_assignments(self, vendor_factory):
        """Test creating multiple vendor assignments in one call."""
        package = ProductOptionFactory(package=True)
        vendor1 = vendor_factory(name='Vendor 1')
        vendor2 = vendor_factory(name='Vendor 2')
        vendor3 = vendor_factory(name='Vendor 3')

        assignments = [
            {'vendor_id': vendor1.id, 'notes': 'Note 1', 'sort_order': 0},
            {'vendor_id': vendor2.id, 'notes': 'Note 2', 'sort_order': 1},
            {'vendor_id': vendor3.id, 'notes': 'Note 3', 'sort_order': 2},
        ]

        result = VendorService.bulk_assign_vendors(package.id, assignments)

        assert len(result) == 3
        assert PackageVendor.objects.filter(package=package).count() == 3

    def test_uses_update_or_create(self, vendor_factory):
        """Test that existing assignments are updated, not duplicated."""
        package = ProductOptionFactory(package=True)
        vendor = vendor_factory()

        # Create initial assignment
        PackageVendor.objects.create(
            vendor=vendor,
            package=package,
            notes='Original notes',
            sort_order=0
        )

        # Bulk assign with updated values
        assignments = [
            {'vendor_id': vendor.id, 'notes': 'Updated notes', 'sort_order': 5}
        ]

        result = VendorService.bulk_assign_vendors(package.id, assignments)

        # Should still have only 1 assignment, but updated
        assert PackageVendor.objects.filter(package=package).count() == 1
        assert result[0].notes == 'Updated notes'
        assert result[0].sort_order == 5

    def test_default_values_for_optional_fields(self, vendor_factory):
        """Test that default values are used for optional fields."""
        package = ProductOptionFactory(package=True)
        vendor = vendor_factory()

        assignments = [
            {'vendor_id': vendor.id}  # No notes or sort_order
        ]

        result = VendorService.bulk_assign_vendors(package.id, assignments)

        assert result[0].notes == ''
        assert result[0].sort_order == 0

    def test_handles_empty_assignments(self, db):
        """Test that empty assignments list doesn't cause errors."""
        package = ProductOptionFactory(package=True)

        result = VendorService.bulk_assign_vendors(package.id, [])

        assert result == []


@pytest.mark.django_db
class TestVendorServiceIntegration:
    """Integration tests for VendorService."""

    def test_full_vendor_lifecycle(self, vendor_factory, operating_rules_factory):
        """Test complete vendor workflow."""
        # Create vendor with rules
        vendor = vendor_factory(
            name='Integration Test Vendor',
            code='VENDOR_INTEGRATION',
            service_category='CATERING'
        )
        operating_rules_factory(vendor=vendor, minimum_lead_days=14)

        # Create packages and assign vendor
        package1 = ProductOptionFactory(package=True, name='Package A', is_active=True)
        package2 = ProductOptionFactory(package=True, name='Package B', is_active=True)

        VendorService.assign_vendor_to_package(
            package_id=package1.id,
            vendor_id=vendor.id,
            notes='Catering for Package A'
        )
        VendorService.assign_vendor_to_package(
            package_id=package2.id,
            vendor_id=vendor.id,
            notes='Catering for Package B'
        )

        # Verify vendor can be retrieved
        retrieved = VendorService.get_vendor_by_code('VENDOR_INTEGRATION')
        assert retrieved is not None
        assert retrieved.vendor_operating_rules.minimum_lead_days == 14

        # Verify vendor appears in active vendors
        active_vendors = VendorService.get_active_vendors()
        assert vendor in active_vendors

        # Verify vendor appears in category filter
        category_vendors = VendorService.get_vendors_by_category('CATERING')
        assert vendor in category_vendors

        # Verify packages for vendor
        vendor_packages = VendorService.get_packages_for_vendor(vendor.id)
        assert vendor_packages.count() == 2

        # Verify vendors for package
        package_vendors = VendorService.get_package_vendors(package1.id)
        assert package_vendors.count() == 1
        assert package_vendors.first().vendor == vendor

    def test_vendor_visibility_rules(self, vendor_factory):
        """Test that vendor visibility is controlled by is_active and is_bookable."""
        # Active and bookable
        visible_vendor = vendor_factory(
            name='Visible',
            is_active=True,
            is_bookable=True,
            service_category='DJ'
        )

        # Inactive
        vendor_factory(
            name='Inactive',
            is_active=False,
            is_bookable=True,
            service_category='DJ'
        )

        # Not bookable
        vendor_factory(
            name='Not Bookable',
            is_active=True,
            is_bookable=False,
            service_category='DJ'
        )

        # Active vendors should only return visible vendor
        active = VendorService.get_active_vendors()
        assert active.count() == 1
        assert visible_vendor in active

        # Category filter should also respect visibility
        dj_vendors = VendorService.get_vendors_by_category('DJ')
        assert dj_vendors.count() == 1
        assert visible_vendor in dj_vendors
