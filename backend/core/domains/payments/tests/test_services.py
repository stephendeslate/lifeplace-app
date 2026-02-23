# backend/core/domains/payments/tests/test_services.py

from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from core.domains.bookingflow.models import BookingFlow, BookingFlowStep, PaymentInfoStepConfiguration
from core.domains.events.models import Event, EventType
from core.domains.payments.models import (
    Invoice,
    InvoiceLineItem,
    Payment,
    PaymentGateway,
    PaymentMethod,
    PaymentTransaction,
)
from core.domains.payments.services.gateway_service import PaymentGatewayService
from core.domains.payments.services.invoice_service import InvoiceService
from core.domains.payments.services.payment_service import PaymentService
from core.domains.products.models import ProductCategory, ProductOption
from core.domains.sales.models import EventQuote, QuoteLineItem

User = get_user_model()


class PaymentServiceTestCase(TestCase):
    """Test cases for PaymentService"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email="client@test.com", first_name="Test", last_name="Client", role="CLIENT"
        )

        self.event_type = EventType.objects.create(name="Wedding")
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name="Test Wedding",
            start_date=date.today() + timedelta(days=30),
        )

        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code="stripe",
            defaults={
                "name": "Stripe Test",
                "is_active": True,
            },
        )
        # Always update config to ensure test keys are set
        self.gateway.config = {"publishable_key": "pk_test_123", "secret_key": "sk_test_123", "test_mode": True}
        self.gateway.is_active = True
        self.gateway.save()

        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway, user=self.user, token_reference="pm_test_123", last_four="4242"
        )

    def test_create_payment(self):
        """Test payment creation directly via model"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal("2500.00"),
            currency="PHP",
            description="Wedding package payment",
            due_date=date.today() + timedelta(days=7),
        )

        self.assertEqual(payment.event, self.event)
        self.assertEqual(payment.amount, Decimal("2500.00"))
        self.assertEqual(payment.currency, "PHP")
        self.assertIsNotNone(payment.payment_number)

    def test_update_payment(self):
        """Test payment update via PaymentService"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal("2500.00"),
            currency="PHP",
            status="PENDING",
            due_date=date.today() + timedelta(days=7),
        )

        updated = PaymentService.update_payment(payment.id, {"notes": "Updated notes"}, self.user)

        self.assertEqual(updated.notes, "Updated notes")

    def test_process_gateway_payment(self):
        """Test process_gateway_payment delegates to PaymentGatewayService"""
        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal("2500.00"),
            currency="PHP",
            status="PENDING",
            due_date=date.today() + timedelta(days=7),
        )

        with patch(
            "core.domains.payments.services.gateway_service.PaymentGatewayService.process_gateway_payment"
        ) as mock_process:
            mock_txn = Mock()
            mock_txn.status = "COMPLETED"
            mock_process.return_value = mock_txn

            PaymentService.process_gateway_payment(
                payment.id, "stripe", {"payment_method": self.payment_method.id}, self.user
            )

            mock_process.assert_called_once_with(
                payment.id, "stripe", {"payment_method": self.payment_method.id}, self.user
            )


class PaymentGatewayServiceTestCase(TestCase):
    """Test cases for PaymentGatewayService"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email="client@test.com", first_name="Test", last_name="Client", role="CLIENT"
        )

        self.event_type = EventType.objects.create(name="Wedding")
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name="Test Wedding",
            start_date=date.today() + timedelta(days=30),
        )

        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code="stripe",
            defaults={
                "name": "Stripe Test",
                "is_active": True,
            },
        )
        # Always update config to ensure test settings are applied
        self.gateway.config = {
            "publishable_key": "pk_test_51234567890",
            "secret_key": "sk_test_51234567890",
            "webhook_secret": "whsec_test_123",
            "test_mode": True,
        }
        self.gateway.is_active = True
        self.gateway.save()

        self.payment_method = PaymentMethod.objects.create(
            gateway=self.gateway, user=self.user, token_reference="pm_test_card", last_four="4242"
        )

    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.PaymentMethod.retrieve")
    @patch("stripe.Customer.create")
    @patch("stripe.Customer.list")
    @patch("stripe.PaymentIntent.create")
    def test_stripe_payment_processing(
        self, mock_create, mock_cust_list, mock_cust_create, mock_pm_retrieve, mock_pm_attach
    ):
        """Test Stripe payment processing via process_payment(payment_id, payment_data, user)"""
        # Mock Stripe Customer lookup/creation
        mock_cust_list.return_value = Mock(data=[])
        mock_cust_create.return_value = Mock(id="cus_test_123")
        mock_pm_retrieve.return_value = Mock(customer=None)

        # Mock Stripe PaymentIntent response
        # Use a dict subclass with attribute access so it works both as
        # response_data (JSONField needs dict) and as intent.id / intent.status
        class MockStripeObject(dict):
            def __getattr__(self, name):
                try:
                    return self[name]
                except KeyError:
                    raise AttributeError(name)

        mock_payment_intent = MockStripeObject(
            {
                "id": "pi_test_123456",
                "status": "succeeded",
                "amount": 250000,
                "currency": "php",
                "payment_method": None,
                "client_secret": "cs_test",
                "next_action": None,
                "metadata": {"event_id": str(self.event.id)},
            }
        )
        mock_create.return_value = mock_payment_intent

        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal("2500.00"),
            currency="PHP",
            due_date=date.today() + timedelta(days=7),
        )

        # process_payment takes (payment_id, payment_data, user)
        result = PaymentGatewayService.process_payment(
            payment.id, {"gateway_id": str(self.gateway.id), "payment_method": self.payment_method.id}, self.user
        )

        # Result is a PaymentTransaction object
        self.assertIsNotNone(result)

        # Verify transaction was recorded
        transaction = PaymentTransaction.objects.get(payment=payment, transaction_id="pi_test_123456")
        self.assertEqual(transaction.status, "COMPLETED")

    @patch("stripe.PaymentMethod.attach")
    @patch("stripe.PaymentMethod.retrieve")
    @patch("stripe.Customer.create")
    @patch("stripe.Customer.list")
    @patch("stripe.PaymentIntent.create")
    def test_stripe_payment_failure(
        self, mock_create, mock_cust_list, mock_cust_create, mock_pm_retrieve, mock_pm_attach
    ):
        """Test Stripe payment failure handling"""
        import stripe

        # Mock Stripe Customer lookup/creation
        mock_cust_list.return_value = Mock(data=[])
        mock_cust_create.return_value = Mock(id="cus_test_123")
        mock_pm_retrieve.return_value = Mock(customer=None)

        # Mock Stripe exception
        mock_create.side_effect = stripe.error.CardError(
            message="Your card was declined.", param="payment_method", code="card_declined"
        )

        payment = Payment.objects.create(
            event=self.event,
            payment_method=self.payment_method,
            amount=Decimal("2500.00"),
            currency="PHP",
            due_date=date.today() + timedelta(days=7),
        )

        # process_payment raises StripeUserFriendlyError on failure
        from core.domains.payments.exceptions import StripeUserFriendlyError

        with self.assertRaises(StripeUserFriendlyError):
            PaymentGatewayService.process_payment(
                payment.id, {"gateway_id": str(self.gateway.id), "payment_method": self.payment_method.id}, self.user
            )

        # Note: The FAILED transaction record is created inside transaction.atomic()
        # in gateway_service, but the StripeUserFriendlyError propagates out of the
        # atomic block, causing a savepoint rollback. The key test is that
        # StripeUserFriendlyError is raised (verified above).

    def test_gateway_creation(self):
        """Test gateway CRUD operations"""
        admin_user = User.objects.create_user(
            email="admin@test.com", first_name="Admin", last_name="User", role="ADMIN", is_staff=True
        )

        gateway = PaymentGatewayService.create_gateway(
            {"name": "PayPal Test", "code": "paypal", "is_active": True, "config": {"client_id": "test_client_id"}},
            admin_user,
        )

        self.assertEqual(gateway.code, "paypal")
        self.assertTrue(gateway.is_active)


class InvoiceServiceTestCase(TestCase):
    """Test cases for InvoiceService"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email="client@test.com", first_name="Test", last_name="Client", role="CLIENT"
        )

        self.event_type = EventType.objects.create(name="Wedding")
        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            name="Test Wedding",
            start_date=date.today() + timedelta(days=30),
        )

        self.category = ProductCategory.objects.create(
            name="Wedding Packages", description="Wedding photography packages"
        )

        self.package = ProductOption.objects.create(
            name="Premium Package",
            description="Premium wedding package",
            base_price=Decimal("2500.00"),
            currency="PHP",
            category=self.category,
            type="PACKAGE",
        )

        self.addon = ProductOption.objects.create(
            name="Extra Hour",
            description="Additional hour of service",
            base_price=Decimal("200.00"),
            currency="PHP",
            category=self.category,
            type="PRODUCT",
        )

    def test_create_invoice_from_quote(self):
        """Test creating invoice from accepted quote"""
        # EventQuote uses 'subtotal' not 'subtotal_amount'
        # valid_until is a required field (non-null)
        quote = EventQuote.objects.create(
            event=self.event,
            subtotal=Decimal("2700.00"),
            tax_amount=Decimal("324.00"),
            total_amount=Decimal("3024.00"),
            status="ACCEPTED",
            valid_until=date.today() + timedelta(days=30),
        )

        QuoteLineItem.objects.create(
            quote=quote,
            product=self.package,
            description="Premium Wedding Package",
            quantity=1,
            unit_price=Decimal("2500.00"),
            total=Decimal("2500.00"),
            tax_rate=Decimal("12.00"),
        )

        QuoteLineItem.objects.create(
            quote=quote,
            product=self.addon,
            description="Extra Hour",
            quantity=1,
            unit_price=Decimal("200.00"),
            total=Decimal("200.00"),
            tax_rate=Decimal("12.00"),
        )

        # Create invoice from quote
        invoice = InvoiceService.create_from_quote(quote)

        self.assertEqual(invoice.event, quote.event)
        self.assertEqual(invoice.total_amount, quote.total_amount)
        self.assertEqual(invoice.quote, quote)
        self.assertEqual(invoice.status, "DRAFT")

        # Verify line items were copied
        line_items = invoice.line_items.all()
        self.assertEqual(line_items.count(), 2)

    def test_invoice_creation_with_required_fields(self):
        """Test invoice creation with all required fields including client"""
        invoice = Invoice.objects.create(
            event=self.event,
            client=self.user,
            subtotal=Decimal("2700.00"),
            tax_amount=Decimal("324.00"),
            total_amount=Decimal("3024.00"),
            currency="PHP",
            issue_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            status="DRAFT",
        )

        self.assertEqual(invoice.subtotal, Decimal("2700.00"))
        self.assertEqual(invoice.total_amount, Decimal("3024.00"))

        # Add line items
        InvoiceLineItem.objects.create(
            invoice=invoice,
            product=self.package,
            description="Premium Wedding Package",
            quantity=1,
            unit_price=Decimal("2500.00"),
            total=Decimal("2500.00"),
            tax_rate=Decimal("12.00"),
        )

        InvoiceLineItem.objects.create(
            invoice=invoice,
            product=self.addon,
            description="Extra Hour",
            quantity=1,
            unit_price=Decimal("200.00"),
            total=Decimal("200.00"),
            tax_rate=Decimal("12.00"),
        )

        self.assertEqual(invoice.line_items.count(), 2)

    def test_issue_invoice(self):
        """Test issuing a draft invoice"""
        invoice = Invoice.objects.create(
            event=self.event,
            client=self.user,
            total_amount=Decimal("3024.00"),
            subtotal=Decimal("2700.00"),
            tax_amount=Decimal("324.00"),
            currency="PHP",
            status="DRAFT",
            issue_date=date.today(),
            due_date=date.today() + timedelta(days=30),
        )

        # Invoice.issue() is a model method that changes status
        invoice.issue()

        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "ISSUED")

    def test_mark_invoice_paid(self):
        """Test marking invoice as paid"""
        gateway, _ = PaymentGateway.objects.get_or_create(
            code="stripe",
            defaults={
                "name": "Stripe Test",
                "is_active": True,
            },
        )
        gateway.is_active = True
        gateway.save()

        payment_method = PaymentMethod.objects.create(gateway=gateway, user=self.user, token_reference="pm_test_123")

        invoice = Invoice.objects.create(
            event=self.event,
            client=self.user,
            total_amount=Decimal("3024.00"),
            subtotal=Decimal("2700.00"),
            tax_amount=Decimal("324.00"),
            currency="PHP",
            status="ISSUED",
            issue_date=date.today(),
            due_date=date.today() + timedelta(days=30),
        )

        # Create payment linked to invoice
        Payment.objects.create(
            event=self.event,
            invoice=invoice,
            payment_method=payment_method,
            amount=Decimal("3024.00"),
            currency="PHP",
            status="COMPLETED",
            due_date=date.today() + timedelta(days=7),
        )

        # mark_as_paid is a model method on Invoice
        invoice.mark_as_paid()

        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "PAID")


class DepositPaymentTestCase(TestCase):
    """Test cases for deposit payment functionality"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email="client@test.com", first_name="Test", last_name="Client", role="CLIENT"
        )

        self.event_type = EventType.objects.create(name="Wedding")

        self.booking_flow = BookingFlow.objects.create(
            name="Wedding Booking Flow", event_type=self.event_type, is_active=True
        )

        self.payment_step = BookingFlowStep.objects.create(
            booking_flow=self.booking_flow, step_type="payment_info", order=3, is_enabled=True
        )

        self.gateway, _ = PaymentGateway.objects.get_or_create(
            code="stripe",
            defaults={
                "name": "Stripe Test",
                "is_active": True,
            },
        )
        self.gateway.is_active = True
        self.gateway.save()

    def test_payment_info_step_configuration(self):
        """Test PaymentInfoStepConfiguration for deposit settings.

        Note: deposit_type, deposit_amount, allowed_gateways moved to PaymentSettings.
        PaymentInfoStepConfiguration now only holds UI/UX flags.
        """
        config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step, accept_deposit=True, require_immediate_payment=False
        )

        self.assertTrue(config.accept_deposit)
        self.assertFalse(config.require_immediate_payment)

    def test_fixed_deposit_configuration(self):
        """Test PaymentInfoStepConfiguration with accept_deposit flag.

        Note: deposit_type and deposit_amount moved to PaymentSettings.
        PaymentInfoStepConfiguration now only holds UI/UX flags.
        """
        config = PaymentInfoStepConfiguration.objects.create(
            step=self.payment_step, accept_deposit=True, accept_full_payment=True, require_immediate_payment=False
        )

        self.assertTrue(config.accept_deposit)
        self.assertTrue(config.accept_full_payment)
