# backend/core/domains/bookingflow/serializers.py
from core.domains.communications.serializers import CommunicationTemplateSerializer
from core.domains.events.basic_serializers import EventTypeSerializer
from core.domains.products.serializers import (
    DiscountSerializer,
    ProductCategorySerializer,
    ProductOptionSerializer,
)
from core.domains.questionnaires.basic_serializers import QuestionnaireBasicSerializer
from core.domains.workflows.basic_serializers import WorkflowTemplateSerializer
from rest_framework import serializers

from .models import (
    AddonSelectionStepConfiguration,
    BookingFlow,
    BookingFlowAnalytics,
    BookingFlowStep,
    BookingSession,
    ConfirmationStepConfiguration,
    ContactInfoStepConfiguration,
    DateTimeStepConfiguration,
    EventDetailsStepConfiguration,
    IntroductionStepConfiguration,
    PackageSelectionStepConfiguration,
    PaymentInfoStepConfiguration,
    QuestionnaireStepConfiguration,
    QuestionnaireStepItem,
)


# Step Configuration Serializers
class IntroductionStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntroductionStepConfiguration
        fields = [
            'id', 'step', 'title', 'content', 'show_event_details',
            'show_pricing_overview', 'custom_css', 'background_image',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EventDetailsStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventDetailsStepConfiguration
        fields = [
            'id', 'step', 'show_event_type_selection', 'require_event_name',
            'require_description', 'require_guest_count', 'max_guest_count',
            'require_venue_preference', 'venue_options', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DateTimeStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DateTimeStepConfiguration
        fields = [
            'id', 'step', 'allow_time_selection', 'allow_multi_day',
            'show_calendar_view', 'min_duration_hours', 'max_duration_hours',
            'default_duration_hours', 'enable_real_time_availability',
            'blocked_dates', 'available_days_of_week', 'available_time_slots',
            'buffer_before_hours', 'buffer_after_hours', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuestionnaireStepItemSerializer(serializers.ModelSerializer):
    questionnaire_details = QuestionnaireBasicSerializer(source='questionnaire', read_only=True)

    class Meta:
        model = QuestionnaireStepItem
        fields = [
            'id', 'configuration', 'questionnaire', 'questionnaire_details',
            'order', 'is_conditional', 'show_conditions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuestionnaireStepConfigurationSerializer(serializers.ModelSerializer):
    questionnaire_items = QuestionnaireStepItemSerializer(many=True, read_only=True)

    class Meta:
        model = QuestionnaireStepConfiguration
        fields = [
            'id', 'step', 'allow_file_uploads', 'max_file_size_mb',
            'allowed_file_types', 'questionnaire_items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'questionnaire_items']


class PackageSelectionStepConfigurationSerializer(serializers.ModelSerializer):
    available_categories_details = ProductCategorySerializer(
        source='available_categories', many=True, read_only=True
    )
    available_packages_details = ProductOptionSerializer(
        source='available_packages', many=True, read_only=True
    )

    class Meta:
        model = PackageSelectionStepConfiguration
        fields = [
            'id', 'step', 'available_categories', 'available_categories_details',
            'available_packages', 'available_packages_details', 'selection_type',
            'min_selection', 'max_selection', 'show_pricing', 'show_descriptions',
            'show_images', 'enable_comparison', 'enable_dynamic_pricing',
            'pricing_factors', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AddonSelectionStepConfigurationSerializer(serializers.ModelSerializer):
    available_categories_details = ProductCategorySerializer(
        source='available_categories', many=True, read_only=True
    )
    available_addons_details = ProductOptionSerializer(
        source='available_addons', many=True, read_only=True
    )

    class Meta:
        model = AddonSelectionStepConfiguration
        fields = [
            'id', 'step', 'available_categories', 'available_categories_details',
            'available_addons', 'available_addons_details', 'min_selection',
            'max_selection', 'group_by_category', 'show_recommendations',
            'recommendation_logic', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ContactInfoStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInfoStepConfiguration
        fields = [
            'id', 'step', 'require_full_name', 'require_email', 'require_phone',
            'require_address', 'require_company', 'custom_fields',
            'offer_account_creation', 'require_account_creation',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentInfoStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentInfoStepConfiguration
        fields = [
            'id', 'step', 'accept_full_payment', 'accept_deposit',
            'deposit_type', 'deposit_amount', 'available_payment_methods',
            'require_immediate_payment', 'allow_payment_plans',
            'payment_terms', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ConfirmationStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfirmationStepConfiguration
        fields = [
            'id', 'step', 'title', 'message', 'show_booking_summary',
            'show_next_steps', 'next_steps_content', 'send_confirmation_email',
            'send_calendar_invite', 'create_event_immediately',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# Main Serializers
class BookingFlowStepSerializer(serializers.ModelSerializer):
    step_type_display = serializers.CharField(source='get_step_type_display', read_only=True)
    configuration_data = serializers.SerializerMethodField()

    class Meta:
        model = BookingFlowStep
        fields = [
            'id', 'booking_flow', 'step_type', 'step_type_display', 'name',
            'description', 'order', 'is_enabled', 'is_required', 'is_skippable',
            'display_conditions', 'configuration', 'validation_rules',
            'configuration_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_configuration_data(self, obj):
        """Get step-specific configuration data"""
        try:
            if obj.step_type == 'introduction' and hasattr(obj, 'introduction_config'):
                return IntroductionStepConfigurationSerializer(obj.introduction_config).data
            elif obj.step_type == 'event_details' and hasattr(obj, 'event_details_config'):
                return EventDetailsStepConfigurationSerializer(obj.event_details_config).data
            elif obj.step_type == 'date_time' and hasattr(obj, 'datetime_config'):
                return DateTimeStepConfigurationSerializer(obj.datetime_config).data
            elif obj.step_type == 'questionnaire' and hasattr(obj, 'questionnaire_config'):
                return QuestionnaireStepConfigurationSerializer(obj.questionnaire_config).data
            elif obj.step_type == 'package_selection' and hasattr(obj, 'package_config'):
                return PackageSelectionStepConfigurationSerializer(obj.package_config).data
            elif obj.step_type == 'addon_selection' and hasattr(obj, 'addon_config'):
                return AddonSelectionStepConfigurationSerializer(obj.addon_config).data
            elif obj.step_type == 'contact_info' and hasattr(obj, 'contact_config'):
                return ContactInfoStepConfigurationSerializer(obj.contact_config).data
            elif obj.step_type == 'payment_info' and hasattr(obj, 'payment_config'):
                return PaymentInfoStepConfigurationSerializer(obj.payment_config).data
            elif obj.step_type == 'confirmation' and hasattr(obj, 'confirmation_config'):
                return ConfirmationStepConfigurationSerializer(obj.confirmation_config).data
        except AttributeError:
            pass
        return None


class BookingFlowSerializer(serializers.ModelSerializer):
    event_type_details = EventTypeSerializer(source='event_type', read_only=True)
    workflow_template_details = WorkflowTemplateSerializer(source='workflow_template', read_only=True)
    confirmation_email_template_details = CommunicationTemplateSerializer(
        source='confirmation_email_template', read_only=True
    )
    reminder_email_template_details = CommunicationTemplateSerializer(
        source='reminder_email_template', read_only=True
    )
    available_discounts_details = DiscountSerializer(source='available_discounts', many=True, read_only=True)
    total_steps = serializers.SerializerMethodField()
    enabled_steps_count = serializers.SerializerMethodField()

    class Meta:
        model = BookingFlow
        fields = [
            'id', 'name', 'description', 'event_type', 'event_type_details',
            'workflow_template', 'workflow_template_details',
            'confirmation_email_template', 'confirmation_email_template_details',
            'reminder_email_template', 'reminder_email_template_details',
            'is_active', 'allow_guest_booking', 'require_account_creation',
            'auto_approve_bookings', 'enable_progress_saving',
            'max_advance_booking_days', 'min_advance_booking_days',
            'allow_discounts', 'available_discounts', 'available_discounts_details',
            'redirect_url', 'success_message', 'is_test_mode',
            'conversion_tracking_code', 'total_steps', 'enabled_steps_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_steps(self, obj):
        return obj.steps.count()

    def get_enabled_steps_count(self, obj):
        return obj.enabled_steps.count()


class BookingFlowDetailSerializer(BookingFlowSerializer):
    steps = BookingFlowStepSerializer(many=True, read_only=True)

    class Meta(BookingFlowSerializer.Meta):
        fields = BookingFlowSerializer.Meta.fields + ['steps']


class BookingSessionSerializer(serializers.ModelSerializer):
    booking_flow_details = serializers.SerializerMethodField()
    current_step_details = BookingFlowStepSerializer(source='current_step', read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)
    total_price = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = BookingSession
        fields = [
            'id', 'session_id', 'booking_flow', 'booking_flow_details',
            'client', 'current_step', 'current_step_details', 'booking_data',
            'validation_errors', 'is_completed', 'is_abandoned',
            'completed_at', 'expires_at', 'progress_percentage', 'total_price',
            'is_expired', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'session_id', 'is_expired', 'progress_percentage',
            'created_at', 'updated_at'
        ]

    def get_booking_flow_details(self, obj):
        return {
            'id': obj.booking_flow.id,
            'name': obj.booking_flow.name,
            'event_type_name': obj.booking_flow.event_type.name,
            'total_steps': obj.booking_flow.calculate_total_steps()
        }

    def get_total_price(self, obj):
        return str(obj.calculate_total_price())


class BookingFlowAnalyticsSerializer(serializers.ModelSerializer):
    booking_flow_name = serializers.CharField(source='booking_flow.name', read_only=True)

    class Meta:
        model = BookingFlowAnalytics
        fields = [
            'id', 'booking_flow', 'booking_flow_name', 'date', 'total_sessions',
            'completed_bookings', 'abandoned_sessions', 'conversion_rate',
            'step_completion_data', 'step_drop_off_data', 'total_revenue',
            'average_booking_value', 'average_completion_time', 'bounce_rate',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# Specialized serializers for creating/updating with nested data
class BookingFlowCreateUpdateSerializer(serializers.ModelSerializer):
    steps = BookingFlowStepSerializer(many=True, required=False)

    class Meta:
        model = BookingFlow
        fields = [
            'id', 'name', 'description', 'event_type', 'workflow_template',
            'confirmation_email_template', 'reminder_email_template',
            'is_active', 'allow_guest_booking', 'require_account_creation',
            'auto_approve_bookings', 'enable_progress_saving',
            'max_advance_booking_days', 'min_advance_booking_days',
            'allow_discounts', 'available_discounts', 'redirect_url',
            'success_message', 'is_test_mode', 'conversion_tracking_code',
            'steps', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        steps_data = validated_data.pop('steps', [])
        available_discounts = validated_data.pop('available_discounts', [])
        
        booking_flow = BookingFlow.objects.create(**validated_data)
        
        # Set available discounts
        if available_discounts:
            booking_flow.available_discounts.set(available_discounts)
        
        # Create steps
        for step_data in steps_data:
            BookingFlowStep.objects.create(booking_flow=booking_flow, **step_data)
        
        return booking_flow

    def update(self, instance, validated_data):
        steps_data = validated_data.pop('steps', None)
        available_discounts = validated_data.pop('available_discounts', None)
        
        # Update main fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update available discounts
        if available_discounts is not None:
            instance.available_discounts.set(available_discounts)
        
        # Update steps if provided
        if steps_data is not None:
            # Delete existing steps and create new ones
            instance.steps.all().delete()
            for step_data in steps_data:
                BookingFlowStep.objects.create(booking_flow=instance, **step_data)
        
        return instance


# Public API serializers (for client-facing endpoints)
class PublicBookingFlowSerializer(serializers.ModelSerializer):
    """Serializer for public booking flow data (used by clients)"""
    event_type_name = serializers.CharField(source='event_type.name', read_only=True)
    enabled_steps = BookingFlowStepSerializer(many=True, read_only=True)
    total_steps = serializers.SerializerMethodField()

    class Meta:
        model = BookingFlow
        fields = [
            'id', 'name', 'description', 'event_type_name',
            'allow_guest_booking', 'require_account_creation',
            'enable_progress_saving', 'max_advance_booking_days',
            'min_advance_booking_days', 'enabled_steps', 'total_steps'
        ]

    def get_total_steps(self, obj):
        return obj.calculate_total_steps()


class BookingSessionCreateSerializer(serializers.Serializer):
    """Serializer for creating a new booking session"""
    booking_flow_id = serializers.IntegerField()
    client_ip = serializers.IPAddressField(required=False)
    user_agent = serializers.CharField(required=False, allow_blank=True)
    referrer_url = serializers.URLField(required=False, allow_blank=True)


class BookingSessionUpdateSerializer(serializers.Serializer):
    """Serializer for updating booking session data"""
    step_id = serializers.IntegerField()
    step_data = serializers.DictField()
    mark_completed = serializers.BooleanField(default=False)


class BookingCompletionSerializer(serializers.Serializer):
    """Serializer for completing a booking"""
    session_id = serializers.UUIDField()
    final_data = serializers.DictField(required=False)
    create_event = serializers.BooleanField(default=True)
    send_confirmation = serializers.BooleanField(default=True)