"""
Unit tests for products domain models.

Tests:
- ProductCategory model (hierarchical categories, slug generation, constraints)
- ProductOption model (products and packages, pricing, constraints)
- Discount model (validity, usage limits, applicability)
"""

import pytest
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from datetime import timedelta
from decimal import Decimal
from freezegun import freeze_time

from core.domains.products.models import ProductCategory, ProductOption, Discount


@pytest.mark.django_db
class TestProductCategoryModel:
    """Unit tests for the ProductCategory model."""

    def test_create_category(self, product_category_factory):
        """Test creating a basic category."""
        category = product_category_factory(name='Events')

        assert category.name == 'Events'
        assert category.is_active
        assert category.slug is not None

    def test_category_string_representation(self, product_category_factory):
        """Test ProductCategory __str__ returns name."""
        category = product_category_factory(name='Weddings')

        assert str(category) == 'Weddings'

    def test_category_string_with_parent(self, product_category_factory):
        """Test __str__ shows parent path when category has parent."""
        parent = product_category_factory(name='Events')
        child = product_category_factory(name='Weddings', parent=parent)

        assert str(child) == 'Events > Weddings'

    def test_category_slug_auto_generation(self, product_category_factory):
        """Test slug is auto-generated from name."""
        category = product_category_factory(name='Corporate Events')

        assert category.slug == 'corporate-events'

    def test_category_slug_uniqueness(self, product_category_factory):
        """Test that duplicate slugs are handled with counter.

        Uses different names that produce the same base slug via slugify().
        e.g. 'Slug Test' and 'Slug--Test' both slugify to 'slug-test'.
        The save() dedup logic should append a counter to avoid conflict.
        """
        from core.domains.products.models import ProductCategory

        # First category: name 'Slug Test' -> slug 'slug-test'
        category1 = ProductCategory.objects.create(
            name='Slug Test',
            description='Test',
            is_active=True,
        )
        assert category1.slug == 'slug-test'

        # Second category: name 'Slug--Test' -> slugify also produces 'slug-test'
        # The save() dedup logic should generate 'slug-test-1'
        category2 = ProductCategory.objects.create(
            name='Slug--Test',
            description='Test',
            is_active=True,
        )

        assert category1.slug != category2.slug
        assert category2.slug.startswith('slug-test')

    def test_category_full_path_property(self, product_category_factory):
        """Test full_path returns complete category hierarchy."""
        grandparent = product_category_factory(name='Celebrations')
        parent = product_category_factory(name='Weddings', parent=grandparent)
        child = product_category_factory(name='Beach Weddings', parent=parent)

        assert child.full_path == 'Celebrations > Weddings > Beach Weddings'

    def test_category_full_path_root(self, product_category_factory):
        """Test full_path for root category."""
        category = product_category_factory(name='Events')

        assert category.full_path == 'Events'

    def test_category_level_property(self, product_category_factory):
        """Test level returns correct nesting depth."""
        grandparent = product_category_factory(name='Level 0')
        parent = product_category_factory(name='Level 1', parent=grandparent)
        child = product_category_factory(name='Level 2', parent=parent)

        assert grandparent.level == 0
        assert parent.level == 1
        assert child.level == 2

    def test_category_requires_venue_field(self, product_category_factory):
        """Test requires_venue field configuration."""
        category = product_category_factory(venue_required=True)

        assert category.requires_venue
        assert category.typical_duration_hours == 4

    def test_category_ordering(self, product_category_factory):
        """Test categories are ordered by sort_order, then name."""
        cat_c = product_category_factory(name='Cat C', sort_order=2)
        cat_a = product_category_factory(name='Cat A', sort_order=1)
        cat_b = product_category_factory(name='Cat B', sort_order=1)

        categories = list(ProductCategory.objects.all())

        # Should be ordered by sort_order first, then by name
        assert categories[0] == cat_a
        assert categories[1] == cat_b
        assert categories[2] == cat_c

    def test_category_name_uniqueness(self, product_category_factory):
        """Test that category names must be unique."""
        product_category_factory(name='Unique Category')

        with pytest.raises(IntegrityError):
            product_category_factory(name='Unique Category')

    def test_inactive_category(self, product_category_factory):
        """Test creating an inactive category."""
        category = product_category_factory(inactive=True)

        assert not category.is_active


@pytest.mark.django_db
class TestProductCategoryHierarchy:
    """Tests for ProductCategory hierarchical relationships."""

    def test_category_children_relationship(self, product_category_factory):
        """Test children related name works correctly."""
        parent = product_category_factory(name='Parent')
        child1 = product_category_factory(name='Child 1', parent=parent)
        child2 = product_category_factory(name='Child 2', parent=parent)

        children = list(parent.children.all())
        assert len(children) == 2
        assert child1 in children
        assert child2 in children

    def test_category_parent_relationship(self, product_category_factory):
        """Test parent foreign key relationship."""
        parent = product_category_factory(name='Parent')
        child = product_category_factory(name='Child', parent=parent)

        assert child.parent == parent

    def test_category_cascade_delete(self, product_category_factory):
        """Test that deleting parent cascades to children."""
        parent = product_category_factory(name='Parent')
        child = product_category_factory(name='Child', parent=parent)
        child_id = child.id

        parent.delete()

        assert not ProductCategory.objects.filter(id=child_id).exists()


@pytest.mark.django_db
class TestProductOptionModel:
    """Unit tests for the ProductOption model."""

    def test_create_product(self, product_option_factory):
        """Test creating a basic product."""
        product = product_option_factory(name='Basic Product')

        assert product.name == 'Basic Product'
        assert product.type == 'PRODUCT'
        assert product.is_active

    def test_create_package(self, product_option_factory):
        """Test creating a package."""
        package = product_option_factory(package=True)

        assert package.type == 'PACKAGE'
        assert 'Package' in package.name

    def test_product_string_representation(self, product_option_factory):
        """Test ProductOption __str__ returns name with type."""
        product = product_option_factory(name='Test Product')

        assert str(product) == 'Test Product (Product)'

    def test_package_string_representation(self, product_option_factory):
        """Test package __str__ shows package type."""
        package = product_option_factory(name='Test Package', package=True)

        assert str(package) == 'Test Package (Package)'

    def test_product_formatted_price_fixed(self, product_option_factory):
        """Test formatted_price for fixed pricing."""
        product = product_option_factory(
            pricing_model='FIXED',
            base_price=Decimal('5000.00'),
            currency='PHP'
        )

        assert product.formatted_price == 'PHP 5000.00'

    def test_product_formatted_price_hourly(self, product_option_factory):
        """Test formatted_price for hourly pricing."""
        product = product_option_factory(hourly=True, base_price=Decimal('500.00'))

        assert product.formatted_price == 'PHP 500.00/hour'

    def test_product_formatted_price_custom(self, product_option_factory):
        """Test formatted_price for custom quote pricing."""
        product = product_option_factory(custom_quote=True)

        assert product.formatted_price == 'Custom Quote'

    def test_product_category_relationship(self, product_option_factory, product_category_factory):
        """Test product belongs to category."""
        category = product_category_factory(name='Events')
        product = product_option_factory(category=category)

        assert product.category == category
        assert product in category.products.all()

    def test_product_unique_together_name_category(self, product_option_factory, product_category_factory):
        """Test that name + category must be unique."""
        category = product_category_factory(name='Test Category')
        product_option_factory(name='Same Name', category=category)

        with pytest.raises(IntegrityError):
            product_option_factory(name='Same Name', category=category)

    def test_product_allow_same_name_different_category(self, product_option_factory, product_category_factory):
        """Test same name allowed in different categories."""
        cat1 = product_category_factory(name='Category 1')
        cat2 = product_category_factory(name='Category 2')

        p1 = product_option_factory(name='Same Name', category=cat1)
        p2 = product_option_factory(name='Same Name', category=cat2)

        assert p1.name == p2.name
        assert p1.category != p2.category

    def test_product_featured_trait(self, product_option_factory):
        """Test featured product trait."""
        product = product_option_factory(featured=True)

        assert product.is_featured

    def test_product_inactive_trait(self, product_option_factory):
        """Test inactive product trait."""
        product = product_option_factory(inactive=True)

        assert not product.is_active

    def test_product_hourly_pricing(self, product_option_factory):
        """Test hourly pricing configuration."""
        product = product_option_factory(hourly=True)

        assert product.pricing_model == 'HOURLY'
        assert product.minimum_hours == 2
        assert product.maximum_hours == 8

    def test_product_with_guest_limits(self, product_option_factory):
        """Test guest limit configuration."""
        product = product_option_factory(with_guest_limits=True)

        assert product.minimum_guests == 10
        assert product.maximum_guests == 100
        assert product.recommended_guests == 50

    def test_multi_day_product(self, product_option_factory):
        """Test multi-day event configuration."""
        product = product_option_factory(multi_day=True)

        assert product.event_days == 2

    def test_custom_package(self, product_option_factory):
        """Test custom package configuration."""
        package = product_option_factory(custom_package=True)

        assert package.is_custom
        assert package.booking_session_id is not None
        assert package.bundle_discount_percent == Decimal('10.00')

    def test_tax_inclusive_product(self, product_option_factory):
        """Test tax inclusive pricing."""
        product = product_option_factory(tax_inclusive=True)

        assert product.is_tax_inclusive

    def test_product_ordering(self, product_option_factory, product_category_factory):
        """Test products are ordered by category sort order, then sort order, then name."""
        cat1 = product_category_factory(name='Cat A', sort_order=1)
        cat2 = product_category_factory(name='Cat B', sort_order=0)

        p1 = product_option_factory(name='Product Z', category=cat1, sort_order=0)
        p2 = product_option_factory(name='Product A', category=cat2, sort_order=0)
        p3 = product_option_factory(name='Product B', category=cat2, sort_order=1)

        products = list(ProductOption.objects.all())

        # Cat2 (sort_order=0) comes first
        assert products[0] == p2
        assert products[1] == p3
        assert products[2] == p1

    def test_product_requires_approval(self, product_option_factory):
        """Test products requiring admin approval."""
        product = product_option_factory(requires_admin_approval=True)

        assert product.requires_approval


@pytest.mark.django_db
class TestProductOptionPriceWithTax:
    """Tests for ProductOption.price_with_tax property."""

    def test_price_with_tax_returns_none_for_custom(self, product_option_factory):
        """Test price_with_tax returns None for custom quote pricing."""
        product = product_option_factory(custom_quote=True)

        assert product.price_with_tax is None

    def test_price_with_tax_inclusive_returns_base_price(self, product_option_factory):
        """Test tax-inclusive products return base_price as price_with_tax."""
        product = product_option_factory(
            tax_inclusive=True,
            base_price=Decimal('1000.00')
        )

        assert product.price_with_tax == Decimal('1000.00')


@pytest.mark.django_db
class TestDiscountModel:
    """Unit tests for the Discount model."""

    def test_create_discount(self, discount_factory):
        """Test creating a basic discount."""
        discount = discount_factory(name='Summer Sale')

        assert discount.name == 'Summer Sale'
        assert discount.is_active
        assert discount.discount_type == 'PERCENTAGE'

    def test_discount_string_representation(self, discount_factory):
        """Test Discount __str__ returns informative string."""
        discount = discount_factory(
            name='10% Off',
            discount_type='PERCENTAGE',
            value=Decimal('10.00')
        )

        assert '10% Off' in str(discount)
        assert 'Percentage' in str(discount)

    def test_discount_code_uniqueness(self, discount_factory):
        """Test discount codes must be unique."""
        discount_factory(code='UNIQUE')

        with pytest.raises(IntegrityError):
            discount_factory(code='UNIQUE')

    def test_discount_percentage_type(self, discount_factory):
        """Test percentage discount configuration."""
        discount = discount_factory(percentage=True)

        assert discount.discount_type == 'PERCENTAGE'
        assert discount.value == Decimal('15.00')

    def test_discount_fixed_amount_type(self, discount_factory):
        """Test fixed amount discount configuration."""
        discount = discount_factory(fixed_amount=True)

        assert discount.discount_type == 'FIXED'
        assert discount.value == Decimal('500.00')

    def test_discount_free_hours_type(self, discount_factory):
        """Test free hours discount configuration."""
        discount = discount_factory(free_hours=True)

        assert discount.discount_type == 'FREE_HOURS'
        assert discount.value == Decimal('2.00')

    def test_discount_automatic_application(self, discount_factory):
        """Test automatic discount application type."""
        discount = discount_factory(automatic=True)

        assert discount.application_type == 'AUTOMATIC'
        assert discount.code is None

    def test_discount_admin_only(self, discount_factory):
        """Test admin-only discount application type."""
        discount = discount_factory(admin_only=True)

        assert discount.application_type == 'ADMIN_ONLY'

    def test_discount_limited_uses(self, discount_factory):
        """Test discount with usage limits."""
        discount = discount_factory(limited_uses=True)

        assert discount.max_uses == 100
        assert discount.max_uses_per_client == 5

    def test_discount_with_minimum_order(self, discount_factory):
        """Test discount with minimum order requirement."""
        discount = discount_factory(with_minimum_order=True)

        assert discount.minimum_order_amount == Decimal('5000.00')

    def test_discount_with_minimum_hours(self, discount_factory):
        """Test discount with minimum hours requirement."""
        discount = discount_factory(with_minimum_hours=True)

        assert discount.minimum_hours == 4


@pytest.mark.django_db
class TestDiscountValidity:
    """Tests for Discount.is_valid() method."""

    def test_active_discount_is_valid(self, discount_factory):
        """Test active discount within date range is valid."""
        discount = discount_factory()

        assert discount.is_valid()

    def test_inactive_discount_is_not_valid(self, discount_factory):
        """Test inactive discount is not valid."""
        discount = discount_factory(inactive=True)

        assert not discount.is_valid()

    def test_expired_discount_is_not_valid(self, discount_factory):
        """Test expired discount is not valid."""
        discount = discount_factory(expired=True)

        assert not discount.is_valid()

    def test_future_discount_is_not_valid(self, discount_factory):
        """Test future discount is not yet valid."""
        discount = discount_factory(future=True)

        assert not discount.is_valid()

    def test_maxed_out_discount_is_not_valid(self, discount_factory):
        """Test discount that reached max uses is not valid."""
        discount = discount_factory(maxed_out=True)

        assert not discount.is_valid()

    @freeze_time('2024-06-15')
    def test_discount_validity_within_date_range(self, discount_factory):
        """Test discount is valid within its date range."""
        discount = discount_factory(with_validity_period=True)

        # Should be valid on the start date
        assert discount.is_valid()

    def test_discount_valid_when_no_max_uses(self, discount_factory):
        """Test discount with no max_uses remains valid."""
        discount = discount_factory(max_uses=None, current_uses=1000)

        assert discount.is_valid()


@pytest.mark.django_db
class TestDiscountCanBeUsedByClient:
    """Tests for Discount.can_be_used_by_client() method."""

    def test_valid_discount_can_be_used(self, discount_factory, user_factory):
        """Test valid discount can be used by client."""
        discount = discount_factory()
        client = user_factory()

        assert discount.can_be_used_by_client(client)

    def test_invalid_discount_cannot_be_used(self, discount_factory, user_factory):
        """Test invalid discount cannot be used by client."""
        discount = discount_factory(inactive=True)
        client = user_factory()

        assert not discount.can_be_used_by_client(client)

    def test_discount_fails_minimum_order_check(self, discount_factory, user_factory):
        """Test discount fails when order amount is below minimum."""
        discount = discount_factory(
            with_minimum_order=True,
            minimum_order_amount=Decimal('5000.00')
        )
        client = user_factory()

        assert not discount.can_be_used_by_client(
            client,
            order_amount=Decimal('3000.00')
        )

    def test_discount_passes_minimum_order_check(self, discount_factory, user_factory):
        """Test discount passes when order amount meets minimum."""
        discount = discount_factory(
            with_minimum_order=True,
            minimum_order_amount=Decimal('5000.00')
        )
        client = user_factory()

        assert discount.can_be_used_by_client(
            client,
            order_amount=Decimal('6000.00')
        )

    def test_discount_fails_minimum_hours_check(self, discount_factory, user_factory):
        """Test discount fails when hours are below minimum."""
        discount = discount_factory(
            with_minimum_hours=True,
            minimum_hours=4
        )
        client = user_factory()

        assert not discount.can_be_used_by_client(client, order_hours=2)

    def test_discount_passes_minimum_hours_check(self, discount_factory, user_factory):
        """Test discount passes when hours meet minimum."""
        discount = discount_factory(
            with_minimum_hours=True,
            minimum_hours=4
        )
        client = user_factory()

        assert discount.can_be_used_by_client(client, order_hours=5)


@pytest.mark.django_db
class TestDiscountApplicability:
    """Tests for Discount product/category applicability."""

    def test_discount_applicable_to_product(self, discount_factory, product_option_factory):
        """Test discount can be linked to specific products."""
        product = product_option_factory(name='Target Product')
        discount = discount_factory()
        discount.applicable_products.add(product)

        assert product in discount.applicable_products.all()

    def test_discount_applicable_to_category(self, discount_factory, product_category_factory):
        """Test discount can be linked to specific categories."""
        category = product_category_factory(name='Target Category')
        discount = discount_factory()
        discount.applicable_categories.add(category)

        assert category in discount.applicable_categories.all()

    def test_discount_multiple_products(self, discount_factory, product_option_factory):
        """Test discount can be linked to multiple products."""
        products = [product_option_factory() for _ in range(3)]
        discount = discount_factory()
        discount.applicable_products.set(products)

        assert discount.applicable_products.count() == 3
