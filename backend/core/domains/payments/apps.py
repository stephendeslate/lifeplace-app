# backend/core/domains/payments/apps.py
from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.payments'
    label = 'payments'
    verbose_name = 'Payments'
    
    def ready(self):
        """Connect cache invalidation signals when app is ready"""
        try:
            from . import signals
            signals.connect_payments_signals()
        except ImportError:
            pass