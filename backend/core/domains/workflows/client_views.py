# backend/core/domains/workflows/client_views.py
import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.utils.permissions import IsAdminOrClient
from core.domains.events.models import Event
from .client_serializers import ClientWorkflowStageSerializer, ClientWorkflowProgressSerializer

logger = logging.getLogger(__name__)


class ClientWorkflowViewSet(viewsets.ViewSet):
    """Client-facing workflow progress endpoints"""
    permission_classes = [IsAuthenticated, IsAdminOrClient]

    @action(detail=False, methods=['get'], url_path='events/(?P<event_id>[^/.]+)/progress')
    def event_progress(self, request, event_id=None):
        """Get workflow progress for a specific event"""
        try:
            # Verify client owns this event
            event = Event.objects.select_related(
                'workflow_template', 'current_stage'
            ).get(id=event_id, client=request.user)

            if not event.workflow_template:
                return Response({
                    "detail": "No workflow assigned to this event"
                }, status=status.HTTP_404_NOT_FOUND)

            # Get all stages for this workflow
            stages = event.workflow_template.stages.order_by('stage', 'order')

            # Calculate progress
            total_stages = stages.count()
            completed_count = 0
            stages_data = []

            for stage in stages:
                serializer = ClientWorkflowStageSerializer(stage, context={'event': event})
                stage_data = serializer.data
                stages_data.append(stage_data)

                if stage_data['status'] == 'completed':
                    completed_count += 1

            progress_data = {
                'current_stage_id': event.current_stage_id,
                'current_stage_name': event.current_stage.name if event.current_stage else None,
                'current_stage_type': event.current_stage.stage if event.current_stage else None,
                'total_stages': total_stages,
                'completed_stages': completed_count,
                'progress_percentage': (completed_count / total_stages * 100) if total_stages > 0 else 0,
                'stages': stages_data
            }

            return Response(progress_data)

        except Event.DoesNotExist:
            logger.warning(f"Event {event_id} not found for client {request.user.id}")
            return Response({
                "detail": "Event not found"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error getting workflow progress for event {event_id}: {str(e)}")
            return Response({
                "detail": "An error occurred while retrieving workflow progress"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
