# backend/core/domains/payments/serializers/payment_serializers.py
import logging

from rest_framework import serializers

from core.domains.events.serializers import EventSerializer
from core.domains.sales.serializers import EventQuoteSerializer
from core.domains.users.serializers import UserSerializer

from ..models import Payment, Refund
from .invoice_serializers import InvoiceSerializer
from .transaction_serializers import (
    PaymentMethodSerializer,
    PaymentTransactionSerializer,
)

logger = logging.getLogger(__name__)


class RefundSerializer(serializers.ModelSerializer):
    payment_details = serializers.SerializerMethodField(read_only=True)
    refunded_by_details = UserSerializer(source="refunded_by", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Refund
        fields = [
            "id",
            "payment",
            "payment_details",
            "amount",
            "currency",
            "reason",
            "status",
            "status_display",
            "refunded_by",
            "refunded_by_details",
            "refund_transaction_id",
            "gateway_response",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "gateway_response": {"write_only": True},  # Hide sensitive data in responses
        }

    def get_payment_details(self, obj):
        if obj.payment:
            return {"id": obj.payment.id, "payment_number": obj.payment.payment_number, "amount": obj.payment.amount}
        return None


class BasicPaymentSerializer(serializers.ModelSerializer):
    """Simplified payment serializer without nested objects"""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_number",
            "event",
            "amount",
            "currency",
            "status",
            "status_display",
            "due_date",
            "paid_on",
            "description",
            "reference_number",
            "receipt_number",
            "is_manual",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "payment_number", "created_at", "updated_at"]


class PaymentSerializer(serializers.ModelSerializer):
    """Full payment serializer with nested objects"""

    event_details = EventSerializer(source="event", read_only=True)
    payment_method_details = PaymentMethodSerializer(source="payment_method", read_only=True)
    inferred_payment_method = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    quote_details = EventQuoteSerializer(source="quote", read_only=True)
    invoice_details = InvoiceSerializer(source="invoice", read_only=True)
    transactions = PaymentTransactionSerializer(many=True, read_only=True)
    refunds = RefundSerializer(many=True, read_only=True)
    processed_by_details = UserSerializer(source="processed_by", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_number",
            "event",
            "event_details",
            "amount",
            "currency",
            "status",
            "status_display",
            "due_date",
            "paid_on",
            "payment_method",
            "payment_method_details",
            "inferred_payment_method",
            "description",
            "notes",
            "reference_number",
            "is_manual",
            "processed_by",
            "processed_by_details",
            "receipt_number",
            "receipt_generated_on",
            "receipt_sent",
            "receipt_sent_on",
            "receipt_pdf",
            "quote",
            "quote_details",
            "invoice",
            "invoice_details",
            "transactions",
            "refunds",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "payment_number",
            "receipt_number",
            "created_at",
            "updated_at",
            "status",
            "amount",  # Prevent mass assignment of financial/status fields
        ]

    def get_inferred_payment_method(self, obj):
        """Infer payment method information from transaction data when direct payment method is not available"""
        # If we already have payment method details, use them
        if obj.payment_method:
            return None  # Frontend will use payment_method_details

        # Look for the most recent completed transaction to infer payment method
        completed_transaction = obj.transactions.filter(status="COMPLETED").order_by("-created_at").first()
        if not completed_transaction or not completed_transaction.gateway:
            return None

        gateway_code = completed_transaction.gateway.code.lower()
        gateway_name = completed_transaction.gateway.name

        # Map gateway codes to payment method types
        gateway_to_method_map = {
            "stripe": {
                "type": "CREDIT_CARD",
                "type_display": "Credit Card",
                "gateway_name": gateway_name,
                "gateway_code": gateway_code,
            },
            "paypal": {
                "type": "DIGITAL_WALLET",
                "type_display": "PayPal",
                "gateway_name": gateway_name,
                "gateway_code": gateway_code,
            },
            "bank_transfer": {
                "type": "BANK_TRANSFER",
                "type_display": "Bank Transfer",
                "gateway_name": gateway_name,
                "gateway_code": gateway_code,
            },
            "gcash": {
                "type": "DIGITAL_WALLET",
                "type_display": "GCash",
                "gateway_name": gateway_name,
                "gateway_code": gateway_code,
            },
        }

        return gateway_to_method_map.get(
            gateway_code,
            {
                "type": "CREDIT_CARD",  # Default fallback for unknown gateways
                "type_display": f"{gateway_name} Payment",
                "gateway_name": gateway_name,
                "gateway_code": gateway_code,
            },
        )


# New serializers for invoice payment endpoints
class InvoicePaymentRequestSerializer(serializers.Serializer):
    """Serializer for invoice payment request data"""

    payment_type = serializers.ChoiceField(
        choices=[("FULL", "Full Payment"), ("DEPOSIT", "Deposit Payment"), ("CUSTOM", "Custom Amount")],
        default="FULL",
        help_text="Payment type - full payment, deposit, or custom amount",
    )
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        help_text="Custom payment amount (required when payment_type=CUSTOM)",
    )
    payment_method = serializers.IntegerField(required=False, help_text="Saved payment method ID")
    payment_method_id = serializers.CharField(required=False, help_text="Stripe payment method ID or token")
    payment_method_token = serializers.CharField(required=False, help_text="Payment method token from frontend")
    gateway_id = serializers.IntegerField(required=False, help_text="Payment gateway ID to use")
    gateway_code = serializers.CharField(required=False, help_text="Payment gateway code (e.g., 'stripe')")
    save_payment_method = serializers.BooleanField(default=False, help_text="Save payment method for future use")
    is_manual = serializers.BooleanField(default=False, help_text="Manual payment processing")
    reference_number = serializers.CharField(required=False, max_length=255, help_text="External reference number")
    notes = serializers.CharField(required=False, help_text="Additional payment notes")

    def validate(self, data):
        """Validate payment request data"""
        # SECURITY: Log only non-sensitive fields for debugging
        safe_fields = {
            k: v
            for k, v in data.items()
            if k not in ("payment_method_token", "payment_method_id", "card_number", "cvv", "cvc")
        }
        # Mask payment_method_id if present (show last 4 chars only)
        if data.get("payment_method_id"):
            pm_id = data.get("payment_method_id")
            safe_fields["payment_method_id"] = f"***{pm_id[-4:]}" if len(str(pm_id)) > 4 else "***"
        logger.debug(
            f"Payment validation - fields: {list(safe_fields.keys())}, payment_type: {data.get('payment_type')}"
        )

        # Validate custom amount if payment_type is CUSTOM
        if data.get("payment_type") == "CUSTOM":
            if not data.get("amount"):
                raise serializers.ValidationError("amount is required when payment_type is CUSTOM")
            # Validate amount is positive
            if data.get("amount") <= 0:
                raise serializers.ValidationError("amount must be greater than 0")

        # Require either payment method ID/token/saved method or manual payment
        if not data.get("is_manual", False):
            payment_method = data.get("payment_method")
            payment_method_id = data.get("payment_method_id")
            payment_method_token = data.get("payment_method_token")

            # SECURITY: Only log presence of payment method identifiers, not values
            logger.debug(
                f"Payment validation - has_method={bool(payment_method)}, has_method_id={bool(payment_method_id)}, has_token={bool(payment_method_token)}"
            )

            if not payment_method_id and not payment_method_token and not payment_method:
                logger.warning("Payment validation error - no payment method identifier provided")
                raise serializers.ValidationError(
                    "No payment method provided. Either payment_method, payment_method_id, or payment_method_token is required for non-manual payments"
                )

        # Require gateway for non-manual payments (except when using saved payment methods)
        if not data.get("is_manual", False) and not data.get("payment_method"):
            if not data.get("gateway_id") and not data.get("gateway_code"):
                raise serializers.ValidationError(
                    "gateway_id or gateway_code is required for non-manual payments with new payment methods"
                )

        return data


class PaymentIntentResponseSerializer(serializers.Serializer):
    """Serializer for payment intent response from gateways"""

    client_secret = serializers.CharField(help_text="Client secret for frontend payment confirmation")
    payment_intent_id = serializers.CharField(help_text="Payment intent ID from gateway")
    status = serializers.CharField(help_text="Current status of payment intent")
    requires_action = serializers.BooleanField(help_text="Whether payment requires additional action")
    next_action = serializers.DictField(required=False, help_text="Next action data for 3D Secure etc.")
    payment_id = serializers.IntegerField(help_text="Internal payment record ID")
    transaction_id = serializers.IntegerField(help_text="Internal transaction record ID")


class SetupIntentResponseSerializer(serializers.Serializer):
    """Serializer for setup intent response from gateways"""

    setup_intent_id = serializers.CharField(help_text="Setup intent ID from gateway")
    client_secret = serializers.CharField(help_text="Client secret for frontend setup confirmation")
    status = serializers.CharField(help_text="Current status of setup intent")
    gateway = serializers.CharField(help_text="Gateway code used for setup intent")
