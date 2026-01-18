"""
Infrastructure models for system-level functionality

Includes:
- Dead Letter Queue for failed Celery tasks
- Circuit breaker state tracking
"""
import json
import logging
import uuid

from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)


class FailedTask(models.Model):
    """
    Dead Letter Queue model for permanently failed Celery tasks.

    When a Celery task exceeds its maximum retry attempts, it should be
    stored here for manual review, replay, or audit purposes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Task identification
    task_id = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Original Celery task ID"
    )
    task_name = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Fully qualified task name (e.g., 'core.domains.payments.tasks.process_payment')"
    )
    queue = models.CharField(
        max_length=100,
        default='celery',
        db_index=True,
        help_text="Queue the task was originally sent to"
    )

    # Task parameters (stored as JSON)
    args = models.JSONField(
        default=list,
        blank=True,
        help_text="Positional arguments passed to the task"
    )
    kwargs = models.JSONField(
        default=dict,
        blank=True,
        help_text="Keyword arguments passed to the task"
    )

    # Error information
    exception_type = models.CharField(
        max_length=255,
        blank=True,
        help_text="Type of exception that caused the failure"
    )
    exception_message = models.TextField(
        blank=True,
        help_text="Exception message"
    )
    traceback = models.TextField(
        blank=True,
        help_text="Full traceback of the exception"
    )

    # Retry information
    retry_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times the task was retried before failing permanently"
    )
    max_retries = models.PositiveIntegerField(
        default=3,
        help_text="Maximum retry limit configured for the task"
    )

    # Status tracking
    STATUS_CHOICES = [
        ('PENDING_REVIEW', 'Pending Review'),
        ('REVIEWED', 'Reviewed'),
        ('REPLAYING', 'Replaying'),
        ('REPLAYED', 'Replayed Successfully'),
        ('REPLAY_FAILED', 'Replay Failed'),
        ('IGNORED', 'Ignored'),
        ('RESOLVED_MANUALLY', 'Resolved Manually'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING_REVIEW',
        db_index=True,
    )

    # Admin notes for tracking resolution
    admin_notes = models.TextField(
        blank=True,
        help_text="Notes from admin about resolution or investigation"
    )

    # Replay tracking
    replay_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times the task was replayed from DLQ"
    )
    last_replay_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the task was last replayed"
    )
    replayed_by = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replayed_tasks',
        help_text="User who initiated the replay"
    )

    # Timestamps
    failed_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        help_text="When the task permanently failed"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Failed Task'
        verbose_name_plural = 'Failed Tasks'
        ordering = ['-failed_at']
        indexes = [
            models.Index(fields=['task_name', '-failed_at']),
            models.Index(fields=['status', '-failed_at']),
            models.Index(fields=['queue', '-failed_at']),
        ]

    def __str__(self):
        return f"{self.task_name} ({self.task_id[:8]}...) - {self.status}"

    def replay(self, user=None):
        """
        Replay the failed task.

        Args:
            user: Optional user who initiated the replay

        Returns:
            str: New task ID if successful, None if failed
        """
        from celery import current_app

        try:
            self.status = 'REPLAYING'
            self.save(update_fields=['status', 'updated_at'])

            # Send the task to Celery
            result = current_app.send_task(
                self.task_name,
                args=self.args,
                kwargs=self.kwargs,
                queue=self.queue,
            )

            # Update replay tracking
            self.status = 'REPLAYED'
            self.replay_count += 1
            self.last_replay_at = timezone.now()
            self.replayed_by = user
            self.save(update_fields=[
                'status', 'replay_count', 'last_replay_at',
                'replayed_by', 'updated_at'
            ])

            logger.info(
                f"Successfully replayed task {self.task_id} as {result.id}"
            )
            return str(result.id)

        except Exception as e:
            self.status = 'REPLAY_FAILED'
            self.admin_notes += f"\n[{timezone.now().isoformat()}] Replay failed: {str(e)}"
            self.save(update_fields=['status', 'admin_notes', 'updated_at'])

            logger.error(
                f"Failed to replay task {self.task_id}: {str(e)}"
            )
            return None

    def mark_as_ignored(self, reason='', user=None):
        """Mark the task as ignored (not worth replaying)"""
        self.status = 'IGNORED'
        self.admin_notes += f"\n[{timezone.now().isoformat()}] Ignored"
        if reason:
            self.admin_notes += f": {reason}"
        if user:
            self.admin_notes += f" by {user.email}"
        self.save(update_fields=['status', 'admin_notes', 'updated_at'])

    def mark_as_resolved(self, resolution='', user=None):
        """Mark the task as manually resolved"""
        self.status = 'RESOLVED_MANUALLY'
        self.admin_notes += f"\n[{timezone.now().isoformat()}] Resolved manually"
        if resolution:
            self.admin_notes += f": {resolution}"
        if user:
            self.admin_notes += f" by {user.email}"
        self.save(update_fields=['status', 'admin_notes', 'updated_at'])

    @classmethod
    def record_failure(cls, task_id, task_name, args=None, kwargs=None,
                       exception=None, traceback_str='', retry_count=0,
                       max_retries=3, queue='celery'):
        """
        Record a permanently failed task to the DLQ.

        Args:
            task_id: Celery task ID
            task_name: Fully qualified task name
            args: Task positional arguments
            kwargs: Task keyword arguments
            exception: The exception that caused the failure
            traceback_str: Traceback as string
            retry_count: Number of retries attempted
            max_retries: Maximum retries configured
            queue: Queue name

        Returns:
            FailedTask instance
        """
        exception_type = ''
        exception_message = ''

        if exception:
            exception_type = type(exception).__name__
            exception_message = str(exception)

        failed_task = cls.objects.create(
            task_id=task_id,
            task_name=task_name,
            queue=queue,
            args=args or [],
            kwargs=kwargs or {},
            exception_type=exception_type,
            exception_message=exception_message,
            traceback=traceback_str,
            retry_count=retry_count,
            max_retries=max_retries,
        )

        logger.warning(
            f"Task {task_id} ({task_name}) added to DLQ after {retry_count} retries. "
            f"Exception: {exception_type}: {exception_message}"
        )

        return failed_task


class CircuitBreakerState(models.Model):
    """
    Persistent circuit breaker state for third-party services.

    Used to track and persist circuit breaker states across worker restarts.
    """
    service_name = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Name of the service (e.g., 'stripe', 'brevo', 'expo')"
    )

    STATE_CHOICES = [
        ('CLOSED', 'Closed (Normal)'),
        ('OPEN', 'Open (Failing Fast)'),
        ('HALF_OPEN', 'Half-Open (Testing)'),
    ]
    state = models.CharField(
        max_length=10,
        choices=STATE_CHOICES,
        default='CLOSED',
    )

    # Failure tracking
    failure_count = models.PositiveIntegerField(
        default=0,
        help_text="Current consecutive failure count"
    )
    failure_threshold = models.PositiveIntegerField(
        default=5,
        help_text="Number of failures before opening circuit"
    )
    success_threshold = models.PositiveIntegerField(
        default=3,
        help_text="Number of successes in half-open state to close circuit"
    )

    # Recovery tracking
    last_failure_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the last failure occurred"
    )
    last_success_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the last success occurred"
    )
    opened_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the circuit was last opened"
    )
    recovery_timeout_seconds = models.PositiveIntegerField(
        default=60,
        help_text="Seconds to wait before transitioning from OPEN to HALF_OPEN"
    )

    # Half-open tracking
    half_open_successes = models.PositiveIntegerField(
        default=0,
        help_text="Successes since entering half-open state"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Circuit Breaker State'
        verbose_name_plural = 'Circuit Breaker States'

    def __str__(self):
        return f"{self.service_name}: {self.state}"

    def record_success(self):
        """Record a successful call"""
        self.last_success_at = timezone.now()

        if self.state == 'HALF_OPEN':
            self.half_open_successes += 1
            if self.half_open_successes >= self.success_threshold:
                self.state = 'CLOSED'
                self.failure_count = 0
                self.half_open_successes = 0
                logger.info(f"Circuit breaker {self.service_name} CLOSED after recovery")
        elif self.state == 'CLOSED':
            # Reset failure count on success
            self.failure_count = 0

        self.save()

    def record_failure(self):
        """Record a failed call"""
        self.failure_count += 1
        self.last_failure_at = timezone.now()

        if self.state == 'CLOSED':
            if self.failure_count >= self.failure_threshold:
                self.state = 'OPEN'
                self.opened_at = timezone.now()
                logger.warning(
                    f"Circuit breaker {self.service_name} OPENED after "
                    f"{self.failure_count} failures"
                )
        elif self.state == 'HALF_OPEN':
            # Any failure in half-open state reopens the circuit
            self.state = 'OPEN'
            self.opened_at = timezone.now()
            self.half_open_successes = 0
            logger.warning(
                f"Circuit breaker {self.service_name} re-OPENED from HALF_OPEN"
            )

        self.save()

    def can_execute(self):
        """
        Check if a call can be executed.

        Returns:
            bool: True if call is allowed, False if circuit is open
        """
        if self.state == 'CLOSED':
            return True

        if self.state == 'OPEN':
            # Check if recovery timeout has passed
            if self.opened_at:
                elapsed = (timezone.now() - self.opened_at).total_seconds()
                if elapsed >= self.recovery_timeout_seconds:
                    self.state = 'HALF_OPEN'
                    self.half_open_successes = 0
                    self.save()
                    logger.info(
                        f"Circuit breaker {self.service_name} transitioned to HALF_OPEN"
                    )
                    return True
            return False

        # HALF_OPEN - allow limited calls
        return True

    @classmethod
    def get_or_create_for_service(cls, service_name, **defaults):
        """Get or create circuit breaker state for a service"""
        obj, created = cls.objects.get_or_create(
            service_name=service_name,
            defaults=defaults
        )
        return obj
