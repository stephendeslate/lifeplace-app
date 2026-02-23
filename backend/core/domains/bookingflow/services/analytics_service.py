# backend/core/domains/bookingflow/services/analytics_service.py
import logging
from decimal import Decimal

from django.utils import timezone

from ..exceptions import BookingFlowNotFound
from ..models import BookingFlow, BookingFlowAnalytics, BookingSession

logger = logging.getLogger(__name__)


class BookingFlowAnalyticsService:
    """Service for managing booking flow analytics"""

    @staticmethod
    def update_daily_analytics(flow_id, date=None):
        """Update daily analytics for a booking flow"""
        if date is None:
            date = timezone.now().date()

        try:
            flow = BookingFlow.objects.get(id=flow_id)
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotFound()

        # Get or create analytics record
        analytics, created = BookingFlowAnalytics.objects.get_or_create(
            booking_flow=flow,
            date=date,
            defaults={
                "total_sessions": 0,
                "completed_bookings": 0,
                "abandoned_sessions": 0,
                "conversion_rate": Decimal("0.00"),
                "total_revenue": Decimal("0.00"),
                "average_booking_value": Decimal("0.00"),
            },
        )

        # Calculate metrics for the day
        day_sessions = BookingSession.objects.filter(booking_flow=flow, created_at__date=date)

        analytics.total_sessions = day_sessions.count()
        analytics.completed_bookings = day_sessions.filter(is_completed=True).count()
        analytics.abandoned_sessions = day_sessions.filter(is_abandoned=True).count()

        # Calculate conversion rate
        if analytics.total_sessions > 0:
            analytics.conversion_rate = (analytics.completed_bookings / analytics.total_sessions) * 100

        # Calculate revenue
        completed_sessions = day_sessions.filter(is_completed=True, created_event__isnull=False)
        total_revenue = sum(session.calculate_total_price() for session in completed_sessions)
        analytics.total_revenue = total_revenue

        if analytics.completed_bookings > 0:
            analytics.average_booking_value = total_revenue / analytics.completed_bookings

        # Calculate step analytics
        step_data = {}
        drop_off_data = {}

        for step in flow.enabled_steps:
            step_completions = day_sessions.filter(completed_steps=step).count()
            step_data[str(step.id)] = {
                "completions": step_completions,
                "completion_rate": (step_completions / analytics.total_sessions * 100)
                if analytics.total_sessions > 0
                else 0,
            }

            # Calculate drop-off rate (sessions that reached this step but didn't complete it)
            sessions_reached = day_sessions.filter(current_step__order__gte=step.order).count()
            if sessions_reached > 0:
                drop_off_rate = ((sessions_reached - step_completions) / sessions_reached) * 100
                drop_off_data[str(step.id)] = drop_off_rate

        analytics.step_completion_data = step_data
        analytics.step_drop_off_data = drop_off_data

        analytics.save()
        logger.info(f"Updated analytics for flow {flow.name} on {date}")
        return analytics

    @staticmethod
    def get_flow_analytics(flow_id, start_date=None, end_date=None):
        """Get analytics for a booking flow over a date range"""
        try:
            flow = BookingFlow.objects.get(id=flow_id)
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotFound()

        queryset = BookingFlowAnalytics.objects.filter(booking_flow=flow)

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset.order_by("-date")
