"""
Management command to assign event types to packages.

This command sets up the ManyToMany relationship between ProductOption (packages)
and EventType so that the filter_by_event_type feature works correctly in the
mobile app's package selection step.
"""

from django.core.management.base import BaseCommand
from core.domains.products.models import ProductOption
from core.domains.events.models import EventType


class Command(BaseCommand):
    help = 'Assign event types to packages for filtering in booking flows'

    def handle(self, *args, **options):
        self.stdout.write('Assigning event types to packages...\n')

        # Fetch event types by name (more reliable than hardcoded IDs)
        event_types = {}
        for et in EventType.objects.all():
            event_types[et.name] = et
            self.stdout.write(f'  Found EventType: {et.name} (ID: {et.id})')

        self.stdout.write('')

        # Define package-to-event-type mappings by package name patterns
        # This is more maintainable than hardcoded IDs

        wedding_et = event_types.get('Wedding')
        team_building_et = event_types.get('Team Building')
        camps_retreats_et = event_types.get('Camps & Retreats')
        life_events_et = event_types.get('Life Events')
        workshops_et = event_types.get('Workshops')

        if not all([wedding_et, team_building_et, camps_retreats_et, life_events_et, workshops_et]):
            self.stderr.write(self.style.ERROR('Missing required event types!'))
            return

        # Track statistics
        stats = {
            'wedding': 0,
            'team_building': 0,
            'camps_life_workshops': 0,
            'skipped': 0,
        }

        packages = ProductOption.objects.filter(type='PACKAGE', is_active=True)

        for pkg in packages:
            name = pkg.name.lower()

            # Wedding packages
            if 'wedding' in name or name in [
                'the sanctuary and open field',
                'the sanctuary and pavilion',
                'the angelic field and open field',
                'the angelic field and pavilion',
            ]:
                pkg.event_types.set([wedding_et])
                stats['wedding'] += 1
                self.stdout.write(f'  [Wedding] {pkg.name}')

            # Team Building packages
            elif 'team building' in name:
                pkg.event_types.set([team_building_et])
                stats['team_building'] += 1
                self.stdout.write(f'  [Team Building] {pkg.name}')

            # Camps & Retreats + Life Events + Workshops packages
            elif any(pattern in name for pattern in [
                'budget package',
                'basic package',
                'premium package',
                'day trip',
                '2d1n',
                '3d2n',
                '4d3n',
            ]):
                pkg.event_types.set([camps_retreats_et, life_events_et, workshops_et])
                stats['camps_life_workshops'] += 1
                self.stdout.write(f'  [Camps/Life/Workshops] {pkg.name}')

            else:
                stats['skipped'] += 1
                self.stdout.write(self.style.WARNING(f'  [SKIPPED] {pkg.name} - no matching pattern'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Assignment complete!'))
        self.stdout.write(f'  Wedding packages: {stats["wedding"]}')
        self.stdout.write(f'  Team Building packages: {stats["team_building"]}')
        self.stdout.write(f'  Camps/Life/Workshops packages: {stats["camps_life_workshops"]}')
        self.stdout.write(f'  Skipped: {stats["skipped"]}')
