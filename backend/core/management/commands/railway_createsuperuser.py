# backend/core/management/commands/railway_createsuperuser.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
import os

class Command(BaseCommand):
    help = 'Create a superuser if one does not exist'

    def handle(self, *args, **options):
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admin123')
        
        # Use email as both username and email
        username = email
        
        if not User.objects.filter(username=username).exists() and not User.objects.filter(email=email).exists():
            User.objects.create_superuser(username, email, password)
            self.stdout.write(
                self.style.SUCCESS(f'Superuser "{username}" created successfully')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Superuser with email "{email}" already exists')
            )