# core/domains/notes/apps.py
from django.apps import AppConfig


class NotesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.notes'
    label = 'notes'
    verbose_name = 'Notes'