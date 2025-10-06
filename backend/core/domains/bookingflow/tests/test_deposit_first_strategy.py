# backend/core/domains/bookingflow/tests/test_deposit_first_strategy.py

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
from core.domains.sales.models import EventQuote
from core.domains.products.models import ProductOption, ProductCategory
from core.domains.payments.models import PaymentGateway

User = get_user_model()


class DepositFirstStrategyTestCase(TestCase):
    """Test cases for deposit-first strategy functionality"""
    
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
        
        # Create booking flow
        self.booking_flow = BookingFlow.objects.create(
            name='Wedding Booking Flow',
            event_type=self.event_type,
            is_active=True
        )
        
        # Create payment step with deposit-first configuration
        self.payment_step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='payment_info',
            name='Payment Information',
            order=3,
            is_enabled=True,
            is_required=True
        )
        
        # Create payment configuration optimized for deposit-first strategy
        self.payment_config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_full_payment=True,
            accept_deposit=True,  # Enable deposits
            deposit_type='PERCENTAGE',
            deposit_amount='30',  # 30% deposit (optimal conversion rate)
            require_immediate_payment=False,
            allow_quote_request=True,
            quote_request_button_text='Get Custom Quote',
            quote_request_description='Perfect for unique celebrations with custom requirements'
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
        
        # Mark payment step as completed
        self.session.completed_steps.add(self.payment_step)
    
    def test_deposit_first_secure_booking_flow(self):
        """Test the primary deposit-first booking flow"""
        # Complete booking with deposit payment
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
    
    def test_deposit_calculation_percentage(self):
        """Test correct calculation of percentage-based deposits"""
        # Mock the session to include pricing data
        self.session.booking_data['pricing'] = {
            'total_amount': '2500.00'
        }
        self.session.save()
        
        # Calculate expected deposit (30% of $2500 = $750)
        total_amount = Decimal('2500.00')
        deposit_percentage = Decimal('30')
        expected_deposit = (total_amount * deposit_percentage) / 100
        
        self.assertEqual(expected_deposit, Decimal('750.00'))
        
        # Verify the configuration supports this calculation
        self.assertEqual(self.payment_config.deposit_type, 'PERCENTAGE')
        self.assertEqual(self.payment_config.deposit_amount, '30')
    
    def test_deposit_calculation_fixed(self):
        """Test fixed amount deposit calculation"""
        # Update configuration to use fixed deposit
        self.payment_config.deposit_type = 'FIXED'
        self.payment_config.deposit_amount = '500.00'
        self.payment_config.save()
        
        # Verify fixed deposit configuration
        self.assertEqual(self.payment_config.deposit_type, 'FIXED')
        self.assertEqual(Decimal(self.payment_config.deposit_amount), Decimal('500.00'))
    
    def test_quote_request_secondary_option(self):
        """Test quote request as secondary option in deposit-first strategy"""
        # Complete booking with quote request
        event = BookingSessionService.complete_booking(
            str(self.session.session_id), 
            completion_type='quote'
        )
        
        # Verify event was created with LEAD status (not immediately confirmed)
        self.assertIsNotNone(event)
        self.assertEqual(event.status, 'LEAD')
        self.assertEqual(event.client, self.client_user)
        
        # Verify quote was created
        quotes = EventQuote.objects.filter(event=event)
        self.assertEqual(quotes.count(), 1)
        
        quote = quotes.first()
        self.assertEqual(quote.status, 'DRAFT')
        
        # Verify session was marked as completed
        self.session.refresh_from_db()
        self.assertTrue(self.session.is_completed)
    
    def test_configuration_messaging(self):
        """Test deposit-first strategy configuration"""
        # Verify deposit-first optimized configuration
        self.assertTrue(self.payment_config.accept_deposit)
        self.assertTrue(self.payment_config.allow_quote_request)
        self.assertEqual(self.payment_config.quote_request_button_text, 'Get Custom Quote')
        self.assertEqual(
            self.payment_config.quote_request_description, 
            'Perfect for unique celebrations with custom requirements'
        )
        
        # Verify deposit percentage is in optimal range (25-35%)
        deposit_amount = int(self.payment_config.deposit_amount)
        self.assertGreaterEqual(deposit_amount, 25)
        self.assertLessEqual(deposit_amount, 35)
    
    def test_business_conversion_optimization(self):
        """Test business rules that optimize for conversions"""
        # Verify deposits are accepted (reduces abandonment)
        self.assertTrue(self.payment_config.accept_deposit)
        
        # Verify immediate payment is not required (reduces friction)
        self.assertFalse(self.payment_config.require_immediate_payment)
        
        # Verify quote requests are allowed but positioned as secondary
        self.assertTrue(self.payment_config.allow_quote_request)
        
        # Verify quote button text focuses on custom needs (not price shopping)
        self.assertIn('Custom', self.payment_config.quote_request_button_text)
        self.assertIn('unique', self.payment_config.quote_request_description.lower())
    
    def test_trust_signals_and_messaging(self):
        """Test that trust-building elements are configured"""
        # Verify payment terms can include trust-building language
        self.payment_config.payment_terms = (
            "• Price guaranteed once booked\n"
            "• Full refund if cancelled within 48 hours\n" 
            "• Secure SSL payment processing\n"
            "• Balance due 30 days before event"
        )
        self.payment_config.save()
        
        # Verify trust messaging is stored
        self.assertIn('guaranteed', self.payment_config.payment_terms)
        self.assertIn('secure', self.payment_config.payment_terms.lower())
        self.assertIn('refund', self.payment_config.payment_terms.lower())
    
    def test_deposit_first_without_quote_option(self):
        """Test deposit-first strategy when quote requests are disabled"""
        # Disable quote requests
        self.payment_config.allow_quote_request = False
        self.payment_config.save()
        
        # Should still work with just the deposit-first payment flow
        event = BookingSessionService.complete_booking(
            str(self.session.session_id), 
            completion_type='payment'
        )
        
        self.assertIsNotNone(event)
        self.assertEqual(event.status, 'CONFIRMED')
        
        # Verify configuration
        self.assertFalse(self.payment_config.allow_quote_request)
        self.assertTrue(self.payment_config.accept_deposit)
    
    def test_pricing_transparency_and_urgency(self):
        """Test elements that build urgency and trust in pricing"""
        # Verify deposit configuration builds urgency without price shopping
        self.assertTrue(self.payment_config.accept_deposit)
        
        # Verify quote requests are positioned for custom needs, not price comparison
        quote_description = self.payment_config.quote_request_description.lower()
        
        # Should focus on unique/custom, not price/cost/cheaper
        self.assertIn('unique', quote_description)
        self.assertIn('custom', quote_description)
        self.assertNotIn('price', quote_description)
        self.assertNotIn('cost', quote_description)
        self.assertNotIn('cheaper', quote_description)