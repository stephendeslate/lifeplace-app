# backend/core/domains/messaging/views.py

from django.db import transaction
from django.db.models import Q, Count, Exists, OuterRef, Prefetch
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MessageThread, Message, MessageAttachment, MessageRead, ThreadActivity
from .serializers import (
    MessageThreadSerializer, MessageSerializer, MessageCreateSerializer, 
    SendMessageResponseSerializer, ThreadStatsSerializer, MessageAttachmentSerializer
)

User = get_user_model()


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admins to access it.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admins can access all threads
        if request.user.role == 'ADMIN':
            return True
        
        # Clients can only access their own event threads
        if hasattr(obj, 'event'):  # MessageThread
            return obj.event.client == request.user
        elif hasattr(obj, 'thread'):  # Message
            return obj.thread.event.client == request.user
            
        return False


class MessageThreadViewSet(viewsets.ModelViewSet):
    """ViewSet for message threads"""
    serializer_class = MessageThreadSerializer
    permission_classes = [IsOwnerOrAdmin]
    
    def get_queryset(self):
        """Filter threads based on user role and permissions"""
        user = self.request.user
        
        # Base queryset with optimizations
        queryset = MessageThread.objects.select_related(
            'event', 
            'event__client', 
            'event__event_type',
            'assigned_admin'
        ).prefetch_related(
            Prefetch(
                'messages',
                queryset=Message.objects.select_related('sender').order_by('-created_at')[:1],
                to_attr='latest_messages'
            )
        )
        
        # Filter based on user role
        if user.role == 'CLIENT':
            queryset = queryset.filter(event__client=user)
        elif user.role == 'ADMIN':
            # Admins can see all threads, optionally filter by assignment
            assigned_admin = self.request.query_params.get('assigned_admin')
            if assigned_admin:
                queryset = queryset.filter(assigned_admin_id=assigned_admin)
        
        # Apply filters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        priority_filter = self.request.query_params.get('priority')
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
            
        event_id = self.request.query_params.get('event_id')
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(event__name__icontains=search) |
                Q(messages__content__icontains=search)
            ).distinct()
        
        # We'll calculate unread_count in the list method for each thread
        
        return queryset.order_by('-updated_at')
    
    def list(self, request, *args, **kwargs):
        """List threads with last message info"""
        queryset = self.get_queryset()
        serializer_data = []
        
        for thread in queryset:
            data = MessageThreadSerializer(thread).data
            # Add last message if available
            if hasattr(thread, 'latest_messages') and thread.latest_messages:
                from .serializers import LastMessageSerializer
                data['last_message'] = LastMessageSerializer(thread.latest_messages[0]).data
            # Calculate unread count for current user
            data['unread_count'] = thread.get_unread_count(request.user)
            serializer_data.append(data)
        
        return Response(serializer_data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark all messages in thread as read"""
        thread = self.get_object()
        user = request.user
        
        # Get unread messages for this user
        unread_messages = Message.objects.filter(
            thread=thread
        ).exclude(
            read_by=user
        ).exclude(
            sender=user  # Don't mark own messages as read
        )
        
        # Filter out internal notes for clients
        if user.role == 'CLIENT':
            unread_messages = unread_messages.filter(is_internal_note=False)
        
        # Bulk create read records
        read_records = [
            MessageRead(user=user, message=message)
            for message in unread_messages
        ]
        MessageRead.objects.bulk_create(read_records, ignore_conflicts=True)
        
        return Response({'status': 'marked_read'})
    
    @action(detail=True, methods=['post'])
    def mark_urgent(self, request, pk=None):
        """Mark thread as urgent - available to clients"""
        thread = self.get_object()
        old_priority = thread.priority
        thread.priority = 'urgent'
        thread.save()
        
        # Create activity record
        ThreadActivity.objects.create(
            thread=thread,
            activity_type='priority_changed',
            actor=request.user,
            description=f"Priority changed from {old_priority} to urgent",
            metadata={'old_priority': old_priority, 'new_priority': 'urgent'}
        )
        
        return Response({'status': 'marked_urgent'})
    
    @action(detail=True, methods=['post'])
    def request_callback(self, request, pk=None):
        """Request callback - creates system message"""
        thread = self.get_object()
        
        # Create system message for callback request
        Message.objects.create(
            thread=thread,
            sender=request.user,
            content=f"{request.user.get_display_name()} has requested a callback.",
            message_type='system'
        )
        
        # Create activity record
        ThreadActivity.objects.create(
            thread=thread,
            activity_type='message_sent',
            actor=request.user,
            description="Callback requested",
            metadata={'message_type': 'callback_request'}
        )
        
        return Response({'status': 'callback_requested'})
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve thread - admin only"""
        if request.user.role != 'ADMIN':
            return Response({'error': 'Only admins can resolve threads'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        thread = self.get_object()
        old_status = thread.status
        thread.status = 'resolved'
        thread.save()
        
        # Create system message
        Message.objects.create(
            thread=thread,
            sender=request.user,
            content=f"Thread resolved by {request.user.get_display_name()}.",
            message_type='system'
        )
        
        # Create activity record
        ThreadActivity.objects.create(
            thread=thread,
            activity_type='status_changed',
            actor=request.user,
            description=f"Status changed from {old_status} to resolved",
            metadata={'old_status': old_status, 'new_status': 'resolved'}
        )
        
        return Response({'status': 'resolved'})
    
    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        """Reopen resolved thread"""
        thread = self.get_object()
        old_status = thread.status
        thread.status = 'active'
        thread.save()
        
        # Create system message
        Message.objects.create(
            thread=thread,
            sender=request.user,
            content=f"Thread reopened by {request.user.get_display_name()}.",
            message_type='system'
        )
        
        # Create activity record
        ThreadActivity.objects.create(
            thread=thread,
            activity_type='status_changed',
            actor=request.user,
            description=f"Status changed from {old_status} to active",
            metadata={'old_status': old_status, 'new_status': 'active'}
        )
        
        return Response({'status': 'reopened'})
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get thread statistics"""
        thread = self.get_object()
        
        # Get participants (users who have sent messages)
        participants = User.objects.filter(
            sent_messages__thread=thread
        ).distinct()
        
        stats = {
            'total_messages': thread.messages.count(),
            'unread_messages': thread.messages.exclude(read_by=request.user).count(),
            'last_activity': thread.updated_at,
            'participants': [
                {
                    'id': user.id,
                    'name': user.get_display_name(),
                    'role': user.role
                }
                for user in participants
            ]
        }
        
        serializer = ThreadStatsSerializer(stats)
        return Response(serializer.data)


class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet for messages"""
    serializer_class = MessageSerializer
    permission_classes = [IsOwnerOrAdmin]
    
    def get_queryset(self):
        """Filter messages based on thread and user permissions"""
        user = self.request.user
        thread_id = self.request.query_params.get('thread_id')
        
        if not thread_id:
            return Message.objects.none()
        
        # Check thread access
        thread = get_object_or_404(MessageThread, id=thread_id)
        if user.role == 'CLIENT' and thread.event.client != user:
            return Message.objects.none()
        
        queryset = Message.objects.filter(thread_id=thread_id).select_related(
            'sender', 'thread'
        ).prefetch_related('attachments', 'read_by')
        
        # Clients don't see internal notes
        if user.role == 'CLIENT':
            queryset = queryset.filter(is_internal_note=False)
        
        # Pagination filters
        before = self.request.query_params.get('before')
        if before:
            queryset = queryset.filter(created_at__lt=before)
        
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                queryset = queryset[:limit]
            except ValueError:
                pass
        
        return queryset.order_by('created_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new message"""
        serializer = MessageCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        thread_id = serializer.validated_data['thread_id']
        thread = get_object_or_404(MessageThread, id=thread_id)
        
        # Check permissions
        if request.user.role == 'CLIENT' and thread.event.client != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        with transaction.atomic():
            # Create message
            message = Message.objects.create(
                thread=thread,
                sender=request.user,
                content=serializer.validated_data['content'],
                message_type=serializer.validated_data.get('message_type', 'message'),
                is_internal_note=serializer.validated_data.get('is_internal_note', False)
            )
            
            # Handle attachments if provided
            attachment_ids = serializer.validated_data.get('attachments', [])
            if attachment_ids:
                # Update existing attachments to link to this message
                MessageAttachment.objects.filter(
                    id__in=attachment_ids,
                    uploaded_by=request.user,
                    message__isnull=True  # Only link unattached files
                ).update(message=message)
            
            # Mark as read by sender
            MessageRead.objects.create(user=request.user, message=message)
            
            # Update thread timestamp
            thread.save()  # Triggers updated_at
            
            # Create activity record
            ThreadActivity.objects.create(
                thread=thread,
                activity_type='message_sent',
                actor=request.user,
                description=f"Message sent by {request.user.get_display_name()}",
                metadata={
                    'message_type': message.message_type,
                    'is_internal_note': message.is_internal_note
                }
            )
        
        response_serializer = SendMessageResponseSerializer({
            'message': message,
            'success': True
        })
        
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark specific message as read"""
        message = self.get_object()
        MessageRead.objects.get_or_create(
            user=request.user,
            message=message
        )
        return Response({'status': 'marked_read'})


class AttachmentUploadView(APIView):
    """Handle file uploads for message attachments"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Upload file and return attachment info"""
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create attachment record (without linking to message yet)
        attachment = MessageAttachment.objects.create(
            filename=file_obj.name,
            file_url=f"/media/message_attachments/{file_obj.name}",  # Simplified for now
            file_size=file_obj.size,
            mime_type=file_obj.content_type or 'application/octet-stream',
            uploaded_by=request.user,
            message=None  # Will be linked when message is created
        )
        
        # TODO: Actually handle file storage (S3, local media, etc.)
        # For now, just return the attachment info
        
        return Response({
            'id': str(attachment.id),
            'url': attachment.file_url,
            'filename': attachment.filename,
            'size': attachment.file_size
        }, status=status.HTTP_201_CREATED)


class TypingIndicatorView(APIView):
    """Handle typing indicators"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, thread_id):
        """Send typing indicator"""
        thread = get_object_or_404(MessageThread, id=thread_id)
        
        # Check permissions
        if request.user.role == 'CLIENT' and thread.event.client != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        is_typing = request.data.get('is_typing', False)
        
        # TODO: Implement WebSocket or Server-Sent Events for real-time typing
        # For now, just return success
        
        return Response({'status': 'typing_updated', 'is_typing': is_typing})