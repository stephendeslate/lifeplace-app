"""
Infrastructure Celery tasks

Tasks for:
- Dead Letter Queue monitoring and cleanup
- Circuit breaker health checks
- System health snapshots
"""
import logging
from datetime import timedelta
from decimal import Decimal

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


@shared_task(bind=True, max_retries=3)
def snapshot_system_health(self, date_str=None):
    """
    Capture a daily system health snapshot.
    Defaults to yesterday. Uses update_or_create for idempotency.

    Collects: DLQ metrics, circuit breaker states, cache stats, broker health.
    Each metric collection is wrapped in try/except so partial failures
    don't prevent the snapshot.
    """
    from .models import FailedTask, CircuitBreakerState, SystemHealthSnapshot

    if date_str:
        date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
    else:
        date = (timezone.now() - timedelta(days=1)).date()

    raw_data = {}
    snapshot_data = {}

    # DLQ metrics
    try:
        day_start = timezone.datetime.combine(date, timezone.datetime.min.time())
        day_end = timezone.datetime.combine(date, timezone.datetime.max.time())

        error_count = FailedTask.objects.filter(
            failed_at__gte=day_start,
            failed_at__lte=day_end,
        ).count()
        pending_review_count = FailedTask.objects.filter(
            status='PENDING_REVIEW'
        ).count()

        snapshot_data['error_count'] = error_count
        snapshot_data['pending_review_count'] = pending_review_count
        raw_data['dlq'] = {
            'error_count': error_count,
            'pending_review_count': pending_review_count,
        }
    except Exception as e:
        logger.warning(f"Failed to collect DLQ metrics for {date}: {e}")
        snapshot_data['error_count'] = 0
        snapshot_data['pending_review_count'] = 0

    # Circuit breaker states
    try:
        breakers = CircuitBreakerState.objects.all()
        cb_states = {}
        open_count = 0
        for cb in breakers:
            cb_states[cb.service_name] = cb.state
            if cb.state == 'OPEN':
                open_count += 1

        snapshot_data['open_circuit_breakers'] = open_count
        snapshot_data['circuit_breaker_states'] = cb_states
        raw_data['circuit_breakers'] = cb_states
    except Exception as e:
        logger.warning(f"Failed to collect circuit breaker metrics for {date}: {e}")
        snapshot_data['open_circuit_breakers'] = 0
        snapshot_data['circuit_breaker_states'] = {}

    # Redis/broker health
    try:
        from django.core.cache import cache
        import time

        start_time = time.monotonic()
        cache.set('_health_ping', '1', timeout=10)
        cache.get('_health_ping')
        ping_ms = (time.monotonic() - start_time) * 1000

        snapshot_data['broker_healthy'] = True
        snapshot_data['broker_ping_ms'] = Decimal(str(round(ping_ms, 2)))
        raw_data['broker'] = {'ping_ms': round(ping_ms, 2), 'healthy': True}

        # Cache memory info (if available via Redis)
        try:
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            info = redis_conn.info('memory')
            snapshot_data['cache_memory_used_bytes'] = info.get('used_memory', 0)
            raw_data['cache_memory'] = info.get('used_memory', 0)
        except Exception:
            pass  # Not using django-redis or redis not available

    except Exception as e:
        logger.warning(f"Failed to collect broker metrics for {date}: {e}")
        snapshot_data['broker_healthy'] = False
        snapshot_data['broker_ping_ms'] = None

    # Celery task success rate (estimated from DLQ)
    try:
        # We estimate based on DLQ failures vs a known task count
        # Since we don't have exact task execution counts, we base on failures
        failed_count = snapshot_data.get('error_count', 0)
        # A rough success rate: if 0 failures, 100%; degrade from there
        if failed_count == 0:
            snapshot_data['celery_tasks_failed'] = 0
            snapshot_data['celery_success_rate'] = Decimal('100.00')
        else:
            snapshot_data['celery_tasks_failed'] = failed_count
            # Conservative estimate: assume ~1000 tasks/day baseline
            estimated_total = max(failed_count * 10, 1000)
            success_rate = ((estimated_total - failed_count) / estimated_total) * 100
            snapshot_data['celery_success_rate'] = Decimal(str(round(success_rate, 2)))
        raw_data['celery'] = {
            'failed': failed_count,
            'success_rate': float(snapshot_data['celery_success_rate']),
        }
    except Exception as e:
        logger.warning(f"Failed to calculate Celery success rate for {date}: {e}")
        snapshot_data['celery_tasks_failed'] = 0
        snapshot_data['celery_success_rate'] = Decimal('100.00')

    snapshot_data['raw_health_data'] = raw_data

    try:
        snapshot, created = SystemHealthSnapshot.objects.update_or_create(
            date=date,
            defaults=snapshot_data,
        )
        action = 'Created' if created else 'Updated'
        logger.info(
            f"{action} system health snapshot for {date}: "
            f"{snapshot_data.get('error_count', 0)} errors, "
            f"{snapshot_data.get('open_circuit_breakers', 0)} open breakers"
        )
        return {'date': str(date), 'action': action.lower()}

    except Exception as e:
        logger.error(f"Failed to save system health snapshot for {date}: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=3)
def backfill_system_health_snapshots(self, start_date_str, end_date_str):
    """
    Backfill system health snapshots for a date range.

    Args:
        start_date_str: Start date (YYYY-MM-DD)
        end_date_str: End date (YYYY-MM-DD)
    """
    start = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date()
    end = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date()

    current = start
    results = {'success': [], 'failed': []}

    while current <= end:
        try:
            snapshot_system_health(date_str=current.isoformat())
            results['success'].append(current.isoformat())
        except Exception as e:
            results['failed'].append({'date': current.isoformat(), 'error': str(e)})
            logger.error(f"Failed to backfill health snapshot for {current}: {e}")
        current += timedelta(days=1)

    logger.info(
        f"Health snapshot backfill complete: {len(results['success'])} success, "
        f"{len(results['failed'])} failed"
    )
    return results
