import logging

from django.db.models import Count, Prefetch, Q
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.domains.products.models import ProductCategory

from ..models import BookingFlow
from ..serializers import PublicBookingFlowSerializer
from .public_booking_completion_mixin import PublicBookingCompletionMixin
from .public_booking_pricing_mixin import PublicBookingPricingMixin
from .public_booking_session_mixin import PublicBookingSessionMixin

logger = logging.getLogger(__name__)


class PublicBookingFlowViewSet(
    PublicBookingSessionMixin,
    PublicBookingCompletionMixin,
    PublicBookingPricingMixin,
    viewsets.ReadOnlyModelViewSet,
):
    """
    Public ViewSet for client-facing booking flow endpoints
    UPDATED: Added public session management endpoints
    """

    permission_classes = [AllowAny]
    serializer_class = PublicBookingFlowSerializer
    pagination_class = None  # Disable pagination

    def get_queryset(self):
        event_type_id = self.request.query_params.get("event_type")
        annotated_categories = ProductCategory.objects.annotate(
            _products_count=Count("products", filter=Q(products__is_active=True)),
            _children_count=Count("children", filter=Q(children__is_active=True)),
        )
        queryset = (
            BookingFlow.objects.filter(is_active=True)
            .select_related("event_type")
            .prefetch_related(
                "steps",
                # Step configurations
                "steps__package_config",
                "steps__addon_config",
                "steps__pricing_config",
                "steps__contact_config",
                "steps__payment_config",
                "steps__confirmation_config",
                "steps__introduction_config",
                "steps__datetime_config",
                "steps__questionnaire_config",
                "steps__venue_selection_config",
                # Categories with count annotations to avoid N+1 COUNT queries
                Prefetch(
                    "steps__package_config__available_categories",
                    queryset=annotated_categories,
                ),
                Prefetch(
                    "steps__addon_config__available_categories",
                    queryset=annotated_categories,
                ),
                # Packages/addons with their nested relationships
                "steps__package_config__available_packages",
                "steps__addon_config__available_addons",
                "steps__package_config__available_packages__event_types",
                "steps__addon_config__available_addons__event_types",
                "steps__package_config__available_packages__package_venues__venue",
                "steps__addon_config__available_addons__package_venues__venue",
                "steps__questionnaire_config__questionnaire_items__questionnaire",
            )
        )

        # Apply event type filter if provided
        if event_type_id:
            queryset = queryset.filter(event_type_id=event_type_id)

        return queryset

    def list(self, request, *args, **kwargs):
        """Override list to ensure no pagination"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
