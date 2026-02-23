# backend/core/utils/admin_logging.py
"""
Admin Action Logging System

Provides comprehensive logging for Django admin operations including:
- Model add/change/delete actions
- Permission and role changes
- Configuration changes
- Bulk admin actions
"""

import logging
from functools import wraps
from typing import Any

from django.contrib.admin.models import ADDITION, CHANGE, DELETION, LogEntry
from django.db.models.signals import post_save
from django.dispatch import receiver

from core.utils.security_logging import (
    SecurityEventType,
    SecuritySeverity,
    security_logger,
)

logger = logging.getLogger("admin_logging")


# ============================================================================
# Admin Action Constants
# ============================================================================

ACTION_NAMES = {
    ADDITION: "add",
    CHANGE: "change",
    DELETION: "delete",
}

# Models that require HIGH severity logging
SENSITIVE_MODELS = {
    "user",
    "group",
    "permission",
    "paymentsettings",
    "paymentgateway",
    "bookingflow",
    "securitybreach",
    "taxrate",
}

# Models that track configuration changes
CONFIG_MODELS = {
    "paymentsettings",
    "paymentgateway",
    "bookingflow",
    "bookingflowstep",
    "communicationtemplate",
    "notificationtype",
    "eventtype",
    "taxrate",
    "discount",
}

# Fields that indicate permission/role changes
PERMISSION_FIELDS = {
    "is_superuser",
    "is_staff",
    "is_active",
    "role",
    "groups",
    "user_permissions",
}


# ============================================================================
# Admin Action Logging Functions
# ============================================================================


def log_admin_model_action(
    request, obj: Any, action: str, change_message: str = "", changed_fields: list[str] | None = None
) -> None:
    """
    Log an admin action on a model instance.

    Args:
        request: The Django request object
        obj: The model instance being acted upon
        action: The action type ('add', 'change', 'delete')
        change_message: Description of the change
        changed_fields: List of fields that were changed
    """
    if not request or not hasattr(request, "user") or not request.user:
        return

    user = request.user
    model_name = obj._meta.model_name if hasattr(obj, "_meta") else str(type(obj).__name__)
    app_label = obj._meta.app_label if hasattr(obj, "_meta") else "unknown"

    # Determine severity based on model and action
    severity = _determine_severity(model_name, action, changed_fields)

    # Build details
    details = {
        "action": action,
        "model": model_name,
        "app_label": app_label,
        "object_id": str(getattr(obj, "pk", getattr(obj, "id", "unknown"))),
        "object_repr": str(obj)[:200],  # Truncate for safety
        "change_message": change_message,
    }

    if changed_fields:
        details["changed_fields"] = changed_fields

    # Check for permission/role changes
    is_permission_change = _is_permission_change(model_name, changed_fields)
    if is_permission_change:
        details["is_permission_change"] = True
        severity = SecuritySeverity.HIGH

    # Check for configuration changes
    is_config_change = model_name.lower() in CONFIG_MODELS
    if is_config_change:
        details["is_config_change"] = True
        if action == "delete":
            severity = SecuritySeverity.HIGH

    # Build description
    description = f"Admin {user.email} {action}d {model_name}: {str(obj)[:100]}"

    # Determine event type
    if is_permission_change:
        event_type = SecurityEventType.DATA_MODIFICATION
        description = f"Permission/role change by {user.email}: {change_message or action}"
    elif is_config_change:
        event_type = SecurityEventType.CONFIGURATION_CHANGED
        description = f"Configuration {action} by {user.email}: {model_name}"
    else:
        event_type = SecurityEventType.ADMIN_ACTION

    # Log the event
    security_logger.log_event(
        event_type=event_type,
        description=description,
        request=request,
        user=user,
        severity=severity,
        details=details,
        risk_score=_calculate_admin_risk_score(action, model_name, is_permission_change),
    )


def log_admin_bulk_action(request, action_name: str, queryset, model_name: str = None) -> None:
    """
    Log a bulk admin action.

    Args:
        request: The Django request object
        action_name: Name of the bulk action
        queryset: The queryset being acted upon
        model_name: The model name (optional, derived from queryset if not provided)
    """
    if not request or not hasattr(request, "user") or not request.user:
        return

    user = request.user

    if model_name is None:
        model_name = queryset.model._meta.model_name if hasattr(queryset, "model") else "unknown"

    count = queryset.count() if hasattr(queryset, "count") else len(queryset)

    details = {
        "action": "bulk_action",
        "action_name": action_name,
        "model": model_name,
        "affected_count": count,
        "object_ids": list(queryset.values_list("pk", flat=True)[:100]),  # Limit to 100 IDs
    }

    # Higher severity for bulk operations on sensitive models
    severity = SecuritySeverity.HIGH if model_name.lower() in SENSITIVE_MODELS else SecuritySeverity.MEDIUM

    description = f"Bulk action '{action_name}' on {count} {model_name}(s) by {user.email}"

    security_logger.log_event(
        event_type=SecurityEventType.ADMIN_ACTION,
        description=description,
        request=request,
        user=user,
        severity=severity,
        details=details,
        risk_score=min(30 + count, 80),  # Higher risk for more objects
    )


def log_permission_change(
    request, user_obj, change_type: str, old_value: Any = None, new_value: Any = None, field_name: str = None
) -> None:
    """
    Log a permission or role change for a user.

    Args:
        request: The Django request object
        user_obj: The user being modified
        change_type: Type of change ('role_change', 'permission_grant', 'permission_revoke', etc.)
        old_value: Previous value
        new_value: New value
        field_name: The field that was changed
    """
    if not request or not hasattr(request, "user") or not request.user:
        return

    admin_user = request.user

    details = {
        "change_type": change_type,
        "target_user_id": user_obj.id,
        "target_user_email": user_obj.email,
        "admin_user_id": admin_user.id,
        "admin_user_email": admin_user.email,
    }

    if field_name:
        details["field_name"] = field_name
    if old_value is not None:
        details["old_value"] = str(old_value)
    if new_value is not None:
        details["new_value"] = str(new_value)

    description = f"Permission change for {user_obj.email}: {change_type}"
    if field_name:
        description += f" ({field_name}: {old_value} -> {new_value})"

    security_logger.log_event(
        event_type=SecurityEventType.DATA_MODIFICATION,
        description=description,
        request=request,
        user=admin_user,
        severity=SecuritySeverity.HIGH,
        details=details,
        risk_score=60,
    )


def log_configuration_change(
    request,
    config_type: str,
    change_description: str,
    old_config: dict | None = None,
    new_config: dict | None = None,
) -> None:
    """
    Log a configuration change.

    Args:
        request: The Django request object
        config_type: Type of configuration being changed
        change_description: Description of the change
        old_config: Previous configuration values
        new_config: New configuration values
    """
    if not request or not hasattr(request, "user") or not request.user:
        return

    user = request.user

    details = {
        "config_type": config_type,
        "change_description": change_description,
    }

    if old_config:
        # Mask sensitive values
        details["old_config"] = _mask_sensitive_config(old_config)
    if new_config:
        details["new_config"] = _mask_sensitive_config(new_config)

    description = f"Configuration change ({config_type}) by {user.email}: {change_description}"

    security_logger.log_event(
        event_type=SecurityEventType.CONFIGURATION_CHANGED,
        description=description,
        request=request,
        user=user,
        severity=SecuritySeverity.MEDIUM,
        details=details,
        risk_score=40,
    )


# ============================================================================
# Django Admin Signal Handlers for LogEntry
# ============================================================================


@receiver(post_save, sender=LogEntry)
def log_admin_log_entry(sender, instance, created, **kwargs):
    """
    Listen to Django's built-in admin LogEntry to capture all admin actions.
    This provides a backup logging mechanism that captures all admin activity.
    """
    if not created:
        return

    try:
        action_name = ACTION_NAMES.get(instance.action_flag, "unknown")
        model_name = instance.content_type.model if instance.content_type else "unknown"

        details = {
            "action": action_name,
            "model": model_name,
            "object_id": instance.object_id,
            "object_repr": instance.object_repr[:200],
            "change_message": instance.change_message,
            "log_entry_id": instance.id,
        }

        # Determine severity
        severity = SecuritySeverity.LOW
        if model_name.lower() in SENSITIVE_MODELS:
            severity = SecuritySeverity.MEDIUM
        if action_name == "delete" or model_name.lower() in {"user", "group", "permission"}:
            severity = SecuritySeverity.HIGH

        description = f"Admin LogEntry: {instance.user} {action_name}d {model_name} ({instance.object_repr[:50]})"

        # Log without request (signal doesn't have access to request)
        security_logger.log_event(
            event_type=SecurityEventType.ADMIN_ACTION,
            description=description,
            user=instance.user,
            severity=severity,
            details=details,
            risk_score=_calculate_admin_risk_score(action_name, model_name, False),
        )

    except Exception as e:
        logger.error(f"Failed to log admin LogEntry: {e}")


# ============================================================================
# Admin Mixin for Enhanced Logging
# ============================================================================


class AdminLoggingMixin:
    """
    Mixin for ModelAdmin classes to enable detailed action logging.

    Usage:
        class MyModelAdmin(AdminLoggingMixin, admin.ModelAdmin):
            pass
    """

    def save_model(self, request, obj, form, change):
        """Override to log model saves with field changes."""
        changed_fields = list(form.changed_data) if form.changed_data else []
        action = "change" if change else "add"

        # Store old values for permission tracking
        old_values = {}
        if change and hasattr(obj, "pk") and obj.pk:
            try:
                old_obj = self.model.objects.get(pk=obj.pk)
                for field in PERMISSION_FIELDS:
                    if hasattr(old_obj, field):
                        old_values[field] = getattr(old_obj, field)
            except self.model.DoesNotExist:
                pass

        # Call parent save
        super().save_model(request, obj, form, change)

        # Log the action
        change_message = self.construct_change_message(request, form, None) if change else "Created"
        log_admin_model_action(
            request=request, obj=obj, action=action, change_message=str(change_message), changed_fields=changed_fields
        )

        # Log permission changes specifically
        for field in PERMISSION_FIELDS:
            if field in changed_fields and field in old_values:
                new_value = getattr(obj, field, None)
                log_permission_change(
                    request=request,
                    user_obj=obj,
                    change_type="field_change",
                    old_value=old_values[field],
                    new_value=new_value,
                    field_name=field,
                )

    def delete_model(self, request, obj):
        """Override to log model deletions."""
        # Log before deletion
        log_admin_model_action(request=request, obj=obj, action="delete", change_message="Deleted from admin")
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        """Override to log bulk deletions."""
        model_name = queryset.model._meta.model_name if hasattr(queryset, "model") else "unknown"
        log_admin_bulk_action(request=request, action_name="bulk_delete", queryset=queryset, model_name=model_name)
        super().delete_queryset(request, queryset)

    def response_action(self, request, queryset):
        """Override to log custom admin actions."""
        action = request.POST.get("action")
        if action and queryset:
            model_name = queryset.model._meta.model_name if hasattr(queryset, "model") else "unknown"
            log_admin_bulk_action(request=request, action_name=action, queryset=queryset, model_name=model_name)
        return super().response_action(request, queryset)


# ============================================================================
# Helper Functions
# ============================================================================


def _determine_severity(model_name: str, action: str, changed_fields: list[str] | None) -> str:
    """Determine the appropriate severity level for an admin action."""
    model_lower = model_name.lower()

    # Delete actions on sensitive models are always HIGH
    if action == "delete" and model_lower in SENSITIVE_MODELS:
        return SecuritySeverity.HIGH

    # Permission-related changes are HIGH
    if changed_fields and any(f in PERMISSION_FIELDS for f in changed_fields):
        return SecuritySeverity.HIGH

    # Sensitive models get MEDIUM by default
    if model_lower in SENSITIVE_MODELS:
        return SecuritySeverity.MEDIUM

    # Default is LOW
    return SecuritySeverity.LOW


def _is_permission_change(model_name: str, changed_fields: list[str] | None) -> bool:
    """Check if the change involves permissions or roles."""
    model_lower = model_name.lower()

    # User model changes to permission fields
    if model_lower == "user" and changed_fields:
        return any(f in PERMISSION_FIELDS for f in changed_fields)

    # Group and permission model changes
    return model_lower in {"group", "permission"}


def _calculate_admin_risk_score(action: str, model_name: str, is_permission_change: bool) -> int:
    """Calculate risk score for an admin action."""
    base_score = 10

    # Action type contribution
    if action == "delete":
        base_score += 20
    elif action == "change":
        base_score += 10

    # Model sensitivity contribution
    if model_name.lower() in SENSITIVE_MODELS:
        base_score += 20

    # Permission change contribution
    if is_permission_change:
        base_score += 30

    return min(base_score, 100)


def _mask_sensitive_config(config: dict) -> dict:
    """Mask sensitive values in configuration dictionaries."""
    sensitive_keys = {
        "secret",
        "key",
        "password",
        "token",
        "api_key",
        "private",
        "credential",
        "auth",
        "stripe",
        "webhook",
    }

    masked = {}
    for key, value in config.items():
        key_lower = key.lower()
        if any(s in key_lower for s in sensitive_keys):
            if isinstance(value, str) and len(value) > 4:
                masked[key] = f"***{value[-4:]}"
            else:
                masked[key] = "***"
        else:
            masked[key] = value

    return masked


# ============================================================================
# Decorator for Custom Admin Actions
# ============================================================================


def log_admin_action(action_name: str = None):
    """
    Decorator to add logging to custom admin action methods.

    Usage:
        @log_admin_action('approve_users')
        def approve_users(self, request, queryset):
            # ... action code
    """

    def decorator(func):
        @wraps(func)
        def wrapper(self, request, queryset, *args, **kwargs):
            name = action_name or func.__name__
            log_admin_bulk_action(request=request, action_name=name, queryset=queryset)
            return func(self, request, queryset, *args, **kwargs)

        return wrapper

    return decorator
