# backend/core/domains/users/apps.py
from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.users'
    label = 'users'
    verbose_name = 'Users'
    
    def ready(self):
        import core.domains.users.signals