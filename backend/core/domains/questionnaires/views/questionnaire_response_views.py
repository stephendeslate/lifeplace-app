from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdminOrClient

from ..models import QuestionnaireResponse
from ..serializers import (
    EventQuestionnaireResponsesSerializer,
    QuestionnaireResponseSerializer,
)
from ..services import QuestionnaireResponseService


class QuestionnaireResponseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing questionnaire responses

    SECURITY FIX (P0-B15): Uses IsAdminOrClient with proper queryset filtering.
    - Admin users can access all responses
    - Client users can only access responses for their own events
    """

    serializer_class = QuestionnaireResponseSerializer
    permission_classes = [IsAdminOrClient]

    def get_queryset(self):
        """
        SECURITY FIX (P0-B15): Filter queryset based on user role.
        Client users can only see responses for their own events.
        """
        queryset = QuestionnaireResponse.objects.select_related(
            "event", "event__client", "field", "field__questionnaire"
        )

        user = self.request.user
        if user.role == "CLIENT":
            # Filter to only responses for events owned by this client
            queryset = queryset.filter(event__client=user)

        return queryset

    def list(self, request, *args, **kwargs):
        event_id = request.query_params.get("event")
        if event_id:
            # SECURITY FIX (P0-B15): Verify client has access to this event
            user = request.user
            if user.role == "CLIENT":
                from core.domains.events.models import Event

                try:
                    event = Event.objects.get(id=event_id)
                    if event.client_id != user.id:
                        return Response(
                            {"detail": "You do not have permission to view this event's responses."},
                            status=status.HTTP_403_FORBIDDEN,
                        )
                except Event.DoesNotExist:
                    return Response({"detail": "Event not found"}, status=status.HTTP_404_NOT_FOUND)
            responses = QuestionnaireResponseService.get_responses_for_event(event_id)
            serializer = self.get_serializer(responses, many=True)
            return Response(serializer.data)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            response = QuestionnaireResponseService.create_response(serializer.validated_data)

        return Response(self.get_serializer(response).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            response = QuestionnaireResponseService.update_response(instance.id, serializer.validated_data)

        return Response(self.get_serializer(response).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        with transaction.atomic():
            QuestionnaireResponseService.delete_response(instance.id)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"])
    def save_event_responses(self, request):
        """Save multiple responses for an event at once"""
        serializer = EventQuestionnaireResponsesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event_id = serializer.validated_data["event"]
        responses_data = serializer.validated_data["responses"]

        # SECURITY FIX (P0-B15): Verify client has access to this event
        user = request.user
        if user.role == "CLIENT":
            from core.domains.events.models import Event

            try:
                event = Event.objects.get(id=event_id)
                if event.client_id != user.id:
                    return Response(
                        {"detail": "You do not have permission to modify this event's responses."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            except Event.DoesNotExist:
                return Response({"detail": "Event not found"}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            responses = QuestionnaireResponseService.save_event_responses(event_id, responses_data)

        return Response(QuestionnaireResponseSerializer(responses, many=True).data, status=status.HTTP_201_CREATED)
