# backend/core/domains/events/models.py
from core.utils.models import BaseModel
from django.db import models


class EventType(BaseModel):
    """Event types offered by the company"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Event(BaseModel):
    """Core event model tracking client events"""
    EVENT_STATUSES = (
        ('LEAD', 'Lead'),
        ('CONFIRMED', 'Confirmed'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    
    client = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='events')
    event_type = models.ForeignKey(EventType, on_delete=models.PROTECT, null=True, blank=True)
    status = models.CharField(max_length=20, choices=EVENT_STATUSES, default='LEAD')
    name = models.CharField(max_length=255, blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    venue = models.CharField(max_length=255, blank=True)
    
    # Minimal fields to support basic event tracking
    lead_source = models.CharField(max_length=50, blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        event_name = self.name or f"{self.event_type} for {self.client}"
        return f"{event_name} on {self.start_date}"

    class Meta:
        ordering = ['-start_date']