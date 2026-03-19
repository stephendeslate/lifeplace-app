# backend/core/domains/payments/serializers/gateway_serializers.py
from rest_framework import serializers

from ..models import PaymentGateway


class PaymentGatewaySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentGateway
        fields = [
            "id",
            "name",
            "code",
            "is_active",
            "config",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "config": {"write_only": True},  # Hide sensitive config data in responses
        }


class PaymentGatewayAdminSerializer(serializers.ModelSerializer):
    """Admin-safe serializer that shows masked sensitive fields for editing"""

    masked_config = serializers.SerializerMethodField()

    class Meta:
        model = PaymentGateway
        fields = [
            "id",
            "name",
            "code",
            "is_active",
            "config",
            "masked_config",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "masked_config"]
        extra_kwargs = {
            "config": {"write_only": True},  # Still write-only for security
        }

    def get_masked_config(self, obj):
        """Return configuration with sensitive fields masked for admin display"""
        if not obj.config:
            return {}

        config = obj.config.copy()
        masked_config = {}

        # Gateway-specific masking
        if obj.code == "stripe":
            masked_config.update(
                {
                    "publishable_key": self._mask_key(config.get("publishable_key")),
                    "secret_key": self._mask_key(config.get("secret_key")),
                    "webhook_secret": self._mask_key(config.get("webhook_secret")),
                    "test_mode": config.get("test_mode", False),
                    "_configured": bool(config.get("publishable_key") and config.get("secret_key")),
                }
            )
        elif obj.code == "paymongo":
            masked_config.update(
                {
                    "public_key": self._mask_key(config.get("public_key")),
                    "secret_key": self._mask_key(config.get("secret_key")),
                    "webhook_secret": self._mask_key(config.get("webhook_secret")),
                    "test_mode": config.get("test_mode", False),
                    "_configured": bool(config.get("public_key") and config.get("secret_key")),
                }
            )
        elif obj.code == "paypal":
            masked_config.update(
                {
                    "client_id": self._mask_key(config.get("client_id")),
                    "client_secret": self._mask_key(config.get("client_secret")),
                    "environment": config.get("environment", "sandbox"),
                    "_configured": bool(config.get("client_id") and config.get("client_secret")),
                }
            )
        else:
            # Generic masking for other gateways
            for key, value in config.items():
                if any(sensitive in key.lower() for sensitive in ["key", "secret", "token", "password"]):
                    masked_config[key] = self._mask_key(value)
                else:
                    masked_config[key] = value

            # Add configuration status
            sensitive_fields = [k for k in config if any(s in k.lower() for s in ["key", "secret", "token"])]
            masked_config["_configured"] = len(sensitive_fields) > 0 and all(config.get(k) for k in sensitive_fields)

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
            "id",
            "name",
            "code",
            "is_active",
            "description",
        ]
        read_only_fields = ["id", "name", "code", "is_active", "description"]

    def to_representation(self, instance):
        """Custom representation to include only essential public config if needed"""
        data = super().to_representation(instance)

        # Add minimal public configuration (no sensitive data)
        public_config = {}

        if instance.code == "stripe":
            # Include safe public fields for Stripe integration
            config = instance.config or {}
            public_config["test_mode"] = config.get("test_mode", False)
            # Include publishable_key for Stripe Elements initialization
            if "publishable_key" in config:
                public_config["publishable_key"] = config["publishable_key"]
        elif instance.code == "paypal":
            config = instance.config or {}
            public_config["environment"] = config.get("environment", "sandbox")
        elif instance.code == "paymongo":
            config = instance.config or {}
            public_config["test_mode"] = config.get("test_mode", False)

        # Only add public_config if it has content
        if public_config:
            data["public_config"] = public_config

        return data
