# backend/core/domains/notifications/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    NotificationTemplate,
    NotificationPreference,
    NotificationRule,
    NotificationQueue,
    NotificationHistory,
    InAppNotification
)

User = get_user_model()


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for notification templates"""
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'name', 'description', 'notification_type', 'channels',
            'email_subject', 'email_body', 'sms_body', 'push_title', 'push_body',
            'in_app_title', 'in_app_body', 'is_active', 'is_system', 'priority',
            'variables_schema', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_channels(self, value):
        """Validate that channels are valid"""
        valid_channels = [choice[0] for choice in NotificationTemplate.CHANNEL_CHOICES]
        for channel in value:
            if channel not in valid_channels:
                raise serializers.ValidationError(f"Invalid channel: {channel}")
        return value
    
    def validate(self, data):
        """Validate template content based on supported channels"""
        channels = data.get('channels', [])
        
        if 'EMAIL' in channels:
            if not data.get('email_subject') or not data.get('email_body'):
                raise serializers.ValidationError(
                    "Email subject and body are required when EMAIL channel is enabled"
                )
        
        if 'SMS' in channels and not data.get('sms_body'):
            raise serializers.ValidationError(
                "SMS body is required when SMS channel is enabled"
            )
        
        if 'PUSH' in channels:
            if not data.get('push_title') or not data.get('push_body'):
                raise serializers.ValidationError(
                    "Push title and body are required when PUSH channel is enabled"
                )
        
        if 'IN_APP' in channels:
            if not data.get('in_app_title') or not data.get('in_app_body'):
                raise serializers.ValidationError(
                    "In-app title and body are required when IN_APP channel is enabled"
                )
        
        return data


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for user notification preferences"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'user', 'user_email', 'user_name', 'email_enabled', 'sms_enabled',
            'push_enabled', 'in_app_enabled', 'quiet_hours_enabled',
            'quiet_hours_start', 'quiet_hours_end', 'quiet_hours_timezone',
            'digest_frequency', 'notification_settings', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate quiet hours configuration"""
        if data.get('quiet_hours_enabled'):
            if not data.get('quiet_hours_start') or not data.get('quiet_hours_end'):
                raise serializers.ValidationError(
                    "Quiet hours start and end times are required when quiet hours are enabled"
                )
        
        return data


class NotificationRuleSerializer(serializers.ModelSerializer):
    """Serializer for notification rules"""
    template_name = serializers.CharField(source='template.name', read_only=True)
    template_type = serializers.CharField(source='template.notification_type', read_only=True)
    target_user_names = serializers.SerializerMethodField()
    
    class Meta:
        model = NotificationRule
        fields = [
            'id', 'name', 'description', 'event_type', 'conditions',
            'template', 'template_name', 'template_type', 'target_users',
            'target_user_names', 'target_roles', 'delay_minutes',
            'max_frequency_hours', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_target_user_names(self, obj):
        """Get names of target users"""
        return [
            user.get_full_name() or user.email 
            for user in obj.target_users.all()
        ]
    
    def validate_conditions(self, value):
        """Validate conditions JSON structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Conditions must be a JSON object")
        return value
    
    def validate_target_roles(self, value):
        """Validate target roles"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Target roles must be a list")
        
        valid_roles = ['ADMIN', 'CLIENT']  # Add other roles as needed
        for role in value:
            if role not in valid_roles:
                raise serializers.ValidationError(f"Invalid role: {role}")
        
        return value


class NotificationRuleCreateSerializer(NotificationRuleSerializer):
    """Serializer for creating notification rules"""
    
    def validate(self, data):
        """Validate rule data"""
        # Ensure either target_users or target_roles is specified
        target_users = data.get('target_users', [])
        target_roles = data.get('target_roles', [])
        
        if not target_users and not target_roles:
            raise serializers.ValidationError(
                "Either target_users or target_roles must be specified"
            )
        
        return data


class NotificationQueueSerializer(serializers.ModelSerializer):
    """Serializer for notification queue"""
    template_name = serializers.CharField(source='template.name', read_only=True)
    recipient_email = serializers.EmailField(source='recipient.email', read_only=True)
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    
    class Meta:
        model = NotificationQueue
        fields = [
            'id', 'template', 'template_name', 'rule', 'recipient',
            'recipient_email', 'recipient_name', 'channel', 'subject',
            'content', 'context_data', 'priority', 'scheduled_at',
            'attempts', 'max_attempts', 'status', 'error_message',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'attempts', 'status', 'error_message', 'created_at', 'updated_at'
        ]


class NotificationHistorySerializer(serializers.ModelSerializer):
    """Serializer for notification history"""
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    
    class Meta:
        model = NotificationHistory
        fields = [
            'id', 'template_name', 'notification_type', 'channel',
            'recipient', 'recipient_name', 'recipient_email', 'recipient_phone',
            'subject', 'content', 'context_data', 'external_message_id',
            'sent_at', 'delivered_at', 'opened_at', 'clicked_at',
            'delivery_status', 'is_read', 'rule_id', 'queue_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'external_message_id', 'sent_at', 'delivered_at',
            'opened_at', 'clicked_at', 'delivery_status', 'created_at', 'updated_at'
        ]


class InAppNotificationSerializer(serializers.ModelSerializer):
    """Serializer for in-app notifications"""
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = InAppNotification
        fields = [
            'id', 'recipient', 'recipient_name', 'title', 'message',
            'notification_type', 'priority', 'action_url', 'action_data',
            'is_read', 'read_at', 'expires_at', 'time_ago',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'recipient', 'read_at', 'created_at', 'updated_at'
        ]
    
    def get_time_ago(self, obj):
        """Get human-readable time since creation"""
        from django.utils.timesince import timesince
        return timesince(obj.created_at)


class SendNotificationSerializer(serializers.Serializer):
    """Serializer for manually sending notifications"""
    notification_type = serializers.CharField()
    recipients = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of user IDs to send notification to"
    )
    context_data = serializers.JSONField(required=False, default=dict)
    priority = serializers.ChoiceField(
        choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('URGENT', 'Urgent')],
        default='MEDIUM'
    )
    delay_minutes = serializers.IntegerField(default=0, min_value=0)
    
    def validate_recipients(self, value):
        """Validate that all recipient IDs exist"""
        if not value:
            raise serializers.ValidationError("At least one recipient is required")
        
        existing_users = User.objects.filter(id__in=value, is_active=True)
        existing_ids = set(existing_users.values_list('id', flat=True))
        provided_ids = set(value)
        
        missing_ids = provided_ids - existing_ids
        if missing_ids:
            raise serializers.ValidationError(
                f"Invalid user IDs: {list(missing_ids)}"
            )
        
        return value


class NotificationAnalyticsSerializer(serializers.Serializer):
    """Serializer for notification analytics"""
    total_sent = serializers.IntegerField()
    delivered = serializers.IntegerField()
    opened = serializers.IntegerField()
    clicked = serializers.IntegerField()
    failed = serializers.IntegerField()
    bounced = serializers.IntegerField()
    delivery_rate = serializers.FloatField()
    open_rate = serializers.FloatField()
    click_rate = serializers.FloatField()
    failure_rate = serializers.FloatField()


class ChannelPerformanceSerializer(serializers.Serializer):
    """Serializer for channel performance analytics"""
    channel = serializers.CharField()
    total = serializers.IntegerField()
    delivered = serializers.IntegerField()
    failed = serializers.IntegerField()


class UserEngagementSerializer(serializers.Serializer):
    """Serializer for user engagement analytics"""
    total_received = serializers.IntegerField()
    total_opened = serializers.IntegerField()
    total_clicked = serializers.IntegerField()
    total_in_app = serializers.IntegerField()
    read_in_app = serializers.IntegerField()


class NotificationPreferenceUpdateSerializer(serializers.Serializer):
    """Serializer for updating specific notification preferences"""
    notification_type = serializers.CharField()
    channel = serializers.ChoiceField(choices=NotificationTemplate.CHANNEL_CHOICES)
    enabled = serializers.BooleanField()
    
    def validate_notification_type(self, value):
        """Validate notification type exists"""
        valid_types = [choice[0] for choice in NotificationTemplate.NOTIFICATION_TYPES]
        if value not in valid_types:
            raise serializers.ValidationError(f"Invalid notification type: {value}")
        return value


class TestNotificationSerializer(serializers.Serializer):
    """Serializer for sending test notifications"""
    template_id = serializers.IntegerField()
    channel = serializers.ChoiceField(choices=NotificationTemplate.CHANNEL_CHOICES)
    recipient_email = serializers.EmailField()
    context_data = serializers.JSONField(required=False, default=dict)
    
    def validate_template_id(self, value):
        """Validate template exists"""
        try:
            NotificationTemplate.objects.get(id=value, is_active=True)
        except NotificationTemplate.DoesNotExist:
            raise serializers.ValidationError("Template not found or inactive")
        return value


class BulkNotificationActionSerializer(serializers.Serializer):
    """Serializer for bulk actions on notifications"""
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="List of notification IDs"
    )
    action = serializers.ChoiceField(
        choices=[
            ('mark_read', 'Mark as Read'),
            ('mark_unread', 'Mark as Unread'),
            ('delete', 'Delete')
        ]
    )
    
    def validate_notification_ids(self, value):
        """Validate notification IDs exist"""
        if not value:
            raise serializers.ValidationError("At least one notification ID is required")
        return value