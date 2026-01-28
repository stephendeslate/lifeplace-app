# backend/core/domains/vip/migrations/0005_configure_lifeplace_rewards.py
"""
Data migration to configure LifePlace Rewards VIP program.

Updates:
- VIPSettings: Enable points, rename program, set earning criteria
- VIPTiers: Rename Standard to Guest, add Partner and Premier tiers
- VIPBenefits: Add benefits for Partner and Premier tiers
"""
from decimal import Decimal

from django.db import migrations


def configure_vip_program(apps, schema_editor):
    """Configure the VIP program with CEO's specifications."""
    VIPSettings = apps.get_model('vip', 'VIPSettings')
    VIPTier = apps.get_model('vip', 'VIPTier')
    VIPBenefit = apps.get_model('vip', 'VIPBenefit')

    # Update VIP Settings
    settings, _ = VIPSettings.objects.get_or_create(pk=1)
    settings.program_name = "LifePlace Rewards"
    settings.earning_automatic_enabled = True
    settings.earning_points_enabled = True
    settings.earning_manual_enabled = True
    settings.automatic_earning_type = "BOTH"
    settings.points_per_currency_spent = Decimal('1.00')
    settings.points_currency_unit = Decimal('100.00')
    settings.points_expiry_months = 12
    settings.expiration_type = "NEVER"
    settings.show_vip_status_to_client = True
    settings.show_tier_progress_to_client = True
    settings.show_available_rewards_to_client = True
    settings.show_points_balance_to_client = False  # Keep points "invisible"
    settings.save()

    # Update or create Guest tier (was Standard)
    guest_tier, _ = VIPTier.objects.update_or_create(
        level=0,
        defaults={
            'name': 'Guest',
            'slug': 'guest',
            'description': 'Welcome to LifePlace! Start your journey with us.',
            'is_default': True,
            'min_total_spent': None,
            'min_completed_bookings': None,
            'min_points_required': None,
            'color': '#6B7280',
            'icon': 'person',
            'is_active': True,
        }
    )

    # Create Partner tier
    partner_tier, _ = VIPTier.objects.update_or_create(
        level=1,
        defaults={
            'name': 'Partner',
            'slug': 'partner',
            'description': 'Valued partners enjoy priority booking and exclusive perks.',
            'is_default': False,
            'min_total_spent': Decimal('100000.00'),
            'min_completed_bookings': 2,
            'min_points_required': None,
            'color': '#3B82F6',
            'icon': 'handshake',
            'is_active': True,
        }
    )

    # Create Premier tier
    premier_tier, _ = VIPTier.objects.update_or_create(
        level=2,
        defaults={
            'name': 'Premier',
            'slug': 'premier',
            'description': 'Our most valued clients with premium access and exclusive benefits.',
            'is_default': False,
            'min_total_spent': Decimal('250000.00'),
            'min_completed_bookings': 4,
            'min_points_required': None,
            'color': '#F59E0B',
            'icon': 'star',
            'is_active': True,
        }
    )

    # Create Partner benefits
    VIPBenefit.objects.update_or_create(
        tier=partner_tier,
        benefit_type='PRIORITY_BOOKING',
        defaults={
            'application_mode': 'AUTOMATIC',
            'value': None,
            'max_uses_per_booking': None,
            'max_uses_per_month': None,
            'points_cost': 0,
            'is_active': True,
            'description': 'Partner members get priority access to booking dates',
            'display_name': 'Priority Booking Access',
        }
    )

    VIPBenefit.objects.update_or_create(
        tier=partner_tier,
        benefit_type='FREE_HOURS',
        defaults={
            'application_mode': 'REDEEMABLE',
            'value': Decimal('1.00'),
            'max_uses_per_booking': 1,
            'max_uses_per_month': 2,
            'points_cost': 500,
            'is_active': True,
            'description': 'Redeem for 1 free excess hour per booking',
            'display_name': 'Free Hour',
        }
    )

    # Create Premier benefits
    VIPBenefit.objects.update_or_create(
        tier=premier_tier,
        benefit_type='PRIORITY_BOOKING',
        defaults={
            'application_mode': 'AUTOMATIC',
            'value': None,
            'max_uses_per_booking': None,
            'max_uses_per_month': None,
            'points_cost': 0,
            'is_active': True,
            'description': 'Premier members get top priority access to booking dates',
            'display_name': 'Premier Priority Booking',
        }
    )

    VIPBenefit.objects.update_or_create(
        tier=premier_tier,
        benefit_type='FREE_HOURS',
        defaults={
            'application_mode': 'REDEEMABLE',
            'value': Decimal('2.00'),
            'max_uses_per_booking': 1,
            'max_uses_per_month': 4,
            'points_cost': 500,
            'is_active': True,
            'description': 'Redeem for 2 free excess hours per booking',
            'display_name': 'Free Hours (2 hrs)',
        }
    )

    VIPBenefit.objects.update_or_create(
        tier=premier_tier,
        benefit_type='EXCLUSIVE_PACKAGE',
        defaults={
            'application_mode': 'AUTOMATIC',
            'value': None,
            'max_uses_per_booking': None,
            'max_uses_per_month': None,
            'points_cost': 0,
            'is_active': True,
            'description': 'Access to Premier-exclusive packages and offerings',
            'display_name': 'Exclusive Package Access',
        }
    )

    VIPBenefit.objects.update_or_create(
        tier=premier_tier,
        benefit_type='COMPLIMENTARY_ADDON',
        defaults={
            'application_mode': 'REDEEMABLE',
            'value': None,
            'max_uses_per_booking': 1,
            'max_uses_per_month': 2,
            'points_cost': 750,
            'is_active': True,
            'description': 'Redeem for a complimentary add-on service',
            'display_name': 'Complimentary Add-on',
        }
    )

    VIPBenefit.objects.update_or_create(
        tier=premier_tier,
        benefit_type='WAIVE_RESCHEDULING_FEE',
        defaults={
            'application_mode': 'AUTOMATIC',
            'value': None,
            'max_uses_per_booking': 1,
            'max_uses_per_month': None,
            'points_cost': 0,
            'is_active': True,
            'description': 'Rescheduling fees automatically waived for Premier members',
            'display_name': 'Free Rescheduling',
        }
    )

    VIPBenefit.objects.update_or_create(
        tier=premier_tier,
        benefit_type='WAIVE_LATE_FEE',
        defaults={
            'application_mode': 'AUTOMATIC',
            'value': None,
            'max_uses_per_booking': 1,
            'max_uses_per_month': None,
            'points_cost': 0,
            'is_active': True,
            'description': 'Late payment fees automatically waived for Premier members',
            'display_name': 'Late Fee Waiver',
        }
    )


def reverse_vip_program(apps, schema_editor):
    """Reverse the VIP configuration - restore defaults."""
    VIPSettings = apps.get_model('vip', 'VIPSettings')
    VIPTier = apps.get_model('vip', 'VIPTier')
    VIPBenefit = apps.get_model('vip', 'VIPBenefit')

    # Reset settings
    try:
        settings = VIPSettings.objects.get(pk=1)
        settings.program_name = "VIP Program"
        settings.earning_points_enabled = False
        settings.automatic_earning_type = "SPENDING"
        settings.points_expiry_months = 0
        settings.show_points_balance_to_client = True
        settings.save()
    except VIPSettings.DoesNotExist:
        pass

    # Delete Partner and Premier tiers (and their benefits cascade)
    VIPTier.objects.filter(level__in=[1, 2]).delete()

    # Rename Guest back to Standard
    VIPTier.objects.filter(level=0).update(
        name='Standard',
        slug='standard',
        description='Default tier for all clients',
        icon='',
    )


class Migration(migrations.Migration):

    dependencies = [
        ('vip', '0004_remove_clientvipstatus_vip_status_expires_idx'),
    ]

    operations = [
        migrations.RunPython(configure_vip_program, reverse_vip_program),
    ]
