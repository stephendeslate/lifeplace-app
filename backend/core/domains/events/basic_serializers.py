# backend/core/domains/events/basic_serializers.py
from rest_framework import serializers

from .models import EventType

"""
This module contains minimal serializers for the event domain models
that are used by other domains to prevent circular imports.
These serializers should be kept simple and only include essential fields.
"""


class EventTypeSerializer(serializers.ModelSerializer):
    """Basic serializer for the EventType model"""

    gallery_images = serializers.SerializerMethodField()

    class Meta:
        model = EventType
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "color",
            "featured_image",
            "gallery_images",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_gallery_images(self, obj):
        """Return absolute URLs for gallery images"""
        if not obj.gallery_images:
            return []
        request = self.context.get("request")
        if request:
            return [request.build_absolute_uri(url) if url.startswith("/") else url for url in obj.gallery_images]
        return obj.gallery_images
