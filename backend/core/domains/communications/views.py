# backend/core/domains/communications/views.py
from core.utils.permissions import IsAdmin
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import CommunicationTemplate, CommunicationRecord
from .serializers import (
    CommunicationTemplateSerializer,
    CommunicationRecordSerializer,
    SendCommunicationSerializer,
    PreviewCommunicationSerializer,
    BulkSendSerializer
)
from .services import CommunicationTemplateService, CommunicationService, AnalyticsService

User = get_user_model()


class CommunicationTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for communication templates"""
    queryset = CommunicationTemplate.objects.all().order_by('-updated_at')
    serializer_class = CommunicationTemplateSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by channel
        channel = self.request.query_params.get('channel')
        if channel:
            queryset = queryset.filter(channel=channel)
        
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            template = CommunicationTemplateService.create_template(serializer.validated_data)
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            self.get_serializer(template).data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            template = CommunicationTemplateService.update_template(
                instance.id, serializer.validated_data
            )
        
        return Response(self.get_serializer(template).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            CommunicationTemplateService.delete_template(instance.id)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Preview a template with sample data"""
        serializer = PreviewCommunicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        context_data = serializer.validated_data.get('context_data', {})
        
        preview_data = CommunicationTemplateService.preview_template(pk, context_data)
        return Response(preview_data)
    
    @action(detail=False, methods=['get'])
    def variable_schemas(self, request):
        """Get available variable schemas for templates"""
        schemas = {
            'client_variables': {
                'first_name': 'Client first name',
                'last_name': 'Client last name',
                'email': 'Client email address',
                'company': 'Client company name'
            },
            'system_variables': {
                'site_name': 'Site name (LifePlace)',
                'current_date': 'Current date',
                'support_email': 'Support email address'
            },
            'admin_invitation_variables': {
                'first_name': 'Invitee first name',
                'last_name': 'Invitee last name',
                'invitation_link': 'Link to accept invitation',
                'invited_by': 'Name of admin who sent invitation',
                'expiry_date': 'Invitation expiry date'
            }
        }
        return Response(schemas)


class CommunicationRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for communication records (read-only)"""
    queryset = CommunicationRecord.objects.all().order_by('-created_at')
    serializer_class = CommunicationRecordSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by client
        client_id = self.request.query_params.get('client_id')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        # Filter by template
        template_name = self.request.query_params.get('template_name')
        if template_name:
            queryset = queryset.filter(template_name=template_name)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(delivery_status=status_filter)
        
        # Filter by channel
        channel = self.request.query_params.get('channel')
        if channel:
            queryset = queryset.filter(channel=channel)
        
        return queryset

    @action(detail=False, methods=['post'])
    def send_manual(self, request):
        """Send a manual communication"""
        serializer = SendCommunicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        template_id = serializer.validated_data['template_id']
        recipient = serializer.validated_data['recipient']
        client_id = serializer.validated_data.get('client_id')
        context_data = serializer.validated_data.get('context_data', {})
        
        # Get client if provided
        client = None
        if client_id:
            try:
                client = User.objects.get(id=client_id)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Client not found'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get template
        try:
            template = CommunicationTemplateService.get_template_by_id(template_id)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Send communication
        communication_service = CommunicationService()
        record = communication_service.send_communication_by_template(
            template=template,
            recipient=recipient,
            context_data=context_data,
            client=client,
            sent_by=request.user
        )
        
        if record:
            return Response(
                CommunicationRecordSerializer(record).data,
                status=status.HTTP_201_CREATED
            )
        else:
            return Response(
                {'error': 'Failed to send communication'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def send_bulk(self, request):
        """Send bulk communications"""
        serializer = BulkSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        template_id = serializer.validated_data['template_id']
        recipients = serializer.validated_data['recipients']
        
        # Get template
        try:
            template = CommunicationTemplateService.get_template_by_id(template_id)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Send bulk communications
        communication_service = CommunicationService()
        records = communication_service.send_bulk_communications(
            template=template,
            recipients=recipients,
            sent_by=request.user
        )
        
        return Response({
            'sent_count': len(records),
            'records': CommunicationRecordSerializer(records, many=True).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get communication analytics"""
        template_name = request.query_params.get('template_name')
        days = int(request.query_params.get('days', 30))
        
        stats = AnalyticsService.get_template_stats(template_name, days)
        return Response(stats)