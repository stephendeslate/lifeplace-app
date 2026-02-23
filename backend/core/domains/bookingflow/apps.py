# backend/core/domains/bookingflow/apps.py
from django.apps import AppConfig


class BookingflowConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core.domains.bookingflow"
    verbose_name = "Booking Flow"

    def ready(self):
        pass
