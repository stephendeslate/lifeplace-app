# backend/core/domains/bookingflow/migrations/0030_seed_booking_flows.py
"""
Migration stub - seed data moved to fixtures.

Original: Created booking flows for all event types
- Created "Life Events" event type
- Created booking flows for: Wedding, Camps & Retreats, Team Building, Workshops, Life Events
- Created appropriate steps for each flow
- Configured payment terms according to T&C documents

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
        ('bookingflow', '0029_remove_bookingsession_session_completed_expires_idx'),
        ('events', '0001_initial'),
        ('communications', '0001_initial'),
        ('workflows', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(noop_forward, noop_reverse),
    ]
