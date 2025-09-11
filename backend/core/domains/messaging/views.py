"""
Views for the messaging domain.

This module provides REST API endpoints for message threads and messages,
with proper permissions and filtering for both admin and client users.
"""

import logging
from django.db import transaction
from django.db.models import Q, Count, Max, Prefetch
from django.utils import timezone
from django.http import FileResponse, Http404
from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend

from core.utils.pagination import StandardResultsSetPagination
from core.utils.permissions import IsAdmin, IsClient, IsAdminOrClient

from .models import (
    MessageThread,
    ThreadParticipant,
    Message,
    MessageAttachment,
    MessageReadReceipt,
    TypingIndicator
)
from .serializers import (
    MessageThreadListSerializer,
    MessageThreadDetailSerializer,
    CreateMessageThreadSerializer,
    UpdateMessageThreadSerializer,
    MessageSerializer,
    CreateMessageSerializer,
    MessageAttachmentSerializer,
    TypingIndicatorSerializer,
    MessageReadReceiptSerializer,
    FileUploadSerializer
)
from .services import MessagingService, NotificationService

logger = logging.getLogger(__name__)


class MessageThreadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing message threads
    
    Provides CRUD operations for message threads with proper
    permission-based filtering and access control.
    """
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['subject', 'client__first_name', 'client__last_name', 'client__email']
    filterset_fields = ['status', 'priority', 'assigned_admin']
    ordering_fields = ['created_at', 'last_message_at', 'priority']
    ordering = ['-last_message_at']
    
    def get_permissions(self):
        """Get permissions based on action"""
        if self.action in ['create', 'assign_admin', 'bulk_update']:
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAdminOrClient]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Get queryset based on user role and filters"""
        user = self.request.user
        
        # Base queryset with optimizations
        queryset = MessageThread.objects.with_details()
        
        # Filter based on user role
        if user.role == 'CLIENT':
            # Clients can only see their own threads
            queryset = queryset.filter(client=user)
        elif user.role == 'ADMIN':
            # Admins can see all threads
            # Add filtering options for admins
            unassigned = self.request.query_params.get('unassigned')
            if unassigned and unassigned.lower() == 'true':
                queryset = queryset.filter(assigned_admin__isnull=True)
            
            assigned_to_me = self.request.query_params.get('assigned_to_me')
            if assigned_to_me and assigned_to_me.lower() == 'true':
                queryset = queryset.filter(assigned_admin=user)
        
        # Add unread count annotation
        queryset = queryset.with_unread_counts(user.id)
        
        return queryset
    
    def get_serializer_class(self):
        """Get appropriate serializer based on action"""
        if self.action == 'list':
            return MessageThreadListSerializer
        elif self.action == 'create':
            return CreateMessageThreadSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateMessageThreadSerializer
        else:
            return MessageThreadDetailSerializer
    
    def perform_create(self, serializer):
        """Create thread with proper initialization"""
        with transaction.atomic():
            thread = serializer.save()
            
            # Log creation
            logger.info(f"Message thread created: {thread.id} by user {self.request.user.id}")
            
            # Send notification to client if created by admin
            if self.request.user.role == 'ADMIN' and self.request.user != thread.client:
                NotificationService.notify_thread_created(thread, self.request.user)
    
    def perform_update(self, serializer):
        """Update thread with notifications"""
        old_status = serializer.instance.status
        old_admin = serializer.instance.assigned_admin
        
        thread = serializer.save()
        
        # Send notifications for status changes
        if old_status != thread.status:
            NotificationService.notify_thread_status_changed(thread, old_status)
        
        # Send notifications for assignment changes
        if old_admin != thread.assigned_admin:
            NotificationService.notify_thread_assigned(thread, old_admin)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def assign_admin(self, request, pk=None):
        """Assign admin to thread"""
        thread = self.get_object()
        admin_id = request.data.get('admin_id')
        
        if not admin_id:
            return Response(
                {'error': 'admin_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            admin = User.objects.get(id=admin_id, role='ADMIN')
        except User.DoesNotExist:
            return Response(
                {'error': 'Admin user not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        old_admin = thread.assigned_admin
        thread.assigned_admin = admin
        thread.save()
        
        # Add admin as participant if not already
        thread.add_participant(admin)
        
        # Send notification
        NotificationService.notify_thread_assigned(thread, old_admin)
        
        serializer = self.get_serializer(thread)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_urgent(self, request, pk=None):
        """Mark thread as urgent"""
        thread = self.get_object()
        
        # Only admins can mark as urgent, or clients can mark their own threads
        if request.user.role == 'CLIENT' and thread.client != request.user:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        thread.priority = 'urgent'
        thread.save()
        
        # Notify assigned admin if marked urgent by client
        if request.user.role == 'CLIENT' and thread.assigned_admin:
            NotificationService.notify_thread_marked_urgent(thread)
        
        serializer = self.get_serializer(thread)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve thread"""
        thread = self.get_object()
        
        # Only admins can resolve threads
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only admins can resolve threads'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        thread.status = 'resolved'
        thread.save()
        
        # Send notification to client
        NotificationService.notify_thread_resolved(thread)
        
        serializer = self.get_serializer(thread)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        """Reopen resolved thread"""
        thread = self.get_object()
        
        if thread.status != 'resolved':
            return Response(
                {'error': 'Thread is not resolved'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        thread.status = 'active'
        thread.save()
        
        # Send notification
        NotificationService.notify_thread_reopened(thread)
        
        serializer = self.get_serializer(thread)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def stats(self, request):
        """Get thread statistics for admin dashboard"""
        queryset = self.get_queryset()
        
        stats = {
            'total': queryset.count(),
            'active': queryset.filter(status='active').count(),
            'waiting': queryset.filter(status='waiting').count(),
            'resolved': queryset.filter(status='resolved').count(),
            'urgent': queryset.filter(priority='urgent').count(),
            'unassigned': queryset.filter(assigned_admin__isnull=True).count(),
            'assigned_to_me': queryset.filter(assigned_admin=request.user).count()
        }
        
        return Response(stats)


class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing messages within threads
    
    Provides CRUD operations for messages with proper
    permission-based access and real-time features.
    """
    serializer_class = MessageSerializer
    pagination_class = StandardResultsSetPagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at']
    ordering = ['created_at']
    
    def get_permissions(self):
        """Get permissions based on action"""
        return [IsAdminOrClient()]
    
    def get_queryset(self):
        """Get messages with proper filtering"""
        user = self.request.user
        
        # Base queryset with optimizations
        queryset = Message.objects.select_related('sender', 'thread').prefetch_related('attachments')
        
        # Filter by thread if provided
        thread_id = self.request.query_params.get('thread')
        if thread_id:
            queryset = queryset.filter(thread_id=thread_id)
            
            # Check thread access
            try:
                thread = MessageThread.objects.get(id=thread_id)
                if user.role == 'CLIENT' and thread.client != user:
                    return queryset.none()
            except MessageThread.DoesNotExist:
                return queryset.none()
        
        # Filter internal notes for clients
        if user.role == 'CLIENT':
            queryset = queryset.filter(is_internal_note=False)
        
        # Filter by sender if provided
        sender_id = self.request.query_params.get('sender')
        if sender_id:
            queryset = queryset.filter(sender_id=sender_id)
        
        return queryset
    
    def get_serializer_class(self):
        """Get appropriate serializer based on action"""
        if self.action == 'create':
            return CreateMessageSerializer
        return MessageSerializer
    
    def perform_create(self, serializer):
        """Create message with real-time notifications"""
        with transaction.atomic():
            message = serializer.save()
            
            # Mark message as read by sender
            message.mark_as_read_by(self.request.user)
            
            # Clear typing indicator for sender
            TypingIndicator.objects.filter(
                thread=message.thread,
                user=self.request.user
            ).delete()
            
            # Send real-time notification via WebSocket
            MessagingService.broadcast_new_message(message)
            
            # Send push notifications to other participants
            NotificationService.notify_new_message(message)
            
            logger.info(f"Message created: {message.id} in thread {message.thread.id}")
    
    def update(self, request, *args, **kwargs):
        """Update message with edit tracking"""
        instance = self.get_object()
        
        # Check edit permissions
        if instance.sender != request.user:
            return Response(
                {'error': 'You can only edit your own messages'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check time limit (15 minutes)
        time_limit = timezone.now() - timezone.timedelta(minutes=15)
        if instance.created_at < time_limit:
            return Response(
                {'error': 'Message can only be edited within 15 minutes'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Store original content if first edit
        if not instance.original_content:
            instance.original_content = instance.content
        
        instance.edited_at = timezone.now()
        
        response = super().update(request, *args, **kwargs)
        
        # Broadcast edit to WebSocket
        if response.status_code == 200:
            MessagingService.broadcast_message_edited(instance)
        
        return response
    
    def destroy(self, request, *args, **kwargs):
        """Delete message with permissions check"""
        instance = self.get_object()
        
        # Check delete permissions
        if request.user.role == 'ADMIN':
            # Admins can delete any message
            pass
        elif instance.sender == request.user:
            # Users can delete their own messages within 1 hour
            time_limit = timezone.now() - timezone.timedelta(hours=1)
            if instance.created_at < time_limit:
                return Response(
                    {'error': 'Message can only be deleted within 1 hour'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Broadcast deletion before deleting
        MessagingService.broadcast_message_deleted(instance)
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark message as read by current user"""
        message = self.get_object()
        receipt = message.mark_as_read_by(request.user)
        
        # Broadcast read receipt
        MessagingService.broadcast_message_read(message, request.user)
        
        serializer = MessageReadReceiptSerializer(receipt)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_thread_read(self, request):
        """Mark all messages in thread as read"""
        thread_id = request.data.get('thread_id')
        if not thread_id:
            return Response(
                {'error': 'thread_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            thread = MessageThread.objects.get(id=thread_id)
            
            # Check access
            if request.user.role == 'CLIENT' and thread.client != request.user:
                return Response(
                    {'error': 'Permission denied'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except MessageThread.DoesNotExist:
            return Response(
                {'error': 'Thread not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get unread messages
        unread_messages = thread.messages.exclude(read_receipts__user=request.user)
        if request.user.role == 'CLIENT':
            unread_messages = unread_messages.filter(is_internal_note=False)
        
        # Mark all as read
        with transaction.atomic():
            for message in unread_messages:
                message.mark_as_read_by(request.user)
        
        # Broadcast bulk read
        MessagingService.broadcast_thread_read(thread, request.user)
        
        return Response({'marked_read': unread_messages.count()})


class MessageAttachmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for message attachments
    
    Provides read-only access to message attachments with
    proper security and download functionality.
    """
    serializer_class = MessageAttachmentSerializer
    permission_classes = [IsAdminOrClient]
    
    def get_queryset(self):
        """Get attachments with proper filtering"""
        user = self.request.user
        queryset = MessageAttachment.objects.select_related('message__thread', 'uploaded_by')
        
        # Filter based on thread access
        if user.role == 'CLIENT':
            queryset = queryset.filter(message__thread__client=user)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download attachment file"""
        attachment = self.get_object()
        
        try:
            response = FileResponse(
                attachment.file.open('rb'),
                as_attachment=True,
                filename=attachment.filename
            )
            response['Content-Type'] = attachment.file_type
            return response
        except FileNotFoundError:
            raise Http404("File not found")


class TypingIndicatorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing typing indicators
    
    Handles real-time typing status for message threads.
    """
    serializer_class = TypingIndicatorSerializer
    permission_classes = [IsAdminOrClient]
    
    def get_queryset(self):
        """Get typing indicators with proper filtering"""
        user = self.request.user
        queryset = TypingIndicator.objects.select_related('thread', 'user')
        
        # Filter based on thread access
        if user.role == 'CLIENT':
            queryset = queryset.filter(thread__client=user)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create or update typing indicator"""
        thread = serializer.validated_data['thread']
        
        # Check thread access
        if self.request.user.role == 'CLIENT' and thread.client != self.request.user:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create or update typing indicator
        indicator, created = TypingIndicator.objects.update_or_create(
            thread=thread,
            user=self.request.user,
            defaults={
                'is_typing': serializer.validated_data.get('is_typing', True),
                'last_activity': timezone.now()
            }
        )
        
        # Broadcast typing status
        MessagingService.broadcast_typing_status(indicator)
        
        return indicator
    
    @action(detail=False, methods=['post'])
    def update_typing(self, request):
        """Update typing status for thread"""
        thread_id = request.data.get('thread_id')
        is_typing = request.data.get('is_typing', True)
        
        if not thread_id:
            return Response(
                {'error': 'thread_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            thread = MessageThread.objects.get(id=thread_id)
            
            # Check access
            if request.user.role == 'CLIENT' and thread.client != request.user:
                return Response(
                    {'error': 'Permission denied'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except MessageThread.DoesNotExist:
            return Response(
                {'error': 'Thread not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update typing indicator
        indicator, created = TypingIndicator.objects.update_or_create(
            thread=thread,
            user=request.user,
            defaults={
                'is_typing': is_typing,
                'last_activity': timezone.now()
            }
        )
        
        # Broadcast typing status
        MessagingService.broadcast_typing_status(indicator)
        
        # Clean up if stopped typing
        if not is_typing:
            indicator.delete()
            return Response({'status': 'typing_stopped'})
        
        serializer = self.get_serializer(indicator)
        return Response(serializer.data)


# File upload views
class FileUploadView(viewsets.ViewSet):
    """
    ViewSet for handling file uploads
    
    Provides standalone file upload functionality for messages.
    """
    permission_classes = [IsAdminOrClient]
    parser_classes = [MultiPartParser, FormParser]
    
    def create(self, request):
        """Upload file for later attachment to message"""
        serializer = FileUploadSerializer(data=request.data)
        if serializer.is_valid():
            file = serializer.validated_data['file']
            
            # Create temporary attachment (without message)
            attachment = MessageAttachment.objects.create(
                file=file,
                filename=file.name,
                uploaded_by=request.user,
                message=None  # Will be set when message is created
            )
            
            attachment_serializer = MessageAttachmentSerializer(
                attachment, 
                context={'request': request}
            )
            return Response(attachment_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)