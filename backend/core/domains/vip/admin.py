# backend/core/domains/vip/admin.py
from django.contrib import admin

from .models import (
    ClientVIPStatus,
    VIPBenefit,
    VIPPointTransaction,
    VIPRewardRedemption,
    VIPSettings,
    VIPTier,
    VIPTierHistory,
)


@admin.register(VIPSettings)
class VIPSettingsAdmin(admin.ModelAdmin):
    list_display = ["is_program_enabled", "program_name", "expiration_type"]
    fieldsets = (
        ("Program Settings", {"fields": ("is_program_enabled", "program_name")}),
        (
            "Earning Methods",
            {
                "fields": (
                    "earning_automatic_enabled",
                    "earning_points_enabled",
                    "earning_manual_enabled",
                    "automatic_earning_type",
                )
            },
        ),
        (
            "Points Configuration",
            {
                "fields": (
                    "points_per_currency_spent",
                    "points_currency_unit",
                    "points_expiry_months",
                )
            },
        ),
        ("Expiration Settings", {"fields": ("expiration_type", "expiration_months")}),
        (
            "Client Visibility",
            {
                "fields": (
                    "show_vip_status_to_client",
                    "show_tier_progress_to_client",
                    "show_available_rewards_to_client",
                    "show_points_balance_to_client",
                )
            },
        ),
    )

    def has_add_permission(self, request):
        # Only allow one instance (singleton)
        return not VIPSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(VIPTier)
class VIPTierAdmin(admin.ModelAdmin):
    list_display = ["name", "level", "is_default", "is_active", "min_total_spent", "min_completed_bookings"]
    list_filter = ["is_active", "is_default"]
    search_fields = ["name", "description"]
    ordering = ["level"]
    prepopulated_fields = {"slug": ("name",)}


class VIPBenefitInline(admin.TabularInline):
    model = VIPBenefit
    extra = 1


@admin.register(VIPBenefit)
class VIPBenefitAdmin(admin.ModelAdmin):
    list_display = ["tier", "benefit_type", "application_mode", "value", "is_active"]
    list_filter = ["tier", "benefit_type", "application_mode", "is_active"]
    search_fields = ["display_name", "description"]
    filter_horizontal = ["applicable_products"]


@admin.register(ClientVIPStatus)
class ClientVIPStatusAdmin(admin.ModelAdmin):
    list_display = ["client", "current_tier", "status", "points_balance", "total_spent", "completed_bookings_count"]
    list_filter = ["status", "current_tier"]
    search_fields = ["client__email", "client__first_name", "client__last_name"]
    readonly_fields = ["lifetime_points_earned", "lifetime_points_spent", "last_activity_at"]
    raw_id_fields = ["client", "assigned_by"]


@admin.register(VIPPointTransaction)
class VIPPointTransactionAdmin(admin.ModelAdmin):
    list_display = ["client_vip_status", "transaction_type", "points", "balance_after", "created_at"]
    list_filter = ["transaction_type", "created_at"]
    search_fields = ["client_vip_status__client__email", "description"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["client_vip_status", "event", "payment", "performed_by"]


@admin.register(VIPRewardRedemption)
class VIPRewardRedemptionAdmin(admin.ModelAdmin):
    list_display = ["client_vip_status", "benefit", "event", "status", "points_spent", "created_at"]
    list_filter = ["status", "benefit__benefit_type"]
    search_fields = ["client_vip_status__client__email"]
    raw_id_fields = ["client_vip_status", "benefit", "event"]


@admin.register(VIPTierHistory)
class VIPTierHistoryAdmin(admin.ModelAdmin):
    list_display = ["client_vip_status", "from_tier", "to_tier", "reason", "created_at"]
    list_filter = ["reason", "created_at"]
    search_fields = ["client_vip_status__client__email", "notes"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["client_vip_status", "changed_by"]
