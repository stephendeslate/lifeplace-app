"""
Unit tests for settings domain models.

Tests:
- AppSettings model (centralized settings with encryption support)
- CurrencySettings model (currency configuration)
- LegalDocument model (Terms of Service, Privacy Policy)
- MobileAppVersion model (mobile app version configuration)
- CompanySettings model (company branding and information)
"""

import pytest
from django.db import IntegrityError
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone

from core.domains.settings.models import (
    AppSettings,
    CurrencySettings,
    LegalDocument,
    MobileAppVersion,
    CompanySettings,
)


@pytest.mark.django_db
class TestAppSettingsModel:
    """Unit tests for the AppSettings model."""

    def test_create_app_setting(self, user_factory):
        """Test creating an app setting."""
        setting = AppSettings.objects.create(
            category='CURRENCY',
            key='default_currency',
            value={'currency': 'PHP'},
            description='Default currency setting'
        )

        assert setting.category == 'CURRENCY'
        assert setting.key == 'default_currency'
        assert setting.value == {'currency': 'PHP'}
        assert not setting.is_encrypted

    def test_app_setting_string_representation_system_wide(self):
        """Test AppSettings __str__ for system-wide setting."""
        setting = AppSettings.objects.create(
            category='SYSTEM',
            key='maintenance_mode',
            value={'enabled': False}
        )

        assert str(setting) == 'System - SYSTEM: maintenance_mode'

    def test_app_setting_string_representation_user_specific(self, user_factory):
        """Test AppSettings __str__ for user-specific setting."""
        user = user_factory()
        setting = AppSettings.objects.create(
            category='NOTIFICATION',
            key='email_enabled',
            value={'enabled': True},
            user=user
        )

        assert str(setting) == f'User {user.id} - NOTIFICATION: email_enabled'

    def test_get_value_unencrypted(self):
        """Test get_value returns plain value when not encrypted."""
        setting = AppSettings.objects.create(
            category='ANALYTICS',
            key='tracking_id',
            value={'id': 'UA-12345'},
            is_encrypted=False
        )

        assert setting.get_value() == {'id': 'UA-12345'}

    def test_set_value_unencrypted(self):
        """Test set_value stores value without encryption."""
        setting = AppSettings.objects.create(
            category='SYSTEM',
            key='test_key',
            value={}
        )

        setting.set_value({'new_value': 'test'}, encrypt=False)
        setting.save()

        assert setting.value == {'new_value': 'test'}
        assert not setting.is_encrypted
        assert setting.encrypted_value == {}

    def test_set_value_encrypted(self):
        """Test set_value with encryption enabled."""
        setting = AppSettings.objects.create(
            category='PAYMENT',
            key='api_key',
            value={}
        )

        setting.set_value({'secret': 'test_secret'}, encrypt=True)
        setting.save()

        assert setting.value == {}
        assert setting.is_encrypted
        assert setting.encrypted_value == {'secret': 'test_secret'}

    def test_get_value_encrypted(self):
        """Test get_value returns encrypted value when is_encrypted is True."""
        setting = AppSettings.objects.create(
            category='PAYMENT',
            key='api_secret',
            value={},
            is_encrypted=True,
            encrypted_value={'secret': 'encrypted_data'}
        )

        assert setting.get_value() == {'secret': 'encrypted_data'}

    def test_get_setting_class_method(self):
        """Test get_setting class method retrieves setting value."""
        AppSettings.objects.create(
            category='SYSTEM',
            key='site_name',
            value={'name': 'LifePlace'}
        )

        result = AppSettings.get_setting('SYSTEM', 'site_name')
        assert result == {'name': 'LifePlace'}

    def test_get_setting_returns_default_when_not_found(self):
        """Test get_setting returns default when setting doesn't exist."""
        result = AppSettings.get_setting(
            'SYSTEM',
            'nonexistent_key',
            default={'fallback': True}
        )

        assert result == {'fallback': True}

    def test_get_setting_user_specific(self, user_factory):
        """Test get_setting retrieves user-specific setting."""
        user = user_factory()
        AppSettings.objects.create(
            category='NOTIFICATION',
            key='dark_mode',
            value={'enabled': True},
            user=user
        )

        result = AppSettings.get_setting('NOTIFICATION', 'dark_mode', user=user)
        assert result == {'enabled': True}

        # System-wide should not find user setting
        result = AppSettings.get_setting('NOTIFICATION', 'dark_mode')
        assert result is None

    def test_set_setting_class_method_creates_new(self):
        """Test set_setting creates new setting when it doesn't exist."""
        setting = AppSettings.set_setting(
            category='SYSTEM',
            key='new_setting',
            value={'test': True},
            description='New test setting'
        )

        assert setting.category == 'SYSTEM'
        assert setting.key == 'new_setting'
        assert setting.value == {'test': True}
        assert setting.description == 'New test setting'

    def test_set_setting_class_method_updates_existing(self):
        """Test set_setting updates existing setting."""
        AppSettings.set_setting('SYSTEM', 'update_me', {'initial': True})
        setting = AppSettings.set_setting(
            'SYSTEM',
            'update_me',
            {'updated': True},
            description='Updated description'
        )

        assert setting.value == {'updated': True}
        assert setting.description == 'Updated description'
        assert AppSettings.objects.filter(category='SYSTEM', key='update_me').count() == 1

    def test_get_category_settings(self):
        """Test get_category_settings retrieves all settings in a category."""
        AppSettings.set_setting('CURRENCY', 'default', {'value': 'PHP'})
        AppSettings.set_setting('CURRENCY', 'format', {'decimals': 0})
        AppSettings.set_setting('SYSTEM', 'other', {'unrelated': True})

        result = AppSettings.get_category_settings('CURRENCY')

        assert len(result) == 2
        assert result['default'] == {'value': 'PHP'}
        assert result['format'] == {'decimals': 0}
        assert 'other' not in result

    def test_unique_together_constraint(self, user_factory):
        """Test unique_together constraint on category, key, user."""
        AppSettings.objects.create(
            category='SYSTEM',
            key='unique_test',
            value={'test': 1}
        )

        with pytest.raises(IntegrityError):
            AppSettings.objects.create(
                category='SYSTEM',
                key='unique_test',
                value={'test': 2}
            )


@pytest.mark.django_db
class TestCurrencySettingsModel:
    """Unit tests for the CurrencySettings model."""

    def test_create_currency_settings(self):
        """Test creating currency settings with defaults."""
        settings = CurrencySettings.objects.create()

        assert settings.default_currency == 'PHP'
        assert settings.display_format == 'symbol'
        assert settings.decimal_places == 0
        assert settings.thousands_separator == ','
        assert settings.decimal_separator == '.'

    def test_currency_settings_string_representation_system(self):
        """Test CurrencySettings __str__ for system-wide setting."""
        settings = CurrencySettings.objects.create()

        assert str(settings) == 'System Currency Settings - Default: PHP'

    def test_currency_settings_string_representation_user(self, user_factory):
        """Test CurrencySettings __str__ for user-specific setting."""
        user = user_factory()
        settings = CurrencySettings.objects.create(
            user=user,
            default_currency='USD'
        )

        assert str(settings) == f'User {user.id} Currency Settings - Default: USD'

    def test_clean_adds_default_to_enabled_currencies(self):
        """Test clean method adds default currency to enabled list."""
        settings = CurrencySettings(
            default_currency='USD',
            enabled_currencies=['PHP', 'EUR']
        )
        settings.clean()

        assert 'USD' in settings.enabled_currencies

    def test_clean_sets_default_enabled_currencies_when_empty(self):
        """Test clean method sets enabled currencies when empty."""
        settings = CurrencySettings(
            default_currency='PHP',
            enabled_currencies=[]
        )
        settings.clean()

        assert settings.enabled_currencies == ['PHP']

    def test_get_system_settings_creates_if_not_exists(self):
        """Test get_system_settings creates default settings if none exist."""
        # Clear any existing
        CurrencySettings.objects.filter(user__isnull=True).delete()

        settings = CurrencySettings.get_system_settings()

        assert settings.default_currency == 'PHP'
        assert settings.user is None
        assert settings.enabled_currencies == ['PHP']

    def test_get_system_settings_returns_existing(self):
        """Test get_system_settings returns existing settings."""
        created = CurrencySettings.objects.create(
            default_currency='USD',
            enabled_currencies=['USD', 'PHP']
        )

        retrieved = CurrencySettings.get_system_settings()

        assert retrieved.id == created.id
        assert retrieved.default_currency == 'USD'

    def test_get_user_settings_returns_user_specific(self, user_factory):
        """Test get_user_settings returns user-specific settings."""
        user = user_factory()
        CurrencySettings.objects.create(
            user=user,
            default_currency='EUR',
            enabled_currencies=['EUR']
        )

        settings = CurrencySettings.get_user_settings(user)

        assert settings.default_currency == 'EUR'
        assert settings.user == user

    def test_get_user_settings_falls_back_to_system(self, user_factory):
        """Test get_user_settings falls back to system settings."""
        user = user_factory()
        CurrencySettings.objects.create(
            default_currency='SGD',
            enabled_currencies=['SGD']
        )

        settings = CurrencySettings.get_user_settings(user)

        assert settings.default_currency == 'SGD'
        assert settings.user is None

    def test_format_amount_php_default(self):
        """Test format_amount with PHP (default, no decimals)."""
        settings = CurrencySettings.objects.create(
            default_currency='PHP',
            decimal_places=0,
            display_format='symbol'
        )

        result = settings.format_amount(50000)
        assert result == '₱50,000'

    def test_format_amount_usd_with_decimals(self):
        """Test format_amount with USD (2 decimals)."""
        settings = CurrencySettings.objects.create(
            default_currency='USD',
            decimal_places=2,
            display_format='symbol'
        )

        result = settings.format_amount(1234.56, currency='USD')
        assert result == '$1,234.56'

    def test_format_amount_with_code_format(self):
        """Test format_amount with code display format."""
        settings = CurrencySettings.objects.create(
            default_currency='EUR',
            decimal_places=2,
            display_format='code'
        )

        result = settings.format_amount(999.99, currency='EUR')
        assert result == 'EUR 999.99'

    def test_format_amount_with_both_format(self):
        """Test format_amount with both symbol and code."""
        settings = CurrencySettings.objects.create(
            default_currency='PHP',
            decimal_places=0,
            display_format='both'
        )

        result = settings.format_amount(10000)
        assert result == '₱ 10,000 PHP'

    def test_format_amount_with_custom_separator(self):
        """Test format_amount with custom thousands separator."""
        settings = CurrencySettings.objects.create(
            default_currency='PHP',
            decimal_places=0,
            thousands_separator=' '
        )

        result = settings.format_amount(1000000)
        assert result == '₱1 000 000'

    def test_format_amount_decimal_value(self):
        """Test format_amount handles Decimal input."""
        settings = CurrencySettings.objects.create(
            default_currency='USD',
            decimal_places=2,
            display_format='symbol'
        )

        result = settings.format_amount(Decimal('1234.56'))
        assert result == '$1,234.56'

    def test_to_dict(self):
        """Test to_dict returns proper dictionary representation."""
        settings = CurrencySettings.objects.create(
            default_currency='PHP',
            enabled_currencies=['PHP', 'USD'],
            display_format='symbol',
            decimal_places=0
        )

        result = settings.to_dict()

        assert result['default_currency'] == 'PHP'
        assert result['enabled_currencies'] == ['PHP', 'USD']
        assert result['display_format'] == 'symbol'
        assert result['decimal_places'] == 0
        assert 'created_at' in result
        assert 'updated_at' in result


@pytest.mark.django_db
class TestLegalDocumentModel:
    """Unit tests for the LegalDocument model."""

    def test_create_legal_document(self):
        """Test creating a legal document."""
        doc = LegalDocument.objects.create(
            document_type='TERMS_OF_SERVICE',
            title='Terms of Service',
            content='<p>These are the terms...</p>',
            version='1.0'
        )

        assert doc.document_type == 'TERMS_OF_SERVICE'
        assert doc.title == 'Terms of Service'
        assert not doc.is_published

    def test_legal_document_string_representation(self):
        """Test LegalDocument __str__ returns type and version."""
        doc = LegalDocument.objects.create(
            document_type='PRIVACY_POLICY',
            version='2.1'
        )

        assert str(doc) == 'Privacy Policy v2.1'

    def test_get_valid_document_types(self):
        """Test get_valid_document_types returns correct list."""
        valid_types = LegalDocument.get_valid_document_types()

        assert 'TERMS_OF_SERVICE' in valid_types
        assert 'PRIVACY_POLICY' in valid_types
        assert len(valid_types) == 2

    def test_get_document_creates_if_not_exists(self):
        """Test get_document creates document if it doesn't exist."""
        doc = LegalDocument.get_document('TERMS_OF_SERVICE')

        assert doc.document_type == 'TERMS_OF_SERVICE'
        assert doc.title == 'Terms of Service'
        assert not doc.is_published

    def test_get_document_returns_existing(self):
        """Test get_document returns existing document."""
        created = LegalDocument.objects.create(
            document_type='PRIVACY_POLICY',
            title='Custom Title',
            content='Custom content',
            version='3.0',
            is_published=True
        )

        retrieved = LegalDocument.get_document('PRIVACY_POLICY')

        assert retrieved.id == created.id
        assert retrieved.title == 'Custom Title'
        assert retrieved.is_published

    def test_get_document_invalid_type_raises_error(self):
        """Test get_document raises ValueError for invalid type."""
        with pytest.raises(ValueError) as exc_info:
            LegalDocument.get_document('INVALID_TYPE')

        assert 'Invalid document type' in str(exc_info.value)

    def test_get_terms_of_service(self):
        """Test get_terms_of_service convenience method."""
        doc = LegalDocument.get_terms_of_service()

        assert doc.document_type == 'TERMS_OF_SERVICE'

    def test_get_privacy_policy(self):
        """Test get_privacy_policy convenience method."""
        doc = LegalDocument.get_privacy_policy()

        assert doc.document_type == 'PRIVACY_POLICY'

    def test_document_type_unique_constraint(self):
        """Test document_type is unique."""
        LegalDocument.objects.create(document_type='TERMS_OF_SERVICE')

        with pytest.raises(IntegrityError):
            LegalDocument.objects.create(document_type='TERMS_OF_SERVICE')

    def test_effective_date_nullable(self):
        """Test effective_date can be null."""
        doc = LegalDocument.objects.create(
            document_type='TERMS_OF_SERVICE',
            effective_date=None
        )

        assert doc.effective_date is None

    def test_effective_date_can_be_set(self):
        """Test effective_date can be set to a date."""
        effective = date.today()
        doc = LegalDocument.objects.create(
            document_type='PRIVACY_POLICY',
            effective_date=effective
        )

        assert doc.effective_date == effective

    def test_last_updated_by_relationship(self, user_factory):
        """Test last_updated_by foreign key relationship."""
        user = user_factory()
        doc = LegalDocument.objects.create(
            document_type='TERMS_OF_SERVICE',
            last_updated_by=user
        )

        assert doc.last_updated_by == user
        assert doc in user.updated_legal_documents.all()


@pytest.mark.django_db
class TestMobileAppVersionModel:
    """Unit tests for the MobileAppVersion model."""

    def test_create_mobile_app_version(self):
        """Test creating mobile app version configuration."""
        config = MobileAppVersion.objects.create(
            platform='ios',
            minimum_required_version='1.0.0',
            recommended_version='1.2.0',
            latest_version='1.3.0',
            is_active=True
        )

        assert config.platform == 'ios'
        assert config.minimum_required_version == '1.0.0'
        assert config.is_active

    def test_mobile_app_version_string_representation(self):
        """Test MobileAppVersion __str__ returns platform and version."""
        config = MobileAppVersion.objects.create(
            platform='android',
            minimum_required_version='2.0.0',
            recommended_version='2.1.0',
            latest_version='2.2.0'
        )

        assert str(config) == 'Android - v2.2.0'

    def test_default_messages(self):
        """Test default update messages."""
        config = MobileAppVersion.objects.create(
            platform='ios',
            minimum_required_version='1.0.0',
            recommended_version='1.0.0',
            latest_version='1.0.0'
        )

        assert config.update_title == 'Update Available'
        assert config.force_title == 'Update Required'
        assert 'new version is available' in config.update_message
        assert 'update to continue' in config.force_message

    def test_maintenance_mode_fields(self):
        """Test maintenance mode configuration."""
        maintenance_end = timezone.now() + timedelta(hours=2)
        config = MobileAppVersion.objects.create(
            platform='all',
            minimum_required_version='1.0.0',
            recommended_version='1.0.0',
            latest_version='1.0.0',
            is_maintenance_mode=True,
            maintenance_message='Scheduled maintenance in progress',
            maintenance_end=maintenance_end
        )

        assert config.is_maintenance_mode
        assert config.maintenance_message == 'Scheduled maintenance in progress'
        assert config.maintenance_end is not None

    def test_deprecation_fields(self):
        """Test deprecation configuration."""
        deprecation = date.today() + timedelta(days=30)
        sunset = date.today() + timedelta(days=90)

        config = MobileAppVersion.objects.create(
            platform='ios',
            minimum_required_version='1.0.0',
            recommended_version='1.0.0',
            latest_version='1.0.0',
            deprecation_date=deprecation,
            sunset_date=sunset,
            deprecation_message='This version will be deprecated soon'
        )

        assert config.deprecation_date == deprecation
        assert config.sunset_date == sunset
        assert config.deprecation_message == 'This version will be deprecated soon'

    def test_feature_flags_json_field(self):
        """Test feature_flags JSON field."""
        config = MobileAppVersion.objects.create(
            platform='ios',
            minimum_required_version='1.0.0',
            recommended_version='1.0.0',
            latest_version='1.0.0',
            feature_flags={
                'dark_mode': True,
                'new_checkout': False,
                'beta_features': ['feature_a', 'feature_b']
            }
        )

        assert config.feature_flags['dark_mode'] is True
        assert config.feature_flags['new_checkout'] is False
        assert 'feature_a' in config.feature_flags['beta_features']

    def test_store_urls(self):
        """Test store URL fields."""
        config = MobileAppVersion.objects.create(
            platform='all',
            minimum_required_version='1.0.0',
            recommended_version='1.0.0',
            latest_version='1.0.0',
            ios_store_url='https://apps.apple.com/app/lifeplace',
            android_store_url='https://play.google.com/store/apps/lifeplace'
        )

        assert 'apps.apple.com' in config.ios_store_url
        assert 'play.google.com' in config.android_store_url

    def test_unique_active_platform_constraint(self):
        """Test only one active config per platform."""
        MobileAppVersion.objects.create(
            platform='ios',
            minimum_required_version='1.0.0',
            recommended_version='1.0.0',
            latest_version='1.0.0',
            is_active=True
        )

        # Creating another active iOS config should fail
        with pytest.raises(IntegrityError):
            MobileAppVersion.objects.create(
                platform='ios',
                minimum_required_version='2.0.0',
                recommended_version='2.0.0',
                latest_version='2.0.0',
                is_active=True
            )

    def test_multiple_inactive_configs_allowed(self):
        """Test multiple inactive configs are allowed for same platform."""
        MobileAppVersion.objects.create(
            platform='android',
            minimum_required_version='1.0.0',
            recommended_version='1.0.0',
            latest_version='1.0.0',
            is_active=False
        )

        config2 = MobileAppVersion.objects.create(
            platform='android',
            minimum_required_version='2.0.0',
            recommended_version='2.0.0',
            latest_version='2.0.0',
            is_active=False
        )

        assert config2.id is not None


@pytest.mark.django_db
class TestCompanySettingsModel:
    """Unit tests for the CompanySettings model."""

    def test_create_company_settings(self):
        """Test creating company settings."""
        settings = CompanySettings.objects.create(
            company_name='Test Company',
            email='test@company.com'
        )

        assert settings.company_name == 'Test Company'
        assert settings.email == 'test@company.com'

    def test_default_values(self):
        """Test default field values."""
        settings = CompanySettings.objects.create()

        assert settings.company_name == 'LifePlace Retreat & Events Center'
        assert settings.primary_color == '#2c5aa0'
        assert settings.secondary_color == '#1a365d'
        assert settings.accent_color == '#38a169'
        assert settings.city == 'Alfonso'
        assert settings.province == 'Cavite'
        assert settings.country == 'Philippines'

    def test_company_settings_string_representation(self):
        """Test CompanySettings __str__ returns company name."""
        settings = CompanySettings.objects.create(
            company_name='Custom Events Co'
        )

        assert str(settings) == 'Company Settings - Custom Events Co'

    def test_singleton_pattern(self):
        """Test only one CompanySettings instance is allowed."""
        CompanySettings.objects.create(company_name='First Company')

        with pytest.raises(ValueError) as exc_info:
            CompanySettings.objects.create(company_name='Second Company')

        assert 'Only one CompanySettings instance is allowed' in str(exc_info.value)

    def test_get_settings_creates_if_not_exists(self):
        """Test get_settings creates default settings if none exist."""
        CompanySettings.objects.all().delete()

        settings = CompanySettings.get_settings()

        assert settings.pk == 1
        assert settings.company_name == 'LifePlace Retreat & Events Center'

    def test_get_settings_returns_existing(self):
        """Test get_settings returns existing settings."""
        created = CompanySettings.objects.create(
            company_name='Existing Company'
        )

        retrieved = CompanySettings.get_settings()

        assert retrieved.id == created.id
        assert retrieved.company_name == 'Existing Company'

    def test_get_full_address_basic(self):
        """Test get_full_address with basic address."""
        settings = CompanySettings.objects.create(
            address_line1='123 Main Street',
            city='Alfonso',
            province='Cavite',
            postal_code='4123',
            country='Philippines'
        )

        address = settings.get_full_address()

        assert '123 Main Street' in address
        assert 'Alfonso, Cavite 4123' in address
        assert 'Philippines' in address

    def test_get_full_address_with_line2(self):
        """Test get_full_address with address line 2."""
        settings = CompanySettings.objects.create(
            address_line1='123 Main Street',
            address_line2='Suite 100',
            city='Alfonso',
            province='Cavite',
            country='Philippines'
        )

        address = settings.get_full_address()

        assert '123 Main Street' in address
        assert 'Suite 100' in address

    def test_get_logo_url_when_no_logo(self):
        """Test get_logo_url returns None when no logo."""
        settings = CompanySettings.objects.create()

        assert settings.get_logo_url() is None

    def test_to_pdf_context(self):
        """Test to_pdf_context returns proper context dictionary."""
        settings = CompanySettings.objects.create(
            company_name='PDF Test Co',
            company_tagline='Making events special',
            email='info@pdftest.com',
            phone='+1234567890',
            website='https://pdftest.com',
            primary_color='#ff0000',
            secondary_color='#00ff00'
        )

        context = settings.to_pdf_context()

        assert context['company_name'] == 'PDF Test Co'
        assert context['company_tagline'] == 'Making events special'
        assert context['email'] == 'info@pdftest.com'
        assert context['primary_color'] == '#ff0000'
        assert context['secondary_color'] == '#00ff00'
        assert 'full_address' in context
        assert 'logo_path' in context

    def test_bank_details_fields(self):
        """Test bank detail fields."""
        settings = CompanySettings.objects.create(
            bank_name='Test Bank',
            bank_account_name='Company Account',
            bank_account_number='1234567890',
            bank_branch='Main Branch',
            bank_swift_code='TESTSWFT'
        )

        assert settings.bank_name == 'Test Bank'
        assert settings.bank_account_number == '1234567890'
        assert settings.bank_swift_code == 'TESTSWFT'

    def test_social_media_urls(self):
        """Test social media URL fields."""
        settings = CompanySettings.objects.create(
            website='https://example.com',
            facebook_url='https://facebook.com/company',
            instagram_url='https://instagram.com/company'
        )

        assert settings.website == 'https://example.com'
        assert 'facebook.com' in settings.facebook_url
        assert 'instagram.com' in settings.instagram_url

    def test_pdf_and_document_terms(self):
        """Test PDF footer and document terms fields."""
        settings = CompanySettings.objects.create(
            pdf_footer_text='Thank you for your business!',
            invoice_terms='Payment due within 30 days',
            receipt_terms='No refunds after 24 hours'
        )

        assert settings.pdf_footer_text == 'Thank you for your business!'
        assert settings.invoice_terms == 'Payment due within 30 days'
        assert settings.receipt_terms == 'No refunds after 24 hours'

    def test_brand_colors_validation(self):
        """Test brand color fields accept hex codes."""
        settings = CompanySettings.objects.create(
            primary_color='#123456',
            secondary_color='#abcdef',
            accent_color='#AABBCC'
        )

        assert settings.primary_color == '#123456'
        assert settings.secondary_color == '#abcdef'
        assert settings.accent_color == '#AABBCC'
