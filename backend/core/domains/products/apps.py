# backend/core/domains/products/apps.py
from django.apps import AppConfig


class ProductsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.products'
    verbose_name = 'Products'
    
    def ready(self):
        # Import signals when the app is ready
        try:
            import core.domains.products.signals
        except ImportError:
            pass