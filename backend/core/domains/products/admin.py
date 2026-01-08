from django.contrib import admin
from .models import ProductCategory, ProductOption, Discount

@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'full_path', 'level', 'is_active', 'sort_order', 'requires_venue')
    list_filter = ('is_active', 'requires_venue', 'parent')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ('sort_order', 'is_active')
    ordering = ('sort_order', 'name')
    
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'description')
        }),
        ('Hierarchy', {
            'fields': ('parent', 'sort_order')
        }),
        ('Business Rules', {
            'fields': ('is_active', 'requires_venue', 'typical_duration_hours')
        }),
    )

@admin.register(ProductOption)
class ProductOptionAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'type', 'pricing_model', 'formatted_price', 'is_active', 'is_featured')
    list_filter = ('type', 'pricing_model', 'is_active', 'is_featured', 'category', 'requires_approval')
    search_fields = ('name', 'description', 'sku')
    list_editable = ('is_active', 'is_featured')
    ordering = ('category__sort_order', 'sort_order', 'name')
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'category', 'type')
        }),
        ('Pricing', {
            'fields': ('pricing_model', 'base_price', 'currency', 'tax_rate')
        }),
        ('Configuration', {
            'fields': ('is_active', 'is_featured', 'allow_multiple', 'requires_approval')
        }),
        ('Time Constraints', {
            'fields': ('minimum_hours', 'maximum_hours'),
            'description': 'Note: Excess hours pricing is now managed at the Venue level.'
        }),
        ('Event Duration', {
            'fields': ('event_days',),
            'description': 'For multi-day event packages (camps, retreats). Leave blank for hourly packages.',
            'classes': ('collapse',),
        }),
        ('Booking Rules', {
            'fields': ('advance_booking_days', 'maximum_booking_days')
        }),
        ('Metadata', {
            'fields': ('sku', 'sort_order')
        }),
        ('Event Types', {
            'fields': ('event_types',),
            'description': 'Select which event types this package is available for. Leave empty to hide when filtering by event type.'
        }),
    )

    readonly_fields = ('formatted_price',)
    filter_horizontal = ('event_types',)  # Better UI for ManyToMany selection

@admin.register(Discount)
class DiscountAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'discount_type', 'value', 'is_active', 'valid_from', 'valid_until')
    list_filter = ('discount_type', 'application_type', 'is_active')
    search_fields = ('name', 'code', 'description')
    list_editable = ('is_active',)
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'code', 'description')
        }),
        ('Discount Configuration', {
            'fields': ('discount_type', 'application_type', 'value', 'currency')
        }),
        ('Validity', {
            'fields': ('is_active', 'valid_from', 'valid_until')
        }),
        ('Usage Limits', {
            'fields': ('max_uses', 'max_uses_per_client', 'current_uses')
        }),
        ('Requirements', {
            'fields': ('minimum_order_amount', 'minimum_hours')
        }),
        ('Applicability', {
            'fields': ('applicable_products', 'applicable_categories')
        }),
    )