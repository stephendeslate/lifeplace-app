import json
import logging
import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

from ..models import Venue
from ..serializers import (
    PackageVenueSerializer,
    RentableVenueSerializer,
    VenueDetailSerializer,
    VenueListSerializer,
    VenueOperatingRulesSerializer,
    VenueSerializer,
    VenueWithRulesSerializer,
)
from ..services import VenueAvailabilityService, VenueService
from .pagination import StandardPagination

logger = logging.getLogger(__name__)


class VenueViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Venue management (Admin).
    Provides CRUD operations and additional actions for venue management.
    """

    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "code", "description"]
    ordering_fields = ["name", "sort_order", "created_at"]
    ordering = ["sort_order", "name"]
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.action == "list":
            return VenueListSerializer
        elif self.action == "retrieve":
            return VenueDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return VenueWithRulesSerializer
        return VenueSerializer

    def get_queryset(self):
        from django.db.models import Count, Q

        queryset = Venue.objects.select_related("venue_operating_rules").annotate(
            # Annotate package count to avoid N+1 queries in serializers
            _packages_count=Count("venue_packages", filter=Q(venue_packages__package__is_active=True)),
        )

        # Filter by is_active
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        # Filter by is_bookable
        is_bookable = self.request.query_params.get("is_bookable")
        if is_bookable is not None:
            queryset = queryset.filter(is_bookable=is_bookable.lower() == "true")

        # Filter by is_overnight
        is_overnight = self.request.query_params.get("is_overnight")
        if is_overnight is not None:
            queryset = queryset.filter(is_overnight=is_overnight.lower() == "true")

        return queryset

    def _process_gallery_images(self, request, venue):
        """Process gallery image uploads and merge with existing URLs."""
        gallery_images = []

        # Get existing gallery images from request (JSON string)
        existing_gallery_json = request.data.get("existing_gallery_images", "[]")
        if isinstance(existing_gallery_json, str):
            try:
                existing_urls = json.loads(existing_gallery_json)
                if isinstance(existing_urls, list):
                    gallery_images.extend(existing_urls)
            except json.JSONDecodeError:
                pass

        # Process uploaded gallery image files (gallery_image_0, gallery_image_1, etc.)
        for key in request.FILES:
            if key.startswith("gallery_image_"):
                file = request.FILES[key]
                # Generate unique filename
                ext = file.name.split(".")[-1] if "." in file.name else "jpg"
                filename = f"venues/gallery/{venue.id}/{uuid.uuid4().hex}.{ext}"
                # Save file
                saved_path = default_storage.save(filename, ContentFile(file.read()))
                # Build URL using storage backend (handles S3/R2 in production)
                file_url = default_storage.url(saved_path)
                # If URL is relative (local dev), make it absolute
                if file_url.startswith("/"):
                    file_url = request.build_absolute_uri(file_url)
                gallery_images.append(file_url)

        # Update venue's gallery_images if we have any
        if gallery_images or "existing_gallery_images" in request.data:
            venue.gallery_images = gallery_images
            venue.save(update_fields=["gallery_images"])

    def create(self, request, *args, **kwargs):
        """Create a venue with optional operating rules"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            venue = serializer.save()
            # Process gallery images after venue is created
            self._process_gallery_images(request, venue)

        logger.info(f"Venue created: {venue.name} ({venue.code}) by {request.user}")

        return Response(VenueDetailSerializer(venue).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update a venue with operating rules"""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            venue = serializer.save()
            # Process gallery images after venue is updated
            self._process_gallery_images(request, venue)

        logger.info(f"Venue updated: {venue.name} ({venue.code}) by {request.user}")

        return Response(VenueDetailSerializer(venue).data)

    @action(detail=False, methods=["get"])
    def all(self, request):
        """Get all venues without pagination"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = VenueListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def active(self, request):
        """Get all active and bookable venues"""
        venues = VenueService.get_active_venues()
        serializer = VenueListSerializer(venues, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def rentable(self, request):
        """Get all venues that can be rented standalone (for custom package curation)"""
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

        serializer = RentableVenueSerializer(venues, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get", "put", "patch"])
    def operating_rules(self, request, pk=None):
        """Get or update operating rules for a venue"""
        venue = self.get_object()

        if request.method == "GET":
            if hasattr(venue, "venue_operating_rules"):
                serializer = VenueOperatingRulesSerializer(venue.venue_operating_rules)
                return Response(serializer.data)
            return Response({"detail": "No operating rules configured"}, status=404)

        # PUT or PATCH
        if hasattr(venue, "venue_operating_rules"):
            serializer = VenueOperatingRulesSerializer(
                venue.venue_operating_rules, data=request.data, partial=request.method == "PATCH"
            )
        else:
            serializer = VenueOperatingRulesSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            if hasattr(venue, "venue_operating_rules"):
                serializer.save()
            else:
                serializer.save(venue=venue)

        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def packages(self, request, pk=None):
        """Get packages that include this venue"""
        venue = self.get_object()
        package_venues = (
            venue.venue_packages.filter(package__is_active=True).select_related("package").order_by("access_order")
        )

        serializer = PackageVenueSerializer(package_venues, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def availability(self, request, pk=None):
        """Check venue availability for a date range"""
        venue = self.get_object()

        # Parse date parameters
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        if not start_date_str:
            start_date = timezone.now().date()
        else:
            try:
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({"error": "Invalid start_date format. Use YYYY-MM-DD"}, status=400)

        if not end_date_str:
            from datetime import timedelta

            end_date = start_date + timedelta(days=30)
        else:
            try:
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({"error": "Invalid end_date format. Use YYYY-MM-DD"}, status=400)

        blocked_dates = VenueAvailabilityService.get_blocked_dates_for_venue(
            venue=venue, start_date=start_date, end_date=end_date
        )

        return Response(
            {
                "venue_id": venue.id,
                "venue_name": venue.name,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "blocked_dates": blocked_dates,
            }
        )

    @action(detail=True, methods=["post"])
    def calculate_times(self, request, pk=None):
        """Calculate event times based on venue rules"""
        venue = self.get_object()

        # Parse request data
        program_date_str = request.data.get("program_date")
        program_start_time_str = request.data.get("program_start_time")
        program_hours = request.data.get("program_hours", 3)
        early_checkin_hours = request.data.get("early_checkin_hours")
        late_checkout_hours = request.data.get("late_checkout_hours")

        # Validate required fields
        if not program_date_str or not program_start_time_str:
            return Response({"error": "program_date and program_start_time are required"}, status=400)

        try:
            program_date = datetime.strptime(program_date_str, "%Y-%m-%d").date()
            program_start_time = datetime.strptime(program_start_time_str, "%H:%M").time()
            program_hours = Decimal(str(program_hours))
        except (ValueError, InvalidOperation) as e:
            logger.warning(f"Invalid parameter format: {e}")
            return Response({"error": "Invalid parameter format. Please check your input values."}, status=400)

        # Calculate times
        calculated_times = VenueService.calculate_event_times(
            venue=venue,
            program_date=program_date,
            program_start_time=program_start_time,
            program_hours=program_hours,
            early_checkin_hours=Decimal(str(early_checkin_hours)) if early_checkin_hours else None,
            late_checkout_hours=Decimal(str(late_checkout_hours)) if late_checkout_hours else None,
        )

        # Validate the request
        validation = VenueService.validate_booking_request(
            venue=venue,
            program_date=program_date,
            program_start_time=program_start_time,
            program_hours=program_hours,
        )

        return Response(
            {
                "venue_id": venue.id,
                "venue_name": venue.name,
                "program_date": program_date.isoformat(),
                "times": {
                    "ingress_start": calculated_times.ingress_start.isoformat(),
                    "program_start": calculated_times.program_start.isoformat(),
                    "program_end": calculated_times.program_end.isoformat(),
                    "egress_end": calculated_times.egress_end.isoformat(),
                    "scheduled_checkout": calculated_times.scheduled_checkout.isoformat(),
                },
                "duration_breakdown": {
                    "ingress_hours": float(calculated_times.ingress_hours),
                    "program_hours": float(calculated_times.program_hours),
                    "egress_hours": float(calculated_times.egress_hours),
                    "total_hours": float(calculated_times.total_hours),
                },
                "early_checkin": {
                    "time": calculated_times.early_checkin_time.isoformat()
                    if calculated_times.early_checkin_time
                    else None,
                    "hours": float(calculated_times.early_checkin_hours)
                    if calculated_times.early_checkin_hours
                    else None,
                    "fee": float(calculated_times.early_checkin_fee) if calculated_times.early_checkin_fee else None,
                }
                if calculated_times.early_checkin_time
                else None,
                "late_checkout": {
                    "time": calculated_times.late_checkout_time.isoformat()
                    if calculated_times.late_checkout_time
                    else None,
                    "hours": float(calculated_times.late_checkout_hours)
                    if calculated_times.late_checkout_hours
                    else None,
                    "fee": float(calculated_times.late_checkout_fee) if calculated_times.late_checkout_fee else None,
                }
                if calculated_times.late_checkout_time
                else None,
                "constraints": {
                    "music_curfew": venue.venue_operating_rules.latest_end_time.strftime("%H:%M")
                    if hasattr(venue, "venue_operating_rules") and venue.venue_operating_rules.latest_end_time
                    else None,
                    "hard_cutoff": venue.venue_operating_rules.hard_cutoff_time.strftime("%H:%M")
                    if hasattr(venue, "venue_operating_rules") and venue.venue_operating_rules.hard_cutoff_time
                    else None,
                },
                "validation": {
                    "is_valid": validation.is_valid,
                    "errors": validation.errors,
                    "warnings": validation.warnings,
                },
            }
        )
