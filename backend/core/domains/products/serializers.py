# backend/core/domains/products/serializers.py
import json

from django.utils import timezone
from rest_framework import serializers
from django.utils.text import slugify

from .exceptions import InvalidDateRange, InvalidDiscountValue
from .models import Discount, ProductOption, ProductCategory


class ProductCategorySerializer(serializers.ModelSerializer):
    """Serializer for product categories"""
    full_path = serializers.CharField(read_only=True)
    level = serializers.IntegerField(read_only=True)
    children_count = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductCategory
        fields = [
            'id', 'name', 'description', 'slug', 'parent', 'is_active',
            'sort_order', 'requires_venue', 'typical_duration_hours',
            'full_path', 'level', 'children_count', 'products_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
    
    def get_children_count(self, obj):
        return obj.children.filter(is_active=True).count()
    
    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()
    
    def validate(self, data):
        """Validate category data"""
        # Auto-generate slug from name
        if 'name' in data:
            data['slug'] = slugify(data['name'])
        
        # Prevent circular parent relationships
        parent = data.get('parent')
        if parent and self.instance:
            if parent.id == self.instance.id:
                raise serializers.ValidationError({'parent': 'A category cannot be its own parent'})
            
            # Check for circular reference in parent chain
            current_parent = parent.parent
            while current_parent:
                if current_parent.id == self.instance.id:
                    raise serializers.ValidationError({'parent': 'Circular parent relationship detected'})
                current_parent = current_parent.parent
        
        return data


class ProductCategoryTreeSerializer(ProductCategorySerializer):
    """Serializer for category with children"""
    children = serializers.SerializerMethodField()
    
    class Meta(ProductCategorySerializer.Meta):
        fields = ProductCategorySerializer.Meta.fields + ['children']
    
    def get_children(self, obj):
        if hasattr(obj, 'prefetched_children'):
            children = obj.prefetched_children
        else:
            children = obj.children.filter(is_active=True).order_by('sort_order', 'name')
        
        return ProductCategorySerializer(children, many=True, context=self.context).data


class ProductOptionSerializer(serializers.ModelSerializer):
    """Serializer for products and packages"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    pricing_model_display = serializers.CharField(source='get_pricing_model_display', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_path = serializers.CharField(source='category.full_path', read_only=True)
    formatted_price = serializers.CharField(read_only=True)
    price_with_tax = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    # Event types - ManyToMany field for filtering packages by event type
    # Read: returns list of IDs via SerializerMethodField
    # Write: accepts list of IDs via input_event_type_ids
    event_type_ids = serializers.SerializerMethodField()
    event_type_names = serializers.SerializerMethodField()
    # Writable field for setting event types (accepts array of IDs or JSON string)
    input_event_type_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text="List of event type IDs this package is available for"
    )

    def to_internal_value(self, data):
        """Handle JSON string input for event_type_ids (from FormData)"""
        if 'input_event_type_ids' in data and isinstance(data.get('input_event_type_ids'), str):
            try:
                # Parse JSON string to list
                data = data.copy()  # Don't modify original
                data['input_event_type_ids'] = json.loads(data['input_event_type_ids'])
            except (json.JSONDecodeError, TypeError):
                pass  # Let validation handle invalid format
        return super().to_internal_value(data)
    # Capacity fields
    minimum_guests = serializers.IntegerField(read_only=True, allow_null=True)
    maximum_guests = serializers.IntegerField(read_only=True, allow_null=True)
    # Image inheritance fields - fall back to venue images if product has none
    effective_featured_image = serializers.SerializerMethodField()
    effective_gallery_images = serializers.SerializerMethodField()
    # Package inclusions - venues included in this package
    included_venues = serializers.SerializerMethodField()

    class Meta:
        model = ProductOption
        fields = [
            'id', 'name', 'description', 'category', 'category_name', 'category_path',
            'pricing_model', 'pricing_model_display', 'base_price', 'currency',
            'is_tax_inclusive',  # Indicates if base_price already includes tax
            'type', 'type_display', 'is_active', 'is_featured', 'allow_multiple', 'requires_approval',
            'minimum_hours', 'maximum_hours', 'advance_booking_days', 'maximum_booking_days',
            'event_days', 'minimum_guests', 'maximum_guests',
            'sku', 'sort_order', 'event_types', 'event_type_ids', 'event_type_names',
            'input_event_type_ids',  # Writable field for setting event types
            'formatted_price', 'price_with_tax',
            'featured_image', 'gallery_images',
            'effective_featured_image', 'effective_gallery_images',
            'included_venues',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        """Handle creation with event_type_ids"""
        event_type_ids = validated_data.pop('input_event_type_ids', None)
        instance = super().create(validated_data)

        if event_type_ids is not None:
            instance.event_types.set(event_type_ids)

        return instance

    def update(self, instance, validated_data):
        """Handle update with event_type_ids"""
        event_type_ids = validated_data.pop('input_event_type_ids', None)
        instance = super().update(instance, validated_data)

        if event_type_ids is not None:
            instance.event_types.set(event_type_ids)

        return instance

    def get_event_type_ids(self, obj):
        """Return list of event type IDs this package is available for"""
        return list(obj.event_types.values_list('id', flat=True))

    def get_event_type_names(self, obj):
        """Return list of event type names this package is available for"""
        return list(obj.event_types.values_list('name', flat=True))

    def get_effective_featured_image(self, obj):
        """
        Return the product's featured image if set, otherwise fall back to
        the primary venue's featured image (for packages).
        """
        # If product has its own featured image, use it
        if obj.featured_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.featured_image.url)
            return obj.featured_image.url

        # For packages, try to get image from primary venue
        if obj.type == 'PACKAGE' and hasattr(obj, 'package_venues'):
            primary_venue = obj.package_venues.filter(is_primary=True).first()
            if primary_venue and primary_venue.venue.featured_image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(primary_venue.venue.featured_image.url)
                return primary_venue.venue.featured_image.url

            # If no primary, try first venue
            first_venue = obj.package_venues.first()
            if first_venue and first_venue.venue.featured_image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(first_venue.venue.featured_image.url)
                return first_venue.venue.featured_image.url

        return None

    def get_effective_gallery_images(self, obj):
        """
        Return the product's gallery images if set, otherwise fall back to
        collecting images from all associated venues (for packages).
        """
        # If product has its own gallery images, use them
        if obj.gallery_images and len(obj.gallery_images) > 0:
            return obj.gallery_images

        # For packages, collect images from all venues
        if obj.type == 'PACKAGE' and hasattr(obj, 'package_venues'):
            gallery = []
            request = self.context.get('request')

            for pv in obj.package_venues.select_related('venue').order_by('access_order'):
                venue = pv.venue
                # Add venue's featured image
                if venue.featured_image:
                    url = venue.featured_image.url
                    if request:
                        url = request.build_absolute_uri(url)
                    gallery.append(url)

                # Add venue's gallery images
                if venue.gallery_images:
                    for img_url in venue.gallery_images:
                        if request and not img_url.startswith('http'):
                            img_url = request.build_absolute_uri(img_url)
                        gallery.append(img_url)

            return gallery if gallery else []

        return []

    def get_included_venues(self, obj):
        """
        Return list of venues included in this package with enriched data.
        Only applicable for packages (type='PACKAGE').
        Includes venue details needed for mini card display in mobile app.

        Uses the same URL building pattern as RentableVenueSerializer.get_featured_image()
        to ensure consistent image URL handling across the API.
        """
        if obj.type != 'PACKAGE' or not hasattr(obj, 'package_venues'):
            return []

        venues = []
        request = self.context.get('request')

        for pv in obj.package_venues.select_related('venue').order_by('access_order'):
            venue = pv.venue

            # Build featured image URL using the same pattern as RentableVenueSerializer
            # The venue.featured_image is an ImageFieldFile - check if it has a file
            featured_image_url = None
            try:
                if venue.featured_image and venue.featured_image.name:
                    if request:
                        featured_image_url = request.build_absolute_uri(venue.featured_image.url)
                    else:
                        featured_image_url = venue.featured_image.url
            except (ValueError, AttributeError):
                # Handle case where ImageField has no associated file
                featured_image_url = None

            venues.append({
                'id': venue.id,
                'name': venue.name,
                'code': venue.code,
                'is_primary': pv.is_primary,
                'is_overnight': venue.is_overnight,
                'featured_image': featured_image_url,
                'minimum_capacity': venue.minimum_capacity,
                'maximum_capacity': venue.maximum_capacity,
                'location_description': venue.location_description or '',
            })
        return venues

    def validate(self, data):
        """Validate product data"""
        # Validate hour constraints
        min_hours = data.get('minimum_hours')
        max_hours = data.get('maximum_hours')
        if min_hours and max_hours and min_hours > max_hours:
            raise serializers.ValidationError({'maximum_hours': 'Maximum hours must be greater than minimum hours'})

        # Validate booking day constraints
        advance_days = data.get('advance_booking_days', 0)
        max_booking_days = data.get('maximum_booking_days')
        if max_booking_days and advance_days > max_booking_days:
            raise serializers.ValidationError({'maximum_booking_days': 'Maximum booking days must be greater than advance booking days'})

        return data


class DiscountSerializer(serializers.ModelSerializer):
    """Serializer for discounts"""
    discount_type_display = serializers.CharField(source='get_discount_type_display', read_only=True)
    application_type_display = serializers.CharField(source='get_application_type_display', read_only=True)
    is_valid_now = serializers.SerializerMethodField()
    applicable_products_count = serializers.SerializerMethodField()
    applicable_categories_count = serializers.SerializerMethodField()
    usage_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = Discount
        fields = [
            'id', 'name', 'code', 'description', 'discount_type', 'discount_type_display',
            'application_type', 'application_type_display', 'value', 'is_active',
            'valid_from', 'valid_until', 'max_uses', 'max_uses_per_client', 'current_uses',
            'minimum_order_amount', 'minimum_hours', 'applicable_products', 'applicable_categories',
            'is_valid_now', 'applicable_products_count', 'applicable_categories_count',
            'usage_percentage', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'current_uses', 'created_at', 'updated_at']
    
    def get_is_valid_now(self, obj):
        """Return whether the discount is currently valid"""
        return obj.is_valid()
    
    def get_applicable_products_count(self, obj):
        """Return count of applicable products"""
        return obj.applicable_products.count()
    
    def get_applicable_categories_count(self, obj):
        """Return count of applicable categories"""
        return obj.applicable_categories.count()
    
    def get_usage_percentage(self, obj):
        """Return usage percentage if max_uses is set"""
        if obj.max_uses:
            return round((obj.current_uses / obj.max_uses) * 100, 1)
        return None
    
    def validate(self, data):
        """Validate discount data"""
        # Check if value is valid based on discount type
        discount_type = data.get('discount_type', self.instance.discount_type if self.instance else None)
        value = data.get('value', self.instance.value if self.instance else None)
        
        if discount_type == 'PERCENTAGE' and (value <= 0 or value > 100):
            raise InvalidDiscountValue("Percentage discount must be between 0 and 100")
        
        if discount_type in ['FIXED', 'FREE_HOURS'] and value <= 0:
            raise InvalidDiscountValue(f"{discount_type.replace('_', ' ').title()} discount must be greater than 0")
        
        # Check if valid_until is after valid_from
        valid_from = data.get('valid_from', self.instance.valid_from if self.instance else None)
        valid_until = data.get('valid_until', self.instance.valid_until if self.instance else None)
        
        if valid_from and valid_until and valid_until < valid_from:
            raise InvalidDateRange()
        
        # Validate code requirements
        application_type = data.get('application_type', self.instance.application_type if self.instance else None)
        code = data.get('code', self.instance.code if self.instance else None)
        
        if application_type == 'CODE_REQUIRED' and not code:
            raise serializers.ValidationError({'code': 'Code is required for code-based discounts'})
        
        if application_type == 'AUTOMATIC' and code:
            # Clear code for automatic discounts
            data['code'] = None
            
        return data


class DiscountDetailSerializer(DiscountSerializer):
    """Detailed discount serializer with full product and category information"""
    applicable_products = ProductOptionSerializer(many=True, read_only=True)
    applicable_categories = ProductCategorySerializer(many=True, read_only=True)