# core/domains/security/tasks.py

from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger('security')


@shared_task
def check_notification_deadlines():
    """
    Check for breaches approaching 72-hour notification deadline.
    Runs hourly via Celery Beat.
    """
    from .models import SecurityBreach

    breaches = SecurityBreach.objects.filter(
        status__in=['DETECTED', 'INVESTIGATING', 'CONFIRMED'],
        npc_notified=False
    )

    for breach in breaches:
        hours = breach.hours_since_detection()

        if hours >= 72:
            # OVERDUE - urgent alert
            send_deadline_alert.delay(
                str(breach.id),
                "OVERDUE: 72-hour notification deadline PASSED!",
                urgent=True
            )
        elif hours >= 48:
            # WARNING - 24 hours left
            send_deadline_alert.delay(
                str(breach.id),
                "WARNING: Only 24 hours until notification deadline",
                urgent=True
            )
        elif hours >= 24:
            # REMINDER - 48 hours left
            send_deadline_alert.delay(
                str(breach.id),
                "REMINDER: 48 hours until notification deadline",
                urgent=False
            )


@shared_task
def send_deadline_alert(breach_id, message, urgent=False):
    """Send deadline alert to security team"""
    from .models import SecurityBreach

    try:
        breach = SecurityBreach.objects.get(id=breach_id)
    except SecurityBreach.DoesNotExist:
        return

    subject_prefix = "[URGENT]" if urgent else "[ALERT]"

    recipients = [settings.DPO_EMAIL]
    if settings.SECURITY_TEAM_EMAIL:
        recipients.append(settings.SECURITY_TEAM_EMAIL)

    send_mail(
        subject=f"{subject_prefix} Breach {breach.breach_id}: {message}",
        message=f"""
Breach ID: {breach.breach_id}
Title: {breach.title}
Detected: {breach.detected_at}
Hours since detection: {breach.hours_since_detection():.1f}

Status: {breach.status}
Severity: {breach.severity}
Affected Users: {breach.affected_users_count}
Involves SPI: {'Yes' if breach.involves_spi else 'No'}

Action Required: {"NPC notification OVERDUE" if breach.hours_since_detection() >= 72 else "NPC notification required within deadline"}

Manage this breach in the admin panel.
        """,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipients,
        fail_silently=False,
    )

    logger.warning(
        f"Breach deadline alert sent: {breach.breach_id}",
        extra={'breach_id': breach.breach_id, 'hours': breach.hours_since_detection()}
    )


@shared_task
def send_daily_breach_summary():
    """
    Send daily summary of active breaches.
    Runs daily at 9 AM via Celery Beat.
    """
    from .models import SecurityBreach

    active_breaches = SecurityBreach.objects.exclude(
        status__in=['RESOLVED', 'FALSE_POSITIVE']
    ).order_by('-detected_at')

    if not active_breaches.exists():
        return

    summary_lines = []
    for breach in active_breaches:
        summary_lines.append(
            f"- {breach.breach_id}: {breach.title} ({breach.status}) - "
            f"{breach.hours_since_detection():.0f}h since detection"
        )

    recipients = []
    if settings.SECURITY_TEAM_EMAIL:
        recipients.append(settings.SECURITY_TEAM_EMAIL)
    if settings.DPO_EMAIL:
        recipients.append(settings.DPO_EMAIL)

    if not recipients:
        logger.warning("No recipients configured for daily breach summary")
        return

    send_mail(
        subject=f"[Daily] {active_breaches.count()} Active Security Breach(es)",
        message=f"""
Daily Security Breach Summary
Generated: {timezone.now().strftime('%Y-%m-%d %H:%M')} PHT

Active Breaches:
{chr(10).join(summary_lines)}

Manage breaches in the admin panel.
        """,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipients,
        fail_silently=True,
    )
