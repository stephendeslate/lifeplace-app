# backend/core/domains/payments/services/payment_plan_service.py
from decimal import Decimal
import logging

from core.domains.events.models import Event, EventTimeline
from core.domains.sales.models import EventQuote
from django.db import transaction
from django.utils import timezone

from ..exceptions import (
    InvalidPaymentAmountException,
    PaymentPlanNotFoundException,
)
from ..models import Payment, PaymentInstallment, PaymentPlan, PaymentSettings

logger = logging.getLogger(__name__)


class PaymentPlanService:
    """Service for managing payment plans"""

    @staticmethod
    def get_effective_balance_due_days():
        """Get balance due days from global payment settings

        CONSOLIDATED: Now reads only from PaymentSettings (single source of truth).
        Previously checked booking flow overrides, but this caused configuration
        fragmentation. All payment logic now centralized in payments domain.
        """
        settings = PaymentSettings.get_default_settings()
        return settings.balance_due_days

    @staticmethod
    def get_effective_grace_period_days():
        """Get grace period days from global payment settings

        CONSOLIDATED: Now reads only from PaymentSettings (single source of truth).
        """
        settings = PaymentSettings.get_default_settings()
        return settings.grace_period_days

    @staticmethod
    def get_effective_installment_settings():
        """Get installment settings from global payment settings

        CONSOLIDATED: Now reads only from PaymentSettings (single source of truth).

        Returns:
            dict: {
                'number_of_installments': int,
                'frequency': str ('WEEKLY', 'BIWEEKLY', or 'MONTHLY')
            }
        """
        settings = PaymentSettings.get_default_settings()
        return {
            'number_of_installments': settings.default_installments,
            'frequency': settings.default_installment_frequency
        }

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

            # Get default settings for any missing values
            settings = PaymentSettings.get_default_settings()

            # Create the plan
            payment_plan = PaymentPlan.objects.create(
                event=event,
                total_amount=total_amount,
                down_payment_amount=down_payment_amount,
                down_payment_due_date=data.get('down_payment_due_date', timezone.now().date()),
                number_of_installments=data.get('number_of_installments', settings.default_installments),
                frequency=data.get('frequency', settings.default_installment_frequency),
                grace_period_days=data.get('grace_period_days', settings.grace_period_days),
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

    @staticmethod
    def create_payment_plan_from_deposit(event, deposit_payment, remaining_amount, booking_session=None):
        """Create a payment plan for the remaining balance after a deposit payment

        CONSOLIDATED: Now uses global PaymentSettings for all configuration.

        Args:
            event: Event instance
            deposit_payment: Payment instance (the deposit payment)
            remaining_amount: Decimal amount remaining after deposit
            booking_session: Optional BookingSession for reference (audit trail only)

        Returns:
            PaymentPlan instance
        """
        with transaction.atomic():
            # Get settings from global payment settings (single source of truth)
            balance_due_days = PaymentPlanService.get_effective_balance_due_days()
            grace_period_days = PaymentPlanService.get_effective_grace_period_days()
            installment_settings = PaymentPlanService.get_effective_installment_settings()

            # Calculate due date based on global settings
            due_date = event.start_date.date() - timezone.timedelta(days=balance_due_days)

            # Create payment plan for remaining balance
            payment_plan = PaymentPlan.objects.create(
                event=event,
                total_amount=remaining_amount,
                down_payment_amount=Decimal('0.00'),  # Deposit already paid
                down_payment_due_date=due_date,
                number_of_installments=installment_settings['number_of_installments'],
                frequency=installment_settings['frequency'],
                grace_period_days=grace_period_days,
                status='ACTIVE',  # Already active since deposit is paid
                notes=f"Payment plan created after deposit payment of {deposit_payment.format_amount_with_currency()}",
                created_from_booking_session=booking_session  # Audit trail only
            )

            # Update payment plan dates
            payment_plan.update_next_payment_date()
            payment_plan.final_payment_date = payment_plan.installments.last().due_date
            payment_plan.save(update_fields=['next_payment_date', 'final_payment_date'])

            # Add to event timeline
            EventTimeline.objects.create(
                event=event,
                action_type='SYSTEM_UPDATE',
                description=f"Payment plan created for remaining balance after deposit",
                is_public=True,
                action_data={
                    'payment_plan_id': payment_plan.id,
                    'remaining_amount': str(remaining_amount),
                    'deposit_payment_id': deposit_payment.id,
                    'installments': payment_plan.number_of_installments
                }
            )

            return payment_plan

    @staticmethod
    def update_payment_plan_status(plan_id):
        """Update payment plan status based on installment statuses"""
        try:
            payment_plan = PaymentPlan.objects.get(pk=plan_id)
            payment_plan.update_status()
            return payment_plan
        except PaymentPlan.DoesNotExist:
            raise PaymentPlanNotFoundException(f"Payment plan with ID {plan_id} not found")

    @staticmethod
    def check_overdue_installments():
        """Check all payment plans for overdue installments and update statuses"""
        overdue_count = 0

        # Get all pending installments that are past due
        overdue_installments = PaymentInstallment.objects.filter(
            status='PENDING',
            due_date__lt=timezone.now().date()
        )

        for installment in overdue_installments:
            installment.status = 'OVERDUE'
            installment.save(update_fields=['status'])
            overdue_count += 1

            # Update parent payment plan status
            installment.payment_plan.update_status()

        return overdue_count

    @staticmethod
    def apply_late_fees(plan_id, fee_amount):
        """Apply late fees to overdue installments in a payment plan"""
        try:
            payment_plan = PaymentPlan.objects.get(pk=plan_id)

            overdue_installments = payment_plan.installments.filter(
                status='OVERDUE',
                late_fee_amount=Decimal('0.00')  # Only apply to installments without fees
            )

            fee_count = 0
            for installment in overdue_installments:
                installment.apply_late_fee(fee_amount)
                fee_count += 1

            return fee_count

        except PaymentPlan.DoesNotExist:
            raise PaymentPlanNotFoundException(f"Payment plan with ID {plan_id} not found")

    @staticmethod
    def process_auto_payments():
        """Process automatic payments for payment plans with auto-payment enabled"""
        processed_count = 0

        # Get payment plans with auto-payment enabled and upcoming installments
        auto_payment_plans = PaymentPlan.objects.filter(
            auto_payment_enabled=True,
            auto_payment_method__isnull=False,
            status='ACTIVE'
        )

        for plan in auto_payment_plans:
            # OVER-PAYMENT PREVENTION: Check if event balance is already paid
            event = plan.event
            remaining_balance = event.total_amount_due - event.total_amount_paid if event.total_amount_due else Decimal('0.00')

            if remaining_balance <= 0:
                # Balance already paid, mark plan as complete and skip
                plan.status = 'COMPLETED'
                plan.save()
                logger.info(f"Auto-completed payment plan {plan.id} - event balance already paid")
                continue

            # Get next due installment
            next_installment = plan.installments.filter(
                status='PENDING',
                due_date__lte=timezone.now().date()
            ).order_by('due_date').first()

            if next_installment:
                try:
                    # OVER-PAYMENT PREVENTION: Adjust charge amount if it exceeds remaining balance
                    charge_amount = min(next_installment.amount, remaining_balance)

                    # Create payment for the installment
                    payment = next_installment.create_payment()

                    # Use adjusted amount if different from original installment amount
                    if charge_amount < next_installment.amount:
                        payment.amount = charge_amount
                        payment.description = f"{payment.description} (adjusted to remaining balance)"
                        logger.info(f"Adjusted auto-payment from {next_installment.amount} to {charge_amount} for plan {plan.id}")

                    payment.payment_method = plan.auto_payment_method
                    payment.save()

                    # Process payment through gateway
                    # This would integrate with actual payment gateway
                    # For now, mark as completed
                    payment.complete_payment()
                    next_installment.mark_as_paid()

                    processed_count += 1

                except Exception as e:
                    # Log error but continue processing other plans
                    logger.error(f"Auto-payment failed for payment plan {plan.id}: {e}")

        return processed_count

    @staticmethod
    def suspend_payment_plan(plan_id, reason, user):
        """Suspend a payment plan"""
        try:
            payment_plan = PaymentPlan.objects.get(pk=plan_id)
            payment_plan.status = 'SUSPENDED'
            payment_plan.notes += f"\n\nSUSPENDED: {reason} (by {user.email})"
            payment_plan.save(update_fields=['status', 'notes'])

            # Add to event timeline
            EventTimeline.objects.create(
                event=payment_plan.event,
                action_type='SYSTEM_UPDATE',
                description=f"Payment plan suspended: {reason}",
                actor=user,
                is_public=False,
                action_data={
                    'payment_plan_id': payment_plan.id,
                    'reason': reason
                }
            )

            return payment_plan

        except PaymentPlan.DoesNotExist:
            raise PaymentPlanNotFoundException(f"Payment plan with ID {plan_id} not found")

    @staticmethod
    def reactivate_payment_plan(plan_id, user):
        """Reactivate a suspended payment plan"""
        try:
            payment_plan = PaymentPlan.objects.get(pk=plan_id)

            if payment_plan.status != 'SUSPENDED':
                raise ValueError("Can only reactivate suspended payment plans")

            payment_plan.status = 'ACTIVE'
            payment_plan.notes += f"\n\nREACTIVATED by {user.email}"
            payment_plan.save(update_fields=['status', 'notes'])

            # Update next payment date
            payment_plan.update_next_payment_date()
            payment_plan.save(update_fields=['next_payment_date'])

            # Add to event timeline
            EventTimeline.objects.create(
                event=payment_plan.event,
                action_type='SYSTEM_UPDATE',
                description="Payment plan reactivated",
                actor=user,
                is_public=False,
                action_data={'payment_plan_id': payment_plan.id}
            )

            return payment_plan

        except PaymentPlan.DoesNotExist:
            raise PaymentPlanNotFoundException(f"Payment plan with ID {plan_id} not found")

    @staticmethod
    def complete_plan_if_balance_paid(plan_id):
        """Auto-complete payment plan if event balance is fully paid

        This method is called after manual payments to automatically complete
        payment plans when the event balance reaches zero, preventing unnecessary
        auto-payment attempts.

        Args:
            plan_id: ID of the payment plan to check

        Returns:
            bool: True if plan was completed, False otherwise
        """
        try:
            payment_plan = PaymentPlan.objects.get(pk=plan_id)

            # Only process active plans
            if payment_plan.status != 'ACTIVE':
                return False

            # Check if event is fully paid
            event = payment_plan.event
            if event.payment_status == 'PAID':
                payment_plan.status = 'COMPLETED'
                payment_plan.notes += f"\n\nAuto-completed on {timezone.now().date()} - event balance fully paid"
                payment_plan.save(update_fields=['status', 'notes'])

                # Add to event timeline
                EventTimeline.objects.create(
                    event=event,
                    action_type='SYSTEM_UPDATE',
                    description="Payment plan auto-completed - balance fully paid",
                    is_public=False,
                    action_data={'payment_plan_id': payment_plan.id}
                )

                logger.info(f"Auto-completed payment plan {plan_id} - event {event.id} fully paid")
                return True

            return False

        except PaymentPlan.DoesNotExist:
            logger.warning(f"Payment plan {plan_id} not found for auto-completion check")
            return False