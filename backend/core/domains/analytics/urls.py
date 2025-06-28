# backend/core/domains/analytics/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AlertRuleViewSet,
    AnalyticsAPIViewSet,
    AnalyticsEventViewSet,
    AnalyticsReportViewSet,
    ConversionFunnelViewSet,
    DashboardViewSet,
    EventAggregationViewSet,
    MetricDefinitionViewSet,
    PublicAnalyticsViewSet,
    ReportExecutionViewSet,
    WidgetViewSet,
)

app_name = 'analytics'

# Main router for authenticated endpoints
router = DefaultRouter()
router.register(r'metrics', MetricDefinitionViewSet, basename='metric-definition')
router.register(r'dashboards', DashboardViewSet, basename='dashboard')
router.register(r'widgets', WidgetViewSet, basename='widget')
router.register(r'reports', AnalyticsReportViewSet, basename='analytics-report')
router.register(r'executions', ReportExecutionViewSet, basename='report-execution')
router.register(r'events', AnalyticsEventViewSet, basename='analytics-event')
router.register(r'funnels', ConversionFunnelViewSet, basename='conversion-funnel')
router.register(r'alerts', AlertRuleViewSet, basename='alert-rule')
router.register(r'aggregations', EventAggregationViewSet, basename='event-aggregation')
router.register(r'api', AnalyticsAPIViewSet, basename='analytics-api')

# Public router for client-side tracking
public_router = DefaultRouter()
public_router.register(r'public', PublicAnalyticsViewSet, basename='public-analytics')

urlpatterns = [
    # Authenticated endpoints
    path('', include(router.urls)),
    
    # Public endpoints
    path('', include(public_router.urls)),
]