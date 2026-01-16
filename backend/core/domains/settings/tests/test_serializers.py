"""
Unit tests for settings domain serializers.

Tests:
- AppSettingsSerializer
- CurrencySettingsSerializer and variants
- LegalDocumentSerializer and variants
- MobileAppVersionSerializer
- CompanySettingsSerializer and variants
"""

import pytest
from datetime import date
from django.utils import timezone

from core.domains.settings.models import (
    AppSettings,
    CurrencySettings,
    LegalDocument,
    MobileAppVersion,
    CompanySettings,
)
from core.domains.settings.serializers import (
    AppSettingsSerializer,
    CurrencySettingsSerializer,
    CurrencySettingsCreateSerializer,
    CurrencySettingsUpdateSerializer,
    SystemCurrencySettingsSerializer,
    SupportedCurrenciesSerializer,
    LegalDocumentSerializer,
    LegalDocumentUpdateSerializer,
    PublicLegalDocumentSerializer,
    MobileAppVersionSerializer,
    CompanySettingsSerializer,
    PublicCompanySettingsSerializer,
)


@pytest.mark.django_db
class TestAppSettingsSerializer:
    """Unit tests for the AppSettingsSerializer."""

    def test_serialize_app_setting(self):
        """Test serializing an app setting."""
        setting = AppSettings.objects.create(
            category='SYSTEM',
            key='test_key',
            value={'test': True},
            description='Test description'
        )

        serializer = AppSettingsSerializer(setting)
        data = serializer.data

        assert data['category'] == 'SYSTEM'
        assert data['key'] == 'test_key'
        assert data['value'] == {'test': True}
        assert data['description'] == 'Test description'
        assert 'id' in data
        assert 'created_at' in data
        assert 'updated_at' in data

    def test_deserialize_app_setting(self):
        """Test deserializing app setting data."""
        data = {
            'category': 'CURRENCY',
            'key': 'new_setting',
            'value': {'currency': 'PHP'},
            'description': 'Currency setting'
        }

        serializer = AppSettingsSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data['category'] == 'CURRENCY'
        assert serializer.validated_data['value'] == {'currency': 'PHP'}

    def test_read_only_fields(self):
        """Test read-only fields cannot be set."""
        data = {
            'id': 999,
            'category': 'SYSTEM',
            'key': 'test',
            'value': {},
            'is_encrypted': True,
            'created_at': '2024-01-01T00:00:00Z'
        }

        serializer = AppSettingsSerializer(data=data)

        assert serializer.is_valid()
        # is_encrypted should not be in validated_data (read-only)
        assert 'is_encrypted' not in serializer.validated_data

    def test_create_app_setting(self):
        """Test creating app setting through serializer."""
        data = {
            'category': 'PAYMENT',
            'key': 'gateway_default',
            'value': {'gateway': 'stripe'},
            'description': 'Default payment gateway'
        }

        serializer = AppSettingsSerializer(data=data)
        assert serializer.is_valid()

        setting = serializer.save()

        assert setting.category == 'PAYMENT'
        assert setting.key == 'gateway_default'
        assert setting.value == {'gateway': 'stripe'}


@pytest.mark.django_db
class TestCurrencySettingsSerializer:
    """Unit tests for the CurrencySettingsSerializer."""

    def test_serialize_currency_settings(self):
        """Test serializing currency settings."""
        settings = CurrencySettings.objects.create(
            default_currency='PHP',
            enabled_currencies=['PHP', 'USD'],
            display_format='symbol',
            decimal_places=0
        )

        serializer = CurrencySettingsSerializer(settings)
        data = serializer.data

        assert data['default_currency'] == 'PHP'
        assert data['enabled_currencies'] == ['PHP', 'USD']
        assert data['display_format'] == 'symbol'
        assert data['decimal_places'] == 0

    def test_validate_enabled_currencies_valid(self):
        """Test validation accepts valid currency codes."""
        serializer = CurrencySettingsSerializer(data={
            'default_currency': 'PHP',
            'enabled_currencies': ['PHP', 'USD', 'EUR'],
            'display_format': 'symbol',
            'decimal_places': 0,
            'thousands_separator': ',',
            'decimal_separator': '.'
        })

        assert serializer.is_valid()

    def test_validate_enabled_currencies_invalid(self):
        """Test validation rejects invalid currency codes."""
        serializer = CurrencySettingsSerializer(data={
            'default_currency': 'PHP',
            'enabled_currencies': ['PHP', 'INVALID', 'XYZ'],
            'display_format': 'symbol',
            'decimal_places': 0,
            'thousands_separator': ',',
            'decimal_separator': '.'
        })

        assert not serializer.is_valid()
        assert 'enabled_currencies' in serializer.errors
        assert 'INVALID' in str(serializer.errors['enabled_currencies'])

    def test_validate_adds_default_to_enabled(self):
        """Test validation adds default currency to enabled list."""
        serializer = CurrencySettingsSerializer(data={
            'default_currency': 'EUR',
            'enabled_currencies': ['PHP', 'USD'],
            'display_format': 'symbol',
            'decimal_places': 2,
            'thousands_separator': ',',
            'decimal_separator': '.'
        })

        assert serializer.is_valid()
        assert 'EUR' in serializer.validated_data['enabled_currencies']

    def test_validate_empty_enabled_currencies(self):
        """Test validation handles empty enabled currencies."""
        serializer = CurrencySettingsSerializer(data={
            'default_currency': 'PHP',
            'enabled_currencies': [],
            'display_format': 'symbol',
            'decimal_places': 0,
            'thousands_separator': ',',
            'decimal_separator': '.'
        })

        assert serializer.is_valid()


@pytest.mark.django_db
class TestCurrencySettingsCreateSerializer:
    """Unit tests for the CurrencySettingsCreateSerializer."""

    def test_create_with_default_enabled_currencies(self):
        """Test create sets default enabled currencies if not provided."""
        serializer = CurrencySettingsCreateSerializer(data={
            'default_currency': 'USD',
            'display_format': 'symbol',
            'decimal_places': 2,
            'thousands_separator': ',',
            'decimal_separator': '.'
        })

        assert serializer.is_valid()
        settings = serializer.save()

        assert 'USD' in settings.enabled_currencies


@pytest.mark.django_db
class TestCurrencySettingsUpdateSerializer:
    """Unit tests for the CurrencySettingsUpdateSerializer."""

    def test_partial_update_allowed(self):
        """Test partial updates are allowed."""
        serializer = CurrencySettingsUpdateSerializer(data={
            'decimal_places': 2
        })

        assert serializer.is_valid()
        assert serializer.validated_data.get('decimal_places') == 2

    def test_all_fields_optional(self):
        """Test all fields are optional for update."""
        serializer = CurrencySettingsUpdateSerializer(data={})

        assert serializer.is_valid()


@pytest.mark.django_db
class TestSystemCurrencySettingsSerializer:
    """Unit tests for the SystemCurrencySettingsSerializer."""

    def test_valid_system_settings(self):
        """Test valid system currency settings."""
        serializer = SystemCurrencySettingsSerializer(data={
            'default_currency': 'PHP',
            'enabled_currencies': ['PHP', 'USD'],
            'display_format': 'symbol',
            'decimal_places': 0,
            'thousands_separator': ',',
            'decimal_separator': '.',
            'auto_format': True,
            'compact_format': False
        })

        assert serializer.is_valid()

    def test_invalid_currency_choice(self):
        """Test invalid currency choice is rejected."""
        serializer = SystemCurrencySettingsSerializer(data={
            'default_currency': 'INVALID'
        })

        assert not serializer.is_valid()
        assert 'default_currency' in serializer.errors

    def test_validate_enabled_currencies(self):
        """Test validation of enabled currencies in system settings."""
        serializer = SystemCurrencySettingsSerializer(data={
            'enabled_currencies': ['PHP', 'INVALID']
        })

        assert not serializer.is_valid()
        assert 'enabled_currencies' in serializer.errors

    def test_cross_field_validation(self):
        """Test cross-field validation adds default to enabled."""
        serializer = SystemCurrencySettingsSerializer(data={
            'default_currency': 'EUR',
            'enabled_currencies': ['PHP', 'USD']
        })

        assert serializer.is_valid()
        assert 'EUR' in serializer.validated_data['enabled_currencies']

    def test_decimal_places_range(self):
        """Test decimal_places must be within valid range."""
        serializer = SystemCurrencySettingsSerializer(data={
            'decimal_places': 5  # Max is 4
        })

        assert not serializer.is_valid()
        assert 'decimal_places' in serializer.errors


class TestSupportedCurrenciesSerializer:
    """Unit tests for the SupportedCurrenciesSerializer."""

    def test_get_supported_currencies(self):
        """Test get_supported_currencies returns all currencies."""
        currencies = SupportedCurrenciesSerializer.get_supported_currencies()

        assert len(currencies) == 5

        codes = [c['code'] for c in currencies]
        assert 'PHP' in codes
        assert 'USD' in codes
        assert 'EUR' in codes
        assert 'SGD' in codes
        assert 'HKD' in codes

    def test_currency_structure(self):
        """Test each currency has required fields."""
        currencies = SupportedCurrenciesSerializer.get_supported_currencies()

        for currency in currencies:
            assert 'code' in currency
            assert 'name' in currency
            assert 'symbol' in currency
            assert 'locale' in currency
            assert 'decimals' in currency

    def test_php_currency_details(self):
        """Test PHP currency has correct details."""
        currencies = SupportedCurrenciesSerializer.get_supported_currencies()
        php = next(c for c in currencies if c['code'] == 'PHP')

        assert php['name'] == 'Philippine Peso'
        assert php['symbol'] == '₱'
        assert php['locale'] == 'en-PH'
        assert php['decimals'] == 0


@pytest.mark.django_db
class TestLegalDocumentSerializer:
    """Unit tests for the LegalDocumentSerializer."""

    def test_serialize_legal_document(self):
        """Test serializing a legal document."""
        doc = LegalDocument.objects.create(
            document_type='TERMS_OF_SERVICE',
            title='Terms of Service',
            content='<p>Terms content here</p>',
            version='1.0',
            is_published=True
        )

        serializer = LegalDocumentSerializer(doc)
        data = serializer.data

        assert data['document_type'] == 'TERMS_OF_SERVICE'
        assert data['document_type_display'] == 'Terms of Service'
        assert data['title'] == 'Terms of Service'
        assert data['version'] == '1.0'
        assert data['is_published'] is True

    def test_last_updated_by_name_with_user(self, user_factory):
        """Test last_updated_by_name returns user name."""
        user = user_factory(first_name='John', last_name='Doe')
        doc = LegalDocument.objects.create(
            document_type='PRIVACY_POLICY',
            last_updated_by=user
        )

        serializer = LegalDocumentSerializer(doc)

        assert serializer.data['last_updated_by_name'] == 'John Doe'

    def test_last_updated_by_name_without_user(self):
        """Test last_updated_by_name returns None when no user."""
        doc = LegalDocument.objects.create(
            document_type='TERMS_OF_SERVICE',
            last_updated_by=None
        )

        serializer = LegalDocumentSerializer(doc)

        assert serializer.data['last_updated_by_name'] is None

    def test_last_updated_by_name_falls_back_to_email(self, user_factory):
        """Test last_updated_by_name returns email when no name."""
        user = user_factory(first_name='', last_name='', email='test@example.com')
        doc = LegalDocument.objects.create(
            document_type='PRIVACY_POLICY',
            last_updated_by=user
        )

        serializer = LegalDocumentSerializer(doc)

        assert serializer.data['last_updated_by_name'] == 'test@example.com'


@pytest.mark.django_db
class TestLegalDocumentUpdateSerializer:
    """Unit tests for the LegalDocumentUpdateSerializer."""

    def test_valid_update_data(self):
        """Test valid update data."""
        serializer = LegalDocumentUpdateSerializer(data={
            'title': 'Updated Title',
            'content': '<p>Updated content</p>',
            'version': '2.0',
            'is_published': True
        })

        assert serializer.is_valid()

    def test_version_required(self):
        """Test version cannot be empty."""
        serializer = LegalDocumentUpdateSerializer(data={
            'version': ''
        })

        assert not serializer.is_valid()
        assert 'version' in serializer.errors

    def test_partial_update(self):
        """Test partial updates are valid."""
        serializer = LegalDocumentUpdateSerializer(data={
            'is_published': True
        }, partial=True)

        assert serializer.is_valid()


@pytest.mark.django_db
class TestPublicLegalDocumentSerializer:
    """Unit tests for the PublicLegalDocumentSerializer."""

    def test_serialize_public_fields_only(self):
        """Test only public fields are serialized."""
        doc = LegalDocument.objects.create(
            document_type='TERMS_OF_SERVICE',
            title='Public Terms',
            content='<p>Public content</p>',
            version='1.0',
            effective_date=date.today(),
            is_published=True
        )

        serializer = PublicLegalDocumentSerializer(doc)
        data = serializer.data

        assert 'document_type' in data
        assert 'document_type_display' in data
        assert 'title' in data
        assert 'content' in data
        assert 'version' in data
        assert 'effective_date' in data

        # These should NOT be in public serializer
        assert 'id' not in data
        assert 'is_published' not in data
        assert 'last_updated_by' not in data
        assert 'created_at' not in data

    def test_all_fields_read_only(self):
        """Test all fields are read-only."""
        serializer = PublicLegalDocumentSerializer(data={
            'title': 'Hacked Title'
        })

        # Serializer should not accept any write data
        assert serializer.is_valid()
        assert 'title' not in serializer.validated_data


@pytest.mark.django_db
class TestMobileAppVersionSerializer:
    """Unit tests for the MobileAppVersionSerializer."""

    def test_serialize_mobile_version(self):
        """Test serializing mobile app version."""
        config = MobileAppVersion.objects.create(
            platform='ios',
            minimum_required_version='1.0.0',
            recommended_version='1.2.0',
            latest_version='1.3.0',
            is_active=True
        )

        serializer = MobileAppVersionSerializer(config)
        data = serializer.data

        assert data['platform'] == 'ios'
        assert data['platform_display'] == 'iOS'
        assert data['minimum_required_version'] == '1.0.0'
        assert data['recommended_version'] == '1.2.0'
        assert data['latest_version'] == '1.3.0'
        assert data['is_active'] is True

    def test_all_fields_included(self):
        """Test all model fields are included."""
        config = MobileAppVersion.objects.create(
            platform='android',
            minimum_required_version='2.0.0',
            recommended_version='2.1.0',
            latest_version='2.2.0',
            update_title='Update Now',
            update_message='New features available',
            force_title='Required Update',
            force_message='Please update to continue',
            feature_flags={'new_ui': True}
        )

        serializer = MobileAppVersionSerializer(config)
        data = serializer.data

        assert data['update_title'] == 'Update Now'
        assert data['force_title'] == 'Required Update'
        assert data['feature_flags'] == {'new_ui': True}

    def test_valid_creation_data(self):
        """Test valid data for creating mobile version."""
        serializer = MobileAppVersionSerializer(data={
            'platform': 'all',
            'minimum_required_version': '1.0.0',
            'recommended_version': '1.1.0',
            'latest_version': '1.2.0',
            'is_active': True
        })

        assert serializer.is_valid()


@pytest.mark.django_db
class TestCompanySettingsSerializer:
    """Unit tests for the CompanySettingsSerializer."""

    def test_serialize_company_settings(self):
        """Test serializing company settings."""
        settings = CompanySettings.objects.create(
            company_name='Test Company',
            company_tagline='We make events special',
            email='info@test.com',
            phone='+1234567890'
        )

        serializer = CompanySettingsSerializer(settings)
        data = serializer.data

        assert data['company_name'] == 'Test Company'
        assert data['company_tagline'] == 'We make events special'
        assert data['email'] == 'info@test.com'
        assert data['phone'] == '+1234567890'

    def test_full_address_computed(self):
        """Test full_address is computed from address fields."""
        settings = CompanySettings.objects.create(
            address_line1='123 Main St',
            city='Alfonso',
            province='Cavite',
            postal_code='4123',
            country='Philippines'
        )

        serializer = CompanySettingsSerializer(settings)

        assert 'full_address' in serializer.data
        assert '123 Main St' in serializer.data['full_address']

    def test_logo_url_included(self):
        """Test logo_url is included in serialized data."""
        settings = CompanySettings.objects.create()

        serializer = CompanySettingsSerializer(settings)

        assert 'logo_url' in serializer.data
        assert serializer.data['logo_url'] is None

    def test_all_fields_included(self):
        """Test all expected fields are included."""
        settings = CompanySettings.objects.create()

        serializer = CompanySettingsSerializer(settings)
        data = serializer.data

        expected_fields = [
            'id', 'company_name', 'company_tagline', 'logo', 'logo_url',
            'logo_dark', 'favicon', 'primary_color', 'secondary_color',
            'accent_color', 'email', 'support_email', 'phone', 'phone_secondary',
            'address_line1', 'address_line2', 'city', 'province', 'postal_code',
            'country', 'full_address', 'business_registration_number', 'vat_number',
            'website', 'facebook_url', 'instagram_url', 'pdf_footer_text',
            'invoice_terms', 'receipt_terms', 'bank_name', 'bank_account_name',
            'bank_account_number', 'bank_branch', 'bank_swift_code',
            'created_at', 'updated_at'
        ]

        for field in expected_fields:
            assert field in data, f"Field {field} not in serialized data"

    def test_partial_update(self):
        """Test partial update of company settings."""
        settings = CompanySettings.objects.create(
            company_name='Original Name'
        )

        serializer = CompanySettingsSerializer(
            settings,
            data={'company_name': 'Updated Name'},
            partial=True
        )

        assert serializer.is_valid()
        updated = serializer.save()

        assert updated.company_name == 'Updated Name'


@pytest.mark.django_db
class TestPublicCompanySettingsSerializer:
    """Unit tests for the PublicCompanySettingsSerializer."""

    def test_serialize_public_fields_only(self):
        """Test only public fields are serialized."""
        settings = CompanySettings.objects.create(
            company_name='Public Company',
            email='public@company.com',
            phone='+1234567890',
            bank_name='Secret Bank',
            bank_account_number='123456789'
        )

        serializer = PublicCompanySettingsSerializer(settings)
        data = serializer.data

        # Public fields should be present
        assert data['company_name'] == 'Public Company'
        assert data['email'] == 'public@company.com'
        assert data['phone'] == '+1234567890'

        # Sensitive fields should NOT be present
        assert 'bank_name' not in data
        assert 'bank_account_number' not in data
        assert 'bank_account_name' not in data
        assert 'bank_branch' not in data
        assert 'bank_swift_code' not in data
        assert 'business_registration_number' not in data
        assert 'vat_number' not in data
        assert 'support_email' not in data
        assert 'invoice_terms' not in data
        assert 'receipt_terms' not in data

    def test_public_fields_list(self):
        """Test expected public fields are present."""
        settings = CompanySettings.objects.create()

        serializer = PublicCompanySettingsSerializer(settings)
        data = serializer.data

        expected_public_fields = [
            'company_name', 'company_tagline', 'logo_url', 'primary_color',
            'secondary_color', 'accent_color', 'email', 'phone', 'full_address',
            'website', 'facebook_url', 'instagram_url'
        ]

        for field in expected_public_fields:
            assert field in data, f"Public field {field} not in serialized data"

    def test_full_address_in_public(self):
        """Test full_address is included in public serializer."""
        settings = CompanySettings.objects.create(
            address_line1='456 Public Ave',
            city='Metro Manila',
            province='NCR',
            country='Philippines'
        )

        serializer = PublicCompanySettingsSerializer(settings)

        assert 'full_address' in serializer.data
        assert '456 Public Ave' in serializer.data['full_address']

    def test_logo_url_in_public(self):
        """Test logo_url is included in public serializer."""
        settings = CompanySettings.objects.create()

        serializer = PublicCompanySettingsSerializer(settings)

        assert 'logo_url' in serializer.data
