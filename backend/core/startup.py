"""
Startup tasks that run when the Django application starts.

NOTE: Automatic migrations have been REMOVED from this file to avoid
RuntimeWarnings about database access during app initialization.

Migrations now run explicitly via Railway's Custom Start Command:
  python manage.py migrate --no-input && \
  python manage.py seed_default_settings && \
  gunicorn -c gunicorn.conf.py core.wsgi:application

This approach is cleaner, more explicit, and avoids Django's warnings
about database access in AppConfig.ready().
"""
import logging

logger = logging.getLogger(__name__)


def initialize():
    """
    Run startup tasks when Django initializes.

    NOTE: This used to run automatic migrations, but that has been moved
    to an explicit pre-start command in Railway to avoid RuntimeWarnings
    and ensure proper initialization order.
    """
    logger.info("Django application initialized successfully")
    # Future startup tasks can be added here if needed