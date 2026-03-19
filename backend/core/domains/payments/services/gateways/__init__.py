# backend/core/domains/payments/services/gateways/__init__.py
"""
Payment gateway package.

Split from payment_gateway_factory.py (1,137 lines) into focused modules:
- base.py: PaymentGatewayResponse + BasePaymentGateway (ABC)
- stripe_gateway.py: Stripe implementation
- paymongo_gateway.py: PayMongo implementation
- factory.py: PaymentGatewayFactory + PayPal stub
"""
from .base import BasePaymentGateway, PaymentGatewayResponse
from .factory import PaymentGatewayFactory
from .paymongo_gateway import PayMongoPaymentGateway
from .stripe_gateway import StripePaymentGateway

__all__ = [
    "BasePaymentGateway",
    "PaymentGatewayFactory",
    "PaymentGatewayResponse",
    "PayMongoPaymentGateway",
    "StripePaymentGateway",
]
