# backend/core/domains/bookingflow/apps.py
from django.apps import AppConfig


class BookingflowConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.bookingflow'
    verbose_name = 'Booking Flow'
    
    def ready(self):
        """Initialize the bookingflow app"""
        try:
            # Import signals to ensure they are registered
            import core.domains.bookingflow.signals
        except ImportError:
            pass