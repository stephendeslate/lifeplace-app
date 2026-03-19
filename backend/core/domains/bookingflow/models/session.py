import logging
from decimal import Decimal

from django.db import models
from django.utils import timezone

from core.utils.models import BaseModel

from .flow import BookingFlow, BookingFlowStep

logger = logging.getLogger(__name__)


class BookingSession(BaseModel):
    """
    Tracks client progress through a booking flow
    """

    session_id = models.UUIDField(unique=True, db_index=True)
    booking_flow = models.ForeignKey(BookingFlow, on_delete=models.CASCADE, related_name="sessions")
    client = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="booking_sessions"
    )

    # Progress tracking
    current_step = models.ForeignKey(
        BookingFlowStep, on_delete=models.SET_NULL, null=True, blank=True, related_name="current_sessions"
    )
    completed_steps = models.ManyToManyField(BookingFlowStep, blank=True, related_name="completed_sessions")

    # Data storage
    booking_data = models.JSONField(default=dict)
    validation_errors = models.JSONField(default=dict, blank=True)

    # Session metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    referrer_url = models.URLField(blank=True)

    # Status
    is_completed = models.BooleanField(default=False)
    is_abandoned = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()

    # Conversion tracking
    created_event = models.ForeignKey(
        "events.Event", on_delete=models.SET_NULL, null=True, blank=True, related_name="booking_session"
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["booking_flow", "is_completed"]),  # For flow session queries
            models.Index(fields=["client", "-created_at"]),  # For client session history
        ]

    def __str__(self):
        return f"Session {self.session_id} - {self.booking_flow.name}"

    @property
    def progress_percentage(self):
        """Calculate completion percentage"""
        total_steps = self.booking_flow.enabled_steps.count()
        if total_steps == 0:
            return 0
        completed_count = self.completed_steps.count()
        return (completed_count / total_steps) * 100

    def is_expired(self):
        """Check if session has expired"""
        return timezone.now() > self.expires_at

    def mark_step_completed(self, step):
        """Mark a step as completed"""
        self.completed_steps.add(step)

        # Update current step to next step
        next_step = self.booking_flow.get_next_step(step.id)
        if next_step:
            self.current_step = next_step
        else:
            # Flow completed
            self.is_completed = True
            self.completed_at = timezone.now()

        self.save()

    def calculate_total_price(self):
        """Calculate total price using centralized pricing service"""
        logger.info("=== BOOKING SESSION PRICE CALCULATION (Centralized) ===")

        try:
            from core.domains.sales.pricing_service import PricingCalculationService

            # Get event duration
            self._get_event_duration()

            # Get event_type_id from booking flow for event-type-specific pricing
            event_type_id = None
            if self.booking_flow and self.booking_flow.event_type:
                event_type_id = self.booking_flow.event_type_id

            # Use centralized pricing service
            pricing_breakdown = PricingCalculationService.calculate_from_booking_data(
                booking_data=self.booking_data, event_type_id=event_type_id
            )

            logger.info(f"Centralized pricing service result: ₱{pricing_breakdown.total_amount}")
            return pricing_breakdown.total_amount

        except Exception as e:
            logger.error(f"Error in centralized pricing calculation: {e}")
            # Fallback to basic calculation if centralized service fails
            logger.warning("Falling back to basic calculation")
            return self._calculate_total_price_fallback()

    def _calculate_total_price_fallback(self):
        """Fallback calculation method in case centralized service fails"""
        logger.warning("Using fallback pricing calculation")

        # Simple fallback - just sum up base prices without excess hours
        total = Decimal("0.00")

        # Get packages and addons with single source of truth logic
        selected_packages = self.booking_data.get("selected_packages", [])
        selected_addons = self.booking_data.get("selected_addons", [])

        # Fallback to step data if not found at root
        if not selected_packages:
            for _step_key, step_data in self.booking_data.items():
                if isinstance(step_data, dict) and "selected_packages" in step_data:
                    selected_packages = step_data["selected_packages"]
                    break

        if not selected_addons:
            for _step_key, step_data in self.booking_data.items():
                if isinstance(step_data, dict) and "selected_addons" in step_data:
                    selected_addons = step_data["selected_addons"]
                    break

        # Sum package prices
        for package_data in selected_packages:
            try:
                price = Decimal(str(package_data.get("price", 0)))
                quantity = int(package_data.get("quantity", 1))
                total += price * Decimal(str(quantity))
            except (ValueError, TypeError):
                continue

        # Sum addon prices
        for addon_data in selected_addons:
            try:
                price = Decimal(str(addon_data.get("price", 0)))
                quantity = int(addon_data.get("quantity", 1))
                total += price * Decimal(str(quantity))
            except (ValueError, TypeError):
                continue

        logger.info(f"Fallback calculation result: ₱{total}")
        return total

    def _get_event_duration(self):
        """Extract event duration from booking data"""
        # Look for duration in various places in booking data
        duration = None

        # Check root level first
        if "duration" in self.booking_data:
            duration = self.booking_data.get("duration")

        # Check in step data
        if not duration:
            for _step_key, step_data in self.booking_data.items():
                if isinstance(step_data, dict):
                    if "duration" in step_data:
                        duration = step_data["duration"]
                        break
                    # Also check for end_time and start_time to calculate duration
                    elif "start_time" in step_data and "end_time" in step_data:
                        try:
                            from datetime import datetime

                            start_time = datetime.strptime(step_data["start_time"], "%H:%M")
                            end_time = datetime.strptime(step_data["end_time"], "%H:%M")
                            duration_seconds = (end_time - start_time).seconds
                            duration = int(duration_seconds // 3600)  # Use integer division instead of float division
                            break
                        except (ValueError, TypeError):
                            continue

        try:
            return int(duration) if duration else None
        except (ValueError, TypeError):
            return None
