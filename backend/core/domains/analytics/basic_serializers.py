# backend/core/domains/analytics/basic_serializers.py
from rest_framework import serializers

from .models import MetricDefinition, Dashboard, Widget, AnalyticsReport

"""
This module contains minimal serializers for the analytics domain models
that are used by other domains to prevent circular imports.
These serializers should be kept simple and only include essential fields.
"""


class MetricDefinitionBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for the MetricDefinition model"""
    
    class Meta:
        model = MetricDefinition
        fields = [
            'id', 'name', 'description', 'metric_type', 
            'display_format', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class DashboardBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for the Dashboard model"""
    
    class Meta:
        model = Dashboard
        fields = [
            'id', 'name', 'description', 'dashboard_type', 
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class WidgetBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for the Widget model"""
    
    class Meta:
        model = Widget
        fields = [
            'id', 'title', 'widget_type', 'size', 
            'is_visible', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AnalyticsReportBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for the AnalyticsReport model"""
    
    class Meta:
        model = AnalyticsReport
        fields = [
            'id', 'name', 'description', 'report_type', 
            'is_active', 'last_generated', 'created_at'
        ]
        read_only_fields = ['id', 'last_generated', 'created_at']