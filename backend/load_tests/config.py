"""
Load Testing Configuration for LifePlace

Based on verified code review of the codebase:
- Target: 25-50 concurrent users (medium venue scale)
- Environment: Production (Fly.io Singapore)
- Rate limits: 100/hour anon, 1000/hour authenticated
"""

import os
from dataclasses import dataclass
from typing import Optional
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)


@dataclass
class LoadTestConfig:
    """Configuration for load testing."""

    # Target environment
    base_url: str = os.getenv("LOAD_TEST_BASE_URL", "https://api.yourdomain.com")

    # Test credentials (create dedicated test accounts)
    admin_email: str = os.getenv("LOAD_TEST_ADMIN_EMAIL", "loadtest-admin@example.com")
    admin_password: str = os.getenv("LOAD_TEST_ADMIN_PASSWORD", "")
    client_email: str = os.getenv("LOAD_TEST_CLIENT_EMAIL", "loadtest-client@example.com")
    client_password: str = os.getenv("LOAD_TEST_CLIENT_PASSWORD", "")

    # Booking flow IDs (get from your database)
    booking_flow_id: Optional[str] = os.getenv("LOAD_TEST_BOOKING_FLOW_ID")
    venue_id: Optional[str] = os.getenv("LOAD_TEST_VENUE_ID")
    package_id: Optional[str] = os.getenv("LOAD_TEST_PACKAGE_ID")
    event_type_id: Optional[str] = os.getenv("LOAD_TEST_EVENT_TYPE_ID")

    # Load profiles based on your infrastructure
    # Fly.io ~$24-41/month deployment
    baseline_users: int = 10
    normal_load_users: int = 25
    peak_load_users: int = 50
    stress_load_users: int = 100  # 2x peak for stress testing

    # Spawn rate (users per second)
    spawn_rate: int = 5

    # Test durations (seconds)
    baseline_duration: int = 300  # 5 minutes
    normal_duration: int = 600  # 10 minutes
    peak_duration: int = 900  # 15 minutes
    stress_duration: int = 300  # 5 minutes
    soak_duration: int = 3600  # 1 hour

    # Response time thresholds (milliseconds)
    # Based on good UX for booking flow
    response_time_p95_threshold: int = 500
    response_time_p99_threshold: int = 1000

    # Error rate threshold (percentage)
    error_rate_threshold: float = 1.0

    # Rate limiting awareness
    # From settings.py:341-362
    anon_rate_limit: int = 100  # per hour
    user_rate_limit: int = 1000  # per hour

    # Think time (simulates real user behavior)
    min_think_time: float = 1.0  # seconds
    max_think_time: float = 5.0  # seconds

    # WebSocket configuration
    ws_base_url: str = os.getenv("LOAD_TEST_WS_URL", "wss://api.yourdomain.com")
    ws_ping_interval: int = 30  # seconds


# Singleton config instance
config = LoadTestConfig()


# User weight distribution for realistic scenarios
# Based on frontend API analysis
USER_WEIGHTS = {
    "anonymous_browser": 50,  # 50% - browsing booking flows
    "booking_user": 30,       # 30% - actively booking
    "authenticated_client": 15,  # 15% - checking existing events
    "admin_user": 5,          # 5% - admin dashboard
}


# Endpoint weights (relative frequency)
# Based on frontend API call analysis
ENDPOINT_WEIGHTS = {
    # Public booking flow (high traffic)
    "/api/bookingflow/public/flows/": 20,
    "/api/events/public/availability/": 15,
    "/api/events/event-types/": 10,

    # Booking session (critical path)
    "start_session": 10,
    "update_session": 8,
    "validate_availability": 8,
    "calculate_pricing": 8,

    # Authenticated endpoints
    "/api/events/events/": 5,
    "/api/payments/payments/": 3,
    "/api/sales/quotes/": 3,

    # Admin analytics (heavy queries)
    "/api/analytics/dashboard/": 5,
    "/api/analytics/sales/bookings/": 3,
    "/api/analytics/events/attendance/": 2,
}
