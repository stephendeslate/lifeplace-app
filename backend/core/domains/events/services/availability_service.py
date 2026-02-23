# backend/core/domains/events/services/availability_service.py

import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from enum import Enum

from django.core.cache import cache
from django.db.models import Q, QuerySet
from django.utils import timezone

from ...bookingflow.models import BookingFlow, DateTimeStepConfiguration
from ..models import Event

logger = logging.getLogger(__name__)


class AvailabilityStatus(Enum):
    """Status levels for date availability"""

    AVAILABLE = "available"
    PARTIALLY_BOOKED = "partially_booked"
    FULLY_BOOKED = "fully_booked"
    BLOCKED = "blocked"
    OUTSIDE_RANGE = "outside_range"


class ConflictLevel(Enum):
    """Levels of booking conflicts"""

    NONE = "none"
    LEAD_ONLY = "lead_only"
    CONFIRMED = "confirmed"
    MULTIPLE_CONFIRMED = "multiple_confirmed"


@dataclass
class DateAvailabilityInfo:
    """Comprehensive availability information for a date"""

    date: date
    status: AvailabilityStatus
    conflict_level: ConflictLevel
    confirmed_events_count: int
    lead_events_count: int
    total_events_count: int
    can_book_event: bool
    can_create_lead: bool
    conflicts: list[dict]
    reasons: list[str]
    buffer_conflicts: list[dict]
    next_available_date: date | None = None


@dataclass
class AvailabilityRequest:
    """Request parameters for availability checking"""

    start_date: date
    end_date: date | None = None
    event_type_id: int | None = None
    booking_flow_id: int | None = None
    duration_hours: int = 4
    buffer_before_hours: int = 0
    buffer_after_hours: int = 0
    exclude_event_id: int | None = None
    check_venue_availability: bool = True
    check_staff_availability: bool = True
    include_buffer_conflicts: bool = True


class DateAvailabilityService:
    """
    Enterprise-level date availability checking service

    Core business rules:
    1. Clients cannot book on dates that already have a CONFIRMED booking
    2. Leads can still be created on dates where events are already confirmed
    3. Buffer times are respected to prevent conflicts
    4. Venue and resource capacity is considered
    """

    CACHE_PREFIX = "event_availability"
    CACHE_TIMEOUT = 300  # 5 minutes

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def check_date_availability(self, request: AvailabilityRequest) -> DateAvailabilityInfo:
        """
        Check availability for a specific date or date range

        Args:
            request: AvailabilityRequest with all necessary parameters

        Returns:
            DateAvailabilityInfo with comprehensive availability data
        """
        try:
            # Check cache first
            cache_key = self._get_cache_key(request)
            try:
                cached_result = cache.get(cache_key)
                if cached_result:
                    # Reconstruct DateAvailabilityInfo from cached dict
                    return self._deserialize_availability_info(cached_result)
            except Exception as cache_error:
                self.logger.debug(f"Cache read failed, proceeding without cache: {cache_error}")

            # Get existing events for the date(s)
            existing_events = self._get_existing_events(request)

            # Analyze conflicts
            conflicts = self._analyze_conflicts(existing_events, request)

            # Check buffer conflicts
            buffer_conflicts = []
            if request.include_buffer_conflicts:
                buffer_conflicts = self._check_buffer_conflicts(request)

            # Check blocked dates
            blocked_reasons = self._check_blocked_dates(request)

            # Check business rules and capacity
            capacity_issues = self._check_capacity_constraints(request, existing_events)

            # Determine availability status
            availability_info = self._determine_availability_status(
                request, existing_events, conflicts, buffer_conflicts, blocked_reasons, capacity_issues
            )

            # Cache the result (serialize to dict for JSON compatibility)
            try:
                cache.set(cache_key, self._serialize_availability_info(availability_info), self.CACHE_TIMEOUT)
            except Exception as cache_error:
                self.logger.debug(f"Cache write failed, continuing without caching: {cache_error}")

            return availability_info

        except Exception as e:
            self.logger.error(f"Error checking date availability: {e}")
            # Return safe default
            return DateAvailabilityInfo(
                date=request.start_date,
                status=AvailabilityStatus.BLOCKED,
                conflict_level=ConflictLevel.CONFIRMED,
                confirmed_events_count=0,
                lead_events_count=0,
                total_events_count=0,
                can_book_event=False,
                can_create_lead=False,
                conflicts=[],
                reasons=["Error checking availability"],
                buffer_conflicts=[],
            )

    def check_multiple_dates(self, start_date: date, end_date: date, **kwargs) -> list[DateAvailabilityInfo]:
        """
        Check availability for multiple consecutive dates

        Args:
            start_date: Start date of range
            end_date: End date of range
            **kwargs: Additional parameters for AvailabilityRequest

        Returns:
            List of DateAvailabilityInfo for each date in range
        """
        results = []
        current_date = start_date

        while current_date <= end_date:
            request = AvailabilityRequest(start_date=current_date, **kwargs)
            availability = self.check_date_availability(request)
            results.append(availability)
            current_date += timedelta(days=1)

        return results

    def get_next_available_date(
        self, start_date: date, event_type_id: int | None = None, max_days_ahead: int = 365, **kwargs
    ) -> date | None:
        """
        Find the next available date for booking

        Args:
            start_date: Start searching from this date
            event_type_id: Optional event type filter
            max_days_ahead: Maximum days to search ahead
            **kwargs: Additional parameters

        Returns:
            Next available date or None if none found
        """
        current_date = start_date
        end_search_date = start_date + timedelta(days=max_days_ahead)

        while current_date <= end_search_date:
            request = AvailabilityRequest(start_date=current_date, event_type_id=event_type_id, **kwargs)
            availability = self.check_date_availability(request)

            if availability.can_book_event:
                return current_date

            current_date += timedelta(days=1)

        return None

    def validate_booking_request(
        self,
        start_date: date,
        end_date: date | None = None,
        event_type_id: int | None = None,
        booking_flow_id: int | None = None,
        is_lead: bool = False,
        **kwargs,
    ) -> tuple[bool, list[str]]:
        """
        Validate if a booking request is allowed

        Args:
            start_date: Event start date
            end_date: Event end date (optional)
            event_type_id: Event type
            booking_flow_id: Booking flow
            is_lead: Whether this is a lead (less strict validation)
            **kwargs: Additional parameters

        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []

        try:
            request = AvailabilityRequest(
                start_date=start_date,
                end_date=end_date,
                event_type_id=event_type_id,
                booking_flow_id=booking_flow_id,
                **kwargs,
            )

            availability = self.check_date_availability(request)

            if is_lead:
                # Leads have more lenient rules
                if not availability.can_create_lead:
                    errors.extend(availability.reasons)
            # Full bookings have strict rules
            elif not availability.can_book_event:
                errors.extend(availability.reasons)

            # Additional multi-day validation
            if end_date and end_date != start_date:
                multi_day_results = self.check_multiple_dates(start_date, end_date, **kwargs)

                for day_availability in multi_day_results:
                    if is_lead and not day_availability.can_create_lead:
                        errors.append(f"Date {day_availability.date} is not available for leads")
                    elif not is_lead and not day_availability.can_book_event:
                        errors.append(f"Date {day_availability.date} is not available for booking")

            return len(errors) == 0, errors

        except Exception as e:
            self.logger.error(f"Error validating booking request: {e}")
            return False, ["Error validating booking request"]

    def get_booking_flow_availability_config(self, booking_flow_id: int) -> DateTimeStepConfiguration | None:
        """Get availability configuration for a booking flow"""
        try:
            booking_flow = BookingFlow.objects.get(id=booking_flow_id)
            datetime_step = booking_flow.steps.filter(step_type="date_time", is_enabled=True).first()

            if datetime_step and hasattr(datetime_step, "datetime_config"):
                return datetime_step.datetime_config

        except Exception as e:
            self.logger.error(f"Error getting booking flow config: {e}")

        return None

    def invalidate_cache(self, date_range: tuple[date, date] | None = None):
        """Invalidate availability cache for date range or all"""
        if date_range:
            start_date, end_date = date_range
            current_date = start_date
            while current_date <= end_date:
                pattern = f"{self.CACHE_PREFIX}:*:{current_date}:*"
                # In production, use Redis SCAN for pattern deletion
                cache.delete_many([pattern])
                current_date += timedelta(days=1)
        else:
            # Clear all availability cache
            cache.delete_pattern(f"{self.CACHE_PREFIX}:*")

    def _get_cache_key(self, request: AvailabilityRequest) -> str:
        """Generate cache key for availability request"""
        key_parts = [
            self.CACHE_PREFIX,
            str(request.start_date),
            str(request.end_date or ""),
            str(request.event_type_id or ""),
            str(request.booking_flow_id or ""),
            str(request.duration_hours),
            str(request.buffer_before_hours),
            str(request.buffer_after_hours),
            str(request.exclude_event_id or ""),
        ]
        return ":".join(key_parts)

    def _serialize_availability_info(self, info: DateAvailabilityInfo) -> dict:
        """Serialize DateAvailabilityInfo to JSON-compatible dict for caching"""
        return {
            "date": info.date.isoformat(),
            "status": info.status.value,
            "conflict_level": info.conflict_level.value,
            "confirmed_events_count": info.confirmed_events_count,
            "lead_events_count": info.lead_events_count,
            "total_events_count": info.total_events_count,
            "can_book_event": info.can_book_event,
            "can_create_lead": info.can_create_lead,
            "conflicts": info.conflicts,
            "reasons": info.reasons,
            "buffer_conflicts": info.buffer_conflicts,
            "next_available_date": info.next_available_date.isoformat() if info.next_available_date else None,
        }

    def _deserialize_availability_info(self, data: dict) -> DateAvailabilityInfo:
        """Deserialize cached dict back to DateAvailabilityInfo"""

        return DateAvailabilityInfo(
            date=datetime.fromisoformat(data["date"]).date() if isinstance(data["date"], str) else data["date"],
            status=AvailabilityStatus(data["status"]),
            conflict_level=ConflictLevel(data["conflict_level"]),
            confirmed_events_count=data["confirmed_events_count"],
            lead_events_count=data["lead_events_count"],
            total_events_count=data["total_events_count"],
            can_book_event=data["can_book_event"],
            can_create_lead=data["can_create_lead"],
            conflicts=data["conflicts"],
            reasons=data["reasons"],
            buffer_conflicts=data["buffer_conflicts"],
            next_available_date=(
                datetime.fromisoformat(data["next_available_date"]).date() if data.get("next_available_date") else None
            ),
        )

    def _get_existing_events(self, request: AvailabilityRequest) -> QuerySet:
        """Get existing events that might conflict with the request"""
        # Base query for events on the target date(s)
        events = Event.objects.filter(
            start_date__date__lte=request.end_date or request.start_date, start_date__date__gte=request.start_date
        ).select_related("client", "event_type")

        # Include multi-day events that span our date
        if request.end_date:
            events = events.filter(
                Q(start_date__date__lte=request.end_date)
                & (Q(end_date__isnull=True) | Q(end_date__date__gte=request.start_date))
            )
        else:
            events = events.filter(
                Q(start_date__date=request.start_date)
                | (Q(end_date__date__gte=request.start_date) & Q(start_date__date__lte=request.start_date))
            )

        # Filter by event type if specified
        if request.event_type_id:
            events = events.filter(event_type_id=request.event_type_id)

        # Exclude specific event if needed (for updates)
        if request.exclude_event_id:
            events = events.exclude(id=request.exclude_event_id)

        # Only consider active events (not cancelled)
        events = events.exclude(status="CANCELLED")

        return events

    def _analyze_conflicts(self, existing_events: QuerySet, request: AvailabilityRequest) -> list[dict]:
        """Analyze conflicts with existing events"""
        conflicts = []

        for event in existing_events:
            conflict = {
                "event_id": event.id,
                "event_name": event.name or "Untitled Event",
                "client_name": getattr(event.client, "full_name", "Unknown"),
                "status": event.status,
                "start_date": event.start_date.date(),
                "end_date": event.end_date.date() if event.end_date else None,
                "event_type": event.event_type.name if event.event_type else None,
                "severity": "high" if event.status == "CONFIRMED" else "medium",
            }
            conflicts.append(conflict)

        return conflicts

    def _check_buffer_conflicts(self, request: AvailabilityRequest) -> list[dict]:
        """Check for conflicts within buffer time ranges"""
        buffer_conflicts = []

        if request.buffer_before_hours > 0 or request.buffer_after_hours > 0:
            # Calculate buffer date ranges
            buffer_start = request.start_date - timedelta(hours=request.buffer_before_hours)
            buffer_end = (request.end_date or request.start_date) + timedelta(hours=request.buffer_after_hours)

            # Find events in buffer zones
            buffer_events = Event.objects.filter(
                start_date__range=[buffer_start, buffer_end], status="CONFIRMED"
            ).exclude(start_date__date=request.start_date)

            if request.exclude_event_id:
                buffer_events = buffer_events.exclude(id=request.exclude_event_id)

            for event in buffer_events:
                buffer_conflicts.append(
                    {
                        "event_id": event.id,
                        "event_name": event.name or "Untitled Event",
                        "start_date": event.start_date,
                        "type": "buffer_conflict",
                    }
                )

        return buffer_conflicts

    def _check_blocked_dates(self, request: AvailabilityRequest) -> list[str]:
        """Check if dates are blocked by configuration"""
        blocked_reasons = []

        # Check booking flow configuration
        if request.booking_flow_id:
            config = self.get_booking_flow_availability_config(request.booking_flow_id)
            if config:
                # Check blocked dates
                if request.start_date.isoformat() in config.blocked_dates:
                    blocked_reasons.append("Date is blocked in booking configuration")

                # Check available days of week
                if config.available_days_of_week:
                    weekday = request.start_date.weekday()  # 0=Monday, 6=Sunday
                    if weekday not in config.available_days_of_week:
                        blocked_reasons.append("Day of week is not available")

                # Check advance booking limits
                days_ahead = (request.start_date - timezone.now().date()).days
                booking_flow = BookingFlow.objects.get(id=request.booking_flow_id)

                if days_ahead < booking_flow.min_advance_booking_days:
                    blocked_reasons.append(
                        f"Booking must be made at least {booking_flow.min_advance_booking_days} days in advance"
                    )

                if days_ahead > booking_flow.max_advance_booking_days:
                    blocked_reasons.append(
                        f"Booking cannot be made more than {booking_flow.max_advance_booking_days} days in advance"
                    )

        return blocked_reasons

    def _check_capacity_constraints(self, request: AvailabilityRequest, existing_events: QuerySet) -> list[str]:
        """Check venue and resource capacity constraints"""
        capacity_issues = []

        # For now, implement basic capacity checking
        # In a full implementation, this would check:
        # - Venue capacity and double-bookings
        # - Staff availability
        # - Equipment/resource availability
        # - Catering capacity limits

        confirmed_events = [e for e in existing_events if e.status == "CONFIRMED"]

        if len(confirmed_events) > 0:
            # Basic rule: Only one confirmed event per day per venue
            # (This would be more sophisticated in production)
            capacity_issues.append("Venue capacity exceeded for this date")

        return capacity_issues

    def _determine_availability_status(
        self,
        request: AvailabilityRequest,
        existing_events: QuerySet,
        conflicts: list[dict],
        buffer_conflicts: list[dict],
        blocked_reasons: list[str],
        capacity_issues: list[str],
    ) -> DateAvailabilityInfo:
        """Determine final availability status and permissions

        UPDATED LOGIC for date_blocked field:
        - date_blocked=True events are hard blocks (date is taken)
        - For ON_DOWNPAYMENT policy: CONFIRMED events without date_blocked=True
          do NOT block new bookings (first-to-pay-wins applies)
        - For IMMEDIATE policy: CONFIRMED events block immediately
        """

        # NEW: Check for date_blocked events (hard blocks)
        date_blocked_count = len([e for e in existing_events if getattr(e, "date_blocked", False)])
        confirmed_count = len([e for e in existing_events if e.status == "CONFIRMED"])
        lead_count = len([e for e in existing_events if e.status == "LEAD"])
        total_count = len(existing_events)

        # Determine conflict level based on date_blocked (not just CONFIRMED)
        if date_blocked_count > 0:
            conflict_level = ConflictLevel.MULTIPLE_CONFIRMED if date_blocked_count > 1 else ConflictLevel.CONFIRMED
        elif confirmed_count > 0:
            # CONFIRMED but not date_blocked - these are pending payment
            conflict_level = ConflictLevel.CONFIRMED
        elif lead_count > 0:
            conflict_level = ConflictLevel.LEAD_ONLY
        else:
            conflict_level = ConflictLevel.NONE

        # Determine base availability status
        if blocked_reasons:
            status = AvailabilityStatus.BLOCKED
        elif date_blocked_count > 0:
            # Date is officially blocked by a paid/confirmed booking
            status = AvailabilityStatus.FULLY_BOOKED
        elif confirmed_count > 0:
            # Has confirmed but unpaid events - partially booked (first-to-pay-wins)
            status = AvailabilityStatus.PARTIALLY_BOOKED
        elif total_count > 0:
            status = AvailabilityStatus.PARTIALLY_BOOKED
        else:
            status = AvailabilityStatus.AVAILABLE

        # Apply business rules for booking permissions
        can_book_event = True
        can_create_lead = True
        reasons = []

        # Rule 1: Check date_blocked field (CRITICAL - hard block)
        # If any event has date_blocked=True, the date is taken
        if date_blocked_count > 0:
            can_book_event = False
            reasons.append("Date is already booked")
        else:
            # Rule 1b: Get blocking policy to determine if CONFIRMED events block
            blocking_policy = self._get_blocking_policy_for_request(request)

            if blocking_policy == "IMMEDIATE":
                # Traditional behavior: CONFIRMED events block immediately
                if confirmed_count > 0:
                    can_book_event = False
                    reasons.append("Date has confirmed event(s)")
            # For ON_DOWNPAYMENT: CONFIRMED but unpaid events do NOT block
            # Multiple bookings allowed - first to pay wins

        # Rule 2: Cannot book if blocked by configuration
        if blocked_reasons:
            can_book_event = False
            can_create_lead = False
            reasons.extend(blocked_reasons)

        # Rule 3: Capacity constraints affect both bookings and leads
        if capacity_issues and date_blocked_count > 0:
            # Only apply capacity issues if date is actually blocked
            can_book_event = False
            reasons.extend(capacity_issues)

        # Rule 4: Buffer conflicts prevent booking
        if buffer_conflicts:
            can_book_event = False
            reasons.append("Buffer time conflicts with existing events")

        return DateAvailabilityInfo(
            date=request.start_date,
            status=status,
            conflict_level=conflict_level,
            confirmed_events_count=confirmed_count,
            lead_events_count=lead_count,
            total_events_count=total_count,
            can_book_event=can_book_event,
            can_create_lead=can_create_lead,
            conflicts=conflicts,
            reasons=reasons,
            buffer_conflicts=buffer_conflicts,
            next_available_date=self.get_next_available_date(
                request.start_date + timedelta(days=1),
                request.event_type_id,
                30,  # Look 30 days ahead
            )
            if not can_book_event
            else None,
        )

    def _get_blocking_policy_for_request(self, request: AvailabilityRequest) -> str:
        """
        Get the date blocking policy for the availability request.

        Args:
            request: AvailabilityRequest with booking flow or event type info

        Returns:
            str: 'IMMEDIATE' or 'ON_DOWNPAYMENT'
        """
        try:
            from core.domains.events.services.date_blocking_service import DateBlockingService

            # If we have a booking flow, get its effective payment terms
            if request.booking_flow_id:
                booking_flow = BookingFlow.objects.get(id=request.booking_flow_id)
                terms = DateBlockingService.get_effective_payment_terms(booking_flow)
                return terms.get("date_blocking_policy", "IMMEDIATE")

            # Fall back to global default
            from core.domains.payments.models import PaymentSettings

            settings = PaymentSettings.get_default_settings()
            return settings.date_blocking_policy

        except Exception as e:
            self.logger.warning(f"Error getting blocking policy: {e}")
            return "IMMEDIATE"  # Safe default


# Global service instance
availability_service = DateAvailabilityService()
