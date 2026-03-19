import logging
from decimal import Decimal

from django.db import models, transaction
from django.utils import timezone

from core.utils.models import BaseModel

logger = logging.getLogger(__name__)


class Invoice(BaseModel):
    """Invoice records for clients"""

    invoice_id = models.CharField(max_length=50, unique=True)
    event = models.ForeignKey("events.Event", on_delete=models.CASCADE, related_name="invoices")
    client = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="invoices")
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="PHP", help_text="Invoice currency (ISO 4217 code)")
    issue_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=[
            ("DRAFT", "Draft"),
            ("ISSUED", "Issued"),
            ("PARTIALLY_PAID", "Partially Paid"),
            ("PAID", "Paid"),
            ("VOID", "Void"),
            ("CANCELLED", "Cancelled"),
        ],
    )
    notes = models.TextField(blank=True)
    payment_terms = models.TextField(blank=True)

    # Link to quote that originated the invoice
    quote = models.ForeignKey(
        "sales.EventQuote", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices"
    )

    # PDF file
    invoice_pdf = models.FileField(upload_to="invoices/", null=True, blank=True)

    def __str__(self):
        return f"Invoice {self.invoice_id}"

    @property
    def paid_amount(self):
        """Calculate total paid from related payments - NO DB FIELD"""
        from django.db.models import Sum

        total = self.related_payments.filter(status="COMPLETED").aggregate(total=Sum("amount"))["total"]
        return total or Decimal("0.00")

    @property
    def remaining_amount(self):
        """Calculate remaining amount to be paid - NO DB FIELD"""
        return self.total_amount - self.paid_amount

    @property
    def is_fully_paid(self):
        """Check if invoice is fully paid - NO DB FIELD"""
        return self.paid_amount >= self.total_amount

    @property
    def is_partially_paid(self):
        """Check if invoice has partial payment - NO DB FIELD"""
        paid = self.paid_amount
        return Decimal("0.00") < paid < self.total_amount

    def mark_as_paid(self):
        """Mark invoice as paid or partially paid based on actual payments.

        Uses atomic transaction with row locking to prevent race conditions
        when multiple payments complete concurrently.

        This method intelligently determines the correct invoice status by:
        1. Calculating total paid amount from related completed payments
        2. Setting status to PAID only if fully paid
        3. Setting status to PARTIALLY_PAID if partially paid
        4. Keeping status as ISSUED if no payments made
        """
        with transaction.atomic():
            # Re-fetch with lock to prevent concurrent status updates
            locked_invoice = Invoice.objects.select_for_update().get(pk=self.pk)

            # Calculate paid amount from locked invoice
            paid = locked_invoice.paid_amount

            # Determine correct status based on payment amount
            if paid >= locked_invoice.total_amount:
                # Fully paid
                locked_invoice.status = "PAID"
            elif paid > Decimal("0.00"):
                # Partially paid
                locked_invoice.status = "PARTIALLY_PAID"
            elif locked_invoice.status != "ISSUED":
                # No payment, but not yet issued
                # Keep current status (DRAFT, VOID, CANCELLED, etc.)
                pass

            locked_invoice.save(update_fields=["status"])

            # Sync self with locked instance
            self.status = locked_invoice.status

            # Update event's payment status
            locked_invoice.event.update_payment_status()

    def issue(self):
        """Issue the invoice to the client"""
        from .notifications import PaymentNotification

        self.status = "ISSUED"
        self.issue_date = timezone.now().date()
        self.save(update_fields=["status", "issue_date"])

        # Create payment notification
        PaymentNotification.objects.create(
            notification_type="INVOICE_ISSUED",
            sent_at=timezone.now(),
            sent_to=self.client.email,
            is_successful=True,
            reference=f"invoice_{self.id}",
        )

        # Add to event timeline
        from core.domains.events.models import EventTimeline

        EventTimeline.objects.create(
            event=self.event,
            action_type="SYSTEM_UPDATE",
            description=f"Invoice {self.invoice_id} issued to client",
            is_public=True,
            action_data={"invoice_id": self.id},
        )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["due_date"]),
            models.Index(fields=["event", "status"]),
            models.Index(fields=["client", "status"]),
            models.Index(fields=["quote"]),  # For quote-invoice lookup queries
        ]


class InvoiceLineItem(BaseModel):
    """Line items on an invoice with preserved pricing calculation details"""

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="line_items")
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    product = models.ForeignKey("products.ProductOption", on_delete=models.SET_NULL, null=True, blank=True)

    # Enhanced fields to preserve PricingLineItem data (DRY compliance)
    item_type = models.CharField(
        max_length=20,
        choices=[("PACKAGE", "Package"), ("ADDON", "Add-on")],
        default="PACKAGE",
        help_text="Type of item to distinguish packages from addons",
    )
    base_unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Base price before excess hours (unit_price = base_unit_price + excess per unit)",
    )
    excess_hours = models.PositiveIntegerField(null=True, blank=True, help_text="Number of excess hours for this item")
    excess_hour_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Price per excess hour"
    )
    excess_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Total excess cost (excess_hours * excess_hour_price)",
    )

    def save(self, *args, **kwargs):
        # Auto-calculate total if not set
        if not self.total:
            self.total = self.quantity * self.unit_price

        # Ensure backward compatibility: if base_unit_price not set, use unit_price
        if self.base_unit_price is None:
            self.base_unit_price = self.unit_price

        super().save(*args, **kwargs)

        # Note: Invoice totals are preserved from quote - no recalculation needed to maintain single source of truth

    def __str__(self):
        return f"{self.description} - {self.invoice.invoice_id}"


class InvoiceTax(BaseModel):
    """Applied tax on an invoice"""

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="taxes")
    tax_rate = models.ForeignKey("payments.TaxRate", on_delete=models.PROTECT)
    taxable_amount = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"Tax {self.tax_rate.name} on Invoice {self.invoice.invoice_id}"
