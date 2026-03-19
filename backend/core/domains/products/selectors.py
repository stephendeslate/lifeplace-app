"""
Read-only query logic for the products domain.

Selectors contain all read operations (queries, lookups, filtering).
They never mutate data. All functions use keyword-only arguments (*)
for clarity at call sites.

See ADR-002: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

from decimal import Decimal

from django.db.models import Count, F, Prefetch, Q
from django.utils import timezone

from .exceptions import CategoryNotFound, DiscountNotFound, ProductNotFound
from .models import Discount, ProductCategory, ProductOption


# ---------------------------------------------------------------------------
# ProductCategory selectors
# ---------------------------------------------------------------------------


def get_all_categories(
    *,
    search_query: str | None = None,
    is_active: bool | None = None,
    parent_id: int | None = None,
):
    """Get all categories with filtering options and optimized annotations."""
    # Annotate counts to avoid N+1 queries in serializers
    queryset = ProductCategory.objects.annotate(
        _children_count=Count("children", filter=Q(children__is_active=True)),
        _products_count=Count("products", filter=Q(products__is_active=True)),
    )

    # Apply filters if provided
    if search_query:
        queryset = queryset.filter(Q(name__icontains=search_query) | Q(description__icontains=search_query))

    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    if parent_id is not None:
        if parent_id == 0:  # Root categories
            queryset = queryset.filter(parent__isnull=True)
        else:
            queryset = queryset.filter(parent_id=parent_id)

    return queryset.order_by("sort_order", "name")


def get_categories_tree():
    """Get categories organized as a tree structure."""
    root_categories = (
        ProductCategory.objects.filter(parent__isnull=True, is_active=True)
        .prefetch_related(
            Prefetch(
                "children",
                queryset=ProductCategory.objects.filter(is_active=True).order_by("sort_order", "name"),
                to_attr="prefetched_children",
            )
        )
        .order_by("sort_order", "name")
    )

    return root_categories


def get_category_by_id(*, category_id: int) -> ProductCategory:
    """Get a category by ID.

    Raises:
        CategoryNotFound: If the category does not exist.
    """
    try:
        return ProductCategory.objects.get(id=category_id)
    except ProductCategory.DoesNotExist:
        raise CategoryNotFound()


# ---------------------------------------------------------------------------
# Product selectors
# ---------------------------------------------------------------------------


def get_all_products(
    *,
    search_query: str | None = None,
    product_type: str | None = None,
    is_active: bool | None = None,
    category_id: int | None = None,
    is_featured: bool | None = None,
    event_type_id: int | None = None,
    event_days: int | None = None,
):
    """Get all products with filtering options.

    Args:
        search_query: Search text for name, description, or SKU.
        product_type: Filter by PRODUCT or PACKAGE type.
        is_active: Filter by active status.
        category_id: Filter by category.
        is_featured: Filter by featured status.
        event_type_id: Filter by event type (Wedding, Camps, Team Building, etc.).
        event_days: Filter by duration in days (1=Day Trip, 2=2D1N, 3=3D2N, 4=4D3N).
    """
    queryset = ProductOption.objects.select_related("category").prefetch_related("event_types").all()

    # Apply filters if provided
    if search_query:
        queryset = queryset.filter(
            Q(name__icontains=search_query)
            | Q(description__icontains=search_query)
            | Q(sku__icontains=search_query)
        )

    if product_type:
        queryset = queryset.filter(type=product_type)

    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    if category_id:
        queryset = queryset.filter(category_id=category_id)

    if is_featured is not None:
        queryset = queryset.filter(is_featured=is_featured)

    if event_type_id is not None:
        # Filter packages that have this event type in their event_types ManyToMany
        # Packages with no event_types are excluded (hidden when filtering by event type)
        queryset = queryset.filter(event_types__id=event_type_id)

    if event_days is not None:
        queryset = queryset.filter(event_days=event_days)

    # Order by category, then sort order, then name
    # Use distinct() to avoid duplicates from ManyToMany join
    return queryset.order_by("category__sort_order", "sort_order", "name").distinct()


def get_product_by_id(*, product_id: int) -> ProductOption:
    """Get a product by ID.

    Raises:
        ProductNotFound: If the product does not exist.
    """
    try:
        return ProductOption.objects.select_related("category").prefetch_related("event_types").get(id=product_id)
    except ProductOption.DoesNotExist:
        raise ProductNotFound()


# ---------------------------------------------------------------------------
# Discount selectors
# ---------------------------------------------------------------------------


def get_all_discounts(
    *,
    search_query: str | None = None,
    is_active: bool | None = None,
    is_valid: bool | None = None,
    discount_type: str | None = None,
):
    """Get all discounts with filtering options."""
    queryset = Discount.objects.prefetch_related("applicable_products", "applicable_categories").all()

    # Apply filters if provided
    if search_query:
        queryset = queryset.filter(
            Q(name__icontains=search_query)
            | Q(code__icontains=search_query)
            | Q(description__icontains=search_query)
        )

    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    if discount_type:
        queryset = queryset.filter(discount_type=discount_type)

    # Filter by current validity
    if is_valid is not None:
        today = timezone.now().date()
        if is_valid:
            # Valid discounts: active, not expired, not reached max uses
            queryset = (
                queryset.filter(is_active=True, valid_from__lte=today)
                .filter(Q(valid_until__isnull=True) | Q(valid_until__gte=today))
                .filter(Q(max_uses__isnull=True) | Q(current_uses__lt=F("max_uses")))
            )
        else:
            # Invalid discounts: either inactive, expired, or reached max uses
            queryset = queryset.filter(
                Q(is_active=False)
                | Q(valid_from__gt=today)
                | Q(valid_until__lt=today)
                | Q(max_uses__isnull=False, current_uses__gte=F("max_uses"))
            )

    return queryset.order_by("-created_at")


def get_discount_by_id(*, discount_id: int) -> Discount:
    """Get a discount by ID.

    Raises:
        DiscountNotFound: If the discount does not exist.
    """
    try:
        return Discount.objects.prefetch_related("applicable_products", "applicable_categories").get(id=discount_id)
    except Discount.DoesNotExist:
        raise DiscountNotFound()


def get_discount_by_code(*, code: str) -> Discount:
    """Get a discount by code.

    Raises:
        DiscountNotFound: If the discount does not exist.
    """
    try:
        return Discount.objects.prefetch_related("applicable_products", "applicable_categories").get(
            code__iexact=code, is_active=True
        )
    except Discount.DoesNotExist:
        raise DiscountNotFound()


def validate_discount_code(
    *,
    code: str,
    order_amount: Decimal | None = None,
    order_hours: int | None = None,
) -> tuple[Discount | None, str | None, str | None]:
    """Validate a discount code through all business rules.

    Returns:
        tuple: (Discount or None, error_message or None, error_type or None)
    """
    # Step 1: Look up by code + active
    try:
        discount = Discount.objects.prefetch_related("applicable_products", "applicable_categories").get(
            code__iexact=code, is_active=True
        )
    except Discount.DoesNotExist:
        return None, "Discount code not found.", "discount_not_found"

    # Step 2: Check date validity
    today = timezone.now().date()
    if today < discount.valid_from:
        return None, "This discount is not yet active.", "discount_not_active"
    if discount.valid_until and today > discount.valid_until:
        return None, "This discount has expired.", "discount_expired"

    # Step 3: Check global usage limit
    if discount.max_uses and discount.current_uses >= discount.max_uses:
        return None, "This discount has reached its usage limit.", "discount_usage_limit_reached"

    # Step 4: Check minimum order requirements
    if discount.minimum_order_amount and order_amount is not None:
        if order_amount < discount.minimum_order_amount:
            return (
                None,
                f"Minimum order of \u20b1{discount.minimum_order_amount:,.2f} required for this discount.",
                "minimum_order_requirement_not_met",
            )

    if discount.minimum_hours and order_hours is not None:
        if order_hours < discount.minimum_hours:
            return (
                None,
                f"Minimum {discount.minimum_hours} hours required for this discount.",
                "minimum_hours_requirement_not_met",
            )

    return discount, None, None


def validate_discount_for_order(
    *,
    discount: Discount,
    client: object,
    products: list | None = None,
    categories: list | None = None,
    order_amount: Decimal | None = None,
    order_hours: int | None = None,
) -> tuple[bool, str]:
    """Validate if a discount can be applied to an order.

    Returns:
        tuple: (is_valid, message)
    """
    # Check basic validity
    if not discount.is_valid():
        return False, "Discount is not currently valid"

    # Check client-specific constraints
    if not discount.can_be_used_by_client(client, order_amount, order_hours):
        return False, "Discount cannot be used by this client"

    # Check product/category applicability
    if discount.applicable_products.exists() or discount.applicable_categories.exists():
        if products:
            # Check if any products are applicable
            applicable_product_ids = list(discount.applicable_products.values_list("id", flat=True))
            product_ids = [p.id if hasattr(p, "id") else p for p in products]

            if not any(pid in applicable_product_ids for pid in product_ids):
                # Check categories
                if categories:
                    applicable_category_ids = list(discount.applicable_categories.values_list("id", flat=True))
                    category_ids = [c.id if hasattr(c, "id") else c for c in categories]

                    if not any(cid in applicable_category_ids for cid in category_ids):
                        return False, "Discount is not applicable to selected products or categories"
                else:
                    return False, "Discount is not applicable to selected products"

    return True, "Discount is valid"


# ---------------------------------------------------------------------------
# CustomPackage selectors
# ---------------------------------------------------------------------------

BUNDLE_DISCOUNT_PERCENT = Decimal("10.00")  # 10% off for 2+ venues


def get_venue_pricing_for_event_type(
    *,
    venue: object,
    event_type_id: int | None = None,
) -> dict:
    """Get venue pricing, checking event-type-specific configuration first.

    Args:
        venue: Venue instance.
        event_type_id: Optional event type ID for event-type-specific pricing.

    Returns:
        dict: {base_price, included_hours, excess_hour_price, is_all_day_access}
    """
    from core.domains.venues.models import VenueEventTypeConfiguration

    # Check for event-type-specific configuration
    if event_type_id:
        try:
            config = VenueEventTypeConfiguration.objects.get(venue=venue, event_type_id=event_type_id)
            return {
                "base_price": config.get_effective_base_price() or Decimal("0"),
                "included_hours": config.get_effective_included_hours() or Decimal("0"),
                "excess_hour_price": config.get_effective_excess_hour_price() or Decimal("0"),
                "is_all_day_access": config.is_all_day_access,
                "has_event_type_config": True,
            }
        except VenueEventTypeConfiguration.DoesNotExist:
            pass

    # Fall back to venue defaults
    return {
        "base_price": venue.standalone_base_price or Decimal("0"),
        "included_hours": venue.standalone_included_hours or Decimal("0"),
        "excess_hour_price": venue.standalone_excess_hour_price or Decimal("0"),
        "is_all_day_access": False,
        "has_event_type_config": False,
    }


def get_package_venue_breakdown(*, package_id: int) -> dict | None:
    """Get the venue breakdown for a custom package.

    Args:
        package_id: ID of the package.

    Returns:
        dict: Venue breakdown with pricing details, or None if not found.
    """
    from core.domains.venues.models import PackageVenue

    package = ProductOption.objects.filter(id=package_id, is_custom=True).first()
    if not package:
        return None

    package_venues = PackageVenue.objects.filter(package=package).select_related("venue").order_by("access_order")

    venues = []
    for pv in package_venues:
        venues.append(
            {
                "id": pv.venue.id,
                "name": pv.venue.name,
                "is_primary": pv.is_primary,
                "is_bonus": pv.is_bonus,
                "hours_contribution": pv.hours_contribution,
                "price_contribution": pv.price_contribution,
                "access_order": pv.access_order,
            }
        )

    return {
        "package_id": package.id,
        "package_name": package.name,
        "is_custom": package.is_custom,
        "base_price": package.base_price,
        "bundle_discount_percent": package.bundle_discount_percent,
        "venues": venues,
    }


def find_matching_packages(
    *,
    venue_ids: list[int],
    bundle_discount_percent: Decimal | None = None,
    event_type_id: int | None = None,
) -> dict:
    """Find pre-made packages that match or partially match the selected venues.

    Returns packages with match type and price comparison data.

    Args:
        venue_ids: List of venue IDs selected by user.
        bundle_discount_percent: Optional discount percent for custom package calculation.
        event_type_id: Optional event type ID for event-type-specific pricing.

    Returns:
        dict: Contains exact_matches, partial_matches, and custom_package_estimate.
    """
    from core.domains.venues.models import Venue

    if not venue_ids:
        return {
            "exact_matches": [],
            "partial_matches": [],
            "custom_package_estimate": None,
        }

    venue_set = set(venue_ids)
    discount_percent = (
        Decimal(str(bundle_discount_percent)) if bundle_discount_percent else BUNDLE_DISCOUNT_PERCENT
    )

    # Get selected venues for custom package price calculation
    selected_venues = Venue.objects.filter(id__in=venue_ids, is_active=True, is_rentable_standalone=True)

    # Calculate custom package estimate using event-type-aware pricing
    custom_total_price = Decimal("0")
    custom_total_hours = Decimal("0")
    venue_details = []

    for venue in selected_venues:
        pricing = get_venue_pricing_for_event_type(venue=venue, event_type_id=event_type_id)
        custom_total_price += pricing["base_price"]
        custom_total_hours += pricing["included_hours"]
        venue_details.append(
            {
                "id": venue.id,
                "name": venue.name,
                "price": str(pricing["base_price"]),
                "hours": str(pricing["included_hours"]),
                "is_all_day_access": pricing["is_all_day_access"],
                "has_event_type_config": pricing["has_event_type_config"],
            }
        )

    # Apply bundle discount for multi-venue
    custom_discount = (
        custom_total_price * (discount_percent / Decimal("100")) if len(venue_ids) > 1 else Decimal("0")
    )
    custom_final_price = custom_total_price - custom_discount

    custom_package_estimate = {
        "subtotal": str(custom_total_price),
        "discount_percent": str(discount_percent) if len(venue_ids) > 1 else "0",
        "discount_amount": str(custom_discount),
        "total": str(custom_final_price),
        "included_hours": int(custom_total_hours),
        "venues": venue_details,
    }

    # Find all pre-made packages (not custom) that include at least one selected venue
    packages_query = ProductOption.objects.filter(
        type="PACKAGE",
        is_active=True,
        is_custom=False,  # Only pre-made packages
    )

    # Filter by event type if provided
    if event_type_id:
        packages_query = packages_query.filter(event_types__id=event_type_id)

    packages_with_venues = packages_query.prefetch_related("package_venues__venue").distinct()

    exact_matches = []
    partial_matches = []

    for package in packages_with_venues:
        package_venue_ids = {
            pv.venue_id
            for pv in package.package_venues.all()
            if not pv.is_bonus  # Exclude bonus venues from matching
        }

        if not package_venue_ids:
            continue

        # Check match type
        if package_venue_ids == venue_set:
            # Exact match - package has exactly the venues user selected
            match_type = "exact"
        elif venue_set.issubset(package_venue_ids):
            # Package contains all selected venues plus more
            match_type = "superset"
        elif package_venue_ids.issubset(venue_set):
            # Selected venues contain all package venues plus more
            match_type = "subset"
        elif package_venue_ids & venue_set:
            # Partial overlap
            match_type = "partial"
        else:
            # No overlap
            continue

        # Get package venue details
        package_venues = []
        bonus_venues = []
        total_included_hours = 0
        for pv in package.package_venues.all():
            # Use hours_contribution if set, otherwise fall back to access_duration_hours
            included_hours = pv.hours_contribution or pv.access_duration_hours or 0
            total_included_hours += included_hours
            venue_info = {
                "id": pv.venue.id,
                "name": pv.venue.name,
                "included_hours": included_hours,
                "is_included": pv.venue.id in venue_set,  # Frontend expects 'is_included'
                "is_primary": pv.is_primary,
                "is_included_in_selection": pv.venue.id in venue_set,  # Keep for backwards compat
            }
            if pv.is_bonus:
                bonus_venues.append(venue_info)
            else:
                package_venues.append(venue_info)

        # Calculate savings compared to custom package
        package_price = package.base_price or Decimal("0")
        savings = custom_final_price - package_price if custom_final_price > package_price else Decimal("0")
        savings_percent = (savings / custom_final_price * 100) if custom_final_price > 0 else Decimal("0")

        # Calculate match score (0-100)
        match_scores = {"exact": 100, "superset": 80, "subset": 60, "partial": 40}
        match_score = match_scores.get(match_type, 0)

        package_data = {
            "id": package.id,
            "name": package.name,
            "description": package.description,
            "price": str(package.base_price),  # Frontend expects 'price'
            "base_price": str(package.base_price),  # Keep for backwards compat
            "included_hours": total_included_hours,
            "match_type": match_type,
            "match_score": match_score,
            "is_featured": getattr(package, "is_featured", False),
            "venues": package_venues,
            "bonus_venues": bonus_venues,
            "savings_vs_custom": str(savings),
            "savings_percent": str(savings_percent.quantize(Decimal("0.1"))),
            "is_better_value": package_price < custom_final_price,
            "additional_venues": [v for v in package_venues if not v["is_included_in_selection"]],
            "missing_venues": [
                {"id": vid, "name": next((v["name"] for v in venue_details if v["id"] == vid), "Unknown")}
                for vid in venue_set - package_venue_ids
            ],
        }

        if match_type == "exact":
            exact_matches.append(package_data)
        else:
            partial_matches.append(package_data)

    # Sort partial matches by savings (best value first)
    partial_matches.sort(key=lambda x: Decimal(x["savings_vs_custom"]), reverse=True)

    # Combine matches into a single list (exact matches first, then partial)
    all_packages = exact_matches + partial_matches

    # Determine recommendation
    if exact_matches and any(p["is_better_value"] for p in exact_matches):
        recommendation = "use_package"
        recommendation_reason = "An exact match package offers better value than building custom."
    elif partial_matches and any(p["is_better_value"] for p in partial_matches):
        recommendation = "use_package"
        recommendation_reason = "A package with similar venues offers better value."
    elif exact_matches or partial_matches:
        recommendation = "either"
        recommendation_reason = "Both options are competitively priced."
    else:
        recommendation = "use_custom"
        recommendation_reason = "No matching packages found for your venue selection."

    return {
        # New format expected by mobile app
        "packages": all_packages,
        "custom_estimate": custom_package_estimate,
        "recommendation": recommendation,
        "recommendation_reason": recommendation_reason,
        # Keep old format for backwards compatibility
        "exact_matches": exact_matches,
        "partial_matches": partial_matches,
        "custom_package_estimate": custom_package_estimate,
    }


# ---------------------------------------------------------------------------
# RatesPage selectors
# ---------------------------------------------------------------------------

WEDDING_EVENT_TYPE_ID = 5  # From fixtures: Wedding event type pk=5


def get_rates_page_data() -> dict:
    """Build complete rates page response from database.

    Returns structured data for the four sections of the rates page:
    - event_packages: grouped by category with tiers
    - wedding_venues: standalone venues with wedding-specific config
    - wedding_combos: multi-venue wedding packages
    - all_in_weddings: comprehensive wedding packages
    """
    return {
        "event_packages": _get_event_packages(),
        "wedding_venues": _get_wedding_venues(),
        "wedding_combos": _get_section_products(section="wedding_combos"),
        "all_in_weddings": _get_section_products(section="all_in_weddings"),
    }


def _get_event_packages() -> list[dict]:
    """Get event packages grouped by category with tiers."""
    categories = (
        ProductCategory.objects.filter(
            is_active=True,
            rates_page_section="event_packages",
        )
        .prefetch_related(
            Prefetch(
                "products",
                queryset=ProductOption.objects.filter(is_active=True).order_by("sort_order", "name"),
                to_attr="active_products",
            )
        )
        .order_by("sort_order", "name")
    )

    packages = []
    for cat in categories:
        products = cat.active_products
        if not products:
            continue

        tiers = []
        for product in products:
            tiers.append(
                {
                    "id": product.id,
                    "label": product.tier_label or product.name,
                    "price": str(product.base_price),
                    "pricing_unit": product.pricing_unit,
                    "is_highlighted": product.is_highlighted,
                    "event_days": product.event_days,
                    "sort_order": product.sort_order,
                }
            )

        packages.append(
            {
                "id": cat.id,
                "name": cat.name,
                "description": cat.description,
                "slug": cat.slug,
                "includes": cat.includes or [],
                "notes": cat.notes or [],
                "badge": cat.badge_text or "",
                "minimum_participants": products[0].minimum_guests,
                "tiers": tiers,
                "sort_order": cat.sort_order,
            }
        )

    return packages


def _get_wedding_venues() -> list[dict]:
    """Get wedding venue pricing from VenueEventTypeConfiguration."""
    from core.domains.venues.models import VenueEventTypeConfiguration

    configs = (
        VenueEventTypeConfiguration.objects.filter(
            event_type_id=WEDDING_EVENT_TYPE_ID,
            venue__is_active=True,
            venue__is_rentable_standalone=True,
            venue__is_overnight=False,
        )
        .select_related("venue")
        .order_by("venue__sort_order", "venue__name")
    )

    venues = []
    for config in configs:
        venue = config.venue
        effective_hours = config.get_effective_included_hours()
        effective_excess = config.get_effective_excess_hour_price()

        venues.append(
            {
                "id": venue.id,
                "name": venue.name,
                "price": str(config.get_effective_base_price() or 0),
                "duration": f"{int(effective_hours)} hours" if effective_hours else None,
                "capacity": config.capacity_label or f"{venue.minimum_capacity}-{venue.maximum_capacity} guests",
                "includes": config.includes or [],
                "excess_hour_rate": str(effective_excess) if effective_excess else None,
            }
        )

    return venues


def _get_section_products(*, section: str) -> list[dict]:
    """Get products for a rates page section (wedding_combos or all_in_weddings)."""
    categories = (
        ProductCategory.objects.filter(
            is_active=True,
            rates_page_section=section,
        )
        .prefetch_related(
            Prefetch(
                "products",
                queryset=ProductOption.objects.filter(is_active=True).order_by("sort_order", "name"),
                to_attr="active_products",
            )
        )
        .order_by("sort_order", "name")
    )

    items = []
    for cat in categories:
        for product in cat.active_products:
            item = {
                "id": product.id,
                "name": product.name,
                "price": str(product.base_price),
                "includes": cat.includes or [],
            }

            if section == "wedding_combos":
                item["duration"] = f"{product.minimum_hours} hours" if product.minimum_hours else None
            elif section == "all_in_weddings":
                item["starting_price"] = item.pop("price")
                item["guest_count"] = product.minimum_guests
                item["venues"] = product.tier_label or product.name

            items.append(item)

    return items
