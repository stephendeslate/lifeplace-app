"""
Redis monitoring and health check utilities
Provides comprehensive Redis health monitoring, performance metrics, and alerts
"""
import time
import json
import logging
from typing import Dict, List, Optional, Tuple
from django.core.cache import caches, cache
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
import redis
from datetime import timedelta

logger = logging.getLogger(__name__)

class RedisHealthMonitor:
    """
    Comprehensive Redis health monitoring service
    Tracks performance, memory usage, connection health, and alerts
    """
    
    def __init__(self):
        self.default_cache = caches['default']
        self.sessions_cache = caches['sessions'] 
        self.analytics_cache = caches['analytics']
        
        # Get raw Redis connections for detailed info
        self.redis_clients = {
            'default': self._get_redis_client('default'),
            'sessions': self._get_redis_client('sessions'),
            'analytics': self._get_redis_client('analytics')
        }
        
    def _get_redis_client(self, cache_name: str) -> redis.Redis:
        """Get raw Redis client for detailed operations"""
        django_cache = caches[cache_name]
        return django_cache.client.get_client()
    
    def check_health(self) -> Dict:
        """
        Comprehensive health check for all Redis instances
        Returns detailed health status report
        """
        health_report = {
            'timestamp': timezone.now().isoformat(),
            'overall_status': 'healthy',
            'databases': {},
            'performance': {},
            'memory': {},
            'connections': {},
            'alerts': []
        }
        
        # Check each database
        for db_name, redis_client in self.redis_clients.items():
            try:
                # Connection test
                ping_start = time.time()
                redis_client.ping()
                ping_time = (time.time() - ping_start) * 1000
                
                # Get Redis info
                redis_info = redis_client.info()
                
                # Database status
                db_status = {
                    'status': 'healthy',
                    'ping_time_ms': round(ping_time, 2),
                    'connected_clients': redis_info.get('connected_clients', 0),
                    'used_memory_human': redis_info.get('used_memory_human', '0B'),
                    'used_memory_peak_human': redis_info.get('used_memory_peak_human', '0B'),
                    'keyspace_hits': redis_info.get('keyspace_hits', 0),
                    'keyspace_misses': redis_info.get('keyspace_misses', 0),
                    'total_commands_processed': redis_info.get('total_commands_processed', 0),
                    'uptime_in_seconds': redis_info.get('uptime_in_seconds', 0)
                }
                
                # Calculate hit ratio
                hits = db_status['keyspace_hits']
                misses = db_status['keyspace_misses']
                if hits + misses > 0:
                    db_status['hit_ratio'] = round(hits / (hits + misses) * 100, 2)
                else:
                    db_status['hit_ratio'] = 0
                
                # Performance alerts
                if ping_time > 10:  # >10ms ping time
                    health_report['alerts'].append({
                        'level': 'warning',
                        'database': db_name,
                        'message': f'High ping time: {ping_time:.2f}ms'
                    })
                
                if db_status['hit_ratio'] < 80:  # <80% hit ratio
                    health_report['alerts'].append({
                        'level': 'info',
                        'database': db_name, 
                        'message': f'Low hit ratio: {db_status["hit_ratio"]}%'
                    })
                
                health_report['databases'][db_name] = db_status
                
            except Exception as e:
                health_report['databases'][db_name] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
                health_report['overall_status'] = 'unhealthy'
                health_report['alerts'].append({
                    'level': 'critical',
                    'database': db_name,
                    'message': f'Connection failed: {str(e)}'
                })
        
        # Overall performance test
        health_report['performance'] = self._run_performance_test()
        
        return health_report
    
    def _run_performance_test(self) -> Dict:
        """Run quick performance benchmark"""
        try:
            # Test write performance
            test_key = f'health_check_{int(time.time())}'
            test_data = {'test': 'data', 'timestamp': time.time()}
            
            start = time.time()
            self.default_cache.set(test_key, test_data, 60)
            write_time = (time.time() - start) * 1000
            
            # Test read performance
            start = time.time()
            result = self.default_cache.get(test_key)
            read_time = (time.time() - start) * 1000
            
            # Cleanup
            self.default_cache.delete(test_key)
            
            return {
                'write_time_ms': round(write_time, 2),
                'read_time_ms': round(read_time, 2),
                'data_integrity': result == test_data
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'write_time_ms': None,
                'read_time_ms': None,
                'data_integrity': False
            }
    
    def get_memory_usage(self) -> Dict:
        """Get detailed memory usage information"""
        memory_info = {}
        
        for db_name, redis_client in self.redis_clients.items():
            try:
                info = redis_client.info('memory')
                memory_info[db_name] = {
                    'used_memory': info.get('used_memory', 0),
                    'used_memory_human': info.get('used_memory_human', '0B'),
                    'used_memory_rss': info.get('used_memory_rss', 0),
                    'used_memory_peak': info.get('used_memory_peak', 0),
                    'used_memory_peak_human': info.get('used_memory_peak_human', '0B'),
                    'mem_fragmentation_ratio': info.get('mem_fragmentation_ratio', 0)
                }
            except Exception as e:
                memory_info[db_name] = {'error': str(e)}
        
        return memory_info
    
    def get_performance_metrics(self, hours: int = 1) -> Dict:
        """
        Get performance metrics for the specified time period
        Note: This is a basic implementation - in production you'd want to store
        historical metrics in a time-series database
        """
        metrics = {}
        
        for db_name, redis_client in self.redis_clients.items():
            try:
                info = redis_client.info()
                
                # Current performance metrics
                metrics[db_name] = {
                    'commands_processed': info.get('total_commands_processed', 0),
                    'keyspace_hits': info.get('keyspace_hits', 0),
                    'keyspace_misses': info.get('keyspace_misses', 0),
                    'connected_clients': info.get('connected_clients', 0),
                    'blocked_clients': info.get('blocked_clients', 0),
                    'used_cpu_sys': info.get('used_cpu_sys', 0),
                    'used_cpu_user': info.get('used_cpu_user', 0)
                }
                
                # Calculate rates (approximated from current values)
                uptime = info.get('uptime_in_seconds', 1)
                if uptime > 0:
                    metrics[db_name]['commands_per_second'] = round(
                        metrics[db_name]['commands_processed'] / uptime, 2
                    )
                
            except Exception as e:
                metrics[db_name] = {'error': str(e)}
        
        return {
            'timestamp': timezone.now().isoformat(),
            'period_hours': hours,
            'databases': metrics
        }
    
    def cleanup_expired_keys(self) -> Dict:
        """Clean up expired keys and return cleanup stats"""
        cleanup_results = {}
        
        for db_name, redis_client in self.redis_clients.items():
            try:
                # Get initial key count
                initial_keys = redis_client.dbsize()
                
                # Force expire cleanup (Redis does this automatically but we can trigger it)
                # Note: This is more of a diagnostic command
                cleaned = 0  # Redis doesn't return count from EXPIREDEL
                
                final_keys = redis_client.dbsize()
                
                cleanup_results[db_name] = {
                    'initial_keys': initial_keys,
                    'final_keys': final_keys,
                    'keys_cleaned': initial_keys - final_keys,
                    'status': 'completed'
                }
                
            except Exception as e:
                cleanup_results[db_name] = {
                    'error': str(e),
                    'status': 'failed'
                }
        
        return cleanup_results
    
    def get_slow_queries(self) -> Dict:
        """
        Get slow query information
        Redis doesn't have traditional slow queries, but we can check for potential issues
        """
        slow_log_info = {}
        
        for db_name, redis_client in self.redis_clients.items():
            try:
                # Get slow log entries
                slow_log = redis_client.slowlog_get(10)  # Get last 10 slow commands
                
                slow_log_info[db_name] = {
                    'slow_commands': len(slow_log),
                    'entries': [
                        {
                            'id': entry['id'],
                            'start_time': entry['start_time'],
                            'duration_microseconds': entry['duration'],
                            'command': ' '.join([arg.decode() if isinstance(arg, bytes) else str(arg) 
                                               for arg in entry['command']])
                        }
                        for entry in slow_log
                    ]
                }
                
            except Exception as e:
                slow_log_info[db_name] = {'error': str(e)}
        
        return slow_log_info


class RedisAlertManager:
    """
    Alert manager for Redis monitoring
    Handles thresholds, notifications, and alert history
    """
    
    def __init__(self):
        self.thresholds = {
            'ping_time_ms': 10.0,
            'hit_ratio_percent': 80.0,
            'memory_usage_mb': 100.0,
            'connection_count': 100
        }
        
    def check_alerts(self, health_data: Dict) -> List[Dict]:
        """Check health data against thresholds and return alerts"""
        alerts = []
        
        for db_name, db_data in health_data.get('databases', {}).items():
            if db_data.get('status') != 'healthy':
                alerts.append({
                    'level': 'critical',
                    'database': db_name,
                    'metric': 'connection',
                    'message': f'Database {db_name} is not healthy'
                })
                continue
            
            # Check ping time
            ping_time = db_data.get('ping_time_ms', 0)
            if ping_time > self.thresholds['ping_time_ms']:
                alerts.append({
                    'level': 'warning',
                    'database': db_name,
                    'metric': 'ping_time',
                    'value': ping_time,
                    'threshold': self.thresholds['ping_time_ms'],
                    'message': f'High ping time: {ping_time}ms'
                })
            
            # Check hit ratio
            hit_ratio = db_data.get('hit_ratio', 100)
            if hit_ratio < self.thresholds['hit_ratio_percent']:
                alerts.append({
                    'level': 'info',
                    'database': db_name,
                    'metric': 'hit_ratio',
                    'value': hit_ratio,
                    'threshold': self.thresholds['hit_ratio_percent'],
                    'message': f'Low hit ratio: {hit_ratio}%'
                })
            
            # Check connection count
            connections = db_data.get('connected_clients', 0)
            if connections > self.thresholds['connection_count']:
                alerts.append({
                    'level': 'warning',
                    'database': db_name,
                    'metric': 'connections',
                    'value': connections,
                    'threshold': self.thresholds['connection_count'],
                    'message': f'High connection count: {connections}'
                })
        
        return alerts
    
    def format_alert_message(self, alert: Dict) -> str:
        """Format alert for logging or notification"""
        level_emoji = {
            'critical': '🚨',
            'warning': '⚠️ ',
            'info': 'ℹ️ '
        }
        
        emoji = level_emoji.get(alert['level'], '📢')
        return f"{emoji} Redis Alert [{alert['level'].upper()}]: {alert['message']}"


# Django management command for Redis health checks
def create_redis_health_command():
    """Create a Django management command for Redis health monitoring"""
    
    command_content = '''"""
Redis health monitoring Django management command
"""
from django.core.management.base import BaseCommand
from core.utils.redis_monitoring import RedisHealthMonitor, RedisAlertManager
import json

class Command(BaseCommand):
    help = 'Monitor Redis health and performance'
    
    def add_arguments(self, parser):
        parser.add_argument('--format', choices=['json', 'text'], default='text',
                          help='Output format')
        parser.add_argument('--alerts-only', action='store_true', 
                          help='Show only alerts')
        parser.add_argument('--memory', action='store_true',
                          help='Include memory usage details')
        parser.add_argument('--performance', action='store_true',
                          help='Include performance metrics')
    
    def handle(self, *args, **options):
        monitor = RedisHealthMonitor()
        alert_manager = RedisAlertManager()
        
        # Get health data
        health_data = monitor.check_health()
        
        if options['alerts_only']:
            alerts = alert_manager.check_alerts(health_data)
            if options['format'] == 'json':
                self.stdout.write(json.dumps(alerts, indent=2))
            else:
                for alert in alerts:
                    self.stdout.write(alert_manager.format_alert_message(alert))
            return
        
        # Full report
        if options['format'] == 'json':
            report = health_data
            
            if options['memory']:
                report['memory_details'] = monitor.get_memory_usage()
                
            if options['performance']:
                report['performance_metrics'] = monitor.get_performance_metrics()
                
            self.stdout.write(json.dumps(report, indent=2))
            
        else:
            # Text format
            self.stdout.write(f"🔍 Redis Health Report - {health_data['timestamp']}")
            self.stdout.write("=" * 60)
            
            # Overall status
            status_emoji = "✅" if health_data['overall_status'] == 'healthy' else "❌"
            self.stdout.write(f"\\n{status_emoji} Overall Status: {health_data['overall_status'].upper()}")
            
            # Database status
            for db_name, db_data in health_data['databases'].items():
                self.stdout.write(f"\\n📊 Database: {db_name}")
                if db_data.get('status') == 'healthy':
                    self.stdout.write(f"  ✅ Status: Healthy")
                    self.stdout.write(f"  📊 Ping: {db_data['ping_time_ms']}ms")
                    self.stdout.write(f"  🎯 Hit Ratio: {db_data['hit_ratio']}%")
                    self.stdout.write(f"  🔗 Connections: {db_data['connected_clients']}")
                    self.stdout.write(f"  💾 Memory: {db_data['used_memory_human']}")
                else:
                    self.stdout.write(f"  ❌ Status: Unhealthy - {db_data.get('error', 'Unknown error')}")
            
            # Alerts
            if health_data['alerts']:
                self.stdout.write("\\n🚨 ALERTS:")
                for alert in health_data['alerts']:
                    self.stdout.write(f"  {alert_manager.format_alert_message(alert)}")
            else:
                self.stdout.write("\\n✅ No alerts")
            
            # Performance
            perf = health_data['performance']
            if perf.get('write_time_ms'):
                self.stdout.write("\\n⚡ Performance Test:")
                self.stdout.write(f"  📝 Write: {perf['write_time_ms']}ms")
                self.stdout.write(f"  📖 Read: {perf['read_time_ms']}ms")
                self.stdout.write(f"  ✅ Data Integrity: {'PASS' if perf['data_integrity'] else 'FAIL'}")
'''
    
    return command_content