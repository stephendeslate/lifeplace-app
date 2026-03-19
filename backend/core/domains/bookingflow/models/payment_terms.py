from django.db import models

from core.utils.models import BaseModel

from .flow import BookingFlowStep

# Choice constants for PaymentTermsConfiguration
DEPOSIT_TYPE_CHOICES = [("PERCENTAGE", "Percentage of Total"), ("FIXED", "Fixed Amount")]

LATE_FEE_TYPE_CHOICES = [("FIXED", "Fixed Amount"), ("PERCENTAGE", "Percentage of Invoice")]

BALANCE_DUE_TYPE_CHOICES = [("DAYS_BEFORE", "Specific Days Before Event"), ("DAY_BEFORE", "Day Before Event")]


class PaymentTermsConfiguration(BaseModel):
    """
    Flow-specific payment terms configuration that overrides global PaymentSettings.

    Fields are nullable - null values mean "use global default from PaymentSettings".
    This allows per-booking-flow customization while maintaining global defaults.
    """

    step = models.OneToOneField(BookingFlowStep, on_delete=models.CASCADE, related_name="payment_terms_config")

    # DEPOSIT CONFIGURATION OVERRIDES
    deposit_type = models.CharField(
        max_length=20,
        choices=DEPOSIT_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Override: Type of deposit calculation (null = use global)",
    )

    deposit_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Deposit as percentage of total (null = use global)",
    )

    deposit_fixed_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Fixed deposit amount (null = use global)",
    )

    deposit_is_refundable = models.BooleanField(
        null=True, blank=True, help_text="Override: Whether deposit is refundable (null = use global)"
    )

    deposit_is_deductible = models.BooleanField(
        null=True, blank=True, help_text="Override: Whether deposit is deducted from total (null = use global)"
    )

    deposit_waived_on_full_payment = models.BooleanField(
        null=True, blank=True, help_text="Override: Whether deposit is waived on full payment (null = use global)"
    )

    # LATE FEE CONFIGURATION OVERRIDES
    late_fee_type = models.CharField(
        max_length=20,
        choices=LATE_FEE_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Override: Type of late fee calculation (null = use global)",
    )

    late_fee_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Fixed late fee amount (null = use global)",
    )

    late_fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Late fee as percentage (null = use global)",
    )

    # SECURITY DEPOSIT CONFIGURATION OVERRIDES
    security_deposit_enabled = models.BooleanField(
        null=True, blank=True, help_text="Override: Whether security deposit is enabled (null = use global)"
    )

    security_deposit_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Security deposit amount (null = use global)",
    )

    security_deposit_is_refundable = models.BooleanField(
        null=True, blank=True, help_text="Override: Whether security deposit is refundable (null = use global)"
    )

    security_deposit_description = models.CharField(
        max_length=255, blank=True, help_text="Override: Security deposit description (empty = use global)"
    )

    # CANCELLATION CONFIGURATION OVERRIDES
    cancellation_admin_fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Admin fee percentage on cancellation (null = use global)",
    )

    # PAYMENT SCHEDULE CONFIGURATION OVERRIDES
    downpayment_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Downpayment percentage of TCP (null = use global)",
    )

    downpayment_due_days = models.PositiveIntegerField(
        null=True, blank=True, help_text="Override: Days after booking for downpayment (null = use global)"
    )

    balance_due_days = models.PositiveIntegerField(
        null=True, blank=True, help_text="Override: Days before event for balance due (null = use global)"
    )

    balance_due_type = models.CharField(
        max_length=20,
        choices=BALANCE_DUE_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Override: When balance is due (null = use global)",
    )

    # DATE BLOCKING POLICY OVERRIDES
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
        null=True,
        blank=True,
        help_text="Override: When to block dates (null = use global)",
    )

    downpayment_due_reference = models.CharField(
        max_length=20,
        choices=DOWNPAYMENT_DUE_REFERENCE_CHOICES,
        null=True,
        blank=True,
        help_text="Override: Reference point for downpayment due date (null = use global)",
    )

    downpayment_deadline_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Override: Days before auto-cancellation if downpayment not received (null = use global)",
    )

    # CHILD/YOUTH PRICING OVERRIDES
    child_pricing_enabled = models.BooleanField(
        null=True, blank=True, help_text="Override: Enable age-based pricing (null = use global)"
    )

    child_pricing_tiers = models.JSONField(
        null=True, blank=True, help_text="Override: Age-based pricing tiers (null = use global)"
    )

    class Meta:
        verbose_name = "Payment Terms Configuration"
        verbose_name_plural = "Payment Terms Configurations"

    def __str__(self):
        return f"Payment Terms config for {self.step}"

    def get_effective_settings(self):
        """
        Merge flow-specific settings with global defaults from PaymentSettings.
        Returns a dict with all payment terms, using flow values when set,
        falling back to global settings when null.
        """
        from core.domains.payments.models import PaymentSettings
        from core.domains.settings.models import CurrencySettings

        global_settings = PaymentSettings.get_default_settings()
        # Get currency from CurrencySettings (single source of truth)
        currency_settings = CurrencySettings.get_system_settings()
        currency = currency_settings.default_currency if currency_settings else "PHP"

        def get_value(local_field, global_field):
            """Get local value if set, otherwise global default"""
            local_value = getattr(self, local_field, None)
            if local_value is not None:
                return local_value
            return getattr(global_settings, global_field, None)

        return {
            # Deposit settings
            "deposit_type": get_value("deposit_type", "deposit_type"),
            "deposit_percentage": get_value("deposit_percentage", "default_deposit_percentage"),
            "deposit_fixed_amount": get_value("deposit_fixed_amount", "deposit_fixed_amount"),
            "deposit_is_refundable": get_value("deposit_is_refundable", "deposit_is_refundable"),
            "deposit_is_deductible": get_value("deposit_is_deductible", "deposit_is_deductible"),
            "deposit_waived_on_full_payment": get_value(
                "deposit_waived_on_full_payment", "deposit_waived_on_full_payment"
            ),
            # Late fee settings
            "late_fee_type": get_value("late_fee_type", "late_fee_type"),
            "late_fee_amount": get_value("late_fee_amount", "default_late_fee_amount"),
            "late_fee_percentage": get_value("late_fee_percentage", "late_fee_percentage"),
            "late_fee_enabled": global_settings.late_fee_enabled,  # Always from global
            # Security deposit settings
            "security_deposit_enabled": get_value("security_deposit_enabled", "security_deposit_enabled"),
            "security_deposit_amount": get_value("security_deposit_amount", "security_deposit_amount"),
            "security_deposit_is_refundable": get_value(
                "security_deposit_is_refundable", "security_deposit_is_refundable"
            ),
            "security_deposit_description": self.security_deposit_description
            or global_settings.security_deposit_description,
            # Cancellation settings
            "cancellation_admin_fee_percentage": get_value(
                "cancellation_admin_fee_percentage", "cancellation_admin_fee_percentage"
            ),
            "refund_percentage": global_settings.refund_percentage,  # Always from global
            "allow_refunds": global_settings.allow_refunds,  # Always from global
            "refund_deadline_hours": global_settings.refund_deadline_hours,  # Always from global
            # Payment schedule settings
            "downpayment_percentage": get_value("downpayment_percentage", "downpayment_percentage"),
            "downpayment_due_days": get_value("downpayment_due_days", "downpayment_due_days"),
            "balance_due_days": get_value("balance_due_days", "balance_due_days"),
            "balance_due_type": get_value("balance_due_type", "balance_due_type"),
            # Date blocking policy settings
            "date_blocking_policy": get_value("date_blocking_policy", "date_blocking_policy"),
            "downpayment_due_reference": get_value("downpayment_due_reference", "downpayment_due_reference"),
            "downpayment_deadline_days": get_value("downpayment_deadline_days", "downpayment_deadline_days"),
            # Child pricing settings
            "child_pricing_enabled": get_value("child_pricing_enabled", "child_pricing_enabled"),
            "child_pricing_tiers": self.child_pricing_tiers
            if self.child_pricing_tiers is not None
            else global_settings.child_pricing_tiers,
            # Currency (from CurrencySettings - single source of truth)
            "currency": currency,
        }
