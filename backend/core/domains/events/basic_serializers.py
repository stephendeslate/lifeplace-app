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
    
    class Meta:
        model = EventType
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']