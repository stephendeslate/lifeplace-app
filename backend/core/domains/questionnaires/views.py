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
    """
    permission_classes = [IsAdminOrClient]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    
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
        page = self.paginate_queryset(active_questionnaires)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(active_questionnaires, many=True)
        return Response(serializer.data)


class QuestionnaireFieldViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing questionnaire fields
    """
    serializer_class = QuestionnaireFieldSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return QuestionnaireField.objects.all().order_by('questionnaire', 'order')
    
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


class QuestionnaireResponseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing questionnaire responses
    """
    serializer_class = QuestionnaireResponseSerializer
    permission_classes = [IsOwnerOrAdmin]
    
    def get_queryset(self):
        return QuestionnaireResponse.objects.all()
    
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