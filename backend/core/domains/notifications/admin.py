# backend/core/domains/notifications/admin.py
from django.contrib import admin
from django.db import models
from django.forms import Textarea
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    Notification,
    NotificationDigest,
    NotificationPreference,
    NotificationType,
)


@admin.register(NotificationType)
class NotificationTypeAdmin(admin.ModelAdmin):
    """Admin interface for notification types"""

    list_display = [
        "code",
        "name",
        "category",
        "priority",
        "colored_badge",
        "supports_email",
        "supports_sms",
        "is_active",
        "is_system",
        "created_at",
    ]
    list_filter = ["category", "priority", "is_active", "is_system", "supports_email", "supports_sms", "created_at"]
    search_fields = ["code", "name", "description"]
    readonly_fields = ["created_at", "updated_at"]
    fieldsets = (
        ("Basic Information", {"fields": ("code", "name", "description", "category")}),
        ("Visual Properties", {"fields": ("icon", "color", "priority"), "classes": ("collapse",)}),
        (
            "Template Settings",
            {
                "fields": (
                    "default_title_template",
                    "default_content_template",
                    "default_email_template",
                    "default_sms_template",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Configuration",
            {"fields": ("is_active", "is_system", "supports_email", "supports_sms", "auto_read_after_days")},
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    formfield_overrides = {
        models.TextField: {"widget": Textarea(attrs={"rows": 4, "cols": 80})},
    }

    def colored_badge(self, obj):
        """Display a colored badge for the notification type"""
        if obj.color:
            return format_html(
                '<span style="background-color: {}; color: white; padding: 2px 8px; '
                'border-radius: 4px; font-size: 11px;">{}</span>',
                obj.color,
                obj.icon or "N/A",
            )
        return obj.icon or "N/A"

    colored_badge.short_description = "Icon/Color"

    def get_queryset(self, request):
        return super().get_queryset(request).order_by("category", "name")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin interface for notifications"""

    list_display = [
        "id",
        "title",
        "recipient_info",
        "notification_type",
        "delivery_status",
        "read_status",
        "created_at",
    ]
    list_filter = [
        "notification_type__category",
        "notification_type__priority",
        "is_read",
        "is_expired",
        "delivered_via",
        "created_at",
        "notification_type",
    ]
    search_fields = [
        "title",
        "content",
        "recipient__email",
        "recipient__first_name",
        "recipient__last_name",
        "client__email",
        "client__first_name",
        "client__last_name",
    ]
    readonly_fields = ["created_at", "updated_at", "read_at", "delivered_via", "delivery_attempts"]
    date_hierarchy = "created_at"

    fieldsets = (
        ("Notification Details", {"fields": ("recipient", "notification_type", "title", "content", "action_url")}),
        ("Context & Relations", {"fields": ("event", "client", "context_data"), "classes": ("collapse",)}),
        ("Status", {"fields": ("is_read", "read_at", "expires_at", "is_expired")}),
        ("Delivery Information", {"fields": ("delivered_via", "delivery_attempts"), "classes": ("collapse",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    formfield_overrides = {
        models.TextField: {"widget": Textarea(attrs={"rows": 4, "cols": 80})},
        models.JSONField: {"widget": Textarea(attrs={"rows": 6, "cols": 80})},
    }

    def recipient_info(self, obj):
        """Display recipient information"""
        if obj.recipient:
            return format_html(
                "<strong>{}</strong><br><small>{}</small>", obj.recipient.get_display_name(), obj.recipient.email
            )
        return "N/A"

    recipient_info.short_description = "Recipient"

    def delivery_status(self, obj):
        """Display delivery status with color coding"""
        if not obj.delivered_via:
            return format_html('<span style="color: #d32f2f;">Not Delivered</span>')

        methods = ", ".join(obj.delivered_via)
        return format_html('<span style="color: #2e7d32;">{}</span>', methods.title())

    delivery_status.short_description = "Delivered Via"

    def read_status(self, obj):
        """Display read status with visual indicator"""
        if obj.is_read:
            return format_html(
                '<span style="color: #2e7d32;">✓ Read</span><br><small>{}</small>',
                obj.read_at.strftime("%m/%d %H:%M") if obj.read_at else "",
            )
        elif obj.is_expired:
            return format_html('<span style="color: #d32f2f;">⚠ Expired</span>')
        else:
            return format_html('<span style="color: #ed6c02;">● Unread</span>')

    read_status.short_description = "Status"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("recipient", "notification_type", "event", "client")
            .order_by("-created_at")
        )

    actions = ["mark_as_read", "mark_as_unread"]

    def mark_as_read(self, request, queryset):
        """Mark selected notifications as read"""
        updated = 0
        for notification in queryset.filter(is_read=False):
            notification.mark_as_read()
            updated += 1

        self.message_user(request, f"Successfully marked {updated} notifications as read.")

    mark_as_read.short_description = "Mark selected notifications as read"

    def mark_as_unread(self, request, queryset):
        """Mark selected notifications as unread"""
        now = timezone.now()
        updated = queryset.filter(is_read=True).update(is_read=False, read_at=None, updated_at=now)

        self.message_user(request, f"Successfully marked {updated} notifications as unread.")

    mark_as_unread.short_description = "Mark selected notifications as unread"


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    """Admin interface for notification preferences"""

    list_display = [
        "user_info",
        "email_enabled",
        "sms_enabled",
        "in_app_enabled",
        "marketing_status",
        "digest_frequency",
        "quiet_hours_enabled",
        "disabled_types_count",
    ]
    list_filter = [
        "email_enabled",
        "sms_enabled",
        "in_app_enabled",
        "marketing_email",
        "marketing_sms",
        "digest_frequency",
        "quiet_hours_enabled",
        "created_at",
    ]
    search_fields = ["user__email", "user__first_name", "user__last_name"]
    readonly_fields = ["created_at", "updated_at"]
    filter_horizontal = ["disabled_types"]

    fieldsets = (
        ("User", {"fields": ("user",)}),
        ("Global Settings", {"fields": ("email_enabled", "sms_enabled", "in_app_enabled")}),
        (
            "Category Preferences - Email",
            {
                "fields": (
                    "system_email",
                    "event_email",
                    "task_email",
                    "payment_email",
                    "client_email",
                    "contract_email",
                    "workflow_email",
                    "communication_email",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Category Preferences - SMS",
            {
                "fields": (
                    "system_sms",
                    "event_sms",
                    "task_sms",
                    "payment_sms",
                    "client_sms",
                    "contract_sms",
                    "workflow_sms",
                    "communication_sms",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Category Preferences - In-App",
            {
                "fields": (
                    "system_in_app",
                    "event_in_app",
                    "task_in_app",
                    "payment_in_app",
                    "client_in_app",
                    "contract_in_app",
                    "workflow_in_app",
                    "communication_in_app",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Marketing Preferences (Explicit Consent)",
            {
                "fields": ("marketing_email", "marketing_sms", "marketing_in_app"),
                "description": "Marketing preferences require explicit user consent (GDPR/CAN-SPAM)",
            },
        ),
        (
            "Advanced Settings",
            {"fields": ("digest_frequency", "quiet_hours_enabled", "quiet_hours_start", "quiet_hours_end")},
        ),
        ("Disabled Types", {"fields": ("disabled_types",), "classes": ("collapse",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def user_info(self, obj):
        """Display user information"""
        if obj.user:
            return format_html("<strong>{}</strong><br><small>{}</small>", obj.user.get_display_name(), obj.user.email)
        return "N/A"

    user_info.short_description = "User"

    def marketing_status(self, obj):
        """Display marketing consent status"""
        if obj.marketing_email or obj.marketing_sms:
            channels = []
            if obj.marketing_email:
                channels.append("Email")
            if obj.marketing_sms:
                channels.append("SMS")
            return format_html('<span style="color: #2e7d32;">✓ {}</span>', ", ".join(channels))
        return format_html('<span style="color: #9e9e9e;">Not opted in</span>')

    marketing_status.short_description = "Marketing"

    def disabled_types_count(self, obj):
        """Display count of disabled notification types"""
        count = obj.disabled_types.count()
        if count > 0:
            return format_html('<span style="color: #d32f2f;">{} disabled</span>', count)
        return format_html('<span style="color: #2e7d32;">All enabled</span>')

    disabled_types_count.short_description = "Disabled Types"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user").prefetch_related("disabled_types")


@admin.register(NotificationDigest)
class NotificationDigestAdmin(admin.ModelAdmin):
    """Admin interface for notification digests"""

    list_display = [
        "id",
        "user_info",
        "frequency",
        "period_display",
        "notification_count",
        "delivery_status",
        "created_at",
    ]
    list_filter = ["frequency", "is_sent", "created_at", "sent_at"]
    search_fields = ["user__email", "user__first_name", "user__last_name"]
    readonly_fields = ["created_at", "updated_at", "sent_at", "notification_count"]
    date_hierarchy = "created_at"
    filter_horizontal = ["notifications"]

    fieldsets = (
        ("Digest Information", {"fields": ("user", "frequency", "period_start", "period_end", "notification_count")}),
        ("Delivery Status", {"fields": ("is_sent", "sent_at", "delivery_methods")}),
        ("Notifications", {"fields": ("notifications",), "classes": ("collapse",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def user_info(self, obj):
        """Display user information"""
        if obj.user:
            return format_html("<strong>{}</strong><br><small>{}</small>", obj.user.get_display_name(), obj.user.email)
        return "N/A"

    user_info.short_description = "User"

    def period_display(self, obj):
        """Display the digest period in a readable format"""
        return format_html(
            "<small>{}<br>to<br>{}</small>",
            obj.period_start.strftime("%m/%d %H:%M"),
            obj.period_end.strftime("%m/%d %H:%M"),
        )

    period_display.short_description = "Period"

    def delivery_status(self, obj):
        """Display delivery status"""
        if obj.is_sent:
            methods = ", ".join(obj.delivery_methods) if obj.delivery_methods else "Unknown"
            return format_html('<span style="color: #2e7d32;">✓ Sent</span><br><small>via {}</small>', methods.title())
        else:
            return format_html('<span style="color: #ed6c02;">● Pending</span>')

    delivery_status.short_description = "Status"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user").prefetch_related("notifications")


# Customize admin site header
admin.site.site_header = "LifePlace Notifications Admin"
admin.site.site_title = "Notifications Admin"
admin.site.index_title = "Notification Management"
