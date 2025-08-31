# backend/core/domains/payments/services/payment_service.py
from decimal import Decimal

from core.domains.events.models import Event, EventTimeline
from core.domains.sales.models import EventQuote
from django.db import transaction
from django.utils import timezone

from ..exceptions import (
    InvalidPaymentAmountException,
    InvalidPaymentStatusTransition,
    PaymentAlreadyCompletedException,
    PaymentMethodNotFoundException,
    PaymentNotFoundException,
)
from ..models import (
    Invoice,
    Payment,
    PaymentMethod,
)


class PaymentService:
    """Core service for managing payments"""

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
                description=f"Payment of {payment.format_amount_with_currency()} {payment.get_status_display().lower()}",
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
    def process_gateway_payment(payment_id, gateway_code, payment_data, user):
        """Process payment through gateway - delegates to PaymentGatewayService"""
        from .gateway_service import PaymentGatewayService
        return PaymentGatewayService.process_gateway_payment(payment_id, gateway_code, payment_data, user)