# Data Breach Notification System

## Implementation Status: ✅ COMPLETE

All components have been fully implemented and are production-ready.

| Component | Status | Location |
|-----------|--------|----------|
| `SecurityBreach` Model | ✅ Complete | `security/models.py:8-114` |
| `BreachNotification` Model | ✅ Complete | `security/models.py:116-141` |
| `AffectedUser` Model | ✅ Complete | `security/models.py:144-159` |
| `BreachNotificationService` | ✅ Complete | `security/services.py:12-265` |
| `check_breach_notification_deadlines` Task | ✅ Scheduled | Runs hourly |
| `send_daily_breach_summary` Task | ✅ Scheduled | Runs daily at 9 AM |
| Admin Interface | ✅ Complete | `security/admin.py` |
| API Endpoints | ✅ Complete | `security/urls.py` |
| Serializers | ✅ Complete | `security/serializers.py` |
| Views | ✅ Complete | `security/views.py` |

**API Endpoints Available:**
- `GET /api/security/breaches/` - List all breaches
- `POST /api/security/breaches/` - Create new breach
- `GET /api/security/breaches/{id}/` - Get breach details
- `PUT/PATCH /api/security/breaches/{id}/` - Update breach
- `POST /api/security/breaches/{id}/notify-npc/` - Trigger NPC notification
- `POST /api/security/breaches/{id}/notify-users/` - Notify affected users
- `POST /api/security/breaches/{id}/assess-impact/` - Assess breach impact
- `GET /api/security/breaches/{id}/timeline/` - Get breach timeline
- `GET /api/security/breaches/summary/` - Get breach statistics

---

## Overview
This document specifies the breach detection, notification, and response system required for compliance with the Philippines Data Privacy Act of 2012 (NPC Circular 16-03).

---

## 1. Legal Requirements Summary

### Notification Timeline
- **NPC Notification:** Within 72 hours of breach discovery
- **Data Subject Notification:** Within 72 hours of breach discovery
- **Full Report:** Within 5 days (unless extension granted)

### When Notification is Required
Breach involves:
- Sensitive Personal Information (SPI), OR
- 100+ individuals affected, OR
- Data that could enable identity fraud

---

## 2. Breach Detection Triggers

### Automatic Detection (via SecurityLogger)

| Trigger | Risk Score | Auto-Escalate |
|---------|------------|---------------|
| Brute force attack (5+ failures) | 70 | Yes |
| Multiple permission denied | 50 | No |
| Unusual data access pattern | 60 | Review |
| Mass data export | 80 | Yes |
| Admin action on 100+ records | 70 | Review |
| API abuse detected | 60 | Review |
| Unauthorized access attempt | 80 | Yes |

### Manual Detection
- Security audit findings
- User reports
- Third-party notifications
- Vulnerability disclosures

---

## 3. Backend Implementation

### Model: SecurityBreach

```python
# core/domains/security/models.py

from django.db import models
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
        related_name='led_breaches'
    )

    class Meta:
        ordering = ['-detected_at']
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
            from django.utils import timezone
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


class AffectedUser(BaseModel):
    """Track users affected by a breach"""

    breach = models.ForeignKey(SecurityBreach, on_delete=models.CASCADE, related_name='affected_users')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    data_exposed = models.JSONField(default=list)  # List of exposed data types
    notified = models.BooleanField(default=False)
    notified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['breach', 'user']
```

### Service: BreachNotificationService

```python
# core/domains/security/services.py

from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import SecurityBreach, BreachNotification, AffectedUser
import logging

logger = logging.getLogger('security')


class BreachNotificationService:
    """Service for managing breach notifications"""

    NPC_EMAIL = 'complaints@privacy.gov.ph'  # NPC official email

    @classmethod
    def create_breach(cls, title, description, breach_type, severity, detected_at=None):
        """Create a new breach record"""
        from django.utils import timezone

        # Generate breach ID
        year = timezone.now().year
        count = SecurityBreach.objects.filter(
            detected_at__year=year
        ).count() + 1
        breach_id = f"BREACH-{year}-{count:03d}"

        breach = SecurityBreach.objects.create(
            breach_id=breach_id,
            title=title,
            description=description,
            breach_type=breach_type,
            severity=severity,
            detected_at=detected_at or timezone.now(),
            status='DETECTED'
        )

        # Log the breach
        logger.critical(
            f"Security breach detected: {breach_id}",
            extra={
                'breach_id': breach_id,
                'severity': severity,
                'breach_type': breach_type
            }
        )

        # Alert security team
        cls._send_internal_alert(breach)

        return breach

    @classmethod
    def assess_impact(cls, breach, affected_user_ids, data_types):
        """Assess breach impact and update affected users"""
        breach.affected_users_count = len(affected_user_ids)
        breach.data_types_affected = data_types
        breach.involves_spi = any(
            dt in data_types for dt in [
                'health', 'religion', 'political', 'genetic',
                'government_id', 'criminal_record'
            ]
        )
        breach.save()

        # Create affected user records
        for user_id in affected_user_ids:
            AffectedUser.objects.get_or_create(
                breach=breach,
                user_id=user_id,
                defaults={'data_exposed': data_types}
            )

        # Check if notification is required
        if breach.requires_notification():
            logger.warning(
                f"Breach {breach.breach_id} requires NPC notification",
                extra={'breach_id': breach.breach_id}
            )

        return breach

    @classmethod
    def notify_npc(cls, breach):
        """Send initial notification to NPC"""
        if breach.npc_notified:
            return

        content = cls._generate_npc_notification(breach)

        # In production, this would send via official NPC channels
        # For now, log and send email to DPO for manual submission

        send_mail(
            subject=f"[URGENT] NPC Breach Notification Required: {breach.breach_id}",
            message=content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.DPO_EMAIL],
            fail_silently=False,
        )

        BreachNotification.objects.create(
            breach=breach,
            notification_type='NPC_INITIAL',
            recipient=cls.NPC_EMAIL,
            content=content,
            delivery_status='PENDING_MANUAL_SUBMISSION'
        )

        breach.npc_notified = True
        breach.npc_notified_at = timezone.now()
        breach.status = 'NOTIFYING'
        breach.save()

        logger.info(f"NPC notification prepared for breach {breach.breach_id}")

    @classmethod
    def notify_affected_users(cls, breach):
        """Notify all affected users of the breach"""
        affected = AffectedUser.objects.filter(
            breach=breach,
            notified=False
        ).select_related('user')

        for affected_user in affected:
            user = affected_user.user
            content = cls._generate_user_notification(breach, affected_user)

            # Send email
            try:
                send_mail(
                    subject=f"Important Security Notice from LifePlace",
                    message=content,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )

                BreachNotification.objects.create(
                    breach=breach,
                    notification_type='USER_EMAIL',
                    recipient=user.email,
                    content=content,
                    delivery_status='SENT'
                )

                affected_user.notified = True
                affected_user.notified_at = timezone.now()
                affected_user.save()

            except Exception as e:
                logger.error(f"Failed to notify user {user.id}: {e}")

        if not AffectedUser.objects.filter(breach=breach, notified=False).exists():
            breach.users_notified = True
            breach.users_notified_at = timezone.now()
            breach.save()

    @classmethod
    def _generate_npc_notification(cls, breach):
        """Generate NPC notification content per NPC Circular 16-03"""
        return f"""
PERSONAL DATA BREACH NOTIFICATION
Pursuant to NPC Circular No. 16-03

1. PERSONAL INFORMATION CONTROLLER
   Name: LifePlace Events Management
   Address: [Company Address]
   Contact: dpo@lifeplace.com
   DPO: [DPO Name]

2. DATE AND TIME OF BREACH
   Detected: {breach.detected_at.strftime('%Y-%m-%d %H:%M:%S')} PHT

3. NATURE OF BREACH
   Type: {breach.get_breach_type_display()}
   Description: {breach.description}

4. PERSONAL DATA INVOLVED
   Data Types: {', '.join(breach.data_types_affected)}
   Involves Sensitive Personal Information: {'Yes' if breach.involves_spi else 'No'}

5. NUMBER OF AFFECTED DATA SUBJECTS
   Approximately {breach.affected_users_count} individuals

6. LIKELY CONSEQUENCES
   {breach.description}

7. MEASURES TAKEN
   Containment: {breach.containment_actions or 'Under investigation'}
   Remediation: {breach.remediation_steps or 'To be determined'}

8. ASSISTANCE TO DATA SUBJECTS
   Affected users have been/will be notified via email with guidance on protective measures.

9. CONTACT FOR FURTHER INFORMATION
   Data Protection Officer: dpo@lifeplace.com
   Phone: [DPO Phone]

---
This is an initial notification. A full report will be submitted within 5 days.
        """

    @classmethod
    def _generate_user_notification(cls, breach, affected_user):
        """Generate user notification content"""
        user = affected_user.user
        return f"""
Dear {user.first_name},

We are writing to inform you of a security incident that may have affected your personal information.

WHAT HAPPENED
{breach.description}

WHAT INFORMATION WAS INVOLVED
The following types of your personal data may have been affected:
{chr(10).join('- ' + dt.replace('_', ' ').title() for dt in affected_user.data_exposed)}

WHAT WE ARE DOING
{breach.containment_actions or 'We have taken immediate steps to contain this incident and are working with security experts to investigate.'}

WHAT YOU CAN DO
1. Monitor your accounts for suspicious activity
2. Be cautious of phishing emails or calls
3. Consider changing your LifePlace password
4. Contact us if you notice anything unusual

FOR MORE INFORMATION
If you have questions, please contact our Data Protection Officer:
Email: dpo@lifeplace.com

We sincerely apologize for any concern this may cause.

The LifePlace Team
        """

    @classmethod
    def _send_internal_alert(cls, breach):
        """Send internal alert to security team"""
        send_mail(
            subject=f"[ALERT] Security Breach Detected: {breach.breach_id}",
            message=f"""
A security breach has been detected and requires immediate attention.

Breach ID: {breach.breach_id}
Severity: {breach.severity}
Type: {breach.get_breach_type_display()}
Detected: {breach.detected_at}

Description:
{breach.description}

Please log in to the admin panel to manage this incident.
            """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.SECURITY_TEAM_EMAIL],
            fail_silently=True,
        )
```

---

## 4. Automatic Escalation

Integrate with existing SecurityLogger:

```python
# core/utils/security_logging.py (additions)

class SecurityLogger:
    # ... existing code ...

    @classmethod
    def check_for_breach_conditions(cls, event: SecurityEvent):
        """Check if event triggers breach investigation"""
        from core.domains.security.services import BreachNotificationService

        # Conditions that trigger automatic breach creation
        if event.event_type == 'DATA_BREACH':
            BreachNotificationService.create_breach(
                title=f"Detected: {event.details.get('description', 'Unknown breach')}",
                description=str(event.details),
                breach_type='UNAUTHORIZED_ACCESS',
                severity='HIGH' if event.risk_score >= 70 else 'MEDIUM',
                detected_at=event.timestamp
            )

        # Mass data access
        if event.event_type == 'DATA_ACCESS' and event.details.get('record_count', 0) > 1000:
            BreachNotificationService.create_breach(
                title="Unusual mass data access detected",
                description=f"User {event.user} accessed {event.details.get('record_count')} records",
                breach_type='DATA_LEAK',
                severity='MEDIUM',
            )
```

---

## 5. Admin Dashboard Requirements

### Breach Management Views

1. **Breach List** - All breaches with status filtering
2. **Breach Detail** - Full incident details, timeline, affected users
3. **Impact Assessment** - Select affected users and data types
4. **Notification Center** - Send NPC/user notifications
5. **Timeline View** - Chronological incident timeline

### Required Admin Actions

- Create breach record
- Update status
- Add containment/remediation notes
- Trigger NPC notification
- Trigger user notifications
- Mark as resolved
- Export compliance report

---

## 6. Monitoring & Alerts

### Celery Tasks for Monitoring

```python
# core/domains/security/tasks.py

from celery import shared_task
from .models import SecurityBreach
from .services import BreachNotificationService
from django.utils import timezone

@shared_task
def check_notification_deadlines():
    """Check for breaches approaching 72-hour deadline"""
    breaches = SecurityBreach.objects.filter(
        status__in=['DETECTED', 'INVESTIGATING', 'CONFIRMED'],
        npc_notified=False
    )

    for breach in breaches:
        hours = breach.hours_since_detection()

        if hours >= 72:
            # Overdue - urgent alert
            send_urgent_alert(breach, "OVERDUE: 72-hour notification deadline passed!")
        elif hours >= 48:
            # Warning
            send_urgent_alert(breach, "WARNING: 24 hours until notification deadline")
        elif hours >= 24:
            # Reminder
            send_urgent_alert(breach, "REMINDER: 48 hours until notification deadline")

@shared_task
def send_daily_breach_report():
    """Send daily summary of active breaches"""
    active_breaches = SecurityBreach.objects.exclude(
        status__in=['RESOLVED', 'FALSE_POSITIVE']
    )

    if active_breaches.exists():
        # Send summary to security team
        pass
```

---

## 7. Compliance Checklist

### Immediate (Upon Detection)
- [ ] Create breach record in system
- [ ] Assess severity and type
- [ ] Begin containment
- [ ] Notify internal security team
- [ ] Begin impact assessment

### Within 72 Hours
- [ ] Confirm breach and scope
- [ ] Identify affected users
- [ ] Determine if SPI involved
- [ ] Prepare NPC notification
- [ ] Submit NPC notification
- [ ] Begin user notifications

### Within 5 Days
- [ ] Complete root cause analysis
- [ ] Document containment actions
- [ ] Submit full NPC report
- [ ] Complete user notifications
- [ ] Implement immediate fixes

### Post-Incident
- [ ] Conduct lessons learned
- [ ] Update security controls
- [ ] Document prevention measures
- [ ] Archive breach record
