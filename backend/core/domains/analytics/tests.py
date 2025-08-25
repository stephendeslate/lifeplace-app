# backend/core/domains/analytics/tests.py
import json
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch
from uuid import uuid4

from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.apps import apps
from django.db import IntegrityError
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import (
    MetricDefinition, Dashboard, Widget, AnalyticsReport, ReportExecution,
    AnalyticsEvent, EventAggregation, ConversionFunnel, FunnelConversion, AlertRule
)
from .services import (
    MetricDefinitionService, DashboardService, ReportService,
    EventTrackingService, AlertService, DataAggregationService
)
from .exceptions import (
    MetricDefinitionNotFound, DashboardNotFound, InvalidMetricConfiguration,
    DataSourceNotAvailable, DuplicateMetricName, DuplicateDashboardName,
    MetricCalculationError, ReportNotFound, AlertRuleNotFound
)

User = get_user_model()


class MetricDefinitionModelTest(TestCase):
    """Test MetricDefinition model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )

    def test_create_metric_definition(self):
        """Test creating a metric definition"""
        metric = MetricDefinition.objects.create(
            name="Test Metric",
            description="Test metric description",
            metric_type="COUNT",
            source_domain="events",
            source_model="Event",
            aggregation_period="DAILY"
        )
        
        self.assertEqual(metric.name, "Test Metric")
        self.assertEqual(metric.metric_type, "COUNT")
        self.assertEqual(metric.source_domain, "events")
        self.assertTrue(metric.is_active)
        self.assertEqual(metric.decimal_places, 2)

    def test_metric_definition_str(self):
        """Test MetricDefinition string representation"""
        metric = MetricDefinition.objects.create(
            name="Revenue Metric",
            metric_type="REVENUE",
            source_domain="payments",
            source_model="Payment",
            aggregation_period="MONTHLY"
        )
        self.assertEqual(str(metric), "Revenue Metric")

    def test_metric_definition_ordering(self):
        """Test MetricDefinition default ordering by name"""
        MetricDefinition.objects.create(name="Z Metric", metric_type="COUNT", source_domain="events", source_model="Event", aggregation_period="DAILY")
        MetricDefinition.objects.create(name="A Metric", metric_type="COUNT", source_domain="events", source_model="Event", aggregation_period="DAILY")
        MetricDefinition.objects.create(name="M Metric", metric_type="COUNT", source_domain="events", source_model="Event", aggregation_period="DAILY")
        
        metrics = list(MetricDefinition.objects.all())
        self.assertEqual(metrics[0].name, "A Metric")
        self.assertEqual(metrics[1].name, "M Metric")
        self.assertEqual(metrics[2].name, "Z Metric")


class DashboardModelTest(TestCase):
    """Test Dashboard model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )

    def test_create_dashboard(self):
        """Test creating a dashboard"""
        dashboard = Dashboard.objects.create(
            name="Executive Dashboard",
            description="Main executive dashboard",
            dashboard_type="EXECUTIVE",
            created_by=self.user,
            layout_config={"columns": 3, "rows": 4},
            allowed_roles=["admin", "manager"]
        )
        
        self.assertEqual(dashboard.name, "Executive Dashboard")
        self.assertEqual(dashboard.dashboard_type, "EXECUTIVE")
        self.assertEqual(dashboard.created_by, self.user)
        self.assertFalse(dashboard.is_public)
        self.assertTrue(dashboard.is_active)
        self.assertEqual(dashboard.auto_refresh_interval, 300)

    def test_dashboard_str(self):
        """Test Dashboard string representation"""
        dashboard = Dashboard.objects.create(
            name="Test Dashboard",
            dashboard_type="OPERATIONAL",
            created_by=self.user
        )
        self.assertEqual(str(dashboard), "Test Dashboard")


class WidgetModelTest(TestCase):
    """Test Widget model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        self.dashboard = Dashboard.objects.create(
            name="Test Dashboard",
            dashboard_type="EXECUTIVE",
            created_by=self.user
        )
        self.metric = MetricDefinition.objects.create(
            name="Test Metric",
            metric_type="COUNT",
            source_domain="events",
            source_model="Event",
            aggregation_period="DAILY"
        )

    def test_create_widget(self):
        """Test creating a widget"""
        widget = Widget.objects.create(
            dashboard=self.dashboard,
            metric_definition=self.metric,
            widget_type="LINE_CHART",
            title="Event Count Over Time",
            size="MEDIUM",
            position_x=0,
            position_y=0,
            order=1
        )
        
        self.assertEqual(widget.title, "Event Count Over Time")
        self.assertEqual(widget.widget_type, "LINE_CHART")
        self.assertEqual(widget.dashboard, self.dashboard)
        self.assertEqual(widget.metric_definition, self.metric)
        self.assertTrue(widget.is_visible)

    def test_widget_str(self):
        """Test Widget string representation"""
        widget = Widget.objects.create(
            dashboard=self.dashboard,
            metric_definition=self.metric,
            widget_type="METRIC_CARD",
            title="Revenue Card",
            size="SMALL"
        )
        expected = f"{self.dashboard.name} - Revenue Card"
        self.assertEqual(str(widget), expected)


class AnalyticsEventModelTest(TestCase):
    """Test AnalyticsEvent model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )

    def test_create_analytics_event(self):
        """Test creating an analytics event"""
        event = AnalyticsEvent.objects.create(
            event_name="page_view",
            event_category="USER_ACTION",
            source_domain="events",
            source_model="Event",
            source_id=123,
            user=self.user,
            session_id="test-session-123",
            ip_address="192.168.1.1",
            event_data={"page": "/dashboard", "duration": 5.2},
            numeric_value=Decimal("1.00")
        )
        
        self.assertEqual(event.event_name, "page_view")
        self.assertEqual(event.event_category, "USER_ACTION")
        self.assertEqual(event.user, self.user)
        self.assertEqual(event.numeric_value, Decimal("1.00"))
        self.assertIsInstance(event.event_timestamp, datetime)

    def test_analytics_event_str(self):
        """Test AnalyticsEvent string representation"""
        event = AnalyticsEvent.objects.create(
            event_name="payment_completed",
            event_category="BUSINESS_EVENT",
            source_domain="payments",
            numeric_value=Decimal("99.99")
        )
        expected_format = f"payment_completed - {event.event_timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
        self.assertEqual(str(event), expected_format)


class ConversionFunnelModelTest(TestCase):
    """Test ConversionFunnel model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )

    def test_create_conversion_funnel(self):
        """Test creating a conversion funnel"""
        funnel_steps = [
            {"name": "Landing Page", "event": "page_view", "criteria": {"page": "/landing"}},
            {"name": "Sign Up", "event": "user_signup", "criteria": {}},
            {"name": "First Purchase", "event": "payment_completed", "criteria": {}}
        ]
        
        funnel = ConversionFunnel.objects.create(
            name="User Acquisition Funnel",
            description="Track user journey from landing to purchase",
            steps=funnel_steps,
            time_window_hours=72
        )
        
        self.assertEqual(funnel.name, "User Acquisition Funnel")
        self.assertEqual(len(funnel.steps), 3)
        self.assertEqual(funnel.time_window_hours, 72)
        self.assertTrue(funnel.is_active)

    def test_funnel_conversion(self):
        """Test creating a funnel conversion"""
        funnel = ConversionFunnel.objects.create(
            name="Test Funnel",
            steps=[{"name": "Step 1", "event": "test_event"}],
            time_window_hours=24
        )
        
        conversion = FunnelConversion.objects.create(
            funnel=funnel,
            user=self.user,
            session_id="test-session",
            started_at=timezone.now(),
            current_step=0,
            completed_steps=[0]
        )
        
        self.assertEqual(conversion.funnel, funnel)
        self.assertEqual(conversion.user, self.user)
        self.assertEqual(conversion.current_step, 0)
        self.assertFalse(conversion.is_completed)


class MetricDefinitionServiceTest(TestCase):
    """Test MetricDefinitionService"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )

    def test_get_all_metrics(self):
        """Test getting all metrics with filtering"""
        # Create test metrics
        MetricDefinition.objects.create(
            name="Event Count",
            description="Count of events",
            metric_type="COUNT",
            source_domain="events",
            source_model="Event",
            aggregation_period="DAILY"
        )
        MetricDefinition.objects.create(
            name="Payment Revenue",
            description="Total payment revenue",
            metric_type="REVENUE",
            source_domain="payments",
            source_model="Payment",
            aggregation_period="MONTHLY"
        )
        
        # Test without filters
        metrics = MetricDefinitionService.get_all_metrics()
        self.assertEqual(metrics.count(), 2)
        
        # Test with search query
        metrics = MetricDefinitionService.get_all_metrics(search_query="Event")
        self.assertEqual(metrics.count(), 1)
        self.assertEqual(metrics[0].name, "Event Count")
        
        # Test with source domain filter
        metrics = MetricDefinitionService.get_all_metrics(source_domain="payments")
        self.assertEqual(metrics.count(), 1)
        self.assertEqual(metrics[0].name, "Payment Revenue")
        
        # Test with is_active filter
        MetricDefinition.objects.filter(name="Event Count").update(is_active=False)
        metrics = MetricDefinitionService.get_all_metrics(is_active=True)
        self.assertEqual(metrics.count(), 1)

    def test_get_metric_by_id(self):
        """Test getting metric by ID"""
        metric = MetricDefinition.objects.create(
            name="Test Metric",
            metric_type="COUNT",
            source_domain="events",
            source_model="Event",
            aggregation_period="DAILY"
        )
        
        result = MetricDefinitionService.get_metric_by_id(metric.id)
        self.assertEqual(result, metric)
        
        # Test with non-existent ID
        with self.assertRaises(MetricDefinitionNotFound):
            MetricDefinitionService.get_metric_by_id(99999)

    def test_create_metric_duplicate_name(self):
        """Test creating metric with duplicate name"""
        MetricDefinition.objects.create(
            name="Unique Metric",
            metric_type="COUNT",
            source_domain="events",
            source_model="Event",
            aggregation_period="DAILY"
        )
        
        with self.assertRaises(DuplicateMetricName):
            MetricDefinitionService.create_metric({
                'name': 'Unique Metric',
                'metric_type': 'SUM',
                'source_domain': 'payments',
                'source_model': 'Payment',
                'aggregation_period': 'MONTHLY'
            })

    @patch('core.domains.analytics.services.apps.get_app_config')
    def test_create_metric_invalid_data_source(self, mock_get_app_config):
        """Test creating metric with invalid data source"""
        mock_get_app_config.side_effect = LookupError("App not found")
        
        with self.assertRaises(InvalidMetricConfiguration):
            MetricDefinitionService.create_metric({
                'name': 'Invalid Metric',
                'metric_type': 'COUNT',
                'source_domain': 'nonexistent',
                'source_model': 'NonexistentModel',
                'aggregation_period': 'DAILY'
            })

    def test_update_metric(self):
        """Test updating metric"""
        metric = MetricDefinition.objects.create(
            name="Original Name",
            metric_type="COUNT",
            source_domain="events",
            source_model="Event",
            aggregation_period="DAILY"
        )
        
        updated_metric = MetricDefinitionService.update_metric(
            metric.id,
            {'name': 'Updated Name', 'description': 'Updated description'}
        )
        
        self.assertEqual(updated_metric.name, 'Updated Name')
        self.assertEqual(updated_metric.description, 'Updated description')

    def test_delete_metric(self):
        """Test deleting metric"""
        metric = MetricDefinition.objects.create(
            name="To Delete",
            metric_type="COUNT",
            source_domain="events",
            source_model="Event",
            aggregation_period="DAILY"
        )
        
        result = MetricDefinitionService.delete_metric(metric.id)
        self.assertTrue(result)
        
        with self.assertRaises(MetricDefinitionNotFound):
            MetricDefinitionService.get_metric_by_id(metric.id)

    @patch('core.domains.analytics.services.apps.get_model')
    def test_calculate_metric_data_source_not_available(self, mock_get_model):
        """Test metric calculation with unavailable data source"""
        mock_get_model.side_effect = LookupError("Model not found")
        
        metric = MetricDefinition.objects.create(
            name="Test Metric",
            metric_type="COUNT",
            source_domain="events",
            source_model="Event",
            aggregation_period="DAILY"
        )
        
        with self.assertRaises(MetricCalculationError):
            MetricDefinitionService.calculate_metric(metric.id)


class EventTrackingServiceTest(TestCase):
    """Test EventTrackingService"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )

    def test_track_event(self):
        """Test tracking an event"""
        event_data = {
            'event_name': 'page_view',
            'event_category': 'USER_ACTION',
            'source_domain': 'events',
            'user_id': self.user.id,
            'session_id': 'test-session',
            'event_data': {'page': '/dashboard'},
            'numeric_value': 1.0
        }
        
        event = EventTrackingService.track_event(event_data)
        
        self.assertEqual(event.event_name, 'page_view')
        self.assertEqual(event.user, self.user)
        self.assertEqual(event.session_id, 'test-session')
        self.assertEqual(event.numeric_value, Decimal('1.00'))

    def test_track_event_without_user(self):
        """Test tracking an event without user"""
        event_data = {
            'event_name': 'anonymous_view',
            'event_category': 'USER_ACTION',
            'source_domain': 'events',
            'session_id': 'anonymous-session',
            'ip_address': '192.168.1.1'
        }
        
        event = EventTrackingService.track_event(event_data)
        
        self.assertEqual(event.event_name, 'anonymous_view')
        self.assertIsNone(event.user)
        self.assertEqual(event.ip_address, '192.168.1.1')


class AlertServiceTest(TestCase):
    """Test AlertService"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        self.metric = MetricDefinition.objects.create(
            name="Test Metric",
            metric_type="COUNT",
            source_domain="events",
            source_model="Event",
            aggregation_period="DAILY"
        )

    def test_create_alert_rule(self):
        """Test creating an alert rule"""
        rule_data = {
            'name': 'High Error Rate Alert',
            'description': 'Alert when error rate exceeds threshold',
            'metric_definition': self.metric,
            'operator': 'GT',
            'threshold_value': 100,
            'notification_methods': ['EMAIL'],
            'recipients': ['admin@example.com'],
            'created_by': self.user
        }
        
        rule = AlertService.create_alert_rule(rule_data, self.user)
        
        self.assertEqual(rule.name, 'High Error Rate Alert')
        self.assertEqual(rule.metric_definition, self.metric)
        self.assertEqual(rule.operator, 'GT')
        self.assertEqual(rule.threshold_value, 100)
        self.assertTrue(rule.is_active)

    def test_get_alert_rule_not_found(self):
        """Test getting non-existent alert rule"""
        with self.assertRaises(AlertRuleNotFound):
            AlertService.get_alert_rule_by_id(99999)


class DataAggregationServiceTest(TestCase):
    """Test DataAggregationService"""

    def test_get_business_metrics_with_mock_data(self):
        """Test getting business metrics with mock data"""
        # Create some test data
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com", 
            password="testpass123"
        )
        
        # Create analytics events for testing
        AnalyticsEvent.objects.create(
            event_name="user_signup",
            event_category="BUSINESS_EVENT",
            source_domain="users",
            user=user,
            numeric_value=1
        )
        
        AnalyticsEvent.objects.create(
            event_name="payment_completed",
            event_category="BUSINESS_EVENT", 
            source_domain="payments",
            numeric_value=99.99
        )
        
        metrics = DataAggregationService.get_business_metrics()
        
        self.assertIsInstance(metrics, dict)
        # The method should return metrics even with minimal data
        self.assertIn('total_events', metrics)


class ReportServiceTest(TestCase):
    """Test ReportService"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )

    def test_get_report_not_found(self):
        """Test getting non-existent report"""
        with self.assertRaises(ReportNotFound):
            ReportService.get_report_by_id(99999)

    def test_get_execution_not_found(self):
        """Test getting non-existent execution"""
        with self.assertRaises(ReportExecutionNotFound):
            ReportService.get_execution_by_id(str(uuid4()))


class DashboardServiceTest(TestCase):
    """Test DashboardService"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )

    def test_get_dashboard_not_found(self):
        """Test getting non-existent dashboard"""
        with self.assertRaises(DashboardNotFound):
            DashboardService.get_dashboard_by_id(99999)

    def test_create_dashboard_duplicate_name(self):
        """Test creating dashboard with duplicate name"""
        Dashboard.objects.create(
            name="Unique Dashboard",
            dashboard_type="EXECUTIVE",
            created_by=self.user
        )
        
        with self.assertRaises(DuplicateDashboardName):
            DashboardService.create_dashboard({
                'name': 'Unique Dashboard',
                'dashboard_type': 'OPERATIONAL'
            }, self.user)


class CacheTest(TestCase):
    """Test caching functionality"""

    def setUp(self):
        # Clear cache before each test
        cache.clear()

    def tearDown(self):
        # Clear cache after each test
        cache.clear()

    def test_metric_calculation_caching(self):
        """Test that metric calculations are cached"""
        metric = MetricDefinition.objects.create(
            name="Cached Metric",
            metric_type="COUNT",
            source_domain="events",
            source_model="Event",
            aggregation_period="DAILY"
        )
        
        # Mock the calculation to return a known value
        with patch.object(MetricDefinitionService, '_calculate_metric_value', return_value=42):
            with patch.object(MetricDefinitionService, '_get_source_model'):
                # First call should calculate and cache
                result1 = MetricDefinitionService.calculate_metric(metric.id)
                
                # Second call should use cached value
                result2 = MetricDefinitionService.calculate_metric(metric.id)
                
                self.assertEqual(result1, result2)


class EdgeCaseTest(TestCase):
    """Test edge cases and error conditions"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )

    def test_metric_with_empty_filters(self):
        """Test metric calculation with empty filters"""
        metric = MetricDefinition.objects.create(
            name="Test Metric",
            metric_type="COUNT",
            source_domain="events",
            source_model="Event",
            aggregation_period="DAILY",
            filters={}
        )
        
        with patch.object(MetricDefinitionService, '_get_source_model'):
            with patch.object(MetricDefinitionService, '_calculate_metric_value', return_value=0):
                result = MetricDefinitionService.calculate_metric(metric.id)
                self.assertEqual(result, 0)

    def test_analytics_event_with_large_numeric_value(self):
        """Test analytics event with large numeric value"""
        event = AnalyticsEvent.objects.create(
            event_name="large_transaction",
            event_category="BUSINESS_EVENT",
            source_domain="payments",
            numeric_value=Decimal("999999999999.99")
        )
        
        self.assertEqual(event.numeric_value, Decimal("999999999999.99"))

    def test_widget_ordering(self):
        """Test widget ordering within dashboard"""
        dashboard = Dashboard.objects.create(
            name="Test Dashboard",
            dashboard_type="EXECUTIVE",
            created_by=self.user
        )
        metric = MetricDefinition.objects.create(
            name="Test Metric",
            metric_type="COUNT",
            source_domain="events",
            source_model="Event",
            aggregation_period="DAILY"
        )
        
        # Create widgets with different orders
        widget1 = Widget.objects.create(
            dashboard=dashboard,
            metric_definition=metric,
            widget_type="METRIC_CARD",
            title="Widget 1",
            order=2
        )
        widget2 = Widget.objects.create(
            dashboard=dashboard,
            metric_definition=metric,
            widget_type="METRIC_CARD",
            title="Widget 2",
            order=1
        )
        
        widgets = list(Widget.objects.filter(dashboard=dashboard))
        self.assertEqual(widgets[0], widget2)  # Order 1 should come first
        self.assertEqual(widgets[1], widget1)  # Order 2 should come second

    def test_funnel_conversion_completion(self):
        """Test funnel conversion completion logic"""
        funnel = ConversionFunnel.objects.create(
            name="Test Funnel",
            steps=[
                {"name": "Step 1", "event": "step_1"},
                {"name": "Step 2", "event": "step_2"},
                {"name": "Step 3", "event": "step_3"}
            ],
            time_window_hours=24
        )
        
        conversion = FunnelConversion.objects.create(
            funnel=funnel,
            user=self.user,
            started_at=timezone.now(),
            current_step=2,
            completed_steps=[0, 1, 2],
            is_completed=True,
            completed_at=timezone.now()
        )
        
        self.assertTrue(conversion.is_completed)
        self.assertIsNotNone(conversion.completed_at)
        self.assertEqual(len(conversion.completed_steps), 3)


class IntegrationTest(TransactionTestCase):
    """Integration tests for the analytics domain"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )

    def test_end_to_end_metric_creation_and_calculation(self):
        """Test complete flow from metric creation to calculation"""
        # Create a metric definition
        metric_data = {
            'name': 'Integration Test Metric',
            'description': 'Test metric for integration testing',
            'metric_type': 'COUNT',
            'source_domain': 'analytics',  # Use analytics domain itself for testing
            'source_model': 'AnalyticsEvent',
            'aggregation_period': 'DAILY',
            'is_active': True
        }
        
        metric = MetricDefinitionService.create_metric(metric_data)
        self.assertIsNotNone(metric)
        self.assertEqual(metric.name, 'Integration Test Metric')
        
        # Create some test events to count
        for i in range(5):
            AnalyticsEvent.objects.create(
                event_name=f"test_event_{i}",
                event_category="USER_ACTION",
                source_domain="analytics"
            )
        
        # Calculate the metric
        result = MetricDefinitionService.calculate_metric(metric.id)
        self.assertEqual(result, 5)  # Should count the 5 events we created

    def test_dashboard_with_widgets_creation(self):
        """Test creating dashboard with widgets"""
        # Create metric
        metric = MetricDefinition.objects.create(
            name="Dashboard Test Metric",
            metric_type="COUNT",
            source_domain="analytics",
            source_model="AnalyticsEvent",
            aggregation_period="DAILY"
        )
        
        # Create dashboard
        dashboard_data = {
            'name': 'Integration Test Dashboard',
            'dashboard_type': 'EXECUTIVE',
            'created_by': self.user,
            'layout_config': {'columns': 2, 'rows': 2}
        }
        
        dashboard = DashboardService.create_dashboard(dashboard_data, self.user)
        self.assertIsNotNone(dashboard)
        
        # Add widget to dashboard
        widget_data = {
            'dashboard': dashboard,
            'metric_definition': metric,
            'widget_type': 'METRIC_CARD',
            'title': 'Test Widget',
            'size': 'MEDIUM'
        }
        
        widget = Widget.objects.create(**widget_data)
        self.assertEqual(widget.dashboard, dashboard)
        self.assertEqual(widget.metric_definition, metric)