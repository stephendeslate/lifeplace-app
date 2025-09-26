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
        """
        DEPRECATED: Use PaymentOrchestrator.create_payment() instead.

        This method is deprecated and will be removed. All payment creation
        should go through PaymentOrchestrator for consistency and proper
        state management.
        """
        from .payment_orchestrator import PaymentOrchestrator, PaymentRequest
        from decimal import Decimal

        # Convert old data format to PaymentRequest
        request = PaymentRequest(
            event_id=data.get('event'),
            amount=Decimal(str(data.get('amount', '0'))),
            currency=data.get('currency', 'PHP'),
            due_date=data.get('due_date'),
            description=data.get('description', ''),
            notes=data.get('notes', ''),
            payment_type='STANDARD',
            quote_id=data.get('quote'),
            invoice_id=data.get('invoice'),
            payment_method_id=data.get('payment_method'),
            is_manual=data.get('is_manual', False),
            auto_process=data.get('status') == 'COMPLETED',
            created_by='legacy_payment_service'
        )

        # Use PaymentOrchestrator
        response = PaymentOrchestrator.create_payment(request, user)

        if response.success:
            return Payment.objects.get(id=response.payment_id)
        else:
            # Convert orchestrator errors to legacy exceptions
            if response.error_code == 'INVALID_AMOUNT':
                raise InvalidPaymentAmountException(response.message)
            elif response.error_code == 'INVALID_PAYMENT_METHOD':
                raise PaymentMethodNotFoundException(response.message)
            else:
                raise ValueError(response.message)
    
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