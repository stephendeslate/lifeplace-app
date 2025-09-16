"""
Serializers for the messaging domain.

This module provides serializers for handling message thread and message data
serialization/deserialization for both API endpoints and frontend interfaces.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import (
    MessageThread,
    ThreadParticipant, 
    Message,
    MessageAttachment,
    MessageReadReceipt,
    TypingIndicator
)

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user information for messages"""
    display_name = serializers.CharField(source='get_display_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'role', 'display_name']
        read_only_fields = ['id', 'email', 'role', 'display_name']


class MessageAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for message attachments"""
    file_url = serializers.SerializerMethodField()
    file_size_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = MessageAttachment
        fields = [
            'id', 'filename', 'file_url', 'file_size', 'file_size_formatted', 
            'file_type', 'uploaded_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'file_size', 'file_type']
    
    def get_file_url(self, obj):
        """Get the full URL for the file"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_file_size_formatted(self, obj):
        """Format file size in human readable format"""
        if not obj.file_size:
            return "0 B"
        
        size = obj.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for individual messages"""
    sender = UserBasicSerializer(read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    is_read_by_user = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'thread', 'sender', 'content', 'message_type', 
            'is_internal_note', 'edited_at', 'original_content', 
            'parent_message', 'attachments', 'created_at', 'updated_at',
            'is_read_by_user', 'can_edit', 'can_delete', 'time_ago'
        ]
        read_only_fields = [
            'id', 'sender', 'edited_at', 'original_content', 'created_at', 
            'updated_at', 'is_read_by_user', 'can_edit', 'can_delete', 'time_ago'
        ]
    
    def get_is_read_by_user(self, obj):
        """Check if current user has read this message"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.is_read_by(request.user)
        return False
    
    def get_can_edit(self, obj):
        """Check if current user can edit this message"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Only sender can edit within 15 minutes
            if obj.sender == request.user:
                time_limit = timezone.now() - timezone.timedelta(minutes=15)
                return obj.created_at > time_limit
        return False
    
    def get_can_delete(self, obj):
        """Check if current user can delete this message"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Sender can delete within 1 hour, admins can always delete
            if request.user.role == 'ADMIN':
                return True
            if obj.sender == request.user:
                time_limit = timezone.now() - timezone.timedelta(hours=1)
                return obj.created_at > time_limit
        return False
    
    def get_time_ago(self, obj):
        """Get human readable time ago"""
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"


class CreateMessageSerializer(serializers.ModelSerializer):
    """Serializer for creating new messages"""
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        allow_empty=True,
        max_length=10  # Max 10 files per message
    )
    
    class Meta:
        model = Message
        fields = ['thread', 'content', 'message_type', 'is_internal_note', 'parent_message', 'attachments']
    
    def validate_content(self, value):
        """Validate message content"""
        if not value.strip():
            raise serializers.ValidationError("Message content cannot be empty.")
        if len(value) > 5000:
            raise serializers.ValidationError("Message content cannot exceed 5000 characters.")
        return value.strip()
    
    def validate_is_internal_note(self, value):
        """Validate internal note permission"""
        request = self.context.get('request')
        if value and request and request.user.role != 'ADMIN':
            raise serializers.ValidationError("Only admin users can create internal notes.")
        return value
    
    def validate_thread(self, value):
        """Validate thread access"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Check if user has access to this thread
            if request.user.role == 'CLIENT':
                # Clients can only access their own threads
                if value.client != request.user:
                    raise serializers.ValidationError("You don't have access to this thread.")
            # Admins can access all threads
        return value
    
    def create(self, validated_data):
        """Create message with attachments"""
        attachments_data = validated_data.pop('attachments', [])
        request = self.context.get('request')
        
        # Set sender from request
        validated_data['sender'] = request.user
        
        # Create message
        message = Message.objects.create(**validated_data)
        
        # Create attachments
        for attachment_file in attachments_data:
            MessageAttachment.objects.create(
                message=message,
                file=attachment_file,
                filename=attachment_file.name,
                uploaded_by=request.user
            )
        
        # Reload the message with proper prefetching for serialization
        message = Message.objects.select_related('sender').prefetch_related('attachments').get(id=message.id)
        
        return message


class ThreadParticipantSerializer(serializers.ModelSerializer):
    """Serializer for thread participants"""
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = ThreadParticipant
        fields = [
            'id', 'user', 'joined_at', 'is_active', 
            'notifications_enabled', 'created_at'
        ]
        read_only_fields = ['id', 'joined_at', 'created_at']


class MessageThreadListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for thread list views"""
    client = UserBasicSerializer(read_only=True)
    assigned_admin = UserBasicSerializer(read_only=True)
    event_name = serializers.CharField(read_only=True)
    client_name = serializers.CharField(read_only=True)
    unread_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    
    class Meta:
        model = MessageThread
        fields = [
            'id', 'client', 'event', 'event_name', 'client_name',
            'assigned_admin', 'priority', 'status', 'subject',
            'last_message_at', 'last_message_content', 'last_message_sender_name',
            'unread_count', 'last_message_preview', 'can_manage',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'last_message_at', 'last_message_content', 
            'last_message_sender_name', 'created_at', 'updated_at'
        ]
    
    def get_unread_count(self, obj):
        """Get unread message count for current user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.get_unread_count_for_user(request.user)
        return 0
    
    def get_last_message_preview(self, obj):
        """Get formatted last message preview"""
        if obj.last_message_content:
            preview = obj.last_message_content[:100]
            if len(obj.last_message_content) > 100:
                preview += "..."
            return preview
        return ""
    
    def get_can_manage(self, obj):
        """Check if current user can manage this thread"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user.role == 'ADMIN'
        return False


class MessageThreadDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for thread detail views"""
    client = UserBasicSerializer(read_only=True)
    assigned_admin = UserBasicSerializer(read_only=True)
    participants = ThreadParticipantSerializer(many=True, read_only=True)
    messages = serializers.SerializerMethodField()
    event_name = serializers.CharField(read_only=True)
    event_date = serializers.CharField(read_only=True)
    client_name = serializers.CharField(read_only=True)
    unread_count = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    typing_users = serializers.SerializerMethodField()
    
    class Meta:
        model = MessageThread
        fields = [
            'id', 'client', 'event', 'event_name', 'event_date', 'client_name',
            'assigned_admin', 'priority', 'status', 'subject',
            'participants', 'messages', 'unread_count', 'can_manage',
            'typing_users', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_messages(self, obj):
        """Get paginated messages for this thread"""
        request = self.context.get('request')
        
        # Get messages with proper filtering
        messages_queryset = obj.messages.select_related('sender').prefetch_related('attachments')
        
        # Filter internal notes for clients
        if request and request.user.role == 'CLIENT':
            messages_queryset = messages_queryset.filter(is_internal_note=False)
        
        # Order by creation time
        messages_queryset = messages_queryset.order_by('created_at')
        
        # Serialize messages
        return MessageSerializer(
            messages_queryset,
            many=True,
            context=self.context
        ).data
    
    def get_unread_count(self, obj):
        """Get unread message count for current user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.get_unread_count_for_user(request.user)
        return 0
    
    def get_can_manage(self, obj):
        """Check if current user can manage this thread"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user.role == 'ADMIN'
        return False
    
    def get_typing_users(self, obj):
        """Get currently typing users"""
        # Clean up stale indicators first
        TypingIndicator.cleanup_stale_indicators()
        
        # Get active typing indicators
        typing_indicators = obj.typing_indicators.filter(
            is_typing=True,
            last_activity__gte=timezone.now() - timezone.timedelta(minutes=2)
        ).select_related('user')
        
        return [
            {
                'id': indicator.user.id,
                'name': indicator.user.get_display_name(),
                'last_activity': indicator.last_activity
            }
            for indicator in typing_indicators
        ]


class CreateMessageThreadSerializer(serializers.ModelSerializer):
    """Serializer for creating new message threads"""
    
    class Meta:
        model = MessageThread
        fields = ['client', 'event', 'priority', 'subject']
    
    def validate_client(self, value):
        """Validate client exists and has correct role"""
        if value.role != 'CLIENT':
            raise serializers.ValidationError("Selected user must be a client.")
        return value
    
    def validate_event(self, value):
        """Validate event belongs to client if specified"""
        if value:
            client = self.initial_data.get('client')
            if client and value.client_id != client:
                raise serializers.ValidationError("Event must belong to the selected client.")
        return value
    
    def create(self, validated_data):
        """Create thread and add participants"""
        thread = MessageThread.objects.create(**validated_data)
        
        # Add client as participant
        thread.add_participant(thread.client)
        
        # Add creating user as participant if admin
        request = self.context.get('request')
        if request and request.user.role == 'ADMIN' and request.user != thread.client:
            thread.add_participant(request.user)
        
        return thread


class UpdateMessageThreadSerializer(serializers.ModelSerializer):
    """Serializer for updating message threads"""
    
    class Meta:
        model = MessageThread
        fields = ['assigned_admin', 'priority', 'status', 'subject']
    
    def validate_assigned_admin(self, value):
        """Validate assigned admin has correct role"""
        if value and value.role != 'ADMIN':
            raise serializers.ValidationError("Assigned user must be an admin.")
        return value


class TypingIndicatorSerializer(serializers.ModelSerializer):
    """Serializer for typing indicators"""
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = TypingIndicator
        fields = ['id', 'thread', 'user', 'is_typing', 'last_activity']
        read_only_fields = ['id', 'user', 'last_activity']


class MessageReadReceiptSerializer(serializers.ModelSerializer):
    """Serializer for message read receipts"""
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = MessageReadReceipt
        fields = ['id', 'message', 'user', 'read_at']
        read_only_fields = ['id', 'user', 'read_at']


# File upload serializers
class FileUploadSerializer(serializers.Serializer):
    """Serializer for standalone file uploads"""
    file = serializers.FileField()
    
    def validate_file(self, value):
        """Validate file size and type"""
        # Max file size: 10MB
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File size cannot exceed 10MB.")
        
        # Check file extension
        allowed_extensions = [
            'pdf', 'doc', 'docx', 'txt', 'rtf',  # Documents
            'jpg', 'jpeg', 'png', 'gif', 'webp',  # Images
            'mp4', 'mov', 'avi', 'mkv',  # Videos
            'mp3', 'wav', 'ogg',  # Audio
            'zip', 'rar', '7z'  # Archives
        ]
        
        import os
        file_extension = os.path.splitext(value.name)[1][1:].lower()
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type '{file_extension}' is not allowed. "
                f"Allowed types: {', '.join(allowed_extensions)}"
            )
        
        return value