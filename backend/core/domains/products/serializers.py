# backend/core/domains/products/serializers.py
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
    
    class Meta:
        model = ProductOption
        fields = [
            'id', 'name', 'description', 'category', 'category_name', 'category_path',
            'pricing_model', 'pricing_model_display', 'base_price', 'currency', 'tax_rate',
            'type', 'type_display', 'is_active', 'is_featured', 'allow_multiple', 'requires_approval',
            'has_excess_hours', 'included_hours', 'excess_hour_price',
            'minimum_hours', 'maximum_hours', 'advance_booking_days', 'maximum_booking_days',
            'sku', 'sort_order', 'event_type', 'formatted_price', 'price_with_tax',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate product data"""
        # If product has excess hours, ensure included_hours and excess_hour_price are provided
        if data.get('has_excess_hours', False):
            if not data.get('included_hours'):
                raise serializers.ValidationError({'included_hours': 'Required when has_excess_hours is True'})
            if not data.get('excess_hour_price'):
                raise serializers.ValidationError({'excess_hour_price': 'Required when has_excess_hours is True'})
        
        # Validate hourly pricing requirements
        if data.get('pricing_model') == 'HOURLY':
            if not data.get('included_hours'):
                raise serializers.ValidationError({'included_hours': 'Required for hourly pricing model'})
        
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