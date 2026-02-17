# backend/core/domains/bookingflow/views/booking_step_views.py
from core.utils.permissions import IsAdmin
from django.db import models, transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import BookingFlowStep
from ..serializers import (
    BookingFlowStepCreateSerializer,
    BookingFlowStepSerializer,
    BookingFlowStepUpdateSerializer,
    ReorderStepsSerializer,
    # Configuration serializers
    IntroductionStepConfigurationSerializer,
    VenueSelectionStepConfigurationSerializer,
    DateTimeStepConfigurationSerializer,
    QuestionnaireStepConfigurationSerializer,
    PackageSelectionStepConfigurationSerializer,
    AddonSelectionStepConfigurationSerializer,
    PricingSummaryStepConfigurationSerializer,
    ContactInfoStepConfigurationSerializer,
    PaymentInfoStepConfigurationSerializer,
    ConfirmationStepConfigurationSerializer,
    PaymentTermsConfigurationSerializer,
)
from ..services import (
    BookingFlowStepService,
    BookingFlowStepConfigurationService,
)
from ..exceptions import (
    BookingFlowNotFound,
    BookingFlowStepNotFound,
    InvalidStepConfiguration,
)


class BookingFlowStepViewSet(viewsets.ModelViewSet):
    """
    Enhanced ViewSet for managing booking flow steps with detailed configurations
    Availability check step has been removed and integrated into date_time step
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['step_type']
    ordering_fields = ['order', 'step_type']
    ordering = ['order']

    def get_queryset(self):
        flow_id = self.request.query_params.get('flow_id')
        if flow_id:
            try:
                return BookingFlowStepService.get_steps_for_flow(flow_id)
            except BookingFlowNotFound:
                return BookingFlowStep.objects.none()
        return BookingFlowStep.objects.all().order_by('booking_flow', 'order')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BookingFlowStepCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return BookingFlowStepUpdateSerializer
        elif self.action == 'reorder':
            return ReorderStepsSerializer
        return BookingFlowStepSerializer
    
    def create(self, request, *args, **kwargs):
        # Pre-process data to handle order assignment
        request_data = request.data.copy()
        
        # Get the booking flow ID
        booking_flow_id = request_data.get('booking_flow')
        if not booking_flow_id:
            return Response(
                {"detail": "booking_flow is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate step_type to ensure availability_check is not being created
        step_type = request_data.get('step_type')
        if step_type == 'availability_check':
            return Response(
                {"detail": "Availability check step type is no longer supported. Use date_time step with availability checking enabled instead."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Auto-assign order if not provided or set to null/empty
            if 'order' not in request_data or request_data.get('order') in [None, '', 0]:
                from ..models import BookingFlow
                booking_flow = BookingFlow.objects.get(id=booking_flow_id)
                max_order = BookingFlowStep.objects.filter(
                    booking_flow=booking_flow
                ).aggregate(models.Max('order'))['order__max']
                request_data['order'] = (max_order or 0) + 1
            
        except BookingFlow.DoesNotExist:
            return Response(
                {"detail": "Booking flow not found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create serializer with processed data
        serializer = self.get_serializer(data=request_data)
        serializer.is_valid(raise_exception=True)
        
        try:
            with transaction.atomic():
                # Extract validated data
                validated_data = serializer.validated_data.copy()
                booking_flow = validated_data.pop('booking_flow')
                flow_id = booking_flow.id
                
                # Create the step using the service
                step = BookingFlowStepService.create_step(flow_id, validated_data)
            
            return Response(
                BookingFlowStepSerializer(step, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Prevent updating to availability_check step type
        if 'step_type' in request.data and request.data['step_type'] == 'availability_check':
            return Response(
                {"detail": "Availability check step type is no longer supported. Use date_time step with availability checking enabled instead."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            with transaction.atomic():
                step = BookingFlowStepService.update_step(
                    instance.id,
                    serializer.validated_data
                )
            
            return Response(
                BookingFlowStepSerializer(step, context=self.get_serializer_context()).data
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        try:
            with transaction.atomic():
                BookingFlowStepService.delete_step(instance.id)
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder steps within a booking flow"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        flow_id = serializer.validated_data['flow_id']
        order_mapping = serializer.validated_data['order_mapping']

        try:
            # Service method already handles transaction
            steps = BookingFlowStepService.reorder_steps(flow_id, order_mapping)

            serializer = BookingFlowStepSerializer(steps, many=True, context=self.get_serializer_context())
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def configuration(self, request, pk=None):
        """Get configuration for a step - availability_check removed from mapping"""
        try:
            step = self.get_object()
            
            # Return error if someone tries to access availability_check configuration
            if step.step_type == 'availability_check':
                return Response(
                    {"detail": "Availability check step type is no longer supported. Use date_time step with availability checking enabled instead."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            config = BookingFlowStepConfigurationService.get_step_configuration(pk)
            
            # Updated serializer mapping with pricing_summary and venue_selection added
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
                'confirmation': ConfirmationStepConfigurationSerializer,
            }
            
            if config:
                # Step has a specific configuration model
                serializer_class = serializer_map.get(step.step_type)
                if serializer_class:
                    serializer = serializer_class(config, context=self.get_serializer_context())
                    return Response(serializer.data)
            else:
                # Step type should have a specific configuration but doesn't exist yet
                # This will trigger creation on first update
                return Response({})
            
            return Response({"detail": "Configuration not found"}, status=status.HTTP_404_NOT_FOUND)
        except BookingFlowStepNotFound:
            return Response(
                {"detail": "Step not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['patch'])
    def update_configuration(self, request, pk=None):
        """Update configuration for a step - ENHANCED ERROR HANDLING"""
        try:
            step = self.get_object()
            
            # Block availability_check configuration updates
            if step.step_type == 'availability_check':
                return Response(
                    {"detail": "Availability check step type is no longer supported. Use date_time step with availability checking enabled instead."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                config = BookingFlowStepConfigurationService.update_step_configuration(
                    pk, 
                    request.data
                )
            
            return self.configuration(request, pk)
            
        except (BookingFlowStepNotFound, InvalidStepConfiguration) as e:
            return Response(
                {"detail": str(e)},
                status=e.status_code if hasattr(e, 'status_code') else status.HTTP_400_BAD_REQUEST
            )
        except ValueError as e:
            # Handle specific Django model validation errors
            error_message = str(e)
            
            # Provide more specific error messages for common issues
            if "must be a" in error_message and "instance" in error_message:
                field_name = error_message.split('"')[1] if '"' in error_message else "field"
                return Response(
                    {
                        "detail": f"Invalid value for {field_name}. Please ensure you're providing valid data.",
                        "error_type": "invalid_field_value",
                        "field": field_name
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response(
                {
                    "detail": f"Validation error: {error_message}",
                    "error_type": "validation_error"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "detail": "An unexpected error occurred while updating the configuration. Please try again.",
                    "error": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def migrate_availability_to_datetime(self, request, pk=None):
        """Migrate an availability_check step to date_time with availability features"""
        try:
            step = self.get_object()
            
            if step.step_type != 'availability_check':
                return Response(
                    {"detail": "This migration is only available for availability_check steps"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                config = BookingFlowStepConfigurationService.migrate_availability_check_to_datetime(pk)
            
            # Return updated step data
            updated_step = BookingFlowStep.objects.get(id=pk)
            return Response(
                BookingFlowStepSerializer(updated_step, context=self.get_serializer_context()).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def payment_options(self, request, pk=None):
        """Get available payment options for payment step"""
        try:
            step = self.get_object()
            
            if step.step_type != 'payment_info':
                return Response(
                    {"detail": "This action is only available for payment info steps"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get step configuration
            config = getattr(step, 'payment_config', None)
            if not config:
                return Response(
                    {"detail": "Payment configuration not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get available gateways
            available_gateways = []
            
            if config.allowed_gateways.exists():
                # Use configured gateways for this step
                gateways = config.allowed_gateways.filter(is_active=True)
            elif config.default_gateway:
                # Use step's default gateway
                gateways = [config.default_gateway]
            elif step.booking_flow.allowed_payment_gateways.exists():
                # Use flow's allowed gateways
                gateways = step.booking_flow.allowed_payment_gateways.filter(is_active=True)
            else:
                # Fallback to all active gateways
                from core.domains.payments.models import PaymentGateway
                gateways = PaymentGateway.objects.filter(is_active=True)
            
            for gateway in gateways:
                gateway_data = {
                    'id': gateway.id,
                    'name': gateway.name,
                    'code': gateway.code,
                    'description': gateway.description,
                    'supported_methods': []
                }
                
                # Add supported payment methods based on gateway
                if gateway.code == 'stripe':
                    gateway_data['supported_methods'] = [
                        'CREDIT_CARD', 'DIGITAL_WALLET'
                    ]
                    # Add Stripe-specific public config
                    gateway_data['public_config'] = {
                        'publishable_key': gateway.config.get('publishable_key'),
                        'supports_apple_pay': True,
                        'supports_google_pay': True
                    }
                elif gateway.code == 'paypal':
                    gateway_data['supported_methods'] = [
                        'DIGITAL_WALLET'
                    ]
                    gateway_data['public_config'] = {
                        'client_id': gateway.config.get('client_id'),
                        'environment': gateway.config.get('environment', 'sandbox')
                    }
                
                available_gateways.append(gateway_data)
            
            # Get user's saved payment methods
            saved_methods = []
            if request.user.is_authenticated:
                from core.domains.payments.models import PaymentMethod
                from core.domains.payments.serializers import PaymentMethodSerializer
                user_methods = PaymentMethod.objects.filter(user=request.user)
                saved_methods = PaymentMethodSerializer(user_methods, many=True).data
            
            # CONSOLIDATED: deposit_amount, deposit_type removed - now from PaymentSettings
            return Response({
                'available_gateways': available_gateways,
                'saved_payment_methods': saved_methods,
                'require_immediate_payment': config.require_immediate_payment,
                'accept_deposit': config.accept_deposit,
                # REMOVED: 'deposit_amount', 'deposit_type' - frontend should read from PaymentSettings
                'payment_terms': config.payment_terms
            })
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def payment_terms_configuration(self, request, pk=None):
        """Get payment terms configuration for a payment_info step"""
        try:
            step = self.get_object()

            if step.step_type != 'payment_info':
                return Response(
                    {"detail": "Payment terms configuration is only available for payment_info steps"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            config = BookingFlowStepConfigurationService.get_payment_terms_configuration(pk)
            serializer = PaymentTermsConfigurationSerializer(config)
            return Response(serializer.data)
        except BookingFlowStepNotFound:
            return Response(
                {"detail": "Step not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['patch'])
    def update_payment_terms_configuration(self, request, pk=None):
        """Update payment terms configuration for a payment_info step"""
        try:
            step = self.get_object()

            if step.step_type != 'payment_info':
                return Response(
                    {"detail": "Payment terms configuration is only available for payment_info steps"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                config = BookingFlowStepConfigurationService.update_payment_terms_configuration(
                    pk, request.data
                )

            serializer = PaymentTermsConfigurationSerializer(config)
            return Response(serializer.data)
        except (BookingFlowStepNotFound, InvalidStepConfiguration) as e:
            return Response(
                {"detail": str(e)},
                status=e.status_code if hasattr(e, 'status_code') else status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def availability_settings(self, request, pk=None):
        """Get availability settings for date_time step"""
        try:
            step = self.get_object()
            
            if step.step_type != 'date_time':
                return Response(
                    {"detail": "This action is only available for date_time steps"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get step configuration
            config = getattr(step, 'datetime_config', None)
            if not config:
                return Response(
                    {"detail": "DateTime configuration not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            return Response({
                'enable_real_time_availability': config.enable_real_time_availability,
                'show_availability_status': config.show_availability_status,
                'auto_check_conflicts': config.auto_check_conflicts,
                'check_venue_availability': config.check_venue_availability,
                'check_resource_availability': config.check_resource_availability,
                'check_staff_availability': config.check_staff_availability,
                'availability_display_mode': config.availability_display_mode,
                'allow_overbooking': config.allow_overbooking,
                'overbooking_threshold': config.overbooking_threshold,
                'sync_with_calendar': config.sync_with_calendar,
                'calendar_source': config.calendar_source,
                'blocked_dates': config.blocked_dates,
                'available_days_of_week': config.available_days_of_week,
                'available_time_slots': config.available_time_slots,
                'buffer_before_hours': config.buffer_before_hours,
                'buffer_after_hours': config.buffer_after_hours
            })
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def available_questionnaires(self, request, pk=None):
        """Get available questionnaires for questionnaire step configuration"""
        from core.domains.questionnaires.models import Questionnaire
        from core.domains.questionnaires.basic_serializers import QuestionnaireBasicSerializer
        
        questionnaires = Questionnaire.objects.filter(is_active=True).order_by('name')
        serializer = QuestionnaireBasicSerializer(questionnaires, many=True, context=self.get_serializer_context())
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign_questionnaires(self, request, pk=None):
        """Assign questionnaires to a questionnaire step"""
        try:
            step = self.get_object()
            
            if step.step_type != 'questionnaire':
                return Response(
                    {"detail": "This action is only available for questionnaire steps"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            questionnaire_ids = request.data.get('questionnaire_ids', [])
            
            with transaction.atomic():
                config = BookingFlowStepConfigurationService.assign_questionnaires(
                    pk, questionnaire_ids
                )
            
            # Return updated configuration
            return self.configuration(request, pk)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def available_packages(self, request, pk=None):
        """Get available packages for package selection step"""
        from core.domains.products.models import ProductOption
        from core.domains.products.serializers import ProductOptionSerializer
        
        packages = ProductOption.objects.filter(
            type='PACKAGE',
            is_active=True
        ).select_related('category').order_by('category__name', 'name')
        
        serializer = ProductOptionSerializer(packages, many=True, context=self.get_serializer_context())
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def available_addons(self, request, pk=None):
        """Get available add-ons for addon selection step"""
        from core.domains.products.models import ProductOption
        from core.domains.products.serializers import ProductOptionSerializer
        
        addons = ProductOption.objects.filter(
            type='PRODUCT',
            is_active=True
        ).select_related('category').order_by('category__name', 'name')
        
        serializer = ProductOptionSerializer(addons, many=True, context=self.get_serializer_context())
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def available_categories(self, request, pk=None):
        """Get available product categories"""
        from core.domains.products.models import ProductCategory
        from core.domains.products.serializers import ProductCategorySerializer
        
        categories = ProductCategory.objects.filter(is_active=True).order_by('name')
        serializer = ProductCategorySerializer(categories, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def available_step_types(self, request):
        """Get all available step types (excludes availability_check)"""
        from ..models import BookingFlowStep
        
        # Filter out availability_check from the choices
        available_types = [
            {'value': choice[0], 'label': choice[1]} 
            for choice in BookingFlowStep.STEP_TYPES 
            if choice[0] != 'availability_check'  # Explicitly exclude availability_check
        ]
        
        return Response({
            'step_types': available_types,
            'total_count': len(available_types),
            'removed_types': [
                {
                    'value': 'availability_check',
                    'label': 'Availability Check',
                    'reason': 'Integrated into date_time step',
                    'migration_available': True
                }
            ]
        })

    @action(detail=True, methods=['get'])
    def step_validation_rules(self, request, pk=None):
        """Get validation rules for a specific step type"""
        try:
            step = self.get_object()
            
            # Block access to availability_check validation rules
            if step.step_type == 'availability_check':
                return Response(
                    {"detail": "Availability check step type is no longer supported. Use date_time step with availability checking enabled instead."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Define validation rules for each step type
            validation_rules = {
                'introduction': {
                    'required_fields': [],
                    'optional_fields': ['title', 'content', 'show_event_details', 'show_pricing_overview']
                },
                'date_time': {
                    'required_fields': ['start_date'],
                    'optional_fields': ['start_time', 'end_date', 'end_time', 'duration', 'venue_additional_hours'],
                    'availability_fields': [
                        'venue_preference', 'resource_requirements', 'staff_requirements'
                    ],
                    'note': 'Duration fields (start_time, end_time, duration) are deprecated. Use venue_additional_hours instead.'
                },
                'questionnaire': {
                    'required_fields': [],
                    'optional_fields': ['responses']
                },
                'package_selection': {
                    'required_fields': ['selected_packages'],
                    'optional_fields': []
                },
                'addon_selection': {
                    'required_fields': [],
                    'optional_fields': ['selected_addons']
                },
                'pricing_summary': {
                    'required_fields': [],
                    'optional_fields': ['subtotal', 'tax', 'discount', 'total', 'applied_discount']
                },
                'contact_info': {
                    'required_fields': ['full_name', 'email'],
                    'optional_fields': ['phone', 'address', 'company']
                },
                'payment_info': {
                    'required_fields': ['payment_method'],
                    'optional_fields': ['billing_address']
                },
                'confirmation': {
                    'required_fields': [],
                    'optional_fields': []
                }
            }
            
            rules = validation_rules.get(step.step_type, {})
            
            # Merge with custom validation rules from step configuration
            if step.validation_rules:
                rules.update(step.validation_rules)
            
            return Response({
                'step_type': step.step_type,
                'validation_rules': rules,
                'custom_rules': step.validation_rules
            })
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )