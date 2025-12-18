# backend/core/domains/analytics/services/dashboard_service.py
from datetime import timedelta
from decimal import Decimal
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone


class DashboardService:
    """Main dashboard KPI aggregation service - queries existing models directly."""

    @staticmethod
    def get_kpi_summary(start_date=None, end_date=None):
        """
        Get main dashboard KPIs.
        Returns aggregated metrics for the specified date range with trend comparison.
        """
        from core.domains.events.models import Event
        from core.domains.bookingflow.models import BookingSession
        from core.domains.users.models import User

        if not end_date:
            end_date = timezone.now()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Calculate previous period for comparison
        period_length = (end_date - start_date).days
        prev_start = start_date - timedelta(days=period_length)
        prev_end = start_date

        # Current period events
        current_events = Event.objects.filter(created_at__range=(start_date, end_date))
        prev_events = Event.objects.filter(created_at__range=(prev_start, prev_end))

        # Revenue calculations
        current_revenue = current_events.filter(
            status__in=['CONFIRMED', 'COMPLETED']
        ).aggregate(total=Sum('total_price'))['total'] or Decimal('0')

        prev_revenue = prev_events.filter(
            status__in=['CONFIRMED', 'COMPLETED']
        ).aggregate(total=Sum('total_price'))['total'] or Decimal('0')

        # Booking counts by status
        confirmed_count = current_events.filter(status='CONFIRMED').count()
        completed_count = current_events.filter(status='COMPLETED').count()
        cancelled_count = current_events.filter(status='CANCELLED').count()
        total_successful = confirmed_count + completed_count

        # Booking sessions for conversion tracking
        current_sessions = BookingSession.objects.filter(created_at__range=(start_date, end_date))
        total_sessions = current_sessions.count()
        completed_sessions = current_sessions.filter(is_completed=True).count()

        # New clients (User model uses date_joined, not created_at)
        new_clients = User.objects.filter(
            role='CLIENT',
            date_joined__range=(start_date, end_date)
        ).count()

        # Calculate trends
        revenue_trend = 0
        if prev_revenue > 0:
            revenue_trend = float((current_revenue - prev_revenue) / prev_revenue * 100)

        # Average booking value
        avg_booking_value = 0
        if total_successful > 0:
            avg_booking_value = float(current_revenue / total_successful)

        # Conversion rate
        conversion_rate = 0
        if total_sessions > 0:
            conversion_rate = round(completed_sessions / total_sessions * 100, 1)

        return {
            'total_bookings': current_events.count(),
            'confirmed_bookings': confirmed_count,
            'completed_bookings': completed_count,
            'cancelled_bookings': cancelled_count,
            'total_revenue': float(current_revenue),
            'revenue_trend': round(revenue_trend, 1),
            'avg_booking_value': round(avg_booking_value, 2),
            'new_clients': new_clients,
            'booking_sessions': total_sessions,
            'completed_sessions': completed_sessions,
            'conversion_rate': conversion_rate,
            'period': {
                'start_date': start_date.isoformat() if hasattr(start_date, 'isoformat') else str(start_date),
                'end_date': end_date.isoformat() if hasattr(end_date, 'isoformat') else str(end_date),
            }
        }
