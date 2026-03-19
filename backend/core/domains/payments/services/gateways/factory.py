# backend/core/domains/payments/services/gateways/factory.py
"""
Payment gateway factory and PayPal stub.
"""
import logging
from decimal import Decimal
from typing import Any

from .base import BasePaymentGateway, PaymentGatewayResponse
from .paymongo_gateway import PayMongoPaymentGateway
from .stripe_gateway import StripePaymentGateway

logger = logging.getLogger(__name__)


class PayPalPaymentGateway(BasePaymentGateway):
    """PayPal gateway stub — not yet implemented."""

    def create_payment_intent(
        self, amount: Decimal, currency: str, payment_data: dict[str, Any]
    ) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False, message="PayPal gateway is not yet implemented", error_code="not_implemented"
        )

    def confirm_payment(self, transaction_id: str, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False, message="PayPal gateway is not yet implemented", error_code="not_implemented"
        )

    def cancel_payment(self, transaction_id: str, reason: str = None) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False, message="PayPal gateway is not yet implemented", error_code="not_implemented"
        )

    def refund_payment(self, transaction_id: str, amount: Decimal = None, reason: str = None) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False, message="PayPal gateway is not yet implemented", error_code="not_implemented"
        )

    def get_payment_status(self, transaction_id: str) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False, message="PayPal gateway is not yet implemented", error_code="not_implemented"
        )

    def save_payment_method(self, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False, message="PayPal gateway is not yet implemented", error_code="not_implemented"
        )

    def process_webhook(self, webhook_data: dict[str, Any], signature: str = None) -> dict[str, Any]:
        return {"success": False, "error": "PayPal gateway is not yet implemented"}

    def validate_config(self) -> tuple[bool, list[str]]:
        return False, ["PayPal gateway is not yet implemented"]


class PaymentGatewayFactory:
    """
    Factory for creating payment gateway instances.

    Provides a centralized way to create and manage payment gateway
    instances with proper configuration and caching.
    """

    _gateway_classes = {
        "stripe": StripePaymentGateway,
        "paypal": PayPalPaymentGateway,
        "paymongo": PayMongoPaymentGateway,
    }

    _gateway_cache = {}

    @classmethod
    def create_gateway(cls, gateway_code: str, force_refresh: bool = False) -> BasePaymentGateway:
        """
        Create a payment gateway instance.

        Args:
            gateway_code: Gateway identifier (stripe, paypal, etc.)
            force_refresh: Force refresh of cached gateway

        Returns:
            BasePaymentGateway instance

        Raises:
            ValueError: If gateway is not supported or configuration is invalid
        """
        if force_refresh and gateway_code in cls._gateway_cache:
            del cls._gateway_cache[gateway_code]

        if gateway_code in cls._gateway_cache:
            return cls._gateway_cache[gateway_code]

        gateway_config = cls._get_gateway_config(gateway_code)

        if not gateway_config:
            raise ValueError(f"No configuration found for gateway: {gateway_code}")

        gateway_class = cls._gateway_classes.get(gateway_code)
        if not gateway_class:
            raise ValueError(f"Unsupported gateway: {gateway_code}")

        gateway = gateway_class(gateway_config)

        is_valid, errors = gateway.validate_config()
        if not is_valid:
            raise ValueError(f"Invalid gateway configuration for {gateway_code}: {errors}")

        cls._gateway_cache[gateway_code] = gateway

        logger.info(f"Created payment gateway instance for {gateway_code}")
        return gateway

    @classmethod
    def get_available_gateways(cls) -> list[str]:
        """Get list of available payment gateways."""
        from ...models import PaymentGateway

        active_gateways = PaymentGateway.objects.filter(is_active=True).values_list("code", flat=True)
        return [gateway_code for gateway_code in active_gateways if gateway_code in cls._gateway_classes]

    @classmethod
    def get_healthy_gateways(cls) -> list[str]:
        """Get list of healthy payment gateways."""
        healthy_gateways = []

        for gateway_code in cls.get_available_gateways():
            try:
                gateway = cls.create_gateway(gateway_code)
                if gateway.is_healthy():
                    healthy_gateways.append(gateway_code)
            except Exception as e:
                logger.warning(f"Gateway {gateway_code} is not healthy: {e}")

        return healthy_gateways

    @classmethod
    def get_primary_gateway(cls) -> str:
        """Get the primary payment gateway."""
        healthy_gateways = cls.get_healthy_gateways()

        if not healthy_gateways:
            raise ValueError("No healthy payment gateways available")

        return healthy_gateways[0]

    @classmethod
    def _get_gateway_config(cls, gateway_code: str) -> dict[str, Any] | None:
        """Get configuration for a payment gateway."""
        try:
            from ...models import PaymentGateway

            gateway = PaymentGateway.objects.get(code=gateway_code, is_active=True)
            config = gateway.get_decrypted_config()
            config["code"] = gateway.code
            config["test_mode"] = config.get("test_mode", False)

            return config

        except Exception:
            logger.error(f"Gateway configuration not found for {gateway_code}")
            return None

    @classmethod
    def register_gateway_class(cls, gateway_code: str, gateway_class: type):
        """Register a new gateway class."""
        if not issubclass(gateway_class, BasePaymentGateway):
            raise ValueError("Gateway class must inherit from BasePaymentGateway")

        cls._gateway_classes[gateway_code] = gateway_class
        logger.info(f"Registered gateway class for {gateway_code}")

    @classmethod
    def clear_cache(cls):
        """Clear the gateway cache."""
        cls._gateway_cache.clear()
        logger.info("Cleared payment gateway cache")
