# backend/core/domains/payments/serializers/settings_serializers.py
from rest_framework import serializers

from ..models import PaymentSettings, TaxRate


class PaymentSettingsSerializer(serializers.ModelSerializer):
    """Serializer for PaymentSettings with validation"""

    class Meta:
        model = PaymentSettings
        fields = [
            "id",
            # Payment plan settings
            "balance_due_days",
            "grace_period_days",
            "late_fee_enabled",
            "default_late_fee_amount",
            "default_deposit_percentage",
            # Enhanced deposit settings
            "deposit_type",
            "deposit_fixed_amount",
            "deposit_is_refundable",
            "deposit_is_deductible",
            "deposit_waived_on_full_payment",
            # Enhanced late fee settings
            "late_fee_type",
            "late_fee_percentage",
            # Security deposit settings
            "security_deposit_enabled",
            "security_deposit_amount",
            "security_deposit_is_refundable",
            "security_deposit_description",
            # Cancellation settings
            "cancellation_admin_fee_percentage",
            # Payment schedule settings
            "downpayment_percentage",
            "downpayment_due_days",
            "balance_due_type",
            # NOTE: default_currency removed - currency is now managed by CurrencySettings
            # Auto retry settings
            "auto_payment_retry_attempts",
            "auto_payment_retry_delay_days",
            # Refund policy settings
            "allow_refunds",
            "refund_deadline_hours",
            "refund_percentage",
            "refund_policy_text",
            # Date blocking policy settings
            "date_blocking_policy",
            "downpayment_due_reference",
            "downpayment_deadline_days",
            # Child/youth pricing settings
            "child_pricing_enabled",
            "child_pricing_tiers",
            # Service charge settings
            "service_charge_enabled",
            "service_charge_percentage",
            # Rescheduling fee settings
            "rescheduling_fee_enabled",
            "rescheduling_fee_type",
            "rescheduling_fee_percentage",
            "rescheduling_fee_fixed_amount",
            "rescheduling_grace_period_hours",
            # Late checkout fee settings
            "late_checkout_fee_enabled",
            "late_checkout_fee_type",
            "late_checkout_fee_amount",
            "late_checkout_fee_percentage",
            "late_checkout_grace_minutes",
            "late_checkout_max_hours",
            # Date holding settings
            "date_hold_enabled",
            "date_hold_duration_days",
            "date_hold_max_extensions",
            "date_hold_extension_days",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_default_deposit_percentage(self, value):
        """Validate deposit percentage is between 0 and 100"""
        if not (0 <= value <= 100):
            raise serializers.ValidationError("Default deposit percentage must be between 0 and 100.")
        return value

    def validate_refund_percentage(self, value):
        """Validate refund percentage is between 0 and 100"""
        if not (0 <= value <= 100):
            raise serializers.ValidationError("Refund percentage must be between 0 and 100.")
        return value

    def validate_balance_due_days(self, value):
        """Validate balance due days is positive"""
        if value <= 0:
            raise serializers.ValidationError("Balance due days must be a positive number.")
        return value

    def validate_grace_period_days(self, value):
        """Validate grace period days is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Grace period days must be non-negative.")
        return value

    def validate_auto_payment_retry_attempts(self, value):
        """Validate retry attempts is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Auto payment retry attempts must be non-negative.")
        return value

    def validate_auto_payment_retry_delay_days(self, value):
        """Validate retry delay days is positive"""
        if value <= 0:
            raise serializers.ValidationError("Auto payment retry delay days must be a positive number.")
        return value

    def validate_default_late_fee_amount(self, value):
        """Validate late fee amount is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Default late fee amount must be non-negative.")
        return value

    def validate_downpayment_percentage(self, value):
        """Validate downpayment percentage is between 0 and 100"""
        if not (0 <= value <= 100):
            raise serializers.ValidationError("Downpayment percentage must be between 0 and 100.")
        return value

    def validate_late_fee_percentage(self, value):
        """Validate late fee percentage is between 0 and 100"""
        if not (0 <= value <= 100):
            raise serializers.ValidationError("Late fee percentage must be between 0 and 100.")
        return value

    def validate_cancellation_admin_fee_percentage(self, value):
        """Validate cancellation admin fee percentage is between 0 and 100"""
        if not (0 <= value <= 100):
            raise serializers.ValidationError("Cancellation admin fee percentage must be between 0 and 100.")
        return value

    def validate_security_deposit_amount(self, value):
        """Validate security deposit amount is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Security deposit amount must be non-negative.")
        return value

    def validate(self, data):
        """Cross-field validation"""
        # If deposit type is FIXED, fixed amount is required
        deposit_type = data.get("deposit_type", self.instance.deposit_type if self.instance else "PERCENTAGE")
        deposit_fixed_amount = data.get(
            "deposit_fixed_amount", self.instance.deposit_fixed_amount if self.instance else None
        )

        if deposit_type == "FIXED" and deposit_fixed_amount is None:
            raise serializers.ValidationError(
                {"deposit_fixed_amount": "Fixed deposit amount is required when deposit type is FIXED."}
            )

        # If security deposit is enabled, amount must be positive
        security_enabled = data.get(
            "security_deposit_enabled", self.instance.security_deposit_enabled if self.instance else False
        )
        security_amount = data.get(
            "security_deposit_amount", self.instance.security_deposit_amount if self.instance else 0
        )

        if security_enabled and (security_amount is None or security_amount <= 0):
            raise serializers.ValidationError(
                {"security_deposit_amount": "Security deposit amount must be greater than 0 when enabled."}
            )

        return data


class TaxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = [
            "id",
            "name",
            "rate",
            "region",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PublicPaymentSettingsSerializer(serializers.ModelSerializer):
    """
    Public serializer for payment settings - only safe fields exposed.

    Used for client-facing booking flows and guest checkout.
    Excludes internal/admin-only fields like grace periods, late fees, and retry settings.
    """

    # Currency is fetched from CurrencySettings (single source of truth)
    default_currency = serializers.SerializerMethodField()

    class Meta:
        model = PaymentSettings
        fields = [
            "id",
            # Client-facing payment configuration
            "balance_due_days",
            "default_deposit_percentage",
            "default_currency",
            # Refund policy (public transparency)
            "allow_refunds",
            "refund_deadline_hours",
            "refund_percentage",
            "refund_policy_text",
        ]
        read_only_fields = [
            "id",
            "balance_due_days",
            "default_deposit_percentage",
            "default_currency",
            "allow_refunds",
            "refund_deadline_hours",
            "refund_percentage",
            "refund_policy_text",
        ]

    def get_default_currency(self, obj):
        """Get default currency from CurrencySettings (single source of truth)"""
        from core.domains.settings.models import CurrencySettings

        currency_settings = CurrencySettings.get_system_settings()
        return currency_settings.default_currency if currency_settings else "PHP"
