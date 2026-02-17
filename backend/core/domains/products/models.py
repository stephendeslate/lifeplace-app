# backend/core/domains/products/models.py
from core.utils.models import BaseModel
from decimal import Decimal
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify


class ProductCategory(BaseModel):
    """Product categories for organizing products and packages"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    slug = models.SlugField(max_length=100, unique=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    
    # Business metadata
    requires_venue = models.BooleanField(default=False, help_text="Category requires venue specification")
    typical_duration_hours = models.PositiveIntegerField(null=True, blank=True, help_text="Typical event duration in hours")

    # Rates page display metadata
    includes = models.JSONField(
        default=list,
        blank=True,
        help_text="List of included features shown on rates page (e.g., ['Swimming pool access', 'Upgraded sound system'])"
    )
    notes = models.JSONField(
        default=list,
        blank=True,
        help_text="List of disclaimer notes shown on rates page (e.g., ['Kitchen use: P5,000/day'])"
    )
    badge_text = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text="Custom badge label shown on rates page (e.g., 'Staff Pick'). Empty = no badge."
    )
    rates_page_section = models.CharField(
        max_length=30,
        blank=True,
        default='',
        help_text="Which rates page section this category appears in: 'event_packages', 'wedding_combos', 'all_in_weddings', or empty for hidden"
    )

    class Meta:
        verbose_name_plural = "Product Categories"
        ordering = ['sort_order', 'name']
    
    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name
    
    @property
    def full_path(self):
        """Get full category path"""
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name
    
    @property
    def level(self):
        """Get category nesting level"""
        if self.parent:
            return self.parent.level + 1
        return 0
    
    def save(self, *args, **kwargs):
        if not self.slug:
            # Generate slug from name
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            
            # Ensure slug uniqueness
            while ProductCategory.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            
            self.slug = slug
        
        super().save(*args, **kwargs)


class ProductOption(BaseModel):
    """Products or packages that can be sold to clients"""
    TYPE_CHOICES = [
        ('PRODUCT', 'Product'),
        ('PACKAGE', 'Package'),
    ]
    
    PRICING_MODEL_CHOICES = [
        ('FIXED', 'Fixed Price'),
        ('HOURLY', 'Hourly Rate'),
        ('TIERED', 'Tiered Pricing'),
        ('CUSTOM', 'Custom Quote'),
    ]

    PRICING_UNIT_CHOICES = [
        ('PER_EVENT', 'Per Event'),
        ('PER_PERSON', 'Per Person'),
        ('PER_HOUR', 'Per Hour'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(ProductCategory, on_delete=models.PROTECT, related_name='products')
    
    # Pricing
    pricing_model = models.CharField(max_length=10, choices=PRICING_MODEL_CHOICES, default='FIXED')
    pricing_unit = models.CharField(
        max_length=15,
        choices=PRICING_UNIT_CHOICES,
        default='PER_EVENT',
        help_text="What unit the price applies to (per event, per person, per hour)"
    )
    base_price = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='PHP')
    is_tax_inclusive = models.BooleanField(
        default=False,
        help_text="If True, base_price already includes tax (no additional tax applied)"
    )

    # Product configuration
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_highlighted = models.BooleanField(
        default=False,
        help_text="Highlight this tier on the rates page (e.g., 'Popular' badge)"
    )
    tier_label = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text="Display label for this pricing tier on rates page (e.g., 'Day Trip', '2D1N', 'Under 100 pax')"
    )
    allow_multiple = models.BooleanField(default=False, help_text="Allow multiple quantities per booking")
    maximum_quantity = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Maximum quantity per booking when allow_multiple is enabled (null = unlimited)"
    )
    requires_approval = models.BooleanField(default=False, help_text="Requires admin approval before booking")

    # Time-based configuration
    minimum_hours = models.PositiveIntegerField(null=True, blank=True, help_text="Minimum booking duration")
    maximum_hours = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum booking duration")
    
    # Booking constraints
    advance_booking_days = models.PositiveIntegerField(default=7, help_text="Minimum days in advance for booking")
    maximum_booking_days = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum days in advance for booking")

    # Guest capacity constraints
    minimum_guests = models.PositiveIntegerField(null=True, blank=True, help_text="Minimum guest capacity")
    maximum_guests = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum guest capacity")
    recommended_guests = models.PositiveIntegerField(null=True, blank=True, help_text="Recommended guest count")

    # Event duration configuration (for multi-day event types like camps/retreats)
    event_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Exact number of days for this package (e.g., 2 for 2D1N, 3 for 3D2N). Null means no restriction."
    )

    # Business metadata
    sku = models.CharField(max_length=50, unique=True, null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    # Images
    featured_image = models.ImageField(
        upload_to='products/images/',
        null=True,
        blank=True,
        help_text="Main image shown in listings and cards"
    )
    gallery_images = models.JSONField(
        default=list,
        blank=True,
        help_text="List of image URLs for product gallery"
    )

    # Event type compatibility - packages can be available for multiple event types
    # If empty, package is hidden when filter_by_event_type is enabled
    event_types = models.ManyToManyField(
        'events.EventType',
        blank=True,
        related_name='packages',
        help_text="Event types this package is available for. Empty = hidden when filtering by event type."
    )

    # Custom package tracking (for venue selection curation)
    is_custom = models.BooleanField(
        default=False,
        help_text="True if this package was generated from venue selection"
    )
    booking_session_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Booking session that created this custom package (for cleanup)"
    )
    bundle_discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Discount applied for multi-venue custom packages"
    )

    class Meta:
        ordering = ['category__sort_order', 'sort_order', 'name']
        unique_together = [['name', 'category']]
    
    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"
    
    @property
    def formatted_price(self):
        """Get formatted price string"""
        if self.pricing_model == 'HOURLY':
            return f"{self.currency} {self.base_price}/hour"
        elif self.pricing_model == 'CUSTOM':
            return "Custom Quote"
        else:
            return f"{self.currency} {self.base_price}"
    
    @property
    def price_with_tax(self):
        """Calculate price including tax using global default tax rate"""
        from core.domains.payments.models import TaxRate

        if self.pricing_model == 'CUSTOM':
            return None

        # If tax-inclusive, price already includes tax
        if self.is_tax_inclusive:
            return self.base_price

        # Get global default tax rate
        default_tax = TaxRate.objects.filter(is_default=True).first()
        tax_rate = default_tax.rate if default_tax else Decimal('0')
        tax_multiplier = Decimal('1') + (tax_rate / Decimal('100'))
        return self.base_price * tax_multiplier


class Discount(BaseModel):
    """Discounts and promotional codes"""
    DISCOUNT_TYPE_CHOICES = [
        ('PERCENTAGE', 'Percentage'),
        ('FIXED', 'Fixed Amount'),
        ('FREE_HOURS', 'Free Hours'),
    ]
    
    APPLICATION_TYPE_CHOICES = [
        ('AUTOMATIC', 'Automatic'),
        ('CODE_REQUIRED', 'Code Required'),
        ('ADMIN_ONLY', 'Admin Only'),
    ]
    
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    description = models.CharField(max_length=255)
    currency = models.CharField(max_length=3, default='PHP')
    
    # Discount configuration
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    application_type = models.CharField(max_length=15, choices=APPLICATION_TYPE_CHOICES, default='CODE_REQUIRED')
    value = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Validity
    is_active = models.BooleanField(default=True)
    valid_from = models.DateField()
    valid_until = models.DateField(null=True, blank=True)
    
    # Usage limits
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    max_uses_per_client = models.PositiveIntegerField(null=True, blank=True)
    current_uses = models.PositiveIntegerField(default=0)
    
    # Minimum requirements
    minimum_order_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    minimum_hours = models.PositiveIntegerField(null=True, blank=True)
    
    # Applicable items
    applicable_products = models.ManyToManyField(ProductOption, blank=True)
    applicable_categories = models.ManyToManyField(ProductCategory, blank=True)

    def __str__(self):
        return f"{self.name} - {self.get_discount_type_display()}: {self.value}"

    def is_valid(self):
        """Check if discount is currently valid"""
        from django.utils import timezone
        today = timezone.now().date()

        if not self.is_active:
            return False
        if today < self.valid_from:
            return False
        if self.valid_until and today > self.valid_until:
            return False
        if self.max_uses and self.current_uses >= self.max_uses:
            return False
        return True
    
    def can_be_used_by_client(self, client, order_amount=None, order_hours=None):
        """Check if discount can be used by a specific client"""
        if not self.is_valid():
            return False
        
        # Check client usage limits
        if self.max_uses_per_client:
            # TODO: Implement per-client tracking when orders domain is created
            client_usage = self.current_uses  # Simplified for now
            if client_usage >= self.max_uses_per_client:
                return False
        
        # Check minimum requirements
        if self.minimum_order_amount and order_amount and order_amount < self.minimum_order_amount:
            return False
        
        if self.minimum_hours and order_hours and order_hours < self.minimum_hours:
            return False
        
        return True

    class Meta:
        ordering = ['-created_at']