# backend/core/domains/bookingflow/views.py
from core.domains.events.models import EventType
from core.domains.events.serializers import EventTypeSerializer
from core.domains.workflows.basic_serializers import WorkflowTemplateSerializer
from core.domains.workflows.models import WorkflowTemplate
from core.utils.permissions import IsAdmin, IsAdminOrClient
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    AddonConfiguration,
    AddonItem,
    BookingFlow,
    ConfirmationConfiguration,
    DateConfiguration,
    IntroConfiguration,
    PackageConfiguration,
    PackageItem,
    PaymentConfiguration,
    QuestionnaireConfiguration,
    QuestionnaireItem,
    SummaryConfiguration,
)
from .serializers import (
    AddonConfigurationSerializer,
    AddonItemSerializer,
    BookingFlowDetailSerializer,
    BookingFlowSerializer,
    ConfirmationConfigurationSerializer,
    DateConfigurationSerializer,
    IntroConfigurationSerializer,
    PackageConfigurationSerializer,
    PackageItemSerializer,
    PaymentConfigurationSerializer,
    QuestionnaireConfigurationSerializer,
    QuestionnaireItemSerializer,
    SummaryConfigurationSerializer,
)
from .services import BookingFlowService


class BookingFlowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for booking flows with fixed steps
    """
    permission_classes = [IsAdminOrClient]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        event_type_id = self.request.query_params.get('event_type', None)
        is_active = self.request.query_params.get('is_active', None)
        
        # Convert string to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        return BookingFlowService.get_all_flows(
            event_type_id=event_type_id,
            is_active=is_active
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BookingFlowDetailSerializer
        return BookingFlowSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        flow = BookingFlowService.create_flow(serializer.validated_data)
        
        return Response(
            BookingFlowDetailSerializer(flow).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        flow = BookingFlowService.update_flow(
            instance.id, 
            serializer.validated_data
        )
        
        return Response(BookingFlowDetailSerializer(flow).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        BookingFlowService.delete_flow(instance.id)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active flows"""
        active_flows = BookingFlowService.get_all_flows(is_active=True)
        page = self.paginate_queryset(active_flows)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(active_flows, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def workflow_templates(self, request):
        """Get available workflow templates for assignment"""
        templates = WorkflowTemplate.objects.filter(is_active=True).order_by('name')
        serializer = WorkflowTemplateSerializer(templates, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get', 'put', 'patch'])
    def intro_config(self, request, pk=None):
        """Get or update intro configuration for a flow"""
        flow = self.get_object()
        
        if request.method == 'GET':
            try:
                config = IntroConfiguration.objects.get(booking_flow=flow)
                serializer = IntroConfigurationSerializer(config)
                return Response(serializer.data)
            except IntroConfiguration.DoesNotExist:
                return Response(
                    {"detail": "Configuration not found for this flow."},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # PUT or PATCH methods - update configuration
        try:
            config = IntroConfiguration.objects.get(booking_flow=flow)
            serializer = IntroConfigurationSerializer(
                config, 
                data=request.data, 
                partial=request.method == 'PATCH'
            )
        except IntroConfiguration.DoesNotExist:
            # Create if doesn't exist
            serializer = IntroConfigurationSerializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        
        # Add booking flow to validated data
        validated_data = serializer.validated_data
        validated_data['booking_flow'] = flow
        
        # Use create_or_update pattern
        config, created = IntroConfiguration.objects.update_or_create(
            booking_flow=flow,
            defaults=validated_data
        )
        
        return Response(
            IntroConfigurationSerializer(config).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get', 'put', 'patch'])
    def date_config(self, request, pk=None):
        """Get or update date configuration for a flow"""
        flow = self.get_object()
        
        if request.method == 'GET':
            try:
                config = DateConfiguration.objects.get(booking_flow=flow)
                serializer = DateConfigurationSerializer(config)
                return Response(serializer.data)
            except DateConfiguration.DoesNotExist:
                return Response(
                    {"detail": "Configuration not found for this flow."},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # PUT or PATCH methods - update configuration
        try:
            config = DateConfiguration.objects.get(booking_flow=flow)
            serializer = DateConfigurationSerializer(
                config, 
                data=request.data, 
                partial=request.method == 'PATCH'
            )
        except DateConfiguration.DoesNotExist:
            # Create if doesn't exist
            serializer = DateConfigurationSerializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        
        # Add booking flow to validated data
        validated_data = serializer.validated_data
        validated_data['booking_flow'] = flow
        
        # Use create_or_update pattern
        config, created = DateConfiguration.objects.update_or_create(
            booking_flow=flow,
            defaults=validated_data
        )
        
        return Response(
            DateConfigurationSerializer(config).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get', 'put', 'patch'])
    def questionnaire_config(self, request, pk=None):
        """Get or update questionnaire configuration for a flow"""
        flow = self.get_object()
        
        if request.method == 'GET':
            try:
                config = QuestionnaireConfiguration.objects.get(booking_flow=flow)
                serializer = QuestionnaireConfigurationSerializer(config)
                return Response(serializer.data)
            except QuestionnaireConfiguration.DoesNotExist:
                return Response(
                    {"detail": "Configuration not found for this flow."},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # PUT or PATCH methods - update configuration
        questionnaire_items = request.data.pop('questionnaire_items', None)
        
        try:
            config = QuestionnaireConfiguration.objects.get(booking_flow=flow)
            serializer = QuestionnaireConfigurationSerializer(
                config, 
                data=request.data, 
                partial=request.method == 'PATCH'
            )
        except QuestionnaireConfiguration.DoesNotExist:
            # Create if doesn't exist
            serializer = QuestionnaireConfigurationSerializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        
        # Add booking flow to validated data
        validated_data = serializer.validated_data
        validated_data['booking_flow'] = flow
        
        # Use create_or_update pattern
        config, created = QuestionnaireConfiguration.objects.update_or_create(
            booking_flow=flow,
            defaults=validated_data
        )
        
        # Handle questionnaire items if provided
        if questionnaire_items is not None:
            # Delete existing items
            config.questionnaire_items.all().delete()
            
            # Create new items
            for i, item_data in enumerate(questionnaire_items):
                QuestionnaireItem.objects.create(
                    config=config,
                    questionnaire_id=item_data.get('questionnaire'),
                    order=item_data.get('order', i + 1),
                    is_required=item_data.get('is_required', True)
                )
        
        return Response(
            QuestionnaireConfigurationSerializer(config).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get', 'put', 'patch'])
    def package_config(self, request, pk=None):
        """Get or update package configuration for a flow"""
        flow = self.get_object()
        
        if request.method == 'GET':
            try:
                config = PackageConfiguration.objects.get(booking_flow=flow)
                serializer = PackageConfigurationSerializer(config)
                return Response(serializer.data)
            except PackageConfiguration.DoesNotExist:
                return Response(
                    {"detail": "Configuration not found for this flow."},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # PUT or PATCH methods - update configuration
        package_items = request.data.pop('package_items', None)
        
        try:
            config = PackageConfiguration.objects.get(booking_flow=flow)
            serializer = PackageConfigurationSerializer(
                config, 
                data=request.data, 
                partial=request.method == 'PATCH'
            )
        except PackageConfiguration.DoesNotExist:
            # Create if doesn't exist
            serializer = PackageConfigurationSerializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        
        # Add booking flow to validated data
        validated_data = serializer.validated_data
        validated_data['booking_flow'] = flow
        
        # Use create_or_update pattern
        config, created = PackageConfiguration.objects.update_or_create(
            booking_flow=flow,
            defaults=validated_data
        )
        
        # Handle package items if provided
        if package_items is not None:
            # Delete existing items
            config.package_items.all().delete()
            
            # Create new items
            for i, item_data in enumerate(package_items):
                PackageItem.objects.create(
                    config=config,
                    product_id=item_data.get('product'),
                    order=item_data.get('order', i + 1),
                    is_highlighted=item_data.get('is_highlighted', False),
                    custom_price=item_data.get('custom_price'),
                    custom_description=item_data.get('custom_description', '')
                )
        
        return Response(
            PackageConfigurationSerializer(config).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get', 'put', 'patch'])
    def addon_config(self, request, pk=None):
        """Get or update addon configuration for a flow"""
        flow = self.get_object()
        
        if request.method == 'GET':
            try:
                config = AddonConfiguration.objects.get(booking_flow=flow)
                serializer = AddonConfigurationSerializer(config)
                return Response(serializer.data)
            except AddonConfiguration.DoesNotExist:
                return Response(
                    {"detail": "Configuration not found for this flow."},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # PUT or PATCH methods - update configuration
        addon_items = request.data.pop('addon_items', None)
        
        try:
            config = AddonConfiguration.objects.get(booking_flow=flow)
            serializer = AddonConfigurationSerializer(
                config, 
                data=request.data, 
                partial=request.method == 'PATCH'
            )
        except AddonConfiguration.DoesNotExist:
            # Create if doesn't exist
            serializer = AddonConfigurationSerializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        
        # Add booking flow to validated data
        validated_data = serializer.validated_data
        validated_data['booking_flow'] = flow
        
        # Use create_or_update pattern
        config, created = AddonConfiguration.objects.update_or_create(
            booking_flow=flow,
            defaults=validated_data
        )
        
        # Handle addon items if provided
        if addon_items is not None:
            # Delete existing items
            config.addon_items.all().delete()
            
            # Create new items
            for i, item_data in enumerate(addon_items):
                AddonItem.objects.create(
                    config=config,
                    product_id=item_data.get('product'),
                    order=item_data.get('order', i + 1),
                    is_highlighted=item_data.get('is_highlighted', False),
                    custom_price=item_data.get('custom_price'),
                    custom_description=item_data.get('custom_description', '')
                )
        
        return Response(
            AddonConfigurationSerializer(config).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get', 'put', 'patch'])
    def summary_config(self, request, pk=None):
        """Get or update summary configuration for a flow"""
        flow = self.get_object()
        
        if request.method == 'GET':
            try:
                config = SummaryConfiguration.objects.get(booking_flow=flow)
                serializer = SummaryConfigurationSerializer(config)
                return Response(serializer.data)
            except SummaryConfiguration.DoesNotExist:
                return Response(
                    {"detail": "Configuration not found for this flow."},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # PUT or PATCH methods - update configuration
        try:
            config = SummaryConfiguration.objects.get(booking_flow=flow)
            serializer = SummaryConfigurationSerializer(
                config, 
                data=request.data, 
                partial=request.method == 'PATCH'
            )
        except SummaryConfiguration.DoesNotExist:
            # Create if doesn't exist
            serializer = SummaryConfigurationSerializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        
        # Add booking flow to validated data
        validated_data = serializer.validated_data
        validated_data['booking_flow'] = flow
        
        # Use create_or_update pattern
        config, created = SummaryConfiguration.objects.update_or_create(
            booking_flow=flow,
            defaults=validated_data
        )
        
        return Response(
            SummaryConfigurationSerializer(config).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get', 'put', 'patch'])
    def payment_config(self, request, pk=None):
        """Get or update payment configuration for a flow"""
        flow = self.get_object()
        
        if request.method == 'GET':
            try:
                config = PaymentConfiguration.objects.get(booking_flow=flow)
                serializer = PaymentConfigurationSerializer(config)
                return Response(serializer.data)
            except PaymentConfiguration.DoesNotExist:
                return Response(
                    {"detail": "Configuration not found for this flow."},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # PUT or PATCH methods - update configuration
        try:
            config = PaymentConfiguration.objects.get(booking_flow=flow)
            serializer = PaymentConfigurationSerializer(
                config, 
                data=request.data, 
                partial=request.method == 'PATCH'
            )
        except PaymentConfiguration.DoesNotExist:
            # Create if doesn't exist
            serializer = PaymentConfigurationSerializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        
        # Add booking flow to validated data
        validated_data = serializer.validated_data
        validated_data['booking_flow'] = flow
        
        # Use create_or_update pattern
        config, created = PaymentConfiguration.objects.update_or_create(
            booking_flow=flow,
            defaults=validated_data
        )
        
        return Response(
            PaymentConfigurationSerializer(config).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get', 'put', 'patch'])
    def confirmation_config(self, request, pk=None):
        """Get or update confirmation configuration for a flow"""
        flow = self.get_object()
        
        if request.method == 'GET':
            try:
                config = ConfirmationConfiguration.objects.get(booking_flow=flow)
                serializer = ConfirmationConfigurationSerializer(config)
                return Response(serializer.data)
            except ConfirmationConfiguration.DoesNotExist:
                return Response(
                    {"detail": "Configuration not found for this flow."},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # PUT or PATCH methods - update configuration
        try:
            config = ConfirmationConfiguration.objects.get(booking_flow=flow)
            serializer = ConfirmationConfigurationSerializer(
                config, 
                data=request.data, 
                partial=request.method == 'PATCH'
            )
        except ConfirmationConfiguration.DoesNotExist:
            # Create if doesn't exist
            serializer = ConfirmationConfigurationSerializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        
        # Add booking flow to validated data
        validated_data = serializer.validated_data
        validated_data['booking_flow'] = flow
        
        # Use create_or_update pattern
        config, created = ConfirmationConfiguration.objects.update_or_create(
            booking_flow=flow,
            defaults=validated_data
        )
        
        return Response(
            ConfirmationConfigurationSerializer(config).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )