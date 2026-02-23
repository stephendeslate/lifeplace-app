"""
Smoke Test Configuration for LifePlace

Post-deploy verification: validates that critical user journeys work
against production after each deployment.

Target: 3 concurrent users (1 booking, 1 client, 1 admin)
Duration: ~2 minutes
Total requests: ~50 (well under rate limits)
"""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)


@dataclass
class LoadTestConfig:
    # Target environment
    base_url: str = os.getenv("LOAD_TEST_BASE_URL", "https://lifeplace-api.fly.dev")

    # Test credentials
    admin_email: str = os.getenv("LOAD_TEST_ADMIN_EMAIL", "loadtest-admin@example.com")
    admin_password: str = os.getenv("LOAD_TEST_ADMIN_PASSWORD", "")
    client_email: str = os.getenv("LOAD_TEST_CLIENT_EMAIL", "loadtest-client@example.com")
    client_password: str = os.getenv("LOAD_TEST_CLIENT_PASSWORD", "")

    # Booking flow IDs (from production database)
    booking_flow_id: str | None = os.getenv("LOAD_TEST_BOOKING_FLOW_ID")
    package_id: str | None = os.getenv("LOAD_TEST_PACKAGE_ID")
    event_type_id: str | None = os.getenv("LOAD_TEST_EVENT_TYPE_ID")

    # Smoke test settings
    # 1 user per scenario, runs each critical path once
    think_time_min: float = 0.5  # seconds between requests
    think_time_max: float = 1.5

    # Response time thresholds (milliseconds)
    # Fly.io Singapore → client: expect 200-500ms
    response_time_p95_threshold: int = 1000
    response_time_p99_threshold: int = 2000

    # Error rate threshold - smoke test should be 0% errors
    error_rate_threshold: float = 1.0

    # Rate limits from settings.py (for reference)
    anon_rate_limit: int = 100  # per hour
    user_rate_limit: int = 1000  # per hour


config = LoadTestConfig()
