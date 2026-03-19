import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

from ..layout_service import LayoutCompositionService
from ..models import CommunicationTemplate, EmailLayout, EmailLayoutHistory
from ..serializers import (
    CommunicationTemplateSerializer,
    EmailLayoutHistorySerializer,
    EmailLayoutSerializer,
    LayoutPreviewSerializer,
)
from ..services import CommunicationTemplateService

logger = logging.getLogger(__name__)

User = get_user_model()


class EmailLayoutViewSet(viewsets.ModelViewSet):
    """ViewSet for email layouts - Admin only"""

    queryset = EmailLayout.objects.all().order_by("name")
    serializer_class = EmailLayoutSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        return queryset

    def perform_create(self, serializer):
        """Create layout with history"""
        layout = serializer.save()
        EmailLayoutHistory.create_snapshot(
            layout=layout, reason="CREATE", changed_by=self.request.user, notes="Initial creation"
        )

    def perform_update(self, serializer):
        """Update layout with history"""
        # Create snapshot of current state before update
        layout = self.get_object()
        EmailLayoutHistory.create_snapshot(
            layout=layout, reason="UPDATE", changed_by=self.request.user, notes=self.request.data.get("notes", "")
        )
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Prevent deletion if templates are using this layout"""
        layout = self.get_object()

        if layout.templates.exists():
            return Response(
                {
                    "error": f'Cannot delete layout "{layout.name}" - it is used by {layout.templates.count()} template(s)',
                    "template_count": layout.templates.count(),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def preview(self, request, pk=None):
        """Preview layout with sample content"""
        layout = self.get_object()
        serializer = LayoutPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        context = serializer.validated_data.get("context_data", {})
        context["header_title"] = serializer.validated_data.get("header_title", "")
        context["header_subtitle"] = serializer.validated_data.get("header_subtitle", "")

        try:
            preview_html = LayoutCompositionService.preview_layout(
                layout=layout, sample_content=serializer.validated_data.get("sample_content"), context=context
            )
            return Response({"html": preview_html})
        except Exception as e:
            return Response({"error": f"Preview failed: {e!s}"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        """Get version history for a layout"""
        layout = self.get_object()
        history = EmailLayoutHistory.objects.filter(layout=layout).order_by("-version")
        serializer = EmailLayoutHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def rollback(self, request, pk=None):
        """Rollback layout to a previous version"""
        layout = self.get_object()
        version = request.data.get("version")

        if not version:
            return Response({"error": "Version number is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            history_entry = EmailLayoutHistory.objects.get(layout=layout, version=version)
        except EmailLayoutHistory.DoesNotExist:
            return Response({"error": f"Version {version} not found"}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # Create snapshot before rollback
            EmailLayoutHistory.create_snapshot(
                layout=layout, reason="ROLLBACK", changed_by=request.user, notes=f"Rolled back to version {version}"
            )

            # Restore layout state
            layout.header_template = history_entry.header_template
            layout.footer_template = history_entry.footer_template
            layout.wrapper_template = history_entry.wrapper_template
            layout.base_styles = history_entry.base_styles
            layout.primary_color = history_entry.primary_color
            layout.secondary_color = history_entry.secondary_color
            layout.logo_url = history_entry.logo_url
            layout.save()

        return Response(self.get_serializer(layout).data)

    @action(detail=True, methods=["get"])
    def templates(self, request, pk=None):
        """List templates using this layout"""
        layout = self.get_object()
        templates = layout.templates.all()
        serializer = CommunicationTemplateSerializer(templates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplicate a layout"""
        layout = self.get_object()
        new_name = request.data.get("new_name")

        if not new_name:
            base_name = f"Copy of {layout.name}"
            new_name = base_name
            counter = 1
            while EmailLayout.objects.filter(name=new_name).exists():
                counter += 1
                new_name = f"{base_name} ({counter})"

        if EmailLayout.objects.filter(name=new_name).exists():
            return Response(
                {"error": f'Layout with name "{new_name}" already exists'}, status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            new_layout = EmailLayout.objects.create(
                name=new_name,
                description=layout.description,
                header_template=layout.header_template,
                footer_template=layout.footer_template,
                wrapper_template=layout.wrapper_template,
                base_styles=layout.base_styles,
                primary_color=layout.primary_color,
                secondary_color=layout.secondary_color,
                logo_url=layout.logo_url,
                is_default=False,
                is_active=True,
            )

            EmailLayoutHistory.create_snapshot(
                layout=new_layout, reason="CREATE", changed_by=request.user, notes=f'Duplicated from "{layout.name}"'
            )

        return Response(self.get_serializer(new_layout).data, status=status.HTTP_201_CREATED)
