# backend/core/domains/bookingflow/migrations/0032_remove_venue_selection_from_non_required_flows.py
"""
Migration stub - seed data moved to fixtures.

Original: Removed venue_selection steps from flows that don't require them
- Only Wedding Booking Flow should have venue_selection

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
        ('bookingflow', '0031_update_booking_flow_steps'),
    ]

    operations = [
        migrations.RunPython(noop_forward, noop_reverse),
    ]
