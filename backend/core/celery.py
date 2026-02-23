# backend/core/celery.py

import logging
import os

from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("lifeplace")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# =============================================================================
# CELERY REDIS CONFIGURATION (Upstash Compatible - Single Database)
# =============================================================================
# Upstash only supports a single Redis database (DB 0). All isolation is
# achieved through key prefixes instead of separate databases.
#
# Key prefixes are configured in Django settings:
# - Broker: lifeplace:celery:
# - Results: lifeplace:celery-results:
#
# The broker_url and result_backend are inherited from Django settings
# via the CELERY namespace (CELERY_BROKER_URL, CELERY_RESULT_BACKEND).
# =============================================================================

app.conf.update(
    # Use database scheduler instead of file-based scheduler
    # This avoids "celerybeat-schedule" file corruption issues
    beat_scheduler="django_celery_beat.schedulers:DatabaseScheduler",
    # Task execution settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Task routing
    task_routes={
        "core.domains.notifications.tasks.*": {"queue": "notifications"},
        "core.domains.communications.tasks.*": {"queue": "communications"},
        "core.domains.analytics.tasks.*": {"queue": "analytics"},
        "core.domains.events.tasks.*": {"queue": "events"},
        "core.domains.contracts.tasks.*": {"queue": "contracts"},
        "core.domains.questionnaires.tasks.*": {"queue": "events"},
        "core.domains.sales.tasks.*": {"queue": "sales"},
        "core.domains.security.tasks.*": {"queue": "notifications"},
        "core.domains.payments.tasks.*": {"queue": "payments"},
        "core.infrastructure.tasks.*": {"queue": "notifications"},
        "sales.*": {"queue": "sales"},
    },
    # Worker configuration
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    # Task retry configuration
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
    # Security
    task_reject_on_worker_lost=True,
    task_ignore_result=False,
    # Beat schedule for periodic tasks
    beat_schedule={
        "cleanup-old-notifications": {
            "task": "core.domains.notifications.tasks.cleanup_old_notifications",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "notifications"},
        },
        "auto-expire-notifications": {
            "task": "core.domains.notifications.tasks.auto_expire_notifications",
            "schedule": 60 * 60,  # Hourly
            "options": {"queue": "notifications"},
        },
        "notification-delivery-stats": {
            "task": "core.domains.notifications.tasks.collect_delivery_metrics",
            "schedule": 15 * 60,  # Every 15 minutes (was 5 min - saves 192 task executions/day)
            "options": {"queue": "analytics"},
        },
        # Date reservation cleanup (race condition prevention)
        "cleanup-expired-reservations": {
            "task": "core.domains.events.tasks.cleanup_expired_reservations",
            "schedule": 300,  # Every 5 minutes
            "options": {"queue": "events"},
        },
        # Event deadline tasks
        "daily-deadline-sweep": {
            "task": "core.domains.events.tasks.daily_deadline_sweep",
            "schedule": 60 * 60,  # Hourly (catches missed deadlines)
            "options": {"queue": "events"},
        },
        "schedule-deadline-reminders": {
            "task": "core.domains.events.tasks.schedule_deadline_reminders",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "events"},
        },
        "schedule-event-date-reminders": {
            "task": "core.domains.events.tasks.schedule_event_date_reminders",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "events"},
        },
        # Workflow BEFORE_EVENT trigger sweep
        "process-before-event-triggers": {
            "task": "core.domains.workflows.tasks.process_before_event_triggers",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "events"},
        },
        # Workflow TIME_ELAPSED progression sweep
        "process-time-elapsed-triggers": {
            "task": "core.domains.workflows.tasks.process_time_elapsed_triggers",
            "schedule": 60 * 60,  # Hourly
            "options": {"queue": "events"},
        },
        # Workflow AFTER_STAGE trigger sweep (delay after another stage completes)
        "process-after-stage-triggers": {
            "task": "core.domains.workflows.tasks.process_after_stage_triggers",
            "schedule": 60 * 60,  # Hourly
            "options": {"queue": "events"},
        },
        # Workflow webhook retry processing
        "process-workflow-webhook-retries": {
            "task": "core.domains.workflows.tasks.process_webhook_retries",
            "schedule": 300,  # Every 5 minutes
            "options": {"queue": "events"},
        },
        # Automatic event completion (mark past events as COMPLETED)
        "mark-past-events-completed": {
            "task": "core.domains.events.tasks.mark_past_events_completed",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "events"},
        },
        # Contract expiry tasks
        "expire-contracts": {
            "task": "core.domains.contracts.tasks.expire_contracts",
            "schedule": 60 * 60,  # Hourly
            "options": {"queue": "contracts"},
        },
        "schedule-contract-expiry-reminders": {
            "task": "core.domains.contracts.tasks.schedule_contract_expiry_reminders",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "contracts"},
        },
        # VIP points expiration
        "expire-vip-points": {
            "task": "vip.expire_vip_points",
            "schedule": 7 * 24 * 60 * 60,  # Weekly
            "options": {"queue": "default"},
        },
        # Quote expiry tasks
        "expire-quotes": {
            "task": "sales.expire_sent_quotes",
            "schedule": 60 * 60,  # Hourly
            "options": {"queue": "sales"},
        },
        "quote-expiry-reminders": {
            "task": "sales.send_quote_expiry_reminders",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "sales"},
        },
        # Questionnaire reminder tasks
        "schedule-questionnaire-reminders": {
            "task": "core.domains.questionnaires.tasks.schedule_questionnaire_reminders",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "events"},
        },
        # Security breach monitoring tasks
        "check-breach-notification-deadlines": {
            "task": "core.domains.security.tasks.check_notification_deadlines",
            "schedule": 60 * 60,  # Hourly
            "options": {"queue": "notifications"},
        },
        "send-daily-breach-summary": {
            "task": "core.domains.security.tasks.send_daily_breach_summary",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "notifications"},
        },
        # Push notification maintenance tasks
        "check-push-receipts": {
            "task": "core.domains.notifications.tasks.check_push_receipts",
            "schedule": 30 * 60,  # Every 30 minutes (was 15 min - saves 48 task executions/day)
            "options": {"queue": "notifications"},
        },
        "cleanup-inactive-push-tokens": {
            "task": "core.domains.notifications.tasks.cleanup_inactive_push_tokens",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "notifications"},
        },
        # Payment gateway health monitoring
        "check-gateway-health": {
            "task": "core.domains.payments.tasks.check_gateway_health",
            "schedule": 15 * 60,  # Every 15 minutes
            "options": {"queue": "payments"},
        },
        # Webhook retry with exponential backoff (Section 10.4)
        "process-failed-webhooks": {
            "task": "core.domains.payments.tasks.process_failed_webhooks",
            "schedule": 5 * 60,  # Every 5 minutes
            "options": {"queue": "payments"},
        },
        # Orphaned payment detection (Section 11.1)
        "detect-orphaned-payments": {
            "task": "core.domains.payments.tasks.detect_orphaned_payments",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "payments"},
        },
        # Payment reconciliation with Stripe (Section 11.2)
        "reconcile-payments-with-stripe": {
            "task": "core.domains.payments.tasks.reconcile_payments_with_stripe",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "payments"},
        },
        # Payment overdue notices
        "send-overdue-payment-notices": {
            "task": "payments.send_overdue_payment_notices",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "payments"},
        },
        # Analytics tasks
        "update-booking-flow-analytics": {
            "task": "core.domains.analytics.tasks.update_all_booking_flow_analytics",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "analytics"},
        },
        "cache-daily-kpis": {
            "task": "core.domains.analytics.tasks.cache_daily_kpis",
            "schedule": 60 * 60,  # Hourly
            "options": {"queue": "analytics"},
        },
        "snapshot-daily-kpis": {
            "task": "core.domains.analytics.tasks.snapshot_daily_kpis",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "analytics"},
        },
        # Data retention cleanup tasks
        "cleanup-security-logs": {
            "task": "core.domains.security.tasks.cleanup_security_logs",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "notifications"},
        },
        "cleanup-expired-account-data": {
            "task": "core.domains.security.tasks.cleanup_expired_account_data",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "notifications"},
        },
        "monitor-data-retention-compliance": {
            "task": "core.domains.security.tasks.monitor_data_retention_compliance",
            "schedule": 7 * 24 * 60 * 60,  # Weekly
            "options": {"queue": "notifications"},
        },
        # JWT blacklist cleanup — purge expired blacklisted tokens
        "flush-expired-jwt-tokens": {
            "task": "core.domains.users.tasks.flush_expired_jwt_tokens",
            "schedule": 24 * 60 * 60,  # Daily
            "options": {"queue": "notifications"},
        },
    },
)


# Set up logging for Celery
@app.task(bind=True)
def debug_task(self):
    logger = logging.getLogger(__name__)
    logger.info(f"Request: {self.request!r}")


# Configure logging for Celery tasks
logger = logging.getLogger(__name__)


# =============================================================================
# Dead Letter Queue Integration
# =============================================================================
# When a task fails permanently (exceeds max retries), send it to the DLQ
# for manual review and potential replay.

import traceback as tb

from celery.signals import task_failure


@task_failure.connect
def handle_task_failure(
    sender=None, task_id=None, exception=None, args=None, kwargs=None, traceback=None, einfo=None, **kw
):
    """
    Handle permanently failed tasks by recording them in the Dead Letter Queue.

    This signal is called when a task fails without being retried
    (i.e., it has exceeded its max retry limit or raised an exception
    that should not be retried).
    """
    try:
        # Import here to avoid circular imports
        from core.infrastructure.models import FailedTask

        # Get task info
        task_name = sender.name if sender else "unknown"
        queue = getattr(sender, "queue", "celery") or "celery"

        # Get retry information
        # The 'retries' attr is the number of times it has been retried
        request = getattr(sender, "request", None)
        retry_count = getattr(request, "retries", 0) if request else 0
        max_retries = getattr(sender, "max_retries", 3) or 3

        # Format traceback
        traceback_str = ""
        if traceback:
            traceback_str = "".join(tb.format_tb(traceback))
        elif einfo:
            traceback_str = str(einfo)

        # Record to DLQ
        FailedTask.record_failure(
            task_id=str(task_id),
            task_name=task_name,
            args=list(args) if args else [],
            kwargs=dict(kwargs) if kwargs else {},
            exception=exception,
            traceback_str=traceback_str,
            retry_count=retry_count,
            max_retries=max_retries,
            queue=queue,
        )

    except Exception as e:
        # Don't let DLQ recording failures break task processing
        logger.error(f"Failed to record task to DLQ: {e}")


# Add beat task for DLQ monitoring
app.conf.beat_schedule["monitor-dead-letter-queue"] = {
    "task": "core.infrastructure.tasks.monitor_dlq",
    "schedule": 60 * 60,  # Hourly
    "options": {"queue": "notifications"},
}

app.conf.beat_schedule["cleanup-old-failed-tasks"] = {
    "task": "core.infrastructure.tasks.cleanup_old_failed_tasks",
    "schedule": 24 * 60 * 60,  # Daily
    "options": {"queue": "notifications"},
}

app.conf.beat_schedule["snapshot-system-health"] = {
    "task": "core.infrastructure.tasks.snapshot_system_health",
    "schedule": 24 * 60 * 60,  # Daily
    "options": {"queue": "notifications"},
}


if __name__ == "__main__":
    app.start()
