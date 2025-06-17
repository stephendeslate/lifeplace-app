# backend/core/domains/questionnaires/apps.py
from django.apps import AppConfig


class QuestionnairesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.questionnaires'
    label = 'questionnaires'
    verbose_name = 'Questionnaires'