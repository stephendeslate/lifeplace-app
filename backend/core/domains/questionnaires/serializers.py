# backend/core/domains/questionnaires/serializers.py
from core.domains.events.basic_serializers import EventTypeSerializer
from rest_framework import serializers

from .exceptions import InvalidFieldType, OptionsRequired
from .models import Questionnaire, QuestionnaireField, QuestionnaireResponse


class QuestionnaireFieldSerializer(serializers.ModelSerializer):
    """Serializer for the QuestionnaireField model"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = QuestionnaireField
        fields = [
            'id', 'questionnaire', 'name', 'type', 'type_display',
            'required', 'order', 'options', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate field data based on field type"""
        field_type = data.get('type')
        options = data.get('options')
        
        # Make sure select and multi-select have options
        if field_type in ['select', 'multi-select'] and (not options or len(options) == 0):
            raise OptionsRequired()
        
        # Make sure field type is valid
        valid_types = [choice[0] for choice in QuestionnaireField.FIELD_TYPES]
        if field_type not in valid_types:
            raise InvalidFieldType(detail=f"Field type must be one of: {', '.join(valid_types)}")
        
        return data


class QuestionnaireSerializer(serializers.ModelSerializer):
    """Serializer for the Questionnaire model"""
    fields_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Questionnaire
        fields = [
            'id', 'name', 'event_type', 'is_active', 
            'order', 'created_at', 'updated_at', 'fields_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'fields_count']
    
    def get_fields_count(self, obj):
        """Get the number of fields for this questionnaire"""
        return obj.fields.count()


class QuestionnaireDetailSerializer(QuestionnaireSerializer):
    """Detailed serializer for Questionnaire including related fields"""
    fields = QuestionnaireFieldSerializer(many=True, read_only=True)
    event_type = EventTypeSerializer(read_only=True)
    
    class Meta(QuestionnaireSerializer.Meta):
        fields = QuestionnaireSerializer.Meta.fields + ['fields']


# Modified serializer class to fix the issue
class QuestionnaireFieldCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating questionnaire fields - without requiring questionnaire"""
    class Meta:
        model = QuestionnaireField
        fields = ['name', 'type', 'required', 'order', 'options']
    
    def validate(self, data):
        """Validate field data based on field type"""
        field_type = data.get('type')
        options = data.get('options')
        
        # Make sure select and multi-select have options
        if field_type in ['select', 'multi-select'] and (not options or len(options) == 0):
            raise OptionsRequired()
        
        # Make sure field type is valid
        valid_types = [choice[0] for choice in QuestionnaireField.FIELD_TYPES]
        if field_type not in valid_types:
            raise InvalidFieldType(detail=f"Field type must be one of: {', '.join(valid_types)}")
        
        return data


class QuestionnaireWithFieldsSerializer(QuestionnaireSerializer):
    """Serializer for creating/updating Questionnaire with nested fields"""
    fields = QuestionnaireFieldCreateSerializer(many=True, required=False)
    
    class Meta(QuestionnaireSerializer.Meta):
        fields = QuestionnaireSerializer.Meta.fields + ['fields']
    
    def create(self, validated_data):
        fields_data = validated_data.pop('fields', [])
        questionnaire = Questionnaire.objects.create(**validated_data)
        
        # Create nested fields
        for field_data in fields_data:
            # Don't need to add questionnaire here - will be done in create
            QuestionnaireField.objects.create(questionnaire=questionnaire, **field_data)
        
        return questionnaire
    
    def update(self, instance, validated_data):
        fields_data = validated_data.pop('fields', None)
        
        # Update questionnaire fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update fields if provided
        if fields_data is not None:
            # Clear existing fields and create new ones
            instance.fields.all().delete()
            for field_data in fields_data:
                QuestionnaireField.objects.create(questionnaire=instance, **field_data)
        
        return instance


class QuestionnaireResponseSerializer(serializers.ModelSerializer):
    """Serializer for the QuestionnaireResponse model"""
    field_name = serializers.CharField(source='field.name', read_only=True)
    field_type = serializers.CharField(source='field.type', read_only=True)
    
    class Meta:
        model = QuestionnaireResponse
        fields = [
            'id', 'event', 'field', 'field_name', 'field_type',
            'value', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate response value against field type"""
        field = data.get('field')
        value = data.get('value')
        
        # Implement validation logic based on field type
        # This would check that the value matches expected format for the field type
        # For example: dates are valid dates, emails are valid emails, etc.
        # For simplicity, omitting detailed validation here
        
        return data


class EventQuestionnaireResponsesSerializer(serializers.Serializer):
    """Serializer for submitting multiple responses for an event"""
    event = serializers.IntegerField()
    responses = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        )
    )