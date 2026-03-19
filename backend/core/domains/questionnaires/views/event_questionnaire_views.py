from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdmin, IsAdminOrClient

from ..models import (
    EventQuestionnaire,
    EventQuestionnaireActivity,
    QuestionnaireResponse,
)
from ..serializers import (
    EventQuestionnaireCreateSerializer,
    EventQuestionnaireSerializer,
    EventQuestionnaireSummarySerializer,
    EventQuestionnaireUpdateSerializer,
    QuestionnaireResponseSerializer,
)


class EventQuestionnaireViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing EventQuestionnaire assignments.

    Allows admins to assign questionnaires to events, send them to clients,
    and track completion status. Similar to EventQuote/EventContract patterns.

    Endpoints:
    - GET /event-questionnaires/ - List all assignments
    - GET /event-questionnaires/{id}/ - Get single assignment
    - POST /event-questionnaires/ - Create new assignment
    - PATCH /event-questionnaires/{id}/ - Update assignment
    - DELETE /event-questionnaires/{id}/ - Delete assignment
    - POST /event-questionnaires/{id}/send/ - Send to client
    - POST /event-questionnaires/{id}/send_reminder/ - Send reminder
    - GET /event-questionnaires/for_event/{event_id}/ - Get assignments for event
    """

    def get_permissions(self):
        """
        Permissions:
        - Admin: Full access to all endpoints
        - Client: Read access to their own event questionnaires, for_event endpoint
        """
        if self.action in ["list", "retrieve", "for_event"]:
            return [IsAdminOrClient()]
        return [IsAdmin()]

    def get_queryset(self):
        queryset = EventQuestionnaire.objects.select_related(
            "event", "event__client", "event__event_type", "questionnaire", "assigned_by", "sent_by", "workflow_stage"
        ).prefetch_related("activities", "questionnaire__fields")

        # Client users can only see their own event questionnaires
        user = self.request.user
        if user.role == "CLIENT":
            queryset = queryset.filter(event__client=user)

        # Filter by event if provided
        event_id = self.request.query_params.get("event")
        if event_id:
            queryset = queryset.filter(event_id=event_id)

        # Filter by status if provided
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by questionnaire if provided
        questionnaire_id = self.request.query_params.get("questionnaire")
        if questionnaire_id:
            queryset = queryset.filter(questionnaire_id=questionnaire_id)

        return queryset.order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return EventQuestionnaireCreateSerializer
        if self.action in ["update", "partial_update"]:
            return EventQuestionnaireUpdateSerializer
        if self.action == "list":
            return EventQuestionnaireSummarySerializer
        return EventQuestionnaireSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """
        Send questionnaire to client.
        Updates status to SENT and sends notification email + in-app notification.
        """
        event_questionnaire = self.get_object()

        if event_questionnaire.status == "COMPLETE":
            return Response({"detail": "Cannot send a completed questionnaire."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event_questionnaire.send_to_client(user=request.user)
            serializer = EventQuestionnaireSerializer(event_questionnaire)
            return Response(serializer.data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="for_event/(?P<event_id>[^/.]+)")
    def for_event(self, request, event_id=None):
        """
        Get all questionnaire assignments for a specific event.
        Returns both EventQuestionnaire records and any questionnaires from booking flow.
        """
        from core.domains.events.models import Event

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({"detail": "Event not found"}, status=status.HTTP_404_NOT_FOUND)

        # SECURITY: Verify ownership for CLIENT users
        user = request.user
        if user.role == "CLIENT" and event.client_id != user.id:
            return Response(
                {"detail": "You do not have permission to view this event's questionnaires."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get EventQuestionnaire records for this event
        queryset = self.get_queryset().filter(event_id=event_id)
        serializer = EventQuestionnaireSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def send_reminder(self, request, pk=None):
        """
        Send a reminder for incomplete questionnaire.
        """
        event_questionnaire = self.get_object()

        if event_questionnaire.status == "COMPLETE":
            return Response({"detail": "Questionnaire is already complete"}, status=status.HTTP_400_BAD_REQUEST)

        if event_questionnaire.status == "PENDING":
            return Response(
                {"detail": "Questionnaire has not been sent yet. Use send action first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Trigger reminder task
        from ..tasks import send_event_questionnaire_notification

        send_event_questionnaire_notification.delay(event_questionnaire.id, "reminder")

        # Record activity
        EventQuestionnaireActivity.objects.create(
            event_questionnaire=event_questionnaire,
            action="REMINDER_SENT",
            action_by=request.user,
            notes="Reminder sent manually by admin",
        )

        return Response({"status": "Reminder sent successfully"})

    @action(detail=True, methods=["get"])
    def responses(self, request, pk=None):
        """
        Get all questionnaire responses for this EventQuestionnaire.
        """
        event_questionnaire = self.get_object()

        responses = QuestionnaireResponse.objects.filter(
            event=event_questionnaire.event, field__questionnaire=event_questionnaire.questionnaire
        ).select_related("field")

        serializer = QuestionnaireResponseSerializer(responses, many=True)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Delete an EventQuestionnaire assignment.
        Note: This does not delete the questionnaire responses.
        """
        instance = self.get_object()

        # Record deletion in timeline if event exists
        try:
            from core.domains.events.models import EventTimeline

            EventTimeline.objects.create(
                event=instance.event,
                action_type="QUESTIONNAIRE_REMOVED",
                description=f"Questionnaire '{instance.questionnaire.name}' assignment removed",
                action_data={
                    "questionnaire_id": instance.questionnaire.id,
                    "questionnaire_name": instance.questionnaire.name,
                    "removed_by": request.user.id if request.user else None,
                },
                is_public=False,
            )
        except Exception:
            pass  # Don't fail deletion if timeline entry fails

        return super().destroy(request, *args, **kwargs)
