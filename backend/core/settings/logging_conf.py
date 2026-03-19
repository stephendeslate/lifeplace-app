# backend/core/settings/logging_conf.py
"""
Django logging configuration.
"""
from .base import DEBUG

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
        "communications": {
            "format": "📧 {asctime} - {message}",
            "style": "{",
        },
        "products": {
            "format": "🛍️ {asctime} - {message}",
            "style": "{",
        },
        "security": {
            "format": "🔒 SECURITY {asctime} {levelname} {message}",
            "style": "{",
        },
        "notifications": {
            "format": "🔔 {asctime} - {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        "communications_console": {
            "class": "logging.StreamHandler",
            "formatter": "communications",
        },
        "products_console": {
            "class": "logging.StreamHandler",
            "formatter": "products",
        },
        "security_console": {
            "class": "logging.StreamHandler",
            "formatter": "security",
            "level": "INFO",
        },
        "notifications_console": {
            "class": "logging.StreamHandler",
            "formatter": "notifications",
        },
    },
    "loggers": {
        "core.domains.communications": {
            "handlers": ["communications_console"],
            "level": "INFO",
            "propagate": False,
        },
        "core.domains.products": {
            "handlers": ["products_console"],
            "level": "INFO",
            "propagate": False,
        },
        "core.domains.users": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
        "security": {
            "handlers": ["security_console"],
            "level": "INFO",
            "propagate": False,
        },
        "core.domains.notifications": {
            "handlers": ["notifications_console"],
            "level": "INFO",
            "propagate": False,
        },
        "core.utils.security_logging": {
            "handlers": ["security_console"],
            "level": "INFO",
            "propagate": False,
        },
        "": {  # Root logger
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

if DEBUG:
    LOGGING["loggers"]["core.domains.communications"]["level"] = "DEBUG"
    LOGGING["loggers"]["core.domains.products"]["level"] = "DEBUG"
    LOGGING["loggers"]["core.domains.notifications"]["level"] = "DEBUG"
    LOGGING["loggers"][""]["level"] = "INFO"
