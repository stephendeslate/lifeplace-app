# backend/core/domains/payments/services/payment_gateway_factory.py

import logging
import uuid
from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any

import stripe

logger = logging.getLogger(__name__)


class PaymentGatewayResponse:
    """
    Standardized response from payment gateway operations.

    This provides a consistent interface across all payment gateways.
    """

    def __init__(
        self,
        success: bool,
        transaction_id: str = None,
        status: str = None,
        message: str = None,
        requires_action: bool = False,
        client_secret: str = None,
        response_data: dict = None,
        error_code: str = None,
    ):
        self.success = success
        self.transaction_id = transaction_id
        self.status = status  # PENDING, COMPLETED, FAILED, CANCELLED
        self.message = message
        self.requires_action = requires_action
        self.client_secret = client_secret
        self.response_data = response_data or {}
        self.error_code = error_code

    def to_dict(self) -> dict[str, Any]:
        """Convert response to dictionary for API serialization"""
        return {
            "success": self.success,
            "transaction_id": self.transaction_id,
            "status": self.status,
            "message": self.message,
            "requires_action": self.requires_action,
            "client_secret": self.client_secret,
            "response_data": self.response_data,
            "error_code": self.error_code,
        }


class BasePaymentGateway(ABC):
    """
    Abstract base class for payment gateway implementations.

    All payment gateways must implement these methods to ensure
    consistent behavior across different providers.
    """

    def __init__(self, gateway_config: dict[str, Any]):
        self.config = gateway_config
        self.gateway_code = self.config.get("code")
        self.is_test_mode = self.config.get("test_mode", False)

    @abstractmethod
    def create_payment_intent(
        self, amount: Decimal, currency: str, payment_data: dict[str, Any]
    ) -> PaymentGatewayResponse:
        """
        Create a payment intent for the specified amount.

        Args:
            amount: Payment amount
            currency: Payment currency (ISO 4217 code)
            payment_data: Additional payment data

        Returns:
            PaymentGatewayResponse with payment intent details
        """
        pass

    @abstractmethod
    def confirm_payment(self, transaction_id: str, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        """
        Confirm a payment using the transaction ID.

        Args:
            transaction_id: Gateway transaction identifier
            payment_data: Payment confirmation data

        Returns:
            PaymentGatewayResponse with confirmation results
        """
        pass

    @abstractmethod
    def cancel_payment(self, transaction_id: str, reason: str = None) -> PaymentGatewayResponse:
        """
        Cancel a payment.

        Args:
            transaction_id: Gateway transaction identifier
            reason: Reason for cancellation

        Returns:
            PaymentGatewayResponse with cancellation results
        """
        pass

    @abstractmethod
    def refund_payment(self, transaction_id: str, amount: Decimal = None, reason: str = None) -> PaymentGatewayResponse:
        """
        Refund a payment (full or partial).

        Args:
            transaction_id: Gateway transaction identifier
            amount: Refund amount (None for full refund)
            reason: Reason for refund

        Returns:
            PaymentGatewayResponse with refund results
        """
        pass

    @abstractmethod
    def get_payment_status(self, transaction_id: str) -> PaymentGatewayResponse:
        """
        Get current status of a payment.

        Args:
            transaction_id: Gateway transaction identifier

        Returns:
            PaymentGatewayResponse with current status
        """
        pass

    @abstractmethod
    def save_payment_method(self, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        """
        Save payment method for future use.

        Args:
            payment_data: Payment method data

        Returns:
            PaymentGatewayResponse with saved payment method details
        """
        pass

    @abstractmethod
    def process_webhook(self, webhook_data: dict[str, Any], signature: str = None) -> dict[str, Any]:
        """
        Process webhook from payment gateway.

        Args:
            webhook_data: Webhook payload
            signature: Webhook signature for verification

        Returns:
            Dict with processed webhook information
        """
        pass

    @abstractmethod
    def validate_config(self) -> tuple[bool, list[str]]:
        """
        Validate gateway configuration.

        Returns:
            Tuple of (is_valid, error_messages)
        """
        pass

    def format_amount(self, amount: Decimal, currency: str) -> int:
        """
        Format amount for gateway API (usually cents for most gateways).

        Args:
            amount: Decimal amount
            currency: Currency code

        Returns:
            Integer amount in smallest currency unit
        """
        # Most gateways expect amounts in cents/minor units
        # Some currencies like JPY don't have minor units
        zero_decimal_currencies = [
            "BIF",
            "CLP",
            "DJF",
            "GNF",
            "JPY",
            "KMF",
            "KRW",
            "MGA",
            "PYG",
            "RWF",
            "UGX",
            "VND",
            "VUV",
            "XAF",
            "XOF",
            "XPF",
        ]

        if currency.upper() in zero_decimal_currencies:
            return int(amount)
        else:
            return int(amount * 100)

    def is_healthy(self) -> bool:
        """
        Check if gateway is healthy and operational.

        Returns:
            bool: True if gateway is operational
        """
        try:
            # Override in specific gateway implementations
            return True
        except Exception:
            return False


class StripePaymentGateway(BasePaymentGateway):
    """Stripe payment gateway implementation"""

    def __init__(self, gateway_config: dict[str, Any]):
        super().__init__(gateway_config)
        self._initialize_stripe()

    def _initialize_stripe(self):
        """Initialize Stripe with configuration"""
        stripe.api_key = self.config.get("secret_key")
        self.stripe = stripe

    def create_payment_intent(
        self, amount: Decimal, currency: str, payment_data: dict[str, Any]
    ) -> PaymentGatewayResponse:
        """Create Stripe payment intent"""
        try:
            intent_data = {
                "amount": self.format_amount(amount, currency),
                "currency": currency.lower(),
                "metadata": payment_data.get("metadata", {}),
                "automatic_payment_methods": {"enabled": True},
            }

            # Add customer if provided
            if "customer_id" in payment_data:
                intent_data["customer"] = payment_data["customer_id"]

            # Add payment method if provided
            if "payment_method" in payment_data:
                intent_data["payment_method"] = payment_data["payment_method"]

            # Build an idempotency key from metadata if a payment_id is
            # available (deterministic), otherwise use a UUID so that
            # automatic retries within the same request are still safe.
            metadata = payment_data.get("metadata", {})
            payment_id = metadata.get("payment_id")
            if payment_id:
                idem_key = f"pi_factory_{payment_id}"
            else:
                idem_key = f"pi_factory_{uuid.uuid4().hex}"

            intent = self.stripe.PaymentIntent.create(
                **intent_data,
                idempotency_key=idem_key,
            )

            return PaymentGatewayResponse(
                success=True,
                transaction_id=intent.id,
                status="PENDING",
                client_secret=intent.client_secret,
                response_data={
                    "stripe_intent_id": intent.id,
                    "client_secret": intent.client_secret,
                    "status": intent.status,
                },
            )

        except self.stripe.error.StripeError as e:
            return PaymentGatewayResponse(
                success=False,
                message=str(e),
                error_code=e.code if hasattr(e, "code") else "stripe_error",
                response_data={"stripe_error": str(e)},
            )

    def confirm_payment(self, transaction_id: str, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        """Confirm Stripe payment"""
        try:
            intent = self.stripe.PaymentIntent.retrieve(transaction_id)

            if intent.status == "succeeded":
                return PaymentGatewayResponse(
                    success=True,
                    transaction_id=transaction_id,
                    status="COMPLETED",
                    message="Payment completed successfully",
                )
            elif intent.status == "requires_action":
                return PaymentGatewayResponse(
                    success=True,
                    transaction_id=transaction_id,
                    status="PENDING",
                    requires_action=True,
                    client_secret=intent.client_secret,
                    message="Payment requires additional authentication",
                )
            else:
                return PaymentGatewayResponse(
                    success=False,
                    transaction_id=transaction_id,
                    status="FAILED",
                    message=f"Payment failed with status: {intent.status}",
                )

        except self.stripe.error.StripeError as e:
            return PaymentGatewayResponse(
                success=False, transaction_id=transaction_id, message=str(e), error_code="stripe_error"
            )

    def cancel_payment(self, transaction_id: str, reason: str = None) -> PaymentGatewayResponse:
        """Cancel Stripe payment"""
        try:
            self.stripe.PaymentIntent.cancel(
                transaction_id, cancellation_reason=reason or "requested_by_customer"
            )

            return PaymentGatewayResponse(
                success=True,
                transaction_id=transaction_id,
                status="CANCELLED",
                message="Payment cancelled successfully",
            )

        except self.stripe.error.StripeError as e:
            return PaymentGatewayResponse(
                success=False, transaction_id=transaction_id, message=str(e), error_code="stripe_error"
            )

    def refund_payment(self, transaction_id: str, amount: Decimal = None, reason: str = None) -> PaymentGatewayResponse:
        """Refund Stripe payment"""
        try:
            refund_data = {"payment_intent": transaction_id}

            if amount:
                # Get the original intent to determine currency
                intent = self.stripe.PaymentIntent.retrieve(transaction_id)
                refund_data["amount"] = self.format_amount(amount, intent.currency)

            if reason:
                refund_data["reason"] = reason

            # Idempotency key for refunds: use the payment intent ID and
            # formatted amount so that retries of the same refund request
            # don't create duplicate refunds.
            amount_key = refund_data.get("amount", "full")
            idem_key = f"ref_factory_{transaction_id}_{amount_key}"

            refund = self.stripe.Refund.create(
                **refund_data,
                idempotency_key=idem_key,
            )

            return PaymentGatewayResponse(
                success=True,
                transaction_id=refund.id,
                status="COMPLETED",
                message="Refund processed successfully",
                response_data={"refund_id": refund.id},
            )

        except self.stripe.error.StripeError as e:
            return PaymentGatewayResponse(success=False, message=str(e), error_code="stripe_error")

    def get_payment_status(self, transaction_id: str) -> PaymentGatewayResponse:
        """Get Stripe payment status"""
        try:
            intent = self.stripe.PaymentIntent.retrieve(transaction_id)

            status_mapping = {
                "succeeded": "COMPLETED",
                "canceled": "CANCELLED",
                "processing": "PROCESSING",
                "requires_payment_method": "PENDING",
                "requires_confirmation": "PENDING",
                "requires_action": "PENDING",
            }

            status = status_mapping.get(intent.status, "UNKNOWN")

            return PaymentGatewayResponse(
                success=True,
                transaction_id=transaction_id,
                status=status,
                response_data={"stripe_status": intent.status, "amount": intent.amount, "currency": intent.currency},
            )

        except self.stripe.error.StripeError as e:
            return PaymentGatewayResponse(success=False, message=str(e), error_code="stripe_error")

    def save_payment_method(self, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        """Save Stripe payment method"""
        try:
            # Create or attach payment method to customer
            customer_id = payment_data.get("customer_id")
            payment_method_id = payment_data.get("payment_method_id")

            if customer_id and payment_method_id:
                payment_method = self.stripe.PaymentMethod.attach(
                    payment_method_id,
                    customer=customer_id,
                    idempotency_key=f"pm_attach_{payment_method_id}_{customer_id}",
                )

                return PaymentGatewayResponse(
                    success=True,
                    message="Payment method saved successfully",
                    response_data={
                        "payment_method_id": payment_method.id,
                        "type": payment_method.type,
                        "card": payment_method.card if payment_method.type == "card" else None,
                    },
                )

        except self.stripe.error.StripeError as e:
            return PaymentGatewayResponse(success=False, message=str(e), error_code="stripe_error")

    def process_webhook(self, webhook_data: dict[str, Any], signature: str = None) -> dict[str, Any]:
        """Process Stripe webhook"""
        try:
            if signature and self.config.get("webhook_secret"):
                event = self.stripe.Webhook.construct_event(webhook_data, signature, self.config.get("webhook_secret"))
            else:
                # For testing without signature verification
                event = webhook_data

            return {
                "success": True,
                "event_type": event.get("type"),
                "event_id": event.get("id"),
                "data": event.get("data", {}),
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def validate_config(self) -> tuple[bool, list[str]]:
        """Validate Stripe configuration"""
        errors = []

        required_fields = ["secret_key", "publishable_key"]
        for field in required_fields:
            if not self.config.get(field):
                errors.append(f"Missing required field: {field}")

        # Test API connection
        try:
            self.stripe.Account.retrieve()
        except Exception as e:
            errors.append(f"Failed to connect to Stripe API: {e}")

        return len(errors) == 0, errors

    def is_healthy(self) -> bool:
        """Check Stripe gateway health"""
        try:
            self.stripe.Account.retrieve()
            return True
        except Exception:
            return False


class PayPalPaymentGateway(BasePaymentGateway):
    """PayPal payment gateway implementation (placeholder for future implementation)"""

    def create_payment_intent(
        self, amount: Decimal, currency: str, payment_data: dict[str, Any]
    ) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False, message="PayPal integration not yet implemented", error_code="not_implemented"
        )

    def confirm_payment(self, transaction_id: str, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False, message="PayPal integration not yet implemented", error_code="not_implemented"
        )

    def cancel_payment(self, transaction_id: str, reason: str = None) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False, message="PayPal integration not yet implemented", error_code="not_implemented"
        )

    def refund_payment(self, transaction_id: str, amount: Decimal = None, reason: str = None) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False, message="PayPal integration not yet implemented", error_code="not_implemented"
        )

    def get_payment_status(self, transaction_id: str) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False, message="PayPal integration not yet implemented", error_code="not_implemented"
        )

    def save_payment_method(self, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False, message="PayPal integration not yet implemented", error_code="not_implemented"
        )

    def process_webhook(self, webhook_data: dict[str, Any], signature: str = None) -> dict[str, Any]:
        return {"success": False, "error": "PayPal integration not yet implemented"}

    def validate_config(self) -> tuple[bool, list[str]]:
        return False, ["PayPal integration not yet implemented"]


class PayMongoPaymentGateway(BasePaymentGateway):
    """
    PayMongo payment gateway implementation.

    Supports Philippine payment methods including:
    - Credit/Debit Cards
    - GCash
    - GrabPay
    - Maya (PayMaya)
    - Bank transfers (BPI, UnionBank, etc.)

    API Documentation: https://developers.paymongo.com/
    """

    PAYMONGO_API_BASE = "https://api.paymongo.com/v1"

    # Supported payment method types
    SUPPORTED_METHODS = [
        "card",
        "gcash",
        "grab_pay",
        "paymaya",
        "dob",  # Direct Online Banking
        "dob_ubp",  # UnionBank
        "dob_bpi",  # BPI
        "billease",
    ]

    def __init__(self, gateway_config: dict[str, Any]):
        super().__init__(gateway_config)
        self._initialize_paymongo()

    def _initialize_paymongo(self):
        """Initialize PayMongo with configuration"""
        import base64

        self.secret_key = self.config.get("secret_key", "")
        self.public_key = self.config.get("public_key", "")
        # PayMongo uses Basic auth with secret key as username
        auth_string = f"{self.secret_key}:"
        self.auth_header = base64.b64encode(auth_string.encode()).decode()

    def _make_request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Make authenticated request to PayMongo API"""
        import requests

        url = f"{self.PAYMONGO_API_BASE}{endpoint}"
        headers = {
            "Authorization": f"Basic {self.auth_header}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"PayMongo API request failed: {e}")
            raise

    def create_payment_intent(
        self, amount: Decimal, currency: str, payment_data: dict[str, Any]
    ) -> PaymentGatewayResponse:
        """Create PayMongo payment intent"""
        try:
            # PayMongo expects amount in centavos for PHP
            formatted_amount = self.format_amount(amount, currency)

            # Determine payment method types to allow
            payment_method_types = payment_data.get("payment_method_types", ["card", "gcash", "grab_pay", "paymaya"])

            intent_data = {
                "data": {
                    "attributes": {
                        "amount": formatted_amount,
                        "currency": currency.upper(),
                        "payment_method_allowed": payment_method_types,
                        "capture_type": "automatic",
                        "description": payment_data.get("description", "Payment"),
                        "metadata": payment_data.get("metadata", {}),
                    }
                }
            }

            # Add statement descriptor if provided
            if "statement_descriptor" in payment_data:
                intent_data["data"]["attributes"]["statement_descriptor"] = payment_data["statement_descriptor"]

            response = self._make_request("POST", "/payment_intents", intent_data)

            intent = response.get("data", {})
            attributes = intent.get("attributes", {})

            return PaymentGatewayResponse(
                success=True,
                transaction_id=intent.get("id"),
                status="PENDING",
                client_secret=attributes.get("client_key"),
                response_data={
                    "paymongo_intent_id": intent.get("id"),
                    "client_key": attributes.get("client_key"),
                    "status": attributes.get("status"),
                    "payment_method_allowed": attributes.get("payment_method_allowed", []),
                },
            )

        except Exception as e:
            logger.error(f"PayMongo create_payment_intent failed: {e}")
            return PaymentGatewayResponse(
                success=False, message=str(e), error_code="paymongo_error", response_data={"error": str(e)}
            )

    def confirm_payment(self, transaction_id: str, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        """Confirm PayMongo payment by attaching payment method"""
        try:
            # If payment_method_id is provided, attach it to the payment intent
            payment_method_id = payment_data.get("payment_method_id")

            if payment_method_id:
                # Attach payment method to payment intent
                attach_data = {
                    "data": {
                        "attributes": {
                            "payment_method": payment_method_id,
                            "client_key": payment_data.get("client_key"),
                        }
                    }
                }

                # Add return URL for redirect-based payment methods (GCash, GrabPay, etc.)
                if "return_url" in payment_data:
                    attach_data["data"]["attributes"]["return_url"] = payment_data["return_url"]

                response = self._make_request("POST", f"/payment_intents/{transaction_id}/attach", attach_data)
            else:
                # Just retrieve the current status
                response = self._make_request("GET", f"/payment_intents/{transaction_id}")

            intent = response.get("data", {})
            attributes = intent.get("attributes", {})
            status = attributes.get("status")

            # Map PayMongo status to internal status
            if status == "succeeded":
                return PaymentGatewayResponse(
                    success=True,
                    transaction_id=transaction_id,
                    status="COMPLETED",
                    message="Payment completed successfully",
                )
            elif status == "awaiting_next_action":
                next_action = attributes.get("next_action", {})
                return PaymentGatewayResponse(
                    success=True,
                    transaction_id=transaction_id,
                    status="PENDING",
                    requires_action=True,
                    client_secret=attributes.get("client_key"),
                    message="Payment requires additional action",
                    response_data={
                        "next_action": next_action,
                        "redirect_url": next_action.get("redirect", {}).get("url"),
                    },
                )
            elif status == "processing":
                return PaymentGatewayResponse(
                    success=True,
                    transaction_id=transaction_id,
                    status="PROCESSING",
                    message="Payment is being processed",
                )
            elif status in ["awaiting_payment_method"]:
                return PaymentGatewayResponse(
                    success=True,
                    transaction_id=transaction_id,
                    status="PENDING",
                    client_secret=attributes.get("client_key"),
                    message="Awaiting payment method",
                )
            else:
                return PaymentGatewayResponse(
                    success=False,
                    transaction_id=transaction_id,
                    status="FAILED",
                    message=f"Payment failed with status: {status}",
                )

        except Exception as e:
            logger.error(f"PayMongo confirm_payment failed: {e}")
            return PaymentGatewayResponse(
                success=False, transaction_id=transaction_id, message=str(e), error_code="paymongo_error"
            )

    def cancel_payment(self, transaction_id: str, reason: str = None) -> PaymentGatewayResponse:
        """Cancel PayMongo payment intent"""
        try:
            # PayMongo doesn't have a direct cancel endpoint for payment intents
            # that are in awaiting_payment_method status - they just expire
            # For intents with attached payment methods, we can try to cancel

            response = self._make_request("GET", f"/payment_intents/{transaction_id}")
            intent = response.get("data", {})
            attributes = intent.get("attributes", {})
            status = attributes.get("status")

            if status in ["awaiting_payment_method", "awaiting_next_action"]:
                # Intent can be considered cancelled if we don't complete it
                return PaymentGatewayResponse(
                    success=True,
                    transaction_id=transaction_id,
                    status="CANCELLED",
                    message="Payment intent cancelled (abandoned)",
                )
            elif status == "succeeded":
                return PaymentGatewayResponse(
                    success=False,
                    transaction_id=transaction_id,
                    message="Cannot cancel a succeeded payment. Use refund instead.",
                    error_code="already_succeeded",
                )
            else:
                return PaymentGatewayResponse(
                    success=False,
                    transaction_id=transaction_id,
                    message=f"Cannot cancel payment with status: {status}",
                    error_code="invalid_status",
                )

        except Exception as e:
            logger.error(f"PayMongo cancel_payment failed: {e}")
            return PaymentGatewayResponse(
                success=False, transaction_id=transaction_id, message=str(e), error_code="paymongo_error"
            )

    def refund_payment(self, transaction_id: str, amount: Decimal = None, reason: str = None) -> PaymentGatewayResponse:
        """Refund PayMongo payment"""
        try:
            # First, get the payment intent to find the payment ID
            intent_response = self._make_request("GET", f"/payment_intents/{transaction_id}")
            intent = intent_response.get("data", {})
            attributes = intent.get("attributes", {})
            payments = attributes.get("payments", [])

            if not payments:
                return PaymentGatewayResponse(
                    success=False, message="No payments found for this payment intent", error_code="no_payments"
                )

            # Get the first (usually only) payment
            payment_id = payments[0].get("id")
            payment_amount = payments[0].get("attributes", {}).get("amount")
            currency = attributes.get("currency", "PHP")

            # Calculate refund amount
            if amount:
                refund_amount = self.format_amount(amount, currency)
            else:
                refund_amount = payment_amount  # Full refund

            refund_data = {
                "data": {
                    "attributes": {
                        "amount": refund_amount,
                        "payment_id": payment_id,
                        "reason": reason or "requested_by_customer",
                    }
                }
            }

            response = self._make_request("POST", "/refunds", refund_data)
            refund = response.get("data", {})

            return PaymentGatewayResponse(
                success=True,
                transaction_id=refund.get("id"),
                status="COMPLETED",
                message="Refund processed successfully",
                response_data={
                    "refund_id": refund.get("id"),
                    "payment_id": payment_id,
                },
            )

        except Exception as e:
            logger.error(f"PayMongo refund_payment failed: {e}")
            return PaymentGatewayResponse(success=False, message=str(e), error_code="paymongo_error")

    def get_payment_status(self, transaction_id: str) -> PaymentGatewayResponse:
        """Get PayMongo payment intent status"""
        try:
            response = self._make_request("GET", f"/payment_intents/{transaction_id}")
            intent = response.get("data", {})
            attributes = intent.get("attributes", {})
            status = attributes.get("status")

            status_mapping = {
                "succeeded": "COMPLETED",
                "awaiting_payment_method": "PENDING",
                "awaiting_next_action": "PENDING",
                "processing": "PROCESSING",
            }

            internal_status = status_mapping.get(status, "UNKNOWN")

            return PaymentGatewayResponse(
                success=True,
                transaction_id=transaction_id,
                status=internal_status,
                response_data={
                    "paymongo_status": status,
                    "amount": attributes.get("amount"),
                    "currency": attributes.get("currency"),
                    "payments": attributes.get("payments", []),
                },
            )

        except Exception as e:
            logger.error(f"PayMongo get_payment_status failed: {e}")
            return PaymentGatewayResponse(success=False, message=str(e), error_code="paymongo_error")

    def save_payment_method(self, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        """
        Create a PayMongo payment method.

        Note: PayMongo doesn't support saving payment methods for reuse like Stripe.
        This creates a one-time payment method that must be used immediately.
        """
        try:
            method_type = payment_data.get("type", "card")

            method_data = {
                "data": {
                    "attributes": {
                        "type": method_type,
                    }
                }
            }

            # Add type-specific details
            if method_type == "card":
                card_details = payment_data.get("card", {})
                method_data["data"]["attributes"]["details"] = {
                    "card_number": card_details.get("number"),
                    "exp_month": card_details.get("exp_month"),
                    "exp_year": card_details.get("exp_year"),
                    "cvc": card_details.get("cvc"),
                }

            # Add billing info if provided
            if "billing" in payment_data:
                method_data["data"]["attributes"]["billing"] = payment_data["billing"]

            response = self._make_request("POST", "/payment_methods", method_data)
            pm = response.get("data", {})

            return PaymentGatewayResponse(
                success=True,
                message="Payment method created successfully",
                response_data={
                    "payment_method_id": pm.get("id"),
                    "type": pm.get("attributes", {}).get("type"),
                },
            )

        except Exception as e:
            logger.error(f"PayMongo save_payment_method failed: {e}")
            return PaymentGatewayResponse(success=False, message=str(e), error_code="paymongo_error")

    def process_webhook(self, webhook_data: dict[str, Any], signature: str = None) -> dict[str, Any]:
        """Process PayMongo webhook"""
        try:
            # Verify webhook signature if secret is configured
            webhook_secret = self.config.get("webhook_secret")

            if signature and webhook_secret:
                # PayMongo uses HMAC-SHA256 for webhook signatures
                import hashlib
                import hmac

                # The signature format is: t=timestamp,te=test_mode,li=live_mode
                # We need to verify the appropriate one based on our mode
                parts = dict(part.split("=") for part in signature.split(","))
                timestamp = parts.get("t", "")

                # Compute expected signature
                payload = (
                    f"{timestamp}.{webhook_data}"
                    if isinstance(webhook_data, str)
                    else f"{timestamp}.{webhook_data!s}"
                )
                expected_sig = hmac.new(webhook_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

                mode_key = "te" if self.is_test_mode else "li"
                actual_sig = parts.get(mode_key, "")

                if not hmac.compare_digest(expected_sig, actual_sig):
                    return {"success": False, "error": "Invalid webhook signature"}

            # Parse webhook data
            if isinstance(webhook_data, str):
                import json

                webhook_data = json.loads(webhook_data)

            event_data = webhook_data.get("data", {})
            event_type = event_data.get("attributes", {}).get("type")

            return {
                "success": True,
                "event_type": event_type,
                "event_id": event_data.get("id"),
                "data": event_data.get("attributes", {}).get("data", {}),
            }

        except Exception as e:
            logger.error(f"PayMongo process_webhook failed: {e}")
            return {"success": False, "error": str(e)}

    def validate_config(self) -> tuple[bool, list[str]]:
        """Validate PayMongo configuration"""
        errors = []

        required_fields = ["secret_key", "public_key"]
        for field in required_fields:
            if not self.config.get(field):
                errors.append(f"Missing required field: {field}")

        # Test API connection
        if not errors:
            try:
                # Try to list payment intents as a health check
                self._make_request("GET", "/payment_intents?limit=1")
            except Exception as e:
                errors.append(f"Failed to connect to PayMongo API: {e}")

        return len(errors) == 0, errors

    def is_healthy(self) -> bool:
        """Check PayMongo gateway health"""
        try:
            self._make_request("GET", "/payment_intents?limit=1")
            return True
        except Exception:
            return False


class PaymentGatewayFactory:
    """
    Factory for creating payment gateway instances.

    This factory provides a centralized way to create and manage
    payment gateway instances with proper configuration.
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

        # Return cached instance if available
        if gateway_code in cls._gateway_cache:
            return cls._gateway_cache[gateway_code]

        # Get gateway configuration
        gateway_config = cls._get_gateway_config(gateway_code)

        if not gateway_config:
            raise ValueError(f"No configuration found for gateway: {gateway_code}")

        # Get gateway class
        gateway_class = cls._gateway_classes.get(gateway_code)
        if not gateway_class:
            raise ValueError(f"Unsupported gateway: {gateway_code}")

        # Create gateway instance
        gateway = gateway_class(gateway_config)

        # Validate configuration
        is_valid, errors = gateway.validate_config()
        if not is_valid:
            raise ValueError(f"Invalid gateway configuration for {gateway_code}: {errors}")

        # Cache the instance
        cls._gateway_cache[gateway_code] = gateway

        logger.info(f"Created payment gateway instance for {gateway_code}")
        return gateway

    @classmethod
    def get_available_gateways(cls) -> list[str]:
        """
        Get list of available payment gateways.

        Returns:
            List of gateway codes
        """
        from ..models import PaymentGateway

        # Get active gateways from database
        active_gateways = PaymentGateway.objects.filter(is_active=True).values_list("code", flat=True)

        # Return only gateways that have implementations
        return [gateway_code for gateway_code in active_gateways if gateway_code in cls._gateway_classes]

    @classmethod
    def get_healthy_gateways(cls) -> list[str]:
        """
        Get list of healthy payment gateways.

        Returns:
            List of gateway codes that are operational
        """
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
        """
        Get the primary payment gateway.

        Returns:
            Primary gateway code
        """
        healthy_gateways = cls.get_healthy_gateways()

        if not healthy_gateways:
            raise ValueError("No healthy payment gateways available")

        # Return first healthy gateway (could be enhanced with priority logic)
        return healthy_gateways[0]

    @classmethod
    def _get_gateway_config(cls, gateway_code: str) -> dict[str, Any] | None:
        """
        Get configuration for a payment gateway.

        Args:
            gateway_code: Gateway identifier

        Returns:
            Gateway configuration dictionary or None
        """
        try:
            from ..models import PaymentGateway

            gateway = PaymentGateway.objects.get(code=gateway_code, is_active=True)
            config = gateway.get_decrypted_config()
            config["code"] = gateway.code
            config["test_mode"] = config.get("test_mode", False)

            return config

        except PaymentGateway.DoesNotExist:
            logger.error(f"Gateway configuration not found for {gateway_code}")
            return None

    @classmethod
    def register_gateway_class(cls, gateway_code: str, gateway_class: type):
        """
        Register a new gateway class.

        Args:
            gateway_code: Gateway identifier
            gateway_class: Gateway class implementing BasePaymentGateway
        """
        if not issubclass(gateway_class, BasePaymentGateway):
            raise ValueError("Gateway class must inherit from BasePaymentGateway")

        cls._gateway_classes[gateway_code] = gateway_class
        logger.info(f"Registered gateway class for {gateway_code}")

    @classmethod
    def clear_cache(cls):
        """Clear the gateway cache."""
        cls._gateway_cache.clear()
        logger.info("Cleared payment gateway cache")
