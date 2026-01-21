# backend/core/domains/venues/migrations/0002_seed_initial_venues.py
"""
Migration stub - seed data moved to fixtures.

Original: Seeded initial venues (Cabana, Open Field, Pavilion, Sanctuary)
Now: Use `python manage.py seed_production_data` after migrations
"""
from django.db import migrations


def noop_forward(apps, schema_editor):
    """Seed data now handled by seed_production_data command."""
    pass


def noop_reverse(apps, schema_editor):
    """No-op reverse migration."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('venues', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(noop_forward, noop_reverse),
    ]
