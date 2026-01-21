"""
Infrastructure Celery tasks

Tasks for:
- Dead Letter Queue monitoring and cleanup
- Circuit breaker health checks
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=1)
def monitor_dlq(self):
    """
    Monitor Dead Letter Queue and alert if there are pending tasks.

    Runs hourly to check for unreviewed failed tasks and send alerts
    to administrators if the count exceeds thresholds.
    """
    from .models import FailedTask

    try:
        # Count pending review tasks
        pending_count = FailedTask.objects.filter(
            status='PENDING_REVIEW'
        ).count()

        # Count tasks from last 24 hours
        recent_failures = FailedTask.objects.filter(
            failed_at__gte=timezone.now() - timedelta(hours=24)
        ).count()

        # Log metrics
        logger.info(
            f"DLQ Monitor: {pending_count} pending review, "
            f"{recent_failures} failures in last 24h"
        )

        # Alert thresholds
        if pending_count > 100:
            logger.critical(
                f"DLQ ALERT: {pending_count} tasks pending review! "
                "Immediate attention required."
            )
            # TODO: Send notification to admin
        elif pending_count > 50:
            logger.warning(
                f"DLQ WARNING: {pending_count} tasks pending review. "
                "Consider reviewing soon."
            )

        # Check for repeated failures (same task failing multiple times)
        from django.db.models import Count
        repeated_failures = FailedTask.objects.filter(
            status='PENDING_REVIEW',
            failed_at__gte=timezone.now() - timedelta(hours=24)
        ).values('task_name').annotate(
            count=Count('id')
        ).filter(count__gte=5).order_by('-count')

        for failure in repeated_failures:
            logger.warning(
                f"DLQ: Task '{failure['task_name']}' has failed "
                f"{failure['count']} times in the last 24 hours"
            )

        return {
            'pending_count': pending_count,
            'recent_failures': recent_failures,
            'repeated_failures': list(repeated_failures),
        }

    except Exception as e:
        logger.error(f"DLQ monitoring failed: {e}")
        raise


@shared_task(bind=True, max_retries=1)
def cleanup_old_failed_tasks(self):
    """
    Clean up old failed tasks from the DLQ.

    Removes tasks older than the retention period:
    - REPLAYED/RESOLVED_MANUALLY: 30 days
    - IGNORED: 30 days
    - REPLAY_FAILED: 90 days
    - PENDING_REVIEW/REVIEWED: Never auto-delete
    """
    from .models import FailedTask

    try:
        now = timezone.now()
        deleted_counts = {}

        # Delete old resolved tasks (30 days)
        resolved_cutoff = now - timedelta(days=30)
        deleted = FailedTask.objects.filter(
            status__in=['REPLAYED', 'RESOLVED_MANUALLY', 'IGNORED'],
            updated_at__lt=resolved_cutoff
        ).delete()
        deleted_counts['resolved'] = deleted[0]

        # Delete old replay failures (90 days)
        replay_failed_cutoff = now - timedelta(days=90)
        deleted = FailedTask.objects.filter(
            status='REPLAY_FAILED',
            updated_at__lt=replay_failed_cutoff
        ).delete()
        deleted_counts['replay_failed'] = deleted[0]

        total_deleted = sum(deleted_counts.values())
        if total_deleted > 0:
            logger.info(
                f"DLQ Cleanup: Deleted {total_deleted} old tasks "
                f"(resolved: {deleted_counts['resolved']}, "
                f"replay_failed: {deleted_counts['replay_failed']})"
            )

        return deleted_counts

    except Exception as e:
        logger.error(f"DLQ cleanup failed: {e}")
        raise


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def replay_failed_task(self, failed_task_id, user_id=None):
    """
    Replay a specific failed task.

    Args:
        failed_task_id: UUID of the FailedTask to replay
        user_id: Optional ID of user initiating replay
    """
    from .models import FailedTask
    from django.contrib.auth import get_user_model

    User = get_user_model()

    try:
        failed_task = FailedTask.objects.get(id=failed_task_id)

        user = None
        if user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                pass

        result = failed_task.replay(user=user)

        if result:
            logger.info(
                f"Successfully replayed task {failed_task_id} "
                f"as new task {result}"
            )
            return {'success': True, 'new_task_id': result}
        else:
            logger.warning(f"Failed to replay task {failed_task_id}")
            return {'success': False, 'error': 'Replay failed'}

    except FailedTask.DoesNotExist:
        logger.error(f"Failed task {failed_task_id} not found")
        return {'success': False, 'error': 'Task not found'}
    except Exception as e:
        logger.error(f"Error replaying task {failed_task_id}: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=1)
def check_circuit_breaker_health(self):
    """
    Check and report on circuit breaker states.

    Logs warnings for any services with open circuit breakers.
    """
    from .models import CircuitBreakerState

    try:
        open_circuits = CircuitBreakerState.objects.filter(
            state='OPEN'
        )

        half_open_circuits = CircuitBreakerState.objects.filter(
            state='HALF_OPEN'
        )

        if open_circuits.exists():
            for circuit in open_circuits:
                elapsed = None
                if circuit.opened_at:
                    elapsed = (timezone.now() - circuit.opened_at).total_seconds()

                logger.warning(
                    f"Circuit breaker OPEN for '{circuit.service_name}' - "
                    f"failures: {circuit.failure_count}, "
                    f"opened {elapsed:.0f}s ago" if elapsed else "unknown duration"
                )

        if half_open_circuits.exists():
            for circuit in half_open_circuits:
                logger.info(
                    f"Circuit breaker HALF_OPEN for '{circuit.service_name}' - "
                    f"testing recovery ({circuit.half_open_successes}/"
                    f"{circuit.success_threshold} successes)"
                )

        return {
            'open_count': open_circuits.count(),
            'half_open_count': half_open_circuits.count(),
            'open_services': list(open_circuits.values_list('service_name', flat=True)),
            'half_open_services': list(half_open_circuits.values_list('service_name', flat=True)),
        }

    except Exception as e:
        logger.error(f"Circuit breaker health check failed: {e}")
        raise
