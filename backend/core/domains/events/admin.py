# backend/core/domains/events/admin.py
from django.contrib import admin

from .models import Event, EventType


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
    list_display = ('name', 'status', 'client')
    search_fields = ('name', 'client')
    fieldsets = (
        (None, {
            'fields': ('name', 'status', 'client')
        }),
    )