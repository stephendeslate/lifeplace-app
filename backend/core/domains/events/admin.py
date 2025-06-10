# backend/core/domains/events/admin.py
from django.contrib import admin
from .models import Event, EventType


@admin.register(EventType)
class EventTypeAdmin(admin.ModelAdmin):
    """Admin configuration for EventType model"""
    list_display = ('name', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    """Admin configuration for Event model"""
    list_display = ('name', 'status', 'client', 'start_date')
    list_filter = ('status', 'event_type')
    search_fields = ('name', 'client__first_name', 'client__last_name', 'client__email')
    date_hierarchy = 'start_date'