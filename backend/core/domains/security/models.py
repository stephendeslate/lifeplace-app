# core/domains/security/models.py

from django.db import models
from django.utils import timezone
from core.utils.models import BaseModel


class SecurityBreach(BaseModel):
    """Track and manage security breach incidents"""

    SEVERITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('DETECTED', 'Detected'),
        ('INVESTIGATING', 'Under Investigation'),
        ('CONFIRMED', 'Confirmed Breach'),
        ('CONTAINED', 'Contained'),
        ('NOTIFYING', 'Notifying Affected Parties'),
        ('RESOLVED', 'Resolved'),
        ('FALSE_POSITIVE', 'False Positive'),
    ]

    BREACH_TYPE_CHOICES = [
        ('UNAUTHORIZED_ACCESS', 'Unauthorized Access'),
        ('DATA_THEFT', 'Data Theft'),
        ('DATA_LEAK', 'Data Leak'),
        ('RANSOMWARE', 'Ransomware'),
        ('PHISHING', 'Phishing'),
        ('INSIDER_THREAT', 'Insider Threat'),
        ('SYSTEM_COMPROMISE', 'System Compromise'),
        ('OTHER', 'Other'),
    ]

    # Identification
    breach_id = models.CharField(max_length=50, unique=True)  # e.g., "BREACH-2025-001"
    title = models.CharField(max_length=255)
    description = models.TextField()

    # Classification
    breach_type = models.CharField(max_length=30, choices=BREACH_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DETECTED')

    # Timeline
    detected_at = models.DateTimeField()
    confirmed_at = models.DateTimeField(null=True, blank=True)
    contained_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    # Impact Assessment
    affected_users_count = models.PositiveIntegerField(default=0)
    affected_records_count = models.PositiveIntegerField(default=0)
    involves_spi = models.BooleanField(default=False)
    data_types_affected = models.JSONField(default=list)  # ['email', 'phone', 'payment']

    # Root Cause
    attack_vector = models.TextField(blank=True)
    vulnerabilities_exploited = models.TextField(blank=True)

    # Response
    containment_actions = models.TextField(blank=True)
    remediation_steps = models.TextField(blank=True)
    prevention_measures = models.TextField(blank=True)

    # Notifications
    npc_notified = models.BooleanField(default=False)
    npc_notified_at = models.DateTimeField(null=True, blank=True)
    npc_reference_number = models.CharField(max_length=100, blank=True)

    users_notified = models.BooleanField(default=False)
    users_notified_at = models.DateTimeField(null=True, blank=True)

    # Assigned personnel
    incident_lead = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_breaches'
    )

    class Meta:
        ordering = ['-detected_at']
        verbose_name = 'Security Breach'
        verbose_name_plural = 'Security Breaches'

    def __str__(self):
        return f"{self.breach_id}: {self.title}"

    def requires_notification(self):
        """Check if NPC/user notification is required"""
        return (
            self.involves_spi or
            self.affected_users_count >= 100 or
            'payment' in self.data_types_affected or
            'government_id' in self.data_types_affected
        )

    def hours_since_detection(self):
        """Calculate hours since breach was detected"""
        if self.detected_at:
            delta = timezone.now() - self.detected_at
            return delta.total_seconds() / 3600
        return 0

    def is_notification_overdue(self):
        """Check if 72-hour notification deadline is passed"""
        return self.hours_since_detection() > 72 and not self.npc_notified


class BreachNotification(BaseModel):
    """Track notifications sent for a breach"""

    NOTIFICATION_TYPE_CHOICES = [
        ('NPC_INITIAL', 'NPC Initial Notification'),
        ('NPC_FULL_REPORT', 'NPC Full Report'),
        ('USER_EMAIL', 'User Email Notification'),
        ('USER_SMS', 'User SMS Notification'),
        ('USER_IN_APP', 'User In-App Notification'),
        ('INTERNAL', 'Internal Stakeholder'),
    ]

    breach = models.ForeignKey(SecurityBreach, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPE_CHOICES)
    recipient = models.CharField(max_length=255)  # Email, phone, or user ID
    sent_at = models.DateTimeField(auto_now_add=True)
    content = models.TextField()
    delivery_status = models.CharField(max_length=50, default='SENT')

    class Meta:
        ordering = ['-sent_at']
        verbose_name = 'Breach Notification'
        verbose_name_plural = 'Breach Notifications'

    def __str__(self):
        return f"{self.breach.breach_id} - {self.notification_type} to {self.recipient}"


class AffectedUser(BaseModel):
    """Track users affected by a breach"""

    breach = models.ForeignKey(SecurityBreach, on_delete=models.CASCADE, related_name='affected_users')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    data_exposed = models.JSONField(default=list)  # List of exposed data types
    notified = models.BooleanField(default=False)
    notified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['breach', 'user']
        verbose_name = 'Affected User'
        verbose_name_plural = 'Affected Users'

    def __str__(self):
        return f"{self.breach.breach_id} - User {self.user.email}"
