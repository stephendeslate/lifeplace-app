import uuid

from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone

from core.utils.models import BaseModel

User = get_user_model()


class ThreadType(models.TextChoices):
    CONVERSATION = "conversation", "Conversation"
    SUPPORT = "support", "Support Inquiry"


class SupportCategory(models.TextChoices):
    BILLING = "billing", "Billing & Payments"
    EVENT = "event", "Event Changes/Questions"
    TECHNICAL = "technical", "Technical Issues"
    GENERAL = "general", "General Inquiry"


class MessageThread(BaseModel):
    """Message thread for client-admin communication"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Core relationships
    client = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="client_threads", limit_choices_to={"role": "CLIENT"}
    )
    event = models.ForeignKey(
        "events.Event", on_delete=models.CASCADE, null=True, blank=True, related_name="message_threads"
    )
    assigned_admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_threads",
        limit_choices_to={"role": "ADMIN"},
    )

    # Thread metadata
    subject = models.CharField(max_length=255)

    PRIORITY_CHOICES = (
        ("urgent", "Urgent"),
        ("high", "High"),
        ("normal", "Normal"),
        ("low", "Low"),
    )
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="normal")

    STATUS_CHOICES = (
        ("active", "Active"),
        ("waiting", "Waiting for Response"),
        ("resolved", "Resolved"),
        ("archived", "Archived"),
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")

    # Thread type and support category
    thread_type = models.CharField(
        max_length=20,
        choices=ThreadType.choices,
        default=ThreadType.CONVERSATION,
        help_text="Type of thread - conversation or support inquiry",
    )
    category = models.CharField(
        max_length=20,
        choices=SupportCategory.choices,
        null=True,
        blank=True,
        help_text="Category for support inquiries",
    )

    # Tracking fields
    last_message_at = models.DateTimeField(null=True, blank=True)
    last_admin_message_at = models.DateTimeField(null=True, blank=True)
    last_client_message_at = models.DateTimeField(null=True, blank=True)

    # Computed fields for frontend compatibility
    @property
    def client_name(self):
        return self.client.get_display_name()

    @property
    def event_name(self):
        if self.event:
            return str(self.event)
        return None

    @property
    def unread_count(self):
        """Get unread message count for the current user context"""
        # This will be computed in the serializer based on request user
        return 0

    class Meta:
        verbose_name = "Message Thread"
        verbose_name_plural = "Message Threads"
        ordering = ["-last_message_at", "-created_at"]
        indexes = [
            models.Index(fields=["client", "status", "-last_message_at"]),
            models.Index(fields=["assigned_admin", "status", "-last_message_at"]),
            models.Index(fields=["event", "-created_at"]),
            models.Index(fields=["priority", "status", "-last_message_at"]),
        ]

    def __str__(self):
        return f"{self.subject} - {self.client.get_display_name()}"

    def update_last_message_timestamp(self, message_timestamp=None, sender=None):
        """Update last message timestamp and sender-specific timestamps"""
        timestamp = message_timestamp or timezone.now()
        self.last_message_at = timestamp

        if sender and sender.role == "ADMIN":
            self.last_admin_message_at = timestamp
        elif sender and sender.role == "CLIENT":
            self.last_client_message_at = timestamp

        self.save(update_fields=["last_message_at", "last_admin_message_at", "last_client_message_at"])


class Message(BaseModel):
    """Individual message within a thread"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relationships
    thread = models.ForeignKey(MessageThread, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")

    # Message content
    content = models.TextField()

    MESSAGE_TYPE_CHOICES = (
        ("text", "Text Message"),
        ("system", "System Message"),
        ("file", "File Attachment"),
        ("event_update", "Event Update"),
    )
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES, default="text")

    # Admin-only messages
    is_internal_note = models.BooleanField(default=False, help_text="Internal notes are only visible to admin users")

    # Read tracking
    read_by = models.ManyToManyField(User, blank=True, related_name="read_messages", through="MessageReadStatus")

    # Edit tracking
    edited_at = models.DateTimeField(null=True, blank=True)

    # Computed properties for frontend compatibility
    @property
    def sender_name(self):
        return self.sender.get_display_name()

    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["thread", "created_at"]),
            models.Index(fields=["sender", "-created_at"]),
            models.Index(fields=["thread", "is_internal_note", "created_at"]),
        ]

    def __str__(self):
        return f"Message from {self.sender.get_display_name()} in {self.thread.subject}"

    def save(self, *args, **kwargs):
        # Update thread's last message timestamp
        is_new = self.pk is None
        super().save(*args, **kwargs)

        if is_new:
            self.thread.update_last_message_timestamp(self.created_at, self.sender)

    def mark_as_read(self, user):
        """Mark message as read by a specific user"""
        read_status, created = MessageReadStatus.objects.get_or_create(
            message=self, user=user, defaults={"read_at": timezone.now()}
        )
        return read_status


class MessageReadStatus(BaseModel):
    """Track which users have read which messages"""

    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    read_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("message", "user")
        verbose_name = "Message Read Status"
        verbose_name_plural = "Message Read Statuses"
        indexes = [
            models.Index(fields=["message", "user"]),
            models.Index(fields=["user", "read_at"]),
        ]

    def __str__(self):
        return f"{self.user.get_display_name()} read message {self.message.id}"


class MessageAttachment(BaseModel):
    """File attachments for messages"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="attachments")

    file = models.FileField(upload_to="message_attachments/%Y/%m/")
    filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()
    file_type = models.CharField(max_length=100)

    # Computed properties for frontend compatibility
    @property
    def file_url(self):
        return self.file.url if self.file else None

    class Meta:
        verbose_name = "Message Attachment"
        verbose_name_plural = "Message Attachments"
        ordering = ["created_at"]

    def __str__(self):
        return f"Attachment: {self.filename}"

    def save(self, *args, **kwargs):
        if self.file and not self.file_size:
            self.file_size = self.file.size
        if self.file and not self.file_type:
            import mimetypes

            self.file_type = mimetypes.guess_type(self.file.name)[0] or "application/octet-stream"
        super().save(*args, **kwargs)
