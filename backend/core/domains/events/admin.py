# backend/core/domains/events/admin.py
from django.contrib import admin

from .models import Event, EventProductOption, EventType


@admin.register(EventType)
class EventTypeAdmin(admin.ModelAdmin):
    """Admin configuration for EventType model"""
    list_display = ('name', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'is_active')
        }),
    )
    

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    """Admin configuration for Event model"""
    list_display = ('id','name', 'client', 'status', 'event_type', 'start_date', 'payment_status')
    search_fields = ('name', 'client__username', 'lead_source')
    list_filter = ('status', 'event_type', 'payment_status')
    fieldsets = (
        (None, {
            'fields': ('id', 'name', 'client', 'event_type', 'status')
        }),
        ('Date Information', {
            'fields': ('start_date', 'end_date', 'last_contacted')
        }),
        ('Financial Information', {
            'fields': ('total_price', 'payment_status', 'total_amount_due', 'total_amount_paid')
        }),
        ('Workflow', {
            'fields': ('workflow_template', 'current_stage')
        }),
        ('Additional Details', {
            'fields': ('lead_source', 'preferences')
        }),
    )
    readonly_fields = ('id', 'total_amount_paid',)