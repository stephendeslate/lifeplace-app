# backend/core/domains/events/apps.py
from django.apps import AppConfig


class EventsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.events'
    label = 'events'
    verbose_name = 'Events'