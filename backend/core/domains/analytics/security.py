# backend/core/domains/analytics/security.py
import logging
import re
from typing import Dict, Any, Optional
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


class SecurityValidator:
    """Security validation utilities for analytics endpoints"""
    
    # Suspicious patterns that might indicate attacks
    SUSPICIOUS_PATTERNS = [
        # SQL injection patterns
        r'(\bunion\b|\bselect\b|\bfrom\b|\bwhere\b|\binsert\b|\bdelete\b|\bdrop\b)',
        # Script injection patterns
        r'(<script|<iframe|<object|<embed|javascript:|data:)',
        # Path traversal patterns
        r'(\.\./|\.\.\x5c)',
        # Command injection patterns
        r'(\||\&\&|\;|\`)',
    ]
    
    @staticmethod
    def validate_event_data(event_data: Dict[str, Any]) -> bool:
        """
        Validate event data for potential security threats
        """
        if not isinstance(event_data, dict):
            return False
        
        # Check data size (prevent large payloads)
        if len(str(event_data)) > 10000:  # 10KB limit
            logger.warning("Event data exceeds size limit")
            return False
        
        # Check for suspicious patterns in values
        for key, value in event_data.items():
            if not SecurityValidator._is_safe_string(str(key)):
                logger.warning(f"Suspicious key detected: {key}")
                return False
            
            if isinstance(value, str) and not SecurityValidator._is_safe_string(value):
                logger.warning(f"Suspicious value detected in key {key}: {value}")
                return False
        
        return True
    
    @staticmethod
    def _is_safe_string(text: str) -> bool:
        """Check if a string contains suspicious patterns"""
        for pattern in SecurityValidator.SUSPICIOUS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return False
        return True
    
    @staticmethod
    def validate_session_id(session_id: Optional[str]) -> bool:
        """Validate session ID format"""
        if not session_id:
            return True  # Optional field
        
        # Session ID should be alphanumeric with dashes/underscores, reasonable length
        if not re.match(r'^[a-zA-Z0-9_-]{1,128}$', session_id):
            logger.warning(f"Invalid session ID format: {session_id}")
            return False
        
        return True
    
    @staticmethod
    def check_rate_limit(ip_address: str, endpoint: str, limit: int = 100, window: int = 3600) -> bool:
        """
        Custom rate limiting with cache
        """
        cache_key = f"rate_limit:{endpoint}:{ip_address}"
        current_count = cache.get(cache_key, 0)
        
        if current_count >= limit:
            logger.warning(f"Rate limit exceeded for IP {ip_address} on endpoint {endpoint}")
            return False
        
        # Increment counter
        cache.set(cache_key, current_count + 1, window)
        return True


class DataSanitizer:
    """Sanitize data before storing in analytics"""
    
    @staticmethod
    def sanitize_event_data(event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize event data by removing/cleaning suspicious content"""
        if not isinstance(event_data, dict):
            return {}
        
        sanitized = {}
        for key, value in event_data.items():
            # Sanitize key
            safe_key = DataSanitizer._sanitize_string(str(key))
            if safe_key:
                # Sanitize value
                if isinstance(value, str):
                    safe_value = DataSanitizer._sanitize_string(value)
                    if safe_value:
                        sanitized[safe_key] = safe_value
                elif isinstance(value, (int, float, bool)):
                    sanitized[safe_key] = value
                elif isinstance(value, dict):
                    # Recursively sanitize nested dicts (limited depth)
                    sanitized[safe_key] = DataSanitizer.sanitize_event_data(value)
        
        return sanitized
    
    @staticmethod
    def _sanitize_string(text: str, max_length: int = 1000) -> str:
        """Remove suspicious content from strings"""
        if not text:
            return ""
        
        # Truncate if too long
        text = text[:max_length]
        
        # Remove suspicious patterns
        for pattern in SecurityValidator.SUSPICIOUS_PATTERNS:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Remove control characters except common ones
        text = re.sub(r'[^\x20-\x7E\n\r\t]', '', text)
        
        return text.strip()
    
    @staticmethod
    def sanitize_ip_address(ip_address: Optional[str]) -> Optional[str]:
        """Sanitize and validate IP address"""
        if not ip_address:
            return None
        
        # Simple IP validation (both IPv4 and IPv6)
        ip_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$'
        
        if re.match(ip_pattern, ip_address):
            return ip_address
        
        # If not valid IP, return None rather than storing invalid data
        logger.warning(f"Invalid IP address format: {ip_address}")
        return None


class AuditLogger:
    """Security audit logging for analytics domain"""
    
    @staticmethod
    def log_suspicious_activity(request, endpoint: str, reason: str, details: Dict[str, Any] = None):
        """Log suspicious activity for security monitoring"""
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        user_id = request.user.id if request.user.is_authenticated else None
        
        log_data = {
            'timestamp': timezone.now().isoformat(),
            'ip_address': ip_address,
            'user_agent': user_agent,
            'user_id': user_id,
            'endpoint': endpoint,
            'reason': reason,
            'details': details or {}
        }
        
        logger.error(f"SECURITY_ALERT: {reason}", extra=log_data)
    
    @staticmethod
    def log_data_access(request, resource_type: str, resource_id: Any, action: str):
        """Log data access for compliance and auditing"""
        ip_address = request.META.get('REMOTE_ADDR')
        user_id = request.user.id if request.user.is_authenticated else None
        
        log_data = {
            'timestamp': timezone.now().isoformat(),
            'ip_address': ip_address,
            'user_id': user_id,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'action': action
        }
        
        logger.info(f"DATA_ACCESS: {action} {resource_type} {resource_id}", extra=log_data)