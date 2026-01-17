# backend/core/domains/bookingflow/tests/test_payment_quote_flow.py

import unittest
from decimal import Decimal
from datetime import date, timedelta
import uuid

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from core.domains.bookingflow.models import (
    BookingFlow,
    BookingFlowStep, 
    PaymentInfoStepConfiguration,
    BookingSession
)
from core.domains.bookingflow.services.booking_session_service import BookingSessionService
from core.domains.events.models import Event, EventType
from core.domains.sales.models import EventQuote, QuoteLineItem
from core.domains.products.models import ProductOption, ProductCategory
from core.domains.payments.models import PaymentGateway

User = get_user_model()


class PaymentQuoteFlowTestCase(TestCase):
    """Test cases for payment vs quote request flow functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create user
        self.client_user = User.objects.create_user(
            email='client@test.com',
            first_name='Test',
            last_name='Client',
            role='CLIENT'
        )
        
        # Create event type
        self.event_type = EventType.objects.create(
            name='Wedding',
            description='Wedding events'
        )
        
        # Get or create payment gateway (may already exist from signal)
        self.payment_gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Stripe Test',
                'is_active': True,
                'config': {'test': True}
            }
        )
        
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

        self.addon, _ = ProductOption.objects.get_or_create(
            name='Extra Hour',
            category=self.category,
            defaults={
                'description': 'Additional hour of service',
                'base_price': Decimal('200.00'),
                'type': 'PRODUCT'
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
        # Note: start_date must be in a nested dict (step structure) for the service to parse it
        self.session = BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=self.booking_flow,
            client=self.client_user,
            booking_data={
                'step_1': {
                    'event_name': 'Test Wedding',
                    'start_date': '2028-12-31',  # Future date for proper valid_until calculation
                    'start_time': '18:00',
                },
                'selected_packages': [
                    {
                        'product_id': self.package.id,
                        'name': self.package.name,
                        'price': str(self.package.base_price),
                        'quantity': 1
                    }
                ],
                'selected_addons': [
                    {
                        'product_id': self.addon.id,
                        'name': self.addon.name,
                        'price': str(self.addon.base_price),
                        'quantity': 1
                    }
                ]
            },
            expires_at=timezone.now() + timedelta(hours=24)
        )

        # Mark the payment step as completed in the session
        self.session.completed_steps.add(self.payment_step)
    
    def test_quote_request_completion(self):
        """Test completing booking with quote request"""
        # Complete booking with quote request
        event = BookingSessionService.complete_booking(
            str(self.session.session_id), 
            completion_type='quote'
        )
        
        # Verify event was created with LEAD status
        self.assertIsNotNone(event)
        self.assertEqual(event.status, 'LEAD')
        self.assertEqual(event.client, self.client_user)
        self.assertEqual(event.event_type, self.event_type)
        
        # Verify quote was created
        quotes = EventQuote.objects.filter(event=event)
        self.assertEqual(quotes.count(), 1)
        
        quote = quotes.first()
        self.assertEqual(quote.status, 'DRAFT')
        self.assertEqual(quote.total_amount, Decimal('2700.00'))  # package + addon
        
        # Verify line items were created
        line_items = QuoteLineItem.objects.filter(quote=quote)
        self.assertEqual(line_items.count(), 2)
        
        # Verify session was marked as completed
        self.session.refresh_from_db()
        self.assertTrue(self.session.is_completed)
        self.assertEqual(self.session.created_event, event)
    
    @unittest.skip("Payment completion requires valid Stripe keys or comprehensive mocking")
    def test_payment_completion(self):
        """Test completing booking with immediate payment.

        Requires valid Stripe configuration or comprehensive mocking.
        """
        pass
    
    def test_quote_request_validation_disabled(self):
        """Test that quote requests are blocked when disabled"""
        # Disable quote requests
        self.payment_config.allow_quote_request = False
        self.payment_config.save()
        
        # Try to complete booking with quote request
        with self.assertRaises(Exception) as context:
            BookingSessionService.complete_booking(
                str(self.session.session_id), 
                completion_type='quote'
            )
        
        self.assertIn('Quote requests are not allowed', str(context.exception))
    
    def test_quote_generation_with_line_items(self):
        """Test that quote generation correctly adds line items"""
        # Complete booking with quote request
        event = BookingSessionService.complete_booking(
            str(self.session.session_id), 
            completion_type='quote'
        )
        
        # Get the generated quote
        quote = EventQuote.objects.get(event=event)
        
        # Verify line items
        line_items = quote.line_items.all()
        self.assertEqual(line_items.count(), 2)
        
        # Check package line item
        package_item = line_items.filter(product=self.package).first()
        self.assertIsNotNone(package_item)
        self.assertEqual(package_item.quantity, 1)
        self.assertEqual(package_item.unit_price, self.package.base_price)
        self.assertEqual(package_item.total, self.package.base_price)
        
        # Check addon line item
        addon_item = line_items.filter(product=self.addon).first()
        self.assertIsNotNone(addon_item)
        self.assertEqual(addon_item.quantity, 1)
        self.assertEqual(addon_item.unit_price, self.addon.base_price)
        self.assertEqual(addon_item.total, self.addon.base_price)
    
    def test_quote_valid_until_date(self):
        """Test that quote has proper valid_until date"""
        # Complete booking with quote request
        event = BookingSessionService.complete_booking(
            str(self.session.session_id), 
            completion_type='quote'
        )
        
        # Get the generated quote
        quote = EventQuote.objects.get(event=event)
        
        # Verify valid_until date is 30 days from today
        expected_date = date.today() + timedelta(days=30)
        self.assertEqual(quote.valid_until, expected_date)
    
    @unittest.skip("completion_type validation is at view layer, not service layer")
    def test_invalid_completion_type(self):
        """Test validation of completion_type parameter.

        Note: completion_type validation happens in the view layer, not in the service.
        The service defaults to payment-like behavior for unknown types.
        Use API tests to validate completion_type.
        """
        pass