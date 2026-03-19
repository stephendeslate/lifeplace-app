# backend/core/domains/payments/services/payment_gateway_factory.py
"""
Backward-compatibility shim.

All classes have moved to the gateways/ package. This module re-exports
them so existing imports continue to work unchanged.

Original: 1,137 lines → split into gateways/{base,stripe_gateway,paymongo_gateway,factory}.py
"""
from .gateways import (  # noqa: F401
    BasePaymentGateway,
    PaymentGatewayFactory,
    PaymentGatewayResponse,
    PayMongoPaymentGateway,
    StripePaymentGateway,
)
from .gateways.factory import PayPalPaymentGateway  # noqa: F401

__all__ = [
    "BasePaymentGateway",
    "PaymentGatewayFactory",
    "PaymentGatewayResponse",
    "PayMongoPaymentGateway",
    "PayPalPaymentGateway",
    "StripePaymentGateway",
]
