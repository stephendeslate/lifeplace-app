# backend/core/domains/payments/serializers/invoice_serializers.py
from rest_framework import serializers

from core.domains.events.serializers import EventSerializer
from core.domains.sales.serializers import EventQuoteSerializer
from core.domains.users.serializers import UserSerializer

from ..models import Invoice, InvoiceLineItem, InvoiceTax
from .settings_serializers import TaxRateSerializer


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    item_type_display = serializers.CharField(source="get_item_type_display", read_only=True)

    class Meta:
        model = InvoiceLineItem
        fields = [
            "id",
            "invoice",
            "description",
            "quantity",
            "unit_price",
            "tax_rate",
            "total",
            "product",
            "created_at",
            "updated_at",
            # Enhanced pricing fields (DRY compliance)
            "item_type",
            "item_type_display",
            "base_unit_price",
            "excess_hours",
            "excess_hour_price",
            "excess_cost",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "item_type_display"]


class InvoiceTaxSerializer(serializers.ModelSerializer):
    tax_rate_details = TaxRateSerializer(source="tax_rate", read_only=True)

    class Meta:
        model = InvoiceTax
        fields = [
            "id",
            "invoice",
            "tax_rate",
            "tax_rate_details",
            "taxable_amount",
            "tax_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class InvoiceSerializer(serializers.ModelSerializer):
    event_details = EventSerializer(source="event", read_only=True)
    client_details = UserSerializer(source="client", read_only=True)
    quote_details = EventQuoteSerializer(source="quote", read_only=True)
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    taxes = InvoiceTaxSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    related_payments = serializers.SerializerMethodField(read_only=True)

    # Payment tracking fields (calculated from related payments)
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_fully_paid = serializers.BooleanField(read_only=True)
    is_partially_paid = serializers.BooleanField(read_only=True)

    # Effective payment terms (booking flow override or global defaults)
    effective_payment_terms = serializers.SerializerMethodField(read_only=True)

    # Mobile app compatibility fields (aliases for expected field names)
    event_name = serializers.CharField(source="event.name", read_only=True)
    invoice_number = serializers.CharField(source="invoice_id", read_only=True)
    issued_date = serializers.DateField(source="issue_date", read_only=True)
    payments = serializers.SerializerMethodField(read_only=True)
    amount_paid = serializers.DecimalField(source="paid_amount", max_digits=10, decimal_places=2, read_only=True)
    discount_amount = serializers.SerializerMethodField(read_only=True)
    can_pay_online = serializers.SerializerMethodField(read_only=True)
    paid_date = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_id",
            "event",
            "event_details",
            "client",
            "client_details",
            "subtotal",
            "tax_amount",
            "total_amount",
            "currency",
            "issue_date",
            "due_date",
            "status",
            "status_display",
            "notes",
            "payment_terms",
            "quote",
            "quote_details",
            "invoice_pdf",
            "line_items",
            "taxes",
            "related_payments",
            "paid_amount",
            "remaining_amount",
            "is_fully_paid",
            "is_partially_paid",
            "effective_payment_terms",
            "created_at",
            "updated_at",
            # Mobile app compatibility fields
            "event_name",
            "invoice_number",
            "issued_date",
            "payments",
            "amount_paid",
            "discount_amount",
            "can_pay_online",
            "paid_date",
        ]
        read_only_fields = [
            "id",
            "invoice_id",
            "paid_amount",
            "remaining_amount",
            "is_fully_paid",
            "is_partially_paid",
            "created_at",
            "updated_at",
            "status",
            "subtotal",
            "tax_amount",
            "total_amount",  # Prevent mass assignment of financial/status fields
        ]

    def get_related_payments(self, obj):
        # Lazy import to avoid circular reference with payment_serializers
        from .payment_serializers import BasicPaymentSerializer

        payments = obj.related_payments.all()
        return BasicPaymentSerializer(payments, many=True).data

    def get_payments(self, obj):
        """Alias for related_payments for mobile app compatibility"""
        from .payment_serializers import BasicPaymentSerializer

        payments = obj.related_payments.all()
        return BasicPaymentSerializer(payments, many=True).data

    def get_can_pay_online(self, obj):
        """Check if online payment is available for this invoice"""
        from ..models import PaymentGateway

        # Invoice can be paid online if there's an active payment gateway and invoice is not fully paid
        return obj.status in ["ISSUED", "PARTIALLY_PAID"] and PaymentGateway.objects.filter(is_active=True).exists()

    def get_paid_date(self, obj):
        """Get the date when invoice was fully paid"""
        if obj.status == "PAID":
            # Get the latest completed payment date
            last_payment = obj.related_payments.filter(status="COMPLETED").order_by("-paid_on").first()
            if last_payment and last_payment.paid_on:
                return (
                    last_payment.paid_on.isoformat()
                    if hasattr(last_payment.paid_on, "isoformat")
                    else str(last_payment.paid_on)
                )
        return None

    def get_discount_amount(self, obj):
        """Get discount amount (calculated from subtotal + tax - total if any discount was applied)"""
        # If the model has a discount_amount field, use it
        if hasattr(obj, "discount_amount") and obj.discount_amount:
            return str(obj.discount_amount)
        # Otherwise calculate from subtotal + tax - total (if there's a discount)
        expected_total = obj.subtotal + obj.tax_amount
        if expected_total > obj.total_amount:
            return str(expected_total - obj.total_amount)
        return "0.00"

    def get_effective_payment_terms(self, obj):
        """
        Get effective payment terms for this invoice.
        Uses PaymentTermsResolver to check for booking flow specific overrides,
        falling back to global settings if no override exists.
        """
        from ..services.payment_terms_resolver import PaymentTermsResolver

        try:
            terms = PaymentTermsResolver.get_terms_for_event(obj.event_id)
            # Convert Decimal values to float for JSON serialization
            return {
                "deposit_type": terms.get("deposit_type"),
                "deposit_percentage": float(terms.get("deposit_percentage", 0)),
                "deposit_fixed_amount": float(terms.get("deposit_fixed_amount", 0))
                if terms.get("deposit_fixed_amount")
                else None,
                "deposit_is_refundable": terms.get("deposit_is_refundable"),
                "deposit_is_deductible": terms.get("deposit_is_deductible"),
                "deposit_waived_on_full_payment": terms.get("deposit_waived_on_full_payment"),
                "balance_due_days": terms.get("balance_due_days"),
                "balance_due_type": terms.get("balance_due_type"),
                "grace_period_days": terms.get("grace_period_days"),
                "currency": terms.get("currency"),
            }
        except Exception:
            # Fall back to global settings on any error
            return None
