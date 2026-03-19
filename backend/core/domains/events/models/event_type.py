from django.db import models

from core.utils.models import BaseModel


class EventType(BaseModel):
    """Event types offered by the company"""

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    color = models.CharField(max_length=7, blank=True, help_text="Hex color code for UI display (e.g., #2d5016)")
    featured_image = models.ImageField(
        upload_to="event_types/images/", null=True, blank=True, help_text="Representative photo for this event type"
    )
    gallery_images = models.JSONField(default=list, blank=True, help_text="List of image URLs for event type gallery")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name
