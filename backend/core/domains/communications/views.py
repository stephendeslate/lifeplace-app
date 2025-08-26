# backend/core/domains/communications/views.py
from core.utils.permissions import IsAdmin, IsAdminOrClient
from django.contrib.auth import get_user_model
from django.db import transaction, models
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
import logging

from .models import CommunicationTemplate, CommunicationRecord
from .serializers import (
    CommunicationTemplateSerializer,
    CommunicationRecordSerializer,
    SendCommunicationSerializer,
    PreviewCommunicationSerializer,
    BulkSendSerializer
)
from .services import CommunicationTemplateService, CommunicationService, AnalyticsService
from .cache_service import communications_cache_service
from django.utils import timezone

logger = logging.getLogger(__name__)

User = get_user_model()


class CommunicationTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for communication templates"""
    queryset = CommunicationTemplate.objects.all().order_by('-updated_at')
    serializer_class = CommunicationTemplateSerializer
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        - Admins can perform all CRUD operations
        - Clients can only read templates (for previewing)
        """
        if self.action in ['list', 'retrieve', 'preview', 'variable_schemas']:
            # Allow clients to read templates for preview purposes
            permission_classes = [IsAdminOrClient]
        else:
            # Only admins can create, update, delete templates
            permission_classes = [IsAdmin]
        return [permission() for permission in permission_classes]
    
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
        
        # If user is a client, only show non-system templates or limit what they can see
        if self.request.user.role == 'CLIENT':
            # Clients can see all templates for preview purposes, but this could be restricted
            pass
        
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
        """Preview a template with sample data - available to both admins and clients"""
        serializer = PreviewCommunicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        context_data = serializer.validated_data.get('context_data', {})
        
        # Try to get from cache first
        cached_preview = communications_cache_service.get_cached_template_preview(
            int(pk), context_data
        )
        
        if cached_preview is not None:
            logger.debug(f"Template preview for {pk} served from cache")
            return Response(cached_preview)
        
        # Cache miss - generate preview
        preview_data = CommunicationTemplateService.preview_template(pk, context_data)
        
        # Cache the preview result
        communications_cache_service.cache_template_preview(
            int(pk), context_data, preview_data
        )
        logger.info(f"Template preview for {pk} cached after generation")
        
        return Response(preview_data)
    
    @action(detail=False, methods=['get'])
    def variable_schemas(self, request):
        """Get available variable schemas for templates - available to both admins and clients"""
        # Try to get from cache first
        cached_schemas = communications_cache_service.get_cached_variable_schemas()
        
        if cached_schemas is not None:
            logger.debug("Variable schemas served from cache")
            return Response(cached_schemas)
        
        # Cache miss - build schemas
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
        
        # Cache the schemas
        communications_cache_service.cache_variable_schemas(schemas)
        logger.info("Variable schemas cached after generation")
        
        return Response(schemas)


class CommunicationRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for communication records"""
    queryset = CommunicationRecord.objects.select_related(
        'client',
        'sent_by'
    ).order_by('-created_at')
    serializer_class = CommunicationRecordSerializer
    permission_classes = [IsAdminOrClient]  # Both admins and clients can view records
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Clients can only see their own communication records
        if self.request.user.role == 'CLIENT':
            queryset = queryset.filter(client=self.request.user)
        
        # Filter by client (admins only)
        client_id = self.request.query_params.get('client_id')
        if client_id and self.request.user.role == 'ADMIN':
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
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Search functionality
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(template_name__icontains=search) |
                models.Q(subject__icontains=search) |
                models.Q(body__icontains=search)
            )
        
        return queryset

    @action(detail=False, methods=['post'])
    def send_manual(self, request):
        """Send a manual communication - restricted to admins only"""
        # Only admins can send manual communications
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can send manual communications'},
                status=status.HTTP_403_FORBIDDEN
            )
        
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
        """Send bulk communications - restricted to admins only"""
        # Only admins can send bulk communications
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can send bulk communications'},
                status=status.HTTP_403_FORBIDDEN
            )
        
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
        
        # If user is a client, filter analytics to their own communications
        if request.user.role == 'CLIENT':
            client_id = request.user.id
            
            # Try to get from cache first
            cached_analytics = communications_cache_service.get_cached_client_analytics(
                client_id, days
            )
            
            if cached_analytics is not None:
                logger.debug(f"Client analytics for {client_id} served from cache")
                # If template_name filter is applied, we might need fresh data
                if not template_name:
                    return Response(cached_analytics)
            
            # Cache miss or filtered request - compute analytics
            from django.db.models import Count, Q
            from datetime import timedelta
            from django.utils import timezone
            
            start_date = timezone.now() - timedelta(days=days)
            queryset = CommunicationRecord.objects.filter(
                client=request.user,
                created_at__gte=start_date
            )
            
            if template_name:
                queryset = queryset.filter(template_name=template_name)
            
            stats = queryset.aggregate(
                total_sent=Count('id'),
                delivered=Count('id', filter=Q(delivery_status='DELIVERED')),
                opened=Count('id', filter=Q(is_opened=True)),
                failed=Count('id', filter=Q(delivery_status='FAILED'))
            )
            
            # Calculate rates
            total = stats['total_sent'] or 1
            stats['delivery_rate'] = round((stats['delivered'] / total) * 100, 2)
            stats['open_rate'] = round((stats['opened'] / total) * 100, 2)
            stats['failure_rate'] = round((stats['failed'] / total) * 100, 2)
            
            # Cache client analytics (only if not template-filtered)
            if not template_name:
                communications_cache_service.cache_client_analytics(client_id, days, stats)
                logger.info(f"Client analytics for {client_id} cached after computation")
            
            return Response(stats)
        else:
            # Admins get full analytics
            if template_name:
                # Try to get template-specific analytics from cache
                cached_analytics = communications_cache_service.get_cached_template_analytics(
                    template_name, days
                )
                
                if cached_analytics is not None:
                    logger.debug(f"Template analytics for {template_name} served from cache")
                    return Response(cached_analytics)
            
            # Cache miss or global analytics - compute stats
            stats = AnalyticsService.get_template_stats(template_name, days)
            
            # Cache the analytics
            if template_name:
                communications_cache_service.cache_template_analytics(template_name, days, stats)
                logger.info(f"Template analytics for {template_name} cached after computation")
            else:
                communications_cache_service.cache_global_analytics(days, stats)
                logger.info(f"Global analytics cached after computation")
            
            return Response(stats)
        
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark a communication record as read"""
        try:
            record = self.get_object()
            
            # Ensure clients can only mark their own messages as read
            if request.user.role == 'CLIENT' and record.client != request.user:
                return Response(
                    {'error': 'You can only mark your own messages as read'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Only update if not already marked as read
            if not record.is_opened:
                record.is_opened = True
                record.opened_at = timezone.now()
                record.save(update_fields=['is_opened', 'opened_at'])
                
                return Response(
                    {'message': 'Message marked as read', 'opened_at': record.opened_at},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {'message': 'Message was already marked as read'},
                    status=status.HTTP_200_OK
                )
                
        except Exception as e:
            return Response(
                {'error': f'Failed to mark message as read: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def mark_as_unread(self, request, pk=None):
        """Mark a communication record as unread (for admins or testing)"""
        try:
            record = self.get_object()
            
            # Ensure clients can only mark their own messages as unread
            if request.user.role == 'CLIENT' and record.client != request.user:
                return Response(
                    {'error': 'You can only mark your own messages as unread'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Update read status
            record.is_opened = False
            record.opened_at = None
            record.save(update_fields=['is_opened', 'opened_at'])
            
            return Response(
                {'message': 'Message marked as unread'},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {'error': f'Failed to mark message as unread: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )