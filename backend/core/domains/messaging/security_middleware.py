"""
Security Middleware for WebSocket Messaging
Provides rate limiting, content validation, and abuse prevention
"""

import json
import re
import time
import hashlib
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
from dataclasses import dataclass

from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model

from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from channels.exceptions import DenyConnection

from core.utils.security_logging import SecurityLogger, SecurityEventType, SecuritySeverity

User = get_user_model()
logger = logging.getLogger(__name__)
security_logger = SecurityLogger()


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting"""
    messages_per_minute: int = 10
    connections_per_hour: int = 100
    burst_limit: int = 5
    burst_window: int = 10  # seconds
    
    
@dataclass
class SecurityConfig:
    """Configuration for security settings"""
    max_message_length: int = 5000
    max_connections_per_ip: int = 10
    max_connections_per_user: int = 5
    connection_timeout: int = 3600  # 1 hour
    content_filters_enabled: bool = True
    rate_limiting_enabled: bool = True


class MessageContentValidator:
    """Validates message content for security threats"""
    
    def __init__(self):
        # Common patterns for malicious content
        self.suspicious_patterns = [
            r'<script[^>]*>.*?</script>',  # XSS scripts
            r'javascript:',  # JavaScript URLs
            r'data:text/html',  # Data URLs with HTML
            r'<iframe[^>]*>',  # Iframes
            r'<object[^>]*>',  # Objects
            r'<embed[^>]*>',  # Embeds
            r'on\w+\s*=',  # Event handlers (onclick, onload, etc.)
            r'eval\s*\(',  # eval() calls
            r'expression\s*\(',  # CSS expressions
        ]
        
        # Compile patterns for better performance
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.suspicious_patterns]
        
        # Spam detection patterns
        self.spam_patterns = [
            r'(.)\1{10,}',  # Repeated characters
            r'[A-Z]{10,}',  # All caps
            r'(\b\w+\b)(\s+\1){5,}',  # Repeated words
        ]
        self.spam_compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.spam_patterns]
    
    def validate_content(self, content: str, user=None) -> Tuple[bool, List[str]]:
        """
        Validate message content
        
        Returns:
            Tuple of (is_valid, list_of_violations)
        """
        violations = []
        
        if not content:
            return True, []
        
        # Check message length
        max_length = getattr(settings, 'MAX_MESSAGE_LENGTH', 5000)
        if len(content) > max_length:
            violations.append(f"Message too long: {len(content)} > {max_length}")
        
        # Check for malicious patterns
        for pattern in self.compiled_patterns:
            if pattern.search(content):
                violations.append(f"Suspicious content pattern detected: {pattern.pattern}")
        
        # Check for spam patterns
        spam_score = 0
        for pattern in self.spam_compiled_patterns:
            if pattern.search(content):
                spam_score += 1
                violations.append(f"Spam pattern detected: {pattern.pattern}")
        
        # Overall spam assessment
        if spam_score >= 2:
            violations.append("High spam score detected")
        
        # Check for excessive URLs
        url_count = len(re.findall(r'https?://\S+', content))
        if url_count > 3:
            violations.append(f"Too many URLs: {url_count}")
        
        # Check for excessive mentions (if using @mention format)
        mention_count = len(re.findall(r'@\w+', content))
        if mention_count > 5:
            violations.append(f"Too many mentions: {mention_count}")
        
        is_valid = len(violations) == 0
        
        # Log validation results if violations found
        if violations and user:
            self._log_content_violation(content, violations, user)
        
        return is_valid, violations
    
    @database_sync_to_async
    def _log_content_violation(self, content: str, violations: List[str], user):
        """Log content validation violations"""
        security_logger.log_event(
            event_type=SecurityEventType.SUSPICIOUS_ACTIVITY,
            description=f"Message content violation by {user.email if user else 'Unknown'}",
            user=user,
            severity=SecuritySeverity.MEDIUM,
            details={
                'violations': violations,
                'content_length': len(content),
                'content_sample': content[:100] + '...' if len(content) > 100 else content,
                'validation_timestamp': timezone.now().isoformat(),
            },
            risk_score=60
        )


class RateLimiter:
    """Rate limiter for WebSocket connections and messages"""
    
    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.cache = cache
    
    async def check_connection_rate(self, identifier: str) -> bool:
        """Check if connection rate limit is exceeded"""
        key = f"ws_conn_rate:{identifier}"
        current_hour = int(time.time() // 3600)
        cache_key = f"{key}:{current_hour}"
        
        current_count = await database_sync_to_async(self.cache.get)(cache_key, 0)
        
        if current_count >= self.config.connections_per_hour:
            await self._log_rate_limit_violation(identifier, 'connection', current_count)
            return False
        
        # Increment counter
        await database_sync_to_async(self.cache.set)(
            cache_key, 
            current_count + 1, 
            timeout=3600
        )
        
        return True
    
    async def check_message_rate(self, identifier: str) -> bool:
        """Check if message rate limit is exceeded"""
        # Check burst limit (short-term)
        burst_key = f"ws_msg_burst:{identifier}"
        current_time = int(time.time())
        burst_window_start = current_time - self.config.burst_window
        
        # Get recent messages in burst window
        burst_messages = await self._get_recent_messages(burst_key, burst_window_start)
        
        if len(burst_messages) >= self.config.burst_limit:
            await self._log_rate_limit_violation(identifier, 'burst', len(burst_messages))
            return False
        
        # Check per-minute limit
        minute_key = f"ws_msg_rate:{identifier}"
        current_minute = int(time.time() // 60)
        cache_key = f"{minute_key}:{current_minute}"
        
        current_count = await database_sync_to_async(self.cache.get)(cache_key, 0)
        
        if current_count >= self.config.messages_per_minute:
            await self._log_rate_limit_violation(identifier, 'minute', current_count)
            return False
        
        # Record this message
        await self._record_message(burst_key, current_time)
        await database_sync_to_async(self.cache.set)(
            cache_key, 
            current_count + 1, 
            timeout=60
        )
        
        return True
    
    async def _get_recent_messages(self, key: str, since: int) -> List[int]:
        """Get recent message timestamps"""
        messages = await database_sync_to_async(self.cache.get)(key, [])
        # Filter messages within window
        return [msg for msg in messages if msg >= since]
    
    async def _record_message(self, key: str, timestamp: int):
        """Record message timestamp"""
        messages = await database_sync_to_async(self.cache.get)(key, [])
        messages.append(timestamp)
        
        # Keep only recent messages (last 2 minutes for safety)
        cutoff = timestamp - 120
        messages = [msg for msg in messages if msg >= cutoff]
        
        await database_sync_to_async(self.cache.set)(key, messages, timeout=300)
    
    @database_sync_to_async
    def _log_rate_limit_violation(self, identifier: str, limit_type: str, count: int):
        """Log rate limit violations"""
        security_logger.log_event(
            event_type=SecurityEventType.RATE_LIMIT_EXCEEDED,
            description=f"Rate limit exceeded: {limit_type} for {identifier}",
            severity=SecuritySeverity.MEDIUM,
            details={
                'identifier': identifier,
                'limit_type': limit_type,
                'count': count,
                'config': {
                    'messages_per_minute': self.config.messages_per_minute,
                    'connections_per_hour': self.config.connections_per_hour,
                    'burst_limit': self.config.burst_limit,
                },
                'timestamp': timezone.now().isoformat(),
            },
            risk_score=50
        )


class ConnectionTracker:
    """Tracks active WebSocket connections"""
    
    def __init__(self):
        self.cache = cache
        self.connection_timeout = getattr(settings, 'WS_CONNECTION_TIMEOUT', 3600)
    
    async def register_connection(self, identifier: str, connection_info: Dict):
        """Register a new connection"""
        key = f"ws_connections:{identifier}"
        connections = await database_sync_to_async(self.cache.get)(key, {})
        
        connection_id = self._generate_connection_id(connection_info)
        connections[connection_id] = {
            'timestamp': time.time(),
            'info': connection_info
        }
        
        # Clean up old connections
        current_time = time.time()
        connections = {
            cid: conn for cid, conn in connections.items()
            if current_time - conn['timestamp'] < self.connection_timeout
        }
        
        await database_sync_to_async(self.cache.set)(
            key, 
            connections, 
            timeout=self.connection_timeout + 300
        )
        
        return connection_id
    
    async def unregister_connection(self, identifier: str, connection_id: str):
        """Unregister a connection"""
        key = f"ws_connections:{identifier}"
        connections = await database_sync_to_async(self.cache.get)(key, {})
        
        if connection_id in connections:
            del connections[connection_id]
            await database_sync_to_async(self.cache.set)(
                key, 
                connections, 
                timeout=self.connection_timeout + 300
            )
    
    async def get_connection_count(self, identifier: str) -> int:
        """Get current connection count for identifier"""
        key = f"ws_connections:{identifier}"
        connections = await database_sync_to_async(self.cache.get)(key, {})
        
        # Clean up expired connections
        current_time = time.time()
        active_connections = {
            cid: conn for cid, conn in connections.items()
            if current_time - conn['timestamp'] < self.connection_timeout
        }
        
        if len(active_connections) != len(connections):
            await database_sync_to_async(self.cache.set)(
                key, 
                active_connections, 
                timeout=self.connection_timeout + 300
            )
        
        return len(active_connections)
    
    def _generate_connection_id(self, connection_info: Dict) -> str:
        """Generate unique connection ID"""
        info_str = json.dumps(connection_info, sort_keys=True)
        return hashlib.md5(f"{info_str}:{time.time()}".encode()).hexdigest()


class SecurityMiddleware(BaseMiddleware):
    """
    Main security middleware for WebSocket connections
    Provides rate limiting, validation, and abuse prevention
    """
    
    def __init__(self, inner):
        super().__init__(inner)
        
        # Initialize components
        self.rate_limit_config = RateLimitConfig(
            messages_per_minute=getattr(settings, 'WS_MESSAGES_PER_MINUTE', 10),
            connections_per_hour=getattr(settings, 'WS_CONNECTIONS_PER_HOUR', 100),
            burst_limit=getattr(settings, 'WS_BURST_LIMIT', 5),
            burst_window=getattr(settings, 'WS_BURST_WINDOW', 10),
        )
        
        self.security_config = SecurityConfig(
            max_message_length=getattr(settings, 'MAX_MESSAGE_LENGTH', 5000),
            max_connections_per_ip=getattr(settings, 'WS_MAX_CONNECTIONS_PER_IP', 10),
            max_connections_per_user=getattr(settings, 'WS_MAX_CONNECTIONS_PER_USER', 5),
            content_filters_enabled=getattr(settings, 'WS_CONTENT_FILTERS_ENABLED', True),
            rate_limiting_enabled=getattr(settings, 'WS_RATE_LIMITING_ENABLED', True),
        )
        
        self.rate_limiter = RateLimiter(self.rate_limit_config)
        self.content_validator = MessageContentValidator()
        self.connection_tracker = ConnectionTracker()
    
    async def __call__(self, scope, receive, send):
        # Extract client information
        client_info = scope.get('client_info', {})
        user = scope.get('user')
        
        # Check connection limits if enabled
        if self.security_config.rate_limiting_enabled:
            # Check IP-based connection limit
            ip_address = client_info.get('ip_address')
            if ip_address:
                ip_connections = await self.connection_tracker.get_connection_count(f"ip:{ip_address}")
                if ip_connections >= self.security_config.max_connections_per_ip:
                    await self._log_security_violation(
                        'connection_limit_ip',
                        f"Too many connections from IP: {ip_address}",
                        client_info,
                        user
                    )
                    raise DenyConnection("Too many connections from this IP")
                
                # Check connection rate limit
                if not await self.rate_limiter.check_connection_rate(f"ip:{ip_address}"):
                    raise DenyConnection("Connection rate limit exceeded")
            
            # Check user-based connection limit
            if user and not user.is_anonymous:
                user_connections = await self.connection_tracker.get_connection_count(f"user:{user.id}")
                if user_connections >= self.security_config.max_connections_per_user:
                    await self._log_security_violation(
                        'connection_limit_user',
                        f"Too many connections for user: {user.email}",
                        client_info,
                        user
                    )
                    raise DenyConnection("Too many connections for this user")
        
        # Register connection
        connection_id = await self.connection_tracker.register_connection(
            f"ip:{ip_address}" if ip_address else "unknown",
            client_info
        )
        
        if user and not user.is_anonymous:
            user_connection_id = await self.connection_tracker.register_connection(
                f"user:{user.id}",
                client_info
            )
            scope['user_connection_id'] = user_connection_id
        
        scope['connection_id'] = connection_id
        scope['security_middleware'] = self
        
        try:
            return await super().__call__(scope, receive, send)
        finally:
            # Cleanup connections
            await self.connection_tracker.unregister_connection(
                f"ip:{ip_address}" if ip_address else "unknown",
                connection_id
            )
            
            if user and not user.is_anonymous:
                user_connection_id = scope.get('user_connection_id')
                if user_connection_id:
                    await self.connection_tracker.unregister_connection(
                        f"user:{user.id}",
                        user_connection_id
                    )
    
    async def validate_message(self, message_data: Dict[str, Any], user=None, client_info=None) -> bool:
        """
        Validate incoming message
        
        Returns:
            True if message is valid, False otherwise
        """
        # Check rate limits
        if self.security_config.rate_limiting_enabled:
            # Check user-based rate limit
            if user and not user.is_anonymous:
                if not await self.rate_limiter.check_message_rate(f"user:{user.id}"):
                    await self._log_security_violation(
                        'message_rate_limit',
                        f"Message rate limit exceeded for user: {user.email}",
                        client_info or {},
                        user
                    )
                    return False
            
            # Check IP-based rate limit
            if client_info and client_info.get('ip_address'):
                if not await self.rate_limiter.check_message_rate(f"ip:{client_info['ip_address']}"):
                    await self._log_security_violation(
                        'message_rate_limit_ip',
                        f"Message rate limit exceeded for IP: {client_info['ip_address']}",
                        client_info,
                        user
                    )
                    return False
        
        # Validate message content
        if self.security_config.content_filters_enabled:
            content = message_data.get('content', '')
            if content:
                is_valid, violations = self.content_validator.validate_content(content, user)
                if not is_valid:
                    await self._log_security_violation(
                        'content_violation',
                        f"Content validation failed: {', '.join(violations)}",
                        client_info or {},
                        user
                    )
                    return False
        
        return True
    
    @database_sync_to_async
    def _log_security_violation(self, violation_type: str, description: str, client_info: Dict, user=None):
        """Log security violations"""
        security_logger.log_event(
            event_type=SecurityEventType.SUSPICIOUS_ACTIVITY,
            description=description,
            user=user,
            severity=SecuritySeverity.HIGH,
            details={
                'violation_type': violation_type,
                'client_info': client_info,
                'timestamp': timezone.now().isoformat(),
                'middleware': 'SecurityMiddleware',
            },
            risk_score=70
        )