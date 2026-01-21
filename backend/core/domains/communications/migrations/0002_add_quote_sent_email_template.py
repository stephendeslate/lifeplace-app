# backend/core/domains/communications/migrations/0002_add_quote_sent_email_template.py
"""
Migration stub - seed data moved to fixtures.

Original: Created quote_sent_to_client email template
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
        ('communications', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(noop_forward, noop_reverse),
    ]
