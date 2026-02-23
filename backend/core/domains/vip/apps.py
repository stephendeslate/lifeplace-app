# backend/core/domains/vip/apps.py
from django.apps import AppConfig


class VipConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core.domains.vip"
    verbose_name = "VIP & Loyalty"

    def ready(self):
        # Import signals when the app is ready
        try:
            import core.domains.vip.signals
        except ImportError:
            pass
