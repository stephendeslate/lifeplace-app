# backend/core/domains/analytics/admin.py
"""Admin interface for analytics snapshot models."""
from django.contrib import admin
from .models import DailyKPISnapshot


@admin.register(DailyKPISnapshot)
class DailyKPISnapshotAdmin(admin.ModelAdmin):
    list_display = [
        'date',
        'total_bookings',
        'confirmed_bookings',
        'total_revenue',
        'new_clients',
        'conversion_rate',
        'cumulative_revenue',
    ]
    list_filter = [
        ('date', admin.DateFieldListFilter),
    ]
    readonly_fields = [
        'date',
        'total_bookings',
        'confirmed_bookings',
        'completed_bookings',
        'cancelled_bookings',
        'event_revenue',
        'total_revenue',
        'avg_booking_value',
        'new_clients',
        'booking_sessions',
        'completed_sessions',
        'conversion_rate',
        'cumulative_revenue',
        'cumulative_bookings',
        'cumulative_clients',
        'revenue_change_pct',
        'bookings_change_pct',
        'raw_kpi_data',
        'created_at',
        'updated_at',
    ]
    fieldsets = (
        ('Date', {
            'fields': ('date',)
        }),
        ('Booking Metrics', {
            'fields': (
                'total_bookings',
                'confirmed_bookings',
                'completed_bookings',
                'cancelled_bookings',
            )
        }),
        ('Revenue', {
            'fields': (
                'event_revenue',
                'total_revenue',
                'avg_booking_value',
            )
        }),
        ('Clients & Conversion', {
            'fields': (
                'new_clients',
                'booking_sessions',
                'completed_sessions',
                'conversion_rate',
            )
        }),
        ('Cumulative Totals', {
            'fields': (
                'cumulative_revenue',
                'cumulative_bookings',
                'cumulative_clients',
            )
        }),
        ('Day-over-Day Changes', {
            'fields': (
                'revenue_change_pct',
                'bookings_change_pct',
            ),
            'classes': ('collapse',),
        }),
        ('Raw Data', {
            'fields': ('raw_kpi_data',),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    ordering = ['-date']
    date_hierarchy = 'date'
