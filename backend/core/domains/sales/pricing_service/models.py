# backend/core/domains/sales/pricing_service/models.py
"""
Pricing dataclasses — PricingLineItem and PricingBreakdown.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from core.domains.products.models import Discount


@dataclass
class PricingLineItem:
    """Standardized pricing line item"""

    product_id: int | None
    name: str
    description: str
    quantity: int
    base_unit_price: Decimal
    excess_hours: int | None = None
    excess_hour_price: Decimal | None = None
    excess_cost: Decimal = Decimal("0.00")
    total_unit_price: Decimal = Decimal("0.00")  # base_unit_price + excess per unit
    line_total: Decimal = Decimal("0.00")  # total_unit_price * quantity
    tax_rate: Decimal = Decimal("0.00")
    item_type: str = "PACKAGE"  # 'PACKAGE' or 'ADDON'
    pricing_unit: str | None = None  # 'PER_EVENT', 'PER_PERSON', 'PER_HOUR'
    minimum_guests: int | None = None
    attendee_breakdown: list[dict[str, Any]] | None = field(default=None, repr=False)

    def __post_init__(self):
        """Calculate derived fields after initialization"""
        self.excess_cost = (self.excess_hour_price or Decimal("0")) * (self.excess_hours or 0)
        self.total_unit_price = self.base_unit_price + (self.excess_cost / max(self.quantity, 1))
        self.line_total = self.total_unit_price * self.quantity


@dataclass
class PricingBreakdown:
    """Complete pricing breakdown"""

    line_items: list[PricingLineItem]
    subtotal: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")
    vip_discount_amount: Decimal = Decimal("0.00")
    service_charge_amount: Decimal = Decimal("0.00")
    tax_amount: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("0.00")  # Tax rate as percentage (e.g., 12.00 for 12%)
    total_amount: Decimal = Decimal("0.00")
    applied_discount: Discount | None = None
    applied_vip_benefits: list[str] = None  # List of applied VIP benefit descriptions
    discount_error: str | None = None
    discount_error_type: str | None = None

    def __post_init__(self):
        """Calculate totals from line items"""
        self.subtotal = sum((item.line_total for item in self.line_items), Decimal("0.00"))
        if self.applied_vip_benefits is None:
            self.applied_vip_benefits = []
        # Tax, service charge, and discount calculations happen separately via apply_* methods
        self.total_amount = (
            self.subtotal
            - self.discount_amount
            - self.vip_discount_amount
            + self.service_charge_amount
            + self.tax_amount
        )
