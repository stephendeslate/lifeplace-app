# backend/core/domains/sales/pricing_service/__init__.py
"""
Backward-compatibility shim.

All classes have moved to submodules. This module re-exports
them so existing imports continue to work unchanged.

Original: 823 lines → split into pricing_service/{tax_utils,models,calculation_service}.py
"""
from .calculation_service import PricingCalculationService  # noqa: F401
from .models import PricingBreakdown, PricingLineItem  # noqa: F401
from .tax_utils import get_default_tax_rate, get_tax_rate_for_product  # noqa: F401

__all__ = [
    "PricingLineItem",
    "PricingBreakdown",
    "PricingCalculationService",
    "get_default_tax_rate",
    "get_tax_rate_for_product",
]
