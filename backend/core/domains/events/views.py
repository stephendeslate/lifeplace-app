# backend/core/domains/events/views.py
from core.utils.permissions import IsAdmin, IsAdminOrClient, IsClient, IsOwnerOrAdmin
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .basic_serializers import EventTypeSerializer
from .serializers import EventSerializer
from .services import EventTypeService, EventService
from .models import Event, EventType


class EventTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event types
    """
    serializer_class = EventTypeSerializer
    permission_classes = [IsAdminOrClient]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        is_active = self.request.query_params.get('is_active')
        search_query = self.request.query_params.get('search')
        
        # Convert is_active to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        return EventTypeService.get_all_event_types(
            search_query=search_query,
            is_active=is_active
        )
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        event_type = EventTypeService.create_event_type(serializer.validated_data)
        
        return Response(
            self.get_serializer(event_type).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        event_type = EventTypeService.update_event_type(
            instance.id, 
            serializer.validated_data
        )
        
        return Response(self.get_serializer(event_type).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        success = EventTypeService.delete_event_type(instance.id)
        
        if success:
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            return Response(
                {"detail": "Event type was marked as inactive because it's in use."},
                status=status.HTTP_200_OK
            )
    
    @method_decorator(cache_page(60 * 5))  # Cache for 5 minutes
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get only active event types
        """
        active_types = EventTypeService.get_all_event_types(is_active=True)
        serializer = self.get_serializer(active_types, many=True)
        return Response(serializer.data)


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing events
    """
    serializer_class = EventSerializer
    permission_classes = [IsAdminOrClient]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'client__first_name', 'client__last_name', 'client__email']
    
    def get_queryset(self):
        # Extract filter parameters
        event_type_id = self.request.query_params.get('event_type')
        status = self.request.query_params.get('status')
        client_id = self.request.query_params.get('client')
        start_date_from = self.request.query_params.get('start_date_from')
        start_date_to = self.request.query_params.get('start_date_to')
        search_query = self.request.query_params.get('search')
        
        return EventService.get_all_events(
            search_query=search_query,
            event_type_id=event_type_id,
            status=status,
            client_id=client_id,
            start_date_from=start_date_from,
            start_date_to=start_date_to
        )
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        event = EventService.create_event(serializer.validated_data)
        
        return Response(
            self.get_serializer(event).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        event = EventService.update_event(
            instance.id, 
            serializer.validated_data
        )
        
        return Response(self.get_serializer(event).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        EventService.delete_event(instance.id)
        return Response(status=status.HTTP_204_NO_CONTENT)