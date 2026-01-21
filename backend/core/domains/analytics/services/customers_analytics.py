# backend/core/domains/analytics/services/customers_analytics.py
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth


class CustomersAnalyticsService:
    """
    Service for customer and lead analytics - queries existing models directly.

    Date field logic:
    - Bookings/Leads → created_at (when booking was made)
    - Completed events → end_date (when event actually finished)
    - Revenue → from Payment records for completed events
    """

    @staticmethod
    def get_lead_source_report(start_date, end_date):
        """Leads by source (Facebook, referrals, walk-ins, client-portal)."""
        from core.domains.events.models import Event
        from core.domains.payments.models import Payment

        # Leads/bookings use created_at (when booking was made)
        results = Event.objects.filter(
            created_at__range=(start_date, end_date)
        ).values('lead_source').annotate(
            lead_count=Count('id'),
            confirmed_count=Count('id', filter=Q(status='CONFIRMED')),
            cancelled_count=Count('id', filter=Q(status='CANCELLED')),
        ).order_by('-lead_count')

        # Completed events use end_date
        completed_by_source = {}
        completed_results = Event.objects.filter(
            status='COMPLETED',
            end_date__range=(start_date, end_date)
        ).values('lead_source').annotate(
            completed_count=Count('id')
        )
        for cr in completed_results:
            completed_by_source[cr['lead_source'] or ''] = cr['completed_count']

        # Get actual revenue by lead source from payments (completed events by end_date)
        revenue_by_source = {}
        payment_results = Payment.objects.filter(
            event__status='COMPLETED',
            event__end_date__range=(start_date, end_date),
            status='COMPLETED'
        ).values('event__lead_source').annotate(
            total_value=Sum('amount')
        )
        for pr in payment_results:
            revenue_by_source[pr['event__lead_source'] or ''] = float(pr['total_value'] or 0)

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
                'converted_count': r['confirmed_count'] + completed_by_source.get(r['lead_source'] or '', 0),
                'conversion_rate': round(
                    (r['confirmed_count'] + completed_by_source.get(r['lead_source'] or '', 0)) / r['lead_count'] * 100, 1
                ) if r['lead_count'] > 0 else 0,
                'total_value': revenue_by_source.get(r['lead_source'] or '', 0),
            }
            for r in results
        ]

    @staticmethod
    def get_conversion_rate(start_date, end_date):
        """Inquiry to reservation conversion rate."""
        from core.domains.events.models import Event
        from core.domains.bookingflow.models import BookingSession

        # Bookings use created_at (when booking was made)
        events = Event.objects.filter(created_at__range=(start_date, end_date))

        total_events = events.count()
        leads = events.filter(status='LEAD').count()
        confirmed = events.filter(status='CONFIRMED').count()
        cancelled = events.filter(status='CANCELLED').count()

        # Completed events use end_date
        completed = Event.objects.filter(
            status='COMPLETED',
            end_date__range=(start_date, end_date)
        ).count()

        converted = confirmed + completed

        # Booking flow conversion - sessions use created_at which is appropriate
        # (we want to know when people started booking, not when events occur)
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
            # Filter by booking creation date
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
