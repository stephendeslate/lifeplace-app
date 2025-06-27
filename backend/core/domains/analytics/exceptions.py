# backend/core/domains/analytics/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class AnalyticsException(APIException):
    """Base exception for analytics domain"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'An analytics error occurred.'
    default_code = 'analytics_error'


class MetricDefinitionNotFound(AnalyticsException):
    """Raised when a metric definition is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Metric definition not found.'
    default_code = 'metric_definition_not_found'


class DashboardNotFound(AnalyticsException):
    """Raised when a dashboard is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Dashboard not found.'
    default_code = 'dashboard_not_found'


class WidgetNotFound(AnalyticsException):
    """Raised when a widget is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Widget not found.'
    default_code = 'widget_not_found'


class ReportNotFound(AnalyticsException):
    """Raised when a report is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Report not found.'
    default_code = 'report_not_found'


class ReportExecutionNotFound(AnalyticsException):
    """Raised when a report execution is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Report execution not found.'
    default_code = 'report_execution_not_found'


class AlertRuleNotFound(AnalyticsException):
    """Raised when an alert rule is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Alert rule not found.'
    default_code = 'alert_rule_not_found'


class ConversionFunnelNotFound(AnalyticsException):
    """Raised when a conversion funnel is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Conversion funnel not found.'
    default_code = 'conversion_funnel_not_found'


class InvalidMetricConfiguration(AnalyticsException):
    """Raised when metric configuration is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid metric configuration.'
    default_code = 'invalid_metric_configuration'


class InvalidDashboardConfiguration(AnalyticsException):
    """Raised when dashboard configuration is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid dashboard configuration.'
    default_code = 'invalid_dashboard_configuration'


class InvalidWidgetConfiguration(AnalyticsException):
    """Raised when widget configuration is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid widget configuration.'
    default_code = 'invalid_widget_configuration'


class InvalidReportConfiguration(AnalyticsException):
    """Raised when report configuration is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid report configuration.'
    default_code = 'invalid_report_configuration'


class MetricCalculationError(AnalyticsException):
    """Raised when metric calculation fails"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'Failed to calculate metric.'
    default_code = 'metric_calculation_error'


class DataSourceNotAvailable(AnalyticsException):
    """Raised when a data source is not available"""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Data source not available.'
    default_code = 'data_source_not_available'


class ReportGenerationFailed(AnalyticsException):
    """Raised when report generation fails"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'Failed to generate report.'
    default_code = 'report_generation_failed'


class InvalidTimeRange(AnalyticsException):
    """Raised when an invalid time range is provided"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid time range provided.'
    default_code = 'invalid_time_range'


class InvalidAggregationPeriod(AnalyticsException):
    """Raised when an invalid aggregation period is provided"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid aggregation period.'
    default_code = 'invalid_aggregation_period'


class InsufficientDataError(AnalyticsException):
    """Raised when there's insufficient data for calculation"""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = 'Insufficient data for calculation.'
    default_code = 'insufficient_data'


class DuplicateMetricName(AnalyticsException):
    """Raised when attempting to create a metric with duplicate name"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'A metric with this name already exists.'
    default_code = 'duplicate_metric_name'


class DuplicateDashboardName(AnalyticsException):
    """Raised when attempting to create a dashboard with duplicate name"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'A dashboard with this name already exists.'
    default_code = 'duplicate_dashboard_name'


class DuplicateReportName(AnalyticsException):
    """Raised when attempting to create a report with duplicate name"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'A report with this name already exists.'
    default_code = 'duplicate_report_name'


class UnauthorizedDashboardAccess(AnalyticsException):
    """Raised when user doesn't have access to dashboard"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to access this dashboard.'
    default_code = 'unauthorized_dashboard_access'


class UnauthorizedReportAccess(AnalyticsException):
    """Raised when user doesn't have access to report"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to access this report.'
    default_code = 'unauthorized_report_access'


class ReportExecutionInProgress(AnalyticsException):
    """Raised when trying to run a report that's already running"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Report execution is already in progress.'
    default_code = 'report_execution_in_progress'


class AlertRuleEvaluationError(AnalyticsException):
    """Raised when alert rule evaluation fails"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'Failed to evaluate alert rule.'
    default_code = 'alert_rule_evaluation_error'


class InvalidAlertThreshold(AnalyticsException):
    """Raised when alert threshold configuration is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid alert threshold configuration.'
    default_code = 'invalid_alert_threshold'


class FunnelConfigurationError(AnalyticsException):
    """Raised when funnel configuration is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid funnel configuration.'
    default_code = 'funnel_configuration_error'