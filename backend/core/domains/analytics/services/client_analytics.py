# backend/core/domains/analytics/services/client_analytics.py
"""
Client-facing analytics service.
Provides analytics scoped to a specific client's events.
"""
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta


class ClientAnalyticsService:
    """
    Service for client-specific analytics.
    All queries are scoped to the authenticated client's data.
    """

    @staticmethod
    def get_client_dashboard(client_id, start_date=None, end_date=None):
        """
        Get dashboard KPIs for a specific client.

        Returns:
            Dict with client-specific metrics
        """
        from core.domains.events.models import Event
        from core.domains.payments.models import Payment, PaymentInstallment

        if not end_date:
            end_date = timezone.now()
        if not start_date:
            start_date = end_date - timedelta(days=365)  # Default to last year

        # Get client's events
        events = Event.objects.filter(
            client_id=client_id,
            created_at__range=(start_date, end_date)
        )

        total_events = events.count()
        upcoming_events = events.filter(
            start_date__gte=timezone.now(),
            status__in=['CONFIRMED', 'LEAD']
        ).count()
        completed_events = events.filter(status='COMPLETED').count()
        cancelled_events = events.filter(status='CANCELLED').count()

        # Payment summary
        client_event_ids = list(events.values_list('id', flat=True))

        payments = Payment.objects.filter(event_id__in=client_event_ids)

        total_spent = payments.filter(
            status='COMPLETED'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        pending_payments = payments.filter(
            status='PENDING'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Overdue installments
        today = timezone.now().date()
        overdue = PaymentInstallment.objects.filter(
            payment__event_id__in=client_event_ids,
            status='PENDING',
            due_date__lt=today
        ).aggregate(
            count=Count('id'),
            amount=Sum('amount')
        )

        # Upcoming installments (next 30 days)
        upcoming_payments = PaymentInstallment.objects.filter(
            payment__event_id__in=client_event_ids,
            status='PENDING',
            due_date__gte=today,
            due_date__lte=today + timedelta(days=30)
        ).aggregate(
            count=Count('id'),
            amount=Sum('amount')
        )

        return {
            'events': {
                'total': total_events,
                'upcoming': upcoming_events,
                'completed': completed_events,
                'cancelled': cancelled_events,
            },
            'financials': {
                'total_spent': float(total_spent),
                'pending_amount': float(pending_payments),
                'overdue_count': overdue['count'] or 0,
                'overdue_amount': float(overdue['amount'] or 0),
                'upcoming_count': upcoming_payments['count'] or 0,
                'upcoming_amount': float(upcoming_payments['amount'] or 0),
            },
            'period': {
                'start_date': start_date.isoformat() if hasattr(start_date, 'isoformat') else str(start_date),
                'end_date': end_date.isoformat() if hasattr(end_date, 'isoformat') else str(end_date),
            }
        }

    @staticmethod
    def get_client_event_history(client_id, limit=10):
        """
        Get client's event history with status and payment info.

        Returns:
            List of events with summary info
        """
        from core.domains.events.models import Event
        from core.domains.payments.models import Payment

        events = Event.objects.filter(
            client_id=client_id
        ).select_related(
            'event_type', 'venue'
        ).order_by('-start_date')[:limit]

        results = []
        for event in events:
            # Get payment status
            payments = Payment.objects.filter(event=event)
            total_paid = payments.filter(status='COMPLETED').aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')
            total_pending = payments.filter(status='PENDING').aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')

            results.append({
                'id': event.id,
                'name': event.name or f"Event on {event.start_date.strftime('%b %d, %Y')}",
                'event_type': event.event_type.name if event.event_type else 'N/A',
                'venue': event.venue.name if event.venue else 'N/A',
                'start_date': event.start_date.isoformat(),
                'end_date': event.end_date.isoformat() if event.end_date else None,
                'status': event.status,
                'status_display': event.get_status_display(),
                'total_price': float(event.total_price or 0),
                'amount_paid': float(total_paid),
                'amount_pending': float(total_pending),
            })

        return results

    @staticmethod
    def get_client_spending_trends(client_id, months=12):
        """
        Get client's monthly spending trends.

        Returns:
            List of monthly spending data
        """
        from core.domains.events.models import Event
        from core.domains.payments.models import Payment

        end_date = timezone.now()
        start_date = end_date - timedelta(days=months * 30)

        # Get client's events
        event_ids = list(Event.objects.filter(
            client_id=client_id,
            created_at__range=(start_date, end_date)
        ).values_list('id', flat=True))

        if not event_ids:
            return []

        # Monthly spending from completed payments
        monthly = Payment.objects.filter(
            event_id__in=event_ids,
            status='COMPLETED',
            completed_at__isnull=False
        ).annotate(
            month=TruncMonth('completed_at')
        ).values('month').annotate(
            amount=Sum('amount'),
            payment_count=Count('id')
        ).order_by('month')

        return [
            {
                'month': m['month'].isoformat() if m['month'] else None,
                'month_name': m['month'].strftime('%b %Y') if m['month'] else 'Unknown',
                'amount': float(m['amount'] or 0),
                'payment_count': m['payment_count'],
            }
            for m in monthly
        ]

    @staticmethod
    def get_client_upcoming_deadlines(client_id, days=30):
        """
        Get upcoming payment and event deadlines for the client.

        Returns:
            List of upcoming deadlines
        """
        from core.domains.events.models import Event
        from core.domains.payments.models import PaymentInstallment
        from core.domains.contracts.models import Contract

        today = timezone.now()
        end_date = today + timedelta(days=days)

        deadlines = []

        # Get client's events
        event_ids = list(Event.objects.filter(
            client_id=client_id
        ).values_list('id', flat=True))

        if not event_ids:
            return []

        # Upcoming payment installments
        installments = PaymentInstallment.objects.filter(
            payment__event_id__in=event_ids,
            status='PENDING',
            due_date__gte=today.date(),
            due_date__lte=end_date.date()
        ).select_related('payment', 'payment__event').order_by('due_date')

        for inst in installments:
            deadlines.append({
                'type': 'payment',
                'title': f"Payment Due: {inst.payment.event.name or 'Event'}",
                'description': inst.description or f"Installment #{inst.installment_number}",
                'due_date': inst.due_date.isoformat(),
                'amount': float(inst.amount),
                'event_id': inst.payment.event_id,
                'urgency': 'high' if inst.due_date <= (today.date() + timedelta(days=7)) else 'normal',
            })

        # Upcoming events
        upcoming_events = Event.objects.filter(
            client_id=client_id,
            start_date__gte=today,
            start_date__lte=end_date,
            status__in=['CONFIRMED', 'LEAD']
        ).select_related('event_type', 'venue').order_by('start_date')

        for event in upcoming_events:
            deadlines.append({
                'type': 'event',
                'title': event.name or f"Upcoming {event.event_type.name if event.event_type else 'Event'}",
                'description': f"At {event.venue.name if event.venue else 'TBD'}",
                'due_date': event.start_date.isoformat(),
                'event_id': event.id,
                'urgency': 'high' if event.start_date <= (today + timedelta(days=7)) else 'normal',
            })

        # Contracts pending signature
        pending_contracts = Contract.objects.filter(
            event_id__in=event_ids,
            status='SENT',
            expires_at__gte=today,
            expires_at__lte=end_date
        ).select_related('event')

        for contract in pending_contracts:
            deadlines.append({
                'type': 'contract',
                'title': f"Contract Expires: {contract.event.name or 'Event'}",
                'description': 'Requires your signature',
                'due_date': contract.expires_at.isoformat(),
                'event_id': contract.event_id,
                'contract_id': contract.id,
                'urgency': 'high' if contract.expires_at <= (today + timedelta(days=3)) else 'normal',
            })

        # Sort by due date
        return sorted(deadlines, key=lambda x: x['due_date'])
