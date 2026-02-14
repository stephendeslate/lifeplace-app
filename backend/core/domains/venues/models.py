# backend/core/domains/venues/models.py
from core.utils.models import BaseModel
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from decimal import Decimal


class Venue(BaseModel):
    """
    Represents a venue type at LifePlace (e.g., Cabana, Open Field, Sanctuary).
    One venue per type - Cabana 1 and Cabana 2 are treated as the same venue type.
    """
    name = models.CharField(max_length=200, help_text="Venue name (e.g., 'Cabana', 'Open Field')")
    code = models.CharField(max_length=50, unique=True, help_text="Unique code (e.g., 'CABANA', 'OPEN_FIELD')")
    description = models.TextField(blank=True)

    # Venue characteristics
    is_overnight = models.BooleanField(
        default=False,
        help_text="True for overnight stays (e.g., Cabana with checkout next day)"
    )

    # Capacity
    minimum_capacity = models.PositiveIntegerField(default=1, help_text="Minimum guest capacity")
    maximum_capacity = models.PositiveIntegerField(help_text="Maximum guest capacity")
    recommended_capacity = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Recommended guest count for optimal experience"
    )

    # Status
    is_active = models.BooleanField(default=True)
    is_bookable = models.BooleanField(
        default=True,
        help_text="Whether this venue can be booked via client portal"
    )
    is_featured = models.BooleanField(default=False)

    # Display
    location_description = models.TextField(blank=True, help_text="Description of venue location")
    featured_image = models.ImageField(
        upload_to='venues/images/',
        null=True,
        blank=True
    )
    gallery_images = models.JSONField(
        default=list,
        blank=True,
        help_text="List of image URLs for venue gallery"
    )
    amenities = models.JSONField(
        default=list,
        blank=True,
        help_text="List of amenities (e.g., ['Pool', 'Parking', 'Sound System', 'WiFi'])"
    )
    sort_order = models.PositiveIntegerField(default=0)

    # Standalone rental pricing (for custom package curation)
    is_rentable_standalone = models.BooleanField(
        default=False,
        help_text="Can this venue be rented without a pre-made package?"
    )
    standalone_base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Price when rented as standalone venue"
    )
    standalone_included_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Hours included when rented standalone"
    )
    standalone_excess_hour_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Excess hour rate when rented standalone"
    )

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = 'Venue'
        verbose_name_plural = 'Venues'

    def __str__(self):
        return self.name

    @property
    def operating_rules(self):
        """Get the operating rules for this venue."""
        try:
            return self.venue_operating_rules
        except VenueOperatingRules.DoesNotExist:
            return None


class VenueOperatingRules(BaseModel):
    """
    Operating rules for a venue.
    Defines check-in/out times, duration limits, ingress/egress buffers, and fees.
    """
    venue = models.OneToOneField(
        Venue,
        on_delete=models.CASCADE,
        related_name='venue_operating_rules'
    )

    # === CHECK-IN/CHECKOUT TIMES ===
    default_check_in_time = models.TimeField(
        help_text="Default check-in time (e.g., 14:00 for Cabana)"
    )
    default_checkout_time = models.TimeField(
        help_text="Default checkout time (e.g., 12:00 for Cabana)"
    )
    checkout_next_day = models.BooleanField(
        default=False,
        help_text="If True, checkout time is on the day AFTER check-in (overnight stays)"
    )

    # === PROGRAM DURATION ===
    minimum_program_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=Decimal('1.0'),
        help_text="Minimum program duration in hours"
    )
    maximum_program_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Maximum program duration in hours (null = no limit)"
    )
    default_program_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=Decimal('3.0'),
        help_text="Default program duration in hours"
    )
    is_fixed_duration = models.BooleanField(
        default=False,
        help_text="If True, program duration is fixed and cannot be adjusted by client"
    )

    # === INGRESS/EGRESS BUFFERS ===
    ingress_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=Decimal('0.0'),
        help_text="Setup time before program (e.g., 5-6 hours for Open Field)"
    )
    egress_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=Decimal('0.0'),
        help_text="Teardown time after program (e.g., 1-2 hours)"
    )
    allow_custom_ingress = models.BooleanField(
        default=False,
        help_text="Allow custom ingress time per booking"
    )
    allow_custom_egress = models.BooleanField(
        default=False,
        help_text="Allow custom egress time per booking"
    )
    min_ingress_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=Decimal('0.0'),
        help_text="Minimum ingress hours when customizable"
    )
    max_ingress_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=Decimal('6.0'),
        help_text="Maximum ingress hours when customizable"
    )
    min_egress_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=Decimal('0.0'),
        help_text="Minimum egress hours when customizable"
    )
    max_egress_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=Decimal('2.0'),
        help_text="Maximum egress hours when customizable"
    )

    # === TIME CONSTRAINTS ===
    earliest_start_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Earliest time a program can start"
    )
    latest_end_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Latest time program can end (e.g., 21:00 for music curfew)"
    )
    hard_cutoff_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Absolute latest time all activities must conclude (e.g., 02:00)"
    )
    hard_cutoff_next_day = models.BooleanField(
        default=True,
        help_text="If True, hard_cutoff_time is on the next day (e.g., 2:00 AM)"
    )
    early_access_minutes = models.PositiveIntegerField(
        default=60,
        help_text="Minutes before program when early prep access is allowed"
    )

    # === EARLY CHECK-IN ===
    early_checkin_allowed = models.BooleanField(
        default=False,
        help_text="Allow check-in before default check-in time"
    )
    early_checkin_fee_per_hour = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Fee per hour for early check-in (e.g., 300.00)"
    )
    earliest_checkin_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Absolute earliest check-in time allowed (e.g., 10:00)"
    )

    # === LATE CHECKOUT ===
    late_checkout_allowed = models.BooleanField(
        default=True,
        help_text="Allow checkout after default checkout time"
    )
    late_checkout_fee_per_hour = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Fee per hour for late checkout (e.g., 300.00)"
    )
    late_checkout_max_hours = models.PositiveIntegerField(
        default=4,
        help_text="Maximum hours for late checkout extension"
    )
    latest_checkout_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Absolute latest checkout time allowed"
    )

    # === CUSTOM RULES (JSON) ===
    custom_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text="Custom venue rules as JSON"
    )
    # Example custom_rules structure:
    # {
    #     "violation_fees": [
    #         {"code": "CONFETTI", "description": "Confetti/rice/party poppers", "fee": 1500}
    #     ],
    #     "policies": [
    #         {"code": "CLEAN_AS_YOU_GO", "description": "Clean-as-you-go policy applies"}
    #     ],
    #     "music_curfew": "21:00",
    #     "notes": "Additional notes for staff"
    # }

    class Meta:
        verbose_name = "Venue Operating Rules"
        verbose_name_plural = "Venue Operating Rules"

    def __str__(self):
        return f"Operating Rules for {self.venue.name}"

    def calculate_total_venue_hours(self, program_hours: Decimal) -> dict:
        """
        Calculate total venue usage time including ingress/egress.

        Args:
            program_hours: Program duration in hours

        Returns:
            dict with program_hours, ingress_hours, egress_hours, total_hours
        """
        ingress = self.ingress_hours or Decimal('0')
        egress = self.egress_hours or Decimal('0')
        total = Decimal(str(program_hours)) + ingress + egress

        return {
            'program_hours': Decimal(str(program_hours)),
            'ingress_hours': ingress,
            'egress_hours': egress,
            'total_hours': total,
        }

    def validate_program_duration(self, program_hours: Decimal) -> dict:
        """
        Validate that a proposed program duration fits within venue constraints.

        Args:
            program_hours: Proposed program duration in hours

        Returns:
            dict with is_valid, errors[], warnings[]
        """
        errors = []
        warnings = []
        program_hours = Decimal(str(program_hours))

        # Check minimum duration
        if program_hours < self.minimum_program_hours:
            errors.append(
                f"Program must be at least {self.minimum_program_hours} hours"
            )

        # Check maximum duration
        if self.maximum_program_hours and program_hours > self.maximum_program_hours:
            errors.append(
                f"Program cannot exceed {self.maximum_program_hours} hours"
            )

        # Check fixed duration
        if self.is_fixed_duration and program_hours != self.default_program_hours:
            errors.append(
                f"This venue requires exactly {self.default_program_hours} hours"
            )

        return {
            'is_valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
        }

    def calculate_early_checkin_fee(self, hours_early: Decimal) -> Decimal:
        """Calculate the fee for early check-in."""
        if not self.early_checkin_allowed or not self.early_checkin_fee_per_hour:
            return Decimal('0.00')

        hours_early = Decimal(str(hours_early))
        return (hours_early * self.early_checkin_fee_per_hour).quantize(Decimal('0.01'))

    def calculate_late_checkout_fee(self, hours_late: Decimal) -> Decimal:
        """Calculate the fee for late checkout."""
        if not self.late_checkout_allowed or not self.late_checkout_fee_per_hour:
            return Decimal('0.00')

        hours_late = Decimal(str(hours_late))
        # Cap at max hours
        hours_late = min(hours_late, Decimal(str(self.late_checkout_max_hours)))
        return (hours_late * self.late_checkout_fee_per_hour).quantize(Decimal('0.01'))


class PackageVenue(BaseModel):
    """
    Junction table linking packages (ProductOption) to venues.
    A package INCLUDES one or more venues - clients get all venues in the package.
    """
    package = models.ForeignKey(
        'products.ProductOption',
        on_delete=models.CASCADE,
        related_name='package_venues',
        limit_choices_to={'type': 'PACKAGE'}
    )
    venue = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name='venue_packages'
    )

    # Primary venue determines datetime rules
    is_primary = models.BooleanField(
        default=False,
        help_text="Primary venue determines datetime rules (check-in, checkout, duration)"
    )

    # Order of venue access
    access_order = models.PositiveIntegerField(
        default=1,
        help_text="Order of venue access (1=first, 2=second, etc.)"
    )

    # Duration override for this venue in this package
    access_duration_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="How long client uses this venue (null = use venue default)"
    )

    # Notes
    notes = models.TextField(
        blank=True,
        help_text="Notes about this venue's usage in the package (e.g., 'For ceremony only')"
    )

    # Bonus venue and contribution tracking (for custom package curation)
    is_bonus = models.BooleanField(
        default=False,
        help_text="True if venue is included free (e.g., cabanas with bundle)"
    )
    hours_contribution = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Hours this venue contributes to package total"
    )
    price_contribution = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Price this venue contributes to package total"
    )

    class Meta:
        unique_together = ('package', 'venue')
        ordering = ['access_order', 'venue__name']
        verbose_name = 'Package Venue'
        verbose_name_plural = 'Package Venues'

    def __str__(self):
        primary_label = " (Primary)" if self.is_primary else ""
        return f"{self.package.name} - {self.venue.name}{primary_label}"

    def save(self, *args, **kwargs):
        # Ensure only one primary venue per package
        if self.is_primary:
            PackageVenue.objects.filter(
                package=self.package,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


class VenueEventTypeConfiguration(BaseModel):
    """
    Event-type-specific venue configuration.

    Overrides venue's standalone_* defaults for specific event types.
    For example, "Open Field" may have 3 hours included for weddings
    but 24 hours included for camping.

    When no configuration exists for a venue+event_type combination,
    the system falls back to the venue's standalone_* values.
    """
    venue = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name='event_type_configs'
    )
    event_type = models.ForeignKey(
        'events.EventType',
        on_delete=models.CASCADE,
        related_name='venue_configs'
    )

    # Pricing overrides (null = use venue's standalone_* defaults)
    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Base price for this venue+event type (null = use venue default)"
    )
    included_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Hours included for this venue+event type (null = use venue default)"
    )
    excess_hour_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Excess hour rate for this venue+event type (null = use venue default)"
    )

    # All-day access option (for camping-like events)
    is_all_day_access = models.BooleanField(
        default=False,
        help_text="If True, venue has all-day access with no hour limits for this event type"
    )

    # Operating rule overrides (commonly differ between event types)
    default_check_in_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Override check-in time for this event type"
    )
    default_checkout_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Override checkout time for this event type"
    )
    checkout_next_day = models.BooleanField(
        null=True,
        blank=True,
        help_text="Override: checkout is next day (for overnight)"
    )
    maximum_program_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Override maximum program hours (null in override = no limit)"
    )
    is_fixed_duration = models.BooleanField(
        null=True,
        blank=True,
        help_text="Override: duration is fixed"
    )

    # Description for admin clarity
    notes = models.TextField(
        blank=True,
        help_text="Internal notes about this configuration"
    )

    class Meta:
        unique_together = ('venue', 'event_type')
        ordering = ['venue__name', 'event_type__name']
        verbose_name = 'Venue Event Type Configuration'
        verbose_name_plural = 'Venue Event Type Configurations'

    def __str__(self):
        return f"{self.venue.name} - {self.event_type.name}"

    def get_effective_base_price(self):
        """Get base price, falling back to venue default if not set"""
        if self.base_price is not None:
            return self.base_price
        return self.venue.standalone_base_price

    def get_effective_included_hours(self):
        """Get included hours, falling back to venue default if not set"""
        if self.is_all_day_access:
            return Decimal('24.0')  # All-day access
        if self.included_hours is not None:
            return self.included_hours
        return self.venue.standalone_included_hours

    def get_effective_excess_hour_price(self):
        """Get excess hour price, falling back to venue default if not set"""
        if self.is_all_day_access:
            return Decimal('0.00')  # No excess charges for all-day access
        if self.excess_hour_price is not None:
            return self.excess_hour_price
        return self.venue.standalone_excess_hour_price


class VenueBlockedDate(BaseModel):
    """
    Dates when a specific venue is blocked (maintenance, private events, etc.)
    """
    venue = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name='blocked_dates'
    )
    date = models.DateField()
    reason = models.CharField(max_length=255)

    # Partial blocks
    is_full_day = models.BooleanField(
        default=True,
        help_text="If False, only specific hours are blocked"
    )
    blocked_start_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Start time of block (if partial day)"
    )
    blocked_end_time = models.TimeField(
        null=True,
        blank=True,
        help_text="End time of block (if partial day)"
    )

    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='venue_blocks_created'
    )

    class Meta:
        ordering = ['date', 'blocked_start_time']
        verbose_name = 'Venue Blocked Date'
        verbose_name_plural = 'Venue Blocked Dates'
        indexes = [
            models.Index(fields=['venue', 'date']),
        ]

    def __str__(self):
        if self.is_full_day:
            return f"{self.venue.name} blocked on {self.date}: {self.reason}"
        return f"{self.venue.name} blocked on {self.date} {self.blocked_start_time}-{self.blocked_end_time}: {self.reason}"


class GalleryPhoto(BaseModel):
    """Standalone gallery photos for the public gallery page."""
    CATEGORY_CHOICES = [
        ('GENERAL', 'General'),
        ('WEDDING', 'Wedding'),
        ('TEAM_BUILDING', 'Team Building'),
        ('RETREAT', 'Retreat'),
        ('WORKSHOP', 'Workshop'),
        ('CAMPING', 'Camping'),
        ('ATMOSPHERE', 'Atmosphere & Details'),
    ]

    image = models.ImageField(upload_to='gallery/')
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='GENERAL')
    venue = models.ForeignKey(
        Venue, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='gallery_photos'
    )
    event_type = models.ForeignKey(
        'events.EventType', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='gallery_photos'
    )
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', '-created_at']
        verbose_name = 'Gallery Photo'
        verbose_name_plural = 'Gallery Photos'

    def __str__(self):
        return self.title or f"Gallery Photo #{self.pk}"
