# backend/core/domains/settings/admin.py

from django.contrib import admin

from .models import AppSettings, CurrencySettings, LegalDocument, MobileAppVersion


@admin.register(AppSettings)
class AppSettingsAdmin(admin.ModelAdmin):
    list_display = ("category", "key", "description", "user", "is_encrypted", "created_at", "updated_at")
    list_filter = ("category", "is_encrypted", "user")
    search_fields = ("key", "description")
    date_hierarchy = "created_at"
    ordering = ("category", "key")
    readonly_fields = ("id", "created_at", "updated_at")

    fieldsets = (
        ("Basic Information", {"fields": ("category", "key", "description", "user")}),
        ("Value", {"fields": ("value", "is_encrypted", "encrypted_value")}),
        ("Metadata", {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(CurrencySettings)
class CurrencySettingsAdmin(admin.ModelAdmin):
    list_display = ("default_currency", "display_format", "decimal_places", "user", "created_at", "updated_at")
    list_filter = ("default_currency", "display_format", "user")
    search_fields = ("default_currency",)
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at")

    fieldsets = (
        ("Currency Configuration", {"fields": ("default_currency", "enabled_currencies", "user")}),
        (
            "Display Settings",
            {"fields": ("display_format", "decimal_places", "thousands_separator", "decimal_separator")},
        ),
        ("Behavior Settings", {"fields": ("auto_format", "compact_format")}),
        ("Metadata", {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(LegalDocument)
class LegalDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "document_type",
        "title",
        "version",
        "effective_date",
        "is_published",
        "last_updated_by",
        "updated_at",
    )
    list_filter = ("document_type", "is_published", "effective_date")
    search_fields = ("title", "content", "version")
    date_hierarchy = "updated_at"
    ordering = ("document_type",)
    readonly_fields = ("id", "created_at", "updated_at", "last_updated_by")

    fieldsets = (
        ("Document Information", {"fields": ("document_type", "title", "version", "effective_date")}),
        ("Content", {"fields": ("content",), "classes": ("wide",)}),
        ("Publishing", {"fields": ("is_published",)}),
        ("Metadata", {"fields": ("id", "last_updated_by", "created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("last_updated_by")

    def has_add_permission(self, request):
        # Allow only if not all document types are created
        existing_types = LegalDocument.objects.values_list("document_type", flat=True)
        all_types = [choice[0] for choice in LegalDocument.DOCUMENT_TYPE_CHOICES]
        return len(existing_types) < len(all_types)

    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of legal documents
        return False


@admin.register(MobileAppVersion)
class MobileAppVersionAdmin(admin.ModelAdmin):
    list_display = [
        "platform",
        "latest_version",
        "minimum_required_version",
        "recommended_version",
        "is_active",
        "is_maintenance_mode",
        "updated_at",
    ]
    list_filter = ["platform", "is_active", "is_maintenance_mode"]
    search_fields = ["platform", "latest_version"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["platform", "-created_at"]

    fieldsets = (
        ("Platform", {"fields": ("platform", "is_active")}),
        ("Version Numbers", {"fields": ("minimum_required_version", "recommended_version", "latest_version")}),
        ("Store URLs", {"fields": ("ios_store_url", "android_store_url")}),
        ("Update Messages", {"fields": ("update_title", "update_message", "force_title", "force_message")}),
        (
            "Deprecation",
            {"fields": ("deprecation_date", "sunset_date", "deprecation_message"), "classes": ("collapse",)},
        ),
        (
            "Maintenance Mode",
            {"fields": ("is_maintenance_mode", "maintenance_message", "maintenance_end"), "classes": ("collapse",)},
        ),
        ("Feature Flags", {"fields": ("feature_flags",), "classes": ("collapse",)}),
        ("Metadata", {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)}),
    )
