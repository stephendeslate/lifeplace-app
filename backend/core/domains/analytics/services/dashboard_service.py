# backend/core/domains/analytics/services/dashboard_service.py
from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone


class DashboardService:
    """Main dashboard KPI aggregation service - queries existing models directly."""

    @staticmethod
    def get_kpi_summary(start_date=None, end_date=None):
        """
        Get main dashboard KPIs.
        Returns aggregated metrics for the specified date range with trend comparison.

        Date field logic:
        - Bookings (total, confirmed, leads, cancelled) → created_at (when booking was made)
        - Completed events → end_date (when event actually finished)
        - Revenue → from Payment records for completed payments
        """
        from core.domains.bookingflow.models import BookingSession
        from core.domains.events.models import Event
        from core.domains.payments.models import Payment
        from core.domains.users.models import User

        if not end_date:
            end_date = timezone.now()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Calculate previous period for comparison
        period_length = (end_date - start_date).days
        prev_start = start_date - timedelta(days=period_length)
        prev_end = start_date

        # Bookings use created_at (when the booking was made)
        current_bookings = Event.objects.filter(created_at__range=(start_date, end_date))
        Event.objects.filter(created_at__range=(prev_start, prev_end))

        # Completed events use end_date (when the event actually finished)
        current_completed = Event.objects.filter(status="COMPLETED", end_date__range=(start_date, end_date))
        Event.objects.filter(status="COMPLETED", end_date__range=(prev_start, prev_end))

        # Event Revenue - payments from COMPLETED events only (operational success)
        current_event_revenue = Payment.objects.filter(
            event__status="COMPLETED", event__end_date__range=(start_date, end_date), status="COMPLETED"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        prev_event_revenue = Payment.objects.filter(
            event__status="COMPLETED", event__end_date__range=(prev_start, prev_end), status="COMPLETED"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        # Total Revenue - ALL completed payments including cancelled event deposits/fees (cash flow)
        current_total_revenue = Payment.objects.filter(
            event__end_date__range=(start_date, end_date), status="COMPLETED"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        prev_total_revenue = Payment.objects.filter(
            event__end_date__range=(prev_start, prev_end), status="COMPLETED"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        # Booking counts by status (using created_at for when bookings were made)
        total_bookings = current_bookings.count()
        confirmed_count = current_bookings.filter(status="CONFIRMED").count()
        cancelled_count = current_bookings.filter(status="CANCELLED").count()
        current_bookings.filter(status="LEAD").count()

        # Completed count uses end_date
        completed_count = current_completed.count()

        total_successful = confirmed_count + completed_count

        # Booking sessions for conversion tracking
        current_sessions = BookingSession.objects.filter(created_at__range=(start_date, end_date))
        total_sessions = current_sessions.count()
        completed_sessions = current_sessions.filter(is_completed=True).count()

        # New clients (User model uses date_joined, not created_at)
        new_clients = User.objects.filter(role="CLIENT", date_joined__range=(start_date, end_date)).count()

        # Calculate trends for both revenue types
        event_revenue_trend = 0
        if prev_event_revenue > 0:
            event_revenue_trend = float((current_event_revenue - prev_event_revenue) / prev_event_revenue * 100)

        total_revenue_trend = 0
        if prev_total_revenue > 0:
            total_revenue_trend = float((current_total_revenue - prev_total_revenue) / prev_total_revenue * 100)

        # Average booking value (based on event revenue for operational metrics)
        avg_booking_value = 0
        if total_successful > 0:
            avg_booking_value = float(current_event_revenue / total_successful)

        # Conversion rate
        conversion_rate = 0
        if total_sessions > 0:
            conversion_rate = round(completed_sessions / total_sessions * 100, 1)

        return {
            "total_bookings": total_bookings,
            "confirmed_bookings": confirmed_count,
            "completed_bookings": completed_count,
            "cancelled_bookings": cancelled_count,
            "event_revenue": float(current_event_revenue),
            "total_revenue": float(current_total_revenue),
            "event_revenue_trend": round(event_revenue_trend, 1),
            "total_revenue_trend": round(total_revenue_trend, 1),
            "avg_booking_value": round(avg_booking_value, 2),
            "new_clients": new_clients,
            "booking_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "conversion_rate": conversion_rate,
            "period": {
                "start_date": start_date.isoformat() if hasattr(start_date, "isoformat") else str(start_date),
                "end_date": end_date.isoformat() if hasattr(end_date, "isoformat") else str(end_date),
            },
        }
