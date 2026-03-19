# backend/core/domains/communications/context_service/context_providers.py
"""
Context provider functions for financial, payment, invoice, contract,
admin invitation, and notification contexts.

These are standalone functions called by CommunicationContextService.
"""
import logging
from decimal import Decimal
from typing import Any

from django.conf import settings
from django.utils import timezone

from .constants import PHILIPPINES_TZ_DISPLAY

logger = logging.getLogger(__name__)


def get_quote_context(quote) -> dict[str, Any]:
    """Get quote-related context variables."""
    return {
        "quote_id": quote.id,
        "quote_version": getattr(quote, "version", 1),
        "quote_valid_until": quote.valid_until.strftime("%B %d, %Y") if quote.valid_until else "",
        "quote_link": "",  # To be filled by caller if needed
    }


def get_contract_context(contract) -> dict[str, Any]:
    """Get contract-related context variables."""
    from core.utils.url_builder import ClientPortalURLBuilder

    # Get signature deadline if available
    signature_deadline = ""
    if hasattr(contract, "valid_until") and contract.valid_until:
        signature_deadline = contract.valid_until.strftime("%B %d, %Y")

    # Payment terms and cancellation policy
    payment_terms = getattr(contract, "payment_terms", None)
    if not payment_terms:
        payment_terms = "50% deposit required upon contract signing, remaining balance due 7 days before event date"

    cancellation_policy = getattr(contract, "cancellation_policy", None)
    if not cancellation_policy:
        cancellation_policy = "Cancellations made more than 30 days before the event date are eligible for a full refund minus processing fees."

    return {
        # Fixed: contract page is /contracts/{id}, not /contracts/{id}/sign
        # Signing is handled within the contract detail page via a dialog
        "contract_link": ClientPortalURLBuilder.contract_url(contract.id),
        "contract_pdf_link": ClientPortalURLBuilder.contract_pdf_url(contract.id),
        "signature_deadline": signature_deadline,
        "contract_date": timezone.now().strftime("%B %d, %Y"),
        "payment_terms": payment_terms,
        "cancellation_policy": cancellation_policy,
    }


def get_admin_invitation_context(admin_invitation, user) -> dict[str, Any]:
    """Get admin invitation context variables."""
    frontend_url = getattr(settings, "ADMIN_FRONTEND_URL", "https://admin.lifeplace.dev")

    # Get inviter name
    invited_by = ""
    if hasattr(admin_invitation, "invited_by") and admin_invitation.invited_by:
        inviter = admin_invitation.invited_by
        if inviter.first_name and inviter.last_name:
            invited_by = f"{inviter.first_name} {inviter.last_name}"
        else:
            invited_by = inviter.email

    return {
        "first_name": admin_invitation.first_name or "",
        "last_name": admin_invitation.last_name or "",
        "email": admin_invitation.email or "",
        "invitation_link": f"{frontend_url}/accept-invitation/{admin_invitation.id}",
        "invited_by": invited_by,
        "expiry_date": admin_invitation.expires_at.strftime("%B %d, %Y at %I:%M %p")
        if admin_invitation.expires_at
        else "",
    }


def get_notification_context(notification, user) -> dict[str, Any]:
    """Get notification context variables."""
    return {
        "title": notification.title or "",
        "content": notification.content or "",
        "action_url": getattr(notification, "action_url", "") or "",
        "recipient_name": user.first_name or user.email,
    }


def get_financial_context(event, quote=None) -> dict[str, Any]:
    """Get financial context variables."""
    from core.domains.payments.models import PaymentSettings

    # Get price source from quote or event
    if quote:
        price_source = quote.total_amount
        subtotal = getattr(quote, "subtotal", price_source)
        tax_amount = getattr(quote, "tax_amount", Decimal("0"))
        discount_amount = getattr(quote, "discount_amount", Decimal("0"))
    elif hasattr(event, "accepted_quote") and event.accepted_quote:
        quote = event.accepted_quote
        price_source = quote.total_amount
        subtotal = getattr(quote, "subtotal", price_source)
        tax_amount = getattr(quote, "tax_amount", Decimal("0"))
        discount_amount = getattr(quote, "discount_amount", Decimal("0"))
    else:
        price_source = event.total_price or Decimal("0")
        subtotal = price_source
        tax_amount = Decimal("0")
        discount_amount = Decimal("0")

    # Get payment settings for deposit percentage
    try:
        payment_settings = PaymentSettings.get_default_settings()
        deposit_percentage = payment_settings.default_deposit_percentage
    except Exception:
        deposit_percentage = Decimal("30")

    # Calculate amounts
    deposit_amount = price_source * (deposit_percentage / Decimal("100"))
    balance_amount = price_source - deposit_amount
    amount_paid = event.total_amount_paid or Decimal("0")
    amount_due = (event.total_amount_due or price_source) - amount_paid

    # Get balance due date from invoice if available
    balance_due_date = ""
    try:
        from core.domains.payments.models import Invoice

        invoice = Invoice.objects.filter(event=event).order_by("-created_at").first()
        if invoice and invoice.due_date:
            balance_due_date = invoice.due_date.strftime("%B %d, %Y")
    except Exception:
        pass

    # Format currency
    def format_amount(amount):
        try:
            return f"₱{float(amount):,.2f}"
        except (ValueError, TypeError):
            return "₱0.00"

    return {
        "total_amount": str(price_source),
        "total_amount_formatted": format_amount(price_source),
        "total_price": str(price_source),
        "subtotal": str(subtotal),
        "tax_amount": str(tax_amount),
        "discount_amount": str(discount_amount),
        "deposit_percentage": str(deposit_percentage),
        "deposit_amount": str(deposit_amount),
        "balance_amount": str(balance_amount),
        "balance_due_date": balance_due_date,
        "amount_paid": str(amount_paid),
        "amount_due": str(amount_due),
        # Formatted versions
        "deposit_amount_formatted": format_amount(deposit_amount),
        "balance_amount_formatted": format_amount(balance_amount),
    }


def get_payment_context(payment) -> dict[str, Any]:
    """Get payment-related context variables."""
    from core.utils.url_builder import ClientPortalURLBuilder

    # Format amount
    try:
        amount_formatted = payment.format_amount_with_currency()
    except Exception:
        currency_symbol = "₱" if payment.currency == "PHP" else "$"
        amount_formatted = f"{currency_symbol}{payment.amount:,.2f}"

    # Payment method info
    method_name = ""
    method_last_four = ""
    if payment.payment_method:
        method_name = payment.payment_method.get_type_display()
        method_last_four = payment.payment_method.last_four or ""

    # Check if deposit
    is_deposit = bool(payment.description and "deposit" in payment.description.lower())

    # Calculate remaining balance
    remaining_balance = Decimal("0")
    if payment.event:
        remaining_balance = (payment.event.total_amount_due or Decimal("0")) - (
            payment.event.total_amount_paid or Decimal("0")
        )

    # Format remaining balance
    currency_symbol = "₱" if payment.currency == "PHP" else "$"
    remaining_formatted = (
        f"{currency_symbol}{remaining_balance:,.0f}"
        if payment.currency == "PHP"
        else f"{currency_symbol}{remaining_balance:,.2f}"
    )

    # Receipt link - receipts are accessed via the payments portal page
    # The frontend displays receipts in a dialog, not a separate route
    receipt_link = ""
    receipt_pdf_link = ""
    if payment.status == "COMPLETED" and payment.receipt_number:
        # Link to payments page where user can view/download receipt
        receipt_link = ClientPortalURLBuilder.payments_url()
        receipt_pdf_link = ClientPortalURLBuilder.payment_receipt_pdf_url(payment.id)

    # Transaction ID
    transaction_id = ""
    latest_transaction = payment.transactions.order_by("-created_at").first()
    if latest_transaction:
        transaction_id = latest_transaction.transaction_id or ""

    return {
        "payment_number": payment.payment_number,
        "payment_amount": str(payment.amount),
        "payment_amount_formatted": amount_formatted,
        "payment_status": payment.get_status_display(),
        "payment_date": payment.paid_on.strftime(f"%B %d, %Y {PHILIPPINES_TZ_DISPLAY}") if payment.paid_on else "",
        "payment_due_date": payment.due_date.strftime(f"%B %d, %Y {PHILIPPINES_TZ_DISPLAY}")
        if payment.due_date
        else "",
        "payment_method": method_name,
        "payment_method_last_four": method_last_four,
        "receipt_number": payment.receipt_number or "",
        "receipt_link": receipt_link,
        "receipt_pdf_link": receipt_pdf_link,
        "transaction_id": transaction_id,
        "is_deposit": is_deposit,
        "remaining_balance": str(remaining_balance),
        "remaining_balance_formatted": remaining_formatted,
    }


def get_invoice_context(invoice) -> dict[str, Any]:
    """Get invoice-related context variables."""
    from core.utils.url_builder import ClientPortalURLBuilder

    currency_symbol = "₱" if invoice.currency == "PHP" else "$"

    # Line items summary
    line_items = []
    for item in invoice.line_items.all():
        line_items.append(f"- {item.description}: {currency_symbol}{item.total:,.0f}")
    line_items_summary = "\n".join(line_items) if line_items else "No items"

    # Paid and remaining
    paid_amount = invoice.paid_amount or Decimal("0")
    remaining = invoice.remaining_amount or invoice.total_amount

    # Invoice link - invoices are accessed via the payments portal
    # The frontend displays invoices in a dialog, not a separate route
    # If invoice has an event, link to event's invoices tab for context
    if invoice.event_id:
        invoice_link = ClientPortalURLBuilder.event_invoices_url(invoice.event_id)
    else:
        invoice_link = ClientPortalURLBuilder.payments_url()

    return {
        "invoice_number": invoice.invoice_id,
        "invoice_issue_date": invoice.issue_date.strftime(f"%B %d, %Y {PHILIPPINES_TZ_DISPLAY}")
        if invoice.issue_date
        else "",
        "invoice_due_date": invoice.due_date.strftime(f"%B %d, %Y {PHILIPPINES_TZ_DISPLAY}")
        if invoice.due_date
        else "",
        "invoice_status": invoice.get_status_display(),
        "invoice_subtotal": str(invoice.subtotal),
        "invoice_tax_amount": str(invoice.tax_amount),
        "invoice_total": str(invoice.total_amount),
        "invoice_total_formatted": f"{currency_symbol}{invoice.total_amount:,.0f}",
        "invoice_paid_amount": str(paid_amount),
        "invoice_remaining": str(remaining),
        "invoice_remaining_formatted": f"{currency_symbol}{remaining:,.0f}",
        "invoice_link": invoice_link,
        "invoice_pdf_link": ClientPortalURLBuilder.invoice_pdf_url(invoice.id),
        "line_items_summary": line_items_summary,
        "payment_terms": invoice.payment_terms or "",
    }


def get_payment_plan_context(payment) -> dict[str, Any]:
    """Get payment plan context if payment is part of a plan.

    Note: Payment plans/installments have been deprecated. This method
    now returns an empty dict for backwards compatibility.
    """
    return {}
