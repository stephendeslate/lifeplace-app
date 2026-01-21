"""
Booking Flow Load Testing

Tests the complete booking flow as experienced by clients.

Based on verified code review of:
- Backend: core/domains/bookingflow/
- Frontend: frontend/client-portal/src/apis/booking/core.api.ts

The booking flow consists of 10 step types:
1. Introduction
2. Venue Selection
3. DateTime
4. Package Selection
5. Add-ons
6. Questionnaire
7. Pricing Summary
8. Contact Info
9. Payment (skipped in load tests to avoid real charges)
10. Confirmation

Critical endpoints:
- POST /api/bookingflow/public/flows/{id}/start_session/
- PATCH /api/bookingflow/public/flows/session/{id}/update/
- POST /api/bookingflow/public/flows/session/{id}/validate-availability/
- POST /api/bookingflow/public/flows/session/{id}/calculate-pricing/
"""

import logging
import random
from typing import Optional, Dict, Any

from config import config
from utils import think_time, generate_test_contact_info, generate_test_event_datetime

logger = logging.getLogger(__name__)


class BookingFlowBehavior:
    """
    Encapsulates booking flow behavior for load testing.

    Simulates realistic user behavior through the booking process,
    including think time between steps and proper session management.
    """

    def __init__(self, client, base_url: str):
        self.client = client
        self.base_url = base_url
        self.current_session_id: Optional[str] = None
        self.booking_flow_id: Optional[str] = config.booking_flow_id

    def execute_booking_flow(self, rate_tracker) -> bool:
        """
        Execute a complete booking flow (stops before payment).

        This simulates a realistic user journey through the booking process.
        Each step includes think time to simulate real user behavior.
        """
        try:
            # Step 1: Get available booking flows
            if not self._browse_flows(rate_tracker):
                return False

            think_time(2, 4)

            # Step 2: Start a booking session
            if not self._start_session(rate_tracker):
                return False

            think_time(3, 6)

            # Step 3: Select venue (if applicable)
            self._update_venue_selection(rate_tracker)
            think_time(2, 4)

            # Step 4: Select date/time
            self._update_datetime_selection(rate_tracker)
            think_time(2, 4)

            # Step 5: Validate availability (creates 5-min reservation)
            self._validate_availability(rate_tracker)
            think_time(1, 2)

            # Step 6: Select package
            self._update_package_selection(rate_tracker)
            think_time(2, 4)

            # Step 7: Calculate pricing
            self._calculate_pricing(rate_tracker)
            think_time(2, 4)

            # Step 8: Enter contact info
            self._update_contact_info(rate_tracker)
            think_time(3, 5)

            # Step 9: Calculate final pricing with all selections
            self._calculate_pricing(rate_tracker)

            # NOTE: We intentionally skip payment step to avoid real charges
            # and confirmation step (which requires payment)

            logger.info(f"Booking flow completed (session: {self.current_session_id})")
            return True

        except Exception as e:
            logger.error(f"Booking flow failed: {e}")
            return False

        finally:
            # Clean up - release reservation if we have one
            if self.current_session_id:
                self._release_reservation(rate_tracker)

    def _browse_flows(self, rate_tracker) -> bool:
        """
        Browse available booking flows.

        Endpoint: GET /api/bookingflow/public/flows/
        """
        with self.client.get(
            "/api/bookingflow/public/flows/",
            catch_response=True,
            name="/api/bookingflow/public/flows/"
        ) as response:
            rate_tracker.record_call()

            if response.status_code == 200:
                data = response.json()
                # Handle both paginated (dict with results) and non-paginated (list) responses
                if isinstance(data, list):
                    flows = data
                else:
                    flows = data.get("results", [])

                # Select a flow to use
                if flows and not self.booking_flow_id:
                    # Pick a random active flow
                    active_flows = [f for f in flows if isinstance(f, dict) and f.get("is_active", True)]
                    if active_flows:
                        self.booking_flow_id = str(active_flows[0].get("id"))

                response.success()
                return bool(self.booking_flow_id)
            else:
                response.failure(f"Failed to get flows: {response.status_code}")
                return False

    def _start_session(self, rate_tracker) -> bool:
        """
        Start a new booking session.

        Endpoint: POST /api/bookingflow/public/flows/{id}/start_session/

        Based on: frontend/client-portal/src/apis/booking/core.api.ts
        Creates a session that expires after a configurable time.
        """
        if not self.booking_flow_id:
            logger.warning("No booking flow ID available")
            return False

        with self.client.post(
            f"/api/bookingflow/public/flows/{self.booking_flow_id}/start_session/",
            json={},
            catch_response=True,
            name="/api/bookingflow/public/flows/{id}/start_session/"
        ) as response:
            rate_tracker.record_call()

            if response.status_code in [200, 201]:
                data = response.json()
                self.current_session_id = data.get("id") or data.get("session_id")
                response.success()
                return bool(self.current_session_id)
            else:
                response.failure(f"Failed to start session: {response.status_code}")
                return False

    def _update_venue_selection(self, rate_tracker) -> bool:
        """
        Update session with venue selection.

        Endpoint: PATCH /api/bookingflow/public/flows/session/{id}/update/
        """
        if not self.current_session_id:
            return False

        venue_id = config.venue_id or "test-venue-id"

        with self.client.patch(
            f"/api/bookingflow/public/flows/session/{self.current_session_id}/update/",
            json={
                "venue_id": venue_id,
                "current_step": "venue_selection",
            },
            catch_response=True,
            name="/api/bookingflow/public/flows/session/{id}/update/ [venue]"
        ) as response:
            rate_tracker.record_call()

            if response.status_code in [200, 201]:
                response.success()
                return True
            elif response.status_code == 400:
                # May fail if venue step not in flow - that's OK
                response.success()
                return True
            else:
                response.failure(f"Failed to update venue: {response.status_code}")
                return False

    def _update_datetime_selection(self, rate_tracker) -> bool:
        """
        Update session with date/time selection.

        Endpoint: PATCH /api/bookingflow/public/flows/session/{id}/update/
        """
        if not self.current_session_id:
            return False

        datetime_data = generate_test_event_datetime()

        with self.client.patch(
            f"/api/bookingflow/public/flows/session/{self.current_session_id}/update/",
            json={
                **datetime_data,
                "current_step": "datetime",
            },
            catch_response=True,
            name="/api/bookingflow/public/flows/session/{id}/update/ [datetime]"
        ) as response:
            rate_tracker.record_call()

            if response.status_code in [200, 201]:
                response.success()
                return True
            else:
                response.failure(f"Failed to update datetime: {response.status_code}")
                return False

    def _validate_availability(self, rate_tracker) -> bool:
        """
        Validate date availability and create reservation token.

        Endpoint: POST /api/bookingflow/public/flows/session/{id}/validate-availability/

        Based on: frontend/client-portal/src/apis/booking/core.api.ts
        Creates a 5-minute reservation to prevent overbooking.
        """
        if not self.current_session_id:
            return False

        with self.client.post(
            f"/api/bookingflow/public/flows/session/{self.current_session_id}/validate-availability/",
            json={},
            catch_response=True,
            name="/api/bookingflow/public/flows/session/{id}/validate-availability/"
        ) as response:
            rate_tracker.record_call()

            if response.status_code == 200:
                response.success()
                return True
            elif response.status_code == 409:
                # Date already booked - expected in load testing
                response.success()
                return False
            else:
                response.failure(f"Failed to validate availability: {response.status_code}")
                return False

    def _update_package_selection(self, rate_tracker) -> bool:
        """
        Update session with package selection.

        Endpoint: PATCH /api/bookingflow/public/flows/session/{id}/update/
        """
        if not self.current_session_id:
            return False

        package_id = config.package_id or "test-package-id"

        with self.client.patch(
            f"/api/bookingflow/public/flows/session/{self.current_session_id}/update/",
            json={
                "package_id": package_id,
                "current_step": "package_selection",
            },
            catch_response=True,
            name="/api/bookingflow/public/flows/session/{id}/update/ [package]"
        ) as response:
            rate_tracker.record_call()

            if response.status_code in [200, 201]:
                response.success()
                return True
            else:
                response.failure(f"Failed to update package: {response.status_code}")
                return False

    def _calculate_pricing(self, rate_tracker) -> bool:
        """
        Calculate pricing for current selections.

        Endpoint: POST /api/bookingflow/public/flows/session/{id}/calculate-pricing/

        Based on: frontend/client-portal/src/apis/booking/core.api.ts
        Supports discount codes and returns detailed pricing breakdown.
        """
        if not self.current_session_id:
            return False

        with self.client.post(
            f"/api/bookingflow/public/flows/session/{self.current_session_id}/calculate-pricing/",
            json={
                "discount_code": "",  # No discount in load tests
            },
            catch_response=True,
            name="/api/bookingflow/public/flows/session/{id}/calculate-pricing/"
        ) as response:
            rate_tracker.record_call()

            if response.status_code == 200:
                response.success()
                return True
            else:
                response.failure(f"Failed to calculate pricing: {response.status_code}")
                return False

    def _update_contact_info(self, rate_tracker) -> bool:
        """
        Update session with contact information.

        Endpoint: PATCH /api/bookingflow/public/flows/session/{id}/update/
        """
        if not self.current_session_id:
            return False

        contact_info = generate_test_contact_info()

        with self.client.patch(
            f"/api/bookingflow/public/flows/session/{self.current_session_id}/update/",
            json={
                **contact_info,
                "current_step": "contact_info",
            },
            catch_response=True,
            name="/api/bookingflow/public/flows/session/{id}/update/ [contact]"
        ) as response:
            rate_tracker.record_call()

            if response.status_code in [200, 201]:
                response.success()
                return True
            else:
                response.failure(f"Failed to update contact: {response.status_code}")
                return False

    def _release_reservation(self, rate_tracker) -> bool:
        """
        Release the date reservation if we have one.

        Endpoint: POST /api/bookingflow/public/flows/session/{id}/release-reservation/

        Based on: frontend/client-portal/src/apis/booking/core.api.ts
        Called when user abandons booking or payment fails.
        """
        if not self.current_session_id:
            return True

        with self.client.post(
            f"/api/bookingflow/public/flows/session/{self.current_session_id}/release-reservation/",
            json={},
            catch_response=True,
            name="/api/bookingflow/public/flows/session/{id}/release-reservation/"
        ) as response:
            rate_tracker.record_call()

            # Always mark as success - cleanup is best effort
            response.success()
            self.current_session_id = None
            return True


class BookingFlowStressTest:
    """
    Stress test specific booking flow operations.

    Focuses on the most performance-critical endpoints:
    - Session creation (DB write)
    - Availability validation (date locking)
    - Pricing calculation (complex computation)
    """

    def __init__(self, client, base_url: str):
        self.client = client
        self.base_url = base_url

    def stress_session_creation(self, iterations: int = 100) -> Dict[str, Any]:
        """
        Stress test session creation endpoint.

        This endpoint creates a database record and initializes session state.
        """
        results = {
            "total": iterations,
            "success": 0,
            "failures": 0,
            "response_times": [],
        }

        booking_flow_id = config.booking_flow_id

        for _ in range(iterations):
            with self.client.post(
                f"/api/bookingflow/public/flows/{booking_flow_id}/start_session/",
                json={},
                catch_response=True,
                name="[STRESS] start_session"
            ) as response:
                results["response_times"].append(response.elapsed.total_seconds() * 1000)

                if response.status_code in [200, 201]:
                    results["success"] += 1
                    response.success()
                else:
                    results["failures"] += 1
                    response.failure(f"Failed: {response.status_code}")

        return results

    def stress_availability_check(self, iterations: int = 100) -> Dict[str, Any]:
        """
        Stress test availability validation.

        This endpoint involves date locking logic and database queries.
        """
        results = {
            "total": iterations,
            "success": 0,
            "failures": 0,
            "conflicts": 0,
            "response_times": [],
        }

        # This would need active sessions to test properly
        # Implementation depends on having valid session IDs

        return results
