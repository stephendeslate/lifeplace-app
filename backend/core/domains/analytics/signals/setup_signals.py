# backend/core/domains/analytics/signals/setup_signals.py
import logging
from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.db import transaction

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_migrate)
def setup_default_analytics(sender, **kwargs):
    """Set up default analytics configuration after migrations"""
    if sender.name != 'core.domains.analytics':
        return
    
    logger.info("Setting up default analytics configuration...")
    
    try:
        with transaction.atomic():
            _create_default_metrics()
            _create_default_funnel()
            _create_default_dashboard()
            _create_default_reports()
        
        logger.info("Successfully set up default analytics configuration")
    except Exception as e:
        logger.error(f"Error setting up default analytics: {str(e)}")


def _create_default_metrics():
    """Create default business metrics"""
    from core.domains.analytics.models import MetricDefinition
    
    logger.info("Creating default metrics...")
    
    default_metrics = [
        {
            'name': 'Total Events',
            'description': 'Total number of events created',
            'metric_type': 'COUNT',
            'source_domain': 'events',
            'source_model': 'Event',
            'aggregation_period': 'DAILY',
            'display_format': 'number',
        },
        {
            'name': 'Event Conversion Rate',
            'description': 'Percentage of events that get confirmed',
            'metric_type': 'CONVERSION_RATE',
            'source_domain': 'events',
            'source_model': 'Event',
            'calculation_rules': {
                'numerator_filter': {'status': 'CONFIRMED'},
                'denominator_filter': {}
            },
            'aggregation_period': 'DAILY',
            'display_format': 'percentage',
        },
        {
            'name': 'Total Revenue',
            'description': 'Total revenue from completed payments',
            'metric_type': 'SUM',
            'source_domain': 'payments',
            'source_model': 'Payment',
            'source_field': 'amount',
            'filters': {'status': 'COMPLETED'},
            'aggregation_period': 'DAILY',
            'display_format': 'currency',
        },
        {
            'name': 'Average Payment Value',
            'description': 'Average value of completed payments',
            'metric_type': 'AVERAGE',
            'source_domain': 'payments',
            'source_model': 'Payment',
            'source_field': 'amount',
            'filters': {'status': 'COMPLETED'},
            'aggregation_period': 'DAILY',
            'display_format': 'currency',
        },
        {
            'name': 'Booking Conversion Rate',
            'description': 'Percentage of booking sessions that complete',
            'metric_type': 'CONVERSION_RATE',
            'source_domain': 'bookingflow',
            'source_model': 'BookingSession',
            'calculation_rules': {
                'numerator_filter': {'is_completed': True},
                'denominator_filter': {}
            },
            'aggregation_period': 'DAILY',
            'display_format': 'percentage',
        },
        {
            'name': 'New Users',
            'description': 'Number of new user registrations',
            'metric_type': 'COUNT',
            'source_domain': 'users',
            'source_model': 'User',
            'aggregation_period': 'DAILY',
            'display_format': 'number',
        },
        {
            'name': 'Active Booking Sessions',
            'description': 'Number of active booking sessions',
            'metric_type': 'COUNT',
            'source_domain': 'bookingflow',
            'source_model': 'BookingSession',
            'filters': {
                'is_completed': False,
                'is_abandoned': False
            },
            'aggregation_period': 'REAL_TIME',
            'is_real_time': True,
            'display_format': 'number',
        },
        {
            'name': 'Payment Success Rate',
            'description': 'Percentage of payments that complete successfully',
            'metric_type': 'CONVERSION_RATE',
            'source_domain': 'payments',
            'source_model': 'Payment',
            'calculation_rules': {
                'numerator_filter': {'status': 'COMPLETED'},
                'denominator_filter': {}
            },
            'aggregation_period': 'DAILY',
            'display_format': 'percentage',
        },
    ]
    
    for metric_data in default_metrics:
        metric, created = MetricDefinition.objects.get_or_create(
            name=metric_data['name'],
            defaults=metric_data
        )
        if created:
            logger.info(f"Created metric: {metric.name}")


def _create_default_funnel():
    """Create default business conversion funnel"""
    from core.domains.analytics.models import ConversionFunnel
    
    logger.info("Creating default conversion funnel...")
    
    funnel_data = {
        'name': 'Business Conversion Funnel',
        'description': 'Track the complete customer journey from registration to payment',
        'steps': [
            {
                'event_name': 'user_registered',
                'name': 'User Registration',
                'description': 'User creates an account'
            },
            {
                'event_name': 'booking_session_started',
                'name': 'Booking Started',
                'description': 'User starts a booking session'
            },
            {
                'event_name': 'booking_completed',
                'name': 'Booking Completed',
                'description': 'User completes booking flow'
            },
            {
                'event_name': 'event_created',
                'name': 'Event Created',
                'description': 'Event is created from booking'
            },
            {
                'event_name': 'quote_accepted',
                'name': 'Quote Accepted',
                'description': 'Customer accepts quote'
            },
            {
                'event_name': 'contract_signed',
                'name': 'Contract Signed',
                'description': 'Contract is signed'
            },
            {
                'event_name': 'payment_completed',
                'name': 'Payment Completed',
                'description': 'Payment is successfully processed'
            }
        ],
        'time_window_hours': 168,  # 7 days
        'is_active': True
    }
    
    funnel, created = ConversionFunnel.objects.get_or_create(
        name=funnel_data['name'],
        defaults=funnel_data
    )
    if created:
        logger.info(f"Created funnel: {funnel.name}")


def _create_default_dashboard():
    """Create default executive dashboard"""
    from core.domains.analytics.models import Dashboard, Widget, MetricDefinition
    
    logger.info("Creating default dashboard...")
    
    # Get the first admin user, or create a system user
    admin_user = User.objects.filter(role='ADMIN').first()
    if not admin_user:
        logger.warning("No admin user found, skipping dashboard creation")
        return
    
    dashboard_data = {
        'name': 'Executive Dashboard',
        'description': 'High-level business metrics for executives and managers',
        'dashboard_type': 'EXECUTIVE',
        'is_public': False,
        'allowed_roles': ['ADMIN'],
        'layout_config': {
            'grid_columns': 4,
            'grid_rows': 3,
            'widget_spacing': 16
        },
        'auto_refresh_interval': 300,  # 5 minutes
        'is_active': True,
        'is_default': True,
        'created_by': admin_user
    }
    
    dashboard, created = Dashboard.objects.get_or_create(
        name=dashboard_data['name'],
        defaults=dashboard_data
    )
    
    if created:
        logger.info(f"Created dashboard: {dashboard.name}")
        _create_default_widgets(dashboard)


def _create_default_widgets(dashboard):
    """Create default widgets for the executive dashboard"""
    from core.domains.analytics.models import Widget, MetricDefinition
    
    logger.info("Creating default widgets...")
    
    # Get metrics for widgets (with error handling)
    metrics = {}
    metric_names = [
        'Total Events', 'Total Revenue', 'Event Conversion Rate', 
        'Booking Conversion Rate', 'New Users', 'Active Booking Sessions'
    ]
    
    for name in metric_names:
        try:
            metrics[name] = MetricDefinition.objects.get(name=name)
        except MetricDefinition.DoesNotExist:
            logger.warning(f"Metric '{name}' not found, skipping related widget")
    
    if not metrics:
        logger.warning("No metrics found, skipping widget creation")
        return
    
    default_widgets = []
    
    if 'Total Revenue' in metrics:
        default_widgets.append({
            'metric_definition': metrics['Total Revenue'],
            'widget_type': 'METRIC_CARD',
            'title': 'Total Revenue',
            'size': 'MEDIUM',
            'position_x': 0,
            'position_y': 0,
            'order': 1,
            'time_range': 'last_30_days',
            'chart_config': {
                'color': '#4CAF50',
                'icon': 'AttachMoney'
            }
        })
    
    if 'Total Events' in metrics:
        default_widgets.append({
            'metric_definition': metrics['Total Events'],
            'widget_type': 'METRIC_CARD',
            'title': 'Total Events',
            'size': 'MEDIUM',
            'position_x': 2,
            'position_y': 0,
            'order': 2,
            'time_range': 'last_30_days',
            'chart_config': {
                'color': '#2196F3',
                'icon': 'Event'
            }
        })
    
    if 'Event Conversion Rate' in metrics:
        default_widgets.append({
            'metric_definition': metrics['Event Conversion Rate'],
            'widget_type': 'GAUGE',
            'title': 'Event Conversion Rate',
            'size': 'MEDIUM',
            'position_x': 0,
            'position_y': 1,
            'order': 3,
            'time_range': 'last_30_days',
            'chart_config': {
                'min_value': 0,
                'max_value': 100,
                'color': '#FF9800'
            }
        })
    
    if 'Booking Conversion Rate' in metrics:
        default_widgets.append({
            'metric_definition': metrics['Booking Conversion Rate'],
            'widget_type': 'GAUGE',
            'title': 'Booking Conversion Rate',
            'size': 'MEDIUM',
            'position_x': 2,
            'position_y': 1,
            'order': 4,
            'time_range': 'last_30_days',
            'chart_config': {
                'min_value': 0,
                'max_value': 100,
                'color': '#9C27B0'
            }
        })
    
    if 'New Users' in metrics:
        default_widgets.append({
            'metric_definition': metrics['New Users'],
            'widget_type': 'LINE_CHART',
            'title': 'New Users Over Time',
            'size': 'WIDE',
            'position_x': 0,
            'position_y': 2,
            'order': 5,
            'time_range': 'last_30_days',
            'chart_config': {
                'line_color': '#3F51B5',
                'show_dots': True
            }
        })
    
    if 'Active Booking Sessions' in metrics:
        default_widgets.append({
            'metric_definition': metrics['Active Booking Sessions'],
            'widget_type': 'METRIC_CARD',
            'title': 'Active Sessions',
            'size': 'MEDIUM',
            'position_x': 3,
            'position_y': 2,
            'order': 6,
            'time_range': 'real_time',
            'chart_config': {
                'color': '#F44336',
                'icon': 'Timeline',
                'animate': True
            }
        })
    
    for widget_data in default_widgets:
        widget, created = Widget.objects.get_or_create(
            dashboard=dashboard,
            title=widget_data['title'],
            defaults=widget_data
        )
        if created:
            logger.info(f"Created widget: {widget.title}")


def _create_default_reports():
    """Create default analytics reports"""
    from core.domains.analytics.models import AnalyticsReport, MetricDefinition
    
    logger.info("Creating default reports...")
    
    # Get the first admin user
    admin_user = User.objects.filter(role='ADMIN').first()
    if not admin_user:
        logger.warning("No admin user found, skipping report creation")
        return
    
    default_reports = [
        {
            'name': 'Weekly Business Summary',
            'description': 'Weekly summary of key business metrics',
            'report_type': 'BUSINESS_SUMMARY',
            'template_config': {
                'include_charts': True,
                'include_trends': True,
                'comparison_period': 'previous_week'
            },
            'schedule_frequency': 'WEEKLY',
            'output_format': 'PDF',
            'recipients': [admin_user.email],
            'is_active': True,
            'created_by': admin_user
        },
        {
            'name': 'Monthly Financial Report',
            'description': 'Monthly financial performance report',
            'report_type': 'FINANCIAL',
            'template_config': {
                'include_revenue_breakdown': True,
                'include_payment_analysis': True,
                'include_forecasting': True
            },
            'schedule_frequency': 'MONTHLY',
            'schedule_day_of_month': 1,
            'output_format': 'EXCEL',
            'recipients': [admin_user.email],
            'is_active': True,
            'created_by': admin_user
        },
        {
            'name': 'Booking Performance Analysis',
            'description': 'Analysis of booking flow performance and conversion rates',
            'report_type': 'BOOKING_PERFORMANCE',
            'template_config': {
                'include_funnel_analysis': True,
                'include_abandonment_analysis': True,
                'include_step_performance': True
            },
            'schedule_frequency': 'MANUAL',
            'output_format': 'HTML',
            'recipients': [admin_user.email],
            'is_active': True,
            'created_by': admin_user
        }
    ]
    
    for report_data in default_reports:
        report, created = AnalyticsReport.objects.get_or_create(
            name=report_data['name'],
            defaults=report_data
        )
        
        if created:
            # Associate first 5 active metrics with the report
            metrics = MetricDefinition.objects.filter(is_active=True)[:5]
            report.metrics.set(metrics)
            logger.info(f"Created report: {report.name}")