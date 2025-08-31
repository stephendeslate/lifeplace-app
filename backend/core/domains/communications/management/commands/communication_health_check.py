# backend/core/domains/communications/management/commands/communication_health_check.py

from django.core.management.base import BaseCommand
from core.domains.communications.monitoring import health_checker, alert_manager
from core.domains.communications.tasks import (
    process_retry_queue_async, 
    health_check_providers_async,
    cleanup_old_records_async
)


class Command(BaseCommand):
    help = 'Run communication system health checks and maintenance tasks'

    def add_arguments(self, parser):
        parser.add_argument(
            '--full-check',
            action='store_true',
            help='Perform full health check instead of using cache',
        )
        parser.add_argument(
            '--process-queues',
            action='store_true',
            help='Process retry queues',
        )
        parser.add_argument(
            '--cleanup-records',
            action='store_true',
            help='Cleanup old communication records',
        )
        parser.add_argument(
            '--cleanup-days',
            type=int,
            default=90,
            help='Number of days to keep records (default: 90)',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Communication System Health Check')
        )
        self.stdout.write('=' * 60)

        # Health check
        self.stdout.write('\n1. Performing health check...')
        
        if options['full_check']:
            health_report = health_checker.check_all_systems()
        else:
            health_report = health_checker.get_cached_health()
            if not health_report:
                self.stdout.write('No cached health data, performing full check...')
                health_report = health_checker.check_all_systems()

        # Display health status
        overall_status = health_report.get('overall_status', 'unknown')
        if overall_status == 'healthy':
            self.stdout.write(self.style.SUCCESS(f'✓ Overall Status: {overall_status}'))
        else:
            self.stdout.write(self.style.ERROR(f'✗ Overall Status: {overall_status}'))
            
            unhealthy_systems = health_report.get('unhealthy_systems', [])
            if unhealthy_systems:
                self.stdout.write(f'Unhealthy systems: {", ".join(unhealthy_systems)}')

        # Check individual systems
        checks = health_report.get('checks', {})
        for system_name, check_result in checks.items():
            healthy = check_result.get('healthy', False)
            status_icon = '✓' if healthy else '✗'
            status_style = self.style.SUCCESS if healthy else self.style.ERROR
            
            self.stdout.write(status_style(f'  {status_icon} {system_name.title()}'))
            
            if not healthy and 'error' in check_result:
                self.stdout.write(f'    Error: {check_result["error"]}')
            
            warnings = check_result.get('warnings', [])
            if warnings:
                for warning in warnings:
                    self.stdout.write(self.style.WARNING(f'    Warning: {warning}'))

        # Generate and display alerts
        self.stdout.write('\n2. Checking for alerts...')
        alerts = alert_manager.check_and_alert(health_report)
        
        if alerts:
            self.stdout.write(self.style.WARNING(f'Generated {len(alerts)} alerts:'))
            for alert in alerts:
                severity_style = self.style.ERROR if alert['severity'] == 'critical' else self.style.WARNING
                self.stdout.write(severity_style(f'  • {alert["title"]}: {alert["message"]}'))
        else:
            self.stdout.write(self.style.SUCCESS('  No alerts generated'))

        # Process retry queues if requested
        if options['process_queues']:
            self.stdout.write('\n3. Processing retry queues...')
            try:
                # Try to run async task
                task = process_retry_queue_async.delay()
                self.stdout.write(f'  Queued retry processing task: {task.id}')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Could not queue async task: {e}'))
                
                # Fallback to synchronous processing
                from core.domains.communications.services import CommunicationService
                service = CommunicationService()
                results = service.process_retry_queue()
                
                self.stdout.write(f'  Processed: {results["processed"]} items')
                self.stdout.write(f'  Succeeded: {results["succeeded"]} items')
                self.stdout.write(f'  Failed: {results["failed"]} items')
                self.stdout.write(f'  Requeued: {results["requeued"]} items')

        # Cleanup old records if requested
        if options['cleanup_records']:
            self.stdout.write('\n4. Cleaning up old records...')
            cleanup_days = options['cleanup_days']
            
            try:
                task = cleanup_old_records_async.delay(days=cleanup_days)
                self.stdout.write(f'  Queued cleanup task: {task.id} (keeping records from last {cleanup_days} days)')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Could not queue async task: {e}'))
                
                # Fallback to synchronous cleanup
                from core.domains.communications.models import CommunicationRecord
                from datetime import timedelta
                from django.utils import timezone
                
                cutoff_date = timezone.now() - timedelta(days=cleanup_days)
                deleted_count, _ = CommunicationRecord.objects.filter(
                    created_at__lt=cutoff_date,
                    delivery_status__in=['DELIVERED', 'SENT'],
                    is_opened=True
                ).delete()
                
                self.stdout.write(f'  Cleaned up {deleted_count} old records')

        # Display summary
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('Health check completed!'))
        
        # Show current metrics summary
        from core.domains.communications.monitoring import communication_metrics
        try:
            recent_metrics = communication_metrics.get_hourly_metrics(hours=1)
            summary = recent_metrics.get('summary', {})
            
            if summary.get('total_sent', 0) > 0:
                self.stdout.write('\nRecent activity (last hour):')
                self.stdout.write(f'  Total sent: {summary["total_sent"]}')
                self.stdout.write(f'  Success: {summary["total_success"]}')
                self.stdout.write(f'  Failed: {summary["total_failure"]}')
                if 'success_rate' in summary:
                    self.stdout.write(f'  Success rate: {summary["success_rate"]:.1f}%')
            
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Could not retrieve metrics: {e}'))

        # Exit with error code if system is unhealthy
        if overall_status != 'healthy':
            exit(1)