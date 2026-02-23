"""
Centralized test factories for the LifePlace backend.

All factories are registered with pytest-factoryboy in core/conftest.py,
making them available as fixtures (e.g., user_factory, event_factory).
"""

from .events import EventFactory, EventTypeFactory
from .payments import (
    InvoiceFactory,
    PaymentFactory,
    PaymentGatewayFactory,
    PaymentMethodFactory,
)
from .users import AdminInvitationFactory, UserFactory, UserProfileFactory

__all__ = [
    "AdminInvitationFactory",
    # Events
    "EventFactory",
    "EventTypeFactory",
    "InvoiceFactory",
    # Payments
    "PaymentFactory",
    "PaymentGatewayFactory",
    "PaymentMethodFactory",
    # Users
    "UserFactory",
    "UserProfileFactory",
]
