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
    def update_payment(payment_id, data, user):
        """Update a payment record with row-level locking to prevent race conditions"""
        with transaction.atomic():
            # Fetch payment with row-level lock to prevent concurrent updates
            try:
                payment = Payment.objects.select_for_update().get(pk=payment_id)
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