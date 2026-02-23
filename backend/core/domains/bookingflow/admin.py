# backend/core/domains/bookingflow/admin.py

from django.contrib import admin

from core.domains.bookingflow.models import (
    BookingFlow,
    BookingFlowStep,
    PackageSelectionStepConfiguration,
    VenueSelectionStepConfiguration,
)
from core.domains.communications.models import CommunicationTemplate


@admin.register(BookingFlow)
class BookingFlowAdmin(admin.ModelAdmin):
    list_display = ("name", "confirmation_email_template_name")
    actions = ["fix_confirmation_email_template"]

    def confirmation_email_template_name(self, obj):
        return obj.confirmation_email_template.name if obj.confirmation_email_template else "None"

    confirmation_email_template_name.short_description = "Email Template"

    def fix_confirmation_email_template(self, request, queryset):
        # Get or create the Booking Confirmation template
        booking_conf_template, created = CommunicationTemplate.objects.get_or_create(
            name="Booking Confirmation",
            defaults={
                "channel": "EMAIL",
                "category": "SYSTEM",
                "is_system": True,
                "subject_template": "Booking Confirmed - {{ event_type }}",
                "body_template": """[Copy the HTML body from the script here]""",
                "variables_schema": {
                    "required": ["client_name", "booking_reference", "event_type", "event_date", "event_time"],
                    "optional": ["duration", "total_price", "selected_packages", "selected_addons", "dashboard_url"],
                },
            },
        )

        # Update selected BookingFlows with no template or using 'Welcome Email'
        count1 = queryset.filter(confirmation_email_template__isnull=True).update(
            confirmation_email_template=booking_conf_template
        )
        count2 = queryset.filter(confirmation_email_template__name="Welcome Email").update(
            confirmation_email_template=booking_conf_template
        )

        # Display results
        total_fixed = count1 + count2
        self.message_user(
            request,
            f"Fixed {count1} BookingFlow(s) with no template and {count2} using 'Welcome Email'. "
            f"Total: {total_fixed} flows updated.",
        )

    fix_confirmation_email_template.short_description = "Fix Confirmation Email Template"


@admin.register(BookingFlowStep)
class BookingFlowStepAdmin(admin.ModelAdmin):
    list_display = ("step_type", "booking_flow", "order", "is_enabled")
    list_filter = ("booking_flow", "step_type", "is_enabled")
    ordering = ("booking_flow", "order")


@admin.register(VenueSelectionStepConfiguration)
class VenueSelectionStepConfigurationAdmin(admin.ModelAdmin):
    list_display = ("step", "min_venues", "max_venues", "show_pricing", "bundle_discount_percent")
    list_filter = ("show_pricing", "show_bundle_discount")
    filter_horizontal = ("available_venues",)


@admin.register(PackageSelectionStepConfiguration)
class PackageSelectionStepConfigurationAdmin(admin.ModelAdmin):
    list_display = ("step", "selection_type", "min_selection", "max_selection", "filter_by_event_type", "show_pricing")
    list_filter = ("selection_type", "filter_by_event_type", "show_pricing", "enable_comparison")
    filter_horizontal = ("available_categories", "available_packages")
    fieldsets = (
        (None, {"fields": ("step",)}),
        (
            "Product Filtering",
            {
                "fields": ("available_categories", "available_packages"),
                "description": "Limit which packages are shown. Leave empty to show all packages.",
            },
        ),
        ("Selection Behavior", {"fields": ("selection_type", "min_selection", "max_selection")}),
        (
            "Event Type Filtering",
            {
                "fields": ("filter_by_event_type",),
                "description": "When enabled, only packages associated with the booking flow's event type are shown. "
                "Packages with no event types are hidden when this is enabled.",
            },
        ),
        ("Display Options", {"fields": ("show_pricing", "show_descriptions", "show_images", "enable_comparison")}),
        ("Dynamic Pricing", {"fields": ("enable_dynamic_pricing", "pricing_factors"), "classes": ("collapse",)}),
    )
