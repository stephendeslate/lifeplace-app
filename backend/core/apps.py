from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = 'Core Application'
    
    def ready(self):
        """
        Run startup tasks when Django is ready.
        """
        # Import here to avoid circular imports
        try:
            from core import startup
            startup.initialize()
        except Exception as e:
            logger.error(f"Error during startup initialization: {e}")