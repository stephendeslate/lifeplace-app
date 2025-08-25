# backend/core/domains/events/views/event_task_views.py
from core.utils.permissions import IsAdmin
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import EventTask
from ..serializers import EventTaskSerializer, EventTaskDetailSerializer
from ..services import EventTaskService


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