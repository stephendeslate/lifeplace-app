# backend/core/domains/communications/models.py
import uuid
from core.utils.models import BaseModel
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()

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
    )
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default='MANUAL')
    
    subject_template = models.CharField(max_length=200, blank=True, null=True)  # For email only
    body_template = models.TextField()
    is_system = models.BooleanField(default=False)
    variables_schema = models.JSONField(default=dict, blank=True, help_text="Expected variables for template")

    class Meta:
        verbose_name = 'Communication Template'
        verbose_name_plural = 'Communication Templates'

    def __str__(self):
        return f"{self.name} ({self.get_channel_display()})"


class CommunicationRecord(BaseModel):
    """Record of communications sent through the system"""
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
    )
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default='MANUAL')
    
    recipient = models.EmailField()  # Email or phone number
    subject = models.CharField(max_length=200, blank=True, null=True)
    body = models.TextField()
    
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='communication_records', null=True, blank=True)
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_communications')
    
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

    class Meta:
        verbose_name = 'Communication Record'
        verbose_name_plural = 'Communication Records'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.template_name} to {self.recipient} - {self.delivery_status}"