# backend/core/domains/workflows/apps.py
from django.apps import AppConfig


class WorkflowsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.workflows'
    label = 'workflows'
    verbose_name = 'Workflows'
    
    def ready(self):
        # Import signal handlers
        import core.domains.workflows.signals