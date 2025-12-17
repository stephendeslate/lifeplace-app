# backend/core/domains/venues/admin.py
from django.contrib import admin
from .models import Venue, VenueOperatingRules, PackageVenue, VenueBlockedDate


class VenueOperatingRulesInline(admin.StackedInline):
    """Inline admin for operating rules within venue"""
    model = VenueOperatingRules
    can_delete = False
    verbose_name = "Operating Rules"
    verbose_name_plural = "Operating Rules"

    fieldsets = (
        ('Check-in/Checkout', {
            'fields': ('default_check_in_time', 'default_checkout_time', 'checkout_next_day')
        }),
        ('Program Duration', {
            'fields': ('minimum_program_hours', 'maximum_program_hours',
                      'default_program_hours', 'is_fixed_duration')
        }),
        ('Ingress/Egress Buffers', {
            'fields': ('ingress_hours', 'egress_hours',
                      'allow_custom_ingress', 'allow_custom_egress',
                      'min_ingress_hours', 'max_ingress_hours',
                      'min_egress_hours', 'max_egress_hours'),
            'classes': ('collapse',)
        }),
        ('Time Constraints', {
            'fields': ('earliest_start_time', 'latest_end_time',
                      'hard_cutoff_time', 'hard_cutoff_next_day',
                      'early_access_minutes'),
            'classes': ('collapse',)
        }),
        ('Early Check-in', {
            'fields': ('early_checkin_allowed', 'early_checkin_fee_per_hour',
                      'earliest_checkin_time')
        }),
        ('Late Checkout', {
            'fields': ('late_checkout_allowed', 'late_checkout_fee_per_hour',
                      'late_checkout_max_hours', 'latest_checkout_time')
        }),
        ('Custom Rules', {
            'fields': ('custom_rules',),
            'classes': ('collapse',)
        }),
    )


class PackageVenueInline(admin.TabularInline):
    """Inline admin for packages that include this venue"""
    model = PackageVenue
    fk_name = 'venue'
    extra = 0
    readonly_fields = ('package',)
    fields = ('package', 'is_primary', 'access_order', 'access_duration_hours', 'notes')

    def has_add_permission(self, request, obj=None):
        return False  # Add via PackageVenue admin instead


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_overnight', 'maximum_capacity',
                   'is_active', 'is_bookable', 'has_operating_rules', 'sort_order')
    list_filter = ('is_active', 'is_bookable', 'is_overnight')
    search_fields = ('name', 'code', 'description')
    list_editable = ('is_active', 'is_bookable', 'sort_order')
    ordering = ('sort_order', 'name')

    fieldsets = (
        (None, {
            'fields': ('name', 'code', 'description', 'is_overnight')
        }),
        ('Capacity', {
            'fields': ('minimum_capacity', 'maximum_capacity', 'recommended_capacity')
        }),
        ('Status', {
            'fields': ('is_active', 'is_bookable')
        }),
        ('Display', {
            'fields': ('location_description', 'featured_image', 'gallery_images', 'sort_order'),
            'classes': ('collapse',)
        }),
    )

    inlines = [VenueOperatingRulesInline, PackageVenueInline]

    def has_operating_rules(self, obj):
        return hasattr(obj, 'venue_operating_rules')
    has_operating_rules.boolean = True
    has_operating_rules.short_description = 'Has Rules'


@admin.register(VenueOperatingRules)
class VenueOperatingRulesAdmin(admin.ModelAdmin):
    list_display = ('venue', 'default_check_in_time', 'default_checkout_time',
                   'checkout_next_day', 'is_fixed_duration',
                   'early_checkin_allowed', 'late_checkout_allowed')
    list_filter = ('checkout_next_day', 'is_fixed_duration',
                  'early_checkin_allowed', 'late_checkout_allowed')
    search_fields = ('venue__name', 'venue__code')

    fieldsets = (
        (None, {
            'fields': ('venue',)
        }),
        ('Check-in/Checkout', {
            'fields': ('default_check_in_time', 'default_checkout_time', 'checkout_next_day')
        }),
        ('Program Duration', {
            'fields': ('minimum_program_hours', 'maximum_program_hours',
                      'default_program_hours', 'is_fixed_duration')
        }),
        ('Ingress/Egress Buffers', {
            'fields': ('ingress_hours', 'egress_hours',
                      'allow_custom_ingress', 'allow_custom_egress',
                      'min_ingress_hours', 'max_ingress_hours',
                      'min_egress_hours', 'max_egress_hours')
        }),
        ('Time Constraints', {
            'fields': ('earliest_start_time', 'latest_end_time',
                      'hard_cutoff_time', 'hard_cutoff_next_day',
                      'early_access_minutes')
        }),
        ('Early Check-in', {
            'fields': ('early_checkin_allowed', 'early_checkin_fee_per_hour',
                      'earliest_checkin_time')
        }),
        ('Late Checkout', {
            'fields': ('late_checkout_allowed', 'late_checkout_fee_per_hour',
                      'late_checkout_max_hours', 'latest_checkout_time')
        }),
        ('Custom Rules', {
            'fields': ('custom_rules',)
        }),
    )


@admin.register(PackageVenue)
class PackageVenueAdmin(admin.ModelAdmin):
    list_display = ('package', 'venue', 'is_primary', 'access_order',
                   'access_duration_hours')
    list_filter = ('is_primary', 'venue', 'package__is_active')
    search_fields = ('package__name', 'venue__name', 'notes')
    list_editable = ('is_primary', 'access_order')
    ordering = ('package__name', 'access_order')
    autocomplete_fields = ['package', 'venue']

    fieldsets = (
        (None, {
            'fields': ('package', 'venue')
        }),
        ('Configuration', {
            'fields': ('is_primary', 'access_order', 'access_duration_hours', 'notes')
        }),
    )


@admin.register(VenueBlockedDate)
class VenueBlockedDateAdmin(admin.ModelAdmin):
    list_display = ('venue', 'date', 'reason', 'is_full_day',
                   'blocked_start_time', 'blocked_end_time', 'created_by')
    list_filter = ('venue', 'is_full_day', 'date')
    search_fields = ('venue__name', 'reason')
    date_hierarchy = 'date'
    ordering = ('-date',)

    fieldsets = (
        (None, {
            'fields': ('venue', 'date', 'reason')
        }),
        ('Time Block', {
            'fields': ('is_full_day', 'blocked_start_time', 'blocked_end_time')
        }),
    )

    readonly_fields = ('created_by',)

    def save_model(self, request, obj, form, change):
        if not change:  # New object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
