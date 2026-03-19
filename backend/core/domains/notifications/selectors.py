"""
Read-only query logic for the notifications domain.

Selectors contain all read operations (queries, lookups, filtering).
They never mutate data. All functions use keyword-only arguments (*)
for clarity at call sites.

See ADR-002: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db.models import Count, Q, QuerySet
from django.utils import timezone

from .exceptions import (
    NotificationNotFoundException,
    NotificationTypeNotFoundException,
)
from .models import (
    Notification,
    NotificationType,
)


# ---------------------------------------------------------------------------
# NotificationService selectors
# ---------------------------------------------------------------------------


def get_notifications(
    *,
    user: Any,
    is_read: bool | None = None,
    notification_type: str | None = None,
    category: str | None = None,
    limit: int | None = None,
) -> QuerySet[Notification]:
    """Get notifications for a user with filtering."""
    query = Q(recipient=user)

    if is_read is not None:
        query &= Q(is_read=is_read)

    if notification_type is not None:
        query &= Q(notification_type__code=notification_type)

    if category is not None:
        query &= Q(notification_type__category=category)

    notifications = (
        Notification.objects.filter(query)
        .select_related("notification_type", "recipient", "event", "client")
        .order_by("-created_at")
    )

    if limit:
        notifications = notifications[:limit]

    return notifications


def get_notification_by_id(
    *,
    notification_id: int,
    user: Any = None,
) -> Notification:
    """Get a notification by ID, optionally filtered by user."""
    query = Q(id=notification_id)
    if user:
        query &= Q(recipient=user)

    try:
        return Notification.objects.select_related("notification_type", "recipient", "event", "client").get(query)
    except Notification.DoesNotExist:
        raise NotificationNotFoundException()


def get_notification_counts(*, user_id: int) -> dict[str, Any]:
    """Get detailed notification counts for a user."""
    base_query = Notification.objects.filter(recipient_id=user_id)

    total = base_query.count()
    unread = base_query.filter(is_read=False).count()

    # Count by category
    by_category = {}
    categories = base_query.values("notification_type__category").annotate(count=Count("id"))
    for item in categories:
        by_category[item["notification_type__category"]] = item["count"]

    # Count by priority
    by_priority = {}
    priorities = base_query.values("notification_type__priority").annotate(count=Count("id"))
    for item in priorities:
        by_priority[item["notification_type__priority"]] = item["count"]

    return {"total": total, "unread": unread, "by_category": by_category, "by_priority": by_priority}


# ---------------------------------------------------------------------------
# NotificationTypeService selectors
# ---------------------------------------------------------------------------


def get_all_notification_types(
    *,
    category: str | None = None,
    is_active: bool | None = None,
) -> QuerySet[NotificationType]:
    """Get all notification types with optional filtering."""
    queryset = NotificationType.objects.all()

    if category:
        queryset = queryset.filter(category=category)
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    return queryset.order_by("category", "name")


def get_notification_type_by_code(*, code: str) -> NotificationType:
    """Get notification type by code."""
    try:
        return NotificationType.objects.get(code=code, is_active=True)
    except NotificationType.DoesNotExist:
        raise NotificationTypeNotFoundException()


# ---------------------------------------------------------------------------
# NotificationStatsService selectors
# ---------------------------------------------------------------------------


def get_user_stats(*, user_id: int, days: int = 30) -> dict[str, Any]:
    """Get notification statistics for a user."""
    start_date = timezone.now() - timedelta(days=days)

    notifications = Notification.objects.filter(recipient_id=user_id, created_at__gte=start_date)

    total_sent = notifications.count()
    total_read = notifications.filter(is_read=True).count()
    read_rate = (total_read / total_sent * 100) if total_sent > 0 else 0

    # Delivery rates by method
    delivery_rates = {}
    for method in ["email", "sms", "in_app", "push"]:
        successful = notifications.filter(delivered_via__contains=[method]).count()
        attempted = notifications.filter(delivery_attempts__has_key=method).count()
        delivery_rates[method] = (successful / attempted * 100) if attempted > 0 else 0

    # Popular notification types
    popular_types = (
        notifications.values("notification_type__name", "notification_type__code")
        .annotate(count=Count("id"))
        .order_by("-count")[:5]
    )

    return {
        "period": f"{days} days",
        "total_sent": total_sent,
        "total_read": total_read,
        "read_rate": round(read_rate, 2),
        "delivery_rates": delivery_rates,
        "popular_types": list(popular_types),
    }


def get_system_stats(*, days: int = 30) -> dict[str, Any]:
    """Get system-wide notification statistics."""
    start_date = timezone.now() - timedelta(days=days)

    notifications = Notification.objects.filter(created_at__gte=start_date)

    total_sent = notifications.count()
    total_users = notifications.values("recipient").distinct().count()
    total_read = notifications.filter(is_read=True).count()

    # Stats by category
    by_category = (
        notifications.values("notification_type__category")
        .annotate(total=Count("id"), read=Count("id", filter=Q(is_read=True)))
        .order_by("-total")
    )

    # Stats by delivery method
    delivery_stats = {}
    for method in ["email", "sms", "in_app", "push"]:
        delivered = notifications.filter(delivered_via__contains=[method]).count()
        delivery_stats[method] = delivered

    return {
        "period": f"{days} days",
        "total_sent": total_sent,
        "total_users": total_users,
        "total_read": total_read,
        "read_rate": round((total_read / total_sent * 100) if total_sent > 0 else 0, 2),
        "by_category": list(by_category),
        "delivery_stats": delivery_stats,
    }


# ---------------------------------------------------------------------------
# PushNotificationService selectors
# ---------------------------------------------------------------------------


def is_valid_expo_token(*, token: str) -> bool:
    """Validate Expo push token format."""
    if not token or not isinstance(token, str):
        return False
    # Expo tokens are in format: ExponentPushToken[xxxx] or ExpoPushToken[xxxx]
    return (token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")) and token.endswith("]")


def get_user_push_tokens(*, user_id: int) -> QuerySet:
    """Get all active push tokens for a user."""
    from .models import DevicePushToken

    return DevicePushToken.objects.filter(user_id=user_id, is_active=True).order_by("-last_used_at")
