"""
Unit tests for products domain serializers.

Tests:
- ProductCategorySerializer (validation, computed fields)
- ProductCategoryTreeSerializer (children serialization)
- ProductOptionSerializer (validation, computed fields)
- DiscountSerializer (validation, computed fields)
- DiscountDetailSerializer (nested serialization)
"""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APIRequestFactory

import pytest

from core.domains.products.exceptions import InvalidDateRange, InvalidDiscountValue
from core.domains.products.serializers import (
    DiscountDetailSerializer,
    DiscountSerializer,
    ProductCategorySerializer,
    ProductCategoryTreeSerializer,
    ProductOptionSerializer,
)


@pytest.fixture
def request_context():
    """Provide request context for serializers."""
    factory = APIRequestFactory()
    request = factory.get("/")
    return {"request": request}


@pytest.mark.django_db
class TestProductCategorySerializer:
    """Tests for ProductCategorySerializer."""

    def test_serialize_category(self, product_category_factory, request_context):
        """Test serializing a category."""
        category = product_category_factory(name="Events")
        serializer = ProductCategorySerializer(category, context=request_context)
        data = serializer.data

        assert data["name"] == "Events"
        assert data["is_active"] is True
        assert "full_path" in data
        assert "level" in data
        assert "children_count" in data
        assert "products_count" in data

    def test_full_path_computed_field(self, product_category_factory, request_context):
        """Test full_path computed field shows hierarchy."""
        parent = product_category_factory(name="Events")
        child = product_category_factory(name="Weddings", parent=parent)

        serializer = ProductCategorySerializer(child, context=request_context)

        assert serializer.data["full_path"] == "Events > Weddings"

    def test_level_computed_field(self, product_category_factory, request_context):
        """Test level computed field shows nesting depth."""
        parent = product_category_factory(name="Level 0")
        child = product_category_factory(name="Level 1", parent=parent)

        parent_serializer = ProductCategorySerializer(parent, context=request_context)
        child_serializer = ProductCategorySerializer(child, context=request_context)

        assert parent_serializer.data["level"] == 0
        assert child_serializer.data["level"] == 1

    def test_children_count_computed_field(self, product_category_factory, request_context):
        """Test children_count shows active children count."""
        parent = product_category_factory(name="Parent")
        product_category_factory(name="Active Child", parent=parent, is_active=True)
        product_category_factory(name="Inactive Child", parent=parent, is_active=False)

        serializer = ProductCategorySerializer(parent, context=request_context)

        assert serializer.data["children_count"] == 1

    def test_products_count_computed_field(self, product_category_factory, product_option_factory, request_context):
        """Test products_count shows active products count."""
        category = product_category_factory(name="Events")
        product_option_factory(category=category, is_active=True)
        product_option_factory(category=category, is_active=True)
        product_option_factory(category=category, inactive=True)

        serializer = ProductCategorySerializer(category, context=request_context)

        assert serializer.data["products_count"] == 2

    def test_validate_auto_generates_slug(self, product_category_factory):
        """Test slug is auto-generated from name during validation."""
        data = {"name": "New Category", "description": "A new category", "is_active": True, "sort_order": 0}
        serializer = ProductCategorySerializer(data=data)

        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["slug"] == "new-category"

    def test_validate_prevents_self_parent(self, product_category_factory):
        """Test validation prevents category being its own parent."""
        category = product_category_factory(name="Self")
        data = {"parent": category.id}
        serializer = ProductCategorySerializer(category, data=data, partial=True)

        assert not serializer.is_valid()
        assert "parent" in serializer.errors

    def test_validate_prevents_circular_parent(self, product_category_factory):
        """Test validation prevents circular parent relationships."""
        grandparent = product_category_factory(name="Grandparent")
        parent = product_category_factory(name="Parent", parent=grandparent)
        child = product_category_factory(name="Child", parent=parent)

        # Try to make grandparent a child of its own grandchild
        data = {"parent": child.id}
        serializer = ProductCategorySerializer(grandparent, data=data, partial=True)

        assert not serializer.is_valid()
        assert "parent" in serializer.errors

    def test_read_only_fields(self, product_category_factory, request_context):
        """Test read-only fields are included in output."""
        category = product_category_factory()
        serializer = ProductCategorySerializer(category, context=request_context)
        data = serializer.data

        assert "id" in data
        assert "slug" in data
        assert "created_at" in data
        assert "updated_at" in data


@pytest.mark.django_db
class TestProductCategoryTreeSerializer:
    """Tests for ProductCategoryTreeSerializer."""

    def test_serialize_tree_includes_children(self, product_category_factory, request_context):
        """Test tree serializer includes children."""
        parent = product_category_factory(name="Parent")
        product_category_factory(name="Child 1", parent=parent)
        product_category_factory(name="Child 2", parent=parent)

        serializer = ProductCategoryTreeSerializer(parent, context=request_context)
        data = serializer.data

        assert "children" in data
        assert len(data["children"]) == 2

    def test_children_only_includes_active(self, product_category_factory, request_context):
        """Test children only includes active categories."""
        parent = product_category_factory(name="Parent")
        product_category_factory(name="Active", parent=parent, is_active=True)
        product_category_factory(name="Inactive", parent=parent, is_active=False)

        serializer = ProductCategoryTreeSerializer(parent, context=request_context)

        assert len(serializer.data["children"]) == 1

    def test_children_ordered_by_sort_order_then_name(self, product_category_factory, request_context):
        """Test children are ordered by sort_order then name."""
        parent = product_category_factory(name="Parent")
        product_category_factory(name="Z Child", parent=parent, sort_order=0)
        product_category_factory(name="A Child", parent=parent, sort_order=1)
        product_category_factory(name="M Child", parent=parent, sort_order=0)

        serializer = ProductCategoryTreeSerializer(parent, context=request_context)
        children = serializer.data["children"]

        # Sort order 0 first (M, Z alphabetically), then sort order 1 (A)
        assert children[0]["name"] == "M Child"
        assert children[1]["name"] == "Z Child"
        assert children[2]["name"] == "A Child"


@pytest.mark.django_db
class TestProductOptionSerializer:
    """Tests for ProductOptionSerializer."""

    def test_serialize_product(self, product_option_factory, request_context):
        """Test serializing a product."""
        product = product_option_factory(name="Test Product")
        serializer = ProductOptionSerializer(product, context=request_context)
        data = serializer.data

        assert data["name"] == "Test Product"
        assert data["type"] == "PRODUCT"
        assert "type_display" in data
        assert "pricing_model_display" in data
        assert "category_name" in data
        assert "formatted_price" in data

    def test_type_display_field(self, product_option_factory, request_context):
        """Test type_display shows human-readable type."""
        product = product_option_factory()
        package = product_option_factory(package=True)

        product_serializer = ProductOptionSerializer(product, context=request_context)
        package_serializer = ProductOptionSerializer(package, context=request_context)

        assert product_serializer.data["type_display"] == "Product"
        assert package_serializer.data["type_display"] == "Package"

    def test_pricing_model_display_field(self, product_option_factory, request_context):
        """Test pricing_model_display shows human-readable pricing model."""
        fixed = product_option_factory(pricing_model="FIXED")
        hourly = product_option_factory(hourly=True)

        fixed_serializer = ProductOptionSerializer(fixed, context=request_context)
        hourly_serializer = ProductOptionSerializer(hourly, context=request_context)

        assert fixed_serializer.data["pricing_model_display"] == "Fixed Price"
        assert hourly_serializer.data["pricing_model_display"] == "Hourly Rate"

    def test_category_name_field(self, product_option_factory, product_category_factory, request_context):
        """Test category_name shows category name."""
        category = product_category_factory(name="Events")
        product = product_option_factory(category=category)

        serializer = ProductOptionSerializer(product, context=request_context)

        assert serializer.data["category_name"] == "Events"

    def test_category_path_field(self, product_option_factory, product_category_factory, request_context):
        """Test category_path shows full category path."""
        parent = product_category_factory(name="Events")
        child = product_category_factory(name="Weddings", parent=parent)
        product = product_option_factory(category=child)

        serializer = ProductOptionSerializer(product, context=request_context)

        assert serializer.data["category_path"] == "Events > Weddings"

    def test_formatted_price_field(self, product_option_factory, request_context):
        """Test formatted_price shows formatted price string."""
        product = product_option_factory(pricing_model="FIXED", base_price=Decimal("2500.00"), currency="PHP")

        serializer = ProductOptionSerializer(product, context=request_context)

        assert serializer.data["formatted_price"] == "PHP 2500.00"

    def test_event_type_ids_field(self, product_option_factory, event_type_factory, request_context):
        """Test event_type_ids returns list of event type IDs."""
        event_type = event_type_factory(name="Wedding")
        product = product_option_factory(package=True)
        product.event_types.add(event_type)

        serializer = ProductOptionSerializer(product, context=request_context)

        assert event_type.id in serializer.data["event_type_ids"]

    def test_event_type_names_field(self, product_option_factory, event_type_factory, request_context):
        """Test event_type_names returns list of event type names."""
        event_type = event_type_factory(name="Wedding")
        product = product_option_factory(package=True)
        product.event_types.add(event_type)

        serializer = ProductOptionSerializer(product, context=request_context)

        assert "Wedding" in serializer.data["event_type_names"]

    def test_validate_hour_constraints(self, product_category_factory):
        """Test validation fails when minimum_hours > maximum_hours."""
        category = product_category_factory()
        data = {
            "name": "Test Product",
            "description": "Description",
            "category": category.id,
            "type": "PRODUCT",
            "pricing_model": "HOURLY",
            "base_price": "100.00",
            "minimum_hours": 10,
            "maximum_hours": 5,
        }
        serializer = ProductOptionSerializer(data=data)

        assert not serializer.is_valid()
        assert "maximum_hours" in serializer.errors

    def test_validate_booking_day_constraints(self, product_category_factory):
        """Test validation fails when advance_booking_days > maximum_booking_days."""
        category = product_category_factory()
        data = {
            "name": "Test Product",
            "description": "Description",
            "category": category.id,
            "type": "PRODUCT",
            "pricing_model": "FIXED",
            "base_price": "100.00",
            "advance_booking_days": 30,
            "maximum_booking_days": 7,
        }
        serializer = ProductOptionSerializer(data=data)

        assert not serializer.is_valid()
        assert "maximum_booking_days" in serializer.errors

    def test_valid_hour_constraints(self, product_category_factory):
        """Test validation passes with valid hour constraints."""
        category = product_category_factory()
        data = {
            "name": "Test Product",
            "description": "Description",
            "category": category.id,
            "type": "PRODUCT",
            "pricing_model": "HOURLY",
            "base_price": "100.00",
            "minimum_hours": 2,
            "maximum_hours": 8,
        }
        serializer = ProductOptionSerializer(data=data)

        assert serializer.is_valid(), serializer.errors

    def test_effective_featured_image_with_product_image(self, product_option_factory, request_context):
        """Test effective_featured_image returns product image when set."""
        # Note: This tests the serializer method logic
        # Full image testing would require file handling setup
        product = product_option_factory()

        serializer = ProductOptionSerializer(product, context=request_context)

        # Without an actual image, should return None
        assert serializer.data["effective_featured_image"] is None

    def test_effective_gallery_images_empty_by_default(self, product_option_factory, request_context):
        """Test effective_gallery_images returns empty list when no images."""
        product = product_option_factory()

        serializer = ProductOptionSerializer(product, context=request_context)

        assert serializer.data["effective_gallery_images"] == []

    def test_included_venues_empty_for_products(self, product_option_factory, request_context):
        """Test included_venues returns empty for non-package products."""
        product = product_option_factory(type="PRODUCT")

        serializer = ProductOptionSerializer(product, context=request_context)

        assert serializer.data["included_venues"] == []


@pytest.mark.django_db
class TestDiscountSerializer:
    """Tests for DiscountSerializer."""

    def test_serialize_discount(self, discount_factory, request_context):
        """Test serializing a discount."""
        discount = discount_factory(name="Summer Sale")
        serializer = DiscountSerializer(discount, context=request_context)
        data = serializer.data

        assert data["name"] == "Summer Sale"
        assert "discount_type_display" in data
        assert "application_type_display" in data
        assert "is_valid_now" in data
        assert "usage_percentage" in data

    def test_discount_type_display(self, discount_factory, request_context):
        """Test discount_type_display shows human-readable type."""
        percentage = discount_factory(percentage=True)
        fixed = discount_factory(fixed_amount=True)

        pct_serializer = DiscountSerializer(percentage, context=request_context)
        fixed_serializer = DiscountSerializer(fixed, context=request_context)

        assert pct_serializer.data["discount_type_display"] == "Percentage"
        assert fixed_serializer.data["discount_type_display"] == "Fixed Amount"

    def test_is_valid_now_field(self, discount_factory, request_context):
        """Test is_valid_now computed field."""
        valid = discount_factory()
        expired = discount_factory(expired=True)

        valid_serializer = DiscountSerializer(valid, context=request_context)
        expired_serializer = DiscountSerializer(expired, context=request_context)

        assert valid_serializer.data["is_valid_now"] is True
        assert expired_serializer.data["is_valid_now"] is False

    def test_applicable_products_count(self, discount_factory, product_option_factory, request_context):
        """Test applicable_products_count computed field."""
        discount = discount_factory()
        products = [product_option_factory() for _ in range(3)]
        discount.applicable_products.set(products)

        serializer = DiscountSerializer(discount, context=request_context)

        assert serializer.data["applicable_products_count"] == 3

    def test_applicable_categories_count(self, discount_factory, product_category_factory, request_context):
        """Test applicable_categories_count computed field."""
        discount = discount_factory()
        categories = [product_category_factory() for _ in range(2)]
        discount.applicable_categories.set(categories)

        serializer = DiscountSerializer(discount, context=request_context)

        assert serializer.data["applicable_categories_count"] == 2

    def test_usage_percentage_with_max_uses(self, discount_factory, request_context):
        """Test usage_percentage when max_uses is set."""
        discount = discount_factory(max_uses=100, current_uses=25)

        serializer = DiscountSerializer(discount, context=request_context)

        assert serializer.data["usage_percentage"] == 25.0

    def test_usage_percentage_without_max_uses(self, discount_factory, request_context):
        """Test usage_percentage is None when max_uses not set."""
        discount = discount_factory(max_uses=None)

        serializer = DiscountSerializer(discount, context=request_context)

        assert serializer.data["usage_percentage"] is None

    def test_validate_percentage_range(self, discount_factory):
        """Test validation fails for percentage > 100."""

        data = {
            "name": "Invalid Discount",
            "description": "Test",
            "discount_type": "PERCENTAGE",
            "value": "150.00",
            "valid_from": timezone.now().date(),
            "application_type": "AUTOMATIC",
        }
        serializer = DiscountSerializer(data=data)

        with pytest.raises(InvalidDiscountValue):
            serializer.is_valid(raise_exception=True)

    def test_validate_percentage_positive(self, discount_factory):
        """Test validation fails for percentage <= 0."""

        data = {
            "name": "Invalid Discount",
            "description": "Test",
            "discount_type": "PERCENTAGE",
            "value": "0",
            "valid_from": timezone.now().date(),
            "application_type": "AUTOMATIC",
        }
        serializer = DiscountSerializer(data=data)

        with pytest.raises(InvalidDiscountValue):
            serializer.is_valid(raise_exception=True)

    def test_validate_fixed_positive(self, discount_factory):
        """Test validation fails for fixed amount <= 0."""

        data = {
            "name": "Invalid Discount",
            "description": "Test",
            "discount_type": "FIXED",
            "value": "-100.00",
            "valid_from": timezone.now().date(),
            "application_type": "AUTOMATIC",
        }
        serializer = DiscountSerializer(data=data)

        with pytest.raises(InvalidDiscountValue):
            serializer.is_valid(raise_exception=True)

    def test_validate_date_range(self, discount_factory):
        """Test validation fails when valid_until < valid_from."""

        data = {
            "name": "Invalid Discount",
            "description": "Test",
            "discount_type": "PERCENTAGE",
            "value": "10.00",
            "valid_from": timezone.now().date(),
            "valid_until": (timezone.now() - timedelta(days=1)).date(),
            "application_type": "AUTOMATIC",
        }
        serializer = DiscountSerializer(data=data)

        with pytest.raises(InvalidDateRange):
            serializer.is_valid(raise_exception=True)

    def test_validate_code_required_needs_code(self, discount_factory):
        """Test validation fails when CODE_REQUIRED but no code provided."""
        data = {
            "name": "Code Discount",
            "description": "Test",
            "discount_type": "PERCENTAGE",
            "value": "10.00",
            "valid_from": timezone.now().date(),
            "application_type": "CODE_REQUIRED",
            "code": "",
        }
        serializer = DiscountSerializer(data=data)

        assert not serializer.is_valid()
        assert "code" in serializer.errors

    def test_validate_automatic_clears_code(self, discount_factory):
        """Test validation clears code for automatic discounts."""
        data = {
            "name": "Auto Discount",
            "description": "Test",
            "discount_type": "PERCENTAGE",
            "value": "10.00",
            "valid_from": timezone.now().date(),
            "application_type": "AUTOMATIC",
            "code": "SHOULDBECLEARED",
        }
        serializer = DiscountSerializer(data=data)

        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["code"] is None


@pytest.mark.django_db
class TestDiscountDetailSerializer:
    """Tests for DiscountDetailSerializer."""

    def test_includes_full_product_data(self, discount_factory, product_option_factory, request_context):
        """Test detail serializer includes full product information."""
        discount = discount_factory()
        product = product_option_factory(name="Test Product")
        discount.applicable_products.add(product)

        serializer = DiscountDetailSerializer(discount, context=request_context)
        products = serializer.data["applicable_products"]

        assert len(products) == 1
        assert products[0]["name"] == "Test Product"
        assert "type" in products[0]
        assert "base_price" in products[0]

    def test_includes_full_category_data(self, discount_factory, product_category_factory, request_context):
        """Test detail serializer includes full category information."""
        discount = discount_factory()
        category = product_category_factory(name="Test Category")
        discount.applicable_categories.add(category)

        serializer = DiscountDetailSerializer(discount, context=request_context)
        categories = serializer.data["applicable_categories"]

        assert len(categories) == 1
        assert categories[0]["name"] == "Test Category"
        assert "full_path" in categories[0]
        assert "level" in categories[0]
