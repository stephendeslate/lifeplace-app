# backend/core/domains/venues/migrations/0008_seed_all_event_types_and_packages.py
"""
Comprehensive data migration to configure all event types and packages.

This migration:
1. Creates new venues: Havilah Hostel, The Pool
2. Updates Open Field price to ₱70,000 (per website)
3. Creates event types: Camps & Retreats, Team Building, Workshops
4. Creates Camps & Retreats packages (12 products)
5. Creates Team Building packages (5 products)
6. Creates All-In Wedding packages (4 products with quote workflow)
7. Creates add-ons for various event types
8. Links packages to venues via PackageVenue
"""
from django.db import migrations
from decimal import Decimal
from datetime import time


def seed_all_event_configuration(apps, schema_editor):
    """Configure all event types, venues, and packages."""
    Venue = apps.get_model('venues', 'Venue')
    VenueOperatingRules = apps.get_model('venues', 'VenueOperatingRules')
    PackageVenue = apps.get_model('venues', 'PackageVenue')
    ProductOption = apps.get_model('products', 'ProductOption')
    ProductCategory = apps.get_model('products', 'ProductCategory')
    EventType = apps.get_model('events', 'EventType')

    # =====================================================
    # PART 1: CREATE NEW VENUES
    # =====================================================

    # Create Havilah Hostel
    havilah, created = Venue.objects.get_or_create(
        code='HAVILAH',
        defaults={
            'name': 'Havilah Hostel',
            'description': 'Hostel accommodation for camps and retreats. Accommodates 150-300 guests for overnight stays.',
            'is_overnight': True,
            'minimum_capacity': 80,
            'maximum_capacity': 300,
            'recommended_capacity': 150,
            'is_active': True,
            'is_bookable': True,
            'is_rentable_standalone': False,  # Only available in packages
            'amenities': ['Dormitory-style accommodation', 'Shared facilities', 'Large group capacity'],
            'sort_order': 8,
        }
    )
    if created:
        VenueOperatingRules.objects.create(
            venue=havilah,
            default_check_in_time=time(14, 0),  # 2:00 PM
            default_checkout_time=time(12, 0),  # 12:00 PM next day
            checkout_next_day=True,
            minimum_program_hours=Decimal('22.0'),
            maximum_program_hours=Decimal('72.0'),  # Up to 3 nights
            default_program_hours=Decimal('22.0'),
            is_fixed_duration=False,
            ingress_hours=Decimal('0'),
            egress_hours=Decimal('0'),
            early_checkin_allowed=False,
            late_checkout_allowed=False,
            custom_rules={
                'policies': [
                    {'code': 'GROUP_ONLY', 'description': 'Available for group bookings only (minimum 80 pax)'},
                    {'code': 'DORMITORY', 'description': 'Dormitory-style shared accommodation'},
                ],
            }
        )

    # Create The Pool
    pool, created = Venue.objects.get_or_create(
        code='POOL',
        defaults={
            'name': 'The Pool',
            'description': 'Pool venue for intimate celebrations. Includes string lights.',
            'is_overnight': False,
            'minimum_capacity': 50,
            'maximum_capacity': 80,
            'recommended_capacity': 70,
            'is_active': True,
            'is_bookable': True,
            'is_rentable_standalone': True,
            'standalone_base_price': Decimal('45000.00'),
            'standalone_included_hours': Decimal('3.0'),
            'standalone_excess_hour_price': Decimal('10000.00'),
            'amenities': ['String Lights', 'FREE Prenup Venue', 'Pool Access'],
            'sort_order': 9,
        }
    )
    if created:
        VenueOperatingRules.objects.create(
            venue=pool,
            default_check_in_time=time(8, 0),
            default_checkout_time=time(21, 0),
            checkout_next_day=False,
            minimum_program_hours=Decimal('2.0'),
            maximum_program_hours=Decimal('6.0'),
            default_program_hours=Decimal('3.0'),
            is_fixed_duration=False,
            ingress_hours=Decimal('2.0'),
            egress_hours=Decimal('1.0'),
            allow_custom_ingress=True,
            allow_custom_egress=True,
            earliest_start_time=time(10, 0),
            latest_end_time=time(21, 0),
            early_checkin_allowed=False,
            late_checkout_allowed=False,
            custom_rules={
                'policies': [
                    {'code': 'POOL_RULES', 'description': 'Standard pool safety rules apply'},
                ],
            }
        )

    # =====================================================
    # PART 2: UPDATE OPEN FIELD PRICE (PER WEBSITE)
    # =====================================================

    open_field = Venue.objects.filter(code='OPEN_FIELD').first()
    if open_field:
        open_field.standalone_base_price = Decimal('70000.00')
        open_field.description = 'Large outdoor venue for 200-220 pax. Optional ceiling treatment available (+₱40,000).'
        open_field.save()

    # =====================================================
    # PART 3: CREATE EVENT TYPES
    # =====================================================

    camps_event_type, _ = EventType.objects.get_or_create(
        name='Camps & Retreats',
        defaults={'description': 'Multi-day group events with accommodation, meals, and activities', 'is_active': True}
    )

    team_building_event_type, _ = EventType.objects.get_or_create(
        name='Team Building',
        defaults={'description': 'Corporate team activities and facilitation', 'is_active': True}
    )

    workshops_event_type, _ = EventType.objects.get_or_create(
        name='Workshops',
        defaults={'description': 'Educational and training events', 'is_active': True}
    )

    wedding_event_type = EventType.objects.filter(name='Wedding').first()

    # =====================================================
    # PART 4: CREATE PRODUCT CATEGORIES
    # =====================================================

    # Camps & Retreats Categories
    camps_category, _ = ProductCategory.objects.get_or_create(
        slug='camps-retreats',
        defaults={
            'name': 'Camps & Retreats',
            'description': 'Packages for camps, retreats, and multi-day group events',
            'is_active': True,
            'requires_venue': False,
            'sort_order': 10,
        }
    )

    budget_category, _ = ProductCategory.objects.get_or_create(
        slug='camps-budget',
        defaults={
            'name': 'Budget Packages',
            'description': 'Economical packages with basic inclusions',
            'parent': camps_category,
            'is_active': True,
            'sort_order': 1,
        }
    )

    basic_category, _ = ProductCategory.objects.get_or_create(
        slug='camps-basic',
        defaults={
            'name': 'Basic Packages',
            'description': 'Standard packages with Havilah accommodation and meals',
            'parent': camps_category,
            'is_active': True,
            'sort_order': 2,
        }
    )

    premium_category, _ = ProductCategory.objects.get_or_create(
        slug='camps-premium',
        defaults={
            'name': 'Premium Packages',
            'description': 'Full-featured packages with cabanas and function hall',
            'parent': camps_category,
            'is_active': True,
            'sort_order': 3,
        }
    )

    # Team Building Categories
    tb_category, _ = ProductCategory.objects.get_or_create(
        slug='team-building',
        defaults={
            'name': 'Team Building',
            'description': 'Corporate team building packages',
            'is_active': True,
            'requires_venue': False,
            'sort_order': 20,
        }
    )

    tb_facilitation_category, _ = ProductCategory.objects.get_or_create(
        slug='tb-facilitation',
        defaults={
            'name': 'Facilitation Only',
            'description': 'Team building facilitation services (venue/meals separate)',
            'parent': tb_category,
            'is_active': True,
            'sort_order': 1,
        }
    )

    tb_allin_category, _ = ProductCategory.objects.get_or_create(
        slug='tb-all-in',
        defaults={
            'name': 'All-In Packages',
            'description': 'Complete team building packages with venue, meals, and facilitation',
            'parent': tb_category,
            'is_active': True,
            'sort_order': 2,
        }
    )

    # All-In Wedding Category
    allin_wedding_category, _ = ProductCategory.objects.get_or_create(
        slug='all-in-weddings',
        defaults={
            'name': 'All-In Wedding Packages',
            'description': 'Complete wedding packages including venue, catering, photography, and more',
            'is_active': True,
            'requires_venue': True,
            'sort_order': 5,
        }
    )

    # Add-ons Category
    addons_category, _ = ProductCategory.objects.get_or_create(
        slug='event-addons',
        defaults={
            'name': 'Event Add-ons',
            'description': 'Optional add-on services and facilities',
            'is_active': True,
            'sort_order': 100,
        }
    )

    # =====================================================
    # PART 5: CREATE CAMPS & RETREATS PACKAGES
    # =====================================================

    # Get venue references
    havilah = Venue.objects.filter(code='HAVILAH').first()
    pool_venue = Venue.objects.filter(code='POOL').first()
    cabana_1_2 = Venue.objects.filter(code='CABANA_1_2').first()
    cabana_3_4 = Venue.objects.filter(code='CABANA_3_4').first()

    # Helper function for package descriptions
    def get_camp_description(tier, duration, meals, accommodation, inclusions):
        desc = f"{tier} Package - {duration}\n\n"
        desc += f"Meals: {meals}\n"
        desc += f"Accommodation: {accommodation}\n\n"
        desc += "Inclusions:\n"
        for inc in inclusions:
            desc += f"• {inc}\n"
        desc += "\nMinimum 80 participants required.\n"
        desc += "12% VAT not included."
        return desc

    # --- BUDGET PACKAGES ---
    budget_day, _ = ProductOption.objects.get_or_create(
        name='Budget Package - Day Trip',
        category=budget_category,
        defaults={
            'description': get_camp_description(
                'Budget', 'Day Trip', '0 meals', 'None',
                ['Use of all venue facilities']
            ),
            'pricing_model': 'FIXED',
            'base_price': Decimal('450.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'sort_order': 1,
        }
    )
    budget_day.event_types.add(camps_event_type)

    budget_overnight, _ = ProductOption.objects.get_or_create(
        name='Budget Package - Overnight',
        category=budget_category,
        defaults={
            'description': get_camp_description(
                'Budget', 'Overnight (1 night)', '0 meals', 'Camping tent',
                ['Use of all venue facilities', 'Camping tent accommodation']
            ),
            'pricing_model': 'FIXED',
            'base_price': Decimal('650.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'event_days': 2,
            'sort_order': 2,
        }
    )
    budget_overnight.event_types.add(camps_event_type)

    # --- BASIC PACKAGES ---
    basic_day = ProductOption.objects.get_or_create(
        name='Basic Package - Day Trip',
        category=basic_category,
        defaults={
            'description': get_camp_description(
                'Basic', 'Day Trip', '2 meals', 'None',
                ['Facility access', 'Swimming pool access', 'Upgraded sound system']
            ),
            'pricing_model': 'FIXED',
            'base_price': Decimal('640.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'sort_order': 1,
        }
    )[0]
    basic_day.event_types.add(camps_event_type)

    basic_2d1n = ProductOption.objects.get_or_create(
        name='Basic Package - 2D1N',
        category=basic_category,
        defaults={
            'description': get_camp_description(
                'Basic', '2 Days 1 Night', '4 meals', 'Havilah Hostel',
                ['Havilah accommodation', 'All facility access', 'Swimming pool access',
                 'Upgraded sound system', 'Service charge']
            ),
            'pricing_model': 'FIXED',
            'base_price': Decimal('1980.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'event_days': 2,
            'sort_order': 2,
        }
    )[0]
    basic_2d1n.event_types.add(camps_event_type)

    basic_3d2n = ProductOption.objects.get_or_create(
        name='Basic Package - 3D2N',
        category=basic_category,
        defaults={
            'description': get_camp_description(
                'Basic', '3 Days 2 Nights (Most Popular)', '7 meals', 'Havilah Hostel',
                ['Havilah accommodation', 'All facility access', 'Swimming pool access',
                 'Upgraded sound system', 'Service charge']
            ),
            'pricing_model': 'FIXED',
            'base_price': Decimal('3650.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'is_featured': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'event_days': 3,
            'sort_order': 3,
        }
    )[0]
    basic_3d2n.event_types.add(camps_event_type)

    basic_4d3n = ProductOption.objects.get_or_create(
        name='Basic Package - 4D3N',
        category=basic_category,
        defaults={
            'description': get_camp_description(
                'Basic', '4 Days 3 Nights', '10 meals', 'Havilah Hostel',
                ['Havilah accommodation', 'All facility access', 'Swimming pool access',
                 'Upgraded sound system', 'Service charge']
            ),
            'pricing_model': 'FIXED',
            'base_price': Decimal('5150.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'event_days': 4,
            'sort_order': 4,
        }
    )[0]
    basic_4d3n.event_types.add(camps_event_type)

    # --- PREMIUM PACKAGES ---
    premium_day = ProductOption.objects.get_or_create(
        name='Premium Package - Day Trip',
        category=premium_category,
        defaults={
            'description': get_camp_description(
                'Premium', 'Day Trip', '2 meals', 'None',
                ['Havilah facility access', 'All venue facilities', 'Swimming pool access',
                 'Upgraded sound system', 'Service charge', 'Use of 4 cabanas', 'Function hall access']
            ),
            'pricing_model': 'FIXED',
            'base_price': Decimal('800.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'sort_order': 1,
        }
    )[0]
    premium_day.event_types.add(camps_event_type)

    premium_2d1n = ProductOption.objects.get_or_create(
        name='Premium Package - 2D1N',
        category=premium_category,
        defaults={
            'description': get_camp_description(
                'Premium', '2 Days 1 Night', '4 meals', 'Havilah Hostel',
                ['Havilah accommodation', 'All venue facilities', 'Swimming pool access',
                 'Upgraded sound system', 'Service charge', 'Use of 4 cabanas', 'Function hall access']
            ),
            'pricing_model': 'FIXED',
            'base_price': Decimal('2280.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'event_days': 2,
            'sort_order': 2,
        }
    )[0]
    premium_2d1n.event_types.add(camps_event_type)

    premium_3d2n = ProductOption.objects.get_or_create(
        name='Premium Package - 3D2N',
        category=premium_category,
        defaults={
            'description': get_camp_description(
                'Premium', '3 Days 2 Nights', '7 meals', 'Havilah Hostel',
                ['Havilah accommodation', 'All venue facilities', 'Swimming pool access',
                 'Upgraded sound system', 'Service charge', 'Use of 4 cabanas', 'Function hall access']
            ),
            'pricing_model': 'FIXED',
            'base_price': Decimal('4130.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'event_days': 3,
            'sort_order': 3,
        }
    )[0]
    premium_3d2n.event_types.add(camps_event_type)

    premium_4d3n = ProductOption.objects.get_or_create(
        name='Premium Package - 4D3N',
        category=premium_category,
        defaults={
            'description': get_camp_description(
                'Premium', '4 Days 3 Nights', '10 meals', 'Havilah Hostel',
                ['Havilah accommodation', 'All venue facilities', 'Swimming pool access',
                 'Upgraded sound system', 'Service charge', 'Use of 4 cabanas', 'Function hall access']
            ),
            'pricing_model': 'FIXED',
            'base_price': Decimal('5850.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'event_days': 4,
            'sort_order': 4,
        }
    )[0]
    premium_4d3n.event_types.add(camps_event_type)

    # Link Premium packages to venues (Cabanas + Havilah)
    def link_premium_package_venues(package, include_havilah=False):
        if cabana_1_2:
            PackageVenue.objects.get_or_create(
                package=package,
                venue=cabana_1_2,
                defaults={
                    'is_primary': False,
                    'is_bonus': False,
                    'notes': '2 cabanas included',
                }
            )
        if cabana_3_4:
            PackageVenue.objects.get_or_create(
                package=package,
                venue=cabana_3_4,
                defaults={
                    'is_primary': False,
                    'is_bonus': False,
                    'notes': '2 cabanas included',
                }
            )
        if include_havilah and havilah:
            PackageVenue.objects.get_or_create(
                package=package,
                venue=havilah,
                defaults={
                    'is_primary': True,
                    'is_bonus': False,
                    'notes': 'Havilah accommodation',
                }
            )

    link_premium_package_venues(premium_day, include_havilah=False)
    link_premium_package_venues(premium_2d1n, include_havilah=True)
    link_premium_package_venues(premium_3d2n, include_havilah=True)
    link_premium_package_venues(premium_4d3n, include_havilah=True)

    # Link Basic overnight packages to Havilah
    def link_basic_package_havilah(package):
        if havilah:
            PackageVenue.objects.get_or_create(
                package=package,
                venue=havilah,
                defaults={
                    'is_primary': True,
                    'is_bonus': False,
                    'notes': 'Havilah accommodation',
                }
            )

    link_basic_package_havilah(basic_2d1n)
    link_basic_package_havilah(basic_3d2n)
    link_basic_package_havilah(basic_4d3n)

    # Link day packages to Pool
    def link_pool_venue(package):
        if pool_venue:
            PackageVenue.objects.get_or_create(
                package=package,
                venue=pool_venue,
                defaults={
                    'is_primary': False,
                    'is_bonus': False,
                    'notes': 'Swimming pool access',
                }
            )

    link_pool_venue(basic_day)
    link_pool_venue(basic_2d1n)
    link_pool_venue(basic_3d2n)
    link_pool_venue(basic_4d3n)
    link_pool_venue(premium_day)
    link_pool_venue(premium_2d1n)
    link_pool_venue(premium_3d2n)
    link_pool_venue(premium_4d3n)

    # =====================================================
    # PART 6: CREATE TEAM BUILDING PACKAGES
    # =====================================================

    # Facilitation Only packages
    tb_facilitation_under100, _ = ProductOption.objects.get_or_create(
        name='Team Building Facilitation - Under 100 pax',
        category=tb_facilitation_category,
        defaults={
            'description': """Team Building Facilitation Package (Under 100 participants)

Inclusions:
• Professional team-building facilitator
• Certificates of participation
• Materials
• Game prizes
• Evaluation summary
• Raw photos/videos

Partner: M-Zone Team Building

Note: This is facilitation only. Venue and meals are separate.
Minimum 80 participants required.
12% VAT not included.""",
            'pricing_model': 'FIXED',
            'base_price': Decimal('1750.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'maximum_guests': 99,
            'sort_order': 1,
        }
    )
    tb_facilitation_under100.event_types.add(team_building_event_type)

    tb_facilitation_100plus, _ = ProductOption.objects.get_or_create(
        name='Team Building Facilitation - 100+ pax',
        category=tb_facilitation_category,
        defaults={
            'description': """Team Building Facilitation Package (100+ participants)

Inclusions:
• Professional team-building facilitator
• Certificates of participation
• Materials
• Game prizes
• Evaluation summary
• Raw photos/videos

Partner: M-Zone Team Building

Note: This is facilitation only. Venue and meals are separate.
12% VAT not included.""",
            'pricing_model': 'FIXED',
            'base_price': Decimal('1450.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 100,
            'sort_order': 2,
        }
    )
    tb_facilitation_100plus.event_types.add(team_building_event_type)

    # All-In Team Building packages
    tb_allin_day = ProductOption.objects.get_or_create(
        name='All-In Team Building - Day Trip',
        category=tb_allin_category,
        defaults={
            'description': """All-In Team Building Package - Day Trip

Meals: 2 plated meals
Accommodation: None

Inclusions:
• Facility access
• Swimming pool access
• Team-building facilitation services
• Audio & visual equipment
• Game prizes
• Certificates of participation
• Materials provided
• Evaluation summary
• Raw photos/videos

Partner: M-Zone Team Building

Minimum 80 participants required.
12% VAT not included.""",
            'pricing_model': 'FIXED',
            'base_price': Decimal('2390.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'sort_order': 1,
        }
    )[0]
    tb_allin_day.event_types.add(team_building_event_type)

    tb_allin_2d1n = ProductOption.objects.get_or_create(
        name='All-In Team Building - 2D1N',
        category=tb_allin_category,
        defaults={
            'description': """All-In Team Building Package - 2 Days 1 Night

Meals: 4 plated meals
Accommodation: Havilah Hostel

Inclusions:
• Havilah accommodation
• Facility access
• Swimming pool access
• Team-building facilitation services
• Audio & visual equipment
• Game prizes
• Certificates of participation
• Materials provided
• Evaluation summary
• Raw photos/videos

Partner: M-Zone Team Building

Minimum 80 participants required.
12% VAT not included.""",
            'pricing_model': 'FIXED',
            'base_price': Decimal('3730.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'event_days': 2,
            'sort_order': 2,
        }
    )[0]
    tb_allin_2d1n.event_types.add(team_building_event_type)

    tb_allin_3d2n = ProductOption.objects.get_or_create(
        name='All-In Team Building - 3D2N',
        category=tb_allin_category,
        defaults={
            'description': """All-In Team Building Package - 3 Days 2 Nights

Meals: 7 plated meals
Accommodation: Havilah Hostel

Inclusions:
• Havilah accommodation
• Facility access
• Swimming pool access
• Team-building facilitation services
• Audio & visual equipment
• Game prizes
• Certificates of participation
• Materials provided
• Evaluation summary
• Raw photos/videos

Partner: M-Zone Team Building

Minimum 80 participants required.
12% VAT not included.""",
            'pricing_model': 'FIXED',
            'base_price': Decimal('7150.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PACKAGE',
            'is_active': True,
            'allow_multiple': True,
            'minimum_guests': 80,
            'event_days': 3,
            'sort_order': 3,
        }
    )[0]
    tb_allin_3d2n.event_types.add(team_building_event_type)

    # Link Team Building packages to venues
    if havilah:
        PackageVenue.objects.get_or_create(package=tb_allin_2d1n, venue=havilah, defaults={'is_primary': True, 'notes': 'Havilah accommodation'})
        PackageVenue.objects.get_or_create(package=tb_allin_3d2n, venue=havilah, defaults={'is_primary': True, 'notes': 'Havilah accommodation'})
    if pool_venue:
        PackageVenue.objects.get_or_create(package=tb_allin_day, venue=pool_venue, defaults={'notes': 'Pool access'})
        PackageVenue.objects.get_or_create(package=tb_allin_2d1n, venue=pool_venue, defaults={'notes': 'Pool access'})
        PackageVenue.objects.get_or_create(package=tb_allin_3d2n, venue=pool_venue, defaults={'notes': 'Pool access'})

    # =====================================================
    # PART 7: CREATE ALL-IN WEDDING PACKAGES
    # =====================================================

    sanctuary = Venue.objects.filter(code='SANCTUARY').first()
    pavilion = Venue.objects.filter(code='PAVILION').first()
    open_field = Venue.objects.filter(code='OPEN_FIELD').first()
    angelic_field = Venue.objects.filter(code='ANGELIC_FIELD').first()
    prenup_venue = Venue.objects.filter(code='PRENUP_VENUE').first()

    allin_wedding_description = """Complete wedding package including:

VENUE & SETUP:
• 6-hour venue use
• Ceremony flowers and entourage arrangements
• Decorated arches
• Reception stage, tables, linens
• Tiffany chairs and table décor
• Round-the-clock security
• 20-23 parking slots

CATERING:
• Full buffet service
• Main courses and desserts
• Unlimited beverages

SERVICES:
• Photography (full day coverage)
• Videography with same-day edit
• Host/emcee with program planning
• Sound system and lighting
• 1 Event manager + 4 coordinators

FREEBIES:
• Prenup photo shoot
• Al fresco cocktails
• Pool access
• Acoustic duo

Contact us for custom quote based on guest count.
Starting price shown is for 100 guests.
Additional guests: approximately ₱979-1,089/person depending on venue."""

    # All-In Wedding - Sanctuary & Pavilion
    allin_sp = ProductOption.objects.get_or_create(
        name='All-In Wedding - Sanctuary & Pavilion',
        category=allin_wedding_category,
        defaults={
            'description': f"Ceremony at The Sanctuary + Reception at The Pavilion\n\n{allin_wedding_description}",
            'pricing_model': 'CUSTOM',
            'base_price': Decimal('457150.00'),
            'currency': 'PHP',
            'is_tax_inclusive': True,
            'type': 'PACKAGE',
            'is_active': True,
            'is_featured': True,
            'requires_approval': True,
            'minimum_guests': 100,
            'minimum_hours': 6,
            'sort_order': 1,
        }
    )[0]
    if wedding_event_type:
        allin_sp.event_types.add(wedding_event_type)

    # All-In Wedding - Sanctuary & Open Field
    allin_so = ProductOption.objects.get_or_create(
        name='All-In Wedding - Sanctuary & Open Field',
        category=allin_wedding_category,
        defaults={
            'description': f"Ceremony at The Sanctuary + Reception at The Open Field\n\n{allin_wedding_description}",
            'pricing_model': 'CUSTOM',
            'base_price': Decimal('462550.00'),
            'currency': 'PHP',
            'is_tax_inclusive': True,
            'type': 'PACKAGE',
            'is_active': True,
            'is_featured': True,
            'requires_approval': True,
            'minimum_guests': 100,
            'minimum_hours': 6,
            'sort_order': 2,
        }
    )[0]
    if wedding_event_type:
        allin_so.event_types.add(wedding_event_type)

    # All-In Wedding - Angelic Field & Pavilion
    allin_ap = ProductOption.objects.get_or_create(
        name='All-In Wedding - Angelic Field & Pavilion',
        category=allin_wedding_category,
        defaults={
            'description': f"Garden Ceremony at The Angelic Field + Reception at The Pavilion\n\n{allin_wedding_description}",
            'pricing_model': 'CUSTOM',
            'base_price': Decimal('455000.00'),
            'currency': 'PHP',
            'is_tax_inclusive': True,
            'type': 'PACKAGE',
            'is_active': True,
            'requires_approval': True,
            'minimum_guests': 100,
            'minimum_hours': 6,
            'sort_order': 3,
        }
    )[0]
    if wedding_event_type:
        allin_ap.event_types.add(wedding_event_type)

    # All-In Wedding - Angelic Field & Open Field
    allin_ao = ProductOption.objects.get_or_create(
        name='All-In Wedding - Angelic Field & Open Field',
        category=allin_wedding_category,
        defaults={
            'description': f"Garden Ceremony at The Angelic Field + Reception at The Open Field\n\n{allin_wedding_description}",
            'pricing_model': 'CUSTOM',
            'base_price': Decimal('460000.00'),
            'currency': 'PHP',
            'is_tax_inclusive': True,
            'type': 'PACKAGE',
            'is_active': True,
            'requires_approval': True,
            'minimum_guests': 100,
            'minimum_hours': 6,
            'sort_order': 4,
        }
    )[0]
    if wedding_event_type:
        allin_ao.event_types.add(wedding_event_type)

    # Link All-In Wedding packages to venues
    def link_allin_wedding_venues(package, ceremony_venue, reception_venue):
        if ceremony_venue:
            PackageVenue.objects.get_or_create(
                package=package, venue=ceremony_venue,
                defaults={'is_primary': True, 'access_order': 1, 'access_duration_hours': Decimal('3.0'), 'notes': 'Ceremony venue'}
            )
        if reception_venue:
            PackageVenue.objects.get_or_create(
                package=package, venue=reception_venue,
                defaults={'is_primary': False, 'access_order': 2, 'access_duration_hours': Decimal('3.0'), 'notes': 'Reception venue'}
            )
        if prenup_venue:
            PackageVenue.objects.get_or_create(
                package=package, venue=prenup_venue,
                defaults={'is_bonus': True, 'notes': 'FREE Prenup shoot'}
            )
        if cabana_1_2:
            PackageVenue.objects.get_or_create(
                package=package, venue=cabana_1_2,
                defaults={'is_bonus': True, 'notes': 'FREE Cabanas (2 units)'}
            )
        if cabana_3_4:
            PackageVenue.objects.get_or_create(
                package=package, venue=cabana_3_4,
                defaults={'is_bonus': True, 'notes': 'FREE Cabanas (2 units)'}
            )
        if pool_venue:
            PackageVenue.objects.get_or_create(
                package=package, venue=pool_venue,
                defaults={'is_bonus': True, 'notes': 'FREE Pool access'}
            )

    link_allin_wedding_venues(allin_sp, sanctuary, pavilion)
    link_allin_wedding_venues(allin_so, sanctuary, open_field)
    link_allin_wedding_venues(allin_ap, angelic_field, pavilion)
    link_allin_wedding_venues(allin_ao, angelic_field, open_field)

    # =====================================================
    # PART 8: CREATE ADD-ONS
    # =====================================================

    # Wedding Add-ons
    ProductOption.objects.get_or_create(
        name='Ceiling Treatment',
        category=addons_category,
        defaults={
            'description': 'Ceiling treatment/decor for The Open Field venue',
            'pricing_model': 'FIXED',
            'base_price': Decimal('40000.00'),
            'currency': 'PHP',
            'is_tax_inclusive': True,
            'type': 'PRODUCT',
            'is_active': True,
            'sort_order': 1,
        }
    )

    # Camps Add-ons
    ProductOption.objects.get_or_create(
        name='Kitchen Facility',
        category=addons_category,
        defaults={
            'description': 'Kitchen facility rental (per day)',
            'pricing_model': 'FIXED',
            'base_price': Decimal('5000.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PRODUCT',
            'is_active': True,
            'allow_multiple': True,
            'sort_order': 10,
        }
    )

    ProductOption.objects.get_or_create(
        name='Pool Access',
        category=addons_category,
        defaults={
            'description': 'Swimming pool access (per person, per day). For Budget package add-on.',
            'pricing_model': 'FIXED',
            'base_price': Decimal('150.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PRODUCT',
            'is_active': True,
            'allow_multiple': True,
            'sort_order': 11,
        }
    )

    ProductOption.objects.get_or_create(
        name='Function Hall - Full Day',
        category=addons_category,
        defaults={
            'description': 'Air-conditioned function hall (full day rental)',
            'pricing_model': 'FIXED',
            'base_price': Decimal('10000.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PRODUCT',
            'is_active': True,
            'sort_order': 12,
        }
    )

    ProductOption.objects.get_or_create(
        name='Function Hall - Half Day',
        category=addons_category,
        defaults={
            'description': 'Air-conditioned function hall (half day rental)',
            'pricing_model': 'FIXED',
            'base_price': Decimal('5000.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PRODUCT',
            'is_active': True,
            'sort_order': 13,
        }
    )

    ProductOption.objects.get_or_create(
        name='Enhanced Sound System',
        category=addons_category,
        defaults={
            'description': 'Upgraded sound system (per day)',
            'pricing_model': 'FIXED',
            'base_price': Decimal('2500.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PRODUCT',
            'is_active': True,
            'allow_multiple': True,
            'sort_order': 14,
        }
    )

    ProductOption.objects.get_or_create(
        name='Havilah Upgrade',
        category=addons_category,
        defaults={
            'description': 'Upgrade from camping to Havilah accommodation (per person, per night). For Budget package.',
            'pricing_model': 'FIXED',
            'base_price': Decimal('840.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PRODUCT',
            'is_active': True,
            'allow_multiple': True,
            'sort_order': 15,
        }
    )

    ProductOption.objects.get_or_create(
        name='Cabana Upgrade',
        category=addons_category,
        defaults={
            'description': 'Add cabana accommodation (per cabana, per night). Cabana 1&2: ₱3,300, Cabana 3&4: ₱3,500',
            'pricing_model': 'FIXED',
            'base_price': Decimal('3300.00'),
            'currency': 'PHP',
            'is_tax_inclusive': False,
            'type': 'PRODUCT',
            'is_active': True,
            'allow_multiple': True,
            'sort_order': 16,
        }
    )


def reverse_all_event_configuration(apps, schema_editor):
    """Reverse the event configuration."""
    Venue = apps.get_model('venues', 'Venue')
    ProductOption = apps.get_model('products', 'ProductOption')
    ProductCategory = apps.get_model('products', 'ProductCategory')
    EventType = apps.get_model('events', 'EventType')

    # Delete new venues
    Venue.objects.filter(code__in=['HAVILAH', 'POOL']).delete()

    # Revert Open Field price
    open_field = Venue.objects.filter(code='OPEN_FIELD').first()
    if open_field:
        open_field.standalone_base_price = Decimal('34400.00')
        open_field.save()

    # Delete new categories (will cascade to products)
    ProductCategory.objects.filter(slug__in=[
        'camps-retreats', 'camps-budget', 'camps-basic', 'camps-premium',
        'team-building', 'tb-facilitation', 'tb-all-in',
        'all-in-weddings', 'event-addons'
    ]).delete()

    # Delete new event types
    EventType.objects.filter(name__in=['Camps & Retreats', 'Team Building', 'Workshops']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('venues', '0007_seed_wedding_venues_and_packages'),
        ('products', '0013_remove_tax_rate_from_productoption'),
        ('events', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_all_event_configuration, reverse_all_event_configuration),
    ]
