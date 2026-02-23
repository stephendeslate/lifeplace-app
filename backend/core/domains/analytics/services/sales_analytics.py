# backend/core/domains/analytics/services/sales_analytics.py
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek, TruncYear
from django.utils import timezone


class SalesAnalyticsService:
    """
    Service for sales and reservation analytics - queries existing models directly.

    Date field logic:
    - Bookings (total, confirmed, leads, cancelled) → created_at (when booking was made)
    - Completed events → end_date (when event actually finished)
    - Revenue → from Payment records for completed payments on completed events
    """

    @staticmethod
    def get_bookings_summary(start_date, end_date, period="daily"):
        """
        Get bookings summary grouped by period.
        Returns: daily/weekly/monthly/yearly booking counts and revenue.
        """
        from core.domains.events.models import Event
        from core.domains.payments.models import Payment

        trunc_fn = {
            "daily": TruncDay,
            "weekly": TruncWeek,
            "monthly": TruncMonth,
            "yearly": TruncYear,
        }.get(period, TruncDay)

        # Bookings use created_at (when booking was made)
        results = (
            Event.objects.filter(created_at__range=(start_date, end_date))
            .annotate(period=trunc_fn("created_at"))
            .values("period")
            .annotate(
                total_bookings=Count("id"),
                confirmed_bookings=Count("id", filter=Q(status="CONFIRMED")),
                cancelled_bookings=Count("id", filter=Q(status="CANCELLED")),
                leads=Count("id", filter=Q(status="LEAD")),
            )
            .order_by("period")
        )

        # Completed events use end_date
        completed_by_period = {}
        completed_results = (
            Event.objects.filter(status="COMPLETED", end_date__range=(start_date, end_date))
            .annotate(period=trunc_fn("end_date"))
            .values("period")
            .annotate(completed_bookings=Count("id"))
        )
        for cr in completed_results:
            if cr["period"]:
                completed_by_period[cr["period"]] = cr["completed_bookings"]

        # Revenue from completed payments on completed events (by end_date)
        revenue_by_period = {}
        payment_results = (
            Payment.objects.filter(
                event__status="COMPLETED", event__end_date__range=(start_date, end_date), status="COMPLETED"
            )
            .annotate(period=trunc_fn("event__end_date"))
            .values("period")
            .annotate(total_revenue=Sum("amount"))
        )
        for pr in payment_results:
            if pr["period"]:
                revenue_by_period[pr["period"]] = float(pr["total_revenue"] or 0)

        # Convert to serializable format
        return [
            {
                "period": r["period"].isoformat() if r["period"] else None,
                "total_bookings": r["total_bookings"],
                "confirmed_bookings": r["confirmed_bookings"],
                "completed_bookings": completed_by_period.get(r["period"], 0),
                "cancelled_bookings": r["cancelled_bookings"],
                "leads": r["leads"],
                "total_revenue": revenue_by_period.get(r["period"], 0),
            }
            for r in results
        ]

    @staticmethod
    def get_reservation_pipeline(start_date, end_date):
        """Get reservation counts by status (pipeline view)."""
        from core.domains.events.models import Event
        from core.domains.payments.models import Payment

        # Bookings use created_at (when booking was made)
        booking_results = (
            Event.objects.filter(created_at__range=(start_date, end_date))
            .exclude(status="COMPLETED")
            .values("status")
            .annotate(
                count=Count("id"),
            )
            .order_by("status")
        )

        # Completed events use end_date
        completed_count = Event.objects.filter(status="COMPLETED", end_date__range=(start_date, end_date)).count()

        # Get actual revenue by status from payments
        revenue_by_status = {}
        # For non-completed, use created_at
        payment_results = (
            Payment.objects.filter(event__created_at__range=(start_date, end_date), status="COMPLETED")
            .exclude(event__status="COMPLETED")
            .values("event__status")
            .annotate(total_value=Sum("amount"))
        )
        for pr in payment_results:
            revenue_by_status[pr["event__status"]] = float(pr["total_value"] or 0)

        # For completed, use end_date
        completed_revenue = (
            Payment.objects.filter(
                event__status="COMPLETED", event__end_date__range=(start_date, end_date), status="COMPLETED"
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )
        revenue_by_status["COMPLETED"] = float(completed_revenue)

        # Add status labels
        status_labels = {
            "LEAD": "Leads",
            "CONFIRMED": "Confirmed",
            "COMPLETED": "Completed",
            "CANCELLED": "Cancelled",
        }

        results = []
        for r in booking_results:
            results.append(
                {
                    "status": r["status"],
                    "label": status_labels.get(r["status"], r["status"]),
                    "count": r["count"],
                    "total_value": revenue_by_status.get(r["status"], 0),
                }
            )

        # Add completed separately
        results.append(
            {
                "status": "COMPLETED",
                "label": "Completed",
                "count": completed_count,
                "total_value": revenue_by_status.get("COMPLETED", 0),
            }
        )

        return results

    @staticmethod
    def get_revenue_by_event_type(start_date, end_date):
        """Revenue breakdown by event type/package."""
        from core.domains.events.models import EventProductOption

        # For revenue breakdown, use completed events with end_date
        results = (
            EventProductOption.objects.filter(event__status="COMPLETED", event__end_date__range=(start_date, end_date))
            .values("product_option__name", "product_option__type", "product_option__category__name")
            .annotate(
                booking_count=Count("event", distinct=True),
                total_revenue=Sum("final_price"),
                avg_revenue=Avg("final_price"),
                total_participants=Sum("num_participants"),
            )
            .order_by("-total_revenue")
        )

        return [
            {
                "name": r["product_option__name"] or "Unknown",
                "type": r["product_option__type"] or "PRODUCT",
                "category": r["product_option__category__name"] or "Uncategorized",
                "booking_count": r["booking_count"],
                "total_revenue": float(r["total_revenue"] or 0),
                "avg_revenue": float(r["avg_revenue"] or 0),
                "total_participants": r["total_participants"] or 0,
            }
            for r in results
        ]

    @staticmethod
    def get_payment_tracking(start_date, end_date):
        """Payment status tracking including overdue payments."""
        from core.domains.payments.models import Payment

        # Filter by booking creation date for payment tracking
        payments = Payment.objects.filter(event__created_at__range=(start_date, end_date))

        # Get payment summaries by status
        today = timezone.now().date()
        summary = payments.aggregate(
            total_payments=Count("id"),
            total_amount=Sum("amount"),
            completed_amount=Sum("amount", filter=Q(status="COMPLETED")),
            pending_amount=Sum("amount", filter=Q(status="PENDING")),
            failed_count=Count("id", filter=Q(status="FAILED")),
            # Overdue: pending payments past their due date
            overdue_count=Count("id", filter=Q(status="PENDING", due_date__lt=today)),
            overdue_amount=Sum("amount", filter=Q(status="PENDING", due_date__lt=today)),
            # Upcoming: pending payments due within next 30 days
            upcoming_count=Count(
                "id", filter=Q(status="PENDING", due_date__gte=today, due_date__lte=today + timezone.timedelta(days=30))
            ),
            upcoming_amount=Sum(
                "amount",
                filter=Q(status="PENDING", due_date__gte=today, due_date__lte=today + timezone.timedelta(days=30)),
            ),
        )

        return {
            "total_payments": summary["total_payments"] or 0,
            "total_amount": float(summary["total_amount"] or 0),
            "completed_amount": float(summary["completed_amount"] or 0),
            "pending_amount": float(summary["pending_amount"] or 0),
            "failed_count": summary["failed_count"] or 0,
            "overdue_count": summary["overdue_count"] or 0,
            "overdue_amount": float(summary["overdue_amount"] or 0),
            "upcoming_count": summary["upcoming_count"] or 0,
            "upcoming_amount": float(summary["upcoming_amount"] or 0),
        }
