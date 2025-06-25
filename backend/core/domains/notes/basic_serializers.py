# core/domains/notes/basic_serializers.py
from rest_framework import serializers

from .models import Note


class BasicNoteSerializer(serializers.ModelSerializer):
    """Basic serializer for Note model for cross-domain references"""
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Note
        fields = [
            'id', 'title', 'content', 'created_at', 'updated_at', 
            'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'created_by_name']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None