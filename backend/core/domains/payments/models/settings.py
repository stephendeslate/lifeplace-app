import logging
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.utils.models import BaseModel

logger = logging.getLogger(__name__)


class PaymentSettings(BaseModel):
    """Global payment settings with singleton pattern"""

    # BALANCE DUE SETTINGS
    balance_due_days = models.PositiveIntegerField(
        default=30, help_text="Default number of days before event when balance is due"
    )

    # GRACE PERIOD SETTINGS
    grace_period_days = models.PositiveIntegerField(
        default=7, help_text="Default grace period days before marking payments overdue"
    )

    # LATE FEE SETTINGS
    late_fee_enabled = models.BooleanField(default=True, help_text="Enable automatic late fee application")

    default_late_fee_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("25.00"),
        help_text="Default late fee amount to apply to overdue payments",
    )

    # DEPOSIT SETTINGS
    default_deposit_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("50.00"), help_text="Default deposit percentage (0-100)"
    )

    deposit_type = models.CharField(
        max_length=20,
        choices=[("PERCENTAGE", "Percentage of Total"), ("FIXED", "Fixed Amount")],
        default="PERCENTAGE",
        help_text="Type of deposit calculation",
    )

    deposit_fixed_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Fixed deposit amount (used when deposit_type is FIXED)",
    )

    deposit_is_refundable = models.BooleanField(
        default=False, help_text="Whether the deposit is refundable on cancellation"
    )

    deposit_is_deductible = models.BooleanField(
        default=True, help_text="Whether the deposit is deducted from the total contract price"
    )

    deposit_waived_on_full_payment = models.BooleanField(
        default=True, help_text="Whether the deposit is waived if client pays in full upfront"
    )

    # LATE FEE SETTINGS (Enhanced)
    late_fee_type = models.CharField(
        max_length=20,
        choices=[("FIXED", "Fixed Amount"), ("PERCENTAGE", "Percentage of Invoice")],
        default="FIXED",
        help_text="Type of late fee calculation",
    )

    late_fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Late fee as percentage of invoice amount (used when late_fee_type is PERCENTAGE)",
    )

    # SECURITY DEPOSIT SETTINGS
    security_deposit_enabled = models.BooleanField(default=False, help_text="Enable security deposit requirement")

    security_deposit_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Security deposit amount (e.g., for keys, damages)",
    )

    security_deposit_is_refundable = models.BooleanField(
        default=True, help_text="Whether security deposit is refundable after event/inspection"
    )

    security_deposit_description = models.CharField(
        max_length=255,
        blank=True,
        help_text="Description of what security deposit covers (e.g., 'for keys upon check-in')",
    )

    # CANCELLATION SETTINGS
    cancellation_admin_fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Administrative processing fee percentage on cancellations",
    )

    # PAYMENT SCHEDULE SETTINGS
    downpayment_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("30.00"),
        help_text="Downpayment percentage of total contract price (0-100)",
    )

    downpayment_due_days = models.PositiveIntegerField(
        default=7, help_text="Days after booking to pay downpayment (to block date)"
    )

    balance_due_type = models.CharField(
        max_length=20,
        choices=[("DAYS_BEFORE", "Specific Days Before Event"), ("DAY_BEFORE", "Day Before Event")],
        default="DAYS_BEFORE",
        help_text="When remaining balance is due",
    )

    # NOTE: default_currency has been removed from this model.
    # Currency is now managed by CurrencySettings in the settings domain.
    # Use CurrencySettings.get_system_settings().default_currency instead.

    # AUTO PAYMENT RETRY SETTINGS
    auto_payment_retry_attempts = models.PositiveIntegerField(
        default=3, help_text="Number of automatic retry attempts for failed payments"
    )

    auto_payment_retry_delay_days = models.PositiveIntegerField(
        default=2, help_text="Days to wait between automatic payment retry attempts"
    )

    # REFUND POLICY SETTINGS - CONSOLIDATED from bookingflow domain
    allow_refunds = models.BooleanField(default=True, help_text="Allow refunds globally")

    refund_deadline_hours = models.PositiveIntegerField(
        default=48, help_text="Hours before event when refunds are no longer allowed"
    )

    refund_percentage = models.PositiveIntegerField(
        default=100, help_text="Percentage of payment that can be refunded (0-100)"
    )

    refund_policy_text = models.TextField(blank=True, help_text="Default refund policy text to display to clients")

    # PAYMENT GATEWAY DEFAULTS - CONSOLIDATED from bookingflow domain
    default_payment_gateways = models.ManyToManyField(
        "payments.PaymentGateway",
        blank=True,
        related_name="global_default_settings",
        help_text="Default payment gateways available globally",
    )

    primary_payment_gateway = models.ForeignKey(
        "payments.PaymentGateway",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="primary_for_global_settings",
        help_text="Primary payment gateway (pre-selected by default)",
    )

    # DATE BLOCKING POLICY SETTINGS
    DATE_BLOCKING_POLICY_CHOICES = [
        ("IMMEDIATE", "Block Immediately on Booking"),
        ("ON_DOWNPAYMENT", "Block When Downpayment Received"),
    ]

    DOWNPAYMENT_DUE_REFERENCE_CHOICES = [
        ("DAYS_AFTER_BOOKING", "Days After Booking"),
        ("DAYS_BEFORE_EVENT", "Days Before Event"),
    ]

    date_blocking_policy = models.CharField(
        max_length=20,
        choices=DATE_BLOCKING_POLICY_CHOICES,
        default="IMMEDIATE",
        help_text="When to block dates for new bookings",
    )

    downpayment_due_reference = models.CharField(
        max_length=20,
        choices=DOWNPAYMENT_DUE_REFERENCE_CHOICES,
        default="DAYS_AFTER_BOOKING",
        help_text="Reference point for downpayment due date calculation",
    )

    downpayment_deadline_days = models.PositiveIntegerField(
        default=7,
        help_text="Days after booking before event is auto-cancelled if downpayment not received (for ON_DOWNPAYMENT policy)",
    )

    # CHILD/YOUTH PRICING SETTINGS
    child_pricing_enabled = models.BooleanField(default=False, help_text="Enable age-based pricing tiers")

    child_pricing_tiers = models.JSONField(
        default=list, blank=True, help_text="Age-based pricing tiers: [{min_age, max_age, discount_percentage, label}]"
    )

    # SERVICE CHARGE SETTINGS
    service_charge_enabled = models.BooleanField(default=False, help_text="Enable service charge on bookings")
    service_charge_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("10.00"), help_text="Service charge percentage (0-100)"
    )

    # RESCHEDULING FEE SETTINGS
    rescheduling_fee_enabled = models.BooleanField(
        default=False, help_text="Enable rescheduling fee when client changes event date"
    )
    rescheduling_fee_type = models.CharField(
        max_length=20,
        choices=[("PERCENTAGE", "Percentage of Total"), ("FIXED", "Fixed Amount")],
        default="PERCENTAGE",
        help_text="Type of rescheduling fee calculation",
    )
    rescheduling_fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("10.00"),
        help_text="Rescheduling fee as percentage of contract total",
    )
    rescheduling_fee_fixed_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Fixed rescheduling fee amount"
    )
    rescheduling_grace_period_hours = models.PositiveIntegerField(
        default=24, help_text="Hours after booking during which rescheduling is free"
    )

    # LATE CHECKOUT FEE SETTINGS
    late_checkout_fee_enabled = models.BooleanField(default=False, help_text="Enable late checkout fee")
    late_checkout_fee_type = models.CharField(
        max_length=20,
        choices=[("FIXED", "Fixed Amount"), ("HOURLY", "Per Hour"), ("PERCENTAGE", "Percentage of Contract")],
        default="HOURLY",
        help_text="Type of late checkout fee calculation",
    )
    late_checkout_fee_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("300.00"),
        help_text="Late checkout fee amount (fixed or per hour)",
    )
    late_checkout_fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("10.00"),
        help_text="Late checkout fee as percentage (if type is PERCENTAGE)",
    )
    late_checkout_grace_minutes = models.PositiveIntegerField(
        default=15, help_text="Minutes after scheduled checkout before late fee applies"
    )
    late_checkout_max_hours = models.PositiveIntegerField(
        default=4, help_text="Maximum hours for late checkout billing"
    )

    # DATE HOLDING SETTINGS
    date_hold_enabled = models.BooleanField(default=True, help_text="Enable temporary date holding")
    date_hold_duration_days = models.PositiveIntegerField(
        default=7, help_text="Default duration for temporary date holds in days"
    )
    date_hold_max_extensions = models.PositiveIntegerField(
        default=1, help_text="Maximum number of hold extensions allowed"
    )
    date_hold_extension_days = models.PositiveIntegerField(
        default=3, help_text="Duration of each hold extension in days"
    )

    class Meta:
        verbose_name = "Payment Settings"
        verbose_name_plural = "Payment Settings"

    def clean(self):
        """Validate that only one settings instance exists"""
        if not self.pk and PaymentSettings.objects.exists():
            raise ValidationError("Only one PaymentSettings instance is allowed.")

        # Validate percentage fields
        if not (0 <= self.default_deposit_percentage <= 100):
            raise ValidationError("Default deposit percentage must be between 0 and 100.")

        if not (0 <= self.refund_percentage <= 100):
            raise ValidationError("Refund percentage must be between 0 and 100.")

        if not (0 <= self.downpayment_percentage <= 100):
            raise ValidationError("Downpayment percentage must be between 0 and 100.")

        if not (0 <= self.late_fee_percentage <= 100):
            raise ValidationError("Late fee percentage must be between 0 and 100.")

        if not (0 <= self.cancellation_admin_fee_percentage <= 100):
            raise ValidationError("Cancellation admin fee percentage must be between 0 and 100.")

        # Validate new fee percentages
        if not (0 <= self.service_charge_percentage <= 100):
            raise ValidationError("Service charge percentage must be between 0 and 100.")

        if not (0 <= self.rescheduling_fee_percentage <= 100):
            raise ValidationError("Rescheduling fee percentage must be between 0 and 100.")

        if not (0 <= self.late_checkout_fee_percentage <= 100):
            raise ValidationError("Late checkout fee percentage must be between 0 and 100.")

        # Validate rescheduling fee type requirements
        if self.rescheduling_fee_type == "FIXED" and self.rescheduling_fee_fixed_amount is None:
            raise ValidationError("Fixed rescheduling fee amount is required when fee type is FIXED.")

        # Validate deposit type requirements
        if self.deposit_type == "FIXED" and self.deposit_fixed_amount is None:
            raise ValidationError("Fixed deposit amount is required when deposit type is FIXED.")

        # Validate security deposit
        if self.security_deposit_enabled and self.security_deposit_amount <= 0:
            raise ValidationError("Security deposit amount must be greater than 0 when enabled.")

    def save(self, *args, **kwargs):
        """Ensure singleton pattern"""
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def get_default_settings(cls):
        """Get the default payment settings (singleton)"""
        settings, created = cls.objects.get_or_create(
            defaults={
                "balance_due_days": 30,
                "grace_period_days": 7,
                "late_fee_enabled": True,
                "default_late_fee_amount": Decimal("25.00"),
                "default_deposit_percentage": Decimal("50.00"),
                # NOTE: default_currency removed - use CurrencySettings instead
                "auto_payment_retry_attempts": 3,
                "auto_payment_retry_delay_days": 2,
                # CONSOLIDATED: Refund policy defaults
                "allow_refunds": True,
                "refund_deadline_hours": 48,
                "refund_percentage": 100,
                "refund_policy_text": "",
                # NEW: Enhanced deposit settings
                "deposit_type": "PERCENTAGE",
                "deposit_fixed_amount": None,
                "deposit_is_refundable": False,
                "deposit_is_deductible": True,
                "deposit_waived_on_full_payment": True,
                # NEW: Enhanced late fee settings
                "late_fee_type": "FIXED",
                "late_fee_percentage": Decimal("0.00"),
                # NEW: Security deposit settings
                "security_deposit_enabled": False,
                "security_deposit_amount": Decimal("0.00"),
                "security_deposit_is_refundable": True,
                "security_deposit_description": "",
                # NEW: Cancellation settings
                "cancellation_admin_fee_percentage": Decimal("0.00"),
                # NEW: Payment schedule settings
                "downpayment_percentage": Decimal("30.00"),
                "downpayment_due_days": 7,
                "balance_due_type": "DAYS_BEFORE",
                # NEW: Date blocking policy settings
                "date_blocking_policy": "IMMEDIATE",
                "downpayment_due_reference": "DAYS_AFTER_BOOKING",
                "downpayment_deadline_days": 7,
                # NEW: Child pricing settings
                "child_pricing_enabled": False,
                "child_pricing_tiers": [],
                # Note: ManyToMany and ForeignKey fields set after creation
            }
        )
        return settings

    def __str__(self):
        return "Global Payment Settings"
