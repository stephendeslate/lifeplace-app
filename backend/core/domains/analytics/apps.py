# backend/core/domains/analytics/apps.py
from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core.domains.analytics"
    verbose_name = "Analytics"
