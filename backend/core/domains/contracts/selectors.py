"""
Read-only query logic for the contracts domain.

Selectors contain all read operations (queries, lookups, filtering).
They never mutate data. All functions use keyword-only arguments (*)
for clarity at call sites.

See ADR-002: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

import datetime
import logging
from decimal import Decimal

from django.db import models
from django.db.models import Q, QuerySet
from django.utils import timezone

from .context_service import ContractContextService
from .exceptions import ContractTemplateNotFound, EventContractNotFound
from .models import (
    ContractAmendment,
    ContractDocument,
    ContractNote,
    ContractSignature,
    ContractTemplate,
    EventContract,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# ContractTemplate selectors
# ---------------------------------------------------------------------------


def get_all_templates(
    *,
    search_query: str | None = None,
    event_type_id: int | None = None,
    is_active: bool | None = True,
) -> QuerySet[ContractTemplate]:
    """Get all contract templates with optional filtering.

    Args:
        search_query: Search term for name/description.
        event_type_id: Filter by event type.
        is_active: Filter by active status (defaults to True to hide deactivated templates).
    """
    queryset = ContractTemplate.objects.all()

    # Filter by active status (default: only active templates)
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    # Apply filters if provided
    if search_query:
        queryset = queryset.filter(Q(name__icontains=search_query) | Q(description__icontains=search_query))

    if event_type_id:
        queryset = queryset.filter(event_type_id=event_type_id)

    return queryset.order_by("name")


def get_template_by_id(*, template_id: int) -> ContractTemplate:
    """Get a contract template by ID.

    Args:
        template_id: The template's primary key.

    Raises:
        ContractTemplateNotFound: If the template does not exist.
    """
    try:
        return ContractTemplate.objects.get(id=template_id)
    except ContractTemplate.DoesNotExist:
        raise ContractTemplateNotFound()


def preview_template(
    *,
    template_id: int,
    event_id: int | None = None,
    context_data: dict | None = None,
) -> dict:
    """Preview a contract template with context data.

    Args:
        template_id: ID of the contract template.
        event_id: Optional event ID to generate context from.
        context_data: Dictionary of variable values to insert into the template.

    Returns:
        Dictionary with rendered content and template metadata.
    """
    from .services import ContractTemplateService

    template = get_template_by_id(template_id=template_id)

    # If event_id is provided, generate standardized context
    if event_id:
        try:
            from core.domains.events.models import Event

            event = Event.objects.select_related("client", "event_type").get(id=event_id)
            # Generate standardized context and merge with provided context
            standardized_context = ContractContextService.generate_event_context(event, context_data)
        except Event.DoesNotExist:
            logger.warning(f"Event {event_id} not found for template preview, using provided context only")
            standardized_context = context_data or {}
    else:
        standardized_context = context_data or {}

    # Render the contract content (preview doesn't include signatures)
    rendered_content = ContractTemplateService.render_contract(template_id, standardized_context)

    return {
        "template_id": template.id,
        "template_name": template.name,
        "rendered_content": rendered_content,
        "variables": template.variables,
        "sections": template.sections,
        "event_type": template.event_type.name if template.event_type else None,
        "context_used": standardized_context,
        "available_variables": ContractContextService.get_available_variables(),
    }


# ---------------------------------------------------------------------------
# EventContract selectors
# ---------------------------------------------------------------------------


def get_contracts_for_event(*, event_id: int) -> QuerySet[EventContract]:
    """Get all contracts for a specific event.

    Args:
        event_id: The event's primary key.
    """
    return EventContract.objects.filter(event_id=event_id).order_by("-created_at")


def get_contract_by_id(*, contract_id: int) -> EventContract:
    """Get an event contract by ID.

    Args:
        contract_id: The contract's primary key.

    Raises:
        EventContractNotFound: If the contract does not exist.
    """
    try:
        return EventContract.objects.get(id=contract_id)
    except EventContract.DoesNotExist:
        raise EventContractNotFound()


# ---------------------------------------------------------------------------
# ContractSignature selectors
# ---------------------------------------------------------------------------


def get_signatures_for_contract(*, contract_id: int) -> QuerySet[ContractSignature]:
    """Get all signatures for a contract.

    Args:
        contract_id: The contract's primary key.
    """
    return ContractSignature.objects.filter(contract_id=contract_id).order_by("signed_at")


# ---------------------------------------------------------------------------
# ContractAmendment selectors
# ---------------------------------------------------------------------------


def get_amendments_for_contract(*, contract_id: int) -> QuerySet[ContractAmendment]:
    """Get all amendments for a contract.

    Args:
        contract_id: The contract's primary key.
    """
    return ContractAmendment.objects.filter(original_contract_id=contract_id).order_by("-requested_at")


# ---------------------------------------------------------------------------
# ContractDocument selectors
# ---------------------------------------------------------------------------


def get_documents_for_contract(*, contract_id: int) -> QuerySet[ContractDocument]:
    """Get all active documents for a contract.

    Args:
        contract_id: The contract's primary key.
    """
    return ContractDocument.objects.filter(contract_id=contract_id, is_active=True).order_by(
        "document_type", "name"
    )


# ---------------------------------------------------------------------------
# ContractNote selectors
# ---------------------------------------------------------------------------


def get_notes_for_contract(
    *,
    contract_id: int,
    include_internal: bool = True,
) -> QuerySet[ContractNote]:
    """Get notes for a contract.

    Args:
        contract_id: The contract's primary key.
        include_internal: Whether to include internal notes (defaults to True).
    """
    queryset = ContractNote.objects.filter(contract_id=contract_id)

    if not include_internal:
        queryset = queryset.filter(is_internal=False)

    return queryset.order_by("-created_at")


# ---------------------------------------------------------------------------
# ContractReporting selectors
# ---------------------------------------------------------------------------


def get_contract_statistics(
    *,
    event_id: int | None = None,
    date_range: tuple[datetime.date, datetime.date] | None = None,
) -> dict:
    """Get contract statistics.

    Args:
        event_id: Optional event ID to filter by.
        date_range: Optional (start_date, end_date) tuple to filter by creation date.
    """
    queryset = EventContract.objects.all()

    if event_id:
        queryset = queryset.filter(event_id=event_id)

    if date_range:
        start_date, end_date = date_range
        queryset = queryset.filter(created_at__range=[start_date, end_date])

    stats: dict = {
        "total_contracts": queryset.count(),
        "by_status": {},
        "fully_signed": 0,
        "amendments": queryset.filter(is_amendment=True).count(),
        "total_value": Decimal("0.00"),
        "average_signing_time": None,
    }

    # Status breakdown
    for status, _ in EventContract._meta.get_field("status").choices:
        count = queryset.filter(status=status).count()
        stats["by_status"][status] = count

    # Fully signed contracts
    fully_signed_contracts = queryset.filter(status="SIGNED")
    stats["fully_signed"] = fully_signed_contracts.count()

    # Total contract value
    total_value = queryset.filter(contract_value__isnull=False).aggregate(total=models.Sum("contract_value"))[
        "total"
    ]
    if total_value:
        stats["total_value"] = total_value

    # Average signing time (days from sent to fully signed)
    signed_contracts = fully_signed_contracts.filter(sent_at__isnull=False, fully_signed_at__isnull=False)

    if signed_contracts.exists():
        signing_times = []
        for contract in signed_contracts:
            days = (contract.fully_signed_at.date() - contract.sent_at.date()).days
            signing_times.append(days)

        if signing_times:
            stats["average_signing_time"] = sum(signing_times) / len(signing_times)

    return stats


def get_pending_signatures() -> QuerySet[EventContract]:
    """Get contracts with pending signatures."""
    return (
        EventContract.objects.filter(status__in=["SENT", "PARTIALLY_SIGNED"])
        .select_related("event", "template")
        .prefetch_related("signatures")
    )


def get_expiring_contracts(*, days: int = 30) -> QuerySet[EventContract]:
    """Get contracts expiring within specified days.

    Args:
        days: Number of days ahead to check for expiring contracts (default 30).
    """
    cutoff_date = timezone.now().date() + datetime.timedelta(days=days)

    return EventContract.objects.filter(
        valid_until__lte=cutoff_date, status__in=["SENT", "PARTIALLY_SIGNED"]
    ).select_related("event", "template")


def get_amendment_summary() -> dict:
    """Get amendment statistics."""
    amendments = ContractAmendment.objects.all()

    return {
        "total_amendments": amendments.count(),
        "by_status": {
            status: amendments.filter(status=status).count()
            for status, _ in ContractAmendment._meta.get_field("status").choices
        },
        "pending_review": amendments.filter(status="REQUESTED").count(),
        "approved_pending_contract": amendments.filter(status="APPROVED").count(),
        "average_processing_time": None,  # Could calculate this if needed
    }
