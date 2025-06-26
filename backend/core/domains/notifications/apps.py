# backend/core/domains/notifications/apps.py
from django.apps import AppConfig
from django.core.management import call_command


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.notifications'
    label = 'notifications'
    verbose_name = 'Notifications'
    
    def ready(self):
        # Import signal handlers when Django starts
        import core.domains.notifications.signals

        try:
                # Run the create_notification_types command
            call_command('create_notification_types', interactive=False)
        except Exception as e:
            print(f"Error running create_notification_types command: {e}")