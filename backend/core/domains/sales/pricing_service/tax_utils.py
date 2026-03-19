# backend/core/domains/sales/pricing_service/tax_utils.py
"""
Tax rate utility functions.
"""
from decimal import Decimal

from core.domains.payments.models import TaxRate


def get_default_tax_rate() -> Decimal:
    """
    Get tax rate from system default (global TaxRate with is_default=True).

    Returns:
        Decimal: Default tax rate from TaxRate table, or 0 if none configured.
                 TaxRate is the ultimate source of truth - no hardcoded fallback.
    """
    default_tax = TaxRate.objects.filter(is_default=True).first()
    return default_tax.rate if default_tax else Decimal("0")


def get_tax_rate_for_product(product) -> Decimal:
    """
    Get appropriate tax rate for a product/addon.

    Logic:
    - If tax-inclusive, return 0 (tax already in price)
    - Otherwise, use global default TaxRate

    Args:
        product: ProductOption instance with is_tax_inclusive field

    Returns:
        Decimal: The applicable tax rate percentage (e.g., 12.00 for 12%)
    """
    # If tax is already included in price, no additional tax
    if getattr(product, "is_tax_inclusive", False):
        return Decimal("0")

    # Use global default tax rate
    return get_default_tax_rate()
