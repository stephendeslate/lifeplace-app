from decimal import Decimal

from django.db import models

from core.utils.models import BaseModel

from .flow import BookingFlow


class BookingFlowAnalytics(BaseModel):
    """
    Analytics and tracking for booking flow performance
    """

    booking_flow = models.ForeignKey(BookingFlow, on_delete=models.CASCADE, related_name="analytics")
    date = models.DateField()

    # Conversion metrics
    total_sessions = models.PositiveIntegerField(default=0)
    completed_bookings = models.PositiveIntegerField(default=0)
    abandoned_sessions = models.PositiveIntegerField(default=0)
    conversion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))

    # Step analytics
    step_completion_data = models.JSONField(default=dict, help_text="Completion rates for each step")
    step_drop_off_data = models.JSONField(default=dict, help_text="Drop-off rates for each step")

    # Revenue metrics
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    average_booking_value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

    # Performance metrics
    average_completion_time = models.DurationField(null=True, blank=True)
    bounce_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ["-date"]
        unique_together = [["booking_flow", "date"]]

    def __str__(self):
        return f"Analytics for {self.booking_flow.name} on {self.date}"
