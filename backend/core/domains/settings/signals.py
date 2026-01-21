# backend/core/domains/settings/signals.py
"""
Settings domain signals.

Note: Seed data is now handled by the `seed_production_data` management command.
Run `python manage.py seed_production_data` after migrations to seed default data.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import CurrencySettings, CompanySettings
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=CompanySettings)
def invalidate_caches_on_company_update(sender, instance, **kwargs):
    """
    Invalidate relevant caches when company settings are updated.
    This ensures template variable schemas reflect the latest company data.
    """
    try:
        from core.domains.communications.cache_service import communications_cache_service
        communications_cache_service.invalidate_variable_schemas_cache()
        logger.info("Invalidated variable schemas cache after CompanySettings update")
    except Exception as e:
        logger.warning(f"Could not invalidate variable schemas cache: {e}")


@receiver(post_save, sender=User)
def create_user_currency_settings(sender, instance, created, **kwargs):
    """
    Create default currency settings for new users
    This ensures every user has currency settings available
    """
    if created:
        try:
            # Check if system settings exist, create if not
            system_settings = CurrencySettings.get_system_settings()

            # Create user settings based on system defaults
            # Note: This is optional - users can inherit from system settings without having their own record
            # For now, we'll let users inherit from system settings and only create personal settings when they customize
            logger.info(f"User {instance.id} created. Will inherit system currency settings.")

        except Exception as e:
            logger.error(f"Failed to setup currency settings for user {instance.id}: {e}")


@receiver(post_save, sender=CurrencySettings)
def currency_settings_updated(sender, instance, created, **kwargs):
    """
    Log currency settings changes for audit trail
    """
    action = "created" if created else "updated"
    scope = "system-wide" if instance.user is None else f"user {instance.user.id}"
    logger.info(
        f"Currency settings {action} for {scope}: "
        f"default_currency={instance.default_currency}, "
        f"enabled_currencies={instance.enabled_currencies}"
    )
