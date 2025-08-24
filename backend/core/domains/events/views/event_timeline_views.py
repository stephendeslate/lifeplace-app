# backend/core/domains/events/views/event_timeline_views.py
from core.utils.permissions import IsAdmin
from rest_framework import status, viewsets
from rest_framework.response import Response

from ..models import EventTimeline
from ..serializers import EventTimelineSerializer
from ..services import EventTimelineService


class EventTimelineViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event timeline
    """
    serializer_class = EventTimelineSerializer
    permission_classes = [IsAdmin]
    http_method_names = ['get', 'post']  # Only allow GET and POST
    
    def get_queryset(self):
        return EventTimeline.objects.all().order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        entry = EventTimelineService.add_timeline_entry(
            serializer.validated_data,
            request.user
        )
        
        return Response(
            self.get_serializer(entry).data, 
            status=status.HTTP_201_CREATED
        )