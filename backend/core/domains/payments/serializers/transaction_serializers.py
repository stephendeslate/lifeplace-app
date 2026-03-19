# backend/core/domains/payments/serializers/transaction_serializers.py
from rest_framework import serializers

from core.domains.users.serializers import UserSerializer

from ..models import PaymentMethod, PaymentNotification, PaymentTransaction
from .gateway_serializers import PaymentGatewaySerializer


class PaymentMethodSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    gateway_details = PaymentGatewaySerializer(source="gateway", read_only=True)
    type_display = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = PaymentMethod
        fields = [
            "id",
            "user",
            "user_details",
            "type",
            "type_display",
            "is_default",
            "nickname",
            "instructions",
            "gateway",
            "gateway_details",
            "token_reference",
            "last_four",
            "expiry_date",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "token_reference": {"write_only": True},  # Hide sensitive token data in responses
            "metadata": {"write_only": True},  # Hide payment method metadata in responses
        }


class PaymentTransactionSerializer(serializers.ModelSerializer):
    gateway_details = PaymentGatewaySerializer(source="gateway", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = [
            "id",
            "payment",
            "gateway",
            "gateway_details",
            "transaction_id",
            "amount",
            "currency",
            "status",
            "status_display",
            "response_data",
            "error_message",
            "is_test",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "response_data": {"write_only": True},  # Hide transaction response data in responses
        }


class PaymentNotificationSerializer(serializers.ModelSerializer):
    payment_details = serializers.SerializerMethodField(read_only=True)
    notification_type_display = serializers.CharField(source="get_notification_type_display", read_only=True)

    class Meta:
        model = PaymentNotification
        fields = [
            "id",
            "payment",
            "payment_details",
            "notification_type",
            "notification_type_display",
            "sent_at",
            "sent_to",
            "template_used",
            "is_successful",
            "reference",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_payment_details(self, obj):
        if obj.payment:
            return {"id": obj.payment.id, "payment_number": obj.payment.payment_number, "amount": obj.payment.amount}
        return None
