from django.apps import AppConfig


class MessagingConfig(AppConfig):
    """
    Django app configuration for the messaging domain.
    
    This app handles real-time messaging functionality using Django Channels
    for WebSocket support and Redis for message brokering.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.messaging'
    verbose_name = 'Messaging'
    
    def ready(self):
        """
        Initialize the messaging app when Django starts.
        Import signal handlers and perform any necessary setup.
        """
        # Import signal handlers when the app is ready
        try:
            from . import signals  # noqa
        except ImportError:
            pass