# backend/core/domains/sales/signals.py
import logging
from decimal import Decimal

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import EventQuote, QuoteLineItem

logger = logging.getLogger(__name__)


def _format_currency_for_contract(amount, currency_settings=None):
    """Format amount using system currency settings for contract templates"""
    if not amount:
        return "₱0.00"

    try:
        amount_float = float(amount)
    except (ValueError, TypeError):
        amount_float = 0

    # Get currency settings if not provided
    if currency_settings is None:
        from core.domains.settings.models import CurrencySettings

        currency_settings = CurrencySettings.get_system_settings()

    # Currency symbol mapping
    currency_symbols = {
        "PHP": "₱",
        "USD": "$",
        "EUR": "€",
        "SGD": "S$",
        "HKD": "HK$",
    }

    currency_code = currency_settings.default_currency
    symbol = currency_symbols.get(currency_code, currency_code)
    decimal_places = currency_settings.decimal_places
    thousands_sep = currency_settings.thousands_separator
    decimal_sep = currency_settings.decimal_separator

    # Format the number
    if decimal_places == 0:
        formatted = f"{amount_float:,.0f}"
    else:
        formatted = f"{amount_float:,.{decimal_places}f}"

    # Replace separators
    formatted = formatted.replace(",", "|").replace(".", decimal_sep).replace("|", thousands_sep)

    # Apply display format
    display_format = currency_settings.display_format
    if display_format == "code":
        return f"{formatted} {currency_code}"
    elif display_format == "both":
        return f"{symbol}{formatted} {currency_code}"
    else:
        return f"{symbol}{formatted}"


@receiver(post_save, sender=EventQuote)
def handle_quote_acceptance(sender, instance, created, **kwargs):
    """Handle quote acceptance by creating contract and invoice automatically"""
    # Only process when quote status changes to ACCEPTED (not on creation)
    if not created and instance.status == "ACCEPTED":
        try:
            # STEP 1: CREATE CONTRACT FIRST (before invoice)
            # Contract must be generated and sent for signature BEFORE payment
            if instance.template and instance.template.contract_templates.exists():
                from core.domains.contracts.models import EventContract
                from core.domains.contracts.services import EventContractService

                # Select contract template based on event type (Option C)
                contract_template = None
                if instance.event.event_type:
                    # Priority: Match event type
                    contract_template = instance.template.contract_templates.filter(
                        event_type=instance.event.event_type
                    ).first()

                # Fallback: Use first available contract template
                if not contract_template:
                    contract_template = instance.template.contract_templates.first()

                if contract_template:
                    # Check if contract already exists for this event
                    existing_contract = EventContract.objects.filter(
                        event=instance.event, template=contract_template, is_amendment=False
                    ).first()

                    if not existing_contract:
                        # Calculate contract valid_until based on event date
                        # Contract should expire at least 1 day before the event
                        from datetime import timedelta

                        event_date = (
                            instance.event.start_date.date()
                            if hasattr(instance.event.start_date, "date")
                            else instance.event.start_date
                        )
                        contract_valid_until = event_date - timedelta(days=1)

                        # Create contract from template
                        logger.info(
                            f"Creating contract for event {instance.event.id} using template {contract_template.id}"
                        )

                        # Build context_data with ALL quote pricing variables
                        # This ensures correct pricing in contract content regardless of DB query timing
                        from core.domains.payments.models import PaymentSettings
                        from core.domains.settings.models import CurrencySettings

                        currency_settings = CurrencySettings.get_system_settings()
                        payment_settings = PaymentSettings.get_default_settings()

                        # Calculate deposit and balance from quote total
                        deposit_pct = payment_settings.default_deposit_percentage
                        deposit_amount = instance.total_amount * (deposit_pct / Decimal("100"))
                        balance_amount = instance.total_amount - deposit_amount

                        # Build pricing context with all variables needed for contract templates
                        quote_pricing_context = {
                            # Base pricing (numeric strings)
                            "total_price": str(instance.total_amount),
                            "total_amount": str(instance.total_amount),
                            "contract_value": str(instance.total_amount),
                            "event_price": str(instance.total_amount),
                            "subtotal": str(instance.subtotal),
                            "tax_amount": str(instance.tax_amount),
                            "service_charge_amount": str(instance.service_charge_amount),
                            "discount_amount": str(instance.discount_amount),
                            # Formatted pricing (currency)
                            "total_price_formatted": _format_currency_for_contract(
                                instance.total_amount, currency_settings
                            ),
                            "total_amount_formatted": _format_currency_for_contract(
                                instance.total_amount, currency_settings
                            ),
                            "contract_value_formatted": _format_currency_for_contract(
                                instance.total_amount, currency_settings
                            ),
                            "subtotal_formatted": _format_currency_for_contract(instance.subtotal, currency_settings),
                            "tax_amount_formatted": _format_currency_for_contract(
                                instance.tax_amount, currency_settings
                            ),
                            "service_charge_formatted": _format_currency_for_contract(
                                instance.service_charge_amount, currency_settings
                            ),
                            "discount_amount_formatted": _format_currency_for_contract(
                                instance.discount_amount, currency_settings
                            ),
                            # Deposit calculations
                            "deposit_percentage": str(deposit_pct),
                            "deposit_amount": str(deposit_amount),
                            "balance_amount": str(balance_amount),
                        }

                        contract = EventContractService.create_contract_from_template(
                            event_id=instance.event.id,
                            template_id=contract_template.id,
                            valid_until=contract_valid_until,
                            contract_value=instance.total_amount,
                            context_data=quote_pricing_context,
                        )

                        # Set contract to SENT status (ready for client signature)
                        contract.status = "SENT"
                        contract.sent_at = timezone.now()
                        contract.save(update_fields=["status", "sent_at"])

                        logger.info(
                            f"Successfully created and sent contract {contract.id} for event {instance.event.id}"
                        )

                        # Add contract creation to event timeline
                        from core.domains.events.models import EventTimeline

                        EventTimeline.objects.create(
                            event=instance.event,
                            action_type="SYSTEM_UPDATE",
                            description="Contract generated and sent for signature after quote acceptance",
                            is_public=True,
                            action_data={
                                "quote_id": instance.id,
                                "contract_id": contract.id,
                                "contract_template": contract_template.name,
                            },
                        )
                    else:
                        logger.info(f"Contract already exists for event {instance.event.id}, skipping creation")

            # STEP 2: CREATE INVOICE (existing logic)
            # Check if invoice already exists for this quote
            from core.domains.payments.models import Invoice

            if Invoice.objects.filter(quote=instance).exists():
                logger.info(f"Invoice already exists for quote {instance.id}")
                return

            # Get booking flow ID from the event's booking session (if exists)
            # This allows invoice due date to use flow-specific payment terms
            from core.domains.bookingflow.models import BookingSession

            booking_session = BookingSession.objects.filter(created_event=instance.event).first()
            booking_flow_id = booking_session.booking_flow_id if booking_session else None

            # Create invoice from accepted quote
            logger.info(f"Creating invoice for accepted quote {instance.id} (booking_flow_id={booking_flow_id})")
            from core.domains.payments.services.invoice_service import InvoiceService

            invoice = InvoiceService.create_from_quote(instance, booking_flow_id=booking_flow_id)

            # Issue the invoice so it can be paid by the client
            invoice.issue()
            logger.info(f"Successfully created and issued invoice {invoice.invoice_id} from quote {instance.id}")

            # Add invoice creation to event timeline
            from core.domains.events.models import EventTimeline

            EventTimeline.objects.create(
                event=instance.event,
                action_type="SYSTEM_UPDATE",
                description=f"Invoice {invoice.invoice_id} automatically generated from accepted quote",
                is_public=True,
                action_data={"quote_id": instance.id, "invoice_id": invoice.id},
            )

        except Exception as e:
            logger.error(f"Failed to create contract/invoice for accepted quote {instance.id}: {e}")
            # Don't raise exception to avoid breaking quote acceptance


@receiver(post_save, sender=QuoteLineItem)
def recalculate_quote_totals_on_line_item_save(sender, instance, **kwargs):
    """Recalculate quote totals when a line item is created or updated"""
    _recalculate_quote_totals(instance.quote)


@receiver(post_delete, sender=QuoteLineItem)
def recalculate_quote_totals_on_line_item_delete(sender, instance, **kwargs):
    """Recalculate quote totals when a line item is deleted"""
    _recalculate_quote_totals(instance.quote)


def _recalculate_quote_totals(quote):
    """Helper function to recalculate quote subtotal, tax, service charge, and total from line items"""
    from decimal import Decimal

    from core.domains.payments.models import PaymentSettings

    # Calculate totals from line items
    subtotal = Decimal("0.00")
    tax_amount = Decimal("0.00")

    for item in quote.line_items.all():
        item_subtotal = item.unit_price * item.quantity
        item_tax = item_subtotal * (item.tax_rate / Decimal("100"))

        subtotal += item_subtotal
        tax_amount += item_tax

    # Get discount amount (preserve existing discount)
    discount_amount = quote.discount_amount or Decimal("0.00")

    # Calculate service charge based on (subtotal - discount)
    service_charge_amount = Decimal("0.00")
    try:
        settings = PaymentSettings.get_default_settings()
        if settings.service_charge_enabled:
            chargeable_amount = subtotal - discount_amount
            service_charge_rate = settings.service_charge_percentage / Decimal("100")
            service_charge_amount = (chargeable_amount * service_charge_rate).quantize(Decimal("0.01"))
    except Exception as e:
        logger.warning(f"Error calculating service charge: {e}")

    # Calculate total: subtotal - discount + service_charge + tax
    total_amount = subtotal - discount_amount + service_charge_amount + tax_amount

    # Update quote (avoid triggering signals again)
    EventQuote.objects.filter(pk=quote.pk).update(
        subtotal=subtotal, tax_amount=tax_amount, service_charge_amount=service_charge_amount, total_amount=total_amount
    )

    logger.info(
        f"Recalculated quote {quote.id} totals: subtotal=₱{subtotal}, service_charge=₱{service_charge_amount}, tax=₱{tax_amount}, total=₱{total_amount}"
    )
