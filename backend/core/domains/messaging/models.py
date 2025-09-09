# backend/core/domains/messaging/models.py

import uuid
from django.db import models
from django.contrib.auth import get_user_model
from core.utils.models import BaseModel

User = get_user_model()


class MessageThread(BaseModel):
    """Message thread tied to a specific event for client-admin communication"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.OneToOneField('events.Event', on_delete=models.CASCADE, related_name='message_thread')
    
    PRIORITY_CHOICES = [
        ('urgent', 'Urgent'),
        ('high', 'High'), 
        ('normal', 'Normal'),
        ('low', 'Low'),
    ]
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('waiting', 'Waiting'),
        ('resolved', 'Resolved'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    
    # Admin assignment for thread management
    assigned_admin = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_threads',
        limit_choices_to={'role': 'ADMIN'}
    )
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['event', 'status']),
            models.Index(fields=['priority', '-updated_at']),
            models.Index(fields=['assigned_admin', 'status']),
        ]
    
    def __str__(self):
        return f"Thread for {self.event.name} ({self.status})"
    
    @property
    def event_name(self):
        return self.event.name or f"{self.event.event_type} for {self.event.client.get_display_name()}"
    
    @property
    def event_date(self):
        return self.event.start_date.isoformat()
    
    @property
    def client_id(self):
        return self.event.client.id
    
    def get_unread_count(self, user):
        """Count unread messages for a specific user"""
        unread_messages = Message.objects.filter(
            thread=self
        ).exclude(
            read_by=user
        ).exclude(
            sender=user  # Don't count own messages as unread
        )
        
        # Filter out internal notes for clients
        if user.role == 'CLIENT':
            unread_messages = unread_messages.filter(is_internal_note=False)
            
        return unread_messages.count()


class Message(BaseModel):
    """Individual message within a thread"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(MessageThread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    
    MESSAGE_TYPE_CHOICES = [
        ('message', 'Regular Message'),
        ('system', 'System Message'),
        ('event_update', 'Event Update'),
        ('file', 'File Message'),
    ]
    message_type = models.CharField(max_length=15, choices=MESSAGE_TYPE_CHOICES, default='message')
    
    # Internal notes only visible to admins
    is_internal_note = models.BooleanField(default=False)
    
    # Message status tracking
    edited_at = models.DateTimeField(null=True, blank=True)
    
    # Message read tracking
    read_by = models.ManyToManyField(User, through='MessageRead', related_name='read_messages')
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['thread', 'created_at']),
            models.Index(fields=['sender', '-created_at']),
            models.Index(fields=['message_type', 'created_at']),
        ]
    
    def __str__(self):
        return f"Message from {self.sender.get_display_name()} in {self.thread}"


class MessageRead(BaseModel):
    """Track when messages were read by users"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'message')
        indexes = [
            models.Index(fields=['message', 'user']),
            models.Index(fields=['user', 'read_at']),
        ]


class MessageAttachment(BaseModel):
    """File attachments for messages"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments')
    filename = models.CharField(max_length=255)
    file_url = models.URLField()  # Could be S3 URL or local media URL
    file_size = models.PositiveIntegerField()  # Size in bytes
    mime_type = models.CharField(max_length=100)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.filename} ({self.message})"


class ThreadActivity(BaseModel):
    """Track thread activities for analytics and timeline"""
    thread = models.ForeignKey(MessageThread, on_delete=models.CASCADE, related_name='activities')
    
    ACTIVITY_CHOICES = [
        ('thread_created', 'Thread Created'),
        ('priority_changed', 'Priority Changed'), 
        ('status_changed', 'Status Changed'),
        ('admin_assigned', 'Admin Assigned'),
        ('message_sent', 'Message Sent'),
        ('file_uploaded', 'File Uploaded'),
        ('thread_resolved', 'Thread Resolved'),
        ('thread_reopened', 'Thread Reopened'),
    ]
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_CHOICES)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)  # Store additional context
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['thread', '-created_at']),
            models.Index(fields=['activity_type', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.activity_type} - {self.thread} by {self.actor}"