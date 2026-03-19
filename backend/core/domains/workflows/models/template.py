from django.db import models

from core.utils.models import BaseModel


class WorkflowTemplate(BaseModel):
    """Templates for standardized event workflows"""

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    event_type = models.ForeignKey("events.EventType", on_delete=models.PROTECT, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    # Lead Stage Auto-Stop: When enabled, all remaining LEAD stage automations
    # are automatically cancelled when an event transitions to PRODUCTION stage.
    # This prevents follow-up/nurturing emails from being sent after booking.
    lead_stage_auto_stop = models.BooleanField(
        default=True, help_text="Stop remaining LEAD automations when event enters PRODUCTION stage"
    )

    def __str__(self):
        return self.name
