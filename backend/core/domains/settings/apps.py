# backend/core/domains/settings/apps.py

from django.apps import AppConfig


class SettingsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.settings'
    verbose_name = 'Settings'

    def ready(self):
        # Import signals to ensure they're registered
        try:
            from . import signals  # noqa: F401
        except ImportError:
            pass