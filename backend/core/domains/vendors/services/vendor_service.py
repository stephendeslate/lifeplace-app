# backend/core/domains/vendors/services/vendor_service.py

from django.db.models import QuerySet

from ..models import PackageVendor, Vendor


class VendorService:
    """Service class for vendor-related business logic"""

    @staticmethod
    def get_active_vendors() -> QuerySet[Vendor]:
        """Get all active and bookable vendors"""
        return Vendor.objects.filter(is_active=True, is_bookable=True).order_by("sort_order", "name")

    @staticmethod
    def get_vendor_by_id(vendor_id: int) -> Vendor | None:
        """Get a vendor by ID with prefetched operating rules"""
        try:
            return Vendor.objects.select_related("vendor_operating_rules").get(id=vendor_id)
        except Vendor.DoesNotExist:
            return None

    @staticmethod
    def get_vendor_by_code(code: str) -> Vendor | None:
        """Get a vendor by code with prefetched operating rules"""
        try:
            return Vendor.objects.select_related("vendor_operating_rules").get(code=code.upper())
        except Vendor.DoesNotExist:
            return None

    @staticmethod
    def get_package_vendors(package_id: int) -> QuerySet[PackageVendor]:
        """Get all vendors for a package, ordered by sort_order"""
        return (
            PackageVendor.objects.filter(package_id=package_id)
            .select_related("vendor", "vendor__vendor_operating_rules")
            .order_by("sort_order", "vendor__name")
        )

    @staticmethod
    def get_vendors_by_category(category: str) -> QuerySet[Vendor]:
        """Get all active vendors in a specific category"""
        return Vendor.objects.filter(is_active=True, is_bookable=True, service_category=category.upper()).order_by(
            "sort_order", "name"
        )

    @staticmethod
    def get_packages_for_vendor(vendor_id: int) -> QuerySet[PackageVendor]:
        """Get all packages that include a vendor"""
        return (
            PackageVendor.objects.filter(vendor_id=vendor_id, package__is_active=True)
            .select_related("package")
            .order_by("package__name")
        )

    @staticmethod
    def assign_vendor_to_package(
        package_id: int, vendor_id: int, notes: str = "", sort_order: int = 0
    ) -> PackageVendor:
        """Assign a vendor to a package"""
        return PackageVendor.objects.create(
            package_id=package_id, vendor_id=vendor_id, notes=notes, sort_order=sort_order
        )

    @staticmethod
    def bulk_assign_vendors(package_id: int, vendor_assignments: list[dict]) -> list[PackageVendor]:
        """
        Bulk assign vendors to a package.

        Args:
            package_id: ID of the package
            vendor_assignments: List of dicts with vendor_id, notes, sort_order

        Returns:
            List of created PackageVendor instances
        """
        created = []
        for assignment in vendor_assignments:
            pv, _ = PackageVendor.objects.update_or_create(
                package_id=package_id,
                vendor_id=assignment["vendor_id"],
                defaults={"notes": assignment.get("notes", ""), "sort_order": assignment.get("sort_order", 0)},
            )
            created.append(pv)
        return created
