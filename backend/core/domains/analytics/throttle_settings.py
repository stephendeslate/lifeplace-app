# backend/core/domains/analytics/throttle_settings.py
"""
Throttling configuration for analytics endpoints.
Add these settings to your Django settings.py file:

REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        # Analytics-specific rates
        'analytics': '1000/hour',           # General analytics endpoints
        'public_tracking': '100/hour',      # Public tracking endpoint 
        'admin_analytics': '2000/hour',     # Admin analytics endpoints
        
        # Global rates (if not already set)
        'anon': '100/hour',
        'user': '1000/hour',
    }
}

# Security logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'analytics_security': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': 'analytics_security.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'core.domains.analytics.security': {
            'handlers': ['analytics_security'],
            'level': 'ERROR',
            'propagate': True,
        },
    },
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
}

# Cache configuration for rate limiting
CACHES = {
    'default': {
        # Your existing cache configuration
    }
}
"""

# Recommended throttle rates
ANALYTICS_THROTTLE_RATES = {
    'analytics': '1000/hour',
    'public_tracking': '100/hour', 
    'admin_analytics': '2000/hour',
}