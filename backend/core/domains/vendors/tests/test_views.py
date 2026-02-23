"""
Unit tests for vendors domain views.

Tests:
- VendorViewSet (CRUD operations, filters, custom actions, permissions)
- PackageVendorViewSet (CRUD operations, by_package, bulk_assign, permissions)
- PublicVendorViewSet (read-only public access)
"""

from decimal import Decimal

from rest_framework import status

import pytest

from core.domains.vendors.models import PackageVendor, Vendor, VendorOperatingRules
from core.factories.products import ProductOptionFactory

# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def vendor_factory(db):
    """Factory function for creating Vendor instances."""
    counter = [0]

    def _create_vendor(**kwargs):
        counter[0] += 1
        defaults = {
            "name": f"Test Vendor {counter[0]}",
            "code": f"VENDOR_TEST_{counter[0]}",
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


# =============================================================================
# VENDOR VIEWSET TESTS - LIST
# =============================================================================


@pytest.mark.django_db
class TestVendorViewSetList:
    """Tests for VendorViewSet list endpoint."""

    def test_list_vendors_requires_admin(self, api_client, vendor_factory):
        """Test that listing vendors requires admin permissions."""
        vendor_factory(name="Test Vendor List")

        response = api_client.get("/api/vendors/vendors/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_vendors_as_client_forbidden(self, client_user_client, vendor_factory):
        """Test that client users cannot list vendors."""
        vendor_factory(name="Test Vendor Client")

        response = client_user_client.get("/api/vendors/vendors/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_vendors_as_admin(self, admin_client, vendor_factory):
        """Test admin can list vendors."""
        v1 = vendor_factory(name="Vendor List A1")
        v2 = vendor_factory(name="Vendor List A2")

        response = admin_client.get("/api/vendors/vendors/")

        assert response.status_code == status.HTTP_200_OK
        vendor_ids = [v["id"] for v in response.data["results"]]
        assert v1.id in vendor_ids
        assert v2.id in vendor_ids

    def test_list_vendors_filter_is_active(self, admin_client, vendor_factory):
        """Test filtering vendors by is_active status."""
        active = vendor_factory(name="Active Vendor F", is_active=True)
        inactive = vendor_factory(name="Inactive Vendor F", is_active=False)

        response = admin_client.get("/api/vendors/vendors/", {"is_active": "true"})

        assert response.status_code == status.HTTP_200_OK
        vendor_ids = [v["id"] for v in response.data["results"]]
        assert active.id in vendor_ids
        assert inactive.id not in vendor_ids

    def test_list_vendors_filter_is_bookable(self, admin_client, vendor_factory):
        """Test filtering vendors by is_bookable status."""
        bookable = vendor_factory(name="Bookable Vendor F", is_bookable=True)
        not_bookable = vendor_factory(name="Not Bookable Vendor F", is_bookable=False)

        response = admin_client.get("/api/vendors/vendors/", {"is_bookable": "true"})

        assert response.status_code == status.HTTP_200_OK
        vendor_ids = [v["id"] for v in response.data["results"]]
        assert bookable.id in vendor_ids
        assert not_bookable.id not in vendor_ids

    def test_list_vendors_filter_service_category(self, admin_client, vendor_factory):
        """Test filtering vendors by service_category."""
        catering = vendor_factory(name="Catering Vendor F", service_category="CATERING")
        photography = vendor_factory(name="Photography Vendor F", service_category="PHOTOGRAPHY")

        response = admin_client.get("/api/vendors/vendors/", {"service_category": "CATERING"})

        assert response.status_code == status.HTTP_200_OK
        vendor_ids = [v["id"] for v in response.data["results"]]
        assert catering.id in vendor_ids
        assert photography.id not in vendor_ids

    def test_list_vendors_search(self, admin_client, vendor_factory):
        """Test searching vendors."""
        v1 = vendor_factory(name="UniqueSearchVendor Catering")
        v2 = vendor_factory(name="UniqueSearchVendor Photography")
        v3 = vendor_factory(name="Different Vendor")

        response = admin_client.get("/api/vendors/vendors/", {"search": "UniqueSearchVendor"})

        assert response.status_code == status.HTTP_200_OK
        vendor_ids = [v["id"] for v in response.data["results"]]
        assert v1.id in vendor_ids
        assert v2.id in vendor_ids
        assert v3.id not in vendor_ids

    def test_list_vendors_search_by_code(self, admin_client, vendor_factory):
        """Test searching vendors by code."""
        vendor = vendor_factory(name="Test Vendor", code="VENDOR_UNIQUE_CODE_ABC")

        response = admin_client.get("/api/vendors/vendors/", {"search": "UNIQUE_CODE_ABC"})

        assert response.status_code == status.HTTP_200_OK
        vendor_ids = [v["id"] for v in response.data["results"]]
        assert vendor.id in vendor_ids

    def test_list_vendors_ordering(self, admin_client, vendor_factory):
        """Test vendors are ordered by sort_order and name."""
        vendor_factory(name="C Vendor Order", sort_order=1)
        vendor_factory(name="A Vendor Order", sort_order=0)
        vendor_factory(name="B Vendor Order", sort_order=0)

        response = admin_client.get("/api/vendors/vendors/")

        assert response.status_code == status.HTTP_200_OK
        vendor_names = [v["name"] for v in response.data["results"]]
        # A and B should come before C (same sort_order, alphabetical)
        assert vendor_names.index("A Vendor Order") < vendor_names.index("C Vendor Order")
        assert vendor_names.index("B Vendor Order") < vendor_names.index("C Vendor Order")


# =============================================================================
# VENDOR VIEWSET TESTS - RETRIEVE
# =============================================================================


@pytest.mark.django_db
class TestVendorViewSetRetrieve:
    """Tests for VendorViewSet retrieve endpoint."""

    def test_retrieve_vendor_requires_admin(self, api_client, vendor_factory):
        """Test that retrieving a vendor requires admin permissions."""
        vendor = vendor_factory(name="Test Vendor Retrieve")

        response = api_client.get(f"/api/vendors/vendors/{vendor.id}/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_vendor_as_admin(self, admin_client, vendor_factory, operating_rules_factory):
        """Test admin can retrieve vendor details."""
        vendor = vendor_factory(name="Test Vendor R", description="Test Description")
        operating_rules_factory(vendor=vendor, minimum_lead_days=14)

        response = admin_client.get(f"/api/vendors/vendors/{vendor.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Test Vendor R"
        assert response.data["description"] == "Test Description"
        assert response.data["operating_rules"]["minimum_lead_days"] == 14

    def test_retrieve_nonexistent_vendor(self, admin_client):
        """Test retrieving a nonexistent vendor returns 404."""
        response = admin_client.get("/api/vendors/vendors/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_vendor_includes_packages(self, admin_client, vendor_factory, package_vendor_factory):
        """Test retrieve includes packages that use this vendor."""
        vendor = vendor_factory(name="Vendor With Packages")
        package = ProductOptionFactory(package=True, name="Test Package", is_active=True)
        package_vendor_factory(vendor=vendor, package=package, notes="Test notes")

        response = admin_client.get(f"/api/vendors/vendors/{vendor.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["packages"]) == 1
        assert response.data["packages"][0]["name"] == "Test Package"


# =============================================================================
# VENDOR VIEWSET TESTS - CREATE
# =============================================================================


@pytest.mark.django_db
class TestVendorViewSetCreate:
    """Tests for VendorViewSet create endpoint."""

    def test_create_vendor_requires_admin(self, api_client):
        """Test that creating a vendor requires admin permissions."""
        data = {"name": "New Vendor Auth", "code": "VENDOR_NEW_AUTH", "service_category": "CATERING"}

        response = api_client.post("/api/vendors/vendors/", data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_vendor_as_client_forbidden(self, client_user_client):
        """Test that client users cannot create vendors."""
        data = {"name": "New Vendor Client", "code": "VENDOR_NEW_CLIENT", "service_category": "CATERING"}

        response = client_user_client.post("/api/vendors/vendors/", data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_vendor_as_admin(self, admin_client):
        """Test admin can create vendors."""
        data = {
            "name": "New Vendor Admin",
            "code": "VENDOR_NEW_ADMIN",
            "service_category": "CATERING",
            "description": "Test vendor description",
            "is_active": True,
            "is_bookable": True,
        }

        response = admin_client.post("/api/vendors/vendors/", data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Vendor Admin"
        assert response.data["code"] == "VENDOR_NEW_ADMIN"
        assert Vendor.objects.filter(code="VENDOR_NEW_ADMIN").exists()

    def test_create_vendor_with_operating_rules(self, admin_client):
        """Test admin can create vendor with operating rules."""
        data = {
            "name": "Vendor With Rules",
            "code": "VENDOR_WITH_RULES",
            "service_category": "PHOTOGRAPHY",
            "operating_rules": {
                "minimum_lead_days": 14,
                "minimum_service_hours": "3.0",
                "maximum_service_hours": "10.0",
            },
        }

        response = admin_client.post("/api/vendors/vendors/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        vendor = Vendor.objects.get(code="VENDOR_WITH_RULES")
        assert vendor.vendor_operating_rules.minimum_lead_days == 14

    def test_create_vendor_code_uppercase(self, admin_client):
        """Test vendor code is automatically uppercased."""
        data = {"name": "Test Vendor", "code": "vendor_lowercase", "service_category": "CATERING"}

        response = admin_client.post("/api/vendors/vendors/", data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["code"] == "VENDOR_LOWERCASE"

    def test_create_vendor_unique_code_required(self, admin_client, vendor_factory):
        """Test vendor code must be unique."""
        vendor_factory(code="VENDOR_UNIQUE")

        data = {"name": "Another Vendor", "code": "VENDOR_UNIQUE", "service_category": "CATERING"}

        response = admin_client.post("/api/vendors/vendors/", data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_vendor_with_contact_info(self, admin_client):
        """Test admin can create vendor with full contact information."""
        data = {
            "name": "Full Contact Vendor",
            "code": "VENDOR_FULL_CONTACT",
            "service_category": "CATERING",
            "contact_name": "John Smith",
            "contact_email": "john@vendor.com",
            "contact_phone": "+1234567890",
            "company_name": "Smith Catering Inc.",
            "address": "123 Main St",
            "website": "https://smithcatering.com",
        }

        response = admin_client.post("/api/vendors/vendors/", data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["contact_name"] == "John Smith"
        assert response.data["contact_email"] == "john@vendor.com"


# =============================================================================
# VENDOR VIEWSET TESTS - UPDATE
# =============================================================================


@pytest.mark.django_db
class TestVendorViewSetUpdate:
    """Tests for VendorViewSet update endpoint."""

    def test_update_vendor_requires_admin(self, api_client, vendor_factory):
        """Test that updating a vendor requires admin permissions."""
        vendor = vendor_factory(name="Original Vendor")

        response = api_client.put(
            f"/api/vendors/vendors/{vendor.id}/",
            {"name": "Updated", "code": vendor.code, "service_category": "CATERING"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_vendor_as_admin(self, admin_client, vendor_factory):
        """Test admin can update vendors."""
        vendor = vendor_factory(name="Original Vendor U", description="Old")

        response = admin_client.put(
            f"/api/vendors/vendors/{vendor.id}/",
            {
                "name": "Updated Vendor U",
                "code": vendor.code,
                "service_category": "PHOTOGRAPHY",
                "description": "New description",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated Vendor U"
        assert response.data["service_category"] == "PHOTOGRAPHY"

    def test_partial_update_vendor_as_admin(self, admin_client, vendor_factory):
        """Test partial update of vendor."""
        vendor = vendor_factory(name="Original Vendor P", description="Old")

        response = admin_client.patch(f"/api/vendors/vendors/{vendor.id}/", {"name": "Partial Updated Vendor"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Partial Updated Vendor"
        assert response.data["description"] == "Old"

    def test_update_vendor_with_operating_rules(self, admin_client, vendor_factory, operating_rules_factory):
        """Test updating vendor updates operating rules."""
        vendor = vendor_factory(name="Vendor Rules Update")
        operating_rules_factory(vendor=vendor, minimum_lead_days=7)

        response = admin_client.patch(
            f"/api/vendors/vendors/{vendor.id}/",
            {"name": "Updated Vendor Rules", "operating_rules": {"minimum_lead_days": 21}},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        vendor.refresh_from_db()
        assert vendor.vendor_operating_rules.minimum_lead_days == 21


# =============================================================================
# VENDOR VIEWSET TESTS - DELETE
# =============================================================================


@pytest.mark.django_db
class TestVendorViewSetDelete:
    """Tests for VendorViewSet delete endpoint."""

    def test_delete_vendor_requires_admin(self, api_client, vendor_factory):
        """Test that deleting a vendor requires admin permissions."""
        vendor = vendor_factory(name="To Delete Auth")

        response = api_client.delete(f"/api/vendors/vendors/{vendor.id}/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_vendor_as_admin(self, admin_client, vendor_factory):
        """Test admin can delete vendors."""
        vendor = vendor_factory(name="To Delete Admin")
        vendor_id = vendor.id

        response = admin_client.delete(f"/api/vendors/vendors/{vendor_id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Vendor.objects.filter(id=vendor_id).exists()


# =============================================================================
# VENDOR VIEWSET TESTS - CUSTOM ACTIONS
# =============================================================================


@pytest.mark.django_db
class TestVendorViewSetAllEndpoint:
    """Tests for VendorViewSet all endpoint."""

    def test_all_endpoint_requires_admin(self, api_client, vendor_factory):
        """Test all endpoint requires admin permissions."""
        vendor_factory(name="All Vendor")

        response = api_client.get("/api/vendors/vendors/all/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_all_endpoint_returns_unpaginated_as_admin(self, admin_client, vendor_factory):
        """Test all endpoint returns unpaginated results."""
        vendors = [vendor_factory(name=f"All Vendor {i}") for i in range(3)]

        response = admin_client.get("/api/vendors/vendors/all/")

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        vendor_ids = [v["id"] for v in response.data]
        for vendor in vendors:
            assert vendor.id in vendor_ids


@pytest.mark.django_db
class TestVendorViewSetActiveEndpoint:
    """Tests for VendorViewSet active endpoint."""

    def test_active_endpoint_requires_admin(self, api_client, vendor_factory):
        """Test active endpoint requires admin permissions."""
        vendor_factory(name="Active Vendor E")

        response = api_client.get("/api/vendors/vendors/active/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_active_endpoint_returns_active_bookable_vendors(self, admin_client, vendor_factory):
        """Test active endpoint returns only active and bookable vendors."""
        active_bookable = vendor_factory(name="Active Bookable", is_active=True, is_bookable=True)
        inactive = vendor_factory(name="Inactive", is_active=False, is_bookable=True)
        not_bookable = vendor_factory(name="Not Bookable", is_active=True, is_bookable=False)

        response = admin_client.get("/api/vendors/vendors/active/")

        assert response.status_code == status.HTTP_200_OK
        vendor_ids = [v["id"] for v in response.data]
        assert active_bookable.id in vendor_ids
        assert inactive.id not in vendor_ids
        assert not_bookable.id not in vendor_ids


@pytest.mark.django_db
class TestVendorViewSetOperatingRulesEndpoint:
    """Tests for VendorViewSet operating_rules endpoint."""

    def test_operating_rules_get_requires_admin(self, api_client, vendor_factory):
        """Test operating_rules GET requires admin permissions."""
        vendor = vendor_factory()

        response = api_client.get(f"/api/vendors/vendors/{vendor.id}/operating_rules/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_operating_rules_get_returns_rules(self, admin_client, vendor_factory, operating_rules_factory):
        """Test operating_rules GET returns vendor's rules."""
        vendor = vendor_factory()
        operating_rules_factory(vendor=vendor, minimum_lead_days=14)

        response = admin_client.get(f"/api/vendors/vendors/{vendor.id}/operating_rules/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["minimum_lead_days"] == 14

    def test_operating_rules_get_returns_404_when_no_rules(self, admin_client, vendor_factory):
        """Test operating_rules GET returns 404 when no rules exist."""
        vendor = vendor_factory()

        response = admin_client.get(f"/api/vendors/vendors/{vendor.id}/operating_rules/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_operating_rules_put_updates_rules(self, admin_client, vendor_factory, operating_rules_factory):
        """Test operating_rules PUT updates existing rules."""
        vendor = vendor_factory()
        operating_rules_factory(vendor=vendor, minimum_lead_days=7)

        response = admin_client.put(
            f"/api/vendors/vendors/{vendor.id}/operating_rules/",
            {"minimum_lead_days": 21, "minimum_service_hours": "4.0", "maximum_service_hours": "12.0"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["minimum_lead_days"] == 21

    def test_operating_rules_put_creates_rules_if_none_exist(self, admin_client, vendor_factory):
        """Test operating_rules PUT creates rules if they don't exist."""
        vendor = vendor_factory()

        response = admin_client.put(
            f"/api/vendors/vendors/{vendor.id}/operating_rules/", {"minimum_lead_days": 14, "setup_hours": "1.5"}
        )

        assert response.status_code == status.HTTP_200_OK
        vendor.refresh_from_db()
        assert vendor.vendor_operating_rules.minimum_lead_days == 14

    def test_operating_rules_patch_partial_update(self, admin_client, vendor_factory, operating_rules_factory):
        """Test operating_rules PATCH does partial update."""
        vendor = vendor_factory()
        operating_rules_factory(vendor=vendor, minimum_lead_days=7, setup_hours=Decimal("1.0"))

        response = admin_client.patch(f"/api/vendors/vendors/{vendor.id}/operating_rules/", {"minimum_lead_days": 14})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["minimum_lead_days"] == 14
        # setup_hours should remain unchanged
        assert Decimal(response.data["setup_hours"]) == Decimal("1.0")


@pytest.mark.django_db
class TestVendorViewSetPackagesEndpoint:
    """Tests for VendorViewSet packages endpoint."""

    def test_packages_endpoint_requires_admin(self, api_client, vendor_factory):
        """Test packages endpoint requires admin permissions."""
        vendor = vendor_factory()

        response = api_client.get(f"/api/vendors/vendors/{vendor.id}/packages/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_packages_endpoint_returns_vendor_packages(self, admin_client, vendor_factory, package_vendor_factory):
        """Test packages endpoint returns packages for vendor."""
        vendor = vendor_factory()
        package1 = ProductOptionFactory(package=True, name="Package A", is_active=True)
        package2 = ProductOptionFactory(package=True, name="Package B", is_active=True)
        inactive_package = ProductOptionFactory(package=True, name="Inactive Package", is_active=False)

        package_vendor_factory(vendor=vendor, package=package1)
        package_vendor_factory(vendor=vendor, package=package2)
        package_vendor_factory(vendor=vendor, package=inactive_package)

        response = admin_client.get(f"/api/vendors/vendors/{vendor.id}/packages/")

        assert response.status_code == status.HTTP_200_OK
        # Only active packages should be returned
        assert len(response.data) == 2

    def test_packages_endpoint_empty_when_no_packages(self, admin_client, vendor_factory):
        """Test packages endpoint returns empty list when vendor has no packages."""
        vendor = vendor_factory()

        response = admin_client.get(f"/api/vendors/vendors/{vendor.id}/packages/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data == []


@pytest.mark.django_db
class TestVendorViewSetCategoriesEndpoint:
    """Tests for VendorViewSet categories endpoint."""

    def test_categories_endpoint_requires_admin(self, api_client):
        """Test categories endpoint requires admin permissions."""
        response = api_client.get("/api/vendors/vendors/categories/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_categories_endpoint_returns_all_categories(self, admin_client):
        """Test categories endpoint returns all service categories."""
        response = admin_client.get("/api/vendors/vendors/categories/")

        assert response.status_code == status.HTTP_200_OK
        categories = [c["value"] for c in response.data]
        assert "CATERING" in categories
        assert "PHOTOGRAPHY" in categories
        assert "DJ" in categories


# =============================================================================
# PACKAGE VENDOR VIEWSET TESTS - LIST
# =============================================================================


@pytest.mark.django_db
class TestPackageVendorViewSetList:
    """Tests for PackageVendorViewSet list endpoint."""

    def test_list_package_vendors_requires_admin(self, api_client, package_vendor_factory):
        """Test that listing package-vendors requires admin permissions."""
        package_vendor_factory()

        response = api_client.get("/api/vendors/package-vendors/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_package_vendors_as_admin(self, admin_client, package_vendor_factory):
        """Test admin can list package-vendors."""
        pv1 = package_vendor_factory()
        pv2 = package_vendor_factory()

        response = admin_client.get("/api/vendors/package-vendors/")

        assert response.status_code == status.HTTP_200_OK
        pv_ids = [pv["id"] for pv in response.data["results"]]
        assert pv1.id in pv_ids
        assert pv2.id in pv_ids

    def test_list_package_vendors_filter_by_package(self, admin_client, vendor_factory, package_vendor_factory):
        """Test filtering package-vendors by package_id."""
        package1 = ProductOptionFactory(package=True)
        package2 = ProductOptionFactory(package=True)
        vendor = vendor_factory()

        pv1 = package_vendor_factory(vendor=vendor, package=package1)
        pv2 = package_vendor_factory(vendor=vendor_factory(), package=package2)

        response = admin_client.get("/api/vendors/package-vendors/", {"package_id": package1.id})

        assert response.status_code == status.HTTP_200_OK
        pv_ids = [pv["id"] for pv in response.data["results"]]
        assert pv1.id in pv_ids
        assert pv2.id not in pv_ids

    def test_list_package_vendors_filter_by_vendor(self, admin_client, vendor_factory, package_vendor_factory):
        """Test filtering package-vendors by vendor_id."""
        vendor1 = vendor_factory()
        vendor2 = vendor_factory()

        pv1 = package_vendor_factory(vendor=vendor1)
        pv2 = package_vendor_factory(vendor=vendor2)

        response = admin_client.get("/api/vendors/package-vendors/", {"vendor_id": vendor1.id})

        assert response.status_code == status.HTTP_200_OK
        pv_ids = [pv["id"] for pv in response.data["results"]]
        assert pv1.id in pv_ids
        assert pv2.id not in pv_ids


# =============================================================================
# PACKAGE VENDOR VIEWSET TESTS - CRUD
# =============================================================================


@pytest.mark.django_db
class TestPackageVendorViewSetCreate:
    """Tests for PackageVendorViewSet create endpoint."""

    def test_create_package_vendor_requires_admin(self, api_client, vendor_factory):
        """Test that creating package-vendor requires admin permissions."""
        vendor = vendor_factory()
        package = ProductOptionFactory(package=True)

        data = {"vendor": vendor.id, "package": package.id}
        response = api_client.post("/api/vendors/package-vendors/", data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_package_vendor_as_admin(self, admin_client, vendor_factory):
        """Test admin can create package-vendor assignments."""
        vendor = vendor_factory()
        package = ProductOptionFactory(package=True)

        data = {"vendor": vendor.id, "package": package.id, "notes": "Test notes", "sort_order": 1}
        response = admin_client.post("/api/vendors/package-vendors/", data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["vendor"] == vendor.id
        assert response.data["package"] == package.id
        assert response.data["notes"] == "Test notes"

    def test_create_package_vendor_only_for_packages(self, admin_client, vendor_factory):
        """Test that vendors can only be assigned to packages (not products)."""
        vendor = vendor_factory()
        product = ProductOptionFactory(type="PRODUCT")

        data = {"vendor": vendor.id, "package": product.id}
        response = admin_client.post("/api/vendors/package-vendors/", data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPackageVendorViewSetRetrieve:
    """Tests for PackageVendorViewSet retrieve endpoint."""

    def test_retrieve_package_vendor_requires_admin(self, api_client, package_vendor_factory):
        """Test that retrieving package-vendor requires admin permissions."""
        pv = package_vendor_factory()

        response = api_client.get(f"/api/vendors/package-vendors/{pv.id}/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_package_vendor_as_admin(self, admin_client, package_vendor_factory):
        """Test admin can retrieve package-vendor details."""
        pv = package_vendor_factory(notes="Detailed notes")

        response = admin_client.get(f"/api/vendors/package-vendors/{pv.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["notes"] == "Detailed notes"


@pytest.mark.django_db
class TestPackageVendorViewSetUpdate:
    """Tests for PackageVendorViewSet update endpoint."""

    def test_update_package_vendor_requires_admin(self, api_client, package_vendor_factory):
        """Test that updating package-vendor requires admin permissions."""
        pv = package_vendor_factory()

        response = api_client.patch(f"/api/vendors/package-vendors/{pv.id}/", {"notes": "Updated"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_package_vendor_as_admin(self, admin_client, package_vendor_factory):
        """Test admin can update package-vendor."""
        pv = package_vendor_factory(notes="Old notes")

        response = admin_client.patch(f"/api/vendors/package-vendors/{pv.id}/", {"notes": "New notes", "sort_order": 5})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["notes"] == "New notes"
        assert response.data["sort_order"] == 5


@pytest.mark.django_db
class TestPackageVendorViewSetDelete:
    """Tests for PackageVendorViewSet delete endpoint."""

    def test_delete_package_vendor_requires_admin(self, api_client, package_vendor_factory):
        """Test that deleting package-vendor requires admin permissions."""
        pv = package_vendor_factory()

        response = api_client.delete(f"/api/vendors/package-vendors/{pv.id}/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_package_vendor_as_admin(self, admin_client, package_vendor_factory):
        """Test admin can delete package-vendor."""
        pv = package_vendor_factory()
        pv_id = pv.id

        response = admin_client.delete(f"/api/vendors/package-vendors/{pv_id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not PackageVendor.objects.filter(id=pv_id).exists()


# =============================================================================
# PACKAGE VENDOR VIEWSET TESTS - CUSTOM ACTIONS
# =============================================================================


@pytest.mark.django_db
class TestPackageVendorViewSetByPackageEndpoint:
    """Tests for PackageVendorViewSet by_package endpoint."""

    def test_by_package_requires_admin(self, api_client):
        """Test by_package endpoint requires admin permissions."""
        response = api_client.get("/api/vendors/package-vendors/by_package/", {"package_id": 1})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_by_package_requires_package_id(self, admin_client):
        """Test by_package endpoint requires package_id parameter."""
        response = admin_client.get("/api/vendors/package-vendors/by_package/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "package_id is required" in response.data["error"]

    def test_by_package_returns_vendors(self, admin_client, vendor_factory, package_vendor_factory):
        """Test by_package endpoint returns vendors for package."""
        package = ProductOptionFactory(package=True)
        vendor1 = vendor_factory(name="Vendor BP1")
        vendor2 = vendor_factory(name="Vendor BP2")

        package_vendor_factory(vendor=vendor1, package=package, sort_order=0)
        package_vendor_factory(vendor=vendor2, package=package, sort_order=1)

        response = admin_client.get("/api/vendors/package-vendors/by_package/", {"package_id": package.id})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2


@pytest.mark.django_db
class TestPackageVendorViewSetBulkAssignEndpoint:
    """Tests for PackageVendorViewSet bulk_assign endpoint."""

    def test_bulk_assign_requires_admin(self, api_client, vendor_factory):
        """Test bulk_assign endpoint requires admin permissions."""
        package = ProductOptionFactory(package=True)
        vendor = vendor_factory()

        response = api_client.post(
            "/api/vendors/package-vendors/bulk_assign/",
            {"package_id": package.id, "vendors": [{"vendor_id": vendor.id}]},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_bulk_assign_requires_package_id(self, admin_client, vendor_factory):
        """Test bulk_assign endpoint requires package_id parameter."""
        vendor = vendor_factory()

        response = admin_client.post(
            "/api/vendors/package-vendors/bulk_assign/", {"vendors": [{"vendor_id": vendor.id}]}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "package_id is required" in response.data["error"]

    def test_bulk_assign_creates_assignments(self, admin_client, vendor_factory):
        """Test bulk_assign creates multiple vendor assignments."""
        package = ProductOptionFactory(package=True)
        vendor1 = vendor_factory()
        vendor2 = vendor_factory()

        response = admin_client.post(
            "/api/vendors/package-vendors/bulk_assign/",
            {
                "package_id": package.id,
                "vendors": [
                    {"vendor_id": vendor1.id, "notes": "Note 1", "sort_order": 0},
                    {"vendor_id": vendor2.id, "notes": "Note 2", "sort_order": 1},
                ],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2
        assert PackageVendor.objects.filter(package=package).count() == 2

    def test_bulk_assign_clears_existing_assignments(self, admin_client, vendor_factory, package_vendor_factory):
        """Test bulk_assign clears existing assignments before creating new ones."""
        package = ProductOptionFactory(package=True)
        old_vendor = vendor_factory(name="Old Vendor")
        new_vendor = vendor_factory(name="New Vendor")

        # Create existing assignment
        package_vendor_factory(vendor=old_vendor, package=package)
        assert PackageVendor.objects.filter(package=package, vendor=old_vendor).exists()

        # Bulk assign with new vendor only
        response = admin_client.post(
            "/api/vendors/package-vendors/bulk_assign/",
            {"package_id": package.id, "vendors": [{"vendor_id": new_vendor.id}]},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert not PackageVendor.objects.filter(package=package, vendor=old_vendor).exists()
        assert PackageVendor.objects.filter(package=package, vendor=new_vendor).exists()


# =============================================================================
# PUBLIC VENDOR VIEWSET TESTS
# =============================================================================


@pytest.mark.django_db
class TestPublicVendorViewSetList:
    """Tests for PublicVendorViewSet list endpoint."""

    def test_list_public_vendors_allows_anonymous(self, api_client, vendor_factory):
        """Test that public vendor list is publicly accessible."""
        vendor = vendor_factory(name="Public Vendor", is_active=True, is_bookable=True)

        response = api_client.get("/api/vendors/public/vendors/")

        assert response.status_code == status.HTTP_200_OK
        vendor_ids = [v["id"] for v in response.data["results"]]
        assert vendor.id in vendor_ids

    def test_list_public_vendors_only_active_bookable(self, api_client, vendor_factory):
        """Test public endpoint only returns active and bookable vendors."""
        active_bookable = vendor_factory(name="Public Active", is_active=True, is_bookable=True)
        inactive = vendor_factory(name="Public Inactive", is_active=False, is_bookable=True)
        not_bookable = vendor_factory(name="Public Not Bookable", is_active=True, is_bookable=False)

        response = api_client.get("/api/vendors/public/vendors/")

        assert response.status_code == status.HTTP_200_OK
        vendor_ids = [v["id"] for v in response.data["results"]]
        assert active_bookable.id in vendor_ids
        assert inactive.id not in vendor_ids
        assert not_bookable.id not in vendor_ids

    def test_list_public_vendors_limited_fields(self, api_client, vendor_factory):
        """Test public endpoint returns limited fields (no contact info)."""
        vendor_factory(
            name="Public Vendor Fields",
            contact_email="private@vendor.com",
            contact_phone="123456789",
            is_active=True,
            is_bookable=True,
        )

        response = api_client.get("/api/vendors/public/vendors/")

        assert response.status_code == status.HTTP_200_OK
        vendor_data = response.data["results"][0]
        # Should have public fields
        assert "name" in vendor_data
        assert "code" in vendor_data
        assert "description" in vendor_data
        assert "service_category" in vendor_data
        # Should NOT have private fields
        assert "contact_email" not in vendor_data
        assert "contact_phone" not in vendor_data
        assert "contact_name" not in vendor_data


@pytest.mark.django_db
class TestPublicVendorViewSetRetrieve:
    """Tests for PublicVendorViewSet retrieve endpoint."""

    def test_retrieve_public_vendor_allows_anonymous(self, api_client, vendor_factory):
        """Test that public vendor retrieve is publicly accessible."""
        vendor = vendor_factory(name="Public Retrieve Vendor", is_active=True, is_bookable=True)

        response = api_client.get(f"/api/vendors/public/vendors/{vendor.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Public Retrieve Vendor"

    def test_retrieve_public_vendor_404_for_inactive(self, api_client, vendor_factory):
        """Test that inactive vendors are not publicly accessible."""
        vendor = vendor_factory(name="Inactive Vendor", is_active=False, is_bookable=True)

        response = api_client.get(f"/api/vendors/public/vendors/{vendor.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_public_vendor_404_for_not_bookable(self, api_client, vendor_factory):
        """Test that non-bookable vendors are not publicly accessible."""
        vendor = vendor_factory(name="Not Bookable Vendor", is_active=True, is_bookable=False)

        response = api_client.get(f"/api/vendors/public/vendors/{vendor.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_nonexistent_public_vendor(self, api_client):
        """Test retrieving a nonexistent vendor returns 404."""
        response = api_client.get("/api/vendors/public/vendors/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestPublicVendorViewSetReadOnly:
    """Tests that PublicVendorViewSet is read-only."""

    def test_create_not_allowed_on_public(self, api_client):
        """Test that creating vendors is not allowed on public endpoint."""
        data = {"name": "New Public Vendor", "code": "VENDOR_PUBLIC_NEW", "service_category": "CATERING"}

        response = api_client.post("/api/vendors/public/vendors/", data)

        # Should be method not allowed (405) since it's read-only
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_update_not_allowed_on_public(self, api_client, vendor_factory):
        """Test that updating vendors is not allowed on public endpoint."""
        vendor = vendor_factory(is_active=True, is_bookable=True)

        response = api_client.patch(f"/api/vendors/public/vendors/{vendor.id}/", {"name": "Updated"})

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_delete_not_allowed_on_public(self, api_client, vendor_factory):
        """Test that deleting vendors is not allowed on public endpoint."""
        vendor = vendor_factory(is_active=True, is_bookable=True)

        response = api_client.delete(f"/api/vendors/public/vendors/{vendor.id}/")

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


# =============================================================================
# PAGINATION TESTS
# =============================================================================


@pytest.mark.django_db
class TestVendorViewSetPagination:
    """Tests for pagination in VendorViewSet."""

    def test_vendor_list_is_paginated(self, admin_client, vendor_factory):
        """Test that vendor list returns paginated results."""
        for i in range(5):
            vendor_factory(name=f"Paginated Vendor {i}")

        response = admin_client.get("/api/vendors/vendors/")

        assert response.status_code == status.HTTP_200_OK
        assert "count" in response.data
        assert "next" in response.data
        assert "previous" in response.data
        assert "results" in response.data

    def test_vendor_list_respects_page_size(self, admin_client, vendor_factory):
        """Test that page_size parameter works."""
        for i in range(10):
            vendor_factory(name=f"Page Size Vendor {i}")

        response = admin_client.get("/api/vendors/vendors/", {"page_size": 3})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3
