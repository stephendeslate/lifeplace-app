from django.db import models, transaction

from core.utils.encryption import EncryptedJSONField
from core.utils.models import BaseModel


class PaymentGateway(BaseModel):
    """Payment gateway configurations with encrypted sensitive data"""

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    is_active = models.BooleanField(default=True)
    # Store configuration securely with encryption
    config = EncryptedJSONField(default=dict)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} Gateway"

    def get_decrypted_config(self):
        """Get the decrypted configuration (for API usage)"""
        return self.config

    def set_config_safely(self, config_data):
        """Set configuration data with validation"""
        if not isinstance(config_data, dict):
            raise ValueError("Configuration must be a dictionary")

        # Validate required fields based on gateway type
        required_fields = {
            "stripe": ["secret_key", "publishable_key"],
            "paypal": ["client_id", "client_secret"],
            "square": ["access_token", "application_id"],
        }

        if self.code in required_fields:
            missing_fields = []
            for field in required_fields[self.code]:
                if field not in config_data:
                    missing_fields.append(field)

            if missing_fields:
                raise ValueError(f"Missing required fields for {self.code}: {missing_fields}")

        self.config = config_data

    class Meta:
        ordering = ["name"]


class PaymentMethod(BaseModel):
    """Saved payment methods for clients"""

    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="payment_methods")
    type = models.CharField(
        max_length=50,
        choices=[
            ("CREDIT_CARD", "Credit Card"),
            ("BANK_TRANSFER", "Bank Transfer"),
            ("CHECK", "Check"),
            ("CASH", "Cash"),
            ("DIGITAL_WALLET", "Digital Wallet"),
        ],
    )
    is_default = models.BooleanField(default=False)
    nickname = models.CharField(max_length=100, blank=True)
    instructions = models.TextField(blank=True)
    gateway = models.ForeignKey(PaymentGateway, on_delete=models.SET_NULL, null=True, blank=True)
    token_reference = models.CharField(max_length=255, blank=True)
    last_four = models.CharField(max_length=4, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.user.email} - {self.get_type_display()} ({self.nickname or 'Unnamed'})"

    def save(self, *args, **kwargs):
        # If this method is set as default, unset other defaults for this user
        # Use atomic transaction to prevent race conditions when setting defaults
        if self.is_default:
            with transaction.atomic():
                PaymentMethod.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(
                    is_default=False
                )
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

    class Meta:
        ordering = ["-is_default", "-created_at"]


class PaymentTransaction(BaseModel):
    """Detailed payment transaction records with gateway info"""

    payment = models.ForeignKey("payments.Payment", on_delete=models.CASCADE, related_name="transactions")
    gateway = models.ForeignKey(PaymentGateway, on_delete=models.PROTECT)
    transaction_id = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="PHP", help_text="Transaction currency (ISO 4217 code)")
    status = models.CharField(
        max_length=50,
        choices=[
            ("PENDING", "Pending"),
            ("PROCESSING", "Processing"),
            ("COMPLETED", "Completed"),
            ("FAILED", "Failed"),
            ("CANCELLED", "Cancelled"),
        ],
    )
    response_data = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
    is_test = models.BooleanField(default=False)

    def __str__(self):
        return f"Transaction {self.transaction_id} - {self.status}"

    def save(self, *args, **kwargs):
        from django.db import transaction

        super().save(*args, **kwargs)

        # Update payment status based on transaction status
        if self.status == "COMPLETED" and self.payment.status != "COMPLETED":
            # Defer payment completion until after the atomic transaction completes
            # This prevents nested transaction issues
            transaction.on_commit(self.payment.complete_payment)
        elif self.status == "FAILED" and self.payment.status == "PENDING":
            self.payment.status = "FAILED"
            self.payment.save(update_fields=["status"])

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["transaction_id"]),
            models.Index(fields=["gateway", "status"]),
        ]
