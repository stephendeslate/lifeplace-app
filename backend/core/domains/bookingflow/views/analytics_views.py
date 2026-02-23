# backend/core/domains/bookingflow/views/analytics_views.py
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

from ..models import BookingFlowAnalytics
from ..serializers import BookingFlowAnalyticsSerializer
from ..services import BookingFlowAnalyticsService


class BookingFlowAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for booking flow analytics
    """

    permission_classes = [IsAdmin]
    serializer_class = BookingFlowAnalyticsSerializer

    def get_queryset(self):
        return BookingFlowAnalytics.objects.all().order_by("-date")

    @action(detail=False, methods=["post"])
    def update_daily(self, request):
        """Update daily analytics for a specific flow and date"""
        flow_id = request.data.get("flow_id")
        date = request.data.get("date")  # Optional, defaults to today

        if not flow_id:
            return Response({"detail": "flow_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if date:
                date = timezone.datetime.strptime(date, "%Y-%m-%d").date()

            analytics = BookingFlowAnalyticsService.update_daily_analytics(flow_id, date)

            return Response(self.get_serializer(analytics, context=self.get_serializer_context()).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
