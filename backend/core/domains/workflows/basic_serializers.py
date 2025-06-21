# backend/core/domains/workflows/basic_serializers.py
from rest_framework import serializers

from .models import WorkflowStage, WorkflowTemplate

"""
This module contains minimal serializers for the workflow domain models
that are used by other domains to prevent circular imports.
These serializers should be kept simple and only include essential fields.
"""

class WorkflowTemplateSerializer(serializers.ModelSerializer):
    """Basic serializer for the WorkflowTemplate model"""
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'description', 'event_type', 
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkflowStageSerializer(serializers.ModelSerializer):
    """Basic serializer for the WorkflowStage model"""
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    
    class Meta:
        model = WorkflowStage
        fields = [
            'id', 'template', 'name', 'stage', 'stage_display', 'order',
            'is_automated', 'automation_type', 'trigger_time', 'email_template',
            'task_description', 'progression_condition', 'required_tasks_completed',
            'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']