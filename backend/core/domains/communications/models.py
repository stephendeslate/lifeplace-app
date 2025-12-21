# backend/core/domains/communications/models.py
import logging
import uuid
from django.conf import settings
from core.utils.models import BaseModel
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models

from .context_service import ContextType

User = get_user_model()
logger = logging.getLogger(__name__)


class CommunicationTemplate(BaseModel):
    """Template for communications across different channels"""
    name = models.CharField(max_length=100, unique=True)

    CHANNEL_CHOICES = (
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
    )
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='EMAIL')

    CATEGORY_CHOICES = (
        ('SYSTEM', 'System'),
        ('MANUAL', 'Manual'),
        ('AUTO', 'Auto'),
        ('MARKETING', 'Marketing'),
    )
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default='MANUAL')

    # Context type determines which variables are available and required objects at send time
    CONTEXT_TYPE_CHOICES = ContextType.CHOICES
    context_type = models.CharField(
        max_length=20,
        choices=CONTEXT_TYPE_CHOICES,
        default=ContextType.MANUAL,
        help_text="Determines which variables are available and required objects at send time"
    )

    # For MANUAL context type, optionally include client/event context
    include_client_context = models.BooleanField(
        default=False,
        help_text="For MANUAL templates: include client variables if client is provided"
    )
    include_event_context = models.BooleanField(
        default=False,
        help_text="For MANUAL templates: include event variables if event is provided"
    )

    subject_template = models.CharField(max_length=200, blank=True, null=True)  # For email only
    body_template = models.TextField()
    is_system = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Communication Template'
        verbose_name_plural = 'Communication Templates'

    def __str__(self):
        return f"{self.name} ({self.get_channel_display()})"


class CommunicationTemplateHistory(BaseModel):
    """
    Audit trail for communication template changes.
    Records all updates to templates for version control and rollback capability.
    """

    REASON_CHOICES = [
        ('CREATE', 'Initial Creation'),
        ('UPDATE', 'Manual Update'),
        ('ROLLBACK', 'Rollback to Previous Version'),
        ('SYSTEM', 'System Update'),
    ]

    template = models.ForeignKey(
        CommunicationTemplate,
        on_delete=models.CASCADE,
        related_name='history'
    )
    version = models.PositiveIntegerField(
        help_text="Version number of this history entry"
    )

    # Snapshot of template state at this version
    name = models.CharField(max_length=100)
    channel = models.CharField(max_length=10)
    category = models.CharField(max_length=10)
    context_type = models.CharField(max_length=20, default=ContextType.MANUAL)
    include_client_context = models.BooleanField(default=False)
    include_event_context = models.BooleanField(default=False)
    subject_template = models.CharField(max_length=200, blank=True, null=True)
    body_template = models.TextField()

    reason = models.CharField(
        max_length=20,
        choices=REASON_CHOICES,
        default='UPDATE'
    )
    notes = models.TextField(
        blank=True,
        help_text="Additional notes about this change"
    )

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='template_changes'
    )

    class Meta:
        verbose_name = 'Communication Template History'
        verbose_name_plural = 'Communication Template Histories'
        ordering = ['-created_at']
        unique_together = ['template', 'version']

    def __str__(self):
        return f"{self.template.name} v{self.version} ({self.reason})"

    @classmethod
    def create_snapshot(cls, template, reason='UPDATE', changed_by=None, notes=''):
        """
        Create a history snapshot of the current template state.

        Args:
            template: CommunicationTemplate instance
            reason: One of REASON_CHOICES
            changed_by: User who made the change
            notes: Optional notes about the change

        Returns:
            CommunicationTemplateHistory instance
        """
        # Get the next version number
        last_version = cls.objects.filter(template=template).aggregate(
            max_version=models.Max('version')
        )['max_version'] or 0

        return cls.objects.create(
            template=template,
            version=last_version + 1,
            name=template.name,
            channel=template.channel,
            category=template.category,
            context_type=template.context_type,
            include_client_context=template.include_client_context,
            include_event_context=template.include_event_context,
            subject_template=template.subject_template,
            body_template=template.body_template,
            reason=reason,
            changed_by=changed_by,
            notes=notes
        )


class CommunicationRecord(BaseModel):
    """Record of communications sent through the system"""

    # Valid status transitions (state machine)
    VALID_STATUS_TRANSITIONS = {
        'PENDING': ['SENT', 'FAILED'],
        'SENT': ['DELIVERED', 'FAILED', 'BOUNCED'],
        'DELIVERED': [],  # Terminal state (except for opens which don't change status)
        'FAILED': ['PENDING'],  # Allow retry
        'BOUNCED': [],  # Terminal state
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template_name = models.CharField(max_length=100)

    CHANNEL_CHOICES = (
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
    )
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='EMAIL')

    CATEGORY_CHOICES = (
        ('SYSTEM', 'System'),
        ('MANUAL', 'Manual'),
        ('AUTO', 'Auto'),
        ('MARKETING', 'Marketing'),
    )
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default='MANUAL')

    recipient = models.EmailField()  # Email or phone number
    subject = models.CharField(max_length=200, blank=True, null=True)
    body = models.TextField()

    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='communication_records', null=True, blank=True)
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_communications')
    event = models.ForeignKey('events.Event', on_delete=models.SET_NULL, null=True, blank=True, related_name='communication_records')

    external_message_id = models.CharField(max_length=100, blank=True, null=True)

    DELIVERY_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('FAILED', 'Failed'),
        ('BOUNCED', 'Bounced'),
    )
    delivery_status = models.CharField(max_length=20, choices=DELIVERY_STATUS_CHOICES, default='PENDING')

    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    is_opened = models.BooleanField(default=False)

    context_data = models.JSONField(default=dict, blank=True)

    # Soft delete fields
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_communications'
    )

    class Meta:
        verbose_name = 'Communication Record'
        verbose_name_plural = 'Communication Records'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.template_name} to {self.recipient} - {self.delivery_status}"

    def transition_status(self, new_status: str, force: bool = False) -> bool:
        """
        Transition to a new delivery status with validation.

        Args:
            new_status: The new status to transition to
            force: If True, bypass validation (use with caution)

        Returns:
            bool: True if transition was successful

        Raises:
            ValidationError: If the transition is invalid
        """
        if new_status == self.delivery_status:
            return True  # No change needed

        if not force:
            valid_transitions = self.VALID_STATUS_TRANSITIONS.get(self.delivery_status, [])
            if new_status not in valid_transitions:
                logger.warning(
                    f"Invalid status transition attempted: {self.delivery_status} -> {new_status} "
                    f"for record {self.id}"
                )
                raise ValidationError(
                    f"Cannot transition from {self.delivery_status} to {new_status}"
                )

        old_status = self.delivery_status
        self.delivery_status = new_status
        logger.info(f"Status transition: {old_status} -> {new_status} for record {self.id}")
        return True

    def soft_delete(self, deleted_by=None):
        """
        Soft delete this record instead of permanently deleting it.

        Args:
            deleted_by: User who performed the deletion
        """
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = deleted_by
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'updated_at'])

    def restore(self):
        """
        Restore a soft-deleted record.
        """
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'updated_at'])