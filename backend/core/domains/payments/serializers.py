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
    PaymentSettings,
    PaymentTransaction,
    Refund,
    TaxRate,
)


class PaymentSettingsSerializer(serializers.ModelSerializer):
    """Serializer for PaymentSettings with validation"""

    class Meta:
        model = PaymentSettings
        fields = [
            'id',
            # Payment plan settings
            'balance_due_days',
            'grace_period_days',
            'default_installments',
            'default_installment_frequency',
            'late_fee_enabled',
            'default_late_fee_amount',
            'default_deposit_percentage',
            # Currency settings
            'default_currency',
            # Auto retry settings
            'auto_payment_retry_attempts',
            'auto_payment_retry_delay_days',
            # Refund policy settings
            'allow_refunds',
            'refund_deadline_hours',
            'refund_percentage',
            'refund_policy_text',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_default_deposit_percentage(self, value):
        """Validate deposit percentage is between 0 and 100"""
        if not (0 <= value <= 100):
            raise serializers.ValidationError(
                "Default deposit percentage must be between 0 and 100."
            )
        return value

    def validate_refund_percentage(self, value):
        """Validate refund percentage is between 0 and 100"""
        if not (0 <= value <= 100):
            raise serializers.ValidationError(
                "Refund percentage must be between 0 and 100."
            )
        return value

    def validate_balance_due_days(self, value):
        """Validate balance due days is positive"""
        if value <= 0:
            raise serializers.ValidationError(
                "Balance due days must be a positive number."
            )
        return value

    def validate_grace_period_days(self, value):
        """Validate grace period days is non-negative"""
        if value < 0:
            raise serializers.ValidationError(
                "Grace period days must be non-negative."
            )
        return value

    def validate_default_installments(self, value):
        """Validate default installments is positive"""
        if value <= 0:
            raise serializers.ValidationError(
                "Default installments must be a positive number."
            )
        return value

    def validate_auto_payment_retry_attempts(self, value):
        """Validate retry attempts is non-negative"""
        if value < 0:
            raise serializers.ValidationError(
                "Auto payment retry attempts must be non-negative."
            )
        return value

    def validate_auto_payment_retry_delay_days(self, value):
        """Validate retry delay days is positive"""
        if value <= 0:
            raise serializers.ValidationError(
                "Auto payment retry delay days must be a positive number."
            )
        return value

    def validate_default_late_fee_amount(self, value):
        """Validate late fee amount is non-negative"""
        if value < 0:
            raise serializers.ValidationError(
                "Default late fee amount must be non-negative."
            )
        return value


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


class PaymentGatewayAdminSerializer(serializers.ModelSerializer):
    """Admin-safe serializer that shows masked sensitive fields for editing"""
    masked_config = serializers.SerializerMethodField()

    class Meta:
        model = PaymentGateway
        fields = [
            'id', 'name', 'code', 'is_active', 'config', 'masked_config', 'description',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'masked_config']
        extra_kwargs = {
            'config': {'write_only': True},  # Still write-only for security
        }

    def get_masked_config(self, obj):
        """Return configuration with sensitive fields masked for admin display"""
        if not obj.config:
            return {}

        config = obj.config.copy()
        masked_config = {}

        # Gateway-specific masking
        if obj.code == 'stripe':
            masked_config.update({
                'publishable_key': self._mask_key(config.get('publishable_key')),
                'secret_key': self._mask_key(config.get('secret_key')),
                'webhook_secret': self._mask_key(config.get('webhook_secret')),
                'test_mode': config.get('test_mode', False),
                '_configured': bool(config.get('publishable_key') and config.get('secret_key')),
            })
        elif obj.code == 'paymongo':
            masked_config.update({
                'public_key': self._mask_key(config.get('public_key')),
                'secret_key': self._mask_key(config.get('secret_key')),
                'webhook_secret': self._mask_key(config.get('webhook_secret')),
                'test_mode': config.get('test_mode', False),
                '_configured': bool(config.get('public_key') and config.get('secret_key')),
            })
        elif obj.code == 'paypal':
            masked_config.update({
                'client_id': self._mask_key(config.get('client_id')),
                'client_secret': self._mask_key(config.get('client_secret')),
                'environment': config.get('environment', 'sandbox'),
                '_configured': bool(config.get('client_id') and config.get('client_secret')),
            })
        else:
            # Generic masking for other gateways
            for key, value in config.items():
                if any(sensitive in key.lower() for sensitive in ['key', 'secret', 'token', 'password']):
                    masked_config[key] = self._mask_key(value)
                else:
                    masked_config[key] = value

            # Add configuration status
            sensitive_fields = [k for k in config.keys() if any(s in k.lower() for s in ['key', 'secret', 'token'])]
            masked_config['_configured'] = len(sensitive_fields) > 0 and all(config.get(k) for k in sensitive_fields)

        return masked_config

    def _mask_key(self, key_value):
        """Mask a sensitive key value for display"""
        if not key_value or not isinstance(key_value, str):
            return None

        # For short keys, show first 4 and last 4 characters
        if len(key_value) <= 12:
            if len(key_value) <= 8:
                return f"{key_value[:2]}{'*' * (len(key_value) - 4)}{key_value[-2:]}"
            else:
                return f"{key_value[:4]}{'*' * (len(key_value) - 8)}{key_value[-4:]}"

        # For longer keys, show first 8 and last 4 characters
        return f"{key_value[:8]}{'*' * (len(key_value) - 12)}{key_value[-4:]}"


class PublicPaymentGatewaySerializer(serializers.ModelSerializer):
    """Public serializer for payment gateways - only safe fields exposed"""

    class Meta:
        model = PaymentGateway
        fields = [
            'id', 'name', 'code', 'is_active', 'description',
        ]
        read_only_fields = ['id', 'name', 'code', 'is_active', 'description']

    def to_representation(self, instance):
        """Custom representation to include only essential public config if needed"""
        data = super().to_representation(instance)

        # Add minimal public configuration (no sensitive data)
        public_config = {}

        if instance.code == 'stripe':
            # Include safe public fields for Stripe integration
            config = instance.config or {}
            public_config['test_mode'] = config.get('test_mode', False)
            # Include publishable_key for Stripe Elements initialization
            if 'publishable_key' in config:
                public_config['publishable_key'] = config['publishable_key']
        elif instance.code == 'paypal':
            config = instance.config or {}
            public_config['environment'] = config.get('environment', 'sandbox')
        elif instance.code == 'paymongo':
            config = instance.config or {}
            public_config['test_mode'] = config.get('test_mode', False)

        # Only add public_config if it has content
        if public_config:
            data['public_config'] = public_config

        return data


class PublicPaymentSettingsSerializer(serializers.ModelSerializer):
    """
    Public serializer for payment settings - only safe fields exposed.

    Used for client-facing booking flows and guest checkout.
    Excludes internal/admin-only fields like grace periods, late fees, and retry settings.
    """

    class Meta:
        model = PaymentSettings
        fields = [
            'id',
            # Client-facing payment configuration
            'balance_due_days',
            'default_deposit_percentage',
            'default_currency',
            # Refund policy (public transparency)
            'allow_refunds',
            'refund_deadline_hours',
            'refund_percentage',
            'refund_policy_text',
        ]
        read_only_fields = [
            'id',
            'balance_due_days',
            'default_deposit_percentage',
            'default_currency',
            'allow_refunds',
            'refund_deadline_hours',
            'refund_percentage',
            'refund_policy_text',
        ]


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
            'amount', 'currency', 'status', 'status_display', 'response_data', 'error_message',
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
    item_type_display = serializers.CharField(source='get_item_type_display', read_only=True)

    class Meta:
        model = InvoiceLineItem
        fields = [
            'id', 'invoice', 'description', 'quantity', 'unit_price',
            'tax_rate', 'total', 'product', 'created_at', 'updated_at',
            # Enhanced pricing fields (DRY compliance)
            'item_type', 'item_type_display', 'base_unit_price',
            'excess_hours', 'excess_hour_price', 'excess_cost',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'item_type_display']


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

    # Payment tracking fields (calculated from related payments)
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_fully_paid = serializers.BooleanField(read_only=True)
    is_partially_paid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_id', 'event', 'event_details', 'client', 'client_details',
            'subtotal', 'tax_amount', 'total_amount', 'currency', 'issue_date', 'due_date',
            'status', 'status_display', 'notes', 'payment_terms', 'quote',
            'quote_details', 'invoice_pdf', 'line_items', 'taxes',
            'related_payments', 'paid_amount', 'remaining_amount',
            'is_fully_paid', 'is_partially_paid',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'invoice_id', 'paid_amount', 'remaining_amount',
            'is_fully_paid', 'is_partially_paid', 'created_at', 'updated_at'
        ]

    def get_related_payments(self, obj):
        payments = obj.related_payments.all()
        return BasicPaymentSerializer(payments, many=True).data


class PaymentInstallmentSerializer(serializers.ModelSerializer):
    payment_plan_details = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_details = serializers.SerializerMethodField(read_only=True)

    # Calculated fields
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_fully_paid = serializers.BooleanField(read_only=True)
    days_overdue_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PaymentInstallment
        fields = [
            'id', 'payment_plan', 'payment_plan_details', 'amount', 'due_date',
            'status', 'status_display', 'installment_number', 'description',
            'payment_details', 'created_at', 'updated_at',
            # New enhanced fields
            'last_reminder_sent', 'reminder_count', 'late_fee_amount', 'late_fee_applied_date',
            # Calculated fields
            'paid_amount', 'remaining_amount', 'is_fully_paid', 'days_overdue_count',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'paid_amount', 'remaining_amount',
            'is_fully_paid', 'days_overdue_count'
        ]
    
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
    auto_payment_method_details = PaymentMethodSerializer(source='auto_payment_method', read_only=True)

    # Calculated fields
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    remaining_balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    completion_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)

    # Display fields
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PaymentPlan
        fields = [
            'id', 'event', 'event_details', 'total_amount', 'down_payment_amount',
            'currency', 'down_payment_due_date', 'number_of_installments', 'frequency',
            'notes', 'quote', 'quote_details', 'installments', 'created_at', 'updated_at',
            # New enhanced fields
            'status', 'status_display', 'next_payment_date', 'final_payment_date',
            'grace_period_days', 'terms_accepted', 'terms_accepted_at', 'terms_accepted_ip',
            'auto_payment_enabled', 'auto_payment_method', 'auto_payment_method_details',
            'created_from_booking_session',
            # Calculated fields
            'paid_amount', 'remaining_balance', 'is_overdue', 'completion_percentage',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'paid_amount', 'remaining_balance',
            'is_overdue', 'completion_percentage', 'status_display'
        ]


class RefundSerializer(serializers.ModelSerializer):
    payment_details = serializers.SerializerMethodField(read_only=True)
    refunded_by_details = UserSerializer(source='refunded_by', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Refund
        fields = [
            'id', 'payment', 'payment_details', 'amount', 'currency', 'reason', 'status',
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
            'id', 'payment_number', 'event', 'amount', 'currency', 'status', 'status_display',
            'due_date', 'paid_on', 'description', 'reference_number', 
            'receipt_number', 'is_manual', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'payment_number', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    """Full payment serializer with nested objects"""
    event_details = EventSerializer(source='event', read_only=True)
    payment_method_details = PaymentMethodSerializer(source='payment_method', read_only=True)
    inferred_payment_method = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    quote_details = EventQuoteSerializer(source='quote', read_only=True)
    invoice_details = InvoiceSerializer(source='invoice', read_only=True)
    installment_details = PaymentInstallmentSerializer(source='installment', read_only=True)
    transactions = PaymentTransactionSerializer(many=True, read_only=True)
    refunds = RefundSerializer(many=True, read_only=True)
    processed_by_details = UserSerializer(source='processed_by', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'event', 'event_details', 'amount', 'currency',
            'status', 'status_display', 'due_date', 'paid_on',
            'payment_method', 'payment_method_details', 'inferred_payment_method', 'description',
            'notes', 'reference_number', 'is_manual', 'processed_by',
            'processed_by_details', 'receipt_number', 'receipt_generated_on',
            'receipt_sent', 'receipt_sent_on', 'receipt_pdf', 'quote',
            'quote_details', 'invoice', 'invoice_details', 'installment',
            'installment_details', 'transactions', 'refunds',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'payment_number', 'receipt_number', 'created_at', 'updated_at']
    
    def get_inferred_payment_method(self, obj):
        """Infer payment method information from transaction data when direct payment method is not available"""
        # If we already have payment method details, use them
        if obj.payment_method:
            return None  # Frontend will use payment_method_details
        
        # Look for the most recent completed transaction to infer payment method
        completed_transaction = obj.transactions.filter(status='COMPLETED').order_by('-created_at').first()
        if not completed_transaction or not completed_transaction.gateway:
            return None
            
        gateway_code = completed_transaction.gateway.code.lower()
        gateway_name = completed_transaction.gateway.name
        
        # Map gateway codes to payment method types
        gateway_to_method_map = {
            'stripe': {
                'type': 'CREDIT_CARD',
                'type_display': 'Credit Card',
                'gateway_name': gateway_name,
                'gateway_code': gateway_code
            },
            'paypal': {
                'type': 'DIGITAL_WALLET', 
                'type_display': 'PayPal',
                'gateway_name': gateway_name,
                'gateway_code': gateway_code
            },
            'bank_transfer': {
                'type': 'BANK_TRANSFER',
                'type_display': 'Bank Transfer', 
                'gateway_name': gateway_name,
                'gateway_code': gateway_code
            },
            'gcash': {
                'type': 'DIGITAL_WALLET',
                'type_display': 'GCash',
                'gateway_name': gateway_name,
                'gateway_code': gateway_code
            }
        }
        
        return gateway_to_method_map.get(gateway_code, {
            'type': 'CREDIT_CARD',  # Default fallback for unknown gateways
            'type_display': f'{gateway_name} Payment',
            'gateway_name': gateway_name,
            'gateway_code': gateway_code
        })


# New serializers for invoice payment endpoints
class InvoicePaymentRequestSerializer(serializers.Serializer):
    """Serializer for invoice payment request data"""
    payment_type = serializers.ChoiceField(
        choices=[
            ('FULL', 'Full Payment'),
            ('DEPOSIT', 'Deposit Payment'),
            ('CUSTOM', 'Custom Amount')
        ],
        default='FULL',
        help_text='Payment type - full payment, deposit, or custom amount'
    )
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        help_text='Custom payment amount (required when payment_type=CUSTOM)'
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
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"🔍 PAYMENT VALIDATION - Received data: {data}")

        # Validate custom amount if payment_type is CUSTOM
        if data.get('payment_type') == 'CUSTOM':
            if not data.get('amount'):
                raise serializers.ValidationError(
                    "amount is required when payment_type is CUSTOM"
                )
            # Validate amount is positive
            if data.get('amount') <= 0:
                raise serializers.ValidationError(
                    "amount must be greater than 0"
                )

        # Require either payment method ID/token/saved method or manual payment
        if not data.get('is_manual', False):
            payment_method = data.get('payment_method')
            payment_method_id = data.get('payment_method_id')
            payment_method_token = data.get('payment_method_token')

            logger.info(f"🔍 PAYMENT VALIDATION - Checking fields: payment_method={payment_method}, payment_method_id={payment_method_id}, payment_method_token={payment_method_token}")

            if not payment_method_id and not payment_method_token and not payment_method:
                logger.error(f"❌ PAYMENT VALIDATION ERROR - No payment method provided. Received data: {data}")
                raise serializers.ValidationError(
                    "No payment method provided. Either payment_method, payment_method_id, or payment_method_token is required for non-manual payments"
                )

        # Require gateway for non-manual payments (except when using saved payment methods)
        if not data.get('is_manual', False) and not data.get('payment_method'):
            if not data.get('gateway_id') and not data.get('gateway_code'):
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


class PaymentPlanRequestSerializer(serializers.Serializer):
    """Serializer for payment plan setup request"""
    down_payment_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Down payment amount (optional, defaults to 0)"
    )
    down_payment_due_date = serializers.DateField(
        required=False,
        help_text="Due date for down payment (defaults to today)"
    )
    number_of_installments = serializers.IntegerField(
        min_value=1,
        max_value=12,
        help_text="Number of installments (1-12)"
    )
    frequency = serializers.ChoiceField(
        choices=[
            ('WEEKLY', 'Weekly'),
            ('BIWEEKLY', 'Bi-weekly'),
            ('MONTHLY', 'Monthly'),
            ('QUARTERLY', 'Quarterly')
        ],
        default='MONTHLY',
        help_text="Installment frequency"
    )
    auto_payment_enabled = serializers.BooleanField(
        default=False,
        help_text="Enable automatic payments"
    )
    auto_payment_method_id = serializers.IntegerField(
        required=False,
        help_text="Payment method ID for auto payments"
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        help_text="Additional notes for payment plan"
    )

    def validate_down_payment_amount(self, value):
        """Validate down payment amount"""
        if value < 0:
            raise serializers.ValidationError("Down payment amount cannot be negative")
        return value

    def validate(self, data):
        """Validate payment plan request"""
        # If auto payment is enabled, require payment method
        if data.get('auto_payment_enabled', False):
            if not data.get('auto_payment_method_id'):
                raise serializers.ValidationError(
                    "auto_payment_method_id is required when auto_payment_enabled is True"
                )

        return data


class SetupIntentResponseSerializer(serializers.Serializer):
    """Serializer for setup intent response from gateways"""
    setup_intent_id = serializers.CharField(help_text="Setup intent ID from gateway")
    client_secret = serializers.CharField(help_text="Client secret for frontend setup confirmation")
    status = serializers.CharField(help_text="Current status of setup intent")
    gateway = serializers.CharField(help_text="Gateway code used for setup intent")