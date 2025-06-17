# backend/core/domains/events/serializers.py
from rest_framework import serializers
from .models import Event


class EventSerializer(serializers.ModelSerializer):
    """Basic serializer for the Event model - used by client serializer"""
    event_type_name = serializers.CharField(source='event_type.name', read_only=True)
    client_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'client', 'client_name', 'event_type', 'event_type_name', 'name',
            'status', 'start_date', 'end_date', 'venue', 'lead_source', 'total_price',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_client_name(self, obj):
        if obj.client:
            return f"{obj.client.first_name} {obj.client.last_name}"
        return None