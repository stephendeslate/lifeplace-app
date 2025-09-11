"""
Health Check System for Messaging Security Infrastructure
Monitors the security components and provides status information
"""

import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from django.core.cache import cache
from django.db import connection
from django.utils import timezone
from django.conf import settings

from .encryption import MessageEncryption, message_encryption
from .key_management import key_manager, EncryptionKey
from .security_audit import MessageAuditLog, ConnectionAuditLog
from .auth import connection_rate_limiter
from core.utils.security_logging import SecurityLogger, SecurityEventType, SecuritySeverity

logger = logging.getLogger(__name__)
security_logger = SecurityLogger()


class HealthStatus(Enum):
    """Health check status levels"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


@dataclass
class HealthCheckResult:
    """Result of a health check"""
    component: str
    status: HealthStatus
    message: str
    details: Dict[str, Any]
    timestamp: datetime
    response_time_ms: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'component': self.component,
            'status': self.status.value,
            'message': self.message,
            'details': self.details,
            'timestamp': self.timestamp.isoformat(),
            'response_time_ms': self.response_time_ms
        }


class SecurityHealthChecker:
    """Health checker for security infrastructure"""
    
    def __init__(self):
        self.checks = {
            'encryption': self._check_encryption,
            'key_management': self._check_key_management,
            'authentication': self._check_authentication,
            'rate_limiting': self._check_rate_limiting,
            'audit_logging': self._check_audit_logging,
            'database': self._check_database,
            'cache': self._check_cache,
            'security_logging': self._check_security_logging,
        }
    
    def run_all_checks(self) -> Dict[str, HealthCheckResult]:
        """Run all health checks"""
        results = {}
        
        for check_name, check_func in self.checks.items():
            try:
                start_time = time.time()
                result = check_func()
                end_time = time.time()
                
                result.response_time_ms = (end_time - start_time) * 1000
                results[check_name] = result
                
            except Exception as e:
                logger.error(f"Health check failed for {check_name}: {e}")
                results[check_name] = HealthCheckResult(
                    component=check_name,
                    status=HealthStatus.CRITICAL,
                    message=f"Health check failed: {str(e)}",
                    details={'error': str(e)},
                    timestamp=timezone.now()
                )
        
        return results
    
    def run_check(self, check_name: str) -> HealthCheckResult:
        """Run a specific health check"""
        if check_name not in self.checks:
            return HealthCheckResult(
                component=check_name,
                status=HealthStatus.UNKNOWN,
                message=f"Unknown health check: {check_name}",
                details={},
                timestamp=timezone.now()
            )
        
        try:
            start_time = time.time()
            result = self.checks[check_name]()
            end_time = time.time()
            
            result.response_time_ms = (end_time - start_time) * 1000
            return result
            
        except Exception as e:
            logger.error(f"Health check failed for {check_name}: {e}")
            return HealthCheckResult(
                component=check_name,
                status=HealthStatus.CRITICAL,
                message=f"Health check failed: {str(e)}",
                details={'error': str(e)},
                timestamp=timezone.now()
            )
    
    def get_overall_status(self, results: Dict[str, HealthCheckResult]) -> HealthStatus:
        """Get overall system status based on individual checks"""
        statuses = [result.status for result in results.values()]
        
        if HealthStatus.CRITICAL in statuses:
            return HealthStatus.CRITICAL
        elif HealthStatus.WARNING in statuses:
            return HealthStatus.WARNING
        elif all(status == HealthStatus.HEALTHY for status in statuses):
            return HealthStatus.HEALTHY
        else:
            return HealthStatus.UNKNOWN
    
    def _check_encryption(self) -> HealthCheckResult:
        """Check encryption system health"""
        try:
            # Test encryption/decryption
            test_message = "Health check test message"
            encrypted = message_encryption.encrypt_message_content(test_message)
            decrypted = message_encryption.decrypt_message_content(encrypted)
            
            if decrypted != test_message:
                return HealthCheckResult(
                    component="encryption",
                    status=HealthStatus.CRITICAL,
                    message="Encryption/decryption test failed",
                    details={'test_failed': True},
                    timestamp=timezone.now()
                )
            
            # Check if using fallback key
            encryption_key = getattr(settings, 'FIELD_ENCRYPTION_KEY', None)
            using_fallback = not encryption_key or encryption_key == 'development-key-only'
            
            status = HealthStatus.WARNING if using_fallback else HealthStatus.HEALTHY
            message = "Using development encryption key" if using_fallback else "Encryption system operational"
            
            return HealthCheckResult(
                component="encryption",
                status=status,
                message=message,
                details={
                    'using_fallback_key': using_fallback,
                    'encryption_test_passed': True
                },
                timestamp=timezone.now()
            )
            
        except Exception as e:
            return HealthCheckResult(
                component="encryption",
                status=HealthStatus.CRITICAL,
                message=f"Encryption system error: {str(e)}",
                details={'error': str(e)},
                timestamp=timezone.now()
            )
    
    def _check_key_management(self) -> HealthCheckResult:
        """Check key management system health"""
        try:
            # Check if primary key exists
            try:
                primary_key = key_manager.get_primary_key('message_content')
                has_primary_key = True
            except Exception:
                has_primary_key = False
            
            # Get key info
            key_info = key_manager.get_key_info('message_content')
            
            # Check key age
            if key_info['primary_key']['key_id']:
                try:
                    primary_key_record = EncryptionKey.objects.get(
                        key_id=key_info['primary_key']['key_id']
                    )
                    key_age = timezone.now() - primary_key_record.created_at
                    key_age_days = key_age.days
                except EncryptionKey.DoesNotExist:
                    key_age_days = None
            else:
                key_age_days = None
            
            # Determine status
            if not has_primary_key:
                status = HealthStatus.CRITICAL
                message = "No primary encryption key available"
            elif key_age_days and key_age_days > 180:  # 6 months
                status = HealthStatus.WARNING
                message = f"Primary key is {key_age_days} days old, rotation recommended"
            else:
                status = HealthStatus.HEALTHY
                message = "Key management system operational"
            
            return HealthCheckResult(
                component="key_management",
                status=status,
                message=message,
                details={
                    'has_primary_key': has_primary_key,
                    'key_age_days': key_age_days,
                    'total_keys': key_info['total_keys'],
                    'active_keys': key_info['active_keys'],
                    'latest_version': key_info['latest_version']
                },
                timestamp=timezone.now()
            )
            
        except Exception as e:
            return HealthCheckResult(
                component="key_management",
                status=HealthStatus.CRITICAL,
                message=f"Key management error: {str(e)}",
                details={'error': str(e)},
                timestamp=timezone.now()
            )
    
    def _check_authentication(self) -> HealthCheckResult:
        """Check authentication system health"""
        try:
            # Check JWT settings
            jwt_key = getattr(settings, 'JWT_SIGNING_KEY', None)
            secret_key = getattr(settings, 'SECRET_KEY', None)
            
            has_jwt_key = bool(jwt_key)
            using_secret_for_jwt = jwt_key == secret_key
            
            # Check JWT configuration
            simple_jwt_config = getattr(settings, 'SIMPLE_JWT', {})
            has_proper_config = all(key in simple_jwt_config for key in [
                'ACCESS_TOKEN_LIFETIME', 'REFRESH_TOKEN_LIFETIME', 'ALGORITHM'
            ])
            
            # Determine status
            if not has_jwt_key:
                status = HealthStatus.CRITICAL
                message = "No JWT signing key configured"
            elif using_secret_for_jwt and not settings.DEBUG:
                status = HealthStatus.WARNING
                message = "Using SECRET_KEY for JWT signing in production"
            elif not has_proper_config:
                status = HealthStatus.WARNING
                message = "Incomplete JWT configuration"
            else:
                status = HealthStatus.HEALTHY
                message = "Authentication system operational"
            
            return HealthCheckResult(
                component="authentication",
                status=status,
                message=message,
                details={
                    'has_jwt_key': has_jwt_key,
                    'using_secret_for_jwt': using_secret_for_jwt,
                    'has_proper_config': has_proper_config,
                    'debug_mode': settings.DEBUG
                },
                timestamp=timezone.now()
            )
            
        except Exception as e:
            return HealthCheckResult(
                component="authentication",
                status=HealthStatus.CRITICAL,
                message=f"Authentication error: {str(e)}",
                details={'error': str(e)},
                timestamp=timezone.now()
            )
    
    def _check_rate_limiting(self) -> HealthCheckResult:
        """Check rate limiting system health"""
        try:
            # Test cache connectivity for rate limiting
            test_key = "health_check_rate_limit_test"
            cache.set(test_key, "test", timeout=10)
            cached_value = cache.get(test_key)
            cache_working = cached_value == "test"
            
            if cached_value:
                cache.delete(test_key)
            
            # Check rate limiting configuration
            rate_config = {
                'messages_per_minute': getattr(settings, 'WS_MESSAGES_PER_MINUTE', 10),
                'connections_per_hour': getattr(settings, 'WS_CONNECTIONS_PER_HOUR', 100),
                'burst_limit': getattr(settings, 'WS_BURST_LIMIT', 5),
                'rate_limiting_enabled': getattr(settings, 'WS_RATE_LIMITING_ENABLED', True),
            }
            
            # Determine status
            if not cache_working:
                status = HealthStatus.CRITICAL
                message = "Cache system not working - rate limiting disabled"
            elif not rate_config['rate_limiting_enabled']:
                status = HealthStatus.WARNING
                message = "Rate limiting is disabled"
            else:
                status = HealthStatus.HEALTHY
                message = "Rate limiting system operational"
            
            return HealthCheckResult(
                component="rate_limiting",
                status=status,
                message=message,
                details={
                    'cache_working': cache_working,
                    'configuration': rate_config
                },
                timestamp=timezone.now()
            )
            
        except Exception as e:
            return HealthCheckResult(
                component="rate_limiting",
                status=HealthStatus.CRITICAL,
                message=f"Rate limiting error: {str(e)}",
                details={'error': str(e)},
                timestamp=timezone.now()
            )
    
    def _check_audit_logging(self) -> HealthCheckResult:
        """Check audit logging system health"""
        try:
            # Check recent audit logs
            recent_logs = MessageAuditLog.objects.filter(
                timestamp__gte=timezone.now() - timedelta(hours=24)
            ).count()
            
            # Check connection logs
            recent_connections = ConnectionAuditLog.objects.filter(
                connected_at__gte=timezone.now() - timedelta(hours=24)
            ).count()
            
            # Check database write capability
            try:
                test_log = MessageAuditLog.objects.create(
                    event_type='CONNECTION_OPENED',
                    username='health_check_test',
                    event_data={'health_check': True}
                )
                test_log.delete()  # Clean up
                db_write_working = True
            except Exception:
                db_write_working = False
            
            # Determine status
            if not db_write_working:
                status = HealthStatus.CRITICAL
                message = "Cannot write to audit log database"
            elif recent_logs == 0 and recent_connections == 0:
                status = HealthStatus.WARNING
                message = "No recent audit activity (last 24h)"
            else:
                status = HealthStatus.HEALTHY
                message = "Audit logging system operational"
            
            return HealthCheckResult(
                component="audit_logging",
                status=status,
                message=message,
                details={
                    'recent_message_logs': recent_logs,
                    'recent_connection_logs': recent_connections,
                    'db_write_working': db_write_working
                },
                timestamp=timezone.now()
            )
            
        except Exception as e:
            return HealthCheckResult(
                component="audit_logging",
                status=HealthStatus.CRITICAL,
                message=f"Audit logging error: {str(e)}",
                details={'error': str(e)},
                timestamp=timezone.now()
            )
    
    def _check_database(self) -> HealthCheckResult:
        """Check database connectivity"""
        try:
            # Test database connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
            
            db_connected = result[0] == 1
            
            # Check security tables exist
            tables_exist = all(
                connection.introspection.table_names().__contains__(table)
                for table in [
                    'messaging_audit_log',
                    'messaging_connection_audit',
                    'messaging_encryption_keys'
                ]
            )
            
            # Determine status
            if not db_connected:
                status = HealthStatus.CRITICAL
                message = "Database connection failed"
            elif not tables_exist:
                status = HealthStatus.WARNING
                message = "Some security tables are missing"
            else:
                status = HealthStatus.HEALTHY
                message = "Database connection operational"
            
            return HealthCheckResult(
                component="database",
                status=status,
                message=message,
                details={
                    'connected': db_connected,
                    'security_tables_exist': tables_exist
                },
                timestamp=timezone.now()
            )
            
        except Exception as e:
            return HealthCheckResult(
                component="database",
                status=HealthStatus.CRITICAL,
                message=f"Database error: {str(e)}",
                details={'error': str(e)},
                timestamp=timezone.now()
            )
    
    def _check_cache(self) -> HealthCheckResult:
        """Check cache system health"""
        try:
            # Test cache operations
            test_key = "health_check_cache_test"
            test_value = f"test_{int(time.time())}"
            
            # Write test
            cache.set(test_key, test_value, timeout=10)
            
            # Read test
            cached_value = cache.get(test_key)
            read_working = cached_value == test_value
            
            # Delete test
            cache.delete(test_key)
            deleted = cache.get(test_key) is None
            
            # Cache backend info
            cache_backend = getattr(settings, 'CACHES', {}).get('default', {}).get('BACKEND', 'Unknown')
            
            # Determine status
            if not read_working:
                status = HealthStatus.CRITICAL
                message = "Cache read/write operations failed"
            elif not deleted:
                status = HealthStatus.WARNING
                message = "Cache delete operation failed"
            else:
                status = HealthStatus.HEALTHY
                message = "Cache system operational"
            
            return HealthCheckResult(
                component="cache",
                status=status,
                message=message,
                details={
                    'read_working': read_working,
                    'delete_working': deleted,
                    'backend': cache_backend
                },
                timestamp=timezone.now()
            )
            
        except Exception as e:
            return HealthCheckResult(
                component="cache",
                status=HealthStatus.CRITICAL,
                message=f"Cache error: {str(e)}",
                details={'error': str(e)},
                timestamp=timezone.now()
            )
    
    def _check_security_logging(self) -> HealthCheckResult:
        """Check security logging system health"""
        try:
            # Test security logger
            test_event_logged = False
            try:
                security_logger.log_event(
                    event_type=SecurityEventType.DATA_ACCESS,
                    description="Health check test event",
                    severity=SecuritySeverity.LOW,
                    details={'health_check': True}
                )
                test_event_logged = True
            except Exception:
                test_event_logged = False
            
            # Check logging configuration
            logging_config = getattr(settings, 'LOGGING', {})
            has_security_logger = 'security' in logging_config.get('loggers', {})
            
            # Check log file accessibility (if file logging is configured)
            log_file_writable = True
            try:
                security_handlers = logging_config.get('loggers', {}).get('security', {}).get('handlers', [])
                if 'security_file' in security_handlers:
                    # Check if we can write to security log
                    import tempfile
                    import os
                    temp_file = tempfile.NamedTemporaryFile(delete=False)
                    temp_file.write(b"test")
                    temp_file.close()
                    os.unlink(temp_file.name)
            except Exception:
                log_file_writable = False
            
            # Determine status
            if not test_event_logged:
                status = HealthStatus.CRITICAL
                message = "Security event logging failed"
            elif not has_security_logger:
                status = HealthStatus.WARNING
                message = "Security logger not properly configured"
            elif not log_file_writable:
                status = HealthStatus.WARNING
                message = "Security log file may not be writable"
            else:
                status = HealthStatus.HEALTHY
                message = "Security logging system operational"
            
            return HealthCheckResult(
                component="security_logging",
                status=status,
                message=message,
                details={
                    'test_event_logged': test_event_logged,
                    'has_security_logger': has_security_logger,
                    'log_file_writable': log_file_writable
                },
                timestamp=timezone.now()
            )
            
        except Exception as e:
            return HealthCheckResult(
                component="security_logging",
                status=HealthStatus.CRITICAL,
                message=f"Security logging error: {str(e)}",
                details={'error': str(e)},
                timestamp=timezone.now()
            )


class SecurityMetrics:
    """Collect security metrics for monitoring"""
    
    @staticmethod
    def get_security_metrics() -> Dict[str, Any]:
        """Get current security metrics"""
        try:
            now = timezone.now()
            last_24h = now - timedelta(hours=24)
            last_hour = now - timedelta(hours=1)
            
            # Authentication metrics
            auth_events = MessageAuditLog.objects.filter(
                timestamp__gte=last_24h,
                event_type__in=['CONNECTION_OPENED', 'CONNECTION_FAILED']
            )
            
            successful_auths = auth_events.filter(event_type='CONNECTION_OPENED').count()
            failed_auths = auth_events.filter(event_type='CONNECTION_FAILED').count()
            
            # Message metrics
            message_events = MessageAuditLog.objects.filter(
                timestamp__gte=last_24h,
                event_type='MESSAGE_SENT'
            )
            
            total_messages = message_events.count()
            encrypted_messages = message_events.filter(is_encrypted=True).count()
            
            # Security events
            security_events = MessageAuditLog.objects.filter(
                timestamp__gte=last_24h,
                is_suspicious=True
            )
            
            # Rate limiting events
            rate_limit_events = MessageAuditLog.objects.filter(
                timestamp__gte=last_24h,
                event_type='RATE_LIMITED'
            ).count()
            
            # Connection metrics
            active_connections = ConnectionAuditLog.objects.filter(
                connected_at__gte=last_hour,
                disconnected_at__isnull=True
            ).count()
            
            # Key management metrics
            key_info = key_manager.get_key_info('message_content')
            
            return {
                'timestamp': now.isoformat(),
                'period': '24h',
                'authentication': {
                    'successful_connections': successful_auths,
                    'failed_connections': failed_auths,
                    'success_rate': successful_auths / max(successful_auths + failed_auths, 1)
                },
                'messaging': {
                    'total_messages': total_messages,
                    'encrypted_messages': encrypted_messages,
                    'encryption_rate': encrypted_messages / max(total_messages, 1)
                },
                'security': {
                    'suspicious_events': security_events.count(),
                    'rate_limit_violations': rate_limit_events,
                    'high_risk_events': security_events.filter(risk_score__gte=70).count()
                },
                'connections': {
                    'active_connections': active_connections,
                    'total_connections_24h': ConnectionAuditLog.objects.filter(
                        connected_at__gte=last_24h
                    ).count()
                },
                'keys': {
                    'total_keys': key_info['total_keys'],
                    'active_keys': key_info['active_keys'],
                    'current_version': key_info['latest_version']
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to collect security metrics: {e}")
            return {
                'timestamp': timezone.now().isoformat(),
                'error': str(e),
                'status': 'collection_failed'
            }


# Global health checker instance
security_health_checker = SecurityHealthChecker()


# Convenience functions
def get_security_health() -> Dict[str, Any]:
    """Get overall security health status"""
    results = security_health_checker.run_all_checks()
    overall_status = security_health_checker.get_overall_status(results)
    
    return {
        'overall_status': overall_status.value,
        'timestamp': timezone.now().isoformat(),
        'checks': {name: result.to_dict() for name, result in results.items()}
    }


def get_security_metrics() -> Dict[str, Any]:
    """Get security metrics"""
    return SecurityMetrics.get_security_metrics()