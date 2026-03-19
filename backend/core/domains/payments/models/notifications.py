from django.db import models

from core.utils.models import BaseModel


class PaymentNotification(BaseModel):
    """Records of payment-related notifications sent to clients"""

    payment = models.ForeignKey(
        "payments.Payment", on_delete=models.SET_NULL, null=True, blank=True, related_name="notifications"
    )
    notification_type = models.CharField(
        max_length=50,
        choices=[
            ("INVOICE_ISSUED", "Invoice Issued"),
            ("PAYMENT_REMINDER", "Payment Reminder"),
            ("PAYMENT_RECEIVED", "Payment Received"),
            ("PAYMENT_OVERDUE", "Payment Overdue"),
            ("RECEIPT_SENT", "Receipt Sent"),
        ],
    )
    sent_at = models.DateTimeField()
    sent_to = models.EmailField()
    # FIX: Change from 'communications.EmailTemplate' to 'communications.CommunicationTemplate'
    template_used = models.ForeignKey(
        "communications.CommunicationTemplate", null=True, blank=True, on_delete=models.SET_NULL
    )
    is_successful = models.BooleanField(default=True)
    reference = models.CharField(max_length=255, blank=True, help_text="Reference to related object, e.g., invoice_123")

    def __str__(self):
        return f"{self.get_notification_type_display()} sent to {self.sent_to} on {self.sent_at.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ["-sent_at"]
