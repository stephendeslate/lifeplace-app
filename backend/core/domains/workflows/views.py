# backend/core/domains/workflows/views.py
from core.utils.permissions import IsAdmin
from django.db import transaction
from django.utils import timezone
from rest_framework import filters, status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import WorkflowStage, WorkflowTemplate, WorkflowTrigger, EventWorkflowOverride
from .serializers import (
    WorkflowStageDetailSerializer,
    WorkflowStageSerializer,
    WorkflowTemplateDetailSerializer,
    WorkflowTemplateSerializer,
    WorkflowTemplateWithStagesSerializer,
    WorkflowTriggerSerializer,
    EventWorkflowOverrideSerializer,
    EventWorkflowOverrideCreateSerializer,
)
from .services import WorkflowStageService, WorkflowTemplateService


class WorkflowTemplateListSerializer(WorkflowTemplateSerializer):
    """Serializer for WorkflowTemplate list view with event type name"""
    event_type_name = serializers.CharField(source='event_type.name', read_only=True)
    
    class Meta(WorkflowTemplateSerializer.Meta):
        fields = WorkflowTemplateSerializer.Meta.fields + ['event_type_name']


class WorkflowTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for workflow templates
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        event_type_id = self.request.query_params.get('event_type', None)
        is_active = self.request.query_params.get('is_active', None)
        
        # Convert string to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        return WorkflowTemplateService.get_all_templates(
            event_type_id=event_type_id,
            is_active=is_active
        ).select_related('event_type').prefetch_related('stages')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WorkflowTemplateDetailSerializer
        elif self.action == 'list':
            return WorkflowTemplateListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return WorkflowTemplateWithStagesSerializer
        return WorkflowTemplateSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            template = WorkflowTemplateService.create_template(serializer.validated_data)
        
        return Response(
            WorkflowTemplateDetailSerializer(template).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            template = WorkflowTemplateService.update_template(
                instance.id, 
                serializer.validated_data
            )
        
        return Response(WorkflowTemplateDetailSerializer(template).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            WorkflowTemplateService.delete_template(instance.id)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['get'])
    def stages(self, request, pk=None):
        """Get all stages for a template"""
        stages = WorkflowStageService.get_stages_for_template(pk)
        # Use detail serializer to include template names (email_template_name, contract_template_name)
        serializer = WorkflowStageDetailSerializer(stages, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active templates"""
        active_templates = WorkflowTemplateService.get_all_templates(is_active=True)
        page = self.paginate_queryset(active_templates)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(active_templates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate a workflow template with all its stages

        POST /workflows/templates/{id}/duplicate/
        Body (optional): { "name": "New Template Name" }

        Returns the newly created template with all stages cloned.
        The new template starts as inactive for safety.
        """
        # Get optional new name from request body
        new_name = request.data.get('name')

        with transaction.atomic():
            new_template = WorkflowTemplateService.duplicate_template(pk, new_name)

        return Response(
            WorkflowTemplateDetailSerializer(new_template).data,
            status=status.HTTP_201_CREATED
        )


class WorkflowStageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for workflow stages
    """
    serializer_class = WorkflowStageSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return WorkflowStage.objects.select_related(
            'template',
            'template__event_type',
            'email_template'
        ).order_by('template', 'stage', 'order')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WorkflowStageDetailSerializer
        return WorkflowStageSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get all the validated data
        validated_data = serializer.validated_data.copy()
        # Extract template instance and get its ID
        template = validated_data.pop('template')
        template_id = template.id
        
        with transaction.atomic():
            # Now pass the template_id separately, and the rest of the data without template
            stage = WorkflowStageService.create_stage(
                template_id,
                validated_data
            )
        
        return Response(
            self.get_serializer(stage).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Get all validated data including the template
        validated_data = serializer.validated_data
        
        with transaction.atomic():
            stage = WorkflowStageService.update_stage(
                instance.id, 
                validated_data
            )
        
        return Response(self.get_serializer(stage).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            WorkflowStageService.delete_stage(instance.id)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder stages within a template for a specific stage type"""
        template_id = request.data.get('template_id')
        stage_type = request.data.get('stage_type')
        order_mapping = request.data.get('order_mapping', {})

        if not template_id or not stage_type or not order_mapping:
            return Response(
                {"detail": "Missing required fields: template_id, stage_type, or order_mapping"},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            WorkflowStageService.reorder_stages(template_id, stage_type, order_mapping)

        # Return updated stages
        stages = WorkflowStageService.get_stages_for_template(template_id)
        serializer = self.get_serializer(stages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def trigger(self, request, pk=None):
        """Manually trigger a stage's automation for a specific event"""
        stage = self.get_object()
        event_id = request.data.get('event_id')

        if not event_id:
            return Response(
                {"detail": "event_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from core.domains.events.models import Event

            event = Event.objects.get(id=event_id)

            # Verify event uses the same workflow template as this stage
            if event.workflow_template_id != stage.template_id:
                return Response(
                    {"detail": "Event does not use this workflow template"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                # Create trigger record
                trigger = WorkflowTrigger.objects.create(
                    event=event,
                    stage=stage,
                    trigger_type='MANUAL_TRIGGER',
                    details=f"Manually triggered by {request.user.email}",
                    result_data={'triggered_by': request.user.id},
                    processed=True,
                    processed_at=timezone.now()
                )

                # Execute the stage automation
                if stage.is_automated:
                    stage._execute_automation(event)

            return Response({
                "message": f"Successfully triggered automation for stage '{stage.name}'",
                "trigger_id": trigger.id
            })

        except Event.DoesNotExist:
            return Response(
                {"detail": "Event not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WorkflowTriggerViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing workflow trigger history"""
    serializer_class = WorkflowTriggerSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['details', 'event__name']
    ordering_fields = ['created_at', 'processed_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = WorkflowTrigger.objects.select_related(
            'event', 'stage', 'stage__template'
        )

        # Filter by event_id if provided
        event_id = self.request.query_params.get('event_id')
        if event_id:
            queryset = queryset.filter(event_id=event_id)

        # Filter by template_id (via stage)
        template_id = self.request.query_params.get('template_id')
        if template_id:
            queryset = queryset.filter(stage__template_id=template_id)

        # Filter by trigger_type if provided
        trigger_type = self.request.query_params.get('trigger_type')
        if trigger_type:
            queryset = queryset.filter(trigger_type=trigger_type)

        # Filter by processed status
        processed = self.request.query_params.get('processed')
        if processed is not None:
            queryset = queryset.filter(processed=processed.lower() == 'true')

        return queryset


class EventWorkflowOverrideViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing per-event workflow overrides.

    Allows admins to customize workflow behavior for specific events:
    - SKIP: Skip a stage entirely for this event
    - DISABLE_AUTOMATION: Run stage but don't execute automation
    - CUSTOM_TIMING: Use different trigger timing for this event
    - ADD_STAGE: Add a custom one-off stage for this event
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['reason', 'custom_stage_name']
    ordering_fields = ['created_at', 'custom_order']
    ordering = ['custom_order', '-created_at']

    def get_queryset(self):
        queryset = EventWorkflowOverride.objects.select_related(
            'event', 'stage', 'stage__template', 'created_by', 'custom_email_template'
        )

        # Filter by event_id
        event_id = self.request.query_params.get('event_id')
        if event_id:
            queryset = queryset.filter(event_id=event_id)

        # Filter by stage_id
        stage_id = self.request.query_params.get('stage_id')
        if stage_id:
            queryset = queryset.filter(stage_id=stage_id)

        # Filter by override_type
        override_type = self.request.query_params.get('override_type')
        if override_type:
            queryset = queryset.filter(override_type=override_type)

        # Filter by executed status
        executed = self.request.query_params.get('executed')
        if executed is not None:
            queryset = queryset.filter(executed=executed.lower() == 'true')

        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return EventWorkflowOverrideCreateSerializer
        return EventWorkflowOverrideSerializer

    @action(detail=False, methods=['get'])
    def for_event(self, request):
        """Get all workflow overrides for a specific event with stage info"""
        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response(
                {"detail": "event_id query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        overrides = self.get_queryset().filter(event_id=event_id)
        serializer = self.get_serializer(overrides, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def skip_stage(self, request):
        """Quick action to skip a stage for an event"""
        event_id = request.data.get('event_id')
        stage_id = request.data.get('stage_id')
        reason = request.data.get('reason', '')

        if not event_id or not stage_id:
            return Response(
                {"detail": "event_id and stage_id are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            override, created = EventWorkflowOverride.objects.get_or_create(
                event_id=event_id,
                stage_id=stage_id,
                defaults={
                    'override_type': 'SKIP',
                    'reason': reason,
                    'created_by': request.user if request.user.is_authenticated else None
                }
            )

            if not created:
                # Update existing override to SKIP
                override.override_type = 'SKIP'
                override.reason = reason
                override.save()

            serializer = self.get_serializer(override)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def disable_automation(self, request):
        """Quick action to disable automation for a stage on an event"""
        event_id = request.data.get('event_id')
        stage_id = request.data.get('stage_id')
        reason = request.data.get('reason', '')

        if not event_id or not stage_id:
            return Response(
                {"detail": "event_id and stage_id are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            override, created = EventWorkflowOverride.objects.get_or_create(
                event_id=event_id,
                stage_id=stage_id,
                defaults={
                    'override_type': 'DISABLE_AUTOMATION',
                    'reason': reason,
                    'created_by': request.user if request.user.is_authenticated else None
                }
            )

            if not created:
                override.override_type = 'DISABLE_AUTOMATION'
                override.reason = reason
                override.save()

            serializer = self.get_serializer(override)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['delete'])
    def remove_override(self, request, pk=None):
        """Remove an override (restore default behavior)"""
        override = self.get_object()
        override.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkflowWebhookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workflow webhooks.

    Webhooks allow external systems to be notified when workflow events occur.
    Supports CRUD operations plus test webhook functionality.
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'url']
    ordering_fields = ['name', 'created_at', 'last_triggered_at']
    ordering = ['name']

    def get_queryset(self):
        from .models import WorkflowWebhook
        queryset = WorkflowWebhook.objects.select_related('workflow_template')

        # Filter by workflow_template if provided (support both parameter names)
        template_id = self.request.query_params.get('workflow_template') or \
                      self.request.query_params.get('workflow_template_id')
        if template_id:
            queryset = queryset.filter(workflow_template_id=template_id)

        # Filter by is_active if provided
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    def get_serializer_class(self):
        from .serializers import WorkflowWebhookSerializer, WorkflowWebhookDetailSerializer
        if self.action == 'retrieve':
            return WorkflowWebhookDetailSerializer
        return WorkflowWebhookSerializer

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """
        Send a test webhook to verify configuration.

        POST /workflows/webhooks/{id}/test/
        """
        from .webhook_service import WorkflowWebhookService
        from .serializers import WorkflowWebhookDeliverySerializer

        webhook = self.get_object()
        delivery = WorkflowWebhookService.send_test_webhook(webhook)

        return Response({
            'message': f"Test webhook sent to {webhook.url}",
            'delivery': WorkflowWebhookDeliverySerializer(delivery).data
        })

    @action(detail=True, methods=['get'])
    def deliveries(self, request, pk=None):
        """
        Get delivery history for a webhook.

        GET /workflows/webhooks/{id}/deliveries/
        """
        from .serializers import WorkflowWebhookDeliverySerializer
        from .models import WorkflowWebhookDelivery

        webhook = self.get_object()
        limit = int(request.query_params.get('limit', 50))

        deliveries = WorkflowWebhookDelivery.objects.filter(
            webhook=webhook
        ).order_by('-created_at')[:limit]

        serializer = WorkflowWebhookDeliverySerializer(deliveries, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def event_types(self, request):
        """
        Get available webhook event types.

        GET /workflows/webhooks/event_types/
        """
        from .models import WorkflowWebhook
        return Response([
            {'value': choice[0], 'label': choice[1]}
            for choice in WorkflowWebhook.WEBHOOK_EVENT_CHOICES
        ])