# backend/core/domains/analytics/signals/__init__.py
"""
Analytics domain signals package

This package contains all signal handlers for the analytics domain,
organized by source domain for better maintainability.
"""

# Import all signal modules to ensure they're registered
from . import (
    setup_signals,
    event_signals,
    payment_signals,
    booking_signals,
    user_signals,
    communication_signals,
    sales_signals,
    contract_signals,
    workflow_signals,
    system_signals,
)

__all__ = [
    'setup_signals',
    'event_signals',
    'payment_signals',
    'booking_signals',
    'user_signals',
    'communication_signals',
    'sales_signals',
    'contract_signals',
    'workflow_signals',
    'system_signals',
]