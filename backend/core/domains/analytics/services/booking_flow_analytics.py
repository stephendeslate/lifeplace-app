# backend/core/domains/analytics/services/booking_flow_analytics.py
"""
Integration service for booking flow analytics.
Provides step-by-step funnel analysis and drop-off metrics.
"""
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDate
from decimal import Decimal


class BookingFlowIntegrationService:
    """
    Service to integrate booking flow analytics into the main analytics dashboard.
    Queries BookingFlowAnalytics and BookingSession models.
    """

    @staticmethod
    def get_funnel_analysis(start_date, end_date, flow_id=None):
        """
        Get step-by-step funnel analysis across all or a specific booking flow.

        Returns:
            List of dicts with step name, sessions reached, completions, drop-off rate
        """
        from core.domains.bookingflow.models import (
            BookingFlow, BookingFlowStep, BookingSession
        )

        # Get flows to analyze
        if flow_id:
            flows = BookingFlow.objects.filter(id=flow_id)
        else:
            flows = BookingFlow.objects.filter(is_active=True)

        if not flows.exists():
            return []

        # Get sessions in date range
        sessions = BookingSession.objects.filter(
            booking_flow__in=flows,
            created_at__range=(start_date, end_date)
        )

        total_sessions = sessions.count()
        if total_sessions == 0:
            return []

        # Step type display names
        step_names = {
            'INTRODUCTION': 'Introduction',
            'VENUE_SELECTION': 'Venue Selection',
            'DATETIME': 'Date & Time',
            'PACKAGE_SELECTION': 'Package Selection',
            'ADDONS': 'Add-ons',
            'QUESTIONNAIRE': 'Questionnaire',
            'PRICING_SUMMARY': 'Pricing Summary',
            'CONTACT_INFO': 'Contact Info',
            'PAYMENT': 'Payment',
            'CONFIRMATION': 'Confirmation',
        }

        # Get all unique steps across flows, ordered by typical order
        all_steps = BookingFlowStep.objects.filter(
            booking_flow__in=flows,
            is_enabled=True
        ).values('step_type').annotate(
            min_order=Count('order')
        ).order_by('step_type')

        # Get step order from first flow for consistent ordering
        step_order_map = {}
        first_flow = flows.first()
        if first_flow:
            for step in first_flow.steps.filter(is_enabled=True).order_by('order'):
                if step.step_type not in step_order_map:
                    step_order_map[step.step_type] = step.order

        funnel_data = []

        for step_info in all_steps:
            step_type = step_info['step_type']

            # Get all step IDs of this type across flows
            step_ids = list(BookingFlowStep.objects.filter(
                booking_flow__in=flows,
                step_type=step_type,
                is_enabled=True
            ).values_list('id', flat=True))

            # Count sessions that completed this step
            completed = sessions.filter(
                completed_steps__id__in=step_ids
            ).distinct().count()

            # Get order for this step type
            order = step_order_map.get(step_type, 99)

            # Count sessions that reached this step (current_step order >= this step's order)
            reached = sessions.filter(
                current_step__order__gte=order
            ).distinct().count()

            # Also include sessions that completed this step even if they moved past
            reached = max(reached, completed)

            # Calculate drop-off
            drop_off_rate = 0
            if reached > 0:
                drop_off_rate = round(((reached - completed) / reached) * 100, 1)

            completion_rate = round((completed / total_sessions) * 100, 1) if total_sessions > 0 else 0

            funnel_data.append({
                'step_type': step_type,
                'step_name': step_names.get(step_type, step_type),
                'order': order,
                'sessions_reached': reached,
                'sessions_completed': completed,
                'completion_rate': completion_rate,
                'drop_off_rate': drop_off_rate,
            })

        return sorted(funnel_data, key=lambda x: x['order'])

    @staticmethod
    def get_flow_performance_summary(start_date, end_date):
        """
        Get performance summary for each booking flow.

        Returns:
            List of dicts with flow name, total sessions, conversion rate, revenue
        """
        from core.domains.bookingflow.models import BookingFlow, BookingSession
        from core.domains.payments.models import Payment

        flows = BookingFlow.objects.filter(is_active=True)
        results = []

        for flow in flows:
            sessions = BookingSession.objects.filter(
                booking_flow=flow,
                created_at__range=(start_date, end_date)
            )

            total = sessions.count()
            completed = sessions.filter(is_completed=True).count()
            abandoned = sessions.filter(is_abandoned=True).count()

            # Get revenue from completed sessions' events
            completed_event_ids = list(sessions.filter(
                is_completed=True,
                created_event__isnull=False
            ).values_list('created_event_id', flat=True))

            revenue = Decimal('0')
            if completed_event_ids:
                revenue = Payment.objects.filter(
                    event_id__in=completed_event_ids,
                    status='COMPLETED'
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

            results.append({
                'flow_id': flow.id,
                'flow_name': flow.name,
                'event_type': flow.event_type.name if flow.event_type else 'Any',
                'total_sessions': total,
                'completed_sessions': completed,
                'abandoned_sessions': abandoned,
                'conversion_rate': round((completed / total) * 100, 1) if total > 0 else 0,
                'abandonment_rate': round((abandoned / total) * 100, 1) if total > 0 else 0,
                'total_revenue': float(revenue),
                'avg_revenue': float(revenue / completed) if completed > 0 else 0,
            })

        return sorted(results, key=lambda x: x['total_sessions'], reverse=True)

    @staticmethod
    def get_abandonment_analysis(start_date, end_date, flow_id=None):
        """
        Analyze where users are abandoning the booking flow.

        Returns:
            Dict with abandonment breakdown by step and time analysis
        """
        from core.domains.bookingflow.models import BookingSession

        sessions = BookingSession.objects.filter(
            is_abandoned=True,
            created_at__range=(start_date, end_date)
        )

        if flow_id:
            sessions = sessions.filter(booking_flow_id=flow_id)

        # Group by last step (current_step)
        step_abandonment = {}
        for session in sessions.select_related('current_step'):
            if session.current_step:
                step_type = session.current_step.step_type
                if step_type not in step_abandonment:
                    step_abandonment[step_type] = {
                        'count': 0,
                        'step_name': session.current_step.get_step_type_display(),
                        'order': session.current_step.order
                    }
                step_abandonment[step_type]['count'] += 1

        total_abandoned = sessions.count()

        # Calculate percentages
        for step_type in step_abandonment:
            step_abandonment[step_type]['percentage'] = round(
                (step_abandonment[step_type]['count'] / total_abandoned) * 100, 1
            ) if total_abandoned > 0 else 0

        # Sort by order
        sorted_abandonment = sorted(
            step_abandonment.items(),
            key=lambda x: x[1]['order']
        )

        return {
            'total_abandoned': total_abandoned,
            'by_step': [
                {
                    'step_type': step_type,
                    'step_name': data['step_name'],
                    'count': data['count'],
                    'percentage': data['percentage'],
                }
                for step_type, data in sorted_abandonment
            ]
        }

    @staticmethod
    def get_daily_booking_flow_trends(start_date, end_date, flow_id=None):
        """
        Get daily trends for booking flow metrics.

        Returns:
            List of dicts with date, sessions, completions, abandonment
        """
        from core.domains.bookingflow.models import BookingSession

        sessions = BookingSession.objects.filter(
            created_at__range=(start_date, end_date)
        )

        if flow_id:
            sessions = sessions.filter(booking_flow_id=flow_id)

        daily = sessions.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            total_sessions=Count('id'),
            completed_sessions=Count('id', filter=Q(is_completed=True)),
            abandoned_sessions=Count('id', filter=Q(is_abandoned=True)),
        ).order_by('date')

        return [
            {
                'date': d['date'].isoformat() if d['date'] else None,
                'total_sessions': d['total_sessions'],
                'completed_sessions': d['completed_sessions'],
                'abandoned_sessions': d['abandoned_sessions'],
                'conversion_rate': round(
                    (d['completed_sessions'] / d['total_sessions']) * 100, 1
                ) if d['total_sessions'] > 0 else 0,
            }
            for d in daily
        ]
