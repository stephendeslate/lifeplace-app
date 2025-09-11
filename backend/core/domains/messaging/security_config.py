"""
Security Configuration for WebSocket Messaging
Central configuration and integration point for all security components
"""

from django.conf import settings
from .auth import JWTAuthMiddlewareStack
from .security_middleware import SecurityMiddleware as SecurityValidationMiddleware


# WebSocket Security Configuration
WEBSOCKET_SECURITY_SETTINGS = {
    # Authentication settings
    'JWT_AUTH_ENABLED': True,
    'ALLOW_ANONYMOUS_CONNECTIONS': getattr(settings, 'WS_ALLOW_ANONYMOUS', False),
    'TOKEN_SOURCES': ['query_param', 'header', 'subprotocol'],
    
    # Rate limiting settings
    'RATE_LIMITING_ENABLED': getattr(settings, 'WS_RATE_LIMITING_ENABLED', True),
    'MESSAGES_PER_MINUTE': getattr(settings, 'WS_MESSAGES_PER_MINUTE', 10),
    'CONNECTIONS_PER_HOUR': getattr(settings, 'WS_CONNECTIONS_PER_HOUR', 100),
    'BURST_LIMIT': getattr(settings, 'WS_BURST_LIMIT', 5),
    'BURST_WINDOW_SECONDS': getattr(settings, 'WS_BURST_WINDOW', 10),
    
    # Connection limits
    'MAX_CONNECTIONS_PER_IP': getattr(settings, 'WS_MAX_CONNECTIONS_PER_IP', 10),
    'MAX_CONNECTIONS_PER_USER': getattr(settings, 'WS_MAX_CONNECTIONS_PER_USER', 5),
    'CONNECTION_TIMEOUT_SECONDS': getattr(settings, 'WS_CONNECTION_TIMEOUT', 3600),
    
    # Content validation settings
    'CONTENT_FILTERS_ENABLED': getattr(settings, 'WS_CONTENT_FILTERS_ENABLED', True),
    'MAX_MESSAGE_LENGTH': getattr(settings, 'MAX_MESSAGE_LENGTH', 5000),
    'MAX_URLS_PER_MESSAGE': getattr(settings, 'WS_MAX_URLS_PER_MESSAGE', 3),
    'MAX_MENTIONS_PER_MESSAGE': getattr(settings, 'WS_MAX_MENTIONS_PER_MESSAGE', 5),
    
    # Encryption settings
    'MESSAGE_ENCRYPTION_ENABLED': getattr(settings, 'MESSAGE_ENCRYPTION_ENABLED', True),
    'ENCRYPT_ALL_MESSAGES': getattr(settings, 'ENCRYPT_ALL_MESSAGES', False),
    'ENCRYPTION_KEY_ROTATION_DAYS': getattr(settings, 'ENCRYPTION_KEY_ROTATION_DAYS', 90),
    
    # Audit logging settings
    'AUDIT_LOGGING_ENABLED': getattr(settings, 'WS_AUDIT_LOGGING_ENABLED', True),
    'LOG_MESSAGE_CONTENT': getattr(settings, 'WS_LOG_MESSAGE_CONTENT', False),
    'LOG_CONNECTION_DETAILS': getattr(settings, 'WS_LOG_CONNECTION_DETAILS', True),
    'AUDIT_LOG_RETENTION_DAYS': getattr(settings, 'WS_AUDIT_LOG_RETENTION_DAYS', 90),
    
    # Security monitoring
    'SECURITY_MONITORING_ENABLED': getattr(settings, 'WS_SECURITY_MONITORING_ENABLED', True),
    'ALERT_ON_SUSPICIOUS_ACTIVITY': getattr(settings, 'WS_ALERT_ON_SUSPICIOUS_ACTIVITY', True),
    'BLOCK_SUSPICIOUS_CONNECTIONS': getattr(settings, 'WS_BLOCK_SUSPICIOUS_CONNECTIONS', True),
    
    # Health checks
    'HEALTH_CHECK_ENABLED': getattr(settings, 'WS_HEALTH_CHECK_ENABLED', True),
    'HEALTH_CHECK_INTERVAL_MINUTES': getattr(settings, 'WS_HEALTH_CHECK_INTERVAL', 5),
}


def get_security_middleware_stack():
    """
    Get the complete security middleware stack for WebSocket connections
    
    Returns:
        Middleware stack with all security components
    """
    # Build middleware stack from inside out
    # Order matters: authentication -> validation -> rate limiting
    
    def SecurityStack(inner):
        # Apply security validation middleware
        stack = SecurityValidationMiddleware(inner)
        
        # Apply JWT authentication middleware
        stack = JWTAuthMiddlewareStack(stack)
        
        return stack
    
    return SecurityStack


def validate_security_configuration():
    """
    Validate that security configuration is properly set up
    
    Returns:
        Dict with validation results
    """
    issues = []
    warnings = []
    
    # Check required settings
    required_settings = [
        ('SECRET_KEY', 'Django secret key'),
        ('FIELD_ENCRYPTION_KEY', 'Field encryption key'),
    ]
    
    for setting_name, description in required_settings:
        if not getattr(settings, setting_name, None):
            issues.append(f"Missing required setting: {setting_name} ({description})")
    
    # Check security-related settings
    if not getattr(settings, 'JWT_SIGNING_KEY', None) and not settings.DEBUG:
        warnings.append("JWT_SIGNING_KEY not set, using SECRET_KEY in production")
    
    if getattr(settings, 'DEBUG', False):
        warnings.append("DEBUG mode is enabled - not suitable for production")
    
    if not getattr(settings, 'HTTPS_ONLY', False) and not settings.DEBUG:
        warnings.append("HTTPS not enforced - WebSocket connections may be insecure")
    
    # Check database configuration
    databases = getattr(settings, 'DATABASES', {})
    if not databases or 'default' not in databases:
        issues.append("Database configuration missing")
    
    # Check cache configuration
    caches = getattr(settings, 'CACHES', {})
    if not caches or 'default' not in caches:
        warnings.append("Cache configuration missing - rate limiting may not work")
    
    # Check channels configuration
    channel_layers = getattr(settings, 'CHANNEL_LAYERS', {})
    if not channel_layers or 'default' not in channel_layers:
        issues.append("CHANNEL_LAYERS configuration missing")
    
    return {
        'valid': len(issues) == 0,
        'issues': issues,
        'warnings': warnings,
        'security_level': _assess_security_level(issues, warnings)
    }


def _assess_security_level(issues, warnings):
    """Assess overall security level based on configuration"""
    if issues:
        return 'CRITICAL'
    elif len(warnings) > 3:
        return 'LOW'
    elif len(warnings) > 1:
        return 'MEDIUM'
    else:
        return 'HIGH'


def get_security_headers():
    """
    Get security headers for WebSocket connections
    
    Returns:
        Dict of security headers
    """
    return {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
    }


def get_cors_settings():
    """
    Get CORS settings for WebSocket connections
    
    Returns:
        Dict of CORS settings
    """
    if settings.DEBUG:
        # Development CORS settings
        return {
            'CORS_ALLOWED_ORIGINS': [
                'http://localhost:5173',
                'http://localhost:5174',
                'http://127.0.0.1:5173',
                'http://127.0.0.1:5174',
            ],
            'CORS_ALLOW_CREDENTIALS': True,
            'CORS_ALLOW_ALL_ORIGINS': False,
        }
    else:
        # Production CORS settings
        allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        return {
            'CORS_ALLOWED_ORIGINS': allowed_origins,
            'CORS_ALLOW_CREDENTIALS': True,
            'CORS_ALLOW_ALL_ORIGINS': False,
        }


# Security feature flags
SECURITY_FEATURES = {
    'JWT_AUTHENTICATION': True,
    'RATE_LIMITING': WEBSOCKET_SECURITY_SETTINGS['RATE_LIMITING_ENABLED'],
    'CONTENT_VALIDATION': WEBSOCKET_SECURITY_SETTINGS['CONTENT_FILTERS_ENABLED'],
    'MESSAGE_ENCRYPTION': WEBSOCKET_SECURITY_SETTINGS['MESSAGE_ENCRYPTION_ENABLED'],
    'AUDIT_LOGGING': WEBSOCKET_SECURITY_SETTINGS['AUDIT_LOGGING_ENABLED'],
    'SECURITY_MONITORING': WEBSOCKET_SECURITY_SETTINGS['SECURITY_MONITORING_ENABLED'],
    'HEALTH_CHECKS': WEBSOCKET_SECURITY_SETTINGS['HEALTH_CHECK_ENABLED'],
}


def is_feature_enabled(feature_name: str) -> bool:
    """
    Check if a security feature is enabled
    
    Args:
        feature_name: Name of the security feature
        
    Returns:
        True if feature is enabled, False otherwise
    """
    return SECURITY_FEATURES.get(feature_name, False)


def get_security_summary():
    """
    Get a summary of the security configuration
    
    Returns:
        Dict with security configuration summary
    """
    config_validation = validate_security_configuration()
    
    return {
        'security_level': config_validation['security_level'],
        'configuration_valid': config_validation['valid'],
        'features_enabled': {k: v for k, v in SECURITY_FEATURES.items() if v},
        'features_disabled': {k: v for k, v in SECURITY_FEATURES.items() if not v},
        'settings': {
            'debug_mode': settings.DEBUG,
            'rate_limiting': WEBSOCKET_SECURITY_SETTINGS['RATE_LIMITING_ENABLED'],
            'content_filtering': WEBSOCKET_SECURITY_SETTINGS['CONTENT_FILTERS_ENABLED'],
            'encryption': WEBSOCKET_SECURITY_SETTINGS['MESSAGE_ENCRYPTION_ENABLED'],
            'audit_logging': WEBSOCKET_SECURITY_SETTINGS['AUDIT_LOGGING_ENABLED'],
        },
        'limits': {
            'messages_per_minute': WEBSOCKET_SECURITY_SETTINGS['MESSAGES_PER_MINUTE'],
            'connections_per_hour': WEBSOCKET_SECURITY_SETTINGS['CONNECTIONS_PER_HOUR'],
            'max_message_length': WEBSOCKET_SECURITY_SETTINGS['MAX_MESSAGE_LENGTH'],
            'connection_timeout': WEBSOCKET_SECURITY_SETTINGS['CONNECTION_TIMEOUT_SECONDS'],
        },
        'issues': config_validation['issues'],
        'warnings': config_validation['warnings'],
    }


# Development helpers
def get_development_overrides():
    """
    Get security setting overrides for development
    
    Returns:
        Dict of development overrides
    """
    if not settings.DEBUG:
        return {}
    
    return {
        'RATE_LIMITING_ENABLED': False,  # Disable rate limiting in development
        'CONTENT_FILTERS_ENABLED': False,  # Disable content filtering for testing
        'ALLOW_ANONYMOUS_CONNECTIONS': True,  # Allow anonymous for testing
        'MESSAGES_PER_MINUTE': 999999,  # Very high limits
        'CONNECTIONS_PER_HOUR': 999999,
        'LOG_MESSAGE_CONTENT': True,  # Enable verbose logging
    }


def apply_development_overrides():
    """Apply development overrides to security settings"""
    if settings.DEBUG:
        overrides = get_development_overrides()
        WEBSOCKET_SECURITY_SETTINGS.update(overrides)


# Apply development overrides if in debug mode
if settings.DEBUG:
    apply_development_overrides()


# Export main configuration
__all__ = [
    'WEBSOCKET_SECURITY_SETTINGS',
    'SECURITY_FEATURES',
    'get_security_middleware_stack',
    'validate_security_configuration',
    'get_security_headers',
    'get_cors_settings',
    'is_feature_enabled',
    'get_security_summary',
]