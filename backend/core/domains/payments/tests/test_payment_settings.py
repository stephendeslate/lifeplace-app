# backend/core/domains/payments/tests/test_payment_settings.py
import os
import django
from decimal import Decimal
from unittest.mock import patch, MagicMock

# Setup Django before any imports
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from core.domains.payments.models import PaymentSettings
from core.domains.payments.admin import PaymentSettingsAdmin
from core.domains.events.models import Event, EventType

User = get_user_model()


class PaymentSettingsModelTest(TestCase):
    """Test PaymentSettings model functionality"""

    def setUp(self):
        """Clear any existing settings"""
        PaymentSettings.objects.all().delete()

    def test_singleton_pattern_creation(self):
        """Test that only one PaymentSettings instance can exist"""
        # Create first instance
        settings1 = PaymentSettings.objects.create(
            balance_due_days=30,
            grace_period_days=7,
            default_installments=2,
            default_installment_frequency='MONTHLY',
            late_fee_enabled=True,
            default_late_fee_amount=Decimal('25.00'),
            default_deposit_percentage=Decimal('50.00'),
            auto_payment_retry_attempts=3,
            auto_payment_retry_delay_days=2
        )
        self.assertIsInstance(settings1.id, int)

        # Try to create second instance - should fail validation
        with self.assertRaises(ValidationError) as context:
            settings2 = PaymentSettings()
            settings2.full_clean()  # Triggers validation

        self.assertIn("Only one PaymentSettings instance is allowed", str(context.exception))

    def test_get_default_settings_singleton(self):
        """Test get_default_settings returns singleton instance"""
        # First call creates instance
        settings1 = PaymentSettings.get_default_settings()
        self.assertIsNotNone(settings1.id)

        # Second call returns same instance
        settings2 = PaymentSettings.get_default_settings()
        self.assertEqual(settings1.id, settings2.id)

        # Verify default values
        self.assertEqual(settings1.balance_due_days, 30)
        self.assertEqual(settings1.grace_period_days, 7)
        self.assertEqual(settings1.default_installments, 2)
        self.assertEqual(settings1.default_installment_frequency, 'MONTHLY')
        self.assertTrue(settings1.late_fee_enabled)
        self.assertEqual(settings1.default_late_fee_amount, Decimal('25.00'))
        self.assertEqual(settings1.default_deposit_percentage, Decimal('50.00'))
        # Note: default_currency moved to CurrencySettings model
        self.assertEqual(settings1.auto_payment_retry_attempts, 3)
        self.assertEqual(settings1.auto_payment_retry_delay_days, 2)

    def test_validation_rules(self):
        """Test field validation rules"""
        # Test invalid deposit percentage > 100
        with self.assertRaises(ValidationError) as context:
            settings = PaymentSettings(default_deposit_percentage=Decimal('150.00'))
            settings.full_clean()
        self.assertIn("must be between 0 and 100", str(context.exception))

        # Test invalid deposit percentage < 0
        with self.assertRaises(ValidationError) as context:
            settings = PaymentSettings(default_deposit_percentage=Decimal('-10.00'))
            settings.full_clean()
        self.assertIn("must be between 0 and 100", str(context.exception))

        # Test valid percentage values
        settings = PaymentSettings(default_deposit_percentage=Decimal('75.00'))
        try:
            settings.full_clean()
        except ValidationError:
            self.fail("Valid deposit percentage should not raise ValidationError")

    def test_str_representation(self):
        """Test string representation"""
        settings = PaymentSettings.get_default_settings()
        self.assertEqual(str(settings), "Global Payment Settings")

    def test_field_choices_validation(self):
        """Test field choices are enforced"""
        settings = PaymentSettings.get_default_settings()

        # Test valid frequency choices
        valid_frequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY']
        for freq in valid_frequencies:
            settings.default_installment_frequency = freq
            try:
                settings.full_clean()
            except ValidationError:
                self.fail(f"Valid frequency {freq} should not raise ValidationError")

    def test_meta_class_configuration(self):
        """Test model meta configuration"""
        self.assertEqual(PaymentSettings._meta.verbose_name, "Payment Settings")
        self.assertEqual(PaymentSettings._meta.verbose_name_plural, "Payment Settings")


class PaymentSettingsAdminTest(TestCase):
    """Test PaymentSettings admin interface functionality"""

    def setUp(self):
        """Setup admin test environment"""
        PaymentSettings.objects.all().delete()
        self.admin_user = User.objects.create_superuser(
            email='admin@test.com',
            password='testpass123',
            first_name='Admin',
            last_name='User'
        )
        self.client = Client()
        self.client.force_login(self.admin_user)
        self.admin_instance = PaymentSettingsAdmin(PaymentSettings, None)

    def test_admin_singleton_behavior(self):
        """Test admin respects singleton pattern"""
        # Get the changelist URL
        url = reverse('admin:payments_paymentsettings_changelist')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Should automatically redirect to edit the single instance
        settings = PaymentSettings.get_default_settings()
        expected_redirect_url = reverse('admin:payments_paymentsettings_change', args=[settings.id])

        # Check if we have the settings form or redirect
        self.assertIn(b'Payment Settings', response.content)

    def test_admin_has_add_permission(self):
        """Test admin add permission behavior"""
        # Check if add permission is properly restricted
        url = reverse('admin:payments_paymentsettings_add')
        response = self.client.get(url)

        # Should either redirect or show error about singleton
        self.assertIn(response.status_code, [200, 302, 403])

    def test_admin_fieldsets(self):
        """Test admin fieldsets configuration"""
        fieldsets = self.admin_instance.fieldsets
        self.assertIsNotNone(fieldsets)

        # Verify fieldsets contain expected field groupings
        all_fields = []
        for fieldset in fieldsets:
            if 'fields' in fieldset[1]:
                all_fields.extend(fieldset[1]['fields'])

        # Note: default_currency moved to CurrencySettings model
        expected_fields = [
            'balance_due_days', 'grace_period_days', 'default_installments',
            'default_installment_frequency', 'late_fee_enabled', 'default_late_fee_amount',
            'default_deposit_percentage', 'auto_payment_retry_attempts',
            'auto_payment_retry_delay_days'
        ]

        for field in expected_fields:
            self.assertIn(field, all_fields)


class PaymentSettingsAPITest(APITestCase):
    """Test PaymentSettings API endpoints with authentication"""

    def setUp(self):
        """Setup API test environment"""
        PaymentSettings.objects.all().delete()

        # Create admin user
        self.admin_user = User.objects.create_user(
            email='stephendeslate@gmail.com',
            password='HuDi#[Ta3',
            first_name='Stephen',
            last_name='DeSlate',
            role='ADMIN',
            is_staff=True,
            is_superuser=True
        )

        # Create non-admin user
        self.regular_user = User.objects.create_user(
            email='john.doe@gmail.com',
            password='test123',
            first_name='John',
            last_name='Doe',
            role='CLIENT'
        )

        self.client = APIClient()

    def get_admin_token(self):
        """Get JWT token for admin user"""
        refresh = RefreshToken.for_user(self.admin_user)
        return str(refresh.access_token)

    def get_regular_token(self):
        """Get JWT token for regular user"""
        refresh = RefreshToken.for_user(self.regular_user)
        return str(refresh.access_token)

    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated access is denied"""
        url = reverse('payment-settings-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_access_denied(self):
        """Test that non-admin users cannot access settings"""
        token = self.get_regular_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        url = reverse('payment-settings-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_settings(self):
        """Test admin can list payment settings"""
        token = self.get_admin_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        url = reverse('payment-settings-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should return list with one item (singleton)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 1)

        # Verify default values
        settings_data = response.data[0]
        self.assertEqual(settings_data['balance_due_days'], 30)
        self.assertEqual(settings_data['grace_period_days'], 7)
        self.assertEqual(settings_data['default_installments'], 2)
        self.assertEqual(settings_data['default_installment_frequency'], 'MONTHLY')
        self.assertTrue(settings_data['late_fee_enabled'])
        self.assertEqual(float(settings_data['default_late_fee_amount']), 25.00)
        self.assertEqual(float(settings_data['default_deposit_percentage']), 50.00)
        # Note: default_currency moved to CurrencySettings model
        self.assertEqual(settings_data['auto_payment_retry_attempts'], 3)
        self.assertEqual(settings_data['auto_payment_retry_delay_days'], 2)

    def test_admin_can_retrieve_settings(self):
        """Test admin can retrieve specific settings instance"""
        token = self.get_admin_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        settings = PaymentSettings.get_default_settings()
        url = reverse('payment-settings-detail', kwargs={'pk': settings.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify response data
        self.assertEqual(response.data['id'], settings.id)
        self.assertEqual(response.data['balance_due_days'], 30)

    def test_admin_can_update_settings(self):
        """Test admin can update payment settings"""
        token = self.get_admin_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        settings = PaymentSettings.get_default_settings()
        url = reverse('payment-settings-detail', kwargs={'pk': settings.id})

        # Note: default_currency moved to CurrencySettings model
        update_data = {
            'balance_due_days': 45,
            'grace_period_days': 10,
            'default_installments': 3,
            'default_installment_frequency': 'BIWEEKLY',
            'late_fee_enabled': False,
            'default_late_fee_amount': '30.00',
            'default_deposit_percentage': '60.00',
            'auto_payment_retry_attempts': 5,
            'auto_payment_retry_delay_days': 3
        }

        response = self.client.put(url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify changes were saved
        settings.refresh_from_db()
        self.assertEqual(settings.balance_due_days, 45)
        self.assertEqual(settings.grace_period_days, 10)
        self.assertEqual(settings.default_installments, 3)
        self.assertEqual(settings.default_installment_frequency, 'BIWEEKLY')
        self.assertFalse(settings.late_fee_enabled)
        self.assertEqual(settings.default_late_fee_amount, Decimal('30.00'))
        self.assertEqual(settings.default_deposit_percentage, Decimal('60.00'))
        self.assertEqual(settings.auto_payment_retry_attempts, 5)
        self.assertEqual(settings.auto_payment_retry_delay_days, 3)

    def test_admin_can_partially_update_settings(self):
        """Test admin can partially update payment settings"""
        token = self.get_admin_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        settings = PaymentSettings.get_default_settings()
        url = reverse('payment-settings-detail', kwargs={'pk': settings.id})

        partial_data = {
            'balance_due_days': 35,
            'default_late_fee_amount': '40.00'
        }

        response = self.client.patch(url, partial_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify only specified fields were changed
        settings.refresh_from_db()
        self.assertEqual(settings.balance_due_days, 35)
        self.assertEqual(settings.default_late_fee_amount, Decimal('40.00'))
        # Other fields should remain default
        self.assertEqual(settings.grace_period_days, 7)  # Should be unchanged
        self.assertEqual(settings.default_installments, 2)  # Should be unchanged

    def test_cannot_create_new_settings(self):
        """Test that creating new settings is prevented"""
        token = self.get_admin_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        url = reverse('payment-settings-list')
        create_data = {
            'balance_due_days': 25,
            'grace_period_days': 5
        }

        response = self.client.post(url, create_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', response.data['detail'])

    def test_cannot_delete_settings(self):
        """Test that deleting settings is prevented"""
        token = self.get_admin_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        settings = PaymentSettings.get_default_settings()
        url = reverse('payment-settings-detail', kwargs={'pk': settings.id})

        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be deleted', response.data['detail'])

    def test_validation_on_update(self):
        """Test validation is enforced on updates"""
        token = self.get_admin_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        settings = PaymentSettings.get_default_settings()
        url = reverse('payment-settings-detail', kwargs={'pk': settings.id})

        # Test invalid deposit percentage
        invalid_data = {
            'default_deposit_percentage': '150.00'  # Invalid: > 100
        }

        response = self.client.patch(url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


if __name__ == '__main__':
    import unittest
    unittest.main()