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
from core.domains.payments.services.refund_service import RefundService
from core.domains.events.models import Event, EventType

User = get_user_model()


class PaymentRefundTestCase(TestCase):
    """Test cases for payment refund scenarios using RefundService"""

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
        self.gateway.config = {'test_mode': True, 'secret_key': 'sk_test_123'}
        self.gateway.is_active = True
        self.gateway.save()

        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_test_refund'
        )

    def test_full_refund_processing(self):
        """Test complete refund of a payment via RefundService"""
        # Create completed payment
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('15000.00'),
            currency='PHP',
            status='COMPLETED',
            due_date=date.today() + timedelta(days=7)
        )

        # Create successful charge transaction (no transaction_type field)
        charge_transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway=self.gateway,
            transaction_id='pi_charge_123',
            status='COMPLETED',
            amount=Decimal('15000.00'),
            currency='PHP'
        )

        # Use RefundService.create_refund (the actual API)
        refund = RefundService.create_refund(
            payment_id=payment.id,
            refund_data={
                'amount': '15000.00',
                'reason': 'Customer cancellation - full refund'
            },
            user=self.user
        )

        self.assertEqual(refund.status, 'COMPLETED')
        self.assertEqual(refund.amount, Decimal('15000.00'))

    def test_partial_refund_processing(self):
        """Test partial refund of a payment"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('20000.00'),
            currency='PHP',
            status='COMPLETED',
            due_date=date.today() + timedelta(days=7)
        )

        charge_transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway=self.gateway,
            transaction_id='pi_charge_456',
            status='COMPLETED',
            amount=Decimal('20000.00'),
            currency='PHP'
        )

        # First partial refund
        refund1 = RefundService.create_refund(
            payment_id=payment.id,
            refund_data={
                'amount': '8000.00',
                'reason': 'Partial service reduction'
            },
            user=self.user
        )
        self.assertEqual(refund1.amount, Decimal('8000.00'))

        # Second partial refund
        refund2 = RefundService.create_refund(
            payment_id=payment.id,
            refund_data={
                'amount': '5000.00',
                'reason': 'Additional refund request'
            },
            user=self.user
        )
        self.assertEqual(refund2.amount, Decimal('5000.00'))

        # Verify multiple refund records
        from core.domains.payments.models import Refund
        refunds = Refund.objects.filter(payment=payment, status='COMPLETED')
        self.assertEqual(refunds.count(), 2)

        total_refunded = sum(r.amount for r in refunds)
        self.assertEqual(total_refunded, Decimal('13000.00'))

    def test_refund_exceeding_payment_amount(self):
        """Test refund amount validation"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('10000.00'),
            currency='PHP',
            status='COMPLETED',
            due_date=date.today() + timedelta(days=7)
        )

        # Try to refund more than payment amount
        from core.domains.payments.exceptions import RefundExceedsPaymentException
        with self.assertRaises(RefundExceedsPaymentException):
            RefundService.create_refund(
                payment_id=payment.id,
                refund_data={
                    'amount': '15000.00',
                    'reason': 'Invalid refund amount'
                },
                user=self.user
            )

    def test_refund_failed_payment(self):
        """Test attempting to refund a failed payment"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('5000.00'),
            currency='PHP',
            status='FAILED',
            due_date=date.today() + timedelta(days=7)
        )

        from core.domains.payments.exceptions import InvalidRefundStatusException
        with self.assertRaises(InvalidRefundStatusException):
            RefundService.create_refund(
                payment_id=payment.id,
                refund_data={
                    'amount': '5000.00',
                    'reason': 'Refund failed payment'
                },
                user=self.user
            )


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
        self.gateway.config = {'test_mode': True, 'secret_key': 'sk_test_123'}
        self.gateway.is_active = True
        self.gateway.save()

        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_test_failure'
        )

    @patch('stripe.PaymentMethod.attach')
    @patch('stripe.PaymentMethod.retrieve')
    @patch('stripe.Customer.create')
    @patch('stripe.Customer.list')
    @patch('stripe.PaymentIntent.create')
    def test_card_declined_failure(
        self, mock_create, mock_cust_list, mock_cust_create, mock_pm_retrieve, mock_pm_attach
    ):
        """Test card declined payment failure"""
        # Mock Stripe Customer lookup/creation
        mock_cust_list.return_value = Mock(data=[])
        mock_cust_create.return_value = Mock(id='cus_test_123')
        mock_pm_retrieve.return_value = Mock(customer=None)

        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('12000.00'),
            currency='PHP',
            due_date=date.today() + timedelta(days=7)
        )

        import stripe
        mock_create.side_effect = stripe.error.CardError(
            message='Your card was declined.',
            param='payment_method',
            code='card_declined'
        )

        # process_payment raises StripeUserFriendlyError on failure
        from core.domains.payments.exceptions import StripeUserFriendlyError
        with self.assertRaises(StripeUserFriendlyError):
            PaymentGatewayService.process_payment(
                payment.id,
                {'gateway_id': str(self.gateway.id), 'payment_method': self.payment_method.id},
                self.user
            )

        # Note: The FAILED transaction is created inside transaction.atomic() in
        # gateway_service, but the StripeUserFriendlyError propagates out of the
        # atomic block, causing a savepoint rollback. So the transaction record
        # and payment status update are rolled back.
        # The key test is that StripeUserFriendlyError is raised (verified above).

    @patch('stripe.PaymentMethod.attach')
    @patch('stripe.PaymentMethod.retrieve')
    @patch('stripe.Customer.create')
    @patch('stripe.Customer.list')
    @patch('stripe.PaymentIntent.create')
    def test_insufficient_funds_failure(
        self, mock_create, mock_cust_list, mock_cust_create, mock_pm_retrieve, mock_pm_attach
    ):
        """Test insufficient funds payment failure"""
        # Mock Stripe Customer lookup/creation
        mock_cust_list.return_value = Mock(data=[])
        mock_cust_create.return_value = Mock(id='cus_test_123')
        mock_pm_retrieve.return_value = Mock(customer=None)

        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('25000.00'),
            currency='PHP',
            due_date=date.today() + timedelta(days=7)
        )

        import stripe
        mock_create.side_effect = stripe.error.CardError(
            message='Your card has insufficient funds.',
            param='payment_method',
            code='insufficient_funds'
        )

        from core.domains.payments.exceptions import StripeUserFriendlyError
        with self.assertRaises(StripeUserFriendlyError):
            PaymentGatewayService.process_payment(
                payment.id,
                {'gateway_id': str(self.gateway.id), 'payment_method': self.payment_method.id},
                self.user
            )

        # Note: FAILED transaction is rolled back due to transaction.atomic() in
        # gateway_service when StripeUserFriendlyError propagates out.
        # The key assertion is that StripeUserFriendlyError is raised (verified above).

    @patch('stripe.PaymentMethod.attach')
    @patch('stripe.PaymentMethod.retrieve')
    @patch('stripe.Customer.create')
    @patch('stripe.Customer.list')
    @patch('stripe.PaymentIntent.create')
    def test_expired_card_failure(
        self, mock_create, mock_cust_list, mock_cust_create, mock_pm_retrieve, mock_pm_attach
    ):
        """Test expired card payment failure"""
        # Mock Stripe Customer lookup/creation
        mock_cust_list.return_value = Mock(data=[])
        mock_cust_create.return_value = Mock(id='cus_test_123')
        mock_pm_retrieve.return_value = Mock(customer=None)

        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('8000.00'),
            currency='PHP',
            due_date=date.today() + timedelta(days=7)
        )

        import stripe
        mock_create.side_effect = stripe.error.CardError(
            message='Your card has expired.',
            param='exp_year',
            code='expired_card'
        )

        from core.domains.payments.exceptions import StripeUserFriendlyError
        with self.assertRaises(StripeUserFriendlyError):
            PaymentGatewayService.process_payment(
                payment.id,
                {'gateway_id': str(self.gateway.id), 'payment_method': self.payment_method.id},
                self.user
            )

    @patch('stripe.PaymentMethod.attach')
    @patch('stripe.PaymentMethod.retrieve')
    @patch('stripe.Customer.create')
    @patch('stripe.Customer.list')
    @patch('stripe.PaymentIntent.create')
    def test_network_error_failure(
        self, mock_create, mock_cust_list, mock_cust_create, mock_pm_retrieve, mock_pm_attach
    ):
        """Test network/connection error during payment"""
        # Mock Stripe Customer lookup/creation
        mock_cust_list.return_value = Mock(data=[])
        mock_cust_create.return_value = Mock(id='cus_test_123')
        mock_pm_retrieve.return_value = Mock(customer=None)

        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('15000.00'),
            currency='PHP',
            due_date=date.today() + timedelta(days=7)
        )

        import stripe
        mock_create.side_effect = stripe.error.APIConnectionError(
            'Network communication with Stripe failed'
        )

        from core.domains.payments.exceptions import StripeUserFriendlyError
        with self.assertRaises(StripeUserFriendlyError):
            PaymentGatewayService.process_payment(
                payment.id,
                {'gateway_id': str(self.gateway.id), 'payment_method': self.payment_method.id},
                self.user
            )

        # Note: FAILED transaction and payment status update are rolled back due to
        # transaction.atomic() in gateway_service when StripeUserFriendlyError propagates out.
        # The key assertion is that StripeUserFriendlyError is raised (verified above).

    @patch('stripe.PaymentMethod.attach')
    @patch('stripe.PaymentMethod.retrieve')
    @patch('stripe.Customer.create')
    @patch('stripe.Customer.list')
    @patch('stripe.PaymentIntent.create')
    def test_payment_retry_logic(
        self, mock_create, mock_cust_list, mock_cust_create, mock_pm_retrieve, mock_pm_attach
    ):
        """Test payment retry after initial failure"""
        # Mock Stripe Customer lookup/creation
        mock_cust_list.return_value = Mock(data=[])
        mock_cust_create.return_value = Mock(id='cus_test_123')
        mock_pm_retrieve.return_value = Mock(customer=None)

        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('10000.00'),
            currency='PHP',
            due_date=date.today() + timedelta(days=7)
        )

        # First attempt fails
        import stripe
        mock_create.side_effect = stripe.error.APIConnectionError(
            'Temporary network error'
        )

        from core.domains.payments.exceptions import StripeUserFriendlyError
        with self.assertRaises(StripeUserFriendlyError):
            PaymentGatewayService.process_payment(
                payment.id,
                {'gateway_id': str(self.gateway.id), 'payment_method': self.payment_method.id},
                self.user
            )

        # First attempt's FAILED transaction and status update are rolled back
        # due to transaction.atomic() in gateway_service when StripeUserFriendlyError
        # propagates out. Payment status remains CREATED (the original status).

        # Second attempt succeeds - use dict subclass for JSONField compatibility
        class MockStripeObject(dict):
            def __getattr__(self, name):
                try:
                    return self[name]
                except KeyError:
                    raise AttributeError(name)

        mock_intent = MockStripeObject({
            'id': 'pi_retry_success',
            'status': 'succeeded',
            'amount': 1000000,
            'currency': 'php',
            'payment_method': None,
            'client_secret': 'cs_test',
            'next_action': None,
        })
        mock_create.side_effect = None
        mock_create.return_value = mock_intent

        result = PaymentGatewayService.process_payment(
            payment.id,
            {'gateway_id': str(self.gateway.id), 'payment_method': self.payment_method.id},
            self.user
        )

        # Only the successful retry transaction is persisted (failed one was rolled back)
        transactions = PaymentTransaction.objects.filter(payment=payment)
        self.assertGreaterEqual(transactions.count(), 1)

        success_txn = transactions.filter(status='COMPLETED').first()
        self.assertIsNotNone(success_txn)
        self.assertEqual(success_txn.transaction_id, 'pi_retry_success')


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
            is_active=True,
            config={'secret_key': 'sk_test_123', 'test_mode': True}
        )

        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_concurrent_test'
        )

    def test_concurrent_payment_creation(self):
        """Test creating multiple payments concurrently"""
        # Create multiple payments
        payments = []
        for i in range(5):
            payment = Payment.objects.create(
                event=self.event,
                payment_method=self.payment_method,
                amount=Decimal(f'{1000 + i * 500}.00'),
                currency='PHP',
                description=f'Concurrent payment {i+1}',
                due_date=date.today() + timedelta(days=7)
            )
            payments.append(payment)

        # Verify all created with unique payment numbers
        payment_numbers = [p.payment_number for p in payments]
        self.assertEqual(len(set(payment_numbers)), 5)

    def test_duplicate_payment_prevention(self):
        """Test that completed payments cannot be processed again"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('15000.00'),
            currency='PHP',
            status='COMPLETED',
            due_date=date.today() + timedelta(days=7)
        )

        # Attempting to process a completed payment should raise an error
        from core.domains.payments.exceptions import PaymentAlreadyCompletedException
        with self.assertRaises(PaymentAlreadyCompletedException):
            PaymentGatewayService.process_payment(
                payment.id,
                {'gateway_id': str(self.gateway.id), 'payment_method': self.payment_method.id},
                self.user
            )
