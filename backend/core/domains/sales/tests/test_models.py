"""
Unit tests for sales domain models.

Tests:
- EventQuote model (status transitions, accept/reject, versioning)
- QuoteTemplate model (apply_to_event functionality)
- QuoteLineItem model (auto-calculation, pricing fields)
- QuoteOption model (pricing calculation)
- QuoteActivity model (action tracking)
- QuoteReminder model (scheduling)
"""

import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from freezegun import freeze_time
from unittest.mock import patch, MagicMock

from core.domains.sales.models import (
    EventQuote,
    QuoteTemplate,
    QuoteTemplateProduct,
    QuoteLineItem,
    QuoteOption,
    QuoteOptionItem,
    QuoteActivity,
    QuoteReminder,
)


@pytest.fixture
def product_category(db):
    """Create a product category for testing."""
    from core.domains.products.models import ProductCategory
    return ProductCategory.objects.create(
        name='Test Category',
        slug='test-category',
        description='Test category description',
        is_active=True
    )


@pytest.fixture
def product_option(db, product_category):
    """Create a product option for testing."""
    from core.domains.products.models import ProductOption
    return ProductOption.objects.create(
        name='Test Package',
        description='Test package description',
        category=product_category,
        base_price=Decimal('5000.00'),
        type='PACKAGE',
        is_active=True
    )


@pytest.fixture
def default_tax_rate(db):
    """Create a default tax rate."""
    from core.domains.payments.models import TaxRate
    return TaxRate.objects.create(
        name='VAT',
        rate=Decimal('12.00'),
        is_default=True
    )


@pytest.fixture
def quote(db, event_factory, user_factory):
    """Create a basic event quote."""
    event = event_factory()
    admin_user = user_factory(admin=True)
    return EventQuote.objects.create(
        event=event,
        version=1,
        status='DRAFT',
        total_amount=Decimal('5000.00'),
        valid_until=timezone.now().date() + timedelta(days=30),
        created_by=admin_user
    )


@pytest.fixture
def sent_quote(db, event_factory, user_factory):
    """Create a quote in SENT status."""
    event = event_factory()
    admin_user = user_factory(admin=True)
    return EventQuote.objects.create(
        event=event,
        version=1,
        status='SENT',
        total_amount=Decimal('5000.00'),
        valid_until=timezone.now().date() + timedelta(days=30),
        sent_at=timezone.now(),
        created_by=admin_user
    )


@pytest.mark.django_db
class TestEventQuoteModel:
    """Unit tests for the EventQuote model."""

    def test_create_quote_with_required_fields(self, event_factory, user_factory):
        """Test creating a quote with minimum required fields."""
        event = event_factory()
        admin_user = user_factory(admin=True)

        quote = EventQuote.objects.create(
            event=event,
            version=1,
            status='DRAFT',
            total_amount=Decimal('5000.00'),
            valid_until=timezone.now().date() + timedelta(days=30),
            created_by=admin_user
        )

        assert quote.id is not None
        assert quote.event == event
        assert quote.version == 1
        assert quote.status == 'DRAFT'
        assert quote.total_amount == Decimal('5000.00')

    def test_quote_string_representation(self, quote):
        """Test EventQuote __str__ returns informative string."""
        expected = f"Quote {quote.version} for Event {quote.event.id}"
        assert str(quote) == expected

    def test_quote_default_values(self, quote):
        """Test default values for optional fields."""
        assert quote.subtotal == Decimal('0')
        assert quote.tax_amount == Decimal('0')
        assert quote.service_charge_amount == Decimal('0')
        assert quote.discount_amount == Decimal('0')
        assert quote.notes == ''
        assert quote.terms_and_conditions == ''
        assert quote.client_message == ''
        assert quote.signature_data == ''

    def test_quote_unique_together_constraint(self, quote):
        """Test that event + version must be unique."""
        with pytest.raises(Exception):  # IntegrityError
            EventQuote.objects.create(
                event=quote.event,
                version=1,  # Same version for same event
                status='DRAFT',
                total_amount=Decimal('6000.00'),
                valid_until=timezone.now().date() + timedelta(days=30),
                created_by=quote.created_by
            )

    def test_quote_ordering(self, event_factory, user_factory):
        """Test quotes are ordered by created_at desc, then version desc."""
        event = event_factory()
        admin_user = user_factory(admin=True)
        valid_until = timezone.now().date() + timedelta(days=30)

        # Create quotes with different versions
        q1 = EventQuote.objects.create(
            event=event, version=1, status='DRAFT',
            total_amount=Decimal('5000.00'),
            valid_until=valid_until, created_by=admin_user
        )
        q2 = EventQuote.objects.create(
            event=event, version=2, status='DRAFT',
            total_amount=Decimal('5500.00'),
            valid_until=valid_until, created_by=admin_user
        )

        quotes = list(EventQuote.objects.filter(event=event))
        # Most recent first
        assert quotes[0] == q2
        assert quotes[1] == q1


@pytest.mark.django_db
class TestEventQuoteAcceptMethod:
    """Tests for the EventQuote.accept() method."""

    @patch('core.domains.sales.models.QuoteActivity')
    def test_accept_quote_from_sent_status(self, mock_activity, sent_quote):
        """Test accepting a quote in SENT status."""
        sent_quote.accept(signature_data='test-signature')

        sent_quote.refresh_from_db()
        assert sent_quote.status == 'ACCEPTED'
        assert sent_quote.accepted_at is not None
        assert sent_quote.signature_data == 'test-signature'

    def test_accept_quote_updates_event(self, sent_quote):
        """Test accepting a quote updates the event status."""
        sent_quote.accept()

        sent_quote.event.refresh_from_db()
        assert sent_quote.event.status == 'CONFIRMED'
        assert sent_quote.event.accepted_quote == sent_quote

    def test_accept_quote_from_draft_raises_error(self, quote):
        """Test that accepting a DRAFT quote raises ValueError."""
        with pytest.raises(ValueError, match="Cannot accept quote with status 'DRAFT'"):
            quote.accept()

    def test_accept_quote_from_accepted_raises_error(self, sent_quote):
        """Test that accepting an already ACCEPTED quote raises ValueError."""
        # First acceptance
        sent_quote.accept()

        # Second attempt should fail
        with pytest.raises(ValueError, match="Cannot accept quote with status 'ACCEPTED'"):
            sent_quote.accept()

    def test_accept_expired_quote_raises_error(self, event_factory, user_factory):
        """Test that accepting an expired quote raises ValueError."""
        event = event_factory()
        admin_user = user_factory(admin=True)

        expired_quote = EventQuote.objects.create(
            event=event,
            version=1,
            status='SENT',
            total_amount=Decimal('5000.00'),
            valid_until=timezone.now().date() - timedelta(days=1),  # Expired yesterday
            sent_at=timezone.now() - timedelta(days=10),
            created_by=admin_user
        )

        with pytest.raises(ValueError, match="Cannot accept expired quote"):
            expired_quote.accept()

    def test_accept_creates_activity_record(self, sent_quote):
        """Test that accepting a quote creates an activity record."""
        sent_quote.accept()

        activities = QuoteActivity.objects.filter(quote=sent_quote, action='ACCEPTED')
        assert activities.exists()
        assert activities.first().action_by == sent_quote.event.client


@pytest.mark.django_db
class TestEventQuoteRejectMethod:
    """Tests for the EventQuote.reject() method."""

    def test_reject_quote_from_sent_status(self, sent_quote):
        """Test rejecting a quote in SENT status."""
        sent_quote.reject(reason='Too expensive')

        sent_quote.refresh_from_db()
        assert sent_quote.status == 'REJECTED'
        assert sent_quote.rejected_at is not None
        assert sent_quote.rejection_reason == 'Too expensive'

    def test_reject_quote_from_draft_raises_error(self, quote):
        """Test that rejecting a DRAFT quote raises ValueError."""
        with pytest.raises(ValueError, match="Cannot reject quote with status 'DRAFT'"):
            quote.reject(reason='Not interested')

    def test_reject_quote_from_accepted_raises_error(self, sent_quote):
        """Test that rejecting an ACCEPTED quote raises ValueError."""
        sent_quote.accept()

        with pytest.raises(ValueError, match="Cannot reject quote with status 'ACCEPTED'"):
            sent_quote.reject(reason='Changed mind')

    def test_reject_creates_activity_record(self, sent_quote):
        """Test that rejecting a quote creates an activity record."""
        sent_quote.reject(reason='Budget constraints')

        activities = QuoteActivity.objects.filter(quote=sent_quote, action='REJECTED')
        assert activities.exists()


@pytest.mark.django_db
class TestEventQuoteSendMethod:
    """Tests for the EventQuote.send_to_client() method."""

    @patch('core.domains.communications.services.CommunicationService')
    @patch('core.domains.communications.context_service.CommunicationContextService')
    def test_send_quote_updates_status(self, mock_context, mock_comm, quote, user_factory):
        """Test sending a quote updates status to SENT."""
        admin_user = user_factory(admin=True)

        quote.send_to_client(user=admin_user)

        quote.refresh_from_db()
        assert quote.status == 'SENT'
        assert quote.sent_at is not None

    @patch('core.domains.communications.services.CommunicationService')
    @patch('core.domains.communications.context_service.CommunicationContextService')
    def test_send_quote_creates_activity_record(self, mock_context, mock_comm, quote, user_factory):
        """Test sending a quote creates an activity record."""
        admin_user = user_factory(admin=True)

        quote.send_to_client(user=admin_user)

        activities = QuoteActivity.objects.filter(quote=quote, action='SENT')
        assert activities.exists()
        assert activities.first().action_by == admin_user

    @patch('core.domains.communications.services.CommunicationService')
    @patch('core.domains.communications.context_service.CommunicationContextService')
    def test_send_quote_creates_reminder(self, mock_context, mock_comm, quote, user_factory):
        """Test sending a quote creates a follow-up reminder."""
        admin_user = user_factory(admin=True)

        quote.send_to_client(user=admin_user)

        reminders = QuoteReminder.objects.filter(quote=quote)
        assert reminders.exists()
        # Reminder should be 3 days after sending
        reminder = reminders.first()
        assert reminder.scheduled_date.date() >= quote.sent_at.date() + timedelta(days=3)


@pytest.mark.django_db
class TestEventQuoteVersioning:
    """Tests for the EventQuote.create_next_version() method."""

    def test_create_next_version_increments_version(self, quote):
        """Test creating next version increments version number."""
        new_quote = quote.create_next_version()

        assert new_quote.version == quote.version + 1
        assert new_quote.event == quote.event

    def test_create_next_version_sets_draft_status(self, quote):
        """Test new version is in DRAFT status."""
        new_quote = quote.create_next_version()

        assert new_quote.status == 'DRAFT'

    def test_create_next_version_copies_basic_fields(self, quote):
        """Test new version copies basic fields from original."""
        quote.terms_and_conditions = 'Test terms'
        quote.notes = 'Test notes'
        quote.save()

        new_quote = quote.create_next_version()

        assert new_quote.terms_and_conditions == quote.terms_and_conditions
        assert new_quote.notes == quote.notes
        assert new_quote.total_amount == quote.total_amount

    def test_create_next_version_copies_line_items(self, quote, product_option):
        """Test new version copies line items."""
        line_item = QuoteLineItem.objects.create(
            quote=quote,
            description='Test Item',
            quantity=2,
            unit_price=Decimal('1000.00'),
            total=Decimal('2000.00'),
            product=product_option
        )

        new_quote = quote.create_next_version()

        assert new_quote.line_items.count() == 1
        new_item = new_quote.line_items.first()
        assert new_item.description == line_item.description
        assert new_item.quantity == line_item.quantity
        assert new_item.unit_price == line_item.unit_price

    def test_create_next_version_copies_options(self, quote):
        """Test new version copies quote options."""
        option = QuoteOption.objects.create(
            quote=quote,
            name='Premium Option',
            description='Premium package',
            total_price=Decimal('10000.00'),
            is_selected=True
        )

        new_quote = quote.create_next_version()

        assert new_quote.options.count() == 1
        new_option = new_quote.options.first()
        assert new_option.name == option.name
        assert new_option.total_price == option.total_price

    def test_create_next_version_creates_activity_record(self, quote):
        """Test creating new version creates activity record."""
        new_quote = quote.create_next_version()

        activities = QuoteActivity.objects.filter(quote=new_quote, action='CREATED')
        assert activities.exists()
        assert 'New version' in activities.first().notes


@pytest.mark.django_db
class TestQuoteTemplateModel:
    """Unit tests for the QuoteTemplate model."""

    def test_create_quote_template(self, db, event_type_factory):
        """Test creating a quote template."""
        event_type = event_type_factory()

        template = QuoteTemplate.objects.create(
            name='Wedding Package Template',
            event_type=event_type,
            terms_and_conditions='Standard T&C',
            is_active=True,
            default_validity_days=30
        )

        assert template.id is not None
        assert template.name == 'Wedding Package Template'
        assert template.event_type == event_type

    def test_template_string_representation(self, db):
        """Test QuoteTemplate __str__ returns name."""
        template = QuoteTemplate.objects.create(
            name='Test Template',
            terms_and_conditions='',
            is_active=True
        )

        assert str(template) == 'Test Template'

    def test_template_apply_to_event(
        self, db, event_factory, user_factory, product_option, default_tax_rate
    ):
        """Test applying a template to an event creates a quote."""
        event = event_factory()
        admin_user = user_factory(admin=True)

        template = QuoteTemplate.objects.create(
            name='Test Template',
            terms_and_conditions='Template T&C',
            is_active=True,
            default_validity_days=14
        )

        # Add product to template
        QuoteTemplateProduct.objects.create(
            template=template,
            product=product_option,
            quantity=1,
            is_required=True
        )

        quote = template.apply_to_event(event, created_by=admin_user)

        assert quote is not None
        assert quote.event == event
        assert quote.template == template
        assert quote.version == 1
        assert quote.status == 'DRAFT'
        assert quote.terms_and_conditions == 'Template T&C'
        assert quote.created_by == admin_user

    def test_template_apply_creates_line_items(
        self, db, event_factory, user_factory, product_option, default_tax_rate
    ):
        """Test applying template creates line items from products."""
        event = event_factory()
        admin_user = user_factory(admin=True)

        template = QuoteTemplate.objects.create(
            name='Test Template',
            terms_and_conditions='',
            is_active=True
        )

        QuoteTemplateProduct.objects.create(
            template=template,
            product=product_option,
            quantity=2,
            is_required=True
        )

        quote = template.apply_to_event(event, created_by=admin_user)

        assert quote.line_items.count() == 1
        line_item = quote.line_items.first()
        assert line_item.description == product_option.name
        assert line_item.quantity == 2
        assert line_item.unit_price == product_option.base_price

    def test_template_apply_calculates_totals(
        self, db, event_factory, user_factory, product_option, default_tax_rate
    ):
        """Test applying template calculates quote totals."""
        event = event_factory()
        admin_user = user_factory(admin=True)

        template = QuoteTemplate.objects.create(
            name='Test Template',
            terms_and_conditions='',
            is_active=True,
            default_tax_rate=default_tax_rate
        )

        QuoteTemplateProduct.objects.create(
            template=template,
            product=product_option,
            quantity=1,
            is_required=True
        )

        quote = template.apply_to_event(event, created_by=admin_user)

        # Subtotal should be product price * quantity
        expected_subtotal = product_option.base_price * 1
        assert quote.subtotal == expected_subtotal
        assert quote.total_amount > 0

    def test_template_apply_bounds_validity_by_event_date(
        self, db, event_factory, user_factory
    ):
        """Test that quote validity is bounded by event date."""
        # Create event 10 days from now
        event = event_factory(
            start_date=timezone.now() + timedelta(days=10)
        )
        admin_user = user_factory(admin=True)

        template = QuoteTemplate.objects.create(
            name='Test Template',
            terms_and_conditions='',
            is_active=True,
            default_validity_days=30  # Default would be 30 days
        )

        quote = template.apply_to_event(event, created_by=admin_user)

        # Quote validity should be at most event_date - 1 day
        event_date = event.start_date.date() if hasattr(event.start_date, 'date') else event.start_date
        assert quote.valid_until < event_date


@pytest.mark.django_db
class TestQuoteLineItemModel:
    """Unit tests for the QuoteLineItem model."""

    def test_create_line_item(self, quote):
        """Test creating a quote line item."""
        line_item = QuoteLineItem.objects.create(
            quote=quote,
            description='Test Service',
            quantity=1,
            unit_price=Decimal('1000.00'),
            tax_rate=Decimal('12.00'),
            total=Decimal('1000.00')
        )

        assert line_item.id is not None
        assert line_item.quote == quote
        assert line_item.description == 'Test Service'

    def test_line_item_string_representation(self, quote):
        """Test QuoteLineItem __str__ returns informative string."""
        line_item = QuoteLineItem.objects.create(
            quote=quote,
            description='Venue Rental',
            quantity=1,
            unit_price=Decimal('5000.00'),
            total=Decimal('5000.00')
        )

        assert str(line_item) == f"Venue Rental - Quote {quote.id}"

    def test_line_item_auto_calculates_total(self, quote):
        """Test that total is auto-calculated from quantity * unit_price."""
        line_item = QuoteLineItem(
            quote=quote,
            description='Test Item',
            quantity=3,
            unit_price=Decimal('1000.00')
        )
        line_item.save()

        assert line_item.total == Decimal('3000.00')

    def test_line_item_explicit_total_not_overwritten(self, quote):
        """Test that explicit total is preserved if set."""
        line_item = QuoteLineItem.objects.create(
            quote=quote,
            description='Discounted Item',
            quantity=2,
            unit_price=Decimal('1000.00'),
            total=Decimal('1500.00')  # Explicit discounted total
        )

        # Explicit total should be preserved
        assert line_item.total == Decimal('1500.00')

    def test_line_item_item_type_default(self, quote):
        """Test that default item_type is PACKAGE."""
        line_item = QuoteLineItem.objects.create(
            quote=quote,
            description='Test Item',
            quantity=1,
            unit_price=Decimal('1000.00'),
            total=Decimal('1000.00')
        )

        assert line_item.item_type == 'PACKAGE'

    def test_line_item_excess_hours_fields(self, quote):
        """Test excess hours pricing fields."""
        line_item = QuoteLineItem.objects.create(
            quote=quote,
            description='Package with excess hours',
            quantity=1,
            unit_price=Decimal('6500.00'),
            total=Decimal('6500.00'),
            base_unit_price=Decimal('5000.00'),
            excess_hours=3,
            excess_hour_price=Decimal('500.00'),
            excess_cost=Decimal('1500.00')
        )

        assert line_item.base_unit_price == Decimal('5000.00')
        assert line_item.excess_hours == 3
        assert line_item.excess_hour_price == Decimal('500.00')
        assert line_item.excess_cost == Decimal('1500.00')

    def test_line_item_venue_hours_breakdown(self, quote):
        """Test storing venue hours breakdown as JSON."""
        breakdown = [
            {
                'venue_id': 1,
                'venue_name': 'Main Hall',
                'included_hours': 4,
                'additional_hours': 2,
                'excess_hour_price': 500,
                'venue_cost': 1000
            }
        ]

        line_item = QuoteLineItem.objects.create(
            quote=quote,
            description='Package with venue breakdown',
            quantity=1,
            unit_price=Decimal('6000.00'),
            total=Decimal('6000.00'),
            venue_hours_breakdown=breakdown
        )

        assert line_item.venue_hours_breakdown == breakdown


@pytest.mark.django_db
class TestQuoteOptionModel:
    """Unit tests for the QuoteOption model."""

    def test_create_quote_option(self, quote):
        """Test creating a quote option."""
        option = QuoteOption.objects.create(
            quote=quote,
            name='Premium Package',
            description='All-inclusive premium option',
            total_price=Decimal('15000.00'),
            is_selected=False
        )

        assert option.id is not None
        assert option.name == 'Premium Package'
        assert option.total_price == Decimal('15000.00')

    def test_option_string_representation(self, quote):
        """Test QuoteOption __str__ returns informative string."""
        option = QuoteOption.objects.create(
            quote=quote,
            name='Basic Package',
            description='',
            total_price=Decimal('5000.00')
        )

        assert str(option) == f"Basic Package - Quote {quote.id}"

    def test_option_calculate_total(self, quote, product_option):
        """Test calculate_total method."""
        option = QuoteOption.objects.create(
            quote=quote,
            name='Test Option',
            description='',
            total_price=Decimal('0.00')
        )

        # Add items to option
        QuoteOptionItem.objects.create(
            option=option,
            description='Item 1',
            quantity=2,
            unit_price=Decimal('1000.00'),
            total=Decimal('2000.00'),
            product=product_option
        )
        QuoteOptionItem.objects.create(
            option=option,
            description='Item 2',
            quantity=1,
            unit_price=Decimal('500.00'),
            total=Decimal('500.00'),
            product=None
        )

        option.calculate_total()
        option.refresh_from_db()

        assert option.total_price == Decimal('2500.00')


@pytest.mark.django_db
class TestQuoteOptionItemModel:
    """Unit tests for the QuoteOptionItem model."""

    def test_create_option_item(self, quote):
        """Test creating a quote option item."""
        option = QuoteOption.objects.create(
            quote=quote,
            name='Test Option',
            description='',
            total_price=Decimal('0.00')
        )

        item = QuoteOptionItem.objects.create(
            option=option,
            description='Test Service',
            quantity=1,
            unit_price=Decimal('2000.00'),
            total=Decimal('2000.00')
        )

        assert item.id is not None
        assert item.option == option

    def test_option_item_auto_calculates_total(self, quote):
        """Test that total is auto-calculated on save."""
        option = QuoteOption.objects.create(
            quote=quote,
            name='Test Option',
            description='',
            total_price=Decimal('0.00')
        )

        item = QuoteOptionItem(
            option=option,
            description='Test Service',
            quantity=3,
            unit_price=Decimal('1500.00')
        )
        item.save()

        assert item.total == Decimal('4500.00')

    def test_option_item_save_updates_option_total(self, quote):
        """Test that saving option item updates option total."""
        option = QuoteOption.objects.create(
            quote=quote,
            name='Test Option',
            description='',
            total_price=Decimal('0.00')
        )

        QuoteOptionItem.objects.create(
            option=option,
            description='Item 1',
            quantity=1,
            unit_price=Decimal('1000.00'),
            total=Decimal('1000.00')
        )

        option.refresh_from_db()
        assert option.total_price == Decimal('1000.00')


@pytest.mark.django_db
class TestQuoteActivityModel:
    """Unit tests for the QuoteActivity model."""

    def test_create_activity(self, quote, user_factory):
        """Test creating a quote activity."""
        user = user_factory()

        activity = QuoteActivity.objects.create(
            quote=quote,
            action='CREATED',
            action_by=user,
            notes='Quote created for client'
        )

        assert activity.id is not None
        assert activity.action == 'CREATED'
        assert activity.action_by == user

    def test_activity_string_representation(self, quote):
        """Test QuoteActivity __str__ returns informative string."""
        activity = QuoteActivity.objects.create(
            quote=quote,
            action='SENT',
            notes='Quote sent to client'
        )

        assert 'Sent' in str(activity)
        assert str(quote.id) in str(activity)

    def test_activity_ordering(self, quote, user_factory):
        """Test activities are ordered by created_at descending."""
        user = user_factory()

        act1 = QuoteActivity.objects.create(
            quote=quote, action='CREATED', action_by=user
        )
        act2 = QuoteActivity.objects.create(
            quote=quote, action='SENT', action_by=user
        )

        activities = list(QuoteActivity.objects.filter(quote=quote))
        # Most recent first
        assert activities[0] == act2
        assert activities[1] == act1


@pytest.mark.django_db
class TestQuoteReminderModel:
    """Unit tests for the QuoteReminder model."""

    def test_create_reminder(self, quote):
        """Test creating a quote reminder."""
        reminder = QuoteReminder.objects.create(
            quote=quote,
            scheduled_date=timezone.now() + timedelta(days=3),
            message='Follow up on quote'
        )

        assert reminder.id is not None
        assert reminder.is_sent is False

    def test_reminder_string_representation(self, quote):
        """Test QuoteReminder __str__ returns informative string."""
        scheduled = timezone.now() + timedelta(days=3)
        reminder = QuoteReminder.objects.create(
            quote=quote,
            scheduled_date=scheduled,
            message='Follow up'
        )

        assert str(quote.id) in str(reminder)
        assert scheduled.strftime('%Y-%m-%d') in str(reminder)

    def test_reminder_ordering(self, quote):
        """Test reminders are ordered by scheduled_date."""
        reminder1 = QuoteReminder.objects.create(
            quote=quote,
            scheduled_date=timezone.now() + timedelta(days=7),
            message='Later follow up'
        )
        reminder2 = QuoteReminder.objects.create(
            quote=quote,
            scheduled_date=timezone.now() + timedelta(days=3),
            message='Earlier follow up'
        )

        reminders = list(QuoteReminder.objects.filter(quote=quote))
        # Earlier date first
        assert reminders[0] == reminder2
        assert reminders[1] == reminder1


@pytest.mark.django_db
class TestQuoteTemplateProductModel:
    """Unit tests for the QuoteTemplateProduct model."""

    def test_create_template_product(self, db, product_option):
        """Test creating a template product association."""
        template = QuoteTemplate.objects.create(
            name='Test Template',
            terms_and_conditions='',
            is_active=True
        )

        template_product = QuoteTemplateProduct.objects.create(
            template=template,
            product=product_option,
            quantity=2,
            is_required=True
        )

        assert template_product.id is not None
        assert template_product.template == template
        assert template_product.product == product_option

    def test_template_product_string_representation(self, db, product_option):
        """Test QuoteTemplateProduct __str__ returns informative string."""
        template = QuoteTemplate.objects.create(
            name='Wedding Template',
            terms_and_conditions='',
            is_active=True
        )

        template_product = QuoteTemplateProduct.objects.create(
            template=template,
            product=product_option,
            quantity=1
        )

        expected = f"{product_option.name} - {template.name}"
        assert str(template_product) == expected

    def test_template_product_unique_constraint(self, db, product_option):
        """Test that template + product must be unique."""
        template = QuoteTemplate.objects.create(
            name='Test Template',
            terms_and_conditions='',
            is_active=True
        )

        QuoteTemplateProduct.objects.create(
            template=template,
            product=product_option,
            quantity=1
        )

        with pytest.raises(Exception):  # IntegrityError
            QuoteTemplateProduct.objects.create(
                template=template,
                product=product_option,  # Same product again
                quantity=2
            )
