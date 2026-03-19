"""
Cross-domain DTOs for the sales domain.

These frozen dataclasses define the data shapes that flow from sales
to other domains (bookingflow). They complement the existing mutable
PricingLineItem and PricingBreakdown dataclasses in pricing_service.py,
which remain mutable due to __post_init__ calculation requirements.

See ADR-002: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

from core.types import DomainDTO


@dataclass(frozen=True)
class QuoteLineItem(DomainDTO):
    """A single line item in a quote, used when creating QuoteLineItem records.

    This mirrors the fields read from PricingLineItem when creating
    quote records in bookingflow/services/quote_creation_service.py.

    Produced by: sales (PricingCalculationService)
    Consumed by: bookingflow (quote_creation_service)
    """

    product_id: int | None
    name: str
    description: str
    quantity: int
    base_unit_price: Decimal
    line_total: Decimal
    tax_rate: Decimal = Decimal("0")
    item_type: str = "PACKAGE"
    pricing_unit: str | None = None
    excess_hours: int | None = None
    excess_hour_price: Decimal | None = None
    excess_cost: Decimal = Decimal("0")


@dataclass(frozen=True)
class PricingBreakdownSummary(DomainDTO):
    """Immutable summary of a pricing calculation for cross-domain use.

    This is the frozen counterpart to PricingBreakdown (in pricing_service.py).
    Use when passing pricing results across domain boundaries.

    Produced by: sales (PricingCalculationService)
    Consumed by: bookingflow (payment_processing_service, quote_creation_service)
    """

    subtotal: Decimal
    discount_amount: Decimal = Decimal("0")
    vip_discount_amount: Decimal = Decimal("0")
    service_charge_amount: Decimal = Decimal("0")
    tax_amount: Decimal = Decimal("0")
    tax_rate: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    line_items: tuple[QuoteLineItem, ...] = field(default_factory=tuple)
    discount_error: str | None = None
    discount_error_type: str | None = None
