# backend/core/domains/payments/services/invoice_service.py
import logging
from datetime import timedelta
from decimal import Decimal

from core.domains.events.models import Event, EventTimeline
from core.domains.sales.models import EventQuote
from django.db import transaction
from django.utils import timezone

from ..exceptions import InvoiceNotFoundException
from ..models import Invoice, InvoiceLineItem, PaymentNotification

logger = logging.getLogger(__name__)


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
        
        # Check if invoice already exists for this quote
        existing_invoice = Invoice.objects.filter(quote=quote).first()
        if existing_invoice:
            logger.info(f"Invoice {existing_invoice.invoice_id} already exists for quote {quote.id}")
            return existing_invoice
        
        # Generate unique invoice ID
        base_invoice_id = f"INV-{timezone.now().strftime('%Y%m%d')}-{quote.event.id}-{quote.id}"
        invoice_id = base_invoice_id
        counter = 1
        
        # Ensure uniqueness by adding a counter if needed
        while Invoice.objects.filter(invoice_id=invoice_id).exists():
            invoice_id = f"{base_invoice_id}-{counter}"
            counter += 1
        
        # Create invoice
        invoice = Invoice.objects.create(
            invoice_id=invoice_id,
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

    @staticmethod
    def process_invoice_payment(invoice, payment_data, user):
        """Process payment for an invoice"""
        from .payment_service import PaymentService
        from .gateway_service import PaymentGatewayService

        try:
            # Validate invoice status
            if invoice.status != 'ISSUED':
                return {
                    'success': False,
                    'error': f'Cannot pay invoice with status {invoice.get_status_display()}'
                }

            # Validate payment amount matches invoice total
            payment_amount = invoice.total_amount

            with transaction.atomic():
                # Create payment record
                payment_creation_data = {
                    'event': invoice.event.id,
                    'amount': str(payment_amount),
                    'currency': invoice.currency,
                    'due_date': invoice.due_date,
                    'description': f'Payment for invoice {invoice.invoice_id}',
                    'invoice': invoice.id,
                    'is_manual': payment_data.get('is_manual', False),
                    'reference_number': payment_data.get('reference_number', ''),
                    'notes': payment_data.get('notes', '')
                }

                # Create the payment
                payment = PaymentService.create_payment(payment_creation_data, user)

                # If manual payment, mark as completed
                if payment_data.get('is_manual', False):
                    payment.status = 'COMPLETED'
                    payment.save()
                    payment.complete_payment()

                    # Mark invoice as paid
                    invoice.mark_as_paid()

                    return {
                        'success': True,
                        'payment': payment,
                        'message': 'Manual payment recorded successfully'
                    }

                # Process through payment gateway
                gateway_data = {
                    'payment_method_id': payment_data.get('payment_method_id'),
                    'payment_method_token': payment_data.get('payment_method_token'),
                    'gateway_id': payment_data.get('gateway_id'),
                    'gateway_code': payment_data.get('gateway_code', 'stripe'),
                    'save_payment_method': payment_data.get('save_payment_method', False)
                }

                # Process payment through gateway
                transaction_result = PaymentGatewayService.process_payment(
                    payment.id, gateway_data, user
                )

                # Check transaction result
                if transaction_result.status == 'COMPLETED':
                    # Payment successful - invoice should already be marked as paid
                    # through the payment.complete_payment() call
                    return {
                        'success': True,
                        'payment': payment,
                        'transaction': transaction_result,
                        'message': 'Payment processed successfully'
                    }
                elif transaction_result.status == 'PENDING':
                    # Payment requires additional action (e.g., 3D Secure)
                    return {
                        'success': True,
                        'payment': payment,
                        'transaction': transaction_result,
                        'requires_action': True,
                        'message': 'Payment requires additional authentication'
                    }
                else:
                    # Payment failed
                    return {
                        'success': False,
                        'payment': payment,
                        'transaction': transaction_result,
                        'error': transaction_result.error_message or 'Payment processing failed'
                    }

        except Exception as e:
            logger.error(f"Invoice payment processing failed: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'details': 'Payment processing encountered an error'
            }

    @staticmethod
    def create_payment_intent_for_invoice(invoice, gateway_code='stripe'):
        """Create payment intent for invoice without immediately processing payment"""
        from .gateway_service import PaymentGatewayService
        from ..models import PaymentGateway, Payment

        try:
            # Validate invoice status
            if invoice.status != 'ISSUED':
                return {
                    'success': False,
                    'error': f'Cannot create payment intent for invoice with status {invoice.get_status_display()}'
                }

            # Get the gateway
            try:
                gateway = PaymentGateway.objects.get(code=gateway_code, is_active=True)
            except PaymentGateway.DoesNotExist:
                return {
                    'success': False,
                    'error': f'Payment gateway {gateway_code} not found or inactive'
                }

            with transaction.atomic():
                # Create a pending payment record
                payment = Payment.objects.create(
                    event=invoice.event,
                    amount=invoice.total_amount,
                    currency=invoice.currency,
                    due_date=invoice.due_date,
                    description=f'Payment for invoice {invoice.invoice_id}',
                    invoice=invoice,
                    status='PENDING'
                )

                # Create payment intent through gateway service
                if gateway_code == 'stripe':
                    import stripe

                    # Set up Stripe
                    if not gateway.config or 'secret_key' not in gateway.config:
                        return {
                            'success': False,
                            'error': 'Stripe gateway not properly configured'
                        }

                    stripe.api_key = gateway.config['secret_key']

                    # Create payment intent
                    intent_data = {
                        'amount': int(invoice.total_amount * 100),  # Convert to cents
                        'currency': invoice.currency.lower(),
                        'automatic_payment_methods': {'enabled': True},
                        'metadata': {
                            'invoice_id': invoice.id,
                            'invoice_number': invoice.invoice_id,
                            'payment_id': payment.id,
                            'event_id': invoice.event.id
                        }
                    }

                    intent = stripe.PaymentIntent.create(**intent_data)

                    # Create transaction record
                    from ..models import PaymentTransaction
                    transaction_record = PaymentTransaction.objects.create(
                        payment=payment,
                        gateway=gateway,
                        transaction_id=intent.id,
                        amount=invoice.total_amount,
                        currency=invoice.currency,
                        status='PROCESSING',
                        response_data=intent
                    )

                    return {
                        'success': True,
                        'client_secret': intent.client_secret,
                        'payment_intent_id': intent.id,
                        'status': intent.status,
                        'requires_action': intent.status == 'requires_action',
                        'next_action': intent.next_action if hasattr(intent, 'next_action') else None,
                        'payment_id': payment.id,
                        'transaction_id': transaction_record.id
                    }

                else:
                    return {
                        'success': False,
                        'error': f'Payment intent creation not implemented for gateway {gateway_code}'
                    }

        except Exception as e:
            logger.error(f"Payment intent creation failed: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'details': 'Payment intent creation encountered an error'
            }

    @staticmethod
    def setup_payment_plan_for_invoice(invoice, plan_data, user):
        """Setup payment plan for an invoice"""
        from .payment_plan_service import PaymentPlanService
        from ..models import PaymentMethod

        try:
            # Validate invoice status
            if invoice.status != 'ISSUED':
                raise ValueError(f'Cannot create payment plan for invoice with status {invoice.get_status_display()}')

            # Check if payment plan already exists
            if hasattr(invoice.event, 'payment_plan'):
                raise ValueError('A payment plan already exists for this event')

            # Validate down payment amount doesn't exceed total
            down_payment = plan_data.get('down_payment_amount', 0)
            if down_payment >= invoice.total_amount:
                raise ValueError('Down payment amount cannot exceed invoice total')

            # Prepare payment plan data
            payment_plan_data = {
                'event': invoice.event.id,
                'total_amount': str(invoice.total_amount),
                'down_payment_amount': str(down_payment),
                'down_payment_due_date': plan_data.get('down_payment_due_date', timezone.now().date()),
                'number_of_installments': plan_data.get('number_of_installments', 3),
                'frequency': plan_data.get('frequency', 'MONTHLY'),
                'notes': plan_data.get('notes', f'Payment plan for invoice {invoice.invoice_id}'),
                'quote': invoice.quote.id if invoice.quote else None
            }

            # Handle auto payment setup
            if plan_data.get('auto_payment_enabled', False):
                auto_payment_method_id = plan_data.get('auto_payment_method_id')
                if auto_payment_method_id:
                    try:
                        payment_method = PaymentMethod.objects.get(
                            id=auto_payment_method_id,
                            user=invoice.client
                        )
                        payment_plan_data['auto_payment_enabled'] = True
                        payment_plan_data['auto_payment_method'] = payment_method.id
                    except PaymentMethod.DoesNotExist:
                        raise ValueError('Invalid payment method for auto payments')

            # Create payment plan using service
            payment_plan = PaymentPlanService.create_payment_plan(payment_plan_data, user)

            # Add to event timeline
            EventTimeline.objects.create(
                event=invoice.event,
                action_type='SYSTEM_UPDATE',
                description=f'Payment plan created for invoice {invoice.invoice_id}',
                actor=user,
                is_public=True,
                action_data={
                    'payment_plan_id': payment_plan.id,
                    'invoice_id': invoice.id,
                    'installments': payment_plan.number_of_installments,
                    'total_amount': str(invoice.total_amount)
                }
            )

            return payment_plan

        except Exception as e:
            logger.error(f"Payment plan setup failed for invoice {invoice.id}: {e}", exc_info=True)
            raise