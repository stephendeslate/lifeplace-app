# backend/core/domains/messaging/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import MessageThread, Message, MessageAttachment, MessageRead

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for messaging contexts"""
    name = serializers.CharField(source='get_display_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'name', 'role', 'first_name', 'last_name']


class MessageAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for message attachments"""
    
    class Meta:
        model = MessageAttachment
        fields = ['id', 'filename', 'file_url', 'file_size', 'mime_type']
        read_only_fields = ['id', 'file_url', 'file_size', 'mime_type']


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for messages with sender info and attachments"""
    sender = UserBasicSerializer(read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    read_by = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'content', 'message_type', 'is_internal_note',
            'created_at', 'edited_at', 'sender', 'attachments', 'read_by'
        ]
        read_only_fields = ['id', 'created_at', 'edited_at', 'sender']
    
    def get_read_by(self, obj):
        """Return list of users who have read this message"""
        read_records = MessageRead.objects.filter(message=obj).select_related('user')
        return [
            {
                'id': record.user.id,
                'name': record.user.get_display_name(),
                'read_at': record.read_at
            }
            for record in read_records
        ]


class MessageCreateSerializer(serializers.Serializer):
    """Serializer for creating new messages"""
    thread_id = serializers.UUIDField()
    content = serializers.CharField()
    message_type = serializers.ChoiceField(
        choices=Message.MESSAGE_TYPE_CHOICES,
        default='message'
    )
    is_internal_note = serializers.BooleanField(default=False)
    attachments = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )
    
    def validate_is_internal_note(self, value):
        """Only admins can create internal notes"""
        if value and self.context['request'].user.role != 'ADMIN':
            raise serializers.ValidationError("Only admins can create internal notes")
        return value


class LastMessageSerializer(serializers.ModelSerializer):
    """Serializer for the last message in a thread"""
    sender_name = serializers.CharField(source='sender.get_display_name', read_only=True)
    sent_at = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'content', 'sender_name', 'sent_at', 'message_type']


class AdminSerializer(serializers.ModelSerializer):
    """Basic admin info for thread assignment"""
    name = serializers.CharField(source='get_display_name', read_only=True)
    avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'name', 'avatar']
    
    def get_avatar(self, obj):
        """Return avatar URL - placeholder for now"""
        return None  # TODO: Implement avatar system


class MessageThreadSerializer(serializers.ModelSerializer):
    """Serializer for message threads with event and participant info"""
    event_name = serializers.CharField(read_only=True)
    event_date = serializers.CharField(read_only=True)
    client_id = serializers.IntegerField(read_only=True)
    event_id = serializers.IntegerField(source='event.id', read_only=True)
    last_message = LastMessageSerializer(read_only=True)
    assigned_admin = AdminSerializer(read_only=True)
    unread_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = MessageThread
        fields = [
            'id', 'event_id', 'event_name', 'event_date', 'client_id',
            'priority', 'status', 'assigned_admin', 'last_message',
            'unread_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'event_id', 'event_name', 'event_date', 'client_id', 'created_at', 'updated_at']


class ThreadStatsSerializer(serializers.Serializer):
    """Serializer for thread statistics"""
    total_messages = serializers.IntegerField()
    unread_messages = serializers.IntegerField()
    last_activity = serializers.DateTimeField()
    participants = serializers.ListField(
        child=UserBasicSerializer()
    )


class SendMessageResponseSerializer(serializers.Serializer):
    """Response serializer for sent messages"""
    message = MessageSerializer()
    success = serializers.BooleanField(default=True)