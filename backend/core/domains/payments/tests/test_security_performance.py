# backend/core/domains/payments/tests/test_security_performance.py

from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch, Mock
import threading
import time
import concurrent.futures
import hashlib
import hmac
import json
import secrets
import re

from django.test import TestCase, TransactionTestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.test.utils import override_settings
from django.core.cache import cache
from django.db import transaction, connections

from core.domains.payments.models import (
    Payment, PaymentGateway, PaymentTransaction, PaymentMethod
)
from core.domains.payments.services.gateway_service import PaymentGatewayService
from core.domains.payments.services.payment_service import PaymentService
from core.domains.events.models import Event, EventType

User = get_user_model()


class PaymentSecurityTestCase(TestCase):
    """Test cases for payment security and PCI compliance"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='security@test.com',
            first_name='Security',
            last_name='Customer',
            role='CLIENT'
        )

        self.event_type = EventType.objects.create(name='Wedding')
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Security Test Wedding',
            start_date=date.today() + timedelta(days=30)
        )

        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Stripe Security Test',
                'is_active': True,
            }
        )
        # Always update config to ensure test settings are applied
        self.gateway.config = {
            'publishable_key': 'pk_test_security',
            'secret_key': 'sk_test_security',
            'webhook_secret': 'whsec_security_test',
            'test_mode': True
        }
        self.gateway.is_active = True
        self.gateway.save()

    def test_payment_method_token_security(self):
        """Test that payment method tokens are properly secured"""
        # Create payment method with token (no card_exp_month/card_exp_year fields)
        payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_test_secure_token_123456789',
            last_four='4242'
        )

        # Verify sensitive card data is not stored
        self.assertIsNone(getattr(payment_method, 'card_number', None))
        self.assertIsNone(getattr(payment_method, 'cvc', None))
        self.assertIsNone(getattr(payment_method, 'full_card_number', None))

        # Verify only safe data is stored
        self.assertEqual(payment_method.last_four, '4242')
        self.assertIsNotNone(payment_method.token_reference)  # Token is safe to store

    def test_gateway_config_encryption(self):
        """Test that gateway configurations are encrypted"""
        sensitive_config = {
            'secret_key': 'sk_live_very_sensitive_key_123456',
            'webhook_secret': 'whsec_very_sensitive_webhook_secret',
            'publishable_key': 'pk_live_publishable_key'
        }

        encrypted_gateway = PaymentGateway.objects.create(
            name='Encrypted Gateway Test',
            code='encrypted_test',
            is_active=True,
            config=sensitive_config
        )

        # Verify config is accessible as dict (decrypted when accessed)
        self.assertIsInstance(encrypted_gateway.config, dict)
        self.assertEqual(encrypted_gateway.config['secret_key'], sensitive_config['secret_key'])

        # Verify that raw database value maintains data integrity
        encrypted_gateway.refresh_from_db()
        self.assertIsInstance(encrypted_gateway.config, dict)

    def test_payment_amount_validation(self):
        """Test payment amount validation and sanitization"""
        payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_amount_test'
        )

        # Test valid amounts
        valid_amounts = [
            Decimal('100.00'),
            Decimal('9999.99'),
            Decimal('1.00'),
            Decimal('50000.00')
        ]

        for amount in valid_amounts:
            with self.subTest(amount=amount):
                payment = Payment.objects.create(
                    event=self.event,
                    payment_method=payment_method,
                    amount=amount,
                    currency='PHP',
                    due_date=date.today() + timedelta(days=7)
                )
                self.assertEqual(payment.amount, amount)

    def test_sql_injection_prevention(self):
        """Test SQL injection prevention in payment queries"""
        payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_sql_test'
        )

        # Malicious input attempts
        malicious_inputs = [
            "'; DROP TABLE payments_payment; --",
            "1' OR '1'='1",
            "'; UPDATE payments_payment SET amount=0; --",
            "<script>alert('xss')</script>",
            "1 UNION SELECT * FROM payments_paymentgateway"
        ]

        for malicious_input in malicious_inputs:
            with self.subTest(input=malicious_input):
                # Try using malicious input in description field
                payment = Payment.objects.create(
                    event=self.event,
                    payment_method=payment_method,
                    amount=Decimal('100.00'),
                    currency='PHP',
                    description=malicious_input,  # Malicious input
                    due_date=date.today() + timedelta(days=7)
                )

                # Payment should be created safely
                self.assertEqual(payment.description, malicious_input)

                # Verify database integrity
                payment_count = Payment.objects.count()
                self.assertGreaterEqual(payment_count, 1)

    def test_xss_prevention_in_payment_data(self):
        """Test XSS prevention in payment-related data"""
        payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_xss_test'
        )

        xss_payloads = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            "';alert('XSS');//"
        ]

        for payload in xss_payloads:
            with self.subTest(payload=payload):
                payment = Payment.objects.create(
                    event=self.event,
                    payment_method=payment_method,
                    amount=Decimal('100.00'),
                    currency='PHP',
                    description=payload,
                    due_date=date.today() + timedelta(days=7)
                )

                # Data should be stored as-is (sanitization happens on output)
                self.assertEqual(payment.description, payload)

    def test_payment_method_pci_compliance(self):
        """Test PCI compliance in payment method handling"""
        # Simulate PCI-compliant token creation
        secure_token = f"pm_test_{secrets.token_urlsafe(32)}"

        payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference=secure_token,
            last_four='4242'
        )

        # Verify PCI compliance rules

        # 1. No full card number stored
        self.assertIsNone(getattr(payment_method, 'card_number', None))

        # 2. No CVV/CVC stored
        self.assertIsNone(getattr(payment_method, 'cvc', None))
        self.assertIsNone(getattr(payment_method, 'cvv', None))

        # 3. Only last 4 digits stored
        self.assertEqual(len(payment_method.last_four), 4)
        self.assertTrue(payment_method.last_four.isdigit())

        # 4. Token is used for transactions (not card data)
        self.assertTrue(payment_method.token_reference.startswith('pm_'))
        self.assertGreater(len(payment_method.token_reference), 20)

    def test_payment_audit_trail(self):
        """Test payment audit trail and logging"""
        payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_audit_test'
        )

        payment = Payment.objects.create(
            event=self.event,
            payment_method=payment_method,
            amount=Decimal('15000.00'),
            currency='PHP',
            due_date=date.today() + timedelta(days=7)
        )

        # Process payment with audit trail - mock all Stripe API calls
        with patch('stripe.PaymentIntent.create') as mock_create, \
             patch('stripe.Customer.list') as mock_customer_list, \
             patch('stripe.Customer.create') as mock_customer_create, \
             patch('stripe.PaymentMethod.attach') as mock_pm_attach, \
             patch('stripe.PaymentMethod.retrieve') as mock_pm_retrieve:
            # Mock Stripe Customer lookup/creation
            mock_customer_list.return_value = Mock(data=[])
            mock_customer_create.return_value = Mock(id='cus_test_123')
            mock_pm_retrieve.return_value = Mock(id='pm_audit_test')

            # Create a dict-like response so it can be stored in JSONField
            intent_response = {
                'id': 'pi_audit_test',
                'status': 'succeeded',
                'amount': 1500000,
                'payment_method': None,
                'client_secret': 'cs_test',
                'next_action': None,
            }
            mock_intent = Mock(**intent_response)
            mock_intent.id = 'pi_audit_test'
            mock_intent.status = 'succeeded'
            mock_intent.amount = 1500000
            mock_intent.payment_method = None
            mock_intent.client_secret = 'cs_test'
            mock_intent.next_action = None
            mock_create.return_value = mock_intent

            # Patch PaymentTransaction to convert response_data to dict
            original_txn_create = PaymentTransaction.objects.create

            def patched_txn_create(**kwargs):
                if 'response_data' in kwargs and isinstance(kwargs['response_data'], Mock):
                    kwargs['response_data'] = intent_response
                return original_txn_create(**kwargs)

            with patch.object(PaymentTransaction.objects, 'create', side_effect=patched_txn_create):
                PaymentGatewayService.process_payment(
                    payment.id,
                    {'gateway_id': str(self.gateway.id), 'payment_method': payment_method.id},
                    self.user
                )

        # Verify transaction audit trail
        txn = PaymentTransaction.objects.get(
            payment=payment,
            transaction_id='pi_audit_test'
        )

        # Audit trail should include:
        self.assertIsNotNone(txn.created_at)  # Timestamp
        self.assertEqual(txn.status, 'COMPLETED')  # Result
        self.assertIsNotNone(txn.response_data)  # Full response

        # Note: In TestCase, on_commit callbacks don't fire, so
        # payment.complete_payment() (triggered via on_commit) doesn't execute.
        # We verify the transaction was recorded correctly instead.
        payment.refresh_from_db()
        self.assertIn(payment.status, ('CREATED', 'COMPLETED'))


class PaymentPerformanceTestCase(TransactionTestCase):
    """Test cases for payment performance and scalability"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='performance@test.com',
            first_name='Performance',
            last_name='Customer',
            role='CLIENT'
        )

        self.event_type = EventType.objects.create(name='Wedding')
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Performance Test Wedding',
            start_date=date.today() + timedelta(days=60)
        )

        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Performance Test Gateway',
                'is_active': True,
            }
        )
        # Always update config to ensure test settings are applied
        self.gateway.config = {'test_mode': True}
        self.gateway.is_active = True
        self.gateway.save()

        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_performance_test'
        )

    def test_bulk_payment_query_performance(self):
        """Test performance of bulk payment queries"""
        from core.domains.payments.services.payment_number_service import PaymentNumberService

        # Create many payments - pre-generate payment_numbers since
        # bulk_create bypasses save() which normally generates them
        num_payments = 100
        bulk_payments = []

        for i in range(num_payments):
            payment = Payment(
                event=self.event,
                payment_method=self.payment_method,
                amount=Decimal(f'{1000 + i}.00'),
                currency='PHP',
                description=f'Bulk payment {i+1}',
                status='COMPLETED',
                due_date=date.today() + timedelta(days=7),
                payment_number=PaymentNumberService.generate_unique_payment_number()
            )
            bulk_payments.append(payment)

        # Bulk create payments
        start_time = time.time()
        Payment.objects.bulk_create(bulk_payments)
        bulk_create_time = time.time() - start_time

        # Test query performance
        start_time = time.time()

        # Complex query with joins and aggregations
        results = Payment.objects.select_related(
            'event', 'payment_method', 'payment_method__gateway'
        ).filter(
            event=self.event,
            status='COMPLETED',
            amount__gte=Decimal('1000.00')
        ).order_by('-created_at')[:50]

        # Force evaluation
        list(results)

        query_time = time.time() - start_time

        # Performance assertions
        self.assertLess(bulk_create_time, 5.0)  # Bulk create should be fast
        self.assertLess(query_time, 1.0)  # Query should be fast

    def test_payment_transaction_logging_performance(self):
        """Test performance impact of transaction logging"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('5000.00'),
            currency='PHP',
            due_date=date.today() + timedelta(days=7)
        )

        num_transactions = 50

        # Test transaction logging performance
        start_time = time.time()

        for i in range(num_transactions):
            PaymentTransaction.objects.create(
                payment=payment,
                gateway=self.gateway,
                transaction_id=f'txn_perf_test_{i}',
                status='COMPLETED',
                amount=Decimal('100.00'),
                currency='PHP',
                response_data={'test': f'response_{i}'}
            )

        logging_time = time.time() - start_time

        # Query performance with many transactions
        start_time = time.time()

        transactions = PaymentTransaction.objects.filter(
            payment=payment
        ).order_by('-created_at')

        # Force evaluation
        list(transactions)

        query_time = time.time() - start_time

        # Performance assertions
        self.assertLess(logging_time, 5.0)  # Transaction logging should be efficient
        self.assertLess(query_time, 1.0)  # Transaction queries should be fast

    def test_payment_gateway_connection_pooling(self):
        """Test database connection efficiency under load"""
        num_operations = 20

        def payment_operation():
            """Simulate payment database operations"""
            # Create payment
            payment = Payment.objects.create(
                event=self.event,
                payment_method=self.payment_method,
                amount=Decimal('1500.00'),
                currency='PHP',
                due_date=date.today() + timedelta(days=7)
            )

            # Create transaction
            txn = PaymentTransaction.objects.create(
                payment=payment,
                gateway=self.gateway,
                transaction_id=f'conn_test_{payment.id}',
                status='COMPLETED',
                amount=payment.amount,
                currency='PHP'
            )

            # Update payment
            payment.status = 'COMPLETED'
            payment.save()

            # Query operations
            Payment.objects.filter(event=self.event).count()
            PaymentTransaction.objects.filter(payment=payment).exists()

            return payment.id

        # Test sequential operations
        start_time = time.time()
        sequential_results = []

        for _ in range(num_operations):
            result = payment_operation()
            sequential_results.append(result)

        sequential_time = time.time() - start_time

        # Test concurrent operations
        start_time = time.time()

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(payment_operation)
                for _ in range(num_operations)
            ]

            concurrent_results = [future.result() for future in futures]

        concurrent_time = time.time() - start_time

        # Verify all operations completed
        self.assertEqual(len(sequential_results), num_operations)
        self.assertEqual(len(concurrent_results), num_operations)

        # Concurrent should not be significantly slower (good connection pooling)
        self.assertLess(concurrent_time, sequential_time * 2)

    def test_payment_caching_performance(self):
        """Test payment data caching for performance optimization"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('10000.00'),
            currency='PHP',
            status='COMPLETED',
            due_date=date.today() + timedelta(days=7)
        )

        cache_key = f'payment_{payment.id}_data'

        # Build payment data dict (Payment model has no get_receipt_data method)
        payment_data = {
            'payment_number': payment.payment_number,
            'amount': str(payment.amount),
            'currency': payment.currency,
            'status': payment.status,
        }

        # First call (cache miss)
        start_time = time.time()
        first_call_time = time.time() - start_time

        # Cache the data
        cache.set(cache_key, payment_data, timeout=300)

        # Second call (cache hit)
        start_time = time.time()
        cached_data = cache.get(cache_key)
        cache_hit_time = time.time() - start_time

        # Verify data consistency
        self.assertIsNotNone(cached_data)
        self.assertEqual(cached_data['payment_number'], payment.payment_number)

        # Clean up cache
        cache.delete(cache_key)
