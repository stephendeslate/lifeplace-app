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
                    subject="Important Security Notice from LifePlace",
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
   Contact: {settings.DPO_EMAIL}
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
   Data Protection Officer: {settings.DPO_EMAIL}
   Phone: {settings.DPO_PHONE}

---
This is an initial notification. A full report will be submitted within 5 days.
        """

    @classmethod
    def _generate_user_notification(cls, breach, affected_user):
        """Generate user notification content"""
        user = affected_user.user
        data_list = '\n'.join('- ' + dt.replace('_', ' ').title() for dt in affected_user.data_exposed)
        return f"""
Dear {user.first_name},

We are writing to inform you of a security incident that may have affected your personal information.

WHAT HAPPENED
{breach.description}

WHAT INFORMATION WAS INVOLVED
The following types of your personal data may have been affected:
{data_list}

WHAT WE ARE DOING
{breach.containment_actions or 'We have taken immediate steps to contain this incident and are working with security experts to investigate.'}

WHAT YOU CAN DO
1. Monitor your accounts for suspicious activity
2. Be cautious of phishing emails or calls
3. Consider changing your LifePlace password
4. Contact us if you notice anything unusual

FOR MORE INFORMATION
If you have questions, please contact our Data Protection Officer:
Email: {settings.DPO_EMAIL}

We sincerely apologize for any concern this may cause.

The LifePlace Team
        """

    @classmethod
    def _send_internal_alert(cls, breach):
        """Send internal alert to security team"""
        if not settings.SECURITY_TEAM_EMAIL:
            logger.warning("SECURITY_TEAM_EMAIL not configured, skipping internal alert")
            return

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
