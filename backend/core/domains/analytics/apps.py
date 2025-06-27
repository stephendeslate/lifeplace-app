# backend/core/domains/analytics/apps.py
from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.analytics'
    verbose_name = 'Analytics'
    
    def ready(self):
        """Import signals when the app is ready"""
        try:
            # Import the signals package - this will register all signal handlers
            import core.domains.analytics.signals
        except ImportError:
            pass