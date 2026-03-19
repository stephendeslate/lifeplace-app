from django.db import models
from django.utils import timezone

from core.utils.models import BaseModel


class PaymentWebhookLog(BaseModel):
    """
    Log of payment webhook events received from gateways.

    This model tracks all webhook events for monitoring,
    debugging, and ensuring proper processing.
    """

    # Gateway and event identification
    gateway_code = models.CharField(max_length=50, help_text="Payment gateway code (stripe, paypal, etc.)")
    event_type = models.CharField(max_length=100, help_text="Gateway-specific event type")
    event_id = models.CharField(max_length=255, unique=True, help_text="Unique event identifier from gateway")

    # Transaction context
    transaction_id = models.CharField(max_length=255, help_text="Gateway transaction identifier")

    # Webhook payload
    raw_data = models.JSONField(help_text="Complete webhook payload from gateway")

    # Processing status
    received_at = models.DateTimeField(default=timezone.now, help_text="When webhook was received")
    processed_at = models.DateTimeField(null=True, blank=True, help_text="When webhook was processed")
    processed_successfully = models.BooleanField(default=False, help_text="Whether webhook was processed successfully")

    # Processing details
    action_taken = models.CharField(max_length=100, blank=True, help_text="Action taken during processing")
    error_message = models.TextField(blank=True, help_text="Error message if processing failed")

    # Retry tracking
    retry_count = models.PositiveIntegerField(default=0, help_text="Number of processing retry attempts")

    def __str__(self):
        return f"{self.gateway_code} {self.event_type} - {self.event_id}"

    def mark_processed(self, success: bool, action: str = None, error: str = None):
        """Mark webhook as processed"""
        self.processed_at = timezone.now()
        self.processed_successfully = success
        if action:
            self.action_taken = action
        if error:
            self.error_message = error
        self.save()

    def increment_retry(self):
        """Increment retry count"""
        self.retry_count += 1
        self.save(update_fields=["retry_count"])

    class Meta:
        verbose_name = "Payment Webhook Log"
        verbose_name_plural = "Payment Webhook Logs"
        ordering = ["-received_at"]
        indexes = [
            models.Index(fields=["gateway_code", "-received_at"]),
            models.Index(fields=["event_type", "-received_at"]),
            models.Index(fields=["processed_successfully", "-received_at"]),
            models.Index(fields=["transaction_id"]),
        ]


class WebhookDeadLetter(BaseModel):
    """
    Dead letter queue for permanently failed webhook events.

    Webhooks that exceed the maximum retry attempts are moved here
    for manual review and remediation.
    """

    # Reference to original webhook log
    original_webhook = models.ForeignKey(
        PaymentWebhookLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dead_letters",
        help_text="Reference to the original webhook log",
    )

    # Duplicate webhook data (in case original is deleted)
    gateway_code = models.CharField(max_length=50, help_text="Payment gateway code (stripe, paypal, etc.)")
    event_type = models.CharField(max_length=100, help_text="Gateway-specific event type")
    event_id = models.CharField(max_length=255, help_text="Unique event identifier from gateway")
    transaction_id = models.CharField(max_length=255, help_text="Gateway transaction identifier")
    raw_data = models.JSONField(help_text="Complete webhook payload from gateway")

    # Timeline
    original_received_at = models.DateTimeField(help_text="When the webhook was originally received")
    moved_to_dead_letter_at = models.DateTimeField(
        default=timezone.now, help_text="When the webhook was moved to dead letter queue"
    )

    # Failure information
    retry_count = models.PositiveIntegerField(default=0, help_text="Number of retry attempts before failure")
    final_error = models.TextField(blank=True, help_text="Final error message that caused permanent failure")

    # Resolution tracking
    resolved = models.BooleanField(default=False, help_text="Whether this dead letter has been resolved")
    resolved_at = models.DateTimeField(null=True, blank=True, help_text="When the dead letter was resolved")
    resolved_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_dead_letters",
        help_text="Admin user who resolved the dead letter",
    )
    resolution_notes = models.TextField(blank=True, help_text="Notes about how the dead letter was resolved")

    def __str__(self):
        return f"Dead Letter: {self.gateway_code} {self.event_type} - {self.event_id}"

    def mark_resolved(self, user, notes: str = None):
        """Mark this dead letter as resolved"""
        self.resolved = True
        self.resolved_at = timezone.now()
        self.resolved_by = user
        if notes:
            self.resolution_notes = notes
        self.save()

    class Meta:
        verbose_name = "Webhook Dead Letter"
        verbose_name_plural = "Webhook Dead Letters"
        ordering = ["-moved_to_dead_letter_at"]
        indexes = [
            models.Index(fields=["resolved", "-moved_to_dead_letter_at"]),
            models.Index(fields=["gateway_code", "-moved_to_dead_letter_at"]),
            models.Index(fields=["event_id"]),
        ]
