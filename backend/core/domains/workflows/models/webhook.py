from django.db import models

from core.utils.models import BaseModel

from .template import WorkflowTemplate


class WorkflowWebhook(BaseModel):
    """
    Configuration for outgoing webhooks triggered by workflow events.

    Allows external systems to be notified when workflow events occur:
    - Stage entered/completed
    - Automation executed
    - Workflow completed

    Includes HMAC signature verification for security.
    """

    WEBHOOK_EVENT_CHOICES = [
        ("STAGE_ENTERED", "Stage Entered"),
        ("STAGE_COMPLETED", "Stage Completed"),
        ("AUTOMATION_EXECUTED", "Automation Executed"),
        ("WORKFLOW_COMPLETED", "Workflow Completed"),
    ]

    name = models.CharField(max_length=255, help_text="Friendly name for this webhook")
    url = models.URLField(max_length=2048, help_text="URL to send webhook payloads to")
    secret = models.CharField(max_length=255, help_text="Secret key for HMAC signature verification")
    is_active = models.BooleanField(default=True, help_text="Whether this webhook is active")
    events = models.JSONField(default=list, help_text="List of event types to trigger this webhook")
    workflow_template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="webhooks",
        help_text="Optional: Limit to specific workflow template",
    )
    headers = models.JSONField(default=dict, blank=True, help_text="Additional headers to include in webhook requests")
    last_triggered_at = models.DateTimeField(null=True, blank=True, help_text="When this webhook was last triggered")
    failure_count = models.PositiveIntegerField(
        default=0, help_text="Number of consecutive failures (reset on success)"
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.url})"


class WorkflowWebhookDelivery(BaseModel):
    """
    Record of individual webhook delivery attempts.

    Tracks success/failure status and enables retry logic.
    """

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("SUCCESS", "Success"),
        ("FAILED", "Failed"),
        ("RETRYING", "Retrying"),
    ]

    webhook = models.ForeignKey(
        WorkflowWebhook,
        on_delete=models.CASCADE,
        related_name="deliveries",
        help_text="The webhook this delivery is for",
    )
    event_type = models.CharField(max_length=50, help_text="The type of event that triggered this delivery")
    payload = models.JSONField(help_text="The JSON payload sent to the webhook")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="PENDING", help_text="Current status of the delivery"
    )
    response_status_code = models.PositiveIntegerField(
        null=True, blank=True, help_text="HTTP status code from the response"
    )
    response_body = models.TextField(blank=True, help_text="Response body from the webhook endpoint")
    error_message = models.TextField(blank=True, help_text="Error message if delivery failed")
    attempt_count = models.PositiveIntegerField(default=0, help_text="Number of delivery attempts")
    next_retry_at = models.DateTimeField(null=True, blank=True, help_text="When to next retry delivery (if failed)")

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Workflow webhook deliveries"

    def __str__(self):
        return f"{self.webhook.name} - {self.event_type} - {self.status}"
