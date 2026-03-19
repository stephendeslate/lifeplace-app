# backend/core/domains/payments/services/gateways/paymongo_gateway.py
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
import logging
from decimal import Decimal
from typing import Any

from .base import BasePaymentGateway, PaymentGatewayResponse

logger = logging.getLogger(__name__)


class PayMongoPaymentGateway(BasePaymentGateway):
    """PayMongo payment gateway implementation."""

    PAYMONGO_API_BASE = "https://api.paymongo.com/v1"

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
        """Initialize PayMongo with configuration."""
        import base64

        self.secret_key = self.config.get("secret_key", "")
        self.public_key = self.config.get("public_key", "")
        auth_string = f"{self.secret_key}:"
        self.auth_header = base64.b64encode(auth_string.encode()).decode()

    def _make_request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Make authenticated request to PayMongo API."""
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
        """Create PayMongo payment intent."""
        try:
            formatted_amount = self.format_amount(amount, currency)
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
        """Confirm PayMongo payment by attaching payment method."""
        try:
            payment_method_id = payment_data.get("payment_method_id")

            if payment_method_id:
                attach_data = {
                    "data": {
                        "attributes": {
                            "payment_method": payment_method_id,
                            "client_key": payment_data.get("client_key"),
                        }
                    }
                }

                if "return_url" in payment_data:
                    attach_data["data"]["attributes"]["return_url"] = payment_data["return_url"]

                response = self._make_request("POST", f"/payment_intents/{transaction_id}/attach", attach_data)
            else:
                response = self._make_request("GET", f"/payment_intents/{transaction_id}")

            intent = response.get("data", {})
            attributes = intent.get("attributes", {})
            status = attributes.get("status")

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
        """Cancel PayMongo payment intent."""
        try:
            response = self._make_request("GET", f"/payment_intents/{transaction_id}")
            intent = response.get("data", {})
            attributes = intent.get("attributes", {})
            status = attributes.get("status")

            if status in ["awaiting_payment_method", "awaiting_next_action"]:
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
        """Refund PayMongo payment."""
        try:
            intent_response = self._make_request("GET", f"/payment_intents/{transaction_id}")
            intent = intent_response.get("data", {})
            attributes = intent.get("attributes", {})
            payments = attributes.get("payments", [])

            if not payments:
                return PaymentGatewayResponse(
                    success=False, message="No payments found for this payment intent", error_code="no_payments"
                )

            payment_id = payments[0].get("id")
            payment_amount = payments[0].get("attributes", {}).get("amount")
            currency = attributes.get("currency", "PHP")

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
        """Get PayMongo payment intent status."""
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

            if method_type == "card":
                card_details = payment_data.get("card", {})
                method_data["data"]["attributes"]["details"] = {
                    "card_number": card_details.get("number"),
                    "exp_month": card_details.get("exp_month"),
                    "exp_year": card_details.get("exp_year"),
                    "cvc": card_details.get("cvc"),
                }

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
        """Process PayMongo webhook."""
        try:
            webhook_secret = self.config.get("webhook_secret")

            if signature and webhook_secret:
                import hashlib
                import hmac

                parts = dict(part.split("=") for part in signature.split(","))
                timestamp = parts.get("t", "")

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
        """Validate PayMongo configuration."""
        errors = []

        required_fields = ["secret_key", "public_key"]
        for field in required_fields:
            if not self.config.get(field):
                errors.append(f"Missing required field: {field}")

        if not errors:
            try:
                self._make_request("GET", "/payment_intents?limit=1")
            except Exception as e:
                errors.append(f"Failed to connect to PayMongo API: {e}")

        return len(errors) == 0, errors

    def is_healthy(self) -> bool:
        """Check PayMongo gateway health."""
        try:
            self._make_request("GET", "/payment_intents?limit=1")
            return True
        except Exception:
            return False
