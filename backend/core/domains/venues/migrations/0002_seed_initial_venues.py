# backend/core/domains/venues/migrations/0002_seed_initial_venues.py
from django.db import migrations
from decimal import Decimal
from datetime import time


def seed_venues(apps, schema_editor):
    """Seed initial venues based on LifePlace Terms & Conditions."""
    Venue = apps.get_model('venues', 'Venue')
    VenueOperatingRules = apps.get_model('venues', 'VenueOperatingRules')

    # === CABANA / HAVILAH (Overnight) ===
    cabana = Venue.objects.create(
        name='Cabana',
        code='CABANA',
        description='Overnight accommodation with check-in at 2:00 PM and checkout at 12:00 PM the following day.',
        is_overnight=True,
        minimum_capacity=1,
        maximum_capacity=10,
        recommended_capacity=6,
        is_active=True,
        is_bookable=True,
        location_description='Cabana and Havilah accommodation area',
        sort_order=1
    )
    VenueOperatingRules.objects.create(
        venue=cabana,
        # Check-in/out
        default_check_in_time=time(14, 0),  # 2:00 PM
        default_checkout_time=time(12, 0),  # 12:00 PM next day
        checkout_next_day=True,
        # Duration (overnight = ~22 hours)
        minimum_program_hours=Decimal('22.0'),
        maximum_program_hours=Decimal('22.0'),
        default_program_hours=Decimal('22.0'),
        is_fixed_duration=True,
        # No ingress/egress for cabana
        ingress_hours=Decimal('0'),
        egress_hours=Decimal('0'),
        # Time constraints
        hard_cutoff_time=time(2, 0),  # 2:00 AM
        hard_cutoff_next_day=True,
        early_access_minutes=60,
        # Early check-in
        early_checkin_allowed=True,
        early_checkin_fee_per_hour=Decimal('300.00'),
        earliest_checkin_time=time(10, 0),  # 10:00 AM earliest
        # Late checkout
        late_checkout_allowed=True,
        late_checkout_fee_per_hour=Decimal('300.00'),
        late_checkout_max_hours=4,
        latest_checkout_time=time(16, 0),  # 4:00 PM latest
        # Custom rules
        custom_rules={
            'policies': [
                {'code': 'NO_COOKING', 'description': 'Cooking or bringing electric appliances is prohibited'},
                {'code': 'NO_MOVING_ITEMS', 'description': 'Removing items from the cabana/Havilah or moving them to another place is prohibited'},
                {'code': 'PET_ALLOWED', 'description': 'Only one pet is allowed per cabana for an extra charge. Cleaning fee of PHP 1,000 upon checkout'}
            ],
            'notes': 'Guest should notify management upon noticing any damage'
        }
    )

    # === OPEN FIELD (Day events) ===
    open_field = Venue.objects.create(
        name='Open Field',
        code='OPEN_FIELD',
        description='Open field venue for day events with 3-hour program time, 5-6 hours ingress, and 1-2 hours egress.',
        is_overnight=False,
        minimum_capacity=20,
        maximum_capacity=200,
        recommended_capacity=100,
        is_active=True,
        is_bookable=True,
        location_description='Open field area for events',
        sort_order=2
    )
    VenueOperatingRules.objects.create(
        venue=open_field,
        # Check-in/out (flexible for day events)
        default_check_in_time=time(6, 0),  # Early morning for setup
        default_checkout_time=time(22, 0),  # 10:00 PM
        checkout_next_day=False,
        # Duration
        minimum_program_hours=Decimal('2.0'),
        maximum_program_hours=Decimal('6.0'),
        default_program_hours=Decimal('3.0'),
        is_fixed_duration=False,
        # Ingress/Egress
        ingress_hours=Decimal('5.5'),  # 5-6 hours
        egress_hours=Decimal('1.5'),   # 1-2 hours
        allow_custom_ingress=True,
        allow_custom_egress=True,
        min_ingress_hours=Decimal('4.0'),
        max_ingress_hours=Decimal('6.0'),
        min_egress_hours=Decimal('1.0'),
        max_egress_hours=Decimal('2.0'),
        # Time constraints
        earliest_start_time=time(8, 0),
        latest_end_time=time(21, 0),  # Music curfew at 9 PM
        hard_cutoff_time=time(2, 0),
        hard_cutoff_next_day=True,
        early_access_minutes=60,
        # No early check-in / late checkout for day venues
        early_checkin_allowed=False,
        late_checkout_allowed=False,
        # Custom rules
        custom_rules={
            'policies': [
                {'code': 'CLEAN_AS_YOU_GO', 'description': 'Clean-as-you-go policy will be implemented'},
                {'code': 'SUPPLIER_CLEANUP', 'description': 'Suppliers required to maintain cleanliness and bring their own trash bags'},
                {'code': 'MUSIC_CURFEW', 'description': 'Sound/music must be turned off by 9:00 PM'},
                {'code': 'NO_GLITTER', 'description': 'No glitter, rice, or confetti may be used indoors or outdoors'},
                {'code': 'CHILD_SUPERVISION', 'description': 'Children not permitted to wander without adult supervision'}
            ],
            'music_curfew': '21:00',
            'notes': 'Use of tape, wires, tacks, nails, and glue for decorations requires management approval'
        }
    )

    # === PAVILION (Day events, similar to Open Field) ===
    pavilion = Venue.objects.create(
        name='Pavilion',
        code='PAVILION',
        description='Pavilion venue for day events with covered area.',
        is_overnight=False,
        minimum_capacity=30,
        maximum_capacity=150,
        recommended_capacity=80,
        is_active=True,
        is_bookable=True,
        location_description='Covered pavilion area',
        sort_order=3
    )
    VenueOperatingRules.objects.create(
        venue=pavilion,
        # Check-in/out (flexible for day events)
        default_check_in_time=time(6, 0),
        default_checkout_time=time(22, 0),
        checkout_next_day=False,
        # Duration
        minimum_program_hours=Decimal('2.0'),
        maximum_program_hours=Decimal('6.0'),
        default_program_hours=Decimal('3.0'),
        is_fixed_duration=False,
        # Ingress/Egress
        ingress_hours=Decimal('5.5'),
        egress_hours=Decimal('1.5'),
        allow_custom_ingress=True,
        allow_custom_egress=True,
        min_ingress_hours=Decimal('4.0'),
        max_ingress_hours=Decimal('6.0'),
        min_egress_hours=Decimal('1.0'),
        max_egress_hours=Decimal('2.0'),
        # Time constraints
        earliest_start_time=time(8, 0),
        latest_end_time=time(21, 0),
        hard_cutoff_time=time(2, 0),
        hard_cutoff_next_day=True,
        early_access_minutes=60,
        # No early check-in / late checkout
        early_checkin_allowed=False,
        late_checkout_allowed=False,
        # Custom rules (same as Open Field)
        custom_rules={
            'policies': [
                {'code': 'CLEAN_AS_YOU_GO', 'description': 'Clean-as-you-go policy will be implemented'},
                {'code': 'SUPPLIER_CLEANUP', 'description': 'Suppliers required to maintain cleanliness'},
                {'code': 'MUSIC_CURFEW', 'description': 'Sound/music must be turned off by 9:00 PM'},
                {'code': 'NO_GLITTER', 'description': 'No glitter, rice, or confetti'}
            ],
            'music_curfew': '21:00'
        }
    )

    # === SANCTUARY (Ceremonies, fixed 3-hour max) ===
    sanctuary = Venue.objects.create(
        name='Sanctuary',
        code='SANCTUARY',
        description='Sanctuary for ceremonies with maximum 3-hour usage.',
        is_overnight=False,
        minimum_capacity=20,
        maximum_capacity=200,
        recommended_capacity=100,
        is_active=True,
        is_bookable=True,
        location_description='The Sanctuary for wedding ceremonies and religious events',
        sort_order=4
    )
    VenueOperatingRules.objects.create(
        venue=sanctuary,
        # Check-in/out
        default_check_in_time=time(8, 0),
        default_checkout_time=time(18, 0),
        checkout_next_day=False,
        # Duration (fixed 3 hours max)
        minimum_program_hours=Decimal('1.0'),
        maximum_program_hours=Decimal('3.0'),
        default_program_hours=Decimal('3.0'),
        is_fixed_duration=False,  # Can be 1-3 hours
        # Short ingress/egress for ceremony
        ingress_hours=Decimal('0.5'),
        egress_hours=Decimal('0.5'),
        allow_custom_ingress=False,
        allow_custom_egress=False,
        # Time constraints
        earliest_start_time=time(8, 0),
        latest_end_time=time(17, 0),
        hard_cutoff_time=time(18, 0),
        hard_cutoff_next_day=False,
        early_access_minutes=30,
        # No early check-in / late checkout
        early_checkin_allowed=False,
        late_checkout_allowed=False,
        # Custom rules
        custom_rules={
            'violation_fees': [
                {'code': 'CONFETTI', 'description': 'Party poppers, rice, and confetti strictly prohibited', 'fee': 1500}
            ],
            'policies': [
                {'code': 'NO_CONFETTI', 'description': 'Party poppers, rice, and confetti are strictly prohibited'},
                {'code': 'CLIENT_LAPTOP', 'description': 'Client must provide laptop for music/video playback'},
                {'code': 'FLORIST_CLEANUP', 'description': 'Styling/florists required to bring their trash/disposals upon egress'}
            ],
            'notes': 'Maximum 3-hour usage for Sanctuary'
        }
    )


def reverse_seed(apps, schema_editor):
    """Remove seeded venues."""
    Venue = apps.get_model('venues', 'Venue')
    Venue.objects.filter(code__in=['CABANA', 'OPEN_FIELD', 'PAVILION', 'SANCTUARY']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('venues', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_venues, reverse_seed),
    ]
