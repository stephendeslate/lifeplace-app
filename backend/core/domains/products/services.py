# backend/core/domains/products/services.py
import logging
from datetime import timedelta
from decimal import Decimal

from django.db import models, transaction
from django.db.models import Count, Q, Prefetch
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError

from .exceptions import DiscountCodeExists, DiscountNotFound, ProductNotFound, CategoryNotFound
from .models import Discount, ProductOption, ProductCategory

logger = logging.getLogger(__name__)


class ProductCategoryService:
    """Service for managing product categories"""

    @staticmethod
    def get_all_categories(search_query=None, is_active=None, parent_id=None):
        """Get all categories with filtering options and optimized annotations"""
        # Annotate counts to avoid N+1 queries in serializers
        queryset = ProductCategory.objects.annotate(
            _children_count=Count('children', filter=Q(children__is_active=True)),
            _products_count=Count('products', filter=Q(products__is_active=True)),
        )
        
        # Apply filters if provided
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        
        if parent_id is not None:
            if parent_id == 0:  # Root categories
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parent_id)
            
        return queryset.order_by('sort_order', 'name')
    
    @staticmethod
    def get_categories_tree():
        """Get categories organized as a tree structure"""
        root_categories = ProductCategory.objects.filter(
            parent__isnull=True, 
            is_active=True
        ).prefetch_related(
            Prefetch(
                'children',
                queryset=ProductCategory.objects.filter(is_active=True).order_by('sort_order', 'name'),
                to_attr='prefetched_children'
            )
        ).order_by('sort_order', 'name')
        
        return root_categories
    
    @staticmethod
    def get_category_by_id(category_id):
        """Get a category by ID"""
        try:
            return ProductCategory.objects.get(id=category_id)
        except ProductCategory.DoesNotExist:
            raise CategoryNotFound()
    
    @staticmethod
    def create_category(category_data):
        """Create a new category"""
        with transaction.atomic():
            # Auto-generate slug
            if 'slug' not in category_data:
                category_data['slug'] = slugify(category_data['name'])
            
            # Ensure unique slug
            base_slug = category_data['slug']
            counter = 1
            while ProductCategory.objects.filter(slug=category_data['slug']).exists():
                category_data['slug'] = f"{base_slug}-{counter}"
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
            if 'name' in category_data and category_data['name'] != category.name:
                new_slug = slugify(category_data['name'])
                if new_slug != category.slug:
                    # Ensure unique slug
                    base_slug = new_slug
                    counter = 1
                    while ProductCategory.objects.filter(slug=new_slug).exclude(id=category.id).exists():
                        new_slug = f"{base_slug}-{counter}"
                        counter += 1
                    category_data['slug'] = new_slug
            
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
    def get_all_products(search_query=None, product_type=None, is_active=None, category_id=None,
                         is_featured=None, event_type_id=None, event_days=None):
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
        queryset = ProductOption.objects.select_related('category').prefetch_related('event_types').all()

        # Apply filters if provided
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(sku__icontains=search_query)
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
        return queryset.order_by('category__sort_order', 'sort_order', 'name').distinct()
    
    @staticmethod
    def get_product_by_id(product_id):
        """Get a product by ID"""
        try:
            return ProductOption.objects.select_related('category').prefetch_related('event_types').get(id=product_id)
        except ProductOption.DoesNotExist:
            raise ProductNotFound()
    
    @staticmethod
    def create_product(product_data):
        """Create a new product"""
        with transaction.atomic():
            # Auto-generate SKU if not provided
            if not product_data.get('sku'):
                product_data['sku'] = ProductService._generate_sku(product_data)

            # Handle ManyToMany field: event_types (via input_event_type_ids)
            event_type_ids = None
            if 'input_event_type_ids' in product_data:
                event_type_ids = product_data.pop('input_event_type_ids')

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
            if 'input_event_type_ids' in product_data:
                event_type_ids = product_data.pop('input_event_type_ids')

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
        category = product_data.get('category')
        name = product_data.get('name', '')
        
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
        queryset = Discount.objects.prefetch_related('applicable_products', 'applicable_categories').all()
        
        # Apply filters if provided
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(code__icontains=search_query) |
                Q(description__icontains=search_query)
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
                queryset = queryset.filter(
                    is_active=True,
                    valid_from__lte=today
                ).filter(
                    Q(valid_until__isnull=True) | Q(valid_until__gte=today)
                ).filter(
                    Q(max_uses__isnull=True) | Q(current_uses__lt=models.F('max_uses'))
                )
            else:
                # Invalid discounts: either inactive, expired, or reached max uses
                queryset = queryset.filter(
                    Q(is_active=False) |
                    Q(valid_from__gt=today) |
                    Q(valid_until__lt=today) |
                    Q(max_uses__isnull=False, current_uses__gte=models.F('max_uses'))
                )
            
        return queryset.order_by('-created_at')
    
    @staticmethod
    def get_discount_by_id(discount_id):
        """Get a discount by ID"""
        try:
            return Discount.objects.prefetch_related('applicable_products', 'applicable_categories').get(id=discount_id)
        except Discount.DoesNotExist:
            raise DiscountNotFound()
    
    @staticmethod
    def get_discount_by_code(code):
        """Get a discount by code"""
        try:
            return Discount.objects.prefetch_related('applicable_products', 'applicable_categories').get(
                code__iexact=code, 
                is_active=True
            )
        except Discount.DoesNotExist:
            raise DiscountNotFound()
    
    @staticmethod
    def validate_discount_code(code, order_amount=None, order_hours=None):
        """
        Validate a discount code through all business rules.

        Returns:
            tuple: (Discount or None, error_message or None, error_type or None)
        """
        # Step 1: Look up by code + active
        try:
            discount = Discount.objects.prefetch_related(
                'applicable_products', 'applicable_categories'
            ).get(code__iexact=code, is_active=True)
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
                return None, f"Minimum order of ₱{discount.minimum_order_amount:,.2f} required for this discount.", "minimum_order_requirement_not_met"

        if discount.minimum_hours and order_hours is not None:
            if order_hours < discount.minimum_hours:
                return None, f"Minimum {discount.minimum_hours} hours required for this discount.", "minimum_hours_requirement_not_met"

        return discount, None, None

    @staticmethod
    def create_discount(discount_data):
        """Create a new discount"""
        # Check if discount code already exists (if provided)
        code = discount_data.get('code')
        if code and Discount.objects.filter(code__iexact=code).exists():
            raise DiscountCodeExists()
        
        with transaction.atomic():
            # Extract many-to-many fields
            applicable_products = discount_data.pop('applicable_products', [])
            applicable_categories = discount_data.pop('applicable_categories', [])
            
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
        if 'code' in discount_data and discount_data['code'] != discount.code:
            if discount_data['code'] and Discount.objects.filter(code__iexact=discount_data['code']).exists():
                raise DiscountCodeExists()
        
        with transaction.atomic():
            # Handle many-to-many fields separately
            applicable_products = None
            applicable_categories = None
            if 'applicable_products' in discount_data:
                applicable_products = discount_data.pop('applicable_products')
            if 'applicable_categories' in discount_data:
                applicable_categories = discount_data.pop('applicable_categories')
            
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
        discount.save(update_fields=['current_uses', 'updated_at'])
        
        return discount
    
    @staticmethod
    def validate_discount_for_order(discount, client, products=None, categories=None, order_amount=None, order_hours=None):
        """Validate if a discount can be applied to an order"""
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
                applicable_product_ids = list(discount.applicable_products.values_list('id', flat=True))
                product_ids = [p.id if hasattr(p, 'id') else p for p in products]
                
                if not any(pid in applicable_product_ids for pid in product_ids):
                    # Check categories
                    if categories:
                        applicable_category_ids = list(discount.applicable_categories.values_list('id', flat=True))
                        category_ids = [c.id if hasattr(c, 'id') else c for c in categories]
                        
                        if not any(cid in applicable_category_ids for cid in category_ids):
                            return False, "Discount is not applicable to selected products or categories"
                    else:
                        return False, "Discount is not applicable to selected products"
        
        return True, "Discount is valid"


class CustomPackageService:
    """
    Service for creating custom packages from venue selections.
    Used by the venue selection booking flow step.
    """
    BUNDLE_DISCOUNT_PERCENT = Decimal('10.00')  # 10% off for 2+ venues

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
        from core.domains.venues.models import VenueEventTypeConfiguration

        # Check for event-type-specific configuration
        if event_type_id:
            try:
                config = VenueEventTypeConfiguration.objects.get(
                    venue=venue,
                    event_type_id=event_type_id
                )
                return {
                    'base_price': config.get_effective_base_price() or Decimal('0'),
                    'included_hours': config.get_effective_included_hours() or Decimal('0'),
                    'excess_hour_price': config.get_effective_excess_hour_price() or Decimal('0'),
                    'is_all_day_access': config.is_all_day_access,
                    'has_event_type_config': True,
                }
            except VenueEventTypeConfiguration.DoesNotExist:
                pass

        # Fall back to venue defaults
        return {
            'base_price': venue.standalone_base_price or Decimal('0'),
            'included_hours': venue.standalone_included_hours or Decimal('0'),
            'excess_hour_price': venue.standalone_excess_hour_price or Decimal('0'),
            'is_all_day_access': False,
            'has_event_type_config': False,
        }

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
        from core.domains.venues.models import Venue, PackageVenue

        venues = Venue.objects.filter(
            id__in=venue_ids,
            is_rentable_standalone=True,
            is_active=True
        )

        if not venues.exists():
            raise ValidationError("No valid rentable venues selected")

        venue_list = list(venues)

        # Use first venue for excess hour pricing
        first_venue = venue_list[0]

        # Calculate totals from standalone pricing (considering event type)
        total_hours = Decimal('0')
        total_price = Decimal('0')
        venue_pricing_data = []

        for venue in venue_list:
            pricing = cls.get_venue_pricing_for_event_type(venue, event_type_id)
            venue_pricing_data.append({'venue': venue, 'pricing': pricing})
            total_hours += pricing['included_hours']
            total_price += pricing['base_price']

        # Apply bundle discount for multi-venue selections
        discount_percent = cls.BUNDLE_DISCOUNT_PERCENT if len(venue_list) > 1 else Decimal('0')
        discount_amount = total_price * (discount_percent / Decimal('100'))
        final_price = total_price - discount_amount

        # Get default category if not provided
        if not category_id:
            default_category = ProductCategory.objects.filter(
                is_active=True,
                requires_venue=True
            ).first()
            if not default_category:
                default_category = ProductCategory.objects.filter(is_active=True).first()
            category_id = default_category.id if default_category else None

        if not category_id:
            raise ValidationError("No product category available for custom package")

        # Generate package name
        venue_names = ' + '.join(v.name for v in venue_list)
        package_name = f"Custom: {venue_names}"

        with transaction.atomic():
            # Create the custom package
            # Note: Excess hours are now managed per-venue via PackageVenue relationships
            package = ProductOption.objects.create(
                name=package_name,
                description=f"Custom package with: {venue_names}",
                category_id=category_id,
                type='PACKAGE',
                pricing_model='FIXED',
                base_price=final_price,
                is_active=True,
                is_custom=True,
                booking_session_id=booking_session_id,
                bundle_discount_percent=discount_percent,
            )

            # Create PackageVenue links using event-type-aware pricing
            for i, vpd in enumerate(venue_pricing_data):
                venue = vpd['venue']
                pricing = vpd['pricing']
                PackageVenue.objects.create(
                    package=package,
                    venue=venue,
                    is_primary=(i == 0),
                    access_order=i + 1,
                    access_duration_hours=pricing['included_hours'],
                    hours_contribution=pricing['included_hours'],
                    price_contribution=pricing['base_price'],
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
        abandoned_packages = ProductOption.objects.filter(
            is_custom=True,
            created_at__lt=cutoff,
        ).exclude(
            # Exclude packages that have quotes
            quote_line_items__isnull=False
        ).exclude(
            # Exclude packages that have bookings
            booking_products__isnull=False
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
        from core.domains.venues.models import PackageVenue

        package = ProductOption.objects.filter(id=package_id, is_custom=True).first()
        if not package:
            return None

        package_venues = PackageVenue.objects.filter(
            package=package
        ).select_related('venue').order_by('access_order')

        venues = []
        for pv in package_venues:
            venues.append({
                'id': pv.venue.id,
                'name': pv.venue.name,
                'is_primary': pv.is_primary,
                'is_bonus': pv.is_bonus,
                'hours_contribution': pv.hours_contribution,
                'price_contribution': pv.price_contribution,
                'access_order': pv.access_order,
            })

        return {
            'package_id': package.id,
            'package_name': package.name,
            'is_custom': package.is_custom,
            'base_price': package.base_price,
            'bundle_discount_percent': package.bundle_discount_percent,
            'venues': venues,
        }

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
        from core.domains.venues.models import Venue, PackageVenue

        if not venue_ids:
            return {
                'exact_matches': [],
                'partial_matches': [],
                'custom_package_estimate': None,
            }

        venue_set = set(venue_ids)
        discount_percent = Decimal(str(bundle_discount_percent)) if bundle_discount_percent else cls.BUNDLE_DISCOUNT_PERCENT

        # Get selected venues for custom package price calculation
        selected_venues = Venue.objects.filter(
            id__in=venue_ids,
            is_active=True,
            is_rentable_standalone=True
        )

        # Calculate custom package estimate using event-type-aware pricing
        custom_total_price = Decimal('0')
        custom_total_hours = Decimal('0')
        venue_details = []

        for venue in selected_venues:
            pricing = cls.get_venue_pricing_for_event_type(venue, event_type_id)
            custom_total_price += pricing['base_price']
            custom_total_hours += pricing['included_hours']
            venue_details.append({
                'id': venue.id,
                'name': venue.name,
                'price': str(pricing['base_price']),
                'hours': str(pricing['included_hours']),
                'is_all_day_access': pricing['is_all_day_access'],
                'has_event_type_config': pricing['has_event_type_config'],
            })

        # Apply bundle discount for multi-venue
        custom_discount = custom_total_price * (discount_percent / Decimal('100')) if len(venue_ids) > 1 else Decimal('0')
        custom_final_price = custom_total_price - custom_discount

        custom_package_estimate = {
            'subtotal': str(custom_total_price),
            'discount_percent': str(discount_percent) if len(venue_ids) > 1 else '0',
            'discount_amount': str(custom_discount),
            'total': str(custom_final_price),
            'included_hours': int(custom_total_hours),
            'venues': venue_details,
        }

        # Find all pre-made packages (not custom) that include at least one selected venue
        packages_query = ProductOption.objects.filter(
            type='PACKAGE',
            is_active=True,
            is_custom=False,  # Only pre-made packages
        )

        # Filter by event type if provided
        if event_type_id:
            packages_query = packages_query.filter(event_types__id=event_type_id)

        packages_with_venues = packages_query.prefetch_related(
            'package_venues__venue'
        ).distinct()

        exact_matches = []
        partial_matches = []

        for package in packages_with_venues:
            package_venue_ids = set(
                pv.venue_id for pv in package.package_venues.all()
                if not pv.is_bonus  # Exclude bonus venues from matching
            )

            if not package_venue_ids:
                continue

            # Check match type
            if package_venue_ids == venue_set:
                # Exact match - package has exactly the venues user selected
                match_type = 'exact'
            elif venue_set.issubset(package_venue_ids):
                # Package contains all selected venues plus more
                match_type = 'superset'
            elif package_venue_ids.issubset(venue_set):
                # Selected venues contain all package venues plus more
                match_type = 'subset'
            elif package_venue_ids & venue_set:
                # Partial overlap
                match_type = 'partial'
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
                    'id': pv.venue.id,
                    'name': pv.venue.name,
                    'included_hours': included_hours,
                    'is_included': pv.venue.id in venue_set,  # Frontend expects 'is_included'
                    'is_primary': pv.is_primary,
                    'is_included_in_selection': pv.venue.id in venue_set,  # Keep for backwards compat
                }
                if pv.is_bonus:
                    bonus_venues.append(venue_info)
                else:
                    package_venues.append(venue_info)

            # Calculate savings compared to custom package
            package_price = package.base_price or Decimal('0')
            savings = custom_final_price - package_price if custom_final_price > package_price else Decimal('0')
            savings_percent = (savings / custom_final_price * 100) if custom_final_price > 0 else Decimal('0')

            # Calculate match score (0-100)
            match_scores = {'exact': 100, 'superset': 80, 'subset': 60, 'partial': 40}
            match_score = match_scores.get(match_type, 0)

            package_data = {
                'id': package.id,
                'name': package.name,
                'description': package.description,
                'price': str(package.base_price),  # Frontend expects 'price'
                'base_price': str(package.base_price),  # Keep for backwards compat
                'included_hours': total_included_hours,
                'match_type': match_type,
                'match_score': match_score,
                'is_featured': getattr(package, 'is_featured', False),
                'venues': package_venues,
                'bonus_venues': bonus_venues,
                'savings_vs_custom': str(savings),
                'savings_percent': str(savings_percent.quantize(Decimal('0.1'))),
                'is_better_value': package_price < custom_final_price,
                'additional_venues': [
                    v for v in package_venues
                    if not v['is_included_in_selection']
                ],
                'missing_venues': [
                    {'id': vid, 'name': next((v['name'] for v in venue_details if v['id'] == vid), 'Unknown')}
                    for vid in venue_set - package_venue_ids
                ],
            }

            if match_type == 'exact':
                exact_matches.append(package_data)
            else:
                partial_matches.append(package_data)

        # Sort partial matches by savings (best value first)
        partial_matches.sort(key=lambda x: Decimal(x['savings_vs_custom']), reverse=True)

        # Combine matches into a single list (exact matches first, then partial)
        all_packages = exact_matches + partial_matches

        # Determine recommendation
        if exact_matches and any(p['is_better_value'] for p in exact_matches):
            recommendation = 'use_package'
            recommendation_reason = 'An exact match package offers better value than building custom.'
        elif partial_matches and any(p['is_better_value'] for p in partial_matches):
            recommendation = 'use_package'
            recommendation_reason = 'A package with similar venues offers better value.'
        elif exact_matches or partial_matches:
            recommendation = 'either'
            recommendation_reason = 'Both options are competitively priced.'
        else:
            recommendation = 'use_custom'
            recommendation_reason = 'No matching packages found for your venue selection.'

        return {
            # New format expected by mobile app
            'packages': all_packages,
            'custom_estimate': custom_package_estimate,
            'recommendation': recommendation,
            'recommendation_reason': recommendation_reason,
            # Keep old format for backwards compatibility
            'exact_matches': exact_matches,
            'partial_matches': partial_matches,
            'custom_package_estimate': custom_package_estimate,
        }