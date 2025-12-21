# backend/core/domains/settings/models.py

from django.db import models
from core.utils.models import BaseModel
from core.utils.encryption import EncryptedJSONField
from decimal import Decimal
import json


class AppSettings(BaseModel):
    """
    Centralized application settings
    Following the pattern established by PaymentGateway and other domain models
    """
    SETTING_CATEGORIES = [
        ('CURRENCY', 'Currency Settings'),
        ('PAYMENT', 'Payment Settings'),
        ('NOTIFICATION', 'Notification Settings'),
        ('SYSTEM', 'System Settings'),
        ('ANALYTICS', 'Analytics Settings'),
    ]

    category = models.CharField(max_length=50, choices=SETTING_CATEGORIES)
    key = models.CharField(max_length=100)
    value = models.JSONField()
    description = models.TextField(blank=True)
    is_encrypted = models.BooleanField(default=False)
    encrypted_value = EncryptedJSONField(default=dict, blank=True)
    
    # User/organization level settings (for multi-tenant future)
    user = models.ForeignKey(
        'users.User', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        help_text="Leave null for system-wide settings"
    )
    
    class Meta:
        unique_together = ['category', 'key', 'user']
        ordering = ['category', 'key']
        indexes = [
            models.Index(fields=['category', 'key']),
            models.Index(fields=['user', 'category']),
        ]

    def __str__(self):
        scope = f"User {self.user.id}" if self.user else "System"
        return f"{scope} - {self.category}: {self.key}"

    def get_value(self):
        """Get the actual value, handling encryption if needed"""
        if self.is_encrypted and self.encrypted_value:
            return self.encrypted_value
        return self.value

    def set_value(self, value, encrypt=False):
        """Set value with optional encryption"""
        if encrypt:
            self.encrypted_value = value
            self.value = {}
            self.is_encrypted = True
        else:
            self.value = value
            self.encrypted_value = {}
            self.is_encrypted = False

    @classmethod
    def get_setting(cls, category, key, default=None, user=None):
        """Get a specific setting value"""
        try:
            setting = cls.objects.get(category=category, key=key, user=user)
            return setting.get_value()
        except cls.DoesNotExist:
            return default

    @classmethod
    def set_setting(cls, category, key, value, description='', encrypt=False, user=None):
        """Set a specific setting value"""
        setting, created = cls.objects.get_or_create(
            category=category,
            key=key,
            user=user,
            defaults={
                'description': description,
            }
        )
        setting.set_value(value, encrypt)
        if description and not created:
            setting.description = description
        setting.save()
        return setting

    @classmethod
    def get_category_settings(cls, category, user=None):
        """Get all settings for a category as a dict"""
        settings = cls.objects.filter(category=category, user=user)
        return {setting.key: setting.get_value() for setting in settings}


class CurrencySettings(BaseModel):
    """
    Currency-specific settings model
    Specialized model for currency configuration following the domain pattern
    """
    SUPPORTED_CURRENCIES = [
        ('PHP', 'Philippine Peso'),
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('SGD', 'Singapore Dollar'),
        ('HKD', 'Hong Kong Dollar'),
    ]

    DISPLAY_FORMATS = [
        ('symbol', 'Symbol Only (₱)'),
        ('code', 'Code Only (PHP)'),
        ('both', 'Symbol and Code (₱ PHP)'),
    ]

    SEPARATORS = [
        (',', 'Comma (,)'),
        ('.', 'Period (.)'),
        (' ', 'Space ( )'),
    ]

    # Primary currency configuration
    default_currency = models.CharField(
        max_length=3,
        choices=SUPPORTED_CURRENCIES,
        default='PHP',
        help_text="Default currency for the application"
    )
    
    enabled_currencies = models.JSONField(
        default=list,
        help_text="List of enabled currency codes"
    )
    
    # Display settings
    display_format = models.CharField(
        max_length=10,
        choices=DISPLAY_FORMATS,
        default='symbol',
        help_text="How to display currency values"
    )
    
    decimal_places = models.PositiveIntegerField(
        default=0,
        help_text="Number of decimal places to show (0 for PHP business context)"
    )
    
    thousands_separator = models.CharField(
        max_length=1,
        choices=SEPARATORS,
        default=',',
        help_text="Thousands separator character"
    )
    
    decimal_separator = models.CharField(
        max_length=1,
        choices=[('.', 'Period (.)'), (',', 'Comma (,)')],
        default='.',
        help_text="Decimal separator character"
    )
    
    # Behavior settings
    auto_format = models.BooleanField(
        default=True,
        help_text="Automatically format currency inputs"
    )
    
    compact_format = models.BooleanField(
        default=False,
        help_text="Use compact format for large amounts (1K, 1M)"
    )
    
    # Organization level (for future multi-tenant support)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Leave null for system-wide settings"
    )

    class Meta:
        # Only one currency setting per user (or system-wide if user is null)
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                condition=models.Q(user__isnull=False),
                name='unique_currency_settings_per_user'
            ),
            models.UniqueConstraint(
                fields=['id'],
                condition=models.Q(user__isnull=True),
                name='unique_system_currency_settings'
            )
        ]
        verbose_name = "Currency Settings"
        verbose_name_plural = "Currency Settings"

    def __str__(self):
        scope = f"User {self.user.id}" if self.user else "System"
        return f"{scope} Currency Settings - Default: {self.default_currency}"

    def clean(self):
        """Validate the currency settings"""
        super().clean()
        
        # Ensure default currency is in enabled currencies
        if self.enabled_currencies and self.default_currency not in self.enabled_currencies:
            self.enabled_currencies.append(self.default_currency)
        
        # Set default enabled currencies if empty
        if not self.enabled_currencies:
            self.enabled_currencies = [self.default_currency]

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @classmethod
    def get_system_settings(cls):
        """Get system-wide currency settings"""
        try:
            return cls.objects.get(user__isnull=True)
        except cls.DoesNotExist:
            # Create default system settings
            return cls.objects.create(
                default_currency='PHP',
                enabled_currencies=['PHP'],
                display_format='symbol',
                decimal_places=0,
            )

    @classmethod
    def get_user_settings(cls, user):
        """Get user-specific currency settings, fallback to system"""
        try:
            return cls.objects.get(user=user)
        except cls.DoesNotExist:
            return cls.get_system_settings()

    def format_amount(self, amount, currency=None):
        """
        Format an amount according to these currency settings
        
        Args:
            amount: Decimal or float amount to format
            currency: Currency code (defaults to default_currency)
            
        Returns:
            Formatted currency string
        """
        from decimal import Decimal
        
        # Use provided currency or default
        if not currency:
            currency = self.default_currency
        
        # Currency symbols mapping
        currency_symbols = {
            'PHP': '₱',
            'USD': '$',
            'EUR': '€',
            'SGD': 'S$',
            'HKD': 'HK$',
        }
        
        # Get symbol or use currency code
        symbol = currency_symbols.get(currency, f'{currency} ')
        
        # Determine decimal places (PHP defaults to 0, others to 2)
        if self.decimal_places is not None:
            decimals = self.decimal_places
        elif currency == 'PHP':
            decimals = 0
        else:
            decimals = 2
        
        # Convert amount to Decimal for precision
        if not isinstance(amount, Decimal):
            amount = Decimal(str(amount))
        
        # Format the amount
        if decimals == 0:
            formatted_amount = f"{int(amount):,}"
        else:
            formatted_amount = f"{float(amount):,.{decimals}f}"
        
        # Apply thousands separator
        if self.thousands_separator and self.thousands_separator != ',':
            formatted_amount = formatted_amount.replace(',', self.thousands_separator)
        
        # Apply decimal separator
        if decimals > 0 and self.decimal_separator and self.decimal_separator != '.':
            formatted_amount = formatted_amount.replace('.', self.decimal_separator)
        
        # Apply display format
        if self.display_format == 'symbol':
            return f"{symbol}{formatted_amount}"
        elif self.display_format == 'code':
            return f"{currency} {formatted_amount}"
        elif self.display_format == 'both':
            return f"{symbol} {formatted_amount} {currency}"
        else:
            return f"{symbol}{formatted_amount}"
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'default_currency': self.default_currency,
            'enabled_currencies': self.enabled_currencies,
            'display_format': self.display_format,
            'decimal_places': self.decimal_places,
            'thousands_separator': self.thousands_separator,
            'decimal_separator': self.decimal_separator,
            'auto_format': self.auto_format,
            'compact_format': self.compact_format,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class LegalDocument(BaseModel):
    """
    Stores global legal documents (Terms of Service, Privacy Policy).
    Follows singleton pattern per document type like CurrencySettings.
    """
    DOCUMENT_TYPE_CHOICES = [
        ('TERMS_OF_SERVICE', 'Terms of Service'),
        ('PRIVACY_POLICY', 'Privacy Policy'),
    ]

    document_type = models.CharField(
        max_length=50,
        choices=DOCUMENT_TYPE_CHOICES,
        unique=True,
        help_text="Type of legal document"
    )
    title = models.CharField(max_length=255, default="")
    content = models.TextField(blank=True, help_text="Rich text content of the document")
    version = models.CharField(max_length=50, default="1.0")
    effective_date = models.DateField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    last_updated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='updated_legal_documents'
    )

    class Meta:
        verbose_name = "Legal Document"
        verbose_name_plural = "Legal Documents"

    def __str__(self):
        return f"{self.get_document_type_display()} v{self.version}"

    @classmethod
    def get_valid_document_types(cls):
        """Return list of valid document type codes"""
        return [choice[0] for choice in cls.DOCUMENT_TYPE_CHOICES]

    @classmethod
    def get_document(cls, document_type):
        """Get or create a document by type (validates document_type)"""
        # Validate document_type before creating
        valid_types = cls.get_valid_document_types()
        if document_type not in valid_types:
            raise ValueError(f"Invalid document type: '{document_type}'. Must be one of: {valid_types}")

        doc, created = cls.objects.get_or_create(
            document_type=document_type,
            defaults={
                'title': dict(cls.DOCUMENT_TYPE_CHOICES).get(document_type, document_type),
                'content': '',
                'is_published': False,
            }
        )
        return doc

    @classmethod
    def get_terms_of_service(cls):
        return cls.get_document('TERMS_OF_SERVICE')

    @classmethod
    def get_privacy_policy(cls):
        return cls.get_document('PRIVACY_POLICY')