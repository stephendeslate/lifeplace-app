# backend/core/domains/vip/serializers.py
from django.utils.text import slugify
from rest_framework import serializers

from .models import (
    ClientVIPStatus,
    VIPBenefit,
    VIPPointTransaction,
    VIPRewardRedemption,
    VIPSettings,
    VIPTier,
    VIPTierHistory,
)


class VIPSettingsSerializer(serializers.ModelSerializer):
    """Serializer for VIP program settings (singleton)."""

    class Meta:
        model = VIPSettings
        fields = [
            "id",
            "is_program_enabled",
            "program_name",
            "earning_automatic_enabled",
            "earning_points_enabled",
            "earning_manual_enabled",
            "automatic_earning_type",
            "points_per_currency_spent",
            "points_currency_unit",
            "points_expiry_months",
            "expiration_type",
            "expiration_months",
            "show_vip_status_to_client",
            "show_tier_progress_to_client",
            "show_available_rewards_to_client",
            "show_points_balance_to_client",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class VIPTierSerializer(serializers.ModelSerializer):
    """Serializer for VIP tiers."""

    benefits_count = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = VIPTier
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "level",
            "is_default",
            "min_total_spent",
            "min_completed_bookings",
            "min_points_required",
            "color",
            "icon",
            "is_active",
            "benefits_count",
            "members_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "benefits_count", "members_count", "created_at", "updated_at"]

    def get_benefits_count(self, obj):
        return obj.benefits.filter(is_active=True).count()

    def get_members_count(self, obj):
        return obj.members.filter(status="ACTIVE").count()

    def validate_level(self, value):
        """Ensure level is unique."""
        instance = self.instance
        if VIPTier.objects.filter(level=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("A tier with this level already exists.")
        return value

    def validate(self, data):
        """Validate tier data."""
        # Auto-generate slug from name
        if "name" in data:
            name = data["name"]
            base_slug = slugify(name)
            slug = base_slug
            counter = 1
            instance_pk = self.instance.pk if self.instance else None
            while VIPTier.objects.filter(slug=slug).exclude(pk=instance_pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            data["slug"] = slug

        return data


class VIPTierListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for tier selection dropdowns."""

    class Meta:
        model = VIPTier
        fields = ["id", "name", "level", "color", "is_default"]


class VIPBenefitSerializer(serializers.ModelSerializer):
    """Serializer for VIP benefits."""

    tier_name = serializers.CharField(source="tier.name", read_only=True)
    benefit_type_display = serializers.CharField(source="get_benefit_type_display", read_only=True)
    application_mode_display = serializers.CharField(source="get_application_mode_display", read_only=True)

    class Meta:
        model = VIPBenefit
        fields = [
            "id",
            "tier",
            "tier_name",
            "benefit_type",
            "benefit_type_display",
            "application_mode",
            "application_mode_display",
            "value",
            "applicable_products",
            "max_uses_per_booking",
            "max_uses_per_month",
            "points_cost",
            "is_active",
            "description",
            "display_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, data):
        """Validate benefit configuration."""
        benefit_type = data.get("benefit_type")

        # Validate that value-based benefits have a value
        value_required_types = [
            "PERCENTAGE_DISCOUNT",
            "FIXED_DISCOUNT",
            "FREE_HOURS",
        ]
        if benefit_type in value_required_types and not data.get("value"):
            raise serializers.ValidationError({"value": f"Value is required for {benefit_type} benefits."})

        # Validate percentage is between 0-100
        if benefit_type == "PERCENTAGE_DISCOUNT" and data.get("value"):
            if data["value"] < 0 or data["value"] > 100:
                raise serializers.ValidationError({"value": "Percentage discount must be between 0 and 100."})

        return data


class ClientVIPStatusSerializer(serializers.ModelSerializer):
    """Serializer for client VIP status."""

    client_email = serializers.EmailField(source="client.email", read_only=True)
    client_name = serializers.SerializerMethodField()
    current_tier_name = serializers.CharField(source="current_tier.name", read_only=True, allow_null=True)
    current_tier_data = VIPTierListSerializer(source="current_tier", read_only=True)
    assigned_by_email = serializers.EmailField(source="assigned_by.email", read_only=True, allow_null=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    is_vip = serializers.BooleanField(read_only=True)

    class Meta:
        model = ClientVIPStatus
        fields = [
            "id",
            "client",
            "client_email",
            "client_name",
            "current_tier",
            "current_tier_name",
            "current_tier_data",
            "points_balance",
            "lifetime_points_earned",
            "lifetime_points_spent",
            "total_spent",
            "completed_bookings_count",
            "status",
            "status_display",
            "is_vip",
            "assigned_by",
            "assigned_by_email",
            "assigned_at",
            "assignment_reason",
            "expires_at",
            "last_activity_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "client_email",
            "client_name",
            "current_tier_name",
            "points_balance",
            "lifetime_points_earned",
            "lifetime_points_spent",
            "total_spent",
            "completed_bookings_count",
            "last_activity_at",
            "created_at",
            "updated_at",
        ]

    def get_client_name(self, obj):
        return f"{obj.client.first_name} {obj.client.last_name}".strip() or obj.client.email


class ClientVIPStatusListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for VIP status listings."""

    client_email = serializers.EmailField(source="client.email", read_only=True)
    client_name = serializers.SerializerMethodField()
    current_tier_name = serializers.CharField(source="current_tier.name", read_only=True, allow_null=True)
    tier_color = serializers.CharField(source="current_tier.color", read_only=True, allow_null=True)

    class Meta:
        model = ClientVIPStatus
        fields = [
            "id",
            "client",
            "client_email",
            "client_name",
            "current_tier",
            "current_tier_name",
            "tier_color",
            "points_balance",
            "total_spent",
            "completed_bookings_count",
            "status",
        ]

    def get_client_name(self, obj):
        return f"{obj.client.first_name} {obj.client.last_name}".strip() or obj.client.email


class VIPPointTransactionSerializer(serializers.ModelSerializer):
    """Serializer for point transactions."""

    transaction_type_display = serializers.CharField(source="get_transaction_type_display", read_only=True)
    client_email = serializers.EmailField(source="client_vip_status.client.email", read_only=True)
    performed_by_email = serializers.EmailField(source="performed_by.email", read_only=True, allow_null=True)

    class Meta:
        model = VIPPointTransaction
        fields = [
            "id",
            "client_vip_status",
            "client_email",
            "transaction_type",
            "transaction_type_display",
            "points",
            "event",
            "payment",
            "description",
            "balance_after",
            "performed_by",
            "performed_by_email",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class VIPRewardRedemptionSerializer(serializers.ModelSerializer):
    """Serializer for reward redemptions."""

    benefit_name = serializers.CharField(source="benefit.name", read_only=True)
    benefit_type = serializers.CharField(source="benefit.benefit_type", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = VIPRewardRedemption
        fields = [
            "id",
            "client_vip_status",
            "benefit",
            "benefit_name",
            "benefit_type",
            "event",
            "status",
            "status_display",
            "points_spent",
            "value_applied",
            "applied_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class VIPTierHistorySerializer(serializers.ModelSerializer):
    """Serializer for tier change history."""

    from_tier_name = serializers.CharField(source="from_tier.name", read_only=True, allow_null=True)
    to_tier_name = serializers.CharField(source="to_tier.name", read_only=True, allow_null=True)
    reason_display = serializers.CharField(source="get_reason_display", read_only=True)
    changed_by_email = serializers.EmailField(source="changed_by.email", read_only=True, allow_null=True)

    class Meta:
        model = VIPTierHistory
        fields = [
            "id",
            "client_vip_status",
            "from_tier",
            "from_tier_name",
            "to_tier",
            "to_tier_name",
            "reason",
            "reason_display",
            "notes",
            "changed_by",
            "changed_by_email",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ============================================
# Client Portal Serializers (Read-only views)
# ============================================


class ClientVIPStatusPublicSerializer(serializers.ModelSerializer):
    """
    Public serializer for client's own VIP status.
    Used in client portal - respects visibility settings.
    """

    current_tier = VIPTierListSerializer(read_only=True)
    benefits = serializers.SerializerMethodField()
    next_tier = serializers.SerializerMethodField()
    progress_to_next_tier = serializers.SerializerMethodField()

    class Meta:
        model = ClientVIPStatus
        fields = [
            "current_tier",
            "points_balance",
            "total_spent",
            "completed_bookings_count",
            "status",
            "expires_at",
            "benefits",
            "next_tier",
            "progress_to_next_tier",
        ]

    def get_benefits(self, obj):
        """Get active benefits for the client's tier."""
        if not obj.current_tier:
            return []

        benefits = VIPBenefit.objects.filter(tier=obj.current_tier, is_active=True)
        return VIPBenefitPublicSerializer(benefits, many=True).data

    def get_next_tier(self, obj):
        """Get the next tier above current."""
        if not obj.current_tier:
            next_tier = VIPTier.objects.filter(is_active=True).order_by("level").first()
        else:
            next_tier = (
                VIPTier.objects.filter(is_active=True, level__gt=obj.current_tier.level).order_by("level").first()
            )

        if next_tier:
            return VIPTierListSerializer(next_tier).data
        return None

    def get_progress_to_next_tier(self, obj):
        """Calculate progress toward next tier."""
        next_tier = self.get_next_tier(obj)
        if not next_tier:
            return None

        next_tier_obj = VIPTier.objects.get(id=next_tier["id"])
        progress = {
            "spending": None,
            "bookings": None,
            "points": None,
        }

        if next_tier_obj.min_total_spent:
            progress["spending"] = {
                "current": float(obj.total_spent),
                "required": float(next_tier_obj.min_total_spent),
                "percentage": min(100, float(obj.total_spent / next_tier_obj.min_total_spent * 100)),
            }

        if next_tier_obj.min_completed_bookings:
            progress["bookings"] = {
                "current": obj.completed_bookings_count,
                "required": next_tier_obj.min_completed_bookings,
                "percentage": min(100, obj.completed_bookings_count / next_tier_obj.min_completed_bookings * 100),
            }

        if next_tier_obj.min_points_required:
            progress["points"] = {
                "current": obj.points_balance,
                "required": next_tier_obj.min_points_required,
                "percentage": min(100, obj.points_balance / next_tier_obj.min_points_required * 100),
            }

        return progress


class VIPBenefitPublicSerializer(serializers.ModelSerializer):
    """Public serializer for benefits (client-facing)."""

    benefit_type_display = serializers.CharField(source="get_benefit_type_display", read_only=True)

    class Meta:
        model = VIPBenefit
        fields = [
            "id",
            "benefit_type",
            "benefit_type_display",
            "application_mode",
            "value",
            "points_cost",
            "display_name",
            "description",
        ]


# ============================================
# Action Serializers (for specific endpoints)
# ============================================


class AssignTierSerializer(serializers.Serializer):
    """Serializer for manual tier assignment."""

    tier_id = serializers.IntegerField()
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_tier_id(self, value):
        try:
            VIPTier.objects.get(id=value, is_active=True)
        except VIPTier.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive tier.")
        return value


class AwardPointsSerializer(serializers.Serializer):
    """Serializer for awarding bonus points."""

    points = serializers.IntegerField(min_value=1)
    description = serializers.CharField(max_length=255)


class AdjustPointsSerializer(serializers.Serializer):
    """Serializer for point adjustments (can be negative)."""

    points = serializers.IntegerField()
    description = serializers.CharField(max_length=255)

    def validate_points(self, value):
        if value == 0:
            raise serializers.ValidationError("Points adjustment cannot be zero.")
        return value


class RedeemBenefitSerializer(serializers.Serializer):
    """Serializer for benefit redemption."""

    benefit_id = serializers.IntegerField()
    event_id = serializers.IntegerField()

    def validate_benefit_id(self, value):
        try:
            VIPBenefit.objects.get(id=value, is_active=True, application_mode="REDEEMABLE")
        except VIPBenefit.DoesNotExist:
            raise serializers.ValidationError("Invalid or non-redeemable benefit.")
        return value
