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
    stages_count = serializers.SerializerMethodField()
    events_using_count = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'description', 'event_type',
            'is_active', 'lead_stage_auto_stop',
            'stages_count', 'events_using_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_stages_count(self, obj):
        """Return the count of stages for this template"""
        return obj.stages.count()

    def get_events_using_count(self, obj):
        """Return the count of non-completed events using this template"""
        return obj.event_set.exclude(status='COMPLETED').count()


class WorkflowStageSerializer(serializers.ModelSerializer):
    """Basic serializer for the WorkflowStage model"""
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    trigger_after_stage_name = serializers.CharField(
        source='trigger_after_stage.name',
        read_only=True,
        allow_null=True
    )
    # Make order optional for create - service will auto-assign if not provided
    order = serializers.IntegerField(required=False)

    class Meta:
        model = WorkflowStage
        fields = [
            'id', 'template', 'name', 'stage', 'stage_display', 'order',
            'is_automated', 'automation_type', 'trigger_time',
            'trigger_after_stage', 'trigger_after_stage_name',  # New field for delayed execution after another stage
            'email_template',
            'contract_template', 'questionnaire_template', 'task_description',
            'progression_condition', 'required_tasks_completed',
            # Trigger-on flags for conditional automation
            'trigger_on_payment_received', 'trigger_on_quote_accepted',
            'trigger_on_contract_signed', 'trigger_on_event_created',
            'trigger_on_quote_sent',
            'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']