# backend/core/domains/clients/apps.py
from django.apps import AppConfig


class ClientsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.clients'
    label = 'clients'
    verbose_name = 'Clients'