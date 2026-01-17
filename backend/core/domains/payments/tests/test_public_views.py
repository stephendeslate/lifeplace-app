# backend/core/domains/payments/tests/test_public_views.py
import json
from django.test import TestCase, override_settings
from django.urls import reverse
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status

from core.domains.payments.models import PaymentGateway
from core.domains.users.models import User


class PublicPaymentGatewayViewSetTestCase(TestCase):
    """Test cases for the public payment gateway endpoint"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()

        # Clear cache before each test
        cache.clear()

        # Create test payment gateways
        self.active_gateway_1, _ = PaymentGateway.objects.get_or_create(
            code="stripe",
            defaults={
                "name": "Stripe",
                "is_active": True,
                "description": "Credit card payments via Stripe",
            }
        )
        # Always update config to ensure test settings are applied
        self.active_gateway_1.config = {
            "publishable_key": "pk_test_123456789",
            "secret_key": "sk_test_987654321",
            "webhook_secret": "whsec_test_123",
            "test_mode": True
        }
        self.active_gateway_1.is_active = True
        self.active_gateway_1.description = "Credit card payments via Stripe"
        self.active_gateway_1.save()

        self.active_gateway_2 = PaymentGateway.objects.create(
            name="PayPal",
            code="paypal",
            is_active=True,
            description="PayPal payments",
            config={
                "client_id": "paypal_client_123",
                "client_secret": "paypal_secret_456",
                "environment": "sandbox"
            }
        )

        self.inactive_gateway = PaymentGateway.objects.create(
            name="Inactive Gateway",
            code="inactive",
            is_active=False,
            description="This gateway is disabled",
            config={
                "secret_key": "should_not_be_exposed",
                "api_key": "sensitive_data"
            }
        )

        # Base URL for public gateway endpoints
        self.list_url = reverse('public-payment-gateway-list')

    def test_public_access_no_authentication_required(self):
        """Test that public endpoint doesn't require authentication"""
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_only_active_gateways_returned(self):
        """Test that only active gateways are returned"""
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Only 2 active gateways

        gateway_codes = [gateway['code'] for gateway in response.data]
        self.assertIn('stripe', gateway_codes)
        self.assertIn('paypal', gateway_codes)
        self.assertNotIn('inactive', gateway_codes)

    def test_sensitive_data_not_exposed(self):
        """Test that sensitive configuration data is not exposed"""
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        for gateway in response.data:
            # Check that sensitive fields are not present
            self.assertNotIn('config', gateway)
            self.assertNotIn('secret_key', gateway)
            self.assertNotIn('publishable_key', gateway)
            self.assertNotIn('client_secret', gateway)
            self.assertNotIn('webhook_secret', gateway)

            # Check that only safe fields are present
            expected_fields = {'id', 'name', 'code', 'is_active', 'description'}
            actual_fields = set(gateway.keys())

            # public_config is optional and safe
            if 'public_config' in actual_fields:
                actual_fields.remove('public_config')

            self.assertEqual(actual_fields, expected_fields)

    def test_public_config_only_safe_data(self):
        """Test that public_config only contains safe, non-sensitive data"""
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        for gateway in response.data:
            if 'public_config' in gateway:
                public_config = gateway['public_config']

                # Check that only safe config fields are included
                if gateway['code'] == 'stripe':
                    self.assertIn('test_mode', public_config)
                    self.assertEqual(public_config['test_mode'], True)
                    # Ensure no sensitive data
                    self.assertNotIn('secret_key', public_config)
                    self.assertNotIn('publishable_key', public_config)

                elif gateway['code'] == 'paypal':
                    self.assertIn('environment', public_config)
                    self.assertEqual(public_config['environment'], 'sandbox')
                    # Ensure no sensitive data
                    self.assertNotIn('client_id', public_config)
                    self.assertNotIn('client_secret', public_config)

    def test_retrieve_specific_gateway(self):
        """Test retrieving a specific active gateway by ID"""
        detail_url = reverse('public-payment-gateway-detail', args=[self.active_gateway_1.id])
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.active_gateway_1.id)
        self.assertEqual(response.data['code'], 'stripe')
        self.assertEqual(response.data['name'], 'Stripe')

        # Check that sensitive data is not exposed
        self.assertNotIn('config', response.data)

    def test_retrieve_inactive_gateway_404(self):
        """Test that retrieving an inactive gateway returns 404"""
        detail_url = reverse('public-payment-gateway-detail', args=[self.inactive_gateway.id])
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('not found or not active', response.data['detail'])

    def test_retrieve_nonexistent_gateway_404(self):
        """Test that retrieving a non-existent gateway returns 404"""
        detail_url = reverse('public-payment-gateway-detail', args=[99999])
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_only_get_methods_allowed(self):
        """Test that only GET methods are allowed"""
        # Test POST is not allowed
        response = self.client.post(self.list_url, {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Test PUT is not allowed
        detail_url = reverse('public-payment-gateway-detail', args=[self.active_gateway_1.id])
        response = self.client.put(detail_url, {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Test DELETE is not allowed
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_caching_works(self):
        """Test that caching is working properly"""
        # First request should hit the database
        response1 = self.client.get(self.list_url)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Second request should be served from cache
        response2 = self.client.get(self.list_url)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data, response2.data)

        # Check that cache key exists
        cache_key = 'public_payment_gateways'
        cached_data = cache.get(cache_key)
        self.assertIsNotNone(cached_data)

    def test_cache_invalidation_on_gateway_changes(self):
        """Test that cache is properly managed when gateways change"""
        # Get initial response (creates cache)
        response1 = self.client.get(self.list_url)
        initial_count = len(response1.data)

        # Create a new active gateway
        new_gateway = PaymentGateway.objects.create(
            name="New Gateway",
            code="new_gateway",
            is_active=True,
            description="New test gateway"
        )

        # Cache should still return old data
        response2 = self.client.get(self.list_url)
        self.assertEqual(len(response2.data), initial_count)

        # Clear cache manually (in real app, this would be done via signals)
        cache.clear()

        # Now should get updated data
        response3 = self.client.get(self.list_url)
        self.assertEqual(len(response3.data), initial_count + 1)

    @override_settings(CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    })
    def test_works_without_cache(self):
        """Test that endpoint works even when caching is disabled"""
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_rate_limiting_configuration(self):
        """Test that rate limiting is properly configured (basic test)"""
        # This test verifies the view has throttling configured
        # In a real app, you might want to test actual rate limiting
        from core.domains.payments.public_views import PublicPaymentGatewayViewSet

        viewset = PublicPaymentGatewayViewSet()

        # Check that throttle classes are configured
        self.assertTrue(hasattr(viewset, 'throttle_classes'))
        self.assertTrue(len(viewset.throttle_classes) > 0)

    def test_response_format_is_correct(self):
        """Test that response format matches expected structure"""
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        if response.data:
            gateway = response.data[0]

            # Required fields
            required_fields = ['id', 'name', 'code', 'is_active', 'description']
            for field in required_fields:
                self.assertIn(field, gateway)

            # Check field types
            self.assertIsInstance(gateway['id'], int)
            self.assertIsInstance(gateway['name'], str)
            self.assertIsInstance(gateway['code'], str)
            self.assertIsInstance(gateway['is_active'], bool)
            self.assertIsInstance(gateway['description'], str)

            # is_active should always be True for public endpoint
            self.assertTrue(gateway['is_active'])

    def test_ordering_is_consistent(self):
        """Test that gateways are returned in consistent order"""
        response1 = self.client.get(self.list_url)
        response2 = self.client.get(self.list_url)

        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        # Order should be consistent (by name)
        gateway_names_1 = [g['name'] for g in response1.data]
        gateway_names_2 = [g['name'] for g in response2.data]

        self.assertEqual(gateway_names_1, gateway_names_2)
        self.assertEqual(gateway_names_1, sorted(gateway_names_1))

    def test_empty_response_when_no_active_gateways(self):
        """Test response when no active gateways exist"""
        # Deactivate all gateways
        PaymentGateway.objects.update(is_active=False)

        # Clear cache
        cache.clear()

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_endpoint_url_structure(self):
        """Test that the endpoint URL structure is correct"""
        # Should be accessible at /api/payments/public/gateways/
        expected_path = '/api/payments/public/gateways/'
        self.assertTrue(self.list_url.endswith(expected_path) or
                       'public/gateways' in self.list_url)

    def tearDown(self):
        """Clean up after each test"""
        cache.clear()
        PaymentGateway.objects.all().delete()