# backend/core/domains/analytics/views_v2.py
"""
Simplified analytics API views.
All views use function-based approach with direct service calls.
"""

from datetime import datetime, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .services import (
    BookingFlowIntegrationService,
    CustomersAnalyticsService,
    DashboardService,
    EventsAnalyticsService,
    ExportService,
    OperationsAnalyticsService,
    QuestionnaireIntegrationService,
    SalesAnalyticsService,
)


def parse_date_range(request):
    """
    Helper to parse date range from query params.
    Defaults to last 30 days if not specified.
    """
    end_date = request.query_params.get("end_date")
    start_date = request.query_params.get("start_date")

    if end_date:
        try:
            end_date = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            if timezone.is_naive(end_date):
                end_date = timezone.make_aware(end_date)
        except ValueError:
            end_date = timezone.now()
    else:
        end_date = timezone.now()

    if start_date:
        try:
            start_date = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            if timezone.is_naive(start_date):
                start_date = timezone.make_aware(start_date)
        except ValueError:
            start_date = end_date - timedelta(days=30)
    else:
        start_date = end_date - timedelta(days=30)

    return start_date, end_date


# ============================================================================
# DASHBOARD
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAdminUser])
def dashboard_kpis(request):
    """
    Main dashboard KPI summary.

    Query params:
        - start_date: ISO date string (default: 30 days ago)
        - end_date: ISO date string (default: now)
    """
    start_date, end_date = parse_date_range(request)
    data = DashboardService.get_kpi_summary(start_date, end_date)
    return Response(data)


# ============================================================================
# SALES & RESERVATIONS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAdminUser])
def bookings_summary(request):
    """
    Bookings summary by period (daily/weekly/monthly/yearly).

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
        - period: daily|weekly|monthly|yearly (default: daily)
        - format: csv|excel (optional, for export)
    """
    start_date, end_date = parse_date_range(request)
    period = request.query_params.get("period", "daily")
    export_format = request.query_params.get("format")

    data = SalesAnalyticsService.get_bookings_summary(start_date, end_date, period)

    if export_format in ["csv", "excel"]:
        return ExportService.export_bookings_summary(data, export_format)

    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def reservation_pipeline(request):
    """
    Reservation pipeline by status.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = SalesAnalyticsService.get_reservation_pipeline(start_date, end_date)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def revenue_by_type(request):
    """
    Revenue breakdown by event type/package.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
        - format: csv|excel (optional, for export)
    """
    start_date, end_date = parse_date_range(request)
    export_format = request.query_params.get("format")

    data = SalesAnalyticsService.get_revenue_by_event_type(start_date, end_date)

    if export_format in ["csv", "excel"]:
        return ExportService.export_revenue_report(data, export_format)

    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def payment_tracking(request):
    """
    Payment status including overdue.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = SalesAnalyticsService.get_payment_tracking(start_date, end_date)
    return Response(data)


# ============================================================================
# EVENTS & GUESTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAdminUser])
def event_attendance(request):
    """
    Event attendance breakdown.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = EventsAnalyticsService.get_event_attendance(start_date, end_date)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def package_performance(request):
    """
    Package/product performance.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
        - limit: number (default: 10)
    """
    start_date, end_date = parse_date_range(request)
    limit = int(request.query_params.get("limit", 10))
    data = EventsAnalyticsService.get_package_performance(start_date, end_date, limit)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def feedback_scores(request):
    """
    Customer satisfaction scores.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = EventsAnalyticsService.get_feedback_scores(start_date, end_date)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def event_type_breakdown(request):
    """
    Event breakdown by type.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = EventsAnalyticsService.get_event_type_breakdown(start_date, end_date)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def guest_demographics(request):
    """Guest demographics - PLACEHOLDER."""
    return Response(EventsAnalyticsService.get_guest_demographics_placeholder())


@api_view(["GET"])
@permission_classes([IsAdminUser])
def repeat_clients(request):
    """Repeat client tracking - PLACEHOLDER."""
    return Response(EventsAnalyticsService.get_repeat_clients_placeholder())


# ============================================================================
# CUSTOMERS & LEADS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAdminUser])
def lead_sources(request):
    """
    Lead source report.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
        - format: csv|excel (optional, for export)
    """
    start_date, end_date = parse_date_range(request)
    export_format = request.query_params.get("format")

    data = CustomersAnalyticsService.get_lead_source_report(start_date, end_date)

    if export_format in ["csv", "excel"]:
        return ExportService.export_lead_sources(data, export_format)

    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def conversion_rates(request):
    """
    Conversion rate report.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = CustomersAnalyticsService.get_conversion_rate(start_date, end_date)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def customer_list(request):
    """
    Customer database for export.

    Query params:
        - start_date: ISO date string (optional)
        - end_date: ISO date string (optional)
        - limit: number (optional)
        - format: csv|excel (optional, for export)
    """
    start_date_param = request.query_params.get("start_date")
    end_date_param = request.query_params.get("end_date")
    export_format = request.query_params.get("format")
    limit = request.query_params.get("limit")

    start_date = None
    end_date = None

    if start_date_param and end_date_param:
        start_date, end_date = parse_date_range(request)

    if limit:
        limit = int(limit)

    data = CustomersAnalyticsService.get_customer_list(start_date, end_date, limit)

    if export_format in ["csv", "excel"]:
        return ExportService.export_customers(data, export_format)

    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def customer_growth(request):
    """
    Customer acquisition over time.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = CustomersAnalyticsService.get_customer_growth(start_date, end_date)
    return Response(data)


# ============================================================================
# OPERATIONS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAdminUser])
def venue_usage(request):
    """
    Venue utilization report.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = OperationsAnalyticsService.get_venue_usage(start_date, end_date)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def calendar_utilization(request):
    """
    Calendar peak/off-peak analysis.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = OperationsAnalyticsService.get_calendar_utilization(start_date, end_date)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def booking_time_analysis(request):
    """
    Analyze when bookings are typically made.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = OperationsAnalyticsService.get_booking_time_analysis(start_date, end_date)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def kitchen_usage(request):
    """Kitchen usage - PLACEHOLDER."""
    return Response(OperationsAnalyticsService.get_kitchen_usage_placeholder())


@api_view(["GET"])
@permission_classes([IsAdminUser])
def inventory_report(request):
    """Inventory report - PLACEHOLDER."""
    return Response(OperationsAnalyticsService.get_inventory_placeholder())


@api_view(["GET"])
@permission_classes([IsAdminUser])
def app_engagement(request):
    """App engagement - PLACEHOLDER."""
    return Response(OperationsAnalyticsService.get_app_engagement_placeholder())


# ============================================================================
# BOOKING FLOW ANALYTICS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAdminUser])
def booking_flow_funnel(request):
    """
    Step-by-step funnel analysis for booking flows.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
        - flow_id: Optional specific flow ID
    """
    start_date, end_date = parse_date_range(request)
    flow_id = request.query_params.get("flow_id")

    data = BookingFlowIntegrationService.get_funnel_analysis(start_date, end_date, flow_id)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def booking_flow_performance(request):
    """
    Performance summary for all booking flows.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = BookingFlowIntegrationService.get_flow_performance_summary(start_date, end_date)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def booking_flow_abandonment(request):
    """
    Abandonment analysis for booking flows.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
        - flow_id: Optional specific flow ID
    """
    start_date, end_date = parse_date_range(request)
    flow_id = request.query_params.get("flow_id")

    data = BookingFlowIntegrationService.get_abandonment_analysis(start_date, end_date, flow_id)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def booking_flow_trends(request):
    """
    Daily trends for booking flow metrics.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
        - flow_id: Optional specific flow ID
    """
    start_date, end_date = parse_date_range(request)
    flow_id = request.query_params.get("flow_id")

    data = BookingFlowIntegrationService.get_daily_booking_flow_trends(start_date, end_date, flow_id)
    return Response(data)


# ============================================================================
# QUESTIONNAIRE ANALYTICS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAdminUser])
def questionnaire_summary(request):
    """
    Questionnaire completion summary across all questionnaires.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = QuestionnaireIntegrationService.get_questionnaire_summary(start_date, end_date)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def questionnaire_field_heatmap(request, questionnaire_id):
    """
    Field-level completion heatmap for a questionnaire.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
    """
    start_date, end_date = parse_date_range(request)
    data = QuestionnaireIntegrationService.get_field_completion_heatmap(questionnaire_id, start_date, end_date)
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def questionnaire_problem_fields(request):
    """
    Identify fields with low completion rates.

    Query params:
        - start_date: ISO date string
        - end_date: ISO date string
        - threshold: Minimum completion rate (default: 80)
    """
    start_date, end_date = parse_date_range(request)
    threshold = float(request.query_params.get("threshold", 80))

    data = QuestionnaireIntegrationService.get_low_completion_fields(start_date, end_date, threshold)
    return Response(data)


# ============================================================================
# METRIC SNAPSHOTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAdminUser])
def kpi_snapshots(request):
    """
    Historical KPI snapshots with date range filter.

    Query params:
        - start_date: ISO date string (default: 30 days ago)
        - end_date: ISO date string (default: today)
        - fields: Comma-separated list of fields to include (optional)
    """
    from .models import DailyKPISnapshot

    start_date, end_date = parse_date_range(request)
    fields_param = request.query_params.get("fields")

    snapshots = DailyKPISnapshot.objects.filter(
        date__gte=start_date.date() if hasattr(start_date, "date") else start_date,
        date__lte=end_date.date() if hasattr(end_date, "date") else end_date,
    ).order_by("date")

    all_fields = [
        "date",
        "total_bookings",
        "confirmed_bookings",
        "completed_bookings",
        "cancelled_bookings",
        "event_revenue",
        "total_revenue",
        "avg_booking_value",
        "new_clients",
        "booking_sessions",
        "completed_sessions",
        "conversion_rate",
        "cumulative_revenue",
        "cumulative_bookings",
        "cumulative_clients",
        "revenue_change_pct",
        "bookings_change_pct",
    ]

    if fields_param:
        requested = [f.strip() for f in fields_param.split(",")]
        selected = ["date"] + [f for f in requested if f in all_fields and f != "date"]
    else:
        selected = all_fields

    data = list(snapshots.values(*selected))

    # Convert Decimal fields to float for JSON serialization
    for row in data:
        for key, val in row.items():
            if hasattr(val, "quantize"):  # Decimal
                row[key] = float(val)

    return Response(
        {
            "count": len(data),
            "snapshots": data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAdminUser])
def kpi_snapshot_summary(request):
    """
    Latest cumulative KPI totals + recent trend deltas.
    """
    from .models import DailyKPISnapshot

    latest = DailyKPISnapshot.objects.order_by("-date").first()
    if not latest:
        return Response({"message": "No snapshots available"}, status=status.HTTP_404_NOT_FOUND)

    # 7-day and 30-day trend (compare latest cumulative vs N days ago)
    seven_days_ago = (
        DailyKPISnapshot.objects.filter(date__lte=latest.date - timedelta(days=7)).order_by("-date").first()
    )

    thirty_days_ago = (
        DailyKPISnapshot.objects.filter(date__lte=latest.date - timedelta(days=30)).order_by("-date").first()
    )

    def calc_delta(current, previous, field):
        if not previous:
            return None
        curr_val = float(getattr(current, field, 0) or 0)
        prev_val = float(getattr(previous, field, 0) or 0)
        if prev_val == 0:
            return None
        return round((curr_val - prev_val) / prev_val * 100, 2)

    return Response(
        {
            "latest_date": latest.date,
            "cumulative_revenue": float(latest.cumulative_revenue),
            "cumulative_bookings": latest.cumulative_bookings,
            "cumulative_clients": latest.cumulative_clients,
            "latest_conversion_rate": float(latest.conversion_rate),
            "trends_7d": {
                "revenue_pct": calc_delta(latest, seven_days_ago, "cumulative_revenue"),
                "bookings_pct": calc_delta(latest, seven_days_ago, "cumulative_bookings"),
                "clients_pct": calc_delta(latest, seven_days_ago, "cumulative_clients"),
            },
            "trends_30d": {
                "revenue_pct": calc_delta(latest, thirty_days_ago, "cumulative_revenue"),
                "bookings_pct": calc_delta(latest, thirty_days_ago, "cumulative_bookings"),
                "clients_pct": calc_delta(latest, thirty_days_ago, "cumulative_clients"),
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAdminUser])
def system_health_snapshots(request):
    """
    Historical system health snapshots.

    Query params:
        - start_date: ISO date string (default: 30 days ago)
        - end_date: ISO date string (default: today)
    """
    from core.infrastructure.models import SystemHealthSnapshot

    start_date, end_date = parse_date_range(request)

    snapshots = SystemHealthSnapshot.objects.filter(
        date__gte=start_date.date() if hasattr(start_date, "date") else start_date,
        date__lte=end_date.date() if hasattr(end_date, "date") else end_date,
    ).order_by("date")

    data = []
    for s in snapshots:
        data.append(
            {
                "date": s.date,
                "error_count": s.error_count,
                "pending_review_count": s.pending_review_count,
                "celery_tasks_failed": s.celery_tasks_failed,
                "celery_success_rate": float(s.celery_success_rate),
                "cache_hit_ratio": float(s.cache_hit_ratio) if s.cache_hit_ratio else None,
                "cache_memory_used_bytes": s.cache_memory_used_bytes,
                "total_queue_depth": s.total_queue_depth,
                "open_circuit_breakers": s.open_circuit_breakers,
                "circuit_breaker_states": s.circuit_breaker_states,
                "broker_healthy": s.broker_healthy,
                "broker_ping_ms": float(s.broker_ping_ms) if s.broker_ping_ms else None,
            }
        )

    return Response(
        {
            "count": len(data),
            "snapshots": data,
        }
    )
