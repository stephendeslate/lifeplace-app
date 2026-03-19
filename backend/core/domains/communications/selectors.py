"""
Read-only query logic for the communications domain.

Selectors contain all read operations (queries, lookups, filtering).
They never mutate data. All functions use keyword-only arguments (*)
for clarity at call sites.

See ADR-002: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

from typing import Any

from django.db.models import Count, Q, QuerySet
from django.utils import timezone

from .exceptions import InvalidTemplateFormat, TemplateNotFound
from .models import CommunicationRecord, CommunicationTemplate


def get_all_templates(
    *,
    category: str | None = None,
    channel: str | None = None,
) -> QuerySet[CommunicationTemplate]:
    """Get all templates with optional filtering."""
    queryset = CommunicationTemplate.objects.all().order_by("-updated_at")

    if category:
        queryset = queryset.filter(category=category)
    if channel:
        queryset = queryset.filter(channel=channel)

    return queryset


def get_template_by_id(*, template_id: int) -> CommunicationTemplate:
    """Get template by ID.

    Raises:
        TemplateNotFound: If the template does not exist.
    """
    try:
        return CommunicationTemplate.objects.get(id=template_id)
    except CommunicationTemplate.DoesNotExist:
        raise TemplateNotFound()


def get_template_by_name(*, name: str) -> CommunicationTemplate:
    """Get template by name.

    Raises:
        TemplateNotFound: If the template does not exist.
    """
    try:
        return CommunicationTemplate.objects.get(name=name)
    except CommunicationTemplate.DoesNotExist:
        raise TemplateNotFound()


def preview_template(
    *,
    template_id: int,
    context_data: dict[str, Any] | None = None,
    body_template_override: str | None = None,
    subject_template_override: str | None = None,
    layout_id_override: int | None = None,
) -> dict[str, str]:
    """Preview a template with context data.

    Renders the template without saving, supporting manual messages,
    layout composition, and live editing overrides.

    Args:
        template_id: The ID of the template to preview.
        context_data: Dictionary of context variables for rendering.
        body_template_override: Override saved body_template (for live editing).
        subject_template_override: Override saved subject_template (for live editing).
        layout_id_override: Override saved layout ID. Pass 0 for no layout.
    """
    from .layout_service import LayoutCompositionService
    from .models import EmailLayout
    from .template_sandbox import TemplateSandboxError, sandboxed_template_engine

    template = get_template_by_id(template_id=template_id)

    if context_data is None:
        context_data = {}

    # Determine effective templates (use overrides if provided, otherwise use saved)
    effective_body_template = (
        body_template_override if body_template_override is not None else template.body_template
    )
    effective_subject_template = (
        subject_template_override if subject_template_override is not None else template.subject_template
    )

    # Determine effective layout (use override if provided)
    effective_layout = template.layout
    if layout_id_override is not None:
        if layout_id_override in {0, ""}:
            effective_layout = None
        else:
            try:
                effective_layout = EmailLayout.objects.get(id=layout_id_override, is_active=True)
            except EmailLayout.DoesNotExist:
                effective_layout = None

    try:
        custom_subject = context_data.get("custom_subject")
        custom_body = context_data.get("custom_body")

        # Handle subject
        if custom_subject:
            try:
                subject = sandboxed_template_engine.render(custom_subject, context_data, validate_first=True)
            except TemplateSandboxError:
                subject = custom_subject
        elif effective_subject_template:
            subject = sandboxed_template_engine.render(
                effective_subject_template, context_data, validate_first=True
            )
        else:
            subject = None

        # Handle body with layout support
        if custom_body and template.category == "MANUAL":
            base_template = effective_body_template
            content_placeholders = [
                "{{content}}", "{{message}}", "{{body}}",
                "{{ content }}", "{{ message }}", "{{ body }}",
            ]

            combined_template = base_template
            placeholder_found = False

            for placeholder in content_placeholders:
                if placeholder in combined_template:
                    combined_template = combined_template.replace(placeholder, custom_body)
                    placeholder_found = True
                    break

            if not placeholder_found:
                if "</div>" in combined_template:
                    parts = combined_template.rsplit("</div>", 1)
                    if len(parts) == 2:
                        combined_template = (
                            f'{parts[0]}<div style="margin: 16px 0;">{custom_body}</div></div>{parts[1]}'
                        )
                else:
                    combined_template += f'<div style="margin: 16px 0;">{custom_body}</div>'

            rendered_content = sandboxed_template_engine.render(
                combined_template, context_data, validate_first=True
            )

            if effective_layout and template.channel == "EMAIL":
                body = LayoutCompositionService.compose_content_only(
                    content=rendered_content, layout=effective_layout, context=context_data, subject=subject
                )
            else:
                body = rendered_content
        elif effective_layout and template.channel == "EMAIL":
            body = LayoutCompositionService.compose_email_with_content(
                body_template=effective_body_template,
                layout=effective_layout,
                content_context=context_data,
                subject=subject,
            )
        else:
            body = sandboxed_template_engine.render(effective_body_template, context_data, validate_first=True)

        return {"subject": subject, "body": body}
    except TemplateSandboxError as e:
        raise InvalidTemplateFormat(detail=f"Template security error: {e!s}")
    except Exception as e:
        raise InvalidTemplateFormat(detail=f"Error rendering template: {e!s}")


def get_communication_records(
    *,
    client_id: int | None = None,
    template_name: str | None = None,
    status: str | None = None,
    limit: int = 100,
) -> list[CommunicationRecord]:
    """Get communication records with filtering."""
    queryset = CommunicationRecord.objects.all()

    if client_id:
        queryset = queryset.filter(client_id=client_id)
    if template_name:
        queryset = queryset.filter(template_name=template_name)
    if status:
        queryset = queryset.filter(delivery_status=status)

    return queryset.order_by("-created_at")[:limit]


def get_template_stats(
    *,
    template_name: str | None = None,
    days: int = 30,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    """Get communication statistics for a date range.

    If start_date and end_date are provided, uses exact range.
    Otherwise falls back to 'last N days from now'.
    """
    from datetime import datetime, timedelta

    if start_date and end_date:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        queryset = CommunicationRecord.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
    else:
        computed_start = timezone.now() - timedelta(days=days)
        queryset = CommunicationRecord.objects.filter(created_at__gte=computed_start)

    if template_name:
        queryset = queryset.filter(template_name=template_name)

    stats = queryset.aggregate(
        total_sent=Count("id"),
        delivered=Count("id", filter=Q(delivery_status="DELIVERED")),
        opened=Count("id", filter=Q(is_opened=True)),
        failed=Count("id", filter=Q(delivery_status="FAILED")),
    )

    total = stats["total_sent"] or 1
    stats["delivery_rate"] = round((stats["delivered"] / total) * 100, 2)
    stats["open_rate"] = round((stats["opened"] / total) * 100, 2)
    stats["failure_rate"] = round((stats["failed"] / total) * 100, 2)

    return stats
