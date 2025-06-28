# backend/core/domains/analytics/signals/__init__.py
"""
Analytics signals for tracking business events across the application.

This module contains signal handlers that automatically track various events
throughout the system for analytics and reporting purposes.
"""

# Import all signal modules to ensure they are registered
from . import (
    booking_signals,
    communication_signals,
    contract_signals,
    event_signals,
    payment_signals,
    sales_signals,
    setup_signals,
    system_signals,
    user_signals,
    workflow_signals,
)

__all__ = [
    'booking_signals',
    'communication_signals',
    'contract_signals',
    'event_signals',
    'payment_signals',
    'sales_signals',
    'setup_signals',
    'system_signals',
    'user_signals',
    'workflow_signals',
]