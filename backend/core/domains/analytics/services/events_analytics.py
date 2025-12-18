# backend/core/domains/analytics/services/events_analytics.py
from django.db.models import Count, Sum, Avg, Q


class EventsAnalyticsService:
    """Service for event and guest analytics - queries existing models directly."""

    @staticmethod
    def get_event_attendance(start_date, end_date):
        """Total guests and breakdown by event type."""
        from core.domains.events.models import EventProductOption

        results = EventProductOption.objects.filter(
            event__start_date__range=(start_date, end_date),
            event__status__in=['CONFIRMED', 'COMPLETED']
        ).values(
            'product_option__name',
            'product_option__type'
        ).annotate(
            total_guests=Sum('num_participants'),
            event_count=Count('event', distinct=True)
        ).order_by('-total_guests')

        return [
            {
                'name': r['product_option__name'] or 'Unknown',
                'type': r['product_option__type'] or 'PRODUCT',
                'total_guests': r['total_guests'] or 0,
                'event_count': r['event_count'],
            }
            for r in results
        ]

    @staticmethod
    def get_package_performance(start_date, end_date, limit=10):
        """Which packages are most popular."""
        from core.domains.events.models import EventProductOption

        results = EventProductOption.objects.filter(
            event__created_at__range=(start_date, end_date),
            product_option__type='PACKAGE'
        ).values(
            'product_option__id',
            'product_option__name',
            'product_option__base_price'
        ).annotate(
            booking_count=Count('event', distinct=True),
            total_revenue=Sum('final_price'),
            total_guests=Sum('num_participants'),
            avg_guests=Avg('num_participants')
        ).order_by('-booking_count')[:limit]

        return [
            {
                'id': r['product_option__id'],
                'name': r['product_option__name'] or 'Unknown Package',
                'base_price': float(r['product_option__base_price'] or 0),
                'booking_count': r['booking_count'],
                'total_revenue': float(r['total_revenue'] or 0),
                'total_guests': r['total_guests'] or 0,
                'avg_guests': round(float(r['avg_guests'] or 0), 1),
            }
            for r in results
        ]

    @staticmethod
    def get_feedback_scores(start_date, end_date):
        """Average satisfaction scores."""
        from core.domains.events.models import EventFeedback

        results = EventFeedback.objects.filter(
            event__end_date__range=(start_date, end_date)
        ).aggregate(
            total_feedback=Count('id'),
            avg_rating=Avg('overall_rating'),
            five_star_count=Count('id', filter=Q(overall_rating=5)),
            four_star_count=Count('id', filter=Q(overall_rating=4)),
            three_star_count=Count('id', filter=Q(overall_rating=3)),
            two_star_count=Count('id', filter=Q(overall_rating=2)),
            one_star_count=Count('id', filter=Q(overall_rating=1)),
        )

        total = results['total_feedback'] or 0

        return {
            'total_feedback': total,
            'avg_rating': round(float(results['avg_rating'] or 0), 1),
            'five_star_count': results['five_star_count'] or 0,
            'four_star_count': results['four_star_count'] or 0,
            'three_star_count': results['three_star_count'] or 0,
            'two_star_count': results['two_star_count'] or 0,
            'one_star_count': results['one_star_count'] or 0,
            'satisfaction_rate': round((results['five_star_count'] + results['four_star_count']) / total * 100, 1) if total > 0 else 0,
        }

    @staticmethod
    def get_event_type_breakdown(start_date, end_date):
        """Breakdown by event type."""
        from core.domains.events.models import Event

        results = Event.objects.filter(
            created_at__range=(start_date, end_date)
        ).values(
            'event_type__name'
        ).annotate(
            count=Count('id'),
            confirmed=Count('id', filter=Q(status='CONFIRMED')),
            completed=Count('id', filter=Q(status='COMPLETED')),
            revenue=Sum('total_price', filter=Q(status__in=['CONFIRMED', 'COMPLETED']))
        ).order_by('-count')

        return [
            {
                'event_type': r['event_type__name'] or 'Unspecified',
                'count': r['count'],
                'confirmed': r['confirmed'],
                'completed': r['completed'],
                'revenue': float(r['revenue'] or 0),
            }
            for r in results
        ]

    @staticmethod
    def get_guest_demographics_placeholder():
        """Placeholder for guest demographics - feature in progress."""
        return {
            'status': 'placeholder',
            'message': 'Guest demographics feature is currently in development. This will include age groups, organization types (churches, schools, companies), and other demographic breakdowns.',
            'data': None
        }

    @staticmethod
    def get_repeat_clients_placeholder():
        """Placeholder for repeat client tracking - feature in progress."""
        return {
            'status': 'placeholder',
            'message': 'Repeat client and loyalty tracking is currently in development. This will include client retention rates, booking frequency, and lifetime value metrics.',
            'data': None
        }
