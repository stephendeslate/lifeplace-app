# backend/core/domains/bookingflow/basic_serializers.py
from rest_framework import serializers

from .models import BookingFlow, BookingFlowStep

"""
This module contains minimal serializers for the bookingflow domain models
that are used by other domains to prevent circular imports.
These serializers should be kept simple and only include essential fields.
"""


class BookingFlowBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for the BookingFlow model"""

    event_type_name = serializers.CharField(source="event_type.name", read_only=True)
    total_steps = serializers.SerializerMethodField()

    class Meta:
        model = BookingFlow
        fields = [
            "id",
            "name",
            "description",
            "event_type",
            "event_type_name",
            "is_active",
            "total_steps",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_total_steps(self, obj):
        """Return the total number of enabled steps"""
        return obj.calculate_total_steps()


class BookingFlowStepBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for the BookingFlowStep model"""

    step_type_display = serializers.CharField(source="get_step_type_display", read_only=True)

    class Meta:
        model = BookingFlowStep
        fields = [
            "id",
            "booking_flow",
            "step_type",
            "step_type_display",
            "order",
            "is_enabled",
            "is_required",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
