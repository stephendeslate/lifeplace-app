# backend/core/domains/venues/views.py
from datetime import datetime
from decimal import Decimal, InvalidOperation
import json
import uuid

from core.utils.permissions import IsAdmin
from django.db import models, transaction
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
import logging

from .models import Venue, VenueOperatingRules, PackageVenue, VenueBlockedDate, GalleryPhoto
from .serializers import (
    VenueSerializer,
    VenueListSerializer,
    VenueDetailSerializer,
    VenueWithRulesSerializer,
    VenueOperatingRulesSerializer,
    PackageVenueSerializer,
    PackageVenueInlineSerializer,
    VenueBlockedDateSerializer,
    PublicVenueSerializer,
    PublicVenueOperatingRulesSerializer,
    RentableVenueSerializer,
    RentableVenueWithEventTypeSerializer,
    VenueEventTypeConfigurationSerializer,
    GalleryPhotoPublicSerializer,
    GalleryPhotoAdminSerializer,
    GalleryVenueSummarySerializer,
)
from .models import VenueEventTypeConfiguration
from .services import VenueService, VenueAvailabilityService

logger = logging.getLogger(__name__)


class StandardPagination(PageNumberPagination):
    """Standard pagination for venue endpoints"""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class VenueViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Venue management (Admin).
    Provides CRUD operations and additional actions for venue management.
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'sort_order', 'created_at']
    ordering = ['sort_order', 'name']
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.action == 'list':
            return VenueListSerializer
        elif self.action == 'retrieve':
            return VenueDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return VenueWithRulesSerializer
        return VenueSerializer

    def get_queryset(self):
        from django.db.models import Count, Q

        queryset = Venue.objects.select_related('venue_operating_rules').annotate(
            # Annotate package count to avoid N+1 queries in serializers
            _packages_count=Count(
                'venue_packages',
                filter=Q(venue_packages__package__is_active=True)
            ),
        )

        # Filter by is_active
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Filter by is_bookable
        is_bookable = self.request.query_params.get('is_bookable')
        if is_bookable is not None:
            queryset = queryset.filter(is_bookable=is_bookable.lower() == 'true')

        # Filter by is_overnight
        is_overnight = self.request.query_params.get('is_overnight')
        if is_overnight is not None:
            queryset = queryset.filter(is_overnight=is_overnight.lower() == 'true')

        return queryset

    def _process_gallery_images(self, request, venue):
        """Process gallery image uploads and merge with existing URLs."""
        gallery_images = []

        # Get existing gallery images from request (JSON string)
        existing_gallery_json = request.data.get('existing_gallery_images', '[]')
        if isinstance(existing_gallery_json, str):
            try:
                existing_urls = json.loads(existing_gallery_json)
                if isinstance(existing_urls, list):
                    gallery_images.extend(existing_urls)
            except json.JSONDecodeError:
                pass

        # Process uploaded gallery image files (gallery_image_0, gallery_image_1, etc.)
        for key in request.FILES:
            if key.startswith('gallery_image_'):
                file = request.FILES[key]
                # Generate unique filename
                ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
                filename = f"venues/gallery/{venue.id}/{uuid.uuid4().hex}.{ext}"
                # Save file
                saved_path = default_storage.save(filename, ContentFile(file.read()))
                # Build URL using storage backend (handles S3/R2 in production)
                file_url = default_storage.url(saved_path)
                # If URL is relative (local dev), make it absolute
                if file_url.startswith('/'):
                    file_url = request.build_absolute_uri(file_url)
                gallery_images.append(file_url)

        # Update venue's gallery_images if we have any
        if gallery_images or 'existing_gallery_images' in request.data:
            venue.gallery_images = gallery_images
            venue.save(update_fields=['gallery_images'])

    def create(self, request, *args, **kwargs):
        """Create a venue with optional operating rules"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            venue = serializer.save()
            # Process gallery images after venue is created
            self._process_gallery_images(request, venue)

        logger.info(f"Venue created: {venue.name} ({venue.code}) by {request.user}")

        return Response(
            VenueDetailSerializer(venue).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        """Update a venue with operating rules"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            venue = serializer.save()
            # Process gallery images after venue is updated
            self._process_gallery_images(request, venue)

        logger.info(f"Venue updated: {venue.name} ({venue.code}) by {request.user}")

        return Response(VenueDetailSerializer(venue).data)

    @action(detail=False, methods=['get'])
    def all(self, request):
        """Get all venues without pagination"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = VenueListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active and bookable venues"""
        venues = VenueService.get_active_venues()
        serializer = VenueListSerializer(venues, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def rentable(self, request):
        """Get all venues that can be rented standalone (for custom package curation)"""
        venues = Venue.objects.filter(
            is_active=True,
            is_bookable=True,
            is_rentable_standalone=True,
            standalone_base_price__isnull=False,
        ).select_related('venue_operating_rules').order_by('sort_order', 'name')

        serializer = RentableVenueSerializer(venues, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'put', 'patch'])
    def operating_rules(self, request, pk=None):
        """Get or update operating rules for a venue"""
        venue = self.get_object()

        if request.method == 'GET':
            if hasattr(venue, 'venue_operating_rules'):
                serializer = VenueOperatingRulesSerializer(venue.venue_operating_rules)
                return Response(serializer.data)
            return Response({'detail': 'No operating rules configured'}, status=404)

        # PUT or PATCH
        if hasattr(venue, 'venue_operating_rules'):
            serializer = VenueOperatingRulesSerializer(
                venue.venue_operating_rules,
                data=request.data,
                partial=request.method == 'PATCH'
            )
        else:
            serializer = VenueOperatingRulesSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            if hasattr(venue, 'venue_operating_rules'):
                serializer.save()
            else:
                serializer.save(venue=venue)

        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def packages(self, request, pk=None):
        """Get packages that include this venue"""
        venue = self.get_object()
        package_venues = venue.venue_packages.filter(
            package__is_active=True
        ).select_related('package').order_by('access_order')

        serializer = PackageVenueSerializer(package_venues, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def availability(self, request, pk=None):
        """Check venue availability for a date range"""
        venue = self.get_object()

        # Parse date parameters
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if not start_date_str:
            start_date = timezone.now().date()
        else:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid start_date format. Use YYYY-MM-DD'},
                    status=400
                )

        if not end_date_str:
            from datetime import timedelta
            end_date = start_date + timedelta(days=30)
        else:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid end_date format. Use YYYY-MM-DD'},
                    status=400
                )

        blocked_dates = VenueAvailabilityService.get_blocked_dates_for_venue(
            venue=venue,
            start_date=start_date,
            end_date=end_date
        )

        return Response({
            'venue_id': venue.id,
            'venue_name': venue.name,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'blocked_dates': blocked_dates
        })

    @action(detail=True, methods=['post'])
    def calculate_times(self, request, pk=None):
        """Calculate event times based on venue rules"""
        venue = self.get_object()

        # Parse request data
        program_date_str = request.data.get('program_date')
        program_start_time_str = request.data.get('program_start_time')
        program_hours = request.data.get('program_hours', 3)
        early_checkin_hours = request.data.get('early_checkin_hours')
        late_checkout_hours = request.data.get('late_checkout_hours')

        # Validate required fields
        if not program_date_str or not program_start_time_str:
            return Response(
                {'error': 'program_date and program_start_time are required'},
                status=400
            )

        try:
            program_date = datetime.strptime(program_date_str, '%Y-%m-%d').date()
            program_start_time = datetime.strptime(program_start_time_str, '%H:%M').time()
            program_hours = Decimal(str(program_hours))
        except (ValueError, InvalidOperation) as e:
            logger.warning(f"Invalid parameter format: {e}")
            return Response({'error': 'Invalid parameter format. Please check your input values.'}, status=400)

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

        return Response({
            'venue_id': venue.id,
            'venue_name': venue.name,
            'program_date': program_date.isoformat(),
            'times': {
                'ingress_start': calculated_times.ingress_start.isoformat(),
                'program_start': calculated_times.program_start.isoformat(),
                'program_end': calculated_times.program_end.isoformat(),
                'egress_end': calculated_times.egress_end.isoformat(),
                'scheduled_checkout': calculated_times.scheduled_checkout.isoformat(),
            },
            'duration_breakdown': {
                'ingress_hours': float(calculated_times.ingress_hours),
                'program_hours': float(calculated_times.program_hours),
                'egress_hours': float(calculated_times.egress_hours),
                'total_hours': float(calculated_times.total_hours),
            },
            'early_checkin': {
                'time': calculated_times.early_checkin_time.isoformat() if calculated_times.early_checkin_time else None,
                'hours': float(calculated_times.early_checkin_hours) if calculated_times.early_checkin_hours else None,
                'fee': float(calculated_times.early_checkin_fee) if calculated_times.early_checkin_fee else None,
            } if calculated_times.early_checkin_time else None,
            'late_checkout': {
                'time': calculated_times.late_checkout_time.isoformat() if calculated_times.late_checkout_time else None,
                'hours': float(calculated_times.late_checkout_hours) if calculated_times.late_checkout_hours else None,
                'fee': float(calculated_times.late_checkout_fee) if calculated_times.late_checkout_fee else None,
            } if calculated_times.late_checkout_time else None,
            'constraints': {
                'music_curfew': venue.venue_operating_rules.latest_end_time.strftime('%H:%M') if hasattr(venue, 'venue_operating_rules') and venue.venue_operating_rules.latest_end_time else None,
                'hard_cutoff': venue.venue_operating_rules.hard_cutoff_time.strftime('%H:%M') if hasattr(venue, 'venue_operating_rules') and venue.venue_operating_rules.hard_cutoff_time else None,
            },
            'validation': {
                'is_valid': validation.is_valid,
                'errors': validation.errors,
                'warnings': validation.warnings,
            }
        })


class PackageVenueViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Package-Venue assignments (Admin).
    Manages which venues are included in packages.
    """
    serializer_class = PackageVenueSerializer
    permission_classes = [IsAdmin]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = PackageVenue.objects.select_related(
            'package', 'venue', 'venue__venue_operating_rules'
        )

        # Filter by package
        package_id = self.request.query_params.get('package_id')
        if package_id:
            queryset = queryset.filter(package_id=package_id)

        # Filter by venue
        venue_id = self.request.query_params.get('venue_id')
        if venue_id:
            queryset = queryset.filter(venue_id=venue_id)

        return queryset.order_by('package__name', 'access_order')

    @action(detail=False, methods=['get'])
    def by_package(self, request):
        """Get venues for a specific package"""
        package_id = request.query_params.get('package_id')
        if not package_id:
            return Response({'error': 'package_id is required'}, status=400)

        package_venues = VenueService.get_package_venues(int(package_id))
        serializer = PackageVenueInlineSerializer(package_venues, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        """Bulk assign venues to a package"""
        package_id = request.data.get('package_id')
        venue_assignments = request.data.get('venues', [])

        if not package_id:
            return Response({'error': 'package_id is required'}, status=400)

        with transaction.atomic():
            # Clear existing assignments
            PackageVenue.objects.filter(package_id=package_id).delete()

            # Create new assignments
            created = []
            for assignment in venue_assignments:
                pv = PackageVenue.objects.create(
                    package_id=package_id,
                    venue_id=assignment['venue_id'],
                    is_primary=assignment.get('is_primary', False),
                    access_order=assignment.get('access_order', 1),
                    access_duration_hours=assignment.get('access_duration_hours'),
                    notes=assignment.get('notes', '')
                )
                created.append(pv)

        serializer = PackageVenueSerializer(created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VenueBlockedDateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Venue Blocked Dates (Admin).
    Manages date blocking for venues.
    """
    serializer_class = VenueBlockedDateSerializer
    permission_classes = [IsAdmin]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = VenueBlockedDate.objects.select_related('venue', 'created_by')

        # Filter by venue
        venue_id = self.request.query_params.get('venue_id')
        if venue_id:
            queryset = queryset.filter(venue_id=venue_id)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                queryset = queryset.filter(date__gte=start)
            except ValueError:
                pass

        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(date__lte=end)
            except ValueError:
                pass

        return queryset.order_by('date', 'blocked_start_time')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# === Public/Client-facing views ===

class PublicVenueViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public ViewSet for venues (read-only, client-facing).
    """
    serializer_class = PublicVenueSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardPagination

    def get_queryset(self):
        return Venue.objects.filter(
            is_active=True,
            is_bookable=True
        ).select_related('venue_operating_rules').order_by('sort_order', 'name')

    @action(detail=False, methods=['get'], url_path='gallery-venues')
    def gallery_venues(self, request):
        """Lightweight venue list for the gallery page (id, name, featured_image only)."""
        venues = Venue.objects.filter(
            is_active=True,
            is_bookable=True,
            featured_image__isnull=False,
        ).exclude(featured_image='').order_by('sort_order', 'name')
        serializer = GalleryVenueSummarySerializer(
            venues, many=True, context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def rentable(self, request):
        """
        Get all venues available for standalone rental (custom package curation).

        Query params:
            event_type_id: Optional. If provided, returns event-type-specific pricing.
        """
        venues = Venue.objects.filter(
            is_active=True,
            is_bookable=True,
            is_rentable_standalone=True,
            standalone_base_price__isnull=False,
        ).select_related('venue_operating_rules').order_by('sort_order', 'name')

        # Check for event_type_id parameter
        event_type_id = request.query_params.get('event_type_id')

        if event_type_id:
            try:
                event_type_id = int(event_type_id)
                # Use event-type-aware serializer
                serializer = RentableVenueWithEventTypeSerializer(
                    venues,
                    many=True,
                    context={'event_type_id': event_type_id, 'request': request}
                )
            except (ValueError, TypeError):
                # Invalid event_type_id, use default serializer
                serializer = RentableVenueSerializer(venues, many=True, context={'request': request})
        else:
            serializer = RentableVenueSerializer(venues, many=True, context={'request': request})

        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def operating_rules(self, request, pk=None):
        """Get operating rules for public display"""
        venue = self.get_object()

        if hasattr(venue, 'venue_operating_rules'):
            serializer = PublicVenueOperatingRulesSerializer(venue.venue_operating_rules)
            return Response(serializer.data)

        return Response({'detail': 'No operating rules available'}, status=404)

    @action(detail=True, methods=['post'])
    def calculate_times(self, request, pk=None):
        """Public endpoint for calculating event times"""
        venue = self.get_object()

        program_date_str = request.data.get('program_date')
        program_start_time_str = request.data.get('program_start_time')
        program_hours = request.data.get('program_hours', 3)
        early_checkin_hours = request.data.get('early_checkin_hours')
        late_checkout_hours = request.data.get('late_checkout_hours')

        if not program_date_str or not program_start_time_str:
            return Response(
                {'error': 'program_date and program_start_time are required'},
                status=400
            )

        try:
            program_date = datetime.strptime(program_date_str, '%Y-%m-%d').date()
            program_start_time = datetime.strptime(program_start_time_str, '%H:%M').time()
            program_hours = Decimal(str(program_hours))
        except (ValueError, InvalidOperation) as e:
            logger.warning(f"Invalid parameter format in public endpoint: {e}")
            return Response({'error': 'Invalid parameter format. Please check your input values.'}, status=400)

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
        return Response({
            'times': {
                'ingress_start': calculated_times.ingress_start.isoformat(),
                'program_start': calculated_times.program_start.isoformat(),
                'program_end': calculated_times.program_end.isoformat(),
                'egress_end': calculated_times.egress_end.isoformat(),
                'checkout': calculated_times.scheduled_checkout.isoformat(),
            },
            'duration': {
                'ingress': float(calculated_times.ingress_hours),
                'program': float(calculated_times.program_hours),
                'egress': float(calculated_times.egress_hours),
                'total': float(calculated_times.total_hours),
            },
            'fees': {
                'early_checkin': float(calculated_times.early_checkin_fee) if calculated_times.early_checkin_fee else None,
                'late_checkout': float(calculated_times.late_checkout_fee) if calculated_times.late_checkout_fee else None,
            },
            'validation': {
                'is_valid': validation.is_valid,
                'errors': validation.errors,
                'warnings': validation.warnings,
            }
        })


class PublicGalleryPhotoViewSet(viewsets.ReadOnlyModelViewSet):
    """Public API for gallery photos."""
    permission_classes = [AllowAny]
    serializer_class = GalleryPhotoPublicSerializer
    pagination_class = None  # Return all photos; frontend handles client-side pagination

    def get_queryset(self):
        qs = GalleryPhoto.objects.filter(is_active=True).select_related('venue', 'event_type')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category.upper())
        return qs


class GalleryPhotoViewSet(viewsets.ModelViewSet):
    """Admin API for gallery photo management."""
    permission_classes = [IsAdmin]
    serializer_class = GalleryPhotoAdminSerializer
    queryset = GalleryPhoto.objects.all().select_related('venue', 'event_type')

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category.upper())
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(title__icontains=search) | models.Q(description__icontains=search)
            )
        return qs
