# backend/core/domains/payments/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import logging

from .models import (
    Payment,
    Invoice,
    InvoiceLineItem,
    InvoiceTax,
    PaymentMethod,
    PaymentGateway,
    PaymentTransaction,
    Refund,
    TaxRate,
    PaymentNotification
)

logger = logging.getLogger(__name__)


# === EVENT FINANCIAL UPDATES ===

def update_event_financial_totals(event):
    """Update event's total_amount_paid and total_amount_due based on invoices and payments"""
    if not event:
        return

    try:
        # Calculate total from invoices
        total_invoiced = 0
        total_paid = 0

        # Get all invoices for this event
        invoices = Invoice.objects.filter(event=event)
        for invoice in invoices:
            if invoice.total_amount:
                total_invoiced += float(invoice.total_amount)

                # Calculate paid amount from related payments
                paid_for_this_invoice = 0
                if hasattr(invoice, 'related_payments'):
                    for payment in invoice.related_payments.filter(status='COMPLETED'):
                        if payment.amount:
                            paid_for_this_invoice += float(payment.amount)

                total_paid += paid_for_this_invoice

        # Also add direct event payments (not linked to invoices)
        direct_payments = Payment.objects.filter(event=event, invoice__isnull=True, status='COMPLETED')
        for payment in direct_payments:
            if payment.amount:
                total_paid += float(payment.amount)

        # Store previous payment status
        previous_payment_status = event.payment_status

        # Update event fields
        event.total_amount_paid = total_paid
        event.total_amount_due = max(0, total_invoiced - total_paid)  # Can't be negative

        # Update payment status based on amounts
        if total_invoiced == 0:
            event.payment_status = 'UNPAID'
        elif total_paid >= total_invoiced:
            event.payment_status = 'PAID'
        elif total_paid > 0:
            event.payment_status = 'PARTIALLY_PAID'
        else:
            event.payment_status = 'UNPAID'

        event.save(update_fields=['total_amount_paid', 'total_amount_due', 'payment_status'])
        logger.info(f"Updated event {event.id} financials: paid={total_paid}, due={event.total_amount_due}, status={event.payment_status}")

        # DATE BLOCKING: Check if payment meets downpayment threshold for ON_DOWNPAYMENT policy
        # Only trigger when payment status transitions from UNPAID to PARTIALLY_PAID or PAID
        if previous_payment_status == 'UNPAID' and event.payment_status in ('PARTIALLY_PAID', 'PAID'):
            _check_and_process_downpayment_received(event, total_paid, total_invoiced)

    except Exception as e:
        logger.error(f"Failed to update event {event.id} financial totals: {e}")


def _check_and_process_downpayment_received(event, total_paid, total_invoiced):
    """
    Check if payment meets downpayment threshold and process date blocking.

    This implements the first-to-pay-wins logic for ON_DOWNPAYMENT policy.
    UPDATED: Now uses atomic version with row-level locking to prevent race conditions.
    """
    try:
        from core.domains.events.services.date_blocking_service import DateBlockingService
        from decimal import Decimal

        # Skip if event is already blocked or cancelled
        if event.date_blocked or event.status == 'CANCELLED':
            logger.info(f"Skipping downpayment check for event {event.id}: already blocked or cancelled")
            return

        # Get effective payment terms
        terms = DateBlockingService.get_effective_payment_terms(event)
        policy = terms.get('date_blocking_policy', 'IMMEDIATE')

        # Only process for ON_DOWNPAYMENT policy
        if policy != 'ON_DOWNPAYMENT':
            logger.info(f"Skipping downpayment check for event {event.id}: policy is {policy}")
            return

        # Check if payment meets downpayment threshold
        downpayment_percentage = terms.get('downpayment_percentage', 30)
        required_amount = Decimal(str(total_invoiced)) * (Decimal(str(downpayment_percentage)) / Decimal('100'))

        if Decimal(str(total_paid)) >= required_amount:
            logger.info(
                f"Downpayment threshold met for event {event.id}: "
                f"paid {total_paid} >= required {required_amount} ({downpayment_percentage}%)"
            )

            # Get the most recent completed payment for this event
            latest_payment = Payment.objects.filter(
                event=event,
                status='COMPLETED'
            ).order_by('-created_at').first()

            # Get reservation token from event's associated booking session if available
            reservation_token = None
            try:
                from core.domains.bookingflow.models import BookingSession
                # Find the booking session that created this event
                session = BookingSession.objects.filter(created_event=event).first()
                if session and session.booking_data:
                    reservation_token = session.booking_data.get('_reservation_token')
                    if reservation_token:
                        logger.info(f"Found reservation_token {reservation_token} from booking session for event {event.id}")
            except Exception as e:
                logger.debug(f"Could not retrieve reservation token from booking session: {e}")

            # Use ATOMIC version with row-level locking to prevent race conditions
            result = DateBlockingService.atomic_process_downpayment_received(
                event,
                payment=latest_payment,
                reservation_token=reservation_token
            )

            if result['success']:
                logger.info(
                    f"Date blocking processed for event {event.id}: "
                    f"blocked={result['blocked']}, cancelled_events={len(result['cancelled_events'])}"
                )
            else:
                logger.warning(f"Date blocking failed for event {event.id}: {result['error']}")

                # If blocking failed because date was already taken, trigger auto-refund
                if result['error'] and 'already blocked' in result['error']:
                    _trigger_auto_refund_for_race_condition(event, result['error'])
        else:
            logger.info(
                f"Downpayment threshold NOT met for event {event.id}: "
                f"paid {total_paid} < required {required_amount} ({downpayment_percentage}%)"
            )

    except Exception as e:
        logger.error(f"Error checking downpayment for event {event.id}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")


def _trigger_auto_refund_for_race_condition(event, error_message: str):
    """
    Trigger auto-refund when a race condition causes booking to fail.

    This is called when payment succeeded but date blocking failed because
    another booking took the date first.
    """
    try:
        from core.domains.payments.services.auto_refund_service import AutoRefundService

        logger.warning(
            f"Race condition detected for event {event.id}: {error_message}. "
            f"Initiating auto-refund."
        )

        result = AutoRefundService.initiate_refund_for_race_condition(event)

        if result['success']:
            logger.info(
                f"Auto-refund completed for event {event.id}: "
                f"refunded {result['total_refunded']}"
            )
        else:
            logger.error(
                f"Auto-refund failed for event {event.id}: {result['error']}"
            )

    except ImportError:
        logger.warning("AutoRefundService not available yet")
    except Exception as e:
        logger.error(f"Error triggering auto-refund for event {event.id}: {e}")


# === PAYMENT CACHE INVALIDATION SIGNALS ===

@receiver([post_save, post_delete], sender=Payment)
def invalidate_payment_caches(sender, instance, **kwargs):
    """Invalidate payment-related caches when payments are modified"""
    try:
        from .cache_service import payments_cache_service
        
        # Get client through event relationship
        client_id = None
        if instance.event and hasattr(instance.event, 'client'):
            client_id = instance.event.client.id
        
        payments_cache_service.invalidate_payment_caches(
            payment_id=instance.id,
            event_id=getattr(instance.event, 'id', None) if instance.event else None,
            client_id=client_id
        )
        
        # Update event financial totals
        if instance.event:
            update_event_financial_totals(instance.event)
        
        logger.info(f"Invalidated payment caches for: Payment {instance.id}")
    except Exception as e:
        logger.error(f"Failed to invalidate payment caches: {e}")


@receiver([post_save, post_delete], sender=Invoice)
def invalidate_invoice_caches(sender, instance, **kwargs):
    """Invalidate invoice-related caches when invoices are modified"""
    try:
        from .cache_service import payments_cache_service
        payments_cache_service.invalidate_invoice_caches(
            invoice_id=instance.id,
            event_id=getattr(instance.event, 'id', None) if instance.event else None,
            client_id=getattr(instance.client, 'id', None) if instance.client else None
        )
        
        # Update event financial totals
        if instance.event:
            update_event_financial_totals(instance.event)
        
        logger.info(f"Invalidated invoice caches for: Invoice {instance.id}")
    except Exception as e:
        logger.error(f"Failed to invalidate invoice caches: {e}")


@receiver([post_save, post_delete], sender=InvoiceLineItem)
def invalidate_invoice_line_item_caches(sender, instance, **kwargs):
    """Invalidate invoice caches when line items are modified"""
    try:
        from .cache_service import payments_cache_service
        # Invalidate parent invoice cache since line items affect invoice totals
        payments_cache_service.invalidate_invoice_caches(
            invoice_id=instance.invoice.id,
            event_id=getattr(instance.invoice.event, 'id', None) if instance.invoice.event else None,
            client_id=getattr(instance.invoice.client, 'id', None) if instance.invoice.client else None
        )
        logger.info(f"Invalidated invoice caches for line item change: Invoice {instance.invoice.id}")
    except Exception as e:
        logger.error(f"Failed to invalidate invoice line item caches: {e}")


@receiver([post_save, post_delete], sender=InvoiceTax)
def invalidate_invoice_tax_caches(sender, instance, **kwargs):
    """Invalidate invoice caches when taxes are modified"""
    try:
        from .cache_service import payments_cache_service
        # Invalidate parent invoice cache since taxes affect invoice totals
        payments_cache_service.invalidate_invoice_caches(
            invoice_id=instance.invoice.id,
            event_id=getattr(instance.invoice.event, 'id', None) if instance.invoice.event else None,
            client_id=getattr(instance.invoice.client, 'id', None) if instance.invoice.client else None
        )
        logger.info(f"Invalidated invoice caches for tax change: Invoice {instance.invoice.id}")
    except Exception as e:
        logger.error(f"Failed to invalidate invoice tax caches: {e}")


@receiver([post_save, post_delete], sender=PaymentMethod)
def invalidate_payment_method_caches(sender, instance, **kwargs):
    """Invalidate payment method caches when methods are modified"""
    try:
        from .cache_service import payments_cache_service
        payments_cache_service.invalidate_payment_method_caches(
            method_id=instance.id,
            user_id=getattr(instance.user, 'id', None) if instance.user else None,
            gateway_id=getattr(instance.gateway, 'id', None) if instance.gateway else None
        )
        logger.info(f"Invalidated payment method caches for: Method {instance.id}")
    except Exception as e:
        logger.error(f"Failed to invalidate payment method caches: {e}")


@receiver([post_save, post_delete], sender=PaymentGateway)
def invalidate_payment_gateway_caches(sender, instance, **kwargs):
    """Invalidate payment gateway caches when gateways are modified"""
    try:
        from .cache_service import payments_cache_service
        payments_cache_service.invalidate_payment_gateway_caches(
            gateway_id=instance.id
        )
        logger.info(f"Invalidated payment gateway caches for: Gateway {instance.id}")
    except Exception as e:
        logger.error(f"Failed to invalidate payment gateway caches: {e}")


@receiver([post_save, post_delete], sender=PaymentTransaction)
def invalidate_transaction_caches(sender, instance, **kwargs):
    """Invalidate transaction caches when transactions are modified"""
    try:
        from .cache_service import payments_cache_service
        payments_cache_service.invalidate_transaction_caches(
            transaction_id=instance.id,
            payment_id=getattr(instance.payment, 'id', None) if instance.payment else None,
            gateway_id=getattr(instance.gateway, 'id', None) if instance.gateway else None
        )
        # Also invalidate related payment cache
        if instance.payment:
            payments_cache_service.invalidate_payment_caches(
                payment_id=instance.payment.id,
                event_id=getattr(instance.payment.event, 'id', None) if instance.payment.event else None,
                client_id=getattr(instance.payment.event.client, 'id', None) if instance.payment.event and hasattr(instance.payment.event, 'client') else None
            )
        logger.info(f"Invalidated transaction caches for: Transaction {instance.id}")
    except Exception as e:
        logger.error(f"Failed to invalidate transaction caches: {e}")


@receiver([post_save, post_delete], sender=Refund)
def invalidate_refund_caches(sender, instance, **kwargs):
    """Invalidate refund caches when refunds are modified"""
    try:
        from .cache_service import payments_cache_service
        payments_cache_service.invalidate_refund_caches(
            refund_id=instance.id,
            payment_id=getattr(instance.payment, 'id', None) if instance.payment else None
        )
        # Also invalidate related payment cache
        if instance.payment:
            payments_cache_service.invalidate_payment_caches(
                payment_id=instance.payment.id,
                event_id=getattr(instance.payment.event, 'id', None) if instance.payment.event else None,
                client_id=getattr(instance.payment.event.client, 'id', None) if instance.payment.event and hasattr(instance.payment.event, 'client') else None
            )
        logger.info(f"Invalidated refund caches for: Refund {instance.id}")
    except Exception as e:
        logger.error(f"Failed to invalidate refund caches: {e}")


@receiver([post_save, post_delete], sender=TaxRate)
def invalidate_tax_rate_caches(sender, instance, **kwargs):
    """Invalidate tax rate caches when tax rates are modified"""
    try:
        from .cache_service import payments_cache_service
        # Tax rate changes affect all invoice calculations, so invalidate broadly
        payments_cache_service.invalidate_all_financial_analytics_caches()
        logger.info(f"Invalidated financial analytics caches for tax rate change: {instance.id}")
    except Exception as e:
        logger.error(f"Failed to invalidate tax rate caches: {e}")


@receiver([post_save, post_delete], sender=PaymentNotification)
def invalidate_notification_caches(sender, instance, **kwargs):
    """Invalidate notification caches when notifications are modified"""
    try:
        from .cache_service import payments_cache_service
        # Notifications don't have specific cache invalidation, but log the activity
        logger.info(f"Payment notification modified: {instance.id}")
    except Exception as e:
        logger.error(f"Failed to process payment notification signal: {e}")


def connect_payments_signals():
    """Connect all payments domain cache invalidation signals"""
    logger.info("Successfully connected all payments domain signals")