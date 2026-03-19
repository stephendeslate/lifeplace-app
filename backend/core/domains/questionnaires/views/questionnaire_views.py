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

from ..models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireResponse,
)
from ..serializers import (
    QuestionnaireDetailSerializer,
    QuestionnaireFieldSerializer,
    QuestionnaireSerializer,
    QuestionnaireWithFieldsSerializer,
)
from ..services import (
    QuestionnaireFieldService,
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
        from ..validation import FieldValidator

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
        from ..analytics import QuestionnaireAnalytics

        stats = QuestionnaireAnalytics.get_questionnaire_stats(int(pk))
        return Response(stats)

    @action(detail=False, methods=["get"])
    def analytics_summary(self, request):
        """
        Get summary analytics for all questionnaires.
        Returns basic stats for each questionnaire in a list.
        """
        from ..analytics import QuestionnaireAnalytics

        summaries = QuestionnaireAnalytics.get_all_questionnaires_summary()
        return Response(summaries)

    @action(detail=True, methods=["get"])
    def response_trends(self, request, pk=None):
        """
        Get daily response trends for a questionnaire.
        Query params:
            days: Number of days to look back (default: 30)
        """
        from ..analytics import QuestionnaireAnalytics

        days = int(request.query_params.get("days", 30))
        trends = QuestionnaireAnalytics.get_response_trends(int(pk), days)
        return Response(trends)
