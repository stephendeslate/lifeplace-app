# backend/core/domains/bookingflow/tests/test_booking_flow_integration.py

import json
import uuid
from decimal import Decimal
from datetime import timedelta
import unittest
from unittest import mock
from unittest.mock import Mock, patch

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from core.domains.bookingflow.models import (
    BookingFlow,
    BookingFlowStep,
    PaymentInfoStepConfiguration,
    BookingSession
)
from core.domains.events.models import EventType
from core.domains.sales.models import EventQuote
from core.domains.products.models import ProductOption, ProductCategory
from core.domains.payments.models import PaymentGateway

User = get_user_model()


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class BookingFlowIntegrationTestCase(TestCase):
    """Integration tests for the complete booking flow API"""
    
    def setUp(self):
        """Set up test data"""
        self.client_api = APIClient()
        
        # Create user
        self.client_user = User.objects.create_user(
            email='client@test.com',
            first_name='Test',
            last_name='Client',
            role='CLIENT'
        )
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            first_name='Admin',
            last_name='User',
            role='ADMIN'
        )
        
        # Create event type
        self.event_type = EventType.objects.create(
            name='Wedding',
            description='Wedding events'
        )
        
        # Get or create payment gateway (may already exist from signal with empty config)
        self.payment_gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Stripe Test',
                'is_active': True,
                'config': {}
            }
        )
        # Ensure gateway has valid test config for payment processing
        self.payment_gateway.config = {
            'secret_key': 'sk_test_mock_key_for_testing',
            'publishable_key': 'pk_test_mock_key_for_testing',
            'test_mode': True
        }
        self.payment_gateway.is_active = True
        self.payment_gateway.save()
        
        # Create product category and options (may already exist from migration)
        self.category, _ = ProductCategory.objects.get_or_create(
            name='Wedding Packages',
            defaults={'description': 'Wedding photography packages'}
        )

        self.package, _ = ProductOption.objects.get_or_create(
            name='Premium Package',
            category=self.category,
            defaults={
                'description': 'Premium wedding package',
                'base_price': Decimal('2500.00'),
                'type': 'PACKAGE'
            }
        )
        
        # Create booking flow
        self.booking_flow = BookingFlow.objects.create(
            name='Wedding Booking Flow',
            event_type=self.event_type,
            is_active=True
        )
        
        # Create payment step with quote request enabled
        self.payment_step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='payment_info',
            order=3,
            is_enabled=True,
            is_required=True
        )
        
        # Create payment configuration with quote request enabled
        self.payment_config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            allow_quote_request=True,
            quote_request_button_text='Request Quote',
            quote_request_description='Get a customized quote for your event',
            require_immediate_payment=False
        )
        # Note: allowed_gateways moved to PaymentSettings - gateway is set at flow level
        self.booking_flow.allowed_payment_gateways.add(self.payment_gateway)
        
        # Create a test booking session with properly formatted booking data
        self.session = BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=self.booking_flow,
            client=self.client_user,
            booking_data={
                'event_name': 'Test Wedding',
                'start_date': '2024-12-31',
                'start_time': '18:00',
                'selected_packages': [
                    {
                        'product_id': self.package.id,
                        'name': self.package.name,
                        'price': str(self.package.base_price),
                        'quantity': 1
                    }
                ]
            },
            expires_at=timezone.now() + timedelta(hours=24)
        )
        # Mark required steps as completed
        self.session.completed_steps.add(self.payment_step)
    
    def test_authenticated_quote_request_completion(self):
        """Test completing booking with quote request via authenticated API"""
        self.client_api.force_authenticate(user=self.client_user)
        
        url = reverse('bookingflow:bookingsession-complete-booking', 
                     kwargs={'pk': self.session.id})
        
        data = {
            'completion_type': 'quote'
        }
        
        response = self.client_api.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Quote request submitted successfully', response.data['detail'])
        self.assertEqual(response.data['completion_type'], 'quote')
        
        # Verify event was created
        self.assertIn('event', response.data)
        event_data = response.data['event']
        self.assertEqual(event_data['status'], 'LEAD')
        
        # Verify quote was created in database
        quotes = EventQuote.objects.filter(event__id=event_data['id'])
        self.assertEqual(quotes.count(), 1)
        
        quote = quotes.first()
        self.assertEqual(quote.status, 'DRAFT')
    
    def test_public_quote_request_completion(self):
        """Test completing booking with quote request via public API"""
        # Add contact info to session for guest booking with account creation
        self.session.booking_data['contact'] = {
            'email': 'guest_unique@test.com',  # Use unique email
            'full_name': 'Guest User',
            'create_account': True,  # Request account creation
            'password': 'TestPassword123!'
        }
        self.session.client = None  # Make it a guest session
        self.session.save()

        url = reverse('bookingflow:publicbookingflow-complete-booking-public',
                     kwargs={'session_uuid': str(self.session.session_id)})

        data = {
            'completion_type': 'quote'
        }

        response = self.client_api.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Quote request submitted successfully', response.data['detail'])
        self.assertEqual(response.data['completion_type'], 'quote')

        # Verify user was created (only True when create_account=True)
        self.assertTrue(response.data['user_created'])

        # Verify event was created with LEAD status
        self.assertIn('event', response.data)
        event_data = response.data['event']
        self.assertEqual(event_data['status'], 'LEAD')
    
    @unittest.skip("Payment completion requires valid Stripe keys or comprehensive mocking")
    def test_authenticated_payment_completion(self):
        """Test completing booking with payment via authenticated API.

        This test requires either:
        1. Valid Stripe test API keys configured
        2. Comprehensive mocking of the entire payment flow

        Consider moving to a unit test with proper mocking.
        """
        pass
    
    def test_invalid_completion_type_validation(self):
        """Test API validation for invalid completion_type"""
        self.client_api.force_authenticate(user=self.client_user)
        
        url = reverse('bookingflow:bookingsession-complete-booking', 
                     kwargs={'pk': self.session.id})
        
        data = {
            'completion_type': 'invalid_type'
        }
        
        response = self.client_api.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('completion_type must be', response.data['detail'])
    
    def test_quote_request_disabled_validation(self):
        """Test API validation when quote requests are disabled"""
        self.client_api.force_authenticate(user=self.client_user)
        
        # Disable quote requests
        self.payment_config.allow_quote_request = False
        self.payment_config.save()
        
        url = reverse('bookingflow:bookingsession-complete-booking', 
                     kwargs={'pk': self.session.id})
        
        data = {
            'completion_type': 'quote'
        }
        
        response = self.client_api.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Quote requests are not allowed', response.data['detail'])
    
    def test_payment_step_configuration_serialization(self):
        """Test that new payment configuration fields are properly serialized"""
        self.client_api.force_authenticate(user=self.admin_user)
        
        url = reverse('bookingflow:bookingflowstep-detail', 
                     kwargs={'pk': self.payment_step.id})
        
        response = self.client_api.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that configuration_data includes new quote fields
        config_data = response.data['configuration_data']
        self.assertIn('allow_quote_request', config_data)
        self.assertIn('quote_request_button_text', config_data)
        self.assertIn('quote_request_description', config_data)
        
        self.assertTrue(config_data['allow_quote_request'])
        self.assertEqual(config_data['quote_request_button_text'], 'Request Quote')
    
    @unittest.skip("Payment completion requires valid Stripe keys or comprehensive mocking")
    def test_default_completion_type_fallback(self):
        """Test that completion_type defaults to 'payment' when not specified.

        This test requires either:
        1. Valid Stripe test API keys configured
        2. Comprehensive mocking of the entire payment flow

        Consider moving to a unit test with proper mocking.
        """
        pass