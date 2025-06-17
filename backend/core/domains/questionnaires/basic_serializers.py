# backend/core/domains/questionnaires/basic_serializers.py
from rest_framework import serializers

from .models import Questionnaire, QuestionnaireField

"""
This module contains minimal serializers for the questionnaire domain models
that are used by other domains to prevent circular imports.
These serializers should be kept simple and only include essential fields.
"""

class QuestionnaireBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for the Questionnaire model"""
    
    class Meta:
        model = Questionnaire
        fields = [
            'id', 'name', 'event_type', 'is_active', 
            'order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuestionnaireFieldBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for the QuestionnaireField model"""
    
    class Meta:
        model = QuestionnaireField
        fields = [
            'id', 'questionnaire', 'name', 'type', 
            'required', 'order', 'options', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']