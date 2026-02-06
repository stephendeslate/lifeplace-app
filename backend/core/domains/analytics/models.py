# backend/core/domains/analytics/models.py
"""
Analytics snapshot models for historical KPI tracking.
"""
from django.db import models
from core.utils.models import BaseModel


class DailyKPISnapshot(BaseModel):
    """
    Daily snapshot of business KPIs.
    One record per day, populated by Celery beat task.
    Enables historical trend tracking and resume-worthy metrics.
    """
    date = models.DateField(unique=True, db_index=True)

    # Booking counts (from DashboardService.get_kpi_summary)
    total_bookings = models.PositiveIntegerField(default=0)
    confirmed_bookings = models.PositiveIntegerField(default=0)
    completed_bookings = models.PositiveIntegerField(default=0)
    cancelled_bookings = models.PositiveIntegerField(default=0)

    # Revenue
    event_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    avg_booking_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Client acquisition
    new_clients = models.PositiveIntegerField(default=0)

    # Booking flow conversion
    booking_sessions = models.PositiveIntegerField(default=0)
    completed_sessions = models.PositiveIntegerField(default=0)
    conversion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Cumulative (running totals)
    cumulative_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cumulative_bookings = models.PositiveIntegerField(default=0)
    cumulative_clients = models.PositiveIntegerField(default=0)

    # Day-over-day changes
    revenue_change_pct = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True
    )
    bookings_change_pct = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True
    )

    # Raw service output for future-proofing
    raw_kpi_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-date']
        verbose_name = 'Daily KPI Snapshot'
        verbose_name_plural = 'Daily KPI Snapshots'

    def __str__(self):
        return f"KPI Snapshot {self.date}: {self.total_bookings} bookings, ${self.total_revenue} revenue"
