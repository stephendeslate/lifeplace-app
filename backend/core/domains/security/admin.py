# core/domains/security/admin.py

from django.contrib import admin
from .models import SecurityBreach, BreachNotification, AffectedUser


class BreachNotificationInline(admin.TabularInline):
    model = BreachNotification
    extra = 0
    readonly_fields = ['sent_at', 'delivery_status', 'notification_type', 'recipient']
    fields = ['notification_type', 'recipient', 'delivery_status', 'sent_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class AffectedUserInline(admin.TabularInline):
    model = AffectedUser
    extra = 0
    readonly_fields = ['notified', 'notified_at', 'data_exposed']
    fields = ['user', 'data_exposed', 'notified', 'notified_at']
    raw_id_fields = ['user']
    can_delete = False


@admin.register(SecurityBreach)
class SecurityBreachAdmin(admin.ModelAdmin):
    list_display = [
        'breach_id', 'title', 'severity', 'status',
        'detected_at', 'affected_users_count', 'npc_notified',
        'hours_since_detection_display'
    ]
    list_filter = ['severity', 'status', 'breach_type', 'npc_notified', 'involves_spi']
    search_fields = ['breach_id', 'title', 'description']
    readonly_fields = ['breach_id', 'created_at', 'updated_at', 'hours_since_detection_display']
    date_hierarchy = 'detected_at'
    ordering = ['-detected_at']
    inlines = [AffectedUserInline, BreachNotificationInline]

    fieldsets = (
        ('Identification', {
            'fields': ('breach_id', 'title', 'description')
        }),
        ('Classification', {
            'fields': ('breach_type', 'severity', 'status')
        }),
        ('Timeline', {
            'fields': ('detected_at', 'confirmed_at', 'contained_at', 'resolved_at', 'hours_since_detection_display')
        }),
        ('Impact Assessment', {
            'fields': ('affected_users_count', 'affected_records_count', 'involves_spi', 'data_types_affected')
        }),
        ('Root Cause Analysis', {
            'fields': ('attack_vector', 'vulnerabilities_exploited'),
            'classes': ('collapse',)
        }),
        ('Response', {
            'fields': ('containment_actions', 'remediation_steps', 'prevention_measures'),
            'classes': ('collapse',)
        }),
        ('NPC Notification', {
            'fields': ('npc_notified', 'npc_notified_at', 'npc_reference_number')
        }),
        ('User Notification', {
            'fields': ('users_notified', 'users_notified_at')
        }),
        ('Assignment', {
            'fields': ('incident_lead',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def hours_since_detection_display(self, obj):
        hours = obj.hours_since_detection()
        if hours >= 72 and not obj.npc_notified:
            return f"{hours:.1f}h (OVERDUE!)"
        elif hours >= 48 and not obj.npc_notified:
            return f"{hours:.1f}h (WARNING)"
        return f"{hours:.1f}h"
    hours_since_detection_display.short_description = 'Hours Since Detection'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('incident_lead')

    actions = ['mark_as_investigating', 'mark_as_contained', 'mark_as_resolved']

    def mark_as_investigating(self, request, queryset):
        queryset.update(status='INVESTIGATING')
    mark_as_investigating.short_description = "Mark selected breaches as Under Investigation"

    def mark_as_contained(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='CONTAINED', contained_at=timezone.now())
    mark_as_contained.short_description = "Mark selected breaches as Contained"

    def mark_as_resolved(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='RESOLVED', resolved_at=timezone.now())
    mark_as_resolved.short_description = "Mark selected breaches as Resolved"


@admin.register(BreachNotification)
class BreachNotificationAdmin(admin.ModelAdmin):
    list_display = ['breach', 'notification_type', 'recipient', 'delivery_status', 'sent_at']
    list_filter = ['notification_type', 'delivery_status']
    search_fields = ['breach__breach_id', 'recipient']
    readonly_fields = ['breach', 'notification_type', 'recipient', 'sent_at', 'content', 'delivery_status']
    date_hierarchy = 'sent_at'
    ordering = ['-sent_at']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AffectedUser)
class AffectedUserAdmin(admin.ModelAdmin):
    list_display = ['breach', 'user', 'notified', 'notified_at']
    list_filter = ['notified', 'breach__breach_id']
    search_fields = ['breach__breach_id', 'user__email']
    readonly_fields = ['breach', 'user', 'data_exposed', 'notified', 'notified_at', 'created_at', 'updated_at']
    raw_id_fields = ['breach', 'user']
    ordering = ['-created_at']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
