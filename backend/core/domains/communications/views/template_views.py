import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdmin, IsAdminOrClient

from ..cache_service import communications_cache_service
from ..layout_service import LayoutCompositionService
from ..models import CommunicationRecord, CommunicationTemplate
from ..monitoring import communication_metrics
from ..serializers import (
    CommunicationRecordSerializer,
    CommunicationTemplateSerializer,
    PreviewCommunicationSerializer,
    SendCommunicationSerializer,
)
from ..services import CommunicationService, CommunicationTemplateService
from ..throttling import ManualSendThrottle, TemplatePreviewThrottle


logger = logging.getLogger(__name__)

User = get_user_model()


class CommunicationTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for communication templates"""

    queryset = CommunicationTemplate.objects.all().order_by("-updated_at")
    serializer_class = CommunicationTemplateSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "channel", "category", "updated_at"]
    ordering = ["-updated_at"]

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        - Admins can perform all CRUD operations
        - Clients can only read templates (for previewing)
        """
        if self.action in ["list", "retrieve", "preview", "variable_schemas"]:
            # Allow clients to read templates for preview purposes
            permission_classes = [IsAdminOrClient]
        else:
            # Only admins can create, update, delete templates
            permission_classes = [IsAdmin]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by category
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        # Filter by channel
        channel = self.request.query_params.get("channel")
        if channel:
            queryset = queryset.filter(channel=channel)

        # If user is a client, only show non-system templates or limit what they can see
        if self.request.user.role == "CLIENT":
            # Clients can see all templates for preview purposes, but this could be restricted
            pass

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            template = CommunicationTemplateService.create_template(serializer.validated_data)

        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(template).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            template = CommunicationTemplateService.update_template(instance.id, serializer.validated_data)

        return Response(self.get_serializer(template).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        with transaction.atomic():
            CommunicationTemplateService.delete_template(instance.id)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], throttle_classes=[TemplatePreviewThrottle])
    def preview(self, request, pk=None):
        """Preview a template with sample data - available to both admins and clients"""
        serializer = PreviewCommunicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        context_data = serializer.validated_data.get("context_data", {})

        # Extract override parameters for live editing preview
        body_template_override = serializer.validated_data.get("body_template")
        subject_template_override = serializer.validated_data.get("subject_template")
        layout_id_override = serializer.validated_data.get("layout_id")

        # Check if this is a live editing preview (has overrides) - skip cache for these
        has_overrides = body_template_override or subject_template_override or layout_id_override is not None

        if not has_overrides:
            # Try to get from cache first (only for non-override requests)
            cached_preview = communications_cache_service.get_cached_template_preview(int(pk), context_data)

            if cached_preview is not None:
                logger.debug(f"Template preview for {pk} served from cache")
                return Response(cached_preview)

        # Cache miss or live editing preview - generate preview
        preview_data = CommunicationTemplateService.preview_template(
            pk,
            context_data,
            body_template_override=body_template_override,
            subject_template_override=subject_template_override,
            layout_id_override=layout_id_override,
        )

        # Only cache non-override requests
        if not has_overrides:
            communications_cache_service.cache_template_preview(int(pk), context_data, preview_data)
            logger.info(f"Template preview for {pk} cached after generation")

        return Response(preview_data)

    @action(detail=True, methods=["post"], throttle_classes=[TemplatePreviewThrottle])
    def send_test(self, request, pk=None):
        """Send a test communication using this template - admin only"""
        if request.user.role != "ADMIN":
            return Response(
                {"error": "Only administrators can send test communications"}, status=status.HTTP_403_FORBIDDEN
            )

        recipient = request.data.get("recipient")
        if not recipient:
            return Response({"error": "recipient is required"}, status=status.HTTP_400_BAD_REQUEST)

        template = self.get_object()

        # Optional client/event context
        client = None
        client_id = request.data.get("client_id")
        if client_id:
            try:
                client = User.objects.get(id=client_id)
            except User.DoesNotExist:
                pass

        event = None
        event_id = request.data.get("event_id")
        if event_id:
            try:
                from core.domains.events.models import Event

                event = Event.objects.get(id=event_id)
            except Event.DoesNotExist:
                pass

        try:
            communication_service = CommunicationService()
            record = communication_service.send_communication_by_template(
                template=template,
                recipient=recipient,
                context_data={"is_test": True},
                client=client,
                sent_by=request.user,
                event=event,
                skip_preference_check=True,
            )
            if record:
                return Response(CommunicationRecordSerializer(record).data, status=status.HTTP_201_CREATED)
            return Response({"error": "Failed to send test communication"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"send_test failed for template {pk}: {e!s}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        """Get version history for a template - admin only"""
        if request.user.role != "ADMIN":
            return Response(
                {"error": "Only administrators can view template history"}, status=status.HTTP_403_FORBIDDEN
            )

        template = self.get_object()
        from ..models import CommunicationTemplateHistory

        history_entries = (
            CommunicationTemplateHistory.objects.filter(template=template)
            .select_related("changed_by")
            .order_by("-version")
        )

        # Serialize history entries
        history_data = []
        for entry in history_entries:
            history_data.append(
                {
                    "id": entry.id,
                    "version": entry.version,
                    "name": entry.name,
                    "channel": entry.channel,
                    "category": entry.category,
                    "context_type": entry.context_type,
                    "include_client_context": entry.include_client_context,
                    "include_event_context": entry.include_event_context,
                    "subject_template": entry.subject_template,
                    "body_template": entry.body_template,
                    "reason": entry.reason,
                    "notes": entry.notes,
                    "changed_by": {
                        "id": entry.changed_by.id,
                        "email": entry.changed_by.email,
                        "first_name": entry.changed_by.first_name,
                        "last_name": entry.changed_by.last_name,
                    }
                    if entry.changed_by
                    else None,
                    "created_at": entry.created_at.isoformat(),
                }
            )

        return Response(history_data)

    @action(detail=True, methods=["post"])
    def rollback(self, request, pk=None):
        """Rollback a template to a previous version - admin only"""
        if request.user.role != "ADMIN":
            return Response({"error": "Only administrators can rollback templates"}, status=status.HTTP_403_FORBIDDEN)

        template = self.get_object()
        version = request.data.get("version")

        if not version:
            return Response({"error": "Version number is required"}, status=status.HTTP_400_BAD_REQUEST)

        from ..models import CommunicationTemplateHistory

        try:
            history_entry = CommunicationTemplateHistory.objects.get(template=template, version=version)
        except CommunicationTemplateHistory.DoesNotExist:
            return Response({"error": f"Version {version} not found"}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # Create a new history entry for the current state before rollback
            CommunicationTemplateHistory.create_snapshot(
                template=template, reason="ROLLBACK", changed_by=request.user, notes=f"Rolled back to version {version}"
            )

            # Restore the template to the previous version
            template.name = history_entry.name
            template.channel = history_entry.channel
            template.category = history_entry.category
            template.context_type = history_entry.context_type
            template.include_client_context = history_entry.include_client_context
            template.include_event_context = history_entry.include_event_context
            template.subject_template = history_entry.subject_template
            template.body_template = history_entry.body_template
            template.save()

        # Clear cache for this template
        communications_cache_service.invalidate_template_cache(template.id)

        return Response(self.get_serializer(template).data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplicate a template - admin only"""
        if request.user.role != "ADMIN":
            return Response({"error": "Only administrators can duplicate templates"}, status=status.HTTP_403_FORBIDDEN)

        template = self.get_object()
        new_name = request.data.get("new_name")

        if not new_name:
            # Generate default name
            base_name = f"Copy of {template.name}"
            new_name = base_name
            counter = 1

            # Ensure unique name
            while CommunicationTemplate.objects.filter(name=new_name).exists():
                counter += 1
                new_name = f"{base_name} ({counter})"

        # Check if name already exists
        if CommunicationTemplate.objects.filter(name=new_name).exists():
            return Response(
                {"error": f'Template with name "{new_name}" already exists'}, status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Create new template as copy (not a system template)
            new_template = CommunicationTemplate.objects.create(
                name=new_name,
                channel=template.channel,
                category=template.category,
                context_type=template.context_type,
                include_client_context=template.include_client_context,
                include_event_context=template.include_event_context,
                subject_template=template.subject_template,
                body_template=template.body_template,
                is_system=False,  # Duplicates are never system templates
            )

        return Response(self.get_serializer(new_template).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """Get usage statistics for a specific template - admin only"""
        if request.user.role != "ADMIN":
            return Response(
                {"error": "Only administrators can view template statistics"}, status=status.HTTP_403_FORBIDDEN
            )

        template = self.get_object()
        days = int(request.query_params.get("days", 30))

        from datetime import timedelta

        from django.db.models import Count, Q
        from django.db.models.functions import TruncDate

        start_date = timezone.now() - timedelta(days=days)

        # Get records for this template
        records = CommunicationRecord.objects.filter(
            template_name=template.name, created_at__gte=start_date, is_deleted=False
        )

        # Aggregate statistics
        stats = records.aggregate(
            total_sent=Count("id"),
            delivered=Count("id", filter=Q(delivery_status="DELIVERED")),
            failed=Count("id", filter=Q(delivery_status="FAILED")),
            bounced=Count("id", filter=Q(delivery_status="BOUNCED")),
            pending=Count("id", filter=Q(delivery_status="PENDING")),
            opened=Count("id", filter=Q(is_opened=True)),
        )

        # Calculate rates
        total = stats["total_sent"] or 1
        stats["delivery_rate"] = round((stats["delivered"] / total) * 100, 2)
        stats["open_rate"] = round((stats["opened"] / total) * 100, 2)
        stats["failure_rate"] = round((stats["failed"] / total) * 100, 2)
        stats["bounce_rate"] = round((stats["bounced"] / total) * 100, 2)

        # Get usage by channel
        by_channel = records.values("channel").annotate(count=Count("id"))
        stats["by_channel"] = {item["channel"]: item["count"] for item in by_channel}

        # Get usage by day
        by_day = (
            records.annotate(date=TruncDate("created_at")).values("date").annotate(count=Count("id")).order_by("date")
        )
        stats["by_day"] = [{"date": item["date"].isoformat(), "count": item["count"]} for item in by_day]

        # Template info
        stats["template_id"] = template.id
        stats["template_name"] = template.name
        stats["days"] = days

        return Response(stats)

    @action(detail=False, methods=["get"])
    def variable_schemas(self, request):
        """
        Get available variable schemas for templates.
        Returns context types and variable groups with metadata.
        Available to both admins and clients.
        """
        from ..context_service import REQUIRED_OBJECTS, VARIABLE_GROUPS, ContextType

        # Try to get from cache first
        cached_schemas = communications_cache_service.get_cached_variable_schemas()

        if cached_schemas is not None:
            logger.debug("Variable schemas served from cache")
            return Response(cached_schemas)

        # Cache miss - build comprehensive schema response
        # Build context types info
        context_types = {}
        context_type_descriptions = {
            ContextType.CLIENT: "For client-focused communications (welcome emails, invitations)",
            ContextType.EVENT: "For event-related communications (reminders, updates)",
            ContextType.BOOKING: "For booking flow communications (confirmations, payment reminders)",
            ContextType.QUOTE: "For quote-related communications (quote sent, follow-ups)",
            ContextType.CONTRACT: "For contract communications (signature requests)",
            ContextType.ADMIN: "For admin user communications (invitations, role changes)",
            ContextType.NOTIFICATION: "For system notifications (alerts, digests)",
            ContextType.MANUAL: "For ad-hoc staff communications (custom messages)",
        }

        for context_type, label in ContextType.CHOICES:
            context_types[context_type] = {
                "label": label,
                "required_objects": REQUIRED_OBJECTS.get(context_type, []),
                "description": context_type_descriptions.get(context_type, ""),
            }

        # Build variable groups with simplified structure for frontend
        variable_groups = {}
        for group_key, group_data in VARIABLE_GROUPS.items():
            variable_groups[group_key] = {
                "label": group_data["label"],
                "icon": group_data.get("icon", "help"),
                "available_in": group_data["available_in"],
                "variables": group_data["variables"],
            }

        schemas = {
            "context_types": context_types,
            "variable_groups": variable_groups,
        }

        # Cache the schemas
        communications_cache_service.cache_variable_schemas(schemas)
        logger.info("Variable schemas cached after generation")

        return Response(schemas)
