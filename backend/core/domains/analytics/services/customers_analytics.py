# backend/core/domains/analytics/services/customers_analytics.py
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth


class CustomersAnalyticsService:
    """Service for customer and lead analytics - queries existing models directly."""

    @staticmethod
    def get_lead_source_report(start_date, end_date):
        """Leads by source (Facebook, referrals, walk-ins, client-portal)."""
        from core.domains.events.models import Event

        results = Event.objects.filter(
            created_at__range=(start_date, end_date)
        ).values('lead_source').annotate(
            lead_count=Count('id'),
            converted_count=Count('id', filter=Q(status__in=['CONFIRMED', 'COMPLETED'])),
            total_value=Sum('total_price', filter=Q(status__in=['CONFIRMED', 'COMPLETED']))
        ).order_by('-lead_count')

        # Add labels for lead sources
        source_labels = {
            'FACEBOOK': 'Facebook',
            'REFERRAL': 'Referral',
            'WALKIN': 'Walk-in',
            'CLIENT_PORTAL': 'Client Portal',
            'OTHER': 'Other',
            '': 'Not Specified',
        }

        return [
            {
                'lead_source': r['lead_source'] or '',
                'label': source_labels.get(r['lead_source'] or '', r['lead_source'] or 'Not Specified'),
                'lead_count': r['lead_count'],
                'converted_count': r['converted_count'],
                'conversion_rate': round(r['converted_count'] / r['lead_count'] * 100, 1) if r['lead_count'] > 0 else 0,
                'total_value': float(r['total_value'] or 0),
            }
            for r in results
        ]

    @staticmethod
    def get_conversion_rate(start_date, end_date):
        """Inquiry to reservation conversion rate."""
        from core.domains.events.models import Event
        from core.domains.bookingflow.models import BookingSession

        events = Event.objects.filter(created_at__range=(start_date, end_date))

        total_events = events.count()
        leads = events.filter(status='LEAD').count()
        confirmed = events.filter(status='CONFIRMED').count()
        completed = events.filter(status='COMPLETED').count()
        converted = confirmed + completed

        # Booking flow conversion
        sessions = BookingSession.objects.filter(created_at__range=(start_date, end_date))
        total_sessions = sessions.count()
        completed_sessions = sessions.filter(is_completed=True).count()
        abandoned_sessions = sessions.filter(is_abandoned=True).count()

        return {
            'total_inquiries': total_events,
            'total_leads': leads,
            'confirmed_bookings': confirmed,
            'completed_bookings': completed,
            'converted_total': converted,
            'event_conversion_rate': round(converted / total_events * 100, 1) if total_events > 0 else 0,
            'booking_sessions': total_sessions,
            'completed_sessions': completed_sessions,
            'abandoned_sessions': abandoned_sessions,
            'booking_conversion_rate': round(completed_sessions / total_sessions * 100, 1) if total_sessions > 0 else 0,
            'abandonment_rate': round(abandoned_sessions / total_sessions * 100, 1) if total_sessions > 0 else 0,
        }

    @staticmethod
    def get_customer_list(start_date=None, end_date=None, limit=None):
        """Customer database with booking history."""
        from core.domains.users.models import User

        clients = User.objects.filter(role='CLIENT').annotate(
            total_events=Count('events'),
            confirmed_events=Count('events', filter=Q(events__status='CONFIRMED')),
            completed_events=Count('events', filter=Q(events__status='COMPLETED')),
            total_spent=Sum('events__total_price', filter=Q(events__status__in=['CONFIRMED', 'COMPLETED']))
        )

        if start_date and end_date:
            clients = clients.filter(events__created_at__range=(start_date, end_date)).distinct()

        clients = clients.values(
            'id', 'email', 'first_name', 'last_name',
            'total_events', 'confirmed_events', 'completed_events', 'total_spent', 'date_joined'
        ).order_by('-total_spent')

        if limit:
            clients = clients[:limit]

        return [
            {
                'id': c['id'],
                'email': c['email'],
                'first_name': c['first_name'] or '',
                'last_name': c['last_name'] or '',
                'full_name': f"{c['first_name'] or ''} {c['last_name'] or ''}".strip() or c['email'],
                'total_events': c['total_events'],
                'confirmed_events': c['confirmed_events'],
                'completed_events': c['completed_events'],
                'total_spent': float(c['total_spent'] or 0),
                'created_at': c['date_joined'].isoformat() if c['date_joined'] else None,
            }
            for c in clients
        ]

    @staticmethod
    def get_customer_growth(start_date, end_date):
        """Customer acquisition over time."""
        from core.domains.users.models import User

        results = User.objects.filter(
            role='CLIENT',
            date_joined__range=(start_date, end_date)
        ).annotate(
            month=TruncMonth('date_joined')
        ).values('month').annotate(
            new_customers=Count('id')
        ).order_by('month')

        return [
            {
                'month': r['month'].isoformat() if r['month'] else None,
                'new_customers': r['new_customers'],
            }
            for r in results
        ]
