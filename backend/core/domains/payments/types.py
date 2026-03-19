"""
Cross-domain DTOs for the payments domain.

These frozen dataclasses define data shapes that flow from payments to
other domains (events, bookingflow). They complement the existing mutable
dataclasses (PaymentRequest, PaymentResponse) which remain in their
service modules due to __post_init__ mutation requirements.

See ADR-002: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from core.types import DomainDTO


@dataclass(frozen=True)
class PaymentResult(DomainDTO):
    """Immutable result of a payment operation, suitable for cross-domain use.

    This is the frozen counterpart to PaymentResponse (in payment_orchestrator.py).
    Use this when passing payment results across domain boundaries where
    immutability is desired.

    Produced by: payments domain
    Consumed by: bookingflow, events (timeline entries)
    """

    success: bool
    payment_id: int | None = None
    payment_number: str | None = None
    payment_status: str | None = None
    message: str = ""
    transaction_id: str | None = None
    amount: Decimal | None = None
    currency: str = "PHP"
    requires_action: bool = False
    error_code: str | None = None


@dataclass(frozen=True)
class PaymentStatusUpdate(DomainDTO):
    """Data written to EventTimeline when a payment status changes.

    This standardizes the action_data dict that payments writes to
    EventTimeline.objects.create(). Currently used in 7+ locations
    across the payments domain.

    Produced by: payments/services/ (payment_service, invoice_service, refund_service, etc.)
    Consumed by: events (EventTimeline.action_data JSONField)
    """

    payment_id: int
    amount: str  # String representation of Decimal for JSON serialization
    status: str
    timestamp: datetime | None = None
    invoice_id: str | None = None
    refund_id: int | None = None
    dispute_id: str | None = None
    reason: str | None = None
