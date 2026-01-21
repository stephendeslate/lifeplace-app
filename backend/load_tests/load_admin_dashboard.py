"""
Admin Dashboard Load Testing

Tests the admin dashboard which triggers 15+ analytics queries.

Based on verified code review of:
- Backend: core/domains/analytics/views.py
- Frontend: frontend/admin-crm/src/apis/analytics.api.ts

The admin dashboard loads these endpoints simultaneously:
- /api/analytics/dashboard/ - Main KPIs
- /api/analytics/sales/bookings/ - Booking summary
- /api/analytics/sales/pipeline/ - Reservation pipeline
- /api/analytics/sales/revenue/ - Revenue breakdown
- /api/analytics/sales/payments/ - Payment tracking
- /api/analytics/events/attendance/ - Attendance metrics
- /api/analytics/events/packages/ - Package performance
- /api/analytics/events/feedback/ - Feedback scores
- /api/analytics/events/types/ - Event type breakdown
- /api/analytics/customers/leads/ - Lead sources
- /api/analytics/customers/conversion/ - Conversion rates
- /api/analytics/customers/growth/ - Growth trends
- /api/analytics/operations/venues/ - Venue usage
- /api/analytics/operations/calendar/ - Calendar utilization

Each endpoint involves database aggregation queries.
"""

import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta

from config import config
from utils import think_time

logger = logging.getLogger(__name__)


class AdminDashboardBehavior:
    """
    Encapsulates admin dashboard behavior for load testing.

    The admin dashboard is particularly important to test because:
    1. It loads 15+ analytics queries simultaneously
    2. Each query involves database aggregations
    3. Multiple admins accessing dashboard simultaneously = high DB load
    """

    def __init__(self, client, base_url: str):
        self.client = client
        self.base_url = base_url

    def load_full_dashboard(self, headers: Dict[str, str], rate_tracker) -> Dict[str, Any]:
        """
        Load the full admin dashboard (simulates page load).

        This triggers all analytics endpoints that the frontend loads
        when an admin opens the dashboard.

        Based on: frontend/admin-crm/src/hooks/useAnalytics.ts
        """
        results = {
            "success_count": 0,
            "failure_count": 0,
            "endpoints_tested": [],
        }

        # Get date range for queries (last 30 days - common default)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        date_params = f"start_date={start_date.strftime('%Y-%m-%d')}&end_date={end_date.strftime('%Y-%m-%d')}"

        # Dashboard KPIs (main)
        if self._call_endpoint(
            "/api/analytics/dashboard/",
            headers,
            rate_tracker,
            "dashboard"
        ):
            results["success_count"] += 1
        else:
            results["failure_count"] += 1
        results["endpoints_tested"].append("dashboard")

        # Sales analytics
        sales_endpoints = [
            f"/api/analytics/sales/bookings/?{date_params}",
            f"/api/analytics/sales/pipeline/?{date_params}",
            f"/api/analytics/sales/revenue/?{date_params}",
            f"/api/analytics/sales/payments/?{date_params}",
        ]

        for endpoint in sales_endpoints:
            if self._call_endpoint(endpoint, headers, rate_tracker, "sales"):
                results["success_count"] += 1
            else:
                results["failure_count"] += 1
            results["endpoints_tested"].append(endpoint.split("?")[0])

        # Events analytics
        events_endpoints = [
            f"/api/analytics/events/attendance/?{date_params}",
            "/api/analytics/events/packages/",
            f"/api/analytics/events/feedback/?{date_params}",
            f"/api/analytics/events/types/?{date_params}",
        ]

        for endpoint in events_endpoints:
            if self._call_endpoint(endpoint, headers, rate_tracker, "events"):
                results["success_count"] += 1
            else:
                results["failure_count"] += 1
            results["endpoints_tested"].append(endpoint.split("?")[0])

        # Customer analytics
        customer_endpoints = [
            f"/api/analytics/customers/leads/?{date_params}",
            f"/api/analytics/customers/conversion/?{date_params}",
            f"/api/analytics/customers/growth/?{date_params}",
        ]

        for endpoint in customer_endpoints:
            if self._call_endpoint(endpoint, headers, rate_tracker, "customers"):
                results["success_count"] += 1
            else:
                results["failure_count"] += 1
            results["endpoints_tested"].append(endpoint.split("?")[0])

        # Operations analytics
        ops_endpoints = [
            f"/api/analytics/operations/venues/?{date_params}",
            f"/api/analytics/operations/calendar/?{date_params}",
        ]

        for endpoint in ops_endpoints:
            if self._call_endpoint(endpoint, headers, rate_tracker, "operations"):
                results["success_count"] += 1
            else:
                results["failure_count"] += 1
            results["endpoints_tested"].append(endpoint.split("?")[0])

        logger.info(
            f"Dashboard load complete: {results['success_count']}/{len(results['endpoints_tested'])} successful"
        )

        return results

    def load_booking_flow_analytics(self, headers: Dict[str, str], rate_tracker) -> Dict[str, Any]:
        """
        Load booking flow specific analytics.

        Based on: frontend/admin-crm/src/apis/analytics.api.ts

        Endpoints:
        - /api/analytics/booking-flow/funnel/
        - /api/analytics/booking-flow/performance/
        - /api/analytics/booking-flow/abandonment/
        - /api/analytics/booking-flow/trends/
        """
        results = {
            "success_count": 0,
            "failure_count": 0,
        }

        # Get date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        date_params = f"start_date={start_date.strftime('%Y-%m-%d')}&end_date={end_date.strftime('%Y-%m-%d')}"

        booking_endpoints = [
            f"/api/analytics/booking-flow/funnel/?{date_params}",
            f"/api/analytics/booking-flow/performance/?{date_params}",
            f"/api/analytics/booking-flow/abandonment/?{date_params}",
            f"/api/analytics/booking-flow/trends/?{date_params}",
        ]

        for endpoint in booking_endpoints:
            if self._call_endpoint(endpoint, headers, rate_tracker, "booking-flow"):
                results["success_count"] += 1
            else:
                results["failure_count"] += 1

        return results

    def load_questionnaire_analytics(self, headers: Dict[str, str], rate_tracker) -> Dict[str, Any]:
        """
        Load questionnaire analytics.

        Endpoints:
        - /api/analytics/questionnaires/summary/
        - /api/analytics/questionnaires/heatmap/
        - /api/analytics/questionnaires/problem-fields/
        """
        results = {
            "success_count": 0,
            "failure_count": 0,
        }

        questionnaire_endpoints = [
            "/api/analytics/questionnaires/summary/",
            "/api/analytics/questionnaires/heatmap/",
            "/api/analytics/questionnaires/problem-fields/",
        ]

        for endpoint in questionnaire_endpoints:
            if self._call_endpoint(endpoint, headers, rate_tracker, "questionnaires"):
                results["success_count"] += 1
            else:
                results["failure_count"] += 1

        return results

    def _call_endpoint(
        self,
        endpoint: str,
        headers: Dict[str, str],
        rate_tracker,
        category: str
    ) -> bool:
        """
        Make a single API call to an analytics endpoint.
        """
        if not rate_tracker.can_make_request():
            think_time(1, 2)
            return False

        # Create a readable name for Locust stats
        # Extract just the main path for grouping
        name_parts = endpoint.split("?")[0].split("/")
        name = f"/api/analytics/{category}/"

        with self.client.get(
            endpoint,
            headers=headers,
            catch_response=True,
            name=name
        ) as response:
            rate_tracker.record_call()

            if response.status_code == 200:
                response.success()
                return True
            elif response.status_code == 429:
                response.failure("Rate limited")
                return False
            elif response.status_code == 401:
                response.failure("Authentication required")
                return False
            else:
                response.failure(f"Failed: {response.status_code}")
                return False


class AdminCRUDOperations:
    """
    Test admin CRUD operations that may be database-intensive.

    Based on: frontend/admin-crm/src/apis/
    """

    def __init__(self, client, base_url: str):
        self.client = client
        self.base_url = base_url

    def test_events_list_with_filters(
        self,
        headers: Dict[str, str],
        rate_tracker
    ) -> bool:
        """
        Test events list with various filter combinations.

        The events list uses complex filtering:
        - search (text search)
        - event_type (foreign key)
        - status (enum)
        - client (foreign key)
        - date range

        Based on: frontend/admin-crm/src/apis/events.api.ts
        Query optimization: select_related on event, client, venue
        """
        if not rate_tracker.can_make_request():
            return False

        # Test with common filter combinations
        filter_params = "?page_size=25&ordering=-event_date"

        with self.client.get(
            f"/api/events/events/{filter_params}",
            headers=headers,
            catch_response=True,
            name="/api/events/events/ [filtered]"
        ) as response:
            rate_tracker.record_call()

            if response.status_code == 200:
                response.success()
                return True
            else:
                response.failure(f"Failed: {response.status_code}")
                return False

    def test_payments_list_with_filters(
        self,
        headers: Dict[str, str],
        rate_tracker
    ) -> bool:
        """
        Test payments list with filters.

        Query optimization from views.py:116-120:
        select_related('event', 'event__client', 'event__event_type',
                      'payment_method', 'invoice', 'gateway')
        """
        if not rate_tracker.can_make_request():
            return False

        filter_params = "?page_size=25&ordering=-created_at"

        with self.client.get(
            f"/api/payments/payments/{filter_params}",
            headers=headers,
            catch_response=True,
            name="/api/payments/payments/ [filtered]"
        ) as response:
            rate_tracker.record_call()

            if response.status_code == 200:
                response.success()
                return True
            else:
                response.failure(f"Failed: {response.status_code}")
                return False

    def test_booking_sessions_list(
        self,
        headers: Dict[str, str],
        rate_tracker
    ) -> bool:
        """
        Test booking sessions list.

        Admin views booking sessions for analytics and debugging.
        """
        if not rate_tracker.can_make_request():
            return False

        with self.client.get(
            "/api/bookingflow/sessions/?page_size=25",
            headers=headers,
            catch_response=True,
            name="/api/bookingflow/sessions/"
        ) as response:
            rate_tracker.record_call()

            if response.status_code == 200:
                response.success()
                return True
            else:
                response.failure(f"Failed: {response.status_code}")
                return False


class AdminDashboardStressTest:
    """
    Stress test for admin dashboard concurrent access.

    Tests what happens when multiple admins access the dashboard
    simultaneously - a realistic scenario during business hours.
    """

    def __init__(self, client, base_url: str):
        self.client = client
        self.base_url = base_url
        self.behavior = AdminDashboardBehavior(client, base_url)

    def concurrent_dashboard_loads(
        self,
        headers: Dict[str, str],
        rate_tracker,
        iterations: int = 10
    ) -> Dict[str, Any]:
        """
        Simulate multiple rapid dashboard loads.

        This tests the scenario where admins refresh their dashboards
        or multiple admins access dashboards simultaneously.
        """
        results = {
            "iterations": iterations,
            "total_success": 0,
            "total_failure": 0,
            "per_iteration": [],
        }

        for i in range(iterations):
            iteration_result = self.behavior.load_full_dashboard(headers, rate_tracker)
            results["total_success"] += iteration_result["success_count"]
            results["total_failure"] += iteration_result["failure_count"]
            results["per_iteration"].append(iteration_result)

            # Brief pause between dashboard loads
            think_time(0.5, 1.0)

        return results
