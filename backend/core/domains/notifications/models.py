# backend/core/domains/notifications/models.py
import uuid
from core.utils.models import BaseModel
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone

User = get_user_model()


class NotificationTemplate(BaseModel):
    """Templates for different types of notifications"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    
    NOTIFICATION_TYPES = (
        ('CLIENT_NEW', 'New Client Registration'),
        ('CLIENT_INVITATION_SENT', 'Client Invitation Sent'),
        ('CLIENT_INVITATION_ACCEPTED', 'Client Invitation Accepted'),
        ('EVENT_STATUS_CHANGE', 'Event Status Change'),
        ('EVENT_CREATED', 'New Event Created'),
        ('EVENT_DEADLINE_APPROACHING', 'Event Deadline Approaching'),
        ('TASK_OVERDUE', 'Task Overdue'),
        ('TASK_COMPLETED', 'Task Completed'),
        ('PAYMENT_RECEIVED', 'Payment Received'),
        ('PAYMENT_FAILED', 'Payment Failed'),
        ('FEEDBACK_RECEIVED', 'Feedback Received'),
        ('WORKFLOW_STAGE_CHANGED', 'Workflow Stage Changed'),
        ('SYSTEM_ALERT', 'System Alert'),
        ('DAILY_SUMMARY', 'Daily Summary'),
        ('WEEKLY_REPORT', 'Weekly Report'),
        ('CUSTOM', 'Custom Notification'),
    )
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    
    CHANNEL_CHOICES = (
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
        ('PUSH', 'Push Notification'),
        ('IN_APP', 'In-App Notification'),
    )
    channels = models.JSONField(default=list, help_text="Supported channels for this template")
    
    # Template content for different channels
    email_subject = models.CharField(max_length=200, blank=True)
    email_body = models.TextField(blank=True)
    sms_body = models.CharField(max_length=160, blank=True)
    push_title = models.CharField(max_length=100, blank=True)
    push_body = models.CharField(max_length=200, blank=True)
    in_app_title = models.CharField(max_length=100, blank=True)
    in_app_body = models.TextField(blank=True)
    
    # Configuration
    is_active = models.BooleanField(default=True)
    is_system = models.BooleanField(default=False)
    priority = models.CharField(max_length=20, choices=[
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent')
    ], default='MEDIUM')
    
    # Template variables schema
    variables_schema = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['notification_type', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_notification_type_display()})"


class NotificationPreference(BaseModel):
    """User-specific notification preferences"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Global settings
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    push_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)
    
    # Quiet hours
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    quiet_hours_timezone = models.CharField(max_length=50, default='UTC')
    
    # Frequency settings
    digest_frequency = models.CharField(max_length=20, choices=[
        ('REAL_TIME', 'Real Time'),
        ('HOURLY', 'Hourly'),
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('DISABLED', 'Disabled')
    ], default='REAL_TIME')
    
    # Specific notification type preferences
    notification_settings = models.JSONField(default=dict, help_text="Per-notification-type settings")
    
    class Meta:
        verbose_name = 'Notification Preference'
        verbose_name_plural = 'Notification Preferences'
    
    def __str__(self):
        return f"Preferences for {self.user.get_full_name() or self.user.email}"
    
    def is_channel_enabled(self, channel):
        """Check if a specific channel is enabled"""
        channel_mapping = {
            'EMAIL': self.email_enabled,
            'SMS': self.sms_enabled,
            'PUSH': self.push_enabled,
            'IN_APP': self.in_app_enabled
        }
        return channel_mapping.get(channel, False)
    
    def is_notification_enabled(self, notification_type, channel):
        """Check if a specific notification type and channel is enabled"""
        if not self.is_channel_enabled(channel):
            return False
        
        # Check specific notification settings
        type_settings = self.notification_settings.get(notification_type, {})
        return type_settings.get(f'{channel.lower()}_enabled', True)


class NotificationRule(BaseModel):
    """Rules that define when notifications should be triggered"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Rule configuration
    event_type = models.CharField(max_length=50, help_text="Domain event that triggers this rule")
    conditions = models.JSONField(default=dict, help_text="Conditions that must be met")
    
    # Target configuration
    template = models.ForeignKey(NotificationTemplate, on_delete=models.CASCADE, related_name='rules')
    target_users = models.ManyToManyField(User, blank=True, related_name='notification_rules')
    target_roles = models.JSONField(default=list, help_text="User roles to notify")
    
    # Timing configuration
    delay_minutes = models.PositiveIntegerField(default=0, help_text="Delay before sending notification")
    max_frequency_hours = models.PositiveIntegerField(
        default=0, 
        help_text="Minimum hours between notifications of this type (0 = no limit)"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['event_type', 'name']
        indexes = [
            models.Index(fields=['event_type', 'is_active'])
        ]
    
    def __str__(self):
        return f"{self.name} ({self.event_type})"


class NotificationQueue(BaseModel):
    """Queue for notifications awaiting delivery"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Notification details
    template = models.ForeignKey(NotificationTemplate, on_delete=models.CASCADE)
    rule = models.ForeignKey(NotificationRule, on_delete=models.CASCADE, null=True, blank=True)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='queued_notifications')
    
    # Channel and content
    channel = models.CharField(max_length=10, choices=NotificationTemplate.CHANNEL_CHOICES)
    subject = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    
    # Context and metadata
    context_data = models.JSONField(default=dict)
    priority = models.CharField(max_length=20, choices=[
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent')
    ], default='MEDIUM')
    
    # Scheduling
    scheduled_at = models.DateTimeField(default=timezone.now)
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=3)
    
    # Status
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True)
    
    # References to source object
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    class Meta:
        ordering = ['-priority', 'scheduled_at']
        indexes = [
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['recipient', 'status'])
        ]
    
    def __str__(self):
        return f"{self.template.name} to {self.recipient.email} ({self.status})"


class NotificationHistory(BaseModel):
    """History of sent notifications"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Notification details
    template_name = models.CharField(max_length=100)
    notification_type = models.CharField(max_length=50)
    channel = models.CharField(max_length=10, choices=NotificationTemplate.CHANNEL_CHOICES)
    
    # Recipient details
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_history')
    recipient_email = models.EmailField(blank=True)
    recipient_phone = models.CharField(max_length=20, blank=True)
    
    # Content
    subject = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    context_data = models.JSONField(default=dict)
    
    # Delivery information
    external_message_id = models.CharField(max_length=100, blank=True)
    sent_at = models.DateTimeField()
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    
    # Status tracking
    DELIVERY_STATUS_CHOICES = (
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('OPENED', 'Opened'),
        ('CLICKED', 'Clicked'),
        ('BOUNCED', 'Bounced'),
        ('FAILED', 'Failed'),
    )
    delivery_status = models.CharField(max_length=20, choices=DELIVERY_STATUS_CHOICES, default='SENT')
    is_read = models.BooleanField(default=False)
    
    # References to source object
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Metadata
    rule_id = models.UUIDField(null=True, blank=True)
    queue_id = models.UUIDField(null=True, blank=True)
    
    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['recipient', '-sent_at']),
            models.Index(fields=['notification_type', '-sent_at']),
            models.Index(fields=['delivery_status', '-sent_at'])
        ]
    
    def __str__(self):
        return f"{self.template_name} to {self.recipient.email} at {self.sent_at}"


class InAppNotification(BaseModel):
    """In-app notifications for real-time display"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Notification details
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='in_app_notifications')
    title = models.CharField(max_length=100)
    message = models.TextField()
    
    # Metadata
    notification_type = models.CharField(max_length=50)
    priority = models.CharField(max_length=20, choices=[
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent')
    ], default='MEDIUM')
    
    # Action configuration
    action_url = models.URLField(blank=True, help_text="URL to navigate when notification is clicked")
    action_data = models.JSONField(default=dict, blank=True)
    
    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # References to source object
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
            models.Index(fields=['expires_at'])
        ]
    
    def __str__(self):
        return f"{self.title} to {self.recipient.email}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    @property
    def is_expired(self):
        """Check if notification has expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False