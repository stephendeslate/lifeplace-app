# core/domains/questionnaires/models.py
from core.utils.models import BaseModel
from django.contrib.postgres.fields import ArrayField
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
    ]

    questionnaire = models.ForeignKey(Questionnaire, related_name='fields', on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=FIELD_TYPES)
    required = models.BooleanField(default=False)
    order = models.IntegerField(default=1)
    options = ArrayField(models.CharField(max_length=200), blank=True, null=True)

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