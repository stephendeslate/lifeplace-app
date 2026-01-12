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

    logger.info(f"Booking flow analytics update complete: {len(results['success'])} success, {len(results['failed'])} failed")
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
            logger.info(f"Backfilled analytics for flow {flow_id} on {current}")
        except Exception as e:
            results['failed'].append({'date': current.isoformat(), 'error': str(e)})
            logger.error(f"Failed to backfill analytics for flow {flow_id} on {current}: {e}")
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

    return {'cached_ranges': [r[0] for r in ranges]}
