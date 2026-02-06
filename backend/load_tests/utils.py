"""
Utility functions for smoke testing.

Handles JWT authentication and common helpers.
"""

import time
import random
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class TokenManager:
    """
    Manages JWT tokens for smoke testing.

    Access token lifetime: 1 hour, refresh: 7 days (from settings.py).
    """

    def __init__(self, client, base_url: str):
        self.client = client
        self.base_url = base_url
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None

    def login(self, email: str, password: str) -> bool:
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
                self.token_expiry = datetime.now() + timedelta(minutes=55)
                response.success()
                return True
            else:
                response.failure(f"Login failed: {response.status_code}")
                return False

    def refresh_tokens(self) -> bool:
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
                if "refresh" in data:
                    self.refresh_token = data.get("refresh")
                self.token_expiry = datetime.now() + timedelta(minutes=55)
                response.success()
                return True
            else:
                response.failure(f"Token refresh failed: {response.status_code}")
                return False

    def get_auth_headers(self) -> Dict[str, str]:
        if self.token_expiry and datetime.now() >= self.token_expiry - timedelta(minutes=5):
            self.refresh_tokens()

        if self.access_token:
            return {"Authorization": f"Bearer {self.access_token}"}
        return {}

    def logout(self) -> bool:
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


class RateLimitTracker:
    """Tracks API calls to stay within rate limits."""

    def __init__(self, limit_per_hour: int = 100):
        self.limit = limit_per_hour
        self.calls: list = []
        self.window = timedelta(hours=1)

    def can_make_request(self) -> bool:
        self._cleanup_old_calls()
        return len(self.calls) < self.limit * 0.9

    def record_call(self):
        self.calls.append(datetime.now())

    def _cleanup_old_calls(self):
        cutoff = datetime.now() - self.window
        self.calls = [c for c in self.calls if c > cutoff]


def think_time(min_seconds: float = 0.5, max_seconds: float = 1.5):
    """Pause between requests."""
    time.sleep(random.uniform(min_seconds, max_seconds))


def generate_test_contact_info() -> Dict[str, Any]:
    """
    Generate fake contact info for booking flow.
    Fields match ContactInfoStep validation in booking_session_service.py.
    """
    timestamp = int(time.time() * 1000)
    return {
        "full_name": f"LoadTest User {timestamp}",
        "email": f"loadtest+{timestamp}@example.com",
        "phone": f"+63912345{random.randint(1000, 9999)}",
    }


def generate_test_event_datetime() -> Dict[str, str]:
    """
    Generate a test date/time 30-60 days in the future.
    Fields match date_time step validation in booking_session_service.py.
    """
    future_days = random.randint(30, 60)
    event_date = datetime.now() + timedelta(days=future_days)
    start_hour = random.choice([10, 14, 18])

    return {
        "start_date": event_date.strftime("%Y-%m-%d"),
        "start_time": f"{start_hour:02d}:00",
        "end_time": f"{start_hour + 4:02d}:00",
    }
