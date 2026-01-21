"""
Unit tests for sales domain pricing service.

Tests:
- PricingCalculationService (pricing breakdown, venue hours, discounts, taxes)
- PricingLineItem dataclass
- PricingBreakdown dataclass
- Tax rate calculations
- VIP benefits application
- Service charge application
"""

import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock

from core.domains.sales.pricing_service import (
    PricingCalculationService,
    PricingLineItem,
    PricingBreakdown,
    get_default_tax_rate,
    get_tax_rate_for_product,
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
def addon_product(db, product_category):
    """Create an addon product for testing."""
    from core.domains.products.models import ProductOption
    return ProductOption.objects.create(
        name='Test Add-on',
        description='Test addon description',
        category=product_category,
        base_price=Decimal('1000.00'),
        type='ADDON',
        is_active=True
    )


@pytest.fixture
def tax_inclusive_product(db, product_category):
    """Create a tax-inclusive product for testing."""
    from core.domains.products.models import ProductOption
    return ProductOption.objects.create(
        name='Tax Inclusive Package',
        description='Package with tax included in price',
        category=product_category,
        base_price=Decimal('10000.00'),
        type='PACKAGE',
        is_active=True,
        is_tax_inclusive=True
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
def discount(db):
    """Create a discount for testing."""
    from core.domains.products.models import Discount
    return Discount.objects.create(
        name='Test Discount',
        code='TEST10',
        discount_type='PERCENTAGE',
        value=Decimal('10.00'),
        is_active=True
    )


@pytest.fixture
def fixed_discount(db):
    """Create a fixed amount discount for testing."""
    from core.domains.products.models import Discount
    return Discount.objects.create(
        name='Fixed Discount',
        code='FIXED500',
        discount_type='FIXED',
        value=Decimal('500.00'),
        is_active=True
    )


@pytest.fixture
def venue_with_hours(db):
    """Create a venue with hours configuration."""
    from core.domains.venues.models import Venue
    return Venue.objects.create(
        name='Main Hall',
        description='Main event hall',
        capacity=200,
        standalone_included_hours=4,
        standalone_excess_hour_price=Decimal('500.00'),
        is_active=True
    )


@pytest.fixture
def package_with_venue(db, product_option, venue_with_hours):
    """Create a package-venue association."""
    from core.domains.venues.models import PackageVenue
    return PackageVenue.objects.create(
        package=product_option,
        venue=venue_with_hours,
        is_primary=True
    )


@pytest.fixture
def payment_settings(db):
    """Create payment settings with service charge."""
    from core.domains.payments.models import PaymentSettings
    settings, created = PaymentSettings.objects.get_or_create(
        pk=1,
        defaults={
            'service_charge_enabled': True,
            'service_charge_percentage': Decimal('5.00'),
        }
    )
    if not created:
        settings.service_charge_enabled = True
        settings.service_charge_percentage = Decimal('5.00')
        settings.save()
    return settings


# =============================================================================
# PRICING LINE ITEM DATACLASS TESTS
# =============================================================================

@pytest.mark.django_db
class TestPricingLineItem:
    """Tests for PricingLineItem dataclass."""

    def test_basic_line_item_calculation(self):
        """Test basic line item total calculation."""
        item = PricingLineItem(
            product_id=1,
            name='Test Package',
            description='Test Package',
            quantity=2,
            base_unit_price=Decimal('5000.00')
        )

        assert item.total_unit_price == Decimal('5000.00')
        assert item.line_total == Decimal('10000.00')
        assert item.excess_cost == Decimal('0')

    def test_line_item_with_excess_hours(self):
        """Test line item with excess hours pricing."""
        item = PricingLineItem(
            product_id=1,
            name='Package with Extra Hours',
            description='Package with Extra Hours',
            quantity=1,
            base_unit_price=Decimal('5000.00'),
            excess_hours=3,
            excess_hour_price=Decimal('500.00')
        )

        assert item.excess_cost == Decimal('1500.00')
        assert item.total_unit_price == Decimal('6500.00')
        assert item.line_total == Decimal('6500.00')

    def test_line_item_with_quantity_and_excess(self):
        """Test line item with both quantity and excess hours."""
        item = PricingLineItem(
            product_id=1,
            name='Multi-day Package',
            description='Multi-day Package',
            quantity=2,
            base_unit_price=Decimal('5000.00'),
            excess_hours=4,
            excess_hour_price=Decimal('500.00')
        )

        # Excess cost is total (4 * 500 = 2000)
        assert item.excess_cost == Decimal('2000.00')
        # Per unit: base + (excess_cost / quantity) = 5000 + 1000 = 6000
        assert item.total_unit_price == Decimal('6000.00')
        # Line total: 6000 * 2 = 12000
        assert item.line_total == Decimal('12000.00')

    def test_line_item_default_item_type(self):
        """Test default item type is PACKAGE."""
        item = PricingLineItem(
            product_id=1,
            name='Test',
            description='Test',
            quantity=1,
            base_unit_price=Decimal('1000.00')
        )

        assert item.item_type == 'PACKAGE'

    def test_line_item_addon_type(self):
        """Test addon item type."""
        item = PricingLineItem(
            product_id=1,
            name='Test Addon',
            description='Test Addon',
            quantity=1,
            base_unit_price=Decimal('500.00'),
            item_type='ADDON'
        )

        assert item.item_type == 'ADDON'


# =============================================================================
# PRICING BREAKDOWN DATACLASS TESTS
# =============================================================================

@pytest.mark.django_db
class TestPricingBreakdown:
    """Tests for PricingBreakdown dataclass."""

    def test_breakdown_calculates_subtotal(self):
        """Test that breakdown calculates subtotal from line items."""
        items = [
            PricingLineItem(
                product_id=1,
                name='Item 1',
                description='Item 1',
                quantity=1,
                base_unit_price=Decimal('5000.00')
            ),
            PricingLineItem(
                product_id=2,
                name='Item 2',
                description='Item 2',
                quantity=2,
                base_unit_price=Decimal('1000.00')
            )
        ]

        breakdown = PricingBreakdown(line_items=items)

        assert breakdown.subtotal == Decimal('7000.00')

    def test_breakdown_initial_total(self):
        """Test initial total equals subtotal."""
        items = [
            PricingLineItem(
                product_id=1,
                name='Item',
                description='Item',
                quantity=1,
                base_unit_price=Decimal('5000.00')
            )
        ]

        breakdown = PricingBreakdown(line_items=items)

        assert breakdown.total_amount == Decimal('5000.00')

    def test_breakdown_empty_line_items(self):
        """Test breakdown with empty line items."""
        breakdown = PricingBreakdown(line_items=[])

        assert breakdown.subtotal == Decimal('0')
        assert breakdown.total_amount == Decimal('0')


# =============================================================================
# TAX RATE FUNCTION TESTS
# =============================================================================

@pytest.mark.django_db
class TestTaxRateFunctions:
    """Tests for tax rate helper functions."""

    def test_get_default_tax_rate_returns_rate(self, default_tax_rate):
        """Test getting default tax rate."""
        rate = get_default_tax_rate()
        assert rate == Decimal('12.00')

    def test_get_default_tax_rate_returns_zero_when_no_default(self, db):
        """Test returns 0 when no default tax rate exists."""
        from core.domains.payments.models import TaxRate
        TaxRate.objects.filter(is_default=True).delete()

        rate = get_default_tax_rate()
        assert rate == Decimal('0')

    def test_get_tax_rate_for_tax_inclusive_product(self, tax_inclusive_product, default_tax_rate):
        """Test tax-inclusive products return 0."""
        rate = get_tax_rate_for_product(tax_inclusive_product)
        assert rate == Decimal('0')

    def test_get_tax_rate_for_regular_product(self, product_option, default_tax_rate):
        """Test regular products return default tax rate."""
        rate = get_tax_rate_for_product(product_option)
        assert rate == Decimal('12.00')


# =============================================================================
# PRICING CALCULATION SERVICE TESTS
# =============================================================================

@pytest.mark.django_db
class TestPricingCalculationServiceBasic:
    """Basic tests for PricingCalculationService."""

    def test_calculate_from_booking_data_single_package(
        self, product_option, default_tax_rate
    ):
        """Test calculating pricing for a single package."""
        booking_data = {
            'selected_packages': [
                {
                    'product_id': product_option.id,
                    'name': product_option.name,
                    'price': float(product_option.base_price),
                    'quantity': 1
                }
            ],
            'selected_addons': []
        }

        breakdown = PricingCalculationService.calculate_from_booking_data(booking_data)

        assert len(breakdown.line_items) == 1
        assert breakdown.subtotal == Decimal('5000.00')

    def test_calculate_from_booking_data_multiple_packages(
        self, product_option, addon_product, default_tax_rate
    ):
        """Test calculating pricing for multiple packages."""
        booking_data = {
            'selected_packages': [
                {
                    'product_id': product_option.id,
                    'name': product_option.name,
                    'price': float(product_option.base_price),
                    'quantity': 1
                }
            ],
            'selected_addons': [
                {
                    'product_id': addon_product.id,
                    'name': addon_product.name,
                    'price': float(addon_product.base_price),
                    'quantity': 2
                }
            ]
        }

        breakdown = PricingCalculationService.calculate_from_booking_data(booking_data)

        assert len(breakdown.line_items) == 2
        assert breakdown.subtotal == Decimal('7000.00')  # 5000 + 2*1000

    def test_calculate_from_booking_data_empty(self):
        """Test calculating pricing for empty booking data."""
        booking_data = {
            'selected_packages': [],
            'selected_addons': []
        }

        breakdown = PricingCalculationService.calculate_from_booking_data(booking_data)

        assert len(breakdown.line_items) == 0
        assert breakdown.subtotal == Decimal('0')


@pytest.mark.django_db
class TestPricingCalculationServiceVenueHours:
    """Tests for venue hours pricing."""

    def test_get_venue_hours_info_empty(self):
        """Test get_venue_hours_info with empty hours."""
        total, details = PricingCalculationService.get_venue_hours_info(
            product_id=1,
            venue_additional_hours={}
        )

        assert total == Decimal('0.00')
        assert details == []

    def test_get_venue_hours_info_with_package_venue(
        self, product_option, package_with_venue, venue_with_hours
    ):
        """Test get_venue_hours_info with package venue configuration."""
        venue_additional_hours = {
            str(venue_with_hours.id): 2
        }

        total, details = PricingCalculationService.get_venue_hours_info(
            product_id=product_option.id,
            venue_additional_hours=venue_additional_hours
        )

        assert total == Decimal('1000.00')  # 2 hours * 500
        assert len(details) == 1
        assert details[0]['venue_id'] == venue_with_hours.id
        assert details[0]['additional_hours'] == 2

    def test_create_package_line_item_basic(self, product_option, default_tax_rate):
        """Test creating a package line item."""
        package_data = {
            'product_id': product_option.id,
            'name': product_option.name,
            'price': float(product_option.base_price),
            'quantity': 1
        }

        item = PricingCalculationService._create_package_line_item(package_data, None)

        assert item is not None
        assert item.name == product_option.name
        assert item.base_unit_price == Decimal('5000.00')
        assert item.quantity == 1

    def test_create_package_line_item_with_venue_hours(
        self, product_option, package_with_venue, venue_with_hours, default_tax_rate
    ):
        """Test creating a package line item with venue hours."""
        package_data = {
            'product_id': product_option.id,
            'name': product_option.name,
            'price': float(product_option.base_price),
            'quantity': 1
        }
        venue_additional_hours = {
            str(venue_with_hours.id): 2
        }

        item = PricingCalculationService._create_package_line_item(
            package_data, venue_additional_hours
        )

        assert item is not None
        assert item.excess_hours == 2
        assert item.excess_cost == Decimal('1000.00')

    def test_create_addon_line_item(self, addon_product, default_tax_rate):
        """Test creating an addon line item."""
        addon_data = {
            'product_id': addon_product.id,
            'name': addon_product.name,
            'price': float(addon_product.base_price),
            'quantity': 2
        }

        item = PricingCalculationService._create_addon_line_item(addon_data)

        assert item is not None
        assert item.name == addon_product.name
        assert item.base_unit_price == Decimal('1000.00')
        assert item.quantity == 2
        assert item.item_type == 'ADDON'


@pytest.mark.django_db
class TestPricingCalculationServiceDiscounts:
    """Tests for discount application."""

    def test_apply_percentage_discount(self, discount):
        """Test applying percentage discount."""
        items = [
            PricingLineItem(
                product_id=1,
                name='Package',
                description='Package',
                quantity=1,
                base_unit_price=Decimal('10000.00')
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        PricingCalculationService.apply_discount(breakdown, discount)

        assert breakdown.discount_amount == Decimal('1000.00')  # 10% of 10000
        assert breakdown.applied_discount == discount

    def test_apply_fixed_discount(self, fixed_discount):
        """Test applying fixed discount."""
        items = [
            PricingLineItem(
                product_id=1,
                name='Package',
                description='Package',
                quantity=1,
                base_unit_price=Decimal('10000.00')
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        PricingCalculationService.apply_discount(breakdown, fixed_discount)

        assert breakdown.discount_amount == Decimal('500.00')

    def test_fixed_discount_capped_at_subtotal(self, db):
        """Test that fixed discount is capped at subtotal."""
        from core.domains.products.models import Discount

        large_discount = Discount.objects.create(
            name='Large Discount',
            code='LARGE',
            discount_type='FIXED',
            value=Decimal('50000.00'),  # Larger than subtotal
            is_active=True
        )

        items = [
            PricingLineItem(
                product_id=1,
                name='Package',
                description='Package',
                quantity=1,
                base_unit_price=Decimal('5000.00')
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        PricingCalculationService.apply_discount(breakdown, large_discount)

        assert breakdown.discount_amount == Decimal('5000.00')  # Capped at subtotal

    def test_calculate_with_discount_code(
        self, product_option, discount, default_tax_rate
    ):
        """Test calculate_from_booking_data with discount code."""
        booking_data = {
            'selected_packages': [
                {
                    'product_id': product_option.id,
                    'name': product_option.name,
                    'price': float(product_option.base_price),
                    'quantity': 1
                }
            ],
            'selected_addons': [],
            'applied_discount_code': discount.code
        }

        breakdown = PricingCalculationService.calculate_from_booking_data(booking_data)

        assert breakdown.discount_amount == Decimal('500.00')  # 10% of 5000
        assert breakdown.applied_discount == discount


@pytest.mark.django_db
class TestPricingCalculationServiceTax:
    """Tests for tax calculation."""

    def test_apply_tax(self, default_tax_rate):
        """Test applying tax to breakdown."""
        items = [
            PricingLineItem(
                product_id=1,
                name='Package',
                description='Package',
                quantity=1,
                base_unit_price=Decimal('10000.00'),
                tax_rate=Decimal('12.00')
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        PricingCalculationService.apply_tax(breakdown, Decimal('12.00'))

        assert breakdown.tax_amount == Decimal('1200.00')
        assert breakdown.tax_rate == Decimal('12.00')

    def test_apply_item_based_tax_regular_products(self, product_option, default_tax_rate):
        """Test item-based tax for regular products."""
        items = [
            PricingLineItem(
                product_id=product_option.id,
                name='Package',
                description='Package',
                quantity=1,
                base_unit_price=Decimal('10000.00'),
                tax_rate=Decimal('12.00')
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        PricingCalculationService.apply_item_based_tax(breakdown)

        assert breakdown.tax_amount == Decimal('1200.00')

    def test_apply_item_based_tax_tax_inclusive(self, tax_inclusive_product, default_tax_rate):
        """Test item-based tax for tax-inclusive products."""
        items = [
            PricingLineItem(
                product_id=tax_inclusive_product.id,
                name='Tax Inclusive Package',
                description='Tax Inclusive Package',
                quantity=1,
                base_unit_price=Decimal('10000.00'),
                tax_rate=Decimal('0.00')  # Tax-inclusive products have 0 rate
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        PricingCalculationService.apply_item_based_tax(breakdown)

        assert breakdown.tax_amount == Decimal('0')

    def test_apply_item_based_tax_mixed_products(
        self, product_option, tax_inclusive_product, default_tax_rate
    ):
        """Test item-based tax with mixed products."""
        items = [
            PricingLineItem(
                product_id=product_option.id,
                name='Regular Package',
                description='Regular Package',
                quantity=1,
                base_unit_price=Decimal('5000.00'),
                tax_rate=Decimal('12.00')
            ),
            PricingLineItem(
                product_id=tax_inclusive_product.id,
                name='Tax Inclusive',
                description='Tax Inclusive',
                quantity=1,
                base_unit_price=Decimal('10000.00'),
                tax_rate=Decimal('0.00')
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        PricingCalculationService.apply_item_based_tax(breakdown)

        # Only regular package taxed: 5000 * 12% = 600
        assert breakdown.tax_amount == Decimal('600.00')


@pytest.mark.django_db
class TestPricingCalculationServiceServiceCharge:
    """Tests for service charge application."""

    def test_apply_service_charge(self, payment_settings):
        """Test applying service charge."""
        items = [
            PricingLineItem(
                product_id=1,
                name='Package',
                description='Package',
                quantity=1,
                base_unit_price=Decimal('10000.00')
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        PricingCalculationService.apply_service_charge(breakdown)

        assert breakdown.service_charge_amount == Decimal('500.00')  # 5% of 10000

    def test_apply_service_charge_after_discount(self, payment_settings, discount):
        """Test service charge is applied after discount."""
        items = [
            PricingLineItem(
                product_id=1,
                name='Package',
                description='Package',
                quantity=1,
                base_unit_price=Decimal('10000.00')
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        # Apply 10% discount first
        PricingCalculationService.apply_discount(breakdown, discount)
        # Then apply service charge
        PricingCalculationService.apply_service_charge(breakdown)

        # Service charge on 9000 (10000 - 1000 discount) = 450
        assert breakdown.service_charge_amount == Decimal('450.00')

    @patch('core.domains.payments.models.PaymentSettings.get_default_settings')
    def test_service_charge_disabled(self, mock_settings):
        """Test service charge when disabled."""
        mock_settings.return_value = MagicMock(
            service_charge_enabled=False,
            service_charge_percentage=Decimal('5.00')
        )

        items = [
            PricingLineItem(
                product_id=1,
                name='Package',
                description='Package',
                quantity=1,
                base_unit_price=Decimal('10000.00')
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        PricingCalculationService.apply_service_charge(breakdown)

        assert breakdown.service_charge_amount == Decimal('0.00')


@pytest.mark.django_db
class TestPricingCalculationServiceVIP:
    """Tests for VIP benefits application."""

    @patch('core.domains.sales.pricing_service.VIPPricingIntegrationService')
    def test_apply_vip_benefits(self, mock_vip_service, user_factory):
        """Test applying VIP benefits."""
        mock_vip_service.calculate_vip_discount.return_value = (
            Decimal('1000.00'),
            ['10% VIP Discount']
        )
        mock_vip_service.should_waive_fee.return_value = False

        client = user_factory(role='CLIENT')
        items = [
            PricingLineItem(
                product_id=1,
                name='Package',
                description='Package',
                quantity=1,
                base_unit_price=Decimal('10000.00')
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        PricingCalculationService.apply_vip_benefits(breakdown, client)

        assert breakdown.vip_discount_amount == Decimal('1000.00')
        assert '10% VIP Discount' in breakdown.applied_vip_benefits

    @patch('core.domains.sales.pricing_service.VIPPricingIntegrationService')
    def test_apply_vip_service_charge_waiver(self, mock_vip_service, user_factory, payment_settings):
        """Test VIP service charge waiver."""
        mock_vip_service.calculate_vip_discount.return_value = (Decimal('0'), [])
        mock_vip_service.should_waive_fee.return_value = True

        client = user_factory(role='CLIENT')
        items = [
            PricingLineItem(
                product_id=1,
                name='Package',
                description='Package',
                quantity=1,
                base_unit_price=Decimal('10000.00')
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        PricingCalculationService.apply_vip_benefits(breakdown, client)

        assert 'Service charge waived' in breakdown.applied_vip_benefits

        # Now apply service charge - should be zero
        PricingCalculationService.apply_service_charge(breakdown)
        assert breakdown.service_charge_amount == Decimal('0.00')

    def test_vip_benefits_no_client(self):
        """Test that VIP benefits are not applied without client."""
        items = [
            PricingLineItem(
                product_id=1,
                name='Package',
                description='Package',
                quantity=1,
                base_unit_price=Decimal('10000.00')
            )
        ]
        breakdown = PricingBreakdown(line_items=items)

        # Should not raise error, just skip VIP benefits
        PricingCalculationService.apply_vip_benefits(breakdown, None)

        assert breakdown.vip_discount_amount == Decimal('0')


@pytest.mark.django_db
class TestPricingCalculationServiceIntegration:
    """Integration tests for complete pricing calculation."""

    def test_full_pricing_calculation(
        self, product_option, addon_product, discount, default_tax_rate, payment_settings
    ):
        """Test complete pricing calculation with all components."""
        booking_data = {
            'selected_packages': [
                {
                    'product_id': product_option.id,
                    'name': product_option.name,
                    'price': float(product_option.base_price),
                    'quantity': 1
                }
            ],
            'selected_addons': [
                {
                    'product_id': addon_product.id,
                    'name': addon_product.name,
                    'price': float(addon_product.base_price),
                    'quantity': 2
                }
            ],
            'applied_discount_code': discount.code
        }

        breakdown = PricingCalculationService.calculate_from_booking_data(booking_data)

        # Subtotal: 5000 + 2*1000 = 7000
        assert breakdown.subtotal == Decimal('7000.00')

        # Discount: 10% of 7000 = 700
        assert breakdown.discount_amount == Decimal('700.00')

        # Service charge: 5% of (7000 - 700) = 315
        assert breakdown.service_charge_amount == Decimal('315.00')

        # Tax is calculated per-item
        assert breakdown.tax_amount > Decimal('0')

    def test_calculate_from_quote_line_items(self, product_option):
        """Test calculating from existing quote line items."""
        # Create mock line items
        class MockLineItem:
            def __init__(self, description, quantity, unit_price, tax_rate):
                self.description = description
                self.quantity = quantity
                self.unit_price = unit_price
                self.tax_rate = tax_rate
                self.product_id = product_option.id

        line_items = [
            MockLineItem('Package 1', 1, Decimal('5000.00'), Decimal('12.00')),
            MockLineItem('Addon 1', 2, Decimal('1000.00'), Decimal('12.00'))
        ]

        breakdown = PricingCalculationService.calculate_from_quote_line_items(line_items)

        assert len(breakdown.line_items) == 2
        assert breakdown.subtotal == Decimal('7000.00')

    def test_extract_discount_code_from_nested_data(self, discount):
        """Test extracting discount code from nested booking data."""
        booking_data = {
            'step_pricing': {
                'applied_discount_code': discount.code
            },
            'selected_packages': [],
            'selected_addons': []
        }

        code = PricingCalculationService._extract_discount_code(booking_data)

        assert code == discount.code

    def test_extract_selected_items_alternative_keys(self):
        """Test extracting items using alternative key names."""
        booking_data = {
            'packages': [  # Alternative key
                {'product_id': 1, 'name': 'Test', 'price': 1000, 'quantity': 1}
            ],
            'add_ons': [  # Alternative key
                {'product_id': 2, 'name': 'Addon', 'price': 500, 'quantity': 1}
            ]
        }

        packages = PricingCalculationService._extract_selected_items(
            booking_data, 'selected_packages'
        )
        addons = PricingCalculationService._extract_selected_items(
            booking_data, 'selected_addons'
        )

        assert len(packages) == 1
        assert len(addons) == 1


@pytest.mark.django_db
class TestPricingCalculationServiceEdgeCases:
    """Edge case tests for PricingCalculationService."""

    def test_create_line_item_invalid_data(self):
        """Test creating line item with invalid data returns None."""
        package_data = {
            'name': 'Test',
            'price': 'invalid'  # Invalid price
        }

        item = PricingCalculationService._create_package_line_item(package_data, None)

        assert item is None

    def test_create_addon_line_item_invalid_data(self):
        """Test creating addon line item with invalid data returns None."""
        addon_data = {
            'name': 'Test',
            'quantity': 'invalid'  # Invalid quantity
        }

        item = PricingCalculationService._create_addon_line_item(addon_data)

        assert item is None

    def test_get_applicable_tax_rate(self, default_tax_rate):
        """Test getting applicable tax rate."""
        items = [
            PricingLineItem(
                product_id=1,
                name='Test',
                description='Test',
                quantity=1,
                base_unit_price=Decimal('1000.00'),
                tax_rate=Decimal('12.00')
            )
        ]

        rate = PricingCalculationService.get_applicable_tax_rate(items)

        assert rate == Decimal('12.00')

    def test_calculate_pricing_breakdown_from_line_items(self):
        """Test calculate_pricing_breakdown method."""
        items = [
            PricingLineItem(
                product_id=1,
                name='Item 1',
                description='Item 1',
                quantity=2,
                base_unit_price=Decimal('1000.00'),
                tax_rate=Decimal('12.00')
            )
        ]

        breakdown = PricingCalculationService.calculate_pricing_breakdown(items)

        assert breakdown.subtotal == Decimal('2000.00')
        assert breakdown.tax_amount == Decimal('240.00')
        assert breakdown.total_amount == Decimal('2240.00')
