# core/domains/notes/serializers.py
from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from .basic_serializers import BasicNoteSerializer
from .exceptions import InvalidContentType
from .models import Note


class NoteSerializer(BasicNoteSerializer):
    """Full serializer for Note model"""
    content_type_name = serializers.SerializerMethodField()
    content_object_repr = serializers.SerializerMethodField()
    
    class Meta(BasicNoteSerializer.Meta):
        fields = BasicNoteSerializer.Meta.fields + [
            'content_type', 'object_id', 'content_type_name', 'content_object_repr'
        ]
        read_only_fields = BasicNoteSerializer.Meta.read_only_fields + [
            'content_type_name', 'content_object_repr'
        ]
    
    def get_content_type_name(self, obj):
        return obj.content_type.model.capitalize() if obj.content_type else None
    
    def get_content_object_repr(self, obj):
        if hasattr(obj.content_object, '__str__'):
            return str(obj.content_object)
        return f"ID: {obj.object_id}"

class NoteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a note"""
    content_type_model = serializers.CharField(write_only=True)
    object_id = serializers.IntegerField()
    
    class Meta:
        model = Note
        fields = ['title', 'content', 'content_type_model', 'object_id']
    
    def validate(self, attrs):
        content_type_model = attrs.pop('content_type_model', None)
        
        # Map content_type_model aliases to actual model names
        content_type_mapping = {
            'client': 'user',  # 'client' is actually a User model with role 'CLIENT'
            'event': 'event',  # Keep this for clarity
        }
        
        # Check if we need to map the content type
        if content_type_model in content_type_mapping:
            content_type_model = content_type_mapping[content_type_model]
        
        # Validate the content type exists
        try:
            content_type = ContentType.objects.get(model=content_type_model.lower())
            attrs['content_type'] = content_type  # Add this to the validated data
        except ContentType.DoesNotExist:
            raise InvalidContentType(f"Content type '{content_type_model}' does not exist")
        
        return attrs
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)