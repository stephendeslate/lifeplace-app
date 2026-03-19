from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

from ..models import PackageVenue
from ..serializers import PackageVenueInlineSerializer, PackageVenueSerializer
from ..services import VenueService
from .pagination import StandardPagination


class PackageVenueViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Package-Venue assignments (Admin).
    Manages which venues are included in packages.
    """

    serializer_class = PackageVenueSerializer
    permission_classes = [IsAdmin]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = PackageVenue.objects.select_related("package", "venue", "venue__venue_operating_rules")

        # Filter by package
        package_id = self.request.query_params.get("package_id")
        if package_id:
            queryset = queryset.filter(package_id=package_id)

        # Filter by venue
        venue_id = self.request.query_params.get("venue_id")
        if venue_id:
            queryset = queryset.filter(venue_id=venue_id)

        return queryset.order_by("package__name", "access_order")

    @action(detail=False, methods=["get"])
    def by_package(self, request):
        """Get venues for a specific package"""
        package_id = request.query_params.get("package_id")
        if not package_id:
            return Response({"error": "package_id is required"}, status=400)

        package_venues = VenueService.get_package_venues(int(package_id))
        serializer = PackageVenueInlineSerializer(package_venues, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def bulk_assign(self, request):
        """Bulk assign venues to a package"""
        package_id = request.data.get("package_id")
        venue_assignments = request.data.get("venues", [])

        if not package_id:
            return Response({"error": "package_id is required"}, status=400)

        with transaction.atomic():
            # Clear existing assignments
            PackageVenue.objects.filter(package_id=package_id).delete()

            # Create new assignments
            created = []
            for assignment in venue_assignments:
                pv = PackageVenue.objects.create(
                    package_id=package_id,
                    venue_id=assignment["venue_id"],
                    is_primary=assignment.get("is_primary", False),
                    access_order=assignment.get("access_order", 1),
                    access_duration_hours=assignment.get("access_duration_hours"),
                    notes=assignment.get("notes", ""),
                )
                created.append(pv)

        serializer = PackageVenueSerializer(created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
