"""
Read-only query logic for the events domain.

Selectors contain all read operations (queries, lookups, filtering).
They never mutate data. All functions use keyword-only arguments (*)
for clarity at call sites.

See ADR-002: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

from django.db.models import Q, QuerySet

from .exceptions import EventNotFound, EventTaskNotFound, EventTypeNotFound
from .models import Event, EventFeedback, EventFile, EventTask, EventTimeline, EventType


def get_all_event_types(
    *,
    search_query: str | None = None,
    is_active: bool | None = None,
) -> QuerySet[EventType]:
    """Get all event types with optional filtering.

    Args:
        search_query: Optional text to filter by name or description.
        is_active: Optional flag to filter by active status.
    """
    queryset = EventType.objects.all()

    if search_query:
        queryset = queryset.filter(
            Q(name__icontains=search_query) | Q(description__icontains=search_query)
        )

    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    return queryset.order_by("name")


def get_event_type_by_id(*, event_type_id: int) -> EventType:
    """Get an event type by ID.

    Args:
        event_type_id: The event type's primary key.

    Raises:
        EventTypeNotFound: If the event type does not exist.
    """
    try:
        return EventType.objects.get(id=event_type_id)
    except EventType.DoesNotExist:
        raise EventTypeNotFound()


def get_all_events(
    *,
    search_query: str | None = None,
    event_type_id: int | None = None,
    status: str | None = None,
    client_id: int | None = None,
    start_date_from: str | None = None,
    start_date_to: str | None = None,
    payment_status: str | None = None,
) -> QuerySet[Event]:
    """Get all events with optional filtering.

    Args:
        search_query: Optional text to filter by event name or client details.
        event_type_id: Optional event type ID to filter by.
        status: Optional event status to filter by.
        client_id: Optional client ID to filter by.
        start_date_from: Optional start date lower bound.
        start_date_to: Optional start date upper bound.
        payment_status: Optional payment status to filter by.
    """
    queryset = Event.objects.select_related(
        "client", "event_type", "workflow_template", "current_stage"
    )

    if search_query:
        queryset = queryset.filter(
            Q(name__icontains=search_query)
            | Q(client__first_name__icontains=search_query)
            | Q(client__last_name__icontains=search_query)
            | Q(client__email__icontains=search_query)
        )

    if event_type_id:
        queryset = queryset.filter(event_type_id=event_type_id)

    if status:
        queryset = queryset.filter(status=status)

    if client_id:
        queryset = queryset.filter(client_id=client_id)

    if start_date_from:
        queryset = queryset.filter(start_date__gte=start_date_from)

    if start_date_to:
        queryset = queryset.filter(start_date__lte=start_date_to)

    if payment_status:
        queryset = queryset.filter(payment_status=payment_status)

    return queryset.order_by("-start_date")


def get_event_by_id(*, event_id: int) -> Event:
    """Get an event by ID.

    Args:
        event_id: The event's primary key.

    Raises:
        EventNotFound: If the event does not exist.
    """
    try:
        return Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        raise EventNotFound()


def get_tasks_for_event(
    *,
    event_id: int,
    status: str | None = None,
    assigned_to: int | None = None,
) -> QuerySet[EventTask]:
    """Get tasks for an event.

    Args:
        event_id: The event's primary key.
        status: Optional task status to filter by.
        assigned_to: Optional user ID to filter by assignee.

    Raises:
        EventNotFound: If the event does not exist.
    """
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        raise EventNotFound()

    queryset = event.tasks.all()

    if status:
        queryset = queryset.filter(status=status)

    if assigned_to:
        queryset = queryset.filter(assigned_to_id=assigned_to)

    return queryset.order_by("due_date", "priority")


def get_task_by_id(*, task_id: int) -> EventTask:
    """Get a task by ID.

    Args:
        task_id: The task's primary key.

    Raises:
        EventTaskNotFound: If the task does not exist.
    """
    try:
        return EventTask.objects.get(id=task_id)
    except EventTask.DoesNotExist:
        raise EventTaskNotFound()


def get_files_for_event(
    *,
    event_id: int,
    category: str | None = None,
    is_public: bool | None = None,
) -> QuerySet[EventFile]:
    """Get files for an event.

    Args:
        event_id: The event's primary key.
        category: Optional file category to filter by.
        is_public: Optional flag to filter by public visibility.

    Raises:
        EventNotFound: If the event does not exist.
    """
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        raise EventNotFound()

    queryset = event.files.all()

    if category:
        queryset = queryset.filter(category=category)

    if is_public is not None:
        queryset = queryset.filter(is_public=is_public)

    return queryset.order_by("-created_at")


def get_feedback_for_event(*, event_id: int) -> QuerySet[EventFeedback]:
    """Get feedback for an event.

    Args:
        event_id: The event's primary key.

    Raises:
        EventNotFound: If the event does not exist.
    """
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        raise EventNotFound()

    return event.feedback.all().order_by("-created_at")


def get_timeline_for_event(
    *,
    event_id: int,
    is_public: bool | None = None,
) -> QuerySet[EventTimeline]:
    """Get timeline entries for an event.

    Args:
        event_id: The event's primary key.
        is_public: Optional flag to filter by public visibility.

    Raises:
        EventNotFound: If the event does not exist.
    """
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        raise EventNotFound()

    queryset = event.timeline.all()

    if is_public is not None:
        queryset = queryset.filter(is_public=is_public)

    return queryset.order_by("-created_at")
