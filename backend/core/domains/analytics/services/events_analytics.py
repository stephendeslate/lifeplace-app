# backend/core/domains/analytics/services/events_analytics.py
from django.db.models import Avg, Count, Q, Sum


class EventsAnalyticsService:
    """
    Service for event and guest analytics - queries existing models directly.

    Date field logic:
    - Bookings → created_at (when booking was made)
    - Completed events → end_date (when event actually finished)
    - Revenue → from Payment records for completed events
    """

    @staticmethod
    def get_event_attendance(start_date, end_date):
        """Total guests and breakdown by event type for completed events."""
        from core.domains.events.models import EventProductOption

        # For attendance, use completed events with end_date
        results = (
            EventProductOption.objects.filter(event__status="COMPLETED", event__end_date__range=(start_date, end_date))
            .values("product_option__name", "product_option__type")
            .annotate(total_guests=Sum("num_participants"), event_count=Count("event", distinct=True))
            .order_by("-total_guests")
        )

        return [
            {
                "name": r["product_option__name"] or "Unknown",
                "type": r["product_option__type"] or "PRODUCT",
                "total_guests": r["total_guests"] or 0,
                "event_count": r["event_count"],
            }
            for r in results
        ]

    @staticmethod
    def get_package_performance(start_date, end_date, limit=10):
        """Which packages are most popular - based on bookings made."""
        from core.domains.events.models import EventProductOption

        # For package popularity, use created_at (when bookings were made)
        results = (
            EventProductOption.objects.filter(
                event__created_at__range=(start_date, end_date), product_option__type="PACKAGE"
            )
            .values("product_option__id", "product_option__name", "product_option__base_price")
            .annotate(
                booking_count=Count("event", distinct=True),
                total_revenue=Sum("final_price"),
                total_guests=Sum("num_participants"),
                avg_guests=Avg("num_participants"),
            )
            .order_by("-booking_count")[:limit]
        )

        return [
            {
                "id": r["product_option__id"],
                "name": r["product_option__name"] or "Unknown Package",
                "base_price": float(r["product_option__base_price"] or 0),
                "booking_count": r["booking_count"],
                "total_revenue": float(r["total_revenue"] or 0),
                "total_guests": r["total_guests"] or 0,
                "avg_guests": round(float(r["avg_guests"] or 0), 1),
            }
            for r in results
        ]

    @staticmethod
    def get_feedback_scores(start_date, end_date):
        """Average satisfaction scores for completed events."""
        from core.domains.events.models import EventFeedback

        # Feedback is for completed events, use end_date
        results = EventFeedback.objects.filter(
            event__status="COMPLETED", event__end_date__range=(start_date, end_date)
        ).aggregate(
            total_feedback=Count("id"),
            avg_rating=Avg("overall_rating"),
            five_star_count=Count("id", filter=Q(overall_rating=5)),
            four_star_count=Count("id", filter=Q(overall_rating=4)),
            three_star_count=Count("id", filter=Q(overall_rating=3)),
            two_star_count=Count("id", filter=Q(overall_rating=2)),
            one_star_count=Count("id", filter=Q(overall_rating=1)),
        )

        total = results["total_feedback"] or 0

        return {
            "total_feedback": total,
            "avg_rating": round(float(results["avg_rating"] or 0), 1),
            "five_star_count": results["five_star_count"] or 0,
            "four_star_count": results["four_star_count"] or 0,
            "three_star_count": results["three_star_count"] or 0,
            "two_star_count": results["two_star_count"] or 0,
            "one_star_count": results["one_star_count"] or 0,
            "satisfaction_rate": round((results["five_star_count"] + results["four_star_count"]) / total * 100, 1)
            if total > 0
            else 0,
        }

    @staticmethod
    def get_event_type_breakdown(start_date, end_date):
        """Breakdown by event type."""
        from core.domains.events.models import Event
        from core.domains.payments.models import Payment

        # For bookings breakdown, use created_at
        booking_results = (
            Event.objects.filter(created_at__range=(start_date, end_date))
            .values("event_type__name")
            .annotate(
                count=Count("id"),
                confirmed=Count("id", filter=Q(status="CONFIRMED")),
                cancelled=Count("id", filter=Q(status="CANCELLED")),
                leads=Count("id", filter=Q(status="LEAD")),
            )
            .order_by("-count")
        )

        # For completed, use end_date
        completed_by_type = {}
        completed_results = (
            Event.objects.filter(status="COMPLETED", end_date__range=(start_date, end_date))
            .values("event_type__name")
            .annotate(completed=Count("id"))
        )
        for cr in completed_results:
            completed_by_type[cr["event_type__name"]] = cr["completed"]

        # Get actual revenue by event type from payments (completed events by end_date)
        revenue_by_type = {}
        payment_results = (
            Payment.objects.filter(
                event__status="COMPLETED", event__end_date__range=(start_date, end_date), status="COMPLETED"
            )
            .values("event__event_type__name")
            .annotate(revenue=Sum("amount"))
        )
        for pr in payment_results:
            revenue_by_type[pr["event__event_type__name"]] = float(pr["revenue"] or 0)

        return [
            {
                "event_type": r["event_type__name"] or "Unspecified",
                "count": r["count"],
                "confirmed": r["confirmed"],
                "completed": completed_by_type.get(r["event_type__name"], 0),
                "revenue": revenue_by_type.get(r["event_type__name"], 0),
            }
            for r in booking_results
        ]

    @staticmethod
    def get_guest_demographics_placeholder():
        """Placeholder for guest demographics - feature in progress."""
        return {
            "status": "placeholder",
            "message": "Guest demographics feature is currently in development. This will include age groups, organization types (churches, schools, companies), and other demographic breakdowns.",
            "data": None,
        }

    @staticmethod
    def get_repeat_clients_placeholder():
        """Placeholder for repeat client tracking - feature in progress."""
        return {
            "status": "placeholder",
            "message": "Repeat client and loyalty tracking is currently in development. This will include client retention rates, booking frequency, and lifetime value metrics.",
            "data": None,
        }
