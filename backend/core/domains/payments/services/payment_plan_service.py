# backend/core/domains/payments/services/payment_plan_service.py
from decimal import Decimal

from core.domains.events.models import Event, EventTimeline
from core.domains.sales.models import EventQuote
from django.db import transaction
from django.utils import timezone

from ..exceptions import (
    InvalidPaymentAmountException,
    PaymentPlanNotFoundException,
)
from ..models import Payment, PaymentInstallment, PaymentPlan


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
                    from ..models import PaymentMethod
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