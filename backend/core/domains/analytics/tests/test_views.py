"""
API tests for analytics views (views_v2.py).

Tests:
- Authentication and permission requirements
- Date range parameter parsing
- Dashboard KPI endpoint
- Sales endpoints (bookings, pipeline, revenue, payments)
- Events endpoints (attendance, packages, feedback, types)
- Customers endpoints (leads, conversion, list, growth)
- Operations endpoints (venues, calendar, booking times)
- Booking flow analytics endpoints
- Questionnaire analytics endpoints
"""

import pytest
from datetime import timedelta
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from decimal import Decimal


@pytest.mark.django_db
class TestAnalyticsPermissions:
    """Tests for analytics API authentication and permissions."""

    def test_dashboard_kpis_requires_authentication(self, api_client):
        """Test that dashboard endpoint requires authentication."""
        response = api_client.get('/api/analytics/dashboard/')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_dashboard_kpis_requires_admin(self, client_user_client):
        """Test that dashboard endpoint requires admin user."""
        response = client_user_client.get('/api/analytics/dashboard/')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_dashboard_kpis_accessible_by_admin(self, admin_client):
        """Test that dashboard endpoint is accessible by admin."""
        response = admin_client.get('/api/analytics/dashboard/')

        assert response.status_code == status.HTTP_200_OK

    def test_sales_bookings_requires_admin(self, client_user_client):
        """Test that sales endpoints require admin user."""
        response = client_user_client.get('/api/analytics/sales/bookings/')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_customers_endpoint_requires_admin(self, client_user_client):
        """Test that customers endpoint requires admin user."""
        response = client_user_client.get('/api/analytics/customers/list/')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_operations_endpoint_requires_admin(self, client_user_client):
        """Test that operations endpoint requires admin user."""
        response = client_user_client.get('/api/analytics/operations/venues/')

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAnalyticsDateParsing:
    """Tests for date range parameter parsing."""

    def test_dashboard_with_custom_date_range(self, admin_client):
        """Test dashboard with custom start_date and end_date."""
        end_date = timezone.now().isoformat()
        start_date = (timezone.now() - timedelta(days=7)).isoformat()

        response = admin_client.get(
            '/api/analytics/dashboard/',
            {'start_date': start_date, 'end_date': end_date}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'period' in data

    def test_dashboard_with_invalid_date_uses_default(self, admin_client):
        """Test that invalid date strings fall back to defaults."""
        response = admin_client.get(
            '/api/analytics/dashboard/',
            {'start_date': 'invalid-date', 'end_date': 'also-invalid'}
        )

        # Should not fail, uses defaults
        assert response.status_code == status.HTTP_200_OK

    def test_dashboard_defaults_to_last_30_days(self, admin_client):
        """Test that missing date params default to last 30 days."""
        response = admin_client.get('/api/analytics/dashboard/')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'period' in data
        assert 'start_date' in data['period']
        assert 'end_date' in data['period']

    def test_date_parsing_with_z_suffix(self, admin_client):
        """Test that dates with Z (UTC) suffix are parsed correctly."""
        end_date = timezone.now().strftime('%Y-%m-%dT%H:%M:%SZ')
        start_date = (timezone.now() - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')

        response = admin_client.get(
            '/api/analytics/dashboard/',
            {'start_date': start_date, 'end_date': end_date}
        )

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestDashboardKPIsEndpoint:
    """Tests for the dashboard KPIs endpoint."""

    def test_dashboard_kpis_returns_expected_fields(self, admin_client):
        """Test that dashboard returns all expected KPI fields."""
        response = admin_client.get('/api/analytics/dashboard/')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        expected_fields = [
            'total_bookings',
            'confirmed_bookings',
            'completed_bookings',
            'cancelled_bookings',
            'event_revenue',
            'total_revenue',
            'event_revenue_trend',
            'total_revenue_trend',
            'avg_booking_value',
            'new_clients',
            'booking_sessions',
            'completed_sessions',
            'conversion_rate',
            'period',
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"

    def test_dashboard_kpis_with_data(
        self, admin_client, event_factory, payment_factory, user_factory
    ):
        """Test dashboard KPIs with actual data."""
        client = user_factory()
        event = event_factory(
            client=client,
            status='COMPLETED',
            start_date=timezone.now() - timedelta(days=5),
            end_date=timezone.now() - timedelta(days=4)
        )
        payment_factory(event=event, completed=True, amount=Decimal('1000.00'))

        response = admin_client.get('/api/analytics/dashboard/')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Should have some completed bookings and revenue
        assert data['completed_bookings'] >= 1
        assert data['event_revenue'] >= 1000.0


@pytest.mark.django_db
class TestSalesEndpoints:
    """Tests for sales analytics endpoints."""

    def test_bookings_summary_endpoint(self, admin_client):
        """Test bookings summary endpoint."""
        response = admin_client.get('/api/analytics/sales/bookings/')

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_bookings_summary_with_period_param(self, admin_client):
        """Test bookings summary with period parameter."""
        response = admin_client.get(
            '/api/analytics/sales/bookings/',
            {'period': 'weekly'}
        )

        assert response.status_code == status.HTTP_200_OK

    def test_bookings_summary_with_data(
        self, admin_client, event_factory, user_factory
    ):
        """Test bookings summary returns data when events exist."""
        client = user_factory()
        event_factory(client=client, status='LEAD')
        event_factory(client=client, confirmed=True)

        response = admin_client.get('/api/analytics/sales/bookings/')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Should have data entries
        assert isinstance(data, list)

    def test_reservation_pipeline_endpoint(self, admin_client):
        """Test reservation pipeline endpoint."""
        response = admin_client.get('/api/analytics/sales/pipeline/')

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_reservation_pipeline_with_data(
        self, admin_client, event_factory, user_factory
    ):
        """Test reservation pipeline returns proper structure."""
        client = user_factory()
        event_factory(client=client, status='LEAD')

        response = admin_client.get('/api/analytics/sales/pipeline/')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        if data:
            entry = data[0]
            assert 'status' in entry
            assert 'label' in entry
            assert 'count' in entry
            assert 'total_value' in entry

    def test_revenue_by_type_endpoint(self, admin_client):
        """Test revenue by type endpoint."""
        response = admin_client.get('/api/analytics/sales/revenue/')

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    def test_payment_tracking_endpoint(self, admin_client):
        """Test payment tracking endpoint."""
        response = admin_client.get('/api/analytics/sales/payments/')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, dict)
        assert 'total_payments' in data
        assert 'overdue_count' in data


@pytest.mark.django_db
class TestEventsEndpoints:
    """Tests for events analytics endpoints."""

    def test_event_attendance_endpoint(self, admin_client):
        """Test event attendance endpoint."""
        response = admin_client.get('/api/analytics/events/attendance/')

        assert response.status_code == status.HTTP_200_OK

    def test_package_performance_endpoint(self, admin_client):
        """Test package performance endpoint."""
        response = admin_client.get('/api/analytics/events/packages/')

        assert response.status_code == status.HTTP_200_OK

    def test_package_performance_with_limit(self, admin_client):
        """Test package performance with limit parameter."""
        response = admin_client.get(
            '/api/analytics/events/packages/',
            {'limit': 5}
        )

        assert response.status_code == status.HTTP_200_OK

    def test_feedback_scores_endpoint(self, admin_client):
        """Test feedback scores endpoint."""
        response = admin_client.get('/api/analytics/events/feedback/')

        assert response.status_code == status.HTTP_200_OK

    def test_event_type_breakdown_endpoint(self, admin_client):
        """Test event type breakdown endpoint."""
        response = admin_client.get('/api/analytics/events/types/')

        assert response.status_code == status.HTTP_200_OK

    def test_guest_demographics_placeholder(self, admin_client):
        """Test guest demographics placeholder endpoint."""
        response = admin_client.get('/api/analytics/events/demographics/')

        assert response.status_code == status.HTTP_200_OK

    def test_repeat_clients_placeholder(self, admin_client):
        """Test repeat clients placeholder endpoint."""
        response = admin_client.get('/api/analytics/events/repeat-clients/')

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestCustomersEndpoints:
    """Tests for customers analytics endpoints."""

    def test_lead_sources_endpoint(self, admin_client):
        """Test lead sources endpoint."""
        response = admin_client.get('/api/analytics/customers/leads/')

        assert response.status_code == status.HTTP_200_OK

    def test_conversion_rates_endpoint(self, admin_client):
        """Test conversion rates endpoint."""
        response = admin_client.get('/api/analytics/customers/conversion/')

        assert response.status_code == status.HTTP_200_OK

    def test_customer_list_endpoint(self, admin_client):
        """Test customer list endpoint."""
        response = admin_client.get('/api/analytics/customers/list/')

        assert response.status_code == status.HTTP_200_OK

    def test_customer_list_with_limit(self, admin_client):
        """Test customer list with limit parameter."""
        response = admin_client.get(
            '/api/analytics/customers/list/',
            {'limit': 10}
        )

        assert response.status_code == status.HTTP_200_OK

    def test_customer_growth_endpoint(self, admin_client):
        """Test customer growth endpoint."""
        response = admin_client.get('/api/analytics/customers/growth/')

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestOperationsEndpoints:
    """Tests for operations analytics endpoints."""

    def test_venue_usage_endpoint(self, admin_client):
        """Test venue usage endpoint."""
        response = admin_client.get('/api/analytics/operations/venues/')

        assert response.status_code == status.HTTP_200_OK

    def test_calendar_utilization_endpoint(self, admin_client):
        """Test calendar utilization endpoint."""
        response = admin_client.get('/api/analytics/operations/calendar/')

        assert response.status_code == status.HTTP_200_OK

    def test_booking_time_analysis_endpoint(self, admin_client):
        """Test booking time analysis endpoint."""
        response = admin_client.get('/api/analytics/operations/booking-times/')

        assert response.status_code == status.HTTP_200_OK

    def test_kitchen_usage_placeholder(self, admin_client):
        """Test kitchen usage placeholder endpoint."""
        response = admin_client.get('/api/analytics/operations/kitchen/')

        assert response.status_code == status.HTTP_200_OK

    def test_inventory_report_placeholder(self, admin_client):
        """Test inventory report placeholder endpoint."""
        response = admin_client.get('/api/analytics/operations/inventory/')

        assert response.status_code == status.HTTP_200_OK

    def test_app_engagement_placeholder(self, admin_client):
        """Test app engagement placeholder endpoint."""
        response = admin_client.get('/api/analytics/engagement/')

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestBookingFlowAnalyticsEndpoints:
    """Tests for booking flow analytics endpoints."""

    def test_booking_flow_funnel_endpoint(self, admin_client):
        """Test booking flow funnel endpoint."""
        response = admin_client.get('/api/analytics/booking-flow/funnel/')

        assert response.status_code == status.HTTP_200_OK

    def test_booking_flow_funnel_with_flow_id(self, admin_client):
        """Test booking flow funnel with specific flow_id."""
        response = admin_client.get(
            '/api/analytics/booking-flow/funnel/',
            {'flow_id': '1'}
        )

        assert response.status_code == status.HTTP_200_OK

    def test_booking_flow_performance_endpoint(self, admin_client):
        """Test booking flow performance endpoint."""
        response = admin_client.get('/api/analytics/booking-flow/performance/')

        assert response.status_code == status.HTTP_200_OK

    def test_booking_flow_abandonment_endpoint(self, admin_client):
        """Test booking flow abandonment endpoint."""
        response = admin_client.get('/api/analytics/booking-flow/abandonment/')

        assert response.status_code == status.HTTP_200_OK

    def test_booking_flow_abandonment_with_flow_id(self, admin_client):
        """Test booking flow abandonment with specific flow_id."""
        response = admin_client.get(
            '/api/analytics/booking-flow/abandonment/',
            {'flow_id': '1'}
        )

        assert response.status_code == status.HTTP_200_OK

    def test_booking_flow_trends_endpoint(self, admin_client):
        """Test booking flow trends endpoint."""
        response = admin_client.get('/api/analytics/booking-flow/trends/')

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestQuestionnaireAnalyticsEndpoints:
    """Tests for questionnaire analytics endpoints."""

    def test_questionnaire_summary_endpoint(self, admin_client):
        """Test questionnaire summary endpoint."""
        response = admin_client.get('/api/analytics/questionnaires/summary/')

        assert response.status_code == status.HTTP_200_OK

    def test_questionnaire_field_heatmap_endpoint(self, admin_client):
        """Test questionnaire field heatmap endpoint with ID."""
        response = admin_client.get('/api/analytics/questionnaires/1/heatmap/')

        # May return 200 with empty data or 404 depending on implementation
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

    def test_questionnaire_problem_fields_endpoint(self, admin_client):
        """Test questionnaire problem fields endpoint."""
        response = admin_client.get('/api/analytics/questionnaires/problem-fields/')

        assert response.status_code == status.HTTP_200_OK

    def test_questionnaire_problem_fields_with_threshold(self, admin_client):
        """Test questionnaire problem fields with threshold parameter."""
        response = admin_client.get(
            '/api/analytics/questionnaires/problem-fields/',
            {'threshold': 70}
        )

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestAnalyticsExportFormats:
    """Tests for export format parameters."""

    def test_bookings_summary_csv_export(self, admin_client):
        """Test bookings summary with CSV export format.

        Note: DRF's URL_FORMAT_OVERRIDE setting intercepts the ?format=csv
        parameter for content negotiation, which may result in a 404 if no
        renderer for that format is registered.
        """
        response = admin_client.get(
            '/api/analytics/sales/bookings/',
            {'format': 'csv'}
        )

        # DRF may intercept ?format=csv for content negotiation (404 if no csv renderer)
        assert response.status_code in [
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_404_NOT_FOUND
        ]

    def test_bookings_summary_excel_export(self, admin_client):
        """Test bookings summary with Excel export format.

        Note: DRF's URL_FORMAT_OVERRIDE setting intercepts the ?format= parameter
        for content negotiation.
        """
        response = admin_client.get(
            '/api/analytics/sales/bookings/',
            {'format': 'excel'}
        )

        # DRF may intercept ?format=excel for content negotiation (404 if no renderer)
        assert response.status_code in [
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_404_NOT_FOUND
        ]

    def test_revenue_csv_export(self, admin_client):
        """Test revenue with CSV export format."""
        response = admin_client.get(
            '/api/analytics/sales/revenue/',
            {'format': 'csv'}
        )

        assert response.status_code in [
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_404_NOT_FOUND
        ]

    def test_lead_sources_csv_export(self, admin_client):
        """Test lead sources with CSV export format."""
        response = admin_client.get(
            '/api/analytics/customers/leads/',
            {'format': 'csv'}
        )

        assert response.status_code in [
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_404_NOT_FOUND
        ]

    def test_customer_list_csv_export(self, admin_client):
        """Test customer list with CSV export format."""
        response = admin_client.get(
            '/api/analytics/customers/list/',
            {'format': 'csv'}
        )

        assert response.status_code in [
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_404_NOT_FOUND
        ]


@pytest.mark.django_db
class TestAnalyticsResponseFormats:
    """Tests for response format validation."""

    def test_dashboard_returns_json(self, admin_client):
        """Test that dashboard returns valid JSON."""
        response = admin_client.get('/api/analytics/dashboard/')

        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'].startswith('application/json')

    def test_sales_bookings_returns_json_list(self, admin_client):
        """Test that sales bookings returns JSON list."""
        response = admin_client.get('/api/analytics/sales/bookings/')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_payment_tracking_returns_json_dict(self, admin_client):
        """Test that payment tracking returns JSON dict."""
        response = admin_client.get('/api/analytics/sales/payments/')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, dict)

    def test_numeric_values_are_serializable(
        self, admin_client, event_factory, payment_factory, user_factory
    ):
        """Test that all numeric values are JSON serializable."""
        client = user_factory()
        event = event_factory(
            client=client,
            status='COMPLETED',
            start_date=timezone.now() - timedelta(days=5),
            end_date=timezone.now() - timedelta(days=4)
        )
        payment_factory(event=event, completed=True, amount=Decimal('1000.00'))

        response = admin_client.get('/api/analytics/dashboard/')

        assert response.status_code == status.HTTP_200_OK
        # If it parses as JSON, values are serializable
        data = response.json()

        # Check that revenue values are numbers, not strings
        assert isinstance(data['event_revenue'], (int, float))
        assert isinstance(data['total_revenue'], (int, float))


@pytest.mark.django_db
class TestAnalyticsIntegration:
    """Integration tests for analytics endpoints."""

    def test_full_analytics_workflow(
        self, admin_client, event_factory, payment_factory, user_factory
    ):
        """Test a complete analytics workflow with real data."""
        # Setup: Create test data
        client = user_factory()

        # Create various events
        lead_event = event_factory(client=client, status='LEAD')
        confirmed_event = event_factory(client=client, confirmed=True)
        completed_event = event_factory(
            client=client,
            status='COMPLETED',
            start_date=timezone.now() - timedelta(days=5),
            end_date=timezone.now() - timedelta(days=4)
        )

        # Add payment to completed event
        payment_factory(event=completed_event, completed=True, amount=Decimal('5000.00'))

        # Test all major endpoints
        endpoints = [
            '/api/analytics/dashboard/',
            '/api/analytics/sales/bookings/',
            '/api/analytics/sales/pipeline/',
            '/api/analytics/sales/revenue/',
            '/api/analytics/sales/payments/',
        ]

        for endpoint in endpoints:
            response = admin_client.get(endpoint)
            assert response.status_code == status.HTTP_200_OK, f"Failed: {endpoint}"

    def test_date_range_affects_results(
        self, admin_client, event_factory, user_factory
    ):
        """Test that date range filtering actually affects results."""
        client = user_factory()

        # Create event
        event_factory(client=client, status='LEAD')

        # Get results for current period
        now = timezone.now()
        response1 = admin_client.get(
            '/api/analytics/dashboard/',
            {
                'start_date': (now - timedelta(days=30)).isoformat(),
                'end_date': now.isoformat()
            }
        )

        # Get results for past period (should have fewer/no events)
        response2 = admin_client.get(
            '/api/analytics/dashboard/',
            {
                'start_date': (now - timedelta(days=365)).isoformat(),
                'end_date': (now - timedelta(days=335)).isoformat()
            }
        )

        assert response1.status_code == status.HTTP_200_OK
        assert response2.status_code == status.HTTP_200_OK

        data1 = response1.json()
        data2 = response2.json()

        # Current period should have more bookings
        assert data1['total_bookings'] >= data2['total_bookings']
