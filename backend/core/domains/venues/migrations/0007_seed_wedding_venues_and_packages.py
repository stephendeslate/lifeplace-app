# backend/core/domains/venues/migrations/0007_seed_wedding_venues_and_packages.py
"""
Migration stub - seed data moved to fixtures.

Original: Configured wedding venues and packages based on LifePlace rate card
- Created venues: Angelic Field, Al Fresco, Cabana 3&4, Prenup Venue
- Updated existing venues with standalone pricing
- Created 4 wedding ceremony & reception packages
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
        ('venues', '0006_add_amenities_field'),
        ('events', '0001_initial'),
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(noop_forward, noop_reverse),
    ]
