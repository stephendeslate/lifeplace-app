# backend/core/domains/payments/services/invoice_service.py
from datetime import timedelta
from decimal import Decimal

from core.domains.events.models import Event, EventTimeline
from core.domains.sales.models import EventQuote
from django.db import transaction
from django.utils import timezone

from ..exceptions import InvoiceNotFoundException
from ..models import Invoice, InvoiceLineItem, PaymentNotification


class InvoiceService:
    """Service for managing invoices"""
    
    @staticmethod
    def create_invoice(data, user):
        """Create a new invoice"""
        event_id = data.get('event')
        
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            raise ValueError(f"Event with ID {event_id} not found")
        
        client = event.client
        
        # Generate invoice ID if not provided
        invoice_id = data.get('invoice_id')
        if not invoice_id:
            invoice_id = f"INV-{timezone.now().strftime('%Y%m%d')}-{event.id}"
        
        issue_date = data.get('issue_date', timezone.now().date())
        due_date = data.get('due_date', issue_date + timedelta(days=30))
        
        with transaction.atomic():
            # Create the invoice
            invoice = Invoice.objects.create(
                invoice_id=invoice_id,
                event=event,
                client=client,
                subtotal=Decimal('0.00'),  # Will calculate from line items
                tax_amount=Decimal('0.00'), # Will calculate from line items
                total_amount=Decimal('0.00'), # Will calculate from line items
                issue_date=issue_date,
                due_date=due_date,
                status=data.get('status', 'DRAFT'),
                notes=data.get('notes', ''),
                payment_terms=data.get('payment_terms', '')
            )
            
            # If quote ID is provided, link to the quote
            quote_id = data.get('quote')
            if quote_id:
                try:
                    quote = EventQuote.objects.get(pk=quote_id)
                    invoice.quote = quote
                    invoice.save()
                    
                    # If it's from a quote, copy line items from quote
                    if hasattr(quote, 'line_items'):
                        for quote_item in quote.line_items.all():
                            InvoiceLineItem.objects.create(
                                invoice=invoice,
                                description=quote_item.description,
                                quantity=quote_item.quantity,
                                unit_price=quote_item.unit_price,
                                tax_rate=quote_item.tax_rate,
                                total=quote_item.total,
                                product=quote_item.product
                            )
                except EventQuote.DoesNotExist:
                    pass  # Continue even if quote not found
            
            # Add line items if provided
            line_items = data.get('line_items', [])
            for item_data in line_items:
                InvoiceLineItem.objects.create(
                    invoice=invoice,
                    description=item_data.get('description', ''),
                    quantity=item_data.get('quantity', 1),
                    unit_price=Decimal(str(item_data.get('unit_price', '0'))),
                    tax_rate=Decimal(str(item_data.get('tax_rate', '0'))),
                    total=Decimal(str(item_data.get('total', '0'))),
                    product_id=item_data.get('product')
                )
            
            # Calculate totals
            invoice.calculate_totals()
            
            # Issue the invoice if status is ISSUED
            if invoice.status == 'ISSUED':
                invoice.issue()
            
            return invoice
    
    @staticmethod
    def update_invoice(invoice_id, data, user):
        """Update an invoice"""
        try:
            invoice = Invoice.objects.get(pk=invoice_id)
        except Invoice.DoesNotExist:
            raise InvoiceNotFoundException(f"Invoice with ID {invoice_id} not found")
        
        # Can only update draft invoices
        if invoice.status not in ['DRAFT'] and set(data.keys()) - {'status', 'notes'}:
            raise ValueError("Can only update status and notes for non-draft invoices")
        
        with transaction.atomic():
            # Update basic fields
            for field in ['notes', 'payment_terms', 'due_date']:
                if field in data:
                    setattr(invoice, field, data[field])
            
            # Handle status changes
            new_status = data.get('status')
            if new_status and new_status != invoice.status:
                # Check valid transitions
                if invoice.status == 'DRAFT' and new_status == 'ISSUED':
                    invoice.status = 'ISSUED'
                    invoice.save()
                    invoice.issue()  # This handles notification and timeline
                elif invoice.status == 'ISSUED' and new_status == 'PAID':
                    invoice.status = 'PAID'
                    invoice.save()
                    invoice.mark_as_paid()
                elif invoice.status == 'DRAFT' and new_status in ['VOID', 'CANCELLED']:
                    invoice.status = new_status
                    invoice.save()
                    # Add to timeline
                    EventTimeline.objects.create(
                        event=invoice.event,
                        action_type='SYSTEM_UPDATE',
                        description=f"Invoice {invoice.invoice_id} marked as {invoice.get_status_display()}",
                        actor=user,
                        is_public=False
                    )
                else:
                    raise ValueError(f"Invalid status transition from {invoice.status} to {new_status}")
            else:
                invoice.save()
            
            # Update line items is only allowed for DRAFT invoices
            if invoice.status == 'DRAFT':
                line_items = data.get('line_items', [])
                if line_items:
                    # Clear existing line items if new ones are provided
                    invoice.line_items.all().delete()
                    
                    # Add new line items
                    for item_data in line_items:
                        InvoiceLineItem.objects.create(
                            invoice=invoice,
                            description=item_data.get('description', ''),
                            quantity=item_data.get('quantity', 1),
                            unit_price=Decimal(str(item_data.get('unit_price', '0'))),
                            tax_rate=Decimal(str(item_data.get('tax_rate', '0'))),
                            total=Decimal(str(item_data.get('total', '0'))),
                            product_id=item_data.get('product')
                        )
                
                # Recalculate totals if line items changed
                if line_items:
                    invoice.calculate_totals()
            
            return invoice
    
    @staticmethod
    def delete_invoice(invoice_id):
        """Delete an invoice (only draft invoices)"""
        try:
            invoice = Invoice.objects.get(pk=invoice_id)
        except Invoice.DoesNotExist:
            raise InvoiceNotFoundException(f"Invoice with ID {invoice_id} not found")
        
        # Only allow deleting draft invoices
        if invoice.status != 'DRAFT':
            raise ValueError("Only draft invoices can be deleted")
        
        invoice.delete()
    
    @staticmethod
    def create_from_quote(quote, due_days=14):
        """Create an invoice from an accepted quote"""
        if not quote or not quote.event:
            return None
        
        # Create invoice
        invoice = Invoice.objects.create(
            invoice_id=f"INV-{timezone.now().strftime('%Y%m%d')}-{quote.event.id}-{quote.id}",
            event=quote.event,
            client=quote.event.client,
            subtotal=quote.subtotal,
            tax_amount=quote.tax_amount,
            total_amount=quote.total_amount,
            issue_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=due_days),
            status='DRAFT',
            notes=f"Invoice generated from quote #{quote.id}",
            quote=quote
        )
        
        # Create line items from quote
        for quote_item in quote.line_items.all():
            InvoiceLineItem.objects.create(
                invoice=invoice,
                description=quote_item.description,
                quantity=quote_item.quantity,
                unit_price=quote_item.unit_price,
                tax_rate=quote_item.tax_rate,
                total=quote_item.total
            )
        
        return invoice