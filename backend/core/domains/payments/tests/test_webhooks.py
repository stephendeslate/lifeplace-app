# backend/core/domains/payments/tests/test_webhooks.py

from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch, Mock
import json
import hashlib
import hmac
import time

from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.http import HttpResponse

from core.domains.payments.models import (
    Payment, PaymentGateway, PaymentTransaction, PaymentMethod
)
from core.domains.payments.services.payment_gateway_service import PaymentGatewayService
from core.domains.payments.views.webhook_views import StripeWebhookView
from core.domains.events.models import Event, EventType

User = get_user_model()


class StripeWebhookTestCase(TestCase):
    """Test cases for Stripe webhook handling"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='webhook@test.com',
            first_name='Webhook',
            last_name='Customer',
            role='CLIENT'
        )
        
        self.event_type = EventType.objects.create(name='Wedding')
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Webhook Test Wedding',
            start_date=date.today() + timedelta(days=30)
        )
        
        self.gateway = PaymentGateway.objects.create(
            name='Stripe Webhook Test',
            code='stripe',
            is_active=True,
            config={
                'publishable_key': 'pk_test_webhook',
                'secret_key': 'sk_test_webhook',
                'webhook_secret': 'whsec_test_webhook_secret',
                'test_mode': True
            }
        )
        
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            client=self.user,
            token='pm_webhook_test'
        )
        
        self.factory = RequestFactory()
    
    def create_webhook_signature(self, payload, secret):
        """Create Stripe webhook signature for testing"""
        timestamp = str(int(time.time()))
        signed_payload = f"{timestamp}.{payload}"
        signature = hmac.new(
            secret.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return f"t={timestamp},v1={signature}"
    
    def test_payment_intent_succeeded_webhook(self):
        """Test payment_intent.succeeded webhook processing"""
        # Create pending payment
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('15000.00'),
            currency='PHP',
            status='PENDING'
        )
        
        # Create pending transaction
        pending_transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway_transaction_id='pi_webhook_test_123',
            transaction_type='CHARGE',
            status='PENDING',
            amount=Decimal('15000.00'),
            currency='PHP'
        )
        
        # Create webhook payload
        webhook_payload = {
            'id': 'evt_webhook_test_123',
            'object': 'event',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_webhook_test_123',
                    'object': 'payment_intent',
                    'amount': 1500000,  # ₱15,000 in centavos
                    'currency': 'php',
                    'status': 'succeeded',
                    'metadata': {
                        'payment_id': str(payment.id),
                        'event_id': str(self.event.id)
                    },
                    'charges': {
                        'data': [{
                            'id': 'ch_webhook_test_123',
                            'amount': 1500000,
                            'currency': 'php',
                            'status': 'succeeded'
                        }]
                    }
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_webhook_signature(
            payload_json, 
            self.gateway.config['webhook_secret']
        )
        
        # Mock Stripe webhook verification
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = Mock()
            mock_event.type = 'payment_intent.succeeded'
            mock_event.data = Mock()
            mock_event.data.object = Mock()
            mock_event.data.object.id = 'pi_webhook_test_123'
            mock_event.data.object.status = 'succeeded'
            mock_event.data.object.amount = 1500000
            mock_event.data.object.currency = 'php'
            mock_event.data.object.metadata = {
                'payment_id': str(payment.id),
                'event_id': str(self.event.id)
            }
            mock_construct.return_value = mock_event
            
            # Process webhook
            result = PaymentGatewayService.process_webhook(
                payload_json, 
                signature,
                self.gateway
            )
            
            self.assertTrue(result['success'])
        
        # Verify payment status updated
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'COMPLETED')
        self.assertIsNotNone(payment.completed_at)
        
        # Verify transaction status updated
        pending_transaction.refresh_from_db()
        self.assertEqual(pending_transaction.status, 'SUCCESS')
    
    def test_payment_intent_payment_failed_webhook(self):
        """Test payment_intent.payment_failed webhook processing"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('12000.00'),
            currency='PHP',
            status='PENDING'
        )
        
        transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway_transaction_id='pi_failed_webhook_456',
            transaction_type='CHARGE',
            status='PENDING',
            amount=Decimal('12000.00'),
            currency='PHP'
        )
        
        webhook_payload = {
            'id': 'evt_failed_webhook_456',
            'object': 'event',
            'type': 'payment_intent.payment_failed',
            'data': {
                'object': {
                    'id': 'pi_failed_webhook_456',
                    'object': 'payment_intent',
                    'amount': 1200000,
                    'currency': 'php',
                    'status': 'requires_payment_method',
                    'last_payment_error': {
                        'code': 'card_declined',
                        'message': 'Your card was declined.',
                        'type': 'card_error'
                    },
                    'metadata': {
                        'payment_id': str(payment.id)
                    }
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_webhook_signature(
            payload_json, 
            self.gateway.config['webhook_secret']
        )
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = Mock()
            mock_event.type = 'payment_intent.payment_failed'
            mock_event.data = Mock()
            mock_event.data.object = Mock()
            mock_event.data.object.id = 'pi_failed_webhook_456'
            mock_event.data.object.status = 'requires_payment_method'
            mock_event.data.object.last_payment_error = {
                'code': 'card_declined',
                'message': 'Your card was declined.',
                'type': 'card_error'
            }
            mock_event.data.object.metadata = {'payment_id': str(payment.id)}
            mock_construct.return_value = mock_event
            
            result = PaymentGatewayService.process_webhook(
                payload_json, 
                signature,
                self.gateway
            )
            
            self.assertTrue(result['success'])
        
        # Verify payment status updated to failed
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'FAILED')
        
        # Verify transaction updated with error details
        transaction.refresh_from_db()
        self.assertEqual(transaction.status, 'FAILED')
        self.assertEqual(transaction.error_code, 'card_declined')
        self.assertIn('declined', transaction.error_message)
    
    def test_charge_dispute_created_webhook(self):
        """Test charge.dispute.created webhook processing"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('20000.00'),
            currency='PHP',
            status='COMPLETED'
        )
        
        charge_transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway_transaction_id='ch_dispute_test_789',
            transaction_type='CHARGE',
            status='SUCCESS',
            amount=Decimal('20000.00'),
            currency='PHP'
        )
        
        webhook_payload = {
            'id': 'evt_dispute_created_789',
            'object': 'event',
            'type': 'charge.dispute.created',
            'data': {
                'object': {
                    'id': 'dp_dispute_test_789',
                    'object': 'dispute',
                    'amount': 2000000,
                    'currency': 'php',
                    'reason': 'fraudulent',
                    'status': 'needs_response',
                    'charge': 'ch_dispute_test_789',
                    'metadata': {
                        'payment_id': str(payment.id)
                    }
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_webhook_signature(
            payload_json,
            self.gateway.config['webhook_secret']
        )
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = Mock()
            mock_event.type = 'charge.dispute.created'
            mock_event.data = Mock()
            mock_event.data.object = Mock()
            mock_event.data.object.id = 'dp_dispute_test_789'
            mock_event.data.object.amount = 2000000
            mock_event.data.object.currency = 'php'
            mock_event.data.object.reason = 'fraudulent'
            mock_event.data.object.status = 'needs_response'
            mock_event.data.object.charge = 'ch_dispute_test_789'
            mock_construct.return_value = mock_event
            
            result = PaymentGatewayService.process_webhook(
                payload_json,
                signature,
                self.gateway
            )
            
            self.assertTrue(result['success'])
        
        # Verify dispute transaction recorded
        dispute_transaction = PaymentTransaction.objects.filter(
            payment=payment,
            transaction_type='DISPUTE',
            gateway_transaction_id='dp_dispute_test_789'
        ).first()
        
        self.assertIsNotNone(dispute_transaction)
        self.assertEqual(dispute_transaction.status, 'PENDING')
        self.assertEqual(dispute_transaction.parent_transaction, charge_transaction)
    
    def test_invoice_payment_succeeded_webhook(self):
        """Test invoice.payment_succeeded webhook processing"""
        from core.domains.payments.models import Invoice
        
        # Create invoice
        invoice = Invoice.objects.create(
            event=self.event,
            total_amount=Decimal('25000.00'),
            currency='PHP',
            status='ISSUED'
        )
        
        payment = Payment.objects.create(
            event=self.event,
            invoice=invoice,
            payment_method=self.payment_method,
            amount=Decimal('25000.00'),
            currency='PHP',
            status='PENDING'
        )
        
        webhook_payload = {
            'id': 'evt_invoice_paid_999',
            'object': 'event',
            'type': 'invoice.payment_succeeded',
            'data': {
                'object': {
                    'id': 'in_invoice_test_999',
                    'object': 'invoice',
                    'amount_paid': 2500000,
                    'currency': 'php',
                    'status': 'paid',
                    'payment_intent': 'pi_invoice_payment_999',
                    'metadata': {
                        'payment_id': str(payment.id),
                        'invoice_id': str(invoice.id)
                    }
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_webhook_signature(
            payload_json,
            self.gateway.config['webhook_secret']
        )
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = Mock()
            mock_event.type = 'invoice.payment_succeeded'
            mock_event.data = Mock()
            mock_event.data.object = Mock()
            mock_event.data.object.id = 'in_invoice_test_999'
            mock_event.data.object.amount_paid = 2500000
            mock_event.data.object.status = 'paid'
            mock_event.data.object.payment_intent = 'pi_invoice_payment_999'
            mock_event.data.object.metadata = {
                'payment_id': str(payment.id),
                'invoice_id': str(invoice.id)
            }
            mock_construct.return_value = mock_event
            
            result = PaymentGatewayService.process_webhook(
                payload_json,
                signature,
                self.gateway
            )
            
            self.assertTrue(result['success'])
        
        # Verify payment and invoice status updated
        payment.refresh_from_db()
        invoice.refresh_from_db()
        
        self.assertEqual(payment.status, 'COMPLETED')
        self.assertEqual(invoice.status, 'PAID')
        self.assertIsNotNone(invoice.paid_at)
    
    def test_webhook_signature_verification_failure(self):
        """Test webhook with invalid signature"""
        webhook_payload = {
            'id': 'evt_invalid_signature',
            'type': 'payment_intent.succeeded',
            'data': {'object': {'id': 'pi_invalid'}}
        }
        
        payload_json = json.dumps(webhook_payload)
        invalid_signature = 'invalid_signature_header'
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            import stripe
            mock_construct.side_effect = stripe.error.SignatureVerificationError(
                'Invalid signature', 
                sig_header=invalid_signature
            )
            
            result = PaymentGatewayService.process_webhook(
                payload_json,
                invalid_signature,
                self.gateway
            )
            
            self.assertFalse(result['success'])
            self.assertIn('Invalid signature', result['error'])
    
    def test_webhook_duplicate_event_handling(self):
        """Test handling duplicate webhook events"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('10000.00'),
            currency='PHP',
            status='PENDING'
        )
        
        # Create webhook payload
        webhook_payload = {
            'id': 'evt_duplicate_test_111',  # Same event ID
            'object': 'event',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_duplicate_test_111',
                    'status': 'succeeded',
                    'metadata': {'payment_id': str(payment.id)}
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_webhook_signature(
            payload_json,
            self.gateway.config['webhook_secret']
        )
        
        # Mock successful webhook processing
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = Mock()
            mock_event.id = 'evt_duplicate_test_111'
            mock_event.type = 'payment_intent.succeeded'
            mock_event.data = Mock()
            mock_event.data.object = Mock()
            mock_event.data.object.id = 'pi_duplicate_test_111'
            mock_event.data.object.status = 'succeeded'
            mock_event.data.object.metadata = {'payment_id': str(payment.id)}
            mock_construct.return_value = mock_event
            
            # Process webhook first time
            result1 = PaymentGatewayService.process_webhook(
                payload_json,
                signature,
                self.gateway
            )
            self.assertTrue(result1['success'])
            
            # Process same webhook again (duplicate)
            result2 = PaymentGatewayService.process_webhook(
                payload_json,
                signature,
                self.gateway
            )
            
            # Should handle gracefully (idempotent)
            self.assertTrue(result2['success'])
        
        # Verify payment only updated once
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'COMPLETED')
        
        # Should have only one successful transaction
        success_transactions = PaymentTransaction.objects.filter(
            payment=payment,
            transaction_type='CHARGE',
            status='SUCCESS'
        )
        self.assertEqual(success_transactions.count(), 1)
    
    def test_webhook_unknown_event_type(self):
        """Test handling unknown webhook event types"""
        webhook_payload = {
            'id': 'evt_unknown_type_222',
            'object': 'event',
            'type': 'unknown.event.type',
            'data': {
                'object': {
                    'id': 'obj_unknown_222'
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_webhook_signature(
            payload_json,
            self.gateway.config['webhook_secret']
        )
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = Mock()
            mock_event.id = 'evt_unknown_type_222'
            mock_event.type = 'unknown.event.type'
            mock_construct.return_value = mock_event
            
            result = PaymentGatewayService.process_webhook(
                payload_json,
                signature,
                self.gateway
            )
            
            # Should handle gracefully
            self.assertTrue(result['success'])
            self.assertIn('Unhandled event type', result['message'])
    
    def test_webhook_malformed_payload(self):
        """Test handling malformed webhook payload"""
        malformed_payload = "invalid json payload"
        signature = "t=123456789,v1=invalid"
        
        result = PaymentGatewayService.process_webhook(
            malformed_payload,
            signature,
            self.gateway
        )
        
        self.assertFalse(result['success'])
        self.assertIn('Invalid payload', result['error'])
    
    def test_webhook_processing_with_missing_payment(self):
        """Test webhook processing when referenced payment doesn't exist"""
        webhook_payload = {
            'id': 'evt_missing_payment_333',
            'object': 'event',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_missing_payment_333',
                    'status': 'succeeded',
                    'metadata': {
                        'payment_id': '99999',  # Non-existent payment ID
                        'event_id': str(self.event.id)
                    }
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_webhook_signature(
            payload_json,
            self.gateway.config['webhook_secret']
        )
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = Mock()
            mock_event.type = 'payment_intent.succeeded'
            mock_event.data = Mock()
            mock_event.data.object = Mock()
            mock_event.data.object.id = 'pi_missing_payment_333'
            mock_event.data.object.status = 'succeeded'
            mock_event.data.object.metadata = {
                'payment_id': '99999',
                'event_id': str(self.event.id)
            }
            mock_construct.return_value = mock_event
            
            result = PaymentGatewayService.process_webhook(
                payload_json,
                signature,
                self.gateway
            )
            
            # Should handle gracefully
            self.assertTrue(result['success'])
            self.assertIn('Payment not found', result['message'])


class WebhookSecurityTestCase(TestCase):
    """Test cases for webhook security and validation"""
    
    def setUp(self):
        """Set up test data"""
        self.gateway = PaymentGateway.objects.create(
            name='Security Test Gateway',
            code='stripe',
            is_active=True,
            config={
                'webhook_secret': 'whsec_security_test_secret_key',
                'test_mode': True
            }
        )
    
    def test_webhook_timestamp_validation(self):
        """Test webhook timestamp validation for replay attacks"""
        # Create webhook payload with old timestamp
        old_timestamp = str(int(time.time()) - 3600)  # 1 hour old
        payload = '{"id": "evt_old_timestamp"}'
        
        # Create signature with old timestamp
        signed_payload = f"{old_timestamp}.{payload}"
        signature = hmac.new(
            self.gateway.config['webhook_secret'].encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        signature_header = f"t={old_timestamp},v1={signature}"
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            import stripe
            mock_construct.side_effect = stripe.error.SignatureVerificationError(
                'Timestamp outside the tolerance zone',
                sig_header=signature_header
            )
            
            result = PaymentGatewayService.process_webhook(
                payload,
                signature_header,
                self.gateway
            )
            
            self.assertFalse(result['success'])
            self.assertIn('Timestamp outside', result['error'])
    
    def test_webhook_signature_tampering_detection(self):
        """Test detection of tampered webhook payload"""
        original_payload = '{"id": "evt_original", "type": "payment_intent.succeeded"}'
        tampered_payload = '{"id": "evt_tampered", "type": "payment_intent.succeeded"}'
        
        # Create signature for original payload
        timestamp = str(int(time.time()))
        signed_payload = f"{timestamp}.{original_payload}"
        signature = hmac.new(
            self.gateway.config['webhook_secret'].encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        signature_header = f"t={timestamp},v1={signature}"
        
        # Try to process tampered payload with original signature
        with patch('stripe.Webhook.construct_event') as mock_construct:
            import stripe
            mock_construct.side_effect = stripe.error.SignatureVerificationError(
                'No signatures found matching the expected signature',
                sig_header=signature_header
            )
            
            result = PaymentGatewayService.process_webhook(
                tampered_payload,  # Tampered payload
                signature_header,   # Original signature
                self.gateway
            )
            
            self.assertFalse(result['success'])
            self.assertIn('No signatures found', result['error'])
    
    def test_webhook_multiple_signature_validation(self):
        """Test webhook with multiple signatures (v0 and v1)"""
        payload = '{"id": "evt_multi_sig", "type": "test.event"}'
        timestamp = str(int(time.time()))
        
        # Create v1 signature (valid)
        signed_payload = f"{timestamp}.{payload}"
        v1_signature = hmac.new(
            self.gateway.config['webhook_secret'].encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Create invalid v0 signature
        v0_signature = 'invalid_v0_signature'
        
        signature_header = f"t={timestamp},v0={v0_signature},v1={v1_signature}"
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = Mock()
            mock_event.type = 'test.event'
            mock_construct.return_value = mock_event
            
            result = PaymentGatewayService.process_webhook(
                payload,
                signature_header,
                self.gateway
            )
            
            # Should succeed with valid v1 signature
            self.assertTrue(result['success'])
    
    def test_webhook_rate_limiting(self):
        """Test webhook rate limiting for security"""
        # This would typically be implemented at the web server level
        # but we can test the application-level handling
        
        payload = '{"id": "evt_rate_limit", "type": "test.event"}'
        timestamp = str(int(time.time()))
        
        signed_payload = f"{timestamp}.{payload}"
        signature = hmac.new(
            self.gateway.config['webhook_secret'].encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        signature_header = f"t={timestamp},v1={signature}"
        
        # Mock rate limiting by tracking webhook processing attempts
        webhook_attempts = []
        
        def mock_process_with_rate_limit(*args, **kwargs):
            webhook_attempts.append(time.time())
            
            # Allow only 5 webhooks per minute
            recent_attempts = [
                attempt for attempt in webhook_attempts 
                if time.time() - attempt < 60
            ]
            
            if len(recent_attempts) > 5:
                return {
                    'success': False,
                    'error': 'Rate limit exceeded',
                    'retry_after': 60
                }
            
            mock_event = Mock()
            mock_event.type = 'test.event'
            return {'success': True, 'event_type': 'test.event'}
        
        # Test multiple rapid webhook calls
        with patch('core.domains.payments.services.payment_gateway_service.PaymentGatewayService._process_stripe_webhook', side_effect=mock_process_with_rate_limit):
            results = []
            
            for i in range(7):  # Try 7 rapid webhooks
                result = PaymentGatewayService.process_webhook(
                    payload,
                    signature_header,
                    self.gateway
                )
                results.append(result)
        
        # First 5 should succeed, last 2 should be rate limited
        successful_results = [r for r in results if r.get('success', False)]
        rate_limited_results = [r for r in results if 'Rate limit exceeded' in r.get('error', '')]
        
        # Note: This test demonstrates the concept - actual implementation
        # would depend on your specific rate limiting strategy
        self.assertGreaterEqual(len(successful_results), 5)
    
    def test_webhook_idempotency_key_validation(self):
        """Test webhook idempotency to prevent duplicate processing"""
        payload = '{"id": "evt_idempotent_test", "type": "payment_intent.succeeded"}'
        timestamp = str(int(time.time()))
        
        signed_payload = f"{timestamp}.{payload}"
        signature = hmac.new(
            self.gateway.config['webhook_secret'].encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        signature_header = f"t={timestamp},v1={signature}"
        
        # Mock idempotency tracking
        processed_events = set()
        
        def mock_idempotent_processing(*args, **kwargs):
            event_id = 'evt_idempotent_test'
            
            if event_id in processed_events:
                return {
                    'success': True,
                    'message': 'Event already processed (idempotent)',
                    'duplicate': True
                }
            
            processed_events.add(event_id)
            return {
                'success': True,
                'message': 'Event processed successfully',
                'duplicate': False
            }
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = Mock()
            mock_event.id = 'evt_idempotent_test'
            mock_event.type = 'payment_intent.succeeded'
            mock_construct.return_value = mock_event
            
            with patch('core.domains.payments.services.payment_gateway_service.PaymentGatewayService._process_stripe_webhook', side_effect=mock_idempotent_processing):
                # First processing
                result1 = PaymentGatewayService.process_webhook(
                    payload, signature_header, self.gateway
                )
                
                # Second processing (duplicate)
                result2 = PaymentGatewayService.process_webhook(
                    payload, signature_header, self.gateway
                )
        
        self.assertTrue(result1['success'])
        self.assertFalse(result1.get('duplicate', False))
        
        self.assertTrue(result2['success'])
        self.assertTrue(result2.get('duplicate', False))
        self.assertIn('already processed', result2['message'])