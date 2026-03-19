"""
Cross-domain DTOs for the events domain.

These frozen dataclasses define data shapes consumed by the events domain
from other domains, and data shapes produced by events for external use.

See ADR-002: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from core.types import DomainDTO


@dataclass(frozen=True)
class EventSummary(DomainDTO):
    """Lightweight event representation for cross-domain use.

    Use this instead of passing full Event model instances when only
    summary data is needed (e.g., in notifications, communications).

    Produced by: events domain
    Consumed by: communications, notifications, bookingflow
    """

    event_id: int
    name: str
    status: str
    event_type: str
    client_name: str = ""
    start_date: datetime | None = None
    end_date: datetime | None = None
    guest_count: int | None = None
    venue_name: str | None = None


@dataclass(frozen=True)
class EventTimelineEntry(DomainDTO):
    """Data for creating an EventTimeline record from another domain.

    Standardizes the dict shape that payments, bookingflow, sales, and
    other domains use when calling EventTimeline.objects.create().

    Produced by: payments, bookingflow, sales, contracts
    Consumed by: events (EventTimelineService.add_timeline_entry)
    """

    event_id: int
    action_type: str
    description: str
    actor: object | None = None  # User model instance
    is_public: bool = False
    action_data: dict = field(default_factory=dict)
