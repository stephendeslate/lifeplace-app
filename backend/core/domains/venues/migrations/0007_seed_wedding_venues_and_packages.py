# backend/core/domains/venues/migrations/0007_seed_wedding_venues_and_packages.py
"""
Data migration to configure wedding venues and packages based on LifePlace rate card.

This migration:
1. Creates new venues: Angelic Field, Al Fresco, Cabana 3&4, Prenup Venue
2. Updates existing venues with standalone pricing
3. Removes existing wedding packages
4. Creates 4 wedding ceremony & reception packages
5. Links packages to venues via PackageVenue (including bonus venues)
6. Creates Parachute Tent add-on
"""
from django.db import migrations
from decimal import Decimal
from datetime import time


def seed_wedding_configuration(apps, schema_editor):
    """Configure all wedding venues and packages."""
    Venue = apps.get_model('venues', 'Venue')
    VenueOperatingRules = apps.get_model('venues', 'VenueOperatingRules')
    PackageVenue = apps.get_model('venues', 'PackageVenue')
    ProductOption = apps.get_model('products', 'ProductOption')
    ProductCategory = apps.get_model('products', 'ProductCategory')
    EventType = apps.get_model('events', 'EventType')

    # Get or create Wedding event type
    wedding_event_type, _ = EventType.objects.get_or_create(
        name='Wedding',
        defaults={'description': 'Wedding ceremonies and receptions', 'is_active': True}
    )

    # =====================================================
    # PART 1: UPDATE EXISTING VENUES
    # =====================================================

    # Update The Pavilion
    pavilion = Venue.objects.filter(code='PAVILION').first()
    if pavilion:
        pavilion.name = 'The Pavilion'
        pavilion.description = 'Reception Venue Good for 100-130 pax'
        pavilion.minimum_capacity = 100
        pavilion.maximum_capacity = 130
        pavilion.is_rentable_standalone = True
        pavilion.standalone_base_price = Decimal('23200.00')
        pavilion.standalone_included_hours = Decimal('3.0')
        pavilion.standalone_excess_hour_price = Decimal('7000.00')
        pavilion.amenities = ['FREE Prenup Venue']
        pavilion.save()

    # Update The Open Field
    open_field = Venue.objects.filter(code='OPEN_FIELD').first()
    if open_field:
        open_field.name = 'The Open Field'
        open_field.description = 'Large outdoor venue for 200-220 pax. Additional 10,000 for Parachute Tent.'
        open_field.minimum_capacity = 200
        open_field.maximum_capacity = 220
        open_field.is_rentable_standalone = True
        open_field.standalone_base_price = Decimal('34400.00')
        open_field.standalone_included_hours = Decimal('3.0')
        open_field.standalone_excess_hour_price = Decimal('10000.00')
        open_field.amenities = ['FREE Prenup Venue']
        open_field.save()

    # Update The Sanctuary
    sanctuary = Venue.objects.filter(code='SANCTUARY').first()
    if sanctuary:
        sanctuary.name = 'The Sanctuary'
        sanctuary.description = 'Christian Ceremony Roman Catholic Renewal Vows. Inclusive of white Draping and basic styling.'
        sanctuary.is_rentable_standalone = True
        sanctuary.standalone_base_price = Decimal('36000.00')
        sanctuary.standalone_included_hours = Decimal('3.0')
        sanctuary.standalone_excess_hour_price = Decimal('13000.00')
        sanctuary.amenities = ['Basic Sound System', 'White Draping', 'Basic Styling']
        sanctuary.save()

    # Update existing Cabana to Cabana 1&2
    cabana_1_2 = Venue.objects.filter(code='CABANA').first()
    if cabana_1_2:
        cabana_1_2.name = 'Cabana 1&2'
        cabana_1_2.code = 'CABANA_1_2'
        cabana_1_2.description = 'Accommodation or Preparation. 2-6 pax per Cabana. 2 units included.'
        cabana_1_2.minimum_capacity = 2
        cabana_1_2.maximum_capacity = 6
        cabana_1_2.is_rentable_standalone = True
        cabana_1_2.standalone_base_price = Decimal('3300.00')
        cabana_1_2.standalone_included_hours = Decimal('22.0')
        cabana_1_2.standalone_excess_hour_price = None
        cabana_1_2.amenities = ['Aircon', 'Hot Shower', 'Attic']
        cabana_1_2.save()

    # =====================================================
    # PART 2: CREATE NEW VENUES
    # =====================================================

    # Create The Angelic Field
    angelic_field, created = Venue.objects.get_or_create(
        code='ANGELIC_FIELD',
        defaults={
            'name': 'The Angelic Field',
            'description': 'Reception or Garden Ceremony venue for 150-200 pax',
            'is_overnight': False,
            'minimum_capacity': 150,
            'maximum_capacity': 200,
            'recommended_capacity': 175,
            'is_active': True,
            'is_bookable': True,
            'is_rentable_standalone': True,
            'standalone_base_price': Decimal('26400.00'),
            'standalone_included_hours': Decimal('3.0'),
            'standalone_excess_hour_price': Decimal('5000.00'),
            'amenities': ['FREE Prenup Venue'],
            'sort_order': 5,
        }
    )
    if created:
        VenueOperatingRules.objects.create(
            venue=angelic_field,
            default_check_in_time=time(6, 0),
            default_checkout_time=time(22, 0),
            checkout_next_day=False,
            minimum_program_hours=Decimal('2.0'),
            maximum_program_hours=Decimal('6.0'),
            default_program_hours=Decimal('3.0'),
            is_fixed_duration=False,
            ingress_hours=Decimal('5.5'),
            egress_hours=Decimal('1.5'),
            allow_custom_ingress=True,
            allow_custom_egress=True,
            min_ingress_hours=Decimal('4.0'),
            max_ingress_hours=Decimal('6.0'),
            min_egress_hours=Decimal('1.0'),
            max_egress_hours=Decimal('2.0'),
            earliest_start_time=time(8, 0),
            latest_end_time=time(21, 0),
            hard_cutoff_time=time(2, 0),
            hard_cutoff_next_day=True,
            early_access_minutes=60,
            early_checkin_allowed=False,
            late_checkout_allowed=False,
            custom_rules={
                'policies': [
                    {'code': 'CLEAN_AS_YOU_GO', 'description': 'Clean-as-you-go policy will be implemented'},
                    {'code': 'MUSIC_CURFEW', 'description': 'Sound/music must be turned off by 9:00 PM'},
                ],
                'music_curfew': '21:00',
            }
        )

    # Create The Al Fresco
    al_fresco, created = Venue.objects.get_or_create(
        code='AL_FRESCO',
        defaults={
            'name': 'The Al Fresco',
            'description': 'For Dining or Intimate Events',
            'is_overnight': False,
            'minimum_capacity': 10,
            'maximum_capacity': 50,
            'recommended_capacity': 30,
            'is_active': True,
            'is_bookable': True,
            'is_rentable_standalone': True,
            'standalone_base_price': Decimal('7000.00'),
            'standalone_included_hours': Decimal('3.0'),
            'standalone_excess_hour_price': Decimal('2000.00'),
            'amenities': ['FREE Prenup Venue'],
            'sort_order': 6,
        }
    )
    if created:
        VenueOperatingRules.objects.create(
            venue=al_fresco,
            default_check_in_time=time(8, 0),
            default_checkout_time=time(21, 0),
            checkout_next_day=False,
            minimum_program_hours=Decimal('2.0'),
            maximum_program_hours=Decimal('6.0'),
            default_program_hours=Decimal('3.0'),
            is_fixed_duration=False,
            ingress_hours=Decimal('1.0'),
            egress_hours=Decimal('1.0'),
            allow_custom_ingress=False,
            allow_custom_egress=False,
            earliest_start_time=time(8, 0),
            latest_end_time=time(21, 0),
            hard_cutoff_time=time(22, 0),
            hard_cutoff_next_day=False,
            early_access_minutes=30,
            early_checkin_allowed=False,
            late_checkout_allowed=False,
            custom_rules={
                'policies': [
                    {'code': 'INTIMATE_EVENTS', 'description': 'Best suited for dining or intimate gatherings'},
                ],
            }
        )

    # Create Cabana 3&4
    cabana_3_4, created = Venue.objects.get_or_create(
        code='CABANA_3_4',
        defaults={
            'name': 'Cabana 3&4',
            'description': 'Accommodation or Preparation. 2-6 pax per Cabana. 2 units included.',
            'is_overnight': True,
            'minimum_capacity': 2,
            'maximum_capacity': 6,
            'recommended_capacity': 4,
            'is_active': True,
            'is_bookable': True,
            'is_rentable_standalone': True,
            'standalone_base_price': Decimal('3500.00'),
            'standalone_included_hours': Decimal('22.0'),
            'standalone_excess_hour_price': None,
            'amenities': ['Aircon', 'Hot Shower', 'Attic'],
            'sort_order': 7,
        }
    )
    if created:
        VenueOperatingRules.objects.create(
            venue=cabana_3_4,
            default_check_in_time=time(14, 0),  # 2:00 PM
            default_checkout_time=time(12, 0),  # 12:00 PM next day
            checkout_next_day=True,
            minimum_program_hours=Decimal('22.0'),
            maximum_program_hours=Decimal('22.0'),
            default_program_hours=Decimal('22.0'),
            is_fixed_duration=True,
            ingress_hours=Decimal('0'),
            egress_hours=Decimal('0'),
            hard_cutoff_time=time(2, 0),
            hard_cutoff_next_day=True,
            early_access_minutes=60,
            early_checkin_allowed=True,
            early_checkin_fee_per_hour=Decimal('300.00'),
            earliest_checkin_time=time(10, 0),
            late_checkout_allowed=True,
            late_checkout_fee_per_hour=Decimal('300.00'),
            late_checkout_max_hours=4,
            latest_checkout_time=time(16, 0),
            custom_rules={
                'policies': [
                    {'code': 'NO_COOKING', 'description': 'Cooking or bringing electric appliances is prohibited'},
                    {'code': 'PET_ALLOWED', 'description': 'Only one pet is allowed per cabana for extra charge. Cleaning fee of PHP 1,000 upon checkout'},
                ],
            }
        )

    # Create Prenup Venue (virtual/privilege venue)
    prenup_venue, created = Venue.objects.get_or_create(
        code='PRENUP_VENUE',
        defaults={
            'name': 'Prenup Venue',
            'description': 'Access to venue for prenuptial photo shoot. Can be used at any available venue.',
            'is_overnight': False,
            'minimum_capacity': 2,
            'maximum_capacity': 20,
            'is_active': True,
            'is_bookable': False,  # Not directly bookable - only as bonus
            'is_rentable_standalone': True,
            'standalone_base_price': Decimal('10000.00'),
            'standalone_included_hours': Decimal('3.0'),
            'standalone_excess_hour_price': Decimal('0.00'),
            'amenities': [],
            'sort_order': 10,
        }
    )
    if created:
        VenueOperatingRules.objects.create(
            venue=prenup_venue,
            default_check_in_time=time(8, 0),
            default_checkout_time=time(17, 0),
            checkout_next_day=False,
            minimum_program_hours=Decimal('2.0'),
            maximum_program_hours=Decimal('4.0'),
            default_program_hours=Decimal('3.0'),
            is_fixed_duration=False,
            ingress_hours=Decimal('0.5'),
            egress_hours=Decimal('0.5'),
            allow_custom_ingress=False,
            allow_custom_egress=False,
            early_checkin_allowed=False,
            late_checkout_allowed=False,
            custom_rules={
                'policies': [
                    {'code': 'PRENUP_ONLY', 'description': 'For prenuptial photo shoots only'},
                ],
            }
        )

    # =====================================================
    # PART 3: REMOVE EXISTING WEDDING PACKAGES
    # =====================================================

    # Delete existing wedding packages and their PackageVenue links
    # Note: event_types is now a ManyToMany field
    existing_wedding_packages = ProductOption.objects.filter(
        event_types=wedding_event_type,
        type='PACKAGE'
    )
    # PackageVenue will cascade delete
    existing_wedding_packages.delete()

    # =====================================================
    # PART 4: GET OR CREATE PRODUCT CATEGORY
    # =====================================================

    wedding_category, _ = ProductCategory.objects.get_or_create(
        slug='wedding-packages',
        defaults={
            'name': 'Wedding Packages',
            'description': 'Ceremony and Reception Packages for Weddings',
            'is_active': True,
            'requires_venue': True,
            'typical_duration_hours': 6,
            'sort_order': 1,
        }
    )

    addons_category, _ = ProductCategory.objects.get_or_create(
        slug='wedding-addons',
        defaults={
            'name': 'Wedding Add-ons',
            'description': 'Optional add-ons for wedding events',
            'is_active': True,
            'requires_venue': False,
            'sort_order': 10,
        }
    )

    # =====================================================
    # PART 5: CREATE WEDDING PACKAGES
    # =====================================================

    # Refresh venue references after updates
    pavilion = Venue.objects.filter(code='PAVILION').first()
    open_field = Venue.objects.filter(code='OPEN_FIELD').first()
    sanctuary = Venue.objects.filter(code='SANCTUARY').first()
    cabana_1_2 = Venue.objects.filter(code='CABANA_1_2').first()
    cabana_3_4 = Venue.objects.filter(code='CABANA_3_4').first()
    angelic_field = Venue.objects.filter(code='ANGELIC_FIELD').first()
    prenup_venue = Venue.objects.filter(code='PRENUP_VENUE').first()

    overall_inclusion = """OVERALL INCLUSION:
- Ingress and Egress time excluded
- Free use of gazebos for your suppliers
- Round the clock security
- Rest rooms and shower rooms
- Parking space 20-23 slots

Rates are subject to change without prior notice."""

    # Package 1: The Sanctuary and Open Field - PHP 79,000
    pkg_sanctuary_openfield = ProductOption.objects.create(
        name='The Sanctuary and Open Field',
        description=f'Total of 6 Hours. Ceremony at The Sanctuary (3 hours) + Reception at The Open Field (3 hours).\n\nIncludes FREE Prenup Venue (worth 10K) and FREE 4 Cabanas (worth 20K+).\n\n{overall_inclusion}',
        category=wedding_category,
        pricing_model='FIXED',
        base_price=Decimal('79000.00'),
        currency='PHP',
        is_tax_inclusive=True,
        type='PACKAGE',
        is_active=True,
        is_featured=True,
        minimum_hours=6,
        maximum_hours=6,
        minimum_guests=50,
        maximum_guests=220,
        sort_order=1,
    )
    pkg_sanctuary_openfield.event_types.add(wedding_event_type)

    # Package 2: The Sanctuary and Pavilion - PHP 66,000
    pkg_sanctuary_pavilion = ProductOption.objects.create(
        name='The Sanctuary and Pavilion',
        description=f'Total of 6 Hours. Ceremony at The Sanctuary (3 hours) + Reception at The Pavilion (3 hours).\n\nIncludes FREE Prenup Venue (worth 10K) and FREE 4 Cabanas (worth 20K+).\n\n{overall_inclusion}',
        category=wedding_category,
        pricing_model='FIXED',
        base_price=Decimal('66000.00'),
        currency='PHP',
        is_tax_inclusive=True,
        type='PACKAGE',
        is_active=True,
        is_featured=True,
        minimum_hours=6,
        maximum_hours=6,
        minimum_guests=50,
        maximum_guests=130,
        sort_order=2,
    )
    pkg_sanctuary_pavilion.event_types.add(wedding_event_type)

    # Package 3: The Angelic Field and Open Field - PHP 71,200
    pkg_angelic_openfield = ProductOption.objects.create(
        name='The Angelic Field and Open Field',
        description=f'Total of 6 Hours. Garden Ceremony at The Angelic Field (3 hours) + Reception at The Open Field (3 hours).\n\nIncludes FREE Prenup Venue (worth 10K) and FREE 4 Cabanas (worth 20K+).\n\n{overall_inclusion}',
        category=wedding_category,
        pricing_model='FIXED',
        base_price=Decimal('71200.00'),
        currency='PHP',
        is_tax_inclusive=True,
        type='PACKAGE',
        is_active=True,
        is_featured=True,
        minimum_hours=6,
        maximum_hours=6,
        minimum_guests=50,
        maximum_guests=220,
        sort_order=3,
    )
    pkg_angelic_openfield.event_types.add(wedding_event_type)

    # Package 4: The Angelic Field and Pavilion - PHP 60,000
    pkg_angelic_pavilion = ProductOption.objects.create(
        name='The Angelic Field and Pavilion',
        description=f'Total of 6 Hours. Garden Ceremony at The Angelic Field (3 hours) + Reception at The Pavilion (3 hours).\n\nIncludes FREE Prenup Venue (worth 10K) and FREE 4 Cabanas (worth 20K+).\n\n{overall_inclusion}',
        category=wedding_category,
        pricing_model='FIXED',
        base_price=Decimal('60000.00'),
        currency='PHP',
        is_tax_inclusive=True,
        type='PACKAGE',
        is_active=True,
        is_featured=True,
        minimum_hours=6,
        maximum_hours=6,
        minimum_guests=50,
        maximum_guests=200,
        sort_order=4,
    )
    pkg_angelic_pavilion.event_types.add(wedding_event_type)

    # =====================================================
    # PART 6: LINK PACKAGES TO VENUES VIA PackageVenue
    # =====================================================

    def create_package_venues(package, ceremony_venue, reception_venue):
        """Helper to create PackageVenue entries for a wedding package."""
        # Ceremony venue (primary - determines datetime rules)
        PackageVenue.objects.create(
            package=package,
            venue=ceremony_venue,
            is_primary=True,
            access_order=1,
            access_duration_hours=Decimal('3.0'),
            notes='Ceremony venue (3 hours)',
            is_bonus=False,
            hours_contribution=Decimal('3.0'),
            price_contribution=ceremony_venue.standalone_base_price,
        )

        # Reception venue
        PackageVenue.objects.create(
            package=package,
            venue=reception_venue,
            is_primary=False,
            access_order=2,
            access_duration_hours=Decimal('3.0'),
            notes='Reception venue (3 hours)',
            is_bonus=False,
            hours_contribution=Decimal('3.0'),
            price_contribution=reception_venue.standalone_base_price,
        )

        # FREE Prenup Venue
        if prenup_venue:
            PackageVenue.objects.create(
                package=package,
                venue=prenup_venue,
                is_primary=False,
                access_order=0,
                access_duration_hours=Decimal('3.0'),
                notes='FREE Prenup Venue (worth PHP 10,000)',
                is_bonus=True,
                hours_contribution=Decimal('0.0'),
                price_contribution=Decimal('0.00'),
            )

        # FREE Cabana 1&2 (2 units)
        if cabana_1_2:
            PackageVenue.objects.create(
                package=package,
                venue=cabana_1_2,
                is_primary=False,
                access_order=0,
                access_duration_hours=Decimal('22.0'),
                notes='FREE Cabana 1&2 - 2 units (worth PHP 6,600)',
                is_bonus=True,
                hours_contribution=Decimal('0.0'),
                price_contribution=Decimal('0.00'),
            )

        # FREE Cabana 3&4 (2 units)
        if cabana_3_4:
            PackageVenue.objects.create(
                package=package,
                venue=cabana_3_4,
                is_primary=False,
                access_order=0,
                access_duration_hours=Decimal('22.0'),
                notes='FREE Cabana 3&4 - 2 units (worth PHP 7,000)',
                is_bonus=True,
                hours_contribution=Decimal('0.0'),
                price_contribution=Decimal('0.00'),
            )

    # Create PackageVenue links for all packages
    if sanctuary and open_field:
        create_package_venues(pkg_sanctuary_openfield, sanctuary, open_field)

    if sanctuary and pavilion:
        create_package_venues(pkg_sanctuary_pavilion, sanctuary, pavilion)

    if angelic_field and open_field:
        create_package_venues(pkg_angelic_openfield, angelic_field, open_field)

    if angelic_field and pavilion:
        create_package_venues(pkg_angelic_pavilion, angelic_field, pavilion)

    # =====================================================
    # PART 7: CREATE ADD-ONS
    # =====================================================

    # Parachute Tent add-on for Open Field
    ProductOption.objects.get_or_create(
        name='Parachute Tent',
        category=addons_category,
        defaults={
            'description': 'Additional parachute tent for The Open Field venue. Provides shade and coverage for outdoor events.',
            'pricing_model': 'FIXED',
            'base_price': Decimal('10000.00'),
            'currency': 'PHP',
            'is_tax_inclusive': True,
            'type': 'PRODUCT',
            'is_active': True,
            'allow_multiple': False,
            'sort_order': 1,
        }
    )


def reverse_wedding_configuration(apps, schema_editor):
    """Reverse the wedding configuration."""
    Venue = apps.get_model('venues', 'Venue')
    ProductOption = apps.get_model('products', 'ProductOption')
    ProductCategory = apps.get_model('products', 'ProductCategory')
    EventType = apps.get_model('events', 'EventType')

    # Get wedding event type
    wedding_event_type = EventType.objects.filter(name='Wedding').first()

    # Delete wedding packages (PackageVenue will cascade)
    if wedding_event_type:
        ProductOption.objects.filter(
            event_types=wedding_event_type,
            type='PACKAGE'
        ).delete()

    # Delete add-ons
    ProductOption.objects.filter(name='Parachute Tent').delete()

    # Delete new venues
    Venue.objects.filter(code__in=['ANGELIC_FIELD', 'AL_FRESCO', 'CABANA_3_4', 'PRENUP_VENUE']).delete()

    # Revert Cabana 1&2 back to Cabana
    cabana = Venue.objects.filter(code='CABANA_1_2').first()
    if cabana:
        cabana.code = 'CABANA'
        cabana.name = 'Cabana'
        cabana.save()

    # Note: We don't revert pricing changes to existing venues as that would be data loss


class Migration(migrations.Migration):

    dependencies = [
        ('venues', '0006_add_amenities_field'),
        ('products', '0013_remove_tax_rate_from_productoption'),
        ('events', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_wedding_configuration, reverse_wedding_configuration),
    ]
