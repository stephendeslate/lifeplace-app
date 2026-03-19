import logging

from rest_framework import serializers

from core.domains.products.serializers import (
    DiscountSerializer,
    ProductCategorySerializer,
    ProductOptionSerializer,
)
from core.domains.questionnaires.basic_serializers import QuestionnaireBasicSerializer

from ..models import (
    AddonSelectionStepConfiguration,
    ConfirmationStepConfiguration,
    ContactInfoStepConfiguration,
    DateTimeStepConfiguration,
    IntroductionStepConfiguration,
    PackageSelectionStepConfiguration,
    PaymentInfoStepConfiguration,
    PaymentTermsConfiguration,
    PricingSummaryStepConfiguration,
    QuestionnaireStepConfiguration,
    QuestionnaireStepItem,
    VenueSelectionStepConfiguration,
)

logger = logging.getLogger(__name__)


class IntroductionStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntroductionStepConfiguration
        fields = [
            "id",
            "step",
            "title",
            "content",
            "show_event_details",
            "show_pricing_overview",
            "custom_css",
            "background_image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "step", "created_at", "updated_at"]


class VenueSelectionStepConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for venue selection step configuration"""

    available_venues_details = serializers.SerializerMethodField()

    class Meta:
        model = VenueSelectionStepConfiguration
        fields = [
            "id",
            "step",
            "min_venues",
            "max_venues",
            "show_pricing",
            "show_included_hours",
            "show_bundle_discount",
            "bundle_discount_percent",
            "title",
            "description",
            "show_package_recommendations",
            "show_view_packages_option",
            "view_packages_button_text",
            "available_venues_details",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "step", "created_at", "updated_at"]

    def get_available_venues_details(self, obj):
        """Get detailed venue information for available venues"""
        from django.db.models import Prefetch

        from core.domains.venues.models import VenueEventTypeConfiguration
        from core.domains.venues.serializers import (
            RentableVenueSerializer,
            RentableVenueWithEventTypeSerializer,
        )

        venues = obj.get_available_venues_queryset()

        # Get event_type_id from the booking flow for event-type-specific pricing
        event_type_id = None
        if obj.step and obj.step.booking_flow and obj.step.booking_flow.event_type:
            event_type_id = obj.step.booking_flow.event_type_id

        # Prefetch related data to eliminate N+1 queries
        venues = venues.select_related("venue_operating_rules")
        if event_type_id:
            venues = venues.prefetch_related(
                Prefetch(
                    "event_type_configs",
                    queryset=VenueEventTypeConfiguration.objects.filter(event_type_id=event_type_id),
                    to_attr="_prefetched_event_type_configs",
                )
            )

        # Build context with request (for absolute URLs) and event_type_id (for pricing)
        context = {**self.context, "event_type_id": event_type_id}

        # Use event-type-aware serializer if we have an event type
        if event_type_id:
            return RentableVenueWithEventTypeSerializer(venues, many=True, context=context).data
        return RentableVenueSerializer(venues, many=True, context=context).data


class DateTimeStepConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for DateTime step configuration."""

    class Meta:
        model = DateTimeStepConfiguration
        fields = [
            "id",
            "step",
            "allow_multi_day",
            "min_event_days",
            "max_event_days",
            "show_calendar_view",
            "enable_real_time_availability",
            "show_availability_status",
            "auto_check_conflicts",
            "blocked_dates",
            "available_days_of_week",
            "available_time_slots",
            "buffer_before_hours",
            "buffer_after_hours",
            "check_venue_availability",
            "check_resource_availability",
            "check_staff_availability",
            "availability_display_mode",
            "allow_overbooking",
            "overbooking_threshold",
            "sync_with_calendar",
            "calendar_source",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "step", "created_at", "updated_at"]


class QuestionnaireStepItemSerializer(serializers.ModelSerializer):
    questionnaire_details = QuestionnaireBasicSerializer(source="questionnaire", read_only=True)

    class Meta:
        model = QuestionnaireStepItem
        fields = [
            "id",
            "configuration",
            "questionnaire",
            "questionnaire_details",
            "order",
            "is_conditional",
            "show_conditions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class QuestionnaireStepConfigurationSerializer(serializers.ModelSerializer):
    questionnaire_items = QuestionnaireStepItemSerializer(many=True, read_only=True)

    class Meta:
        model = QuestionnaireStepConfiguration
        fields = [
            "id",
            "step",
            "allow_file_uploads",
            "max_file_size_mb",
            "allowed_file_types",
            "questionnaire_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "step", "created_at", "updated_at", "questionnaire_items"]


class PackageSelectionStepConfigurationSerializer(serializers.ModelSerializer):
    # Use SerializerMethodField for ID arrays to avoid ManyRelatedManager issues
    available_categories = serializers.SerializerMethodField()
    available_packages = serializers.SerializerMethodField()

    # Keep the detailed serializers
    available_categories_details = ProductCategorySerializer(source="available_categories", many=True, read_only=True)
    available_packages_details = ProductOptionSerializer(source="available_packages", many=True, read_only=True)

    class Meta:
        model = PackageSelectionStepConfiguration
        fields = [
            "id",
            "step",
            "available_categories",  # ID array
            "available_packages",  # ID array
            "available_categories_details",
            "available_packages_details",
            "selection_type",
            "min_selection",
            "max_selection",
            "show_pricing",
            "show_descriptions",
            "show_images",
            "enable_comparison",
            "filter_by_event_type",
            "enable_dynamic_pricing",
            "pricing_factors",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "step", "created_at", "updated_at"]

    def get_available_categories(self, obj):
        """Get list of category IDs - uses model's safe method"""
        try:
            if obj and hasattr(obj, "get_safe_available_categories"):
                return obj.get_safe_available_categories()
            return []
        except Exception as e:
            logger.warning(
                f"Error serializing available_categories for step {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}"
            )
            return []

    def get_available_packages(self, obj):
        """Get list of package IDs - uses model's safe method"""
        try:
            if obj and hasattr(obj, "get_safe_available_packages"):
                return obj.get_safe_available_packages()
            return []
        except Exception as e:
            logger.warning(
                f"Error serializing available_packages for step {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}"
            )
            return []


class AddonSelectionStepConfigurationSerializer(serializers.ModelSerializer):
    # Use SerializerMethodField for ID arrays to avoid ManyRelatedManager issues
    available_categories = serializers.SerializerMethodField()
    available_addons = serializers.SerializerMethodField()

    # Keep the detailed serializers
    available_categories_details = ProductCategorySerializer(source="available_categories", many=True, read_only=True)
    # Use SerializerMethodField for addons to support event type filtering
    available_addons_details = serializers.SerializerMethodField()

    class Meta:
        model = AddonSelectionStepConfiguration
        fields = [
            "id",
            "step",
            "available_categories",  # ID array
            "available_addons",  # ID array
            "available_categories_details",
            "available_addons_details",
            "min_selection",
            "max_selection",
            "filter_by_event_type",
            "group_by_category",
            "show_recommendations",
            "recommendation_logic",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "step", "created_at", "updated_at"]

    def get_available_categories(self, obj):
        """Get list of category IDs - uses model's safe method"""
        try:
            if obj and hasattr(obj, "get_safe_available_categories"):
                return obj.get_safe_available_categories()
            return []
        except Exception as e:
            logger.warning(
                f"Error serializing available_categories for addon step {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}"
            )
            return []

    def get_available_addons(self, obj):
        """Get list of addon IDs - uses model's safe method"""
        try:
            if obj and hasattr(obj, "get_safe_available_addons"):
                return obj.get_safe_available_addons()
            return []
        except Exception as e:
            logger.warning(
                f"Error serializing available_addons for addon step {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}"
            )
            return []

    def get_available_addons_details(self, obj):
        """
        Get add-on details with optional event type filtering.

        When filter_by_event_type is True:
        - Returns all active PRODUCT-type items associated with the booking flow's event type
        - Falls back to configured available_addons if no event type is set

        When filter_by_event_type is False:
        - Returns only explicitly configured available_addons
        """
        try:
            if not obj:
                return []

            # Check if we should filter by event type
            if obj.filter_by_event_type:
                # Get the event type from the booking flow
                event_type_id = None
                if obj.step and obj.step.booking_flow and obj.step.booking_flow.event_type:
                    event_type_id = obj.step.booking_flow.event_type_id

                if event_type_id:
                    # Fetch all active add-ons (PRODUCT type) for this event type
                    # Note: ProductOption uses event_types (ManyToMany), not event_type (ForeignKey)
                    from core.domains.products.models import ProductOption

                    addons = (
                        ProductOption.objects.filter(type="PRODUCT", is_active=True, event_types__id=event_type_id)
                        .distinct()
                        .prefetch_related(
                            "event_types",
                            "package_venues__venue",
                        )
                        .order_by("sort_order", "name")
                    )
                    return ProductOptionSerializer(addons, many=True, context=self.context).data

            # Fall back to configured available_addons
            addons = obj.available_addons.all()
            return ProductOptionSerializer(addons, many=True, context=self.context).data

        except Exception as e:
            logger.warning(
                f"Error serializing available_addons_details for addon step {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}"
            )
            return []


class PricingSummaryStepConfigurationSerializer(serializers.ModelSerializer):
    effective_terms_url = serializers.SerializerMethodField()
    effective_privacy_url = serializers.SerializerMethodField()

    class Meta:
        model = PricingSummaryStepConfiguration
        fields = [
            "id",
            "step",
            "show_package_breakdown",
            "show_addon_breakdown",
            "show_tax_breakdown",
            "show_discount_field",
            "show_subtotal",
            "allow_discount_codes",
            "calculate_tax",
            "header_text",
            "footer_text",
            "discount_help_text",
            # Terms and Legal Configuration
            "show_terms_checkbox",
            "show_marketing_consent",
            "require_terms_acceptance",
            "terms_text",
            "terms_url",
            "privacy_url",
            "effective_terms_url",
            "effective_privacy_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "step", "effective_terms_url", "effective_privacy_url", "created_at", "updated_at"]

    def get_effective_terms_url(self, obj):
        """Return custom URL or fall back to global default"""
        if obj.terms_url:
            return obj.terms_url
        return "/terms"

    def get_effective_privacy_url(self, obj):
        """Return custom URL or fall back to global default"""
        if obj.privacy_url:
            return obj.privacy_url
        return "/privacy"


class ContactInfoStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInfoStepConfiguration
        fields = [
            "id",
            "step",
            "require_full_name",
            "require_email",
            "require_phone",
            "require_address",
            "require_company",
            "custom_fields",
            "offer_account_creation",
            "require_account_creation",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "step", "created_at", "updated_at"]


class PaymentInfoStepConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for PaymentInfoStepConfiguration

    FULLY CONSOLIDATED: All payment business logic now in PaymentSettings.
    This serializer only includes UI/UX flags and custom text.

    REMOVED fields (now in PaymentSettings):
    - deposit_type, deposit_amount, balance_due_days (payment calculations)
    - allow_refunds, refund_deadline_hours, refund_percentage, refund_policy_text (refund policy)
    - allowed_gateways, default_gateway, available_payment_methods (payment gateways)

    ADDED: effective_payment_terms - merged flow-specific overrides with global defaults
    """

    # Computed field with effective payment terms (flow overrides + global defaults)
    effective_payment_terms = serializers.SerializerMethodField()

    class Meta:
        model = PaymentInfoStepConfiguration
        fields = [
            "id",
            "step",
            # UI/UX flags ONLY
            "accept_full_payment",
            "accept_deposit",
            "allow_quote_request",
            "require_immediate_payment",
            # UI text customization ONLY
            "payment_terms",
            "quote_request_button_text",
            "quote_request_description",
            # Effective payment terms (merged flow + global settings)
            "effective_payment_terms",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "step", "effective_payment_terms", "created_at", "updated_at"]

    def get_effective_payment_terms(self, obj):
        """
        Get effective payment terms for this step.
        Uses PaymentTermsResolver to merge flow-specific overrides with global defaults.
        """
        import logging

        from core.domains.payments.services.payment_terms_resolver import PaymentTermsResolver

        logger = logging.getLogger(__name__)

        try:
            return PaymentTermsResolver.get_terms_for_step(obj.step.id)
        except Exception as e:
            logger.warning(f"Error getting effective payment terms for step {obj.step.id}: {e}")
            # Fall back to global settings
            return PaymentTermsResolver.get_global_settings()


class PaymentTermsConfigurationSerializer(serializers.ModelSerializer):
    """
    Serializer for PaymentTermsConfiguration.

    Flow-specific payment terms that override global PaymentSettings.
    All fields are nullable - null means "use global default".
    """

    # Read-only computed field showing effective (merged) settings
    effective_settings = serializers.SerializerMethodField()

    class Meta:
        model = PaymentTermsConfiguration
        fields = [
            "id",
            "step",
            # Deposit configuration overrides
            "deposit_type",
            "deposit_percentage",
            "deposit_fixed_amount",
            "deposit_is_refundable",
            "deposit_is_deductible",
            "deposit_waived_on_full_payment",
            # Late fee configuration overrides
            "late_fee_type",
            "late_fee_amount",
            "late_fee_percentage",
            # Security deposit configuration overrides
            "security_deposit_enabled",
            "security_deposit_amount",
            "security_deposit_is_refundable",
            "security_deposit_description",
            # Cancellation configuration overrides
            "cancellation_admin_fee_percentage",
            # Payment schedule configuration overrides
            "downpayment_percentage",
            "downpayment_due_days",
            "balance_due_days",
            "balance_due_type",
            # Date blocking policy overrides
            "date_blocking_policy",
            "downpayment_due_reference",
            "downpayment_deadline_days",
            # Child/youth pricing overrides
            "child_pricing_enabled",
            "child_pricing_tiers",
            # Computed field
            "effective_settings",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "step", "effective_settings", "created_at", "updated_at"]

    def get_effective_settings(self, obj):
        """Get the merged settings (flow-specific + global defaults)"""
        return obj.get_effective_settings()

    def validate_deposit_percentage(self, value):
        """Validate deposit percentage is between 0 and 100"""
        if value is not None and not (0 <= value <= 100):
            raise serializers.ValidationError("Deposit percentage must be between 0 and 100.")
        return value

    def validate_downpayment_percentage(self, value):
        """Validate downpayment percentage is between 0 and 100"""
        if value is not None and not (0 <= value <= 100):
            raise serializers.ValidationError("Downpayment percentage must be between 0 and 100.")
        return value

    def validate_late_fee_percentage(self, value):
        """Validate late fee percentage is between 0 and 100"""
        if value is not None and not (0 <= value <= 100):
            raise serializers.ValidationError("Late fee percentage must be between 0 and 100.")
        return value

    def validate_cancellation_admin_fee_percentage(self, value):
        """Validate cancellation admin fee percentage is between 0 and 100"""
        if value is not None and not (0 <= value <= 100):
            raise serializers.ValidationError("Cancellation admin fee percentage must be between 0 and 100.")
        return value


class ConfirmationStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfirmationStepConfiguration
        fields = [
            "id",
            "step",
            "title",
            "message",
            "show_booking_summary",
            "show_next_steps",
            "next_steps_content",
            "send_confirmation_email",
            "send_calendar_invite",
            "create_event_immediately",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "step", "created_at", "updated_at"]
