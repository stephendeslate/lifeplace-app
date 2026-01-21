# backend/core/domains/payments/tests/test_integration.py

from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch, Mock
import uuid
import json

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.test import TransactionTestCase
from django.db import transaction

from core.domains.payments.models import (
    Payment, PaymentGateway, PaymentTransaction, PaymentMethod,
    Invoice, InvoiceLineItem
)
from core.domains.payments.services.payment_service import PaymentService
from core.domains.payments.services.gateway_service import PaymentGatewayService
from core.domains.payments.services.invoice_service import InvoiceService
from core.domains.events.models import Event, EventType
from core.domains.sales.models import EventQuote, QuoteLineItem
from core.domains.products.models import ProductOption, ProductCategory
from core.domains.bookingflow.models import (
    BookingFlow, BookingFlowStep, PaymentInfoStepConfiguration, BookingSession
)
from core.domains.bookingflow.services.booking_session_service import BookingSessionService
# Note: Workflow models were renamed to WorkflowTemplate/WorkflowStage
# Keeping imports minimal as only service patching is needed

User = get_user_model()


class CompletePaymentFlowTestCase(TestCase):
    """Test cases for complete event creation to payment completion flow"""
    
    def setUp(self):
        """Set up comprehensive test data"""
        # Create user
        self.client_user = User.objects.create_user(
            email='client@example.com',
            first_name='Maria',
            last_name='Santos',
            role='CLIENT',
            phone='+639123456789'
        )
        
        # Create event type and products
        self.event_type = EventType.objects.create(
            name='Wedding',
            description='Wedding celebrations'
        )
        
        self.category = ProductCategory.objects.create(
            name='Wedding Packages',
            description='Complete wedding photography packages'
        )
        
        # Premium wedding package - PHP pricing
        self.premium_package = ProductOption.objects.create(
            name='Premium Wedding Package',
            description='Full day wedding coverage with album',
            base_price=Decimal('35000.00'),  # ₱35,000
            currency='PHP',
            tax_rate=Decimal('12.00'),
            category=self.category,
            type='PACKAGE'
        )
        
        # Additional services
        self.extra_hour = ProductOption.objects.create(
            name='Additional Hour',
            description='Extra hour of photography coverage',
            base_price=Decimal('2500.00'),  # ₱2,500
            currency='PHP',
            tax_rate=Decimal('12.00'),
            category=self.category,
            type='PRODUCT'
        )
        
        self.photo_album = ProductOption.objects.create(
            name='Premium Album',
            description='Leather-bound wedding album',
            base_price=Decimal('5000.00'),  # ₱5,000
            currency='PHP',
            tax_rate=Decimal('12.00'),
            category=self.category,
            type='PRODUCT'
        )
        
        # Payment gateway setup
        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Stripe Philippines',
                'is_active': True,
            }
        )
        # Always update config to ensure test settings are applied
        self.gateway.config = {
            'publishable_key': 'pk_test_51234567890',
            'secret_key': 'sk_test_51234567890',
            'webhook_secret': 'whsec_test_secret',
            'test_mode': True
        }
        self.gateway.is_active = True
        self.gateway.save()
        
        # Payment method
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.client_user,
            token_reference='pm_test_visa_card',
            last_four='4242',
            card_exp_month=12,
            card_exp_year=2028,
            is_default=True
        )
        
        # Booking flow setup
        self.booking_flow = BookingFlow.objects.create(
            name='Premium Wedding Booking',
            event_type=self.event_type,
            is_active=True
        )
        
        # Payment step with deposit configuration
        self.payment_step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow,
            step_type='payment_info',
            name='Payment & Booking Confirmation',
            order=4,
            is_enabled=True,
            is_required=True
        )
        
        self.payment_config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_full_payment=True,
            accept_deposit=True,
            deposit_type='PERCENTAGE',
            deposit_amount=Decimal('30.00'),  # 30% deposit
            balance_due_days=30,
            require_immediate_payment=False,
            allow_quote_request=True,
            quote_request_button_text='Request Custom Quote',
            refund_policy='Full refund up to 48 hours before event'
        )
        self.payment_config.allowed_gateways.add(self.gateway)
    
    def test_complete_booking_to_payment_flow(self):
        """Test complete flow: booking session → event → quote → invoice → payment"""
        
        # Step 1: Create booking session with selected products
        session = BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=self.booking_flow,
            client=self.client_user,
            booking_data={
                'contact_info': {
                    'first_name': 'Maria',
                    'last_name': 'Santos',
                    'email': 'maria@example.com',
                    'phone': '+639123456789'
                },
                'event_details': {
                    'event_name': 'Maria & Juan Wedding',
                    'event_date': '2024-12-15',
                    'event_time': '16:00',
                    'venue': 'Manila Hotel Grand Ballroom',
                    'guest_count': 200
                },
                'selected_packages': [self.premium_package.id],
                'selected_addons': [self.extra_hour.id, self.photo_album.id],
                'special_requests': 'Please include drone shots during ceremony'
            },
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        # Mark steps as completed
        session.completed_steps.add(self.payment_step)
        
        # Step 2: Complete booking with quote request first
        with patch('core.domains.workflows.services.workflow_service.WorkflowService.trigger_workflow'):
            event = BookingSessionService.complete_booking(
                str(session.session_id), 
                completion_type='quote'
            )
        
        # Verify event creation
        self.assertIsNotNone(event)
        self.assertEqual(event.client, self.client_user)
        self.assertEqual(event.name, 'Maria & Juan Wedding')
        self.assertEqual(event.status, 'LEAD')  # Quote request = LEAD status
        
        # Step 3: Verify quote generation with correct pricing
        quotes = EventQuote.objects.filter(event=event)
        self.assertEqual(quotes.count(), 1)
        
        quote = quotes.first()
        self.assertEqual(quote.status, 'DRAFT')
        
        # Calculate expected total: 35000 + 2500 + 5000 = 42500
        # Tax: 42500 * 12% = 5100
        # Total: 42500 + 5100 = 47600
        expected_subtotal = Decimal('42500.00')
        expected_tax = Decimal('5100.00')
        expected_total = Decimal('47600.00')
        
        self.assertEqual(quote.subtotal_amount, expected_subtotal)
        self.assertEqual(quote.tax_amount, expected_tax)
        self.assertEqual(quote.total_amount, expected_total)
        
        # Verify line items
        line_items = QuoteLineItem.objects.filter(quote=quote)
        self.assertEqual(line_items.count(), 3)
        
        package_item = line_items.filter(product=self.premium_package).first()
        self.assertEqual(package_item.unit_price, Decimal('35000.00'))
        self.assertEqual(package_item.quantity, 1)
        
        # Step 4: Accept quote (simulate client acceptance)
        quote.status = 'ACCEPTED'
        quote.accepted_at = timezone.now()
        quote.save()
        
        # Step 5: Create invoice from accepted quote
        invoice = InvoiceService.create_from_quote(quote)
        
        self.assertEqual(invoice.event, event)
        self.assertEqual(invoice.total_amount, quote.total_amount)
        self.assertEqual(invoice.status, 'DRAFT')
        
        # Verify invoice line items were copied
        invoice_line_items = InvoiceLineItem.objects.filter(invoice=invoice)
        self.assertEqual(invoice_line_items.count(), 3)
        
        # Step 6: Issue invoice
        InvoiceService.issue_invoice(invoice)
        invoice.refresh_from_db()
        
        self.assertEqual(invoice.status, 'ISSUED')
        self.assertIsNotNone(invoice.issued_at)
        
        # Step 7: Process deposit payment (30% = ₱14,280)
        deposit_amount = (invoice.total_amount * Decimal('0.30')).quantize(Decimal('0.01'))
        expected_deposit = Decimal('14280.00')
        self.assertEqual(deposit_amount, expected_deposit)
        
        # Create deposit payment
        deposit_payment = Payment.objects.create(
            event=event,
            invoice=invoice,
            payment_method=self.payment_method,
            amount=deposit_amount,
            currency='PHP',
            payment_type='DEPOSIT',
            description='30% deposit for wedding package'
        )
        
        # Mock Stripe payment processing
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = Mock()
            mock_intent.id = 'pi_test_deposit_123'
            mock_intent.status = 'succeeded'
            mock_intent.amount = int(deposit_amount * 100)  # Convert to centavos
            mock_intent.currency = 'php'
            mock_create.return_value = mock_intent
            
            result = PaymentGatewayService.process_payment(deposit_payment)
            
            self.assertTrue(result['success'])
        
        # Update payment status
        deposit_payment.status = 'COMPLETED'
        deposit_payment.completed_at = timezone.now()
        deposit_payment.save()
        
        # Step 8: Update event status after deposit
        event.status = 'CONFIRMED'  # Deposit payment confirms booking
        event.save()

        # Step 9: Calculate remaining balance
        remaining_balance = invoice.total_amount - deposit_amount
        expected_balance = Decimal('33320.00')
        self.assertEqual(remaining_balance, expected_balance)

        # Step 10: Process balance payment before event
        balance_payment = Payment.objects.create(
            event=event,
            invoice=invoice,
            payment_method=self.payment_method,
            amount=remaining_balance,
            currency='PHP',
            payment_type='BALANCE',
            description='Final balance payment for wedding package'
        )

        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = Mock()
            mock_intent.id = 'pi_test_balance_456'
            mock_intent.status = 'succeeded'
            mock_intent.amount = int(remaining_balance * 100)
            mock_intent.currency = 'php'
            mock_create.return_value = mock_intent

            result = PaymentGatewayService.process_payment(balance_payment)
            self.assertTrue(result['success'])

        balance_payment.status = 'COMPLETED'
        balance_payment.completed_at = timezone.now()
        balance_payment.save()

        # Step 11: Mark invoice as fully paid
        InvoiceService.mark_as_paid(invoice)
        invoice.refresh_from_db()

        self.assertEqual(invoice.status, 'PAID')
        self.assertIsNotNone(invoice.paid_at)

        # Step 12: Verify final state
        event.refresh_from_db()
        self.assertEqual(event.status, 'CONFIRMED')

        # Verify total payments
        total_payments = Payment.objects.filter(event=event, status='COMPLETED')
        self.assertEqual(total_payments.count(), 2)  # Deposit + Balance

        total_paid = sum(p.amount for p in total_payments)
        self.assertEqual(total_paid, invoice.total_amount)
    
    def test_direct_full_payment_flow(self):
        """Test direct full payment without deposit"""
        # Create event directly
        event = Event.objects.create(
            client=self.client_user,
            event_type=self.event_type,
            name='Direct Payment Wedding',
            start_date=date.today() + timedelta(days=45),
            status='LEAD'
        )
        
        # Create quote
        quote = EventQuote.objects.create(
            event=event,
            subtotal_amount=Decimal('35000.00'),
            tax_amount=Decimal('4200.00'),
            total_amount=Decimal('39200.00'),
            currency='PHP',
            status='ACCEPTED'
        )
        
        # Create invoice
        invoice = InvoiceService.create_from_quote(quote)
        InvoiceService.issue_invoice(invoice)
        
        # Process full payment
        full_payment = Payment.objects.create(
            event=event,
            invoice=invoice,
            payment_method=self.payment_method,
            amount=invoice.total_amount,
            currency='PHP',
            payment_type='FULL',
            description='Full payment for wedding package'
        )
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = Mock()
            mock_intent.id = 'pi_test_full_789'
            mock_intent.status = 'succeeded'
            mock_intent.amount = int(invoice.total_amount * 100)
            mock_intent.currency = 'php'
            mock_create.return_value = mock_intent
            
            result = PaymentGatewayService.process_payment(full_payment)
            self.assertTrue(result['success'])
        
        full_payment.status = 'COMPLETED'
        full_payment.completed_at = timezone.now()
        full_payment.save()
        
        # Mark invoice paid
        InvoiceService.mark_as_paid(invoice)
        
        # Update event status
        event.status = 'CONFIRMED'
        event.save()
        
        # Verify final state
        self.assertEqual(event.status, 'CONFIRMED')
        self.assertEqual(invoice.status, 'PAID')
        self.assertEqual(full_payment.status, 'COMPLETED')
    
    def test_payment_failure_and_retry(self):
        """Test payment failure handling and retry logic"""
        event = Event.objects.create(
            client=self.client_user,
            event_type=self.event_type,
            name='Retry Payment Wedding',
            start_date=date.today() + timedelta(days=60)
        )
        
        payment = Payment.objects.create(
            event=event,
            payment_method=self.payment_method,
            amount=Decimal('15000.00'),
            currency='PHP'
        )
        
        # First attempt - card declined
        with patch('stripe.PaymentIntent.create') as mock_create:
            import stripe
            mock_create.side_effect = stripe.error.CardError(
                message='Your card was declined.',
                param='payment_method',
                code='card_declined'
            )
            
            result = PaymentGatewayService.process_payment(payment)
            self.assertFalse(result['success'])
        
        # Verify failed transaction recorded
        failed_transactions = PaymentTransaction.objects.filter(
            payment=payment, status='FAILED'
        )
        self.assertEqual(failed_transactions.count(), 1)
        
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'FAILED')
        
        # Second attempt - success
        payment.status = 'PENDING'  # Reset for retry
        payment.save()
        
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = Mock()
            mock_intent.id = 'pi_test_retry_success'
            mock_intent.status = 'succeeded'
            mock_intent.amount = 1500000  # ₱15,000 in centavos
            mock_intent.currency = 'php'
            mock_create.return_value = mock_intent
            
            result = PaymentGatewayService.process_payment(payment)
            self.assertTrue(result['success'])
        
        # Verify successful transaction
        success_transactions = PaymentTransaction.objects.filter(
            payment=payment, status='SUCCESS'
        )
        self.assertEqual(success_transactions.count(), 1)
        
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'COMPLETED')
    
    def test_partial_refund_flow(self):
        """Test partial refund processing"""
        # Create completed payment
        event = Event.objects.create(
            client=self.client_user,
            event_type=self.event_type,
            name='Refund Test Wedding',
            start_date=date.today() + timedelta(days=30)
        )
        
        payment = Payment.objects.create(
            event=event,
            payment_method=self.payment_method,
            amount=Decimal('25000.00'),
            currency='PHP',
            status='COMPLETED'
        )
        
        # Create successful charge transaction
        charge_transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway_transaction_id='pi_original_charge',
            transaction_type='CHARGE',
            status='SUCCESS',
            amount=Decimal('25000.00'),
            currency='PHP'
        )
        
        # Process partial refund (₱10,000)
        refund_amount = Decimal('10000.00')
        
        with patch('stripe.Refund.create') as mock_refund:
            mock_refund_obj = Mock()
            mock_refund_obj.id = 're_partial_refund'
            mock_refund_obj.status = 'succeeded'
            mock_refund_obj.amount = int(refund_amount * 100)
            mock_refund.return_value = mock_refund_obj
            
            result = PaymentGatewayService.refund_payment(
                payment, refund_amount, 'Partial service cancellation'
            )
            self.assertTrue(result['success'])
        
        # Verify refund transaction
        refund_transactions = PaymentTransaction.objects.filter(
            payment=payment,
            transaction_type='REFUND',
            status='SUCCESS'
        )
        self.assertEqual(refund_transactions.count(), 1)
        
        refund_transaction = refund_transactions.first()
        self.assertEqual(refund_transaction.amount, refund_amount)
        self.assertEqual(refund_transaction.parent_transaction, charge_transaction)
        
        # Verify payment refunded amount
        payment.refresh_from_db()
        self.assertEqual(payment.refunded_amount, refund_amount)