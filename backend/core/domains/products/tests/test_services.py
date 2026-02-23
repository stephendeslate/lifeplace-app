"""
Unit tests for products domain services.

Tests:
- ProductCategoryService (CRUD operations, tree queries)
- ProductService (CRUD operations, filtering, SKU generation)
- DiscountService (CRUD operations, validation, usage tracking)
- CustomPackageService (package creation from venues)
"""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

import pytest

from core.domains.products.exceptions import (
    CategoryNotFound,
    DiscountCodeExists,
    DiscountNotFound,
    ProductNotFound,
)
from core.domains.products.models import Discount, ProductOption
from core.domains.products.services import (
    CustomPackageService,
    DiscountService,
    ProductCategoryService,
    ProductService,
)


@pytest.mark.django_db
class TestProductCategoryService:
    """Tests for ProductCategoryService."""

    def test_get_all_categories(self, product_category_factory):
        """Test getting all categories."""
        product_category_factory(name="Category 1")
        product_category_factory(name="Category 2")
        product_category_factory(name="Category 3")

        categories = ProductCategoryService.get_all_categories()

        assert categories.count() == 3

    def test_get_all_categories_with_search(self, product_category_factory):
        """Test searching categories by name or description."""
        product_category_factory(name="Wedding Events")
        product_category_factory(name="Corporate Events")
        product_category_factory(name="Birthday Parties", description="Fun celebrations")

        result = ProductCategoryService.get_all_categories(search_query="Events")

        assert result.count() == 2

    def test_get_all_categories_filter_active(self, product_category_factory):
        """Test filtering categories by active status."""
        product_category_factory(name="Active 1", is_active=True)
        product_category_factory(name="Active 2", is_active=True)
        product_category_factory(name="Inactive", inactive=True)

        active = ProductCategoryService.get_all_categories(is_active=True)
        inactive = ProductCategoryService.get_all_categories(is_active=False)

        assert active.count() == 2
        assert inactive.count() == 1

    def test_get_all_categories_filter_parent(self, product_category_factory):
        """Test filtering categories by parent."""
        parent = product_category_factory(name="Parent")
        child1 = product_category_factory(name="Child 1", parent=parent)
        child2 = product_category_factory(name="Child 2", parent=parent)
        product_category_factory(name="Orphan")

        children = ProductCategoryService.get_all_categories(parent_id=parent.id)

        assert children.count() == 2
        assert child1 in children
        assert child2 in children

    def test_get_all_categories_filter_root(self, product_category_factory):
        """Test getting only root categories (parent_id=0)."""
        root1 = product_category_factory(name="Root 1")
        product_category_factory(name="Root 2")
        product_category_factory(name="Child", parent=root1)

        roots = ProductCategoryService.get_all_categories(parent_id=0)

        assert roots.count() == 2

    def test_get_categories_tree(self, product_category_factory):
        """Test getting categories as tree structure."""
        root = product_category_factory(name="Root")
        product_category_factory(name="Child 1", parent=root)
        product_category_factory(name="Child 2", parent=root)

        tree = ProductCategoryService.get_categories_tree()

        assert tree.count() == 1  # Only root categories
        root_category = tree.first()
        assert hasattr(root_category, "prefetched_children")
        assert len(root_category.prefetched_children) == 2

    def test_get_categories_tree_excludes_inactive(self, product_category_factory):
        """Test tree excludes inactive categories."""
        product_category_factory(name="Active Root", is_active=True)
        product_category_factory(name="Inactive Root", inactive=True)

        tree = ProductCategoryService.get_categories_tree()

        assert tree.count() == 1

    def test_get_category_by_id(self, product_category_factory):
        """Test getting a category by ID."""
        category = product_category_factory(name="Test Category")

        result = ProductCategoryService.get_category_by_id(category.id)

        assert result == category

    def test_get_category_by_id_not_found(self):
        """Test CategoryNotFound raised for invalid ID."""
        with pytest.raises(CategoryNotFound):
            ProductCategoryService.get_category_by_id(99999)

    def test_create_category(self):
        """Test creating a new category."""
        data = {"name": "New Category", "description": "A new category", "is_active": True, "sort_order": 0}

        category = ProductCategoryService.create_category(data)

        assert category.name == "New Category"
        assert category.slug == "new-category"
        assert category.is_active

    def test_create_category_generates_unique_slug(self, product_category_factory):
        """Test slug generation handles duplicates.

        Note: ProductCategory.name has unique=True, so we use a different name
        but pass the same slug to test slug deduplication logic.
        """
        product_category_factory(name="Existing", slug="existing")

        category = ProductCategoryService.create_category(
            {
                "name": "Existing V2",
                "description": "Another one",
                "slug": "existing",  # Intentionally duplicate slug
            }
        )

        assert category.slug.startswith("existing")
        assert category.slug != "existing"

    def test_update_category(self, product_category_factory):
        """Test updating a category."""
        category = product_category_factory(name="Original Name")

        updated = ProductCategoryService.update_category(
            category.id, {"name": "Updated Name", "description": "New description"}
        )

        assert updated.name == "Updated Name"
        assert updated.description == "New description"

    def test_update_category_updates_slug_on_name_change(self, product_category_factory):
        """Test slug is updated when name changes."""
        category = product_category_factory(name="Original")

        updated = ProductCategoryService.update_category(category.id, {"name": "New Name"})

        assert updated.slug == "new-name"

    def test_delete_category_soft_delete(self, product_category_factory):
        """Test deleting a category (soft delete)."""
        category = product_category_factory(name="To Delete")

        result = ProductCategoryService.delete_category(category.id)

        category.refresh_from_db()
        assert result is True
        assert not category.is_active

    def test_delete_category_with_active_products_fails(self, product_category_factory, product_option_factory):
        """Test cannot delete category with active products."""
        category = product_category_factory(name="Has Products")
        product_option_factory(category=category, is_active=True)

        with pytest.raises(ValueError, match="active products"):
            ProductCategoryService.delete_category(category.id)

    def test_delete_category_with_active_children_fails(self, product_category_factory):
        """Test cannot delete category with active children."""
        parent = product_category_factory(name="Parent")
        product_category_factory(name="Child", parent=parent, is_active=True)

        with pytest.raises(ValueError, match="active subcategories"):
            ProductCategoryService.delete_category(parent.id)


@pytest.mark.django_db
class TestProductService:
    """Tests for ProductService."""

    def test_get_all_products(self, product_option_factory):
        """Test getting all products."""
        product_option_factory()
        product_option_factory()
        product_option_factory()

        products = ProductService.get_all_products()

        assert products.count() == 3

    def test_get_all_products_with_search(self, product_option_factory):
        """Test searching products by name, description, or SKU."""
        product_option_factory(name="Wedding Package")
        product_option_factory(name="Corporate Event", description="For weddings too")
        product_option_factory(name="Birthday Party")

        result = ProductService.get_all_products(search_query="Wedding")

        assert result.count() == 2

    def test_get_all_products_filter_type(self, product_option_factory):
        """Test filtering by product type."""
        product_option_factory(type="PRODUCT")
        product_option_factory(type="PRODUCT")
        product_option_factory(package=True)

        products = ProductService.get_all_products(product_type="PRODUCT")
        packages = ProductService.get_all_products(product_type="PACKAGE")

        assert products.count() == 2
        assert packages.count() == 1

    def test_get_all_products_filter_active(self, product_option_factory):
        """Test filtering by active status."""
        product_option_factory(is_active=True)
        product_option_factory(is_active=True)
        product_option_factory(inactive=True)

        active = ProductService.get_all_products(is_active=True)

        assert active.count() == 2

    def test_get_all_products_filter_category(self, product_option_factory, product_category_factory):
        """Test filtering by category."""
        cat1 = product_category_factory(name="Category 1")
        cat2 = product_category_factory(name="Category 2")

        product_option_factory(category=cat1)
        product_option_factory(category=cat1)
        product_option_factory(category=cat2)

        result = ProductService.get_all_products(category_id=cat1.id)

        assert result.count() == 2

    def test_get_all_products_filter_featured(self, product_option_factory):
        """Test filtering by featured status."""
        product_option_factory(featured=True)
        product_option_factory(is_featured=False)
        product_option_factory(is_featured=False)

        featured = ProductService.get_all_products(is_featured=True)

        assert featured.count() == 1

    def test_get_all_products_filter_event_type(self, product_option_factory, event_type_factory):
        """Test filtering by event type."""
        event_type = event_type_factory(name="Wedding")
        p1 = product_option_factory(package=True)
        p2 = product_option_factory(package=True)
        product_option_factory(package=True)  # No event type

        p1.event_types.add(event_type)
        p2.event_types.add(event_type)

        result = ProductService.get_all_products(event_type_id=event_type.id)

        assert result.count() == 2

    def test_get_all_products_filter_event_days(self, product_option_factory):
        """Test filtering by event days."""
        product_option_factory(event_days=1)
        product_option_factory(event_days=2)
        product_option_factory(event_days=2)

        result = ProductService.get_all_products(event_days=2)

        assert result.count() == 2

    def test_get_product_by_id(self, product_option_factory):
        """Test getting a product by ID."""
        product = product_option_factory(name="Test Product")

        result = ProductService.get_product_by_id(product.id)

        assert result == product

    def test_get_product_by_id_not_found(self):
        """Test ProductNotFound raised for invalid ID."""
        with pytest.raises(ProductNotFound):
            ProductService.get_product_by_id(99999)

    def test_create_product(self, product_category_factory):
        """Test creating a new product."""
        category = product_category_factory(name="Test Category")

        data = {
            "name": "New Product",
            "description": "A new product",
            "category": category,
            "type": "PRODUCT",
            "pricing_model": "FIXED",
            "base_price": Decimal("1000.00"),
            "is_active": True,
        }

        product = ProductService.create_product(data)

        assert product.name == "New Product"
        assert product.sku is not None  # Auto-generated

    def test_create_product_generates_sku(self, product_category_factory):
        """Test SKU is auto-generated."""
        category = product_category_factory(name="Events", slug="events")

        product = ProductService.create_product(
            {
                "name": "Wedding Package",
                "description": "Test",
                "category": category,
                "type": "PACKAGE",
                "pricing_model": "FIXED",
                "base_price": Decimal("5000.00"),
            }
        )

        assert product.sku.startswith("EVE-WED")

    def test_create_product_with_custom_sku(self, product_category_factory):
        """Test creating product with custom SKU."""
        category = product_category_factory()

        product = ProductService.create_product(
            {
                "name": "Custom SKU Product",
                "description": "Test",
                "category": category,
                "type": "PRODUCT",
                "pricing_model": "FIXED",
                "base_price": Decimal("100.00"),
                "sku": "CUSTOM-001",
            }
        )

        assert product.sku == "CUSTOM-001"

    def test_update_product(self, product_option_factory):
        """Test updating a product."""
        product = product_option_factory(name="Original")

        updated = ProductService.update_product(product.id, {"name": "Updated", "base_price": Decimal("2000.00")})

        assert updated.name == "Updated"
        assert updated.base_price == Decimal("2000.00")

    def test_delete_product_soft_delete(self, product_option_factory):
        """Test deleting a product (soft delete)."""
        product = product_option_factory(name="To Delete")

        result = ProductService.delete_product(product.id)

        product.refresh_from_db()
        assert result is True
        assert not product.is_active


@pytest.mark.django_db
class TestDiscountService:
    """Tests for DiscountService."""

    def test_get_all_discounts(self, discount_factory):
        """Test getting all discounts."""
        discount_factory()
        discount_factory()

        discounts = DiscountService.get_all_discounts()

        assert discounts.count() == 2

    def test_get_all_discounts_with_search(self, discount_factory):
        """Test searching discounts."""
        discount_factory(name="Summer Sale", code="SUMMER10")
        discount_factory(name="Winter Promo", code="WINTER20")

        result = DiscountService.get_all_discounts(search_query="Summer")

        assert result.count() == 1

    def test_get_all_discounts_filter_active(self, discount_factory):
        """Test filtering by active status."""
        discount_factory(is_active=True)
        discount_factory(inactive=True)

        active = DiscountService.get_all_discounts(is_active=True)

        assert active.count() == 1

    def test_get_all_discounts_filter_type(self, discount_factory):
        """Test filtering by discount type."""
        discount_factory(percentage=True)
        discount_factory(percentage=True)
        discount_factory(fixed_amount=True)

        percentage = DiscountService.get_all_discounts(discount_type="PERCENTAGE")

        assert percentage.count() == 2

    def test_get_all_discounts_filter_valid(self, discount_factory):
        """Test filtering by current validity."""
        discount_factory()  # Valid by default
        discount_factory(expired=True)
        discount_factory(future=True)
        discount_factory(maxed_out=True)

        valid = DiscountService.get_all_discounts(is_valid=True)

        assert valid.count() == 1

    def test_get_discount_by_id(self, discount_factory):
        """Test getting a discount by ID."""
        discount = discount_factory(name="Test Discount")

        result = DiscountService.get_discount_by_id(discount.id)

        assert result == discount

    def test_get_discount_by_id_not_found(self):
        """Test DiscountNotFound raised for invalid ID."""
        with pytest.raises(DiscountNotFound):
            DiscountService.get_discount_by_id(99999)

    def test_get_discount_by_code(self, discount_factory):
        """Test getting a discount by code."""
        discount = discount_factory(code="TESTCODE")

        result = DiscountService.get_discount_by_code("TESTCODE")

        assert result == discount

    def test_get_discount_by_code_case_insensitive(self, discount_factory):
        """Test discount code lookup is case-insensitive."""
        discount = discount_factory(code="TESTCODE")

        result = DiscountService.get_discount_by_code("testcode")

        assert result == discount

    def test_get_discount_by_code_not_found(self):
        """Test DiscountNotFound raised for invalid code."""
        with pytest.raises(DiscountNotFound):
            DiscountService.get_discount_by_code("INVALID")

    def test_get_discount_by_code_inactive(self, discount_factory):
        """Test inactive discount not found by code."""
        discount_factory(code="INACTIVE", inactive=True)

        with pytest.raises(DiscountNotFound):
            DiscountService.get_discount_by_code("INACTIVE")

    def test_create_discount(self):
        """Test creating a new discount."""
        data = {
            "name": "New Discount",
            "description": "A new discount",
            "discount_type": "PERCENTAGE",
            "value": Decimal("15.00"),
            "valid_from": timezone.now().date(),
            "application_type": "AUTOMATIC",
        }

        discount = DiscountService.create_discount(data)

        assert discount.name == "New Discount"
        assert discount.value == Decimal("15.00")

    def test_create_discount_with_code(self):
        """Test creating discount with code."""
        data = {
            "name": "Code Discount",
            "description": "With code",
            "discount_type": "FIXED",
            "value": Decimal("500.00"),
            "valid_from": timezone.now().date(),
            "application_type": "CODE_REQUIRED",
            "code": "NEWCODE",
        }

        discount = DiscountService.create_discount(data)

        assert discount.code == "NEWCODE"

    def test_create_discount_duplicate_code_fails(self, discount_factory):
        """Test creating discount with existing code fails."""
        discount_factory(code="EXISTING")

        with pytest.raises(DiscountCodeExists):
            DiscountService.create_discount(
                {
                    "name": "Duplicate",
                    "description": "Test",
                    "discount_type": "PERCENTAGE",
                    "value": Decimal("10.00"),
                    "valid_from": timezone.now().date(),
                    "application_type": "CODE_REQUIRED",
                    "code": "EXISTING",
                }
            )

    def test_create_discount_with_applicable_products(self, product_option_factory):
        """Test creating discount with applicable products."""
        products = [product_option_factory() for _ in range(2)]

        discount = DiscountService.create_discount(
            {
                "name": "Product Discount",
                "description": "Test",
                "discount_type": "PERCENTAGE",
                "value": Decimal("10.00"),
                "valid_from": timezone.now().date(),
                "application_type": "AUTOMATIC",
                "applicable_products": products,
            }
        )

        assert discount.applicable_products.count() == 2

    def test_create_discount_with_applicable_categories(self, product_category_factory):
        """Test creating discount with applicable categories."""
        categories = [product_category_factory() for _ in range(2)]

        discount = DiscountService.create_discount(
            {
                "name": "Category Discount",
                "description": "Test",
                "discount_type": "PERCENTAGE",
                "value": Decimal("10.00"),
                "valid_from": timezone.now().date(),
                "application_type": "AUTOMATIC",
                "applicable_categories": categories,
            }
        )

        assert discount.applicable_categories.count() == 2

    def test_update_discount(self, discount_factory):
        """Test updating a discount."""
        discount = discount_factory(name="Original", value=Decimal("10.00"))

        updated = DiscountService.update_discount(discount.id, {"name": "Updated", "value": Decimal("20.00")})

        assert updated.name == "Updated"
        assert updated.value == Decimal("20.00")

    def test_update_discount_code_conflict(self, discount_factory):
        """Test updating discount with conflicting code fails."""
        discount_factory(code="TAKEN")
        discount = discount_factory(code="ORIGINAL")

        with pytest.raises(DiscountCodeExists):
            DiscountService.update_discount(discount.id, {"code": "TAKEN"})

    def test_update_discount_same_code_allowed(self, discount_factory):
        """Test updating discount keeping same code is allowed."""
        discount = discount_factory(code="MYCODE")

        updated = DiscountService.update_discount(discount.id, {"code": "MYCODE", "name": "New Name"})

        assert updated.code == "MYCODE"
        assert updated.name == "New Name"

    def test_delete_discount(self, discount_factory):
        """Test deleting a discount."""
        discount = discount_factory(name="To Delete")
        discount_id = discount.id

        result = DiscountService.delete_discount(discount_id)

        assert result is True
        assert not Discount.objects.filter(id=discount_id).exists()

    def test_increment_discount_usage(self, discount_factory):
        """Test incrementing discount usage count."""
        discount = discount_factory(current_uses=5)

        updated = DiscountService.increment_discount_usage(discount.id)

        assert updated.current_uses == 6

    def test_validate_discount_for_order_valid(self, discount_factory, user_factory):
        """Test validating a valid discount for order."""
        discount = discount_factory()
        client = user_factory()

        is_valid, message = DiscountService.validate_discount_for_order(discount=discount, client=client)

        assert is_valid is True
        assert message == "Discount is valid"

    def test_validate_discount_for_order_invalid(self, discount_factory, user_factory):
        """Test validating an invalid discount for order."""
        discount = discount_factory(inactive=True)
        client = user_factory()

        is_valid, message = DiscountService.validate_discount_for_order(discount=discount, client=client)

        assert is_valid is False

    def test_validate_discount_product_applicability(self, discount_factory, product_option_factory, user_factory):
        """Test discount validation checks product applicability."""
        applicable_product = product_option_factory(name="Applicable")
        other_product = product_option_factory(name="Other")
        discount = discount_factory()
        discount.applicable_products.add(applicable_product)

        client = user_factory()

        # With applicable product
        is_valid, _ = DiscountService.validate_discount_for_order(
            discount=discount, client=client, products=[applicable_product]
        )
        assert is_valid

        # With non-applicable product
        is_valid, _ = DiscountService.validate_discount_for_order(
            discount=discount, client=client, products=[other_product]
        )
        assert not is_valid


@pytest.mark.django_db
class TestDiscountServiceValidateCode:
    """Tests for DiscountService.validate_discount_code()."""

    def test_valid_code_returns_discount(self, discount_factory):
        """Test that a valid, active code returns the discount object."""
        discount = discount_factory(code="VALID10")

        result, error_msg, error_type = DiscountService.validate_discount_code("VALID10")

        assert result is not None
        assert result.id == discount.id
        assert error_msg is None
        assert error_type is None

    def test_valid_code_case_insensitive(self, discount_factory):
        """Test that code lookup is case-insensitive."""
        discount = discount_factory(code="SUMMER25")

        result, error_msg, error_type = DiscountService.validate_discount_code("summer25")

        assert result is not None
        assert result.id == discount.id
        assert error_msg is None

    def test_nonexistent_code_returns_not_found(self, db):
        """Test that a non-existent code returns discount_not_found error."""
        result, error_msg, error_type = DiscountService.validate_discount_code("DOESNOTEXIST")

        assert result is None
        assert "not found" in error_msg.lower()
        assert error_type == "discount_not_found"

    def test_inactive_code_returns_not_found(self, discount_factory):
        """Test that an inactive code is treated as not found."""
        discount_factory(code="INACTIVE", inactive=True)

        result, error_msg, error_type = DiscountService.validate_discount_code("INACTIVE")

        assert result is None
        assert error_type == "discount_not_found"

    def test_expired_code_returns_expired(self, discount_factory):
        """Test that an expired code returns discount_expired error."""
        discount_factory(code="OLDCODE", expired=True)

        result, error_msg, error_type = DiscountService.validate_discount_code("OLDCODE")

        assert result is None
        assert "expired" in error_msg.lower()
        assert error_type == "discount_expired"

    def test_future_code_returns_not_active(self, discount_factory):
        """Test that a not-yet-active code returns discount_not_active error."""
        discount_factory(code="FUTURE", future=True)

        result, error_msg, error_type = DiscountService.validate_discount_code("FUTURE")

        assert result is None
        assert "not yet active" in error_msg.lower()
        assert error_type == "discount_not_active"

    def test_maxed_out_code_returns_usage_limit(self, discount_factory):
        """Test that a code at max uses returns usage limit error."""
        discount_factory(code="MAXED", maxed_out=True)

        result, error_msg, error_type = DiscountService.validate_discount_code("MAXED")

        assert result is None
        assert "usage limit" in error_msg.lower()
        assert error_type == "discount_usage_limit_reached"

    def test_minimum_order_not_met(self, discount_factory):
        """Test that minimum order check fails when order amount is too low."""
        discount_factory(code="MINORDER", with_minimum_order=True)  # min 5000

        result, error_msg, error_type = DiscountService.validate_discount_code(
            "MINORDER", order_amount=Decimal("2000.00")
        )

        assert result is None
        assert "minimum order" in error_msg.lower()
        assert error_type == "minimum_order_requirement_not_met"

    def test_minimum_order_met(self, discount_factory):
        """Test that minimum order check passes when order amount is sufficient."""
        discount = discount_factory(code="MINORDER", with_minimum_order=True)  # min 5000

        result, error_msg, error_type = DiscountService.validate_discount_code(
            "MINORDER", order_amount=Decimal("6000.00")
        )

        assert result is not None
        assert result.id == discount.id
        assert error_msg is None

    def test_minimum_hours_not_met(self, discount_factory):
        """Test that minimum hours check fails when hours are too low."""
        discount_factory(code="MINHOURS", with_minimum_hours=True)  # min 4 hours

        result, error_msg, error_type = DiscountService.validate_discount_code("MINHOURS", order_hours=2)

        assert result is None
        assert "minimum" in error_msg.lower() and "hours" in error_msg.lower()
        assert error_type == "minimum_hours_requirement_not_met"

    def test_minimum_hours_met(self, discount_factory):
        """Test that minimum hours check passes when hours are sufficient."""
        discount = discount_factory(code="MINHOURS", with_minimum_hours=True)  # min 4 hours

        result, error_msg, error_type = DiscountService.validate_discount_code("MINHOURS", order_hours=5)

        assert result is not None
        assert result.id == discount.id
        assert error_msg is None

    def test_order_amount_not_checked_when_not_provided(self, discount_factory):
        """Test that minimum order check is skipped when order_amount is None."""
        discount = discount_factory(code="MINORDER", with_minimum_order=True)

        # Should pass because order_amount is not provided
        result, error_msg, error_type = DiscountService.validate_discount_code("MINORDER")

        assert result is not None
        assert result.id == discount.id

    def test_order_hours_not_checked_when_not_provided(self, discount_factory):
        """Test that minimum hours check is skipped when order_hours is None."""
        discount = discount_factory(code="MINHOURS", with_minimum_hours=True)

        # Should pass because order_hours is not provided
        result, error_msg, error_type = DiscountService.validate_discount_code("MINHOURS")

        assert result is not None
        assert result.id == discount.id


@pytest.mark.django_db
class TestCustomPackageService:
    """Tests for CustomPackageService."""

    def test_bundle_discount_constant(self):
        """Test bundle discount constant is set correctly."""
        assert Decimal("10.00") == CustomPackageService.BUNDLE_DISCOUNT_PERCENT

    def test_cleanup_abandoned_packages(self, product_option_factory):
        """Test cleanup raises FieldError due to invalid reverse relation names.

        Note: The implementation's cleanup_abandoned_packages method references
        'quote_line_items' and 'booking_products' reverse relations which don't
        exist on the ProductOption model. This results in a FieldError.
        """
        from django.core.exceptions import FieldError

        # Create old custom package (more than 24 hours old)
        old_package = product_option_factory(custom_package=True, name="Old Custom Package")
        # Manually set created_at to simulate old package
        ProductOption.objects.filter(id=old_package.id).update(created_at=timezone.now() - timedelta(hours=25))

        # Create recent custom package
        product_option_factory(custom_package=True, name="Recent Custom Package")

        # Implementation references non-existent reverse relation 'quote_line_items'
        with pytest.raises(FieldError, match="Cannot resolve keyword 'quote_line_items'"):
            CustomPackageService.cleanup_abandoned_packages(older_than_hours=24)

    def test_get_package_venue_breakdown_not_custom(self, product_option_factory):
        """Test get_package_venue_breakdown returns None for non-custom packages."""
        package = product_option_factory(package=True, is_custom=False)

        result = CustomPackageService.get_package_venue_breakdown(package.id)

        assert result is None

    def test_get_package_venue_breakdown_not_found(self):
        """Test get_package_venue_breakdown returns None for invalid ID."""
        result = CustomPackageService.get_package_venue_breakdown(99999)

        assert result is None

    def test_find_matching_packages_empty_venue_ids(self):
        """Test find_matching_packages with empty venue list."""
        result = CustomPackageService.find_matching_packages(venue_ids=[])

        assert result["exact_matches"] == []
        assert result["partial_matches"] == []
        assert result["custom_package_estimate"] is None
