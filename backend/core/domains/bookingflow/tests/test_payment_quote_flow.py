# backend/core/domains/bookingflow/tests/test_payment_quote_flow.py

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
        
        self.addon = ProductOption.objects.create(
            name='Extra Hour',
            description='Additional hour of service',
            base_price=Decimal('200.00'),
            category=self.category,
            type='PRODUCT'
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
                    'selected_packages': [self.package.id],
                    'selected_addons': [self.addon.id]
                }
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
    
    def test_payment_completion(self):
        """Test completing booking with immediate payment"""
        # Add payment data to session
        self.session.booking_data['step_3'] = {
            'gateway_id': self.payment_gateway.id,
            'payment_method_token': 'test_token_123'
        }
        self.session.save()
        
        # Complete booking with payment
        event = BookingSessionService.complete_booking(
            str(self.session.session_id), 
            completion_type='payment'
        )
        
        # Verify event was created with CONFIRMED status
        self.assertIsNotNone(event)
        self.assertEqual(event.status, 'CONFIRMED')
        self.assertEqual(event.client, self.client_user)
        self.assertEqual(event.event_type, self.event_type)
        
        # Verify session was marked as completed
        self.session.refresh_from_db()
        self.assertTrue(self.session.is_completed)
        self.assertEqual(self.session.created_event, event)
    
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
    
    def test_invalid_completion_type(self):
        """Test validation of completion_type parameter"""
        # Try invalid completion type
        with self.assertRaises(Exception):
            BookingSessionService.complete_booking(
                str(self.session.session_id), 
                completion_type='invalid'
            )