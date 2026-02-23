"""
Factories for the products domain.

Based on actual models in core/domains/products/models.py:
- ProductCategory (hierarchical categories with slug auto-generation)
- ProductOption (products and packages with pricing models)
- Discount (promotional codes with various types and validity rules)
"""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from django.utils.text import slugify

import factory
from factory.django import DjangoModelFactory


class ProductCategoryFactory(DjangoModelFactory):
    """
    Factory for creating ProductCategory instances.

    Categories support hierarchical relationships (parent-child).
    """

    class Meta:
        model = "products.ProductCategory"
        skip_postgeneration_save = True

    name = factory.Sequence(lambda n: f"Category {n}")
    description = factory.Faker("sentence", nb_words=10)
    is_active = True
    sort_order = factory.Sequence(lambda n: n)
    requires_venue = False
    typical_duration_hours = None

    @factory.lazy_attribute
    def slug(self):
        """Auto-generate slug from name."""
        return slugify(self.name)

    class Params:
        """Traits for common category configurations."""

        inactive = factory.Trait(is_active=False)

        venue_required = factory.Trait(requires_venue=True, typical_duration_hours=4)

        with_parent = factory.Trait(parent=factory.SubFactory("core.factories.products.ProductCategoryFactory"))


class ProductOptionFactory(DjangoModelFactory):
    """
    Factory for creating ProductOption instances.

    Supports both PRODUCT and PACKAGE types with various pricing models.
    """

    class Meta:
        model = "products.ProductOption"
        skip_postgeneration_save = True

    name = factory.Sequence(lambda n: f"Product {n}")
    description = factory.Faker("paragraph", nb_sentences=3)
    category = factory.SubFactory(ProductCategoryFactory)

    # Pricing
    pricing_model = "FIXED"
    base_price = factory.LazyFunction(lambda: Decimal("1000.00"))
    currency = "PHP"
    is_tax_inclusive = False

    # Product configuration
    type = "PRODUCT"
    is_active = True
    is_featured = False
    allow_multiple = False
    requires_approval = False

    # Time-based configuration
    minimum_hours = None
    maximum_hours = None

    # Booking constraints
    advance_booking_days = 7
    maximum_booking_days = None

    # Guest capacity
    minimum_guests = None
    maximum_guests = None
    recommended_guests = None

    # Event duration
    event_days = None

    # Business metadata
    sort_order = factory.Sequence(lambda n: n)
    is_custom = False
    booking_session_id = None
    bundle_discount_percent = Decimal("0.00")

    # Images
    featured_image = None
    gallery_images = factory.LazyFunction(list)

    class Params:
        """Traits for common product configurations."""

        inactive = factory.Trait(is_active=False)

        featured = factory.Trait(is_featured=True)

        package = factory.Trait(type="PACKAGE", name=factory.Sequence(lambda n: f"Package {n}"))

        hourly = factory.Trait(pricing_model="HOURLY", minimum_hours=2, maximum_hours=8)

        tiered = factory.Trait(pricing_model="TIERED")

        custom_quote = factory.Trait(pricing_model="CUSTOM")

        requires_admin_approval = factory.Trait(requires_approval=True)

        with_guest_limits = factory.Trait(minimum_guests=10, maximum_guests=100, recommended_guests=50)

        multi_day = factory.Trait(event_days=2, name=factory.Sequence(lambda n: f"Multi-Day Package {n}"))

        custom_package = factory.Trait(
            is_custom=True, booking_session_id=factory.Faker("uuid4"), bundle_discount_percent=Decimal("10.00")
        )

        tax_inclusive = factory.Trait(is_tax_inclusive=True)


class DiscountFactory(DjangoModelFactory):
    """
    Factory for creating Discount instances.

    Supports percentage, fixed amount, and free hours discount types.
    """

    class Meta:
        model = "products.Discount"
        skip_postgeneration_save = True

    name = factory.Sequence(lambda n: f"Discount {n}")
    code = factory.Sequence(lambda n: f"CODE{n}")
    description = factory.Faker("sentence", nb_words=6)
    currency = "PHP"

    # Discount configuration
    discount_type = "PERCENTAGE"
    application_type = "CODE_REQUIRED"
    value = Decimal("10.00")

    # Validity
    is_active = True

    @factory.lazy_attribute
    def valid_from(self):
        """Default valid from today."""
        return timezone.now().date()

    valid_until = None

    # Usage limits
    max_uses = None
    max_uses_per_client = None
    current_uses = 0

    # Minimum requirements
    minimum_order_amount = None
    minimum_hours = None

    class Params:
        """Traits for common discount configurations."""

        inactive = factory.Trait(is_active=False)

        expired = factory.Trait(
            valid_from=factory.LazyFunction((timezone.now() - timedelta(days=30)).date),
            valid_until=factory.LazyFunction((timezone.now() - timedelta(days=1)).date),
        )

        future = factory.Trait(valid_from=factory.LazyFunction((timezone.now() + timedelta(days=7)).date))

        percentage = factory.Trait(discount_type="PERCENTAGE", value=Decimal("15.00"))

        fixed_amount = factory.Trait(discount_type="FIXED", value=Decimal("500.00"))

        free_hours = factory.Trait(discount_type="FREE_HOURS", value=Decimal("2.00"))

        automatic = factory.Trait(application_type="AUTOMATIC", code=None)

        admin_only = factory.Trait(application_type="ADMIN_ONLY")

        limited_uses = factory.Trait(max_uses=100, max_uses_per_client=5)

        with_minimum_order = factory.Trait(minimum_order_amount=Decimal("5000.00"))

        with_minimum_hours = factory.Trait(minimum_hours=4)

        maxed_out = factory.Trait(max_uses=10, current_uses=10)

        with_validity_period = factory.Trait(
            valid_from=factory.LazyFunction(lambda: timezone.now().date()),
            valid_until=factory.LazyFunction((timezone.now() + timedelta(days=30)).date),
        )
