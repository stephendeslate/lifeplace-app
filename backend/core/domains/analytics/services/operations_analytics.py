# backend/core/domains/analytics/services/operations_analytics.py
from django.db.models import Count, Sum, Q
from django.db.models.functions import ExtractMonth, ExtractWeekDay, ExtractHour


class OperationsAnalyticsService:
    """Service for operations and resource analytics - queries existing models directly."""

    @staticmethod
    def get_venue_usage(start_date, end_date):
        """Venue utilization report."""
        from core.domains.events.models import Event

        results = Event.objects.filter(
            start_date__range=(start_date, end_date),
            status__in=['CONFIRMED', 'COMPLETED'],
            venue__isnull=False
        ).values(
            'venue__id',
            'venue__name',
            'venue__code'
        ).annotate(
            booking_count=Count('id'),
            total_revenue=Sum('total_price'),
            confirmed_count=Count('id', filter=Q(status='CONFIRMED')),
            completed_count=Count('id', filter=Q(status='COMPLETED'))
        ).order_by('-booking_count')

        total_bookings = sum(r['booking_count'] for r in results) or 1  # Avoid division by zero

        return [
            {
                'venue_id': r['venue__id'],
                'venue_name': r['venue__name'] or 'Unknown Venue',
                'venue_code': r['venue__code'] or '',
                'booking_count': r['booking_count'],
                'total_revenue': float(r['total_revenue'] or 0),
                'confirmed_count': r['confirmed_count'],
                'completed_count': r['completed_count'],
                'utilization_percentage': round(r['booking_count'] / total_bookings * 100, 1),
            }
            for r in results
        ]

    @staticmethod
    def get_calendar_utilization(start_date, end_date):
        """Peak and off-peak analysis by month and day of week."""
        from core.domains.events.models import Event

        # By month
        monthly = Event.objects.filter(
            start_date__range=(start_date, end_date),
            status__in=['CONFIRMED', 'COMPLETED']
        ).annotate(
            month=ExtractMonth('start_date')
        ).values('month').annotate(
            booking_count=Count('id'),
            total_revenue=Sum('total_price')
        ).order_by('month')

        # By day of week (1=Sunday, 7=Saturday in Django)
        daily = Event.objects.filter(
            start_date__range=(start_date, end_date),
            status__in=['CONFIRMED', 'COMPLETED']
        ).annotate(
            day_of_week=ExtractWeekDay('start_date')
        ).values('day_of_week').annotate(
            booking_count=Count('id')
        ).order_by('day_of_week')

        # Map month numbers to names
        month_names = {
            1: 'January', 2: 'February', 3: 'March', 4: 'April',
            5: 'May', 6: 'June', 7: 'July', 8: 'August',
            9: 'September', 10: 'October', 11: 'November', 12: 'December'
        }

        # Map day numbers to names
        day_names = {
            1: 'Sunday', 2: 'Monday', 3: 'Tuesday', 4: 'Wednesday',
            5: 'Thursday', 6: 'Friday', 7: 'Saturday'
        }

        return {
            'by_month': [
                {
                    'month': m['month'],
                    'month_name': month_names.get(m['month'], 'Unknown'),
                    'booking_count': m['booking_count'],
                    'total_revenue': float(m['total_revenue'] or 0),
                }
                for m in monthly
            ],
            'by_day_of_week': [
                {
                    'day_of_week': d['day_of_week'],
                    'day_name': day_names.get(d['day_of_week'], 'Unknown'),
                    'booking_count': d['booking_count'],
                }
                for d in daily
            ]
        }

    @staticmethod
    def get_booking_time_analysis(start_date, end_date):
        """Analyze when bookings are typically made (hour of day)."""
        from core.domains.events.models import Event

        results = Event.objects.filter(
            created_at__range=(start_date, end_date)
        ).annotate(
            hour=ExtractHour('created_at')
        ).values('hour').annotate(
            booking_count=Count('id')
        ).order_by('hour')

        return [
            {
                'hour': r['hour'],
                'hour_label': f"{r['hour']:02d}:00",
                'booking_count': r['booking_count'],
            }
            for r in results
        ]

    @staticmethod
    def get_kitchen_usage_placeholder():
        """Placeholder for kitchen usage report."""
        return {
            'status': 'placeholder',
            'message': 'Kitchen usage tracking is currently in development. This will include kitchen rental frequency, catering service usage, and related revenue metrics.',
            'data': None
        }

    @staticmethod
    def get_inventory_placeholder():
        """Placeholder for inventory reports."""
        return {
            'status': 'placeholder',
            'message': 'Inventory reporting is currently in development. This will track linens, sound equipment, supplies, and other rental items.',
            'data': None
        }

    @staticmethod
    def get_app_engagement_placeholder():
        """Placeholder for app engagement reports."""
        return {
            'status': 'placeholder',
            'message': 'App engagement analytics is currently in development. This will include user signups, feature usage, push notification effectiveness, and loyalty redemption reports.',
            'data': None
        }
