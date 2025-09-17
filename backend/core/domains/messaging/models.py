"""
Core Messaging Domain Models - Single Source of Truth Architecture
"""
import uuid
from core.utils.models import BaseModel
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils import timezone


class OptimizedMessageThreadManager(models.Manager):
    """Optimized manager for MessageThread with common query patterns"""
    
    def get_queryset(self):
        """Always include basic related data for performance"""
        return super().get_queryset().select_related(
            'client',
            'event',
            'assigned_admin'
        )
    
    def with_details(self):
        """Include all details for detailed views"""
        return self.get_queryset().prefetch_related(
            'participants__user',
            'messages__sender',
            'messages__attachments',
            'messages__read_receipts__user'
        )
    
    def for_client(self, client_id):
        """Get threads for a specific client"""
        return self.get_queryset().filter(client_id=client_id)
    
    def for_event(self, event_id):
        """Get threads for a specific event"""
        return self.get_queryset().filter(event_id=event_id)
    
    def active(self):
        """Get only active threads"""
        return self.get_queryset().filter(status='active')
    
    def by_priority(self, priority):
        """Filter by priority level"""
        return self.get_queryset().filter(priority=priority)
    
    def assigned_to(self, admin_id):
        """Get threads assigned to specific admin"""
        return self.get_queryset().filter(assigned_admin_id=admin_id)
    
    def with_unread_counts(self, user_id):
        """Annotate with unread message counts for specific user"""
        from django.db.models import Count, Q
        return self.get_queryset().annotate(
            unread_count=Count(
                'messages',
                filter=~Q(messages__read_receipts__user_id=user_id)
            )
        )


class MessageThread(BaseModel):
    """Central entity for all messaging conversations - both general and event-specific"""
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('waiting', 'Waiting for Response'),
        ('resolved', 'Resolved'),
    ]
    
    # Core identifiers
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Required relationships
    client = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='message_threads',
        limit_choices_to={'role': 'CLIENT'}
    )
    
    # Optional relationships (for event-specific threads)
    event = models.ForeignKey(
        'events.Event',
        on_delete=models.CASCADE,
        related_name='message_threads',
        null=True,
        blank=True,
        help_text="Event this thread is associated with (optional for general threads)"
    )
    
    # Assignment and status
    assigned_admin = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        related_name='assigned_message_threads',
        limit_choices_to={'role': 'ADMIN'},
        null=True,
        blank=True
    )
    
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='normal'
    )
    
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='active'
    )
    
    # Thread metadata
    subject = models.CharField(
        max_length=255,
        blank=True,
        help_text="Optional subject line for the thread"
    )
    
    # Cache fields for performance (denormalized for fast access)
    last_message_at = models.DateTimeField(null=True, blank=True)
    last_message_content = models.TextField(blank=True)
    last_message_sender_name = models.CharField(max_length=255, blank=True)
    
    # Optimized manager
    objects = OptimizedMessageThreadManager()
    all_objects = models.Manager()  # Fallback for admin
    
    class Meta:
        indexes = [
            models.Index(fields=['client', 'status', '-last_message_at']),
            models.Index(fields=['event', 'status', '-last_message_at']),
            models.Index(fields=['assigned_admin', 'status', '-last_message_at']),
            models.Index(fields=['priority', 'status', '-created_at']),
            models.Index(fields=['-last_message_at']),
        ]
        # Note: Cross-table constraints are implemented in model validation instead
    
    def clean(self):
        """Validate model constraints"""
        from django.core.exceptions import ValidationError
        
        # Ensure event belongs to the same client if specified
        if self.event and self.event.client != self.client:
            raise ValidationError({
                'event': 'Event must belong to the same client as the thread.'
            })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        if self.event:
            return f"Thread for {self.event.name} - {self.client.get_display_name()}"
        return f"General Thread - {self.client.get_display_name()}"
    
    @property
    def event_name(self):
        """Get event name for frontend compatibility"""
        return self.event.name if self.event else ""
    
    @property
    def event_date(self):
        """Get event date for frontend compatibility"""
        return self.event.start_date.isoformat() if self.event else ""
    
    @property
    def client_name(self):
        """Get client name for frontend compatibility"""
        return self.client.get_display_name()
    
    def get_unread_count_for_user(self, user):
        """Get unread message count for specific user"""
        return self.messages.exclude(read_receipts__user=user).count()
    
    def update_last_message_cache(self, message):
        """Update denormalized last message fields for performance"""
        self.last_message_at = message.created_at
        self.last_message_content = message.content[:200]  # First 200 chars
        self.last_message_sender_name = message.sender.get_display_name()
        self.save(update_fields=['last_message_at', 'last_message_content', 'last_message_sender_name'])
    
    def add_participant(self, user):
        """Add a participant to the thread"""
        participant, created = ThreadParticipant.objects.get_or_create(
            thread=self,
            user=user
        )
        return participant
    
    def remove_participant(self, user):
        """Remove a participant from the thread"""
        ThreadParticipant.objects.filter(thread=self, user=user).delete()


class ThreadParticipant(BaseModel):
    """Users who can participate in a message thread"""
    
    thread = models.ForeignKey(
        MessageThread,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='thread_participations'
    )
    
    # Participation metadata
    joined_at = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    
    # Notification preferences for this thread
    notifications_enabled = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('thread', 'user')
        indexes = [
            models.Index(fields=['thread', 'is_active']),
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.user.get_display_name()} in {self.thread}"


class Message(BaseModel):
    """Individual messages within threads"""
    
    MESSAGE_TYPES = [
        ('text', 'Text Message'),
        ('system', 'System Message'),
        ('file', 'File Message'),
        ('event_update', 'Event Update'),
    ]
    
    # Core identifiers
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Required relationships
    thread = models.ForeignKey(
        MessageThread,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    
    sender = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    
    # Message content
    content = models.TextField()
    message_type = models.CharField(
        max_length=20,
        choices=MESSAGE_TYPES,
        default='text'
    )
    
    # Special flags
    is_internal_note = models.BooleanField(
        default=False,
        help_text="Internal admin note not visible to clients"
    )
    
    # Edit tracking
    edited_at = models.DateTimeField(null=True, blank=True)
    original_content = models.TextField(blank=True)  # Store original if edited
    
    # Parent message for threading/replies (optional future feature)
    parent_message = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies'
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['thread', '-created_at']),
            models.Index(fields=['sender', '-created_at']),
            models.Index(fields=['thread', 'is_internal_note', '-created_at']),
            models.Index(fields=['-created_at']),
        ]
        # Note: Role constraints are implemented in model validation instead
    
    def clean(self):
        """Validate model constraints"""
        from django.core.exceptions import ValidationError
        
        # Internal notes can only be sent by admins
        if self.is_internal_note and self.sender.role != 'ADMIN':
            raise ValidationError({
                'is_internal_note': 'Internal notes can only be sent by admin users.'
            })
    
    def __str__(self):
        content_preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"Message from {self.sender.get_display_name()}: {content_preview}"
    
    def save(self, *args, **kwargs):
        # Use _state.adding to correctly detect new objects with UUID primary keys
        is_new = self._state.adding
        self.full_clean()
        super().save(*args, **kwargs)

        # Update thread's last message cache
        if is_new:
            self.thread.update_last_message_cache(self)
    
    def mark_as_read_by(self, user):
        """Mark this message as read by a user"""
        receipt, created = MessageReadReceipt.objects.get_or_create(
            message=self,
            user=user,
            defaults={'read_at': timezone.now()}
        )
        return receipt
    
    def is_read_by(self, user):
        """Check if message is read by user"""
        return self.read_receipts.filter(user=user).exists()


class MessageAttachment(BaseModel):
    """File attachments for messages"""
    
    # Core identifiers
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Required relationships
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    
    # File information
    filename = models.CharField(max_length=255)
    file = models.FileField(
        upload_to='message_attachments/%Y/%m/',
        validators=[FileExtensionValidator(
            allowed_extensions=[
                'pdf', 'doc', 'docx', 'txt', 'rtf',  # Documents
                'jpg', 'jpeg', 'png', 'gif', 'webp',  # Images
                'mp4', 'mov', 'avi', 'mkv',  # Videos
                'mp3', 'wav', 'ogg',  # Audio
                'zip', 'rar', '7z'  # Archives
            ]
        )]
    )
    
    # File metadata
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    file_type = models.CharField(max_length=100, help_text="MIME type")
    
    # Upload metadata
    uploaded_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_attachments'
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['message', '-created_at']),
        ]
    
    def __str__(self):
        return f"Attachment: {self.filename}"
    
    @property
    def file_url(self):
        """Get file URL for frontend compatibility"""
        return self.file.url if self.file else ""
    
    def save(self, *args, **kwargs):
        # Auto-populate file metadata
        if self.file and not self.file_size:
            self.file_size = self.file.size
        
        if self.file and not self.file_type:
            import mimetypes
            mime_type, _ = mimetypes.guess_type(self.file.name)
            self.file_type = mime_type or 'application/octet-stream'
        
        if not self.filename and self.file:
            self.filename = self.file.name
        
        super().save(*args, **kwargs)


class MessageReadReceipt(BaseModel):
    """Track which users have read which messages"""
    
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='read_receipts'
    )
    
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='message_read_receipts'
    )
    
    read_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ('message', 'user')
        indexes = [
            models.Index(fields=['message', 'read_at']),
            models.Index(fields=['user', 'read_at']),
        ]
    
    def __str__(self):
        return f"{self.user.get_display_name()} read message {self.message.id}"


class TypingIndicator(BaseModel):
    """Real-time typing indicators for active conversations"""
    
    thread = models.ForeignKey(
        MessageThread,
        on_delete=models.CASCADE,
        related_name='typing_indicators'
    )
    
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='typing_indicators'
    )
    
    is_typing = models.BooleanField(default=True)
    last_activity = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ('thread', 'user')
        indexes = [
            models.Index(fields=['thread', 'is_typing', 'last_activity']),
        ]
    
    def __str__(self):
        status = "typing" if self.is_typing else "stopped typing"
        return f"{self.user.get_display_name()} {status} in {self.thread}"
    
    @classmethod
    def cleanup_stale_indicators(cls, older_than_minutes=5):
        """Clean up stale typing indicators"""
        cutoff_time = timezone.now() - timezone.timedelta(minutes=older_than_minutes)
        return cls.objects.filter(last_activity__lt=cutoff_time).delete()


# Import security models to ensure they are registered with Django
from .security_audit import MessageAuditLog, ConnectionAuditLog
from .key_management import EncryptionKey, KeyRotationLog

# All models available for import
__all__ = [
    # Core messaging models
    'MessageThread',
    'ThreadParticipant', 
    'Message',
    'MessageAttachment',
    'MessageReadReceipt',
    'TypingIndicator',
    # Security models
    'MessageAuditLog',
    'ConnectionAuditLog', 
    'EncryptionKey',
    'KeyRotationLog'
]