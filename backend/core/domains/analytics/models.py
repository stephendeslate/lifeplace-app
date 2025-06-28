# backend/core/domains/analytics/models.py
from core.utils.models import BaseModel
from django.contrib.auth import get_user_model
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid

User = get_user_model()


class MetricDefinition(BaseModel):
    """Configurable business metrics with calculation rules"""
    
    METRIC_TYPE_CHOICES = [
        ('COUNT', 'Count'),
        ('SUM', 'Sum'),
        ('AVERAGE', 'Average'),
        ('PERCENTAGE', 'Percentage'),
        ('RATIO', 'Ratio'),
        ('CONVERSION_RATE', 'Conversion Rate'),
        ('REVENUE', 'Revenue'),
        ('CUSTOM', 'Custom Calculation'),
    ]
    
    AGGREGATION_PERIOD_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
        ('YEARLY', 'Yearly'),
        ('REAL_TIME', 'Real Time'),
    ]
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPE_CHOICES)
    
    # Data source configuration
    source_domain = models.CharField(max_length=50, help_text="Domain to query (events, payments, bookingflow, etc.)")
    source_model = models.CharField(max_length=100, help_text="Model name within the domain")
    source_field = models.CharField(max_length=100, blank=True, help_text="Field to aggregate")
    
    # Calculation configuration
    calculation_rules = models.JSONField(
        default=dict,
        help_text="JSON configuration for metric calculation"
    )
    filters = models.JSONField(
        default=dict,
        help_text="Django Q object filters as JSON"
    )
    
    # Aggregation settings
    aggregation_period = models.CharField(max_length=20, choices=AGGREGATION_PERIOD_CHOICES)
    is_real_time = models.BooleanField(default=False)
    
    # Display configuration
    display_format = models.CharField(
        max_length=50, 
        default='number',
        help_text="Format for display: number, currency, percentage, etc."
    )
    decimal_places = models.PositiveIntegerField(default=2)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['source_domain', 'source_model']),
            models.Index(fields=['is_active', 'is_real_time']),
        ]
    
    def __str__(self):
        return self.name


class Dashboard(BaseModel):
    """Configurable dashboards for different user roles"""
    
    DASHBOARD_TYPE_CHOICES = [
        ('EXECUTIVE', 'Executive Dashboard'),
        ('OPERATIONAL', 'Operational Dashboard'),
        ('CLIENT', 'Client Dashboard'),
        ('FINANCIAL', 'Financial Dashboard'),
        ('MARKETING', 'Marketing Dashboard'),
        ('CUSTOM', 'Custom Dashboard'),
    ]
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    dashboard_type = models.CharField(max_length=20, choices=DASHBOARD_TYPE_CHOICES)
    
    # Access control
    is_public = models.BooleanField(default=False)
    allowed_roles = models.JSONField(
        default=list,
        help_text="List of user roles that can access this dashboard"
    )
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_dashboards')
    
    # Layout configuration
    layout_config = models.JSONField(
        default=dict,
        help_text="Dashboard layout and positioning configuration"
    )
    
    # Settings
    auto_refresh_interval = models.PositiveIntegerField(
        default=300,
        help_text="Auto refresh interval in seconds"
    )
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['dashboard_type', 'is_active']),
            models.Index(fields=['is_public', 'is_active']),
        ]
    
    def __str__(self):
        return self.name


class Widget(BaseModel):
    """Reusable chart/metric components for dashboards"""
    
    WIDGET_TYPE_CHOICES = [
        ('METRIC_CARD', 'Metric Card'),
        ('LINE_CHART', 'Line Chart'),
        ('BAR_CHART', 'Bar Chart'),
        ('PIE_CHART', 'Pie Chart'),
        ('AREA_CHART', 'Area Chart'),
        ('TABLE', 'Data Table'),
        ('FUNNEL', 'Conversion Funnel'),
        ('GAUGE', 'Gauge Chart'),
        ('HEATMAP', 'Heatmap'),
        ('PROGRESS_BAR', 'Progress Bar'),
    ]
    
    SIZE_CHOICES = [
        ('SMALL', 'Small (1x1)'),
        ('MEDIUM', 'Medium (2x1)'),
        ('LARGE', 'Large (2x2)'),
        ('WIDE', 'Wide (3x1)'),
        ('EXTRA_WIDE', 'Extra Wide (4x1)'),
        ('TALL', 'Tall (1x2)'),
    ]
    
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='widgets')
    metric_definition = models.ForeignKey(MetricDefinition, on_delete=models.CASCADE)
    
    # Widget configuration
    widget_type = models.CharField(max_length=20, choices=WIDGET_TYPE_CHOICES)
    title = models.CharField(max_length=255)
    size = models.CharField(max_length=20, choices=SIZE_CHOICES, default='MEDIUM')
    
    # Position on dashboard
    position_x = models.PositiveIntegerField(default=0)
    position_y = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)
    
    # Display configuration
    chart_config = models.JSONField(
        default=dict,
        help_text="Chart-specific configuration (colors, axes, etc.)"
    )
    time_range = models.CharField(
        max_length=50,
        default='last_30_days',
        help_text="Default time range for the widget"
    )
    
    # Data configuration
    data_filters = models.JSONField(
        default=dict,
        help_text="Additional filters specific to this widget"
    )
    comparison_enabled = models.BooleanField(default=False)
    comparison_period = models.CharField(max_length=50, blank=True)
    
    is_visible = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['dashboard', 'order']
        indexes = [
            models.Index(fields=['dashboard', 'order']),
            models.Index(fields=['metric_definition']),
        ]
    
    def __str__(self):
        return f"{self.dashboard.name} - {self.title}"


class AnalyticsReport(BaseModel):
    """Template-based reports with scheduling capabilities"""
    
    REPORT_TYPE_CHOICES = [
        ('BUSINESS_SUMMARY', 'Business Summary'),
        ('FINANCIAL', 'Financial Report'),
        ('BOOKING_PERFORMANCE', 'Booking Performance'),
        ('CLIENT_ANALYSIS', 'Client Analysis'),
        ('WORKFLOW_EFFICIENCY', 'Workflow Efficiency'),
        ('PAYMENT_ANALYSIS', 'Payment Analysis'),
        ('CUSTOM', 'Custom Report'),
    ]
    
    FORMAT_CHOICES = [
        ('PDF', 'PDF'),
        ('EXCEL', 'Excel'),
        ('CSV', 'CSV'),
        ('HTML', 'HTML'),
        ('JSON', 'JSON'),
    ]
    
    SCHEDULE_FREQUENCY_CHOICES = [
        ('MANUAL', 'Manual Only'),
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
    ]
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    report_type = models.CharField(max_length=30, choices=REPORT_TYPE_CHOICES)
    
    # Report configuration
    metrics = models.ManyToManyField(MetricDefinition, related_name='reports')
    template_config = models.JSONField(
        default=dict,
        help_text="Report template and layout configuration"
    )
    filters = models.JSONField(
        default=dict,
        help_text="Default filters for the report"
    )
    
    # Scheduling
    schedule_frequency = models.CharField(max_length=20, choices=SCHEDULE_FREQUENCY_CHOICES, default='MANUAL')
    schedule_time = models.TimeField(null=True, blank=True, help_text="Time to run scheduled reports")
    schedule_day_of_week = models.PositiveIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(6)],
        help_text="Day of week for weekly reports (0=Monday)"
    )
    schedule_day_of_month = models.PositiveIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        help_text="Day of month for monthly reports"
    )
    
    # Distribution
    output_format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='PDF')
    recipients = models.JSONField(
        default=list,
        help_text="List of email addresses to send the report to"
    )
    
    # Settings
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_reports')
    is_active = models.BooleanField(default=True)
    last_generated = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['report_type', 'is_active']),
            models.Index(fields=['schedule_frequency', 'is_active']),
        ]
    
    def __str__(self):
        return self.name


class ReportExecution(BaseModel):
    """Individual report runs with cached results"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('RUNNING', 'Running'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    report = models.ForeignKey(AnalyticsReport, on_delete=models.CASCADE, related_name='executions')
    execution_id = models.UUIDField(default=uuid.uuid4, unique=True)
    
    # Execution details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Parameters used for this execution
    execution_params = models.JSONField(
        default=dict,
        help_text="Parameters used for this specific execution"
    )
    date_range_start = models.DateTimeField()
    date_range_end = models.DateTimeField()
    
    # Results
    result_data = models.JSONField(
        default=dict,
        help_text="Cached report data"
    )
    file_path = models.CharField(max_length=500, blank=True, help_text="Path to generated report file")
    file_size = models.PositiveIntegerField(null=True, blank=True, help_text="File size in bytes")
    
    # Execution metadata
    execution_time_seconds = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    error_message = models.TextField(blank=True)
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requested_reports')
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['report', 'status']),
            models.Index(fields=['execution_id']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.report.name} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class AnalyticsEvent(BaseModel):
    """Real-time event tracking for user behavior and system events"""
    
    EVENT_CATEGORY_CHOICES = [
        ('USER_ACTION', 'User Action'),
        ('SYSTEM_EVENT', 'System Event'),
        ('BUSINESS_EVENT', 'Business Event'),
        ('ERROR_EVENT', 'Error Event'),
        ('PERFORMANCE', 'Performance'),
    ]
    
    # Event identification
    event_name = models.CharField(max_length=255)
    event_category = models.CharField(max_length=20, choices=EVENT_CATEGORY_CHOICES)
    
    # Source information
    source_domain = models.CharField(max_length=50)
    source_model = models.CharField(max_length=100, blank=True)
    source_id = models.PositiveIntegerField(null=True, blank=True)
    
    # User context
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_id = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Event data
    event_data = models.JSONField(
        default=dict,
        help_text="Event-specific data and metadata"
    )
    
    # Metrics
    numeric_value = models.DecimalField(
        max_digits=15, decimal_places=2, 
        null=True, blank=True,
        help_text="Numeric value for aggregation (revenue, count, etc.)"
    )
    
    # Timestamp
    event_timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-event_timestamp']
        indexes = [
            models.Index(fields=['event_name', 'event_timestamp']),
            models.Index(fields=['source_domain', 'source_model']),
            models.Index(fields=['user', 'event_timestamp']),
            models.Index(fields=['event_category', 'event_timestamp']),
            models.Index(fields=['event_timestamp']),  # For time-based queries
        ]
    
    def __str__(self):
        return f"{self.event_name} - {self.event_timestamp.strftime('%Y-%m-%d %H:%M:%S')}"


class EventAggregation(BaseModel):
    """Pre-calculated aggregations for performance"""
    
    AGGREGATION_TYPE_CHOICES = [
        ('HOURLY', 'Hourly'),
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
    ]
    
    # Aggregation definition
    metric_definition = models.ForeignKey(MetricDefinition, on_delete=models.CASCADE, related_name='aggregations')
    aggregation_type = models.CharField(max_length=20, choices=AGGREGATION_TYPE_CHOICES)
    
    # Time period
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Aggregated values
    total_count = models.PositiveIntegerField(default=0)
    total_sum = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    average_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    min_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    max_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Additional aggregated data
    aggregated_data = models.JSONField(
        default=dict,
        help_text="Additional aggregated metrics and breakdowns"
    )
    
    # Processing metadata
    is_complete = models.BooleanField(default=False)
    processed_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-period_start']
        unique_together = ['metric_definition', 'aggregation_type', 'period_start']
        indexes = [
            models.Index(fields=['metric_definition', 'aggregation_type', 'period_start']),
            models.Index(fields=['period_start', 'period_end']),
        ]
    
    def __str__(self):
        return f"{self.metric_definition.name} - {self.aggregation_type} - {self.period_start.date()}"


class ConversionFunnel(BaseModel):
    """Multi-step conversion tracking"""
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Funnel configuration
    steps = models.JSONField(
        default=list,
        help_text="List of funnel steps with event names and criteria"
    )
    
    # Settings
    time_window_hours = models.PositiveIntegerField(
        default=24,
        help_text="Time window for step completion in hours"
    )
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class FunnelConversion(BaseModel):
    """Individual conversion tracking through funnels"""
    
    funnel = models.ForeignKey(ConversionFunnel, on_delete=models.CASCADE, related_name='conversions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_id = models.CharField(max_length=255, blank=True)
    
    # Conversion tracking
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    
    # Step tracking
    current_step = models.PositiveIntegerField(default=0)
    completed_steps = models.JSONField(
        default=list,
        help_text="List of completed step indices with timestamps"
    )
    
    # Conversion data
    conversion_data = models.JSONField(
        default=dict,
        help_text="Data collected during the funnel journey"
    )
    
    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['funnel', 'is_completed']),
            models.Index(fields=['started_at']),
        ]
    
    def __str__(self):
        return f"{self.funnel.name} - {self.started_at.strftime('%Y-%m-%d %H:%M')}"


class AlertRule(BaseModel):
    """Automated alerts based on metric thresholds"""
    
    OPERATOR_CHOICES = [
        ('GT', 'Greater Than'),
        ('GTE', 'Greater Than or Equal'),
        ('LT', 'Less Than'),
        ('LTE', 'Less Than or Equal'),
        ('EQ', 'Equal'),
        ('NE', 'Not Equal'),
        ('CHANGE_GT', 'Change Greater Than'),
        ('CHANGE_LT', 'Change Less Than'),
    ]
    
    NOTIFICATION_METHOD_CHOICES = [
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
        ('WEBHOOK', 'Webhook'),
        ('IN_APP', 'In-App Notification'),
    ]
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    metric_definition = models.ForeignKey(MetricDefinition, on_delete=models.CASCADE, related_name='alert_rules')
    
    # Threshold configuration
    operator = models.CharField(max_length=20, choices=OPERATOR_CHOICES)
    threshold_value = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Time-based settings
    evaluation_period = models.CharField(
        max_length=50,
        default='last_hour',
        help_text="Time period to evaluate (last_hour, last_day, etc.)"
    )
    evaluation_frequency = models.PositiveIntegerField(
        default=300,
        help_text="How often to check the rule in seconds"
    )
    
    # Notification settings
    notification_methods = models.JSONField(
        default=list,
        help_text="List of notification methods"
    )
    recipients = models.JSONField(
        default=list,
        help_text="List of recipients (emails, phone numbers, etc.)"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    last_triggered = models.DateTimeField(null=True, blank=True)
    last_evaluated = models.DateTimeField(null=True, blank=True)
    
    # Cooldown to prevent spam
    cooldown_minutes = models.PositiveIntegerField(
        default=60,
        help_text="Minimum minutes between alerts for the same rule"
    )
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_alert_rules')
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['metric_definition', 'is_active']),
            models.Index(fields=['last_evaluated']),
        ]
    
    def __str__(self):
        return self.name