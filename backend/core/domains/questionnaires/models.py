# core/domains/questionnaires/models.py
from core.utils.models import BaseModel
from django.db import models


class Questionnaire(BaseModel):
    """Collections of fields for gathering client information"""
    name = models.CharField(max_length=200)
    event_type = models.ForeignKey('events.EventType', on_delete=models.PROTECT, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=1)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name


class QuestionnaireField(BaseModel):
    """Individual fields within a questionnaire"""
    FIELD_TYPES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('date', 'Date'),
        ('time', 'Time'),
        ('boolean', 'Yes/No'),
        ('select', 'Select'),
        ('multi-select', 'Multi-Select'),
        ('email', 'Email'),
        ('phone', 'Phone'),
        ('file', 'File Upload'),
        ('guests', 'Guest Count'),  # Structured guest count with breakdown
    ]

    questionnaire = models.ForeignKey(Questionnaire, related_name='fields', on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=FIELD_TYPES)
    required = models.BooleanField(default=False)
    order = models.IntegerField(default=1)
    options = models.JSONField(blank=True, default=list, help_text="List of option strings")

    # Phase 1.1: Description and placeholder for better UX
    description = models.TextField(
        blank=True,
        help_text="Optional helper text shown below the field to guide users"
    )
    placeholder = models.CharField(
        max_length=255,
        blank=True,
        help_text="Placeholder text shown inside the input field"
    )

    # Phase 1.3: Guest count (deprecated flag - use 'guests' type instead)
    is_guest_count = models.BooleanField(
        default=False,
        help_text="DEPRECATED: Use 'guests' field type instead. If true, numeric response contributes to guest count"
    )

    # Phase 2.1: Conditional display logic
    show_conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Conditions for when to show this field. Format: {'logic': 'AND', 'conditions': [{'field_id': '5', 'operator': 'equals', 'value': 'yes'}]}"
    )

    # Phase 4.1: File upload settings (for 'file' type fields)
    max_file_size_mb = models.PositiveIntegerField(
        default=10,
        help_text="Maximum file size in MB (for file fields only)"
    )
    allowed_file_types = models.JSONField(
        default=list,
        blank=True,
        help_text="Allowed file extensions e.g., ['pdf', 'jpg', 'png'] (for file fields only)"
    )
    max_files = models.PositiveIntegerField(
        default=1,
        help_text="Maximum number of files allowed (for file fields only)"
    )

    def __str__(self):
        return f"{self.questionnaire.name} - {self.name}"

    class Meta:
        ordering = ['order']


class QuestionnaireResponse(BaseModel):
    """Client responses to questionnaire fields"""
    event = models.ForeignKey('events.Event', related_name='questionnaire_responses', on_delete=models.CASCADE)
    field = models.ForeignKey(QuestionnaireField, on_delete=models.CASCADE)
    value = models.TextField()

    def __str__(self):
        return f"{self.event} - {self.field.name}: {self.value}"


class EventQuestionnaire(BaseModel):
    """
    Assignment of a Questionnaire template to an Event.
    Tracks status, timestamps, and assignment metadata.

    Similar to EventQuote/EventContract pattern for tracking questionnaires
    sent to clients outside of the booking flow.

    Status flow: PENDING -> SENT -> PARTIAL -> COMPLETE
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),           # Assigned but not sent to client
        ('SENT', 'Sent'),                 # Sent to client, awaiting responses
        ('PARTIAL', 'Partially Complete'), # Some responses received
        ('COMPLETE', 'Complete'),          # All required fields answered
    ]

    event = models.ForeignKey(
        'events.Event',
        on_delete=models.CASCADE,
        related_name='event_questionnaires'
    )
    questionnaire = models.ForeignKey(
        'Questionnaire',
        on_delete=models.PROTECT,
        related_name='event_assignments'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )

    # Assignment tracking
    assigned_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_questionnaires'
    )

    # Send tracking
    sent_at = models.DateTimeField(null=True, blank=True)
    sent_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_questionnaires'
    )

    # Completion tracking
    completed_at = models.DateTimeField(null=True, blank=True)

    # Optional due date for client to complete
    due_date = models.DateField(null=True, blank=True)

    # Notes for admin reference
    notes = models.TextField(blank=True)

    # Workflow automation tracking (if created via workflow)
    workflow_stage = models.ForeignKey(
        'workflows.WorkflowStage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='questionnaire_assignments',
        help_text="Workflow stage that created this assignment (if automated)"
    )

    class Meta:
        ordering = ['-created_at']
        # Prevent duplicate assignments of same questionnaire to same event
        unique_together = ['event', 'questionnaire']

    def __str__(self):
        return f"{self.questionnaire.name} for Event {self.event.id} ({self.status})"

    @property
    def is_overdue(self):
        """Check if questionnaire is past due date and not complete"""
        if not self.due_date or self.status == 'COMPLETE':
            return False
        from django.utils import timezone
        return timezone.now().date() > self.due_date

    @property
    def days_until_due(self):
        """Calculate days until due date (negative if overdue)"""
        if not self.due_date:
            return None
        from django.utils import timezone
        delta = self.due_date - timezone.now().date()
        return delta.days

    @property
    def completion_stats(self):
        """Get completion statistics for this questionnaire"""
        total_fields = self.questionnaire.fields.count()
        required_fields = self.questionnaire.fields.filter(required=True).count()

        # Get responses for this event and questionnaire
        responses = QuestionnaireResponse.objects.filter(
            event=self.event,
            field__questionnaire=self.questionnaire
        ).exclude(value='')
        answered_count = responses.count()
        required_answered = responses.filter(field__required=True).count()

        return {
            'total_fields': total_fields,
            'required_fields': required_fields,
            'answered_count': answered_count,
            'required_answered': required_answered,
            'completion_percentage': round((answered_count / total_fields * 100) if total_fields > 0 else 0),
            'required_completion_percentage': round((required_answered / required_fields * 100) if required_fields > 0 else 100),
        }

    def send_to_client(self, user=None):
        """
        Mark questionnaire as sent and notify client.
        Following EventQuote.send_to_client() pattern.

        Args:
            user: The user who is sending the questionnaire (for audit trail)
        """
        import logging
        from django.utils import timezone

        logger = logging.getLogger(__name__)

        if self.status not in ['PENDING', 'SENT']:
            raise ValueError(f"Cannot send questionnaire with status '{self.status}'")

        self.status = 'SENT'
        self.sent_at = timezone.now()
        self.sent_by = user
        self.save()

        # Create activity record
        EventQuestionnaireActivity.objects.create(
            event_questionnaire=self,
            action='SENT',
            action_by=user,
            notes=f"Questionnaire sent to client {self.event.client}" if self.event.client else "Questionnaire sent"
        )

        # Send notification asynchronously
        from .tasks import send_event_questionnaire_notification
        send_event_questionnaire_notification.delay(self.id, 'sent')

        logger.info(f"EventQuestionnaire {self.id} sent for event {self.event.id}")

    def update_status_from_responses(self):
        """
        Update status based on current responses.
        Called after responses are saved to keep status in sync.
        """
        from django.utils import timezone

        stats = self.completion_stats
        old_status = self.status

        if stats['required_completion_percentage'] == 100:
            self.status = 'COMPLETE'
            if not self.completed_at:
                self.completed_at = timezone.now()
        elif stats['answered_count'] > 0:
            self.status = 'PARTIAL'
            self.completed_at = None
        else:
            # Keep SENT status if no responses yet, unless PENDING
            if self.status not in ['PENDING']:
                self.status = 'SENT'
            self.completed_at = None

        if old_status != self.status:
            self.save(update_fields=['status', 'completed_at', 'updated_at'])

            # Record activity on status change
            action = 'COMPLETED' if self.status == 'COMPLETE' else 'STATUS_CHANGED'
            EventQuestionnaireActivity.objects.create(
                event_questionnaire=self,
                action=action,
                notes=f"Status changed from {old_status} to {self.status}"
            )


class EventQuestionnaireActivity(BaseModel):
    """
    Tracks actions and activity related to event questionnaires.
    Following QuoteActivity pattern for audit trail.
    """
    ACTION_CHOICES = [
        ('CREATED', 'Created'),
        ('SENT', 'Sent'),
        ('VIEWED', 'Viewed by Client'),
        ('RESPONSE_ADDED', 'Response Added'),
        ('STATUS_CHANGED', 'Status Changed'),
        ('REMINDER_SENT', 'Reminder Sent'),
        ('COMPLETED', 'Completed'),
    ]

    event_questionnaire = models.ForeignKey(
        EventQuestionnaire,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    action_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Event questionnaire activities'

    def __str__(self):
        return f"{self.get_action_display()} - {self.event_questionnaire}"