"""
Utility functions for load testing.

Handles JWT authentication, token refresh, and common helpers.
Based on the authentication flow in core/domains/users/views.py.
"""

import time
import random
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class TokenManager:
    """
    Manages JWT tokens for load testing.

    Based on JWT configuration from settings.py:560-593:
    - Access token lifetime: 1 hour
    - Refresh token lifetime: 7 days
    - Token rotation enabled
    """

    def __init__(self, client, base_url: str):
        self.client = client
        self.base_url = base_url
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        self.refresh_expiry: Optional[datetime] = None

    def login(self, email: str, password: str) -> bool:
        """
        Authenticate and obtain JWT tokens.

        Endpoint: POST /api/users/login/
        Based on: core/domains/users/views.py LoginView
        """
        with self.client.post(
            f"{self.base_url}/api/users/login/",
            json={"email": email, "password": password},
            catch_response=True,
            name="/api/users/login/"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                tokens = data.get("tokens", {})
                self.access_token = tokens.get("access")
                self.refresh_token = tokens.get("refresh")
                # Access token valid for 1 hour (from settings)
                self.token_expiry = datetime.now() + timedelta(minutes=55)
                self.refresh_expiry = datetime.now() + timedelta(days=6)
                response.success()
                return True
            else:
                response.failure(f"Login failed: {response.status_code}")
                return False

    def refresh_tokens(self) -> bool:
        """
        Refresh the access token using refresh token.

        Endpoint: POST /api/users/token/refresh/
        """
        if not self.refresh_token:
            return False

        with self.client.post(
            f"{self.base_url}/api/users/token/refresh/",
            json={"refresh": self.refresh_token},
            catch_response=True,
            name="/api/users/token/refresh/"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access")
                # New refresh token due to rotation
                if "refresh" in data:
                    self.refresh_token = data.get("refresh")
                self.token_expiry = datetime.now() + timedelta(minutes=55)
                response.success()
                return True
            else:
                response.failure(f"Token refresh failed: {response.status_code}")
                return False

    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers with valid token."""
        if self.is_token_expired():
            self.refresh_tokens()

        if self.access_token:
            return {"Authorization": f"Bearer {self.access_token}"}
        return {}

    def is_token_expired(self) -> bool:
        """Check if access token is expired or about to expire."""
        if not self.token_expiry:
            return True
        # Refresh 5 minutes before expiry
        return datetime.now() >= self.token_expiry - timedelta(minutes=5)

    def logout(self) -> bool:
        """
        Logout and invalidate tokens.

        Endpoint: POST /api/users/logout/
        Based on: core/domains/users/views.py LogoutView
        """
        if not self.refresh_token:
            return True

        headers = self.get_auth_headers()
        with self.client.post(
            f"{self.base_url}/api/users/logout/",
            json={"refresh": self.refresh_token},
            headers=headers,
            catch_response=True,
            name="/api/users/logout/"
        ) as response:
            self.access_token = None
            self.refresh_token = None
            self.token_expiry = None
            if response.status_code in [200, 204]:
                response.success()
                return True
            else:
                response.failure(f"Logout failed: {response.status_code}")
                return False


def think_time(min_seconds: float = 1.0, max_seconds: float = 5.0):
    """
    Simulate user think time between actions.

    Realistic user behavior includes pauses between actions.
    """
    time.sleep(random.uniform(min_seconds, max_seconds))


def generate_test_contact_info() -> Dict[str, Any]:
    """
    Generate fake contact info for booking flow tests.

    Based on ContactInfoStep requirements from bookingflow.
    """
    timestamp = int(time.time() * 1000)
    return {
        "first_name": f"LoadTest{timestamp}",
        "last_name": "User",
        "email": f"loadtest+{timestamp}@example.com",
        "phone": f"+63912345{random.randint(1000, 9999)}",
        "notes": "Load test booking - please ignore",
    }


def generate_test_event_datetime() -> Dict[str, str]:
    """
    Generate a test date/time for booking.

    Uses dates 30+ days in the future to avoid conflicts.
    Based on DateTimeStep requirements.
    """
    # Pick a date 30-60 days in the future
    future_days = random.randint(30, 60)
    event_date = datetime.now() + timedelta(days=future_days)

    # Standard event times (based on typical venue hours)
    start_hour = random.choice([10, 14, 18])

    return {
        "event_date": event_date.strftime("%Y-%m-%d"),
        "start_time": f"{start_hour:02d}:00:00",
        "end_time": f"{start_hour + 4:02d}:00:00",  # 4-hour event
    }


def format_response_time(ms: float) -> str:
    """Format response time for logging."""
    if ms < 100:
        return f"{ms:.0f}ms"
    elif ms < 1000:
        return f"{ms:.0f}ms"
    else:
        return f"{ms / 1000:.2f}s"


class RateLimitTracker:
    """
    Track API calls to avoid hitting rate limits.

    Based on rate limits from settings.py:341-362:
    - Anonymous: 100/hour
    - Authenticated: 1000/hour
    """

    def __init__(self, limit_per_hour: int = 100):
        self.limit = limit_per_hour
        self.calls: list = []
        self.window = timedelta(hours=1)

    def can_make_request(self) -> bool:
        """Check if we can make another request without hitting rate limit."""
        self._cleanup_old_calls()
        return len(self.calls) < self.limit * 0.9  # 90% threshold for safety

    def record_call(self):
        """Record an API call."""
        self.calls.append(datetime.now())

    def _cleanup_old_calls(self):
        """Remove calls outside the rate limit window."""
        cutoff = datetime.now() - self.window
        self.calls = [c for c in self.calls if c > cutoff]

    def get_current_rate(self) -> int:
        """Get current calls within the window."""
        self._cleanup_old_calls()
        return len(self.calls)
