from django.db import models
from django.utils import timezone

from core.utils.models import BaseModel


class PaymentEventStore(BaseModel):
    """
    Persistent storage for payment domain events.

    Provides event sourcing capabilities including event replay,
    audit trails, and cross-system integration support.
    """

    # Event identification
    event_id = models.CharField(max_length=255, unique=True, help_text="Unique identifier for this domain event")
    event_type = models.CharField(max_length=100, help_text="Type of domain event (PaymentCompletedEvent, etc.)")

    # Payment context
    payment = models.ForeignKey("payments.Payment", on_delete=models.CASCADE, related_name="stored_events")
    payment_number = models.CharField(max_length=50, help_text="Payment number for easy lookup")

    # Event payload
    event_data = models.JSONField(help_text="Complete event data including transition details")

    # State transition context
    from_state = models.CharField(max_length=20, help_text="Previous payment state")
    to_state = models.CharField(max_length=20, help_text="New payment state")
    transition_reason = models.CharField(max_length=255, help_text="Reason for state transition")
    triggered_by = models.CharField(max_length=100, help_text="Who or what triggered the state change")

    # Event processing status
    processed = models.BooleanField(default=False, help_text="Whether this event has been processed by all handlers")
    processing_started_at = models.DateTimeField(null=True, blank=True, help_text="When event processing started")
    processing_completed_at = models.DateTimeField(null=True, blank=True, help_text="When event processing completed")

    # Cross-system integration
    external_system_refs = models.JSONField(
        default=dict, blank=True, help_text="References to external systems that need to be notified"
    )

    # Error tracking
    processing_errors = models.JSONField(
        default=list, blank=True, help_text="Any errors encountered during event processing"
    )
    retry_count = models.PositiveIntegerField(default=0, help_text="Number of processing retry attempts")

    def __str__(self):
        return f"Event {self.event_type} for Payment {self.payment_number}"

    def mark_processing_started(self):
        """Mark event as starting processing"""
        self.processing_started_at = timezone.now()
        self.save(update_fields=["processing_started_at"])

    def mark_processing_completed(self):
        """Mark event as fully processed"""
        self.processed = True
        self.processing_completed_at = timezone.now()
        self.save(update_fields=["processed", "processing_completed_at"])

    def add_processing_error(self, error_message: str, error_details: dict = None):
        """Add processing error to the event"""
        error_entry = {
            "message": error_message,
            "details": error_details or {},
            "timestamp": timezone.now().isoformat(),
            "retry_attempt": self.retry_count + 1,
        }

        self.processing_errors.append(error_entry)
        self.retry_count += 1
        self.save(update_fields=["processing_errors", "retry_count"])

    def can_retry(self, max_retries: int = 3) -> bool:
        """Check if event processing can be retried"""
        return self.retry_count < max_retries and not self.processed

    class Meta:
        verbose_name = "Payment Event Store"
        verbose_name_plural = "Payment Event Store"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["payment", "-created_at"]),
            models.Index(fields=["event_type", "-created_at"]),
            models.Index(fields=["processed", "-created_at"]),
            models.Index(fields=["to_state", "-created_at"]),
        ]
