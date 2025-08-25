# backend/core/domains/events/views/event_file_views.py
from core.utils.permissions import IsAdmin
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from ..models import EventFile
from ..serializers import EventFileSerializer
from ..services import EventFileService


class EventFileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event files
    """
    serializer_class = EventFileSerializer
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        return EventFile.objects.all().order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        file = EventFileService.create_file(
            serializer.validated_data,
            file_obj,
            request.user
        )
        
        return Response(
            self.get_serializer(file, context={'request': request}).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        file_obj = request.FILES.get('file')
        
        file = EventFileService.update_file(
            instance.id, 
            serializer.validated_data,
            file_obj,
            request.user
        )
        
        return Response(
            self.get_serializer(file, context={'request': request}).data
        )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        EventFileService.delete_file(instance.id, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context