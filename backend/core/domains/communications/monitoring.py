# backend/core/domains/communications/monitoring.py

import logging
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.db.models import Count, Q, Avg
from .models import CommunicationRecord
from .resilience import provider_manager

logger = logging.getLogger(__name__)


class CommunicationMetrics:
    """Comprehensive metrics collection for communication system"""
    
    def __init__(self):
        self.cache_prefix = "communications:metrics"
        self.metrics_retention_hours = 24
    
    def record_communication_sent(self, template_name: str, channel: str, 
                                 provider: str, success: bool, 
                                 response_time_ms: float = None):
        """Record communication sending metrics"""
        timestamp = timezone.now()
        
        # Store in cache with hour-based keys for aggregation
        hour_key = timestamp.strftime("%Y%m%d%H")
        
        metrics_data = {
            'timestamp': timestamp.isoformat(),
            'template_name': template_name,
            'channel': channel,
            'provider': provider,
            'success': success,
            'response_time_ms': response_time_ms
        }
        
        # Increment counters
        cache_key = f"{self.cache_prefix}:sent:{hour_key}"
        current_metrics = cache.get(cache_key, [])
        current_metrics.append(metrics_data)
        cache.set(cache_key, current_metrics, timeout=3600 * 25)  # 25 hours retention
        
        # Update success/failure counters
        success_key = f"{self.cache_prefix}:success:{channel}:{provider}:{hour_key}"
        failure_key = f"{self.cache_prefix}:failure:{channel}:{provider}:{hour_key}"
        
        if success:
            cache.set(success_key, cache.get(success_key, 0) + 1, timeout=3600 * 25)
        else:
            cache.set(failure_key, cache.get(failure_key, 0) + 1, timeout=3600 * 25)
        
        # Update response time metrics
        if response_time_ms is not None:
            response_key = f"{self.cache_prefix}:response_time:{provider}:{hour_key}"
            response_times = cache.get(response_key, [])
            response_times.append(response_time_ms)
            cache.set(response_key, response_times, timeout=3600 * 25)
    
    def get_hourly_metrics(self, hours: int = 24) -> Dict[str, Any]:
        """Get hourly aggregated metrics"""
        now = timezone.now()
        metrics = {
            'hourly_stats': [],
            'provider_stats': defaultdict(lambda: {'sent': 0, 'success': 0, 'failure': 0}),
            'channel_stats': defaultdict(lambda: {'sent': 0, 'success': 0, 'failure': 0}),
            'template_stats': defaultdict(int),
            'response_times': defaultdict(list)
        }
        
        for hour_offset in range(hours):
            hour_dt = now - timedelta(hours=hour_offset)
            hour_key = hour_dt.strftime("%Y%m%d%H")
            
            # Get sent communications for this hour
            sent_key = f"{self.cache_prefix}:sent:{hour_key}"
            hour_data = cache.get(sent_key, [])
            
            hour_stats = {
                'hour': hour_dt.isoformat(),
                'total_sent': len(hour_data),
                'success_count': 0,
                'failure_count': 0,
                'providers': defaultdict(int),
                'channels': defaultdict(int),
                'templates': defaultdict(int)
            }
            
            # Aggregate hour data
            for record in hour_data:
                provider = record['provider']
                channel = record['channel']
                template = record['template_name']
                success = record['success']
                
                # Update hourly stats
                hour_stats['providers'][provider] += 1
                hour_stats['channels'][channel] += 1
                hour_stats['templates'][template] += 1
                
                if success:
                    hour_stats['success_count'] += 1
                    metrics['provider_stats'][provider]['success'] += 1
                    metrics['channel_stats'][channel]['success'] += 1
                else:
                    hour_stats['failure_count'] += 1
                    metrics['provider_stats'][provider]['failure'] += 1
                    metrics['channel_stats'][channel]['failure'] += 1
                
                # Update totals
                metrics['provider_stats'][provider]['sent'] += 1
                metrics['channel_stats'][channel]['sent'] += 1
                metrics['template_stats'][template] += 1
                
                # Response times
                if record.get('response_time_ms'):
                    metrics['response_times'][provider].append(record['response_time_ms'])
            
            metrics['hourly_stats'].append(hour_stats)
        
        # Calculate averages for response times
        avg_response_times = {}
        for provider, times in metrics['response_times'].items():
            if times:
                avg_response_times[provider] = {
                    'avg_ms': sum(times) / len(times),
                    'min_ms': min(times),
                    'max_ms': max(times),
                    'count': len(times)
                }
        
        metrics['avg_response_times'] = avg_response_times
        metrics['summary'] = {
            'total_sent': sum(stats['sent'] for stats in metrics['provider_stats'].values()),
            'total_success': sum(stats['success'] for stats in metrics['provider_stats'].values()),
            'total_failure': sum(stats['failure'] for stats in metrics['provider_stats'].values()),
        }
        
        if metrics['summary']['total_sent'] > 0:
            metrics['summary']['success_rate'] = (
                metrics['summary']['total_success'] / metrics['summary']['total_sent'] * 100
            )
        
        return dict(metrics)  # Convert defaultdicts to regular dicts
    
    def get_database_metrics(self, hours: int = 24) -> Dict[str, Any]:
        """Get metrics from database for long-term trends"""
        start_time = timezone.now() - timedelta(hours=hours)
        
        queryset = CommunicationRecord.objects.filter(created_at__gte=start_time)
        
        # Basic counts
        total_count = queryset.count()
        success_count = queryset.filter(delivery_status__in=['SENT', 'DELIVERED']).count()
        failure_count = queryset.filter(delivery_status='FAILED').count()
        pending_count = queryset.filter(delivery_status='PENDING').count()
        
        # Channel breakdown
        channel_stats = queryset.values('channel').annotate(
            count=Count('id'),
            success_count=Count('id', filter=Q(delivery_status__in=['SENT', 'DELIVERED'])),
            failure_count=Count('id', filter=Q(delivery_status='FAILED'))
        )
        
        # Template breakdown
        template_stats = queryset.values('template_name').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Provider breakdown from context_data
        provider_stats = {}
        for record in queryset.filter(context_data__has_key='provider_used').values(
            'context_data', 'delivery_status'
        ):
            provider = record['context_data'].get('provider_used', 'unknown')
            if provider not in provider_stats:
                provider_stats[provider] = {'total': 0, 'success': 0, 'failure': 0}
            
            provider_stats[provider]['total'] += 1
            if record['delivery_status'] in ['SENT', 'DELIVERED']:
                provider_stats[provider]['success'] += 1
            elif record['delivery_status'] == 'FAILED':
                provider_stats[provider]['failure'] += 1
        
        return {
            'period_hours': hours,
            'total_communications': total_count,
            'success_count': success_count,
            'failure_count': failure_count,
            'pending_count': pending_count,
            'success_rate': (success_count / total_count * 100) if total_count > 0 else 0,
            'channel_breakdown': list(channel_stats),
            'top_templates': list(template_stats),
            'provider_breakdown': provider_stats
        }


class HealthChecker:
    """Health check system for communication components"""
    
    def __init__(self):
        self.cache_key = "communications:health_check"
        self.check_timeout = 300  # 5 minutes
    
    def check_all_systems(self) -> Dict[str, Any]:
        """Comprehensive health check of all communication systems"""
        health_report = {
            'timestamp': timezone.now().isoformat(),
            'overall_status': 'healthy',
            'checks': {}
        }
        
        checks = [
            ('providers', self._check_providers),
            ('database', self._check_database),
            ('cache', self._check_cache),
            ('templates', self._check_templates),
            ('queues', self._check_queues)
        ]
        
        unhealthy_checks = []
        
        for check_name, check_func in checks:
            try:
                check_result = check_func()
                health_report['checks'][check_name] = check_result
                
                if not check_result.get('healthy', False):
                    unhealthy_checks.append(check_name)
                    
            except Exception as e:
                health_report['checks'][check_name] = {
                    'healthy': False,
                    'error': str(e),
                    'check_time': timezone.now().isoformat()
                }
                unhealthy_checks.append(check_name)
        
        if unhealthy_checks:
            health_report['overall_status'] = 'unhealthy'
            health_report['unhealthy_systems'] = unhealthy_checks
        
        # Cache the health report
        cache.set(self.cache_key, health_report, timeout=self.check_timeout)
        
        return health_report
    
    def _check_providers(self) -> Dict[str, Any]:
        """Check communication provider health"""
        try:
            provider_health = provider_manager.get_provider_health()
            
            healthy_providers = [
                name for name, status in provider_health.items()
                if status.get('healthy', False)
            ]
            
            return {
                'healthy': len(healthy_providers) > 0,
                'provider_count': len(provider_health),
                'healthy_providers': healthy_providers,
                'provider_details': provider_health,
                'check_time': timezone.now().isoformat()
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'check_time': timezone.now().isoformat()
            }
    
    def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity and recent activity"""
        try:
            # Test database connection
            recent_records = CommunicationRecord.objects.filter(
                created_at__gte=timezone.now() - timedelta(hours=1)
            ).count()
            
            # Check for very old pending records (potential stuck records)
            old_pending = CommunicationRecord.objects.filter(
                delivery_status='PENDING',
                created_at__lt=timezone.now() - timedelta(hours=24)
            ).count()
            
            return {
                'healthy': True,
                'recent_records_1h': recent_records,
                'old_pending_records': old_pending,
                'warnings': ['Old pending records detected'] if old_pending > 0 else [],
                'check_time': timezone.now().isoformat()
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'check_time': timezone.now().isoformat()
            }
    
    def _check_cache(self) -> Dict[str, Any]:
        """Check cache system"""
        try:
            test_key = "communications:health_test"
            test_value = timezone.now().isoformat()
            
            # Write test
            cache.set(test_key, test_value, timeout=60)
            
            # Read test
            cached_value = cache.get(test_key)
            
            return {
                'healthy': cached_value == test_value,
                'cache_working': cached_value == test_value,
                'check_time': timezone.now().isoformat()
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'check_time': timezone.now().isoformat()
            }
    
    def _check_templates(self) -> Dict[str, Any]:
        """Check critical templates exist"""
        try:
            from .config import communication_config
            
            is_valid, errors = communication_config.validate_configuration()
            
            return {
                'healthy': is_valid,
                'configuration_valid': is_valid,
                'errors': errors,
                'check_time': timezone.now().isoformat()
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'check_time': timezone.now().isoformat()
            }
    
    def _check_queues(self) -> Dict[str, Any]:
        """Check retry queues and async processing"""
        try:
            from .resilience import delivery_queue
            
            ready_deliveries = delivery_queue.get_ready_deliveries()
            queue_size = len(cache.get('communication_delivery_queue', []))
            
            return {
                'healthy': True,
                'ready_for_retry': len(ready_deliveries),
                'total_queue_size': queue_size,
                'warnings': ['Large retry queue'] if queue_size > 50 else [],
                'check_time': timezone.now().isoformat()
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
                'check_time': timezone.now().isoformat()
            }
    
    def get_cached_health(self) -> Optional[Dict[str, Any]]:
        """Get cached health report"""
        return cache.get(self.cache_key)


class AlertManager:
    """Alert management for communication system"""
    
    def __init__(self):
        self.alert_cache_key = "communications:alerts"
        self.alert_history_key = "communications:alert_history"
        self.max_history = 100
    
    def check_and_alert(self, health_report: Dict[str, Any]) -> List[Dict]:
        """Check health report and generate alerts"""
        alerts = []
        
        # Check overall system health
        if health_report.get('overall_status') != 'healthy':
            alerts.append({
                'severity': 'critical',
                'title': 'Communication System Unhealthy',
                'message': f"Unhealthy systems: {', '.join(health_report.get('unhealthy_systems', []))}",
                'timestamp': timezone.now().isoformat(),
                'type': 'system_health'
            })
        
        # Check provider health
        providers_check = health_report.get('checks', {}).get('providers', {})
        if not providers_check.get('healthy', False):
            alerts.append({
                'severity': 'critical',
                'title': 'Communication Providers Down',
                'message': 'No healthy communication providers available',
                'timestamp': timezone.now().isoformat(),
                'type': 'provider_failure'
            })
        
        # Check for excessive failures
        metrics = CommunicationMetrics()
        recent_metrics = metrics.get_hourly_metrics(hours=1)
        
        if recent_metrics['summary']['total_sent'] > 10:  # Only alert if significant volume
            failure_rate = (
                recent_metrics['summary']['total_failure'] / 
                recent_metrics['summary']['total_sent'] * 100
            )
            
            if failure_rate > 50:  # More than 50% failure rate
                alerts.append({
                    'severity': 'warning',
                    'title': 'High Failure Rate',
                    'message': f"Communication failure rate is {failure_rate:.1f}% over the last hour",
                    'timestamp': timezone.now().isoformat(),
                    'type': 'high_failure_rate',
                    'metrics': {
                        'failure_rate': failure_rate,
                        'total_sent': recent_metrics['summary']['total_sent'],
                        'failures': recent_metrics['summary']['total_failure']
                    }
                })
        
        # Check for large retry queue
        queue_check = health_report.get('checks', {}).get('queues', {})
        if queue_check.get('total_queue_size', 0) > 100:
            alerts.append({
                'severity': 'warning',
                'title': 'Large Retry Queue',
                'message': f"Retry queue has {queue_check['total_queue_size']} pending items",
                'timestamp': timezone.now().isoformat(),
                'type': 'large_retry_queue'
            })
        
        # Store alerts
        if alerts:
            self._store_alerts(alerts)
        
        return alerts
    
    def _store_alerts(self, alerts: List[Dict]):
        """Store alerts in cache and history"""
        # Current active alerts
        cache.set(self.alert_cache_key, alerts, timeout=3600)  # 1 hour
        
        # Add to history
        history = cache.get(self.alert_history_key, [])
        history.extend(alerts)
        
        # Keep only recent history
        if len(history) > self.max_history:
            history = history[-self.max_history:]
        
        cache.set(self.alert_history_key, history, timeout=86400)  # 24 hours
        
        # Log alerts
        for alert in alerts:
            severity = alert['severity']
            message = f"{alert['title']}: {alert['message']}"
            
            if severity == 'critical':
                logger.critical(f"ALERT: {message}")
            elif severity == 'warning':
                logger.warning(f"ALERT: {message}")
            else:
                logger.info(f"ALERT: {message}")
    
    def get_active_alerts(self) -> List[Dict]:
        """Get currently active alerts"""
        return cache.get(self.alert_cache_key, [])
    
    def get_alert_history(self, limit: int = 50) -> List[Dict]:
        """Get alert history"""
        history = cache.get(self.alert_history_key, [])
        return history[-limit:] if limit else history
    
    def clear_alerts(self):
        """Clear active alerts"""
        cache.delete(self.alert_cache_key)


# Global instances
communication_metrics = CommunicationMetrics()
health_checker = HealthChecker()
alert_manager = AlertManager()