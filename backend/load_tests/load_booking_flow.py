"""
Booking Flow Smoke Test Behavior

Drives one complete booking session through the API, stopping before payment.
This is the business-critical path: it's how clients book events.

API contract:
    PATCH /api/bookingflow/public/flows/session/{id}/update/
    {"step_id": <id>, "step_data": {...}, "mark_completed": true}
"""

import logging
from typing import Any

from config import config
from utils import generate_test_contact_info, generate_test_event_datetime, think_time

logger = logging.getLogger(__name__)


# Step types where we stop (don't submit payment or confirmation)
STOP_BEFORE_STEPS = {"payment_info", "confirmation"}


class BookingFlowBehavior:
    """
    Encapsulates booking flow behavior for load testing.

    Drives the booking flow dynamically based on API responses rather than
    hardcoding a step sequence. After each update, the API returns the next
    current_step which tells us what to do next.
    """

    def __init__(self, client, base_url: str):
        self.client = client
        self.base_url = base_url
        self.current_session_id: str | None = None
        self.current_step: dict | None = None  # {id, step_type, ...}
        self.booking_flow_id: str | None = config.booking_flow_id

    def execute_booking_flow(self, rate_tracker) -> bool:
        """
        Execute a complete booking flow (stops before payment).

        Drives the flow dynamically based on what the API returns as the
        current step, rather than hardcoding step sequences.
        """
        try:
            # Browse available flows (if we don't have a flow ID)
            if not self.booking_flow_id:
                if not self._browse_flows(rate_tracker):
                    return False
                think_time(2, 4)

            # Start a booking session
            if not self._start_session(rate_tracker):
                return False

            think_time(2, 4)

            # Drive through steps dynamically
            max_steps = 10  # Safety limit
            steps_completed = 0

            while self.current_step and steps_completed < max_steps:
                step_type = self.current_step.get("step_type")
                step_id = self.current_step.get("id")

                # Stop before payment/confirmation
                if step_type in STOP_BEFORE_STEPS:
                    logger.info(f"Stopping before {step_type} step (session: {self.current_session_id})")
                    break

                # Build step data based on step type
                step_data = self._build_step_data(step_type)

                # Submit the step
                if not self._update_step(step_id, step_type, step_data, rate_tracker):
                    logger.warning(f"Step {step_type} (id={step_id}) failed, stopping flow")
                    break

                steps_completed += 1

                # Validate availability after date_time step
                if step_type == "date_time":
                    think_time(1, 2)
                    self._validate_availability(rate_tracker)

                # Calculate pricing after package/addon steps
                if step_type in ("package_selection", "addon_selection"):
                    self._calculate_pricing(rate_tracker)

                think_time(2, 4)

            # Final pricing calculation
            self._calculate_pricing(rate_tracker)

            logger.info(f"Booking flow completed: {steps_completed} steps (session: {self.current_session_id})")
            return True

        except Exception as e:
            logger.error(f"Booking flow failed: {e}")
            return False

        finally:
            if self.current_session_id:
                self._release_reservation(rate_tracker)

    def _build_step_data(self, step_type: str) -> dict[str, Any]:
        """Build the correct step_data payload for a given step type."""

        if step_type == "introduction":
            return {"acknowledged": True}

        elif step_type == "date_time":
            return generate_test_event_datetime()

        elif step_type == "venue_selection":
            return {"selected_venue_ids": []}

        elif step_type == "package_selection":
            package_id = config.package_id
            if package_id:
                return {"selected_packages": [{"product_id": int(package_id), "quantity": 1}]}
            return {"selected_packages": []}

        elif step_type == "addon_selection":
            return {"selected_addons": []}

        elif step_type == "questionnaire":
            return {}

        elif step_type == "pricing_summary":
            return {"terms_accepted": True}

        elif step_type == "contact_info":
            return generate_test_contact_info()

        else:
            logger.warning(f"Unknown step type: {step_type}, sending empty data")
            return {}

    def _browse_flows(self, rate_tracker) -> bool:
        """Browse available booking flows."""
        with self.client.get(
            "/api/bookingflow/public/flows/", catch_response=True, name="/api/bookingflow/public/flows/"
        ) as response:
            rate_tracker.record_call()

            if response.status_code == 200:
                data = response.json()
                flows = data if isinstance(data, list) else data.get("results", [])

                if flows and not self.booking_flow_id:
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

        The response includes the first current_step with its ID and type,
        which drives the rest of the flow.
        """
        if not self.booking_flow_id:
            logger.warning("No booking flow ID available")
            return False

        with self.client.post(
            f"/api/bookingflow/public/flows/{self.booking_flow_id}/start_session/",
            json={},
            catch_response=True,
            name="/api/bookingflow/public/flows/{id}/start_session/",
        ) as response:
            rate_tracker.record_call()

            if response.status_code in [200, 201]:
                data = response.json()
                self.current_session_id = data.get("session_id")
                self.current_step = data.get("current_step")
                response.success()

                if not self.current_session_id:
                    logger.error("start_session response missing session_id")
                    return False
                if not self.current_step:
                    logger.error("start_session response missing current_step")
                    return False

                logger.debug(
                    f"Session started: {self.current_session_id}, "
                    f"first step: {self.current_step.get('step_type')} (id={self.current_step.get('id')})"
                )
                return True
            else:
                response.failure(f"Failed to start session: {response.status_code}")
                return False

    def _update_step(self, step_id: int, step_type: str, step_data: dict, rate_tracker) -> bool:
        """
        Update a session step with the correct API contract.

        Sends: {"step_id": <id>, "step_data": {...}, "mark_completed": true}
        Parses the response to get the next current_step.
        """
        if not self.current_session_id:
            return False

        with self.client.patch(
            f"/api/bookingflow/public/flows/session/{self.current_session_id}/update/",
            json={
                "step_id": step_id,
                "step_data": step_data,
                "mark_completed": True,
            },
            catch_response=True,
            name=f"/api/bookingflow/session/update/ [{step_type}]",
        ) as response:
            rate_tracker.record_call()

            if response.status_code == 200:
                data = response.json()

                # Check for validation errors returned by the API
                validation_errors = data.get("validation_errors")
                if validation_errors:
                    logger.warning(f"Step {step_type} validation errors: {validation_errors}")
                    response.failure(f"Validation errors on {step_type}: {validation_errors}")
                    return False

                # Update current_step from response for next iteration
                self.current_step = data.get("current_step")
                response.success()
                return True
            elif response.status_code == 429:
                response.failure("Rate limited")
                return False
            else:
                response.failure(f"Failed to update {step_type}: {response.status_code}")
                return False

    def _validate_availability(self, rate_tracker) -> bool:
        """
        Validate date availability and create a temporary reservation.

        Uses the date already stored in session.booking_data from the
        date_time step update.
        """
        if not self.current_session_id:
            return False

        with self.client.post(
            f"/api/bookingflow/public/flows/session/{self.current_session_id}/validate-availability/",
            json={},
            catch_response=True,
            name="/api/bookingflow/session/validate-availability/",
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

    def _calculate_pricing(self, rate_tracker) -> bool:
        """Calculate pricing for current session state."""
        if not self.current_session_id:
            return False

        with self.client.post(
            f"/api/bookingflow/public/flows/session/{self.current_session_id}/calculate-pricing/",
            json={},
            catch_response=True,
            name="/api/bookingflow/session/calculate-pricing/",
        ) as response:
            rate_tracker.record_call()

            if response.status_code == 200:
                response.success()
                return True
            elif response.status_code == 429:
                response.failure("Rate limited")
                return False
            else:
                response.failure(f"Failed to calculate pricing: {response.status_code}")
                return False

    def _release_reservation(self, rate_tracker) -> bool:
        """Release the date reservation (best-effort cleanup)."""
        if not self.current_session_id:
            return True

        with self.client.post(
            f"/api/bookingflow/public/flows/session/{self.current_session_id}/release-reservation/",
            json={},
            catch_response=True,
            name="/api/bookingflow/session/release-reservation/",
        ) as response:
            rate_tracker.record_call()
            response.success()
            self.current_session_id = None
            self.current_step = None
            return True
