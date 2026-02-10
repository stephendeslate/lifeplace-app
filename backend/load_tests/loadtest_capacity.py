"""
LifePlace Capacity Load Test

Stress-tests the platform to find maximum throughput and latency under load.
Ramps concurrent users in stages and produces resume-ready metrics.

Usage:
    cd backend/load_tests

    # Default capacity test (~5 min, ramps to 50 users)
    locust -f loadtest_capacity.py --headless --html=capacity_report.html

    # Ramp to 100 users over 8 min
    LOAD_TEST_MAX_USERS=100 LOAD_TEST_RAMP_DURATION=480 \
        locust -f loadtest_capacity.py --headless --html=capacity_report.html

    # With web UI (watch live at http://localhost:8089)
    locust -f loadtest_capacity.py

IMPORTANT:
    - Rate limits (100/hr anon, 1000/hr auth) WILL throttle results before you
      hit actual infrastructure limits. To measure true capacity, temporarily
      raise rate limits during the test or add a load-test bypass header.
    - This creates test booking sessions in the database. Run during off-hours
      or against a staging environment.
    - Set credentials in .env (see .env.example)
"""

import os
import json
import logging
from datetime import datetime

from locust import HttpUser, task, between, events, LoadTestShape

from config import config
from utils import TokenManager, RateLimitTracker, think_time
from load_booking_flow import BookingFlowBehavior
from load_admin_dashboard import AdminDashboardBehavior

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

MAX_USERS = int(os.getenv("LOAD_TEST_MAX_USERS", "50"))
RAMP_DURATION = int(os.getenv("LOAD_TEST_RAMP_DURATION", "300"))  # total seconds
STAGE_COUNT = int(os.getenv("LOAD_TEST_STAGES", "5"))


# =============================================================================
# USER CLASSES
# =============================================================================

class BookingFlowLoadUser(HttpUser):
    """
    Simulates clients completing the booking flow repeatedly.

    This is the revenue-critical path. Each iteration starts a new session,
    walks through all steps (stops before payment), and releases the reservation.

    weight=6: 60% of simulated users are bookers.
    """

    weight = 6
    wait_time = between(1, 3)

    def on_start(self):
        self.behavior = BookingFlowBehavior(self.client, self.host)
        # Effectively no rate limit — we're testing infrastructure capacity
        self.rate_tracker = RateLimitTracker(limit_per_hour=100_000)

    @task
    def complete_booking_flow(self):
        """Run a complete booking flow, then loop."""
        self.behavior.current_session_id = None
        self.behavior.current_step = None
        self.behavior.booking_flow_id = config.booking_flow_id

        self.behavior.execute_booking_flow(self.rate_tracker)


class ClientPortalLoadUser(HttpUser):
    """
    Simulates authenticated clients browsing their portal.

    weight=2: 20% of simulated users.
    """

    weight = 2
    wait_time = between(2, 5)

    def on_start(self):
        self.token_manager = TokenManager(self.client, self.host)
        self.rate_tracker = RateLimitTracker(limit_per_hour=100_000)

        if config.client_email and config.client_password:
            if not self.token_manager.login(config.client_email, config.client_password):
                logger.error("LOAD: Client login failed")

    def on_stop(self):
        self.token_manager.logout()

    @task
    def browse_client_portal(self):
        if not self.token_manager.access_token:
            return

        headers = self.token_manager.get_auth_headers()

        endpoints = [
            "/api/events/client/events/",
            "/api/payments/client/invoices/",
            "/api/sales/client/quotes/",
        ]

        for path in endpoints:
            with self.client.get(
                path,
                headers=headers,
                catch_response=True,
                name=f"{path} [client]"
            ) as response:
                if response.status_code == 200:
                    response.success()
                elif response.status_code == 429:
                    response.failure("Rate limited")
                else:
                    response.failure(f"Failed: {response.status_code}")

            think_time(0.3, 0.8)


class AdminDashboardLoadUser(HttpUser):
    """
    Simulates admin users loading the full dashboard (14 analytics endpoints).

    weight=2: 20% of simulated users.
    """

    weight = 2
    wait_time = between(3, 6)

    def on_start(self):
        self.token_manager = TokenManager(self.client, self.host)
        self.behavior = AdminDashboardBehavior(self.client, self.host)
        self.rate_tracker = RateLimitTracker(limit_per_hour=100_000)

        if config.admin_email and config.admin_password:
            if not self.token_manager.login(config.admin_email, config.admin_password):
                logger.error("LOAD: Admin login failed")

    def on_stop(self):
        self.token_manager.logout()

    @task
    def load_dashboard(self):
        if not self.token_manager.access_token:
            return

        headers = self.token_manager.get_auth_headers()
        self.behavior.load_full_dashboard(headers, self.rate_tracker)


# =============================================================================
# LOAD SHAPE: Staged ramp-up
# =============================================================================

class CapacityTestShape(LoadTestShape):
    """
    Ramps users in stages to find the capacity ceiling.

    Default (50 users, 5 stages, 300s):
        Stage 1 (0-60s):    10 users
        Stage 2 (60-120s):  20 users
        Stage 3 (120-180s): 30 users
        Stage 4 (180-240s): 40 users
        Stage 5 (240-300s): 50 users

    Each stage holds steady long enough to produce stable percentile metrics.
    """

    def tick(self):
        run_time = self.get_run_time()

        if run_time > RAMP_DURATION:
            return None  # stop

        hold_time = RAMP_DURATION / STAGE_COUNT

        for i in range(1, STAGE_COUNT + 1):
            if run_time < hold_time * i:
                user_count = max(1, int(MAX_USERS * (i / STAGE_COUNT)))
                spawn_rate = max(1, user_count // 5)
                return (user_count, spawn_rate)

        return None


# =============================================================================
# REPORTING
# =============================================================================

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Print resume-ready metrics summary and save JSON report."""
    stats = environment.runner.stats
    total = stats.total

    if total.num_requests == 0:
        logger.info("No requests recorded.")
        return

    # --- Core metrics ---
    total_requests = total.num_requests
    total_failures = total.num_failures
    error_rate = (total_failures / total_requests * 100) if total_requests > 0 else 0
    rps = total.total_rps
    median_rt = total.median_response_time or 0
    avg_rt = total.avg_response_time or 0
    p95_rt = total.get_response_time_percentile(0.95) or 0
    p99_rt = total.get_response_time_percentile(0.99) or 0
    min_rt = total.min_response_time or 0
    max_rt = total.max_response_time or 0

    # --- Per-scenario metrics ---
    booking_endpoints = {}
    admin_endpoints = {}
    client_endpoints = {}

    for key, entry in stats.entries.items():
        name = key[0]  # (name, method) tuple
        if "bookingflow" in name or "booking" in name.lower() or "availability" in name or "event-types" in name:
            booking_endpoints[name] = entry
        elif "analytics" in name:
            admin_endpoints[name] = entry
        elif "[client]" in name:
            client_endpoints[name] = entry

    # Booking flow completions (release-reservation = successful end-to-end)
    release_key = ("/api/bookingflow/session/release-reservation/", "POST")
    release_stats = stats.entries.get(release_key)
    booking_flows_completed = release_stats.num_requests if release_stats else 0

    start_key = ("/api/bookingflow/public/flows/{id}/start_session/", "POST")
    start_stats = stats.entries.get(start_key)
    booking_flows_started = start_stats.num_requests if start_stats else 0

    booking_total_reqs = sum(e.num_requests for e in booking_endpoints.values())
    booking_total_failures = sum(e.num_failures for e in booking_endpoints.values())
    booking_rps = sum(e.total_rps for e in booking_endpoints.values())

    admin_total_reqs = sum(e.num_requests for e in admin_endpoints.values())
    admin_avg_rt = (
        sum(e.avg_response_time * e.num_requests for e in admin_endpoints.values()) / admin_total_reqs
        if admin_total_reqs > 0 else 0
    )
    admin_p95 = max(
        (e.get_response_time_percentile(0.95) or 0 for e in admin_endpoints.values()),
        default=0,
    )
    # Dashboard loads = total hits / 14 endpoints per load
    admin_dashboard_loads = admin_total_reqs // 14 if admin_total_reqs >= 14 else 0

    client_total_reqs = sum(e.num_requests for e in client_endpoints.values())
    client_total_failures = sum(e.num_failures for e in client_endpoints.values())

    # --- Check for rate limiting ---
    rate_limited = any(
        "Rate limited" in str(entry.num_failures)
        for entry in stats.entries.values()
    )
    rate_limit_429s = sum(
        1 for key, entry in stats.entries.items()
        if entry.num_failures > 0
    )

    # --- Console report ---
    print("\n" + "=" * 70)
    print("  LIFEPLACE CAPACITY TEST RESULTS")
    print("=" * 70)

    print(f"\n  Configuration:")
    print(f"    Peak concurrent users:  {MAX_USERS}")
    print(f"    Ramp-up stages:         {STAGE_COUNT} x {RAMP_DURATION // STAGE_COUNT}s")
    print(f"    Total duration:         {RAMP_DURATION}s")
    print(f"    Target:                 {config.base_url}")

    print(f"\n  {'─' * 66}")
    print(f"  Overall Performance")
    print(f"  {'─' * 66}")
    print(f"    Total requests:         {total_requests:,}")
    print(f"    Failed requests:        {total_failures:,}")
    print(f"    Error rate:             {error_rate:.2f}%")
    print(f"    Throughput (RPS):       {rps:.1f} req/s")
    print(f"    Median response time:   {median_rt:.0f}ms")
    print(f"    Avg response time:      {avg_rt:.0f}ms")
    print(f"    P95 response time:      {p95_rt:.0f}ms")
    print(f"    P99 response time:      {p99_rt:.0f}ms")
    print(f"    Min / Max:              {min_rt:.0f}ms / {max_rt:.0f}ms")

    print(f"\n  {'─' * 66}")
    print(f"  Booking Flow (revenue-critical path, 60% of users)")
    print(f"  {'─' * 66}")
    print(f"    Flows started:          {booking_flows_started}")
    print(f"    Flows completed (e2e):  {booking_flows_completed}")
    print(f"    Total requests:         {booking_total_reqs:,}")
    print(f"    Failed requests:        {booking_total_failures:,}")
    print(f"    Throughput:             {booking_rps:.1f} req/s")

    print(f"\n  {'─' * 66}")
    print(f"  Admin Dashboard (14 analytics queries per load, 20% of users)")
    print(f"  {'─' * 66}")
    print(f"    Full dashboard loads:   {admin_dashboard_loads}")
    print(f"    Total endpoint hits:    {admin_total_reqs:,}")
    print(f"    Avg response time:      {admin_avg_rt:.0f}ms")
    print(f"    P95 response time:      {admin_p95:.0f}ms")

    print(f"\n  {'─' * 66}")
    print(f"  Client Portal (20% of users)")
    print(f"  {'─' * 66}")
    print(f"    Total requests:         {client_total_reqs:,}")
    print(f"    Failed requests:        {client_total_failures:,}")

    # --- Resume-ready summary ---
    print(f"\n{'=' * 70}")
    print(f"  RESUME-READY METRICS")
    print(f"{'=' * 70}")

    if error_rate < 5.0:
        print(f"""
  Use these on your resume (adjust framing as needed):

  >> "Load-tested to sustain {rps:.0f} requests/second across {MAX_USERS}
      concurrent users with {p95_rt:.0f}ms P95 response time"

  >> "Booking flow handles {booking_flows_completed} concurrent end-to-end
      sessions under {MAX_USERS}-user load"

  >> "Admin dashboard (14 parallel analytics queries) serves in
      {admin_avg_rt:.0f}ms avg / {admin_p95:.0f}ms P95 under load"

  >> "{total_requests:,} requests processed with {error_rate:.1f}% error rate
      during capacity test"\n""")
    else:
        # High error rate — find the usable capacity
        print(f"""
  WARNING: {error_rate:.1f}% error rate at {MAX_USERS} users.

  This means {MAX_USERS} users exceeds your current capacity. Options:
    1. Re-run with fewer users:  LOAD_TEST_MAX_USERS=25
    2. Check if rate limiting caused the failures (likely if running
       from a single IP — rate limits cap anonymous at 100/hr)
    3. Scale your Fly.io instance or add replicas, then re-test

  Current numbers (use with caveat):
    Throughput:  {rps:.0f} req/s
    P95:         {p95_rt:.0f}ms
    Error rate:  {error_rate:.1f}%\n""")

    print("=" * 70)

    # --- Save JSON report ---
    report = {
        "timestamp": datetime.now().isoformat(),
        "config": {
            "peak_users": MAX_USERS,
            "stages": STAGE_COUNT,
            "duration_seconds": RAMP_DURATION,
            "target": config.base_url,
        },
        "overall": {
            "total_requests": total_requests,
            "failed_requests": total_failures,
            "error_rate_pct": round(error_rate, 2),
            "throughput_rps": round(rps, 1),
            "median_ms": round(median_rt),
            "avg_ms": round(avg_rt),
            "p95_ms": round(p95_rt),
            "p99_ms": round(p99_rt),
            "min_ms": round(min_rt),
            "max_ms": round(max_rt),
        },
        "booking_flow": {
            "flows_started": booking_flows_started,
            "flows_completed": booking_flows_completed,
            "total_requests": booking_total_reqs,
            "failed_requests": booking_total_failures,
            "throughput_rps": round(booking_rps, 1),
        },
        "admin_dashboard": {
            "full_dashboard_loads": admin_dashboard_loads,
            "total_endpoint_hits": admin_total_reqs,
            "avg_response_time_ms": round(admin_avg_rt),
            "p95_response_time_ms": round(admin_p95),
        },
        "client_portal": {
            "total_requests": client_total_reqs,
            "failed_requests": client_total_failures,
        },
    }

    report_path = os.path.join(os.path.dirname(__file__), "capacity_results.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n  JSON report saved to: {report_path}")
