# backend/core/domains/events/tasks/__init__.py
"""
Celery tasks for the Events domain.

Handles deadline checking, cancellation processing, and date blocking tasks.
"""

from .date_hold_tasks import (
    expire_date_holds,
    notify_competing_event_cancelled,
    send_hold_expired_notification,
    send_hold_expiring_reminder,
    send_hold_expiring_soon_reminders,
)
from .deadline_tasks import (
    check_downpayment_deadline,
    daily_deadline_sweep,
    schedule_deadline_reminders,
    send_deadline_reminder,
)
from .lifecycle_tasks import (
    cleanup_expired_reservations,
    mark_past_events_completed,
    schedule_event_date_reminders,
    send_event_date_reminder,
)

__all__ = [
    # Deadline tasks
    "check_downpayment_deadline",
    "daily_deadline_sweep",
    "send_deadline_reminder",
    "schedule_deadline_reminders",
    # Date hold tasks
    "notify_competing_event_cancelled",
    "expire_date_holds",
    "send_hold_expired_notification",
    "send_hold_expiring_soon_reminders",
    "send_hold_expiring_reminder",
    # Lifecycle tasks
    "send_event_date_reminder",
    "schedule_event_date_reminders",
    "mark_past_events_completed",
    "cleanup_expired_reservations",
]
