# backend/core/domains/events/views/event_views.py
from ..serializers import EventProductOptionSerializer, EventTaskDetailSerializer
from core.utils.pagination import StandardResultsSetPagination
from core.utils.permissions import IsAdmin, IsAdminOrClient
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ..models import Event, EventProductOption, EventTask, EventType
from ..cache_service import EventCacheService
from ..serializers import (
    EventCreateUpdateSerializer,
    EventDetailSerializer,
    EventSerializer,
    EventTaskSerializer,
    EventTimelineSerializer,
    EventFileSerializer,
    EventFeedbackSerializer,
    EventTypeSerializer,
)
from ..services import EventService, EventTypeService, EventTaskService, EventTimelineService, EventFileService, EventFeedbackService


class EventTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event types
    """
    serializer_class = EventTypeSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    pagination_class = None

    def get_permissions(self):
        """
        Different permissions for different actions:
        - List/retrieve: Public access (for booking flows)
        - Create/update/delete: Admin only
        """
        if self.action in ['list', 'retrieve', 'active']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdmin]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        is_active = self.request.query_params.get('is_active')
        search_query = self.request.query_params.get('search')
        
        # Convert is_active to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        # For public access (list/retrieve), only show active event types
        if self.action in ['list', 'retrieve', 'active']:
            if is_active is None:
                is_active = True  # Default to active only for public access
        
        # Try Redis cache first for simple active event types
        if not search_query and is_active and self.action in ['list', 'active']:
            cached_types = EventCacheService.get_cached_event_types(active_only=True)
            if cached_types:
                # Return a queryset-like object from cached data
                from django.http import QueryDict
                return EventType.objects.filter(id__in=[t['id'] for t in cached_types])
        
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
        Get only active event types (public endpoint)
        """
        active_types = EventTypeService.get_all_event_types(is_active=True)
        serializer = self.get_serializer(active_types, many=True)
        return Response(serializer.data)


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing events
    """
    permission_classes = [IsAdminOrClient]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'client__first_name', 'client__last_name', 'client__email']
    pagination_class = StandardResultsSetPagination
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EventDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return EventCreateUpdateSerializer
        return EventSerializer
    
    def get_queryset(self):
        # Extract filter parameters
        event_type_id = self.request.query_params.get('event_type')
        status = self.request.query_params.get('status')
        client_id = self.request.query_params.get('client')
        start_date_from = self.request.query_params.get('start_date_from')
        start_date_to = self.request.query_params.get('start_date_to')
        payment_status = self.request.query_params.get('payment_status')
        search_query = self.request.query_params.get('search')
        
        queryset = EventService.get_all_events(
            search_query=search_query,
            event_type_id=event_type_id,
            status=status,
            client_id=client_id,
            start_date_from=start_date_from,
            start_date_to=start_date_to,
            payment_status=payment_status
        )
        
        # CRITICAL OPTIMIZATION: Fetch all related data in one query
        # This prevents N+1 queries in serializers
        queryset = queryset.select_related(
            'client',  # Join client table
            'event_type',  # Join event type table
            'workflow_template',  # Join workflow template
            'current_stage',  # Join current workflow stage
        )
        
        # For detail view, prefetch all related objects
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related(
                'tasks__assigned_to',  # Prefetch tasks with assigned users
                'tasks__workflow_stage',  # Prefetch task workflow stages
                'event_products__product_option',  # Prefetch product options
                'timeline__actor',  # Prefetch timeline actors
                'files__uploaded_by',  # Prefetch file uploaders
                'feedback__submitted_by',  # Prefetch feedback submitters
                'feedback__response_by',  # Prefetch feedback responders
            )
        
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve single event with Redis caching
        """
        instance = self.get_object()
        
        # Try to get from Redis cache first
        cached_data = EventCacheService.get_event_detail(instance.id)
        if cached_data:
            return Response(cached_data)
        
        # If not in cache, serialize and cache
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Cache the serialized data
        EventCacheService.set_event_detail(instance.id, data)
        
        return Response(data)
    
    def list(self, request, *args, **kwargs):
        """
        List events with intelligent caching
        """
        # Build filter dictionary from query params
        filters = {
            'event_type': request.query_params.get('event_type'),
            'status': request.query_params.get('status'),
            'client': request.query_params.get('client'),
            'start_date_from': request.query_params.get('start_date_from'),
            'start_date_to': request.query_params.get('start_date_to'),
            'payment_status': request.query_params.get('payment_status'),
            'search': request.query_params.get('search'),
        }
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}
        
        # Try cache for simple, common queries
        if len(filters) <= 2 and 'search' not in filters:
            cached_event_ids = EventCacheService.get_cached_event_list(filters)
            if cached_event_ids:
                # Get events from optimized queryset
                queryset = self.get_queryset().filter(id__in=cached_event_ids)
                page = self.paginate_queryset(queryset)
                if page is not None:
                    serializer = self.get_serializer(page, many=True)
                    return self.get_paginated_response(serializer.data)
                
                serializer = self.get_serializer(queryset, many=True)
                return Response(serializer.data)
        
        # Fall back to normal list processing
        queryset = self.filter_queryset(self.get_queryset())
        
        # Cache the result for future use
        if len(filters) <= 2 and 'search' not in filters:
            EventCacheService.cache_event_list(queryset, filters)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract booking flow ID from request data if provided
        booking_flow_id = request.data.get('booking_flow_id')
        
        event = EventService.create_event(
            serializer.validated_data,
            request.user,
            booking_flow_id=booking_flow_id
        )
        
        return Response(
            EventDetailSerializer(event, context=self.get_serializer_context()).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        event = EventService.update_event(
            instance.id, 
            serializer.validated_data,
            request.user
        )
        
        return Response(
            EventDetailSerializer(event, context=self.get_serializer_context()).data
        )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        EventService.delete_event(instance.id, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Update the status of an event
        """
        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {"detail": "Status is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event = EventService.update_event_status(pk, new_status, request.user)
        return Response(self.get_serializer(event).data)
    
    @action(detail=True, methods=['post'])
    def update_stage(self, request, pk=None):
        """
        Update the workflow stage of an event
        """
        new_stage_id = request.data.get('stage_id')
        if not new_stage_id:
            return Response(
                {"detail": "Stage ID is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event = EventService.update_workflow_stage(pk, new_stage_id, request.user)
        return Response(self.get_serializer(event).data)
    
    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """
        Get tasks for an event
        """
        status_filter = request.query_params.get('status')
        assigned_to = request.query_params.get('assigned_to')
        
        tasks = EventTaskService.get_tasks_for_event(
            pk, 
            status=status_filter, 
            assigned_to=assigned_to
        )
        
        serializer = EventTaskSerializer(tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """
        Get timeline entries for an event
        """
        is_public = request.query_params.get('is_public')
        if is_public is not None:
            is_public = is_public.lower() == 'true'
        
        timeline_entries = EventTimelineService.get_timeline_for_event(pk, is_public)
        serializer = EventTimelineSerializer(timeline_entries, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """
        Get files for an event
        """
        category = request.query_params.get('category')
        is_public = request.query_params.get('is_public')
        if is_public is not None:
            is_public = is_public.lower() == 'true'
        
        files = EventFileService.get_files_for_event(pk, category, is_public)
        serializer = EventFileSerializer(
            files, 
            many=True, 
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def feedback(self, request, pk=None):
        """
        Get feedback for an event
        """
        feedback = EventFeedbackService.get_feedback_for_event(pk)
        serializer = EventFeedbackSerializer(feedback, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def next_task(self, request, pk=None):
        """
        Get the next pending task for an event
        """
        event = self.get_object()
        next_task = event.next_task
        
        if next_task:
            serializer = EventTaskSerializer(next_task)
            return Response(serializer.data)
        else:
            return Response(None)
        
class EventProductOptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event product options
    """
    serializer_class = EventProductOptionSerializer
    permission_classes = [IsAdminOrClient]
    
    def get_queryset(self):
        return EventProductOption.objects.all()
    
class EventTaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event tasks
    """
    permission_classes = [IsAdmin]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EventTaskDetailSerializer
        return EventTaskSerializer
    
    def get_queryset(self):
        return EventTask.objects.all().order_by('due_date', 'priority')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        task = EventTaskService.create_task(
            serializer.validated_data,
            request.user
        )
        
        return Response(
            self.get_serializer(task).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        task = EventTaskService.update_task(
            instance.id, 
            serializer.validated_data,
            request.user
        )
        
        return Response(self.get_serializer(task).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        EventTaskService.delete_task(instance.id, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Mark a task as complete
        """
        completion_notes = request.data.get('completion_notes', '')
        
        task = EventTaskService.complete_task(
            pk, 
            completion_notes,
            request.user
        )
        
        return Response(self.get_serializer(task).data)