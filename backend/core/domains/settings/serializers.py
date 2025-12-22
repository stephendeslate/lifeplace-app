# backend/core/domains/settings/serializers.py

from rest_framework import serializers
from .models import AppSettings, CurrencySettings, LegalDocument, MobileAppVersion


class AppSettingsSerializer(serializers.ModelSerializer):
    """Serializer for general app settings"""
    
    class Meta:
        model = AppSettings
        fields = [
            'id', 'category', 'key', 'value', 'description',
            'is_encrypted', 'user', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_encrypted', 'created_at', 'updated_at']
        extra_kwargs = {
            'encrypted_value': {'write_only': True},  # Hide encrypted data in responses
        }

    def create(self, validated_data):
        """Create app setting with encryption handling"""
        encrypt = validated_data.pop('encrypt', False)
        instance = super().create(validated_data)
        if encrypt:
            instance.set_value(instance.value, encrypt=True)
            instance.save()
        return instance

    def update(self, instance, validated_data):
        """Update app setting with encryption handling"""
        encrypt = validated_data.pop('encrypt', False)
        instance = super().update(instance, validated_data)
        if 'value' in validated_data:
            instance.set_value(validated_data['value'], encrypt=encrypt)
            instance.save()
        return instance


class CurrencySettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for currency settings
    Following the pattern from PaymentGatewaySerializer and TaxRateSerializer
    """
    
    class Meta:
        model = CurrencySettings
        fields = [
            'id', 'default_currency', 'enabled_currencies', 'display_format',
            'decimal_places', 'thousands_separator', 'decimal_separator',
            'auto_format', 'compact_format', 'user', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_enabled_currencies(self, value):
        """Validate that enabled currencies are supported"""
        if not value:
            return value
        
        supported_codes = [choice[0] for choice in CurrencySettings.SUPPORTED_CURRENCIES]
        invalid_currencies = [code for code in value if code not in supported_codes]
        
        if invalid_currencies:
            raise serializers.ValidationError(
                f"Unsupported currencies: {', '.join(invalid_currencies)}. "
                f"Supported currencies: {', '.join(supported_codes)}"
            )
        
        return value

    def validate(self, data):
        """Cross-field validation"""
        default_currency = data.get('default_currency')
        enabled_currencies = data.get('enabled_currencies', [])
        
        # Ensure default currency is in enabled currencies
        if default_currency and enabled_currencies and default_currency not in enabled_currencies:
            enabled_currencies.append(default_currency)
            data['enabled_currencies'] = enabled_currencies
        
        return data


class CurrencySettingsCreateSerializer(CurrencySettingsSerializer):
    """Serializer for creating currency settings"""
    
    def create(self, validated_data):
        """Create currency settings with proper defaults"""
        # Set default enabled currencies if not provided
        if not validated_data.get('enabled_currencies'):
            validated_data['enabled_currencies'] = [validated_data.get('default_currency', 'PHP')]
        
        return super().create(validated_data)


class CurrencySettingsUpdateSerializer(CurrencySettingsSerializer):
    """Serializer for updating currency settings"""
    
    # Make all fields optional for updates
    default_currency = serializers.CharField(required=False)
    enabled_currencies = serializers.ListField(required=False)
    display_format = serializers.CharField(required=False)


class SystemCurrencySettingsSerializer(serializers.Serializer):
    """
    Serializer for system-wide currency settings operations
    Used for getting/setting system defaults
    """
    default_currency = serializers.ChoiceField(
        choices=CurrencySettings.SUPPORTED_CURRENCIES,
        required=False
    )
    enabled_currencies = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    display_format = serializers.ChoiceField(
        choices=CurrencySettings.DISPLAY_FORMATS,
        required=False
    )
    decimal_places = serializers.IntegerField(min_value=0, max_value=4, required=False)
    thousands_separator = serializers.ChoiceField(
        choices=CurrencySettings.SEPARATORS,
        required=False
    )
    decimal_separator = serializers.ChoiceField(
        choices=[('.', 'Period (.)'), (',', 'Comma (,)')],
        required=False
    )
    auto_format = serializers.BooleanField(required=False)
    compact_format = serializers.BooleanField(required=False)

    def validate_enabled_currencies(self, value):
        """Validate enabled currencies"""
        if not value:
            return value
        
        supported_codes = [choice[0] for choice in CurrencySettings.SUPPORTED_CURRENCIES]
        invalid_currencies = [code for code in value if code not in supported_codes]
        
        if invalid_currencies:
            raise serializers.ValidationError(
                f"Unsupported currencies: {', '.join(invalid_currencies)}"
            )
        
        return value

    def validate(self, data):
        """Cross-field validation"""
        default_currency = data.get('default_currency')
        enabled_currencies = data.get('enabled_currencies', [])
        
        if default_currency and enabled_currencies and default_currency not in enabled_currencies:
            enabled_currencies.append(default_currency)
            data['enabled_currencies'] = enabled_currencies
        
        return data


class SupportedCurrenciesSerializer(serializers.Serializer):
    """Serializer for supported currencies information"""
    code = serializers.CharField()
    name = serializers.CharField()
    symbol = serializers.CharField()
    locale = serializers.CharField()
    decimals = serializers.IntegerField()

    @classmethod
    def get_supported_currencies(cls):
        """Return list of supported currencies with metadata"""
        # This matches the frontend currency utility structure
        currencies = [
            {
                'code': 'PHP',
                'name': 'Philippine Peso',
                'symbol': '₱',
                'locale': 'en-PH',
                'decimals': 0,
            },
            {
                'code': 'USD',
                'name': 'US Dollar',
                'symbol': '$',
                'locale': 'en-US',
                'decimals': 2,
            },
            {
                'code': 'EUR',
                'name': 'Euro',
                'symbol': '€',
                'locale': 'en-EU',
                'decimals': 2,
            },
            {
                'code': 'SGD',
                'name': 'Singapore Dollar',
                'symbol': 'S$',
                'locale': 'en-SG',
                'decimals': 2,
            },
            {
                'code': 'HKD',
                'name': 'Hong Kong Dollar',
                'symbol': 'HK$',
                'locale': 'en-HK',
                'decimals': 2,
            },
        ]
        return currencies


class LegalDocumentSerializer(serializers.ModelSerializer):
    """
    Full serializer for legal documents (admin use)
    Includes document_type_display for readable document type
    """
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    last_updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LegalDocument
        fields = [
            'id', 'document_type', 'document_type_display', 'title', 'content',
            'version', 'effective_date', 'is_published', 'last_updated_by',
            'last_updated_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'document_type_display']

    def get_last_updated_by_name(self, obj):
        """Get the name of the user who last updated the document"""
        if obj.last_updated_by:
            return f"{obj.last_updated_by.first_name} {obj.last_updated_by.last_name}".strip() or obj.last_updated_by.email
        return None


class LegalDocumentUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating legal documents
    Only allows updating specific fields
    """

    class Meta:
        model = LegalDocument
        fields = ['title', 'content', 'version', 'effective_date', 'is_published']

    def validate_version(self, value):
        """Validate version format"""
        if not value:
            raise serializers.ValidationError("Version cannot be empty")
        return value


class PublicLegalDocumentSerializer(serializers.ModelSerializer):
    """
    Public read-only serializer for legal documents
    Only exposes necessary fields for public viewing
    """
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)

    class Meta:
        model = LegalDocument
        fields = ['document_type', 'document_type_display', 'title', 'content', 'version', 'effective_date']
        read_only_fields = fields


class MobileVersionResponseSerializer(serializers.Serializer):
    """Response serializer for mobile version check"""
    status = serializers.CharField()
    platform = serializers.CharField(required=False)
    version_info = serializers.DictField(required=False)
    update_required = serializers.BooleanField()
    update_recommended = serializers.BooleanField()
    force_update = serializers.BooleanField()
    update_urls = serializers.DictField(required=False)
    messages = serializers.DictField(required=False)
    deprecation = serializers.DictField(required=False)
    feature_flags = serializers.DictField()
    maintenance = serializers.DictField(required=False)


class MobileAppVersionSerializer(serializers.ModelSerializer):
    """Admin serializer for managing mobile app versions"""
    platform_display = serializers.CharField(source='get_platform_display', read_only=True)

    class Meta:
        model = MobileAppVersion
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']