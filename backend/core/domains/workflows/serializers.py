# backend/core/domains/workflows/serializers.py
from core.domains.communications.serializers import EmailTemplateSerializer
from core.domains.events.basic_serializers import EventTypeSerializer
from django.db import transaction
from rest_framework import serializers

from .basic_serializers import WorkflowStageSerializer, WorkflowTemplateSerializer
from .exceptions import EmailTemplateRequired
from .models import WorkflowStage, WorkflowTemplate


class WorkflowStageDetailSerializer(WorkflowStageSerializer):
    """Detailed serializer for WorkflowStage including related objects"""
    email_template = EmailTemplateSerializer(read_only=True)


class WorkflowTemplateDetailSerializer(WorkflowTemplateSerializer):
    """Detailed serializer for WorkflowTemplate including related objects"""
    event_type = EventTypeSerializer(read_only=True)
    stages = WorkflowStageDetailSerializer(many=True, read_only=True)
    
    class Meta(WorkflowTemplateSerializer.Meta):
        fields = WorkflowTemplateSerializer.Meta.fields + ['stages']


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