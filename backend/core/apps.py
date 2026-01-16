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

        NOTE: Automatic migrations have been moved to the deployment start command
        to avoid RuntimeWarnings about database access during app initialization.

        This hook now only runs lightweight initialization tasks.
        """
        # Import here to avoid circular imports
        try:
            from core import startup
            startup.initialize()
        except Exception as e:
            logger.error(f"Error during startup initialization: {e}")