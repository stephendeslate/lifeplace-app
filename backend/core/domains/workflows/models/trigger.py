from django.db import models

from core.utils.models import BaseModel

from .stage import WorkflowStage


class WorkflowTrigger(BaseModel):
    """Records of workflow trigger events for automation"""

    TRIGGER_TYPE_CHOICES = [
        # Payment triggers
        ("PAYMENT_RECEIVED", "Payment Received"),
        ("PAYMENT_PLAN_CREATED", "Payment Plan Created"),
        ("PAYMENT_OVERDUE", "Payment Overdue"),
        # Quote triggers
        ("QUOTE_SENT", "Quote Sent"),
        ("QUOTE_ACCEPTED", "Quote Accepted"),
        ("QUOTE_REJECTED", "Quote Rejected"),
        ("QUOTE_EXPIRED", "Quote Expired"),
        # Contract triggers
        ("CONTRACT_SENT", "Contract Sent"),
        ("CONTRACT_SIGNED", "Contract Signed"),
        ("CONTRACT_EXPIRED", "Contract Expired"),
        # Invoice triggers
        ("INVOICE_SENT", "Invoice Sent"),
        ("INVOICE_OVERDUE", "Invoice Overdue"),
        # Event triggers
        ("EVENT_CREATED", "Event Created"),
        ("EVENT_COMPLETED", "Event Completed"),
        # Other triggers
        ("TASK_COMPLETED", "Task Completed"),
        ("DATE_TRIGGER", "Date/Time Trigger"),
        ("MANUAL_TRIGGER", "Manual Trigger"),
    ]

    event = models.ForeignKey("events.Event", on_delete=models.CASCADE, related_name="workflow_triggers")
    stage = models.ForeignKey(WorkflowStage, on_delete=models.CASCADE, null=True, blank=True)
    trigger_type = models.CharField(max_length=50, choices=TRIGGER_TYPE_CHOICES)
    details = models.TextField(blank=True, help_text="Description of what triggered this event")
    result_data = models.JSONField(default=dict, blank=True, help_text="Data associated with the trigger")
    processed = models.BooleanField(default=False, help_text="Whether this trigger has been processed")
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event} - {self.get_trigger_type_display()}"


class EventWorkflowOverride(BaseModel):
    """
    Per-event workflow customization overrides.

    Allows individual events to have customized workflow behavior:
    - Skip/disable specific stages
    - Add custom one-off stages
    - Modify stage properties for this event only

    This enables StudioNinja-style per-job workflow customization where
    you can remove certain automated emails or add extra steps for
    specific clients without modifying the template.
    """

    OVERRIDE_TYPE_CHOICES = [
        ("SKIP", "Skip Stage"),  # Don't execute this stage for this event
        ("DISABLE_AUTOMATION", "Disable Automation"),  # Run stage but skip automation
        ("CUSTOM_TIMING", "Custom Timing"),  # Override trigger_time for this event
        ("ADD_STAGE", "Add Custom Stage"),  # Add a one-off stage just for this event
    ]

    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="workflow_overrides",
        help_text="The event this override applies to",
    )
    stage = models.ForeignKey(
        WorkflowStage,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="event_overrides",
        help_text="The template stage being overridden (null for ADD_STAGE)",
    )
    override_type = models.CharField(
        max_length=20, choices=OVERRIDE_TYPE_CHOICES, help_text="Type of override to apply"
    )

    # For CUSTOM_TIMING overrides
    custom_trigger_time = models.CharField(
        max_length=255, blank=True, help_text="Custom trigger time for this event (overrides stage.trigger_time)"
    )

    # For ADD_STAGE overrides - custom stage properties
    custom_stage_name = models.CharField(max_length=255, blank=True, help_text="Name for custom added stage")
    custom_stage_category = models.CharField(
        max_length=20,
        choices=[
            ("LEAD", "Lead"),
            ("PRODUCTION", "Production"),
            ("POST_PRODUCTION", "Post Production"),
        ],
        blank=True,
        help_text="Stage category for custom added stage",
    )
    custom_order = models.PositiveIntegerField(null=True, blank=True, help_text="Order position for custom stage")
    custom_is_automated = models.BooleanField(default=False, help_text="Whether custom stage has automation")
    custom_automation_type = models.CharField(max_length=50, blank=True, help_text="Automation type for custom stage")
    custom_email_template = models.ForeignKey(
        "communications.CommunicationTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="event_override_emails",
        help_text="Email template for custom stage",
    )
    custom_task_description = models.TextField(blank=True, help_text="Task description for custom stage")

    # Tracking
    reason = models.TextField(blank=True, help_text="Reason for this override (for audit trail)")
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workflow_overrides_created",
        help_text="User who created this override",
    )

    # Execution tracking
    executed = models.BooleanField(default=False, help_text="Whether this override has been applied/executed")
    executed_at = models.DateTimeField(null=True, blank=True, help_text="When this override was applied")

    class Meta:
        ordering = ["event", "custom_order"]
        constraints = [
            # Only one override per stage per event (except for ADD_STAGE which has no stage)
            models.UniqueConstraint(
                fields=["event", "stage"], condition=models.Q(stage__isnull=False), name="unique_event_stage_override"
            ),
        ]
        indexes = [
            models.Index(fields=["event", "override_type"]),
            models.Index(fields=["stage", "override_type"]),
        ]

    def __str__(self):
        if self.stage:
            return f"{self.event} - {self.override_type} - {self.stage.name}"
        return f"{self.event} - {self.override_type} - {self.custom_stage_name}"

    def is_stage_skipped(self):
        """Check if this override skips the stage entirely"""
        return self.override_type == "SKIP"

    def is_automation_disabled(self):
        """Check if automation is disabled for this stage"""
        return self.override_type in ["SKIP", "DISABLE_AUTOMATION"]
