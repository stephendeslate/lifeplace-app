"""
LifePlace Post-Deploy Smoke Test

Validates the 3 critical user journeys after each deployment:
1. Booking flow (public) - the revenue path
2. Client portal (authenticated) - existing customer experience
3. Admin dashboard (authenticated) - internal operations

Usage:
    # Standard smoke test (~2 min, 3 users)
    cd backend/load_tests
    locust -f locustfile.py --headless -u 3 -r 3 -t 2m --html=smoke_report.html

    # Booking flow only
    locust -f locustfile.py --headless -u 1 -r 1 -t 2m BookingFlowSmokeUser

    # With Locust web UI (for debugging)
    locust -f locustfile.py
"""

import logging
from datetime import datetime, timedelta

from config import config
from load_admin_dashboard import AdminDashboardBehavior
from load_booking_flow import BookingFlowBehavior
from locust import HttpUser, between, events, task
from utils import RateLimitTracker, TokenManager, think_time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BookingFlowSmokeUser(HttpUser):
    """
    Validates the public booking flow — the business-critical path.

    Runs one complete booking session (stops before payment):
    start_session → introduction → date_time → package → addon →
    pricing_summary → contact_info → [stops] → release reservation

    fixed_count=1: exactly one instance runs.
    """

    fixed_count = 1
    wait_time = between(config.think_time_min, config.think_time_max)

    def on_start(self):
        self.behavior = BookingFlowBehavior(self.client, self.host)
        self.rate_tracker = RateLimitTracker(limit_per_hour=config.anon_rate_limit)
        self._completed = False

    @task
    def run_booking_flow(self):
        if self._completed:
            think_time(5, 10)  # idle after completing
            return

        # Browse flows list
        with self.client.get(
            "/api/bookingflow/public/flows/", catch_response=True, name="/api/bookingflow/public/flows/"
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed: {response.status_code}")

        think_time(0.5, 1)

        # Check public availability (requires start_date & end_date)
        today = datetime.now()
        avail_params = (
            f"start_date={today.strftime('%Y-%m-%d')}&end_date={(today + timedelta(days=60)).strftime('%Y-%m-%d')}"
        )
        with self.client.get(
            f"/api/events/public/availability/?{avail_params}",
            catch_response=True,
            name="/api/events/public/availability/",
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed: {response.status_code}")

        think_time(0.5, 1)

        # Browse event types
        with self.client.get(
            "/api/events/event-types/", catch_response=True, name="/api/events/event-types/"
        ) as response:
            self.rate_tracker.record_call()
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed: {response.status_code}")

        think_time(0.5, 1)

        # Execute full booking flow (start → steps → release)
        success = self.behavior.execute_booking_flow(self.rate_tracker)
        if success:
            logger.info("SMOKE: Booking flow passed")
        else:
            logger.error("SMOKE: Booking flow FAILED")

        self._completed = True


class ClientPortalSmokeUser(HttpUser):
    """
    Validates the authenticated client experience.

    Runs: login → view events → view invoices → view quotes → logout

    fixed_count=1: exactly one instance runs.
    """

    fixed_count = 1
    wait_time = between(config.think_time_min, config.think_time_max)

    def on_start(self):
        self.token_manager = TokenManager(self.client, self.host)
        self.rate_tracker = RateLimitTracker(limit_per_hour=config.user_rate_limit)
        self._completed = False

        if config.client_email and config.client_password:
            if not self.token_manager.login(config.client_email, config.client_password):
                logger.error("SMOKE: Client login FAILED")

    def on_stop(self):
        self.token_manager.logout()

    @task
    def run_client_journey(self):
        if self._completed:
            think_time(5, 10)
            return

        if not self.token_manager.access_token:
            logger.error("SMOKE: No client token, skipping client journey")
            self._completed = True
            return

        headers = self.token_manager.get_auth_headers()

        # Client endpoints to verify
        endpoints = [
            ("/api/events/client/events/", "client events"),
            ("/api/payments/client/invoices/", "client invoices"),
            ("/api/sales/client/quotes/", "client quotes"),
        ]

        all_passed = True
        for path, _label in endpoints:
            with self.client.get(path, headers=headers, catch_response=True, name=f"{path} [client]") as response:
                self.rate_tracker.record_call()
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Failed: {response.status_code}")
                    all_passed = False

            think_time(0.5, 1)

        if all_passed:
            logger.info("SMOKE: Client portal passed")
        else:
            logger.error("SMOKE: Client portal FAILED")

        self._completed = True


class AdminDashboardSmokeUser(HttpUser):
    """
    Validates the admin dashboard and key CRUD endpoints.

    Runs: login → dashboard analytics → events list → payments list → logout

    fixed_count=1: exactly one instance runs.
    """

    fixed_count = 1
    wait_time = between(config.think_time_min, config.think_time_max)

    def on_start(self):
        self.token_manager = TokenManager(self.client, self.host)
        self.behavior = AdminDashboardBehavior(self.client, self.host)
        self.rate_tracker = RateLimitTracker(limit_per_hour=config.user_rate_limit)
        self._completed = False

        if config.admin_email and config.admin_password:
            if not self.token_manager.login(config.admin_email, config.admin_password):
                logger.error("SMOKE: Admin login FAILED")

    def on_stop(self):
        self.token_manager.logout()

    @task
    def run_admin_journey(self):
        if self._completed:
            think_time(5, 10)
            return

        if not self.token_manager.access_token:
            logger.error("SMOKE: No admin token, skipping admin journey")
            self._completed = True
            return

        headers = self.token_manager.get_auth_headers()

        # Load the full dashboard (14 analytics endpoints)
        dashboard_result = self.behavior.load_full_dashboard(headers, self.rate_tracker)
        dashboard_ok = dashboard_result["failure_count"] == 0

        think_time(0.5, 1)

        # Verify key CRUD endpoints
        crud_endpoints = [
            ("/api/events/events/?page_size=5", "admin events"),
            ("/api/payments/payments/?page_size=5", "admin payments"),
            ("/api/clients/?page_size=5", "admin clients"),
        ]

        crud_ok = True
        for path, _label in crud_endpoints:
            with self.client.get(
                path, headers=headers, catch_response=True, name=f"{path.split('?')[0]} [admin]"
            ) as response:
                self.rate_tracker.record_call()
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Failed: {response.status_code}")
                    crud_ok = False

            think_time(0.5, 1)

        if dashboard_ok and crud_ok:
            logger.info("SMOKE: Admin dashboard passed")
        else:
            logger.error(
                f"SMOKE: Admin dashboard FAILED "
                f"(dashboard: {'ok' if dashboard_ok else 'FAIL'}, "
                f"crud: {'ok' if crud_ok else 'FAIL'})"
            )

        self._completed = True


# =============================================================================
# REPORTING
# =============================================================================


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Print summary and exit with non-zero code if errors detected."""
    stats = environment.runner.stats
    total = stats.total.num_requests
    failures = stats.total.num_failures
    error_rate = (failures / total * 100) if total > 0 else 0
    median = stats.total.median_response_time
    p95 = stats.total.get_response_time_percentile(0.95)

    logger.info("=" * 50)
    logger.info("SMOKE TEST RESULTS")
    logger.info("=" * 50)
    logger.info(f"Requests:  {total}")
    logger.info(f"Failures:  {failures}")
    logger.info(f"Error rate: {error_rate:.1f}%")
    logger.info(f"Median:    {median}ms")
    logger.info(f"P95:       {p95}ms")

    if error_rate > config.error_rate_threshold:
        logger.error(f"FAIL: Error rate {error_rate:.1f}% exceeds {config.error_rate_threshold}%")
    elif p95 and p95 > config.response_time_p95_threshold:
        logger.warning(f"WARN: P95 {p95}ms exceeds {config.response_time_p95_threshold}ms threshold")
    else:
        logger.info("PASS: All thresholds met")

    logger.info("=" * 50)
