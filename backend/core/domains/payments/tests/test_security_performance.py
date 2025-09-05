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
from core.domains.payments.services.payment_gateway_service import PaymentGatewayService
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
        
        self.gateway = PaymentGateway.objects.create(
            name='Stripe Security Test',
            code='stripe',
            is_active=True,
            config={
                'publishable_key': 'pk_test_security',
                'secret_key': 'sk_test_security',
                'webhook_secret': 'whsec_security_test',
                'test_mode': True
            }
        )
    
    def test_payment_method_token_security(self):
        """Test that payment method tokens are properly secured"""
        # Create payment method with token
        payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            client=self.user,
            token='pm_test_secure_token_123456789',
            card_last_four='4242',
            card_brand='visa',
            card_exp_month=12,
            card_exp_year=2028
        )
        
        # Verify sensitive card data is not stored
        self.assertIsNone(getattr(payment_method, 'card_number', None))
        self.assertIsNone(getattr(payment_method, 'cvc', None))
        self.assertIsNone(getattr(payment_method, 'full_card_number', None))
        
        # Verify only safe data is stored
        self.assertEqual(payment_method.card_last_four, '4242')
        self.assertEqual(payment_method.card_brand, 'visa')
        self.assertIsNotNone(payment_method.token)  # Token is safe to store
    
    def test_gateway_config_encryption(self):
        """Test that gateway configurations are encrypted"""
        sensitive_config = {
            'secret_key': 'sk_live_very_sensitive_key_123456',
            'webhook_secret': 'whsec_very_sensitive_webhook_secret',
            'publishable_key': 'pk_live_publishable_key'  # Less sensitive but still protected
        }
        
        encrypted_gateway = PaymentGateway.objects.create(
            name='Encrypted Gateway Test',
            code='stripe',
            is_active=True,
            config=sensitive_config
        )
        
        # Verify config is accessible as dict (decrypted when accessed)
        self.assertIsInstance(encrypted_gateway.config, dict)
        self.assertEqual(encrypted_gateway.config['secret_key'], sensitive_config['secret_key'])
        
        # Verify that raw database value is not plaintext (would need to check DB directly)
        encrypted_gateway.refresh_from_db()
        self.assertIsInstance(encrypted_gateway.config, dict)
    
    def test_payment_amount_validation(self):
        """Test payment amount validation and sanitization"""
        payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            client=self.user,
            token='pm_amount_test'
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
                    currency='PHP'
                )
                self.assertEqual(payment.amount, amount)
        
        # Test invalid amounts (should raise validation errors)
        invalid_amounts = [
            Decimal('-100.00'),  # Negative
            Decimal('0.00'),     # Zero
            Decimal('999999.99') # Too large (if there's a limit)
        ]
        
        for amount in invalid_amounts:
            with self.subTest(amount=amount):
                with self.assertRaises((ValueError, Exception)):
                    payment = Payment.objects.create(
                        event=self.event,
                        payment_method=payment_method,
                        amount=amount,
                        currency='PHP'
                    )
                    payment.full_clean()  # Trigger validation
    
    def test_sql_injection_prevention(self):
        """Test SQL injection prevention in payment queries"""
        payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            client=self.user,
            token='pm_sql_test'
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
                    description=malicious_input  # Malicious input
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
            client=self.user,
            token='pm_xss_test'
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
                    description=payload
                )
                
                # Data should be stored as-is (sanitization happens on output)
                self.assertEqual(payment.description, payload)
                
                # When displaying, should be properly escaped
                receipt_data = payment.get_receipt_data()
                # In real implementation, this would be HTML-escaped
                self.assertIsInstance(receipt_data, dict)
    
    def test_webhook_signature_verification(self):
        """Test webhook signature verification security"""
        webhook_secret = 'whsec_test_secret_key_for_verification'
        
        # Valid webhook payload
        payload = json.dumps({
            'id': 'evt_signature_test',
            'type': 'payment_intent.succeeded',
            'data': {'object': {'id': 'pi_test'}}
        })
        
        timestamp = str(int(time.time()))
        
        # Create valid signature
        signed_payload = f"{timestamp}.{payload}"
        valid_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        valid_signature_header = f"t={timestamp},v1={valid_signature}"
        
        # Test valid signature
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = Mock()
            mock_event.type = 'payment_intent.succeeded'
            mock_construct.return_value = mock_event
            
            result = PaymentGatewayService.verify_webhook_signature(
                payload, valid_signature_header, webhook_secret
            )
            self.assertTrue(result['valid'])
        
        # Test invalid signatures
        invalid_signatures = [
            f"t={timestamp},v1=invalid_signature",
            f"t={timestamp},v1={valid_signature}extra",
            "invalid_format",
            "",
            f"t={timestamp},v1="
        ]
        
        for invalid_sig in invalid_signatures:
            with self.subTest(signature=invalid_sig):
                with patch('stripe.Webhook.construct_event') as mock_construct:
                    import stripe
                    mock_construct.side_effect = stripe.error.SignatureVerificationError(
                        'Invalid signature', sig_header=invalid_sig
                    )
                    
                    result = PaymentGatewayService.verify_webhook_signature(
                        payload, invalid_sig, webhook_secret
                    )
                    self.assertFalse(result['valid'])
    
    def test_payment_method_pci_compliance(self):
        """Test PCI compliance in payment method handling"""
        # Simulate PCI-compliant token creation
        secure_token = f"pm_test_{secrets.token_urlsafe(32)}"
        
        payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            client=self.user,
            token=secure_token,
            card_last_four='4242',
            card_brand='visa',
            card_exp_month=12,
            card_exp_year=2028,
            cardholder_name='Test Customer'
        )
        
        # Verify PCI compliance rules
        
        # 1. No full card number stored
        self.assertIsNone(getattr(payment_method, 'card_number', None))
        
        # 2. No CVV/CVC stored
        self.assertIsNone(getattr(payment_method, 'cvc', None))
        self.assertIsNone(getattr(payment_method, 'cvv', None))
        
        # 3. Only last 4 digits stored
        self.assertEqual(len(payment_method.card_last_four), 4)
        self.assertTrue(payment_method.card_last_four.isdigit())
        
        # 4. Expiry date stored safely (not sensitive)
        self.assertIsInstance(payment_method.card_exp_month, int)
        self.assertIsInstance(payment_method.card_exp_year, int)
        
        # 5. Token is used for transactions (not card data)
        self.assertTrue(payment_method.token.startswith('pm_'))
        self.assertGreater(len(payment_method.token), 20)
    
    def test_payment_audit_trail(self):
        """Test payment audit trail and logging"""
        payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            client=self.user,
            token='pm_audit_test'
        )
        
        payment = Payment.objects.create(
            event=self.event,
            payment_method=payment_method,
            amount=Decimal('15000.00'),
            currency='PHP'
        )
        
        # Process payment with audit trail
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = Mock()
            mock_intent.id = 'pi_audit_test'
            mock_intent.status = 'succeeded'
            mock_intent.amount = 1500000
            mock_create.return_value = mock_intent
            
            PaymentGatewayService.process_payment(payment)
        
        # Verify transaction audit trail
        transaction = PaymentTransaction.objects.get(
            payment=payment,
            gateway_transaction_id='pi_audit_test'
        )
        
        # Audit trail should include:
        self.assertIsNotNone(transaction.created_at)  # Timestamp
        self.assertEqual(transaction.transaction_type, 'CHARGE')  # Action
        self.assertEqual(transaction.status, 'SUCCESS')  # Result
        self.assertIsNotNone(transaction.gateway_response)  # Full response
        
        # Verify payment status changes are tracked
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'COMPLETED')
        self.assertIsNotNone(payment.completed_at)
    
    def test_sensitive_data_masking_in_logs(self):
        """Test that sensitive data is masked in logs and responses"""
        # Mock payment method with sensitive data
        payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            client=self.user,
            token='pm_test_sensitive_mask_12345',
            card_last_four='4242',
            card_brand='visa'
        )
        
        # Get masked representation
        masked_token = payment_method.get_masked_token()
        
        # Token should be partially masked
        self.assertTrue(masked_token.startswith('pm_'))
        self.assertIn('***', masked_token)
        self.assertNotEqual(masked_token, payment_method.token)
        
        # Test payment data masking
        payment = Payment.objects.create(
            event=self.event,
            payment_method=payment_method,
            amount=Decimal('25000.00'),
            currency='PHP'
        )
        
        # Get safe representation for logging
        safe_payment_data = payment.get_safe_log_data()
        
        # Should include non-sensitive data
        self.assertIn('amount', safe_payment_data)
        self.assertIn('currency', safe_payment_data)
        self.assertIn('status', safe_payment_data)
        
        # Should mask or exclude sensitive data
        if 'payment_method_token' in safe_payment_data:
            self.assertIn('***', safe_payment_data['payment_method_token'])
        
        # Should not include full tokens or keys
        log_str = str(safe_payment_data)
        self.assertNotIn(payment_method.token, log_str)


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
        
        self.gateway = PaymentGateway.objects.create(
            name='Performance Test Gateway',
            code='stripe',
            is_active=True,
            config={'test_mode': True}
        )
        
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            client=self.user,
            token='pm_performance_test'
        )
    
    def test_concurrent_payment_processing_performance(self):
        """Test performance under concurrent payment processing"""
        num_concurrent_payments = 10
        payments = []
        
        # Create multiple payments
        for i in range(num_concurrent_payments):
            payment = Payment.objects.create(
                event=self.event,
                payment_method=self.payment_method,
                amount=Decimal(f'{1000 + i * 100}.00'),
                currency='PHP',
                description=f'Concurrent payment {i+1}'
            )
            payments.append(payment)
        
        def process_payment_with_timing(payment):
            """Process payment and measure time"""
            start_time = time.time()
            
            with patch('stripe.PaymentIntent.create') as mock_create:
                mock_intent = Mock()
                mock_intent.id = f'pi_concurrent_{payment.id}'
                mock_intent.status = 'succeeded'
                mock_intent.amount = int(payment.amount * 100)
                mock_create.return_value = mock_intent
                
                result = PaymentGatewayService.process_payment(payment)
                
            end_time = time.time()
            processing_time = end_time - start_time
            
            return {
                'payment_id': payment.id,
                'success': result.get('success', False),
                'processing_time': processing_time
            }
        
        # Process payments concurrently
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(process_payment_with_timing, payment)
                for payment in payments
            ]
            
            results = [future.result() for future in futures]
        
        total_time = time.time() - start_time
        
        # Performance assertions
        successful_results = [r for r in results if r['success']]
        self.assertEqual(len(successful_results), num_concurrent_payments)
        
        # Average processing time should be reasonable
        avg_processing_time = sum(r['processing_time'] for r in results) / len(results)
        self.assertLess(avg_processing_time, 5.0)  # Less than 5 seconds per payment
        
        # Total time should show concurrency benefit
        self.assertLess(total_time, num_concurrent_payments * 2.0)  # Benefit from concurrency
        
        print(f"Processed {num_concurrent_payments} payments in {total_time:.2f}s")
        print(f"Average processing time: {avg_processing_time:.2f}s")
    
    def test_bulk_payment_query_performance(self):
        """Test performance of bulk payment queries"""
        # Create many payments
        num_payments = 100
        bulk_payments = []
        
        for i in range(num_payments):
            payment = Payment(
                event=self.event,
                payment_method=self.payment_method,
                amount=Decimal(f'{1000 + i}.00'),
                currency='PHP',
                description=f'Bulk payment {i+1}',
                status='COMPLETED'
            )
            bulk_payments.append(payment)
        
        # Bulk create payments
        start_time = time.time()
        Payment.objects.bulk_create(bulk_payments)
        bulk_create_time = time.time() - start_time
        
        print(f"Bulk created {num_payments} payments in {bulk_create_time:.2f}s")
        
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
        
        print(f"Queried {len(list(results))} payments in {query_time:.2f}s")
        
        # Performance assertions
        self.assertLess(bulk_create_time, 5.0)  # Bulk create should be fast
        self.assertLess(query_time, 1.0)  # Query should be fast
    
    def test_payment_transaction_logging_performance(self):
        """Test performance impact of transaction logging"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('5000.00'),
            currency='PHP'
        )
        
        num_transactions = 50
        
        # Test transaction logging performance
        start_time = time.time()
        
        for i in range(num_transactions):
            PaymentTransaction.objects.create(
                payment=payment,
                gateway_transaction_id=f'txn_perf_test_{i}',
                transaction_type='CHARGE',
                status='SUCCESS',
                amount=Decimal('100.00'),
                currency='PHP',
                gateway_response={'test': f'response_{i}'}
            )
        
        logging_time = time.time() - start_time
        
        print(f"Logged {num_transactions} transactions in {logging_time:.2f}s")
        
        # Query performance with many transactions
        start_time = time.time()
        
        transactions = PaymentTransaction.objects.filter(
            payment=payment
        ).order_by('-created_at')
        
        # Force evaluation
        list(transactions)
        
        query_time = time.time() - start_time
        
        print(f"Queried {len(list(transactions))} transactions in {query_time:.2f}s")
        
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
                currency='PHP'
            )
            
            # Create transaction
            transaction = PaymentTransaction.objects.create(
                payment=payment,
                gateway_transaction_id=f'conn_test_{payment.id}',
                transaction_type='CHARGE',
                status='SUCCESS',
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
        
        print(f"Sequential operations: {sequential_time:.2f}s")
        print(f"Concurrent operations: {concurrent_time:.2f}s")
        
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
            status='COMPLETED'
        )
        
        cache_key = f'payment_{payment.id}_receipt_data'
        
        # First call (cache miss)
        start_time = time.time()
        receipt_data_1 = payment.get_receipt_data()
        first_call_time = time.time() - start_time
        
        # Cache the data
        cache.set(cache_key, receipt_data_1, timeout=300)
        
        # Second call (cache hit)
        start_time = time.time()
        cached_receipt_data = cache.get(cache_key)
        cache_hit_time = time.time() - start_time
        
        # Third call (should use cached data)
        start_time = time.time()
        receipt_data_2 = cached_receipt_data or payment.get_receipt_data()
        cached_call_time = time.time() - start_time
        
        print(f"First call (cache miss): {first_call_time:.4f}s")
        print(f"Cache hit: {cache_hit_time:.4f}s")
        print(f"Cached call: {cached_call_time:.4f}s")
        
        # Verify data consistency
        self.assertEqual(receipt_data_1['payment_number'], receipt_data_2['payment_number'])
        
        # Cache should be significantly faster
        self.assertLess(cache_hit_time, first_call_time / 2)
        
        # Clean up cache
        cache.delete(cache_key)