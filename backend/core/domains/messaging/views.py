from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Prefetch
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import MessageThread, Message, MessageReadStatus
from .serializers import (
    MessageThreadListSerializer,
    MessageThreadDetailSerializer,
    MessageThreadCreateSerializer,
    MessageThreadUpdateSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    MessageReadStatusSerializer,
    SupportInquiryCreateSerializer,
    SupportInquiryListSerializer,
    SupportInquiryDetailSerializer,
    AdminSupportInquiryListSerializer,
    AdminSupportInquiryDetailSerializer,
    AdminSupportInquiryUpdateSerializer,
)
from .permissions import (
    CanAccessMessageThread,
    CanManageMessageThread,
    CanAccessMessage,
    MessagingPermissions,
)

User = get_user_model()


class MessageThreadViewSet(viewsets.ModelViewSet):
    """ViewSet for managing message threads"""
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def get_queryset(self):
        """Get threads accessible to the current user"""
        user = self.request.user

        # Base queryset with optimizations
        queryset = MessageThread.objects.select_related(
            'client', 'event', 'assigned_admin'
        ).prefetch_related(
            Prefetch(
                'messages',
                queryset=Message.objects.select_related('sender').order_by('-created_at')
            )
        )

        # Filter based on user role
        if user.role == 'CLIENT':
            # Clients can only see their own threads
            queryset = queryset.filter(client=user)
        elif user.role == 'ADMIN':
            # Admins can see all threads
            pass

        # Apply filters from query parameters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        priority_filter = self.request.query_params.get('priority')
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)

        assigned_admin_filter = self.request.query_params.get('assigned_admin')
        if assigned_admin_filter and user.role == 'ADMIN':
            queryset = queryset.filter(assigned_admin_id=assigned_admin_filter)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search) |
                Q(client__first_name__icontains=search) |
                Q(client__last_name__icontains=search) |
                Q(client__email__icontains=search)
            )

        event_id = self.request.query_params.get('event_id')
        if event_id:
            queryset = queryset.filter(event_id=event_id)

        client_id = self.request.query_params.get('client_id')
        if client_id and user.role == 'ADMIN':
            queryset = queryset.filter(client_id=client_id)

        # Default ordering
        ordering = self.request.query_params.get('ordering', '-last_message_at')
        queryset = queryset.order_by(ordering, '-created_at')

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return MessageThreadCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MessageThreadUpdateSerializer
        elif self.action == 'retrieve':
            return MessageThreadDetailSerializer
        else:
            return MessageThreadListSerializer

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = MessagingPermissions.thread_manage
        elif self.action in ['retrieve', 'messages', 'mark_as_read']:
            permission_classes = MessagingPermissions.thread_access
        else:
            permission_classes = [IsAuthenticated]

        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """Create a new thread with proper defaults"""
        # For admin users creating threads, they can assign themselves
        if self.request.user.role == 'ADMIN':
            # Set assigned_admin to the creating admin if not specified
            if not serializer.validated_data.get('assigned_admin'):
                serializer.validated_data['assigned_admin'] = self.request.user

        serializer.save()

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get messages for a specific thread"""
        thread = self.get_object()

        # Check permissions
        permission = CanAccessMessageThread()
        if not permission.has_object_permission(request, self, thread):
            return Response(
                {'error': 'You do not have permission to access this thread'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get messages for this thread
        messages_query = thread.messages.select_related('sender').prefetch_related('attachments')

        # Filter internal notes for non-admin users
        if request.user.role != 'ADMIN':
            messages_query = messages_query.filter(is_internal_note=False)

        # Pagination
        limit = int(request.query_params.get('limit', 50))
        before = request.query_params.get('before')  # Message ID for pagination

        if before:
            try:
                before_message = Message.objects.get(id=before)
                messages_query = messages_query.filter(created_at__lt=before_message.created_at)
            except Message.DoesNotExist:
                pass

        messages = messages_query.order_by('-created_at')[:limit]

        # Reverse for chronological order
        messages = list(reversed(messages))

        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark all messages in thread as read for current user"""
        thread = self.get_object()

        # Check permissions
        permission = CanAccessMessageThread()
        if not permission.has_object_permission(request, self, thread):
            return Response(
                {'error': 'You do not have permission to access this thread'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get unread messages
        messages_query = thread.messages.all()
        if request.user.role != 'ADMIN':
            messages_query = messages_query.filter(is_internal_note=False)

        unread_messages = messages_query.exclude(read_by=request.user)

        # Mark as read
        for message in unread_messages:
            message.mark_as_read(request.user)

        return Response({'status': 'success', 'marked_read': unread_messages.count()})

    @action(detail=True, methods=['patch'])
    def assign(self, request, pk=None):
        """Assign thread to an admin user (admin only)"""
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only admin users can assign threads'},
                status=status.HTTP_403_FORBIDDEN
            )

        thread = self.get_object()
        admin_id = request.data.get('admin_id')

        if admin_id:
            try:
                admin_user = User.objects.get(id=admin_id, role='ADMIN')
                thread.assigned_admin = admin_user
                thread.save()

                serializer = self.get_serializer(thread)
                return Response(serializer.data)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Admin user not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Unassign
            thread.assigned_admin = None
            thread.save()

            serializer = self.get_serializer(thread)
            return Response(serializer.data)


class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing individual messages"""
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def get_queryset(self):
        """Get messages accessible to current user"""
        user = self.request.user

        queryset = Message.objects.select_related(
            'thread', 'sender'
        ).prefetch_related('attachments')

        # Filter based on thread access
        if user.role == 'CLIENT':
            # Clients can only see messages from their threads and non-internal notes
            queryset = queryset.filter(
                thread__client=user,
                is_internal_note=False
            )
        elif user.role == 'ADMIN':
            # Admins can see all messages
            pass

        # Thread filter
        thread_id = self.request.query_params.get('thread_id')
        if thread_id:
            queryset = queryset.filter(thread_id=thread_id)

        return queryset.order_by('created_at')

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = MessagingPermissions.message_edit
        else:
            permission_classes = MessagingPermissions.message_access

        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """Create a new message"""
        message = serializer.save()

        # Auto-mark as read for sender
        message.mark_as_read(self.request.user)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark a specific message as read"""
        message = self.get_object()

        # Check permissions
        permission = CanAccessMessage()
        if not permission.has_object_permission(request, self, message):
            return Response(
                {'error': 'You do not have permission to access this message'},
                status=status.HTTP_403_FORBIDDEN
            )

        read_status = message.mark_as_read(request.user)
        serializer = MessageReadStatusSerializer(read_status, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_mark_as_read(self, request):
        """Mark multiple messages as read"""
        message_ids = request.data.get('message_ids', [])

        if not message_ids:
            return Response(
                {'error': 'message_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get accessible messages
        messages = self.get_queryset().filter(id__in=message_ids)

        marked_count = 0
        for message in messages:
            # Check individual message permissions
            permission = CanAccessMessage()
            if permission.has_object_permission(request, self, message):
                message.mark_as_read(request.user)
                marked_count += 1

        return Response({
            'status': 'success',
            'marked_read': marked_count,
            'total_requested': len(message_ids)
        })


class MessageThreadAdminViewSet(viewsets.ModelViewSet):
    """Admin-only viewset for advanced thread management"""
    serializer_class = MessageThreadListSerializer
    permission_classes = [IsAuthenticated, CanManageMessageThread]
    throttle_classes = [UserRateThrottle]

    def get_queryset(self):
        """Get all threads for admin management"""
        return MessageThread.objects.select_related(
            'client', 'event', 'assigned_admin'
        ).prefetch_related('messages__sender')

    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        """Bulk assign threads to an admin"""
        thread_ids = request.data.get('thread_ids', [])
        admin_id = request.data.get('admin_id')

        if not thread_ids:
            return Response(
                {'error': 'thread_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        admin_user = None
        if admin_id:
            try:
                admin_user = User.objects.get(id=admin_id, role='ADMIN')
            except User.DoesNotExist:
                return Response(
                    {'error': 'Admin user not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Update threads
        updated_count = MessageThread.objects.filter(
            id__in=thread_ids
        ).update(assigned_admin=admin_user)

        return Response({
            'status': 'success',
            'updated_count': updated_count,
            'assigned_to': admin_user.get_display_name() if admin_user else 'Unassigned'
        })

    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        """Bulk update thread status"""
        thread_ids = request.data.get('thread_ids', [])
        new_status = request.data.get('status')

        if not thread_ids or not new_status:
            return Response(
                {'error': 'thread_ids and status are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate status
        valid_statuses = [choice[0] for choice in MessageThread.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update threads
        updated_count = MessageThread.objects.filter(
            id__in=thread_ids
        ).update(status=new_status)

        return Response({
            'status': 'success',
            'updated_count': updated_count,
            'new_status': new_status
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get messaging statistics for admin dashboard"""
        stats = {
            'total_threads': MessageThread.objects.count(),
            'active_threads': MessageThread.objects.filter(status='active').count(),
            'unassigned_threads': MessageThread.objects.filter(assigned_admin__isnull=True).count(),
            'urgent_threads': MessageThread.objects.filter(priority='urgent').count(),
            'total_messages': Message.objects.count(),
            'messages_today': Message.objects.filter(
                created_at__date=timezone.now().date()
            ).count(),
        }

        # Thread status breakdown
        status_counts = dict(
            MessageThread.objects.values('status').annotate(
                count=Count('status')
            ).values_list('status', 'count')
        )
        stats['status_breakdown'] = status_counts

        # Priority breakdown
        priority_counts = dict(
            MessageThread.objects.values('priority').annotate(
                count=Count('priority')
            ).values_list('priority', 'count')
        )
        stats['priority_breakdown'] = priority_counts

        return Response(stats)


# Support Inquiry ViewSets

class SupportInquiryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for clients to manage their support inquiries.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def get_serializer_class(self):
        if self.action == 'create':
            return SupportInquiryCreateSerializer
        elif self.action == 'retrieve':
            return SupportInquiryDetailSerializer
        return SupportInquiryListSerializer

    def get_queryset(self):
        """Return only support threads for the current user."""
        return MessageThread.objects.filter(
            client=self.request.user,
            thread_type='support'
        ).select_related('event', 'assigned_admin').order_by('-created_at')

    @action(detail=True, methods=['post'])
    def add_reply(self, request, pk=None):
        """Add a reply to a support inquiry."""
        thread = self.get_object()
        content = request.data.get('content')

        if not content:
            return Response(
                {'error': 'Content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        message = Message.objects.create(
            thread=thread,
            sender=request.user,
            content=content,
            message_type='text',
            is_internal_note=False
        )

        return Response(MessageSerializer(message, context={'request': request}).data, status=status.HTTP_201_CREATED)


class AdminSupportInquiryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for admins to manage all support inquiries.
    """
    permission_classes = [IsAuthenticated, CanManageMessageThread]
    throttle_classes = [UserRateThrottle]

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return AdminSupportInquiryUpdateSerializer
        elif self.action == 'retrieve':
            return AdminSupportInquiryDetailSerializer
        return AdminSupportInquiryListSerializer

    def get_queryset(self):
        """Return all support threads with filtering."""
        queryset = MessageThread.objects.filter(
            thread_type='support'
        ).select_related('client', 'event', 'assigned_admin')

        # Filters
        status_filter = self.request.query_params.get('status')
        category = self.request.query_params.get('category')
        assigned_admin = self.request.query_params.get('assigned_admin')
        priority = self.request.query_params.get('priority')
        search = self.request.query_params.get('search')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if category:
            queryset = queryset.filter(category=category)
        if assigned_admin:
            if assigned_admin == 'unassigned':
                queryset = queryset.filter(assigned_admin__isnull=True)
            else:
                queryset = queryset.filter(assigned_admin_id=assigned_admin)
        if priority:
            queryset = queryset.filter(priority=priority)
        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search) |
                Q(client__email__icontains=search) |
                Q(client__first_name__icontains=search) |
                Q(client__last_name__icontains=search)
            )

        return queryset.order_by('-created_at')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get support inquiry statistics."""
        today = timezone.now().date()

        queryset = self.get_queryset()

        stats = {
            'total': queryset.count(),
            'open': queryset.filter(status='active').count(),
            'in_progress': queryset.filter(status='waiting').count(),
            'resolved_today': queryset.filter(
                status='resolved',
                updated_at__date=today
            ).count(),
            'unassigned': queryset.filter(assigned_admin__isnull=True, status='active').count(),
            'by_category': dict(
                queryset.values('category').annotate(count=Count('id')).values_list('category', 'count')
            ),
            'by_priority': dict(
                queryset.filter(status='active').values('priority').annotate(count=Count('id')).values_list('priority', 'count')
            ),
        }

        return Response(stats)

    @action(detail=True, methods=['post'])
    def add_reply(self, request, pk=None):
        """Add an admin reply to a support inquiry."""
        thread = self.get_object()
        content = request.data.get('content')
        is_internal = request.data.get('is_internal_note', False)

        if not content:
            return Response(
                {'error': 'Content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        message = Message.objects.create(
            thread=thread,
            sender=request.user,
            content=content,
            message_type='text',
            is_internal_note=is_internal
        )

        return Response(MessageSerializer(message, context={'request': request}).data, status=status.HTTP_201_CREATED)


class PublicSupportSettingsView(APIView):
    """
    Public endpoint to get support contact information.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from core.domains.settings.models import CompanySettings

        settings = CompanySettings.get_settings()

        return Response({
            'support_email': settings.support_email or settings.email,
            'support_phone': settings.support_phone or settings.phone,
            'support_hours': settings.support_hours,
            'company_name': settings.company_name,
        })