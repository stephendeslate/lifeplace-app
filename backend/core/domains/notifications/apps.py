# backend/core/domains/notifications/apps.py
from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core.domains.notifications"
    label = "notifications"

    def ready(self):
        """Import and connect all notification signals when the app is ready"""
        try:
            # Import signals to register them
            from .signals import connect_all_signals

            # Connect all signals
            connect_all_signals()

        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Failed to connect notification signals: {e!s}")
            # Don't raise to avoid breaking app startup
