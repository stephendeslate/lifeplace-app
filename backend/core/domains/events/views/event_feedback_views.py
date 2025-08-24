# backend/core/domains/events/views/event_feedback_views.py
from core.utils.permissions import IsOwnerOrAdmin
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import EventFeedback
from ..serializers import EventFeedbackSerializer
from ..services import EventFeedbackService


class EventFeedbackViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event feedback
    """
    serializer_class = EventFeedbackSerializer
    permission_classes = [IsOwnerOrAdmin]
    
    def get_queryset(self):
        return EventFeedback.objects.all().order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        feedback = EventFeedbackService.create_feedback(
            serializer.validated_data,
            request.user
        )
        
        return Response(
            self.get_serializer(feedback).data, 
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """
        Add admin response to feedback
        """
        response_text = request.data.get('response')
        if not response_text:
            return Response(
                {"detail": "Response text is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        feedback = EventFeedbackService.add_response(
            pk, 
            response_text,
            request.user
        )
        
        return Response(self.get_serializer(feedback).data)