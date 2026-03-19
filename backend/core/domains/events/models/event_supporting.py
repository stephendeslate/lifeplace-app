import uuid

from django.core.validators import (
    FileExtensionValidator,
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models
from django.utils import timezone

from core.utils.models import BaseModel

from .event import Event


class EventProductOption(BaseModel):
    """Junction model linking products to events with quantity and pricing"""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="event_products")
    product_option = models.ForeignKey("products.ProductOption", on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    final_price = models.DecimalField(max_digits=10, decimal_places=2)
    num_participants = models.PositiveIntegerField(null=True, blank=True)
    num_nights = models.PositiveIntegerField(null=True, blank=True)
    excess_hours = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        unique_together = ("event", "product_option")

    def __str__(self):
        return f"{self.product_option.name} for {self.event}"


class EventTask(BaseModel):
    """Tasks associated with an event"""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField()
    priority = models.CharField(
        max_length=20, choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High"), ("URGENT", "Urgent")]
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("PENDING", "Pending"),
            ("IN_PROGRESS", "In Progress"),
            ("COMPLETED", "Completed"),
            ("BLOCKED", "Blocked"),
            ("CANCELLED", "Cancelled"),
        ],
    )
    assigned_to = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, related_name="assigned_tasks")
    workflow_stage = models.ForeignKey("workflows.WorkflowStage", on_delete=models.SET_NULL, null=True)
    dependencies = models.ManyToManyField("self", symmetrical=False, related_name="dependent_tasks", blank=True)
    completion_notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, related_name="completed_tasks")
    is_visible_to_client = models.BooleanField(default=False)
    requires_client_input = models.BooleanField(default=False)

    class Meta:
        ordering = ["due_date", "priority"]
        indexes = [models.Index(fields=["event", "status", "due_date"])]

    def __str__(self):
        return f"{self.title} - Event {self.event.id} ({self.status})"

    def save(self, *args, **kwargs):
        if self.status == "COMPLETED" and not self.completed_at:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)


class EventFeedback(BaseModel):
    """Client feedback and ratings for completed events"""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="feedback")
    submitted_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    overall_rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    categories = models.JSONField(default=dict)  # Store category-specific ratings
    comments = models.TextField(blank=True)
    testimonial = models.TextField(blank=True)  # Public testimonial text
    is_public = models.BooleanField(default=False)  # Whether can be used as testimonial
    response = models.TextField(blank=True)  # Admin response to feedback
    response_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, related_name="feedback_responses"
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["event", "submitted_by"], name="unique_event_feedback_per_user")]

    def __str__(self):
        return f"Feedback for Event {self.event.id} - Rating: {self.overall_rating}"


class EventTimeline(BaseModel):
    """Tracks significant events in an event's lifecycle"""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="timeline")
    action_type = models.CharField(
        max_length=50,
        choices=[
            ("STATUS_CHANGE", "Status Changed"),
            ("STAGE_CHANGE", "Stage Changed"),
            ("QUOTE_CREATED", "Quote Created"),
            ("QUOTE_UPDATED", "Quote Updated"),
            ("QUOTE_ACCEPTED", "Quote Accepted"),
            ("CONTRACT_SENT", "Contract Sent"),
            ("CONTRACT_SIGNED", "Contract Signed"),
            ("PAYMENT_RECEIVED", "Payment Received"),
            ("NOTE_ADDED", "Note Added"),
            ("FILE_UPLOADED", "File Uploaded"),
            ("TASK_COMPLETED", "Task Completed"),
            ("FEEDBACK_RECEIVED", "Feedback Received"),
            ("CLIENT_MESSAGE", "Client Message"),
            ("SYSTEM_UPDATE", "System Update"),
            ("CANCELLATION_REQUESTED", "Cancellation Requested"),
        ],
    )
    description = models.TextField()
    actor = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, related_name="event_actions")
    action_data = models.JSONField(null=True, blank=True)  # Store additional context
    is_public = models.BooleanField(default=False)  # Whether visible to client

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["event", "action_type", "-created_at"])]

    def __str__(self):
        return f"{self.action_type} - Event {self.event.id} - {self.created_at}"


class EventFile(BaseModel):
    """Files associated with an event (photos, documents, etc)"""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="files")
    category = models.CharField(
        max_length=50,
        choices=[
            ("CONTRACT", "Contract Document"),
            ("QUOTE", "Quote/Proposal"),
            ("PAYMENT", "Payment Document"),
            ("REQUIREMENTS", "Requirements Doc"),
            ("PHOTO", "Photo"),
            ("OTHER", "Other"),
        ],
    )
    file = models.FileField(
        upload_to="event_files/%Y/%m/",
        validators=[FileExtensionValidator(allowed_extensions=["pdf", "doc", "docx", "jpg", "jpeg", "png"])],
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    mime_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()  # File size in bytes
    uploaded_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    version = models.PositiveIntegerField(default=1, db_index=True)
    is_public = models.BooleanField(default=False)  # Whether client can view

    class Meta:
        ordering = ["-created_at", "-version"]

    def __str__(self):
        return f"{self.name} ({self.category}) - Event {self.event.id}"

    def save(self, *args, **kwargs):
        # Set file size before saving
        if not self.size and self.file:
            self.size = self.file.size

        # Set mime type if available
        if not self.mime_type and self.file:
            import mimetypes

            mime_type, _ = mimetypes.guess_type(self.file.name)
            self.mime_type = mime_type or getattr(self.file, "content_type", "")

        super().save(*args, **kwargs)


class EventDateReminder(BaseModel):
    """Tracks event date reminders sent to prevent duplicate reminders.

    Used by the schedule_event_date_reminders Celery task to record
    which reminders have been sent for each event at each interval
    (e.g., 7 days before, 3 days before, 1 day before).
    """

    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="date_reminders", help_text="The event this reminder was sent for"
    )
    days_before = models.PositiveIntegerField(help_text="Number of days before event this reminder was sent")
    sent_at = models.DateTimeField(auto_now_add=True, help_text="When this reminder was sent")
    communication_record_id = models.UUIDField(
        null=True, blank=True, help_text="UUID of the CommunicationRecord for tracking delivery status"
    )

    class Meta:
        verbose_name = "Event Date Reminder"
        verbose_name_plural = "Event Date Reminders"
        unique_together = [["event", "days_before"]]
        indexes = [
            models.Index(fields=["event", "days_before"]),
            models.Index(fields=["sent_at"]),
        ]
        ordering = ["-sent_at"]

    def __str__(self):
        return f"Reminder for Event {self.event_id} - {self.days_before} days before"


class DateReservation(BaseModel):
    """
    Temporary date reservation for payment processing window.

    Used to prevent race conditions during the booking completion flow.
    When a client clicks "Complete Booking", a reservation is created that
    temporarily holds the date for 5 minutes while payment is processed.

    This implements pessimistic locking to ensure only one client can
    successfully book a date, even if multiple clients are in the payment
    flow simultaneously.
    """

    STATUS_CHOICES = [
        ("PENDING", "Pending Payment"),
        ("CONFIRMED", "Confirmed"),
        ("RELEASED", "Released"),
        ("EXPIRED", "Expired"),
    ]

    token = models.UUIDField(
        default=uuid.uuid4, unique=True, db_index=True, help_text="Unique token for identifying this reservation"
    )
    target_date = models.DateField(db_index=True, help_text="The date being reserved")
    booking_session_id = models.CharField(
        max_length=255, db_index=True, help_text="The booking session that created this reservation"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="PENDING", help_text="Current status of the reservation"
    )
    expires_at = models.DateTimeField(help_text="When this reservation expires (5 minutes from creation)")
    confirmed_event_id = models.IntegerField(
        null=True, blank=True, help_text="The event ID if this reservation was confirmed"
    )

    class Meta:
        verbose_name = "Date Reservation"
        verbose_name_plural = "Date Reservations"
        indexes = [
            models.Index(fields=["target_date", "status"]),
            models.Index(fields=["booking_session_id"]),
            models.Index(fields=["status", "expires_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Reservation {self.token} for {self.target_date} ({self.status})"

    @property
    def is_expired(self):
        """Check if this reservation has expired"""
        return timezone.now() >= self.expires_at

    @property
    def is_active(self):
        """Check if this reservation is still active (pending and not expired)"""
        return self.status == "PENDING" and not self.is_expired
