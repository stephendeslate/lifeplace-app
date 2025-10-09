#!/usr/bin/env python
"""
Populate wedding packages from LifePlace Alfonso website
https://lifeplacealfonso.com/wedding-package-ceremony-and-reception-rates/
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from core.domains.products.models import ProductCategory, ProductOption
from decimal import Decimal


def create_categories():
    """Create product categories for wedding packages"""
    print("\n=== Creating Product Categories ===")

    # Get or create main Weddings category
    weddings_cat, _ = ProductCategory.objects.get_or_create(
        name="Weddings",
        defaults={
            'description': 'Wedding ceremony and reception packages',
            'slug': 'weddings',
            'requires_venue': True,
            'typical_duration_hours': 6,
            'is_active': True,
            'sort_order': 1
        }
    )
    print(f"✓ Main category: {weddings_cat.name}")

    # Create Ceremony & Reception subcategory
    ceremony_reception_cat, created = ProductCategory.objects.get_or_create(
        name="Ceremony & Reception Packages",
        defaults={
            'description': '6-hour ceremony and reception venue packages',
            'slug': 'ceremony-reception-packages',
            'parent': weddings_cat,
            'requires_venue': True,
            'typical_duration_hours': 6,
            'is_active': True,
            'sort_order': 1
        }
    )
    print(f"{'✓ Created' if created else '✓ Found'}: {ceremony_reception_cat.full_path}")

    # Create All-Inclusive Packages subcategory
    all_inclusive_cat, created = ProductCategory.objects.get_or_create(
        name="All-Inclusive Wedding Packages",
        defaults={
            'description': 'Complete wedding packages including venue, catering, photography, and coordination',
            'slug': 'all-inclusive-wedding-packages',
            'parent': weddings_cat,
            'requires_venue': True,
            'typical_duration_hours': 6,
            'is_active': True,
            'sort_order': 2
        }
    )
    print(f"{'✓ Created' if created else '✓ Found'}: {all_inclusive_cat.full_path}")

    # Create Add-on Services category
    addon_cat, _ = ProductCategory.objects.get_or_create(
        name="Add-on Services",
        defaults={
            'description': 'Additional services and amenities',
            'slug': 'add-on-services',
            'requires_venue': False,
            'is_active': True,
            'sort_order': 10
        }
    )
    print(f"✓ Add-ons category: {addon_cat.name}")

    return {
        'weddings': weddings_cat,
        'ceremony_reception': ceremony_reception_cat,
        'all_inclusive': all_inclusive_cat,
        'addons': addon_cat
    }


def create_ceremony_reception_packages(category):
    """Create 6-hour ceremony and reception venue packages"""
    print("\n=== Creating Ceremony & Reception Packages (6 Hours) ===")

    # Standard inclusions for all ceremony & reception packages
    standard_inclusions = """Included amenities:
• Free Prenup Venue (worth PHP 10,000)
• Free 4 Cabanas (worth PHP 20,000)
• Ingress and egress time
• Free use of gazebos for suppliers
• Round-the-clock security
• Restrooms and shower rooms
• Parking space (20-23 slots)

Duration: 6 hours included"""

    packages = [
        {
            'name': 'The Sanctuary and Open Field',
            'base_price': Decimal('110000.00'),
            'description': f"""Premium ceremony and reception package featuring The Sanctuary for your ceremony and the spacious Open Field for your reception.

{standard_inclusions}""",
            'minimum_guests': None,
            'maximum_guests': None,
            'recommended_guests': 200,
            'sku': 'WED-SANCTUARY-OPENFIELD'
        },
        {
            'name': 'The Sanctuary and Pavilion',
            'base_price': Decimal('66000.00'),
            'description': f"""Elegant ceremony and reception package with The Sanctuary for your ceremony and the covered Pavilion for your reception.

Capacity: 100-130 guests

{standard_inclusions}""",
            'minimum_guests': 100,
            'maximum_guests': 130,
            'recommended_guests': 115,
            'sku': 'WED-SANCTUARY-PAVILION'
        },
        {
            'name': 'The Angelic Field and Open Field',
            'base_price': Decimal('100000.00'),
            'description': f"""Beautiful ceremony and reception package with The Angelic Field for your ceremony and the Open Field for your reception.

Capacity: 150-200 guests

{standard_inclusions}""",
            'minimum_guests': 150,
            'maximum_guests': 200,
            'recommended_guests': 175,
            'sku': 'WED-ANGELIC-OPENFIELD'
        },
        {
            'name': 'The Angelic Field and Pavilion',
            'base_price': Decimal('60000.00'),
            'description': f"""Charming ceremony and reception package featuring The Angelic Field for your ceremony and the Pavilion for your reception.

Capacity: 100-130 guests

{standard_inclusions}""",
            'minimum_guests': 100,
            'maximum_guests': 130,
            'recommended_guests': 115,
            'sku': 'WED-ANGELIC-PAVILION'
        }
    ]

    created_packages = []
    for pkg_data in packages:
        pkg, created = ProductOption.objects.update_or_create(
            sku=pkg_data['sku'],
            defaults={
                'name': pkg_data['name'],
                'description': pkg_data['description'],
                'category': category,
                'type': 'PACKAGE',
                'pricing_model': 'FIXED',
                'base_price': pkg_data['base_price'],
                'currency': 'PHP',
                'tax_rate': Decimal('0.00'),  # Price is inclusive
                'is_active': True,
                'is_featured': True,
                'allow_multiple': False,
                'requires_approval': True,
                'has_excess_hours': True,
                'included_hours': 6,
                'excess_hour_price': Decimal('5000.00'),  # Estimated based on typical venue pricing
                'minimum_hours': 6,
                'maximum_hours': 12,
                'minimum_guests': pkg_data['minimum_guests'],
                'maximum_guests': pkg_data['maximum_guests'],
                'recommended_guests': pkg_data['recommended_guests'],
                'advance_booking_days': 30,
                'sort_order': len(created_packages) + 1
            }
        )
        created_packages.append(pkg)
        print(f"{'✓ Created' if created else '✓ Updated'}: {pkg.name} - PHP {pkg.base_price:,.2f}")

    return created_packages


def create_all_inclusive_packages(category):
    """Create all-inclusive wedding packages with different guest counts"""
    print("\n=== Creating All-Inclusive Wedding Packages ===")

    # All-inclusive package details
    all_inclusive_description = """Comprehensive all-in wedding package including:

VENUE & SETUP:
• Ceremony and reception venue (6 hours)
• Free prenup venue (worth PHP 10,000)
• Free 4 cabanas (worth PHP 20,000)
• Event styling and decorations
• Tables, chairs, and linens

CATERING:
• Full meal service for all guests
• Beverage service
• Desserts and wedding cake

PHOTOGRAPHY & VIDEO:
• Professional photography coverage
• Video documentation
• Same-day edit video

COORDINATION:
• Full wedding coordination
• Day-of coordination team

AMENITIES:
• Ingress and egress time
• Gazebos for suppliers
• Security, restrooms, parking (20-23 slots)

Duration: 6 hours included"""

    packages = [
        # 100 Person Packages
        {
            'name': 'The Sanctuary and Open Field - All-In (100 persons)',
            'base_price': Decimal('457150.00'),
            'guest_count': 100,
            'venues': 'The Sanctuary and Open Field',
            'sku': 'WED-ALLIN-SANCTUARY-OPENFIELD-100'
        },
        {
            'name': 'The Sanctuary and Pavilion - All-In (100 persons)',
            'base_price': Decimal('385770.00'),
            'guest_count': 100,
            'venues': 'The Sanctuary and Pavilion',
            'sku': 'WED-ALLIN-SANCTUARY-PAVILION-100'
        },
        {
            'name': 'The Angelic Field and Open Field - All-In (100 persons)',
            'base_price': Decimal('462550.00'),
            'guest_count': 100,
            'venues': 'The Angelic Field and Open Field',
            'sku': 'WED-ALLIN-ANGELIC-OPENFIELD-100'
        },
        {
            'name': 'The Angelic Field and Pavilion - All-In (100 persons)',
            'base_price': Decimal('401550.00'),
            'guest_count': 100,
            'venues': 'The Angelic Field and Pavilion',
            'sku': 'WED-ALLIN-ANGELIC-PAVILION-100'
        },
        # 150 Person Packages
        {
            'name': 'The Sanctuary and Open Field - All-In (150 persons)',
            'base_price': Decimal('506100.00'),
            'guest_count': 150,
            'venues': 'The Sanctuary and Open Field',
            'sku': 'WED-ALLIN-SANCTUARY-OPENFIELD-150'
        },
        {
            'name': 'The Angelic Field and Open Field - All-In (150 persons)',
            'base_price': Decimal('517000.00'),
            'guest_count': 150,
            'venues': 'The Angelic Field and Open Field',
            'sku': 'WED-ALLIN-ANGELIC-OPENFIELD-150'
        }
    ]

    created_packages = []
    for pkg_data in packages:
        description = f"""Featuring {pkg_data['venues']} for {pkg_data['guest_count']} guests.

{all_inclusive_description}"""

        pkg, created = ProductOption.objects.update_or_create(
            sku=pkg_data['sku'],
            defaults={
                'name': pkg_data['name'],
                'description': description,
                'category': category,
                'type': 'PACKAGE',
                'pricing_model': 'FIXED',
                'base_price': pkg_data['base_price'],
                'currency': 'PHP',
                'tax_rate': Decimal('0.00'),  # Price is inclusive
                'is_active': True,
                'is_featured': True,
                'allow_multiple': False,
                'requires_approval': True,
                'has_excess_hours': True,
                'included_hours': 6,
                'excess_hour_price': Decimal('8000.00'),  # Higher rate for all-inclusive
                'minimum_hours': 6,
                'maximum_hours': 12,
                'minimum_guests': pkg_data['guest_count'],
                'maximum_guests': pkg_data['guest_count'],
                'recommended_guests': pkg_data['guest_count'],
                'advance_booking_days': 60,  # More advance notice for all-inclusive
                'sort_order': len(created_packages) + 1
            }
        )
        created_packages.append(pkg)
        print(f"{'✓ Created' if created else '✓ Updated'}: {pkg.name} - PHP {pkg.base_price:,.2f}")

    return created_packages


def create_addon_services(category):
    """Create add-on service products"""
    print("\n=== Creating Add-on Services ===")

    addons = [
        {
            'name': 'Prenup Photo Shoot Venue',
            'base_price': Decimal('10000.00'),
            'description': 'Use of LifePlace venue for prenuptial photo shoot. Includes access to gardens, fields, and scenic areas. 4-hour session.',
            'sku': 'ADDON-PRENUP-VENUE'
        },
        {
            'name': 'Cabana Rental (Set of 4)',
            'base_price': Decimal('20000.00'),
            'description': 'Rental of 4 cabanas for guest relaxation and shade. Perfect for outdoor events.',
            'sku': 'ADDON-CABANAS-4'
        },
        {
            'name': 'Single Cabana Rental',
            'base_price': Decimal('5000.00'),
            'description': 'Individual cabana rental for guest comfort.',
            'sku': 'ADDON-CABANA-SINGLE',
            'allow_multiple': True
        },
        {
            'name': 'Supplier Gazebo Access',
            'base_price': Decimal('0.00'),
            'description': 'Use of gazebo areas for supplier setup and operations during the event.',
            'sku': 'ADDON-GAZEBO'
        }
    ]

    created_addons = []
    for addon_data in addons:
        addon, created = ProductOption.objects.update_or_create(
            sku=addon_data['sku'],
            defaults={
                'name': addon_data['name'],
                'description': addon_data['description'],
                'category': category,
                'type': 'PRODUCT',
                'pricing_model': 'FIXED',
                'base_price': addon_data['base_price'],
                'currency': 'PHP',
                'tax_rate': Decimal('0.00'),
                'is_active': True,
                'is_featured': False,
                'allow_multiple': addon_data.get('allow_multiple', False),
                'requires_approval': False,
                'has_excess_hours': False,
                'advance_booking_days': 7,
                'sort_order': len(created_addons) + 1
            }
        )
        created_addons.append(addon)
        print(f"{'✓ Created' if created else '✓ Updated'}: {addon.name} - PHP {addon.base_price:,.2f}")

    return created_addons


def main():
    """Main execution function"""
    print("=" * 70)
    print("LIFEPLACE WEDDING PACKAGE DATA POPULATION")
    print("=" * 70)

    # Create categories
    categories = create_categories()

    # Create ceremony & reception packages
    ceremony_packages = create_ceremony_reception_packages(categories['ceremony_reception'])

    # Create all-inclusive packages
    all_inclusive_packages = create_all_inclusive_packages(categories['all_inclusive'])

    # Create add-on services
    addons = create_addon_services(categories['addons'])

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"✓ Product Categories: {ProductCategory.objects.count()}")
    print(f"✓ Ceremony & Reception Packages: {len(ceremony_packages)}")
    print(f"✓ All-Inclusive Packages: {len(all_inclusive_packages)}")
    print(f"✓ Add-on Services: {len(addons)}")
    print(f"✓ Total Product Options: {ProductOption.objects.count()}")
    print("\n✅ Data population complete!")


if __name__ == '__main__':
    main()
