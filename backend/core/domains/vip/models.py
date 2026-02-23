# backend/core/domains/vip/models.py
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from core.utils.models import BaseModel


class VIPSettings(BaseModel):
    """
    Global VIP/Loyalty program settings - Singleton pattern like PaymentSettings.
    Controls program-wide configuration for earning methods, expiration, and visibility.
    """

    # Program Toggle
    is_program_enabled = models.BooleanField(default=True, help_text="Master toggle for the VIP program")
    program_name = models.CharField(
        max_length=100, default="VIP Program", help_text="Display name for the loyalty program"
    )

    # Earning Methods (toggles)
    earning_automatic_enabled = models.BooleanField(
        default=True, help_text="Enable automatic tier upgrades based on spending/bookings"
    )
    earning_points_enabled = models.BooleanField(default=False, help_text="Enable points-based loyalty system")
    earning_manual_enabled = models.BooleanField(default=True, help_text="Allow manual VIP assignment by admins")

    # Automatic Earning Configuration
    AUTOMATIC_EARNING_TYPE_CHOICES = [
        ("SPENDING", "Total Spending"),
        ("BOOKINGS", "Completed Bookings"),
        ("BOTH", "Both (Any Condition Met)"),
    ]
    automatic_earning_type = models.CharField(
        max_length=20,
        choices=AUTOMATIC_EARNING_TYPE_CHOICES,
        default="SPENDING",
        help_text="Criteria for automatic tier upgrades",
    )

    # Points Configuration
    points_per_currency_spent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("1.00"), help_text="Points earned per currency unit spent"
    )
    points_currency_unit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("100.00"),
        help_text="Currency amount that earns points_per_currency_spent",
    )
    points_expiry_months = models.PositiveIntegerField(
        default=0, help_text="Months until points expire (0 = never expire)"
    )

    # VIP Status Expiration Settings
    EXPIRATION_TYPE_CHOICES = [
        ("NEVER", "Never Expires"),
        ("INACTIVITY", "After X Months Inactivity"),
        ("ANNUAL", "Annual Renewal Required"),
    ]
    expiration_type = models.CharField(
        max_length=20, choices=EXPIRATION_TYPE_CHOICES, default="NEVER", help_text="How VIP status expires"
    )
    expiration_months = models.PositiveIntegerField(
        default=12, help_text="Months for expiration (used with INACTIVITY or ANNUAL)"
    )

    # Client Visibility Settings
    show_vip_status_to_client = models.BooleanField(default=True, help_text="Show VIP tier/status in client portal")
    show_tier_progress_to_client = models.BooleanField(
        default=True, help_text="Show progress toward next tier in client portal"
    )
    show_available_rewards_to_client = models.BooleanField(
        default=True, help_text="Show available benefits/rewards in client portal"
    )
    show_points_balance_to_client = models.BooleanField(default=True, help_text="Show points balance in client portal")

    class Meta:
        verbose_name = "VIP Settings"
        verbose_name_plural = "VIP Settings"

    def __str__(self):
        return f"VIP Settings (Program: {'Enabled' if self.is_program_enabled else 'Disabled'})"

    @classmethod
    def get_settings(cls):
        """Get or create singleton settings instance"""
        settings_obj, _ = cls.objects.get_or_create(pk=1)
        return settings_obj

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton)
        self.pk = 1
        super().save(*args, **kwargs)


class VIPTier(BaseModel):
    """
    Configurable VIP tiers - supports binary (Standard/VIP) or
    multi-tier hierarchy (Bronze/Silver/Gold/Platinum).
    """

    name = models.CharField(max_length=100, help_text="Display name for the tier (e.g., 'Gold', 'VIP', 'Platinum')")
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = models.TextField(blank=True, help_text="Description of tier benefits shown to clients")

    # Tier Hierarchy
    level = models.PositiveIntegerField(unique=True, help_text="Tier level - higher numbers = more exclusive")
    is_default = models.BooleanField(default=False, help_text="Default tier for new clients (typically 'Standard')")

    # Automatic Qualification Thresholds (any can qualify)
    min_total_spent = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Minimum total spending to qualify for this tier",
    )
    min_completed_bookings = models.PositiveIntegerField(
        null=True, blank=True, help_text="Minimum completed bookings to qualify for this tier"
    )
    min_points_required = models.PositiveIntegerField(
        null=True, blank=True, help_text="Minimum points balance to qualify for this tier"
    )

    # Styling (for client portal display)
    color = models.CharField(
        max_length=7, default="#6B7280", help_text="Hex color for tier badge (e.g., #FFD700 for gold)"
    )
    icon = models.CharField(max_length=50, blank=True, help_text="Icon name for tier display")

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["level"]
        verbose_name = "VIP Tier"
        verbose_name_plural = "VIP Tiers"

    def __str__(self):
        return f"{self.name} (Level {self.level})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while VIPTier.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        # Ensure only one default tier
        if self.is_default:
            VIPTier.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)

        super().save(*args, **kwargs)


class VIPBenefit(BaseModel):
    """
    Benefits associated with each VIP tier.
    Supports both automatic application and redeemable rewards.
    """

    BENEFIT_TYPE_CHOICES = [
        ("PERCENTAGE_DISCOUNT", "Percentage Discount"),
        ("FIXED_DISCOUNT", "Fixed Amount Discount"),
        ("FREE_HOURS", "Free Excess Hours"),
        ("WAIVE_SERVICE_CHARGE", "Waive Service Charge"),
        ("WAIVE_LATE_FEE", "Waive Late Fee"),
        ("WAIVE_RESCHEDULING_FEE", "Waive Rescheduling Fee"),
        ("PRIORITY_BOOKING", "Priority Booking"),
        ("EARLY_ACCESS", "Early Access to Packages"),
        ("EXCLUSIVE_PACKAGE", "Access to Exclusive Packages"),
        ("COMPLIMENTARY_ADDON", "Complimentary Add-on"),
    ]

    APPLICATION_MODE_CHOICES = [
        ("AUTOMATIC", "Apply Automatically"),
        ("REDEEMABLE", "Redeemable from Pool"),
    ]

    tier = models.ForeignKey(VIPTier, on_delete=models.CASCADE, related_name="benefits")
    benefit_type = models.CharField(max_length=30, choices=BENEFIT_TYPE_CHOICES)
    application_mode = models.CharField(max_length=20, choices=APPLICATION_MODE_CHOICES, default="AUTOMATIC")

    # Benefit Value (interpretation depends on benefit_type)
    value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Discount %, fixed amount, or number of free hours",
    )

    # For exclusive packages/addons - links to specific products
    applicable_products = models.ManyToManyField(
        "products.ProductOption",
        blank=True,
        related_name="vip_benefits",
        help_text="Products this benefit applies to (for exclusive/complimentary)",
    )

    # Usage Limits
    max_uses_per_booking = models.PositiveIntegerField(
        null=True, blank=True, help_text="Maximum times this benefit can be used per booking"
    )
    max_uses_per_month = models.PositiveIntegerField(
        null=True, blank=True, help_text="Maximum times this benefit can be used per month"
    )

    # Points cost (for redeemable benefits)
    points_cost = models.PositiveIntegerField(default=0, help_text="Points required to redeem this benefit (0 = free)")

    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, help_text="Internal description of the benefit")
    display_name = models.CharField(max_length=100, blank=True, help_text="Client-facing name for the benefit")

    class Meta:
        ordering = ["tier__level", "benefit_type"]
        verbose_name = "VIP Benefit"
        verbose_name_plural = "VIP Benefits"

    def __str__(self):
        return f"{self.tier.name} - {self.get_benefit_type_display()}"

    @property
    def name(self):
        """Return display name or generated name"""
        if self.display_name:
            return self.display_name
        return self.get_benefit_type_display()


class ClientVIPStatus(BaseModel):
    """
    Tracks a client's current VIP status, points, and statistics.
    OneToOne relationship with User (CLIENT role).
    """

    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("EXPIRED", "Expired"),
        ("SUSPENDED", "Suspended"),
    ]

    client = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vip_status",
        limit_choices_to={"role": "CLIENT"},
    )
    current_tier = models.ForeignKey(VIPTier, on_delete=models.SET_NULL, null=True, blank=True, related_name="members")

    # Points System
    points_balance = models.PositiveIntegerField(default=0)
    lifetime_points_earned = models.PositiveIntegerField(default=0)
    lifetime_points_spent = models.PositiveIntegerField(default=0)

    # Spending/Booking Tracking
    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    completed_bookings_count = models.PositiveIntegerField(default=0)

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")

    # Manual Assignment Info
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vip_assignments",
        help_text="Admin who manually assigned the tier",
    )
    assigned_at = models.DateTimeField(null=True, blank=True, help_text="When tier was manually assigned")
    assignment_reason = models.CharField(max_length=255, blank=True, help_text="Reason for manual assignment")

    # Expiration
    expires_at = models.DateTimeField(null=True, blank=True, help_text="When VIP status expires")
    last_activity_at = models.DateTimeField(auto_now=True, help_text="Last booking/payment activity")

    class Meta:
        verbose_name = "Client VIP Status"
        verbose_name_plural = "Client VIP Statuses"

    def __str__(self):
        tier_name = self.current_tier.name if self.current_tier else "No Tier"
        return f"{self.client.email} - {tier_name}"

    @property
    def is_vip(self):
        """Check if client has a non-default tier"""
        if not self.current_tier:
            return False
        return not self.current_tier.is_default and self.status == "ACTIVE"

    @property
    def is_expired(self):
        """Check if VIP status has expired"""
        if self.status == "EXPIRED":
            return True
        return bool(self.expires_at and self.expires_at < timezone.now())


class VIPPointTransaction(BaseModel):
    """
    Tracks all point transactions (earning and spending).
    Provides complete audit trail for points ledger.
    """

    TRANSACTION_TYPE_CHOICES = [
        ("EARNED_BOOKING", "Earned from Booking"),  # Reserved — points earned via EARNED_PAYMENT
        ("EARNED_PAYMENT", "Earned from Payment"),
        ("EARNED_MANUAL", "Manually Added"),  # Reserved — use EARNED_BONUS for manual awards
        ("EARNED_BONUS", "Bonus Points"),
        ("SPENT_REWARD", "Spent on Reward"),
        ("EXPIRED", "Points Expired"),
        ("ADJUSTED", "Manual Adjustment"),
    ]

    client_vip_status = models.ForeignKey(ClientVIPStatus, on_delete=models.CASCADE, related_name="point_transactions")
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    points = models.IntegerField(help_text="Positive for earned, negative for spent/expired")

    # Reference to source (optional based on transaction type)
    event = models.ForeignKey(
        "events.Event", on_delete=models.SET_NULL, null=True, blank=True, related_name="vip_point_transactions"
    )
    payment = models.ForeignKey(
        "payments.Payment", on_delete=models.SET_NULL, null=True, blank=True, related_name="vip_point_transactions"
    )

    description = models.CharField(max_length=255)
    balance_after = models.PositiveIntegerField(help_text="Points balance after this transaction")

    # Admin who performed manual adjustment
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="vip_point_adjustments"
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "VIP Point Transaction"
        verbose_name_plural = "VIP Point Transactions"

    def __str__(self):
        return f"{self.client_vip_status.client.email}: {self.points:+d} points ({self.get_transaction_type_display()})"


class VIPRewardRedemption(BaseModel):
    """
    Tracks redeemed rewards for redeemable benefits.
    Links benefit usage to specific events/bookings.
    """

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPLIED", "Applied"),
        ("CANCELLED", "Cancelled"),
    ]

    client_vip_status = models.ForeignKey(ClientVIPStatus, on_delete=models.CASCADE, related_name="redemptions")
    benefit = models.ForeignKey(VIPBenefit, on_delete=models.CASCADE, related_name="redemptions")
    event = models.ForeignKey("events.Event", on_delete=models.CASCADE, related_name="vip_redemptions")

    # Redemption Details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    points_spent = models.PositiveIntegerField(default=0, help_text="Points deducted for this redemption")
    value_applied = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Monetary value of the benefit applied"
    )

    applied_at = models.DateTimeField(null=True, blank=True, help_text="When the benefit was applied to the booking")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "VIP Reward Redemption"
        verbose_name_plural = "VIP Reward Redemptions"

    def __str__(self):
        return f"{self.client_vip_status.client.email} - {self.benefit.name}"


class VIPTierHistory(BaseModel):
    """
    Audit trail for tier changes.
    Records all tier upgrades, downgrades, and manual assignments.
    """

    REASON_CHOICES = [
        ("AUTOMATIC_UPGRADE", "Automatic Upgrade"),
        ("AUTOMATIC_DOWNGRADE", "Automatic Downgrade"),
        ("MANUAL_ASSIGNMENT", "Manual Assignment"),
        ("EXPIRATION", "Status Expired"),
        ("INITIAL", "Initial Assignment"),
    ]

    client_vip_status = models.ForeignKey(ClientVIPStatus, on_delete=models.CASCADE, related_name="tier_history")
    from_tier = models.ForeignKey(VIPTier, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    to_tier = models.ForeignKey(VIPTier, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")

    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    notes = models.TextField(blank=True, help_text="Additional notes about the tier change")

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="vip_tier_changes"
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "VIP Tier History"
        verbose_name_plural = "VIP Tier Histories"

    def __str__(self):
        from_name = self.from_tier.name if self.from_tier else "None"
        to_name = self.to_tier.name if self.to_tier else "None"
        return f"{self.client_vip_status.client.email}: {from_name} -> {to_name}"
