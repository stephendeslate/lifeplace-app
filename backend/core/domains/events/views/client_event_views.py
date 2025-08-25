# backend/core/domains/events/views/client_event_views.py
import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.utils.permissions import IsAdminOrClient
from core.utils.pagination import StandardResultsSetPagination
from ..models import Event
from ..serializers.client_serializers import (
    ClientEventSerializer,
    ClientEventDetailSerializer,
    ClientEventTimelineSerializer,
    ClientEventFileSerializer,
    ClientEventPreferencesSerializer
)
from ..services.client_event_service import ClientEventService
from ..exceptions import EventNotFound

logger = logging.getLogger(__name__)


class ClientEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for client-specific event operations
    Read-only with limited update capabilities
    """
    permission_classes = [IsAuthenticated, IsAdminOrClient]
    pagination_class = StandardResultsSetPagination
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ClientEventDetailSerializer
        elif self.action == 'timeline':
            return ClientEventTimelineSerializer
        elif self.action == 'documents':
            return ClientEventFileSerializer
        elif self.action == 'update_preferences':
            return ClientEventPreferencesSerializer
        return ClientEventSerializer
    
    def get_queryset(self):
        """Get events for the authenticated client only"""
        try:
            status_filter = self.request.query_params.get('status')
            upcoming_only = self.request.query_params.get('upcoming_only', 'false').lower() == 'true'
            
            logger.info(f"Client {self.request.user.id} requesting events with status={status_filter}, upcoming_only={upcoming_only}")
            
            return ClientEventService.get_client_events(
                client_id=self.request.user.id,
                status=status_filter,
                upcoming_only=upcoming_only
            )
        except Exception as e:
            logger.error(f"Error getting events for client {self.request.user.id}: {str(e)}")
            return Event.objects.none()
    
    def retrieve(self, request, pk=None):
        """Get detailed view of a client's own event"""
        try:
            logger.info(f"Client {request.user.id} requesting event detail for event {pk}")
            event = ClientEventService.get_client_event_detail(
                event_id=pk,
                client_id=request.user.id
            )
            serializer = self.get_serializer(event)
            return Response(serializer.data)
        except EventNotFound:
            logger.warning(f"Event {pk} not found for client {request.user.id}")
            return Response(
                {"detail": "Event not found or you don't have permission to view it."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error retrieving event {pk} for client {request.user.id}: {str(e)}")
            return Response(
                {"detail": "An error occurred while retrieving the event."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def list(self, request):
        """List client events with pagination and filtering"""
        try:
            logger.info(f"Client {request.user.id} requesting events list")
            queryset = self.get_queryset()
            
            # Apply pagination
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error listing events for client {request.user.id}: {str(e)}")
            return Response(
                {"detail": "An error occurred while retrieving your events."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """Get public timeline entries for the event"""
        timeline_entries = ClientEventService.get_event_timeline(
            event_id=pk,
            client_id=request.user.id
        )
        serializer = self.get_serializer(timeline_entries, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """Get client-accessible documents for the event"""
        documents = ClientEventService.get_client_accessible_documents(
            event_id=pk,
            client_id=request.user.id
        )
        serializer = self.get_serializer(documents, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_preferences(self, request, pk=None):
        """Update client preferences for the event"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        event = ClientEventService.update_client_preferences(
            event_id=pk,
            client_id=request.user.id,
            preferences_data=serializer.validated_data
        )
        
        return Response(
            ClientEventDetailSerializer(event).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'])
    def notes(self, request, pk=None):
        """Get notes for the event - integrates with notes domain"""
        from core.domains.notes.services import NoteService
        
        # Verify event ownership first
        try:
            event = Event.objects.get(id=pk, client_id=request.user.id)
        except Event.DoesNotExist:
            return Response(
                {"detail": "Event not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get notes for this event
        notes = NoteService.get_notes_for_object(
            content_type_model='event',
            object_id=pk,
            user=request.user
        )
        
        from core.domains.notes.serializers import NoteSerializer
        serializer = NoteSerializer(notes, many=True)
        return Response(serializer.data)