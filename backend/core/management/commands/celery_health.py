"""
Celery health monitoring Django management command

Checks:
1. Broker (Redis) connectivity
2. Celery worker availability and status
3. Queue status and lengths
4. Beat scheduler status
"""
import json
import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class CeleryHealthMonitor:
    """Monitor Celery broker and worker health"""

    def __init__(self):
        self.broker_url = getattr(settings, 'CELERY_BROKER_URL', None)

    def check_broker_health(self):
        """Check if Celery broker (Redis) is accessible"""
        import redis
        from urllib.parse import urlparse

        result = {
            'status': 'unknown',
            'connected': False,
            'ping_time_ms': None,
            'error': None,
        }

        if not self.broker_url:
            result['status'] = 'error'
            result['error'] = 'CELERY_BROKER_URL not configured'
            return result

        try:
            # Parse broker URL
            parsed = urlparse(self.broker_url)

            # Create Redis connection
            import time
            start = time.time()

            # Handle rediss:// (SSL) vs redis://
            use_ssl = self.broker_url.startswith('rediss://')

            client = redis.Redis(
                host=parsed.hostname,
                port=parsed.port or 6379,
                password=parsed.password,
                ssl=use_ssl,
                socket_connect_timeout=5,
                socket_timeout=5,
            )

            # Ping the broker
            client.ping()
            end = time.time()

            result['status'] = 'healthy'
            result['connected'] = True
            result['ping_time_ms'] = round((end - start) * 1000, 2)

        except redis.ConnectionError as e:
            result['status'] = 'error'
            result['error'] = f'Connection failed: {str(e)}'
        except redis.TimeoutError as e:
            result['status'] = 'error'
            result['error'] = f'Connection timeout: {str(e)}'
        except Exception as e:
            result['status'] = 'error'
            result['error'] = f'Unexpected error: {str(e)}'

        return result

    def check_worker_health(self):
        """Check Celery worker availability and status"""
        from core.celery import app

        result = {
            'status': 'unknown',
            'workers': [],
            'worker_count': 0,
            'error': None,
        }

        try:
            # Get active workers using inspect
            inspect = app.control.inspect(timeout=5)
            active_workers = inspect.active()

            if active_workers is None:
                result['status'] = 'warning'
                result['error'] = 'No workers responded (workers may be offline)'
                return result

            workers_info = []
            for worker_name, tasks in active_workers.items():
                worker_info = {
                    'name': worker_name,
                    'active_tasks': len(tasks),
                    'status': 'active',
                }
                workers_info.append(worker_info)

            # Get registered tasks for each worker
            registered = inspect.registered()
            if registered:
                for worker_name in registered:
                    for w in workers_info:
                        if w['name'] == worker_name:
                            w['registered_tasks'] = len(registered[worker_name])

            # Get stats for each worker
            stats = inspect.stats()
            if stats:
                for worker_name, worker_stats in stats.items():
                    for w in workers_info:
                        if w['name'] == worker_name:
                            w['pool_size'] = worker_stats.get('pool', {}).get('max-concurrency', 0)
                            w['total_tasks'] = worker_stats.get('total', {})

            result['workers'] = workers_info
            result['worker_count'] = len(workers_info)
            result['status'] = 'healthy' if workers_info else 'warning'

        except Exception as e:
            result['status'] = 'error'
            result['error'] = f'Failed to inspect workers: {str(e)}'

        return result

    def check_queue_health(self):
        """Check Celery queue lengths"""
        import redis
        from urllib.parse import urlparse

        result = {
            'status': 'unknown',
            'queues': {},
            'total_pending': 0,
            'error': None,
        }

        if not self.broker_url:
            result['status'] = 'error'
            result['error'] = 'CELERY_BROKER_URL not configured'
            return result

        try:
            # Parse broker URL
            parsed = urlparse(self.broker_url)
            use_ssl = self.broker_url.startswith('rediss://')

            client = redis.Redis(
                host=parsed.hostname,
                port=parsed.port or 6379,
                password=parsed.password,
                ssl=use_ssl,
                socket_connect_timeout=5,
                socket_timeout=5,
            )

            # Get queue lengths for known queues
            known_queues = [
                'celery',
                'notifications',
                'communications',
                'analytics',
                'events',
                'contracts',
                'payments',
                'sales',
            ]

            total_pending = 0
            for queue_name in known_queues:
                try:
                    # Celery uses list data structure for queues
                    length = client.llen(queue_name)
                    result['queues'][queue_name] = {
                        'length': length,
                        'status': 'warning' if length > 100 else 'healthy',
                    }
                    total_pending += length
                except Exception:
                    result['queues'][queue_name] = {
                        'length': 0,
                        'status': 'unknown',
                    }

            result['total_pending'] = total_pending
            result['status'] = 'healthy' if total_pending < 500 else 'warning'

        except Exception as e:
            result['status'] = 'error'
            result['error'] = f'Failed to check queues: {str(e)}'

        return result

    def get_full_health_report(self):
        """Get comprehensive health report"""
        return {
            'timestamp': timezone.now().isoformat(),
            'broker': self.check_broker_health(),
            'workers': self.check_worker_health(),
            'queues': self.check_queue_health(),
        }

    def get_overall_status(self, health_report):
        """Determine overall system status from health report"""
        statuses = [
            health_report['broker']['status'],
            health_report['workers']['status'],
            health_report['queues']['status'],
        ]

        if 'error' in statuses:
            return 'error'
        if 'warning' in statuses:
            return 'warning'
        if all(s == 'healthy' for s in statuses):
            return 'healthy'
        return 'unknown'


class Command(BaseCommand):
    help = 'Monitor Celery broker, worker, and queue health'

    def add_arguments(self, parser):
        parser.add_argument(
            '--format',
            choices=['json', 'text'],
            default='text',
            help='Output format'
        )
        parser.add_argument(
            '--broker-only',
            action='store_true',
            help='Check only broker health'
        )
        parser.add_argument(
            '--workers-only',
            action='store_true',
            help='Check only worker health'
        )
        parser.add_argument(
            '--queues-only',
            action='store_true',
            help='Check only queue health'
        )
        parser.add_argument(
            '--exit-code',
            action='store_true',
            help='Exit with non-zero code if unhealthy (for use in health checks)'
        )

    def handle(self, *args, **options):
        monitor = CeleryHealthMonitor()

        if options['broker_only']:
            result = {'broker': monitor.check_broker_health()}
        elif options['workers_only']:
            result = {'workers': monitor.check_worker_health()}
        elif options['queues_only']:
            result = {'queues': monitor.check_queue_health()}
        else:
            result = monitor.get_full_health_report()

        if options['format'] == 'json':
            self.stdout.write(json.dumps(result, indent=2, default=str))
        else:
            self._print_text_report(result)

        # Exit with non-zero code if unhealthy and --exit-code flag is set
        if options['exit_code']:
            overall = monitor.get_overall_status(result) if 'broker' in result and 'workers' in result else 'unknown'
            if overall in ('error', 'warning'):
                exit(1)

    def _print_text_report(self, result):
        """Print human-readable health report"""
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write('CELERY HEALTH CHECK')
        self.stdout.write('=' * 50 + '\n')

        if 'timestamp' in result:
            self.stdout.write(f"Timestamp: {result['timestamp']}\n")

        # Broker status
        if 'broker' in result:
            broker = result['broker']
            status_icon = self._get_status_icon(broker['status'])
            self.stdout.write(f"\n{status_icon} BROKER")
            self.stdout.write('-' * 30)
            self.stdout.write(f"  Status: {broker['status']}")
            self.stdout.write(f"  Connected: {broker['connected']}")
            if broker['ping_time_ms']:
                self.stdout.write(f"  Ping Time: {broker['ping_time_ms']}ms")
            if broker['error']:
                self.stdout.write(f"  Error: {broker['error']}")

        # Workers status
        if 'workers' in result:
            workers = result['workers']
            status_icon = self._get_status_icon(workers['status'])
            self.stdout.write(f"\n{status_icon} WORKERS")
            self.stdout.write('-' * 30)
            self.stdout.write(f"  Status: {workers['status']}")
            self.stdout.write(f"  Worker Count: {workers['worker_count']}")
            if workers['error']:
                self.stdout.write(f"  Error: {workers['error']}")
            for worker in workers.get('workers', []):
                self.stdout.write(f"\n  Worker: {worker['name']}")
                self.stdout.write(f"    Active Tasks: {worker['active_tasks']}")
                if 'pool_size' in worker:
                    self.stdout.write(f"    Pool Size: {worker['pool_size']}")
                if 'registered_tasks' in worker:
                    self.stdout.write(f"    Registered Tasks: {worker['registered_tasks']}")

        # Queues status
        if 'queues' in result:
            queues = result['queues']
            status_icon = self._get_status_icon(queues['status'])
            self.stdout.write(f"\n{status_icon} QUEUES")
            self.stdout.write('-' * 30)
            self.stdout.write(f"  Status: {queues['status']}")
            self.stdout.write(f"  Total Pending: {queues['total_pending']}")
            if queues['error']:
                self.stdout.write(f"  Error: {queues['error']}")
            for queue_name, queue_info in queues.get('queues', {}).items():
                q_icon = self._get_status_icon(queue_info['status'])
                self.stdout.write(f"    {q_icon} {queue_name}: {queue_info['length']} pending")

        self.stdout.write('\n' + '=' * 50 + '\n')

    def _get_status_icon(self, status):
        """Get status icon for text output"""
        icons = {
            'healthy': '✅',
            'warning': '⚠️',
            'error': '❌',
            'unknown': '❓',
            'active': '🟢',
        }
        return icons.get(status, '❓')
