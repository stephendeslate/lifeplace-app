# backend/core/domains/events/services/date_holding_service.py
"""
Date Holding Service

Manages temporary date holds that expire after a configurable period.
Extends the existing DateBlockingService with temporary hold functionality.

Hold Status Flow:
NONE -> TEMPORARY_HOLD -> PERMANENT_BLOCK (on payment)
TEMPORARY_HOLD -> NONE (on expiry or cancellation)
"""

import logging
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from ..models import Event

logger = logging.getLogger(__name__)


class DateHoldingService:
    """
    Manages temporary date holds.

    Temporary holds allow clients to reserve a date for a limited time
    without immediate payment, giving them time to finalize their booking.
    """

    @staticmethod
    def get_hold_settings() -> dict:
        """
        Get current date holding settings from PaymentSettings.

        Returns:
            dict: Date holding configuration
        """
        from core.domains.payments.models import PaymentSettings

        settings = PaymentSettings.get_default_settings()

        return {
            "enabled": getattr(settings, "date_hold_enabled", True),
            "duration_days": getattr(settings, "date_hold_duration_days", 7),
            "max_extensions": getattr(settings, "date_hold_max_extensions", 1),
            "extension_days": getattr(settings, "date_hold_extension_days", 3),
        }

    @staticmethod
    def is_date_held(target_date, exclude_event_id: int | None = None) -> tuple[bool, Event | None]:
        """
        Check if a date is currently held (either temporary or permanent).

        Args:
            target_date: The date to check (date or datetime)
            exclude_event_id: Event ID to exclude from check

        Returns:
            Tuple[bool, Optional[Event]]: (is_held, holding_event)
        """
        if hasattr(target_date, "date"):
            check_date = target_date.date()
        else:
            check_date = target_date

        now = timezone.now()

        # Build query for held dates
        query = Event.objects.filter(start_date__date=check_date).exclude(status="CANCELLED")

        if exclude_event_id:
            query = query.exclude(id=exclude_event_id)

        # Check for any active hold (permanent or non-expired temporary)
        holding_event = query.filter(
            Q(date_hold_status="PERMANENT_BLOCK")
            | Q(date_blocked=True)
            | Q(date_hold_status="TEMPORARY_HOLD", date_hold_expires_at__gt=now)
        ).first()

        return (holding_event is not None, holding_event)

    @staticmethod
    def place_temporary_hold(event: Event) -> dict:
        """
        Place a temporary hold on an event's date.

        Args:
            event: The Event instance to place hold on

        Returns:
            dict: Result with success status and details
        """
        settings = DateHoldingService.get_hold_settings()

        result = {
            "success": False,
            "hold_placed": False,
            "expires_at": None,
            "error": None,
        }

        if not settings["enabled"]:
            result["error"] = "Date holding is not enabled"
            return result

        # Check if date is already held
        is_held, holding_event = DateHoldingService.is_date_held(event.start_date, exclude_event_id=event.id)

        if is_held:
            result["error"] = f"Date already held by event {holding_event.id if holding_event else 'unknown'}"
            return result

        # Check if event already has a hold
        if event.date_hold_status in ["TEMPORARY_HOLD", "PERMANENT_BLOCK"]:
            result["error"] = f"Event already has hold status: {event.date_hold_status}"
            return result

        # Place the hold
        now = timezone.now()
        expires_at = now + timedelta(days=settings["duration_days"])

        event.date_hold_status = "TEMPORARY_HOLD"
        event.date_held_at = now
        event.date_hold_expires_at = expires_at
        event.date_hold_extended_count = 0
        event.save(
            update_fields=["date_hold_status", "date_held_at", "date_hold_expires_at", "date_hold_extended_count"]
        )

        logger.info(f"Temporary hold placed for event {event.id} on {event.start_date.date()}, expires at {expires_at}")

        result["success"] = True
        result["hold_placed"] = True
        result["expires_at"] = expires_at

        return result

    @staticmethod
    def extend_hold(event: Event) -> dict:
        """
        Extend an existing temporary hold.

        Args:
            event: The Event instance to extend hold for

        Returns:
            dict: Result with success status and new expiration
        """
        settings = DateHoldingService.get_hold_settings()

        result = {
            "success": False,
            "extended": False,
            "new_expires_at": None,
            "extensions_remaining": 0,
            "error": None,
        }

        if event.date_hold_status != "TEMPORARY_HOLD":
            result["error"] = "Event does not have an active temporary hold"
            return result

        if event.date_hold_extended_count >= settings["max_extensions"]:
            result["error"] = f"Maximum extensions ({settings['max_extensions']}) reached"
            return result

        # Check if hold has already expired
        now = timezone.now()
        if event.date_hold_expires_at and event.date_hold_expires_at < now:
            result["error"] = "Hold has already expired"
            return result

        # Extend the hold
        new_expires_at = event.date_hold_expires_at + timedelta(days=settings["extension_days"])

        event.date_hold_expires_at = new_expires_at
        event.date_hold_extended_count += 1
        event.save(update_fields=["date_hold_expires_at", "date_hold_extended_count"])

        extensions_remaining = settings["max_extensions"] - event.date_hold_extended_count

        logger.info(
            f"Hold extended for event {event.id}, new expiry: {new_expires_at}, "
            f"extension count: {event.date_hold_extended_count}"
        )

        result["success"] = True
        result["extended"] = True
        result["new_expires_at"] = new_expires_at
        result["extensions_remaining"] = extensions_remaining

        return result

    @staticmethod
    def convert_to_permanent_block(event: Event) -> dict:
        """
        Convert a temporary hold to a permanent block.
        Typically called when payment is received.

        Args:
            event: The Event instance

        Returns:
            dict: Result with success status
        """
        result = {
            "success": False,
            "converted": False,
            "error": None,
        }

        # Allow conversion from TEMPORARY_HOLD or NONE status
        if event.date_hold_status == "PERMANENT_BLOCK":
            result["error"] = "Already permanently blocked"
            return result

        now = timezone.now()

        event.date_hold_status = "PERMANENT_BLOCK"
        event.date_blocked = True
        event.date_blocked_at = now
        event.date_hold_expires_at = None  # No expiry for permanent blocks
        event.save(update_fields=["date_hold_status", "date_blocked", "date_blocked_at", "date_hold_expires_at"])

        logger.info(f"Temporary hold converted to permanent block for event {event.id}")

        result["success"] = True
        result["converted"] = True

        return result

    @staticmethod
    def release_hold(event: Event, reason: str = None) -> dict:
        """
        Release a temporary hold (cancellation or expiry).

        Args:
            event: The Event instance
            reason: Optional reason for releasing hold

        Returns:
            dict: Result with success status
        """
        result = {
            "success": False,
            "released": False,
            "error": None,
        }

        if event.date_hold_status == "PERMANENT_BLOCK":
            result["error"] = "Cannot release permanent block through this method"
            return result

        if event.date_hold_status == "NONE":
            result["error"] = "Event does not have a hold to release"
            return result

        event.date_hold_status = "NONE"
        event.date_hold_expires_at = None
        event.save(update_fields=["date_hold_status", "date_hold_expires_at"])

        logger.info(f"Hold released for event {event.id} - Reason: {reason or 'Not specified'}")

        result["success"] = True
        result["released"] = True

        return result

    @staticmethod
    def get_hold_status(event: Event) -> dict:
        """
        Get comprehensive hold status for an event.

        Args:
            event: The Event instance

        Returns:
            dict: Hold status details
        """
        settings = DateHoldingService.get_hold_settings()
        now = timezone.now()

        is_expired = False
        time_remaining = None

        if event.date_hold_status == "TEMPORARY_HOLD" and event.date_hold_expires_at:
            is_expired = event.date_hold_expires_at < now
            if not is_expired:
                time_remaining = (event.date_hold_expires_at - now).total_seconds()

        can_extend = (
            event.date_hold_status == "TEMPORARY_HOLD"
            and not is_expired
            and event.date_hold_extended_count < settings["max_extensions"]
        )

        return {
            "status": event.date_hold_status,
            "held_at": event.date_held_at,
            "expires_at": event.date_hold_expires_at,
            "extended_count": event.date_hold_extended_count,
            "max_extensions": settings["max_extensions"],
            "extensions_remaining": max(0, settings["max_extensions"] - event.date_hold_extended_count),
            "is_expired": is_expired,
            "time_remaining_seconds": time_remaining,
            "can_extend": can_extend,
            "is_permanently_blocked": event.date_hold_status == "PERMANENT_BLOCK" or event.date_blocked,
        }

    @staticmethod
    def get_expiring_holds(hours_until_expiry: int = 24):
        """
        Get events with holds expiring within the specified hours.

        Args:
            hours_until_expiry: Number of hours until expiry threshold

        Returns:
            QuerySet: Events with holds expiring soon
        """
        now = timezone.now()
        threshold = now + timedelta(hours=hours_until_expiry)

        return Event.objects.filter(
            date_hold_status="TEMPORARY_HOLD", date_hold_expires_at__gt=now, date_hold_expires_at__lte=threshold
        ).exclude(status="CANCELLED")

    @staticmethod
    def get_expired_holds():
        """
        Get events with expired temporary holds.

        Returns:
            QuerySet: Events with expired holds
        """
        now = timezone.now()

        return Event.objects.filter(date_hold_status="TEMPORARY_HOLD", date_hold_expires_at__lte=now).exclude(
            status="CANCELLED"
        )
