# backend/core/domains/sales/signals.py
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import EventQuote

logger = logging.getLogger(__name__)


@receiver(post_save, sender=EventQuote)
def handle_quote_acceptance(sender, instance, created, **kwargs):
    """Handle quote acceptance by creating contract and invoice automatically"""
    # Only process when quote status changes to ACCEPTED (not on creation)
    if not created and instance.status == 'ACCEPTED':
        try:
            # STEP 1: CREATE CONTRACT FIRST (before invoice)
            # Contract must be generated and sent for signature BEFORE payment
            if instance.template and instance.template.contract_templates.exists():
                from core.domains.contracts.services import EventContractService
                from core.domains.contracts.models import EventContract

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
                        event=instance.event,
                        template=contract_template,
                        is_amendment=False
                    ).first()

                    if not existing_contract:
                        # Create contract from template
                        logger.info(f"Creating contract for event {instance.event.id} using template {contract_template.id}")
                        contract = EventContractService.create_contract_from_template(
                            event_id=instance.event.id,
                            template_id=contract_template.id,
                            contract_value=instance.total_amount
                        )

                        # Set contract to SENT status (ready for client signature)
                        contract.status = 'SENT'
                        contract.sent_at = timezone.now()
                        contract.save(update_fields=['status', 'sent_at'])

                        logger.info(f"Successfully created and sent contract {contract.id} for event {instance.event.id}")

                        # Add contract creation to event timeline
                        from core.domains.events.models import EventTimeline
                        EventTimeline.objects.create(
                            event=instance.event,
                            action_type='SYSTEM_UPDATE',
                            description=f"Contract generated and sent for signature after quote acceptance",
                            is_public=True,
                            action_data={
                                'quote_id': instance.id,
                                'contract_id': contract.id,
                                'contract_template': contract_template.name
                            }
                        )
                    else:
                        logger.info(f"Contract already exists for event {instance.event.id}, skipping creation")

            # STEP 2: CREATE INVOICE (existing logic)
            # Check if invoice already exists for this quote
            from core.domains.payments.models import Invoice
            if Invoice.objects.filter(quote=instance).exists():
                logger.info(f"Invoice already exists for quote {instance.id}")
                return

            # Create invoice from accepted quote
            logger.info(f"Creating invoice for accepted quote {instance.id}")
            from core.domains.payments.services.invoice_service import InvoiceService
            invoice = InvoiceService.create_from_quote(instance)

            # Issue the invoice so it can be paid by the client
            invoice.issue()
            logger.info(f"Successfully created and issued invoice {invoice.invoice_id} from quote {instance.id}")

            # Add invoice creation to event timeline
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
            logger.error(f"Failed to create contract/invoice for accepted quote {instance.id}: {e}")
            # Don't raise exception to avoid breaking quote acceptance