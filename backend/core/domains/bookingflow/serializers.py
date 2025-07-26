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
    IntroductionStepConfiguration,
    PackageSelectionStepConfiguration,
    PaymentInfoStepConfiguration,
    PricingSummaryStepConfiguration,
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
        read_only_fields = ['id', 'step', 'created_at', 'updated_at']


class DateTimeStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DateTimeStepConfiguration
        fields = [
            'id', 'step', 'allow_time_selection', 'allow_multi_day',
            'show_calendar_view', 'min_duration_hours', 'max_duration_hours',
            'default_duration_hours', 'enable_real_time_availability',
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
        read_only_fields = ['id', 'step', 'created_at', 'updated_at']


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
        read_only_fields = ['id', 'step', 'created_at', 'updated_at']

class PricingSummaryStepConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingSummaryStepConfiguration
        fields = [
            'id', 'step', 'show_package_breakdown', 'show_addon_breakdown',
            'show_tax_breakdown', 'show_discount_field', 'show_subtotal',
            'allow_discount_codes', 'calculate_tax', 'header_text',
            'footer_text', 'discount_help_text', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'step', 'created_at', 'updated_at']


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
    class Meta:
        model = PaymentInfoStepConfiguration
        fields = [
            'id', 'step', 'accept_full_payment', 'accept_deposit',
            'deposit_type', 'deposit_amount', 'available_payment_methods',
            'require_immediate_payment', 'allow_payment_plans',
            'payment_terms', 
            'allowed_gateways',
            'default_gateway',   
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'step', 'created_at', 'updated_at']


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
            elif obj.step_type == 'date_time' and hasattr(obj, 'datetime_config'):
                return DateTimeStepConfigurationSerializer(obj.datetime_config).data
            elif obj.step_type == 'questionnaire' and hasattr(obj, 'questionnaire_config'):
                return QuestionnaireStepConfigurationSerializer(obj.questionnaire_config).data
            elif obj.step_type == 'package_selection' and hasattr(obj, 'package_config'):
                return PackageSelectionStepConfigurationSerializer(obj.package_config).data
            elif obj.step_type == 'addon_selection' and hasattr(obj, 'addon_config'):
                return AddonSelectionStepConfigurationSerializer(obj.addon_config).data
            elif obj.step_type == 'pricing_summary' and hasattr(obj, 'pricing_config'):
                return PricingSummaryStepConfigurationSerializer(obj.pricing_config).data
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
            'event_type_name': obj.booking_flow.event_type.name if obj.booking_flow.event_type else None,
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
            'booking_flow', 'step_type', 'name', 'description', 'order',
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
            'step_type', 'name', 'description', 'order',
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