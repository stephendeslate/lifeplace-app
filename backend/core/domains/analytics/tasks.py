# backend/core/domains/analytics/tasks.py
"""
Celery tasks for analytics domain.
Handles scheduled aggregation and caching of analytics data.
"""

import logging
from datetime import timedelta

from django.utils import timezone

from celery import shared_task

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
        date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
    else:
        # Default to yesterday (completed day)
        date = (timezone.now() - timedelta(days=1)).date()

    active_flows = BookingFlow.objects.filter(is_active=True)
    results = {"success": [], "failed": []}

    for flow in active_flows:
        try:
            BookingFlowAnalyticsService.update_daily_analytics(flow.id, date)
            results["success"].append(flow.id)
            logger.info(f"Updated analytics for flow {flow.name} on {date}")
        except Exception as e:
            results["failed"].append({"flow_id": flow.id, "error": str(e)})
            logger.error(f"Failed to update analytics for flow {flow.id}: {e}")

    logger.info(
        f"Booking flow analytics update complete: {len(results['success'])} success, {len(results['failed'])} failed"
    )
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

    start = timezone.datetime.strptime(start_date_str, "%Y-%m-%d").date()
    end = timezone.datetime.strptime(end_date_str, "%Y-%m-%d").date()

    current = start
    results = {"success": [], "failed": []}

    while current <= end:
        try:
            BookingFlowAnalyticsService.update_daily_analytics(flow_id, current)
            results["success"].append(current.isoformat())
            logger.info(f"Backfilled analytics for flow {flow_id} on {current}")
        except Exception as e:
            results["failed"].append({"date": current.isoformat(), "error": str(e)})
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
        ("7d", 7),
        ("30d", 30),
        ("90d", 90),
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

    return {"cached_ranges": [r[0] for r in ranges]}


@shared_task(bind=True, max_retries=3)
def snapshot_daily_kpis(self, date_str=None):
    """
    Capture a daily KPI snapshot from DashboardService.
    Defaults to yesterday. Uses update_or_create for idempotency.

    Args:
        date_str: Optional date string (YYYY-MM-DD). Defaults to yesterday.
    """
    from decimal import Decimal

    from core.domains.analytics.models import DailyKPISnapshot
    from core.domains.analytics.services import DashboardService

    if date_str:
        date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
    else:
        date = (timezone.now() - timedelta(days=1)).date()

    try:
        # Query KPIs for the single day
        day_start = timezone.datetime.combine(date, timezone.datetime.min.time())
        day_end = timezone.datetime.combine(date, timezone.datetime.max.time())

        kpi_data = DashboardService.get_kpi_summary(day_start, day_end)

        # Look up previous day's snapshot for cumulative totals
        prev_snapshot = DailyKPISnapshot.objects.filter(date__lt=date).order_by("-date").first()

        prev_cumulative_revenue = prev_snapshot.cumulative_revenue if prev_snapshot else Decimal("0")
        prev_cumulative_bookings = prev_snapshot.cumulative_bookings if prev_snapshot else 0
        prev_cumulative_clients = prev_snapshot.cumulative_clients if prev_snapshot else 0

        today_revenue = Decimal(str(kpi_data.get("total_revenue", 0)))
        today_bookings = kpi_data.get("total_bookings", 0)
        today_clients = kpi_data.get("new_clients", 0)

        # Calculate day-over-day changes
        revenue_change_pct = None
        bookings_change_pct = None
        if prev_snapshot:
            if prev_snapshot.total_revenue > 0:
                revenue_change_pct = (today_revenue - prev_snapshot.total_revenue) / prev_snapshot.total_revenue * 100
            if prev_snapshot.total_bookings > 0:
                bookings_change_pct = Decimal(
                    str((today_bookings - prev_snapshot.total_bookings) / prev_snapshot.total_bookings * 100)
                )

        snapshot, created = DailyKPISnapshot.objects.update_or_create(
            date=date,
            defaults={
                "total_bookings": today_bookings,
                "confirmed_bookings": kpi_data.get("confirmed_bookings", 0),
                "completed_bookings": kpi_data.get("completed_bookings", 0),
                "cancelled_bookings": kpi_data.get("cancelled_bookings", 0),
                "event_revenue": Decimal(str(kpi_data.get("event_revenue", 0))),
                "total_revenue": today_revenue,
                "avg_booking_value": Decimal(str(kpi_data.get("avg_booking_value", 0))),
                "new_clients": today_clients,
                "booking_sessions": kpi_data.get("booking_sessions", 0),
                "completed_sessions": kpi_data.get("completed_sessions", 0),
                "conversion_rate": Decimal(str(kpi_data.get("conversion_rate", 0))),
                "cumulative_revenue": prev_cumulative_revenue + today_revenue,
                "cumulative_bookings": prev_cumulative_bookings + today_bookings,
                "cumulative_clients": prev_cumulative_clients + today_clients,
                "revenue_change_pct": revenue_change_pct,
                "bookings_change_pct": bookings_change_pct,
                "raw_kpi_data": kpi_data,
            },
        )

        action = "Created" if created else "Updated"
        logger.info(f"{action} KPI snapshot for {date}: {today_bookings} bookings, ${today_revenue} revenue")
        return {"date": str(date), "action": action.lower()}

    except Exception as e:
        logger.error(f"Failed to snapshot KPIs for {date}: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
def backfill_daily_kpi_snapshots(self, start_date_str, end_date_str):
    """
    Backfill KPI snapshots for a date range.
    Processes chronologically since cumulative fields depend on prior days.

    Args:
        start_date_str: Start date (YYYY-MM-DD)
        end_date_str: End date (YYYY-MM-DD)
    """
    start = timezone.datetime.strptime(start_date_str, "%Y-%m-%d").date()
    end = timezone.datetime.strptime(end_date_str, "%Y-%m-%d").date()

    current = start
    results = {"success": [], "failed": []}

    while current <= end:
        try:
            # Call synchronously to maintain chronological order for cumulative fields
            snapshot_daily_kpis(date_str=current.isoformat())
            results["success"].append(current.isoformat())
            logger.info(f"Backfilled KPI snapshot for {current}")
        except Exception as e:
            results["failed"].append({"date": current.isoformat(), "error": str(e)})
            logger.error(f"Failed to backfill KPI snapshot for {current}: {e}")
        current += timedelta(days=1)

    logger.info(f"KPI backfill complete: {len(results['success'])} success, {len(results['failed'])} failed")
    return results
