"""
Cross-domain DTOs for the bookingflow domain.

These frozen dataclasses define the data shapes that flow from bookingflow
to other domains (payments, events). They replace raw dicts at domain
boundaries, providing type safety and self-documenting interfaces.

See ADR-002: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal

from core.types import DomainDTO


@dataclass(frozen=True)
class BookingPaymentIntent(DomainDTO):
    """Data sent from bookingflow to payments when creating a payment.

    Produced by: bookingflow/services/payment_processing_service.py
    Consumed by: payments/services/payment_service.py (create_payment)
    """

    event_id: int
    amount: Decimal
    description: str
    due_date: date | None = None
    is_manual: bool = False
    currency: str = "PHP"
    status: str = "PENDING"


@dataclass(frozen=True)
class BookingGatewayData(DomainDTO):
    """Gateway-specific data sent with a payment processing request.

    Produced by: bookingflow/services/payment_processing_service.py
    Consumed by: payments/services/gateway_service.py
    """

    gateway_id: int
    amount: Decimal
    currency: str = "PHP"
    description: str = ""
    is_test: bool = False
    client_email: str = ""
    client_name: str = ""
    invoice_id: str | None = None
    event_id: int | None = None
    payment_method_token: str | None = None
    payment_method_id: str | None = None
    payment_method: int | None = None
    billing_address: dict | None = None


@dataclass(frozen=True)
class BookingProductSelection(DomainDTO):
    """A product selected during booking, sent to events for EventProductOption creation.

    Produced by: bookingflow/services/event_creation_service.py (extract_event_products)
    Consumed by: events/services/event_services.py (create_event)
    """

    product_option_id: int
    quantity: int
    final_price: Decimal
    num_participants: int | None = None
    num_nights: int | None = None
    excess_hours: int | None = None


@dataclass(frozen=True)
class BookingEventData(DomainDTO):
    """Event creation data assembled from booking session steps.

    Produced by: bookingflow/services/event_creation_service.py
    Consumed by: events/services/event_services.py (create_event)

    Note: client, event_type, workflow_template, and venue are model instances
    passed as object references (not serialized). The DTO documents the shape
    but these fields use `object` type to avoid circular imports.
    """

    client: object  # User model instance
    event_type: object  # EventType model instance
    name: str
    status: str = "LEAD"
    completion_type: str = ""
    total_price: Decimal = Decimal("0")
    start_date: datetime | None = None
    end_date: datetime | None = None
    guest_count: int | None = None
    description: str = ""
    workflow_template: object | None = None  # WorkflowTemplate instance
    venue: object | None = None  # Venue instance
    scheduled_check_in_time: datetime | None = None
    scheduled_checkout_time: datetime | None = None
    event_products: list[BookingProductSelection] = field(default_factory=list)
