# backend/core/domains/venues/migrations/0008_seed_all_event_types_and_packages.py
"""
Migration stub - seed data moved to fixtures.

Original: Configured all event types and packages
- Created venues: Havilah Hostel, The Pool
- Created event types: Camps & Retreats, Team Building, Workshops
- Created Camps & Retreats packages (12 products)
- Created Team Building packages (5 products)
- Created All-In Wedding packages (4 products)
- Created add-ons for various event types
- Linked packages to venues via PackageVenue

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
        ('venues', '0007_seed_wedding_venues_and_packages'),
    ]

    operations = [
        migrations.RunPython(noop_forward, noop_reverse),
    ]
