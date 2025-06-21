# backend/core/domains/sales/apps.py
from django.apps import AppConfig


class SalesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.sales'
    label = 'sales'
    verbose_name = 'Sales'