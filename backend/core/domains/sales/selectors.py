"""
Read-only query logic for the sales domain.

Selectors contain all read operations (queries, lookups, filtering).
They never mutate data. All functions use keyword-only arguments (*)
for clarity at call sites.

See ADR-002: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

from decimal import Decimal

from core.domains.payments.models import TaxRate


def get_default_tax_rate() -> Decimal:
    """Get tax rate from system default (global TaxRate with is_default=True).

    Returns:
        Default tax rate from TaxRate table, or 0 if none configured.
        TaxRate is the ultimate source of truth — no hardcoded fallback.
    """
    default_tax = TaxRate.objects.filter(is_default=True).first()
    return default_tax.rate if default_tax else Decimal("0")


def get_tax_rate_for_product(*, product: object) -> Decimal:
    """Get appropriate tax rate for a product.

    Logic:
    - If tax-inclusive, return 0 (tax already in price)
    - Otherwise, use global default TaxRate

    Args:
        product: ProductOption instance with is_tax_inclusive field.
    """
    if getattr(product, "is_tax_inclusive", False):
        return Decimal("0")

    return get_default_tax_rate()
