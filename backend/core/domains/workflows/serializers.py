# backend/core/domains/workflows/serializers.py
from core.domains.communications.serializers import CommunicationTemplateSerializer
from core.domains.events.basic_serializers import EventTypeSerializer
from django.db import transaction
from rest_framework import serializers

from .basic_serializers import WorkflowStageSerializer, WorkflowTemplateSerializer
from .models import WorkflowStage, WorkflowTemplate, WorkflowTrigger, EventWorkflowOverride


class WorkflowTriggerSerializer(serializers.ModelSerializer):
    """Serializer for WorkflowTrigger model"""
    trigger_type_display = serializers.CharField(source='get_trigger_type_display', read_only=True)
    stage_name = serializers.CharField(source='stage.name', read_only=True, allow_null=True)
    event_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowTrigger
        fields = [
            'id', 'event', 'event_name', 'stage', 'stage_name',
            'trigger_type', 'trigger_type_display', 'details',
            'result_data', 'processed', 'processed_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_event_name(self, obj):
        if obj.event:
            return obj.event.name or f"Event #{obj.event.id}"
        return None


class WorkflowStageDetailSerializer(WorkflowStageSerializer):
    """Detailed serializer for WorkflowStage including related objects"""
    email_template_name = serializers.CharField(source='email_template.name', read_only=True, allow_null=True)
    contract_template_name = serializers.CharField(source='contract_template.name', read_only=True, allow_null=True)
    questionnaire_template_name = serializers.CharField(source='questionnaire_template.name', read_only=True, allow_null=True)

    class Meta(WorkflowStageSerializer.Meta):
        fields = WorkflowStageSerializer.Meta.fields + [
            'email_template_name', 'contract_template_name', 'questionnaire_template_name'
        ]


class WorkflowTemplateDetailSerializer(WorkflowTemplateSerializer):
    """Detailed serializer for WorkflowTemplate including related objects"""
    event_type_name = serializers.CharField(source='event_type.name', read_only=True)
    stages = WorkflowStageDetailSerializer(many=True, read_only=True)
    
    class Meta(WorkflowTemplateSerializer.Meta):
        fields = WorkflowTemplateSerializer.Meta.fields + ['event_type_name', 'stages']


class WorkflowTemplateWithStagesSerializer(WorkflowTemplateSerializer):
    """Serializer for WorkflowTemplate with nested stages for create/update operations"""
    stages = WorkflowStageSerializer(many=True, required=False)
    
    class Meta(WorkflowTemplateSerializer.Meta):
        fields = WorkflowTemplateSerializer.Meta.fields + ['stages']
    
    @transaction.atomic
    def create(self, validated_data):
        stages_data = validated_data.pop('stages', [])
        template = WorkflowTemplate.objects.create(**validated_data)
        
        # Create stages if provided
        for stage_data in stages_data:
            WorkflowStage.objects.create(template=template, **stage_data)
            
        return template
    
    @transaction.atomic
    def update(self, instance, validated_data):
        stages_data = validated_data.pop('stages', None)

        # Update template fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # If stages provided, replace all existing stages
        if stages_data is not None:
            # Delete existing stages
            instance.stages.all().delete()

            # Create new stages
            for stage_data in stages_data:
                WorkflowStage.objects.create(template=instance, **stage_data)

        return instance


class EventWorkflowOverrideSerializer(serializers.ModelSerializer):
    """Serializer for EventWorkflowOverride model"""
    override_type_display = serializers.CharField(
        source='get_override_type_display',
        read_only=True
    )
    stage_name = serializers.CharField(
        source='stage.name',
        read_only=True,
        allow_null=True
    )
    event_name = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = EventWorkflowOverride
        fields = [
            'id', 'event', 'event_name', 'stage', 'stage_name',
            'override_type', 'override_type_display',
            'custom_trigger_time',
            'custom_stage_name', 'custom_stage_category', 'custom_order',
            'custom_is_automated', 'custom_automation_type',
            'custom_email_template', 'custom_task_description',
            'reason', 'created_by', 'created_by_name',
            'executed', 'executed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'executed', 'executed_at']

    def get_event_name(self, obj):
        if obj.event:
            return obj.event.name or f"Event #{obj.event.id}"
        return None

    def validate(self, data):
        """Validate override data based on override_type"""
        override_type = data.get('override_type')

        if override_type == 'ADD_STAGE':
            # For ADD_STAGE, require custom stage fields
            if not data.get('custom_stage_name'):
                raise serializers.ValidationError({
                    'custom_stage_name': 'Stage name is required for ADD_STAGE override'
                })
            if not data.get('custom_stage_category'):
                raise serializers.ValidationError({
                    'custom_stage_category': 'Stage category is required for ADD_STAGE override'
                })
        else:
            # For other types, require a stage reference
            if not data.get('stage'):
                raise serializers.ValidationError({
                    'stage': 'Stage is required for this override type'
                })

        if override_type == 'CUSTOM_TIMING':
            if not data.get('custom_trigger_time'):
                raise serializers.ValidationError({
                    'custom_trigger_time': 'Custom trigger time is required for CUSTOM_TIMING override'
                })

        return data


class EventWorkflowOverrideCreateSerializer(EventWorkflowOverrideSerializer):
    """Serializer for creating EventWorkflowOverride with current user as creator"""

    def create(self, validated_data):
        # Set created_by from request context
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# =============================================================================
# Webhook Serializers
# =============================================================================

from .models import WorkflowWebhook, WorkflowWebhookDelivery


class WorkflowWebhookSerializer(serializers.ModelSerializer):
    """Serializer for WorkflowWebhook model"""
    workflow_template_name = serializers.CharField(
        source='workflow_template.name',
        read_only=True,
        allow_null=True
    )
    delivery_count = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowWebhook
        fields = [
            'id', 'name', 'url', 'secret', 'is_active',
            'events', 'workflow_template', 'workflow_template_name',
            'headers', 'last_triggered_at', 'failure_count',
            'delivery_count', 'success_rate',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'last_triggered_at', 'failure_count', 'created_at', 'updated_at']
        extra_kwargs = {
            'secret': {'write_only': True},  # Don't expose secret in reads
        }

    def get_delivery_count(self, obj):
        return obj.deliveries.count()

    def get_success_rate(self, obj):
        total = obj.deliveries.count()
        if total == 0:
            return None
        successful = obj.deliveries.filter(status='SUCCESS').count()
        return round((successful / total) * 100, 1)

    def validate_events(self, value):
        """Validate that events is a list of valid event types"""
        valid_events = [choice[0] for choice in WorkflowWebhook.WEBHOOK_EVENT_CHOICES]
        if not isinstance(value, list):
            raise serializers.ValidationError("Events must be a list")
        for event in value:
            if event not in valid_events:
                raise serializers.ValidationError(
                    f"Invalid event type: {event}. Valid types: {valid_events}"
                )
        return value


class WorkflowWebhookDetailSerializer(WorkflowWebhookSerializer):
    """Detailed serializer that includes the secret (for viewing)"""

    class Meta(WorkflowWebhookSerializer.Meta):
        extra_kwargs = {}  # Allow secret to be read


class WorkflowWebhookDeliverySerializer(serializers.ModelSerializer):
    """Serializer for WorkflowWebhookDelivery model"""
    webhook_name = serializers.CharField(source='webhook.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = WorkflowWebhookDelivery
        fields = [
            'id', 'webhook', 'webhook_name', 'event_type',
            'payload', 'status', 'status_display',
            'response_status_code', 'response_body', 'error_message',
            'attempt_count', 'next_retry_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']