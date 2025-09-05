# backend/core/domains/payments/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import logging

from .models import (
    Payment, 
    Invoice, 
    InvoiceLineItem, 
    InvoiceTax,
    PaymentPlan, 
    PaymentInstallment,
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
        
    except Exception as e:
        logger.error(f"Failed to update event {event.id} financial totals: {e}")


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


@receiver([post_save, post_delete], sender=PaymentPlan)
def invalidate_payment_plan_caches(sender, instance, **kwargs):
    """Invalidate payment plan caches when plans are modified"""
    try:
        from .cache_service import payments_cache_service
        payments_cache_service.invalidate_payment_plan_caches(
            plan_id=instance.id,
            event_id=getattr(instance.event, 'id', None) if instance.event else None
        )
        logger.info(f"Invalidated payment plan caches for: Plan {instance.id}")
    except Exception as e:
        logger.error(f"Failed to invalidate payment plan caches: {e}")


@receiver([post_save, post_delete], sender=PaymentInstallment)
def invalidate_installment_caches(sender, instance, **kwargs):
    """Invalidate installment caches when installments are modified"""
    try:
        from .cache_service import payments_cache_service
        payments_cache_service.invalidate_installment_caches(
            installment_id=instance.id,
            plan_id=instance.payment_plan.id
        )
        # Also invalidate parent payment plan cache
        payments_cache_service.invalidate_payment_plan_caches(
            plan_id=instance.payment_plan.id,
            event_id=getattr(instance.payment_plan.event, 'id', None) if instance.payment_plan.event else None
        )
        logger.info(f"Invalidated installment caches for: Installment {instance.id}")
    except Exception as e:
        logger.error(f"Failed to invalidate installment caches: {e}")


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