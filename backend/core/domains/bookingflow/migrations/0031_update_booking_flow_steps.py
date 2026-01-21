# backend/core/domains/bookingflow/migrations/0031_update_booking_flow_steps.py
"""
Migration stub - seed data moved to fixtures.

Original: Updated booking flow steps
- Removed Introduction steps from all flows
- Made Date/Time, Package Selection, Add-on Selection optional and skippable
- Reordered steps consistently

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
        ('bookingflow', '0030_seed_booking_flows'),
    ]

    operations = [
        migrations.RunPython(noop_forward, noop_reverse),
    ]
