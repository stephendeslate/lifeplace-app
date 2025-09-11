"""
Security Audit and Logging System for Messaging
Provides comprehensive logging, monitoring, and audit trail for WebSocket messaging
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from enum import Enum
from dataclasses import dataclass, asdict

from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings

from channels.db import database_sync_to_async

from core.utils.security_logging import SecurityLogger, SecurityEventType, SecuritySeverity
from core.utils.models import BaseModel

User = get_user_model()
logger = logging.getLogger(__name__)
security_logger = SecurityLogger()


class WebSocketEventType(models.TextChoices):
    """Types of WebSocket events to audit"""
    CONNECTION_OPENED = 'CONNECTION_OPENED', 'Connection Opened'
    CONNECTION_CLOSED = 'CONNECTION_CLOSED', 'Connection Closed'
    CONNECTION_FAILED = 'CONNECTION_FAILED', 'Connection Failed'
    MESSAGE_SENT = 'MESSAGE_SENT', 'Message Sent'
    MESSAGE_RECEIVED = 'MESSAGE_RECEIVED', 'Message Received'
    MESSAGE_EDITED = 'MESSAGE_EDITED', 'Message Edited'
    MESSAGE_DELETED = 'MESSAGE_DELETED', 'Message Deleted'
    THREAD_JOINED = 'THREAD_JOINED', 'Thread Joined'
    THREAD_LEFT = 'THREAD_LEFT', 'Thread Left'
    TYPING_STARTED = 'TYPING_STARTED', 'Typing Started'
    TYPING_STOPPED = 'TYPING_STOPPED', 'Typing Stopped'
    ROOM_JOINED = 'ROOM_JOINED', 'Room Joined'
    ROOM_LEFT = 'ROOM_LEFT', 'Room Left'
    ERROR_OCCURRED = 'ERROR_OCCURRED', 'Error Occurred'
    RATE_LIMITED = 'RATE_LIMITED', 'Rate Limited'
    CONTENT_BLOCKED = 'CONTENT_BLOCKED', 'Content Blocked'


class MessageAuditLog(BaseModel):
    """Audit log for message-related events"""
    
    # Event information
    event_type = models.CharField(max_length=50, choices=WebSocketEventType.choices, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # User information
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    username = models.CharField(max_length=150, blank=True)  # Store even if user is deleted
    user_role = models.CharField(max_length=20, blank=True)
    
    # Connection information
    connection_id = models.CharField(max_length=64, blank=True)
    session_id = models.CharField(max_length=64, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Message/Thread context
    thread_id = models.IntegerField(null=True, blank=True, db_index=True)
    message_id = models.IntegerField(null=True, blank=True, db_index=True)
    room_name = models.CharField(max_length=200, blank=True)
    
    # Event details
    event_data = models.JSONField(default=dict, blank=True)
    error_details = models.JSONField(default=dict, blank=True)
    
    # Content information (for message events)
    content_length = models.IntegerField(null=True, blank=True)
    content_hash = models.CharField(max_length=64, blank=True)  # SHA-256 hash of content
    is_encrypted = models.BooleanField(default=False)
    
    # Security flags
    is_suspicious = models.BooleanField(default=False)
    risk_score = models.IntegerField(default=0)  # 0-100 scale
    was_blocked = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'messaging_audit_log'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'event_type']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['thread_id', 'timestamp']),
            models.Index(fields=['is_suspicious', 'timestamp']),
            models.Index(fields=['risk_score', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.timestamp}: {self.event_type} - {self.username or 'Anonymous'}"


class ConnectionAuditLog(BaseModel):
    """Audit log for WebSocket connections"""
    
    # Connection information
    connection_id = models.CharField(max_length=64, unique=True)
    session_id = models.CharField(max_length=64, blank=True)
    
    # User information
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    username = models.CharField(max_length=150, blank=True)
    user_role = models.CharField(max_length=20, blank=True)
    
    # Network information
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    origin = models.URLField(blank=True)
    
    # Connection lifecycle
    connected_at = models.DateTimeField(auto_now_add=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)
    duration = models.DurationField(null=True, blank=True)
    
    # Connection details
    connection_data = models.JSONField(default=dict, blank=True)
    disconnect_reason = models.CharField(max_length=200, blank=True)
    
    # Statistics
    messages_sent = models.IntegerField(default=0)
    messages_received = models.IntegerField(default=0)
    errors_count = models.IntegerField(default=0)
    
    # Security flags
    is_suspicious = models.BooleanField(default=False)
    was_blocked = models.BooleanField(default=False)
    auth_failures = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'messaging_connection_audit'
        ordering = ['-connected_at']
        indexes = [
            models.Index(fields=['connected_at']),
            models.Index(fields=['ip_address', 'connected_at']),
            models.Index(fields=['user', 'connected_at']),
            models.Index(fields=['is_suspicious']),
        ]
    
    def __str__(self):
        return f"Connection {self.connection_id} - {self.username or 'Anonymous'}"


@dataclass
class AuditContext:
    """Context information for audit logging"""
    user: Optional[User] = None
    connection_id: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    origin: Optional[str] = None
    thread_id: Optional[int] = None
    message_id: Optional[int] = None
    room_name: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, excluding None values"""
        return {k: v for k, v in asdict(self).items() if v is not None}


class WebSocketAuditor:
    """Main auditor for WebSocket messaging events"""
    
    def __init__(self):
        self.logger = logging.getLogger('messaging.audit')
        self.security_logger = security_logger
    
    async def log_connection_event(
        self,
        event_type: str,
        context: AuditContext,
        event_data: Optional[Dict] = None,
        is_suspicious: bool = False,
        risk_score: int = 0
    ):
        """Log connection-related events"""
        await self._log_audit_event(
            event_type=event_type,
            context=context,
            event_data=event_data or {},
            is_suspicious=is_suspicious,
            risk_score=risk_score
        )
        
        # Also handle connection lifecycle tracking
        if event_type == WebSocketEventType.CONNECTION_OPENED:
            await self._create_connection_record(context, event_data or {})
        elif event_type == WebSocketEventType.CONNECTION_CLOSED:
            await self._update_connection_record(context, event_data or {})
    
    async def log_message_event(
        self,
        event_type: str,
        context: AuditContext,
        message_content: Optional[str] = None,
        event_data: Optional[Dict] = None,
        is_suspicious: bool = False,
        risk_score: int = 0
    ):
        """Log message-related events"""
        # Calculate content metadata
        content_length = len(message_content) if message_content else None
        content_hash = None
        is_encrypted = False
        
        if message_content:
            import hashlib
            content_hash = hashlib.sha256(message_content.encode()).hexdigest()
            # Simple check for encrypted content
            is_encrypted = self._looks_encrypted(message_content)
        
        additional_data = {
            'content_length': content_length,
            'content_hash': content_hash,
            'is_encrypted': is_encrypted,
        }
        
        await self._log_audit_event(
            event_type=event_type,
            context=context,
            event_data={**(event_data or {}), **additional_data},
            is_suspicious=is_suspicious,
            risk_score=risk_score,
            content_length=content_length,
            content_hash=content_hash,
            is_encrypted=is_encrypted
        )
        
        # Update connection statistics
        if context.connection_id:
            await self._update_connection_stats(
                context.connection_id,
                event_type,
                is_error=event_type == WebSocketEventType.ERROR_OCCURRED
            )
    
    async def log_security_event(
        self,
        event_type: str,
        context: AuditContext,
        description: str,
        event_data: Optional[Dict] = None,
        severity: str = SecuritySeverity.MEDIUM,
        risk_score: int = 50
    ):
        """Log security-related events"""
        # Log to audit system
        await self._log_audit_event(
            event_type=event_type,
            context=context,
            event_data=event_data or {},
            is_suspicious=True,
            risk_score=risk_score
        )
        
        # Also log to security logger
        await database_sync_to_async(self.security_logger.log_event)(
            event_type=SecurityEventType.SUSPICIOUS_ACTIVITY,
            description=description,
            user=context.user,
            severity=severity,
            details={
                'websocket_event': event_type,
                'context': context.to_dict(),
                'event_data': event_data or {},
            },
            risk_score=risk_score
        )
    
    @database_sync_to_async
    def _log_audit_event(
        self,
        event_type: str,
        context: AuditContext,
        event_data: Dict,
        is_suspicious: bool = False,
        risk_score: int = 0,
        content_length: Optional[int] = None,
        content_hash: Optional[str] = None,
        is_encrypted: bool = False
    ):
        """Log audit event to database"""
        try:
            with transaction.atomic():
                audit_log = MessageAuditLog.objects.create(
                    event_type=event_type,
                    user=context.user,
                    username=context.user.email if context.user else '',
                    user_role=context.user.role if context.user else '',
                    connection_id=context.connection_id or '',
                    session_id=context.session_id or '',
                    ip_address=context.ip_address,
                    user_agent=context.user_agent or '',
                    thread_id=context.thread_id,
                    message_id=context.message_id,
                    room_name=context.room_name or '',
                    event_data=event_data,
                    content_length=content_length,
                    content_hash=content_hash or '',
                    is_encrypted=is_encrypted,
                    is_suspicious=is_suspicious,
                    risk_score=risk_score,
                    was_blocked=event_data.get('was_blocked', False)
                )
                
                # Log to standard logger as well
                self.logger.info(
                    f"WebSocket Event: {event_type}",
                    extra={
                        'audit_id': audit_log.id,
                        'user': context.user.email if context.user else 'Anonymous',
                        'connection_id': context.connection_id,
                        'is_suspicious': is_suspicious,
                        'risk_score': risk_score,
                    }
                )
                
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
    
    @database_sync_to_async
    def _create_connection_record(self, context: AuditContext, event_data: Dict):
        """Create connection audit record"""
        try:
            ConnectionAuditLog.objects.create(
                connection_id=context.connection_id or '',
                session_id=context.session_id or '',
                user=context.user,
                username=context.user.email if context.user else '',
                user_role=context.user.role if context.user else '',
                ip_address=context.ip_address,
                user_agent=context.user_agent or '',
                origin=context.origin or '',
                connection_data=event_data,
                is_suspicious=event_data.get('is_suspicious', False),
                was_blocked=event_data.get('was_blocked', False),
            )
        except Exception as e:
            logger.error(f"Failed to create connection record: {e}")
    
    @database_sync_to_async
    def _update_connection_record(self, context: AuditContext, event_data: Dict):
        """Update connection record on disconnect"""
        try:
            if not context.connection_id:
                return
            
            connection = ConnectionAuditLog.objects.filter(
                connection_id=context.connection_id
            ).first()
            
            if connection:
                connection.disconnected_at = timezone.now()
                connection.duration = connection.disconnected_at - connection.connected_at
                connection.disconnect_reason = event_data.get('reason', '')
                connection.save()
        except Exception as e:
            logger.error(f"Failed to update connection record: {e}")
    
    @database_sync_to_async
    def _update_connection_stats(self, connection_id: str, event_type: str, is_error: bool = False):
        """Update connection statistics"""
        try:
            connection = ConnectionAuditLog.objects.filter(
                connection_id=connection_id
            ).first()
            
            if connection:
                if event_type == WebSocketEventType.MESSAGE_SENT:
                    connection.messages_sent += 1
                elif event_type == WebSocketEventType.MESSAGE_RECEIVED:
                    connection.messages_received += 1
                
                if is_error:
                    connection.errors_count += 1
                
                connection.save()
        except Exception as e:
            logger.error(f"Failed to update connection stats: {e}")
    
    def _looks_encrypted(self, content: str) -> bool:
        """Simple heuristic to check if content looks encrypted"""
        if not content:
            return False
        
        # Check if it looks like base64 encoded data
        import re
        base64_pattern = re.compile(r'^[A-Za-z0-9+/]*={0,2}$')
        
        # If it's mostly base64 characters and reasonable length, might be encrypted
        if len(content) > 50 and base64_pattern.match(content):
            return True
        
        return False


class SecurityMonitor:
    """Real-time security monitoring for messaging"""
    
    def __init__(self):
        self.cache = cache
        self.auditor = WebSocketAuditor()
    
    async def check_connection_patterns(self, ip_address: str, user_id: Optional[int] = None):
        """Check for suspicious connection patterns"""
        patterns = []
        
        # Check connection frequency
        conn_count = await self._get_recent_connections(ip_address, minutes=10)
        if conn_count > 20:  # More than 20 connections in 10 minutes
            patterns.append({
                'pattern': 'high_connection_frequency',
                'severity': 'high',
                'details': f'{conn_count} connections in 10 minutes from {ip_address}'
            })
        
        # Check failed authentication attempts
        if user_id:
            auth_failures = await self._get_recent_auth_failures(user_id, minutes=5)
            if auth_failures > 5:
                patterns.append({
                    'pattern': 'repeated_auth_failures',
                    'severity': 'high',
                    'details': f'{auth_failures} authentication failures in 5 minutes'
                })
        
        return patterns
    
    async def check_message_patterns(self, user_id: int, content: str):
        """Check for suspicious message patterns"""
        patterns = []
        
        # Check message frequency
        msg_count = await self._get_recent_messages(user_id, minutes=1)
        if msg_count > 10:  # More than 10 messages per minute
            patterns.append({
                'pattern': 'high_message_frequency',
                'severity': 'medium',
                'details': f'{msg_count} messages in 1 minute'
            })
        
        # Check for repeated content
        if await self._is_repeated_content(user_id, content):
            patterns.append({
                'pattern': 'repeated_content',
                'severity': 'medium',
                'details': 'User sending repeated content'
            })
        
        return patterns
    
    @database_sync_to_async
    def _get_recent_connections(self, ip_address: str, minutes: int) -> int:
        """Get recent connection count for IP"""
        since = timezone.now() - timedelta(minutes=minutes)
        return ConnectionAuditLog.objects.filter(
            ip_address=ip_address,
            connected_at__gte=since
        ).count()
    
    @database_sync_to_async
    def _get_recent_auth_failures(self, user_id: int, minutes: int) -> int:
        """Get recent authentication failures for user"""
        since = timezone.now() - timedelta(minutes=minutes)
        return MessageAuditLog.objects.filter(
            user_id=user_id,
            event_type=WebSocketEventType.CONNECTION_FAILED,
            timestamp__gte=since
        ).count()
    
    @database_sync_to_async
    def _get_recent_messages(self, user_id: int, minutes: int) -> int:
        """Get recent message count for user"""
        since = timezone.now() - timedelta(minutes=minutes)
        return MessageAuditLog.objects.filter(
            user_id=user_id,
            event_type=WebSocketEventType.MESSAGE_SENT,
            timestamp__gte=since
        ).count()
    
    async def _is_repeated_content(self, user_id: int, content: str) -> bool:
        """Check if user is sending repeated content"""
        import hashlib
        content_hash = hashlib.sha256(content.encode()).hexdigest()
        
        # Check if this content hash was used recently by this user
        cache_key = f"msg_hash:{user_id}:{content_hash}"
        recent_use = await database_sync_to_async(self.cache.get)(cache_key)
        
        if recent_use:
            return True
        
        # Store this hash for 5 minutes
        await database_sync_to_async(self.cache.set)(cache_key, True, timeout=300)
        return False


# Global instances
websocket_auditor = WebSocketAuditor()
security_monitor = SecurityMonitor()


# Convenience functions
async def log_connection_opened(context: AuditContext, **kwargs):
    """Log connection opened event"""
    await websocket_auditor.log_connection_event(
        WebSocketEventType.CONNECTION_OPENED,
        context,
        kwargs
    )


async def log_connection_closed(context: AuditContext, **kwargs):
    """Log connection closed event"""
    await websocket_auditor.log_connection_event(
        WebSocketEventType.CONNECTION_CLOSED,
        context,
        kwargs
    )


async def log_message_sent(context: AuditContext, content: str, **kwargs):
    """Log message sent event"""
    await websocket_auditor.log_message_event(
        WebSocketEventType.MESSAGE_SENT,
        context,
        content,
        kwargs
    )


async def log_security_violation(context: AuditContext, description: str, **kwargs):
    """Log security violation"""
    await websocket_auditor.log_security_event(
        WebSocketEventType.CONTENT_BLOCKED,
        context,
        description,
        kwargs,
        severity=SecuritySeverity.HIGH,
        risk_score=70
    )