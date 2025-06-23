# backend/core/domains/bookingflow/apps.py
from django.apps import AppConfig


class BookingFlowConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.bookingflow'
    label = 'bookingflow'
    verbose_name = 'Booking Flow'