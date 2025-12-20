# backend/core/domains/workflows/serializers.py
from core.domains.communications.serializers import CommunicationTemplateSerializer
from core.domains.events.basic_serializers import EventTypeSerializer
from django.db import transaction
from rest_framework import serializers

from .basic_serializers import WorkflowStageSerializer, WorkflowTemplateSerializer
from .models import WorkflowStage, WorkflowTemplate, WorkflowTrigger


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
    email_template_name = serializers.CharField(source='email_template.name', read_only=True)
    
    class Meta(WorkflowStageSerializer.Meta):
        fields = WorkflowStageSerializer.Meta.fields + ['email_template_name']


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