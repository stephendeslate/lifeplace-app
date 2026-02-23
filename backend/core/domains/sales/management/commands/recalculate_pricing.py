from django.core.management.base import BaseCommand

from core.domains.payments.models import Invoice, TaxRate
from core.domains.sales.models import EventQuote


class Command(BaseCommand):
    help = "Recalculate pricing for existing quotes and invoices using centralized pricing service"

    def _get_default_tax_rate(self):
        """Get default tax rate from TaxRate table (no hardcoded fallback)"""
        from decimal import Decimal

        default_tax = TaxRate.objects.filter(is_default=True).first()
        return default_tax.rate if default_tax else Decimal("0")

    def _calculate_quote_totals_without_save(self, quote):
        """Calculate quote totals without saving to database"""
        from decimal import Decimal

        from core.domains.sales.pricing_service import PricingCalculationService, PricingLineItem

        default_tax_rate = self._get_default_tax_rate()

        # Convert line items to pricing format
        pricing_line_items = []
        for item in quote.line_items.all():
            # Use item's tax_rate if available, otherwise use global default
            item_tax_rate = item.tax_rate if item.tax_rate else default_tax_rate
            pricing_line_items.append(
                PricingLineItem(
                    product_id=item.id,
                    name=item.description,
                    description=item.description,
                    base_unit_price=item.unit_price,
                    quantity=item.quantity,
                    tax_rate=item_tax_rate,
                )
            )

        if pricing_line_items:
            breakdown = PricingCalculationService.calculate_pricing_breakdown(pricing_line_items)
            subtotal = breakdown.subtotal
            tax_amount = breakdown.tax_amount

            # Apply discount if present
            discount_amount = Decimal("0.00")
            if quote.discount:
                if quote.discount.discount_type == "PERCENTAGE":
                    discount_amount = subtotal * (quote.discount.value / 100)
                else:  # FIXED
                    discount_amount = min(quote.discount.value, subtotal)

            total_amount = subtotal - discount_amount + tax_amount
            return subtotal, tax_amount, total_amount
        else:
            return Decimal("0.00"), Decimal("0.00"), Decimal("0.00")

    def _calculate_invoice_totals_without_save(self, invoice):
        """Calculate invoice totals without saving to database"""
        from decimal import Decimal

        from core.domains.sales.pricing_service import PricingCalculationService, PricingLineItem

        default_tax_rate = self._get_default_tax_rate()

        # Convert line items to pricing format
        pricing_line_items = []
        for item in invoice.line_items.all():
            # Use item's tax_rate if available, otherwise use global default
            item_tax_rate = item.tax_rate if item.tax_rate else default_tax_rate
            pricing_line_items.append(
                PricingLineItem(
                    product_id=item.id,
                    name=item.description,
                    description=item.description,
                    base_unit_price=item.unit_price,
                    quantity=item.quantity,
                    tax_rate=item_tax_rate,
                )
            )

        if pricing_line_items:
            breakdown = PricingCalculationService.calculate_pricing_breakdown(pricing_line_items)
            return breakdown.subtotal, breakdown.tax_amount, breakdown.total_amount
        else:
            return Decimal("0.00"), Decimal("0.00"), Decimal("0.00")

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be updated without making changes",
        )
        parser.add_argument(
            "--quotes-only",
            action="store_true",
            help="Only recalculate quotes",
        )
        parser.add_argument(
            "--invoices-only",
            action="store_true",
            help="Only recalculate invoices",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        quotes_only = options["quotes_only"]
        invoices_only = options["invoices_only"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))

        # Recalculate quotes
        if not invoices_only:
            self.stdout.write("\nRecalculating quotes...")
            quotes = EventQuote.objects.filter(status__in=["DRAFT", "SENT", "ACCEPTED"]).order_by("id")
            quote_count = 0

            for quote in quotes:
                old_total = quote.total_amount
                old_tax = quote.tax_amount
                old_subtotal = quote.subtotal

                # Calculate new values
                if dry_run:
                    # Calculate without saving
                    new_subtotal, new_tax, new_total = self._calculate_quote_totals_without_save(quote)
                else:
                    quote.calculate_totals()
                    quote.refresh_from_db()
                    new_total = quote.total_amount
                    new_tax = quote.tax_amount
                    new_subtotal = quote.subtotal

                # Show changes
                if old_total != new_total or old_tax != new_tax or old_subtotal != new_subtotal:
                    self.stdout.write(f"Quote #{quote.id} (Event #{quote.event.id}):")
                    if old_subtotal != new_subtotal:
                        self.stdout.write(f"  Subtotal: ₱{old_subtotal} → ₱{new_subtotal}")
                    if old_tax != new_tax:
                        self.stdout.write(f"  Tax: ₱{old_tax} → ₱{new_tax}")
                    if old_total != new_total:
                        self.stdout.write(f"  Total: ₱{old_total} → ₱{new_total}")
                    quote_count += 1

            self.stdout.write(f"Updated {quote_count} quotes")

        # Recalculate invoices
        if not quotes_only:
            self.stdout.write("\nRecalculating invoices...")
            invoices = Invoice.objects.filter(status__in=["DRAFT", "SENT", "PAID"]).order_by("id")
            invoice_count = 0

            for invoice in invoices:
                old_total = invoice.total_amount
                old_tax = invoice.tax_amount
                old_subtotal = invoice.subtotal

                # Calculate new values
                if dry_run:
                    # Calculate without saving
                    new_subtotal, new_tax, new_total = self._calculate_invoice_totals_without_save(invoice)
                else:
                    invoice.calculate_totals()
                    invoice.refresh_from_db()
                    new_total = invoice.total_amount
                    new_tax = invoice.tax_amount
                    new_subtotal = invoice.subtotal

                # Show changes
                if old_total != new_total or old_tax != new_tax or old_subtotal != new_subtotal:
                    self.stdout.write(f"Invoice #{invoice.invoice_id} (Event #{invoice.event.id}):")
                    if old_subtotal != new_subtotal:
                        self.stdout.write(f"  Subtotal: ₱{old_subtotal} → ₱{new_subtotal}")
                    if old_tax != new_tax:
                        self.stdout.write(f"  Tax: ₱{old_tax} → ₱{new_tax}")
                    if old_total != new_total:
                        self.stdout.write(f"  Total: ₱{old_total} → ₱{new_total}")
                    invoice_count += 1

            self.stdout.write(f"Updated {invoice_count} invoices")

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN COMPLETED - Run without --dry-run to apply changes"))
        else:
            self.stdout.write(self.style.SUCCESS("\nPricing recalculation completed successfully!"))
