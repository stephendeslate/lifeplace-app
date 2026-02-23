# backend/core/domains/venues/services/venue_availability_service.py
from dataclasses import dataclass
from datetime import date, time, timedelta
from typing import Any

from ..models import PackageVenue, Venue, VenueBlockedDate


@dataclass
class VenueAvailabilityResult:
    """Data class for venue availability check result"""

    venue_id: int
    venue_name: str
    date: date
    is_available: bool
    reason: str | None = None
    blocked_times: list[dict[str, Any]] | None = None


class VenueAvailabilityService:
    """
    Service for checking venue availability.
    Integrates with event availability service for comprehensive checks.
    """

    @staticmethod
    def check_venue_blocked_date(
        venue: Venue,
        check_date: date,
        start_time: time | None = None,
        end_time: time | None = None,
    ) -> VenueAvailabilityResult:
        """
        Check if a venue is blocked on a specific date/time.

        Args:
            venue: The venue to check
            check_date: Date to check
            start_time: Optional start time for partial day check
            end_time: Optional end time for partial day check

        Returns:
            VenueAvailabilityResult with availability status
        """
        # Check for full day blocks
        full_day_blocks = VenueBlockedDate.objects.filter(venue=venue, date=check_date, is_full_day=True)

        if full_day_blocks.exists():
            block = full_day_blocks.first()
            return VenueAvailabilityResult(
                venue_id=venue.id,
                venue_name=venue.name,
                date=check_date,
                is_available=False,
                reason=f"Venue blocked: {block.reason}",
            )

        # If no time specified, only check full day blocks
        if not start_time or not end_time:
            return VenueAvailabilityResult(venue_id=venue.id, venue_name=venue.name, date=check_date, is_available=True)

        # Check for partial day blocks that overlap with requested time
        partial_blocks = VenueBlockedDate.objects.filter(venue=venue, date=check_date, is_full_day=False)

        blocked_times = []
        for block in partial_blocks:
            # Check if times overlap
            if not (end_time <= block.blocked_start_time or start_time >= block.blocked_end_time):
                blocked_times.append(
                    {
                        "start": block.blocked_start_time.strftime("%H:%M"),
                        "end": block.blocked_end_time.strftime("%H:%M"),
                        "reason": block.reason,
                    }
                )

        if blocked_times:
            return VenueAvailabilityResult(
                venue_id=venue.id,
                venue_name=venue.name,
                date=check_date,
                is_available=False,
                reason="Venue has time conflicts",
                blocked_times=blocked_times,
            )

        return VenueAvailabilityResult(venue_id=venue.id, venue_name=venue.name, date=check_date, is_available=True)

    @staticmethod
    def check_multiple_venues_availability(
        venue_ids: list[int],
        check_date: date,
        start_time: time | None = None,
        end_time: time | None = None,
    ) -> dict[int, VenueAvailabilityResult]:
        """
        Check availability for multiple venues at once.

        Args:
            venue_ids: List of venue IDs to check
            check_date: Date to check
            start_time: Optional start time
            end_time: Optional end time

        Returns:
            Dict mapping venue_id to VenueAvailabilityResult
        """
        venues = Venue.objects.filter(id__in=venue_ids)
        results = {}

        for venue in venues:
            results[venue.id] = VenueAvailabilityService.check_venue_blocked_date(
                venue=venue, check_date=check_date, start_time=start_time, end_time=end_time
            )

        return results

    @staticmethod
    def check_package_venues_availability(
        package_id: int,
        check_date: date,
        start_time: time | None = None,
        end_time: time | None = None,
    ) -> dict[str, Any]:
        """
        Check availability for all venues in a package.

        Args:
            package_id: Package ID
            check_date: Date to check
            start_time: Optional start time
            end_time: Optional end time

        Returns:
            Dict with overall availability and per-venue results
        """
        package_venues = PackageVenue.objects.filter(package_id=package_id).select_related("venue")

        if not package_venues.exists():
            return {"is_available": True, "reason": "No venues assigned to this package", "venues": []}

        venue_results = []
        all_available = True

        for pv in package_venues:
            result = VenueAvailabilityService.check_venue_blocked_date(
                venue=pv.venue, check_date=check_date, start_time=start_time, end_time=end_time
            )

            venue_results.append(
                {
                    "venue_id": pv.venue.id,
                    "venue_name": pv.venue.name,
                    "is_primary": pv.is_primary,
                    "access_order": pv.access_order,
                    "is_available": result.is_available,
                    "reason": result.reason,
                    "blocked_times": result.blocked_times,
                }
            )

            if not result.is_available:
                all_available = False

        return {
            "is_available": all_available,
            "reason": None if all_available else "One or more venues unavailable",
            "venues": venue_results,
        }

    @staticmethod
    def get_blocked_dates_for_venue(venue: Venue, start_date: date, end_date: date) -> list[dict[str, Any]]:
        """
        Get all blocked dates for a venue within a date range.

        Args:
            venue: The venue
            start_date: Start of date range
            end_date: End of date range

        Returns:
            List of blocked date info
        """
        blocks = VenueBlockedDate.objects.filter(venue=venue, date__gte=start_date, date__lte=end_date).order_by(
            "date", "blocked_start_time"
        )

        return [
            {
                "date": block.date.isoformat(),
                "is_full_day": block.is_full_day,
                "start_time": block.blocked_start_time.strftime("%H:%M") if block.blocked_start_time else None,
                "end_time": block.blocked_end_time.strftime("%H:%M") if block.blocked_end_time else None,
                "reason": block.reason,
            }
            for block in blocks
        ]

    @staticmethod
    def get_available_dates_for_venue(
        venue: Venue, start_date: date, end_date: date, days_of_week: list[int] | None = None
    ) -> list[date]:
        """
        Get available dates for a venue within a date range.

        Args:
            venue: The venue
            start_date: Start of date range
            end_date: End of date range
            days_of_week: Optional list of allowed days (0=Monday, 6=Sunday)

        Returns:
            List of available dates
        """
        # Get all full-day blocked dates
        blocked_dates = set(
            VenueBlockedDate.objects.filter(
                venue=venue, date__gte=start_date, date__lte=end_date, is_full_day=True
            ).values_list("date", flat=True)
        )

        available_dates = []
        current_date = start_date

        while current_date <= end_date:
            # Check day of week filter
            if days_of_week and current_date.weekday() not in days_of_week:
                current_date += timedelta(days=1)
                continue

            # Check if not blocked
            if current_date not in blocked_dates:
                available_dates.append(current_date)

            current_date += timedelta(days=1)

        return available_dates

    @staticmethod
    def block_date(
        venue: Venue,
        block_date: date,
        reason: str,
        created_by=None,
        is_full_day: bool = True,
        start_time: time | None = None,
        end_time: time | None = None,
    ) -> VenueBlockedDate:
        """
        Block a date/time for a venue.

        Args:
            venue: The venue
            block_date: Date to block
            reason: Reason for blocking
            created_by: User who created the block
            is_full_day: Whether to block the full day
            start_time: Start time if partial block
            end_time: End time if partial block

        Returns:
            Created VenueBlockedDate instance
        """
        return VenueBlockedDate.objects.create(
            venue=venue,
            date=block_date,
            reason=reason,
            is_full_day=is_full_day,
            blocked_start_time=start_time,
            blocked_end_time=end_time,
            created_by=created_by,
        )

    @staticmethod
    def unblock_date(venue: Venue, block_date: date) -> int:
        """
        Remove all blocks for a venue on a specific date.

        Args:
            venue: The venue
            block_date: Date to unblock

        Returns:
            Number of blocks removed
        """
        deleted_count, _ = VenueBlockedDate.objects.filter(venue=venue, date=block_date).delete()
        return deleted_count
