"""
Unit tests for sales domain serializers.

Tests:
- EventQuoteSerializer (full quote serialization)
- ClientEventQuoteSerializer (client-safe serialization)
- QuoteTemplateSerializer (template serialization with products)
- QuoteLineItemSerializer (line item fields)
- QuoteOptionSerializer (option with nested items)
- QuoteActivitySerializer (activity tracking)
"""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

import pytest

from core.domains.sales.models import (
    EventQuote,
    QuoteActivity,
    QuoteLineItem,
    QuoteOption,
    QuoteOptionItem,
    QuoteReminder,
    QuoteTemplate,
    QuoteTemplateProduct,
)
from core.domains.sales.serializers import (
    ClientEventQuoteSerializer,
    EventQuoteSerializer,
    QuoteActivitySerializer,
    QuoteLineItemSerializer,
    QuoteOptionItemSerializer,
    QuoteOptionSerializer,
    QuoteReminderSerializer,
    QuoteTemplateProductSerializer,
    QuoteTemplateSerializer,
)


@pytest.fixture
def product_category(db):
    """Create a product category for testing."""
    from core.domains.products.models import ProductCategory

    return ProductCategory.objects.create(
        name="Test Category", slug="test-category", description="Test category description", is_active=True
    )


@pytest.fixture
def product_option(db, product_category):
    """Create a product option for testing."""
    from core.domains.products.models import ProductOption

    return ProductOption.objects.create(
        name="Test Package",
        description="Test package description",
        category=product_category,
        base_price=Decimal("5000.00"),
        type="PACKAGE",
        is_active=True,
    )


@pytest.fixture
def quote_with_items(db, event_factory, user_factory, product_option):
    """Create a quote with line items for testing."""
    event = event_factory()
    admin_user = user_factory(admin=True)

    quote = EventQuote.objects.create(
        event=event,
        version=1,
        status="SENT",
        subtotal=Decimal("5000.00"),
        tax_amount=Decimal("600.00"),
        service_charge_amount=Decimal("250.00"),
        discount_amount=Decimal("0.00"),
        total_amount=Decimal("5850.00"),
        valid_until=timezone.now().date() + timedelta(days=30),
        sent_at=timezone.now(),
        created_by=admin_user,
        notes="Test quote notes",
        terms_and_conditions="Standard terms",
        client_message="Thank you for your interest",
    )

    # Add line item
    QuoteLineItem.objects.create(
        quote=quote,
        description="Test Package",
        quantity=1,
        unit_price=Decimal("5000.00"),
        tax_rate=Decimal("12.00"),
        total=Decimal("5000.00"),
        product=product_option,
        item_type="PACKAGE",
        base_unit_price=Decimal("5000.00"),
        excess_hours=0,
        excess_cost=Decimal("0.00"),
    )

    # Add activity
    QuoteActivity.objects.create(quote=quote, action="CREATED", action_by=admin_user, notes="Quote created")
    QuoteActivity.objects.create(quote=quote, action="SENT", action_by=admin_user, notes="Quote sent to client")

    return quote


@pytest.fixture
def quote_with_options(db, event_factory, user_factory, product_option):
    """Create a quote with options for testing."""
    event = event_factory()
    admin_user = user_factory(admin=True)

    quote = EventQuote.objects.create(
        event=event,
        version=1,
        status="SENT",
        subtotal=Decimal("10000.00"),
        total_amount=Decimal("10000.00"),
        valid_until=timezone.now().date() + timedelta(days=30),
        sent_at=timezone.now(),
        created_by=admin_user,
    )

    # Add options
    option1 = QuoteOption.objects.create(
        quote=quote,
        name="Basic Package",
        description="Basic event package",
        total_price=Decimal("10000.00"),
        is_selected=True,
    )
    QuoteOptionItem.objects.create(
        option=option1,
        description="Venue Rental",
        quantity=1,
        unit_price=Decimal("8000.00"),
        total=Decimal("8000.00"),
        product=product_option,
    )
    QuoteOptionItem.objects.create(
        option=option1, description="Catering", quantity=1, unit_price=Decimal("2000.00"), total=Decimal("2000.00")
    )

    option2 = QuoteOption.objects.create(
        quote=quote,
        name="Premium Package",
        description="Premium event package",
        total_price=Decimal("15000.00"),
        is_selected=False,
    )
    QuoteOptionItem.objects.create(
        option=option2,
        description="Venue Rental",
        quantity=1,
        unit_price=Decimal("10000.00"),
        total=Decimal("10000.00"),
        product=product_option,
    )

    return quote


@pytest.mark.django_db
class TestEventQuoteSerializer:
    """Tests for EventQuoteSerializer."""

    def test_serialize_quote_basic_fields(self, quote_with_items):
        """Test serializing basic quote fields."""
        serializer = EventQuoteSerializer(quote_with_items)
        data = serializer.data

        assert data["id"] == quote_with_items.id
        assert data["version"] == 1
        assert data["status"] == "SENT"
        assert data["status_display"] == "Sent"
        assert data["subtotal"] == "5000.00"
        assert data["tax_amount"] == "600.00"
        assert data["service_charge_amount"] == "250.00"
        assert data["total_amount"] == "5850.00"

    def test_serialize_quote_event_details(self, quote_with_items):
        """Test that event details are serialized correctly."""
        serializer = EventQuoteSerializer(quote_with_items)
        data = serializer.data

        assert "event_details" in data
        event_details = data["event_details"]
        assert event_details["id"] == quote_with_items.event.id
        assert event_details["name"] == quote_with_items.event.name
        assert "client_name" in event_details
        assert "client_email" in event_details
        assert "start_date" in event_details
        assert "status" in event_details

    def test_serialize_quote_line_items(self, quote_with_items):
        """Test that line items are serialized as nested objects."""
        serializer = EventQuoteSerializer(quote_with_items)
        data = serializer.data

        assert "line_items" in data
        assert len(data["line_items"]) == 1

        line_item = data["line_items"][0]
        assert line_item["description"] == "Test Package"
        assert line_item["quantity"] == 1
        assert line_item["unit_price"] == "5000.00"
        assert line_item["item_type"] == "PACKAGE"

    def test_serialize_quote_activities(self, quote_with_items):
        """Test that activities are serialized."""
        serializer = EventQuoteSerializer(quote_with_items)
        data = serializer.data

        assert "activities" in data
        assert len(data["activities"]) == 2
        # Most recent first (SENT, then CREATED based on ordering)
        assert data["activities"][0]["action"] == "SENT"

    def test_serialize_quote_options(self, quote_with_options):
        """Test that options are serialized with nested items."""
        serializer = EventQuoteSerializer(quote_with_options)
        data = serializer.data

        assert "options" in data
        assert len(data["options"]) == 2

        # Find the selected option
        basic_option = next(o for o in data["options"] if o["name"] == "Basic Package")
        assert basic_option["is_selected"] is True
        assert basic_option["total_price"] == "10000.00"
        assert "items" in basic_option
        assert len(basic_option["items"]) == 2

    def test_serialize_quote_timestamps(self, quote_with_items):
        """Test that timestamps are serialized."""
        serializer = EventQuoteSerializer(quote_with_items)
        data = serializer.data

        assert "created_at" in data
        assert "updated_at" in data
        assert "sent_at" in data
        assert "valid_until" in data

    def test_serialize_quote_text_fields(self, quote_with_items):
        """Test serialization of text fields."""
        serializer = EventQuoteSerializer(quote_with_items)
        data = serializer.data

        assert data["notes"] == "Test quote notes"
        assert data["terms_and_conditions"] == "Standard terms"
        assert data["client_message"] == "Thank you for your interest"


@pytest.mark.django_db
class TestClientEventQuoteSerializer:
    """Tests for ClientEventQuoteSerializer (client-safe serialization)."""

    def test_serialize_client_quote_basic_fields(self, quote_with_items):
        """Test client serializer includes necessary fields."""
        serializer = ClientEventQuoteSerializer(quote_with_items)
        data = serializer.data

        assert data["id"] == quote_with_items.id
        assert data["version"] == 1
        assert data["status"] == "SENT"
        assert data["status_display"] == "Sent"
        assert "subtotal" in data
        assert "tax_amount" in data
        assert "total_amount" in data

    def test_client_serializer_excludes_admin_fields(self, quote_with_items):
        """Test that client serializer excludes admin-only fields."""
        serializer = ClientEventQuoteSerializer(quote_with_items)
        data = serializer.data

        # Admin-only fields should not be present
        assert "activities" not in data
        assert "template" not in data
        assert "template_details" not in data
        assert "signature_data" not in data

    def test_client_serializer_event_details(self, quote_with_items):
        """Test client event details are limited."""
        serializer = ClientEventQuoteSerializer(quote_with_items)
        data = serializer.data

        assert "event_details" in data
        event_details = data["event_details"]

        # Should have basic event info
        assert "id" in event_details
        assert "name" in event_details
        assert "start_date" in event_details
        assert "end_date" in event_details
        assert "status" in event_details

        # Should NOT have internal details
        assert "client_email" not in event_details

    def test_client_serializer_includes_line_items(self, quote_with_items):
        """Test that line items are included for client viewing."""
        serializer = ClientEventQuoteSerializer(quote_with_items)
        data = serializer.data

        assert "line_items" in data
        assert len(data["line_items"]) == 1

    def test_client_serializer_includes_options(self, quote_with_options):
        """Test that options are included for client viewing."""
        serializer = ClientEventQuoteSerializer(quote_with_options)
        data = serializer.data

        assert "options" in data
        assert len(data["options"]) == 2

    def test_client_serializer_notes_readonly(self, quote_with_items):
        """Test that notes are exposed but read-only."""
        serializer = ClientEventQuoteSerializer(quote_with_items)
        data = serializer.data

        assert "notes" in data
        assert data["notes"] == "Test quote notes"

        # Check read_only_fields
        assert "notes" in serializer.Meta.read_only_fields


@pytest.mark.django_db
class TestQuoteTemplateSerializer:
    """Tests for QuoteTemplateSerializer."""

    def test_serialize_template_basic_fields(self, db, event_type_factory):
        """Test serializing template basic fields."""
        event_type = event_type_factory()
        template = QuoteTemplate.objects.create(
            name="Wedding Template",
            introduction="Welcome to our wedding package",
            event_type=event_type,
            terms_and_conditions="Standard terms apply",
            is_active=True,
        )

        serializer = QuoteTemplateSerializer(template)
        data = serializer.data

        assert data["id"] == template.id
        assert data["name"] == "Wedding Template"
        assert data["introduction"] == "Welcome to our wedding package"
        assert data["event_type"] == event_type.id
        assert data["event_type_name"] == event_type.name
        assert data["is_active"] is True

    def test_serialize_template_products(self, db, event_type_factory, product_option):
        """Test that template products are serialized via method field."""
        event_type = event_type_factory()
        template = QuoteTemplate.objects.create(
            name="Test Template", event_type=event_type, terms_and_conditions="", is_active=True
        )

        QuoteTemplateProduct.objects.create(template=template, product=product_option, quantity=2, is_required=True)

        serializer = QuoteTemplateSerializer(template)
        data = serializer.data

        assert "products" in data
        assert len(data["products"]) == 1
        assert data["products"][0]["quantity"] == 2
        assert data["products"][0]["is_required"] is True

    def test_serialize_template_timestamps(self, db):
        """Test that timestamps are included."""
        template = QuoteTemplate.objects.create(name="Test Template", terms_and_conditions="", is_active=True)

        serializer = QuoteTemplateSerializer(template)
        data = serializer.data

        assert "created_at" in data
        assert "updated_at" in data


@pytest.mark.django_db
class TestQuoteTemplateProductSerializer:
    """Tests for QuoteTemplateProductSerializer."""

    def test_serialize_template_product(self, db, product_option):
        """Test serializing a template product."""
        template = QuoteTemplate.objects.create(name="Test Template", terms_and_conditions="", is_active=True)

        template_product = QuoteTemplateProduct.objects.create(
            template=template, product=product_option, quantity=3, is_required=False
        )

        serializer = QuoteTemplateProductSerializer(template_product)
        data = serializer.data

        assert data["id"] == template_product.id
        assert data["template"] == template.id
        assert data["product"] == product_option.id
        assert data["quantity"] == 3
        assert data["is_required"] is False

    def test_serialize_template_product_with_details(self, db, product_option):
        """Test that product_details are included."""
        template = QuoteTemplate.objects.create(name="Test Template", terms_and_conditions="", is_active=True)

        template_product = QuoteTemplateProduct.objects.create(template=template, product=product_option, quantity=1)

        serializer = QuoteTemplateProductSerializer(template_product)
        data = serializer.data

        assert "product_details" in data
        assert data["product_details"]["name"] == product_option.name
        assert data["product_details"]["base_price"] == str(product_option.base_price)


@pytest.mark.django_db
class TestQuoteLineItemSerializer:
    """Tests for QuoteLineItemSerializer."""

    def test_serialize_line_item_basic_fields(self, db, event_factory, user_factory, product_option):
        """Test serializing line item basic fields."""
        event = event_factory()
        admin_user = user_factory(admin=True)

        quote = EventQuote.objects.create(
            event=event,
            version=1,
            status="DRAFT",
            total_amount=Decimal("5000.00"),
            valid_until=timezone.now().date() + timedelta(days=30),
            created_by=admin_user,
        )

        line_item = QuoteLineItem.objects.create(
            quote=quote,
            description="Venue Rental",
            quantity=1,
            unit_price=Decimal("5000.00"),
            tax_rate=Decimal("12.00"),
            total=Decimal("5000.00"),
            product=product_option,
        )

        serializer = QuoteLineItemSerializer(line_item)
        data = serializer.data

        assert data["id"] == line_item.id
        assert data["quote"] == quote.id
        assert data["description"] == "Venue Rental"
        assert data["quantity"] == 1
        assert data["unit_price"] == "5000.00"
        assert data["tax_rate"] == "12.00"
        assert data["total"] == "5000.00"
        assert data["product"] == product_option.id

    def test_serialize_line_item_excess_hours_fields(self, db, event_factory, user_factory):
        """Test serializing excess hours pricing fields."""
        event = event_factory()
        admin_user = user_factory(admin=True)

        quote = EventQuote.objects.create(
            event=event,
            version=1,
            status="DRAFT",
            total_amount=Decimal("6500.00"),
            valid_until=timezone.now().date() + timedelta(days=30),
            created_by=admin_user,
        )

        line_item = QuoteLineItem.objects.create(
            quote=quote,
            description="Package with Extra Hours",
            quantity=1,
            unit_price=Decimal("6500.00"),
            total=Decimal("6500.00"),
            item_type="PACKAGE",
            base_unit_price=Decimal("5000.00"),
            excess_hours=3,
            excess_hour_price=Decimal("500.00"),
            excess_cost=Decimal("1500.00"),
        )

        serializer = QuoteLineItemSerializer(line_item)
        data = serializer.data

        assert data["item_type"] == "PACKAGE"
        assert data["base_unit_price"] == "5000.00"
        assert data["excess_hours"] == 3
        assert data["excess_hour_price"] == "500.00"
        assert data["excess_cost"] == "1500.00"

    def test_serialize_line_item_venue_breakdown(self, db, event_factory, user_factory):
        """Test serializing venue hours breakdown."""
        event = event_factory()
        admin_user = user_factory(admin=True)

        quote = EventQuote.objects.create(
            event=event,
            version=1,
            status="DRAFT",
            total_amount=Decimal("7000.00"),
            valid_until=timezone.now().date() + timedelta(days=30),
            created_by=admin_user,
        )

        breakdown = [
            {
                "venue_id": 1,
                "venue_name": "Main Hall",
                "included_hours": 4,
                "additional_hours": 2,
                "excess_hour_price": 500,
                "venue_cost": 1000,
            },
            {
                "venue_id": 2,
                "venue_name": "Garden",
                "included_hours": 2,
                "additional_hours": 2,
                "excess_hour_price": 500,
                "venue_cost": 1000,
            },
        ]

        line_item = QuoteLineItem.objects.create(
            quote=quote,
            description="Multi-Venue Package",
            quantity=1,
            unit_price=Decimal("7000.00"),
            total=Decimal("7000.00"),
            venue_hours_breakdown=breakdown,
        )

        serializer = QuoteLineItemSerializer(line_item)
        data = serializer.data

        assert "venue_hours_breakdown" in data
        assert len(data["venue_hours_breakdown"]) == 2
        assert data["venue_hours_breakdown"][0]["venue_name"] == "Main Hall"

    def test_line_item_serializer_write_only_field(self):
        """Test that venue_additional_hours is write-only."""
        serializer = QuoteLineItemSerializer()
        fields = serializer.get_fields()

        # venue_additional_hours should exist but be write-only
        assert "venue_additional_hours" in fields
        assert fields["venue_additional_hours"].write_only is True


@pytest.mark.django_db
class TestQuoteOptionSerializer:
    """Tests for QuoteOptionSerializer."""

    def test_serialize_option_basic_fields(self, quote_with_options):
        """Test serializing option basic fields."""
        option = quote_with_options.options.get(name="Basic Package")
        serializer = QuoteOptionSerializer(option)
        data = serializer.data

        assert data["id"] == option.id
        assert data["name"] == "Basic Package"
        assert data["description"] == "Basic event package"
        assert data["total_price"] == "10000.00"
        assert data["is_selected"] is True

    def test_serialize_option_items(self, quote_with_options):
        """Test that option items are nested."""
        option = quote_with_options.options.get(name="Basic Package")
        serializer = QuoteOptionSerializer(option)
        data = serializer.data

        assert "items" in data
        assert len(data["items"]) == 2

        # Check item details
        venue_item = next(i for i in data["items"] if i["description"] == "Venue Rental")
        assert venue_item["quantity"] == 1
        assert venue_item["unit_price"] == "8000.00"


@pytest.mark.django_db
class TestQuoteOptionItemSerializer:
    """Tests for QuoteOptionItemSerializer."""

    def test_serialize_option_item(self, quote_with_options, product_option):
        """Test serializing option item."""
        option = quote_with_options.options.get(name="Basic Package")
        item = option.items.get(description="Venue Rental")

        serializer = QuoteOptionItemSerializer(item)
        data = serializer.data

        assert data["id"] == item.id
        assert data["option"] == option.id
        assert data["description"] == "Venue Rental"
        assert data["quantity"] == 1
        assert data["unit_price"] == "8000.00"
        assert data["total"] == "8000.00"
        assert data["product"] == product_option.id


@pytest.mark.django_db
class TestQuoteActivitySerializer:
    """Tests for QuoteActivitySerializer."""

    def test_serialize_activity(self, quote_with_items):
        """Test serializing activity."""
        activity = quote_with_items.activities.first()
        serializer = QuoteActivitySerializer(activity)
        data = serializer.data

        assert data["id"] == activity.id
        assert data["quote"] == quote_with_items.id
        assert data["action"] in ["CREATED", "SENT"]
        assert "action_by" in data
        assert "action_by_name" in data
        assert "notes" in data
        assert "created_at" in data


@pytest.mark.django_db
class TestQuoteReminderSerializer:
    """Tests for QuoteReminderSerializer."""

    def test_serialize_reminder(self, db, event_factory, user_factory):
        """Test serializing reminder."""
        event = event_factory()
        admin_user = user_factory(admin=True)

        quote = EventQuote.objects.create(
            event=event,
            version=1,
            status="SENT",
            total_amount=Decimal("5000.00"),
            valid_until=timezone.now().date() + timedelta(days=30),
            created_by=admin_user,
        )

        reminder = QuoteReminder.objects.create(
            quote=quote, scheduled_date=timezone.now() + timedelta(days=3), is_sent=False, message="Follow up on quote"
        )

        serializer = QuoteReminderSerializer(reminder)
        data = serializer.data

        assert data["id"] == reminder.id
        assert data["quote"] == quote.id
        assert "scheduled_date" in data
        assert data["is_sent"] is False
        assert data["sent_at"] is None
        assert data["message"] == "Follow up on quote"


@pytest.mark.django_db
class TestSerializerValidation:
    """Tests for serializer validation."""

    def test_event_quote_serializer_read_only_fields(self):
        """Test that certain fields are read-only."""
        serializer = EventQuoteSerializer()

        read_only = serializer.Meta.read_only_fields
        assert "id" in read_only
        assert "version" in read_only
        assert "created_at" in read_only
        assert "updated_at" in read_only

    def test_client_quote_serializer_read_only_fields(self):
        """Test client serializer has more read-only fields."""
        serializer = ClientEventQuoteSerializer()

        read_only = serializer.Meta.read_only_fields
        assert "id" in read_only
        assert "version" in read_only
        assert "subtotal" in read_only
        assert "tax_amount" in read_only
        assert "total_amount" in read_only
        assert "notes" in read_only
        assert "client_message" in read_only

    def test_line_item_serializer_read_only_fields(self):
        """Test line item serializer read-only fields."""
        serializer = QuoteLineItemSerializer()

        read_only = serializer.Meta.read_only_fields
        assert "id" in read_only
        assert "created_at" in read_only
        assert "updated_at" in read_only
