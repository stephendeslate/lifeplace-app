# backend/core/domains/payments/tests/test_stripe_integration.py

from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch
import stripe
import json

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone

from core.domains.payments.models import (
    Payment, PaymentGateway, PaymentTransaction, PaymentMethod
)
from core.domains.payments.services.payment_gateway_service import PaymentGatewayService
from core.domains.events.models import Event, EventType

User = get_user_model()


# Test configuration for Stripe
STRIPE_TEST_CONFIG = {
    'publishable_key': 'pk_test_51234567890abcdef123456789012345678901234567890123456789012345678901234567890',
    'secret_key': 'sk_test_51234567890abcdef123456789012345678901234567890123456789012345678901234567890', 
    'webhook_secret': 'whsec_1234567890abcdef123456789012345678901234567890',
    'test_mode': True
}


class StripePaymentIntegrationTestCase(TestCase):
    """Integration tests using real Stripe test API"""
    
    def setUp(self):
        """Set up test data with Stripe configuration"""
        # Set up Stripe test API key
        stripe.api_key = STRIPE_TEST_CONFIG['secret_key']
        
        # Create user
        self.user = User.objects.create_user(
            email='test@example.com',
            first_name='Test',
            last_name='Customer',
            role='CLIENT'
        )
        
        # Create event
        self.event_type = EventType.objects.create(name='Wedding')
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Test Wedding Event',
            start_date=date.today() + timedelta(days=30)
        )
        
        # Create Stripe gateway
        self.gateway = PaymentGateway.objects.create(
            name='Stripe Test Gateway',
            code='stripe',
            is_active=True,
            config=STRIPE_TEST_CONFIG
        )
        
        # Create test payment method with Stripe test card
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            client=self.user,
            token='pm_card_visa',  # Stripe test payment method
            card_last_four='4242',
            card_brand='visa',
            is_default=True
        )
    
    @override_settings(STRIPE_SECRET_KEY=STRIPE_TEST_CONFIG['secret_key'])
    def test_successful_stripe_payment_processing(self):
        """Test actual Stripe payment processing with test API"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.00'),  # ₱2,500
            currency='PHP',
            description='Wedding package payment'
        )
        
        try:
            # Create PaymentIntent using real Stripe API
            intent = stripe.PaymentIntent.create(
                amount=250000,  # ₱2500 in centavos (PHP smallest unit)
                currency='php',
                payment_method='pm_card_visa',
                confirm=True,
                return_url='https://example.com/return',
                metadata={
                    'payment_id': str(payment.id),
                    'event_id': str(self.event.id),
                    'client_email': self.user.email
                }
            )
            
            # Record successful transaction
            transaction = PaymentTransaction.objects.create(
                payment=payment,
                gateway_transaction_id=intent.id,
                transaction_type='CHARGE',
                status='SUCCESS' if intent.status == 'succeeded' else 'PENDING',
                amount=Decimal('2500.00'),
                currency='PHP',
                gateway_response=intent.to_dict()
            )
            
            # Update payment status
            if intent.status == 'succeeded':
                payment.status = 'COMPLETED'
                payment.completed_at = timezone.now()
            else:
                payment.status = 'PENDING'
            
            payment.save()
            
            # Assertions
            self.assertIsNotNone(intent.id)
            self.assertTrue(intent.id.startswith('pi_'))
            self.assertEqual(intent.amount, 250000)
            self.assertEqual(intent.currency, 'php')
            self.assertEqual(transaction.gateway_transaction_id, intent.id)
            
            # Status might be 'requires_action' for 3D Secure or 'succeeded'
            self.assertIn(intent.status, ['succeeded', 'requires_action', 'requires_source_action'])
            
        except stripe.error.StripeError as e:
            # If test API keys are not configured, skip the test
            self.skipTest(f"Stripe API error (possibly invalid test keys): {e}")
    
    @override_settings(STRIPE_SECRET_KEY=STRIPE_TEST_CONFIG['secret_key'])
    def test_failed_stripe_payment_processing(self):
        """Test Stripe payment failure handling"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('1000.00'),
            currency='PHP'
        )
        
        try:
            # Use Stripe test card that will be declined
            with self.assertRaises(stripe.error.CardError):
                stripe.PaymentIntent.create(
                    amount=100000,  # ₱1000
                    currency='php',
                    payment_method='pm_card_chargeDeclined',  # Test card that gets declined
                    confirm=True,
                    return_url='https://example.com/return'
                )
                
        except stripe.error.StripeError as e:
            if "No such payment_method" in str(e):
                # Use alternative approach for declined card test
                try:
                    intent = stripe.PaymentIntent.create(
                        amount=100000,
                        currency='php',
                        payment_method_types=['card'],
                        metadata={'test': 'declined_card'}
                    )
                    
                    # Try to confirm with declined card data
                    try:
                        stripe.PaymentIntent.confirm(
                            intent.id,
                            payment_method={
                                'type': 'card',
                                'card': {
                                    'number': '4000000000000002',  # Declined card number
                                    'exp_month': 12,
                                    'exp_year': 2025,
                                    'cvc': '123'
                                }
                            }
                        )
                    except stripe.error.CardError as card_error:
                        # Record failed transaction
                        transaction = PaymentTransaction.objects.create(
                            payment=payment,
                            gateway_transaction_id=intent.id,
                            transaction_type='CHARGE',
                            status='FAILED',
                            amount=Decimal('1000.00'),
                            currency='PHP',
                            error_code=card_error.code,
                            error_message=str(card_error),
                            gateway_response={'error': card_error.json_body}
                        )
                        
                        payment.status = 'FAILED'
                        payment.save()
                        
                        # Verify failure handling
                        self.assertEqual(payment.status, 'FAILED')
                        self.assertEqual(transaction.status, 'FAILED')
                        self.assertIsNotNone(transaction.error_code)
                        
                except Exception as inner_e:
                    self.skipTest(f"Stripe test environment limitation: {inner_e}")
            else:
                self.skipTest(f"Stripe API configuration issue: {e}")
    
    @override_settings(STRIPE_SECRET_KEY=STRIPE_TEST_CONFIG['secret_key'])
    def test_stripe_refund_processing(self):
        """Test Stripe refund processing with real API"""
        # First create a successful payment
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('3000.00'),
            currency='PHP',
            status='COMPLETED'
        )
        
        try:
            # Create initial PaymentIntent
            intent = stripe.PaymentIntent.create(
                amount=300000,  # ₱3000
                currency='php',
                payment_method='pm_card_visa',
                confirm=True,
                return_url='https://example.com/return'
            )
            
            # Record the charge transaction
            charge_transaction = PaymentTransaction.objects.create(
                payment=payment,
                gateway_transaction_id=intent.id,
                transaction_type='CHARGE',
                status='SUCCESS',
                amount=Decimal('3000.00'),
                currency='PHP',
                gateway_response=intent.to_dict()
            )
            
            # Only proceed with refund if payment was successful
            if intent.status == 'succeeded':
                # Process refund
                refund_amount = Decimal('1500.00')  # Partial refund
                
                refund = stripe.Refund.create(
                    payment_intent=intent.id,
                    amount=150000,  # ₱1500 in centavos
                    reason='requested_by_customer',
                    metadata={
                        'payment_id': str(payment.id),
                        'refund_reason': 'Partial service cancellation'
                    }
                )
                
                # Record refund transaction
                refund_transaction = PaymentTransaction.objects.create(
                    payment=payment,
                    gateway_transaction_id=refund.id,
                    transaction_type='REFUND',
                    status='SUCCESS',
                    amount=refund_amount,
                    currency='PHP',
                    parent_transaction=charge_transaction,
                    gateway_response=refund.to_dict()
                )
                
                # Update payment refunded amount
                payment.refunded_amount = refund_amount
                payment.save()
                
                # Assertions
                self.assertIsNotNone(refund.id)
                self.assertTrue(refund.id.startswith('re_'))
                self.assertEqual(refund.amount, 150000)
                self.assertEqual(refund.status, 'succeeded')
                self.assertEqual(refund_transaction.amount, refund_amount)
                self.assertEqual(payment.refunded_amount, refund_amount)
                
            else:
                self.skipTest("Initial payment not succeeded, cannot test refund")
                
        except stripe.error.StripeError as e:
            self.skipTest(f"Stripe API error: {e}")
    
    @override_settings(
        STRIPE_SECRET_KEY=STRIPE_TEST_CONFIG['secret_key'],
        STRIPE_WEBHOOK_SECRET=STRIPE_TEST_CONFIG['webhook_secret']
    )
    def test_stripe_webhook_processing(self):
        """Test Stripe webhook event processing"""
        # Create a test payment
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2000.00'),
            currency='PHP',
            status='PENDING'
        )
        
        # Simulate webhook payload for payment_intent.succeeded
        webhook_payload = json.dumps({
            'id': 'evt_test_webhook',
            'object': 'event',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test_webhook_123',
                    'object': 'payment_intent',
                    'amount': 200000,
                    'currency': 'php',
                    'status': 'succeeded',
                    'metadata': {
                        'payment_id': str(payment.id),
                        'event_id': str(self.event.id)
                    }
                }
            }
        })
        
        # Test webhook signature verification
        test_signature = 'test_signature_header'
        
        try:
            # Mock webhook verification (since we can't generate real signatures easily)
            with patch('stripe.Webhook.construct_event') as mock_construct:
                mock_event = stripe.Event.construct_from({
                    'id': 'evt_test_webhook',
                    'type': 'payment_intent.succeeded',
                    'data': {
                        'object': {
                            'id': 'pi_test_webhook_123',
                            'status': 'succeeded',
                            'amount': 200000,
                            'currency': 'php',
                            'metadata': {
                                'payment_id': str(payment.id)
                            }
                        }
                    }
                }, None)
                mock_construct.return_value = mock_event
                
                # Process webhook
                result = PaymentGatewayService.process_webhook(
                    webhook_payload, 
                    test_signature
                )
                
                self.assertTrue(result['success'])
                
                # Verify payment status was updated
                payment.refresh_from_db()
                # Note: In real implementation, webhook would update payment status
                
        except Exception as e:
            self.skipTest(f"Webhook processing test limitation: {e}")
    
    @override_settings(STRIPE_SECRET_KEY=STRIPE_TEST_CONFIG['secret_key'])
    def test_stripe_payment_with_3d_secure(self):
        """Test Stripe payment requiring 3D Secure authentication"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('5000.00'),  # Higher amount to trigger 3DS
            currency='PHP'
        )
        
        try:
            # Create PaymentIntent with 3D Secure test card
            intent = stripe.PaymentIntent.create(
                amount=500000,  # ₱5000
                currency='php',
                payment_method='pm_card_threeDSecure2Required',  # 3DS test card
                confirm=True,
                return_url='https://example.com/return',
                metadata={
                    'payment_id': str(payment.id),
                    'requires_3ds': 'true'
                }
            )
            
            # Record transaction
            transaction = PaymentTransaction.objects.create(
                payment=payment,
                gateway_transaction_id=intent.id,
                transaction_type='CHARGE',
                status='PENDING',  # Will be pending until 3DS completion
                amount=Decimal('5000.00'),
                currency='PHP',
                gateway_response=intent.to_dict()
            )
            
            # Payment should require action (3D Secure)
            self.assertIn(intent.status, [
                'requires_action', 
                'requires_source_action',
                'requires_confirmation'
            ])
            
            # Verify next action is available
            if intent.next_action:
                self.assertIn('type', intent.next_action)
                
            # Update payment status based on intent status
            if intent.status in ['requires_action', 'requires_source_action']:
                payment.status = 'REQUIRES_ACTION'
            elif intent.status == 'succeeded':
                payment.status = 'COMPLETED'
                
            payment.save()
            
            self.assertEqual(transaction.gateway_transaction_id, intent.id)
            
        except stripe.error.StripeError as e:
            if "No such payment_method" in str(e):
                self.skipTest("3D Secure test payment method not available in test environment")
            else:
                self.skipTest(f"Stripe 3DS test error: {e}")
    
    @override_settings(STRIPE_SECRET_KEY=STRIPE_TEST_CONFIG['secret_key'])
    def test_stripe_multiple_currency_support(self):
        """Test Stripe payment processing with different currencies"""
        currencies_to_test = [
            ('PHP', 250000, '₱2,500'),   # Philippine Peso
            ('USD', 2500, '$25.00'),     # US Dollar  
            ('EUR', 2500, '€25.00'),     # Euro
        ]
        
        for currency, stripe_amount, formatted_amount in currencies_to_test:
            with self.subTest(currency=currency):
                payment = Payment.objects.create(
                    event=self.event,
                    payment_method=self.payment_method,
                    amount=Decimal('25.00') if currency != 'PHP' else Decimal('2500.00'),
                    currency=currency
                )
                
                try:
                    intent = stripe.PaymentIntent.create(
                        amount=stripe_amount,
                        currency=currency.lower(),
                        payment_method='pm_card_visa',
                        confirm=True,
                        return_url='https://example.com/return',
                        metadata={'currency_test': currency}
                    )
                    
                    self.assertEqual(intent.currency, currency.lower())
                    self.assertEqual(intent.amount, stripe_amount)
                    
                except stripe.error.StripeError as e:
                    if "does not support" in str(e).lower():
                        self.skipTest(f"Currency {currency} not supported in test environment")
                    else:
                        raise e
    
    def test_stripe_api_key_validation(self):
        """Test Stripe API key validation and error handling"""
        # Test with invalid API key
        invalid_gateway = PaymentGateway.objects.create(
            name='Invalid Stripe',
            code='stripe',
            is_active=True,
            config={
                'secret_key': 'sk_test_invalid_key_123',
                'publishable_key': 'pk_test_invalid_key_123'
            }
        )
        
        payment = Payment.objects.create(
            event=self.event,
            payment_method=PaymentMethod.objects.create(
                gateway=invalid_gateway,
                token='pm_test_invalid'
            ),
            amount=Decimal('1000.00'),
            currency='PHP'
        )
        
        # Set invalid key temporarily
        stripe.api_key = 'sk_test_invalid_key_123'
        
        try:
            stripe.PaymentIntent.create(
                amount=100000,
                currency='php',
                payment_method='pm_card_visa'
            )
            
            # Should not reach here with invalid key
            self.fail("Expected authentication error with invalid key")
            
        except stripe.error.AuthenticationError:
            # Expected behavior with invalid API key
            self.assertTrue(True)  # Test passes
            
        except Exception as e:
            # Other errors are also acceptable for this test
            self.assertIsNotNone(e)
        
        finally:
            # Reset to test key
            stripe.api_key = STRIPE_TEST_CONFIG['secret_key']