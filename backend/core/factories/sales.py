"""
Factories for the sales domain.

Based on actual models in core/domains/sales/models.py:
- EventQuote (quotes with status workflow)
- QuoteTemplate (templates for standardized quotes)
- QuoteTemplateProduct (junction model)
- QuoteLineItem (individual line items)
- QuoteOption (package options)
- QuoteOptionItem (line items in options)
- QuoteActivity (activity tracking)
- QuoteReminder (scheduled reminders)
"""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

import factory
from factory.django import DjangoModelFactory


class QuoteTemplateFactory(DjangoModelFactory):
    """
    Factory for creating QuoteTemplate instances.

    QuoteTemplate is used for creating standardized quotes.
    """

    class Meta:
        model = "sales.QuoteTemplate"

    name = factory.Sequence(lambda n: f"Quote Template {n}")
    introduction = factory.Faker("paragraph")
    event_type = factory.SubFactory("core.factories.events.EventTypeFactory")
    terms_and_conditions = factory.Faker("paragraph")
    is_active = True
    default_validity_days = 30
    has_multiple_options = False

    class Params:
        """Traits for template configurations."""

        inactive = factory.Trait(is_active=False)

        with_multiple_options = factory.Trait(has_multiple_options=True)

        without_event_type = factory.Trait(event_type=None)


class EventQuoteFactory(DjangoModelFactory):
    """
    Factory for creating EventQuote instances.

    EventQuote tracks quotes/proposals with status workflow:
    DRAFT -> SENT -> ACCEPTED/REJECTED/EXPIRED
    """

    class Meta:
        model = "sales.EventQuote"

    event = factory.SubFactory("core.factories.events.EventFactory")
    template = factory.SubFactory(QuoteTemplateFactory)
    version = 1
    status = "DRAFT"
    subtotal = Decimal("5000.00")
    tax_amount = Decimal("600.00")
    service_charge_amount = Decimal("0.00")
    discount_amount = Decimal("0.00")
    total_amount = Decimal("5600.00")
    notes = ""
    terms_and_conditions = factory.Faker("paragraph")
    client_message = ""
    signature_data = ""
    created_by = factory.SubFactory("core.factories.users.UserFactory", admin=True)

    @factory.lazy_attribute
    def valid_until(self):
        """Default valid_until is 30 days from now."""
        return (timezone.now() + timedelta(days=30)).date()

    class Params:
        """Traits for quote states."""

        draft = factory.Trait(status="DRAFT")

        sent = factory.Trait(status="SENT", sent_at=factory.LazyFunction(timezone.now))

        accepted = factory.Trait(
            status="ACCEPTED",
            sent_at=factory.LazyFunction(lambda: timezone.now() - timedelta(days=3)),
            accepted_at=factory.LazyFunction(timezone.now),
            signature_data="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
        )

        rejected = factory.Trait(
            status="REJECTED",
            sent_at=factory.LazyFunction(lambda: timezone.now() - timedelta(days=3)),
            rejected_at=factory.LazyFunction(timezone.now),
            rejection_reason="Price too high",
        )

        expired = factory.Trait(
            status="EXPIRED", valid_until=factory.LazyFunction((timezone.now() - timedelta(days=7)).date)
        )

        with_discount = factory.Trait(discount_amount=Decimal("500.00"), total_amount=Decimal("5100.00"))


class QuoteTemplateProductFactory(DjangoModelFactory):
    """
    Factory for creating QuoteTemplateProduct instances.

    Junction model for products in a quote template.
    """

    class Meta:
        model = "sales.QuoteTemplateProduct"

    template = factory.SubFactory(QuoteTemplateFactory)
    product = factory.SubFactory("core.factories.products.ProductOptionFactory")
    quantity = 1
    is_required = False

    class Params:
        """Traits for template product configurations."""

        required = factory.Trait(is_required=True)


class QuoteLineItemFactory(DjangoModelFactory):
    """
    Factory for creating QuoteLineItem instances.

    Individual line items in a quote.
    """

    class Meta:
        model = "sales.QuoteLineItem"

    quote = factory.SubFactory(EventQuoteFactory)
    description = factory.Faker("sentence")
    quantity = 1
    unit_price = Decimal("5000.00")
    tax_rate = Decimal("12.00")
    total = Decimal("5000.00")
    product = None
    notes = ""
    item_type = "PACKAGE"
    base_unit_price = None
    excess_hours = None
    excess_hour_price = None
    excess_cost = Decimal("0.00")
    venue_hours_breakdown = None

    class Params:
        """Traits for line item types."""

        addon = factory.Trait(item_type="ADDON")

        with_excess_hours = factory.Trait(
            excess_hours=2,
            excess_hour_price=Decimal("500.00"),
            excess_cost=Decimal("1000.00"),
            base_unit_price=Decimal("4000.00"),
            unit_price=Decimal("5000.00"),
        )


class QuoteOptionFactory(DjangoModelFactory):
    """
    Factory for creating QuoteOption instances.

    Package options within a quote for quotes with multiple options.
    """

    class Meta:
        model = "sales.QuoteOption"

    quote = factory.SubFactory(EventQuoteFactory, has_multiple_options=True)
    name = factory.Sequence(lambda n: f"Option {n}")
    description = factory.Faker("sentence")
    total_price = Decimal("5000.00")
    is_selected = False

    class Params:
        """Traits for option states."""

        selected = factory.Trait(is_selected=True)


class QuoteOptionItemFactory(DjangoModelFactory):
    """
    Factory for creating QuoteOptionItem instances.

    Line items within a quote option.
    """

    class Meta:
        model = "sales.QuoteOptionItem"

    option = factory.SubFactory(QuoteOptionFactory)
    description = factory.Faker("sentence")
    quantity = 1
    unit_price = Decimal("2500.00")
    total = Decimal("2500.00")
    product = None


class QuoteActivityFactory(DjangoModelFactory):
    """
    Factory for creating QuoteActivity instances.

    Tracks actions and activity related to quotes.
    """

    class Meta:
        model = "sales.QuoteActivity"

    quote = factory.SubFactory(EventQuoteFactory)
    action = "CREATED"
    action_by = factory.SubFactory("core.factories.users.UserFactory")
    notes = ""

    class Params:
        """Traits for activity types."""

        created = factory.Trait(action="CREATED", notes="Quote created")

        sent = factory.Trait(action="SENT", notes="Quote sent to client")

        viewed = factory.Trait(action="VIEWED", notes="Quote viewed by client")

        accepted = factory.Trait(action="ACCEPTED", notes="Quote accepted by client")

        rejected = factory.Trait(action="REJECTED", notes="Quote rejected by client")


class QuoteReminderFactory(DjangoModelFactory):
    """
    Factory for creating QuoteReminder instances.

    Scheduled reminders for sent quotes.
    """

    class Meta:
        model = "sales.QuoteReminder"

    quote = factory.SubFactory(EventQuoteFactory, sent=True)
    is_sent = False
    sent_at = None
    message = "Follow up on quote"

    @factory.lazy_attribute
    def scheduled_date(self):
        """Default scheduled date is 3 days from now."""
        return timezone.now() + timedelta(days=3)

    class Params:
        """Traits for reminder states."""

        sent = factory.Trait(is_sent=True, sent_at=factory.LazyFunction(timezone.now))

        overdue = factory.Trait(
            scheduled_date=factory.LazyFunction(lambda: timezone.now() - timedelta(days=1)), is_sent=False
        )
