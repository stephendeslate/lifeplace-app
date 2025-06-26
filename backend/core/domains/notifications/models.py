# backend/core/domains/notifications/models.py
from core.utils.models import BaseModel
from django.conf import settings
from django.db import models


class NotificationType(BaseModel):
    """Defines types of notifications that can be sent"""
    code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, 
        choices=[
            ('SYSTEM', 'System'),
            ('EVENT', 'Event Management'),
            ('TASK', 'Task Management'),
            ('PAYMENT', 'Payment Processing'),
            ('CLIENT', 'Client Management'),
            ('CONTRACT', 'Contract Management'),
            ('WORKFLOW', 'Workflow Updates'),
            ('COMMUNICATION', 'Communication Updates'),
        ],
        default='SYSTEM'
    )
    # Visual properties for frontend display
    icon = models.CharField(max_length=50, blank=True, help_text="Material UI icon name")
    color = models.CharField(max_length=7, blank=True, help_text="Hex color code")
    priority = models.CharField(max_length=20,
        choices=[
            ('LOW', 'Low'),
            ('NORMAL', 'Normal'), 
            ('HIGH', 'High'),
            ('URGENT', 'Urgent'),
        ],
        default='NORMAL'
    )
    
    # Template settings
    default_title_template = models.CharField(max_length=255)
    default_content_template = models.TextField()
    default_email_template = models.TextField(blank=True)
    default_sms_template = models.CharField(max_length=160, blank=True)
    
    # Business settings
    is_active = models.BooleanField(default=True)
    is_system = models.BooleanField(default=False, help_text="System notifications cannot be disabled")
    supports_email = models.BooleanField(default=True)
    supports_sms = models.BooleanField(default=False)
    auto_read_after_days = models.PositiveIntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['category', 'name']
    
    def __str__(self):
        return self.name


class NotificationPreference(BaseModel):
    """Enhanced user preferences for receiving notifications"""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notification_preferences'
    )
    
    # Global delivery method toggles
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    in_app_enabled = models.BooleanField(default=True)
    
    # Delivery preferences by category
    system_email = models.BooleanField(default=True)
    system_sms = models.BooleanField(default=False)
    system_in_app = models.BooleanField(default=True)
    
    event_email = models.BooleanField(default=True)
    event_sms = models.BooleanField(default=False)
    event_in_app = models.BooleanField(default=True)
    
    task_email = models.BooleanField(default=True)
    task_sms = models.BooleanField(default=False)
    task_in_app = models.BooleanField(default=True)
    
    payment_email = models.BooleanField(default=True)
    payment_sms = models.BooleanField(default=True)  # Important for payments
    payment_in_app = models.BooleanField(default=True)
    
    client_email = models.BooleanField(default=True)
    client_sms = models.BooleanField(default=False)
    client_in_app = models.BooleanField(default=True)
    
    contract_email = models.BooleanField(default=True)
    contract_sms = models.BooleanField(default=False)
    contract_in_app = models.BooleanField(default=True)
    
    workflow_email = models.BooleanField(default=False)  # Less critical
    workflow_sms = models.BooleanField(default=False)
    workflow_in_app = models.BooleanField(default=True)
    
    communication_email = models.BooleanField(default=False)
    communication_sms = models.BooleanField(default=False)
    communication_in_app = models.BooleanField(default=True)
    
    # Advanced preferences
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    digest_frequency = models.CharField(max_length=20,
        choices=[
            ('IMMEDIATE', 'Immediate'),
            ('HOURLY', 'Hourly Digest'),
            ('DAILY', 'Daily Digest'),
            ('WEEKLY', 'Weekly Digest'),
        ],
        default='IMMEDIATE'
    )
    
    # Specific notification type overrides
    disabled_types = models.ManyToManyField(
        NotificationType, 
        blank=True,
        related_name='users_disabled',
        help_text="Specific notification types to disable"
    )
    
    def __str__(self):
        return f"Preferences for {self.user.email}"
    
    def is_delivery_method_enabled(self, category, method):
        """Check if a delivery method is enabled for a category"""
        if not getattr(self, f"{method}_enabled", True):
            return False
            
        return getattr(self, f"{category.lower()}_{method}", True)
    
    def is_notification_enabled(self, notification_type, method):
        """Check if a specific notification type and method is enabled"""
        # Check if type is specifically disabled
        if self.disabled_types.filter(id=notification_type.id).exists():
            return False
            
        # Check if delivery method is supported by notification type
        if method == 'email' and not notification_type.supports_email:
            return False
        if method == 'sms' and not notification_type.supports_sms:
            return False
            
        # Check category and global preferences
        return self.is_delivery_method_enabled(notification_type.category, method)


class Notification(BaseModel):
    """Individual notifications sent to users"""
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.ForeignKey(
        NotificationType, 
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    # Content
    title = models.CharField(max_length=255)
    content = models.TextField()
    action_url = models.CharField(max_length=500, blank=True)
    
    # Context and targeting
    context_data = models.JSONField(default=dict, blank=True)
    event = models.ForeignKey(
        'events.Event', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='notifications'
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='client_notifications',
        limit_choices_to={'role': 'CLIENT'}
    )
    
    # Status tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Delivery tracking
    delivered_via = models.JSONField(default=list, blank=True, help_text="List of delivery methods used")
    delivery_attempts = models.JSONField(default=dict, blank=True)
    
    # Auto-expire functionality
    expires_at = models.DateTimeField(null=True, blank=True)
    is_expired = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['notification_type', '-created_at']),
        ]
        
    def __str__(self):
        return f"{self.notification_type.name} for {self.recipient.email}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at', 'updated_at'])
    
    def is_delivery_successful(self, method):
        """Check if delivery was successful for a method"""
        return method in self.delivered_via
    
    def add_delivery_method(self, method, success=True, error=None):
        """Record delivery attempt"""
        if success and method not in self.delivered_via:
            self.delivered_via.append(method)
        
        if method not in self.delivery_attempts:
            self.delivery_attempts[method] = []

        from django.utils import timezone
        self.delivery_attempts[method].append({
            'timestamp': timezone.now().isoformat(),
            'success': success,
            'error': error
        })
        
        self.save(update_fields=['delivered_via', 'delivery_attempts', 'updated_at'])


class NotificationDigest(BaseModel):
    """Digest notifications for users who prefer batched delivery"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_digests'
    )
    frequency = models.CharField(max_length=20, choices=[
        ('HOURLY', 'Hourly'),
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
    ])
    
    # Period this digest covers
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Notifications included
    notifications = models.ManyToManyField(Notification, related_name='digests')
    notification_count = models.PositiveIntegerField(default=0)
    
    # Delivery status
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivery_methods = models.JSONField(default=list)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = [['user', 'frequency', 'period_start']]
    
    def __str__(self):
        return f"{self.frequency} digest for {self.user.email} ({self.notification_count} notifications)"