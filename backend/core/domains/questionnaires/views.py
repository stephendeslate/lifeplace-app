# backend/core/domains/questionnaires/views.py
import logging
import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from core.utils.permissions import IsAdmin, IsAdminOrClient

logger = logging.getLogger(__name__)

from .models import (
    EventQuestionnaire,
    EventQuestionnaireActivity,
    Questionnaire,
    QuestionnaireField,
    QuestionnaireResponse,
)
from .serializers import (
    EventQuestionnaireCreateSerializer,
    EventQuestionnaireResponsesSerializer,
    EventQuestionnaireSerializer,
    EventQuestionnaireSummarySerializer,
    EventQuestionnaireUpdateSerializer,
    QuestionnaireDetailSerializer,
    QuestionnaireFieldSerializer,
    QuestionnaireResponseSerializer,
    QuestionnaireSerializer,
    QuestionnaireWithFieldsSerializer,
)
from .services import (
    QuestionnaireFieldService,
    QuestionnaireResponseService,
    QuestionnaireService,
)


class QuestionnaireViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing questionnaires

    Permissions:
    - List/Retrieve/Active: Admin and Client (clients can view questionnaires)
    - Create/Update/Delete: Admin only
    - for_event: Admin and Client (with ownership check for clients)
    - Analytics endpoints: Admin only
    """

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "order", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_permissions(self):
        """
        SECURITY FIX (P0-B15): Granular permissions for different actions.
        """
        # Read-only actions and file uploads for admin and client
        if self.action in ["list", "retrieve", "active", "fields", "validation_rules", "for_event", "upload"]:
            return [IsAdminOrClient()]
        # Analytics are admin-only
        if self.action in ["analytics", "analytics_summary", "response_trends"]:
            return [IsAdmin()]
        # Write operations are admin-only
        return [IsAdmin()]

    def get_queryset(self):
        event_type_id = self.request.query_params.get("event_type")
        is_active = self.request.query_params.get("is_active")

        # Convert string to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == "true"

        return QuestionnaireService.get_all_questionnaires(
            search_query=self.request.query_params.get("search"), event_type_id=event_type_id, is_active=is_active
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return QuestionnaireDetailSerializer
        if self.action in ["create", "update", "partial_update"]:
            return QuestionnaireWithFieldsSerializer
        return QuestionnaireSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            questionnaire = QuestionnaireService.create_questionnaire(serializer.validated_data)

        return Response(QuestionnaireDetailSerializer(questionnaire).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            questionnaire = QuestionnaireService.update_questionnaire(instance.id, serializer.validated_data)

        return Response(QuestionnaireDetailSerializer(questionnaire).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        with transaction.atomic():
            QuestionnaireService.delete_questionnaire(instance.id)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def fields(self, request, pk=None):
        """Get all fields for a questionnaire"""
        fields = QuestionnaireFieldService.get_fields_for_questionnaire(pk)
        serializer = QuestionnaireFieldSerializer(fields, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """Reorder questionnaires"""
        order_mapping = request.data.get("order_mapping", {})

        if not order_mapping:
            return Response({"detail": "Missing required field: order_mapping"}, status=status.HTTP_400_BAD_REQUEST)

        # Transaction is managed only in the view
        with transaction.atomic():
            # Call the service method which uses select_for_update
            questionnaires = QuestionnaireService.reorder_questionnaires(order_mapping)

            # Get fresh data after reordering to ensure consistency
            reordered_questionnaires = Questionnaire.objects.filter(id__in=[q.id for q in questionnaires]).order_by(
                "order"
            )

        serializer = self.get_serializer(reordered_questionnaires, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def active(self, request):
        """Get only active questionnaires"""
        active_questionnaires = QuestionnaireService.get_all_questionnaires(is_active=True)

        # Add prefetch_related for better performance
        active_questionnaires = active_questionnaires.prefetch_related("fields")

        page = self.paginate_queryset(active_questionnaires)

        if page is not None:
            # Use QuestionnaireDetailSerializer instead of self.get_serializer
            serializer = QuestionnaireDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        # Use QuestionnaireDetailSerializer instead of self.get_serializer
        serializer = QuestionnaireDetailSerializer(active_questionnaires, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def validation_rules(self, request):
        """
        Get all validation rules for frontend consumption.
        Returns validation patterns, messages, and examples for each field type.
        """
        from .validation import FieldValidator

        return Response(
            {
                "rules": FieldValidator.get_all_validation_rules(),
                "field_types": [choice[0] for choice in QuestionnaireField.FIELD_TYPES],
            }
        )

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """
        Duplicate a questionnaire with all its fields.
        The new questionnaire will be inactive by default.
        """
        new_name = request.data.get("name")

        with transaction.atomic():
            new_questionnaire = QuestionnaireService.duplicate_questionnaire(pk, new_name)

        return Response(QuestionnaireDetailSerializer(new_questionnaire).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="for_event/(?P<event_id>[^/.]+)")
    def for_event(self, request, event_id=None):
        """Get questionnaires configured for a specific event's booking flow"""
        from core.domains.bookingflow.models import BookingSession, QuestionnaireStepConfiguration
        from core.domains.events.models import Event

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({"detail": "Event not found"}, status=status.HTTP_404_NOT_FOUND)

        # SECURITY FIX (P0-B15): Verify ownership for CLIENT users
        user = request.user
        if user.role == "CLIENT" and event.client_id != user.id:
            return Response(
                {"detail": "You do not have permission to view this event's questionnaires."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Try to get the booking session for this event
        booking_session = BookingSession.objects.filter(created_event=event).first()

        if booking_session and booking_session.booking_flow:
            # Get the questionnaire step configuration for this booking flow
            questionnaire_step = booking_session.booking_flow.steps.filter(
                step_type="questionnaire", is_enabled=True
            ).first()

            if questionnaire_step:
                try:
                    questionnaire_config = QuestionnaireStepConfiguration.objects.get(step=questionnaire_step)
                    # Get questionnaires from the configuration, ordered by their step items
                    questionnaire_ids = list(
                        questionnaire_config.questionnaire_items.filter(questionnaire__is_active=True)
                        .order_by("order")
                        .values_list("questionnaire_id", flat=True)
                    )

                    if questionnaire_ids:
                        questionnaires = Questionnaire.objects.filter(
                            id__in=questionnaire_ids, is_active=True
                        ).prefetch_related("fields")

                        # Maintain order from step items
                        questionnaires = sorted(questionnaires, key=lambda q: questionnaire_ids.index(q.id))

                        serializer = QuestionnaireDetailSerializer(questionnaires, many=True)
                        return Response(serializer.data)
                except QuestionnaireStepConfiguration.DoesNotExist:
                    pass

        # Fallback: return questionnaires that have responses for this event
        # This handles events that may have been created before booking flow tracking
        questionnaire_ids = (
            QuestionnaireResponse.objects.filter(event_id=event_id)
            .values_list("field__questionnaire_id", flat=True)
            .distinct()
        )

        if questionnaire_ids:
            questionnaires = Questionnaire.objects.filter(id__in=questionnaire_ids, is_active=True).prefetch_related(
                "fields"
            )
            serializer = QuestionnaireDetailSerializer(questionnaires, many=True)
            return Response(serializer.data)

        # If no booking flow and no responses, return empty list
        return Response([])

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def upload(self, request):
        """
        Upload a file for a questionnaire file-type field.

        Validates the file against the field's constraints (max size, allowed types)
        and stores it via Django's default storage backend (local dev / Cloudflare R2 prod).

        Expected multipart/form-data:
            - file: The uploaded file
            - questionnaire: Questionnaire ID
            - field: QuestionnaireField ID
        """
        uploaded_file = request.FILES.get("file")
        field_id = request.data.get("field")

        if not uploaded_file:
            return Response(
                {"detail": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not field_id:
            return Response(
                {"detail": "Field ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            field = QuestionnaireField.objects.select_related("questionnaire").get(id=field_id)
        except QuestionnaireField.DoesNotExist:
            return Response(
                {"detail": "Questionnaire field not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if field.type != "file":
            return Response(
                {"detail": "This field does not accept file uploads."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size
        max_bytes = field.max_file_size_mb * 1024 * 1024
        if uploaded_file.size > max_bytes:
            return Response(
                {"detail": f"File exceeds maximum size of {field.max_file_size_mb} MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file extension
        ext = uploaded_file.name.rsplit(".", 1)[-1].lower() if "." in uploaded_file.name else ""
        if field.allowed_file_types and ext not in field.allowed_file_types:
            return Response(
                {"detail": f"File type .{ext} is not allowed. Allowed: {', '.join(field.allowed_file_types)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Save file
        filename = f"questionnaires/{field.questionnaire_id}/{field_id}/{uuid.uuid4().hex}.{ext}"
        saved_path = default_storage.save(filename, ContentFile(uploaded_file.read()))
        file_url = default_storage.url(saved_path)

        logger.info(
            "Questionnaire file uploaded: field=%s, file=%s, user=%s",
            field_id,
            saved_path,
            request.user.id if request.user.is_authenticated else "anonymous",
        )

        return Response(
            {"file_url": file_url, "file_id": saved_path},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def analytics(self, request, pk=None):
        """
        Get analytics for a specific questionnaire.
        Returns completion rates, response counts, and field-level stats.
        """
        from .analytics import QuestionnaireAnalytics

        stats = QuestionnaireAnalytics.get_questionnaire_stats(int(pk))
        return Response(stats)

    @action(detail=False, methods=["get"])
    def analytics_summary(self, request):
        """
        Get summary analytics for all questionnaires.
        Returns basic stats for each questionnaire in a list.
        """
        from .analytics import QuestionnaireAnalytics

        summaries = QuestionnaireAnalytics.get_all_questionnaires_summary()
        return Response(summaries)

    @action(detail=True, methods=["get"])
    def response_trends(self, request, pk=None):
        """
        Get daily response trends for a questionnaire.
        Query params:
            days: Number of days to look back (default: 30)
        """
        from .analytics import QuestionnaireAnalytics

        days = int(request.query_params.get("days", 30))
        trends = QuestionnaireAnalytics.get_response_trends(int(pk), days)
        return Response(trends)


class QuestionnaireFieldViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing questionnaire fields
    """

    serializer_class = QuestionnaireFieldSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return QuestionnaireField.objects.select_related("questionnaire").order_by("questionnaire", "order")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get all the validated data
        validated_data = serializer.validated_data.copy()
        # Extract questionnaire instance and get its ID
        questionnaire = validated_data.pop("questionnaire")
        questionnaire_id = questionnaire.id

        with transaction.atomic():
            field = QuestionnaireFieldService.create_field(questionnaire_id, validated_data)

        return Response(self.get_serializer(field).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            field = QuestionnaireFieldService.update_field(instance.id, serializer.validated_data)

        return Response(self.get_serializer(field).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        with transaction.atomic():
            QuestionnaireFieldService.delete_field(instance.id)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """Reorder fields within a questionnaire"""
        questionnaire_id = request.data.get("questionnaire_id")
        order_mapping = request.data.get("order_mapping", {})

        if not questionnaire_id or not order_mapping:
            return Response(
                {"detail": "Missing required fields: questionnaire_id or order_mapping"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Transaction is managed only in the view
        with transaction.atomic():
            # Call the service method which uses select_for_update
            fields = QuestionnaireFieldService.reorder_fields(questionnaire_id, order_mapping)

            # Get fresh data after reordering to ensure consistency
            reordered_fields = QuestionnaireField.objects.filter(id__in=[f.id for f in fields]).order_by("order")

        serializer = self.get_serializer(reordered_fields, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def value_distribution(self, request, pk=None):
        """
        Get value distribution for a specific field.
        Useful for analyzing select/multi-select field responses.
        Query params:
            limit: Maximum number of values to return (default: 10)
        """
        from .analytics import QuestionnaireAnalytics

        limit = int(request.query_params.get("limit", 10))
        distribution = QuestionnaireAnalytics.get_field_value_distribution(int(pk), limit)
        return Response(distribution)


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
        from .tasks import send_event_questionnaire_notification

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
