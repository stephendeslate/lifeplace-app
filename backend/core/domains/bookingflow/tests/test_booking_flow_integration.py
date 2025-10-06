# backend/core/domains/bookingflow/tests/test_booking_flow_integration.py

import json
import uuid
from decimal import Decimal
from datetime import timedelta

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
        
        # Create payment gateway
        self.payment_gateway = PaymentGateway.objects.create(
            name='Stripe Test',
            code='stripe',
            is_active=True,
            config={'test': True}
        )
        
        # Create product category and options
        self.category = ProductCategory.objects.create(
            name='Wedding Packages',
            description='Wedding photography packages'
        )
        
        self.package = ProductOption.objects.create(
            name='Premium Package',
            description='Premium wedding package',
            base_price=Decimal('2500.00'),
            category=self.category,
            type='PACKAGE'
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
            name='Payment Information',
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
        self.payment_config.allowed_gateways.add(self.payment_gateway)
        
        # Create a test booking session
        self.session = BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=self.booking_flow,
            client=self.client_user,
            booking_data={
                'step_1': {
                    'event_name': 'Test Wedding',
                    'start_date': '2024-12-31',
                    'start_time': '18:00'
                },
                'step_2': {
                    'selected_packages': [self.package.id]
                }
            },
            expires_at=timezone.now() + timedelta(hours=24)
        )
    
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
        # Add contact info to session for guest booking
        self.session.booking_data['contact'] = {
            'email': 'guest@test.com',
            'full_name': 'Guest User'
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
        
        # Verify user was created
        self.assertTrue(response.data['user_created'])
        
        # Verify event was created with LEAD status
        self.assertIn('event', response.data)
        event_data = response.data['event']
        self.assertEqual(event_data['status'], 'LEAD')
    
    def test_authenticated_payment_completion(self):
        """Test completing booking with payment via authenticated API"""
        self.client_api.force_authenticate(user=self.client_user)
        
        # Add payment data to session
        self.session.booking_data['payment'] = {
            'gateway_id': self.payment_gateway.id,
            'payment_method_token': 'test_token_123'
        }
        self.session.save()
        
        url = reverse('bookingflow:bookingsession-complete-booking', 
                     kwargs={'pk': self.session.id})
        
        data = {
            'completion_type': 'payment'
        }
        
        response = self.client_api.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Booking completed successfully', response.data['detail'])
        self.assertEqual(response.data['completion_type'], 'payment')
        
        # Verify event was created with CONFIRMED status
        self.assertIn('event', response.data)
        event_data = response.data['event']
        self.assertEqual(event_data['status'], 'CONFIRMED')
    
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
    
    def test_default_completion_type_fallback(self):
        """Test that completion_type defaults to 'payment' when not specified"""
        self.client_api.force_authenticate(user=self.client_user)
        
        # Add payment data to session
        self.session.booking_data['payment'] = {
            'gateway_id': self.payment_gateway.id,
            'payment_method_token': 'test_token_123'
        }
        self.session.save()
        
        url = reverse('bookingflow:bookingsession-complete-booking', 
                     kwargs={'pk': self.session.id})
        
        # Don't specify completion_type - should default to 'payment'
        data = {}
        
        response = self.client_api.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['completion_type'], 'payment')
        self.assertIn('Booking completed successfully', response.data['detail'])