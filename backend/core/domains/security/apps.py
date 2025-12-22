# core/domains/security/apps.py

from django.apps import AppConfig


class SecurityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.security'
    label = 'security'
    verbose_name = 'Security & Breach Management'
