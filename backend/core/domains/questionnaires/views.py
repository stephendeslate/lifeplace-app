# backend/core/domains/questionnaires/views.py
from core.utils.permissions import IsAdmin, IsAdminOrClient, IsOwnerOrAdmin
from django.db import transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Questionnaire, QuestionnaireField, QuestionnaireResponse
from .serializers import (
    EventQuestionnaireResponsesSerializer,
    QuestionnaireDetailSerializer,
    QuestionnaireFieldSerializer,
    QuestionnaireResponseSerializer,
    QuestionnaireSerializer,
    QuestionnaireWithFieldsSerializer,
)
from .services import (
    QuestionnaireFieldService,
    QuestionnaireResponseService,
    QuestionnaireService,
)


class QuestionnaireViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing questionnaires

    Permissions:
    - List/Retrieve/Active: Admin and Client (clients can view questionnaires)
    - Create/Update/Delete: Admin only
    - for_event: Admin and Client (with ownership check for clients)
    - Analytics endpoints: Admin only
    """
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_permissions(self):
        """
        SECURITY FIX (P0-B15): Granular permissions for different actions.
        """
        # Read-only actions for admin and client
        if self.action in ['list', 'retrieve', 'active', 'fields', 'validation_rules', 'for_event']:
            return [IsAdminOrClient()]
        # Analytics are admin-only
        if self.action in ['analytics', 'analytics_summary', 'response_trends']:
            return [IsAdmin()]
        # Write operations are admin-only
        return [IsAdmin()]

    def get_queryset(self):
        event_type_id = self.request.query_params.get('event_type')
        is_active = self.request.query_params.get('is_active')
        
        # Convert string to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        return QuestionnaireService.get_all_questionnaires(
            search_query=self.request.query_params.get('search'),
            event_type_id=event_type_id,
            is_active=is_active
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return QuestionnaireDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return QuestionnaireWithFieldsSerializer
        return QuestionnaireSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            questionnaire = QuestionnaireService.create_questionnaire(serializer.validated_data)
        
        return Response(
            QuestionnaireDetailSerializer(questionnaire).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            questionnaire = QuestionnaireService.update_questionnaire(
                instance.id, 
                serializer.validated_data
            )
        
        return Response(QuestionnaireDetailSerializer(questionnaire).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            QuestionnaireService.delete_questionnaire(instance.id)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['get'])
    def fields(self, request, pk=None):
        """Get all fields for a questionnaire"""
        fields = QuestionnaireFieldService.get_fields_for_questionnaire(pk)
        serializer = QuestionnaireFieldSerializer(fields, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder questionnaires"""
        order_mapping = request.data.get('order_mapping', {})
        
        if not order_mapping:
            return Response(
                {"detail": "Missing required field: order_mapping"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Transaction is managed only in the view
        with transaction.atomic():
            # Call the service method which uses select_for_update
            questionnaires = QuestionnaireService.reorder_questionnaires(order_mapping)
            
            # Get fresh data after reordering to ensure consistency
            reordered_questionnaires = Questionnaire.objects.filter(
                id__in=[q.id for q in questionnaires]
            ).order_by('order')
        
        serializer = self.get_serializer(reordered_questionnaires, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active questionnaires"""
        active_questionnaires = QuestionnaireService.get_all_questionnaires(is_active=True)

        # Add prefetch_related for better performance
        active_questionnaires = active_questionnaires.prefetch_related('fields')

        page = self.paginate_queryset(active_questionnaires)

        if page is not None:
            # Use QuestionnaireDetailSerializer instead of self.get_serializer
            serializer = QuestionnaireDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        # Use QuestionnaireDetailSerializer instead of self.get_serializer
        serializer = QuestionnaireDetailSerializer(active_questionnaires, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def validation_rules(self, request):
        """
        Get all validation rules for frontend consumption.
        Returns validation patterns, messages, and examples for each field type.
        """
        from .validation import FieldValidator
        return Response({
            'rules': FieldValidator.get_all_validation_rules(),
            'field_types': [choice[0] for choice in QuestionnaireField.FIELD_TYPES]
        })

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate a questionnaire with all its fields.
        The new questionnaire will be inactive by default.
        """
        new_name = request.data.get('name')

        with transaction.atomic():
            new_questionnaire = QuestionnaireService.duplicate_questionnaire(pk, new_name)

        return Response(
            QuestionnaireDetailSerializer(new_questionnaire).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='for_event/(?P<event_id>[^/.]+)')
    def for_event(self, request, event_id=None):
        """Get questionnaires configured for a specific event's booking flow"""
        from core.domains.events.models import Event
        from core.domains.bookingflow.models import BookingSession, QuestionnaireStepConfiguration

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response(
                {"detail": "Event not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # SECURITY FIX (P0-B15): Verify ownership for CLIENT users
        user = request.user
        if user.role == 'CLIENT' and event.client_id != user.id:
            return Response(
                {"detail": "You do not have permission to view this event's questionnaires."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Try to get the booking session for this event
        booking_session = BookingSession.objects.filter(created_event=event).first()

        if booking_session and booking_session.booking_flow:
            # Get the questionnaire step configuration for this booking flow
            questionnaire_step = booking_session.booking_flow.steps.filter(
                step_type='questionnaire',
                is_enabled=True
            ).first()

            if questionnaire_step:
                try:
                    questionnaire_config = QuestionnaireStepConfiguration.objects.get(step=questionnaire_step)
                    # Get questionnaires from the configuration, ordered by their step items
                    questionnaire_ids = list(questionnaire_config.questionnaire_items.filter(
                        questionnaire__is_active=True
                    ).order_by('order').values_list('questionnaire_id', flat=True))

                    if questionnaire_ids:
                        questionnaires = Questionnaire.objects.filter(
                            id__in=questionnaire_ids,
                            is_active=True
                        ).prefetch_related('fields')

                        # Maintain order from step items
                        questionnaires = sorted(
                            list(questionnaires),
                            key=lambda q: questionnaire_ids.index(q.id)
                        )

                        serializer = QuestionnaireDetailSerializer(questionnaires, many=True)
                        return Response(serializer.data)
                except QuestionnaireStepConfiguration.DoesNotExist:
                    pass

        # Fallback: return questionnaires that have responses for this event
        # This handles events that may have been created before booking flow tracking
        questionnaire_ids = QuestionnaireResponse.objects.filter(
            event_id=event_id
        ).values_list('field__questionnaire_id', flat=True).distinct()

        if questionnaire_ids:
            questionnaires = Questionnaire.objects.filter(
                id__in=questionnaire_ids,
                is_active=True
            ).prefetch_related('fields')
            serializer = QuestionnaireDetailSerializer(questionnaires, many=True)
            return Response(serializer.data)

        # If no booking flow and no responses, return empty list
        return Response([])

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """
        Get analytics for a specific questionnaire.
        Returns completion rates, response counts, and field-level stats.
        """
        from .analytics import QuestionnaireAnalytics
        stats = QuestionnaireAnalytics.get_questionnaire_stats(int(pk))
        return Response(stats)

    @action(detail=False, methods=['get'])
    def analytics_summary(self, request):
        """
        Get summary analytics for all questionnaires.
        Returns basic stats for each questionnaire in a list.
        """
        from .analytics import QuestionnaireAnalytics
        summaries = QuestionnaireAnalytics.get_all_questionnaires_summary()
        return Response(summaries)

    @action(detail=True, methods=['get'])
    def response_trends(self, request, pk=None):
        """
        Get daily response trends for a questionnaire.
        Query params:
            days: Number of days to look back (default: 30)
        """
        from .analytics import QuestionnaireAnalytics
        days = int(request.query_params.get('days', 30))
        trends = QuestionnaireAnalytics.get_response_trends(int(pk), days)
        return Response(trends)


class QuestionnaireFieldViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing questionnaire fields
    """
    serializer_class = QuestionnaireFieldSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return QuestionnaireField.objects.select_related('questionnaire').order_by('questionnaire', 'order')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get all the validated data
        validated_data = serializer.validated_data.copy()
        # Extract questionnaire instance and get its ID
        questionnaire = validated_data.pop('questionnaire')
        questionnaire_id = questionnaire.id
        
        with transaction.atomic():
            field = QuestionnaireFieldService.create_field(
                questionnaire_id,
                validated_data
            )
        
        return Response(
            self.get_serializer(field).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            field = QuestionnaireFieldService.update_field(
                instance.id, 
                serializer.validated_data
            )
        
        return Response(self.get_serializer(field).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            QuestionnaireFieldService.delete_field(instance.id)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder fields within a questionnaire"""
        questionnaire_id = request.data.get('questionnaire_id')
        order_mapping = request.data.get('order_mapping', {})
        
        if not questionnaire_id or not order_mapping:
            return Response(
                {"detail": "Missing required fields: questionnaire_id or order_mapping"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Transaction is managed only in the view
        with transaction.atomic():
            # Call the service method which uses select_for_update
            fields = QuestionnaireFieldService.reorder_fields(
                questionnaire_id,
                order_mapping
            )
            
            # Get fresh data after reordering to ensure consistency
            reordered_fields = QuestionnaireField.objects.filter(
                id__in=[f.id for f in fields]
            ).order_by('order')
        
        serializer = self.get_serializer(reordered_fields, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def value_distribution(self, request, pk=None):
        """
        Get value distribution for a specific field.
        Useful for analyzing select/multi-select field responses.
        Query params:
            limit: Maximum number of values to return (default: 10)
        """
        from .analytics import QuestionnaireAnalytics
        limit = int(request.query_params.get('limit', 10))
        distribution = QuestionnaireAnalytics.get_field_value_distribution(int(pk), limit)
        return Response(distribution)


class QuestionnaireResponseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing questionnaire responses
    """
    serializer_class = QuestionnaireResponseSerializer
    permission_classes = [IsOwnerOrAdmin]
    
    def get_queryset(self):
        return QuestionnaireResponse.objects.select_related('event', 'field', 'field__questionnaire')
    
    def list(self, request, *args, **kwargs):
        event_id = request.query_params.get('event')
        if event_id:
            responses = QuestionnaireResponseService.get_responses_for_event(event_id)
            serializer = self.get_serializer(responses, many=True)
            return Response(serializer.data)
        return super().list(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            response = QuestionnaireResponseService.create_response(
                serializer.validated_data
            )
        
        return Response(
            self.get_serializer(response).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            response = QuestionnaireResponseService.update_response(
                instance.id, 
                serializer.validated_data
            )
        
        return Response(self.get_serializer(response).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            QuestionnaireResponseService.delete_response(instance.id)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['post'])
    def save_event_responses(self, request):
        """Save multiple responses for an event at once"""
        serializer = EventQuestionnaireResponsesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        event_id = serializer.validated_data['event']
        responses_data = serializer.validated_data['responses']
        
        with transaction.atomic():
            responses = QuestionnaireResponseService.save_event_responses(
                event_id,
                responses_data
            )
        
        return Response(
            QuestionnaireResponseSerializer(responses, many=True).data,
            status=status.HTTP_201_CREATED
        )