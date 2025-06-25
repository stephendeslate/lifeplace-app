# core/domains/notes/views.py
from core.utils.permissions import IsAdmin
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Note
from .serializers import NoteCreateSerializer, NoteSerializer
from .services import NoteService


class NoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for notes
    """
    serializer_class = NoteSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        # Default to all notes, but honor the ordering
        return Note.objects.all().order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return NoteCreateSerializer
        return NoteSerializer
    
    def perform_create(self, serializer):
        # Create a note using the service
        data = serializer.validated_data.copy()
        
        # Use the content_type and other data from validated_data
        note = NoteService.create_note(self.request.user, data)
        serializer.instance = note
    
    def perform_update(self, serializer):
        # Update a note using the service
        data = serializer.validated_data.copy()
        note = NoteService.update_note(
            self.kwargs['pk'], 
            self.request.user, 
            data
        )
        serializer.instance = note
    
    def perform_destroy(self, instance):
        # Delete a note using the service
        NoteService.delete_note(instance.id, self.request.user)
    
    @action(detail=False, methods=['get'])
    def for_object(self, request):
        """Get notes for a specific object"""
        content_type_model = request.query_params.get('content_type')
        object_id = request.query_params.get('object_id')
        
        if not content_type_model or not object_id:
            return Response(
                {"detail": "content_type and object_id are required parameters"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notes = NoteService.get_notes_for_object(
            content_type_model, 
            object_id,
            self.request.user
        )
        
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)