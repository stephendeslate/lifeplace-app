# backend/core/domains/payments/serializers.py
from core.domains.events.serializers import EventSerializer
from core.domains.sales.serializers import EventQuoteSerializer
from core.domains.users.serializers import UserSerializer
from rest_framework import serializers

from .models import (
    Invoice,
    InvoiceLineItem,
    InvoiceTax,
    Payment,
    PaymentGateway,
    PaymentInstallment,
    PaymentMethod,
    PaymentNotification,
    PaymentPlan,
    PaymentTransaction,
    Refund,
    TaxRate,
)


class TaxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = [
            'id', 'name', 'rate', 'region', 'is_default',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentGatewaySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentGateway
        fields = [
            'id', 'name', 'code', 'is_active', 'config', 'description',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'config': {'write_only': True},  # Hide sensitive config data in responses
        }


class PaymentMethodSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    gateway_details = PaymentGatewaySerializer(source='gateway', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'user', 'user_details', 'type', 'type_display', 'is_default',
            'nickname', 'instructions', 'gateway', 'gateway_details',
            'token_reference', 'last_four', 'expiry_date', 'metadata',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'token_reference': {'write_only': True},  # Hide sensitive token data in responses
            'metadata': {'write_only': True},  # Hide payment method metadata in responses
        }


class PaymentTransactionSerializer(serializers.ModelSerializer):
    gateway_details = PaymentGatewaySerializer(source='gateway', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'payment', 'gateway', 'gateway_details', 'transaction_id',
            'amount', 'status', 'status_display', 'response_data', 'error_message',
            'is_test', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'response_data': {'write_only': True},  # Hide transaction response data in responses
        }


class PaymentNotificationSerializer(serializers.ModelSerializer):
    payment_details = serializers.SerializerMethodField(read_only=True)
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    
    class Meta:
        model = PaymentNotification
        fields = [
            'id', 'payment', 'payment_details', 'notification_type',
            'notification_type_display', 'sent_at', 'sent_to', 'template_used',
            'is_successful', 'reference', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_payment_details(self, obj):
        if obj.payment:
            return {
                'id': obj.payment.id,
                'payment_number': obj.payment.payment_number,
                'amount': obj.payment.amount
            }
        return None


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItem
        fields = [
            'id', 'invoice', 'description', 'quantity', 'unit_price',
            'tax_rate', 'total', 'product', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceTaxSerializer(serializers.ModelSerializer):
    tax_rate_details = TaxRateSerializer(source='tax_rate', read_only=True)
    
    class Meta:
        model = InvoiceTax
        fields = [
            'id', 'invoice', 'tax_rate', 'tax_rate_details', 'taxable_amount',
            'tax_amount', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceSerializer(serializers.ModelSerializer):
    event_details = EventSerializer(source='event', read_only=True)
    client_details = UserSerializer(source='client', read_only=True)
    quote_details = EventQuoteSerializer(source='quote', read_only=True)
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    taxes = InvoiceTaxSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    related_payments = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_id', 'event', 'event_details', 'client', 'client_details',
            'subtotal', 'tax_amount', 'total_amount', 'issue_date', 'due_date',
            'status', 'status_display', 'notes', 'payment_terms', 'quote',
            'quote_details', 'invoice_pdf', 'line_items', 'taxes',
            'related_payments', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'invoice_id', 'created_at', 'updated_at']
    
    def get_related_payments(self, obj):
        payments = obj.related_payments.all()
        return BasicPaymentSerializer(payments, many=True).data


class PaymentInstallmentSerializer(serializers.ModelSerializer):
    payment_plan_details = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_details = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = PaymentInstallment
        fields = [
            'id', 'payment_plan', 'payment_plan_details', 'amount', 'due_date',
            'status', 'status_display', 'installment_number', 'description',
            'payment_details', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_payment_plan_details(self, obj):
        if obj.payment_plan:
            return {
                'id': obj.payment_plan.id,
                'event_id': obj.payment_plan.event.id,
                'total_amount': obj.payment_plan.total_amount
            }
        return None
    
    def get_payment_details(self, obj):
        try:
            payment = obj.payment.first()
            if payment:
                return BasicPaymentSerializer(payment).data
        except Exception:
            return None
        return None


class PaymentPlanSerializer(serializers.ModelSerializer):
    event_details = EventSerializer(source='event', read_only=True)
    quote_details = EventQuoteSerializer(source='quote', read_only=True)
    installments = PaymentInstallmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = PaymentPlan
        fields = [
            'id', 'event', 'event_details', 'total_amount', 'down_payment_amount',
            'down_payment_due_date', 'number_of_installments', 'frequency',
            'notes', 'quote', 'quote_details', 'installments', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RefundSerializer(serializers.ModelSerializer):
    payment_details = serializers.SerializerMethodField(read_only=True)
    refunded_by_details = UserSerializer(source='refunded_by', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Refund
        fields = [
            'id', 'payment', 'payment_details', 'amount', 'reason', 'status',
            'status_display', 'refunded_by', 'refunded_by_details',
            'refund_transaction_id', 'gateway_response',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'gateway_response': {'write_only': True},  # Hide sensitive data in responses
        }
    
    def get_payment_details(self, obj):
        if obj.payment:
            return {
                'id': obj.payment.id,
                'payment_number': obj.payment.payment_number,
                'amount': obj.payment.amount
            }
        return None


class BasicPaymentSerializer(serializers.ModelSerializer):
    """Simplified payment serializer without nested objects"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'event', 'amount', 'status', 'status_display',
            'due_date', 'paid_on', 'description', 'reference_number', 
            'receipt_number', 'is_manual', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'payment_number', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    """Full payment serializer with nested objects"""
    event_details = EventSerializer(source='event', read_only=True)
    payment_method_details = PaymentMethodSerializer(source='payment_method', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    quote_details = EventQuoteSerializer(source='quote', read_only=True)
    invoice_details = InvoiceSerializer(source='invoice', read_only=True)
    installment_details = PaymentInstallmentSerializer(source='installment', read_only=True)
    transactions = PaymentTransactionSerializer(source='transactions', many=True, read_only=True)
    refunds = RefundSerializer(source='refunds', many=True, read_only=True)
    processed_by_details = UserSerializer(source='processed_by', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'event', 'event_details', 'amount',
            'status', 'status_display', 'due_date', 'paid_on',
            'payment_method', 'payment_method_details', 'description',
            'notes', 'reference_number', 'is_manual', 'processed_by',
            'processed_by_details', 'receipt_number', 'receipt_generated_on',
            'receipt_sent', 'receipt_sent_on', 'receipt_pdf', 'quote',
            'quote_details', 'invoice', 'invoice_details', 'installment',
            'installment_details', 'transactions', 'refunds',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'payment_number', 'receipt_number', 'created_at', 'updated_at']