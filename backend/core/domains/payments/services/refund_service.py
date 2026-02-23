# backend/core/domains/payments/services/refund_service.py
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

import stripe

from core.domains.events.models import EventTimeline

from ..exceptions import (
    InvalidPaymentAmountException,
    InvalidRefundStatusException,
    PaymentNotFoundException,
    RefundExceedsPaymentException,
)
from ..models import Payment, Refund


class RefundService:
    """Service for managing refunds"""

    @staticmethod
    def create_refund(payment_id, refund_data, user):
        """Create a refund for a payment"""
        try:
            payment = Payment.objects.get(pk=payment_id)
        except Payment.DoesNotExist:
            raise PaymentNotFoundException(f"Payment with ID {payment_id} not found")

        # Check if payment can be refunded
        if payment.status != "COMPLETED":
            raise InvalidRefundStatusException("Only completed payments can be refunded")

        # Validate refund amount
        refund_amount = Decimal(str(refund_data.get("amount", "0")))
        if refund_amount <= 0:
            raise InvalidPaymentAmountException("Refund amount must be greater than zero")

        # Check if refund amount exceeds payment
        existing_refund_total = sum(refund.amount for refund in payment.refunds.filter(status="COMPLETED"))
        if refund_amount + existing_refund_total > payment.amount:
            raise RefundExceedsPaymentException(
                f"Total refund amount ({refund_amount + existing_refund_total}) "
                f"would exceed original payment amount ({payment.amount})"
            )

        with transaction.atomic():
            # Create the refund record
            refund = Refund.objects.create(
                payment=payment,
                amount=refund_amount,
                reason=refund_data.get("reason", ""),
                status="PENDING",
                refunded_by=user,
            )

            # Process the refund - in real implementation, this would call the payment gateway
            # For now, just simulate a successful refund
            refund.status = "COMPLETED"
            refund.refund_transaction_id = f"ref_{timezone.now().strftime('%Y%m%d%H%M%S')}"
            refund.save()

            # Record in event timeline
            EventTimeline.objects.create(
                event=payment.event,
                action_type="SYSTEM_UPDATE",
                description=f"Refund of ${refund_amount} processed",
                actor=user,
                is_public=True,
                action_data={
                    "refund_id": refund.id,
                    "payment_id": payment.id,
                    "amount": str(refund_amount),
                    "reason": refund.reason,
                },
            )

            return refund

    @staticmethod
    def process_gateway_refund(refund_id, gateway_code):
        """Process refund through specific gateway"""
        try:
            refund = Refund.objects.get(pk=refund_id)
        except Refund.DoesNotExist:
            raise ValueError(f"Refund with ID {refund_id} not found")

        if refund.status != "PENDING":
            raise InvalidRefundStatusException("Only pending refunds can be processed")

        # Route to appropriate gateway
        if gateway_code == "stripe":
            return RefundService._process_stripe_refund(refund)
        elif gateway_code == "paypal":
            return RefundService._process_paypal_refund(refund)
        else:
            raise ValueError(f"Unsupported gateway for refunds: {gateway_code}")

    @staticmethod
    def _process_stripe_refund(refund):
        """Process refund through Stripe"""
        payment = refund.payment

        # Get the original payment transaction
        stripe_transaction = payment.transactions.filter(gateway__code="stripe", status="COMPLETED").first()

        if not stripe_transaction:
            raise ValueError("No completed Stripe transaction found for this payment")

        # Set Stripe API key
        stripe.api_key = stripe_transaction.gateway.config["secret_key"]

        try:
            # Create refund with Stripe.
            # Idempotency key ensures retries never create duplicate refunds.
            stripe_refund = stripe.Refund.create(
                payment_intent=stripe_transaction.transaction_id,
                amount=int(refund.amount * 100),  # Convert to cents
                metadata={
                    "refund_id": refund.id,
                    "payment_id": payment.id,
                    "reason": refund.reason[:500],  # Stripe has character limits
                },
                idempotency_key=f"ref_{refund.id}",
            )

            # Update refund record
            refund.status = "COMPLETED" if stripe_refund.status == "succeeded" else "FAILED"
            refund.refund_transaction_id = stripe_refund.id
            refund.gateway_response = stripe_refund
            refund.save()

            return refund

        except stripe.error.StripeError as e:
            refund.status = "FAILED"
            refund.gateway_response = {"error": str(e)}
            refund.save()
            raise ValueError(f"Stripe refund failed: {e!s}")

    @staticmethod
    def _process_paypal_refund(refund):
        """Process refund through PayPal"""
        # PayPal refund implementation would go here
        raise ValueError("PayPal refund integration not yet implemented")
