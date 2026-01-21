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


# =============================================================================
# Data Retention Cleanup Tasks
# =============================================================================

@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def cleanup_security_logs(self):
    """
    Clean up security logs older than the configured retention period.

    Default retention: 1 year (DATA_RETENTION_SECURITY_LOGS setting)
    Runs daily via Celery Beat.

    This task:
    - Deletes SecurityEvent records older than the retention period
    - Maintains compliance with data retention policies
    - Logs the cleanup operation for auditing
    """
    from datetime import timedelta
    from core.utils.security_logging import SecurityEvent, security_logger, SecurityEventType, SecuritySeverity

    retention_years = getattr(settings, 'DATA_RETENTION_SECURITY_LOGS', 1)
    cutoff_date = timezone.now() - timedelta(days=retention_years * 365)

    try:
        # Count records to be deleted
        records_to_delete = SecurityEvent.objects.filter(
            timestamp__lt=cutoff_date
        ).count()

        if records_to_delete == 0:
            logger.info("🧹 Security log cleanup: No old records to delete")
            return {
                'status': 'success',
                'deleted_count': 0,
                'retention_years': retention_years,
                'cutoff_date': cutoff_date.isoformat()
            }

        # Delete in batches to avoid memory issues
        batch_size = 1000
        total_deleted = 0

        while True:
            # Get IDs to delete in this batch
            batch_ids = list(
                SecurityEvent.objects.filter(timestamp__lt=cutoff_date)
                .values_list('id', flat=True)[:batch_size]
            )

            if not batch_ids:
                break

            deleted_count, _ = SecurityEvent.objects.filter(id__in=batch_ids).delete()
            total_deleted += deleted_count

            logger.info(f"🧹 Deleted batch of {deleted_count} security logs")

        # Log the cleanup operation itself
        security_logger.log_event(
            event_type=SecurityEventType.DATA_MODIFICATION,
            description=f"Security log cleanup: deleted {total_deleted} records older than {retention_years} year(s)",
            severity=SecuritySeverity.LOW,
            details={
                'task': 'cleanup_security_logs',
                'deleted_count': total_deleted,
                'retention_years': retention_years,
                'cutoff_date': cutoff_date.isoformat()
            }
        )

        logger.info(f"🧹 Security log cleanup complete: {total_deleted} records deleted")

        return {
            'status': 'success',
            'deleted_count': total_deleted,
            'retention_years': retention_years,
            'cutoff_date': cutoff_date.isoformat()
        }

    except Exception as e:
        logger.error(f"❌ Security log cleanup failed: {str(e)}")
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def cleanup_expired_account_data(self):
    """
    Purge data for accounts that have been deleted beyond the retention period.

    Default retention: 7 years post-deletion (DATA_RETENTION_ACCOUNT setting)
    Runs daily via Celery Beat.

    This task handles:
    - Anonymized user records past retention period
    - Associated data that can be safely removed
    - Maintains compliance with data retention policies

    Note: Financial records and contracts have longer retention periods
    (typically 10 years per BIR requirements) and are handled separately.
    """
    from datetime import timedelta
    from django.contrib.auth import get_user_model
    from core.utils.security_logging import security_logger, SecurityEventType, SecuritySeverity

    User = get_user_model()

    retention_years = getattr(settings, 'DATA_RETENTION_ACCOUNT', 7)
    cutoff_date = timezone.now() - timedelta(days=retention_years * 365)

    try:
        # Find users that were deactivated/deleted before the cutoff
        # These are users with:
        # - is_active=False (deactivated)
        # - email starting with 'deleted_' (anonymized)
        # - updated_at older than retention period
        expired_users = User.objects.filter(
            is_active=False,
            email__startswith='deleted_',
            updated_at__lt=cutoff_date
        )

        count = expired_users.count()

        if count == 0:
            logger.info("🧹 Account data cleanup: No expired accounts to purge")
            return {
                'status': 'success',
                'purged_count': 0,
                'retention_years': retention_years,
                'cutoff_date': cutoff_date.isoformat()
            }

        # Store IDs for logging before deletion
        purged_ids = list(expired_users.values_list('id', flat=True))

        # Delete the expired user records
        # Note: Related data should be configured with CASCADE or already cleaned
        deleted_count, _ = expired_users.delete()

        # Log the cleanup operation
        security_logger.log_event(
            event_type=SecurityEventType.DATA_MODIFICATION,
            description=f"Expired account data purge: deleted {deleted_count} accounts older than {retention_years} years post-deletion",
            severity=SecuritySeverity.MEDIUM,
            details={
                'task': 'cleanup_expired_account_data',
                'purged_count': deleted_count,
                'purged_ids': purged_ids[:100],  # Limit to 100 IDs for logging
                'retention_years': retention_years,
                'cutoff_date': cutoff_date.isoformat()
            }
        )

        logger.info(f"🧹 Account data cleanup complete: {deleted_count} expired accounts purged")

        return {
            'status': 'success',
            'purged_count': deleted_count,
            'retention_years': retention_years,
            'cutoff_date': cutoff_date.isoformat()
        }

    except Exception as e:
        logger.error(f"❌ Account data cleanup failed: {str(e)}")
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=1)
def monitor_data_retention_compliance(self):
    """
    Monitor and report on data retention compliance.

    Runs weekly via Celery Beat.

    This task:
    - Checks for data approaching retention deadlines
    - Reports on data volumes by category
    - Alerts if retention policies are not being met
    """
    from datetime import timedelta
    from django.contrib.auth import get_user_model
    from core.utils.security_logging import SecurityEvent, security_logger, SecurityEventType, SecuritySeverity

    User = get_user_model()
    now = timezone.now()

    try:
        # Get retention settings
        retention_security_logs = getattr(settings, 'DATA_RETENTION_SECURITY_LOGS', 1)
        retention_account = getattr(settings, 'DATA_RETENTION_ACCOUNT', 7)
        retention_financial = getattr(settings, 'DATA_RETENTION_FINANCIAL', 10)
        retention_contracts = getattr(settings, 'DATA_RETENTION_CONTRACTS', 10)

        # Calculate cutoff dates
        security_cutoff = now - timedelta(days=retention_security_logs * 365)
        account_cutoff = now - timedelta(days=retention_account * 365)

        # Count records that should have been cleaned up
        overdue_security_logs = SecurityEvent.objects.filter(
            timestamp__lt=security_cutoff
        ).count()

        overdue_accounts = User.objects.filter(
            is_active=False,
            email__startswith='deleted_',
            updated_at__lt=account_cutoff
        ).count()

        # Calculate approaching deadline warnings (within 30 days of expiry)
        warning_threshold = timedelta(days=30)

        # Security logs approaching expiry
        approaching_security = SecurityEvent.objects.filter(
            timestamp__lt=(security_cutoff + warning_threshold),
            timestamp__gte=security_cutoff
        ).count()

        # Accounts approaching purge
        approaching_accounts = User.objects.filter(
            is_active=False,
            email__startswith='deleted_',
            updated_at__lt=(account_cutoff + warning_threshold),
            updated_at__gte=account_cutoff
        ).count()

        # Get total counts for reporting
        total_security_logs = SecurityEvent.objects.count()
        total_deleted_users = User.objects.filter(
            is_active=False,
            email__startswith='deleted_'
        ).count()

        compliance_report = {
            'generated_at': now.isoformat(),
            'retention_settings': {
                'security_logs_years': retention_security_logs,
                'account_data_years': retention_account,
                'financial_data_years': retention_financial,
                'contracts_years': retention_contracts,
            },
            'security_logs': {
                'total_count': total_security_logs,
                'overdue_for_deletion': overdue_security_logs,
                'approaching_expiry': approaching_security,
            },
            'deleted_accounts': {
                'total_count': total_deleted_users,
                'overdue_for_purge': overdue_accounts,
                'approaching_purge': approaching_accounts,
            },
            'compliance_status': 'COMPLIANT' if (overdue_security_logs == 0 and overdue_accounts == 0) else 'NON_COMPLIANT'
        }

        # Log compliance check
        severity = SecuritySeverity.LOW if compliance_report['compliance_status'] == 'COMPLIANT' else SecuritySeverity.MEDIUM

        security_logger.log_event(
            event_type=SecurityEventType.DATA_ACCESS,
            description=f"Data retention compliance check: {compliance_report['compliance_status']}",
            severity=severity,
            details={
                'task': 'monitor_data_retention_compliance',
                'report': compliance_report
            }
        )

        # Send alert if non-compliant
        if compliance_report['compliance_status'] == 'NON_COMPLIANT':
            logger.warning(
                f"⚠️ Data retention non-compliance detected: "
                f"{overdue_security_logs} overdue security logs, "
                f"{overdue_accounts} overdue deleted accounts"
            )

            # Send alert email to DPO
            if hasattr(settings, 'DPO_EMAIL') and settings.DPO_EMAIL:
                send_mail(
                    subject="[ALERT] Data Retention Compliance Issue",
                    message=f"""
Data Retention Compliance Alert
Generated: {now.strftime('%Y-%m-%d %H:%M')} PHT

Issues Detected:
- Overdue security logs: {overdue_security_logs}
- Overdue deleted accounts: {overdue_accounts}

This indicates that data retention cleanup tasks may not be running properly.
Please investigate and ensure compliance with data retention policies.

Compliance Report:
{compliance_report}
                    """,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[settings.DPO_EMAIL],
                    fail_silently=True,
                )

        logger.info(f"📊 Data retention compliance check complete: {compliance_report['compliance_status']}")

        return compliance_report

    except Exception as e:
        logger.error(f"❌ Data retention compliance check failed: {str(e)}")
        return {
            'status': 'error',
            'error': str(e)
        }
