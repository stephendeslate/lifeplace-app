# backend/core/domains/products/services.py
import logging
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError

from .exceptions import DiscountCodeExists
from .models import Discount, ProductCategory, ProductOption

logger = logging.getLogger(__name__)


class ProductCategoryService:
    """Service for managing product categories"""

    @staticmethod
    def get_all_categories(search_query=None, is_active=None, parent_id=None):
        """Get all categories with filtering options and optimized annotations"""
        from .selectors import get_all_categories

        return get_all_categories(search_query=search_query, is_active=is_active, parent_id=parent_id)

    @staticmethod
    def get_categories_tree():
        """Get categories organized as a tree structure"""
        from .selectors import get_categories_tree

        return get_categories_tree()

    @staticmethod
    def get_category_by_id(category_id):
        """Get a category by ID"""
        from .selectors import get_category_by_id

        return get_category_by_id(category_id=category_id)

    @staticmethod
    def create_category(category_data):
        """Create a new category"""
        with transaction.atomic():
            # Auto-generate slug
            if "slug" not in category_data:
                category_data["slug"] = slugify(category_data["name"])

            # Ensure unique slug
            base_slug = category_data["slug"]
            counter = 1
            while ProductCategory.objects.filter(slug=category_data["slug"]).exists():
                category_data["slug"] = f"{base_slug}-{counter}"
                counter += 1

            category = ProductCategory.objects.create(**category_data)
            logger.info(f"Created new category: {category.name}")
            return category

    @staticmethod
    def update_category(category_id, category_data):
        """Update an existing category"""
        category = ProductCategoryService.get_category_by_id(category_id)

        with transaction.atomic():
            # Update slug if name changed
            if "name" in category_data and category_data["name"] != category.name:
                new_slug = slugify(category_data["name"])
                if new_slug != category.slug:
                    # Ensure unique slug
                    base_slug = new_slug
                    counter = 1
                    while ProductCategory.objects.filter(slug=new_slug).exclude(id=category.id).exists():
                        new_slug = f"{base_slug}-{counter}"
                        counter += 1
                    category_data["slug"] = new_slug

            for key, value in category_data.items():
                setattr(category, key, value)

            category.save()
            logger.info(f"Updated category: {category.name}")
            return category

    @staticmethod
    def delete_category(category_id):
        """Delete a category (soft delete by setting inactive)"""
        category = ProductCategoryService.get_category_by_id(category_id)

        # Check if category has products
        if category.products.filter(is_active=True).exists():
            raise ValueError("Cannot delete category with active products")

        # Check if category has children
        if category.children.filter(is_active=True).exists():
            raise ValueError("Cannot delete category with active subcategories")

        category.is_active = False
        category.save()

        logger.info(f"Deleted category: {category.name}")
        return True


class ProductService:
    """Service for managing products"""

    @staticmethod
    def get_all_products(
        search_query=None,
        product_type=None,
        is_active=None,
        category_id=None,
        is_featured=None,
        event_type_id=None,
        event_days=None,
    ):
        """Get all products with filtering options

        Args:
            search_query: Search text for name, description, or SKU
            product_type: Filter by PRODUCT or PACKAGE type
            is_active: Filter by active status
            category_id: Filter by category
            is_featured: Filter by featured status
            event_type_id: Filter by event type (Wedding, Camps, Team Building, etc.)
            event_days: Filter by duration in days (1=Day Trip, 2=2D1N, 3=3D2N, 4=4D3N)
        """
        from .selectors import get_all_products

        return get_all_products(
            search_query=search_query,
            product_type=product_type,
            is_active=is_active,
            category_id=category_id,
            is_featured=is_featured,
            event_type_id=event_type_id,
            event_days=event_days,
        )

    @staticmethod
    def get_product_by_id(product_id):
        """Get a product by ID"""
        from .selectors import get_product_by_id

        return get_product_by_id(product_id=product_id)

    @staticmethod
    def create_product(product_data):
        """Create a new product"""
        with transaction.atomic():
            # Auto-generate SKU if not provided
            if not product_data.get("sku"):
                product_data["sku"] = ProductService._generate_sku(product_data)

            # Handle ManyToMany field: event_types (via input_event_type_ids)
            event_type_ids = None
            if "input_event_type_ids" in product_data:
                event_type_ids = product_data.pop("input_event_type_ids")

            product = ProductOption.objects.create(**product_data)

            # Set ManyToMany relationships after creation
            if event_type_ids is not None:
                product.event_types.set(event_type_ids)

            logger.info(f"Created new {product.get_type_display()}: {product.name}")
            return product

    @staticmethod
    def update_product(product_id, product_data):
        """Update an existing product"""
        product = ProductService.get_product_by_id(product_id)

        with transaction.atomic():
            # Handle ManyToMany field: event_types (via input_event_type_ids)
            event_type_ids = None
            if "input_event_type_ids" in product_data:
                event_type_ids = product_data.pop("input_event_type_ids")

            for key, value in product_data.items():
                setattr(product, key, value)

            product.save()

            # Update ManyToMany relationships after save
            if event_type_ids is not None:
                product.event_types.set(event_type_ids)

            logger.info(f"Updated {product.get_type_display()}: {product.name}")
            return product

    @staticmethod
    def delete_product(product_id):
        """Delete a product (soft delete by setting inactive)"""
        product = ProductService.get_product_by_id(product_id)

        # Check if product is used in any active bookings/orders
        # This would need to be implemented when orders domain is created
        # For now, just soft delete

        product.is_active = False
        product.save()

        logger.info(f"Deleted {product.get_type_display()}: {product.name}")
        return True

    @staticmethod
    def _generate_sku(product_data):
        """Generate a unique SKU for the product"""
        category = product_data.get("category")
        name = product_data.get("name", "")

        # Create base SKU from category and name
        if category:
            base = f"{category.slug[:3].upper()}-{name[:3].upper()}"
        else:
            base = f"PRD-{name[:3].upper()}"

        # Ensure uniqueness
        counter = 1
        sku = f"{base}-{counter:03d}"
        while ProductOption.objects.filter(sku=sku).exists():
            counter += 1
            sku = f"{base}-{counter:03d}"

        return sku


class DiscountService:
    """Service for managing discounts"""

    @staticmethod
    def get_all_discounts(search_query=None, is_active=None, is_valid=None, discount_type=None):
        """Get all discounts with filtering options"""
        from .selectors import get_all_discounts

        return get_all_discounts(
            search_query=search_query,
            is_active=is_active,
            is_valid=is_valid,
            discount_type=discount_type,
        )

    @staticmethod
    def get_discount_by_id(discount_id):
        """Get a discount by ID"""
        from .selectors import get_discount_by_id

        return get_discount_by_id(discount_id=discount_id)

    @staticmethod
    def get_discount_by_code(code):
        """Get a discount by code"""
        from .selectors import get_discount_by_code

        return get_discount_by_code(code=code)

    @staticmethod
    def validate_discount_code(code, order_amount=None, order_hours=None):
        """
        Validate a discount code through all business rules.

        Returns:
            tuple: (Discount or None, error_message or None, error_type or None)
        """
        from .selectors import validate_discount_code

        return validate_discount_code(code=code, order_amount=order_amount, order_hours=order_hours)

    @staticmethod
    def create_discount(discount_data):
        """Create a new discount"""
        # Check if discount code already exists (if provided)
        code = discount_data.get("code")
        if code and Discount.objects.filter(code__iexact=code).exists():
            raise DiscountCodeExists()

        with transaction.atomic():
            # Extract many-to-many fields
            applicable_products = discount_data.pop("applicable_products", [])
            applicable_categories = discount_data.pop("applicable_categories", [])

            # Create discount
            discount = Discount.objects.create(**discount_data)

            # Add applicable products and categories
            if applicable_products:
                discount.applicable_products.set(applicable_products)
            if applicable_categories:
                discount.applicable_categories.set(applicable_categories)

            logger.info(f"Created new discount: {discount.name}")
            return discount

    @staticmethod
    def update_discount(discount_id, discount_data):
        """Update an existing discount"""
        discount = DiscountService.get_discount_by_id(discount_id)

        # Check if code is being changed and would conflict
        if "code" in discount_data and discount_data["code"] != discount.code:
            if discount_data["code"] and Discount.objects.filter(code__iexact=discount_data["code"]).exists():
                raise DiscountCodeExists()

        with transaction.atomic():
            # Handle many-to-many fields separately
            applicable_products = None
            applicable_categories = None
            if "applicable_products" in discount_data:
                applicable_products = discount_data.pop("applicable_products")
            if "applicable_categories" in discount_data:
                applicable_categories = discount_data.pop("applicable_categories")

            # Update discount fields
            for key, value in discount_data.items():
                setattr(discount, key, value)

            discount.save()

            # Update many-to-many relationships if provided
            if applicable_products is not None:
                discount.applicable_products.set(applicable_products)
            if applicable_categories is not None:
                discount.applicable_categories.set(applicable_categories)

            logger.info(f"Updated discount: {discount.name}")
            return discount

    @staticmethod
    def delete_discount(discount_id):
        """Delete a discount"""
        discount = DiscountService.get_discount_by_id(discount_id)
        discount_name = discount.name

        with transaction.atomic():
            discount.delete()
            logger.info(f"Deleted discount: {discount_name}")
            return True

    @staticmethod
    def increment_discount_usage(discount_id):
        """Increment the usage count of a discount"""
        discount = DiscountService.get_discount_by_id(discount_id)

        discount.current_uses += 1
        discount.save(update_fields=["current_uses", "updated_at"])

        return discount

    @staticmethod
    def validate_discount_for_order(
        discount, client, products=None, categories=None, order_amount=None, order_hours=None
    ):
        """Validate if a discount can be applied to an order"""
        from .selectors import validate_discount_for_order

        return validate_discount_for_order(
            discount=discount,
            client=client,
            products=products,
            categories=categories,
            order_amount=order_amount,
            order_hours=order_hours,
        )


class CustomPackageService:
    """
    Service for creating custom packages from venue selections.
    Used by the venue selection booking flow step.
    """

    BUNDLE_DISCOUNT_PERCENT = Decimal("10.00")  # 10% off for 2+ venues

    @classmethod
    def get_venue_pricing_for_event_type(cls, venue, event_type_id=None):
        """
        Get venue pricing, checking event-type-specific configuration first.

        Args:
            venue: Venue instance
            event_type_id: Optional event type ID for event-type-specific pricing

        Returns:
            dict: {base_price, included_hours, excess_hour_price, is_all_day_access}
        """
        from .selectors import get_venue_pricing_for_event_type

        return get_venue_pricing_for_event_type(venue=venue, event_type_id=event_type_id)

    @classmethod
    def create_from_venues(cls, venue_ids, booking_session_id, category_id=None, event_type_id=None):
        """
        Create a custom package from selected venues.

        Args:
            venue_ids: List of venue IDs to include in the package
            booking_session_id: ID of the booking session creating this package
            category_id: Optional category ID for the package
            event_type_id: Optional event type ID for event-type-specific pricing

        Returns:
            ProductOption: The created custom package

        Note:
            The first venue in the list is used for excess hour pricing and marked as primary.
            One event per day means all venues are available if any date is available.
        """
        from core.domains.venues.models import PackageVenue, Venue

        venues = Venue.objects.filter(id__in=venue_ids, is_rentable_standalone=True, is_active=True)

        if not venues.exists():
            raise ValidationError("No valid rentable venues selected")

        venue_list = list(venues)

        # Use first venue for excess hour pricing
        venue_list[0]

        # Calculate totals from standalone pricing (considering event type)
        total_hours = Decimal("0")
        total_price = Decimal("0")
        venue_pricing_data = []

        for venue in venue_list:
            pricing = cls.get_venue_pricing_for_event_type(venue, event_type_id)
            venue_pricing_data.append({"venue": venue, "pricing": pricing})
            total_hours += pricing["included_hours"]
            total_price += pricing["base_price"]

        # Apply bundle discount for multi-venue selections
        discount_percent = cls.BUNDLE_DISCOUNT_PERCENT if len(venue_list) > 1 else Decimal("0")
        discount_amount = total_price * (discount_percent / Decimal("100"))
        final_price = total_price - discount_amount

        # Get default category if not provided
        if not category_id:
            default_category = ProductCategory.objects.filter(is_active=True, requires_venue=True).first()
            if not default_category:
                default_category = ProductCategory.objects.filter(is_active=True).first()
            category_id = default_category.id if default_category else None

        if not category_id:
            raise ValidationError("No product category available for custom package")

        # Generate package name
        venue_names = " + ".join(v.name for v in venue_list)
        package_name = f"Custom: {venue_names}"

        with transaction.atomic():
            # Create the custom package
            # Note: Excess hours are now managed per-venue via PackageVenue relationships
            package = ProductOption.objects.create(
                name=package_name,
                description=f"Custom package with: {venue_names}",
                category_id=category_id,
                type="PACKAGE",
                pricing_model="FIXED",
                base_price=final_price,
                is_active=True,
                is_custom=True,
                booking_session_id=booking_session_id,
                bundle_discount_percent=discount_percent,
            )

            # Create PackageVenue links using event-type-aware pricing
            for i, vpd in enumerate(venue_pricing_data):
                venue = vpd["venue"]
                pricing = vpd["pricing"]
                PackageVenue.objects.create(
                    package=package,
                    venue=venue,
                    is_primary=(i == 0),
                    access_order=i + 1,
                    access_duration_hours=pricing["included_hours"],
                    hours_contribution=pricing["included_hours"],
                    price_contribution=pricing["base_price"],
                    is_bonus=False,
                )

            logger.info(
                f"Created custom package '{package.name}' (ID: {package.id}) "
                f"for session {booking_session_id} with {len(venue_list)} venues"
                f" (event_type_id={event_type_id})"
            )

            return package

    @classmethod
    def cleanup_abandoned_packages(cls, older_than_hours=24):
        """
        Remove custom packages from abandoned booking sessions.

        Args:
            older_than_hours: Delete custom packages older than this many hours

        Returns:
            int: Number of packages deleted
        """
        cutoff = timezone.now() - timedelta(hours=older_than_hours)

        # Find custom packages that:
        # 1. Are marked as custom
        # 2. Were created before the cutoff
        # 3. Have no associated quotes or bookings
        abandoned_packages = (
            ProductOption.objects.filter(
                is_custom=True,
                created_at__lt=cutoff,
            )
            .exclude(
                # Exclude packages that have quotes
                quote_line_items__isnull=False
            )
            .exclude(
                # Exclude packages that have bookings
                booking_products__isnull=False
            )
        )

        count = abandoned_packages.count()

        if count > 0:
            # Delete associated PackageVenue records first (cascade should handle this)
            abandoned_packages.delete()
            logger.info(f"Cleaned up {count} abandoned custom packages older than {older_than_hours} hours")

        return count

    @classmethod
    def get_package_venue_breakdown(cls, package_id):
        """
        Get the venue breakdown for a custom package.

        Args:
            package_id: ID of the package

        Returns:
            dict: Venue breakdown with pricing details
        """
        from .selectors import get_package_venue_breakdown

        return get_package_venue_breakdown(package_id=package_id)

    @classmethod
    def find_matching_packages(cls, venue_ids, bundle_discount_percent=None, event_type_id=None):
        """
        Find pre-made packages that match or partially match the selected venues.
        Returns packages with match type and price comparison data.

        Args:
            venue_ids: List of venue IDs selected by user
            bundle_discount_percent: Optional discount percent for custom package calculation
            event_type_id: Optional event type ID for event-type-specific pricing

        Returns:
            dict: Contains exact_matches, partial_matches, and custom_package_estimate
        """
        from .selectors import find_matching_packages

        return find_matching_packages(
            venue_ids=venue_ids,
            bundle_discount_percent=bundle_discount_percent,
            event_type_id=event_type_id,
        )


class RatesPageService:
    """Service for assembling rates page data from the database"""

    WEDDING_EVENT_TYPE_ID = 5  # From fixtures: Wedding event type pk=5

    @classmethod
    def get_rates_page_data(cls):
        """
        Build complete rates page response from database.

        Returns structured data for the four sections of the rates page:
        - event_packages: grouped by category with tiers
        - wedding_venues: standalone venues with wedding-specific config
        - wedding_combos: multi-venue wedding packages
        - all_in_weddings: comprehensive wedding packages
        """
        from .selectors import get_rates_page_data

        return get_rates_page_data()

    @classmethod
    def _get_event_packages(cls):
        """Get event packages grouped by category with tiers"""
        from .selectors import _get_event_packages

        return _get_event_packages()

    @classmethod
    def _get_wedding_venues(cls):
        """Get wedding venue pricing from VenueEventTypeConfiguration"""
        from .selectors import _get_wedding_venues

        return _get_wedding_venues()

    @classmethod
    def _get_section_products(cls, section):
        """Get products for a rates page section (wedding_combos or all_in_weddings)"""
        from .selectors import _get_section_products

        return _get_section_products(section=section)
