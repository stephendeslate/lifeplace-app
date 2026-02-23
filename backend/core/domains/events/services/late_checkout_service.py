# backend/core/domains/events/services/late_checkout_service.py
"""
Late Checkout Service

Calculates and applies late checkout fees based on actual vs scheduled checkout times.
"""

import logging
import math
from datetime import datetime
from decimal import Decimal

from django.utils import timezone

from ..models import Event

logger = logging.getLogger(__name__)


class LateCheckoutService:
    """
    Handles late checkout fee calculation and application.
    """

    @staticmethod
    def get_late_checkout_settings() -> dict:
        """
        Get current late checkout fee settings from PaymentSettings.

        Returns:
            dict: Late checkout fee configuration
        """
        from core.domains.payments.models import PaymentSettings

        settings = PaymentSettings.get_default_settings()

        return {
            "enabled": getattr(settings, "late_checkout_fee_enabled", False),
            "fee_type": getattr(settings, "late_checkout_fee_type", "HOURLY"),
            "fee_amount": getattr(settings, "late_checkout_fee_amount", Decimal("300.00")),
            "fee_percentage": getattr(settings, "late_checkout_fee_percentage", Decimal("10.00")),
            "grace_minutes": getattr(settings, "late_checkout_grace_minutes", 15),
            "max_hours": getattr(settings, "late_checkout_max_hours", 4),
        }

    @staticmethod
    def calculate_late_checkout_fee(event: Event, actual_checkout: datetime = None) -> dict:
        """
        Calculate late checkout fee for an event.

        Args:
            event: The Event instance
            actual_checkout: Actual checkout time (defaults to now if not provided)

        Returns:
            dict: Fee calculation result with fee_amount and details
        """
        settings = LateCheckoutService.get_late_checkout_settings()

        result = {
            "fee_amount": Decimal("0.00"),
            "is_late": False,
            "details": None,
        }

        if not settings["enabled"]:
            result["details"] = {"reason": "Late checkout fee not enabled"}
            return result

        actual_checkout = actual_checkout or timezone.now()
        scheduled_end = event.scheduled_checkout_time or event.end_date

        if not scheduled_end:
            result["details"] = {"reason": "No scheduled checkout/end time"}
            return result

        # Check if actually late
        if actual_checkout <= scheduled_end:
            result["details"] = {
                "reason": "On-time checkout",
                "scheduled_end": scheduled_end.isoformat(),
                "actual_checkout": actual_checkout.isoformat(),
            }
            return result

        result["is_late"] = True

        # Calculate minutes late
        late_delta = actual_checkout - scheduled_end
        minutes_late = late_delta.total_seconds() / 60

        # Check grace period
        if minutes_late <= settings["grace_minutes"]:
            result["details"] = {
                "reason": "Within grace period",
                "minutes_late": round(minutes_late, 1),
                "grace_minutes": settings["grace_minutes"],
                "scheduled_end": scheduled_end.isoformat(),
                "actual_checkout": actual_checkout.isoformat(),
            }
            return result

        # Calculate hours late (round up), excluding grace period
        billable_minutes = minutes_late - settings["grace_minutes"]
        hours_late = math.ceil(billable_minutes / 60)
        hours_late = min(hours_late, settings["max_hours"])

        # Calculate fee based on type
        fee_type = settings["fee_type"]
        fee_amount = Decimal("0.00")
        description = ""

        if fee_type == "FIXED":
            fee_amount = settings["fee_amount"]
            description = "Fixed late checkout fee"
        elif fee_type == "HOURLY":
            fee_amount = settings["fee_amount"] * Decimal(str(hours_late))
            description = f"Late checkout: {hours_late} hour(s) @ {settings['fee_amount']}/hr"
        elif fee_type == "PERCENTAGE":
            contract_total = event.total_price or Decimal("0.00")
            fee_amount = contract_total * (settings["fee_percentage"] / 100)
            description = f"{settings['fee_percentage']}% late checkout fee"

        result["fee_amount"] = fee_amount
        result["details"] = {
            "minutes_late": round(minutes_late, 1),
            "hours_late": hours_late,
            "fee_type": fee_type,
            "description": description,
            "scheduled_end": scheduled_end.isoformat(),
            "actual_checkout": actual_checkout.isoformat(),
            "grace_minutes": settings["grace_minutes"],
            "max_hours": settings["max_hours"],
        }

        return result

    @staticmethod
    def apply_late_checkout_fee(event: Event, actual_checkout: datetime = None) -> dict:
        """
        Apply late checkout fee and update event record.

        Note: This method updates the event but does NOT create an invoice/payment.
        That should be handled separately by the caller if needed.

        Args:
            event: The Event instance
            actual_checkout: Actual checkout time

        Returns:
            dict: Result with fee details and status
        """
        result = {
            "success": True,
            "fee_applied": False,
            "fee_amount": Decimal("0.00"),
            "details": None,
        }

        # Check if fee already applied
        if event.late_checkout_fee_applied:
            result["details"] = {"reason": "Late checkout fee already applied"}
            return result

        # Calculate fee
        calc_result = LateCheckoutService.calculate_late_checkout_fee(event, actual_checkout)
        fee_amount = calc_result["fee_amount"]

        result["details"] = calc_result["details"]

        if fee_amount <= 0:
            return result

        # Update event with late checkout fee
        event.late_checkout_fee_applied = True
        event.late_checkout_fee_amount = fee_amount
        event.save(update_fields=["late_checkout_fee_applied", "late_checkout_fee_amount"])

        result["fee_applied"] = True
        result["fee_amount"] = fee_amount

        logger.info(
            f"Late checkout fee applied to event {event.id}: "
            f"{fee_amount} ({calc_result['details'].get('description', '')})"
        )

        return result

    @staticmethod
    def preview_late_checkout_fee(event: Event, checkout_time: datetime = None) -> dict:
        """
        Preview what the late checkout fee would be for a given checkout time.
        Does not modify any data.

        Args:
            event: The Event instance
            checkout_time: Proposed checkout time (defaults to now)

        Returns:
            dict: Fee preview
        """
        checkout_time = checkout_time or timezone.now()
        return LateCheckoutService.calculate_late_checkout_fee(event, checkout_time)
