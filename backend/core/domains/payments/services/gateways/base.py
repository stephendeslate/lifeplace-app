# backend/core/domains/payments/services/gateways/base.py
"""
Gateway response dataclass and abstract base for all payment gateways.
"""
import logging
from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any

logger = logging.getLogger(__name__)


class PaymentGatewayResponse:
    """
    Standardized response from payment gateway operations.

    Provides a consistent interface for all gateway operations regardless
    of the underlying payment provider.
    """

    def __init__(
        self,
        success: bool,
        transaction_id: str = None,
        status: str = None,
        message: str = None,
        error_code: str = None,
        requires_action: bool = False,
        client_secret: str = None,
        response_data: dict = None,
    ):
        self.success = success
        self.transaction_id = transaction_id
        self.status = status
        self.message = message
        self.error_code = error_code
        self.requires_action = requires_action
        self.client_secret = client_secret
        self.response_data = response_data or {}

    def __repr__(self):
        return (
            f"PaymentGatewayResponse(success={self.success}, "
            f"transaction_id={self.transaction_id}, "
            f"status={self.status})"
        )


class BasePaymentGateway(ABC):
    """
    Abstract base class for payment gateway implementations.

    All payment gateways must implement these methods to ensure
    a consistent interface across different payment providers.
    """

    def __init__(self, gateway_config: dict[str, Any]):
        self.config = gateway_config
        self.gateway_code = gateway_config.get("code", "unknown")
        self.is_test_mode = gateway_config.get("test_mode", False)

    @abstractmethod
    def create_payment_intent(
        self,
        amount: Decimal,
        currency: str,
        payment_data: dict[str, Any],
    ) -> PaymentGatewayResponse:
        """
        Create a payment intent/session.

        Args:
            amount: Payment amount
            currency: Currency code (e.g., 'PHP', 'USD')
            payment_data: Additional payment data

        Returns:
            PaymentGatewayResponse with payment intent details
        """

    @abstractmethod
    def confirm_payment(self, transaction_id: str, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        """
        Confirm a pending payment.

        Args:
            transaction_id: Gateway transaction identifier
            payment_data: Additional confirmation data

        Returns:
            PaymentGatewayResponse with confirmation results
        """

    @abstractmethod
    def cancel_payment(self, transaction_id: str, reason: str = None) -> PaymentGatewayResponse:
        """
        Cancel a pending payment.

        Args:
            transaction_id: Gateway transaction identifier
            reason: Cancellation reason

        Returns:
            PaymentGatewayResponse with cancellation results
        """

    @abstractmethod
    def refund_payment(self, transaction_id: str, amount: Decimal = None, reason: str = None) -> PaymentGatewayResponse:
        """
        Refund a completed payment.

        Args:
            transaction_id: Gateway transaction identifier
            amount: Refund amount (None for full refund)
            reason: Refund reason

        Returns:
            PaymentGatewayResponse with refund results
        """

    @abstractmethod
    def get_payment_status(self, transaction_id: str) -> PaymentGatewayResponse:
        """
        Get current payment status.

        Args:
            transaction_id: Gateway transaction identifier

        Returns:
            PaymentGatewayResponse with current status
        """

    @abstractmethod
    def save_payment_method(self, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        """
        Save a payment method for future use.

        Args:
            payment_data: Payment method details

        Returns:
            PaymentGatewayResponse with saved payment method details
        """

    @abstractmethod
    def process_webhook(self, webhook_data: dict[str, Any], signature: str = None) -> dict[str, Any]:
        """Process incoming webhook from the payment provider."""

    @abstractmethod
    def validate_config(self) -> tuple[bool, list[str]]:
        """Validate gateway configuration. Returns (is_valid, errors)."""

    def format_amount(self, amount: Decimal, currency: str) -> int:
        """
        Format amount for the payment gateway.

        Most gateways expect amounts in the smallest currency unit
        (e.g., cents for USD, centavos for PHP).
        """
        # For zero-decimal currencies, don't multiply
        zero_decimal_currencies = {"JPY", "KRW", "VND"}
        if currency.upper() in zero_decimal_currencies:
            return int(amount)
        return int(amount * 100)

    def is_healthy(self) -> bool:
        """
        Check if the gateway is operational.

        Default implementation tries to validate config.
        Subclasses should override with a proper health check.
        """
        try:
            is_valid, _ = self.validate_config()
            return is_valid
        except Exception:
            return False
