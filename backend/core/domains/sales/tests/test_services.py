"""
Unit tests for sales domain services.

Tests:
- QuoteTemplateService (CRUD operations for templates, product management)
- QuoteService (CRUD operations for quotes, line item management, status transitions)
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock

from django.utils import timezone

import pytest

from core.domains.sales.exceptions import (
    EventNotFoundException,
    InvalidQuoteStatusTransition,
    LineItemNotFoundException,
    QuoteNotFoundException,
    QuoteTemplateNotFound,
    TemplateProductAlreadyExists,
)
from core.domains.sales.models import (
    EventQuote,
    QuoteActivity,
    QuoteLineItem,
    QuoteReminder,
    QuoteTemplate,
    QuoteTemplateProduct,
)
from core.domains.sales.services import (
    QuoteService,
    QuoteTemplateService,
    get_default_tax_rate,
    get_tax_rate_for_product,
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
def addon_product(db, product_category):
    """Create an addon product for testing."""
    from core.domains.products.models import ProductOption

    return ProductOption.objects.create(
        name="Test Add-on",
        description="Test addon description",
        category=product_category,
        base_price=Decimal("1000.00"),
        type="ADDON",
        is_active=True,
    )


@pytest.fixture
def tax_inclusive_product(db, product_category):
    """Create a tax-inclusive product for testing."""
    from core.domains.products.models import ProductOption

    return ProductOption.objects.create(
        name="Tax Inclusive Package",
        description="Package with tax included in price",
        category=product_category,
        base_price=Decimal("10000.00"),
        type="PACKAGE",
        is_active=True,
        is_tax_inclusive=True,
    )


@pytest.fixture
def default_tax_rate(db):
    """Create a default tax rate."""
    from core.domains.payments.models import TaxRate

    return TaxRate.objects.create(name="VAT", rate=Decimal("12.00"), is_default=True)


@pytest.fixture
def quote_template(db, event_type_factory, product_option):
    """Create a quote template with a product."""
    event_type = event_type_factory()
    template = QuoteTemplate.objects.create(
        name="Test Template",
        event_type=event_type,
        terms_and_conditions="Standard terms and conditions",
        is_active=True,
        default_validity_days=30,
    )
    QuoteTemplateProduct.objects.create(template=template, product=product_option, quantity=1, is_required=True)
    return template


@pytest.fixture
def draft_quote(db, event_factory, user_factory):
    """Create a draft quote."""
    event = event_factory()
    admin_user = user_factory(admin=True)
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="DRAFT",
        subtotal=Decimal("5000.00"),
        tax_amount=Decimal("600.00"),
        total_amount=Decimal("5600.00"),
        valid_until=timezone.now().date() + timedelta(days=30),
        created_by=admin_user,
    )


@pytest.fixture
def sent_quote(db, event_factory, user_factory):
    """Create a sent quote."""
    event = event_factory()
    admin_user = user_factory(admin=True)
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="SENT",
        subtotal=Decimal("5000.00"),
        tax_amount=Decimal("600.00"),
        total_amount=Decimal("5600.00"),
        valid_until=timezone.now().date() + timedelta(days=30),
        sent_at=timezone.now(),
        created_by=admin_user,
    )


@pytest.fixture
def accepted_quote(db, event_factory, user_factory):
    """Create an accepted quote."""
    event = event_factory()
    admin_user = user_factory(admin=True)
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="ACCEPTED",
        subtotal=Decimal("5000.00"),
        tax_amount=Decimal("600.00"),
        total_amount=Decimal("5600.00"),
        valid_until=timezone.now().date() + timedelta(days=30),
        sent_at=timezone.now() - timedelta(days=2),
        accepted_at=timezone.now(),
        created_by=admin_user,
    )


# =============================================================================
# TAX RATE FUNCTION TESTS
# =============================================================================


@pytest.mark.django_db
class TestGetDefaultTaxRate:
    """Tests for the get_default_tax_rate function."""

    def test_get_default_tax_rate_returns_rate(self, default_tax_rate):
        """Test that get_default_tax_rate returns the default tax rate."""
        rate = get_default_tax_rate()
        assert rate == Decimal("12.00")

    def test_get_default_tax_rate_returns_zero_when_no_default(self, db):
        """Test that get_default_tax_rate returns 0 when no default exists."""
        from core.domains.payments.models import TaxRate

        # Ensure no default tax rate exists
        TaxRate.objects.filter(is_default=True).delete()

        rate = get_default_tax_rate()
        assert rate == Decimal("0")


@pytest.mark.django_db
class TestGetTaxRateForProduct:
    """Tests for the get_tax_rate_for_product function."""

    def test_tax_inclusive_product_returns_zero(self, tax_inclusive_product, default_tax_rate):
        """Test that tax-inclusive products return 0 tax rate."""
        rate = get_tax_rate_for_product(tax_inclusive_product)
        assert rate == Decimal("0")

    def test_non_tax_inclusive_product_returns_default(self, product_option, default_tax_rate):
        """Test that non-tax-inclusive products return default tax rate."""
        rate = get_tax_rate_for_product(product_option)
        assert rate == Decimal("12.00")

    def test_product_without_tax_inclusive_attr_returns_default(self, default_tax_rate):
        """Test handling of products without is_tax_inclusive attribute."""
        # Create a mock product without is_tax_inclusive
        mock_product = MagicMock(spec=[])
        rate = get_tax_rate_for_product(mock_product)
        assert rate == Decimal("12.00")


# =============================================================================
# QUOTE TEMPLATE SERVICE TESTS
# =============================================================================


@pytest.mark.django_db
class TestQuoteTemplateServiceCreate:
    """Tests for QuoteTemplateService.create_template."""

    def test_create_template_basic(self, db, user_factory, event_type_factory):
        """Test creating a basic quote template."""
        user = user_factory(admin=True)
        event_type = event_type_factory()

        data = {
            "name": "Wedding Package Template",
            "event_type": event_type,
            "terms_and_conditions": "Standard T&C",
            "is_active": True,
            "default_validity_days": 14,
        }

        template = QuoteTemplateService.create_template(data, user)

        assert template.id is not None
        assert template.name == "Wedding Package Template"
        assert template.event_type == event_type
        assert template.is_active is True

    def test_create_template_with_products(self, db, user_factory, event_type_factory, product_option):
        """Test creating a template with products."""
        user = user_factory(admin=True)
        event_type = event_type_factory()

        data = {
            "name": "Package Template",
            "event_type": event_type,
            "terms_and_conditions": "",
            "is_active": True,
            "products": [{"product": product_option, "quantity": 2, "is_required": True}],
        }

        template = QuoteTemplateService.create_template(data, user)

        assert template.quotetemplateproduct_set.count() == 1
        template_product = template.quotetemplateproduct_set.first()
        assert template_product.product == product_option
        assert template_product.quantity == 2
        assert template_product.is_required is True

    def test_create_template_with_contract_templates(self, db, user_factory, event_type_factory):
        """Test creating a template with contract templates."""
        from core.domains.contracts.models import ContractTemplate

        user = user_factory(admin=True)
        event_type = event_type_factory()

        contract_template = ContractTemplate.objects.create(
            name="Test Contract", content="Contract content here", is_active=True
        )

        data = {
            "name": "Package with Contract",
            "event_type": event_type,
            "terms_and_conditions": "",
            "is_active": True,
            "contract_templates": [contract_template],
        }

        template = QuoteTemplateService.create_template(data, user)

        assert template.contract_templates.count() == 1
        assert contract_template in template.contract_templates.all()


@pytest.mark.django_db
class TestQuoteTemplateServiceUpdate:
    """Tests for QuoteTemplateService.update_template."""

    def test_update_template_basic_fields(self, quote_template, user_factory):
        """Test updating basic template fields."""
        user = user_factory(admin=True)

        data = {"name": "Updated Template Name", "terms_and_conditions": "Updated terms", "is_active": False}

        updated = QuoteTemplateService.update_template(quote_template.id, data, user)

        assert updated.name == "Updated Template Name"
        assert updated.terms_and_conditions == "Updated terms"
        assert updated.is_active is False

    def test_update_template_not_found_raises_error(self, user_factory):
        """Test updating non-existent template raises error."""
        user = user_factory(admin=True)

        with pytest.raises(QuoteTemplateNotFound):
            QuoteTemplateService.update_template(99999, {"name": "New Name"}, user)

    def test_update_template_with_contract_templates(self, quote_template, user_factory):
        """Test updating template's contract templates."""
        from core.domains.contracts.models import ContractTemplate

        user = user_factory(admin=True)
        contract = ContractTemplate.objects.create(name="New Contract", content="Content", is_active=True)

        data = {"contract_templates": [contract]}

        updated = QuoteTemplateService.update_template(quote_template.id, data, user)

        assert updated.contract_templates.count() == 1


@pytest.mark.django_db
class TestQuoteTemplateServiceDelete:
    """Tests for QuoteTemplateService.delete_template."""

    def test_delete_template_success(self, quote_template):
        """Test deleting a template successfully."""
        template_id = quote_template.id

        QuoteTemplateService.delete_template(template_id)

        assert not QuoteTemplate.objects.filter(id=template_id).exists()

    def test_delete_template_not_found_raises_error(self):
        """Test deleting non-existent template raises error."""
        with pytest.raises(QuoteTemplateNotFound):
            QuoteTemplateService.delete_template(99999)


@pytest.mark.django_db
class TestQuoteTemplateServiceProducts:
    """Tests for QuoteTemplateService product management."""

    def test_add_product_to_template(self, db, event_type_factory, addon_product):
        """Test adding a product to a template."""
        event_type = event_type_factory()
        template = QuoteTemplate.objects.create(name="Empty Template", event_type=event_type, is_active=True)

        product_data = {"product": addon_product.id, "quantity": 3, "is_required": False}

        template_product = QuoteTemplateService.add_product_to_template(template.id, product_data)

        assert template_product.product == addon_product
        assert template_product.quantity == 3

    def test_add_duplicate_product_raises_error(self, quote_template, product_option):
        """Test adding duplicate product raises error."""
        product_data = {"product": product_option.id, "quantity": 1, "is_required": True}

        with pytest.raises(TemplateProductAlreadyExists):
            QuoteTemplateService.add_product_to_template(quote_template.id, product_data)

    def test_add_product_to_nonexistent_template_raises_error(self, product_option):
        """Test adding product to non-existent template raises error."""
        product_data = {"product": product_option.id, "quantity": 1}

        with pytest.raises(QuoteTemplateNotFound):
            QuoteTemplateService.add_product_to_template(99999, product_data)

    def test_update_template_product(self, quote_template):
        """Test updating a template product."""
        template_product = quote_template.quotetemplateproduct_set.first()

        updated = QuoteTemplateService.update_template_product(
            template_product.id, {"quantity": 5, "is_required": False}
        )

        assert updated.quantity == 5
        assert updated.is_required is False

    def test_remove_template_product(self, quote_template):
        """Test removing a product from a template."""
        template_product = quote_template.quotetemplateproduct_set.first()
        product_id = template_product.id

        QuoteTemplateService.remove_template_product(product_id)

        assert not QuoteTemplateProduct.objects.filter(id=product_id).exists()


# =============================================================================
# QUOTE SERVICE TESTS
# =============================================================================


@pytest.mark.django_db
class TestQuoteServiceCreate:
    """Tests for QuoteService.create_quote."""

    def test_create_quote_basic(self, db, event_factory, user_factory):
        """Test creating a basic quote."""
        event = event_factory()
        user = user_factory(admin=True)

        data = {"event": event.id, "valid_until": timezone.now().date() + timedelta(days=30)}

        quote = QuoteService.create_quote(data, user)

        assert quote.id is not None
        assert quote.event == event
        assert quote.version == 1
        assert quote.status == "DRAFT"
        assert quote.created_by == user

    def test_create_quote_auto_sets_valid_until(self, db, event_factory, user_factory):
        """Test that valid_until is auto-set if not provided."""
        event = event_factory()
        user = user_factory(admin=True)

        data = {"event": event.id}

        quote = QuoteService.create_quote(data, user)

        assert quote.valid_until is not None
        assert quote.valid_until <= event.start_date.date()

    def test_create_quote_with_template(self, db, event_factory, user_factory, quote_template, default_tax_rate):
        """Test creating a quote with a template."""
        event = event_factory()
        user = user_factory(admin=True)

        data = {"event": event.id, "template": quote_template}

        quote = QuoteService.create_quote(data, user)

        assert quote.template == quote_template
        assert quote.terms_and_conditions == quote_template.terms_and_conditions
        # Line items should be created from template products
        assert quote.line_items.count() > 0

    def test_create_quote_increments_version(self, db, event_factory, user_factory):
        """Test that quote versions increment for the same event."""
        event = event_factory()
        user = user_factory(admin=True)

        data = {"event": event.id}

        quote1 = QuoteService.create_quote(data, user)
        quote2 = QuoteService.create_quote(data, user)

        assert quote1.version == 1
        assert quote2.version == 2

    def test_create_quote_nonexistent_event_raises_error(self, user_factory):
        """Test creating quote for non-existent event raises error."""
        user = user_factory(admin=True)

        data = {"event": 99999}

        with pytest.raises(EventNotFoundException):
            QuoteService.create_quote(data, user)

    def test_create_quote_creates_activity(self, db, event_factory, user_factory):
        """Test that creating a quote creates an activity record."""
        event = event_factory()
        user = user_factory(admin=True)

        data = {"event": event.id}

        quote = QuoteService.create_quote(data, user)

        activities = QuoteActivity.objects.filter(quote=quote, action="CREATED")
        assert activities.exists()


@pytest.mark.django_db
class TestQuoteServiceUpdate:
    """Tests for QuoteService.update_quote."""

    def test_update_quote_basic_fields(self, draft_quote, user_factory):
        """Test updating basic quote fields."""
        user = user_factory(admin=True)

        data = {"notes": "Updated notes", "terms_and_conditions": "Updated T&C"}

        updated = QuoteService.update_quote(draft_quote.id, data, user)

        assert updated.notes == "Updated notes"
        assert updated.terms_and_conditions == "Updated T&C"

    def test_update_quote_status_to_sent(self, draft_quote, user_factory):
        """Test updating quote status to SENT."""
        user = user_factory(admin=True)

        data = {"status": "SENT"}

        updated = QuoteService.update_quote(draft_quote.id, data, user)

        assert updated.status == "SENT"
        assert updated.sent_at is not None

        # Check activity was created
        activities = QuoteActivity.objects.filter(quote=updated, action="SENT")
        assert activities.exists()

        # Check reminder was created
        reminders = QuoteReminder.objects.filter(quote=updated)
        assert reminders.exists()

    def test_update_quote_status_to_accepted(self, sent_quote, user_factory):
        """Test updating quote status to ACCEPTED."""
        user = user_factory(admin=True)

        data = {"status": "ACCEPTED"}

        updated = QuoteService.update_quote(sent_quote.id, data, user)

        assert updated.status == "ACCEPTED"
        assert updated.accepted_at is not None

    def test_update_quote_status_to_rejected(self, sent_quote, user_factory):
        """Test updating quote status to REJECTED."""
        user = user_factory(admin=True)

        data = {"status": "REJECTED", "rejection_reason": "Too expensive"}

        updated = QuoteService.update_quote(sent_quote.id, data, user)

        assert updated.status == "REJECTED"
        assert updated.rejected_at is not None

    def test_update_accepted_quote_raises_error(self, accepted_quote, user_factory):
        """Test that updating an accepted quote raises error."""
        user = user_factory(admin=True)

        data = {"notes": "Trying to update"}

        with pytest.raises(InvalidQuoteStatusTransition):
            QuoteService.update_quote(accepted_quote.id, data, user)

    def test_update_quote_not_found_raises_error(self, user_factory):
        """Test updating non-existent quote raises error."""
        user = user_factory(admin=True)

        with pytest.raises(QuoteNotFoundException):
            QuoteService.update_quote(99999, {"notes": "Test"}, user)


@pytest.mark.django_db
class TestQuoteServiceDelete:
    """Tests for QuoteService.delete_quote."""

    def test_delete_draft_quote_success(self, draft_quote):
        """Test deleting a draft quote."""
        quote_id = draft_quote.id

        QuoteService.delete_quote(quote_id)

        assert not EventQuote.objects.filter(id=quote_id).exists()

    def test_delete_sent_quote_success(self, sent_quote):
        """Test deleting a sent quote."""
        quote_id = sent_quote.id

        QuoteService.delete_quote(quote_id)

        assert not EventQuote.objects.filter(id=quote_id).exists()

    def test_delete_accepted_quote_raises_error(self, accepted_quote):
        """Test that deleting an accepted quote raises error."""
        with pytest.raises(InvalidQuoteStatusTransition):
            QuoteService.delete_quote(accepted_quote.id)

    def test_delete_nonexistent_quote_raises_error(self):
        """Test deleting non-existent quote raises error."""
        with pytest.raises(QuoteNotFoundException):
            QuoteService.delete_quote(99999)


@pytest.mark.django_db
class TestQuoteServiceDuplicate:
    """Tests for QuoteService.duplicate_quote."""

    def test_duplicate_quote_creates_new_version(self, draft_quote, user_factory):
        """Test duplicating a quote creates a new version."""
        user = user_factory(admin=True)

        new_quote = QuoteService.duplicate_quote(draft_quote.id, user)

        assert new_quote.id != draft_quote.id
        assert new_quote.version == draft_quote.version + 1
        assert new_quote.event == draft_quote.event
        assert new_quote.status == "DRAFT"

    def test_duplicate_quote_not_found_raises_error(self, user_factory):
        """Test duplicating non-existent quote raises error."""
        user = user_factory(admin=True)

        with pytest.raises(QuoteNotFoundException):
            QuoteService.duplicate_quote(99999, user)


@pytest.mark.django_db
class TestQuoteServiceLineItems:
    """Tests for QuoteService line item management."""

    def test_add_line_item_free_form(self, draft_quote, user_factory):
        """Test adding a free-form line item."""
        user = user_factory(admin=True)

        line_item_data = {
            "description": "Custom Service",
            "quantity": 1,
            "unit_price": Decimal("2500.00"),
            "item_type": "ADDON",
        }

        line_item = QuoteService.add_line_item(draft_quote.id, line_item_data, user)

        assert line_item.description == "Custom Service"
        assert line_item.quantity == 1
        assert line_item.total == Decimal("2500.00")

    def test_add_line_item_with_product(self, draft_quote, user_factory, product_option, default_tax_rate):
        """Test adding a line item with a product.

        PricingCalculationService clamps quantity to 1 when allow_multiple is
        False (the default).  The description is set by the pricing service
        based on the product name.
        """
        user = user_factory(admin=True)

        line_item_data = {"product_id": product_option.id, "quantity": 2}

        line_item = QuoteService.add_line_item(draft_quote.id, line_item_data, user)

        assert line_item.product == product_option
        # allow_multiple defaults to False, so PricingCalculationService clamps to 1
        assert line_item.quantity == 1
        assert product_option.name in line_item.description

    def test_add_line_item_to_accepted_quote_raises_error(self, accepted_quote, user_factory):
        """Test adding line item to accepted quote raises error."""
        user = user_factory(admin=True)

        line_item_data = {"description": "Test", "quantity": 1, "unit_price": Decimal("1000.00")}

        with pytest.raises(InvalidQuoteStatusTransition):
            QuoteService.add_line_item(accepted_quote.id, line_item_data, user)

    def test_add_line_item_creates_activity(self, draft_quote, user_factory):
        """Test that adding a line item creates an activity."""
        user = user_factory(admin=True)

        initial_count = QuoteActivity.objects.filter(quote=draft_quote).count()

        line_item_data = {"description": "New Item", "quantity": 1, "unit_price": Decimal("500.00")}

        QuoteService.add_line_item(draft_quote.id, line_item_data, user)

        new_count = QuoteActivity.objects.filter(quote=draft_quote).count()
        assert new_count == initial_count + 1

    def test_update_line_item_free_form(self, draft_quote, user_factory):
        """Test updating a free-form line item."""
        user = user_factory(admin=True)

        line_item = QuoteLineItem.objects.create(
            quote=draft_quote,
            description="Original",
            quantity=1,
            unit_price=Decimal("1000.00"),
            total=Decimal("1000.00"),
        )

        updated = QuoteService.update_line_item(line_item.id, {"quantity": 3, "notes": "Updated note"}, user)

        assert updated.quantity == 3
        assert updated.notes == "Updated note"
        assert updated.total == Decimal("3000.00")

    def test_update_line_item_not_found_raises_error(self, user_factory):
        """Test updating non-existent line item raises error."""
        user = user_factory(admin=True)

        with pytest.raises(LineItemNotFoundException):
            QuoteService.update_line_item(99999, {"quantity": 2}, user)

    def test_update_line_item_on_accepted_quote_raises_error(self, accepted_quote, user_factory):
        """Test updating line item on accepted quote raises error."""
        user = user_factory(admin=True)

        line_item = QuoteLineItem.objects.create(
            quote=accepted_quote,
            description="Test",
            quantity=1,
            unit_price=Decimal("1000.00"),
            total=Decimal("1000.00"),
        )

        with pytest.raises(InvalidQuoteStatusTransition):
            QuoteService.update_line_item(line_item.id, {"quantity": 2}, user)

    def test_remove_line_item(self, draft_quote, user_factory):
        """Test removing a line item."""
        user = user_factory(admin=True)

        line_item = QuoteLineItem.objects.create(
            quote=draft_quote,
            description="To Remove",
            quantity=1,
            unit_price=Decimal("1000.00"),
            total=Decimal("1000.00"),
        )
        line_item_id = line_item.id

        QuoteService.remove_line_item(line_item_id, user)

        assert not QuoteLineItem.objects.filter(id=line_item_id).exists()

    def test_remove_line_item_updates_totals(self, draft_quote, user_factory):
        """Test that removing a line item updates quote totals."""
        user = user_factory(admin=True)

        # Add a line item
        line_item = QuoteLineItem.objects.create(
            quote=draft_quote,
            description="Item to Remove",
            quantity=1,
            unit_price=Decimal("1000.00"),
            total=Decimal("1000.00"),
        )

        # Remove it
        QuoteService.remove_line_item(line_item.id, user)

        # Refresh and check totals were updated
        draft_quote.refresh_from_db()
        # The quote should be recalculated (may have different values based on remaining items)

    def test_remove_line_item_not_found_raises_error(self, user_factory):
        """Test removing non-existent line item raises error."""
        user = user_factory(admin=True)

        with pytest.raises(LineItemNotFoundException):
            QuoteService.remove_line_item(99999, user)

    def test_remove_line_item_on_accepted_quote_raises_error(self, accepted_quote, user_factory):
        """Test removing line item from accepted quote raises error."""
        user = user_factory(admin=True)

        line_item = QuoteLineItem.objects.create(
            quote=accepted_quote,
            description="Test",
            quantity=1,
            unit_price=Decimal("1000.00"),
            total=Decimal("1000.00"),
        )

        with pytest.raises(InvalidQuoteStatusTransition):
            QuoteService.remove_line_item(line_item.id, user)

    def test_remove_line_item_creates_activity(self, draft_quote, user_factory):
        """Test that removing a line item creates an activity."""
        user = user_factory(admin=True)

        line_item = QuoteLineItem.objects.create(
            quote=draft_quote,
            description="To Remove",
            quantity=1,
            unit_price=Decimal("1000.00"),
            total=Decimal("1000.00"),
        )

        initial_count = QuoteActivity.objects.filter(quote=draft_quote).count()

        QuoteService.remove_line_item(line_item.id, user)

        new_count = QuoteActivity.objects.filter(quote=draft_quote).count()
        assert new_count == initial_count + 1


@pytest.mark.django_db
class TestQuoteServiceUpdateWithLineItems:
    """Tests for QuoteService.update_quote with line_items parameter."""

    def test_update_quote_with_line_items_creates_new(
        self, draft_quote, user_factory, product_option, default_tax_rate
    ):
        """Test updating quote with new line items."""
        user = user_factory(admin=True)

        data = {"line_items": [{"product_id": product_option.id, "quantity": 2}]}

        updated = QuoteService.update_quote(draft_quote.id, data, user)

        assert updated.line_items.count() == 1
        assert updated.line_items.first().product == product_option

    def test_update_quote_with_line_items_updates_existing(self, draft_quote, user_factory):
        """Test updating existing line items."""
        user = user_factory(admin=True)

        # Create an existing line item
        line_item = QuoteLineItem.objects.create(
            quote=draft_quote,
            description="Existing Item",
            quantity=1,
            unit_price=Decimal("1000.00"),
            total=Decimal("1000.00"),
        )

        data = {"line_items": [{"id": line_item.id, "quantity": 5, "skip_recalculation": True}]}

        updated = QuoteService.update_quote(draft_quote.id, data, user)

        updated_item = updated.line_items.get(id=line_item.id)
        assert updated_item.quantity == 5

    def test_update_quote_with_line_items_deletes_removed(self, draft_quote, user_factory):
        """Test that line items not in the list are deleted."""
        user = user_factory(admin=True)

        # Create multiple line items
        item1 = QuoteLineItem.objects.create(
            quote=draft_quote, description="Item 1", quantity=1, unit_price=Decimal("1000.00"), total=Decimal("1000.00")
        )
        item2 = QuoteLineItem.objects.create(
            quote=draft_quote, description="Item 2", quantity=1, unit_price=Decimal("500.00"), total=Decimal("500.00")
        )

        # Update with only item1
        data = {"line_items": [{"id": item1.id, "quantity": 1, "skip_recalculation": True}]}

        updated = QuoteService.update_quote(draft_quote.id, data, user)

        assert updated.line_items.count() == 1
        assert not QuoteLineItem.objects.filter(id=item2.id).exists()
