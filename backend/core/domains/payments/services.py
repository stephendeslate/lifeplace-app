# backend/core/domains/payments/services.py
from datetime import timedelta
from decimal import Decimal

from core.domains.events.models import Event, EventTimeline
from core.domains.sales.models import EventQuote
from django.db import transaction
from django.utils import timezone

from .exceptions import (
    InsufficientFundsException,
    InvalidPaymentAmountException,
    InvalidPaymentStatusTransition,
    InvalidRefundStatusException,
    InvoiceNotFoundException,
    PaymentAlreadyCompletedException,
    PaymentGatewayException,
    PaymentMethodNotFoundException,
    PaymentNotFoundException,
    PaymentPlanNotFoundException,
    RefundExceedsPaymentException,
)
from .models import (
    Invoice,
    InvoiceLineItem,
    InvoiceTax,
    Payment,
    PaymentGateway,
    PaymentInstallment,
    PaymentMethod,
    PaymentNotification,
    PaymentPlan,
    PaymentTransaction,
    Refund,
    TaxRate,
)


class PaymentService:
    """Service for managing payments"""

    @staticmethod
    def create_payment(data, user):
        """Create a new payment record"""
        event_id = data.get('event')
        
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            raise ValueError(f"Event with ID {event_id} not found")
        
        # Validate payment amount
        amount = Decimal(str(data.get('amount', '0')))
        if amount <= 0:
            raise InvalidPaymentAmountException("Payment amount must be greater than zero")
        
        # Check if payment method exists if provided
        payment_method_id = data.get('payment_method')
        payment_method = None
        if payment_method_id:
            try:
                payment_method = PaymentMethod.objects.get(pk=payment_method_id)
            except PaymentMethod.DoesNotExist:
                raise PaymentMethodNotFoundException(f"Payment method with ID {payment_method_id} not found")
        
        with transaction.atomic():
            # Create the payment
            payment = Payment.objects.create(
                event=event,
                amount=amount,
                status=data.get('status', 'PENDING'),
                due_date=data.get('due_date', timezone.now().date()),
                payment_method=payment_method,
                description=data.get('description', ''),
                notes=data.get('notes', ''),
                reference_number=data.get('reference_number', ''),
                is_manual=data.get('is_manual', False),
                processed_by=user if data.get('is_manual', False) else None,
            )
            
            # If there's a quote ID, associate with it
            quote_id = data.get('quote')
            if quote_id:
                try:
                    quote = EventQuote.objects.get(pk=quote_id)
                    payment.quote = quote
                    payment.save()
                except EventQuote.DoesNotExist:
                    pass  # Continue even if quote not found
            
            # If there's an invoice ID, associate with it
            invoice_id = data.get('invoice')
            if invoice_id:
                try:
                    invoice = Invoice.objects.get(pk=invoice_id)
                    payment.invoice = invoice
                    payment.save()
                except Invoice.DoesNotExist:
                    pass  # Continue even if invoice not found
            
            # If payment is marked as completed, process it
            if payment.status == 'COMPLETED':
                payment.complete_payment()
            
            # Record in event timeline
            EventTimeline.objects.create(
                event=event,
                action_type='PAYMENT_RECEIVED' if payment.status == 'COMPLETED' else 'SYSTEM_UPDATE',
                description=f"Payment of ${amount} {payment.get_status_display().lower()}",
                actor=user,
                is_public=True,
                action_data={
                    'payment_id': payment.id,
                    'amount': str(amount),
                    'status': payment.status
                }
            )
            
            return payment
    
    @staticmethod
    def update_payment(payment_id, data, user):
        """Update a payment record"""
        try:
            payment = Payment.objects.get(pk=payment_id)
        except Payment.DoesNotExist:
            raise PaymentNotFoundException(f"Payment with ID {payment_id} not found")
        
        # Prevent updating completed payments except for notes
        if payment.status == 'COMPLETED' and set(data.keys()) - {'notes'}:
            raise PaymentAlreadyCompletedException("Cannot update a completed payment")
        
        # Validate status transition
        new_status = data.get('status')
        if new_status and new_status != payment.status:
            # Only allow PENDING -> COMPLETED or PENDING -> FAILED
            if payment.status == 'PENDING' and new_status in ['COMPLETED', 'FAILED']:
                pass  # Valid transition
            else:
                raise InvalidPaymentStatusTransition(
                    f"Cannot change payment status from {payment.status} to {new_status}"
                )
        
        with transaction.atomic():
            # Update simple fields
            for field in ['notes', 'reference_number', 'description']:
                if field in data:
                    setattr(payment, field, data[field])
            
            # Handle status change specially
            if new_status and new_status != payment.status:
                payment.status = new_status
                # If changing to COMPLETED, process completion
                if new_status == 'COMPLETED':
                    # Save first to update status
                    payment.save()
                    payment.complete_payment()
                else:
                    payment.save()
            else:
                payment.save()
            
            # Record in event timeline if status changed
            if new_status and new_status != payment.status:
                EventTimeline.objects.create(
                    event=payment.event,
                    action_type='PAYMENT_RECEIVED' if new_status == 'COMPLETED' else 'SYSTEM_UPDATE',
                    description=f"Payment status updated to {payment.get_status_display()}",
                    actor=user,
                    is_public=new_status == 'COMPLETED',
                    action_data={
                        'payment_id': payment.id,
                        'amount': str(payment.amount),
                        'status': new_status
                    }
                )
            
            return payment
    
    @staticmethod
    def process_payment(payment_id, payment_data, user):
        """Process a payment through a payment gateway"""
        try:
            payment = Payment.objects.get(pk=payment_id)
        except Payment.DoesNotExist:
            raise PaymentNotFoundException(f"Payment with ID {payment_id} not found")
        
        # Check if already completed
        if payment.status == 'COMPLETED':
            raise PaymentAlreadyCompletedException("This payment is already completed")
        
        # Get payment method and gateway
        payment_method_id = payment_data.get('payment_method')
        try:
            payment_method = PaymentMethod.objects.get(pk=payment_method_id)
            payment.payment_method = payment_method
            payment.save(update_fields=['payment_method'])
        except PaymentMethod.DoesNotExist:
            raise PaymentMethodNotFoundException(f"Payment method with ID {payment_method_id} not found")
        
        # Get the gateway from the payment method
        gateway = payment_method.gateway
        if not gateway:
            raise PaymentGatewayException("No payment gateway configured for this payment method")
        
        # Here you would integrate with the actual payment gateway
        # For now, we'll simulate a gateway response
        simulated_response = {
            'success': True,
            'transaction_id': f"txn_{timezone.now().strftime('%Y%m%d%H%M%S')}",
            'amount': str(payment.amount),
            'status': 'approved',
            'timestamp': timezone.now().isoformat()
        }
        
        is_test = payment_data.get('is_test', False)
        
        with transaction.atomic():
            # Record the transaction
            transaction_status = 'COMPLETED' if simulated_response['success'] else 'FAILED'
            
            transaction = PaymentTransaction.objects.create(
                payment=payment,
                gateway=gateway,
                transaction_id=simulated_response['transaction_id'],
                amount=payment.amount,
                status=transaction_status,
                response_data=simulated_response,
                error_message='' if simulated_response['success'] else 'Simulated failure',
                is_test=is_test
            )
            
            # If successful, complete the payment
            if transaction_status == 'COMPLETED':
                payment.status = 'COMPLETED'
                payment.save()
                payment.complete_payment()
            
            return transaction
    
    @staticmethod
    def create_refund(payment_id, refund_data, user):
        """Create a refund for a payment"""
        try:
            payment = Payment.objects.get(pk=payment_id)
        except Payment.DoesNotExist:
            raise PaymentNotFoundException(f"Payment with ID {payment_id} not found")
        
        # Check if payment can be refunded
        if payment.status != 'COMPLETED':
            raise InvalidRefundStatusException("Only completed payments can be refunded")
        
        # Validate refund amount
        refund_amount = Decimal(str(refund_data.get('amount', '0')))
        if refund_amount <= 0:
            raise InvalidPaymentAmountException("Refund amount must be greater than zero")
        
        # Check if refund amount exceeds payment
        existing_refund_total = sum(
            refund.amount for refund in payment.refunds.filter(status='COMPLETED')
        )
        if refund_amount + existing_refund_total > payment.amount:
            raise RefundExceedsPaymentException(
                f"Total refund amount ({refund_amount + existing_refund_total}) "
                f"would exceed original payment amount ({payment.amount})"
            )
        
        with transaction.atomic():
            # Create the refund record
            refund = Refund.objects.create(
                payment=payment,
                amount=refund_amount,
                reason=refund_data.get('reason', ''),
                status='PENDING',
                refunded_by=user
            )
            
            # Process the refund - in real implementation, this would call the payment gateway
            # For now, just simulate a successful refund
            refund.status = 'COMPLETED'
            refund.refund_transaction_id = f"ref_{timezone.now().strftime('%Y%m%d%H%M%S')}"
            refund.save()
            
            # Record in event timeline
            EventTimeline.objects.create(
                event=payment.event,
                action_type='SYSTEM_UPDATE',
                description=f"Refund of ${refund_amount} processed",
                actor=user,
                is_public=True,
                action_data={
                    'refund_id': refund.id,
                    'payment_id': payment.id,
                    'amount': str(refund_amount),
                    'reason': refund.reason
                }
            )
            
            return refund


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


class PaymentPlanService:
    """Service for managing payment plans"""
    
    @staticmethod
    def create_payment_plan(data, user):
        """Create a new payment plan"""
        event_id = data.get('event')
        
        try:
            event = Event.objects.get(pk=event_id)
        except Event.DoesNotExist:
            raise ValueError(f"Event with ID {event_id} not found")
        
        # Validate payment amounts
        total_amount = Decimal(str(data.get('total_amount', '0')))
        down_payment_amount = Decimal(str(data.get('down_payment_amount', '0')))
        
        if total_amount <= 0:
            raise InvalidPaymentAmountException("Total amount must be greater than zero")
        
        if down_payment_amount < 0 or down_payment_amount >= total_amount:
            raise InvalidPaymentAmountException("Down payment must be between 0 and total amount")
        
        # Create payment plan
        with transaction.atomic():
            # Check if there's already a plan for this event
            if hasattr(event, 'payment_plan'):
                raise ValueError("This event already has a payment plan")
            
            # Create the plan
            payment_plan = PaymentPlan.objects.create(
                event=event,
                total_amount=total_amount,
                down_payment_amount=down_payment_amount,
                down_payment_due_date=data.get('down_payment_due_date', timezone.now().date()),
                number_of_installments=data.get('number_of_installments', 1),
                frequency=data.get('frequency', 'MONTHLY'),
                notes=data.get('notes', '')
            )
            
            # If quote ID is provided, link to the quote
            quote_id = data.get('quote')
            if quote_id:
                try:
                    quote = EventQuote.objects.get(pk=quote_id)
                    payment_plan.quote = quote
                    payment_plan.save()
                except EventQuote.DoesNotExist:
                    pass  # Continue even if quote not found
            
            # Generate installments
            payment_plan.create_installments()
            
            # Add to event timeline
            EventTimeline.objects.create(
                event=event,
                action_type='SYSTEM_UPDATE',
                description=f"Payment plan created with {payment_plan.number_of_installments} installments",
                actor=user,
                is_public=True,
                action_data={
                    'payment_plan_id': payment_plan.id,
                    'total_amount': str(total_amount),
                    'installments': payment_plan.number_of_installments
                }
            )
            
            return payment_plan
    
    @staticmethod
    def update_payment_plan(plan_id, data, user):
        """Update a payment plan (limited fields)"""
        try:
            payment_plan = PaymentPlan.objects.get(pk=plan_id)
        except PaymentPlan.DoesNotExist:
            raise PaymentPlanNotFoundException(f"Payment plan with ID {plan_id} not found")
        
        # Check for existing payments
        installments_with_payments = payment_plan.installments.filter(
            payment__isnull=False
        ).exists()
        
        if installments_with_payments and set(data.keys()) - {'notes'}:
            raise ValueError("Cannot modify a payment plan that has payments")
        
        # Update allowed fields
        if 'notes' in data:
            payment_plan.notes = data['notes']
            payment_plan.save()
        
        return payment_plan
    
    @staticmethod
    def create_payment_from_installment(installment_id, payment_data, user):
        """Create a payment for a specific installment"""
        try:
            installment = PaymentInstallment.objects.get(pk=installment_id)
        except PaymentInstallment.DoesNotExist:
            raise ValueError(f"Payment installment with ID {installment_id} not found")
        
        # Check if payment already exists
        if hasattr(installment, 'payment') and installment.payment.exists():
            raise ValueError("This installment already has a payment")
        
        # Create payment for the installment
        with transaction.atomic():
            payment = installment.create_payment()
            
            # If payment method is provided, add it
            payment_method_id = payment_data.get('payment_method')
            if payment_method_id:
                try:
                    payment_method = PaymentMethod.objects.get(pk=payment_method_id)
                    payment.payment_method = payment_method
                    payment.save()
                except PaymentMethod.DoesNotExist:
                    pass
            
            # Process payment if requested
            if payment_data.get('process_now', False):
                # This would call the payment gateway in production
                # For now, just mark it completed
                payment.status = 'COMPLETED'
                payment.save()
                payment.complete_payment()
            
            return payment


class PaymentMethodService:
    """Service for managing payment methods"""
    
    @staticmethod
    def create_payment_method(data, user):
        """Create a new payment method"""
        user_id = data.get('user', user.id)
        
        # Validate type
        method_type = data.get('type')
        if not method_type or method_type not in [choice[0] for choice in PaymentMethod.TYPE_CHOICES]:
            raise ValueError(f"Invalid payment method type: {method_type}")
        
        # Handle credit card validation if needed
        if method_type == 'CREDIT_CARD':
            if not data.get('last_four'):
                raise ValueError("Last four digits required for credit card")
        
        # Get gateway if provided
        gateway = None
        gateway_id = data.get('gateway')
        if gateway_id:
            try:
                gateway = PaymentGateway.objects.get(pk=gateway_id)
            except PaymentGateway.DoesNotExist:
                raise ValueError(f"Payment gateway with ID {gateway_id} not found")
        
        # Create the payment method
        with transaction.atomic():
            payment_method = PaymentMethod.objects.create(
                user_id=user_id,
                type=method_type,
                is_default=data.get('is_default', False),
                nickname=data.get('nickname', ''),
                instructions=data.get('instructions', ''),
                gateway=gateway,
                token_reference=data.get('token_reference', ''),
                last_four=data.get('last_four', ''),
                expiry_date=data.get('expiry_date'),
                metadata=data.get('metadata', {})
            )
            
            return payment_method
    
    @staticmethod
    def update_payment_method(method_id, data, user):
        """Update a payment method"""
        try:
            payment_method = PaymentMethod.objects.get(pk=method_id)
        except PaymentMethod.DoesNotExist:
            raise PaymentMethodNotFoundException(f"Payment method with ID {method_id} not found")
        
        # Verify user has access to this payment method
        if payment_method.user.id != user.id and not user.is_staff:
            raise PermissionError("You don't have permission to modify this payment method")
        
        # Update allowed fields
        for field in ['nickname', 'is_default', 'instructions', 'expiry_date']:
            if field in data:
                setattr(payment_method, field, data[field])
        
        payment_method.save()
        return payment_method
    
    @staticmethod
    def delete_payment_method(method_id, user):
        """Delete a payment method"""
        try:
            payment_method = PaymentMethod.objects.get(pk=method_id)
        except PaymentMethod.DoesNotExist:
            raise PaymentMethodNotFoundException(f"Payment method with ID {method_id} not found")
        
        # Verify user has access to this payment method
        if payment_method.user.id != user.id and not user.is_staff:
            raise PermissionError("You don't have permission to delete this payment method")
        
        # Check if method is used in pending payments
        has_pending_payments = Payment.objects.filter(
            payment_method=payment_method, 
            status='PENDING'
        ).exists()
        
        if has_pending_payments:
            raise ValueError("Cannot delete a payment method with pending payments")
        
        payment_method.delete()


class PaymentGatewayService:
    """Service for managing payment gateways"""
    
    @staticmethod
    def create_gateway(data, user):
        """Create a new payment gateway configuration"""
        # Only staff can create gateways
        if not user.is_staff:
            raise PermissionError("Only staff members can manage payment gateways")
        
        # Check for required fields
        if not data.get('name') or not data.get('code'):
            raise ValueError("Name and code are required for payment gateways")
        
        # Check if code already exists
        if PaymentGateway.objects.filter(code=data.get('code')).exists():
            raise ValueError(f"Payment gateway with code {data.get('code')} already exists")
        
        # Create gateway
        gateway = PaymentGateway.objects.create(
            name=data.get('name'),
            code=data.get('code'),
            is_active=data.get('is_active', True),
            config=data.get('config', {}),
            description=data.get('description', '')
        )
        
        return gateway
    
    @staticmethod
    def update_gateway(gateway_id, data, user):
        """Update a payment gateway configuration"""
        # Only staff can update gateways
        if not user.is_staff:
            raise PermissionError("Only staff members can manage payment gateways")
        
        try:
            gateway = PaymentGateway.objects.get(pk=gateway_id)
        except PaymentGateway.DoesNotExist:
            raise ValueError(f"Payment gateway with ID {gateway_id} not found")
        
        # Update fields
        for field in ['name', 'is_active', 'config', 'description']:
            if field in data:
                setattr(gateway, field, data[field])
        
        # Code can only be updated if not used in any payment methods
        if 'code' in data and data['code'] != gateway.code:
            has_methods = PaymentMethod.objects.filter(gateway=gateway).exists()
            if has_methods:
                raise ValueError("Cannot change code for a gateway that is in use")
            gateway.code = data['code']
        
        gateway.save()
        return gateway
    
    @staticmethod
    def delete_gateway(gateway_id, user):
        """Delete a payment gateway"""
        # Only staff can delete gateways
        if not user.is_staff:
            raise PermissionError("Only staff members can manage payment gateways")
        
        try:
            gateway = PaymentGateway.objects.get(pk=gateway_id)
        except PaymentGateway.DoesNotExist:
            raise ValueError(f"Payment gateway with ID {gateway_id} not found")
        
        # Check if gateway is used in any payment methods
        has_methods = PaymentMethod.objects.filter(gateway=gateway).exists()
        if has_methods:
            raise ValueError("Cannot delete a gateway that is in use")
        
        gateway.delete()


class TaxRateService:
    """Service for managing tax rates"""
    
    @staticmethod
    def create_tax_rate(data, user):
        """Create a new tax rate"""
        # Only staff can create tax rates
        if not user.is_staff:
            raise PermissionError("Only staff members can manage tax rates")
        
        # Check required fields
        if not data.get('name') or not data.get('rate'):
            raise ValueError("Name and rate are required for tax rates")
        
        # Create the tax rate
        tax_rate = TaxRate.objects.create(
            name=data.get('name'),
            rate=Decimal(str(data.get('rate'))),
            region=data.get('region', ''),
            is_default=data.get('is_default', False)
        )
        
        return tax_rate
    
    @staticmethod
    def update_tax_rate(rate_id, data, user):
        """Update a tax rate"""
        # Only staff can update tax rates
        if not user.is_staff:
            raise PermissionError("Only staff members can manage tax rates")
        
        try:
            tax_rate = TaxRate.objects.get(pk=rate_id)
        except TaxRate.DoesNotExist:
            raise ValueError(f"Tax rate with ID {rate_id} not found")
        
        # Update fields
        for field in ['name', 'rate', 'region', 'is_default']:
            if field in data:
                setattr(tax_rate, field, data[field])
        
        tax_rate.save()
        return tax_rate
    
    @staticmethod
    def delete_tax_rate(rate_id, user):
        """Delete a tax rate"""
        # Only staff can delete tax rates
        if not user.is_staff:
            raise PermissionError("Only staff members can manage tax rates")
        
        try:
            tax_rate = TaxRate.objects.get(pk=rate_id)
        except TaxRate.DoesNotExist:
            raise ValueError(f"Tax rate with ID {rate_id} not found")
        
        # Check if tax rate is in use
        is_used = InvoiceTax.objects.filter(tax_rate=tax_rate).exists()
        if is_used:
            raise ValueError("Cannot delete a tax rate that is in use")
        
        tax_rate.delete()