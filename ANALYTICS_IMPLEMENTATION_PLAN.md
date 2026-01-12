# Analytics Domain Implementation Plan

## Gap Verification Summary

| Gap | Status | Evidence |
|-----|--------|----------|
| No Celery task for BookingFlowAnalytics | **VERIFIED** | `celery.py:76-185` has no analytics tasks; `update_daily_analytics()` is only manually triggered via API |
| BookingFlowAnalytics not integrated | **VERIFIED** | Main analytics only imports `BookingSession` for counts; `step_completion_data` and `step_drop_off_data` not used in dashboard |
| QuestionnaireAnalytics isolated | **VERIFIED** | Grep shows zero references to `QuestionnaireAnalytics` in `analytics/` domain; only accessible via `/api/questionnaires/{id}/analytics/` |
| Client Portal uses mock data | **VERIFIED** | No `analytics.api.ts` exists; `AnalyticsDashboard.tsx:71-140` contains hardcoded values |

---

## Implementation Plan

### Phase 1: Backend Foundation

#### 1.1 Create Celery Tasks for Analytics

**File to create:** `backend/core/domains/analytics/tasks.py`

```python
# backend/core/domains/analytics/tasks.py
"""
Celery tasks for analytics domain.
Handles scheduled aggregation and caching of analytics data.
"""
import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def update_all_booking_flow_analytics(self, date_str=None):
    """
    Update daily analytics for ALL active booking flows.
    Should run daily via Celery beat.

    Args:
        date_str: Optional date string (YYYY-MM-DD). Defaults to yesterday.
    """
    from core.domains.bookingflow.models import BookingFlow
    from core.domains.bookingflow.services import BookingFlowAnalyticsService

    if date_str:
        date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
    else:
        # Default to yesterday (completed day)
        date = (timezone.now() - timedelta(days=1)).date()

    active_flows = BookingFlow.objects.filter(is_active=True)
    results = {'success': [], 'failed': []}

    for flow in active_flows:
        try:
            BookingFlowAnalyticsService.update_daily_analytics(flow.id, date)
            results['success'].append(flow.id)
            logger.info(f"Updated analytics for flow {flow.name} on {date}")
        except Exception as e:
            results['failed'].append({'flow_id': flow.id, 'error': str(e)})
            logger.error(f"Failed to update analytics for flow {flow.id}: {e}")

    return results


@shared_task(bind=True, max_retries=3)
def backfill_booking_flow_analytics(self, flow_id, start_date_str, end_date_str):
    """
    Backfill analytics for a booking flow over a date range.
    Useful for recovering missed days or initial setup.

    Args:
        flow_id: The booking flow ID
        start_date_str: Start date (YYYY-MM-DD)
        end_date_str: End date (YYYY-MM-DD)
    """
    from core.domains.bookingflow.services import BookingFlowAnalyticsService

    start = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date()
    end = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date()

    current = start
    results = {'success': [], 'failed': []}

    while current <= end:
        try:
            BookingFlowAnalyticsService.update_daily_analytics(flow_id, current)
            results['success'].append(current.isoformat())
        except Exception as e:
            results['failed'].append({'date': current.isoformat(), 'error': str(e)})
        current += timedelta(days=1)

    return results


@shared_task
def cache_daily_kpis():
    """
    Pre-compute and cache common KPI queries.
    Reduces database load during peak hours.
    """
    from django.core.cache import cache
    from core.domains.analytics.services import DashboardService

    # Cache common date ranges
    ranges = [
        ('7d', 7),
        ('30d', 30),
        ('90d', 90),
    ]

    end_date = timezone.now()

    for label, days in ranges:
        start_date = end_date - timedelta(days=days)
        cache_key = f"analytics:kpi:{label}"

        try:
            data = DashboardService.get_kpi_summary(start_date, end_date)
            cache.set(cache_key, data, timeout=3600)  # 1 hour
            logger.info(f"Cached KPIs for {label}")
        except Exception as e:
            logger.error(f"Failed to cache KPIs for {label}: {e}")
```

**File to modify:** `backend/core/celery.py`

Add to `beat_schedule` (around line 185):

```python
# Analytics tasks
'update-booking-flow-analytics': {
    'task': 'core.domains.analytics.tasks.update_all_booking_flow_analytics',
    'schedule': 24 * 60 * 60,  # Daily at midnight
    'options': {'queue': 'analytics'}
},
'cache-daily-kpis': {
    'task': 'core.domains.analytics.tasks.cache_daily_kpis',
    'schedule': 60 * 60,  # Hourly
    'options': {'queue': 'analytics'}
},
```

---

#### 1.2 Integrate BookingFlowAnalytics into Main Analytics

**File to create:** `backend/core/domains/analytics/services/booking_flow_analytics.py`

```python
# backend/core/domains/analytics/services/booking_flow_analytics.py
"""
Integration service for booking flow analytics.
Provides step-by-step funnel analysis and drop-off metrics.
"""
from django.db.models import Avg, Sum
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
            BookingFlow, BookingFlowStep, BookingSession, BookingFlowAnalytics
        )

        # Get flows to analyze
        if flow_id:
            flows = BookingFlow.objects.filter(id=flow_id)
        else:
            flows = BookingFlow.objects.filter(is_active=True)

        if not flows.exists():
            return []

        # Get all unique steps across flows, ordered by typical order
        all_steps = BookingFlowStep.objects.filter(
            booking_flow__in=flows,
            is_enabled=True
        ).order_by('order').values('step_type', 'order').distinct()

        # Calculate metrics per step type
        sessions = BookingSession.objects.filter(
            booking_flow__in=flows,
            created_at__range=(start_date, end_date)
        )

        total_sessions = sessions.count()
        if total_sessions == 0:
            return []

        funnel_data = []

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

        # Get step IDs for each step type
        for step_info in all_steps:
            step_type = step_info['step_type']

            # Get all step IDs of this type across flows
            step_ids = BookingFlowStep.objects.filter(
                booking_flow__in=flows,
                step_type=step_type,
                is_enabled=True
            ).values_list('id', flat=True)

            # Count sessions that completed this step
            completed = sessions.filter(
                completed_steps__id__in=step_ids
            ).distinct().count()

            # Count sessions that reached but didn't complete
            reached = sessions.filter(
                current_step__order__gte=step_info['order']
            ).distinct().count()

            # Calculate drop-off
            drop_off_rate = 0
            if reached > 0:
                drop_off_rate = round(((reached - completed) / reached) * 100, 1)

            completion_rate = round((completed / total_sessions) * 100, 1) if total_sessions > 0 else 0

            funnel_data.append({
                'step_type': step_type,
                'step_name': step_names.get(step_type, step_type),
                'order': step_info['order'],
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
            completed_event_ids = sessions.filter(
                is_completed=True,
                created_event__isnull=False
            ).values_list('created_event_id', flat=True)

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
        from core.domains.bookingflow.models import BookingSession, BookingFlowStep

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
            total_sessions=Sum('id'),
            # Note: These need actual count not sum
        ).order_by('date')

        # Re-query for accurate counts
        from django.db.models import Count
        daily = sessions.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            total_sessions=Count('id'),
            completed_sessions=Count('id', filter=models.Q(is_completed=True)),
            abandoned_sessions=Count('id', filter=models.Q(is_abandoned=True)),
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
```

**File to modify:** `backend/core/domains/analytics/services/__init__.py`

Add import:
```python
from .booking_flow_analytics import BookingFlowIntegrationService
```

---

#### 1.3 Integrate QuestionnaireAnalytics into Main Analytics

**File to create:** `backend/core/domains/analytics/services/questionnaire_analytics.py`

```python
# backend/core/domains/analytics/services/questionnaire_analytics.py
"""
Integration service for questionnaire analytics.
Provides completion rates and response insights for the main dashboard.
"""
from django.db.models import Count, Q
from datetime import timedelta


class QuestionnaireIntegrationService:
    """
    Service to integrate questionnaire analytics into the main analytics dashboard.
    """

    @staticmethod
    def get_questionnaire_summary(start_date, end_date):
        """
        Get summary of questionnaire performance across all questionnaires.

        Returns:
            Dict with overall stats and per-questionnaire breakdown
        """
        from core.domains.questionnaires.models import (
            Questionnaire, QuestionnaireField, QuestionnaireResponse
        )
        from core.domains.events.models import Event

        # Get events in date range
        event_ids = Event.objects.filter(
            created_at__range=(start_date, end_date)
        ).values_list('id', flat=True)

        questionnaires = Questionnaire.objects.filter(is_active=True).prefetch_related('fields')

        results = []
        total_events_with_responses = 0
        total_complete = 0
        total_incomplete = 0

        for q in questionnaires:
            field_ids = list(q.fields.values_list('id', flat=True))

            if not field_ids:
                continue

            # Events with any response to this questionnaire
            events_with_responses = QuestionnaireResponse.objects.filter(
                field_id__in=field_ids,
                event_id__in=event_ids
            ).values('event_id').distinct().count()

            if events_with_responses == 0:
                continue

            # Required fields
            required_field_ids = set(q.fields.filter(required=True).values_list('id', flat=True))

            # Calculate completion
            complete_count = 0
            incomplete_count = 0

            responding_event_ids = QuestionnaireResponse.objects.filter(
                field_id__in=field_ids,
                event_id__in=event_ids
            ).values_list('event_id', flat=True).distinct()

            for event_id in responding_event_ids:
                responded_field_ids = set(
                    QuestionnaireResponse.objects.filter(
                        event_id=event_id,
                        field_id__in=field_ids
                    ).values_list('field_id', flat=True)
                )

                if required_field_ids.issubset(responded_field_ids):
                    complete_count += 1
                else:
                    incomplete_count += 1

            completion_rate = round((complete_count / events_with_responses) * 100, 1) if events_with_responses > 0 else 0

            results.append({
                'questionnaire_id': q.id,
                'questionnaire_name': q.name,
                'total_fields': len(field_ids),
                'required_fields': len(required_field_ids),
                'events_with_responses': events_with_responses,
                'complete_responses': complete_count,
                'incomplete_responses': incomplete_count,
                'completion_rate': completion_rate,
            })

            total_events_with_responses += events_with_responses
            total_complete += complete_count
            total_incomplete += incomplete_count

        overall_completion = round(
            (total_complete / total_events_with_responses) * 100, 1
        ) if total_events_with_responses > 0 else 0

        return {
            'overall': {
                'total_events_with_responses': total_events_with_responses,
                'total_complete': total_complete,
                'total_incomplete': total_incomplete,
                'overall_completion_rate': overall_completion,
            },
            'by_questionnaire': sorted(results, key=lambda x: x['events_with_responses'], reverse=True)
        }

    @staticmethod
    def get_field_completion_heatmap(questionnaire_id, start_date, end_date):
        """
        Get field-level completion rates for a specific questionnaire.
        Useful for identifying problematic fields.

        Returns:
            List of dicts with field name, type, completion rate, response count
        """
        from core.domains.questionnaires.models import (
            Questionnaire, QuestionnaireField, QuestionnaireResponse
        )
        from core.domains.events.models import Event

        try:
            questionnaire = Questionnaire.objects.get(id=questionnaire_id)
        except Questionnaire.DoesNotExist:
            return []

        # Get events in date range
        event_ids = Event.objects.filter(
            created_at__range=(start_date, end_date)
        ).values_list('id', flat=True)

        fields = questionnaire.fields.all().order_by('order')
        field_ids = [f.id for f in fields]

        # Total events that started this questionnaire
        total_events = QuestionnaireResponse.objects.filter(
            field_id__in=field_ids,
            event_id__in=event_ids
        ).values('event_id').distinct().count()

        if total_events == 0:
            return []

        results = []
        for field in fields:
            response_count = QuestionnaireResponse.objects.filter(
                field_id=field.id,
                event_id__in=event_ids
            ).count()

            completion_rate = round((response_count / total_events) * 100, 1)

            results.append({
                'field_id': field.id,
                'field_name': field.name,
                'field_type': field.type,
                'required': field.required,
                'order': field.order,
                'response_count': response_count,
                'completion_rate': completion_rate,
            })

        return results

    @staticmethod
    def get_low_completion_fields(start_date, end_date, threshold=80):
        """
        Identify fields with completion rates below threshold.
        Useful for improving questionnaire design.

        Args:
            threshold: Minimum acceptable completion rate (default 80%)

        Returns:
            List of problematic fields across all questionnaires
        """
        from core.domains.questionnaires.models import (
            Questionnaire, QuestionnaireField, QuestionnaireResponse
        )
        from core.domains.events.models import Event

        event_ids = Event.objects.filter(
            created_at__range=(start_date, end_date)
        ).values_list('id', flat=True)

        problematic_fields = []

        for questionnaire in Questionnaire.objects.filter(is_active=True).prefetch_related('fields'):
            field_ids = list(questionnaire.fields.values_list('id', flat=True))

            if not field_ids:
                continue

            total_events = QuestionnaireResponse.objects.filter(
                field_id__in=field_ids,
                event_id__in=event_ids
            ).values('event_id').distinct().count()

            if total_events < 10:  # Need minimum sample size
                continue

            for field in questionnaire.fields.filter(required=True):
                response_count = QuestionnaireResponse.objects.filter(
                    field_id=field.id,
                    event_id__in=event_ids
                ).count()

                completion_rate = round((response_count / total_events) * 100, 1)

                if completion_rate < threshold:
                    problematic_fields.append({
                        'questionnaire_id': questionnaire.id,
                        'questionnaire_name': questionnaire.name,
                        'field_id': field.id,
                        'field_name': field.name,
                        'field_type': field.type,
                        'completion_rate': completion_rate,
                        'gap_from_threshold': round(threshold - completion_rate, 1),
                    })

        return sorted(problematic_fields, key=lambda x: x['completion_rate'])
```

**File to modify:** `backend/core/domains/analytics/services/__init__.py`

Add import:
```python
from .questionnaire_analytics import QuestionnaireIntegrationService
```

---

#### 1.4 Add New API Endpoints

**File to modify:** `backend/core/domains/analytics/views_v2.py`

Add new view functions (after existing operations views):

```python
# ============================================================================
# BOOKING FLOW ANALYTICS
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def booking_flow_funnel(request):
    """
    Step-by-step funnel analysis for booking flows.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
        - flow_id: Optional specific flow ID
    """
    from .services import BookingFlowIntegrationService

    start_date, end_date = parse_date_range(request)
    flow_id = request.query_params.get('flow_id')

    data = BookingFlowIntegrationService.get_funnel_analysis(
        start_date, end_date, flow_id
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def booking_flow_performance(request):
    """
    Performance summary for all booking flows.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    from .services import BookingFlowIntegrationService

    start_date, end_date = parse_date_range(request)
    data = BookingFlowIntegrationService.get_flow_performance_summary(start_date, end_date)
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def booking_flow_abandonment(request):
    """
    Abandonment analysis for booking flows.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
        - flow_id: Optional specific flow ID
    """
    from .services import BookingFlowIntegrationService

    start_date, end_date = parse_date_range(request)
    flow_id = request.query_params.get('flow_id')

    data = BookingFlowIntegrationService.get_abandonment_analysis(
        start_date, end_date, flow_id
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def booking_flow_trends(request):
    """
    Daily trends for booking flow metrics.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
        - flow_id: Optional specific flow ID
    """
    from .services import BookingFlowIntegrationService

    start_date, end_date = parse_date_range(request)
    flow_id = request.query_params.get('flow_id')

    data = BookingFlowIntegrationService.get_daily_booking_flow_trends(
        start_date, end_date, flow_id
    )
    return Response(data)


# ============================================================================
# QUESTIONNAIRE ANALYTICS
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def questionnaire_summary(request):
    """
    Questionnaire completion summary across all questionnaires.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    from .services import QuestionnaireIntegrationService

    start_date, end_date = parse_date_range(request)
    data = QuestionnaireIntegrationService.get_questionnaire_summary(start_date, end_date)
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def questionnaire_field_heatmap(request, questionnaire_id):
    """
    Field-level completion heatmap for a questionnaire.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    from .services import QuestionnaireIntegrationService

    start_date, end_date = parse_date_range(request)
    data = QuestionnaireIntegrationService.get_field_completion_heatmap(
        questionnaire_id, start_date, end_date
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def questionnaire_problem_fields(request):
    """
    Identify fields with low completion rates.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
        - threshold: Minimum completion rate (default: 80)
    """
    from .services import QuestionnaireIntegrationService

    start_date, end_date = parse_date_range(request)
    threshold = float(request.query_params.get('threshold', 80))

    data = QuestionnaireIntegrationService.get_low_completion_fields(
        start_date, end_date, threshold
    )
    return Response(data)
```

**File to modify:** `backend/core/domains/analytics/urls_v2.py`

Add new URL patterns:

```python
# Booking Flow Analytics
path('booking-flow/funnel/', views_v2.booking_flow_funnel, name='booking-flow-funnel'),
path('booking-flow/performance/', views_v2.booking_flow_performance, name='booking-flow-performance'),
path('booking-flow/abandonment/', views_v2.booking_flow_abandonment, name='booking-flow-abandonment'),
path('booking-flow/trends/', views_v2.booking_flow_trends, name='booking-flow-trends'),

# Questionnaire Analytics
path('questionnaires/summary/', views_v2.questionnaire_summary, name='questionnaire-summary'),
path('questionnaires/<int:questionnaire_id>/heatmap/', views_v2.questionnaire_field_heatmap, name='questionnaire-heatmap'),
path('questionnaires/problem-fields/', views_v2.questionnaire_problem_fields, name='questionnaire-problems'),
```

---

### Phase 2: Client Portal Analytics API

#### 2.1 Create Client-Specific Analytics Service

**File to create:** `backend/core/domains/analytics/services/client_analytics.py`

```python
# backend/core/domains/analytics/services/client_analytics.py
"""
Client-facing analytics service.
Provides analytics scoped to a specific client's events.
"""
from django.db.models import Count, Sum, Avg, Q
from django.db.models.functions import TruncMonth
from decimal import Decimal


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
        from django.utils import timezone
        from datetime import timedelta

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
        client_event_ids = events.values_list('id', flat=True)

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
        from django.utils import timezone
        from datetime import timedelta

        end_date = timezone.now()
        start_date = end_date - timedelta(days=months * 30)

        # Get client's events
        event_ids = Event.objects.filter(
            client_id=client_id,
            created_at__range=(start_date, end_date)
        ).values_list('id', flat=True)

        # Monthly spending from completed payments
        monthly = Payment.objects.filter(
            event_id__in=event_ids,
            status='COMPLETED'
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
        from django.utils import timezone
        from datetime import timedelta

        today = timezone.now()
        end_date = today + timedelta(days=days)

        deadlines = []

        # Get client's events
        event_ids = Event.objects.filter(
            client_id=client_id
        ).values_list('id', flat=True)

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
        ).order_by('start_date')

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
```

**File to modify:** `backend/core/domains/analytics/services/__init__.py`

Add import:
```python
from .client_analytics import ClientAnalyticsService
```

---

#### 2.2 Create Client Analytics Views

**File to create:** `backend/core/domains/analytics/views_client.py`

```python
# backend/core/domains/analytics/views_client.py
"""
Client-facing analytics API views.
All views require authentication and scope data to the authenticated client.
"""
from datetime import datetime, timedelta
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .services import ClientAnalyticsService


def parse_date_range(request):
    """Parse date range from query params, defaulting to last year."""
    end_date = request.query_params.get('end_date')
    start_date = request.query_params.get('start_date')

    if end_date:
        try:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            if timezone.is_naive(end_date):
                end_date = timezone.make_aware(end_date)
        except ValueError:
            end_date = timezone.now()
    else:
        end_date = timezone.now()

    if start_date:
        try:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if timezone.is_naive(start_date):
                start_date = timezone.make_aware(start_date)
        except ValueError:
            start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(days=365)

    return start_date, end_date


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_dashboard(request):
    """
    Get dashboard KPIs for the authenticated client.

    Query params:
        - start_date: ISO date string (default: 1 year ago)
        - end_date: ISO date string (default: now)
    """
    # Ensure user is a client
    if request.user.role != 'CLIENT':
        return Response(
            {'detail': 'This endpoint is only available for clients'},
            status=status.HTTP_403_FORBIDDEN
        )

    start_date, end_date = parse_date_range(request)
    data = ClientAnalyticsService.get_client_dashboard(
        request.user.id, start_date, end_date
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_event_history(request):
    """
    Get event history for the authenticated client.

    Query params:
        - limit: Number of events to return (default: 10)
    """
    if request.user.role != 'CLIENT':
        return Response(
            {'detail': 'This endpoint is only available for clients'},
            status=status.HTTP_403_FORBIDDEN
        )

    limit = int(request.query_params.get('limit', 10))
    data = ClientAnalyticsService.get_client_event_history(request.user.id, limit)
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_spending_trends(request):
    """
    Get monthly spending trends for the authenticated client.

    Query params:
        - months: Number of months to include (default: 12)
    """
    if request.user.role != 'CLIENT':
        return Response(
            {'detail': 'This endpoint is only available for clients'},
            status=status.HTTP_403_FORBIDDEN
        )

    months = int(request.query_params.get('months', 12))
    data = ClientAnalyticsService.get_client_spending_trends(request.user.id, months)
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_deadlines(request):
    """
    Get upcoming deadlines for the authenticated client.

    Query params:
        - days: Number of days to look ahead (default: 30)
    """
    if request.user.role != 'CLIENT':
        return Response(
            {'detail': 'This endpoint is only available for clients'},
            status=status.HTTP_403_FORBIDDEN
        )

    days = int(request.query_params.get('days', 30))
    data = ClientAnalyticsService.get_client_upcoming_deadlines(request.user.id, days)
    return Response(data)
```

---

#### 2.3 Create Client Analytics URLs

**File to create:** `backend/core/domains/analytics/urls_client.py`

```python
# backend/core/domains/analytics/urls_client.py
"""
Client-facing analytics URL configuration.
These endpoints are for authenticated clients to view their own data.
"""
from django.urls import path
from . import views_client

app_name = 'client-analytics'

urlpatterns = [
    path('dashboard/', views_client.client_dashboard, name='client-dashboard'),
    path('events/', views_client.client_event_history, name='client-events'),
    path('spending/', views_client.client_spending_trends, name='client-spending'),
    path('deadlines/', views_client.client_deadlines, name='client-deadlines'),
]
```

**File to modify:** `backend/core/urls.py` (or main URL configuration)

Add client analytics URLs:
```python
path('api/client/analytics/', include('core.domains.analytics.urls_client')),
```

---

### Phase 3: Frontend Implementation

#### 3.1 Admin CRM - Add Booking Flow Analytics Tab

**File to create:** `frontend/admin-crm/src/pages/analytics/tabs/BookingFlowTab.tsx`

```tsx
// frontend/admin-crm/src/pages/analytics/tabs/BookingFlowTab.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';

import { KPICard } from '../../../components/analytics';
import {
  useBookingFlowFunnel,
  useBookingFlowPerformance,
  useBookingFlowAbandonment,
} from '../../../hooks/useAnalytics';
import type { DateRange } from '../../../types/analytics.types';

interface BookingFlowTabProps {
  dateRange: DateRange;
}

export const BookingFlowTab: React.FC<BookingFlowTabProps> = ({ dateRange }) => {
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');

  const { data: funnel, isLoading: funnelLoading } = useBookingFlowFunnel(
    dateRange,
    selectedFlowId || undefined
  );
  const { data: performance, isLoading: performanceLoading } = useBookingFlowPerformance(dateRange);
  const { data: abandonment, isLoading: abandonmentLoading } = useBookingFlowAbandonment(
    dateRange,
    selectedFlowId || undefined
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(value);

  // Prepare funnel chart data
  const funnelData = funnel?.map((step, index) => ({
    name: step.step_name,
    value: step.completion_rate,
    fill: index === 0 ? '#4caf50' : index === funnel.length - 1 ? '#2196f3' : '#ff9800',
  })) || [];

  // Colors for abandonment chart
  const COLORS = ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0'];

  return (
    <Box>
      {/* Flow Selector */}
      {performance && performance.length > 0 && (
        <Box mb={3}>
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel>Filter by Booking Flow</InputLabel>
            <Select
              value={selectedFlowId}
              onChange={(e) => setSelectedFlowId(e.target.value)}
              label="Filter by Booking Flow"
            >
              <MenuItem value="">All Flows</MenuItem>
              {performance.map((flow) => (
                <MenuItem key={flow.flow_id} value={flow.flow_id}>
                  {flow.flow_name} ({flow.event_type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Flow Performance Summary */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Booking Flow Performance
        </Typography>
        {performanceLoading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Flow Name</TableCell>
                  <TableCell>Event Type</TableCell>
                  <TableCell align="right">Sessions</TableCell>
                  <TableCell align="right">Completed</TableCell>
                  <TableCell align="right">Conversion</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {performance?.map((flow) => (
                  <TableRow key={flow.flow_id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {flow.flow_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={flow.event_type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">{flow.total_sessions}</TableCell>
                    <TableCell align="right">{flow.completed_sessions}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${flow.conversion_rate}%`}
                        size="small"
                        color={flow.conversion_rate >= 50 ? 'success' : flow.conversion_rate >= 25 ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(flow.total_revenue)}</TableCell>
                  </TableRow>
                ))}
                {(!performance || performance.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No booking flow data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Step-by-Step Funnel */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Conversion Funnel
        </Typography>
        <Paper sx={{ p: 2 }}>
          {funnelLoading ? (
            <Skeleton variant="rectangular" height={400} />
          ) : funnel && funnel.length > 0 ? (
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={funnel}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="step_name" width={90} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Completion Rate']} />
                  <Bar dataKey="completion_rate" radius={[0, 4, 4, 0]}>
                    {funnel.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.completion_rate >= 70
                            ? '#4caf50'
                            : entry.completion_rate >= 40
                            ? '#ff9800'
                            : '#f44336'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Typography color="text.secondary" textAlign="center" py={4}>
              No funnel data available for the selected period
            </Typography>
          )}
        </Paper>
      </Box>

      {/* Drop-off Analysis */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Step-by-Step Drop-off Rates
        </Typography>
        {funnelLoading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : (
          <Box
            display="flex"
            gap={2}
            sx={{
              flexWrap: 'wrap',
              '& > *': { flex: '1 1 150px', minWidth: 150 },
            }}
          >
            {funnel?.map((step) => (
              <KPICard
                key={step.step_type}
                title={step.step_name}
                value={`${step.drop_off_rate}%`}
                subtitle="drop-off rate"
                isLoading={funnelLoading}
                color={step.drop_off_rate <= 10 ? 'success' : step.drop_off_rate <= 25 ? 'warning' : 'error'}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Abandonment Analysis */}
      <Box>
        <Typography variant="h6" mb={2}>
          Abandonment Analysis
        </Typography>
        <Box display="flex" gap={3} flexWrap="wrap">
          <Paper sx={{ p: 2, flex: '1 1 250px', minWidth: 250 }}>
            <Typography variant="subtitle2" mb={1}>
              Total Abandoned Sessions
            </Typography>
            <Typography variant="h3" color="error.main">
              {abandonmentLoading ? <Skeleton width={80} /> : abandonment?.total_abandoned || 0}
            </Typography>
          </Paper>

          <Box flex="2 1 400px" minWidth={300}>
            {abandonmentLoading ? (
              <Skeleton variant="rectangular" height={250} />
            ) : abandonment?.by_step && abandonment.by_step.length > 0 ? (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Step Where Users Left</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">% of Abandoned</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {abandonment.by_step.map((step, index) => (
                      <TableRow key={step.step_type}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            {step.step_name}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{step.count}</TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" gap={1}>
                            <LinearProgress
                              variant="determinate"
                              value={step.percentage}
                              sx={{ flex: 1, height: 8, borderRadius: 4 }}
                            />
                            {step.percentage}%
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No abandonment data available
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default BookingFlowTab;
```

---

#### 3.2 Admin CRM - Add Questionnaire Analytics Tab

**File to create:** `frontend/admin-crm/src/pages/analytics/tabs/QuestionnairesTab.tsx`

```tsx
// frontend/admin-crm/src/pages/analytics/tabs/QuestionnairesTab.tsx
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  LinearProgress,
  Chip,
  Alert,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

import { KPICard } from '../../../components/analytics';
import {
  useQuestionnaireSummary,
  useQuestionnaireProblemFields,
} from '../../../hooks/useAnalytics';
import type { DateRange } from '../../../types/analytics.types';

interface QuestionnairesTabProps {
  dateRange: DateRange;
}

export const QuestionnairesTab: React.FC<QuestionnairesTabProps> = ({ dateRange }) => {
  const { data: summary, isLoading: summaryLoading } = useQuestionnaireSummary(dateRange);
  const { data: problemFields, isLoading: problemsLoading } = useQuestionnaireProblemFields(dateRange);

  return (
    <Box>
      {/* Overall Summary */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Overall Questionnaire Completion
        </Typography>
        <Box
          display="flex"
          gap={2}
          mb={3}
          sx={{
            flexWrap: 'wrap',
            '& > *': { flex: '1 1 200px', minWidth: 200 },
          }}
        >
          <KPICard
            title="Events with Responses"
            value={summary?.overall?.total_events_with_responses ?? 0}
            isLoading={summaryLoading}
            color="primary"
          />
          <KPICard
            title="Complete Responses"
            value={summary?.overall?.total_complete ?? 0}
            isLoading={summaryLoading}
            color="success"
          />
          <KPICard
            title="Incomplete Responses"
            value={summary?.overall?.total_incomplete ?? 0}
            isLoading={summaryLoading}
            color="warning"
          />
          <KPICard
            title="Completion Rate"
            value={`${summary?.overall?.overall_completion_rate ?? 0}%`}
            isLoading={summaryLoading}
            color={
              (summary?.overall?.overall_completion_rate ?? 0) >= 80
                ? 'success'
                : (summary?.overall?.overall_completion_rate ?? 0) >= 60
                ? 'warning'
                : 'error'
            }
          />
        </Box>
      </Box>

      {/* Per-Questionnaire Breakdown */}
      <Box mb={4}>
        <Typography variant="h6" mb={2}>
          Questionnaire Performance
        </Typography>
        {summaryLoading ? (
          <Skeleton variant="rectangular" height={300} />
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Questionnaire</TableCell>
                  <TableCell align="right">Fields</TableCell>
                  <TableCell align="right">Required</TableCell>
                  <TableCell align="right">Responses</TableCell>
                  <TableCell align="right">Complete</TableCell>
                  <TableCell align="right">Completion Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary?.by_questionnaire?.map((q) => (
                  <TableRow key={q.questionnaire_id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {q.questionnaire_name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{q.total_fields}</TableCell>
                    <TableCell align="right">{q.required_fields}</TableCell>
                    <TableCell align="right">{q.events_with_responses}</TableCell>
                    <TableCell align="right">{q.complete_responses}</TableCell>
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end">
                        <LinearProgress
                          variant="determinate"
                          value={q.completion_rate}
                          sx={{
                            width: 60,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor:
                                q.completion_rate >= 80
                                  ? 'success.main'
                                  : q.completion_rate >= 60
                                  ? 'warning.main'
                                  : 'error.main',
                            },
                          }}
                        />
                        <Typography variant="body2">{q.completion_rate}%</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {(!summary?.by_questionnaire || summary.by_questionnaire.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No questionnaire data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Problem Fields Alert */}
      <Box>
        <Typography variant="h6" mb={2}>
          Fields Needing Attention
        </Typography>
        {problemsLoading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : problemFields && problemFields.length > 0 ? (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              The following required fields have completion rates below 80%. Consider simplifying these
              fields or making them optional.
            </Alert>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Questionnaire</TableCell>
                    <TableCell>Field Name</TableCell>
                    <TableCell>Field Type</TableCell>
                    <TableCell align="right">Completion Rate</TableCell>
                    <TableCell align="right">Gap</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {problemFields.map((field) => (
                    <TableRow key={`${field.questionnaire_id}-${field.field_id}`}>
                      <TableCell>{field.questionnaire_name}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <WarningIcon color="warning" fontSize="small" />
                          {field.field_name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={field.field_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${field.completion_rate}%`}
                          size="small"
                          color="error"
                        />
                      </TableCell>
                      <TableCell align="right">-{field.gap_from_threshold}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="success.main">
              All required fields have completion rates above 80%
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default QuestionnairesTab;
```

---

#### 3.3 Update Admin CRM Analytics Dashboard

**File to modify:** `frontend/admin-crm/src/pages/analytics/AnalyticsDashboard.tsx`

Add imports and tabs for BookingFlow and Questionnaires:

```tsx
// Add to imports
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import QuizIcon from '@mui/icons-material/Quiz';
import { BookingFlowTab } from './tabs/BookingFlowTab';
import { QuestionnairesTab } from './tabs/QuestionnairesTab';

// Update Tabs component (around line 165)
<Tabs
  value={activeTab}
  onChange={(_, newValue) => setActiveTab(newValue)}
  variant="scrollable"
  scrollButtons="auto"
  sx={{
    '& .MuiTab-root': {
      minHeight: 56,
      textTransform: 'none',
    },
  }}
>
  <Tab icon={<AttachMoneyIcon />} iconPosition="start" label="Sales & Reservations" />
  <Tab icon={<EventIcon />} iconPosition="start" label="Events & Guests" />
  <Tab icon={<PeopleIcon />} iconPosition="start" label="Customers & Leads" />
  <Tab icon={<TrendingUpIcon />} iconPosition="start" label="Booking Flow" />
  <Tab icon={<QuizIcon />} iconPosition="start" label="Questionnaires" />
  <Tab icon={<BusinessIcon />} iconPosition="start" label="Operations" />
</Tabs>

// Update TabPanels (renumber existing and add new)
<TabPanel value={activeTab} index={0}>
  <SalesReportsTab dateRange={dateRange} />
</TabPanel>
<TabPanel value={activeTab} index={1}>
  <EventsReportsTab dateRange={dateRange} />
</TabPanel>
<TabPanel value={activeTab} index={2}>
  <CustomersReportsTab dateRange={dateRange} />
</TabPanel>
<TabPanel value={activeTab} index={3}>
  <BookingFlowTab dateRange={dateRange} />
</TabPanel>
<TabPanel value={activeTab} index={4}>
  <QuestionnairesTab dateRange={dateRange} />
</TabPanel>
<TabPanel value={activeTab} index={5}>
  <OperationsReportsTab dateRange={dateRange} />
</TabPanel>
```

---

#### 3.4 Update Admin CRM API and Hooks

**File to modify:** `frontend/admin-crm/src/apis/analytics.api.ts`

Add new endpoints:

```typescript
// Add to analyticsApi object

// Booking Flow Analytics
getBookingFlowFunnel: async (dateRange: DateRange, flowId?: string) => {
  const params: Record<string, string> = {
    start_date: dateRange.startDate,
    end_date: dateRange.endDate,
  };
  if (flowId) params.flow_id = flowId;
  const response = await apiClient.get('/api/analytics/booking-flow/funnel/', { params });
  return response.data;
},

getBookingFlowPerformance: async (dateRange: DateRange) => {
  const response = await apiClient.get('/api/analytics/booking-flow/performance/', {
    params: {
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
    },
  });
  return response.data;
},

getBookingFlowAbandonment: async (dateRange: DateRange, flowId?: string) => {
  const params: Record<string, string> = {
    start_date: dateRange.startDate,
    end_date: dateRange.endDate,
  };
  if (flowId) params.flow_id = flowId;
  const response = await apiClient.get('/api/analytics/booking-flow/abandonment/', { params });
  return response.data;
},

// Questionnaire Analytics
getQuestionnaireSummary: async (dateRange: DateRange) => {
  const response = await apiClient.get('/api/analytics/questionnaires/summary/', {
    params: {
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
    },
  });
  return response.data;
},

getQuestionnaireProblemFields: async (dateRange: DateRange, threshold = 80) => {
  const response = await apiClient.get('/api/analytics/questionnaires/problem-fields/', {
    params: {
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
      threshold,
    },
  });
  return response.data;
},
```

**File to modify:** `frontend/admin-crm/src/hooks/useAnalytics.ts`

Add new hooks:

```typescript
// Booking Flow Hooks
export const useBookingFlowFunnel = (dateRange: DateRange, flowId?: string) => {
  return useQuery({
    queryKey: ['analytics', 'booking-flow-funnel', dateRange, flowId],
    queryFn: () => analyticsApi.getBookingFlowFunnel(dateRange, flowId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useBookingFlowPerformance = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'booking-flow-performance', dateRange],
    queryFn: () => analyticsApi.getBookingFlowPerformance(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const useBookingFlowAbandonment = (dateRange: DateRange, flowId?: string) => {
  return useQuery({
    queryKey: ['analytics', 'booking-flow-abandonment', dateRange, flowId],
    queryFn: () => analyticsApi.getBookingFlowAbandonment(dateRange, flowId),
    staleTime: 5 * 60 * 1000,
  });
};

// Questionnaire Hooks
export const useQuestionnaireSummary = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'questionnaire-summary', dateRange],
    queryFn: () => analyticsApi.getQuestionnaireSummary(dateRange),
    staleTime: 5 * 60 * 1000,
  });
};

export const useQuestionnaireProblemFields = (dateRange: DateRange, threshold = 80) => {
  return useQuery({
    queryKey: ['analytics', 'questionnaire-problems', dateRange, threshold],
    queryFn: () => analyticsApi.getQuestionnaireProblemFields(dateRange, threshold),
    staleTime: 5 * 60 * 1000,
  });
};
```

---

#### 3.5 Add Types

**File to modify:** `frontend/admin-crm/src/types/analytics.types.ts`

Add new types:

```typescript
// Booking Flow Analytics Types
export interface BookingFlowFunnelStep {
  step_type: string;
  step_name: string;
  order: number;
  sessions_reached: number;
  sessions_completed: number;
  completion_rate: number;
  drop_off_rate: number;
}

export interface BookingFlowPerformance {
  flow_id: number;
  flow_name: string;
  event_type: string;
  total_sessions: number;
  completed_sessions: number;
  abandoned_sessions: number;
  conversion_rate: number;
  abandonment_rate: number;
  total_revenue: number;
  avg_revenue: number;
}

export interface BookingFlowAbandonment {
  total_abandoned: number;
  by_step: {
    step_type: string;
    step_name: string;
    count: number;
    percentage: number;
  }[];
}

// Questionnaire Analytics Types
export interface QuestionnaireSummary {
  overall: {
    total_events_with_responses: number;
    total_complete: number;
    total_incomplete: number;
    overall_completion_rate: number;
  };
  by_questionnaire: {
    questionnaire_id: number;
    questionnaire_name: string;
    total_fields: number;
    required_fields: number;
    events_with_responses: number;
    complete_responses: number;
    incomplete_responses: number;
    completion_rate: number;
  }[];
}

export interface QuestionnaireProblemField {
  questionnaire_id: number;
  questionnaire_name: string;
  field_id: number;
  field_name: string;
  field_type: string;
  completion_rate: number;
  gap_from_threshold: number;
}
```

---

### Phase 4: Client Portal Real Data Integration

#### 4.1 Create Client Portal Analytics API

**File to create:** `frontend/client-portal/src/apis/analytics.api.ts`

```typescript
// frontend/client-portal/src/apis/analytics.api.ts
import apiClient from './apiClient';

export interface ClientDashboard {
  events: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  };
  financials: {
    total_spent: number;
    pending_amount: number;
    overdue_count: number;
    overdue_amount: number;
    upcoming_count: number;
    upcoming_amount: number;
  };
  period: {
    start_date: string;
    end_date: string;
  };
}

export interface ClientEventHistory {
  id: number;
  name: string;
  event_type: string;
  venue: string;
  start_date: string;
  end_date: string | null;
  status: string;
  status_display: string;
  total_price: number;
  amount_paid: number;
  amount_pending: number;
}

export interface SpendingTrend {
  month: string;
  month_name: string;
  amount: number;
  payment_count: number;
}

export interface Deadline {
  type: 'payment' | 'event' | 'contract';
  title: string;
  description: string;
  due_date: string;
  amount?: number;
  event_id?: number;
  contract_id?: number;
  urgency: 'high' | 'normal';
}

export const clientAnalyticsApi = {
  getDashboard: async (startDate?: string, endDate?: string): Promise<ClientDashboard> => {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await apiClient.get('/api/client/analytics/dashboard/', { params });
    return response.data;
  },

  getEventHistory: async (limit = 10): Promise<ClientEventHistory[]> => {
    const response = await apiClient.get('/api/client/analytics/events/', {
      params: { limit },
    });
    return response.data;
  },

  getSpendingTrends: async (months = 12): Promise<SpendingTrend[]> => {
    const response = await apiClient.get('/api/client/analytics/spending/', {
      params: { months },
    });
    return response.data;
  },

  getDeadlines: async (days = 30): Promise<Deadline[]> => {
    const response = await apiClient.get('/api/client/analytics/deadlines/', {
      params: { days },
    });
    return response.data;
  },
};

export default clientAnalyticsApi;
```

---

#### 4.2 Create Client Portal Analytics Hooks

**File to create:** `frontend/client-portal/src/hooks/useClientAnalytics.ts`

```typescript
// frontend/client-portal/src/hooks/useClientAnalytics.ts
import { useQuery } from '@tanstack/react-query';
import { clientAnalyticsApi } from '../apis/analytics.api';

export const useClientDashboard = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['client-analytics', 'dashboard', startDate, endDate],
    queryFn: () => clientAnalyticsApi.getDashboard(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useClientEventHistory = (limit = 10) => {
  return useQuery({
    queryKey: ['client-analytics', 'events', limit],
    queryFn: () => clientAnalyticsApi.getEventHistory(limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useClientSpendingTrends = (months = 12) => {
  return useQuery({
    queryKey: ['client-analytics', 'spending', months],
    queryFn: () => clientAnalyticsApi.getSpendingTrends(months),
    staleTime: 5 * 60 * 1000,
  });
};

export const useClientDeadlines = (days = 30) => {
  return useQuery({
    queryKey: ['client-analytics', 'deadlines', days],
    queryFn: () => clientAnalyticsApi.getDeadlines(days),
    staleTime: 2 * 60 * 1000, // Shorter stale time for deadlines
  });
};
```

---

#### 4.3 Replace Client Portal Mock Data Dashboard

**File to replace:** `frontend/client-portal/src/components/analytics/AnalyticsDashboard.tsx`

```tsx
// frontend/client-portal/src/components/analytics/AnalyticsDashboard.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
  Skeleton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import {
  Event as EventIcon,
  Payment as PaymentIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import {
  useClientDashboard,
  useClientEventHistory,
  useClientSpendingTrends,
  useClientDeadlines,
} from '../../hooks/useClientAnalytics';

export const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState('12m');

  // Calculate date range based on selection
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    switch (timeRange) {
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '12m':
      default:
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch real data
  const { data: dashboard, isLoading: dashboardLoading, refetch } = useClientDashboard(startDate, endDate);
  const { data: eventHistory, isLoading: eventsLoading } = useClientEventHistory(5);
  const { data: spendingTrends, isLoading: spendingLoading } = useClientSpendingTrends(12);
  const { data: deadlines, isLoading: deadlinesLoading } = useClientDeadlines(30);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(value);

  const urgentDeadlines = deadlines?.filter((d) => d.urgency === 'high') || [];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
              My Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Track your events, payments, and upcoming deadlines
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Time Range"
              >
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
                <MenuItem value="12m">Last 12 months</MenuItem>
              </Select>
            </FormControl>

            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
      </AnimatedElement>

      {/* Urgent Alerts */}
      {urgentDeadlines.length > 0 && (
        <AnimatedElement animation="slideUp" delay={150}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            You have {urgentDeadlines.length} urgent deadline{urgentDeadlines.length > 1 ? 's' : ''} coming up this week
          </Alert>
        </AnimatedElement>
      )}

      {/* Key Metrics Cards */}
      <AnimatedElement animation="slideUp" delay={200}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 3,
            mb: 4,
          }}
        >
          {/* Total Events */}
          <GlassCard variant="light" intensity="medium" hover sx={{ p: 3 }}>
            {dashboardLoading ? (
              <Skeleton variant="rectangular" height={80} />
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <EventIcon sx={{ color: theme.palette.primary.main }} />
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {dashboard?.events.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Events
                </Typography>
                <Typography variant="caption" color="info.main">
                  {dashboard?.events.upcoming || 0} upcoming
                </Typography>
              </>
            )}
          </GlassCard>

          {/* Total Spent */}
          <GlassCard variant="light" intensity="medium" hover sx={{ p: 3 }}>
            {dashboardLoading ? (
              <Skeleton variant="rectangular" height={80} />
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <MoneyIcon sx={{ color: theme.palette.success.main }} />
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {formatCurrency(dashboard?.financials.total_spent || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Spent
                </Typography>
              </>
            )}
          </GlassCard>

          {/* Pending Payments */}
          <GlassCard variant="light" intensity="medium" hover sx={{ p: 3 }}>
            {dashboardLoading ? (
              <Skeleton variant="rectangular" height={80} />
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <PaymentIcon sx={{ color: theme.palette.warning.main }} />
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {formatCurrency(dashboard?.financials.pending_amount || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Payments
                </Typography>
                {(dashboard?.financials.overdue_count || 0) > 0 && (
                  <Chip
                    size="small"
                    color="error"
                    label={`${dashboard?.financials.overdue_count} overdue`}
                    sx={{ mt: 1 }}
                  />
                )}
              </>
            )}
          </GlassCard>

          {/* Upcoming Deadlines */}
          <GlassCard variant="light" intensity="medium" hover sx={{ p: 3 }}>
            {deadlinesLoading ? (
              <Skeleton variant="rectangular" height={80} />
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <ScheduleIcon sx={{ color: theme.palette.info.main }} />
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {deadlines?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upcoming Deadlines
                </Typography>
                {urgentDeadlines.length > 0 && (
                  <Chip
                    size="small"
                    color="warning"
                    icon={<WarningIcon />}
                    label={`${urgentDeadlines.length} urgent`}
                    sx={{ mt: 1 }}
                  />
                )}
              </>
            )}
          </GlassCard>
        </Box>
      </AnimatedElement>

      {/* Charts and Tables Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 4 }}>
        {/* Spending Trends Chart */}
        <AnimatedElement animation="slideUp" delay={300}>
          <GlassCard variant="light" intensity="medium" sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Spending Trends
            </Typography>
            {spendingLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : spendingTrends && spendingTrends.length > 0 ? (
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={spendingTrends}>
                    <defs>
                      <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.1)} />
                    <XAxis dataKey="month_name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke={theme.palette.primary.main}
                      strokeWidth={2}
                      fill="url(#spendingGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No spending data yet</Typography>
              </Box>
            )}
          </GlassCard>
        </AnimatedElement>

        {/* Upcoming Deadlines */}
        <AnimatedElement animation="slideUp" delay={400}>
          <GlassCard variant="light" intensity="medium" sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Upcoming Deadlines
            </Typography>
            {deadlinesLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : deadlines && deadlines.length > 0 ? (
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {deadlines.slice(0, 5).map((deadline, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 2,
                      mb: 1,
                      borderRadius: 1,
                      backgroundColor: deadline.urgency === 'high'
                        ? alpha(theme.palette.warning.main, 0.1)
                        : alpha(theme.palette.grey[500], 0.05),
                      borderLeft: `3px solid ${
                        deadline.type === 'payment'
                          ? theme.palette.warning.main
                          : deadline.type === 'event'
                          ? theme.palette.primary.main
                          : theme.palette.info.main
                      }`,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {deadline.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {deadline.description}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={new Date(deadline.due_date).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        color={deadline.urgency === 'high' ? 'warning' : 'default'}
                      />
                    </Box>
                    {deadline.amount && (
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                        {formatCurrency(deadline.amount)}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <CheckIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography color="text.secondary">No upcoming deadlines</Typography>
                </Box>
              </Box>
            )}
          </GlassCard>
        </AnimatedElement>
      </Box>

      {/* Recent Events */}
      <AnimatedElement animation="slideUp" delay={500}>
        <GlassCard variant="light" intensity="medium" sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Recent Events
          </Typography>
          {eventsLoading ? (
            <Skeleton variant="rectangular" height={200} />
          ) : eventHistory && eventHistory.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Event</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventHistory.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {event.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.event_type} at {event.venue}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(event.start_date).toLocaleDateString('en-PH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={event.status_display}
                          color={
                            event.status === 'COMPLETED'
                              ? 'success'
                              : event.status === 'CONFIRMED'
                              ? 'primary'
                              : event.status === 'CANCELLED'
                              ? 'error'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={500}>
                          {formatCurrency(event.total_price)}
                        </Typography>
                        {event.amount_pending > 0 && (
                          <Typography variant="caption" color="warning.main">
                            {formatCurrency(event.amount_pending)} pending
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No events yet. Book your first event!</Typography>
            </Box>
          )}
        </GlassCard>
      </AnimatedElement>
    </Box>
  );
};

export default AnalyticsDashboard;
```

---

## Implementation Checklist

### Phase 1: Backend Foundation
- [ ] Create `backend/core/domains/analytics/tasks.py`
- [ ] Update `backend/core/celery.py` with new beat schedule
- [ ] Create `backend/core/domains/analytics/services/booking_flow_analytics.py`
- [ ] Create `backend/core/domains/analytics/services/questionnaire_analytics.py`
- [ ] Update `backend/core/domains/analytics/services/__init__.py`
- [ ] Update `backend/core/domains/analytics/views_v2.py` with new endpoints
- [ ] Update `backend/core/domains/analytics/urls_v2.py` with new routes

### Phase 2: Client Portal Backend
- [ ] Create `backend/core/domains/analytics/services/client_analytics.py`
- [ ] Create `backend/core/domains/analytics/views_client.py`
- [ ] Create `backend/core/domains/analytics/urls_client.py`
- [ ] Update main URL configuration

### Phase 3: Admin CRM Frontend
- [ ] Create `BookingFlowTab.tsx`
- [ ] Create `QuestionnairesTab.tsx`
- [ ] Update `AnalyticsDashboard.tsx`
- [ ] Update `analytics.api.ts`
- [ ] Update `useAnalytics.ts`
- [ ] Update `analytics.types.ts`

### Phase 4: Client Portal Frontend
- [ ] Create `frontend/client-portal/src/apis/analytics.api.ts`
- [ ] Create `frontend/client-portal/src/hooks/useClientAnalytics.ts`
- [ ] Replace `AnalyticsDashboard.tsx` with real data implementation

---

## Testing Requirements

### Backend Tests
1. Test Celery task execution for `update_all_booking_flow_analytics`
2. Test date range filtering for all new services
3. Test client-scoped queries return only authorized data
4. Test edge cases (no data, single record, large datasets)

### Frontend Tests
1. Test loading states render correctly
2. Test empty states display appropriate messages
3. Test data formatting (currency, dates, percentages)
4. Test responsive layouts on mobile/tablet/desktop

### Integration Tests
1. Verify API endpoints return expected data structures
2. Test React Query caching behavior
3. Test date range changes trigger new API calls
4. Verify client portal only shows authenticated user's data
