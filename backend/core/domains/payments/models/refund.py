import logging

from django.db import models
from django.utils import timezone

from core.utils.models import BaseModel

logger = logging.getLogger(__name__)


class Refund(BaseModel):
    """Refund records for payments"""

    payment = models.ForeignKey("payments.Payment", on_delete=models.CASCADE, related_name="refunds")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="PHP", help_text="Refund currency (ISO 4217 code)")
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=[
            ("PENDING", "Pending"),
            ("PROCESSING", "Processing"),
            ("COMPLETED", "Completed"),
            ("FAILED", "Failed"),
            ("REJECTED", "Rejected"),
        ],
    )
    refunded_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True)
    refund_transaction_id = models.CharField(max_length=255, blank=True)
    gateway_response = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Refund for Payment {self.payment.payment_number} - {self.status}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # Add to event timeline
        if self.status == "COMPLETED":
            from core.domains.events.models import EventTimeline

            EventTimeline.objects.create(
                event=self.payment.event,
                action_type="SYSTEM_UPDATE",
                description=f"Refund of {self.currency} {self.amount} processed",
                actor=self.refunded_by,
                is_public=True,
                action_data={
                    "refund_id": self.id,
                    "payment_id": self.payment.id,
                    "amount": str(self.amount),
                    "currency": self.currency,
                    "reason": self.reason,
                },
            )

    class Meta:
        ordering = ["-created_at"]


class PaymentDispute(BaseModel):
    """
    Track payment disputes/chargebacks from payment gateways.

    Chargebacks occur when a customer disputes a charge with their bank.
    This model records dispute details and status for tracking and resolution.
    """

    DISPUTE_STATUS_CHOICES = [
        ("OPEN", "Open"),
        ("UNDER_REVIEW", "Under Review"),
        ("WON", "Won"),
        ("LOST", "Lost"),
        ("CLOSED", "Closed"),
    ]

    DISPUTE_REASON_CHOICES = [
        ("DUPLICATE", "Duplicate Charge"),
        ("FRAUDULENT", "Fraudulent"),
        ("SUBSCRIPTION_CANCELED", "Subscription Canceled"),
        ("PRODUCT_UNACCEPTABLE", "Product Unacceptable"),
        ("PRODUCT_NOT_RECEIVED", "Product Not Received"),
        ("UNRECOGNIZED", "Unrecognized"),
        ("CREDIT_NOT_PROCESSED", "Credit Not Processed"),
        ("GENERAL", "General"),
        ("OTHER", "Other"),
    ]

    # Link to payment
    payment = models.ForeignKey(
        "payments.Payment",
        on_delete=models.CASCADE,
        related_name="disputes",
        null=True,
        blank=True,
        help_text="Related payment (may be null if payment not found)",
    )

    # Gateway identifiers
    gateway = models.ForeignKey(
        "payments.PaymentGateway", on_delete=models.PROTECT, help_text="Payment gateway that reported the dispute"
    )
    gateway_dispute_id = models.CharField(max_length=255, unique=True, help_text="Dispute ID from the payment gateway")
    gateway_transaction_id = models.CharField(max_length=255, help_text="Original transaction ID from gateway")

    # Dispute details
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Disputed amount")
    currency = models.CharField(max_length=3, default="PHP", help_text="Currency of the disputed amount")
    reason = models.CharField(
        max_length=50, choices=DISPUTE_REASON_CHOICES, default="OTHER", help_text="Reason for the dispute"
    )
    reason_description = models.TextField(blank=True, help_text="Detailed description of the dispute reason")

    # Status tracking
    status = models.CharField(
        max_length=20, choices=DISPUTE_STATUS_CHOICES, default="OPEN", help_text="Current status of the dispute"
    )
    evidence_due_by = models.DateTimeField(null=True, blank=True, help_text="Deadline to submit evidence")

    # Resolution
    resolved_at = models.DateTimeField(null=True, blank=True, help_text="When the dispute was resolved")
    resolution_notes = models.TextField(blank=True, help_text="Notes about the resolution")

    # Raw gateway data
    gateway_data = models.JSONField(default=dict, help_text="Raw dispute data from gateway webhook")

    # Admin tracking
    assigned_to = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_disputes",
        help_text="Admin user assigned to handle this dispute",
    )
    admin_notified = models.BooleanField(default=False, help_text="Whether admin has been notified")
    admin_notified_at = models.DateTimeField(null=True, blank=True, help_text="When admin was notified")

    def __str__(self):
        return f"Dispute {self.gateway_dispute_id} - {self.status}"

    def mark_won(self, notes: str = ""):
        """Mark dispute as won"""
        self.status = "WON"
        self.resolved_at = timezone.now()
        self.resolution_notes = notes
        self.save()

    def mark_lost(self, notes: str = ""):
        """Mark dispute as lost"""
        self.status = "LOST"
        self.resolved_at = timezone.now()
        self.resolution_notes = notes
        self.save()

        # Update payment status if dispute was lost
        if self.payment:
            self.payment.status = "REFUNDED"
            self.payment.save(update_fields=["status"])

    class Meta:
        verbose_name = "Payment Dispute"
        verbose_name_plural = "Payment Disputes"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["gateway", "-created_at"]),
            models.Index(fields=["payment", "-created_at"]),
        ]
