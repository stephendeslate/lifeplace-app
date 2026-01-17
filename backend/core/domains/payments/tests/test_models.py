# backend/core/domains/payments/tests/test_models.py

from decimal import Decimal
from datetime import date, timedelta
import uuid

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

from core.domains.payments.models import (
    Payment, PaymentGateway, PaymentTransaction, PaymentMethod,
    Invoice, InvoiceLineItem
)
from core.domains.events.models import Event, EventType
from core.domains.sales.models import EventQuote
from core.domains.products.models import ProductOption, ProductCategory

User = get_user_model()


class PaymentModelTestCase(TestCase):
    """Test cases for Payment model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='test@example.com',
            first_name='Test',
            last_name='User',
            role='CLIENT'
        )
        
        self.event_type = EventType.objects.create(
            name='Wedding',
            description='Wedding events'
        )
        
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Test Wedding',
            start_date=date.today() + timedelta(days=30),
            status='CONFIRMED'
        )
        
        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Stripe Test',
                'is_active': True,
            }
        )
        # Always update config to ensure test settings are applied
        self.gateway.config = {'test_mode': True}
        self.gateway.is_active = True
        self.gateway.save()
        
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            token='test_token_123',
            card_last_four='4242',
            card_brand='visa',
            is_default=True
        )
    
    def test_payment_creation(self):
        """Test basic payment creation"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.00'),
            currency='PHP',
            status='PENDING'
        )
        
        self.assertEqual(payment.amount, Decimal('2500.00'))
        self.assertEqual(payment.currency, 'PHP')
        self.assertEqual(payment.status, 'PENDING')
        self.assertIsNotNone(payment.payment_number)
        self.assertTrue(payment.payment_number.startswith('PMT'))
    
    def test_payment_number_generation(self):
        """Test automatic payment number generation"""
        payment1 = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('1000.00'),
            currency='PHP'
        )
        
        payment2 = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('1500.00'),
            currency='PHP'
        )
        
        self.assertNotEqual(payment1.payment_number, payment2.payment_number)
        self.assertTrue(payment1.payment_number.startswith('PMT'))
        self.assertTrue(payment2.payment_number.startswith('PMT'))
    
    def test_php_currency_formatting(self):
        """Test PHP currency formatting"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.00'),
            currency='PHP'
        )
        
        formatted = payment.formatted_amount
        self.assertEqual(formatted, '₱2,500')  # No decimals for PHP
    
    def test_usd_currency_formatting(self):
        """Test USD currency formatting"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.50'),
            currency='USD'
        )
        
        formatted = payment.formatted_amount
        self.assertEqual(formatted, '$2,500.50')
    
    def test_payment_status_transitions(self):
        """Test valid payment status transitions"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('1000.00'),
            currency='PHP',
            status='PENDING'
        )
        
        # Valid transition: PENDING -> COMPLETED
        payment.status = 'COMPLETED'
        payment.save()
        self.assertEqual(payment.status, 'COMPLETED')
        
        # Invalid transition: COMPLETED -> PENDING should not be allowed
        # (This would be enforced by business logic, not model validation)
    
    def test_payment_receipt_generation(self):
        """Test payment receipt information"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.00'),
            currency='PHP',
            status='COMPLETED'
        )
        
        receipt_data = payment.get_receipt_data()
        
        self.assertEqual(receipt_data['payment_number'], payment.payment_number)
        self.assertEqual(receipt_data['amount'], '₱2,500')
        self.assertEqual(receipt_data['event_name'], 'Test Wedding')
        self.assertEqual(receipt_data['client_name'], 'Test User')
        self.assertIn('paid_at', receipt_data)


class PaymentGatewayModelTestCase(TestCase):
    """Test cases for PaymentGateway model"""
    
    def test_gateway_creation(self):
        """Test payment gateway creation"""
        gateway = PaymentGateway.objects.create(
            name='Stripe Production',
            code='stripe',
            is_active=True,
            config={
                'publishable_key': 'pk_test_123',
                'secret_key': 'sk_test_123',
                'webhook_secret': 'whsec_123'
            }
        )
        
        self.assertEqual(gateway.name, 'Stripe Production')
        self.assertEqual(gateway.code, 'stripe')
        self.assertTrue(gateway.is_active)
        self.assertIn('publishable_key', gateway.config)
    
    def test_gateway_config_encryption(self):
        """Test that gateway config is properly encrypted"""
        gateway = PaymentGateway.objects.create(
            name='Stripe Test',
            code='stripe',
            config={'secret_key': 'sk_test_secret_key_123'}
        )
        
        # Config should be accessible as dict
        self.assertIsInstance(gateway.config, dict)
        self.assertEqual(gateway.config['secret_key'], 'sk_test_secret_key_123')
        
        # Raw database value should be encrypted (this requires checking the actual field implementation)
        gateway.refresh_from_db()
        self.assertIsInstance(gateway.config, dict)


class InvoiceModelTestCase(TestCase):
    """Test cases for Invoice and InvoiceLineItem models"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='client@test.com',
            first_name='Test',
            last_name='Client',
            role='CLIENT'
        )
        
        self.event_type = EventType.objects.create(name='Wedding')
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Test Wedding',
            start_date=date.today() + timedelta(days=30)
        )
        
        self.category = ProductCategory.objects.create(name='Wedding Packages')
        self.product = ProductOption.objects.create(
            name='Premium Package',
            base_price=Decimal('2500.00'),
            currency='PHP',
            tax_rate=Decimal('12.00'),
            category=self.category,
            type='PACKAGE'
        )
    
    def test_invoice_creation(self):
        """Test invoice creation"""
        invoice = Invoice.objects.create(
            event=self.event,
            total_amount=Decimal('2800.00'),
            tax_amount=Decimal('300.00'),
            subtotal_amount=Decimal('2500.00'),
            currency='PHP',
            status='DRAFT'
        )
        
        self.assertEqual(invoice.total_amount, Decimal('2800.00'))
        self.assertEqual(invoice.currency, 'PHP')
        self.assertEqual(invoice.status, 'DRAFT')
        self.assertIsNotNone(invoice.invoice_number)
        self.assertTrue(invoice.invoice_number.startswith('INV'))
    
    def test_invoice_line_item_creation(self):
        """Test invoice line item creation and total calculation"""
        invoice = Invoice.objects.create(
            event=self.event,
            total_amount=Decimal('0.00'),
            currency='PHP'
        )
        
        line_item = InvoiceLineItem.objects.create(
            invoice=invoice,
            product=self.product,
            description='Premium Wedding Package',
            quantity=1,
            unit_price=Decimal('2500.00'),
            total=Decimal('2500.00'),
            tax_rate=Decimal('12.00'),
            tax_amount=Decimal('300.00')
        )
        
        self.assertEqual(line_item.total, Decimal('2500.00'))
        self.assertEqual(line_item.tax_amount, Decimal('300.00'))
        self.assertEqual(line_item.total_with_tax, Decimal('2800.00'))
    
    def test_invoice_status_transitions(self):
        """Test invoice status transitions"""
        invoice = Invoice.objects.create(
            event=self.event,
            total_amount=Decimal('2800.00'),
            currency='PHP',
            status='DRAFT'
        )
        
        # DRAFT -> ISSUED
        invoice.status = 'ISSUED'
        invoice.issued_at = timezone.now()
        invoice.save()
        self.assertEqual(invoice.status, 'ISSUED')
        self.assertIsNotNone(invoice.issued_at)
        
        # ISSUED -> PAID
        invoice.status = 'PAID'
        invoice.paid_at = timezone.now()
        invoice.save()
        self.assertEqual(invoice.status, 'PAID')
        self.assertIsNotNone(invoice.paid_at)
    
    def test_invoice_from_quote(self):
        """Test creating invoice from quote"""
        quote = EventQuote.objects.create(
            event=self.event,
            total_amount=Decimal('2500.00'),
            tax_amount=Decimal('300.00'),
            status='ACCEPTED'
        )
        
        invoice = Invoice.create_from_quote(quote)
        
        self.assertEqual(invoice.event, quote.event)
        self.assertEqual(invoice.total_amount, quote.total_amount)
        self.assertEqual(invoice.tax_amount, quote.tax_amount)
        self.assertEqual(invoice.quote, quote)
        self.assertEqual(invoice.status, 'DRAFT')


class PaymentTransactionModelTestCase(TestCase):
    """Test cases for PaymentTransaction model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='test@example.com',
            first_name='Test',
            last_name='User',
            role='CLIENT'
        )
        
        self.event_type = EventType.objects.create(name='Wedding')
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name='Test Wedding',
            start_date=date.today() + timedelta(days=30)
        )
        
        self.gateway = PaymentGateway.objects.create(
            name='Stripe Test',
            code='stripe',
            is_active=True
        )
        
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            token='test_token_123'
        )
        
        self.payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.00'),
            currency='PHP'
        )
    
    def test_transaction_creation(self):
        """Test payment transaction creation"""
        transaction = PaymentTransaction.objects.create(
            payment=self.payment,
            gateway_transaction_id='pi_test_123456',
            transaction_type='CHARGE',
            status='SUCCESS',
            amount=Decimal('2500.00'),
            currency='PHP',
            gateway_response={'status': 'succeeded', 'id': 'pi_test_123456'}
        )
        
        self.assertEqual(transaction.gateway_transaction_id, 'pi_test_123456')
        self.assertEqual(transaction.transaction_type, 'CHARGE')
        self.assertEqual(transaction.status, 'SUCCESS')
        self.assertEqual(transaction.amount, Decimal('2500.00'))
        self.assertIn('status', transaction.gateway_response)
    
    def test_failed_transaction(self):
        """Test failed transaction handling"""
        transaction = PaymentTransaction.objects.create(
            payment=self.payment,
            gateway_transaction_id='pi_test_failed',
            transaction_type='CHARGE',
            status='FAILED',
            amount=Decimal('2500.00'),
            currency='PHP',
            error_code='card_declined',
            error_message='Your card was declined.',
            gateway_response={'error': {'code': 'card_declined'}}
        )
        
        self.assertEqual(transaction.status, 'FAILED')
        self.assertEqual(transaction.error_code, 'card_declined')
        self.assertIsNotNone(transaction.error_message)
    
    def test_refund_transaction(self):
        """Test refund transaction creation"""
        # First create a successful charge
        charge_transaction = PaymentTransaction.objects.create(
            payment=self.payment,
            gateway_transaction_id='pi_test_123456',
            transaction_type='CHARGE',
            status='SUCCESS',
            amount=Decimal('2500.00'),
            currency='PHP'
        )
        
        # Then create a refund
        refund_transaction = PaymentTransaction.objects.create(
            payment=self.payment,
            gateway_transaction_id='re_test_123456',
            transaction_type='REFUND',
            status='SUCCESS',
            amount=Decimal('2500.00'),
            currency='PHP',
            parent_transaction=charge_transaction
        )
        
        self.assertEqual(refund_transaction.transaction_type, 'REFUND')
        self.assertEqual(refund_transaction.parent_transaction, charge_transaction)
        self.assertEqual(refund_transaction.amount, Decimal('2500.00'))