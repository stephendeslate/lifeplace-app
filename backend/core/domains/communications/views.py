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
from .resilience import provider_manager
from .monitoring import health_checker, alert_manager, communication_metrics
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
        use_async = serializer.validated_data.get('use_async', False)
        
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
        
        if use_async:
            # For async, use the template name method
            record = communication_service.send_communication(
                template_name=template.name,
                recipient=recipient,
                context_data=context_data,
                client=client,
                sent_by=request.user,
                use_async=True
            )
            
            return Response({
                'message': 'Communication queued for async processing',
                'async': True
            }, status=status.HTTP_202_ACCEPTED)
        else:
            # Synchronous sending
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
        use_async = request.data.get('use_async', len(recipients) > 5)  # Auto-async for large batches
        
        communication_service = CommunicationService()
        records = communication_service.send_bulk_communications(
            template=template,
            recipients=recipients,
            sent_by=request.user,
            use_async=use_async
        )
        
        if use_async and not records:
            return Response({
                'message': f'Bulk communication queued for async processing ({len(recipients)} recipients)',
                'async': True,
                'recipient_count': len(recipients)
            }, status=status.HTTP_202_ACCEPTED)
        else:
            return Response({
                'sent_count': len(records),
                'records': CommunicationRecordSerializer(records, many=True).data,
                'async': False
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

    @action(detail=False, methods=['get'])
    def health_check(self, request):
        """Get communication system health status"""
        # Only admins can access health check
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can access health status'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        communication_service = CommunicationService()
        
        try:
            health_data = {
                'providers': communication_service.get_provider_health(),
                'timestamp': timezone.now().isoformat(),
                'system_status': 'healthy'
            }
            
            # Check if any providers are unhealthy
            unhealthy_providers = [
                name for name, data in health_data['providers'].items()
                if not data.get('healthy', False)
            ]
            
            if unhealthy_providers:
                health_data['system_status'] = 'degraded'
                health_data['unhealthy_providers'] = unhealthy_providers
            
            return Response(health_data)
            
        except Exception as e:
            return Response({
                'system_status': 'error',
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def reset_provider(self, request):
        """Reset circuit breaker for a specific provider"""
        # Only admins can reset providers
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can reset providers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        provider_name = request.data.get('provider_name')
        if not provider_name:
            return Response(
                {'error': 'provider_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            communication_service = CommunicationService()
            communication_service.reset_provider(provider_name)
            
            return Response({
                'message': f'Provider {provider_name} circuit breaker reset successfully',
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response({
                'error': f'Failed to reset provider {provider_name}: {str(e)}',
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def process_retry_queue(self, request):
        """Manually process the retry queue"""
        # Only admins can process retry queue
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can process retry queue'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            communication_service = CommunicationService()
            results = communication_service.process_retry_queue()
            
            return Response({
                'message': 'Retry queue processed successfully',
                'results': results,
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response({
                'error': f'Failed to process retry queue: {str(e)}',
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def system_health(self, request):
        """Get comprehensive system health report"""
        # Only admins can access system health
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can access system health'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Check if we have a recent health report cached
            cached_health = health_checker.get_cached_health()
            
            if not cached_health:
                # Perform full health check
                health_report = health_checker.check_all_systems()
                
                # Generate alerts based on health
                alerts = alert_manager.check_and_alert(health_report)
                health_report['alerts'] = alerts
            else:
                health_report = cached_health
                # Get current alerts
                health_report['alerts'] = alert_manager.get_active_alerts()
            
            return Response(health_report)
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return Response({
                'overall_status': 'error',
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """Get communication metrics and analytics"""
        # Only admins can access metrics
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can access metrics'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            hours = int(request.query_params.get('hours', 24))
            include_database = request.query_params.get('include_db', 'true').lower() == 'true'
            
            # Get cache-based metrics (real-time)
            cache_metrics = communication_metrics.get_hourly_metrics(hours)
            
            response_data = {
                'cache_metrics': cache_metrics,
                'timestamp': timezone.now().isoformat(),
                'period_hours': hours
            }
            
            # Add database metrics if requested
            if include_database:
                db_metrics = communication_metrics.get_database_metrics(hours)
                response_data['database_metrics'] = db_metrics
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Metrics retrieval failed: {str(e)}")
            return Response({
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """Get system alerts"""
        # Only admins can access alerts
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can access alerts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            include_history = request.query_params.get('include_history', 'false').lower() == 'true'
            
            response_data = {
                'active_alerts': alert_manager.get_active_alerts(),
                'timestamp': timezone.now().isoformat()
            }
            
            if include_history:
                limit = int(request.query_params.get('history_limit', 50))
                response_data['alert_history'] = alert_manager.get_alert_history(limit)
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Alerts retrieval failed: {str(e)}")
            return Response({
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def clear_alerts(self, request):
        """Clear active alerts"""
        # Only admins can clear alerts
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can clear alerts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            alert_manager.clear_alerts()
            
            return Response({
                'message': 'Active alerts cleared successfully',
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Clear alerts failed: {str(e)}")
            return Response({
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)