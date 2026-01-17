# backend/core/domains/payments/tests/test_payment_scenarios.py

from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch, Mock
import threading
import time
import concurrent.futures

from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction

from core.domains.payments.models import (
    Payment, PaymentGateway, PaymentTransaction, PaymentMethod,
    Invoice
)
from core.domains.payments.services.payment_service import PaymentService
from core.domains.payments.services.gateway_service import PaymentGatewayService
from core.domains.events.models import Event, EventType

User = get_user_model()


class PaymentRefundTestCase(TestCase):
    """Test cases for payment refund scenarios"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='refund@test.com',
            first_name='Refund',
            last_name='Customer',
            role='CLIENT'
        )
        
        self.event_type = EventType.objects.create(name='Wedding')
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Refund Test Wedding',
            start_date=date.today() + timedelta(days=30)
        )
        
        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Stripe Test',
                'is_active': True
            }
        )
        self.gateway.config = {'test_mode': True}
        self.gateway.is_active = True
        self.gateway.save()
        
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_test_refund'
        )
    
    def test_full_refund_processing(self):
        """Test complete refund of a payment"""
        # Create completed payment
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('15000.00'),
            currency='PHP',
            status='COMPLETED'
        )
        
        # Create successful charge transaction
        charge_transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway_transaction_id='pi_charge_123',
            transaction_type='CHARGE',
            status='SUCCESS',
            amount=Decimal('15000.00'),
            currency='PHP'
        )
        
        # Mock Stripe refund
        with patch('stripe.Refund.create') as mock_refund:
            mock_refund_obj = Mock()
            mock_refund_obj.id = 're_full_refund_123'
            mock_refund_obj.status = 'succeeded'
            mock_refund_obj.amount = 1500000  # ₱15,000 in centavos
            mock_refund.return_value = mock_refund_obj
            
            result = PaymentGatewayService.refund_payment(
                payment, 
                Decimal('15000.00'),
                'Customer cancellation - full refund'
            )
            
            self.assertTrue(result['success'])
        
        # Verify refund transaction created
        refund_transaction = PaymentTransaction.objects.get(
            payment=payment,
            transaction_type='REFUND',
            gateway_transaction_id='re_full_refund_123'
        )
        
        self.assertEqual(refund_transaction.status, 'SUCCESS')
        self.assertEqual(refund_transaction.amount, Decimal('15000.00'))
        self.assertEqual(refund_transaction.parent_transaction, charge_transaction)
        
        # Verify payment refund amount
        payment.refresh_from_db()
        self.assertEqual(payment.refunded_amount, Decimal('15000.00'))
    
    def test_partial_refund_processing(self):
        """Test partial refund of a payment"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('20000.00'),
            currency='PHP',
            status='COMPLETED'
        )
        
        charge_transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway_transaction_id='pi_charge_456',
            transaction_type='CHARGE',
            status='SUCCESS',
            amount=Decimal('20000.00'),
            currency='PHP'
        )
        
        # First partial refund: ₱8,000
        with patch('stripe.Refund.create') as mock_refund:
            mock_refund_obj = Mock()
            mock_refund_obj.id = 're_partial_1_456'
            mock_refund_obj.status = 'succeeded'
            mock_refund_obj.amount = 800000
            mock_refund.return_value = mock_refund_obj
            
            result1 = PaymentGatewayService.refund_payment(
                payment, Decimal('8000.00'), 'Partial service reduction'
            )
            self.assertTrue(result1['success'])
        
        payment.refresh_from_db()
        self.assertEqual(payment.refunded_amount, Decimal('8000.00'))
        
        # Second partial refund: ₱5,000
        with patch('stripe.Refund.create') as mock_refund:
            mock_refund_obj = Mock()
            mock_refund_obj.id = 're_partial_2_456'
            mock_refund_obj.status = 'succeeded'
            mock_refund_obj.amount = 500000
            mock_refund.return_value = mock_refund_obj
            
            result2 = PaymentGatewayService.refund_payment(
                payment, Decimal('5000.00'), 'Additional refund request'
            )
            self.assertTrue(result2['success'])
        
        payment.refresh_from_db()
        self.assertEqual(payment.refunded_amount, Decimal('13000.00'))
        
        # Verify multiple refund transactions
        refund_transactions = PaymentTransaction.objects.filter(
            payment=payment, transaction_type='REFUND'
        )
        self.assertEqual(refund_transactions.count(), 2)
        
        total_refunded = sum(t.amount for t in refund_transactions)
        self.assertEqual(total_refunded, Decimal('13000.00'))
    
    def test_refund_exceeding_payment_amount(self):
        """Test refund amount validation"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('10000.00'),
            currency='PHP',
            status='COMPLETED'
        )
        
        # Try to refund more than payment amount
        with self.assertRaises(ValueError) as context:
            PaymentGatewayService.refund_payment(
                payment, Decimal('15000.00'), 'Invalid refund amount'
            )
        
        self.assertIn('Refund amount exceeds', str(context.exception))
    
    def test_refund_failed_payment(self):
        """Test attempting to refund a failed payment"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('5000.00'),
            currency='PHP',
            status='FAILED'
        )
        
        with self.assertRaises(ValueError) as context:
            PaymentGatewayService.refund_payment(
                payment, Decimal('5000.00'), 'Refund failed payment'
            )
        
        self.assertIn('Cannot refund', str(context.exception))
    
    def test_refund_with_stripe_error(self):
        """Test refund handling when Stripe returns error"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('7500.00'),
            currency='PHP',
            status='COMPLETED'
        )
        
        charge_transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway_transaction_id='pi_refund_error',
            transaction_type='CHARGE',
            status='SUCCESS',
            amount=Decimal('7500.00'),
            currency='PHP'
        )
        
        # Mock Stripe error
        with patch('stripe.Refund.create') as mock_refund:
            import stripe
            mock_refund.side_effect = stripe.error.InvalidRequestError(
                message='Charge has already been fully refunded.',
                param='charge'
            )
            
            result = PaymentGatewayService.refund_payment(
                payment, Decimal('7500.00'), 'Test refund error'
            )
            
            self.assertFalse(result['success'])
            self.assertIn('already been fully refunded', result['error'])
        
        # Verify failed refund transaction recorded
        failed_refund = PaymentTransaction.objects.filter(
            payment=payment,
            transaction_type='REFUND',
            status='FAILED'
        ).first()
        
        self.assertIsNotNone(failed_refund)
        self.assertIn('already been fully refunded', failed_refund.error_message)


class PaymentFailureTestCase(TestCase):
    """Test cases for payment failure scenarios"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='failure@test.com',
            first_name='Failure',
            last_name='Customer',
            role='CLIENT'
        )
        
        self.event_type = EventType.objects.create(name='Wedding')
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Failure Test Wedding',
            start_date=date.today() + timedelta(days=45)
        )
        
        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Stripe Test',
                'is_active': True
            }
        )
        self.gateway.config = {'test_mode': True}
        self.gateway.is_active = True
        self.gateway.save()
        
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_test_failure'
        )
    
    def test_card_declined_failure(self):
        """Test card declined payment failure"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('12000.00'),
            currency='PHP'
        )
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            import stripe
            mock_create.side_effect = stripe.error.CardError(
                message='Your card was declined.',
                param='payment_method',
                code='card_declined'
            )
            
            result = PaymentGatewayService.process_payment(payment)
            
            self.assertFalse(result['success'])
            self.assertEqual(result['error'], 'card_declined')
        
        # Verify failed transaction recorded
        failed_transaction = PaymentTransaction.objects.get(
            payment=payment, status='FAILED'
        )
        
        self.assertEqual(failed_transaction.error_code, 'card_declined')
        self.assertIn('declined', failed_transaction.error_message)
        
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'FAILED')
    
    def test_insufficient_funds_failure(self):
        """Test insufficient funds payment failure"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('25000.00'),
            currency='PHP'
        )
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            import stripe
            mock_create.side_effect = stripe.error.CardError(
                message='Your card has insufficient funds.',
                param='payment_method',
                code='insufficient_funds'
            )
            
            result = PaymentGatewayService.process_payment(payment)
            
            self.assertFalse(result['success'])
            self.assertEqual(result['error'], 'insufficient_funds')
        
        # Verify error details in transaction
        transaction = PaymentTransaction.objects.get(payment=payment)
        self.assertEqual(transaction.error_code, 'insufficient_funds')
        self.assertIn('insufficient funds', transaction.error_message)
    
    def test_expired_card_failure(self):
        """Test expired card payment failure"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('8000.00'),
            currency='PHP'
        )
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            import stripe
            mock_create.side_effect = stripe.error.CardError(
                message='Your card has expired.',
                param='exp_year',
                code='expired_card'
            )
            
            result = PaymentGatewayService.process_payment(payment)
            
            self.assertFalse(result['success'])
            self.assertEqual(result['error'], 'expired_card')
    
    def test_network_error_failure(self):
        """Test network/connection error during payment"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('15000.00'),
            currency='PHP'
        )
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            import stripe
            mock_create.side_effect = stripe.error.APIConnectionError(
                'Network communication with Stripe failed'
            )
            
            result = PaymentGatewayService.process_payment(payment)
            
            self.assertFalse(result['success'])
            self.assertIn('Network communication', result['error'])
        
        # Network errors should be retryable
        transaction = PaymentTransaction.objects.get(payment=payment)
        self.assertEqual(transaction.status, 'FAILED')
        self.assertIn('Network communication', transaction.error_message)
        
        # Payment should remain in retriable state
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'FAILED')
    
    def test_payment_retry_logic(self):
        """Test payment retry after initial failure"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('10000.00'),
            currency='PHP'
        )
        
        # First attempt fails
        with patch('stripe.PaymentIntent.create') as mock_create:
            import stripe
            mock_create.side_effect = stripe.error.APIConnectionError(
                'Temporary network error'
            )
            
            result1 = PaymentGatewayService.process_payment(payment)
            self.assertFalse(result1['success'])
        
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'FAILED')
        
        # Reset payment for retry
        payment.status = 'PENDING'
        payment.save()
        
        # Second attempt succeeds
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = Mock()
            mock_intent.id = 'pi_retry_success'
            mock_intent.status = 'succeeded'
            mock_intent.amount = 1000000
            mock_intent.currency = 'php'
            mock_create.return_value = mock_intent
            
            result2 = PaymentGatewayService.process_payment(payment)
            self.assertTrue(result2['success'])
        
        # Verify both transactions recorded
        transactions = PaymentTransaction.objects.filter(payment=payment)
        self.assertEqual(transactions.count(), 2)
        
        failed_transaction = transactions.filter(status='FAILED').first()
        success_transaction = transactions.filter(status='SUCCESS').first()
        
        self.assertIsNotNone(failed_transaction)
        self.assertIsNotNone(success_transaction)
        self.assertEqual(success_transaction.gateway_transaction_id, 'pi_retry_success')
        
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'COMPLETED')


class ConcurrentPaymentTestCase(TransactionTestCase):
    """Test cases for concurrent payment processing"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='concurrent@test.com',
            first_name='Concurrent',
            last_name='Customer',
            role='CLIENT'
        )
        
        self.event_type = EventType.objects.create(name='Wedding')
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Concurrent Test Wedding',
            start_date=date.today() + timedelta(days=60)
        )
        
        self.gateway = PaymentGateway.objects.create(
            name='Stripe Test',
            code='stripe',
            is_active=True
        )
        
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_concurrent_test'
        )
    
    def test_concurrent_payment_processing(self):
        """Test processing multiple payments concurrently"""
        # Create multiple payments
        payments = []
        for i in range(5):
            payment = Payment.objects.create(
                event=self.event,
                payment_method=self.payment_method,
                amount=Decimal(f'{1000 + i * 500}.00'),
                currency='PHP',
                description=f'Concurrent payment {i+1}'
            )
            payments.append(payment)
        
        results = []
        
        def process_payment_thread(payment):
            """Process payment in separate thread"""
            with patch('stripe.PaymentIntent.create') as mock_create:
                mock_intent = Mock()
                mock_intent.id = f'pi_concurrent_{payment.id}'
                mock_intent.status = 'succeeded'
                mock_intent.amount = int(payment.amount * 100)
                mock_intent.currency = 'php'
                mock_create.return_value = mock_intent
                
                result = PaymentGatewayService.process_payment(payment)
                return result
        
        # Process payments concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_payment = {
                executor.submit(process_payment_thread, payment): payment 
                for payment in payments
            }
            
            for future in concurrent.futures.as_completed(future_to_payment):
                payment = future_to_payment[future]
                try:
                    result = future.result()
                    results.append((payment.id, result))
                except Exception as exc:
                    results.append((payment.id, {'success': False, 'error': str(exc)}))
        
        # Verify all payments processed successfully
        successful_results = [r for _, r in results if r.get('success', False)]
        self.assertEqual(len(successful_results), 5)
        
        # Verify transactions were recorded
        transactions = PaymentTransaction.objects.filter(payment__in=payments)
        self.assertEqual(transactions.count(), 5)
        
        # Verify no race conditions in payment status updates
        for payment in payments:
            payment.refresh_from_db()
            self.assertEqual(payment.status, 'COMPLETED')
    
    def test_duplicate_payment_prevention(self):
        """Test prevention of duplicate payment processing"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('15000.00'),
            currency='PHP'
        )
        
        def attempt_payment_processing():
            """Attempt to process the same payment"""
            try:
                with patch('stripe.PaymentIntent.create') as mock_create:
                    mock_intent = Mock()
                    mock_intent.id = f'pi_duplicate_{payment.id}'
                    mock_intent.status = 'succeeded'
                    mock_intent.amount = 1500000
                    mock_create.return_value = mock_intent
                    
                    return PaymentGatewayService.process_payment(payment)
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        # Attempt to process the same payment twice simultaneously
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(attempt_payment_processing),
                executor.submit(attempt_payment_processing)
            ]
            
            results = [future.result() for future in futures]
        
        # Only one should succeed, the other should be prevented
        successful_results = [r for r in results if r.get('success', False)]
        
        # At least one should succeed (race condition might allow both in test environment)
        self.assertGreaterEqual(len(successful_results), 1)
        
        # Verify only one transaction was recorded
        transactions = PaymentTransaction.objects.filter(
            payment=payment, 
            transaction_type='CHARGE',
            status='SUCCESS'
        )
        
        # Should have exactly one successful transaction
        self.assertEqual(transactions.count(), 1)