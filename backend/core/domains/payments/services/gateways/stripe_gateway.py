# backend/core/domains/payments/services/gateways/stripe_gateway.py
"""
Stripe payment gateway implementation.
"""
import logging
import uuid
from decimal import Decimal
from typing import Any

import stripe

from .base import BasePaymentGateway, PaymentGatewayResponse

logger = logging.getLogger(__name__)


class StripePaymentGateway(BasePaymentGateway):
    """Stripe payment gateway implementation."""

    def __init__(self, gateway_config: dict[str, Any]):
        super().__init__(gateway_config)
        stripe.api_key = self.config.get("secret_key", "")

    def create_payment_intent(
        self,
        amount: Decimal,
        currency: str,
        payment_data: dict[str, Any],
    ) -> PaymentGatewayResponse:
        """Create a Stripe payment intent."""
        try:
            formatted_amount = self.format_amount(amount, currency)
            idempotency_key = payment_data.get("idempotency_key", str(uuid.uuid4()))

            intent_params = {
                "amount": formatted_amount,
                "currency": currency.lower(),
                "metadata": payment_data.get("metadata", {}),
                "description": payment_data.get("description", ""),
            }

            if "customer_id" in payment_data:
                intent_params["customer"] = payment_data["customer_id"]
            if "payment_method" in payment_data:
                intent_params["payment_method"] = payment_data["payment_method"]
                intent_params["confirm"] = True

            intent = stripe.PaymentIntent.create(
                **intent_params,
                idempotency_key=idempotency_key,
            )

            return PaymentGatewayResponse(
                success=True,
                transaction_id=intent.id,
                status="PENDING",
                client_secret=intent.client_secret,
                response_data={
                    "stripe_intent_id": intent.id,
                    "status": intent.status,
                },
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe create_payment_intent failed: {e}")
            return PaymentGatewayResponse(
                success=False,
                message=str(e),
                error_code=e.code if hasattr(e, "code") else "stripe_error",
            )

    def confirm_payment(self, transaction_id: str, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        """Confirm a Stripe payment intent."""
        try:
            intent = stripe.PaymentIntent.retrieve(transaction_id)

            if intent.status == "succeeded":
                return PaymentGatewayResponse(
                    success=True,
                    transaction_id=transaction_id,
                    status="COMPLETED",
                )
            elif intent.status == "requires_action":
                return PaymentGatewayResponse(
                    success=True,
                    transaction_id=transaction_id,
                    status="PENDING",
                    requires_action=True,
                    client_secret=intent.client_secret,
                )
            elif intent.status in ["requires_payment_method", "requires_confirmation"]:
                return PaymentGatewayResponse(
                    success=True,
                    transaction_id=transaction_id,
                    status="PENDING",
                    client_secret=intent.client_secret,
                )
            else:
                return PaymentGatewayResponse(
                    success=False,
                    transaction_id=transaction_id,
                    status="FAILED",
                    message=f"Payment failed with status: {intent.status}",
                )
        except stripe.error.StripeError as e:
            return PaymentGatewayResponse(success=False, transaction_id=transaction_id, message=str(e))

    def cancel_payment(self, transaction_id: str, reason: str = None) -> PaymentGatewayResponse:
        """Cancel a Stripe payment intent."""
        try:
            intent = stripe.PaymentIntent.cancel(
                transaction_id,
                cancellation_reason=reason or "requested_by_customer",
            )
            return PaymentGatewayResponse(
                success=True,
                transaction_id=transaction_id,
                status="CANCELLED",
                message="Payment cancelled successfully",
            )
        except stripe.error.StripeError as e:
            return PaymentGatewayResponse(
                success=False, transaction_id=transaction_id, message=str(e), error_code="stripe_error"
            )

    def refund_payment(self, transaction_id: str, amount: Decimal = None, reason: str = None) -> PaymentGatewayResponse:
        """Refund a Stripe payment."""
        try:
            # Get the payment intent to find the charge
            intent = stripe.PaymentIntent.retrieve(transaction_id)
            charge_id = intent.latest_charge

            if not charge_id:
                return PaymentGatewayResponse(
                    success=False,
                    message="No charge found for this payment intent",
                    error_code="no_charge",
                )

            refund_params = {"charge": charge_id}
            if amount:
                refund_params["amount"] = self.format_amount(amount, intent.currency)
            if reason:
                refund_params["reason"] = reason

            refund = stripe.Refund.create(**refund_params)

            return PaymentGatewayResponse(
                success=True,
                transaction_id=refund.id,
                status="COMPLETED",
                message="Refund processed successfully",
                response_data={"refund_id": refund.id, "charge_id": charge_id},
            )
        except stripe.error.StripeError as e:
            return PaymentGatewayResponse(success=False, message=str(e), error_code="stripe_error")

    def get_payment_status(self, transaction_id: str) -> PaymentGatewayResponse:
        """Get Stripe payment intent status."""
        try:
            intent = stripe.PaymentIntent.retrieve(transaction_id)

            status_mapping = {
                "succeeded": "COMPLETED",
                "processing": "PROCESSING",
                "requires_payment_method": "PENDING",
                "requires_confirmation": "PENDING",
                "requires_action": "PENDING",
                "canceled": "CANCELLED",
            }

            return PaymentGatewayResponse(
                success=True,
                transaction_id=transaction_id,
                status=status_mapping.get(intent.status, "UNKNOWN"),
                response_data={"stripe_status": intent.status, "amount": intent.amount, "currency": intent.currency},
            )
        except stripe.error.StripeError as e:
            return PaymentGatewayResponse(success=False, message=str(e), error_code="stripe_error")

    def save_payment_method(self, payment_data: dict[str, Any]) -> PaymentGatewayResponse:
        """Save a Stripe payment method."""
        try:
            customer_id = payment_data.get("customer_id")
            payment_method_id = payment_data.get("payment_method_id")

            if customer_id and payment_method_id:
                pm = stripe.PaymentMethod.attach(payment_method_id, customer=customer_id)
                return PaymentGatewayResponse(
                    success=True,
                    message="Payment method saved successfully",
                    response_data={
                        "payment_method_id": pm.id,
                        "type": pm.type,
                        "last4": pm.card.last4 if pm.card else None,
                    },
                )
            else:
                return PaymentGatewayResponse(success=False, message="Missing customer_id or payment_method_id")
        except stripe.error.StripeError as e:
            return PaymentGatewayResponse(success=False, message=str(e), error_code="stripe_error")

    def process_webhook(self, webhook_data: dict[str, Any], signature: str = None) -> dict[str, Any]:
        """Process Stripe webhook."""
        try:
            webhook_secret = self.config.get("webhook_secret", "")
            if signature and webhook_secret:
                event = stripe.Webhook.construct_event(
                    webhook_data.get("raw_body", ""),
                    signature,
                    webhook_secret,
                )
            else:
                event = webhook_data

            return {
                "success": True,
                "event_type": event.get("type") if isinstance(event, dict) else event.type,
                "event_id": event.get("id") if isinstance(event, dict) else event.id,
                "data": event.get("data", {}) if isinstance(event, dict) else event.data,
            }
        except Exception as e:
            logger.error(f"Stripe webhook processing failed: {e}")
            return {"success": False, "error": str(e)}

    def validate_config(self) -> tuple[bool, list[str]]:
        """Validate Stripe configuration."""
        errors = []
        if not self.config.get("secret_key"):
            errors.append("Missing Stripe secret key")
        if not self.config.get("publishable_key"):
            errors.append("Missing Stripe publishable key")

        if not errors:
            try:
                stripe.Account.retrieve()
            except stripe.error.AuthenticationError:
                errors.append("Invalid Stripe API key")
            except Exception as e:
                errors.append(f"Failed to verify Stripe connection: {e}")

        return len(errors) == 0, errors

    def is_healthy(self) -> bool:
        """Check Stripe gateway health."""
        try:
            stripe.Account.retrieve()
            return True
        except Exception:
            return False
