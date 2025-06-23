# backend/core/domains/bookingflow/basic_serializers.py
from rest_framework import serializers

from .models import BookingFlowConfig, BookingFlowItem


class BasicBookingFlowConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingFlowConfig
        fields = ['id', 'name', 'event_type', 'is_active']


class BasicBookingFlowItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingFlowItem
        fields = ['id', 'type', 'order', 'is_visible', 'is_required']