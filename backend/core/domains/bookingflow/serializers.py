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
import logging

logger = logging.getLogger(__name__)

from .models import (
    AddonSelectionStepConfiguration,
    BookingFlow,
    BookingFlowAnalytics,
    BookingFlowStep,
    BookingSession,
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


# Step Configuration Serializers
class IntroductionStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntroductionStepConfiguration
        fields = [
            'id', 'step', 'title', 'content', 'show_event_details',
            'show_pricing_overview', 'custom_css', 'background_image',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'step', 'created_at', 'updated_at']


class VenueSelectionStepConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for venue selection step configuration"""
    available_venues_details = serializers.SerializerMethodField()

    class Meta:
        model = VenueSelectionStepConfiguration
        fields = [
            'id', 'step', 'min_venues', 'max_venues',
            'show_pricing', 'show_included_hours', 'show_bundle_discount',
            'bundle_discount_percent', 'title', 'description',
            'show_package_recommendations', 'show_view_packages_option',
            'view_packages_button_text',
            'available_venues_details',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'step', 'created_at', 'updated_at']

    def get_available_venues_details(self, obj):
        """Get detailed venue information for available venues"""
        from core.domains.venues.serializers import (
            RentableVenueSerializer,
            RentableVenueWithEventTypeSerializer,
        )
        venues = obj.get_available_venues_queryset()

        # Get event_type_id from the booking flow for event-type-specific pricing
        event_type_id = None
        if obj.step and obj.step.booking_flow and obj.step.booking_flow.event_type:
            event_type_id = obj.step.booking_flow.event_type_id

        # Build context with request (for absolute URLs) and event_type_id (for pricing)
        context = {**self.context, 'event_type_id': event_type_id}

        # Use event-type-aware serializer if we have an event type
        if event_type_id:
            return RentableVenueWithEventTypeSerializer(venues, many=True, context=context).data
        return RentableVenueSerializer(venues, many=True, context=context).data


class DateTimeStepConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for DateTime step configuration."""
    class Meta:
        model = DateTimeStepConfiguration
        fields = [
            'id', 'step', 'allow_multi_day', 'min_event_days', 'max_event_days',
            'show_calendar_view', 'enable_real_time_availability',
            'show_availability_status', 'auto_check_conflicts',
            'blocked_dates', 'available_days_of_week', 'available_time_slots',
            'buffer_before_hours', 'buffer_after_hours',
            'check_venue_availability', 'check_resource_availability',
            'check_staff_availability', 'availability_display_mode',
            'allow_overbooking', 'overbooking_threshold',
            'sync_with_calendar', 'calendar_source',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'step', 'created_at', 'updated_at']


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
        read_only_fields = ['id', 'step', 'created_at', 'updated_at', 'questionnaire_items']


class PackageSelectionStepConfigurationSerializer(serializers.ModelSerializer):
    # Use SerializerMethodField for ID arrays to avoid ManyRelatedManager issues
    available_categories = serializers.SerializerMethodField()
    available_packages = serializers.SerializerMethodField()
    
    # Keep the detailed serializers
    available_categories_details = ProductCategorySerializer(
        source='available_categories', many=True, read_only=True
    )
    available_packages_details = ProductOptionSerializer(
        source='available_packages', many=True, read_only=True
    )

    class Meta:
        model = PackageSelectionStepConfiguration
        fields = [
            'id', 'step', 
            'available_categories',  # ID array
            'available_packages',    # ID array
            'available_categories_details',
            'available_packages_details', 
            'selection_type',
            'min_selection', 'max_selection', 'show_pricing', 'show_descriptions',
            'show_images', 'enable_comparison', 'filter_by_event_type',
            'enable_dynamic_pricing', 'pricing_factors', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'step', 'created_at', 'updated_at']

    def get_available_categories(self, obj):
        """Get list of category IDs - uses model's safe method"""
        try:
            if obj and hasattr(obj, 'get_safe_available_categories'):
                return obj.get_safe_available_categories()
            return []
        except Exception as e:
            logger.warning(f"Error serializing available_categories for step {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}")
            return []
    
    def get_available_packages(self, obj):
        """Get list of package IDs - uses model's safe method"""
        try:
            if obj and hasattr(obj, 'get_safe_available_packages'):
                return obj.get_safe_available_packages()
            return []
        except Exception as e:
            logger.warning(f"Error serializing available_packages for step {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}")
            return []


class AddonSelectionStepConfigurationSerializer(serializers.ModelSerializer):
    # Use SerializerMethodField for ID arrays to avoid ManyRelatedManager issues
    available_categories = serializers.SerializerMethodField()
    available_addons = serializers.SerializerMethodField()
    
    # Keep the detailed serializers
    available_categories_details = ProductCategorySerializer(
        source='available_categories', many=True, read_only=True
    )
    available_addons_details = ProductOptionSerializer(
        source='available_addons', many=True, read_only=True
    )

    class Meta:
        model = AddonSelectionStepConfiguration
        fields = [
            'id', 'step',
            'available_categories',  # ID array
            'available_addons',      # ID array
            'available_categories_details',
            'available_addons_details', 
            'min_selection',
            'max_selection', 'group_by_category', 'show_recommendations',
            'recommendation_logic', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'step', 'created_at', 'updated_at']

    def get_available_categories(self, obj):
        """Get list of category IDs - uses model's safe method"""
        try:
            if obj and hasattr(obj, 'get_safe_available_categories'):
                return obj.get_safe_available_categories()
            return []
        except Exception as e:
            logger.warning(f"Error serializing available_categories for addon step {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}")
            return []
    
    def get_available_addons(self, obj):
        """Get list of addon IDs - uses model's safe method"""
        try:
            if obj and hasattr(obj, 'get_safe_available_addons'):
                return obj.get_safe_available_addons()
            return []
        except Exception as e:
            logger.warning(f"Error serializing available_addons for addon step {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}")
            return []

class PricingSummaryStepConfigurationSerializer(serializers.ModelSerializer):
    effective_terms_url = serializers.SerializerMethodField()
    effective_privacy_url = serializers.SerializerMethodField()

    class Meta:
        model = PricingSummaryStepConfiguration
        fields = [
            'id', 'step', 'show_package_breakdown', 'show_addon_breakdown',
            'show_tax_breakdown', 'show_discount_field', 'show_subtotal',
            'allow_discount_codes', 'calculate_tax', 'header_text',
            'footer_text', 'discount_help_text',
            # Terms and Legal Configuration
            'show_terms_checkbox', 'show_marketing_consent',
            'require_terms_acceptance', 'terms_text',
            'terms_url', 'privacy_url',
            'effective_terms_url', 'effective_privacy_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'step', 'effective_terms_url', 'effective_privacy_url', 'created_at', 'updated_at']

    def get_effective_terms_url(self, obj):
        """Return custom URL or fall back to global default"""
        if obj.terms_url:
            return obj.terms_url
        return '/terms'

    def get_effective_privacy_url(self, obj):
        """Return custom URL or fall back to global default"""
        if obj.privacy_url:
            return obj.privacy_url
        return '/privacy'


class ContactInfoStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInfoStepConfiguration
        fields = [
            'id', 'step', 'require_full_name', 'require_email', 'require_phone',
            'require_address', 'require_company', 'custom_fields',
            'offer_account_creation', 'require_account_creation',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'step', 'created_at', 'updated_at']


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
            'id', 'step',
            # UI/UX flags ONLY
            'accept_full_payment',
            'accept_deposit',
            'allow_quote_request',
            'require_immediate_payment',
            # UI text customization ONLY
            'payment_terms',
            'quote_request_button_text',
            'quote_request_description',
            # Effective payment terms (merged flow + global settings)
            'effective_payment_terms',
            # Timestamps
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'step', 'effective_payment_terms', 'created_at', 'updated_at']

    def get_effective_payment_terms(self, obj):
        """
        Get effective payment terms for this step.
        Uses PaymentTermsResolver to merge flow-specific overrides with global defaults.
        """
        from core.domains.payments.services.payment_terms_resolver import PaymentTermsResolver
        import logging
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
            'id', 'step',
            # Deposit configuration overrides
            'deposit_type',
            'deposit_percentage',
            'deposit_fixed_amount',
            'deposit_is_refundable',
            'deposit_is_deductible',
            'deposit_waived_on_full_payment',
            # Late fee configuration overrides
            'late_fee_type',
            'late_fee_amount',
            'late_fee_percentage',
            # Security deposit configuration overrides
            'security_deposit_enabled',
            'security_deposit_amount',
            'security_deposit_is_refundable',
            'security_deposit_description',
            # Cancellation configuration overrides
            'cancellation_admin_fee_percentage',
            # Payment schedule configuration overrides
            'downpayment_percentage',
            'downpayment_due_days',
            'balance_due_days',
            'balance_due_type',
            # Date blocking policy overrides
            'date_blocking_policy',
            'downpayment_due_reference',
            'downpayment_deadline_days',
            # Child/youth pricing overrides
            'child_pricing_enabled',
            'child_pricing_tiers',
            # Computed field
            'effective_settings',
            # Timestamps
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'step', 'effective_settings', 'created_at', 'updated_at']

    def get_effective_settings(self, obj):
        """Get the merged settings (flow-specific + global defaults)"""
        return obj.get_effective_settings()

    def validate_deposit_percentage(self, value):
        """Validate deposit percentage is between 0 and 100"""
        if value is not None and not (0 <= value <= 100):
            raise serializers.ValidationError(
                "Deposit percentage must be between 0 and 100."
            )
        return value

    def validate_downpayment_percentage(self, value):
        """Validate downpayment percentage is between 0 and 100"""
        if value is not None and not (0 <= value <= 100):
            raise serializers.ValidationError(
                "Downpayment percentage must be between 0 and 100."
            )
        return value

    def validate_late_fee_percentage(self, value):
        """Validate late fee percentage is between 0 and 100"""
        if value is not None and not (0 <= value <= 100):
            raise serializers.ValidationError(
                "Late fee percentage must be between 0 and 100."
            )
        return value

    def validate_cancellation_admin_fee_percentage(self, value):
        """Validate cancellation admin fee percentage is between 0 and 100"""
        if value is not None and not (0 <= value <= 100):
            raise serializers.ValidationError(
                "Cancellation admin fee percentage must be between 0 and 100."
            )
        return value


class ConfirmationStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfirmationStepConfiguration
        fields = [
            'id', 'step', 'title', 'message', 'show_booking_summary',
            'show_next_steps', 'next_steps_content', 'send_confirmation_email',
            'send_calendar_invite', 'create_event_immediately',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'step', 'created_at', 'updated_at']


# Main Serializers
class BookingFlowStepSerializer(serializers.ModelSerializer):
    step_type_display = serializers.CharField(source='get_step_type_display', read_only=True)
    configuration_data = serializers.SerializerMethodField()

    class Meta:
        model = BookingFlowStep
        fields = [
            'id', 'booking_flow', 'step_type', 'step_type_display',
            'description', 'order', 'is_enabled', 'is_required', 'is_skippable',
            'display_conditions', 'configuration', 'validation_rules',
            'configuration_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_configuration_data(self, obj):
        """Get step-specific configuration data"""
        try:
            if not obj or not obj.step_type:
                return None
                
            config_attr_map = {
                'introduction': 'introduction_config',
                'venue_selection': 'venue_selection_config',
                'date_time': 'datetime_config',
                'questionnaire': 'questionnaire_config',
                'package_selection': 'package_config',
                'addon_selection': 'addon_config',
                'pricing_summary': 'pricing_config',
                'contact_info': 'contact_config',
                'payment_info': 'payment_config',
                'confirmation': 'confirmation_config'
            }

            serializer_map = {
                'introduction': IntroductionStepConfigurationSerializer,
                'venue_selection': VenueSelectionStepConfigurationSerializer,
                'date_time': DateTimeStepConfigurationSerializer,
                'questionnaire': QuestionnaireStepConfigurationSerializer,
                'package_selection': PackageSelectionStepConfigurationSerializer,
                'addon_selection': AddonSelectionStepConfigurationSerializer,
                'pricing_summary': PricingSummaryStepConfigurationSerializer,
                'contact_info': ContactInfoStepConfigurationSerializer,
                'payment_info': PaymentInfoStepConfigurationSerializer,
                'confirmation': ConfirmationStepConfigurationSerializer
            }
            
            config_attr = config_attr_map.get(obj.step_type)
            serializer_class = serializer_map.get(obj.step_type)
            
            if config_attr and serializer_class and hasattr(obj, config_attr):
                config = getattr(obj, config_attr, None)
                if config is not None:
                    return serializer_class(config, context=self.context).data
                    
        except Exception as e:
            logger.warning(f"Error serializing configuration data for step {obj.id if hasattr(obj, 'id') else 'unknown'} of type {getattr(obj, 'step_type', 'unknown')}: {e}")
            
        return None


class BookingFlowSerializer(serializers.ModelSerializer):
    event_type_name = serializers.SerializerMethodField()
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
            'id', 'name', 'description', 'event_type', 'event_type_name', 'event_type_details',
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
        try:
            return obj.steps.count() if obj and hasattr(obj, 'steps') else 0
        except Exception as e:
            logger.warning(f"Error getting total_steps for flow {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}")
            return 0

    def get_enabled_steps_count(self, obj):
        try:
            return obj.enabled_steps.count() if obj and hasattr(obj, 'enabled_steps') else 0
        except Exception as e:
            logger.warning(f"Error getting enabled_steps_count for flow {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}")
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
            if hasattr(obj.event_type, 'name') and obj.event_type.name:
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
        try:
            if not obj or not hasattr(obj, 'booking_flow') or not obj.booking_flow:
                return None
            
            booking_flow = obj.booking_flow
            return {
                'id': booking_flow.id,
                'name': booking_flow.name,
                'event_type_name': booking_flow.event_type.name if booking_flow.event_type else None,
                'total_steps': booking_flow.calculate_total_steps() if hasattr(booking_flow, 'calculate_total_steps') else 0
            }
        except Exception as e:
            logger.warning(f"Error getting booking_flow_details for session {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}")
            return None

    def get_total_price(self, obj):
        try:
            if not obj or not hasattr(obj, 'calculate_total_price'):
                return "0.00"
            return str(obj.calculate_total_price())
        except Exception as e:
            logger.warning(f"Error getting total_price for session {obj.id if hasattr(obj, 'id') else 'unknown'}: {e}")
            return "0.00"


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


# Public API serializers (for client-facing endpoints)
class PublicBookingFlowSerializer(serializers.ModelSerializer):
    """Serializer for public booking flow data (used by clients)"""
    event_type_name = serializers.CharField(source='event_type.name', read_only=True)
    enabled_steps = BookingFlowStepSerializer(many=True, read_only=True)
    total_steps = serializers.SerializerMethodField()
    # Include event_type ID for filtering packages/venues by event type
    event_type = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = BookingFlow
        fields = [
            'id', 'name', 'description', 'event_type', 'event_type_name',
            'allow_guest_booking', 'require_account_creation',
            'enable_progress_saving', 'max_advance_booking_days',
            'min_advance_booking_days', 'enabled_steps', 'total_steps'
        ]

    def get_total_steps(self, obj):
        return obj.calculate_total_steps()


# FIXED: Simplified create/update serializers for better CRUD
class BookingFlowCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating booking flows"""
    
    class Meta:
        model = BookingFlow
        fields = [
            'name', 'description', 'event_type', 'workflow_template',
            'confirmation_email_template', 'reminder_email_template',
            'is_active', 'allow_guest_booking', 'require_account_creation',
            'auto_approve_bookings', 'enable_progress_saving',
            'max_advance_booking_days', 'min_advance_booking_days',
            'allow_discounts', 'available_discounts', 'redirect_url',
            'success_message', 'conversion_tracking_code'
        ]

    def validate_event_type(self, value):
        """Convert empty string to None for 'Any Event Type'"""
        if value == '' or value == 'null':
            return None
        return value

    def validate(self, data):
        """Validate booking flow data"""
        # Ensure min advance booking is less than max
        min_days = data.get('min_advance_booking_days', 1)
        max_days = data.get('max_advance_booking_days', 365)
        
        if min_days >= max_days:
            raise serializers.ValidationError({
                'max_advance_booking_days': 'Maximum days must be greater than minimum days'
            })
        
        # Check for active booking flows with same event type
        event_type = data.get('event_type')
        is_active = data.get('is_active', True)
        
        if is_active:
            # Check for existing active flows with same event type
            existing_flows = BookingFlow.objects.filter(
                event_type=event_type,
                is_active=True
            )
            
            if existing_flows.exists():
                if event_type:
                    # Get event type name for better error message
                    try:
                        from core.domains.events.models import EventType
                        event_type_obj = EventType.objects.get(id=event_type)
                        event_type_name = event_type_obj.name
                    except EventType.DoesNotExist:
                        event_type_name = f"Event Type ID {event_type}"
                    
                    raise serializers.ValidationError({
                        'event_type': f'An active booking flow already exists for {event_type_name}. '
                                    'Only one active flow per event type is allowed.'
                    })
                else:
                    raise serializers.ValidationError({
                        'event_type': 'An active booking flow already exists for "Any Event Type". '
                                    'Only one active flow for "Any Event Type" is allowed.'
                    })
        
        return data

    def create(self, validated_data):
        """Create booking flow with proper many-to-many handling"""
        # Extract many-to-many fields
        available_discounts = validated_data.pop('available_discounts', [])
        
        # Create the booking flow
        booking_flow = BookingFlow.objects.create(**validated_data)
        
        # Set many-to-many relationships
        if available_discounts:
            booking_flow.available_discounts.set(available_discounts)
        
        return booking_flow


class BookingFlowUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating booking flows"""
    
    class Meta:
        model = BookingFlow
        fields = [
            'name', 'description', 'event_type', 'workflow_template',
            'confirmation_email_template', 'reminder_email_template',
            'is_active', 'allow_guest_booking', 'require_account_creation',
            'auto_approve_bookings', 'enable_progress_saving',
            'max_advance_booking_days', 'min_advance_booking_days',
            'allow_discounts', 'available_discounts', 'redirect_url',
            'success_message', 'conversion_tracking_code'
        ]

    def validate_event_type(self, value):
        """Convert empty string to None for 'Any Event Type'"""
        if value == '' or value == 'null':
            return None
        return value

    def validate(self, data):
        """Validate booking flow update data"""
        # Get current instance for validation
        instance = getattr(self, 'instance', None)
        
        if instance:
            # Merge current data with update data for validation
            current_data = {
                'min_advance_booking_days': instance.min_advance_booking_days,
                'max_advance_booking_days': instance.max_advance_booking_days,
                'event_type': instance.event_type_id,
                'is_active': instance.is_active,
            }
            current_data.update(data)
            
            min_days = current_data.get('min_advance_booking_days', 1)
            max_days = current_data.get('max_advance_booking_days', 365)
            
            if min_days >= max_days:
                raise serializers.ValidationError({
                    'max_advance_booking_days': 'Maximum days must be greater than minimum days'
                })
            
            # Check for active booking flows with same event type
            event_type = current_data.get('event_type')
            is_active = current_data.get('is_active', True)
            
            if is_active:
                # Check for existing active flows with same event type (excluding current instance)
                existing_flows = BookingFlow.objects.filter(
                    event_type=event_type,
                    is_active=True
                ).exclude(pk=instance.pk)
                
                if existing_flows.exists():
                    if event_type:
                        # Get event type name for better error message
                        try:
                            from core.domains.events.models import EventType
                            event_type_obj = EventType.objects.get(id=event_type)
                            event_type_name = event_type_obj.name
                        except EventType.DoesNotExist:
                            event_type_name = f"Event Type ID {event_type}"
                        
                        raise serializers.ValidationError({
                            'event_type': f'An active booking flow already exists for {event_type_name}. '
                                        'Only one active flow per event type is allowed.'
                        })
                    else:
                        raise serializers.ValidationError({
                            'event_type': 'An active booking flow already exists for "Any Event Type". '
                                        'Only one active flow for "Any Event Type" is allowed.'
                        })
        
        return data

    def update(self, instance, validated_data):
        """Update booking flow with proper many-to-many handling"""
        # Extract many-to-many fields
        available_discounts = validated_data.pop('available_discounts', None)
        
        # Update regular fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update many-to-many relationships if provided
        if available_discounts is not None:
            instance.available_discounts.set(available_discounts)
        
        return instance


class BookingFlowStepCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating booking flow steps"""
    
    class Meta:
        model = BookingFlowStep
        fields = [
            'booking_flow', 'step_type', 'description', 'order',
            'is_enabled', 'is_required', 'is_skippable', 'display_conditions',
            'configuration', 'validation_rules'
        ]

        extra_kwargs = {
                'order': {'required': False, 'allow_null': True}
            }

    def validate_step_type(self, value):
        """Validate that availability_check step type is not being created"""
        if value == 'availability_check':
            raise serializers.ValidationError(
                "Availability check step type is no longer supported. "
                "Use date_time step with availability checking enabled instead."
            )
        return value

    def validate(self, data):
        """Validate step data"""
        booking_flow = data.get('booking_flow')
        step_type = data.get('step_type')
        
        # Check for duplicate step type in the same flow
        if booking_flow and step_type:
            existing_step = BookingFlowStep.objects.filter(
                booking_flow=booking_flow,
                step_type=step_type
            ).first()
            
            if existing_step:
                raise serializers.ValidationError({
                    'step_type': f'A step with type "{step_type}" already exists in this booking flow'
                })
        
        return data


class BookingFlowStepUpdateSerializer(serializers.ModelSerializer):
    """Simplified serializer for updating booking flow steps"""
    
    class Meta:
        model = BookingFlowStep
        fields = [
            'step_type', 'description', 'order',
            'is_enabled', 'is_required', 'is_skippable', 'display_conditions',
            'configuration', 'validation_rules'
        ]

    def validate_step_type(self, value):
        """Validate that availability_check step type is not being set"""
        if value == 'availability_check':
            raise serializers.ValidationError(
                "Availability check step type is no longer supported. "
                "Use date_time step with availability checking enabled instead."
            )
        return value

    def validate(self, data):
        """Validate step update data"""
        instance = getattr(self, 'instance', None)
        step_type = data.get('step_type')
        
        # Check for duplicate step type if changing
        if instance and step_type and step_type != instance.step_type:
            existing_step = BookingFlowStep.objects.filter(
                booking_flow=instance.booking_flow,
                step_type=step_type
            ).exclude(id=instance.id).first()
            
            if existing_step:
                raise serializers.ValidationError({
                    'step_type': f'A step with type "{step_type}" already exists in this booking flow'
                })
        
        return data


# Session management serializers
class BookingSessionCreateSerializer(serializers.Serializer):
    """Serializer for creating a new booking session"""
    booking_flow = serializers.IntegerField()
    ip_address = serializers.IPAddressField(required=False)
    user_agent = serializers.CharField(required=False, allow_blank=True)
    referrer_url = serializers.URLField(required=False, allow_blank=True)


class BookingSessionUpdateSerializer(serializers.Serializer):
    """Serializer for updating booking session data"""
    session_id = serializers.UUIDField()
    step_id = serializers.IntegerField()
    step_data = serializers.DictField()
    mark_completed = serializers.BooleanField(default=False)


# Reorder serializers
class ReorderStepsSerializer(serializers.Serializer):
    """Serializer for reordering steps"""
    flow_id = serializers.IntegerField()
    order_mapping = serializers.DictField(
        child=serializers.IntegerField(),
        help_text="Mapping of step IDs to their new order positions"
    )


class DuplicateFlowSerializer(serializers.Serializer):
    """Serializer for duplicating a booking flow"""
    name = serializers.CharField(max_length=255)
    copy_steps = serializers.BooleanField(default=True)
    copy_configuration = serializers.BooleanField(default=True)

    def validate_name(self, value):
        """Ensure the new name is unique"""
        if BookingFlow.objects.filter(name=value).exists():
            raise serializers.ValidationError(
                "A booking flow with this name already exists."
            )
        return value