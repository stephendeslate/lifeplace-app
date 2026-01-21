# backend/core/domains/payments/tests/test_services.py

from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import Mock, patch, MagicMock
import uuid
import json

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings

from core.domains.payments.models import (
    Payment, PaymentGateway, PaymentTransaction, PaymentMethod,
    Invoice
)
from core.domains.payments.services.payment_service import PaymentService
from core.domains.payments.services.gateway_service import PaymentGatewayService
from core.domains.payments.services.invoice_service import InvoiceService
from core.domains.events.models import Event, EventType
from core.domains.sales.models import EventQuote, QuoteLineItem
from core.domains.products.models import ProductOption, ProductCategory
from core.domains.bookingflow.models import (
    BookingFlow, BookingFlowStep, PaymentInfoStepConfiguration
)

User = get_user_model()


class PaymentServiceTestCase(TestCase):
    """Test cases for PaymentService"""
    
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
        
        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Stripe Test',
                'is_active': True,
            }
        )
        # Always update config to ensure test keys are set
        self.gateway.config = {
            'publishable_key': 'pk_test_123',
            'secret_key': 'sk_test_123',
            'test_mode': True
        }
        self.gateway.is_active = True
        self.gateway.save()
        
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_test_123',
            last_four='4242'
        )
    
    def test_create_payment(self):
        """Test payment creation via service"""
        payment_data = {
            'event': self.event,
            'payment_method': self.payment_method,
            'amount': Decimal('2500.00'),
            'currency': 'PHP',
            'description': 'Wedding package payment'
        }
        
        payment = PaymentService.create_payment(**payment_data)
        
        self.assertEqual(payment.event, self.event)
        self.assertEqual(payment.amount, Decimal('2500.00'))
        self.assertEqual(payment.currency, 'PHP')
        self.assertEqual(payment.status, 'PENDING')
        self.assertIsNotNone(payment.payment_number)
    
    def test_process_payment_success(self):
        """Test successful payment processing"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.00'),
            currency='PHP'
        )
        
        with patch('core.domains.payments.services.payment_gateway_service.PaymentGatewayService.process_payment') as mock_process:
            mock_process.return_value = {
                'success': True,
                'transaction_id': 'pi_test_123456',
                'status': 'succeeded'
            }
            
            result = PaymentService.process_payment(payment)
            
            self.assertTrue(result['success'])
            payment.refresh_from_db()
            self.assertEqual(payment.status, 'COMPLETED')
    
    def test_process_payment_failure(self):
        """Test failed payment processing"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.00'),
            currency='PHP'
        )
        
        with patch('core.domains.payments.services.payment_gateway_service.PaymentGatewayService.process_payment') as mock_process:
            mock_process.return_value = {
                'success': False,
                'error': 'card_declined',
                'message': 'Your card was declined.'
            }
            
            result = PaymentService.process_payment(payment)
            
            self.assertFalse(result['success'])
            payment.refresh_from_db()
            self.assertEqual(payment.status, 'FAILED')
    
    def test_refund_payment(self):
        """Test payment refund"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.00'),
            currency='PHP',
            status='COMPLETED'
        )
        
        # Create original transaction
        transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway_transaction_id='pi_test_123456',
            transaction_type='CHARGE',
            status='SUCCESS',
            amount=Decimal('2500.00'),
            currency='PHP'
        )
        
        with patch('core.domains.payments.services.payment_gateway_service.PaymentGatewayService.refund_payment') as mock_refund:
            mock_refund.return_value = {
                'success': True,
                'refund_id': 're_test_123456',
                'amount': Decimal('2500.00')
            }
            
            result = PaymentService.refund_payment(payment, Decimal('2500.00'), 'Customer request')
            
            self.assertTrue(result['success'])
            
            # Check refund transaction was created
            refund_transactions = PaymentTransaction.objects.filter(
                payment=payment,
                transaction_type='REFUND'
            )
            self.assertEqual(refund_transactions.count(), 1)
    
    def test_partial_refund(self):
        """Test partial payment refund"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.00'),
            currency='PHP',
            status='COMPLETED'
        )
        
        with patch('core.domains.payments.services.payment_gateway_service.PaymentGatewayService.refund_payment') as mock_refund:
            mock_refund.return_value = {
                'success': True,
                'refund_id': 're_test_partial',
                'amount': Decimal('1000.00')
            }
            
            result = PaymentService.refund_payment(payment, Decimal('1000.00'), 'Partial refund')
            
            self.assertTrue(result['success'])
            payment.refresh_from_db()
            self.assertEqual(payment.refunded_amount, Decimal('1000.00'))


class PaymentGatewayServiceTestCase(TestCase):
    """Test cases for PaymentGatewayService"""
    
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
        
        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Stripe Test',
                'is_active': True,
            }
        )
        # Always update config to ensure test settings are applied
        self.gateway.config = {
            'publishable_key': 'pk_test_51234567890',
            'secret_key': 'sk_test_51234567890',
            'webhook_secret': 'whsec_test_123',
            'test_mode': True
        }
        self.gateway.is_active = True
        self.gateway.save()
        
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.user,
            token_reference='pm_test_card',
            last_four='4242'
        )
    
    @patch('stripe.PaymentIntent.create')
    def test_stripe_payment_processing(self, mock_create):
        """Test Stripe payment processing"""
        # Mock Stripe PaymentIntent response
        mock_payment_intent = Mock()
        mock_payment_intent.id = 'pi_test_123456'
        mock_payment_intent.status = 'succeeded'
        mock_payment_intent.amount = 250000  # ₱2500.00 in centavos
        mock_payment_intent.currency = 'php'
        mock_payment_intent.metadata = {'event_id': str(self.event.id)}
        mock_create.return_value = mock_payment_intent
        
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.00'),
            currency='PHP'
        )
        
        result = PaymentGatewayService.process_payment(payment)
        
        self.assertTrue(result['success'])
        self.assertEqual(result['transaction_id'], 'pi_test_123456')
        
        # Verify transaction was recorded
        transaction = PaymentTransaction.objects.get(
            payment=payment,
            gateway_transaction_id='pi_test_123456'
        )
        self.assertEqual(transaction.status, 'SUCCESS')
        self.assertEqual(transaction.transaction_type, 'CHARGE')
    
    @patch('stripe.PaymentIntent.create')
    def test_stripe_payment_failure(self, mock_create):
        """Test Stripe payment failure handling"""
        import stripe
        
        # Mock Stripe exception
        mock_create.side_effect = stripe.error.CardError(
            message='Your card was declined.',
            param='payment_method',
            code='card_declined'
        )
        
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.00'),
            currency='PHP'
        )
        
        result = PaymentGatewayService.process_payment(payment)
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'card_declined')
        
        # Verify failed transaction was recorded
        transaction = PaymentTransaction.objects.get(payment=payment)
        self.assertEqual(transaction.status, 'FAILED')
        self.assertEqual(transaction.error_code, 'card_declined')
    
    @patch('stripe.Refund.create')
    def test_stripe_refund_processing(self, mock_refund):
        """Test Stripe refund processing"""
        # Create completed payment
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal('2500.00'),
            currency='PHP',
            status='COMPLETED'
        )
        
        # Create original transaction
        original_transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway_transaction_id='pi_test_123456',
            transaction_type='CHARGE',
            status='SUCCESS',
            amount=Decimal('2500.00'),
            currency='PHP'
        )
        
        # Mock Stripe refund response
        mock_refund_obj = Mock()
        mock_refund_obj.id = 're_test_123456'
        mock_refund_obj.status = 'succeeded'
        mock_refund_obj.amount = 250000  # ₱2500.00 in centavos
        mock_refund.return_value = mock_refund_obj
        
        result = PaymentGatewayService.refund_payment(
            payment, 
            Decimal('2500.00'), 
            'Customer request'
        )
        
        self.assertTrue(result['success'])
        self.assertEqual(result['refund_id'], 're_test_123456')
        
        # Verify refund transaction was recorded
        refund_transaction = PaymentTransaction.objects.get(
            payment=payment,
            transaction_type='REFUND',
            gateway_transaction_id='re_test_123456'
        )
        self.assertEqual(refund_transaction.status, 'SUCCESS')
    
    def test_webhook_signature_verification(self):
        """Test Stripe webhook signature verification"""
        payload = json.dumps({
            'id': 'evt_test_webhook',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test_123456',
                    'status': 'succeeded',
                    'amount': 250000,
                    'currency': 'php'
                }
            }
        })
        
        signature = 'test_signature'
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_event = Mock()
            mock_event.type = 'payment_intent.succeeded'
            mock_event.data.object.id = 'pi_test_123456'
            mock_construct.return_value = mock_event
            
            result = PaymentGatewayService.verify_webhook_signature(
                payload, signature, self.gateway.config['webhook_secret']
            )
            
            self.assertTrue(result['valid'])
            mock_construct.assert_called_once_with(
                payload, signature, self.gateway.config['webhook_secret']
            )
    
    def test_currency_conversion_to_cents(self):
        """Test currency conversion to gateway format"""
        # Test PHP conversion (1 PHP = 100 centavos)
        php_amount = PaymentGatewayService._convert_to_gateway_amount(
            Decimal('2500.00'), 'PHP'
        )
        self.assertEqual(php_amount, 250000)
        
        # Test USD conversion (1 USD = 100 cents)
        usd_amount = PaymentGatewayService._convert_to_gateway_amount(
            Decimal('25.99'), 'USD'
        )
        self.assertEqual(usd_amount, 2599)
    
    def test_gateway_selection(self):
        """Test automatic gateway selection"""
        # Create multiple gateways
        stripe_gateway = self.gateway
        paypal_gateway = PaymentGateway.objects.create(
            name='PayPal Test',
            code='paypal',
            is_active=True,
            config={'client_id': 'test_client_id'}
        )
        
        # Test Stripe selection
        selected_gateway = PaymentGatewayService.get_gateway_for_currency('PHP')
        self.assertEqual(selected_gateway.code, 'stripe')
        
        # Test fallback when no gateway supports currency
        selected_gateway = PaymentGatewayService.get_gateway_for_currency('JPY')
        self.assertIsNone(selected_gateway)


class InvoiceServiceTestCase(TestCase):
    """Test cases for InvoiceService"""
    
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
        
        self.category = ProductCategory.objects.create(
            name='Wedding Packages',
            description='Wedding photography packages'
        )
        
        self.package = ProductOption.objects.create(
            name='Premium Package',
            description='Premium wedding package',
            base_price=Decimal('2500.00'),
            currency='PHP',
            tax_rate=Decimal('12.00'),
            category=self.category,
            type='PACKAGE'
        )
        
        self.addon = ProductOption.objects.create(
            name='Extra Hour',
            description='Additional hour of service',
            base_price=Decimal('200.00'),
            currency='PHP',
            tax_rate=Decimal('12.00'),
            category=self.category,
            type='PRODUCT'
        )
    
    def test_create_invoice_from_quote(self):
        """Test creating invoice from accepted quote"""
        # Create quote with line items
        quote = EventQuote.objects.create(
            event=self.event,
            subtotal_amount=Decimal('2700.00'),
            tax_amount=Decimal('324.00'),
            total_amount=Decimal('3024.00'),
            currency='PHP',
            status='ACCEPTED'
        )
        
        QuoteLineItem.objects.create(
            quote=quote,
            product=self.package,
            description='Premium Wedding Package',
            quantity=1,
            unit_price=Decimal('2500.00'),
            total=Decimal('2500.00')
        )
        
        QuoteLineItem.objects.create(
            quote=quote,
            product=self.addon,
            description='Extra Hour',
            quantity=1,
            unit_price=Decimal('200.00'),
            total=Decimal('200.00')
        )
        
        # Create invoice from quote
        invoice = InvoiceService.create_from_quote(quote)
        
        self.assertEqual(invoice.event, quote.event)
        self.assertEqual(invoice.total_amount, quote.total_amount)
        self.assertEqual(invoice.quote, quote)
        self.assertEqual(invoice.status, 'DRAFT')
        
        # Verify line items were copied
        line_items = invoice.line_items.all()
        self.assertEqual(line_items.count(), 2)
    
    def test_calculate_invoice_totals(self):
        """Test invoice total calculation"""
        invoice = Invoice.objects.create(
            event=self.event,
            subtotal_amount=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            total_amount=Decimal('0.00'),
            currency='PHP'
        )
        
        # Add line items
        InvoiceLineItem.objects.create(
            invoice=invoice,
            product=self.package,
            description='Premium Wedding Package',
            quantity=1,
            unit_price=Decimal('2500.00'),
            total=Decimal('2500.00'),
            tax_rate=Decimal('12.00')
        )
        
        InvoiceLineItem.objects.create(
            invoice=invoice,
            product=self.addon,
            description='Extra Hour',
            quantity=1,
            unit_price=Decimal('200.00'),
            total=Decimal('200.00'),
            tax_rate=Decimal('12.00')
        )
        
        # Calculate totals
        InvoiceService.calculate_totals(invoice)
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.subtotal_amount, Decimal('2700.00'))
        self.assertEqual(invoice.tax_amount, Decimal('324.00'))  # 12% of 2700
        self.assertEqual(invoice.total_amount, Decimal('3024.00'))
    
    def test_issue_invoice(self):
        """Test issuing a draft invoice"""
        invoice = Invoice.objects.create(
            event=self.event,
            total_amount=Decimal('3024.00'),
            currency='PHP',
            status='DRAFT'
        )
        
        InvoiceService.issue_invoice(invoice)
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'ISSUED')
        self.assertIsNotNone(invoice.issued_at)
    
    def test_mark_invoice_paid(self):
        """Test marking invoice as paid"""
        invoice = Invoice.objects.create(
            event=self.event,
            total_amount=Decimal('3024.00'),
            currency='PHP',
            status='ISSUED',
            issued_at=timezone.now()
        )
        
        # Create payment
        gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Stripe Test',
                'is_active': True,
            }
        )
        gateway.is_active = True
        gateway.save()
        
        payment_method = PaymentMethod.objects.create(
            gateway=gateway,
            user=self.user,
            token_reference='pm_test_123'
        )
        
        payment = Payment.objects.create(
            event=self.event,
            invoice=invoice,
            payment_method=payment_method,
            amount=Decimal('3024.00'),
            currency='PHP',
            status='COMPLETED'
        )
        
        InvoiceService.mark_as_paid(invoice, payment)
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'PAID')
        self.assertIsNotNone(invoice.paid_at)
        self.assertEqual(invoice.payment, payment)
    
    def test_generate_invoice_pdf(self):
        """Test PDF generation for invoice"""
        invoice = Invoice.objects.create(
            event=self.event,
            total_amount=Decimal('3024.00'),
            currency='PHP',
            status='ISSUED',
            issued_at=timezone.now()
        )
        
        with patch('core.domains.payments.services.invoice_service.InvoiceService._generate_pdf') as mock_pdf:
            mock_pdf.return_value = b'fake_pdf_content'
            
            pdf_content = InvoiceService.generate_pdf(invoice)
            
            self.assertEqual(pdf_content, b'fake_pdf_content')
            mock_pdf.assert_called_once_with(invoice)


class DepositPaymentTestCase(TestCase):
    """Test cases for deposit payment functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='client@test.com',
            first_name='Test',
            last_name='Client',
            role='CLIENT'
        )
        
        self.event_type = EventType.objects.create(name='Wedding')
        
        self.booking_flow = BookingFlow.objects.create(
            name='Wedding Booking Flow',
            event_type=self.event_type,
            is_active=True
        )
        
        self.payment_step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='payment_info',
            name='Payment Information',
            order=3,
            is_enabled=True
        )
        
        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Stripe Test',
                'is_active': True,
            }
        )
        self.gateway.is_active = True
        self.gateway.save()
    
    def test_percentage_deposit_calculation(self):
        """Test percentage-based deposit calculation"""
        config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_deposit=True,
            deposit_type='PERCENTAGE',
            deposit_amount=Decimal('30.00'),  # 30%
            require_immediate_payment=False
        )
        config.allowed_gateways.add(self.gateway)
        
        total_amount = Decimal('10000.00')
        deposit_amount = PaymentService.calculate_deposit_amount(config, total_amount)
        
        self.assertEqual(deposit_amount, Decimal('3000.00'))  # 30% of 10000
    
    def test_fixed_deposit_calculation(self):
        """Test fixed deposit calculation"""
        config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_deposit=True,
            deposit_type='FIXED',
            deposit_amount=Decimal('1500.00'),  # Fixed ₱1500
            require_immediate_payment=False
        )
        config.allowed_gateways.add(self.gateway)

        total_amount = Decimal('10000.00')
        deposit_amount = PaymentService.calculate_deposit_amount(config, total_amount)

        self.assertEqual(deposit_amount, Decimal('1500.00'))  # Fixed amount