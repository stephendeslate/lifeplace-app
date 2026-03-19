from datetime import datetime

from rest_framework import viewsets

from core.utils.permissions import IsAdmin

from ..models import VenueBlockedDate
from ..serializers import VenueBlockedDateSerializer
from .pagination import StandardPagination


class VenueBlockedDateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Venue Blocked Dates (Admin).
    Manages date blocking for venues.
    """

    serializer_class = VenueBlockedDateSerializer
    permission_classes = [IsAdmin]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = VenueBlockedDate.objects.select_related("venue", "created_by")

        # Filter by venue
        venue_id = self.request.query_params.get("venue_id")
        if venue_id:
            queryset = queryset.filter(venue_id=venue_id)

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
                queryset = queryset.filter(date__gte=start)
            except ValueError:
                pass

        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
                queryset = queryset.filter(date__lte=end)
            except ValueError:
                pass

        return queryset.order_by("date", "blocked_start_time")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
