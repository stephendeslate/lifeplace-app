# backend/core/domains/communications/views.py
from core.utils.permissions import IsAdmin, IsAdminOrClient
from django.contrib.auth import get_user_model
from django.db import transaction, models
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
import logging

from .models import CommunicationTemplate, CommunicationRecord, EmailLayout, EmailLayoutHistory
from .serializers import (
    CommunicationTemplateSerializer,
    CommunicationRecordSerializer,
    SendCommunicationSerializer,
    PreviewCommunicationSerializer,
    BulkSendSerializer,
    EmailLayoutSerializer,
    EmailLayoutHistorySerializer,
    LayoutPreviewSerializer
)
from .services import CommunicationTemplateService, CommunicationService, AnalyticsService
from .layout_service import LayoutCompositionService
from .cache_service import communications_cache_service
from .resilience import provider_manager
from .monitoring import health_checker, alert_manager, communication_metrics
from .throttling import (
    ManualSendThrottle,
    BulkSendThrottle,
    TemplatePreviewThrottle,
    CommunicationAdminThrottle,
    CommunicationRateLimiter
)
from django.utils import timezone

logger = logging.getLogger(__name__)

User = get_user_model()


class EmailLayoutViewSet(viewsets.ModelViewSet):
    """ViewSet for email layouts - Admin only"""

    queryset = EmailLayout.objects.all().order_by('name')
    serializer_class = EmailLayoutSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    def perform_create(self, serializer):
        """Create layout with history"""
        layout = serializer.save()
        EmailLayoutHistory.create_snapshot(
            layout=layout,
            reason='CREATE',
            changed_by=self.request.user,
            notes='Initial creation'
        )

    def perform_update(self, serializer):
        """Update layout with history"""
        # Create snapshot of current state before update
        layout = self.get_object()
        EmailLayoutHistory.create_snapshot(
            layout=layout,
            reason='UPDATE',
            changed_by=self.request.user,
            notes=self.request.data.get('notes', '')
        )
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Prevent deletion if templates are using this layout"""
        layout = self.get_object()

        if layout.templates.exists():
            return Response(
                {
                    'error': f'Cannot delete layout "{layout.name}" - it is used by {layout.templates.count()} template(s)',
                    'template_count': layout.templates.count()
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Preview layout with sample content"""
        layout = self.get_object()
        serializer = LayoutPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        context = serializer.validated_data.get('context_data', {})
        context['header_title'] = serializer.validated_data.get('header_title', '')
        context['header_subtitle'] = serializer.validated_data.get('header_subtitle', '')

        try:
            preview_html = LayoutCompositionService.preview_layout(
                layout=layout,
                sample_content=serializer.validated_data.get('sample_content'),
                context=context
            )
            return Response({'html': preview_html})
        except Exception as e:
            return Response(
                {'error': f'Preview failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get version history for a layout"""
        layout = self.get_object()
        history = EmailLayoutHistory.objects.filter(layout=layout).order_by('-version')
        serializer = EmailLayoutHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def rollback(self, request, pk=None):
        """Rollback layout to a previous version"""
        layout = self.get_object()
        version = request.data.get('version')

        if not version:
            return Response(
                {'error': 'Version number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            history_entry = EmailLayoutHistory.objects.get(layout=layout, version=version)
        except EmailLayoutHistory.DoesNotExist:
            return Response(
                {'error': f'Version {version} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        with transaction.atomic():
            # Create snapshot before rollback
            EmailLayoutHistory.create_snapshot(
                layout=layout,
                reason='ROLLBACK',
                changed_by=request.user,
                notes=f'Rolled back to version {version}'
            )

            # Restore layout state
            layout.header_template = history_entry.header_template
            layout.footer_template = history_entry.footer_template
            layout.wrapper_template = history_entry.wrapper_template
            layout.base_styles = history_entry.base_styles
            layout.primary_color = history_entry.primary_color
            layout.secondary_color = history_entry.secondary_color
            layout.logo_url = history_entry.logo_url
            layout.save()

        return Response(self.get_serializer(layout).data)

    @action(detail=True, methods=['get'])
    def templates(self, request, pk=None):
        """List templates using this layout"""
        layout = self.get_object()
        templates = layout.templates.all()
        serializer = CommunicationTemplateSerializer(templates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a layout"""
        layout = self.get_object()
        new_name = request.data.get('new_name')

        if not new_name:
            base_name = f"Copy of {layout.name}"
            new_name = base_name
            counter = 1
            while EmailLayout.objects.filter(name=new_name).exists():
                counter += 1
                new_name = f"{base_name} ({counter})"

        if EmailLayout.objects.filter(name=new_name).exists():
            return Response(
                {'error': f'Layout with name "{new_name}" already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            new_layout = EmailLayout.objects.create(
                name=new_name,
                description=layout.description,
                header_template=layout.header_template,
                footer_template=layout.footer_template,
                wrapper_template=layout.wrapper_template,
                base_styles=layout.base_styles,
                primary_color=layout.primary_color,
                secondary_color=layout.secondary_color,
                logo_url=layout.logo_url,
                is_default=False,
                is_active=True,
            )

            EmailLayoutHistory.create_snapshot(
                layout=new_layout,
                reason='CREATE',
                changed_by=request.user,
                notes=f'Duplicated from "{layout.name}"'
            )

        return Response(
            self.get_serializer(new_layout).data,
            status=status.HTTP_201_CREATED
        )


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
    
    @action(detail=True, methods=['post'], throttle_classes=[TemplatePreviewThrottle])
    def preview(self, request, pk=None):
        """Preview a template with sample data - available to both admins and clients"""
        serializer = PreviewCommunicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        context_data = serializer.validated_data.get('context_data', {})

        # Extract override parameters for live editing preview
        body_template_override = serializer.validated_data.get('body_template')
        subject_template_override = serializer.validated_data.get('subject_template')
        layout_id_override = serializer.validated_data.get('layout_id')

        # Check if this is a live editing preview (has overrides) - skip cache for these
        has_overrides = body_template_override or subject_template_override or layout_id_override is not None

        if not has_overrides:
            # Try to get from cache first (only for non-override requests)
            cached_preview = communications_cache_service.get_cached_template_preview(
                int(pk), context_data
            )

            if cached_preview is not None:
                logger.debug(f"Template preview for {pk} served from cache")
                return Response(cached_preview)

        # Cache miss or live editing preview - generate preview
        preview_data = CommunicationTemplateService.preview_template(
            pk,
            context_data,
            body_template_override=body_template_override,
            subject_template_override=subject_template_override,
            layout_id_override=layout_id_override
        )

        # Only cache non-override requests
        if not has_overrides:
            communications_cache_service.cache_template_preview(
                int(pk), context_data, preview_data
            )
            logger.info(f"Template preview for {pk} cached after generation")

        return Response(preview_data)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get version history for a template - admin only"""
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can view template history'},
                status=status.HTTP_403_FORBIDDEN
            )

        template = self.get_object()
        from .models import CommunicationTemplateHistory

        history_entries = CommunicationTemplateHistory.objects.filter(
            template=template
        ).select_related('changed_by').order_by('-version')

        # Serialize history entries
        history_data = []
        for entry in history_entries:
            history_data.append({
                'id': entry.id,
                'version': entry.version,
                'name': entry.name,
                'channel': entry.channel,
                'category': entry.category,
                'context_type': entry.context_type,
                'include_client_context': entry.include_client_context,
                'include_event_context': entry.include_event_context,
                'subject_template': entry.subject_template,
                'body_template': entry.body_template,
                'reason': entry.reason,
                'notes': entry.notes,
                'changed_by': {
                    'id': entry.changed_by.id,
                    'email': entry.changed_by.email,
                    'first_name': entry.changed_by.first_name,
                    'last_name': entry.changed_by.last_name,
                } if entry.changed_by else None,
                'created_at': entry.created_at.isoformat(),
            })

        return Response(history_data)

    @action(detail=True, methods=['post'])
    def rollback(self, request, pk=None):
        """Rollback a template to a previous version - admin only"""
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can rollback templates'},
                status=status.HTTP_403_FORBIDDEN
            )

        template = self.get_object()
        version = request.data.get('version')

        if not version:
            return Response(
                {'error': 'Version number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .models import CommunicationTemplateHistory

        try:
            history_entry = CommunicationTemplateHistory.objects.get(
                template=template,
                version=version
            )
        except CommunicationTemplateHistory.DoesNotExist:
            return Response(
                {'error': f'Version {version} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        with transaction.atomic():
            # Create a new history entry for the current state before rollback
            CommunicationTemplateHistory.create_snapshot(
                template=template,
                reason='ROLLBACK',
                changed_by=request.user,
                notes=f'Rolled back to version {version}'
            )

            # Restore the template to the previous version
            template.name = history_entry.name
            template.channel = history_entry.channel
            template.category = history_entry.category
            template.context_type = history_entry.context_type
            template.include_client_context = history_entry.include_client_context
            template.include_event_context = history_entry.include_event_context
            template.subject_template = history_entry.subject_template
            template.body_template = history_entry.body_template
            template.save()

        # Clear cache for this template
        communications_cache_service.invalidate_template_cache(template.id)

        return Response(self.get_serializer(template).data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a template - admin only"""
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can duplicate templates'},
                status=status.HTTP_403_FORBIDDEN
            )

        template = self.get_object()
        new_name = request.data.get('new_name')

        if not new_name:
            # Generate default name
            base_name = f"Copy of {template.name}"
            new_name = base_name
            counter = 1

            # Ensure unique name
            while CommunicationTemplate.objects.filter(name=new_name).exists():
                counter += 1
                new_name = f"{base_name} ({counter})"

        # Check if name already exists
        if CommunicationTemplate.objects.filter(name=new_name).exists():
            return Response(
                {'error': f'Template with name "{new_name}" already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Create new template as copy (not a system template)
            new_template = CommunicationTemplate.objects.create(
                name=new_name,
                channel=template.channel,
                category=template.category,
                context_type=template.context_type,
                include_client_context=template.include_client_context,
                include_event_context=template.include_event_context,
                subject_template=template.subject_template,
                body_template=template.body_template,
                is_system=False,  # Duplicates are never system templates
            )

        return Response(
            self.get_serializer(new_template).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get usage statistics for a specific template - admin only"""
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can view template statistics'},
                status=status.HTTP_403_FORBIDDEN
            )

        template = self.get_object()
        days = int(request.query_params.get('days', 30))

        from datetime import timedelta
        from django.db.models import Count, Q
        from django.db.models.functions import TruncDate

        start_date = timezone.now() - timedelta(days=days)

        # Get records for this template
        records = CommunicationRecord.objects.filter(
            template_name=template.name,
            created_at__gte=start_date,
            is_deleted=False
        )

        # Aggregate statistics
        stats = records.aggregate(
            total_sent=Count('id'),
            delivered=Count('id', filter=Q(delivery_status='DELIVERED')),
            failed=Count('id', filter=Q(delivery_status='FAILED')),
            bounced=Count('id', filter=Q(delivery_status='BOUNCED')),
            pending=Count('id', filter=Q(delivery_status='PENDING')),
            opened=Count('id', filter=Q(is_opened=True)),
        )

        # Calculate rates
        total = stats['total_sent'] or 1
        stats['delivery_rate'] = round((stats['delivered'] / total) * 100, 2)
        stats['open_rate'] = round((stats['opened'] / total) * 100, 2)
        stats['failure_rate'] = round((stats['failed'] / total) * 100, 2)
        stats['bounce_rate'] = round((stats['bounced'] / total) * 100, 2)

        # Get usage by channel
        by_channel = records.values('channel').annotate(count=Count('id'))
        stats['by_channel'] = {item['channel']: item['count'] for item in by_channel}

        # Get usage by day
        by_day = records.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(count=Count('id')).order_by('date')
        stats['by_day'] = [{'date': item['date'].isoformat(), 'count': item['count']} for item in by_day]

        # Template info
        stats['template_id'] = template.id
        stats['template_name'] = template.name
        stats['days'] = days

        return Response(stats)

    @action(detail=False, methods=['get'])
    def variable_schemas(self, request):
        """
        Get available variable schemas for templates.
        Returns context types and variable groups with metadata.
        Available to both admins and clients.
        """
        from .context_service import (
            ContextType, REQUIRED_OBJECTS, VARIABLE_GROUPS,
            CommunicationContextService
        )

        # Try to get from cache first
        cached_schemas = communications_cache_service.get_cached_variable_schemas()

        if cached_schemas is not None:
            logger.debug("Variable schemas served from cache")
            return Response(cached_schemas)

        # Cache miss - build comprehensive schema response
        # Build context types info
        context_types = {}
        context_type_descriptions = {
            ContextType.CLIENT: "For client-focused communications (welcome emails, invitations)",
            ContextType.EVENT: "For event-related communications (reminders, updates)",
            ContextType.BOOKING: "For booking flow communications (confirmations, payment reminders)",
            ContextType.QUOTE: "For quote-related communications (quote sent, follow-ups)",
            ContextType.CONTRACT: "For contract communications (signature requests)",
            ContextType.ADMIN: "For admin user communications (invitations, role changes)",
            ContextType.NOTIFICATION: "For system notifications (alerts, digests)",
            ContextType.MANUAL: "For ad-hoc staff communications (custom messages)",
        }

        for context_type, label in ContextType.CHOICES:
            context_types[context_type] = {
                'label': label,
                'required_objects': REQUIRED_OBJECTS.get(context_type, []),
                'description': context_type_descriptions.get(context_type, ''),
            }

        # Build variable groups with simplified structure for frontend
        variable_groups = {}
        for group_key, group_data in VARIABLE_GROUPS.items():
            variable_groups[group_key] = {
                'label': group_data['label'],
                'icon': group_data.get('icon', 'help'),
                'available_in': group_data['available_in'],
                'variables': group_data['variables'],
            }

        schemas = {
            'context_types': context_types,
            'variable_groups': variable_groups,
        }

        # Cache the schemas
        communications_cache_service.cache_variable_schemas(schemas)
        logger.info("Variable schemas cached after generation")

        return Response(schemas)


class CommunicationRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for communication records"""
    queryset = CommunicationRecord.objects.select_related(
        'client',
        'sent_by',
        'event'
    ).order_by('-created_at')
    serializer_class = CommunicationRecordSerializer
    permission_classes = [IsAdminOrClient]  # Both admins and clients can view records
    
    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter out soft-deleted records by default
        include_deleted = self.request.query_params.get('include_deleted', 'false').lower() == 'true'
        if not include_deleted or self.request.user.role == 'CLIENT':
            queryset = queryset.filter(is_deleted=False)

        # Clients can only see their own communication records
        if self.request.user.role == 'CLIENT':
            queryset = queryset.filter(client=self.request.user)

        # Filter by client (admins only)
        client_id = self.request.query_params.get('client_id')
        if client_id and self.request.user.role == 'ADMIN':
            queryset = queryset.filter(client_id=client_id)

        # Filter by event
        event_id = self.request.query_params.get('event_id')
        if event_id:
            queryset = queryset.filter(event_id=event_id)

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

    @action(detail=False, methods=['post'], throttle_classes=[ManualSendThrottle])
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
        event_id = serializer.validated_data.get('event_id')
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

        # Get event if provided
        event = None
        if event_id:
            try:
                from core.domains.events.models import Event
                event = Event.objects.get(id=event_id)
            except Event.DoesNotExist:
                return Response(
                    {'error': 'Event not found'},
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
                use_async=True,
                event=event
            )

            return Response({
                'message': 'Communication queued for async processing',
                'async': True
            }, status=status.HTTP_202_ACCEPTED)
        else:
            # Synchronous sending
            try:
                record = communication_service.send_communication_by_template(
                    template=template,
                    recipient=recipient,
                    context_data=context_data,
                    client=client,
                    sent_by=request.user,
                    event=event
                )

                if record:
                    return Response(
                        CommunicationRecordSerializer(record).data,
                        status=status.HTTP_201_CREATED
                    )
                else:
                    return Response(
                        {'error': 'Failed to send communication: Unknown error'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception as e:
                logger.error(f"send_manual failed: {str(e)}")
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
    
    @action(detail=False, methods=['post'], throttle_classes=[BulkSendThrottle])
    def send_bulk(self, request):
        """Send bulk communications - restricted to admins only"""
        # Only admins can send bulk communications
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only administrators can send bulk communications'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check daily recipient limit
        recipients = request.data.get('recipients', [])
        is_allowed, message = CommunicationRateLimiter.check_daily_bulk_limit(
            request.user.id, len(recipients)
        )
        if not is_allowed:
            return Response(
                {'error': message},
                status=status.HTTP_429_TOO_MANY_REQUESTS
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
        
        # Record the bulk send for rate limiting
        CommunicationRateLimiter.record_bulk_send(request.user.id, len(recipients))

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

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """
        Mark all communication records as read for a user.
        Accepts optional filters: channel, category.
        """
        try:
            # Build queryset based on user role
            if request.user.role == 'CLIENT':
                # Clients can only mark their own messages
                queryset = CommunicationRecord.objects.filter(
                    client=request.user,
                    is_opened=False,
                    is_deleted=False
                )
            else:
                # Admins can filter by client_id
                client_id = request.data.get('client_id')
                if client_id:
                    queryset = CommunicationRecord.objects.filter(
                        client_id=client_id,
                        is_opened=False,
                        is_deleted=False
                    )
                else:
                    return Response(
                        {'error': 'Admins must specify a client_id'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Apply optional filters
            channel = request.data.get('channel')
            if channel:
                queryset = queryset.filter(channel=channel)

            category = request.data.get('category')
            if category:
                queryset = queryset.filter(category=category)

            # Update all matching records
            now = timezone.now()
            updated_count = queryset.update(
                is_opened=True,
                opened_at=now
            )

            return Response({
                'message': f'Marked {updated_count} messages as read',
                'count': updated_count,
                'opened_at': now
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': f'Failed to mark messages as read: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread communication records for the current user"""
        try:
            # Clients can only see their own unread count
            if request.user.role == 'CLIENT':
                count = CommunicationRecord.objects.filter(
                    client=request.user,
                    is_opened=False,
                    is_deleted=False
                ).count()
            else:
                # Admins can optionally filter by client_id
                client_id = request.query_params.get('client_id')
                if client_id:
                    count = CommunicationRecord.objects.filter(
                        client_id=client_id,
                        is_opened=False,
                        is_deleted=False
                    ).count()
                else:
                    # Return total unread count across all clients
                    count = CommunicationRecord.objects.filter(
                        is_opened=False,
                        is_deleted=False
                    ).count()

            return Response({
                'unread_count': count
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': f'Failed to get unread count: {str(e)}'},
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


# =============================================================================
# Public Unsubscribe View (CAN-SPAM Compliance)
# =============================================================================

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.throttling import AnonRateThrottle


class UnsubscribeRateThrottle(AnonRateThrottle):
    """Rate limiting for unsubscribe endpoint to prevent abuse"""
    rate = '10/hour'  # 10 requests per hour per IP


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([UnsubscribeRateThrottle])
def email_unsubscribe(request, token_id):
    """
    Public endpoint for one-click email unsubscribe (CAN-SPAM Compliance).

    GET: Display unsubscribe confirmation page
    POST: Process the unsubscribe action

    Args:
        token_id: UUID of the unsubscribe token

    Returns:
        JSON response with success/error message
    """
    from .models import EmailUnsubscribeToken
    from django.shortcuts import redirect
    from django.conf import settings

    try:
        token = EmailUnsubscribeToken.objects.select_related('user').get(id=token_id)
    except EmailUnsubscribeToken.DoesNotExist:
        return Response(
            {
                'error': 'Invalid or expired unsubscribe link',
                'success': False
            },
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if token is valid
    if not token.is_valid():
        if token.is_used:
            return Response(
                {
                    'message': 'You have already unsubscribed',
                    'success': True,
                    'already_unsubscribed': True
                },
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {
                    'error': 'This unsubscribe link has expired. Please contact support.',
                    'success': False
                },
                status=status.HTTP_410_GONE
            )

    if request.method == 'GET':
        # Return confirmation info
        return Response({
            'message': 'Confirm unsubscribe',
            'email': token.user.email,
            'category': token.category,
            'category_display': dict(EmailUnsubscribeToken.CATEGORY_CHOICES).get(token.category, token.category),
            'success': True
        })

    # POST: Process unsubscribe
    if token.mark_used():
        logger.info(f"User {token.user.email} successfully unsubscribed from {token.category} emails")

        return Response({
            'message': f'You have been successfully unsubscribed from {token.get_category_display()} emails',
            'email': token.user.email,
            'category': token.category,
            'success': True
        })
    else:
        return Response(
            {
                'error': 'Unable to process unsubscribe request. Please try again.',
                'success': False
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )