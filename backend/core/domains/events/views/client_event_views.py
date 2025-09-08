# backend/core/domains/events/views/client_event_views.py
import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from core.utils.permissions import IsAdminOrClient
from core.utils.pagination import StandardResultsSetPagination
from ..models import Event, EventTask, EventFile, EventFeedback
from ..serializers.client_serializers import (
    ClientEventSerializer,
    ClientEventDetailSerializer,
    ClientEventTimelineSerializer,
    ClientEventFileSerializer,
    ClientEventPreferencesSerializer,
    ClientEventTaskSerializer,
    ClientEventTaskUpdateSerializer,
    ClientEventFileUploadSerializer,
    ClientEventFeedbackSerializer
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
    
    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """Get visible tasks for the event"""
        try:
            event = Event.objects.get(id=pk, client_id=request.user.id)
        except Event.DoesNotExist:
            return Response(
                {"detail": "Event not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get tasks visible to client
        tasks = EventTask.objects.filter(
            event=event,
            is_visible_to_client=True
        ).order_by('due_date', 'priority')
        
        serializer = ClientEventTaskSerializer(tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'], url_path='tasks/(?P<task_id>[^/.]+)')
    def update_task(self, request, pk=None, task_id=None):
        """Update a task that requires client input"""
        try:
            event = Event.objects.get(id=pk, client_id=request.user.id)
        except Event.DoesNotExist:
            return Response(
                {"detail": "Event not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            task = EventTask.objects.get(
                id=task_id,
                event=event,
                is_visible_to_client=True,
                requires_client_input=True
            )
        except EventTask.DoesNotExist:
            return Response(
                {"detail": "Task not found or cannot be updated"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ClientEventTaskUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update task
        if 'status' in serializer.validated_data:
            task.status = serializer.validated_data['status']
            if task.status == 'COMPLETED':
                task.completed_by = request.user
                from django.utils import timezone
                task.completed_at = timezone.now()
        
        if 'completion_notes' in serializer.validated_data:
            task.completion_notes = serializer.validated_data['completion_notes']
        
        task.save()
        
        # Add timeline entry
        from ..models import EventTimeline
        EventTimeline.objects.create(
            event=event,
            action_type='TASK_COMPLETED' if task.status == 'COMPLETED' else 'SYSTEM_UPDATE',
            description=f"Task '{task.title}' updated by client",
            actor=request.user,
            is_public=True
        )
        
        return Response(
            ClientEventTaskSerializer(task).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_file(self, request, pk=None):
        """Upload a file for the event"""
        try:
            event = Event.objects.get(id=pk, client_id=request.user.id)
        except Event.DoesNotExist:
            return Response(
                {"detail": "Event not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ClientEventFileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create file record
        file_obj = serializer.save(
            event=event,
            uploaded_by=request.user,
            is_public=False  # Client uploads are private by default
        )
        
        # Add timeline entry
        from ..models import EventTimeline
        EventTimeline.objects.create(
            event=event,
            action_type='FILE_UPLOADED',
            description=f"File '{file_obj.name}' uploaded by client",
            actor=request.user,
            is_public=True
        )
        
        logger.info(f"Client {request.user.id} uploaded file {file_obj.id} for event {pk}")
        
        return Response(
            ClientEventFileSerializer(file_obj, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get', 'post'])
    def feedback(self, request, pk=None):
        """Get or submit feedback for the event"""
        try:
            event = Event.objects.get(id=pk, client_id=request.user.id)
        except Event.DoesNotExist:
            return Response(
                {"detail": "Event not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'GET':
            # Get existing feedback
            try:
                feedback = EventFeedback.objects.get(
                    event=event,
                    submitted_by=request.user
                )
                serializer = ClientEventFeedbackSerializer(feedback)
                return Response(serializer.data)
            except EventFeedback.DoesNotExist:
                return Response(
                    {"detail": "No feedback submitted yet"},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        else:  # POST
            # Check if event is completed
            if event.status not in ['COMPLETED']:
                return Response(
                    {"detail": "Feedback can only be submitted for completed events"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if feedback already exists
            if EventFeedback.objects.filter(event=event, submitted_by=request.user).exists():
                return Response(
                    {"detail": "Feedback already submitted for this event"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = ClientEventFeedbackSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Create feedback
            feedback = serializer.save(
                event=event,
                submitted_by=request.user
            )
            
            # Add timeline entry
            from ..models import EventTimeline
            EventTimeline.objects.create(
                event=event,
                action_type='FEEDBACK_RECEIVED',
                description=f"Client feedback received (Rating: {feedback.overall_rating}/5)",
                actor=request.user,
                is_public=False  # Keep feedback private in timeline
            )
            
            logger.info(f"Client {request.user.id} submitted feedback for event {pk}")
            
            return Response(
                ClientEventFeedbackSerializer(feedback).data,
                status=status.HTTP_201_CREATED
            )
    
    @action(detail=True, methods=['patch'], url_path='feedback/(?P<feedback_id>[^/.]+)')
    def update_feedback(self, request, pk=None, feedback_id=None):
        """Update existing feedback"""
        try:
            event = Event.objects.get(id=pk, client_id=request.user.id)
        except Event.DoesNotExist:
            return Response(
                {"detail": "Event not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            feedback = EventFeedback.objects.get(
                id=feedback_id,
                event=event,
                submitted_by=request.user
            )
        except EventFeedback.DoesNotExist:
            return Response(
                {"detail": "Feedback not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Don't allow updates if admin has responded
        if feedback.response:
            return Response(
                {"detail": "Cannot update feedback after admin response"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ClientEventFeedbackSerializer(
            feedback,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        feedback = serializer.save()
        
        logger.info(f"Client {request.user.id} updated feedback {feedback_id} for event {pk}")
        
        return Response(
            ClientEventFeedbackSerializer(feedback).data,
            status=status.HTTP_200_OK
        )