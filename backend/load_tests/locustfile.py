"""
LifePlace Load Testing - Main Locust Entry Point

This file orchestrates all load testing scenarios for the LifePlace platform.

Usage:
    # Run all tests (web UI)
    locust -f locustfile.py --host=https://api.yourdomain.com

    # Run headless with specific user count
    locust -f locustfile.py --host=https://api.yourdomain.com \
        --headless -u 50 -r 5 -t 10m

    # Run specific user class only
    locust -f locustfile.py --host=https://api.yourdomain.com \
        BookingFlowUser

Environment Variables Required:
    LOAD_TEST_BASE_URL - API base URL
    LOAD_TEST_ADMIN_EMAIL - Test admin account email
    LOAD_TEST_ADMIN_PASSWORD - Test admin account password
    LOAD_TEST_CLIENT_EMAIL - Test client account email
    LOAD_TEST_CLIENT_PASSWORD - Test client account password
    LOAD_TEST_BOOKING_FLOW_ID - ID of booking flow to test
    LOAD_TEST_VENUE_ID - ID of venue to use in tests
    LOAD_TEST_PACKAGE_ID - ID of package to use in tests
    LOAD_TEST_EVENT_TYPE_ID - ID of event type to use in tests

Based on verified code review of:
    - Backend: 20 API domains, Django REST Framework
    - Frontend: React with TanStack Query
    - Infrastructure: Fly.io Singapore, Upstash Redis
    - Rate limits: 100/hour anon, 1000/hour authenticated
"""

import logging
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner

from config import config, USER_WEIGHTS
from utils import TokenManager, think_time, RateLimitTracker

# Import user behavior classes
from load_booking_flow import BookingFlowBehavior
from load_admin_dashboard import AdminDashboardBehavior

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# USER CLASSES
# =============================================================================

class AnonymousBrowserUser(HttpUser):
    """
    Simulates anonymous users browsing the booking flows.

    Behavior:
    - Browse available booking flows
    - Check event types
    - View public availability
    - Does NOT complete bookings

    Weight: 50% of traffic (based on USER_WEIGHTS)
    Rate limit awareness: 100/hour for anonymous users
    """

    weight = USER_WEIGHTS["anonymous_browser"]
    wait_time = between(config.min_think_time, config.max_think_time)

    def on_start(self):
        """Initialize rate limit tracker for anonymous user."""
        self.rate_tracker = RateLimitTracker(limit_per_hour=config.anon_rate_limit)

    @task(3)
    def browse_booking_flows(self):
        """
        Browse available booking flows.

        Endpoint: GET /api/bookingflow/public/flows/
        Based on: core/domains/bookingflow/urls.py
        """
        if not self.rate_tracker.can_make_request():
            think_time(5, 10)  # Back off if near rate limit
            return

        with self.client.get(
            "/api/bookingflow/public/flows/",
            catch_response=True,
            name="/api/bookingflow/public/flows/"
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")
            else:
                response.failure(f"Failed: {response.status_code}")

    @task(2)
    def browse_event_types(self):
        """
        Browse available event types.

        Endpoint: GET /api/events/event-types/
        Based on: core/domains/events/urls.py
        """
        if not self.rate_tracker.can_make_request():
            return

        with self.client.get(
            "/api/events/event-types/",
            catch_response=True,
            name="/api/events/event-types/"
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")
            else:
                response.failure(f"Failed: {response.status_code}")

    @task(2)
    def check_public_availability(self):
        """
        Check public availability for dates.

        Endpoint: GET /api/events/public/availability/
        Based on: core/domains/events/urls.py
        """
        if not self.rate_tracker.can_make_request():
            return

        with self.client.get(
            "/api/events/public/availability/",
            catch_response=True,
            name="/api/events/public/availability/"
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")
            else:
                response.failure(f"Failed: {response.status_code}")


class BookingFlowUser(HttpUser):
    """
    Simulates users actively going through the booking flow.

    Behavior:
    - Start booking session
    - Progress through steps (venue, datetime, package, contact)
    - Calculate pricing
    - Validate availability
    - DOES NOT complete payment (to avoid real charges)

    Weight: 30% of traffic
    Based on: core/domains/bookingflow/ and frontend/client-portal/src/apis/booking/
    """

    weight = USER_WEIGHTS["booking_user"]
    wait_time = between(config.min_think_time * 2, config.max_think_time * 2)

    def on_start(self):
        """Initialize booking flow behavior."""
        self.behavior = BookingFlowBehavior(self.client, self.host)
        self.rate_tracker = RateLimitTracker(limit_per_hour=config.anon_rate_limit)

    @task
    def complete_booking_flow_steps(self):
        """
        Execute a realistic booking flow (stops before payment).

        This simulates the full client-portal booking experience
        as documented in frontend/client-portal/src/apis/booking/core.api.ts
        """
        if not self.rate_tracker.can_make_request():
            think_time(5, 10)
            return

        # Execute booking flow (will make multiple API calls)
        self.behavior.execute_booking_flow(self.rate_tracker)


class AuthenticatedClientUser(HttpUser):
    """
    Simulates authenticated clients checking their events.

    Behavior:
    - Login with credentials
    - View their events
    - Check invoices and payments
    - View quotes

    Weight: 15% of traffic
    Rate limit: 1000/hour for authenticated users
    """

    weight = USER_WEIGHTS["authenticated_client"]
    wait_time = between(config.min_think_time, config.max_think_time)

    def on_start(self):
        """Login at the start of the test."""
        self.token_manager = TokenManager(self.client, self.host)
        self.rate_tracker = RateLimitTracker(limit_per_hour=config.user_rate_limit)

        # Login with test client credentials
        if config.client_email and config.client_password:
            if not self.token_manager.login(config.client_email, config.client_password):
                logger.warning("Client login failed, running as anonymous")

    def on_stop(self):
        """Logout at the end of the test."""
        self.token_manager.logout()

    @task(3)
    def view_my_events(self):
        """
        View client's events.

        Endpoint: GET /api/events/events/
        Based on: frontend/client-portal/src/apis/events.api.ts
        """
        if not self.rate_tracker.can_make_request():
            return

        headers = self.token_manager.get_auth_headers()
        with self.client.get(
            "/api/events/events/",
            headers=headers,
            catch_response=True,
            name="/api/events/events/ [client]"
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                # Try to refresh token
                if self.token_manager.refresh_tokens():
                    response.success()
                else:
                    response.failure("Authentication failed")
            elif response.status_code == 429:
                response.failure("Rate limited")
            else:
                response.failure(f"Failed: {response.status_code}")

    @task(2)
    def view_my_invoices(self):
        """
        View client's invoices.

        Endpoint: GET /api/payments/invoices/
        Based on: frontend/client-portal/src/apis/financial.api.ts
        """
        if not self.rate_tracker.can_make_request():
            return

        headers = self.token_manager.get_auth_headers()
        with self.client.get(
            "/api/payments/invoices/",
            headers=headers,
            catch_response=True,
            name="/api/payments/invoices/ [client]"
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")
            else:
                response.failure(f"Failed: {response.status_code}")

    @task(2)
    def view_my_quotes(self):
        """
        View client's quotes.

        Endpoint: GET /api/sales/quotes/
        Based on: frontend/client-portal/src/apis/quotes.api.ts
        """
        if not self.rate_tracker.can_make_request():
            return

        headers = self.token_manager.get_auth_headers()
        with self.client.get(
            "/api/sales/quotes/",
            headers=headers,
            catch_response=True,
            name="/api/sales/quotes/ [client]"
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")
            else:
                response.failure(f"Failed: {response.status_code}")

    @task(1)
    def view_client_dashboard(self):
        """
        View client dashboard analytics.

        Endpoint: GET /api/client/analytics/dashboard/
        Based on: frontend/client-portal/src/apis/analytics.api.ts
        """
        if not self.rate_tracker.can_make_request():
            return

        headers = self.token_manager.get_auth_headers()
        with self.client.get(
            "/api/client/analytics/dashboard/",
            headers=headers,
            catch_response=True,
            name="/api/client/analytics/dashboard/"
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")
            else:
                response.failure(f"Failed: {response.status_code}")


class AdminDashboardUser(HttpUser):
    """
    Simulates admin users accessing the dashboard.

    Behavior:
    - Login with admin credentials
    - Load dashboard analytics (15+ queries)
    - View events, payments, clients
    - Access reports

    Weight: 5% of traffic
    Critical: Dashboard loads 15+ analytics queries simultaneously
    """

    weight = USER_WEIGHTS["admin_user"]
    wait_time = between(config.min_think_time * 2, config.max_think_time * 3)

    def on_start(self):
        """Login as admin at the start of the test."""
        self.token_manager = TokenManager(self.client, self.host)
        self.behavior = AdminDashboardBehavior(self.client, self.host)
        self.rate_tracker = RateLimitTracker(limit_per_hour=config.user_rate_limit)

        # Login with test admin credentials
        if config.admin_email and config.admin_password:
            if not self.token_manager.login(config.admin_email, config.admin_password):
                logger.warning("Admin login failed")

    def on_stop(self):
        """Logout at the end of the test."""
        self.token_manager.logout()

    @task(3)
    def load_dashboard(self):
        """
        Load the full admin dashboard.

        This triggers 15+ analytics queries as documented in:
        frontend/admin-crm/src/apis/analytics.api.ts

        This is a HEAVY operation and tests database query performance.
        """
        if not self.rate_tracker.can_make_request():
            think_time(5, 10)
            return

        headers = self.token_manager.get_auth_headers()
        self.behavior.load_full_dashboard(headers, self.rate_tracker)

    @task(2)
    def view_events_list(self):
        """
        View events list with filtering.

        Endpoint: GET /api/events/events/
        Based on: frontend/admin-crm/src/apis/events.api.ts
        """
        if not self.rate_tracker.can_make_request():
            return

        headers = self.token_manager.get_auth_headers()
        with self.client.get(
            "/api/events/events/?page_size=25",
            headers=headers,
            catch_response=True,
            name="/api/events/events/ [admin]"
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")
            else:
                response.failure(f"Failed: {response.status_code}")

    @task(2)
    def view_payments_list(self):
        """
        View payments list.

        Endpoint: GET /api/payments/payments/
        Based on: frontend/admin-crm/src/apis/payments.api.ts
        """
        if not self.rate_tracker.can_make_request():
            return

        headers = self.token_manager.get_auth_headers()
        with self.client.get(
            "/api/payments/payments/?page_size=25",
            headers=headers,
            catch_response=True,
            name="/api/payments/payments/ [admin]"
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")
            else:
                response.failure(f"Failed: {response.status_code}")

    @task(1)
    def view_clients_list(self):
        """
        View clients list.

        Endpoint: GET /api/clients/
        Based on: frontend/admin-crm/src/apis/clients.api.ts
        """
        if not self.rate_tracker.can_make_request():
            return

        headers = self.token_manager.get_auth_headers()
        with self.client.get(
            "/api/clients/?page_size=25",
            headers=headers,
            catch_response=True,
            name="/api/clients/ [admin]"
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.failure("Rate limited")
            else:
                response.failure(f"Failed: {response.status_code}")


# =============================================================================
# EVENT HOOKS FOR REPORTING
# =============================================================================

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Log test start with configuration."""
    if isinstance(environment.runner, MasterRunner):
        logger.info("=" * 60)
        logger.info("LifePlace Load Test Starting")
        logger.info("=" * 60)
        logger.info(f"Target: {environment.host}")
        logger.info(f"User weights: {USER_WEIGHTS}")
        logger.info(f"Response time P95 threshold: {config.response_time_p95_threshold}ms")
        logger.info(f"Error rate threshold: {config.error_rate_threshold}%")
        logger.info("=" * 60)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Log test summary."""
    if isinstance(environment.runner, MasterRunner):
        stats = environment.runner.stats
        logger.info("=" * 60)
        logger.info("LifePlace Load Test Complete")
        logger.info("=" * 60)
        logger.info(f"Total requests: {stats.total.num_requests}")
        logger.info(f"Total failures: {stats.total.num_failures}")
        if stats.total.num_requests > 0:
            error_rate = (stats.total.num_failures / stats.total.num_requests) * 100
            logger.info(f"Error rate: {error_rate:.2f}%")
            if error_rate > config.error_rate_threshold:
                logger.warning(f"ERROR RATE EXCEEDED THRESHOLD ({config.error_rate_threshold}%)")
        logger.info(f"Median response time: {stats.total.median_response_time}ms")
        logger.info(f"P95 response time: {stats.total.get_response_time_percentile(0.95)}ms")
        logger.info(f"P99 response time: {stats.total.get_response_time_percentile(0.99)}ms")
        logger.info("=" * 60)


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, context, exception, **kwargs):
    """Track individual request performance for debugging."""
    if response_time > config.response_time_p99_threshold:
        logger.warning(f"SLOW REQUEST: {name} took {response_time}ms")
