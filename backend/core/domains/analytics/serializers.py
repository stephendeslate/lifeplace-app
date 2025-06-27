# backend/core/domains/analytics/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import (
    AlertRule,
    AnalyticsEvent,
    AnalyticsReport,
    ConversionFunnel,
    Dashboard,
    EventAggregation,
    FunnelConversion,
    MetricDefinition,
    ReportExecution,
    Widget,
)

User = get_user_model()


class MetricDefinitionSerializer(serializers.ModelSerializer):
    """Serializer for metric definitions"""
    
    class Meta:
        model = MetricDefinition
        fields = [
            'id', 'name', 'description', 'metric_type', 'source_domain',
            'source_model', 'source_field', 'calculation_rules', 'filters',
            'aggregation_period', 'is_real_time', 'display_format', 'decimal_places',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_calculation_rules(self, value):
        """Validate calculation rules JSON"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Calculation rules must be a valid JSON object")
        return value
    
    def validate_filters(self, value):
        """Validate filters JSON"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Filters must be a valid JSON object")
        return value


class MetricDefinitionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating metric definitions"""
    
    class Meta:
        model = MetricDefinition
        fields = [
            'name', 'description', 'metric_type', 'source_domain',
            'source_model', 'source_field', 'calculation_rules', 'filters',
            'aggregation_period', 'is_real_time', 'display_format', 'decimal_places'
        ]
    
    def validate_name(self, value):
        """Validate unique name"""
        if MetricDefinition.objects.filter(name=value).exists():
            raise serializers.ValidationError("A metric with this name already exists")
        return value


class MetricDefinitionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating metric definitions"""
    
    class Meta:
        model = MetricDefinition
        fields = [
            'name', 'description', 'metric_type', 'source_domain',
            'source_model', 'source_field', 'calculation_rules', 'filters',
            'aggregation_period', 'is_real_time', 'display_format', 'decimal_places',
            'is_active'
        ]
    
    def validate_name(self, value):
        """Validate unique name excluding current instance"""
        instance = getattr(self, 'instance', None)
        queryset = MetricDefinition.objects.filter(name=value)
        if instance:
            queryset = queryset.exclude(pk=instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A metric with this name already exists")
        return value


class DashboardSerializer(serializers.ModelSerializer):
    """Serializer for dashboards"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    widgets_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Dashboard
        fields = [
            'id', 'name', 'description', 'dashboard_type', 'is_public',
            'allowed_roles', 'created_by', 'created_by_name', 'layout_config',
            'auto_refresh_interval', 'is_active', 'is_default', 'widgets_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'widgets_count', 'created_at', 'updated_at']
    
    def get_widgets_count(self, obj):
        return obj.widgets.filter(is_visible=True).count()


class DashboardCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating dashboards"""
    
    class Meta:
        model = Dashboard
        fields = [
            'name', 'description', 'dashboard_type', 'is_public',
            'allowed_roles', 'layout_config', 'auto_refresh_interval',
            'is_active', 'is_default'
        ]
    
    def validate_name(self, value):
        """Validate unique name"""
        if Dashboard.objects.filter(name=value).exists():
            raise serializers.ValidationError("A dashboard with this name already exists")
        return value


class DashboardDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for dashboards with widgets"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    widgets = serializers.SerializerMethodField()
    
    class Meta:
        model = Dashboard
        fields = [
            'id', 'name', 'description', 'dashboard_type', 'is_public',
            'allowed_roles', 'created_by', 'created_by_name', 'layout_config',
            'auto_refresh_interval', 'is_active', 'is_default', 'widgets',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'widgets', 'created_at', 'updated_at']
    
    def get_widgets(self, obj):
        widgets = obj.widgets.filter(is_visible=True).order_by('order')
        return WidgetSerializer(widgets, many=True, context=self.context).data


class WidgetSerializer(serializers.ModelSerializer):
    """Serializer for widgets"""
    metric_definition_name = serializers.CharField(source='metric_definition.name', read_only=True)
    metric_definition_type = serializers.CharField(source='metric_definition.metric_type', read_only=True)
    dashboard_name = serializers.CharField(source='dashboard.name', read_only=True)
    
    class Meta:
        model = Widget
        fields = [
            'id', 'dashboard', 'dashboard_name', 'metric_definition', 
            'metric_definition_name', 'metric_definition_type', 'widget_type',
            'title', 'size', 'position_x', 'position_y', 'order',
            'chart_config', 'time_range', 'data_filters', 'comparison_enabled',
            'comparison_period', 'is_visible', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'dashboard_name', 'metric_definition_name', 
            'metric_definition_type', 'created_at', 'updated_at'
        ]


class WidgetCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating widgets"""
    
    class Meta:
        model = Widget
        fields = [
            'metric_definition', 'widget_type', 'title', 'size',
            'position_x', 'position_y', 'order', 'chart_config',
            'time_range', 'data_filters', 'comparison_enabled',
            'comparison_period', 'is_visible'
        ]


class AnalyticsReportSerializer(serializers.ModelSerializer):
    """Serializer for analytics reports"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    metrics_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AnalyticsReport
        fields = [
            'id', 'name', 'description', 'report_type', 'template_config',
            'filters', 'schedule_frequency', 'schedule_time', 'schedule_day_of_week',
            'schedule_day_of_month', 'output_format', 'recipients', 'created_by',
            'created_by_name', 'is_active', 'last_generated', 'metrics_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_name', 'last_generated', 
            'metrics_count', 'created_at', 'updated_at'
        ]
    
    def get_metrics_count(self, obj):
        return obj.metrics.count()


class AnalyticsReportCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating analytics reports"""
    metrics = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=MetricDefinition.objects.filter(is_active=True),
        required=False
    )
    
    class Meta:
        model = AnalyticsReport
        fields = [
            'name', 'description', 'report_type', 'metrics', 'template_config',
            'filters', 'schedule_frequency', 'schedule_time', 'schedule_day_of_week',
            'schedule_day_of_month', 'output_format', 'recipients', 'is_active'
        ]
    
    def validate_name(self, value):
        """Validate unique name"""
        if AnalyticsReport.objects.filter(name=value).exists():
            raise serializers.ValidationError("A report with this name already exists")
        return value
    
    def validate_recipients(self, value):
        """Validate recipients list"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Recipients must be a list of email addresses")
        
        for email in value:
            if not isinstance(email, str) or '@' not in email:
                raise serializers.ValidationError(f"Invalid email address: {email}")
        
        return value


class AnalyticsReportDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for analytics reports"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    metrics = MetricDefinitionSerializer(many=True, read_only=True)
    recent_executions = serializers.SerializerMethodField()
    
    class Meta:
        model = AnalyticsReport
        fields = [
            'id', 'name', 'description', 'report_type', 'metrics', 'template_config',
            'filters', 'schedule_frequency', 'schedule_time', 'schedule_day_of_week',
            'schedule_day_of_month', 'output_format', 'recipients', 'created_by',
            'created_by_name', 'is_active', 'last_generated', 'recent_executions',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_name', 'last_generated', 
            'recent_executions', 'created_at', 'updated_at'
        ]
    
    def get_recent_executions(self, obj):
        executions = obj.executions.order_by('-created_at')[:5]
        return ReportExecutionSerializer(executions, many=True, context=self.context).data


class ReportExecutionSerializer(serializers.ModelSerializer):
    """Serializer for report executions"""
    report_name = serializers.CharField(source='report.name', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    
    class Meta:
        model = ReportExecution
        fields = [
            'id', 'report', 'report_name', 'execution_id', 'status',
            'started_at', 'completed_at', 'execution_params', 'date_range_start',
            'date_range_end', 'result_data', 'file_path', 'file_size',
            'execution_time_seconds', 'error_message', 'requested_by',
            'requested_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'report_name', 'execution_id', 'status', 'started_at',
            'completed_at', 'result_data', 'file_path', 'file_size',
            'execution_time_seconds', 'error_message', 'requested_by',
            'requested_by_name', 'created_at', 'updated_at'
        ]


class AnalyticsEventSerializer(serializers.ModelSerializer):
    """Serializer for analytics events"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = AnalyticsEvent
        fields = [
            'id', 'event_name', 'event_category', 'source_domain',
            'source_model', 'source_id', 'user', 'user_name', 'session_id',
            'ip_address', 'user_agent', 'event_data', 'numeric_value',
            'event_timestamp', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user_name', 'event_timestamp', 'created_at', 'updated_at'
        ]


class EventAggregationSerializer(serializers.ModelSerializer):
    """Serializer for event aggregations"""
    metric_definition_name = serializers.CharField(source='metric_definition.name', read_only=True)
    
    class Meta:
        model = EventAggregation
        fields = [
            'id', 'metric_definition', 'metric_definition_name', 'aggregation_type',
            'period_start', 'period_end', 'total_count', 'total_sum',
            'average_value', 'min_value', 'max_value', 'aggregated_data',
            'is_complete', 'processed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'metric_definition_name', 'is_complete', 'processed_at',
            'created_at', 'updated_at'
        ]


class ConversionFunnelSerializer(serializers.ModelSerializer):
    """Serializer for conversion funnels"""
    
    class Meta:
        model = ConversionFunnel
        fields = [
            'id', 'name', 'description', 'steps', 'time_window_hours',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_steps(self, value):
        """Validate steps configuration"""
        if not isinstance(value, list) or len(value) < 2:
            raise serializers.ValidationError("Funnel must have at least 2 steps")
        
        for i, step in enumerate(value):
            if not isinstance(step, dict):
                raise serializers.ValidationError(f"Step {i} must be a valid object")
            
            if 'event_name' not in step:
                raise serializers.ValidationError(f"Step {i} must have an event_name")
        
        return value


class FunnelConversionSerializer(serializers.ModelSerializer):
    """Serializer for funnel conversions"""
    funnel_name = serializers.CharField(source='funnel.name', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = FunnelConversion
        fields = [
            'id', 'funnel', 'funnel_name', 'user', 'user_name', 'session_id',
            'started_at', 'completed_at', 'is_completed', 'current_step',
            'completed_steps', 'conversion_data', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'funnel_name', 'user_name', 'started_at', 'completed_at',
            'is_completed', 'current_step', 'completed_steps', 'conversion_data',
            'created_at', 'updated_at'
        ]


class AlertRuleSerializer(serializers.ModelSerializer):
    """Serializer for alert rules"""
    metric_definition_name = serializers.CharField(source='metric_definition.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = AlertRule
        fields = [
            'id', 'name', 'description', 'metric_definition', 'metric_definition_name',
            'operator', 'threshold_value', 'evaluation_period', 'evaluation_frequency',
            'notification_methods', 'recipients', 'is_active', 'last_triggered',
            'last_evaluated', 'cooldown_minutes', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'metric_definition_name', 'last_triggered', 'last_evaluated',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
    
    def validate_recipients(self, value):
        """Validate recipients based on notification methods"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Recipients must be a list")
        return value


class AlertRuleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating alert rules"""
    
    class Meta:
        model = AlertRule
        fields = [
            'name', 'description', 'metric_definition', 'operator', 'threshold_value',
            'evaluation_period', 'evaluation_frequency', 'notification_methods',
            'recipients', 'cooldown_minutes', 'is_active'
        ]


# Calculation result serializers
class MetricValueSerializer(serializers.Serializer):
    """Serializer for metric calculation results"""
    metric_id = serializers.IntegerField()
    metric_name = serializers.CharField()
    value = serializers.DecimalField(max_digits=15, decimal_places=2)
    display_format = serializers.CharField()
    calculation_time = serializers.DateTimeField()
    time_range = serializers.DictField()


class DashboardDataSerializer(serializers.Serializer):
    """Serializer for dashboard data response"""
    dashboard = DashboardDetailSerializer()
    widgets_data = serializers.ListField()
    time_range = serializers.DictField()
    last_updated = serializers.DateTimeField()


class FunnelAnalyticsSerializer(serializers.Serializer):
    """Serializer for funnel analytics results"""
    funnel = ConversionFunnelSerializer()
    total_started = serializers.IntegerField()
    total_completed = serializers.IntegerField()
    overall_conversion_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    step_analytics = serializers.ListField()
    time_range = serializers.DictField()


class BusinessMetricsSerializer(serializers.Serializer):
    """Serializer for aggregated business metrics"""
    total_events = serializers.IntegerField()
    confirmed_events = serializers.IntegerField()
    completed_events = serializers.IntegerField()
    event_conversion_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    total_payments = serializers.IntegerField()
    completed_payments = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    average_payment_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_booking_sessions = serializers.IntegerField()
    completed_booking_sessions = serializers.IntegerField()
    abandoned_booking_sessions = serializers.IntegerField()
    booking_conversion_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    new_users = serializers.IntegerField()
    new_clients = serializers.IntegerField()
    calculation_time = serializers.DateTimeField()
    time_range = serializers.DictField()


# Request serializers for API endpoints
class MetricCalculationRequestSerializer(serializers.Serializer):
    """Serializer for metric calculation requests"""
    metric_id = serializers.IntegerField()
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    filters = serializers.DictField(required=False)


class ReportExecutionRequestSerializer(serializers.Serializer):
    """Serializer for report execution requests"""
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    custom_filters = serializers.DictField(required=False)
    output_format = serializers.ChoiceField(
        choices=['PDF', 'EXCEL', 'CSV', 'HTML', 'JSON'],
        required=False
    )


class DashboardDataRequestSerializer(serializers.Serializer):
    """Serializer for dashboard data requests"""
    time_range = serializers.ChoiceField(
        choices=[
            'last_24_hours', 'last_7_days', 'last_30_days', 
            'last_90_days', 'last_year', 'this_month', 'this_year'
        ],
        default='last_30_days'
    )
    refresh_cache = serializers.BooleanField(default=False)


class EventTrackingRequestSerializer(serializers.Serializer):
    """Serializer for event tracking requests"""
    event_name = serializers.CharField(max_length=255)
    event_category = serializers.ChoiceField(
        choices=['USER_ACTION', 'SYSTEM_EVENT', 'BUSINESS_EVENT', 'ERROR_EVENT', 'PERFORMANCE'],
        default='USER_ACTION'
    )
    source_domain = serializers.CharField(max_length=50, required=False)
    source_model = serializers.CharField(max_length=100, required=False)
    source_id = serializers.IntegerField(required=False)
    session_id = serializers.CharField(max_length=255, required=False)
    event_data = serializers.DictField(required=False)
    numeric_value = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)


class FunnelTrackingRequestSerializer(serializers.Serializer):
    """Serializer for funnel tracking requests"""
    funnel_id = serializers.IntegerField()
    event_name = serializers.CharField(max_length=255)
    session_id = serializers.CharField(max_length=255, required=False)
    event_data = serializers.DictField(required=False)


class AlertRuleTestSerializer(serializers.Serializer):
    """Serializer for testing alert rules"""
    evaluation_period = serializers.CharField(default='last_hour')
    send_test_notification = serializers.BooleanField(default=False)