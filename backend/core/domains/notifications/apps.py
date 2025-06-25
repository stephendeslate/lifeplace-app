# backend/core/domains/notifications/apps.py
from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.notifications'
    label = 'notifications'
    
    def ready(self):
        """Import signals when the app is ready"""
        import core.domains.notifications.signals