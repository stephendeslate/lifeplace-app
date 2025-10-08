# backend/core/utils/security_logging.py
import logging
import json
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union
from enum import Enum

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import models, transaction
from django.utils import timezone
from django.conf import settings

User = get_user_model()
logger = logging.getLogger('security')


class SecurityEventType(models.TextChoices):
    """Types of security events to log"""
    LOGIN_SUCCESS = 'LOGIN_SUCCESS', 'Login Success'
    LOGIN_FAILURE = 'LOGIN_FAILURE', 'Login Failure'
    LOGOUT = 'LOGOUT', 'Logout'
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED', 'Account Locked'
    ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED', 'Account Unlocked'
    PASSWORD_CHANGE = 'PASSWORD_CHANGE', 'Password Change'
    PASSWORD_RESET = 'PASSWORD_RESET', 'Password Reset'
    PERMISSION_DENIED = 'PERMISSION_DENIED', 'Permission Denied'
    ADMIN_ACTION = 'ADMIN_ACTION', 'Administrative Action'
    DATA_ACCESS = 'DATA_ACCESS', 'Data Access'
    DATA_MODIFICATION = 'DATA_MODIFICATION', 'Data Modification'
    FILE_UPLOAD = 'FILE_UPLOAD', 'File Upload'
    FILE_DOWNLOAD = 'FILE_DOWNLOAD', 'File Download'
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY', 'Suspicious Activity'
    BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT', 'Brute Force Attempt'
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED', 'Rate Limit Exceeded'
    WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED', 'Webhook Received'
    WEBHOOK_REJECTED = 'WEBHOOK_REJECTED', 'Webhook Rejected'
    API_KEY_USED = 'API_KEY_USED', 'API Key Used'
    CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED', 'Configuration Changed'


class SecuritySeverity(models.TextChoices):
    """Severity levels for security events"""
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'


class SecurityEvent(models.Model):
    """Model to store security events for audit and monitoring"""
    
    id = models.AutoField(primary_key=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    event_type = models.CharField(max_length=50, choices=SecurityEventType.choices, db_index=True)
    severity = models.CharField(max_length=20, choices=SecuritySeverity.choices, default=SecuritySeverity.MEDIUM)
    
    # User information
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    username = models.CharField(max_length=150, blank=True, default='anonymous')  # Store even if user is deleted
    user_agent = models.TextField(blank=True, default='')
    
    # Network information
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    country = models.CharField(max_length=2, blank=True)  # Country code
    
    # Request information
    request_method = models.CharField(max_length=10, blank=True)
    request_path = models.TextField(blank=True)
    referer = models.TextField(blank=True)
    
    # Event details
    description = models.TextField()
    details = models.JSONField(default=dict, blank=True)
    
    # Risk assessment
    risk_score = models.IntegerField(default=0)  # 0-100 scale
    is_blocked = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'security_events'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'event_type']),
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['severity', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.timestamp}: {self.event_type} - {self.description}"


class SecurityLogger:
    """Service for logging security events"""
    
    def __init__(self):
        self.logger = logging.getLogger('security')
    
    def log_event(
        self,
        event_type: str,
        description: str,
        request=None,
        user=None,
        severity: str = SecuritySeverity.MEDIUM,
        details: Dict[str, Any] = None,
        risk_score: int = 0,
        is_blocked: bool = False
    ):
        """
        Log a security event
        
        Args:
            event_type: Type of security event
            description: Human-readable description
            request: Django request object (optional)
            user: User object or user ID (optional)
            severity: Severity level
            details: Additional event details
            risk_score: Risk score (0-100)
            is_blocked: Whether the action was blocked
        """
        
        # Extract request information
        ip_address = None
        user_agent = ''
        request_method = ''
        request_path = ''
        referer = ''
        
        if request:
            ip_address = self._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:1000]  # Limit length
            request_method = request.method
            request_path = request.get_full_path()[:500]  # Limit length
            referer = request.META.get('HTTP_REFERER', '')[:500]
        
        # Handle user information
        username = ''
        if user:
            if hasattr(user, 'username') and user.username:
                username = user.username
            elif hasattr(user, 'email') and user.email:
                username = user.email
            elif isinstance(user, (int, str)):
                try:
                    user_obj = User.objects.get(id=user)
                    username = user_obj.username or user_obj.email or f"user_{user_obj.id}"
                    user = user_obj
                except (User.DoesNotExist, ValueError):
                    username = str(user)
                    user = None
            else:
                # Fallback for user objects without username or email
                username = f"user_{getattr(user, 'id', 'unknown')}"
        
        # Prepare details
        if details is None:
            details = {}
        
        # Add timestamp to details
        details['logged_at'] = timezone.now().isoformat()
        
        # Calculate risk score if not provided
        if risk_score == 0:
            risk_score = self._calculate_risk_score(event_type, severity, ip_address, user)
        
        # Ensure username is never None or empty to comply with database constraints
        if not username:
            username = 'anonymous'
        
        # Create security event record
        # Note: No transaction.atomic() wrapper to avoid nested transaction issues
        # The caller should handle transactions if needed
        try:
            event = SecurityEvent.objects.create(
                event_type=event_type,
                severity=severity,
                user=user,
                username=username,
                user_agent=user_agent,
                ip_address=ip_address,
                request_method=request_method,
                request_path=request_path,
                referer=referer,
                description=description,
                details=details,
                risk_score=risk_score,
                is_blocked=is_blocked
            )

            # Log to Django logger as well
            log_level = self._get_log_level(severity)
            self.logger.log(
                log_level,
                f"[{event_type}] {description}",
                extra={
                    'event_id': event.id,
                    'user': username,
                    'ip': ip_address,
                    'risk_score': risk_score,
                    'details': details
                }
            )

            # Check for alerts
            self._check_security_alerts(event)

            return event

        except Exception as e:
            # Fallback to regular logging if database fails
            self.logger.error(f"Failed to log security event: {str(e)}")
            self.logger.log(
                self._get_log_level(severity),
                f"[{event_type}] {description} (IP: {ip_address}, User: {username})"
            )
    
    def log_login_success(self, request, user):
        """Log successful login"""
        return self.log_event(
            SecurityEventType.LOGIN_SUCCESS,
            f"User {user.email} logged in successfully",
            request=request,
            user=user,
            severity=SecuritySeverity.LOW,
            details={'user_id': user.id, 'user_role': user.role}
        )
    
    def log_login_failure(self, request, username, reason='Invalid credentials'):
        """Log failed login attempt"""
        ip_address = self._get_client_ip(request)
        
        # Check for brute force attempts
        is_brute_force = self._check_brute_force(ip_address, username)
        
        self.log_event(
            SecurityEventType.LOGIN_FAILURE,
            f"Failed login attempt for {username}: {reason}",
            request=request,
            severity=SecuritySeverity.MEDIUM if not is_brute_force else SecuritySeverity.HIGH,
            details={'attempted_username': username, 'failure_reason': reason, 'is_brute_force': is_brute_force},
            risk_score=30 if not is_brute_force else 70
        )
    
    def log_admin_action(self, request, user, action, target=None):
        """Log administrative action"""
        details = {'action': action}
        if target:
            details['target'] = str(target)
        
        self.log_event(
            SecurityEventType.ADMIN_ACTION,
            f"Admin {user.email} performed action: {action}",
            request=request,
            user=user,
            severity=SecuritySeverity.MEDIUM,
            details=details,
            risk_score=20
        )
    
    def log_permission_denied(self, request, user, resource):
        """Log permission denied event"""
        self.log_event(
            SecurityEventType.PERMISSION_DENIED,
            f"Permission denied for user {user.email if user else 'Anonymous'} accessing {resource}",
            request=request,
            user=user,
            severity=SecuritySeverity.MEDIUM,
            details={'resource': resource},
            risk_score=40
        )
    
    def log_suspicious_activity(self, request, description, user=None, details=None):
        """Log suspicious activity"""
        self.log_event(
            SecurityEventType.SUSPICIOUS_ACTIVITY,
            description,
            request=request,
            user=user,
            severity=SecuritySeverity.HIGH,
            details=details or {},
            risk_score=80
        )
    
    def _get_client_ip(self, request):
        """Extract client IP address from request"""
        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
    
    def _get_log_level(self, severity):
        """Convert severity to logging level"""
        mapping = {
            SecuritySeverity.LOW: logging.INFO,
            SecuritySeverity.MEDIUM: logging.WARNING,
            SecuritySeverity.HIGH: logging.ERROR,
            SecuritySeverity.CRITICAL: logging.CRITICAL
        }
        return mapping.get(severity, logging.WARNING)
    
    def _calculate_risk_score(self, event_type, severity, ip_address, user):
        """Calculate risk score for an event"""
        base_scores = {
            SecurityEventType.LOGIN_SUCCESS: 0,
            SecurityEventType.LOGIN_FAILURE: 30,
            SecurityEventType.PERMISSION_DENIED: 40,
            SecurityEventType.SUSPICIOUS_ACTIVITY: 80,
            SecurityEventType.BRUTE_FORCE_ATTEMPT: 90,
            SecurityEventType.ADMIN_ACTION: 20,
        }
        
        score = base_scores.get(event_type, 10)
        
        # Adjust based on severity
        if severity == SecuritySeverity.HIGH:
            score += 20
        elif severity == SecuritySeverity.CRITICAL:
            score += 40
        
        # Adjust based on user
        if user and hasattr(user, 'is_superuser') and user.is_superuser:
            score += 10
        
        return min(score, 100)
    
    def _check_brute_force(self, ip_address, username):
        """Check if this looks like a brute force attempt"""
        if not ip_address:
            return False
        
        # Check recent failures from this IP
        cache_key = f"login_failures:{hashlib.md5(ip_address.encode()).hexdigest()}"
        failures = cache.get(cache_key, 0)
        
        # Increment failure count
        cache.set(cache_key, failures + 1, timeout=3600)  # 1 hour
        
        # Consider it brute force after 5 failures
        return failures >= 4
    
    def _check_security_alerts(self, event):
        """Check if event should trigger security alerts"""
        # This is where you'd integrate with alerting systems
        # For now, just log critical events
        if event.severity == SecuritySeverity.CRITICAL or event.risk_score >= 90:
            self.logger.critical(f"SECURITY ALERT: {event.description}")
        
        # TODO: Add integration with monitoring systems like:
        # - Email alerts
        # - Slack notifications  
        # - SIEM systems
        # - Security dashboards


# Global security logger instance
security_logger = SecurityLogger()


def log_security_event(event_type: str, description: str, **kwargs):
    """Convenience function to log security events"""
    return security_logger.log_event(event_type, description, **kwargs)