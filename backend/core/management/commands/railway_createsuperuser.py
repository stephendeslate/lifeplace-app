# backend/core/management/commands/railway_createsuperuser.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()

class Command(BaseCommand):
    help = 'Create a superuser if one does not exist'

    def handle(self, *args, **options):
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admin123')
        
        if not User.objects.filter(email=email).exists():
            User.objects.create_superuser(
                email=email,
                password=password,
                role='ADMIN'  # Ensure superuser has ADMIN role
            )
            self.stdout.write(
                self.style.SUCCESS(f'Superuser "{email}" created successfully')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Superuser with email "{email}" already exists')
            )