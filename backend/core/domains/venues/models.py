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
    sort_order = models.PositiveIntegerField(default=0)

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
