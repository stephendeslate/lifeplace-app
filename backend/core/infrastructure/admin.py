"""
Admin interface for infrastructure models

Provides management interface for:
- Dead Letter Queue (Failed Tasks)
- Circuit Breaker States
- System Health Snapshots
- Deployments
"""
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.contrib import messages

from .models import FailedTask, CircuitBreakerState, SystemHealthSnapshot, Deployment


@admin.register(FailedTask)
class FailedTaskAdmin(admin.ModelAdmin):
    """Admin interface for managing failed Celery tasks"""

    list_display = [
        'task_name_short',
        'queue',
        'status_badge',
        'exception_type',
        'retry_count',
        'replay_count',
        'failed_at',
    ]
    list_filter = [
        'status',
        'queue',
        'exception_type',
        ('failed_at', admin.DateFieldListFilter),
    ]
    search_fields = [
        'task_id',
        'task_name',
        'exception_message',
        'admin_notes',
    ]
    readonly_fields = [
        'id',
        'task_id',
        'task_name',
        'queue',
        'args_formatted',
        'kwargs_formatted',
        'exception_type',
        'exception_message',
        'traceback_formatted',
        'retry_count',
        'max_retries',
        'replay_count',
        'last_replay_at',
        'replayed_by',
        'failed_at',
        'created_at',
        'updated_at',
    ]
    fieldsets = (
        ('Task Information', {
            'fields': (
                'id',
                'task_id',
                'task_name',
                'queue',
                'args_formatted',
                'kwargs_formatted',
            )
        }),
        ('Error Details', {
            'fields': (
                'exception_type',
                'exception_message',
                'traceback_formatted',
            ),
            'classes': ('collapse',),
        }),
        ('Retry Information', {
            'fields': (
                'retry_count',
                'max_retries',
                'replay_count',
                'last_replay_at',
                'replayed_by',
            )
        }),
        ('Status & Resolution', {
            'fields': (
                'status',
                'admin_notes',
            )
        }),
        ('Timestamps', {
            'fields': (
                'failed_at',
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',),
        }),
    )
    actions = [
        'replay_selected_tasks',
        'mark_as_ignored',
        'mark_as_reviewed',
    ]
    ordering = ['-failed_at']
    date_hierarchy = 'failed_at'

    def task_name_short(self, obj):
        """Display shortened task name"""
        name = obj.task_name
        if len(name) > 50:
            return f"...{name[-47:]}"
        return name
    task_name_short.short_description = 'Task'

    def status_badge(self, obj):
        """Display status with colored badge"""
        colors = {
            'PENDING_REVIEW': '#ffc107',  # Warning yellow
            'REVIEWED': '#17a2b8',  # Info blue
            'REPLAYING': '#007bff',  # Primary blue
            'REPLAYED': '#28a745',  # Success green
            'REPLAY_FAILED': '#dc3545',  # Danger red
            'IGNORED': '#6c757d',  # Secondary gray
            'RESOLVED_MANUALLY': '#28a745',  # Success green
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def args_formatted(self, obj):
        """Format args as preformatted JSON"""
        import json
        return format_html(
            '<pre style="max-height: 200px; overflow: auto;">{}</pre>',
            json.dumps(obj.args, indent=2, default=str)
        )
    args_formatted.short_description = 'Arguments'

    def kwargs_formatted(self, obj):
        """Format kwargs as preformatted JSON"""
        import json
        return format_html(
            '<pre style="max-height: 200px; overflow: auto;">{}</pre>',
            json.dumps(obj.kwargs, indent=2, default=str)
        )
    kwargs_formatted.short_description = 'Keyword Arguments'

    def traceback_formatted(self, obj):
        """Format traceback with syntax highlighting"""
        if not obj.traceback:
            return '-'
        return format_html(
            '<pre style="max-height: 400px; overflow: auto; background: #f8f9fa; '
            'padding: 10px; border-radius: 4px; font-size: 12px;">{}</pre>',
            obj.traceback
        )
    traceback_formatted.short_description = 'Traceback'

    @admin.action(description='Replay selected tasks')
    def replay_selected_tasks(self, request, queryset):
        """Replay selected failed tasks"""
        success_count = 0
        fail_count = 0

        for task in queryset:
            if task.status in ('PENDING_REVIEW', 'REVIEWED', 'REPLAY_FAILED'):
                result = task.replay(user=request.user)
                if result:
                    success_count += 1
                else:
                    fail_count += 1
            else:
                fail_count += 1

        if success_count:
            self.message_user(
                request,
                f"Successfully replayed {success_count} task(s).",
                messages.SUCCESS
            )
        if fail_count:
            self.message_user(
                request,
                f"Failed to replay {fail_count} task(s). Check individual task status.",
                messages.WARNING
            )

    @admin.action(description='Mark as ignored')
    def mark_as_ignored(self, request, queryset):
        """Mark selected tasks as ignored"""
        count = 0
        for task in queryset:
            task.mark_as_ignored(
                reason="Bulk ignored via admin",
                user=request.user
            )
            count += 1

        self.message_user(
            request,
            f"Marked {count} task(s) as ignored.",
            messages.SUCCESS
        )

    @admin.action(description='Mark as reviewed')
    def mark_as_reviewed(self, request, queryset):
        """Mark selected tasks as reviewed"""
        count = queryset.update(status='REVIEWED')
        self.message_user(
            request,
            f"Marked {count} task(s) as reviewed.",
            messages.SUCCESS
        )


@admin.register(CircuitBreakerState)
class CircuitBreakerStateAdmin(admin.ModelAdmin):
    """Admin interface for monitoring circuit breaker states"""

    list_display = [
        'service_name',
        'state_badge',
        'failure_count',
        'failure_threshold',
        'last_failure_at',
        'last_success_at',
    ]
    list_filter = ['state']
    search_fields = ['service_name']
    readonly_fields = [
        'service_name',
        'state',
        'failure_count',
        'success_threshold',
        'half_open_successes',
        'last_failure_at',
        'last_success_at',
        'opened_at',
        'created_at',
        'updated_at',
    ]
    fieldsets = (
        ('Service', {
            'fields': ('service_name', 'state')
        }),
        ('Configuration', {
            'fields': (
                'failure_threshold',
                'success_threshold',
                'recovery_timeout_seconds',
            )
        }),
        ('State', {
            'fields': (
                'failure_count',
                'half_open_successes',
                'last_failure_at',
                'last_success_at',
                'opened_at',
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    actions = ['reset_circuit_breaker']

    def state_badge(self, obj):
        """Display state with colored badge"""
        colors = {
            'CLOSED': '#28a745',  # Green
            'OPEN': '#dc3545',  # Red
            'HALF_OPEN': '#ffc107',  # Yellow
        }
        color = colors.get(obj.state, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: {}; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            'white' if obj.state != 'HALF_OPEN' else 'black',
            obj.get_state_display()
        )
    state_badge.short_description = 'State'

    @admin.action(description='Reset circuit breaker to CLOSED')
    def reset_circuit_breaker(self, request, queryset):
        """Reset selected circuit breakers to closed state"""
        count = queryset.update(
            state='CLOSED',
            failure_count=0,
            half_open_successes=0,
            opened_at=None
        )
        self.message_user(
            request,
            f"Reset {count} circuit breaker(s) to CLOSED state.",
            messages.SUCCESS
        )


@admin.register(SystemHealthSnapshot)
class SystemHealthSnapshotAdmin(admin.ModelAdmin):
    list_display = [
        'date',
        'error_count',
        'celery_success_rate',
        'open_circuit_breakers',
        'broker_healthy',
    ]
    list_filter = [
        'broker_healthy',
        ('date', admin.DateFieldListFilter),
    ]
    readonly_fields = [
        'date', 'error_count', 'pending_review_count',
        'celery_tasks_failed', 'celery_success_rate',
        'cache_hit_ratio', 'cache_memory_used_bytes',
        'total_queue_depth', 'queue_depth_breakdown',
        'open_circuit_breakers', 'circuit_breaker_states',
        'broker_ping_ms', 'broker_healthy',
        'raw_health_data', 'created_at', 'updated_at',
    ]
    ordering = ['-date']
    date_hierarchy = 'date'


@admin.register(Deployment)
class DeploymentAdmin(admin.ModelAdmin):
    list_display = [
        'git_sha_short',
        'service',
        'status_badge',
        'deploy_duration_display',
        'lead_time_display',
        'caused_incident',
        'created_at',
    ]
    list_filter = [
        'service',
        'status',
        'environment',
        'caused_incident',
        ('created_at', admin.DateFieldListFilter),
    ]
    search_fields = ['git_sha', 'commit_message']
    readonly_fields = [
        'id', 'git_sha', 'git_sha_short', 'commit_message', 'commit_timestamp',
        'service', 'environment', 'github_run_id', 'github_run_url',
        'triggered_by', 'deploy_started_at', 'deploy_finished_at',
        'deploy_duration_seconds', 'lead_time_seconds',
        'created_at', 'updated_at',
    ]
    fieldsets = (
        ('Git Information', {
            'fields': ('id', 'git_sha', 'git_sha_short', 'commit_message', 'commit_timestamp'),
        }),
        ('Deployment', {
            'fields': ('service', 'environment', 'status', 'triggered_by'),
        }),
        ('CI/CD', {
            'fields': ('github_run_id', 'github_run_url'),
        }),
        ('Timing', {
            'fields': (
                'deploy_started_at', 'deploy_finished_at',
                'deploy_duration_seconds', 'lead_time_seconds',
            ),
        }),
        ('Incident Tracking', {
            'fields': (
                'caused_incident', 'incident_detected_at', 'incident_resolved_at',
                'incident_notes', 'mttr_seconds',
            ),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    def status_badge(self, obj):
        colors = {
            'SUCCESS': '#28a745',
            'FAILURE': '#dc3545',
            'ROLLBACK': '#ffc107',
        }
        color = colors.get(obj.status, '#6c757d')
        text_color = 'black' if obj.status == 'ROLLBACK' else 'white'
        return format_html(
            '<span style="background-color: {}; color: {}; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color, text_color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def deploy_duration_display(self, obj):
        if obj.deploy_duration_seconds is None:
            return '-'
        minutes = obj.deploy_duration_seconds // 60
        seconds = obj.deploy_duration_seconds % 60
        return f"{minutes}m {seconds}s"
    deploy_duration_display.short_description = 'Duration'

    def lead_time_display(self, obj):
        if obj.lead_time_seconds is None:
            return '-'
        from core.infrastructure.services import DORAMetricsService
        return DORAMetricsService._humanize_seconds(obj.lead_time_seconds)
    lead_time_display.short_description = 'Lead Time'
