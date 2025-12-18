# backend/core/domains/notifications/serializers.py
from rest_framework import serializers
from core.domains.users.serializers import UserSerializer

from .models import (
    Notification,
    NotificationDigest,
    NotificationPreference,
    NotificationType,
)


class NotificationTypeSerializer(serializers.ModelSerializer):
    """Serializer for notification types"""
    
    class Meta:
        model = NotificationType
        fields = [
            'id', 'code', 'name', 'description', 'category', 'icon', 'color',
            'priority', 'default_title_template', 'default_content_template',
            'default_email_template', 'default_sms_template', 'is_active',
            'is_system', 'supports_email', 'supports_sms', 'auto_read_after_days',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for notification preferences"""
    disabled_types = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=NotificationType.objects.filter(is_active=True),
        required=False
    )
    disabled_types_details = NotificationTypeSerializer(
        source='disabled_types',
        many=True,
        read_only=True
    )
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'user', 'email_enabled', 'sms_enabled', 'in_app_enabled',
            
            # Category preferences
            'system_email', 'system_sms', 'system_in_app',
            'event_email', 'event_sms', 'event_in_app',
            'task_email', 'task_sms', 'task_in_app',
            'payment_email', 'payment_sms', 'payment_in_app',
            'client_email', 'client_sms', 'client_in_app',
            'contract_email', 'contract_sms', 'contract_in_app',
            'workflow_email', 'workflow_sms', 'workflow_in_app',
            'communication_email', 'communication_sms', 'communication_in_app',
            
            # Advanced preferences
            'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end',
            'digest_frequency', 'disabled_types', 'disabled_types_details',
            
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications"""
    notification_type_details = NotificationTypeSerializer(source='notification_type', read_only=True)
    recipient_name = serializers.CharField(source='recipient.get_display_name', read_only=True)
    client_name = serializers.CharField(source='client.get_display_name', read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)
    
    # Computed fields
    time_since_created = serializers.SerializerMethodField()
    delivery_status = serializers.SerializerMethodField()
    can_mark_read = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'recipient_name', 'notification_type', 
            'notification_type_details', 'title', 'content', 'action_url',
            'context_data', 'event', 'event_name', 'client', 'client_name',
            'is_read', 'read_at', 'delivered_via', 'delivery_attempts',
            'expires_at', 'is_expired', 'time_since_created', 'delivery_status',
            'can_mark_read', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'delivered_via', 'delivery_attempts', 'is_expired',
            'created_at', 'updated_at'
        ]
    
    def get_time_since_created(self, obj):
        """Get human-readable time since creation"""
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return "Just now"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff < timedelta(days=7):
            days = int(diff.days)
            return f"{days} day{'s' if days != 1 else ''} ago"
        else:
            return obj.created_at.strftime("%b %d, %Y")
    
    def get_delivery_status(self, obj):
        """Get delivery status summary"""
        return {
            'delivered_methods': obj.delivered_via,
            'total_attempts': sum(len(attempts) for attempts in obj.delivery_attempts.values()),
            'successful_deliveries': len(obj.delivered_via)
        }
    
    def get_can_mark_read(self, obj):
        """Check if notification can be marked as read"""
        request = self.context.get('request')
        if not request:
            return False
        return obj.recipient == request.user and not obj.is_read


class NotificationListSerializer(NotificationSerializer):
    """Lightweight serializer for notification lists"""

    class Meta(NotificationSerializer.Meta):
        fields = [
            'id', 'notification_type_details', 'title', 'content', 'action_url',
            'is_read', 'read_at', 'time_since_created', 'can_mark_read',
            'created_at', 'event', 'event_name'
        ]


class NotificationDigestSerializer(serializers.ModelSerializer):
    """Serializer for notification digests"""
    user_name = serializers.CharField(source='user.get_display_name', read_only=True)
    notifications_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = NotificationDigest
        fields = [
            'id', 'user', 'user_name', 'frequency', 'period_start', 'period_end',
            'notification_count', 'notifications_preview', 'is_sent', 'sent_at',
            'delivery_methods', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_notifications_preview(self, obj):
        """Get preview of notifications in digest"""
        notifications = obj.notifications.all()[:3]
        return [
            {
                'id': n.id,
                'title': n.title,
                'type': n.notification_type.name
            }
            for n in notifications
        ]


class NotificationBulkActionSerializer(serializers.Serializer):
    """Serializer for bulk notification actions"""
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        min_length=1
    )
    action = serializers.ChoiceField(
        choices=['mark_read', 'mark_unread', 'delete'],
        required=True
    )
    
    def validate_notification_ids(self, value):
        """Validate that notification IDs exist and belong to the user"""
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request context required")
        
        user_notification_ids = set(
            Notification.objects.filter(
                recipient=request.user,
                id__in=value
            ).values_list('id', flat=True)
        )
        
        invalid_ids = set(value) - user_notification_ids
        if invalid_ids:
            raise serializers.ValidationError(
                f"Invalid notification IDs: {list(invalid_ids)}"
            )
        
        return value


class NotificationCountSerializer(serializers.Serializer):
    """Serializer for notification counts"""
    total = serializers.IntegerField()
    unread = serializers.IntegerField()
    by_category = serializers.DictField()
    by_priority = serializers.DictField()


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer for notification statistics"""
    period = serializers.CharField()
    total_sent = serializers.IntegerField()
    total_read = serializers.IntegerField()
    read_rate = serializers.FloatField()
    delivery_rates = serializers.DictField()
    popular_types = serializers.ListField()


class CreateNotificationSerializer(serializers.Serializer):
    """Serializer for creating notifications via API"""
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True
    )
    notification_type_code = serializers.CharField(required=True)
    context_data = serializers.DictField(required=False, default=dict)
    force_delivery_methods = serializers.ListField(
        child=serializers.ChoiceField(choices=['email', 'sms', 'in_app']),
        required=False,
        default=list
    )
    
    def validate_notification_type_code(self, value):
        """Validate notification type exists and is active"""
        try:
            notification_type = NotificationType.objects.get(code=value, is_active=True)
            self.notification_type = notification_type
            return value
        except NotificationType.DoesNotExist:
            raise serializers.ValidationError(f"Notification type '{value}' not found")
    
    def validate_recipient_ids(self, value):
        """Validate recipient IDs exist"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        existing_ids = set(User.objects.filter(id__in=value).values_list('id', flat=True))
        invalid_ids = set(value) - existing_ids
        
        if invalid_ids:
            raise serializers.ValidationError(f"Invalid user IDs: {list(invalid_ids)}")
        
        return value