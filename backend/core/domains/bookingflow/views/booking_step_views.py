# backend/core/domains/bookingflow/views/booking_step_views.py
from core.utils.permissions import IsAdmin
from django.db import models, transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import BookingFlowStep
from ..serializers import (
    BookingFlowStepCreateSerializer,
    BookingFlowStepSerializer,
    BookingFlowStepUpdateSerializer,
    ReorderStepsSerializer,
    # Configuration serializers - EventDetailsStepConfigurationSerializer removed
    IntroductionStepConfigurationSerializer,
    DateTimeStepConfigurationSerializer,
    QuestionnaireStepConfigurationSerializer,
    PackageSelectionStepConfigurationSerializer,
    AddonSelectionStepConfigurationSerializer,
    ContactInfoStepConfigurationSerializer,
    PaymentInfoStepConfigurationSerializer,
    ConfirmationStepConfigurationSerializer,
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
    EventDetails step has been removed completely
    """
    permission_classes = [IsAdmin]
    
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
        
        # Validate step_type to ensure event_details is not being created
        step_type = request_data.get('step_type')
        if step_type == 'event_details':
            return Response(
                {"detail": "EventDetails step type is no longer supported"},
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
        
        # Prevent updating to event_details step type
        if 'step_type' in request.data and request.data['step_type'] == 'event_details':
            return Response(
                {"detail": "EventDetails step type is no longer supported"},
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
            with transaction.atomic():
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
        """Get configuration for a step - EventDetails removed from mapping"""
        try:
            step = self.get_object()
            
            # Return error if someone tries to access event_details configuration
            if step.step_type == 'event_details':
                return Response(
                    {"detail": "EventDetails step type is no longer supported"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            config = BookingFlowStepConfigurationService.get_step_configuration(pk)
            
            if config:
                # Updated serializer mapping without event_details
                serializer_map = {
                    'introduction': IntroductionStepConfigurationSerializer,
                    'date_time': DateTimeStepConfigurationSerializer,
                    'questionnaire': QuestionnaireStepConfigurationSerializer,
                    'package_selection': PackageSelectionStepConfigurationSerializer,
                    'addon_selection': AddonSelectionStepConfigurationSerializer,
                    'contact_info': ContactInfoStepConfigurationSerializer,
                    'payment_info': PaymentInfoStepConfigurationSerializer,
                    'confirmation': ConfirmationStepConfigurationSerializer,
                }
                
                serializer_class = serializer_map.get(step.step_type)
                if serializer_class:
                    serializer = serializer_class(config, context=self.get_serializer_context())
                    return Response(serializer.data)
            
            return Response({"detail": "Configuration not found"}, status=status.HTTP_404_NOT_FOUND)
        except BookingFlowStepNotFound:
            return Response(
                {"detail": "Step not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['patch'])
    def update_configuration(self, request, pk=None):
        """Update configuration for a step - EventDetails blocked"""
        try:
            step = self.get_object()
            
            # Block event_details configuration updates
            if step.step_type == 'event_details':
                return Response(
                    {"detail": "EventDetails step type is no longer supported"},
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
            elif step.booking_flow.default_payment_gateway:
                # Use flow's default gateway
                gateways = [step.booking_flow.default_payment_gateway]
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
            
            return Response({
                'available_gateways': available_gateways,
                'saved_payment_methods': saved_methods,
                'require_immediate_payment': config.require_immediate_payment,
                'accept_deposit': config.accept_deposit,
                'deposit_amount': config.deposit_amount if config.accept_deposit else None,
                'deposit_type': config.deposit_type if config.accept_deposit else None,
                'allow_payment_plans': config.allow_payment_plans,
                'payment_terms': config.payment_terms
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
        """Get all available step types (excludes event_details)"""
        from ..models import BookingFlowStep
        
        # Filter out event_details from the choices
        available_types = [
            {'value': choice[0], 'label': choice[1]} 
            for choice in BookingFlowStep.STEP_TYPES 
            if choice[0] != 'event_details'  # Explicitly exclude event_details
        ]
        
        return Response({
            'step_types': available_types,
            'total_count': len(available_types)
        })

    @action(detail=True, methods=['get'])
    def step_validation_rules(self, request, pk=None):
        """Get validation rules for a specific step type"""
        try:
            step = self.get_object()
            
            # Block access to event_details validation rules
            if step.step_type == 'event_details':
                return Response(
                    {"detail": "EventDetails step type is no longer supported"},
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
                    'optional_fields': ['start_time', 'end_date', 'end_time', 'duration']
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