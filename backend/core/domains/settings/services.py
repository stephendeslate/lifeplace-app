# backend/core/domains/settings/services.py

from django.core.exceptions import ValidationError
from django.db import transaction
from .models import AppSettings, CurrencySettings
import logging

logger = logging.getLogger(__name__)


class AppSettingsService:
    """
    Service class for managing application settings
    Following the pattern from other domain services
    """

    @staticmethod
    def get_setting(category, key, default=None, user=None):
        """Get a specific setting value"""
        return AppSettings.get_setting(category, key, default, user)

    @staticmethod
    def set_setting(category, key, value, description='', encrypt=False, user=None):
        """Set a specific setting value"""
        try:
            return AppSettings.set_setting(category, key, value, description, encrypt, user)
        except Exception as e:
            logger.error(f"Failed to set setting {category}.{key}: {e}")
            raise ValidationError(f"Failed to save setting: {str(e)}")

    @staticmethod
    def get_category_settings(category, user=None):
        """Get all settings for a category"""
        return AppSettings.get_category_settings(category, user)

    @staticmethod
    def bulk_update_settings(settings_data, user=None):
        """Bulk update multiple settings"""
        try:
            with transaction.atomic():
                updated_settings = []
                for setting_data in settings_data:
                    setting = AppSettingsService.set_setting(
                        category=setting_data['category'],
                        key=setting_data['key'],
                        value=setting_data['value'],
                        description=setting_data.get('description', ''),
                        encrypt=setting_data.get('encrypt', False),
                        user=user
                    )
                    updated_settings.append(setting)
                return updated_settings
        except Exception as e:
            logger.error(f"Failed to bulk update settings: {e}")
            raise ValidationError(f"Failed to update settings: {str(e)}")


class CurrencySettingsService:
    """
    Service class for managing currency settings
    Following the pattern from PaymentGatewayService and TaxRateService
    """

    @staticmethod
    def get_system_settings():
        """Get system-wide currency settings"""
        try:
            return CurrencySettings.get_system_settings()
        except Exception as e:
            logger.error(f"Failed to get system currency settings: {e}")
            raise ValidationError(f"Failed to retrieve currency settings: {str(e)}")

    @staticmethod
    def get_user_settings(user):
        """Get user-specific currency settings"""
        try:
            return CurrencySettings.get_user_settings(user)
        except Exception as e:
            logger.error(f"Failed to get user currency settings for user {user.id}: {e}")
            raise ValidationError(f"Failed to retrieve currency settings: {str(e)}")

    @staticmethod
    def create_currency_settings(data, user=None):
        """Create new currency settings"""
        try:
            with transaction.atomic():
                # Validate that we don't already have settings for this user/system
                existing_query = CurrencySettings.objects.filter(user=user)
                if existing_query.exists():
                    raise ValidationError("Currency settings already exist for this scope")

                # Set default enabled currencies if not provided
                if not data.get('enabled_currencies'):
                    data['enabled_currencies'] = [data.get('default_currency', 'PHP')]

                settings = CurrencySettings.objects.create(user=user, **data)
                logger.info(f"Created currency settings: {settings}")
                return settings

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create currency settings: {e}")
            raise ValidationError(f"Failed to create currency settings: {str(e)}")

    @staticmethod
    def update_currency_settings(settings_id, data, user=None):
        """Update existing currency settings"""
        try:
            with transaction.atomic():
                settings = CurrencySettings.objects.get(id=settings_id, user=user)
                
                # Update fields
                for field, value in data.items():
                    if hasattr(settings, field):
                        setattr(settings, field, value)
                
                # Validate and save
                settings.full_clean()
                settings.save()
                
                logger.info(f"Updated currency settings: {settings}")
                return settings

        except CurrencySettings.DoesNotExist:
            raise ValidationError("Currency settings not found")
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Failed to update currency settings {settings_id}: {e}")
            raise ValidationError(f"Failed to update currency settings: {str(e)}")

    @staticmethod
    def update_system_settings(data):
        """Update system-wide currency settings"""
        try:
            with transaction.atomic():
                settings = CurrencySettings.get_system_settings()
                
                # Update fields
                for field, value in data.items():
                    if hasattr(settings, field):
                        setattr(settings, field, value)
                
                # Validate and save
                settings.full_clean()
                settings.save()
                
                logger.info(f"Updated system currency settings: {settings}")
                return settings

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Failed to update system currency settings: {e}")
            raise ValidationError(f"Failed to update system currency settings: {str(e)}")

    @staticmethod
    def delete_currency_settings(settings_id, user=None):
        """Delete currency settings (only user settings, not system)"""
        try:
            with transaction.atomic():
                settings = CurrencySettings.objects.get(id=settings_id, user=user)
                
                if settings.user is None:
                    raise ValidationError("Cannot delete system-wide currency settings")
                
                settings.delete()
                logger.info(f"Deleted currency settings: {settings_id}")
                
        except CurrencySettings.DoesNotExist:
            raise ValidationError("Currency settings not found")
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Failed to delete currency settings {settings_id}: {e}")
            raise ValidationError(f"Failed to delete currency settings: {str(e)}")

    @staticmethod
    def reset_to_defaults(user=None):
        """Reset currency settings to defaults"""
        try:
            with transaction.atomic():
                if user is None:
                    # Reset system settings
                    settings = CurrencySettings.get_system_settings()
                    settings.default_currency = 'PHP'
                    settings.enabled_currencies = ['PHP']
                    settings.display_format = 'symbol'
                    settings.decimal_places = 0
                    settings.thousands_separator = ','
                    settings.decimal_separator = '.'
                    settings.auto_format = True
                    settings.compact_format = False
                    settings.save()
                else:
                    # Delete user settings to fall back to system defaults
                    CurrencySettings.objects.filter(user=user).delete()
                    settings = CurrencySettings.get_user_settings(user)
                
                logger.info(f"Reset currency settings to defaults for user: {user}")
                return settings

        except Exception as e:
            logger.error(f"Failed to reset currency settings: {e}")
            raise ValidationError(f"Failed to reset currency settings: {str(e)}")

    @staticmethod
    def get_supported_currencies():
        """Get list of supported currencies with metadata"""
        from .serializers import SupportedCurrenciesSerializer
        return SupportedCurrenciesSerializer.get_supported_currencies()

    @staticmethod
    def validate_currency_code(currency_code):
        """Validate if a currency code is supported"""
        supported_codes = [choice[0] for choice in CurrencySettings.SUPPORTED_CURRENCIES]
        return currency_code in supported_codes

    @staticmethod
    def get_currency_format_settings(user=None):
        """Get currency formatting settings for a user"""
        try:
            settings = CurrencySettings.get_user_settings(user) if user else CurrencySettings.get_system_settings()
            return {
                'default_currency': settings.default_currency,
                'enabled_currencies': settings.enabled_currencies,
                'display_format': settings.display_format,
                'decimal_places': settings.decimal_places,
                'thousands_separator': settings.thousands_separator,
                'decimal_separator': settings.decimal_separator,
                'auto_format': settings.auto_format,
                'compact_format': settings.compact_format,
            }
        except Exception as e:
            logger.error(f"Failed to get currency format settings: {e}")
            # Return safe defaults
            return {
                'default_currency': 'PHP',
                'enabled_currencies': ['PHP'],
                'display_format': 'symbol',
                'decimal_places': 0,
                'thousands_separator': ',',
                'decimal_separator': '.',
                'auto_format': True,
                'compact_format': False,
            }