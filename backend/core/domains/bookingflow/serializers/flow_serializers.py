import logging

from rest_framework import serializers

from core.domains.communications.serializers import CommunicationTemplateSerializer
from core.domains.events.basic_serializers import EventTypeSerializer
from core.domains.products.serializers import DiscountSerializer
from core.domains.workflows.basic_serializers import WorkflowTemplateSerializer

from ..models import (
    BookingFlow,
    BookingFlowAnalytics,
    BookingFlowStep,
    BookingSession,
)
from .step_config_serializers import (
    AddonSelectionStepConfigurationSerializer,
    ConfirmationStepConfigurationSerializer,
    ContactInfoStepConfigurationSerializer,
    DateTimeStepConfigurationSerializer,
    IntroductionStepConfigurationSerializer,
    PackageSelectionStepConfigurationSerializer,
    PaymentInfoStepConfigurationSerializer,
    PricingSummaryStepConfigurationSerializer,
    QuestionnaireStepConfigurationSerializer,
    VenueSelectionStepConfigurationSerializer,
)

logger = logging.getLogger(__name__)


class BookingFlowStepSerializer(serializers.ModelSerializer):
    step_type_display = serializers.CharField(source="get_step_type_display", read_only=True)
    configuration_data = serializers.SerializerMethodField()

    class Meta:
        model = BookingFlowStep
        fields = [
            "id",
            "booking_flow",
            "step_type",
            "step_type_display",
            "description",
            "order",
            "is_enabled",
            "is_required",
            "is_skippable",
            "display_conditions",
            "configuration",
            "validation_rules",
            "configuration_data",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_configuration_data(self, obj):
        """Get step-specific configuration data"""
        try:
            if not obj or not obj.step_type:
                return None

            config_attr_map = {
                "introduction": "introduction_config",
                "venue_selection": "venue_selection_config",
                "date_time": "datetime_config",
                "questionnaire": "questionnaire_config",
                "package_selection": "package_config",
                "addon_selection": "addon_config",
                "pricing_summary": "pricing_config",
                "contact_info": "contact_config",
                "payment_info": "payment_config",
                "confirmation": "confirmation_config",
            }

            serializer_map = {
                "introduction": IntroductionStepConfigurationSerializer,
                "venue_selection": VenueSelectionStepConfigurationSerializer,
                "date_time": DateTimeStepConfigurationSerializer,
                "questionnaire": QuestionnaireStepConfigurationSerializer,
                "package_selection": PackageSelectionStepConfigurationSerializer,
                "addon_selection": AddonSelectionStepConfigurationSerializer,
                "pricing_summary": PricingSummaryStepConfigurationSerializer,
                "contact_info": ContactInfoStepConfigurationSerializer,
                "payment_info": PaymentInfoStepConfigurationSerializer,
                "confirmation": ConfirmationStepConfigurationSerializer,
            }

            config_attr = config_attr_map.get(obj.step_type)
            serializer_class = serializer_map.get(obj.step_type)

            if config_attr and serializer_class and hasattr(obj, config_attr):
                config = getattr(obj, config_attr, None)
                if config is not None:
                    return serializer_class(config, context=self.context).data

        except Exception as e:
            logger.warning(
                f"Error serializing configuration data for step {obj.id if hasattr(obj, 'id') else 'unknown'} of type {getattr(obj, 'step_type', 'unknown')}: {e}"
            )

        return None


class BookingFlowSerializer(serializers.ModelSerializer):
    event_type_name = serializers.SerializerMethodField()
    event_type_details = EventTypeSerializer(source="event_type", read_only=True)
    workflow_template_details = WorkflowTemplateSerializer(source="workflow_template", read_only=True)
    confirmation_email_template_details = CommunicationTemplateSerializer(
        source="confirmation_email_template", read_only=True
    )
    reminder_email_template_details = CommunicationTemplateSerializer(source="reminder_email_template", read_only=True)
    available_discounts_details = DiscountSerializer(source="available_discounts", many=True, read_only=True)
    total_steps = serializers.SerializerMethodField()
    enabled_steps_count = serializers.SerializerMethodField()

    class Meta:
        model = BookingFlow
        fields = [
            "id",
            "name",
            "description",
            "event_type",
            "event_type_name",
            "event_type_details",
            "workflow_template",
            "workflow_template_details",
            "confirmation_email_template",
            "confirmation_email_template_details",
            "reminder_email_template",
            "reminder_email_template_details",
            "is_active",
            "allow_guest_booking",
            "require_account_creation",
            "auto_approve_bookings",
            "enable_progress_saving",
            "max_advance_booking_days",
            "min_advance_booking_days",
            "allow_discounts",
            "available_discounts",
            "available_discounts_details",
            "redirect_url",
            "success_message",
            "is_test_mode",
            "conversion_tracking_code",
            "total_steps",
            "enabled_steps_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_total_steps(self, obj):
        try:
            # Use annotated value if available (from optimized queryset)
            if hasattr(obj, "_total_steps"):
                return obj._total_steps
            return obj.steps.count() if obj and hasattr(obj, "steps") else 0
        except Exception as e:
            logger.warning(f"Error getting total_steps for flow {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}")
            return 0

    def get_enabled_steps_count(self, obj):
        try:
            # Use annotated value if available (from optimized queryset)
            if hasattr(obj, "_enabled_steps_count"):
                return obj._enabled_steps_count
            return obj.enabled_steps.count() if obj and hasattr(obj, "enabled_steps") else 0
        except Exception as e:
            logger.warning(
                f"Error getting enabled_steps_count for flow {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}"
            )
            return 0

    def get_event_type_name(self, obj):
        """Get the event type name, handling various edge cases"""
        try:
            if not obj:
                return None

            # If no event_type is set, return None (frontend will handle as 'All Event Types')
            if not obj.event_type:
                return None

            # Get the event type name
            if hasattr(obj.event_type, "name") and obj.event_type.name:
                return obj.event_type.name.strip()

            # If event type exists but has no name, log warning and return None
            logger.warning(f"BookingFlow {obj.id}: EventType {obj.event_type.id} has no name")
            return None

        except Exception as e:
            logger.warning(f"Error getting event_type_name for flow {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}")
            return None


class BookingFlowDetailSerializer(BookingFlowSerializer):
    steps = BookingFlowStepSerializer(many=True, read_only=True)

    class Meta(BookingFlowSerializer.Meta):
        fields = [*BookingFlowSerializer.Meta.fields, "steps"]


class BookingSessionSerializer(serializers.ModelSerializer):
    booking_flow_details = serializers.SerializerMethodField()
    current_step_details = BookingFlowStepSerializer(source="current_step", read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)
    total_price = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = BookingSession
        fields = [
            "id",
            "session_id",
            "booking_flow",
            "booking_flow_details",
            "client",
            "current_step",
            "current_step_details",
            "booking_data",
            "validation_errors",
            "is_completed",
            "is_abandoned",
            "completed_at",
            "expires_at",
            "progress_percentage",
            "total_price",
            "is_expired",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "session_id", "is_expired", "progress_percentage", "created_at", "updated_at"]

    def get_booking_flow_details(self, obj):
        try:
            if not obj or not hasattr(obj, "booking_flow") or not obj.booking_flow:
                return None

            booking_flow = obj.booking_flow
            return {
                "id": booking_flow.id,
                "name": booking_flow.name,
                "event_type_name": booking_flow.event_type.name if booking_flow.event_type else None,
                "total_steps": booking_flow.calculate_total_steps()
                if hasattr(booking_flow, "calculate_total_steps")
                else 0,
            }
        except Exception as e:
            logger.warning(
                f"Error getting booking_flow_details for session {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}"
            )
            return None

    def get_total_price(self, obj):
        try:
            if not obj or not hasattr(obj, "calculate_total_price"):
                return "0.00"
            return str(obj.calculate_total_price())
        except Exception as e:
            logger.warning(f"Error getting total_price for session {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}")
            return "0.00"


class BookingFlowAnalyticsSerializer(serializers.ModelSerializer):
    booking_flow_name = serializers.CharField(source="booking_flow.name", read_only=True)

    class Meta:
        model = BookingFlowAnalytics
        fields = [
            "id",
            "booking_flow",
            "booking_flow_name",
            "date",
            "total_sessions",
            "completed_bookings",
            "abandoned_sessions",
            "conversion_rate",
            "step_completion_data",
            "step_drop_off_data",
            "total_revenue",
            "average_booking_value",
            "average_completion_time",
            "bounce_rate",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PublicBookingFlowSerializer(serializers.ModelSerializer):
    """Serializer for public booking flow data (used by clients)"""

    event_type_name = serializers.CharField(source="event_type.name", read_only=True)
    enabled_steps = BookingFlowStepSerializer(many=True, read_only=True)
    total_steps = serializers.SerializerMethodField()
    # Include event_type ID for filtering packages/venues by event type
    event_type = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = BookingFlow
        fields = [
            "id",
            "name",
            "description",
            "event_type",
            "event_type_name",
            "allow_guest_booking",
            "require_account_creation",
            "enable_progress_saving",
            "max_advance_booking_days",
            "min_advance_booking_days",
            "enabled_steps",
            "total_steps",
        ]

    def get_total_steps(self, obj):
        return obj.calculate_total_steps()
