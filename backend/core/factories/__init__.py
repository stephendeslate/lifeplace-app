"""
Centralized test factories for the LifePlace backend.

All factories are registered with pytest-factoryboy in core/conftest.py,
making them available as fixtures (e.g., user_factory, event_factory).
"""

from .users import UserFactory, UserProfileFactory, AdminInvitationFactory
from .events import EventFactory, EventTypeFactory
from .payments import (
    PaymentFactory,
    PaymentGatewayFactory,
    PaymentMethodFactory,
    InvoiceFactory,
)

__all__ = [
    # Users
    'UserFactory',
    'UserProfileFactory',
    'AdminInvitationFactory',
    # Events
    'EventFactory',
    'EventTypeFactory',
    # Payments
    'PaymentFactory',
    'PaymentGatewayFactory',
    'PaymentMethodFactory',
    'InvoiceFactory',
]
