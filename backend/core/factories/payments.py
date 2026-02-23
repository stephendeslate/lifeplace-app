"""
Factories for the payments domain.

Based on actual models in core/domains/payments/models.py:
- PaymentGateway (with EncryptedJSONField config)
- PaymentMethod (saved payment methods for users)
- Payment (main payment record with state machine)
- Invoice (invoices with line items)
"""

from datetime import date, timedelta
from decimal import Decimal

import factory
from factory.django import DjangoModelFactory


class PaymentGatewayFactory(DjangoModelFactory):
    """
    Factory for creating PaymentGateway instances.

    PaymentGateway stores gateway configurations (Stripe, PayMongo, etc.)
    with encrypted sensitive fields.
    """

    class Meta:
        model = "payments.PaymentGateway"
        django_get_or_create = ("code",)

    name = factory.Sequence(lambda n: f"Gateway {n}")
    code = factory.Sequence(lambda n: f"gateway_{n}")
    is_active = True
    description = factory.Faker("sentence")
    config = factory.LazyFunction(
        lambda: {"publishable_key": "pk_test_123", "secret_key": "sk_test_123", "test_mode": True}
    )

    class Params:
        """Traits for specific gateway types."""

        stripe = factory.Trait(
            name="Stripe",
            code="stripe",
            config={
                "publishable_key": "pk_test_stripe_123",
                "secret_key": "sk_test_stripe_123",
                "webhook_secret": "whsec_test_123",
                "test_mode": True,
            },
        )

        paymongo = factory.Trait(
            name="PayMongo",
            code="paymongo",
            config={"public_key": "pk_test_paymongo_123", "secret_key": "sk_test_paymongo_123", "test_mode": True},
        )

        inactive = factory.Trait(is_active=False)


class PaymentMethodFactory(DjangoModelFactory):
    """
    Factory for creating PaymentMethod instances.

    PaymentMethod represents saved payment methods for users
    (credit cards, bank transfers, etc.)
    """

    class Meta:
        model = "payments.PaymentMethod"

    user = factory.SubFactory("core.factories.users.UserFactory")
    type = "CREDIT_CARD"
    is_default = True
    nickname = factory.Sequence(lambda n: f"Card {n}")
    instructions = ""
    gateway = factory.SubFactory(PaymentGatewayFactory, stripe=True)
    token_reference = factory.Sequence(lambda n: f"pm_test_{n}")
    last_four = "4242"
    metadata = factory.LazyFunction(dict)

    @factory.lazy_attribute
    def expiry_date(self):
        """Default expiry is 2 years from now."""
        return date.today() + timedelta(days=730)

    class Params:
        """Traits for payment method types."""

        credit_card = factory.Trait(type="CREDIT_CARD", last_four="4242")

        bank_transfer = factory.Trait(type="BANK_TRANSFER", last_four="", expiry_date=None)

        cash = factory.Trait(type="CASH", last_four="", expiry_date=None, gateway=None)

        digital_wallet = factory.Trait(type="DIGITAL_WALLET", last_four="")


class PaymentFactory(DjangoModelFactory):
    """
    Factory for creating Payment instances.

    Payment is the main payment record with status state machine:
    CREATED -> PENDING -> PROCESSING -> COMPLETED/FAILED/CANCELLED -> REFUNDED
    """

    class Meta:
        model = "payments.Payment"

    event = factory.SubFactory("core.factories.events.EventFactory")
    amount = Decimal("2500.00")
    currency = "PHP"
    status = "PENDING"
    description = factory.Faker("sentence")
    notes = ""
    reference_number = ""
    is_manual = False

    @factory.lazy_attribute
    def due_date(self):
        """Default due date is 7 days from now."""
        return date.today() + timedelta(days=7)

    @factory.lazy_attribute
    def payment_number(self):
        """Generate unique payment number."""
        import uuid

        year = date.today().year
        return f"PAY-{year}-{uuid.uuid4().hex[:8].upper()}"

    class Params:
        """Traits for payment states."""

        created = factory.Trait(status="CREATED")

        pending = factory.Trait(status="PENDING")

        processing = factory.Trait(status="PROCESSING")

        completed = factory.Trait(status="COMPLETED", paid_on=factory.LazyFunction(date.today))

        failed = factory.Trait(status="FAILED")

        cancelled = factory.Trait(status="CANCELLED")

        refunded = factory.Trait(status="REFUNDED")

        manual = factory.Trait(is_manual=True)

        overdue = factory.Trait(
            due_date=factory.LazyFunction(lambda: date.today() - timedelta(days=7)), status="PENDING"
        )


class InvoiceFactory(DjangoModelFactory):
    """
    Factory for creating Invoice instances.

    Invoice tracks billing with line items and payment status.
    """

    class Meta:
        model = "payments.Invoice"

    event = factory.SubFactory("core.factories.events.EventFactory")
    client = factory.SelfAttribute("event.client")
    subtotal = Decimal("2500.00")
    tax_amount = Decimal("300.00")
    total_amount = Decimal("2800.00")
    currency = "PHP"
    status = "DRAFT"
    notes = ""
    payment_terms = "Net 30"

    @factory.lazy_attribute
    def invoice_id(self):
        """Generate unique invoice ID."""
        import uuid

        year = date.today().year
        return f"INV-{year}-{uuid.uuid4().hex[:8].upper()}"

    @factory.lazy_attribute
    def issue_date(self):
        """Issue date is today."""
        return date.today()

    @factory.lazy_attribute
    def due_date(self):
        """Due date is 30 days from issue."""
        return self.issue_date + timedelta(days=30)

    class Params:
        """Traits for invoice states."""

        draft = factory.Trait(status="DRAFT")

        issued = factory.Trait(status="ISSUED")

        partially_paid = factory.Trait(status="PARTIALLY_PAID")

        paid = factory.Trait(status="PAID")

        void = factory.Trait(status="VOID")

        cancelled = factory.Trait(status="CANCELLED")

        overdue = factory.Trait(
            status="ISSUED", due_date=factory.LazyFunction(lambda: date.today() - timedelta(days=7))
        )
