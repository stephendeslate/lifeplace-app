"""
Unit tests for settings domain services.

Tests:
- AppSettingsService (centralized settings management)
- CurrencySettingsService (currency configuration management)
"""

import pytest
from unittest.mock import patch, MagicMock
from django.core.exceptions import ValidationError

from core.domains.settings.models import AppSettings, CurrencySettings
from core.domains.settings.services import AppSettingsService, CurrencySettingsService


@pytest.mark.django_db
class TestAppSettingsService:
    """Unit tests for the AppSettingsService class."""

    def test_get_setting_returns_value(self):
        """Test get_setting retrieves a setting value."""
        AppSettings.objects.create(
            category='SYSTEM',
            key='test_key',
            value={'test': 'value'}
        )

        result = AppSettingsService.get_setting('SYSTEM', 'test_key')

        assert result == {'test': 'value'}

    def test_get_setting_returns_default_when_not_found(self):
        """Test get_setting returns default when setting doesn't exist."""
        result = AppSettingsService.get_setting(
            'SYSTEM',
            'nonexistent',
            default={'default': True}
        )

        assert result == {'default': True}

    def test_get_setting_user_specific(self, user_factory):
        """Test get_setting retrieves user-specific settings."""
        user = user_factory()
        AppSettings.objects.create(
            category='NOTIFICATION',
            key='email_enabled',
            value={'enabled': True},
            user=user
        )

        result = AppSettingsService.get_setting('NOTIFICATION', 'email_enabled', user=user)

        assert result == {'enabled': True}

    def test_set_setting_creates_new(self):
        """Test set_setting creates a new setting."""
        setting = AppSettingsService.set_setting(
            category='SYSTEM',
            key='new_setting',
            value={'new': True},
            description='A new setting'
        )

        assert setting.category == 'SYSTEM'
        assert setting.key == 'new_setting'
        assert setting.value == {'new': True}
        assert setting.description == 'A new setting'

    def test_set_setting_updates_existing(self):
        """Test set_setting updates an existing setting."""
        AppSettingsService.set_setting('SYSTEM', 'update_me', {'old': True})
        setting = AppSettingsService.set_setting(
            'SYSTEM',
            'update_me',
            {'new': True},
            description='Updated'
        )

        assert setting.value == {'new': True}
        assert setting.description == 'Updated'
        assert AppSettings.objects.filter(category='SYSTEM', key='update_me').count() == 1

    def test_set_setting_with_encryption(self):
        """Test set_setting with encryption enabled."""
        setting = AppSettingsService.set_setting(
            category='PAYMENT',
            key='api_key',
            value={'secret': 'my_secret'},
            encrypt=True
        )

        assert setting.is_encrypted
        assert setting.encrypted_value == {'secret': 'my_secret'}
        assert setting.value == {}

    def test_set_setting_user_specific(self, user_factory):
        """Test set_setting creates user-specific setting."""
        user = user_factory()
        setting = AppSettingsService.set_setting(
            category='NOTIFICATION',
            key='dark_mode',
            value={'enabled': True},
            user=user
        )

        assert setting.user == user
        assert setting.value == {'enabled': True}

    def test_set_setting_raises_validation_error_on_failure(self, mocker):
        """Test set_setting raises ValidationError on exception."""
        mocker.patch.object(
            AppSettings.objects,
            'get_or_create',
            side_effect=Exception('Database error')
        )

        with pytest.raises(ValidationError) as exc_info:
            AppSettingsService.set_setting('SYSTEM', 'test', {'value': True})

        assert 'Failed to save setting' in str(exc_info.value)

    def test_get_category_settings(self):
        """Test get_category_settings retrieves all settings in a category."""
        AppSettingsService.set_setting('CURRENCY', 'default', {'value': 'PHP'})
        AppSettingsService.set_setting('CURRENCY', 'format', {'decimals': 0})
        AppSettingsService.set_setting('SYSTEM', 'other', {'unrelated': True})

        result = AppSettingsService.get_category_settings('CURRENCY')

        assert len(result) == 2
        assert result['default'] == {'value': 'PHP'}
        assert result['format'] == {'decimals': 0}
        assert 'other' not in result

    def test_get_category_settings_user_specific(self, user_factory):
        """Test get_category_settings retrieves user-specific settings."""
        user = user_factory()
        AppSettingsService.set_setting('NOTIFICATION', 'email', {'enabled': True}, user=user)
        AppSettingsService.set_setting('NOTIFICATION', 'sms', {'enabled': False}, user=user)

        result = AppSettingsService.get_category_settings('NOTIFICATION', user=user)

        assert len(result) == 2
        assert result['email'] == {'enabled': True}
        assert result['sms'] == {'enabled': False}

    def test_bulk_update_settings(self):
        """Test bulk_update_settings updates multiple settings."""
        settings_data = [
            {'category': 'SYSTEM', 'key': 'setting1', 'value': {'v': 1}},
            {'category': 'SYSTEM', 'key': 'setting2', 'value': {'v': 2}},
            {'category': 'CURRENCY', 'key': 'setting3', 'value': {'v': 3}},
        ]

        result = AppSettingsService.bulk_update_settings(settings_data)

        assert len(result) == 3
        assert AppSettings.objects.filter(category='SYSTEM').count() == 2
        assert AppSettings.objects.filter(category='CURRENCY').count() == 1

    def test_bulk_update_settings_with_user(self, user_factory):
        """Test bulk_update_settings with user-specific settings."""
        user = user_factory()
        settings_data = [
            {'category': 'NOTIFICATION', 'key': 'email', 'value': {'enabled': True}},
            {'category': 'NOTIFICATION', 'key': 'sms', 'value': {'enabled': False}},
        ]

        result = AppSettingsService.bulk_update_settings(settings_data, user=user)

        assert len(result) == 2
        assert all(s.user == user for s in result)

    def test_bulk_update_settings_with_encryption(self):
        """Test bulk_update_settings with encrypted settings."""
        settings_data = [
            {'category': 'PAYMENT', 'key': 'api_key', 'value': {'secret': 'test'}, 'encrypt': True},
        ]

        result = AppSettingsService.bulk_update_settings(settings_data)

        assert len(result) == 1
        assert result[0].is_encrypted

    def test_bulk_update_settings_raises_on_failure(self, mocker):
        """Test bulk_update_settings raises ValidationError on failure."""
        mocker.patch.object(
            AppSettingsService,
            'set_setting',
            side_effect=Exception('Test error')
        )

        with pytest.raises(ValidationError) as exc_info:
            AppSettingsService.bulk_update_settings([
                {'category': 'SYSTEM', 'key': 'test', 'value': {'v': 1}}
            ])

        assert 'Failed to update settings' in str(exc_info.value)

    def test_bulk_update_is_atomic(self, mocker):
        """Test bulk_update_settings is atomic - rollback on error."""
        # Create a setting that will succeed
        AppSettingsService.set_setting('SYSTEM', 'existing', {'before': True})

        # Make set_setting fail after first call
        call_count = [0]
        original_set = AppSettingsService.set_setting

        def failing_set(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] > 1:
                raise Exception('Simulated failure')
            return original_set(*args, **kwargs)

        mocker.patch.object(AppSettingsService, 'set_setting', side_effect=failing_set)

        settings_data = [
            {'category': 'SYSTEM', 'key': 'new1', 'value': {'v': 1}},
            {'category': 'SYSTEM', 'key': 'new2', 'value': {'v': 2}},
        ]

        with pytest.raises(ValidationError):
            AppSettingsService.bulk_update_settings(settings_data)


@pytest.mark.django_db
class TestCurrencySettingsService:
    """Unit tests for the CurrencySettingsService class."""

    def test_get_system_settings_creates_default(self):
        """Test get_system_settings creates default settings if none exist."""
        CurrencySettings.objects.filter(user__isnull=True).delete()

        settings = CurrencySettingsService.get_system_settings()

        assert settings.default_currency == 'PHP'
        assert settings.user is None

    def test_get_system_settings_returns_existing(self):
        """Test get_system_settings returns existing settings."""
        created = CurrencySettings.objects.create(
            default_currency='USD',
            enabled_currencies=['USD', 'PHP']
        )

        retrieved = CurrencySettingsService.get_system_settings()

        assert retrieved.id == created.id
        assert retrieved.default_currency == 'USD'

    def test_get_system_settings_raises_on_error(self, mocker):
        """Test get_system_settings raises ValidationError on exception."""
        mocker.patch.object(
            CurrencySettings,
            'get_system_settings',
            side_effect=Exception('Database error')
        )

        with pytest.raises(ValidationError) as exc_info:
            CurrencySettingsService.get_system_settings()

        assert 'Failed to retrieve currency settings' in str(exc_info.value)

    def test_get_user_settings(self, user_factory):
        """Test get_user_settings retrieves user-specific settings."""
        user = user_factory()
        CurrencySettings.objects.create(
            user=user,
            default_currency='EUR',
            enabled_currencies=['EUR']
        )

        settings = CurrencySettingsService.get_user_settings(user)

        assert settings.default_currency == 'EUR'
        assert settings.user == user

    def test_get_user_settings_falls_back_to_system(self, user_factory):
        """Test get_user_settings falls back to system settings."""
        user = user_factory()
        # Clear any auto-created system settings (from signals) before creating test-specific one
        CurrencySettings.objects.filter(user__isnull=True).delete()
        CurrencySettings.objects.create(
            default_currency='SGD',
            enabled_currencies=['SGD']
        )

        settings = CurrencySettingsService.get_user_settings(user)

        assert settings.default_currency == 'SGD'
        assert settings.user is None

    def test_get_user_settings_raises_on_error(self, user_factory, mocker):
        """Test get_user_settings raises ValidationError on exception."""
        user = user_factory()
        mocker.patch.object(
            CurrencySettings,
            'get_user_settings',
            side_effect=Exception('Database error')
        )

        with pytest.raises(ValidationError) as exc_info:
            CurrencySettingsService.get_user_settings(user)

        assert 'Failed to retrieve currency settings' in str(exc_info.value)

    def test_create_currency_settings(self, user_factory):
        """Test create_currency_settings creates new settings."""
        user = user_factory()
        data = {
            'default_currency': 'EUR',
            'enabled_currencies': ['EUR', 'USD'],
            'display_format': 'code',
            'decimal_places': 2,
        }

        settings = CurrencySettingsService.create_currency_settings(data, user=user)

        assert settings.default_currency == 'EUR'
        assert settings.enabled_currencies == ['EUR', 'USD']
        assert settings.user == user

    def test_create_currency_settings_sets_default_enabled(self, user_factory):
        """Test create_currency_settings sets default enabled currencies."""
        user = user_factory()
        data = {
            'default_currency': 'USD',
        }

        settings = CurrencySettingsService.create_currency_settings(data, user=user)

        assert settings.enabled_currencies == ['USD']

    def test_create_currency_settings_raises_if_exists(self, user_factory):
        """Test create_currency_settings raises if settings already exist."""
        user = user_factory()
        CurrencySettings.objects.create(user=user)

        with pytest.raises(ValidationError) as exc_info:
            CurrencySettingsService.create_currency_settings({}, user=user)

        assert 'Currency settings already exist' in str(exc_info.value)

    def test_create_currency_settings_raises_on_error(self, user_factory, mocker):
        """Test create_currency_settings raises ValidationError on exception."""
        user = user_factory()
        mocker.patch.object(
            CurrencySettings.objects,
            'filter',
            return_value=MagicMock(exists=MagicMock(return_value=False))
        )
        mocker.patch.object(
            CurrencySettings.objects,
            'create',
            side_effect=Exception('Database error')
        )

        with pytest.raises(ValidationError) as exc_info:
            CurrencySettingsService.create_currency_settings({'default_currency': 'USD'}, user=user)

        assert 'Failed to create currency settings' in str(exc_info.value)

    def test_update_currency_settings(self, user_factory):
        """Test update_currency_settings updates existing settings."""
        user = user_factory()
        settings = CurrencySettings.objects.create(
            user=user,
            default_currency='PHP',
            enabled_currencies=['PHP']
        )
        data = {
            'default_currency': 'USD',
            'enabled_currencies': ['USD', 'PHP'],
        }

        updated = CurrencySettingsService.update_currency_settings(
            settings_id=settings.id,
            data=data,
            user=user
        )

        assert updated.default_currency == 'USD'
        assert 'USD' in updated.enabled_currencies

    def test_update_currency_settings_not_found(self, user_factory):
        """Test update_currency_settings raises when settings not found."""
        user = user_factory()

        with pytest.raises(ValidationError) as exc_info:
            CurrencySettingsService.update_currency_settings(
                settings_id=999,
                data={'default_currency': 'USD'},
                user=user
            )

        assert 'Currency settings not found' in str(exc_info.value)

    def test_update_currency_settings_wrong_user(self, user_factory):
        """Test update_currency_settings raises when user doesn't match."""
        user1 = user_factory()
        user2 = user_factory()
        settings = CurrencySettings.objects.create(
            user=user1,
            default_currency='PHP'
        )

        with pytest.raises(ValidationError) as exc_info:
            CurrencySettingsService.update_currency_settings(
                settings_id=settings.id,
                data={'default_currency': 'USD'},
                user=user2
            )

        assert 'Currency settings not found' in str(exc_info.value)

    def test_update_system_settings(self):
        """Test update_system_settings updates system-wide settings."""
        CurrencySettings.objects.create(
            default_currency='PHP',
            enabled_currencies=['PHP']
        )
        data = {
            'default_currency': 'USD',
            'decimal_places': 2,
        }

        updated = CurrencySettingsService.update_system_settings(data)

        assert updated.default_currency == 'USD'
        assert updated.decimal_places == 2

    def test_update_system_settings_raises_on_error(self, mocker):
        """Test update_system_settings raises ValidationError on exception."""
        mocker.patch.object(
            CurrencySettings,
            'get_system_settings',
            side_effect=Exception('Database error')
        )

        with pytest.raises(ValidationError) as exc_info:
            CurrencySettingsService.update_system_settings({'default_currency': 'USD'})

        assert 'Failed to update system currency settings' in str(exc_info.value)

    def test_delete_currency_settings(self, user_factory):
        """Test delete_currency_settings deletes user settings."""
        user = user_factory()
        settings = CurrencySettings.objects.create(
            user=user,
            default_currency='EUR'
        )
        settings_id = settings.id

        CurrencySettingsService.delete_currency_settings(settings_id, user=user)

        assert not CurrencySettings.objects.filter(id=settings_id).exists()

    def test_delete_currency_settings_not_found(self, user_factory):
        """Test delete_currency_settings raises when not found."""
        user = user_factory()

        with pytest.raises(ValidationError) as exc_info:
            CurrencySettingsService.delete_currency_settings(999, user=user)

        assert 'Currency settings not found' in str(exc_info.value)

    def test_delete_system_settings_not_allowed(self, user_factory):
        """Test delete_currency_settings prevents deleting system settings."""
        # Create system settings (user=None)
        settings = CurrencySettings.objects.create(
            default_currency='PHP',
            enabled_currencies=['PHP']
        )

        # Try to delete with user=None (system settings)
        with pytest.raises(ValidationError) as exc_info:
            CurrencySettingsService.delete_currency_settings(settings.id, user=None)

        assert 'Cannot delete system-wide currency settings' in str(exc_info.value)

    def test_reset_to_defaults_system(self):
        """Test reset_to_defaults resets system settings."""
        CurrencySettings.objects.create(
            default_currency='USD',
            enabled_currencies=['USD', 'EUR'],
            decimal_places=2
        )

        settings = CurrencySettingsService.reset_to_defaults(user=None)

        assert settings.default_currency == 'PHP'
        assert settings.enabled_currencies == ['PHP']
        assert settings.decimal_places == 0

    def test_reset_to_defaults_user(self, user_factory):
        """Test reset_to_defaults deletes user settings."""
        user = user_factory()
        CurrencySettings.objects.create(
            user=user,
            default_currency='EUR'
        )
        # Clear any auto-created system settings (from signals) and create explicit one
        CurrencySettings.objects.filter(user__isnull=True).delete()
        CurrencySettings.objects.create(
            default_currency='PHP',
            enabled_currencies=['PHP']
        )

        settings = CurrencySettingsService.reset_to_defaults(user=user)

        assert not CurrencySettings.objects.filter(user=user).exists()
        assert settings.default_currency == 'PHP'  # Falls back to system

    def test_reset_to_defaults_raises_on_error(self, mocker):
        """Test reset_to_defaults raises ValidationError on exception."""
        mocker.patch.object(
            CurrencySettings,
            'get_system_settings',
            side_effect=Exception('Database error')
        )

        with pytest.raises(ValidationError) as exc_info:
            CurrencySettingsService.reset_to_defaults(user=None)

        assert 'Failed to reset currency settings' in str(exc_info.value)

    def test_get_supported_currencies(self):
        """Test get_supported_currencies returns currency list."""
        currencies = CurrencySettingsService.get_supported_currencies()

        assert isinstance(currencies, list)
        assert len(currencies) == 5

        # Check PHP entry
        php = next(c for c in currencies if c['code'] == 'PHP')
        assert php['name'] == 'Philippine Peso'
        assert php['symbol'] == '₱'
        assert php['decimals'] == 0

        # Check USD entry
        usd = next(c for c in currencies if c['code'] == 'USD')
        assert usd['name'] == 'US Dollar'
        assert usd['symbol'] == '$'
        assert usd['decimals'] == 2

    def test_validate_currency_code_valid(self):
        """Test validate_currency_code returns True for valid codes."""
        assert CurrencySettingsService.validate_currency_code('PHP') is True
        assert CurrencySettingsService.validate_currency_code('USD') is True
        assert CurrencySettingsService.validate_currency_code('EUR') is True

    def test_validate_currency_code_invalid(self):
        """Test validate_currency_code returns False for invalid codes."""
        assert CurrencySettingsService.validate_currency_code('XYZ') is False
        assert CurrencySettingsService.validate_currency_code('INVALID') is False
        assert CurrencySettingsService.validate_currency_code('') is False

    def test_get_currency_format_settings_system(self):
        """Test get_currency_format_settings returns system settings."""
        CurrencySettings.objects.create(
            default_currency='USD',
            enabled_currencies=['USD', 'PHP'],
            display_format='code',
            decimal_places=2
        )

        result = CurrencySettingsService.get_currency_format_settings(user=None)

        assert result['default_currency'] == 'USD'
        assert result['enabled_currencies'] == ['USD', 'PHP']
        assert result['display_format'] == 'code'
        assert result['decimal_places'] == 2

    def test_get_currency_format_settings_user(self, user_factory):
        """Test get_currency_format_settings returns user settings."""
        user = user_factory()
        CurrencySettings.objects.create(
            user=user,
            default_currency='EUR',
            enabled_currencies=['EUR'],
            display_format='both'
        )

        result = CurrencySettingsService.get_currency_format_settings(user=user)

        assert result['default_currency'] == 'EUR'
        assert result['display_format'] == 'both'

    def test_get_currency_format_settings_returns_defaults_on_error(self, mocker):
        """Test get_currency_format_settings returns defaults on error."""
        mocker.patch.object(
            CurrencySettings,
            'get_system_settings',
            side_effect=Exception('Database error')
        )

        result = CurrencySettingsService.get_currency_format_settings(user=None)

        assert result['default_currency'] == 'PHP'
        assert result['enabled_currencies'] == ['PHP']
        assert result['display_format'] == 'symbol'
        assert result['decimal_places'] == 0
