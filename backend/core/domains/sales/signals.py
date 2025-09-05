# backend/core/domains/sales/signals.py
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import EventQuote

logger = logging.getLogger(__name__)


@receiver(post_save, sender=EventQuote)
def handle_quote_acceptance(sender, instance, created, **kwargs):
    """Handle quote acceptance by creating invoice automatically"""
    # Only process when quote status changes to ACCEPTED (not on creation)
    if not created and instance.status == 'ACCEPTED':
        try:
            # Check if invoice already exists for this quote
            from core.domains.payments.models import Invoice
            if Invoice.objects.filter(quote=instance).exists():
                logger.info(f"Invoice already exists for quote {instance.id}")
                return
            
            # Create invoice from accepted quote
            logger.info(f"Creating invoice for accepted quote {instance.id}")
            from core.domains.payments.services.invoice_service import InvoiceService
            invoice = InvoiceService.create_from_quote(instance)
            
            logger.info(f"Successfully created invoice {invoice.invoice_id} from quote {instance.id}")
            
            # Add to event timeline
            from core.domains.events.models import EventTimeline
            EventTimeline.objects.create(
                event=instance.event,
                action_type='SYSTEM_UPDATE',
                description=f"Invoice {invoice.invoice_id} automatically generated from accepted quote",
                is_public=True,
                action_data={
                    'quote_id': instance.id,
                    'invoice_id': invoice.id
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to create invoice for accepted quote {instance.id}: {e}")
            # Don't raise exception to avoid breaking quote acceptance