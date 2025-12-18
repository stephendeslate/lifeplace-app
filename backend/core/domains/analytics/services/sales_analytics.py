# backend/core/domains/analytics/services/sales_analytics.py
from datetime import datetime
from decimal import Decimal
from django.db.models import Count, Sum, Avg, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear
from django.utils import timezone


class SalesAnalyticsService:
    """Service for sales and reservation analytics - queries existing models directly."""

    @staticmethod
    def get_bookings_summary(start_date, end_date, period='daily'):
        """
        Get bookings summary grouped by period.
        Returns: daily/weekly/monthly/yearly booking counts and revenue.
        """
        from core.domains.events.models import Event

        trunc_fn = {
            'daily': TruncDay,
            'weekly': TruncWeek,
            'monthly': TruncMonth,
            'yearly': TruncYear,
        }.get(period, TruncDay)

        results = Event.objects.filter(
            created_at__range=(start_date, end_date)
        ).annotate(
            period=trunc_fn('created_at')
        ).values('period').annotate(
            total_bookings=Count('id'),
            confirmed_bookings=Count('id', filter=Q(status='CONFIRMED')),
            completed_bookings=Count('id', filter=Q(status='COMPLETED')),
            cancelled_bookings=Count('id', filter=Q(status='CANCELLED')),
            leads=Count('id', filter=Q(status='LEAD')),
            total_revenue=Sum('total_price', filter=Q(status__in=['CONFIRMED', 'COMPLETED']))
        ).order_by('period')

        # Convert to serializable format
        return [
            {
                'period': r['period'].isoformat() if r['period'] else None,
                'total_bookings': r['total_bookings'],
                'confirmed_bookings': r['confirmed_bookings'],
                'completed_bookings': r['completed_bookings'],
                'cancelled_bookings': r['cancelled_bookings'],
                'leads': r['leads'],
                'total_revenue': float(r['total_revenue'] or 0),
            }
            for r in results
        ]

    @staticmethod
    def get_reservation_pipeline(start_date, end_date):
        """Get reservation counts by status (pipeline view)."""
        from core.domains.events.models import Event

        results = Event.objects.filter(
            created_at__range=(start_date, end_date)
        ).values('status').annotate(
            count=Count('id'),
            total_value=Sum('total_price')
        ).order_by('status')

        # Add status labels
        status_labels = {
            'LEAD': 'Leads',
            'CONFIRMED': 'Confirmed',
            'COMPLETED': 'Completed',
            'CANCELLED': 'Cancelled',
        }

        return [
            {
                'status': r['status'],
                'label': status_labels.get(r['status'], r['status']),
                'count': r['count'],
                'total_value': float(r['total_value'] or 0),
            }
            for r in results
        ]

    @staticmethod
    def get_revenue_by_event_type(start_date, end_date):
        """Revenue breakdown by event type/package."""
        from core.domains.events.models import EventProductOption

        results = EventProductOption.objects.filter(
            event__created_at__range=(start_date, end_date),
            event__status__in=['CONFIRMED', 'COMPLETED']
        ).values(
            'product_option__name',
            'product_option__type',
            'product_option__category__name'
        ).annotate(
            booking_count=Count('event', distinct=True),
            total_revenue=Sum('final_price'),
            avg_revenue=Avg('final_price'),
            total_participants=Sum('num_participants')
        ).order_by('-total_revenue')

        return [
            {
                'name': r['product_option__name'] or 'Unknown',
                'type': r['product_option__type'] or 'PRODUCT',
                'category': r['product_option__category__name'] or 'Uncategorized',
                'booking_count': r['booking_count'],
                'total_revenue': float(r['total_revenue'] or 0),
                'avg_revenue': float(r['avg_revenue'] or 0),
                'total_participants': r['total_participants'] or 0,
            }
            for r in results
        ]

    @staticmethod
    def get_payment_tracking(start_date, end_date):
        """Payment status tracking including overdue payments."""
        from core.domains.payments.models import Payment, PaymentInstallment

        payments = Payment.objects.filter(
            created_at__range=(start_date, end_date)
        )

        # Get payment summaries by status
        summary = payments.aggregate(
            total_payments=Count('id'),
            total_amount=Sum('amount'),
            completed_amount=Sum('amount', filter=Q(status='COMPLETED')),
            pending_amount=Sum('amount', filter=Q(status='PENDING')),
            failed_count=Count('id', filter=Q(status='FAILED')),
        )

        # Get overdue installments
        today = timezone.now().date()
        overdue = PaymentInstallment.objects.filter(
            status='PENDING',
            due_date__lt=today
        ).aggregate(
            overdue_count=Count('id'),
            overdue_amount=Sum('amount')
        )

        # Get upcoming installments
        upcoming = PaymentInstallment.objects.filter(
            status='PENDING',
            due_date__gte=today,
            due_date__lte=today + timezone.timedelta(days=30)
        ).aggregate(
            upcoming_count=Count('id'),
            upcoming_amount=Sum('amount')
        )

        return {
            'total_payments': summary['total_payments'] or 0,
            'total_amount': float(summary['total_amount'] or 0),
            'completed_amount': float(summary['completed_amount'] or 0),
            'pending_amount': float(summary['pending_amount'] or 0),
            'failed_count': summary['failed_count'] or 0,
            'overdue_count': overdue['overdue_count'] or 0,
            'overdue_amount': float(overdue['overdue_amount'] or 0),
            'upcoming_count': upcoming['upcoming_count'] or 0,
            'upcoming_amount': float(upcoming['upcoming_amount'] or 0),
        }
