# backend/core/domains/bookingflow/views.py
from core.utils.permissions import IsAdmin, IsAdminOrClient
from core.domains.questionnaires.models import Questionnaire
from core.domains.products.models import ProductCategory, ProductOption
from django.db import transaction
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    BookingFlow,
    BookingFlowAnalytics,
    BookingFlowStep,
    BookingSession,
)
from .serializers import (
    BookingFlowAnalyticsSerializer,
    BookingFlowCreateSerializer,
    BookingFlowDetailSerializer,
    BookingFlowSerializer,
    BookingFlowStepCreateSerializer,
    BookingFlowStepSerializer,
    BookingFlowStepUpdateSerializer,
    BookingFlowUpdateSerializer,
    BookingSessionCreateSerializer,
    BookingSessionSerializer,
    BookingSessionUpdateSerializer,
    DuplicateFlowSerializer,
    PublicBookingFlowSerializer,
    ReorderStepsSerializer,
    # Configuration serializers
    IntroductionStepConfigurationSerializer,
    EventDetailsStepConfigurationSerializer,
    DateTimeStepConfigurationSerializer,
    QuestionnaireStepConfigurationSerializer,
    PackageSelectionStepConfigurationSerializer,
    AddonSelectionStepConfigurationSerializer,
    ContactInfoStepConfigurationSerializer,
    PaymentInfoStepConfigurationSerializer,
    ConfirmationStepConfigurationSerializer,
)
from .services import (
    BookingFlowService,
    BookingFlowStepService,
    BookingFlowStepConfigurationService,
    BookingSessionService,
    BookingFlowAnalyticsService,
)
from .exceptions import (
    BookingFlowNotFound,
    BookingFlowStepNotFound,
    BookingSessionNotFound,
    InvalidStepConfiguration,
)


class BookingFlowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing booking flows
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        event_type_id = self.request.query_params.get('event_type')
        is_active = self.request.query_params.get('is_active')
        search = self.request.query_params.get('search')
        
        # Convert string to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        return BookingFlowService.get_all_flows(
            search_query=search,
            event_type_id=event_type_id,
            is_active=is_active
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BookingFlowDetailSerializer
        elif self.action == 'create':
            return BookingFlowCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return BookingFlowUpdateSerializer
        elif self.action == 'duplicate':
            return DuplicateFlowSerializer
        return BookingFlowSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            with transaction.atomic():
                flow = BookingFlowService.create_flow(serializer.validated_data)
            
            return Response(
                BookingFlowDetailSerializer(flow, context=self.get_serializer_context()).data,
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
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            with transaction.atomic():
                flow = BookingFlowService.update_flow(
                    instance.id,
                    serializer.validated_data
                )
            
            return Response(
                BookingFlowDetailSerializer(flow, context=self.get_serializer_context()).data
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
                BookingFlowService.delete_flow(instance.id)
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a booking flow"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            with transaction.atomic():
                new_flow = BookingFlowService.duplicate_flow(
                    pk,
                    serializer.validated_data['name'],
                    serializer.validated_data.get('copy_steps', True),
                    serializer.validated_data.get('copy_configuration', True)
                )
            
            return Response(
                BookingFlowDetailSerializer(new_flow, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def steps(self, request, pk=None):
        """Get all steps for a booking flow"""
        try:
            steps = BookingFlowStepService.get_steps_for_flow(pk)
            serializer = BookingFlowStepSerializer(steps, many=True, context=self.get_serializer_context())
            return Response(serializer.data)
        except BookingFlowNotFound:
            return Response(
                {"detail": "Booking flow not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics for a booking flow"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        try:
            analytics = BookingFlowAnalyticsService.get_flow_analytics(
                pk, start_date, end_date
            )
            serializer = BookingFlowAnalyticsSerializer(analytics, many=True)
            return Response(serializer.data)
        except BookingFlowNotFound:
            return Response(
                {"detail": "Booking flow not found"},
                status=status.HTTP_404_NOT_FOUND
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
        """Get configuration for a step"""
        try:
            step = self.get_object()
            config = BookingFlowStepConfigurationService.get_step_configuration(pk)
            
            if config:
                serializer_map = {
                    'introduction': IntroductionStepConfigurationSerializer,
                    'event_details': EventDetailsStepConfigurationSerializer,
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
        """Update configuration for a step"""
        try:
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
    def available_questionnaires(self, request, pk=None):
        """Get available questionnaires for questionnaire step configuration"""
        questionnaires = Questionnaire.objects.filter(is_active=True).order_by('name')
        from core.domains.questionnaires.basic_serializers import QuestionnaireBasicSerializer
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
        packages = ProductOption.objects.filter(
            type='PACKAGE',
            is_active=True
        ).select_related('category').order_by('category__name', 'name')
        
        from core.domains.products.serializers import ProductOptionSerializer
        serializer = ProductOptionSerializer(packages, many=True, context=self.get_serializer_context())
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def available_addons(self, request, pk=None):
        """Get available add-ons for addon selection step"""
        addons = ProductOption.objects.filter(
            type='PRODUCT',
            is_active=True
        ).select_related('category').order_by('category__name', 'name')
        
        from core.domains.products.serializers import ProductOptionSerializer
        serializer = ProductOptionSerializer(addons, many=True, context=self.get_serializer_context())
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def available_categories(self, request, pk=None):
        """Get available product categories"""
        categories = ProductCategory.objects.filter(is_active=True).order_by('name')
        
        from core.domains.products.serializers import ProductCategorySerializer
        serializer = ProductCategorySerializer(categories, many=True, context=self.get_serializer_context())
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def configure_packages(self, request, pk=None):
        """Configure package selection for a package selection step"""
        try:
            step = self.get_object()
            
            if step.step_type != 'package_selection':
                return Response(
                    {"detail": "This action is only available for package selection steps"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                config = BookingFlowStepConfigurationService.update_step_configuration(
                    pk, request.data
                )
            
            # Return updated configuration
            return self.configuration(request, pk)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def configure_addons(self, request, pk=None):
        """Configure addon selection for an addon selection step"""
        try:
            step = self.get_object()
            
            if step.step_type != 'addon_selection':
                return Response(
                    {"detail": "This action is only available for addon selection steps"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                config = BookingFlowStepConfigurationService.update_step_configuration(
                    pk, request.data
                )
            
            # Return updated configuration
            return self.configuration(request, pk)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def preview_configuration(self, request, pk=None):
        """Preview how the step will appear to clients"""
        try:
            step = self.get_object()
            config = BookingFlowStepConfigurationService.get_step_configuration(pk)
            
            # Build preview data based on step type
            preview_data = {
                'step': BookingFlowStepSerializer(step, context=self.get_serializer_context()).data,
                'configuration': None,
                'preview_elements': [],
                'validation': {
                    'is_valid': True,
                    'errors': [],
                    'warnings': []
                }
            }
            
            if config:
                if step.step_type == 'questionnaire':
                    # Preview questionnaire fields
                    preview_data['configuration'] = QuestionnaireStepConfigurationSerializer(
                        config, context=self.get_serializer_context()
                    ).data
                    
                    questionnaire_items = config.questionnaire_items.all().order_by('order')
                    for item in questionnaire_items:
                        questionnaire_fields = item.questionnaire.fields.filter(is_active=True).order_by('order')
                        preview_data['preview_elements'].append({
                            'questionnaire': item.questionnaire.name,
                            'fields_count': questionnaire_fields.count(),
                            'conditional': item.is_conditional,
                            'estimated_time_minutes': questionnaire_fields.count() * 2,
                            'order': item.order
                        })
                
                elif step.step_type == 'package_selection':
                    # Preview available packages
                    preview_data['configuration'] = {
                        'selection_type': config.selection_type,
                        'min_selection': config.min_selection,
                        'max_selection': config.max_selection,
                        'show_pricing': config.show_pricing,
                        'show_descriptions': config.show_descriptions,
                        'show_images': config.show_images,
                    }
                    
                    if config.available_packages.exists():
                        packages = config.available_packages.all()
                    else:
                        packages = ProductOption.objects.filter(
                            type='PACKAGE',
                            is_active=True,
                            category__in=config.available_categories.all() if config.available_categories.exists() else []
                        )
                    
                    preview_data['preview_elements'] = [
                        {
                            'name': pkg.name,
                            'price': str(pkg.base_price),
                            'category': pkg.category.name if pkg.category else None,
                            'description': (pkg.description[:100] + '...' 
                                          if pkg.description and len(pkg.description) > 100 
                                          else pkg.description),
                            'image_available': bool(getattr(pkg, 'image', None))
                        }
                        for pkg in packages[:10]  # Show first 10 packages
                    ]
                    
                    # Validation
                    if not packages.exists():
                        preview_data['validation']['errors'].append('No packages available with current configuration')
                        preview_data['validation']['is_valid'] = False
                
                elif step.step_type == 'addon_selection':
                    # Preview available addons
                    preview_data['configuration'] = {
                        'min_selection': config.min_selection,
                        'max_selection': config.max_selection,
                        'group_by_category': config.group_by_category,
                        'show_recommendations': config.show_recommendations,
                    }
                    
                    if config.available_addons.exists():
                        addons = config.available_addons.all()
                    else:
                        addons = ProductOption.objects.filter(
                            type='PRODUCT',
                            is_active=True,
                            category__in=config.available_categories.all() if config.available_categories.exists() else []
                        )
                    
                    preview_data['preview_elements'] = [
                        {
                            'name': addon.name,
                            'price': str(addon.base_price),
                            'category': addon.category.name if addon.category else None,
                            'description': (addon.description[:100] + '...' 
                                          if addon.description and len(addon.description) > 100 
                                          else addon.description),
                            'image_available': bool(getattr(addon, 'image', None))
                        }
                        for addon in addons[:10]  # Show first 10 addons
                    ]
                    
                    # Validation
                    if config.min_selection > 0 and not addons.exists():
                        preview_data['validation']['errors'].append('Minimum selection required but no addons available')
                        preview_data['validation']['is_valid'] = False
                
                elif step.step_type == 'contact_info':
                    preview_data['configuration'] = {
                        'require_full_name': config.require_full_name,
                        'require_email': config.require_email,
                        'require_phone': config.require_phone,
                        'require_address': config.require_address,
                        'require_company': config.require_company,
                        'offer_account_creation': config.offer_account_creation,
                    }
                    
                    required_fields = []
                    if config.require_full_name:
                        required_fields.append('Full Name')
                    if config.require_email:
                        required_fields.append('Email')
                    if config.require_phone:
                        required_fields.append('Phone')
                    if config.require_address:
                        required_fields.append('Address')
                    if config.require_company:
                        required_fields.append('Company')
                    
                    preview_data['preview_elements'] = [
                        {'field': field, 'required': True}
                        for field in required_fields
                    ]
                    
                    # Add custom fields
                    for custom_field in config.custom_fields:
                        preview_data['preview_elements'].append({
                            'field': custom_field.get('label', custom_field.get('name')),
                            'required': custom_field.get('required', False),
                            'type': custom_field.get('type', 'text')
                        })
            
            return Response(preview_data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def duplicate_configuration(self, request, pk=None):
        """Duplicate configuration from another step"""
        source_step_id = request.data.get('source_step_id')
        
        if not source_step_id:
            return Response(
                {"detail": "source_step_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                config = BookingFlowStepConfigurationService.duplicate_step_configuration(
                    source_step_id, pk
                )
            
            return self.configuration(request, pk)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class BookingSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing booking sessions
    """
    permission_classes = [IsAdminOrClient]
    serializer_class = BookingSessionSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin can see all sessions
        if user.is_staff or getattr(user, 'role', None) == 'ADMIN':
            queryset = BookingSession.objects.all()
        else:
            # Clients can only see their own sessions
            queryset = BookingSession.objects.filter(client=user)
        
        # Apply filters
        booking_flow_id = self.request.query_params.get('booking_flow')
        is_completed = self.request.query_params.get('is_completed')
        is_abandoned = self.request.query_params.get('is_abandoned')
        
        if booking_flow_id:
            queryset = queryset.filter(booking_flow_id=booking_flow_id)
        
        if is_completed is not None:
            is_completed = is_completed.lower() == 'true'
            queryset = queryset.filter(is_completed=is_completed)
        
        if is_abandoned is not None:
            is_abandoned = is_abandoned.lower() == 'true'
            queryset = queryset.filter(is_abandoned=is_abandoned)
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BookingSessionCreateSerializer
        elif self.action == 'update_data':
            return BookingSessionUpdateSerializer
        return BookingSessionSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new booking session"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            session_data = {
                'ip_address': serializer.validated_data.get('ip_address'),
                'user_agent': serializer.validated_data.get('user_agent'),
                'referrer_url': serializer.validated_data.get('referrer_url'),
            }
            
            session = BookingSessionService.create_session(
                booking_flow_id=serializer.validated_data['booking_flow'],
                client_id=request.user.id if request.user.is_authenticated else None,
                session_data=session_data
            )
            
            return Response(
                BookingSessionSerializer(session, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['patch'])
    def update_data(self, request, pk=None):
        """Update session data for a step"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            session = BookingSessionService.update_session_data(
                session_id=serializer.validated_data['session_id'],
                step_data=serializer.validated_data['step_data'],
                mark_completed=serializer.validated_data.get('mark_completed', False)
            )
            
            return Response(
                BookingSessionSerializer(session, context=self.get_serializer_context()).data
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def complete_booking(self, request, pk=None):
        """Complete the booking and create event"""
        try:
            session = self.get_object()
            event = BookingSessionService.complete_booking(str(session.session_id))
            
            from core.domains.events.serializers import EventSerializer
            return Response(
                {
                    "detail": "Booking completed successfully",
                    "event": EventSerializer(event, context=self.get_serializer_context()).data,
                    "session": BookingSessionSerializer(session, context=self.get_serializer_context()).data
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def abandon(self, request, pk=None):
        """Mark session as abandoned"""
        reason = request.data.get('reason', 'User abandoned')
        
        try:
            session = self.get_object()
            abandoned_session = BookingSessionService.abandon_session(
                str(session.session_id), reason
            )
            
            return Response(
                BookingSessionSerializer(abandoned_session, context=self.get_serializer_context()).data
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class PublicBookingFlowViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public ViewSet for client-facing booking flow endpoints
    """
    permission_classes = [AllowAny]
    serializer_class = PublicBookingFlowSerializer
    
    def get_queryset(self):
        return BookingFlow.objects.filter(is_active=True).select_related(
            'event_type'
        ).prefetch_related('enabled_steps')
    
    @action(detail=True, methods=['post'])
    def start_session(self, request, pk=None):
        """Start a new booking session for this flow"""
        try:
            flow = self.get_object()
            
            session_data = {
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'referrer_url': request.META.get('HTTP_REFERER', ''),
            }
            
            session = BookingSessionService.create_session(
                booking_flow_id=flow.id,
                client_id=request.user.id if request.user.is_authenticated else None,
                session_data=session_data
            )
            
            return Response(
                {
                    "session_id": str(session.session_id),
                    "current_step": BookingFlowStepSerializer(
                        session.current_step, context=self.get_serializer_context()
                    ).data if session.current_step else None,
                    "expires_at": session.expires_at,
                    "progress_percentage": session.progress_percentage
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class BookingFlowAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for booking flow analytics
    """
    permission_classes = [IsAdmin]
    serializer_class = BookingFlowAnalyticsSerializer
    
    def get_queryset(self):
        return BookingFlowAnalytics.objects.all().order_by('-date')
    
    @action(detail=False, methods=['post'])
    def update_daily(self, request):
        """Update daily analytics for a specific flow and date"""
        flow_id = request.data.get('flow_id')
        date = request.data.get('date')  # Optional, defaults to today
        
        if not flow_id:
            return Response(
                {"detail": "flow_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            if date:
                date = timezone.datetime.strptime(date, '%Y-%m-%d').date()
            
            analytics = BookingFlowAnalyticsService.update_daily_analytics(flow_id, date)
            
            return Response(
                self.get_serializer(analytics, context=self.get_serializer_context()).data
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active booking flows"""
        flows = BookingFlowService.get_all_flows(is_active=True)
        page = self.paginate_queryset(flows)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(flows, many=True)
        return Response(serializer.data)


class BookingFlowStepViewSet(viewsets.ModelViewSet):
    """
    Enhanced ViewSet for managing booking flow steps with detailed configurations
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
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Extract flow from validated data
            validated_data = serializer.validated_data.copy()
            booking_flow = validated_data.pop('booking_flow')
            flow_id = booking_flow.id
            
            with transaction.atomic():
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
        """Get configuration for a step"""
        try:
            step = self.get_object()
            config = BookingFlowStepConfigurationService.get_step_configuration(pk)
            
            if config:
                serializer_map = {
                    'introduction': IntroductionStepConfigurationSerializer,
                    'event_details': EventDetailsStepConfigurationSerializer,
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
        """Update configuration for a step"""
        try:
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

    @action(detail=True, methods=['post'])
    def duplicate_configuration(self, request, pk=None):
        """Duplicate configuration from another step"""
        source_step_id = request.data.get('source_step_id')
        
        if not source_step_id:
            return Response(
                {"detail": "source_step_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                config = BookingFlowStepConfigurationService.duplicate_step_configuration(
                    source_step_id, pk
                )
            
            return self.configuration(request, pk)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Preview how the step will appear to clients"""
        try:
            step = self.get_object()
            config = BookingFlowStepConfigurationService.get_step_configuration(pk)
            
            preview_data = {
                'step': BookingFlowStepSerializer(step, context=self.get_serializer_context()).data,
                'configuration': None,
                'preview_elements': [],
                'validation': {
                    'is_valid': True,
                    'errors': [],
                    'warnings': []
                }
            }
            
            if config:
                serializer_map = {
                    'introduction': IntroductionStepConfigurationSerializer,
                    'event_details': EventDetailsStepConfigurationSerializer,
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
                    preview_data['configuration'] = serializer_class(
                        config, context=self.get_serializer_context()
                    ).data
            
            return Response(preview_data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )