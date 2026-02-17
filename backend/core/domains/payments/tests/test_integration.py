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
from core.domains.payments.services.refund_service import RefundService
from core.domains.events.models import Event, EventType
from core.domains.sales.models import EventQuote, QuoteLineItem
from core.domains.products.models import ProductOption, ProductCategory
from core.domains.bookingflow.models import (
    BookingFlow, BookingFlowStep, PaymentInfoStepConfiguration, BookingSession
)
from core.domains.bookingflow.services.booking_session_service import BookingSessionService

User = get_user_model()


class MockStripeObject(dict):
    """Dict subclass with attribute access, mimicking Stripe's StripeObject.

    Used in tests so the mock PaymentIntent can be stored in Django's JSONField
    (which needs a dict-like object) while still supporting attribute access
    like intent.id, intent.status, etc.
    """
    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError:
            raise AttributeError(name)


class CompletePaymentFlowTestCase(TestCase):
    """Test cases for complete event creation to payment completion flow"""

    def setUp(self):
        """Set up comprehensive test data"""
        # Create user (no phone field on User model - phone is on UserProfile)
        self.client_user = User.objects.create_user(
            email='client@example.com',
            first_name='Maria',
            last_name='Santos',
            role='CLIENT'
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
            base_price=Decimal('35000.00'),  # PHP 35,000
            currency='PHP',
            category=self.category,
            type='PACKAGE'
        )

        # Additional services
        self.extra_hour = ProductOption.objects.create(
            name='Additional Hour',
            description='Extra hour of photography coverage',
            base_price=Decimal('2500.00'),  # PHP 2,500
            currency='PHP',
            category=self.category,
            type='PRODUCT'
        )

        self.photo_album = ProductOption.objects.create(
            name='Premium Album',
            description='Leather-bound wedding album',
            base_price=Decimal('5000.00'),  # PHP 5,000
            currency='PHP',
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

        # Payment method (uses expiry_date, not card_exp_month/card_exp_year)
        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway,
            user=self.client_user,
            token_reference='pm_test_visa_card',
            last_four='4242',
            expiry_date=date(2028, 12, 31),
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
            order=4,
            is_enabled=True,
            is_required=True
        )

        # Note: deposit_type, deposit_amount, balance_due_days, refund_policy,
        # allowed_gateways moved from PaymentInfoStepConfiguration to PaymentSettings.
        # PaymentInfoStepConfiguration now only holds UI/UX flags.
        self.payment_config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step,
            accept_full_payment=True,
            accept_deposit=True,
            require_immediate_payment=False,
            allow_quote_request=True,
            quote_request_button_text='Request Custom Quote'
        )

    @patch('stripe.PaymentMethod.attach')
    @patch('stripe.PaymentMethod.retrieve')
    @patch('stripe.Customer.create')
    @patch('stripe.Customer.list')
    def test_complete_booking_to_payment_flow(
        self, mock_cust_list, mock_cust_create, mock_pm_retrieve, mock_pm_attach
    ):
        """Test complete flow: booking session -> event -> quote -> invoice -> payment"""
        # Mock Stripe Customer lookup/creation for all process_payment calls
        mock_cust_list.return_value = Mock(data=[])
        mock_cust_create.return_value = Mock(id='cus_test_123')
        mock_pm_retrieve.return_value = Mock(customer=None)

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
                    'venue': 'Manila Hotel Grand Ballroom'
                },
                'selected_packages': [
                    {
                        'product_id': self.premium_package.id,
                        'name': self.premium_package.name,
                        'price': str(self.premium_package.base_price),
                        'quantity': 1
                    }
                ],
                'selected_addons': [
                    {
                        'product_id': self.extra_hour.id,
                        'name': self.extra_hour.name,
                        'price': str(self.extra_hour.base_price),
                        'quantity': 1
                    },
                    {
                        'product_id': self.photo_album.id,
                        'name': self.photo_album.name,
                        'price': str(self.photo_album.base_price),
                        'quantity': 1
                    }
                ],
                'special_requests': 'Please include drone shots during ceremony'
            },
            expires_at=timezone.now() + timedelta(hours=24)
        )

        # Mark steps as completed
        session.completed_steps.add(self.payment_step)

        # Step 2: Complete booking with quote request first
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
        # Tax: 0% (no tax_rate configured on products, no system default)
        # Total: 42500
        expected_subtotal = Decimal('42500.00')
        expected_tax = Decimal('0.00')
        expected_total = Decimal('42500.00')

        self.assertEqual(quote.subtotal, expected_subtotal)
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

        # Step 5: Retrieve invoice (auto-created and issued by signal when
        # quote status changes to ACCEPTED)
        invoice = Invoice.objects.filter(quote=quote).first()
        self.assertIsNotNone(invoice)

        self.assertEqual(invoice.event, event)
        self.assertEqual(invoice.total_amount, quote.total_amount)
        self.assertEqual(invoice.status, 'ISSUED')

        # Verify invoice line items were copied
        invoice_line_items = InvoiceLineItem.objects.filter(invoice=invoice)
        self.assertEqual(invoice_line_items.count(), 3)

        # Step 7: Process deposit payment (30% of total)
        deposit_amount = (invoice.total_amount * Decimal('0.30')).quantize(Decimal('0.01'))
        expected_deposit = Decimal('12750.00')  # 42500 * 0.30
        self.assertEqual(deposit_amount, expected_deposit)

        # Create deposit payment (no payment_type field on Payment model)
        deposit_payment = Payment.objects.create(
            event=event,
            invoice=invoice,
            payment_method=self.payment_method,
            amount=deposit_amount,
            currency='PHP',
            description='30% deposit for wedding package',
            due_date=date.today() + timedelta(days=7)
        )

        # Mock Stripe payment processing
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = MockStripeObject({
                'id': 'pi_test_deposit_123',
                'status': 'succeeded',
                'amount': int(deposit_amount * 100),
                'currency': 'php',
                'payment_method': None,
                'client_secret': 'cs_test',
                'next_action': None,
            })
            mock_create.return_value = mock_intent

            PaymentGatewayService.process_payment(
                deposit_payment.id,
                {'gateway_id': str(self.gateway.id), 'payment_method': self.payment_method.id},
                self.client_user
            )

        # In TestCase, on_commit callbacks don't fire (the outermost transaction
        # never commits), so we manually trigger payment completion.
        deposit_payment.complete_payment()
        deposit_payment.refresh_from_db()
        self.assertEqual(deposit_payment.status, 'COMPLETED')

        # Step 8: Update event status after deposit
        event.status = 'CONFIRMED'  # Deposit payment confirms booking
        event.save()

        # Step 9: Calculate remaining balance
        remaining_balance = invoice.total_amount - deposit_amount
        expected_balance = Decimal('29750.00')  # 42500 - 12750
        self.assertEqual(remaining_balance, expected_balance)

        # Step 10: Process balance payment before event
        balance_payment = Payment.objects.create(
            event=event,
            invoice=invoice,
            payment_method=self.payment_method,
            amount=remaining_balance,
            currency='PHP',
            description='Final balance payment for wedding package',
            due_date=date.today() + timedelta(days=7)
        )

        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = MockStripeObject({
                'id': 'pi_test_balance_456',
                'status': 'succeeded',
                'amount': int(remaining_balance * 100),
                'currency': 'php',
                'payment_method': None,
                'client_secret': 'cs_test',
                'next_action': None,
            })
            mock_create.return_value = mock_intent

            PaymentGatewayService.process_payment(
                balance_payment.id,
                {'gateway_id': str(self.gateway.id), 'payment_method': self.payment_method.id},
                self.client_user
            )

        # In TestCase, on_commit callbacks don't fire, so manually complete.
        balance_payment.complete_payment()
        balance_payment.refresh_from_db()
        self.assertEqual(balance_payment.status, 'COMPLETED')

        # Step 11: Mark invoice as fully paid (model method)
        invoice.mark_as_paid()
        invoice.refresh_from_db()

        self.assertEqual(invoice.status, 'PAID')

        # Step 12: Verify final state
        event.refresh_from_db()
        self.assertEqual(event.status, 'CONFIRMED')

        # Verify total payments
        total_payments = Payment.objects.filter(event=event, status='COMPLETED')
        self.assertEqual(total_payments.count(), 2)  # Deposit + Balance

        total_paid = sum(p.amount for p in total_payments)
        self.assertEqual(total_paid, invoice.total_amount)

    @patch('stripe.PaymentMethod.attach')
    @patch('stripe.PaymentMethod.retrieve')
    @patch('stripe.Customer.create')
    @patch('stripe.Customer.list')
    def test_direct_full_payment_flow(
        self, mock_cust_list, mock_cust_create, mock_pm_retrieve, mock_pm_attach
    ):
        """Test direct full payment without deposit"""
        mock_cust_list.return_value = Mock(data=[])
        mock_cust_create.return_value = Mock(id='cus_test_123')
        mock_pm_retrieve.return_value = Mock(customer=None)
        # Create event directly
        event = Event.objects.create(
            client=self.client_user,
            event_type=self.event_type,
            name='Direct Payment Wedding',
            start_date=date.today() + timedelta(days=45),
            status='LEAD'
        )

        # Create quote (uses subtotal, not subtotal_amount; valid_until is required)
        quote = EventQuote.objects.create(
            event=event,
            subtotal=Decimal('35000.00'),
            tax_amount=Decimal('4200.00'),
            total_amount=Decimal('39200.00'),
            status='ACCEPTED',
            valid_until=date.today() + timedelta(days=30)
        )

        # Create invoice
        invoice = InvoiceService.create_from_quote(quote)
        invoice.issue()

        # Process full payment (no payment_type field)
        full_payment = Payment.objects.create(
            event=event,
            invoice=invoice,
            payment_method=self.payment_method,
            amount=invoice.total_amount,
            currency='PHP',
            description='Full payment for wedding package',
            due_date=date.today() + timedelta(days=7)
        )

        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = MockStripeObject({
                'id': 'pi_test_full_789',
                'status': 'succeeded',
                'amount': int(invoice.total_amount * 100),
                'currency': 'php',
                'payment_method': None,
                'client_secret': 'cs_test',
                'next_action': None,
            })
            mock_create.return_value = mock_intent

            PaymentGatewayService.process_payment(
                full_payment.id,
                {'gateway_id': str(self.gateway.id), 'payment_method': self.payment_method.id},
                self.client_user
            )

        # In TestCase, on_commit callbacks don't fire, so manually complete.
        full_payment.complete_payment()
        full_payment.refresh_from_db()
        self.assertEqual(full_payment.status, 'COMPLETED')

        # Mark invoice paid (model method)
        invoice.mark_as_paid()

        # Update event status
        event.status = 'CONFIRMED'
        event.save()

        # Verify final state
        self.assertEqual(event.status, 'CONFIRMED')
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'PAID')
        self.assertEqual(full_payment.status, 'COMPLETED')

    @patch('stripe.PaymentMethod.attach')
    @patch('stripe.PaymentMethod.retrieve')
    @patch('stripe.Customer.create')
    @patch('stripe.Customer.list')
    def test_payment_failure_and_retry(
        self, mock_cust_list, mock_cust_create, mock_pm_retrieve, mock_pm_attach
    ):
        """Test payment failure handling and retry logic"""
        mock_cust_list.return_value = Mock(data=[])
        mock_cust_create.return_value = Mock(id='cus_test_123')
        mock_pm_retrieve.return_value = Mock(customer=None)
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
            currency='PHP',
            due_date=date.today() + timedelta(days=7)
        )

        # First attempt - card declined (raises StripeUserFriendlyError)
        with patch('stripe.PaymentIntent.create') as mock_create:
            import stripe
            mock_create.side_effect = stripe.error.CardError(
                message='Your card was declined.',
                param='payment_method',
                code='card_declined'
            )

            from core.domains.payments.exceptions import StripeUserFriendlyError
            with self.assertRaises(StripeUserFriendlyError):
                PaymentGatewayService.process_payment(
                    payment.id,
                    {'gateway_id': str(self.gateway.id), 'payment_method': self.payment_method.id},
                    self.client_user
                )

        # Note: FAILED transaction and payment status update are rolled back due to
        # transaction.atomic() in gateway_service when StripeUserFriendlyError propagates out.

        # Second attempt - success
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_intent = MockStripeObject({
                'id': 'pi_test_retry_success',
                'status': 'succeeded',
                'amount': 1500000,
                'currency': 'php',
                'payment_method': None,
                'client_secret': 'cs_test',
                'next_action': None,
            })
            mock_create.return_value = mock_intent

            PaymentGatewayService.process_payment(
                payment.id,
                {'gateway_id': str(self.gateway.id), 'payment_method': self.payment_method.id},
                self.client_user
            )

        # Verify successful transaction (status is 'COMPLETED', not 'SUCCESS')
        success_transactions = PaymentTransaction.objects.filter(
            payment=payment, status='COMPLETED'
        )
        self.assertEqual(success_transactions.count(), 1)

        # In TestCase, on_commit callbacks don't fire, so manually complete.
        payment.complete_payment()
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'COMPLETED')

    def test_partial_refund_flow(self):
        """Test partial refund processing via RefundService"""
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
            status='COMPLETED',
            due_date=date.today() + timedelta(days=7)
        )

        # Create successful charge transaction (uses transaction_id, status='COMPLETED', gateway FK)
        charge_transaction = PaymentTransaction.objects.create(
            payment=payment,
            gateway=self.gateway,
            transaction_id='pi_original_charge',
            status='COMPLETED',
            amount=Decimal('25000.00'),
            currency='PHP'
        )

        # Process partial refund (PHP 10,000) via RefundService
        refund_amount = Decimal('10000.00')

        refund = RefundService.create_refund(
            payment_id=payment.id,
            refund_data={
                'amount': str(refund_amount),
                'reason': 'Partial service cancellation'
            },
            user=self.client_user
        )

        # Verify refund was created
        self.assertEqual(refund.amount, refund_amount)
        self.assertEqual(refund.status, 'COMPLETED')
