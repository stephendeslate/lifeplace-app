# backend/core/domains/notifications/apps.py
from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.notifications'
    label = 'notifications'
    verbose_name = 'Notifications'
    
    def ready(self):
        # Import signal handlers when Django starts
        import core.domains.notifications.signals