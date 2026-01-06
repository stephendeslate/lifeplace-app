# backend/core/domains/payments/services/invoice_service.py
import logging
from datetime import timedelta
from decimal import Decimal

import stripe

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
    def create_from_quote(quote, booking_flow_id=None):
        """Create an invoice from an accepted quote

        Args:
            quote: The accepted quote to create invoice from
            booking_flow_id: Optional booking flow ID to get flow-specific payment terms
                           If not provided, uses global PaymentSettings defaults
        """
        from .payment_terms_resolver import PaymentTermsResolver

        if not quote or not quote.event:
            return None

        # Check if invoice already exists for this quote
        existing_invoice = Invoice.objects.filter(quote=quote).first()
        if existing_invoice:
            logger.info(f"Invoice {existing_invoice.invoice_id} already exists for quote {quote.id}")
            return existing_invoice

        # Get effective payment terms (flow override or global default)
        if booking_flow_id:
            terms = PaymentTermsResolver.get_terms_for_flow(booking_flow_id)
        else:
            terms = PaymentTermsResolver.get_global_settings()

        balance_due_days = terms.get('balance_due_days', 30)
        balance_due_type = terms.get('balance_due_type', 'DAYS_BEFORE')

        # Calculate due date based on event date (not today)
        event_date = quote.event.start_date.date() if hasattr(quote.event.start_date, 'date') else quote.event.start_date

        if balance_due_type == 'DAY_BEFORE':
            due_date = event_date - timedelta(days=1)
        else:  # DAYS_BEFORE
            due_date = event_date - timedelta(days=balance_due_days)

        # Ensure due date is not in the past, but also never after the event
        today = timezone.now().date()
        max_due_date = event_date - timedelta(days=1)  # Never after event date

        if due_date < today:
            # Fallback: minimum 7 days from today, but never after event date - 1
            fallback_date = today + timedelta(days=7)
            due_date = min(fallback_date, max_due_date)

            # If even max_due_date is in the past (event is imminent), use max_due_date anyway
            if due_date < today:
                due_date = max_due_date
                logger.warning(f"Invoice due date {due_date} is in the past - event is imminent on {event_date}")
            else:
                logger.info(f"Invoice due date adjusted to {due_date} (was in the past, bounded by event date)")

        # Generate human-readable payment terms from configuration
        payment_terms_text = PaymentTermsResolver.generate_terms_text(terms)

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
            due_date=due_date,
            status='DRAFT',
            notes=f"Invoice generated from quote #{quote.id}",
            quote=quote,
            payment_terms=payment_terms_text
        )
        
        # Create line items from quote - preserve all data including enhanced pricing fields
        for quote_item in quote.line_items.all():
            InvoiceLineItem.objects.create(
                invoice=invoice,
                description=quote_item.description,
                quantity=quote_item.quantity,
                unit_price=quote_item.unit_price,
                tax_rate=quote_item.tax_rate,
                total=quote_item.total,
                product=quote_item.product,
                # Enhanced pricing fields for DRY compliance
                item_type='ADDON' if quote_item.product and quote_item.product.type == 'PRODUCT' else 'PACKAGE',
                base_unit_price=getattr(quote_item, 'base_unit_price', None),
                excess_hours=getattr(quote_item, 'excess_hours', None),
                excess_hour_price=getattr(quote_item, 'excess_hour_price', None),
                excess_cost=getattr(quote_item, 'excess_cost', Decimal('0.00'))
            )

        return invoice

    @staticmethod
    def process_invoice_payment(invoice, payment_data, user):
        """Process payment for an invoice (supports full and deposit payments)"""
        from .payment_service import PaymentService
        from .payment_plan_service import PaymentPlanService
        from .gateway_service import PaymentGatewayService
        from .payment_orchestrator import PaymentOrchestrator, PaymentRequest
        from ..models import PaymentSettings, Payment

        try:
            # Validate invoice status (allow PARTIALLY_PAID for subsequent payments)
            if invoice.status not in ['ISSUED', 'PARTIALLY_PAID']:
                return {
                    'success': False,
                    'error': f'Cannot pay invoice with status {invoice.get_status_display()}'
                }

            # Determine payment amount based on payment type
            payment_type = payment_data.get('payment_type', 'FULL')

            if payment_type == 'DEPOSIT':
                # Use PaymentTermsResolver to get effective deposit percentage
                # (booking flow override or global default)
                from .payment_terms_resolver import PaymentTermsResolver
                terms = PaymentTermsResolver.get_terms_for_event(invoice.event_id)
                deposit_percentage = Decimal(str(terms.get('deposit_percentage', 50)))
                payment_amount = (invoice.total_amount * deposit_percentage) / Decimal('100')
                description = f'Deposit payment for invoice {invoice.invoice_id} ({deposit_percentage}%)'
            elif payment_type == 'CUSTOM':
                # Use custom amount from request
                payment_amount = Decimal(str(payment_data.get('amount')))
                description = f'Custom payment for invoice {invoice.invoice_id}'

                # Validate against gateway minimum (defensive check)
                from .gateway_service import get_stripe_minimum
                gateway_code = payment_data.get('gateway_code', 'stripe')

                if gateway_code == 'stripe':
                    minimum_charge = get_stripe_minimum(invoice.currency)

                    # Check if payment amount itself is below minimum
                    if payment_amount < minimum_charge:
                        return {
                            'success': False,
                            'error': f'Payment amount {payment_amount} {invoice.currency} is below minimum charge of {minimum_charge} {invoice.currency}',
                            'error_code': 'BELOW_MINIMUM_CHARGE',
                            'details': {
                                'amount': str(payment_amount),
                                'minimum': str(minimum_charge),
                                'currency': invoice.currency
                            }
                        }

                    # Check if remaining balance would be below minimum (unless paying full)
                    remaining_balance = invoice.remaining_amount if hasattr(invoice, 'remaining_amount') else invoice.total_amount
                    remaining_after_payment = remaining_balance - payment_amount

                    if Decimal('0') < remaining_after_payment < minimum_charge:
                        return {
                            'success': False,
                            'error': f'Remaining balance of {remaining_after_payment} {invoice.currency} would be below minimum charge of {minimum_charge} {invoice.currency}. Please pay the full amount or leave at least {minimum_charge} {invoice.currency} remaining.',
                            'error_code': 'REMAINING_BELOW_MINIMUM',
                            'details': {
                                'payment_amount': str(payment_amount),
                                'remaining_after_payment': str(remaining_after_payment),
                                'minimum': str(minimum_charge),
                                'currency': invoice.currency,
                                'suggestion': f'Pay full amount of {remaining_balance} {invoice.currency} or maximum of {remaining_balance - minimum_charge} {invoice.currency}'
                            }
                        }
            else:
                # Full payment or remaining balance
                payment_amount = invoice.remaining_amount if hasattr(invoice, 'remaining_amount') else invoice.total_amount
                description = f'Payment for invoice {invoice.invoice_id}'

            # OVER-PAYMENT PREVENTION: Validate payment amount doesn't exceed remaining balance
            remaining_balance = invoice.remaining_amount if hasattr(invoice, 'remaining_amount') else invoice.total_amount
            if payment_amount > remaining_balance:
                return {
                    'success': False,
                    'error': f'Payment amount ({payment_amount}) exceeds remaining balance ({remaining_balance})',
                    'error_code': 'EXCEEDS_BALANCE',
                    'details': {
                        'requested_amount': str(payment_amount),
                        'remaining_balance': str(remaining_balance),
                        'total_amount': str(invoice.total_amount),
                        'paid_amount': str(invoice.paid_amount)
                    }
                }

            # Create payment via PaymentOrchestrator (unified payment creation)
            request = PaymentRequest(
                event_id=invoice.event.id,
                amount=payment_amount,
                currency=invoice.currency,
                due_date=invoice.due_date,
                description=description,
                invoice_id=invoice.id,
                payment_type='INVOICE',
                is_manual=payment_data.get('is_manual', False),
                notes=payment_data.get('notes', ''),
                created_by='invoice_service'
            )

            response = PaymentOrchestrator.create_payment(request, user)
            if not response.success:
                return {
                    'success': False,
                    'error': response.message,
                    'error_code': response.error_code,
                    'details': response.error_details
                }

            payment = Payment.objects.get(id=response.payment_id)

            # If manual payment, mark as completed
            if payment_data.get('is_manual', False):
                payment.status = 'COMPLETED'
                payment.save()
                payment.complete_payment()

                # Mark invoice as paid (will set to PARTIALLY_PAID or PAID automatically)
                invoice.mark_as_paid()

                return {
                    'success': True,
                    'payment': payment,
                    'message': 'Manual payment recorded successfully'
                }

            # Process through payment gateway
            gateway_data = {
                'payment_method': payment_data.get('payment_method'),
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
    def create_payment_intent_for_invoice(invoice, gateway_code='stripe', payment_type='FULL', custom_amount=None):
        """Create payment intent for invoice without immediately processing payment

        This method is idempotent - it will reuse existing pending payments
        for the same invoice to prevent duplicate payment creation.

        Args:
            invoice: Invoice instance
            gateway_code: Payment gateway code (default: 'stripe')
            payment_type: 'FULL', 'DEPOSIT', or 'CUSTOM' (default: 'FULL')
            custom_amount: Custom payment amount (required when payment_type='CUSTOM')
        """
        from .gateway_service import PaymentGatewayService
        from ..models import PaymentGateway, Payment, PaymentSettings

        try:
            # Validate invoice status (allow PARTIALLY_PAID for subsequent payments)
            if invoice.status not in ['ISSUED', 'PARTIALLY_PAID']:
                return {
                    'success': False,
                    'error': f'Cannot create payment intent for invoice with status {invoice.get_status_display()}'
                }

            # Calculate payment amount based on payment type
            if payment_type == 'DEPOSIT':
                # Use PaymentTermsResolver to get effective deposit percentage
                # (booking flow override or global default)
                from .payment_terms_resolver import PaymentTermsResolver
                terms = PaymentTermsResolver.get_terms_for_event(invoice.event_id)
                deposit_percentage = Decimal(str(terms.get('deposit_percentage', 50)))
                payment_amount = (invoice.total_amount * deposit_percentage) / Decimal('100')
                description = f'Deposit payment for invoice {invoice.invoice_id} ({deposit_percentage}%)'
            elif payment_type == 'CUSTOM':
                # Use custom amount from parameter
                if not custom_amount:
                    return {
                        'success': False,
                        'error': 'custom_amount is required when payment_type is CUSTOM'
                    }
                payment_amount = Decimal(str(custom_amount))
                description = f'Custom payment for invoice {invoice.invoice_id}'

                # Validate against gateway minimum (defensive check)
                from .gateway_service import get_stripe_minimum

                if gateway_code == 'stripe':
                    minimum_charge = get_stripe_minimum(invoice.currency)

                    # Check if payment amount itself is below minimum
                    if payment_amount < minimum_charge:
                        return {
                            'success': False,
                            'error': f'Payment amount {payment_amount} {invoice.currency} is below minimum charge of {minimum_charge} {invoice.currency}',
                            'error_code': 'BELOW_MINIMUM_CHARGE'
                        }

                    # Check if remaining balance would be below minimum
                    remaining_balance = invoice.remaining_amount if hasattr(invoice, 'remaining_amount') else invoice.total_amount
                    remaining_after_payment = remaining_balance - payment_amount

                    if Decimal('0') < remaining_after_payment < minimum_charge:
                        return {
                            'success': False,
                            'error': f'Remaining balance of {remaining_after_payment} {invoice.currency} would be below minimum charge of {minimum_charge} {invoice.currency}',
                            'error_code': 'REMAINING_BELOW_MINIMUM'
                        }
            else:
                # Full payment or remaining balance
                payment_amount = invoice.remaining_amount if hasattr(invoice, 'remaining_amount') else invoice.total_amount
                description = f'Payment for invoice {invoice.invoice_id}'

            # Get the gateway
            try:
                gateway = PaymentGateway.objects.get(code=gateway_code, is_active=True)
            except PaymentGateway.DoesNotExist:
                return {
                    'success': False,
                    'error': f'Payment gateway {gateway_code} not found or inactive'
                }

            with transaction.atomic():
                # CRITICAL FIX: Check for existing pending payment for this invoice
                # This prevents duplicate payment creation when API is called multiple times
                existing_payment = Payment.objects.filter(
                    invoice=invoice,
                    status='PENDING'
                ).select_for_update().first()

                if existing_payment:
                    logger.info(f"Reusing existing pending payment {existing_payment.payment_number} for invoice {invoice.invoice_id}")
                    payment = existing_payment
                else:
                    # Create a new pending payment record using PaymentOrchestrator
                    from .payment_orchestrator import PaymentOrchestrator, PaymentRequest

                    request = PaymentRequest(
                        event_id=invoice.event.id,
                        amount=payment_amount,
                        currency=invoice.currency,
                        due_date=invoice.due_date,
                        description=description,
                        invoice_id=invoice.id,
                        payment_type='INVOICE',
                        created_by='invoice_service'
                    )

                    response = PaymentOrchestrator.create_payment(request)
                    if not response.success:
                        raise ValueError(f"Failed to create payment for invoice: {response.message}")

                    payment = Payment.objects.get(id=response.payment_id)
                    logger.info(f"Created new pending payment {payment.payment_number} for invoice {invoice.invoice_id}")

                # Create payment intent through gateway service
                if gateway_code == 'stripe':
                    # Set up Stripe
                    if not gateway.config or 'secret_key' not in gateway.config:
                        return {
                            'success': False,
                            'error': 'Stripe gateway not properly configured'
                        }

                    stripe.api_key = gateway.config['secret_key']

                    # Check for existing transaction record for this payment
                    from ..models import PaymentTransaction
                    existing_transaction = PaymentTransaction.objects.filter(
                        payment=payment,
                        gateway=gateway,
                        status__in=['PROCESSING', 'PENDING']
                    ).first()

                    if existing_transaction:
                        # Reuse existing payment intent
                        logger.info(f"Reusing existing transaction {existing_transaction.transaction_id} for payment {payment.payment_number}")

                        try:
                            # Retrieve existing Stripe payment intent
                            intent = stripe.PaymentIntent.retrieve(existing_transaction.transaction_id)
                            transaction_record = existing_transaction
                        except stripe.error.StripeError as e:
                            logger.error(f"Failed to retrieve existing Stripe payment intent: {e}")
                            # Create new intent if existing one is invalid
                            intent_data = {
                                'amount': int(invoice.total_amount * 100),
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

                            # Update existing transaction record
                            existing_transaction.transaction_id = intent.id
                            existing_transaction.response_data = intent
                            existing_transaction.save()
                            transaction_record = existing_transaction
                    else:
                        # Create new payment intent
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