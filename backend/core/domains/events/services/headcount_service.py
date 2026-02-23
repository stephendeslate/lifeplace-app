# backend/core/domains/events/services/headcount_service.py
"""
Headcount Update Service

Handles updating the guest headcount on a booked event with automatic
quote revision and supplementary invoice creation for price deltas.
"""

import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from ..models import Event, EventTimeline

logger = logging.getLogger(__name__)


class HeadcountUpdateService:
    """
    Updates event headcount with optional quote revision and supplementary invoice.

    Flow:
    1. Validate new_count against package constraints (min/max guests)
    2. Update event.num_participants
    3. Update EventProductOption.num_participants for PER_PERSON products
    4. Optionally create a quote revision with updated line item quantities
    5. Optionally create a supplementary invoice for positive price deltas
    6. Log to EventTimeline
    7. Return result dict
    """

    @staticmethod
    def update_headcount(
        event: Event,
        new_count: int,
        user,
        create_quote_revision: bool = True,
        create_supplementary_invoice: bool = True,
        notes: str = "",
    ) -> dict:
        """
        Update event headcount with optional quote revision and supplementary invoice.

        Args:
            event: The Event instance to update.
            new_count: The new guest/participant count.
            user: The user performing the update.
            create_quote_revision: Whether to create a new draft quote version.
            create_supplementary_invoice: Whether to create a supplementary invoice
                for positive price deltas.
            notes: Optional notes for the timeline entry.

        Returns:
            dict with keys: success, old_count, new_count, old_total, new_total,
            delta, quote_revision, supplementary_invoice, refund_needed, refund_amount,
            per_person_products_updated, error.
        """
        from core.domains.sales.models import EventQuote, QuoteActivity

        result = {
            "success": False,
            "old_count": event.num_participants,
            "new_count": new_count,
            "old_total": None,
            "new_total": None,
            "delta": None,
            "quote_revision": None,
            "supplementary_invoice": None,
            "refund_needed": False,
            "refund_amount": Decimal("0.00"),
            "per_person_products_updated": 0,
            "error": None,
        }

        if new_count < 1:
            result["error"] = "Guest count must be at least 1."
            return result

        old_count = event.num_participants or 0

        if new_count == old_count:
            result["error"] = "New guest count is the same as the current count."
            return result

        # ----------------------------------------------------------------
        # Step 1: Find PER_PERSON EventProductOptions and validate constraints
        # ----------------------------------------------------------------
        per_person_epos = []
        for epo in event.event_products.select_related("product_option").all():
            product_option = epo.product_option
            if product_option.pricing_unit == "PER_PERSON":
                # Validate against min/max guests
                if product_option.minimum_guests and new_count < product_option.minimum_guests:
                    result["error"] = (
                        f"Guest count {new_count} is below the minimum "
                        f"of {product_option.minimum_guests} for "
                        f"'{product_option.name}'."
                    )
                    return result
                if product_option.maximum_guests and new_count > product_option.maximum_guests:
                    result["error"] = (
                        f"Guest count {new_count} exceeds the maximum "
                        f"of {product_option.maximum_guests} for "
                        f"'{product_option.name}'."
                    )
                    return result
                per_person_epos.append(epo)

        # ----------------------------------------------------------------
        # Steps 2-6 inside an atomic transaction
        # ----------------------------------------------------------------
        with transaction.atomic():
            # Step 2: Update event.num_participants
            event.num_participants = new_count
            event.save(update_fields=["num_participants"])

            # Step 3: Update EventProductOption.num_participants for PER_PERSON products
            for epo in per_person_epos:
                epo.num_participants = new_count
                # Recalculate final_price based on per-person pricing
                epo.final_price = epo.product_option.base_price * new_count * epo.quantity
                epo.save(update_fields=["num_participants", "final_price"])

            result["per_person_products_updated"] = len(per_person_epos)

            # Step 4: Optionally create a quote revision
            old_total = Decimal("0.00")
            new_total = Decimal("0.00")
            new_quote = None

            if create_quote_revision:
                # Find the latest accepted or sent quote for this event
                latest_quote = (
                    EventQuote.objects.filter(event=event, status__in=["ACCEPTED", "SENT"]).order_by("-version").first()
                )

                if latest_quote:
                    old_total = latest_quote.total_amount or Decimal("0.00")

                    # Create a new draft version
                    new_quote = latest_quote.create_next_version()

                    # Update PER_PERSON line items in the new quote
                    per_person_product_ids = [epo.product_option_id for epo in per_person_epos]

                    for line_item in new_quote.line_items.filter(product_id__in=per_person_product_ids):
                        line_item.quantity = new_count
                        line_item.total = line_item.unit_price * new_count
                        line_item.save(update_fields=["quantity", "total"])

                    # Recalculate quote totals from line items
                    all_items = new_quote.line_items.all()
                    subtotal = sum(item.total for item in all_items)
                    tax_amount = sum(item.total * (item.tax_rate / Decimal("100")) for item in all_items)
                    new_total = subtotal + tax_amount

                    new_quote.subtotal = subtotal
                    new_quote.tax_amount = tax_amount
                    new_quote.total_amount = new_total
                    new_quote.notes = (f"{new_quote.notes}\nHeadcount updated from {old_count} to {new_count}.").strip()
                    new_quote.save(update_fields=["subtotal", "tax_amount", "total_amount", "notes"])

                    # Record quote activity
                    QuoteActivity.objects.create(
                        quote=new_quote,
                        action="UPDATED",
                        action_by=user,
                        notes=(
                            f"Headcount revision: {old_count} -> {new_count} guests. "
                            f"Total changed from {old_total} to {new_total}."
                        ),
                    )

                    result["quote_revision"] = {
                        "id": new_quote.id,
                        "version": new_quote.version,
                        "status": new_quote.status,
                        "total_amount": str(new_total),
                    }

            result["old_total"] = str(old_total)
            result["new_total"] = str(new_total)
            delta = new_total - old_total
            result["delta"] = str(delta)

            # Step 5: Optionally create supplementary invoice for positive delta
            if create_supplementary_invoice and delta > Decimal("0.00") and new_quote:
                supplementary_invoice = HeadcountUpdateService._create_supplementary_invoice(
                    event=event,
                    delta=delta,
                    old_count=old_count,
                    new_count=new_count,
                    new_quote=new_quote,
                )
                if supplementary_invoice:
                    result["supplementary_invoice"] = {
                        "id": supplementary_invoice.id,
                        "invoice_id": supplementary_invoice.invoice_id,
                        "total_amount": str(supplementary_invoice.total_amount),
                        "status": supplementary_invoice.status,
                    }

            # Track if a refund is needed (negative delta)
            if delta < Decimal("0.00"):
                result["refund_needed"] = True
                result["refund_amount"] = str(abs(delta))

            # Step 6: Log to EventTimeline
            EventTimeline.objects.create(
                event=event,
                action_type="SYSTEM_UPDATE",
                description=(
                    f"Guest count updated from {old_count} to {new_count}"
                    f"{' by ' + user.get_full_name() if user else ''}"
                ),
                actor=user,
                is_public=False,
                action_data={
                    "old_count": old_count,
                    "new_count": new_count,
                    "old_total": str(old_total),
                    "new_total": str(new_total),
                    "delta": str(delta),
                    "quote_revision_id": new_quote.id if new_quote else None,
                    "per_person_products_updated": len(per_person_epos),
                    "notes": notes,
                },
            )

            logger.info(
                f"Event {event.id} headcount updated: {old_count} -> {new_count}, "
                f"delta={delta}, quote_revision={'yes' if new_quote else 'no'}"
            )

        result["success"] = True
        return result

    @staticmethod
    def _create_supplementary_invoice(
        event: Event,
        delta: Decimal,
        old_count: int,
        new_count: int,
        new_quote,
    ):
        """
        Create a supplementary invoice for the positive price delta
        resulting from a headcount increase.

        Args:
            event: The event instance.
            delta: The positive price difference.
            old_count: Previous guest count.
            new_count: New guest count.
            new_quote: The new quote revision.

        Returns:
            Invoice instance or None.
        """
        from core.domains.payments.models import Invoice, InvoiceLineItem

        try:
            invoice_id = f"INV-SUPP-{timezone.now().strftime('%Y%m%d')}-{event.id}-HC{new_count}"

            # Ensure uniqueness
            counter = 1
            base_invoice_id = invoice_id
            while Invoice.objects.filter(invoice_id=invoice_id).exists():
                invoice_id = f"{base_invoice_id}-{counter}"
                counter += 1

            # Due date: same as the event's existing invoice or 7 days from now
            existing_invoice = (
                Invoice.objects.filter(event=event, status__in=["ISSUED", "PARTIALLY_PAID"])
                .order_by("-created_at")
                .first()
            )
            due_date = (
                existing_invoice.due_date if existing_invoice else (timezone.now().date() + timezone.timedelta(days=7))
            )

            invoice = Invoice.objects.create(
                invoice_id=invoice_id,
                event=event,
                client=event.client,
                subtotal=delta,
                tax_amount=Decimal("0.00"),
                total_amount=delta,
                issue_date=timezone.now().date(),
                due_date=due_date,
                status="DRAFT",
                notes=(f"Supplementary invoice for headcount change: {old_count} -> {new_count} guests."),
                quote=new_quote,
            )

            # Create a single line item for the difference
            InvoiceLineItem.objects.create(
                invoice=invoice,
                description=(f"Headcount adjustment: {old_count} -> {new_count} guests"),
                quantity=1,
                unit_price=delta,
                tax_rate=Decimal("0.00"),
                total=delta,
            )

            logger.info(f"Created supplementary invoice {invoice_id} for event {event.id}, amount={delta}")

            return invoice

        except Exception as e:
            logger.error(
                f"Failed to create supplementary invoice for event {event.id}: {e}",
                exc_info=True,
            )
            return None
