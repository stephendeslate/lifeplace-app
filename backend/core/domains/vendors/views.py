# backend/core/domains/vendors/views.py
import logging

from django.db import transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

from .models import PackageVendor, Vendor
from .serializers import (
    PackageVendorInlineSerializer,
    PackageVendorSerializer,
    PublicVendorSerializer,
    VendorDetailSerializer,
    VendorListSerializer,
    VendorOperatingRulesSerializer,
    VendorSerializer,
    VendorWithRulesSerializer,
)
from .services import VendorService

logger = logging.getLogger(__name__)


class StandardPagination(PageNumberPagination):
    """Standard pagination for vendor endpoints"""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class VendorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Vendor management (Admin).
    Provides CRUD operations and additional actions for vendor management.
    """

    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "code", "description", "company_name", "contact_name"]
    ordering_fields = ["name", "sort_order", "created_at", "service_category"]
    ordering = ["sort_order", "name"]
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.action == "list":
            return VendorListSerializer
        elif self.action == "retrieve":
            return VendorDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return VendorWithRulesSerializer
        return VendorSerializer

    def get_queryset(self):
        queryset = Vendor.objects.select_related("vendor_operating_rules")

        # Filter by is_active
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        # Filter by is_bookable
        is_bookable = self.request.query_params.get("is_bookable")
        if is_bookable is not None:
            queryset = queryset.filter(is_bookable=is_bookable.lower() == "true")

        # Filter by service_category
        service_category = self.request.query_params.get("service_category")
        if service_category:
            queryset = queryset.filter(service_category=service_category.upper())

        return queryset

    def create(self, request, *args, **kwargs):
        """Create a vendor with optional operating rules"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            vendor = serializer.save()

        logger.info(f"Vendor created: {vendor.name} ({vendor.code}) by {request.user}")

        return Response(VendorDetailSerializer(vendor).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update a vendor with operating rules"""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            vendor = serializer.save()

        logger.info(f"Vendor updated: {vendor.name} ({vendor.code}) by {request.user}")

        return Response(VendorDetailSerializer(vendor).data)

    @action(detail=False, methods=["get"])
    def all(self, request):
        """Get all vendors without pagination"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = VendorListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def active(self, request):
        """Get all active and bookable vendors"""
        vendors = VendorService.get_active_vendors()
        serializer = VendorListSerializer(vendors, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get", "put", "patch"])
    def operating_rules(self, request, pk=None):
        """Get or update operating rules for a vendor"""
        vendor = self.get_object()

        if request.method == "GET":
            if hasattr(vendor, "vendor_operating_rules"):
                serializer = VendorOperatingRulesSerializer(vendor.vendor_operating_rules)
                return Response(serializer.data)
            return Response({"detail": "No operating rules configured"}, status=404)

        # PUT or PATCH
        if hasattr(vendor, "vendor_operating_rules"):
            serializer = VendorOperatingRulesSerializer(
                vendor.vendor_operating_rules, data=request.data, partial=request.method == "PATCH"
            )
        else:
            serializer = VendorOperatingRulesSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            if hasattr(vendor, "vendor_operating_rules"):
                serializer.save()
            else:
                serializer.save(vendor=vendor)

        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def packages(self, request, pk=None):
        """Get packages that include this vendor"""
        vendor = self.get_object()
        package_vendors = (
            vendor.vendor_packages.filter(package__is_active=True).select_related("package").order_by("sort_order")
        )

        serializer = PackageVendorSerializer(package_vendors, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def categories(self, request):
        """Get list of available service categories"""
        return Response([{"value": choice[0], "label": choice[1]} for choice in Vendor.SERVICE_CATEGORY_CHOICES])


class PackageVendorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Package-Vendor assignments (Admin).
    Manages which vendors are included in packages.
    """

    serializer_class = PackageVendorSerializer
    permission_classes = [IsAdmin]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = PackageVendor.objects.select_related("package", "vendor", "vendor__vendor_operating_rules")

        # Filter by package
        package_id = self.request.query_params.get("package_id")
        if package_id:
            queryset = queryset.filter(package_id=package_id)

        # Filter by vendor
        vendor_id = self.request.query_params.get("vendor_id")
        if vendor_id:
            queryset = queryset.filter(vendor_id=vendor_id)

        return queryset.order_by("package__name", "sort_order")

    @action(detail=False, methods=["get"])
    def by_package(self, request):
        """Get vendors for a specific package"""
        package_id = request.query_params.get("package_id")
        if not package_id:
            return Response({"error": "package_id is required"}, status=400)

        package_vendors = VendorService.get_package_vendors(int(package_id))
        serializer = PackageVendorInlineSerializer(package_vendors, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def bulk_assign(self, request):
        """Bulk assign vendors to a package"""
        package_id = request.data.get("package_id")
        vendor_assignments = request.data.get("vendors", [])

        if not package_id:
            return Response({"error": "package_id is required"}, status=400)

        with transaction.atomic():
            # Clear existing assignments
            PackageVendor.objects.filter(package_id=package_id).delete()

            # Create new assignments
            created = []
            for assignment in vendor_assignments:
                pv = PackageVendor.objects.create(
                    package_id=package_id,
                    vendor_id=assignment["vendor_id"],
                    notes=assignment.get("notes", ""),
                    sort_order=assignment.get("sort_order", 0),
                )
                created.append(pv)

        serializer = PackageVendorSerializer(created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# === Public/Client-facing views ===


class PublicVendorViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public ViewSet for vendors (read-only, client-facing).
    """

    serializer_class = PublicVendorSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardPagination

    def get_queryset(self):
        return Vendor.objects.filter(is_active=True, is_bookable=True).order_by("sort_order", "name")
