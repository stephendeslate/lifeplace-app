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