import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ..models import GalleryPhoto, Venue
from ..serializers import (
    GalleryPhotoPublicSerializer,
    GalleryVenueSummarySerializer,
    PublicVenueOperatingRulesSerializer,
    PublicVenueSerializer,
    RentableVenueSerializer,
    RentableVenueWithEventTypeSerializer,
)
from ..services import VenueService
from .pagination import StandardPagination

logger = logging.getLogger(__name__)


class PublicVenueViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public ViewSet for venues (read-only, client-facing).
    """

    serializer_class = PublicVenueSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardPagination
    lookup_value_regex = r"[0-9]+"

    def get_queryset(self):
        return (
            Venue.objects.filter(is_active=True, is_bookable=True)
            .select_related("venue_operating_rules")
            .order_by("sort_order", "name")
        )

    @action(detail=False, methods=["get"], url_path="gallery-venues")
    def gallery_venues(self, request):
        """Lightweight venue list for the gallery page (id, name, featured_image only)."""
        venues = (
            Venue.objects.filter(
                is_active=True,
                is_bookable=True,
                featured_image__isnull=False,
            )
            .exclude(featured_image="")
            .order_by("sort_order", "name")
        )
        serializer = GalleryVenueSummarySerializer(venues, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def rentable(self, request):
        """
        Get all venues available for standalone rental (custom package curation).

        Query params:
            event_type_id: Optional. If provided, returns event-type-specific pricing.
        """
        venues = (
            Venue.objects.filter(
                is_active=True,
                is_bookable=True,
                is_rentable_standalone=True,
                standalone_base_price__isnull=False,
            )
            .select_related("venue_operating_rules")
            .order_by("sort_order", "name")
        )

        # Check for event_type_id parameter
        event_type_id = request.query_params.get("event_type_id")

        if event_type_id:
            try:
                event_type_id = int(event_type_id)
                # Use event-type-aware serializer
                serializer = RentableVenueWithEventTypeSerializer(
                    venues, many=True, context={"event_type_id": event_type_id, "request": request}
                )
            except (ValueError, TypeError):
                # Invalid event_type_id, use default serializer
                serializer = RentableVenueSerializer(venues, many=True, context={"request": request})
        else:
            serializer = RentableVenueSerializer(venues, many=True, context={"request": request})

        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def operating_rules(self, request, pk=None):
        """Get operating rules for public display"""
        venue = self.get_object()

        if hasattr(venue, "venue_operating_rules"):
            serializer = PublicVenueOperatingRulesSerializer(venue.venue_operating_rules)
            return Response(serializer.data)

        return Response({"detail": "No operating rules available"}, status=404)

    @action(detail=True, methods=["post"])
    def calculate_times(self, request, pk=None):
        """Public endpoint for calculating event times"""
        venue = self.get_object()

        program_date_str = request.data.get("program_date")
        program_start_time_str = request.data.get("program_start_time")
        program_hours = request.data.get("program_hours", 3)
        early_checkin_hours = request.data.get("early_checkin_hours")
        late_checkout_hours = request.data.get("late_checkout_hours")

        if not program_date_str or not program_start_time_str:
            return Response({"error": "program_date and program_start_time are required"}, status=400)

        try:
            program_date = datetime.strptime(program_date_str, "%Y-%m-%d").date()
            program_start_time = datetime.strptime(program_start_time_str, "%H:%M").time()
            program_hours = Decimal(str(program_hours))
        except (ValueError, InvalidOperation) as e:
            logger.warning(f"Invalid parameter format in public endpoint: {e}")
            return Response({"error": "Invalid parameter format. Please check your input values."}, status=400)

        calculated_times = VenueService.calculate_event_times(
            venue=venue,
            program_date=program_date,
            program_start_time=program_start_time,
            program_hours=program_hours,
            early_checkin_hours=Decimal(str(early_checkin_hours)) if early_checkin_hours else None,
            late_checkout_hours=Decimal(str(late_checkout_hours)) if late_checkout_hours else None,
        )

        validation = VenueService.validate_booking_request(
            venue=venue,
            program_date=program_date,
            program_start_time=program_start_time,
            program_hours=program_hours,
        )

        # Return simplified response for public
        return Response(
            {
                "times": {
                    "ingress_start": calculated_times.ingress_start.isoformat(),
                    "program_start": calculated_times.program_start.isoformat(),
                    "program_end": calculated_times.program_end.isoformat(),
                    "egress_end": calculated_times.egress_end.isoformat(),
                    "checkout": calculated_times.scheduled_checkout.isoformat(),
                },
                "duration": {
                    "ingress": float(calculated_times.ingress_hours),
                    "program": float(calculated_times.program_hours),
                    "egress": float(calculated_times.egress_hours),
                    "total": float(calculated_times.total_hours),
                },
                "fees": {
                    "early_checkin": float(calculated_times.early_checkin_fee)
                    if calculated_times.early_checkin_fee
                    else None,
                    "late_checkout": float(calculated_times.late_checkout_fee)
                    if calculated_times.late_checkout_fee
                    else None,
                },
                "validation": {
                    "is_valid": validation.is_valid,
                    "errors": validation.errors,
                    "warnings": validation.warnings,
                },
            }
        )


class PublicGalleryPhotoViewSet(viewsets.ReadOnlyModelViewSet):
    """Public API for gallery photos."""

    permission_classes = [AllowAny]
    serializer_class = GalleryPhotoPublicSerializer
    pagination_class = None  # Return all photos; frontend handles client-side pagination

    def get_queryset(self):
        qs = GalleryPhoto.objects.filter(is_active=True).select_related("venue", "event_type")
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category.upper())
        return qs
