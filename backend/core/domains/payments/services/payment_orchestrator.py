# backend/core/domains/payments/services/payment_orchestrator.py

import logging
from decimal import Decimal
from datetime import date, timedelta
from typing import Dict, List, Optional, Union, Any
from dataclasses import dataclass
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


@dataclass
class PaymentRequest:
    """
    Unified payment creation request.

    This standardizes all payment creation requests across the system,
    replacing the inconsistent data structures used by different creation paths.
    """
    # Core payment data
    event_id: int
    amount: Decimal
    currency: str = 'PHP'
    due_date: date = None
    description: str = ''
    notes: str = ''

    # Payment context
    payment_type: str = 'STANDARD'  # STANDARD, DEPOSIT, INSTALLMENT, INVOICE
    created_by: str = 'system'
    metadata: Dict[str, Any] = None

    # Related objects
    quote_id: Optional[int] = None
    invoice_id: Optional[int] = None
    installment_id: Optional[int] = None
    payment_method_id: Optional[int] = None

    # Payment processing options
    auto_process: bool = False
    gateway_code: str = 'stripe'
    save_payment_method: bool = False

    # Special handling flags
    is_manual: bool = False
    is_deposit: bool = False
    create_payment_plan: bool = False

    def __post_init__(self):
        """Validate and normalize the request"""
        if self.metadata is None:
            self.metadata = {}

        if self.due_date is None:
            self.due_date = timezone.now().date() + timedelta(days=30)

        if isinstance(self.amount, (int, float, str)):
            self.amount = Decimal(str(self.amount))

        if self.amount <= 0:
            raise ValidationError("Payment amount must be greater than zero")


@dataclass
class PaymentResponse:
    """
    Unified payment creation response.

    Provides consistent response structure across all payment creation methods.
    """
    success: bool
    payment_id: Optional[int] = None
    payment_number: Optional[str] = None
    payment_status: Optional[str] = None
    message: str = ''

    # Gateway-specific data
    gateway_data: Optional[Dict[str, Any]] = None

    # Additional context
    requires_action: bool = False
    next_action: Optional[Dict[str, Any]] = None

    # Error details (when success=False)
    error_code: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert response to dictionary for API serialization"""
        result = {
            'success': self.success,
            'message': self.message,
        }

        if self.success:
            result.update({
                'payment_id': self.payment_id,
                'payment_number': self.payment_number,
                'payment_status': self.payment_status,
                'requires_action': self.requires_action,
            })

            if self.gateway_data:
                result['gateway_data'] = self.gateway_data

            if self.next_action:
                result['next_action'] = self.next_action
        else:
            result.update({
                'error_code': self.error_code,
                'error_details': self.error_details or {},
            })

        return result


class PaymentOrchestrator:
    """
    Unified payment creation and processing orchestrator.

    This service replaces all scattered payment creation logic with a single,
    consistent entry point that ensures:
    - Atomic payment creation with proper state management
    - Consistent validation across all payment types
    - Proper transaction boundaries and error handling
    - Domain event publishing for side effects

    Key Features:
    - Single entry point for ALL payment creation
    - State machine integration for atomic status management
    - Business rule enforcement (payment plans, deposits, etc.)
    - Gateway abstraction for payment processing
    - Comprehensive error handling and rollback
    """

    @classmethod
    def create_payment(cls, request: PaymentRequest, user=None) -> PaymentResponse:
        """
        Create a new payment with full orchestration.

        This is the ONLY method that should be used for creating payments.
        All other creation methods throughout the codebase should be migrated
        to use this orchestrator.

        Args:
            request: PaymentRequest with all payment details
            user: User creating the payment (for audit trail)

        Returns:
            PaymentResponse with creation results
        """
        try:
            logger.info(
                f"Creating payment: {request.payment_type} for event {request.event_id}, "
                f"amount {request.amount} {request.currency}"
            )

            # Validate the request
            validation_result = cls._validate_payment_request(request)
            if not validation_result.success:
                return validation_result

            # Create payment within transaction
            with transaction.atomic():
                # Step 1: Create the payment record
                payment = cls._create_payment_record(request, user)

                # Step 2: Apply business rules
                cls._apply_business_rules(payment, request, user)

                # Step 3: Handle payment processing if requested
                if request.auto_process:
                    processing_result = cls._process_payment(payment, request, user)
                    if not processing_result.success:
                        # Processing failed, but payment was created
                        # Payment remains in CREATED/PENDING state for retry
                        processing_result.payment_id = payment.id
                        processing_result.payment_number = payment.payment_number
                        processing_result.payment_status = payment.status
                        return processing_result

                # Step 4: Return success response
                response = PaymentResponse(
                    success=True,
                    payment_id=payment.id,
                    payment_number=payment.payment_number,
                    payment_status=payment.status,
                    message=f"Payment {payment.payment_number} created successfully"
                )

                logger.info(
                    f"Payment created successfully: {payment.payment_number} "
                    f"with status {payment.status}"
                )

                return response

        except Exception as e:
            logger.error(
                f"Payment creation failed: {e}",
                extra={
                    'event_id': request.event_id,
                    'amount': str(request.amount),
                    'payment_type': request.payment_type,
                },
                exc_info=True
            )

            return PaymentResponse(
                success=False,
                message="Payment creation failed",
                error_code='CREATION_FAILED',
                error_details={
                    'error': str(e),
                    'event_id': request.event_id,
                    'payment_type': request.payment_type
                }
            )

    @classmethod
    def process_existing_payment(cls, payment_id: int, gateway_code: str = 'stripe',
                               payment_data: Dict = None, user=None) -> PaymentResponse:
        """
        Process an existing payment through gateway.

        This handles payment processing for payments that were created
        but not immediately processed.
        """
        try:
            from ..models import Payment
            from .payment_state_machine import PaymentStateMachine, PaymentState

            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(id=payment_id)

                logger.info(f"Processing payment {payment.payment_number} through {gateway_code}")

                # Check if payment can be processed
                if not PaymentStateMachine.can_be_processed(PaymentState(payment.status)):
                    return PaymentResponse(
                        success=False,
                        message=f"Payment cannot be processed in {payment.status} state",
                        error_code='INVALID_STATE'
                    )

                # Transition to PROCESSING state
                payment.transition_to_state(
                    'PROCESSING',
                    f'Payment processing started via {gateway_code}',
                    f'{gateway_code}_gateway'
                )

                # Process through gateway
                gateway_result = cls._process_through_gateway(
                    payment, gateway_code, payment_data or {}, user
                )

                return gateway_result

        except Payment.DoesNotExist:
            return PaymentResponse(
                success=False,
                message=f"Payment with ID {payment_id} not found",
                error_code='PAYMENT_NOT_FOUND'
            )
        except Exception as e:
            logger.error(f"Payment processing failed: {e}", exc_info=True)
            return PaymentResponse(
                success=False,
                message="Payment processing failed",
                error_code='PROCESSING_FAILED',
                error_details={'error': str(e)}
            )

    @classmethod
    def cancel_payment(cls, payment_id: int, reason: str, user=None) -> PaymentResponse:
        """Cancel a payment with proper state management"""
        try:
            from ..models import Payment

            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(id=payment_id)

                if not payment.can_transition_to('CANCELLED'):
                    return PaymentResponse(
                        success=False,
                        message=f"Payment cannot be cancelled from {payment.status} state",
                        error_code='INVALID_STATE'
                    )

                payment.transition_to_state(
                    'CANCELLED',
                    reason,
                    user.email if user else 'system'
                )

                return PaymentResponse(
                    success=True,
                    payment_id=payment.id,
                    payment_number=payment.payment_number,
                    payment_status=payment.status,
                    message=f"Payment {payment.payment_number} cancelled successfully"
                )

        except Payment.DoesNotExist:
            return PaymentResponse(
                success=False,
                message=f"Payment with ID {payment_id} not found",
                error_code='PAYMENT_NOT_FOUND'
            )
        except Exception as e:
            logger.error(f"Payment cancellation failed: {e}", exc_info=True)
            return PaymentResponse(
                success=False,
                message="Payment cancellation failed",
                error_code='CANCELLATION_FAILED'
            )

    @classmethod
    def _validate_payment_request(cls, request: PaymentRequest) -> PaymentResponse:
        """Validate payment request before creation"""
        try:
            # Validate event exists
            from core.domains.events.models import Event
            try:
                event = Event.objects.get(id=request.event_id)
            except Event.DoesNotExist:
                return PaymentResponse(
                    success=False,
                    message=f"Event with ID {request.event_id} not found",
                    error_code='EVENT_NOT_FOUND'
                )

            # Validate amount
            if request.amount <= 0:
                return PaymentResponse(
                    success=False,
                    message="Payment amount must be greater than zero",
                    error_code='INVALID_AMOUNT'
                )

            # Validate currency
            supported_currencies = ['PHP', 'USD', 'EUR', 'SGD', 'HKD']
            if request.currency not in supported_currencies:
                return PaymentResponse(
                    success=False,
                    message=f"Unsupported currency: {request.currency}",
                    error_code='INVALID_CURRENCY'
                )

            # Validate due date
            if request.due_date < timezone.now().date():
                return PaymentResponse(
                    success=False,
                    message="Due date cannot be in the past",
                    error_code='INVALID_DUE_DATE'
                )

            # Validate quote if specified
            if request.quote_id:
                from core.domains.sales.models import EventQuote
                if not EventQuote.objects.filter(
                    id=request.quote_id,
                    event=event
                ).exists():
                    return PaymentResponse(
                        success=False,
                        message="Invalid quote for this event",
                        error_code='INVALID_QUOTE'
                    )

            # Validate invoice if specified
            if request.invoice_id:
                from ..models import Invoice
                if not Invoice.objects.filter(
                    id=request.invoice_id,
                    event=event
                ).exists():
                    return PaymentResponse(
                        success=False,
                        message="Invalid invoice for this event",
                        error_code='INVALID_INVOICE'
                    )

                # OVER-PAYMENT PREVENTION: Check payment amount doesn't exceed remaining balance
                invoice = Invoice.objects.get(id=request.invoice_id)
                remaining_balance = invoice.remaining_amount if hasattr(invoice, 'remaining_amount') else invoice.total_amount
                if request.amount > remaining_balance:
                    return PaymentResponse(
                        success=False,
                        message=f"Payment amount exceeds invoice remaining balance",
                        error_code='EXCEEDS_BALANCE',
                        error_details={
                            'requested_amount': str(request.amount),
                            'remaining_balance': str(remaining_balance),
                            'total_amount': str(invoice.total_amount),
                            'paid_amount': str(invoice.paid_amount)
                        }
                    )

            # Validate payment method if specified
            if request.payment_method_id:
                from ..models import PaymentMethod
                if not PaymentMethod.objects.filter(
                    id=request.payment_method_id,
                    user=event.client
                ).exists():
                    return PaymentResponse(
                        success=False,
                        message="Invalid payment method for this client",
                        error_code='INVALID_PAYMENT_METHOD'
                    )

            return PaymentResponse(success=True, message="Validation passed")

        except Exception as e:
            logger.error(f"Payment validation failed: {e}", exc_info=True)
            return PaymentResponse(
                success=False,
                message="Payment validation failed",
                error_code='VALIDATION_ERROR',
                error_details={'error': str(e)}
            )

    @classmethod
    def _create_payment_record(cls, request: PaymentRequest, user) -> 'Payment':
        """Create the payment record with proper state initialization"""
        from ..models import Payment, PaymentMethod, Invoice
        from core.domains.events.models import Event
        from core.domains.sales.models import EventQuote

        # Get related objects
        event = Event.objects.get(id=request.event_id)

        payment_method = None
        if request.payment_method_id:
            payment_method = PaymentMethod.objects.get(id=request.payment_method_id)

        quote = None
        if request.quote_id:
            quote = EventQuote.objects.get(id=request.quote_id)

        invoice = None
        if request.invoice_id:
            invoice = Invoice.objects.get(id=request.invoice_id)

        # Create payment record
        payment = Payment.objects.create(
            event=event,
            amount=request.amount,
            currency=request.currency,
            status='CREATED',  # Always start in CREATED state
            due_date=request.due_date,
            payment_method=payment_method,
            description=request.description,
            notes=request.notes,
            is_manual=request.is_manual,
            processed_by=user if request.is_manual else None,
            quote=quote,
            invoice=invoice,
        )

        # Add metadata
        if request.metadata:
            payment.notes += f" | Metadata: {request.metadata}"
            payment.save(update_fields=['notes'])

        logger.info(f"Created payment record: {payment.payment_number}")
        return payment

    @classmethod
    def _apply_business_rules(cls, payment: 'Payment', request: PaymentRequest, user):
        """Apply business rules based on payment type and context"""
        try:
            # Handle deposit payments
            if request.is_deposit or request.payment_type == 'DEPOSIT':
                cls._handle_deposit_payment(payment, request, user)

            # Handle installment payments
            if request.installment_id:
                cls._handle_installment_payment(payment, request, user)

            # Auto-create payment plan if requested
            if request.create_payment_plan:
                cls._create_payment_plan(payment, request, user)

            # Link to invoice if this is an invoice payment
            if request.invoice_id:
                cls._handle_invoice_payment(payment, request, user)

        except Exception as e:
            logger.error(f"Failed to apply business rules: {e}", exc_info=True)
            raise

    @classmethod
    def _handle_deposit_payment(cls, payment: 'Payment', request: PaymentRequest, user):
        """Handle deposit payment specific logic"""
        # Mark as deposit in description if not already mentioned
        if 'deposit' not in payment.description.lower():
            payment.description = f"Deposit payment - {payment.description}".strip(' -')
            payment.save(update_fields=['description'])

        logger.info(f"Applied deposit payment rules to {payment.payment_number}")

    @classmethod
    def _handle_installment_payment(cls, payment: 'Payment', request: PaymentRequest, user):
        """Handle installment payment specific logic"""
        from ..models import PaymentInstallment

        try:
            installment = PaymentInstallment.objects.get(id=request.installment_id)

            # Link payment to installment
            payment.installment = installment
            payment.description = f"Payment for {installment.description}"
            payment.save(update_fields=['installment', 'description'])

            logger.info(f"Linked payment {payment.payment_number} to installment {installment.id}")

        except PaymentInstallment.DoesNotExist:
            logger.error(f"Installment {request.installment_id} not found")
            raise ValidationError(f"Installment {request.installment_id} not found")

    @classmethod
    def _handle_invoice_payment(cls, payment: 'Payment', request: PaymentRequest, user):
        """Handle invoice payment specific logic"""
        from ..models import Invoice

        try:
            invoice = Invoice.objects.get(id=request.invoice_id)

            # Ensure payment amount matches invoice (or is a deposit/partial payment)
            if payment.amount != invoice.total_amount:
                if payment.amount < invoice.total_amount:
                    logger.info(
                        f"Partial/deposit payment {payment.amount} for invoice total {invoice.total_amount} "
                        f"(payment type: {request.payment_type})"
                    )
                else:
                    logger.warning(
                        f"Payment amount {payment.amount} exceeds invoice total {invoice.total_amount}"
                    )

            logger.info(f"Linked payment {payment.payment_number} to invoice {invoice.invoice_id}")

        except Invoice.DoesNotExist:
            logger.error(f"Invoice {request.invoice_id} not found")
            raise ValidationError(f"Invoice {request.invoice_id} not found")

    @classmethod
    def _create_payment_plan(cls, payment: 'Payment', request: PaymentRequest, user):
        """Create payment plan for the event"""
        try:
            # This will be implemented when we extract payment plans
            # For now, just log the intention
            logger.info(f"Payment plan creation requested for payment {payment.payment_number}")

        except Exception as e:
            logger.error(f"Failed to create payment plan: {e}", exc_info=True)
            # Don't fail the payment creation if payment plan creation fails

    @classmethod
    def _process_payment(cls, payment: 'Payment', request: PaymentRequest, user) -> PaymentResponse:
        """Process payment through gateway if auto_process is enabled"""
        try:
            if request.is_manual:
                # Manual payment - transition through proper states
                payment.transition_to_state(
                    'PENDING',
                    'Manual payment ready for processing',
                    user.email if user else 'system'
                )

                payment.transition_to_state(
                    'COMPLETED',
                    'Manual payment processed',
                    user.email if user else 'system'
                )

                return PaymentResponse(success=True, message="Manual payment processed")

            else:
                # Process through gateway
                return cls._process_through_gateway(payment, request.gateway_code, {
                    'payment_method_id': request.payment_method_id,
                    'save_payment_method': request.save_payment_method,
                    'metadata': request.metadata
                }, user)

        except Exception as e:
            logger.error(f"Payment processing failed: {e}", exc_info=True)
            return PaymentResponse(
                success=False,
                message="Payment processing failed",
                error_code='PROCESSING_FAILED',
                error_details={'error': str(e)}
            )

    @classmethod
    def _process_through_gateway(cls, payment: 'Payment', gateway_code: str,
                               gateway_data: Dict, user) -> PaymentResponse:
        """Process payment through specified gateway"""
        try:
            from .gateway_service import PaymentGatewayService

            # Transition to PROCESSING state
            payment.transition_to_state(
                'PROCESSING',
                f'Processing through {gateway_code}',
                f'{gateway_code}_gateway'
            )

            # Process through gateway service
            transaction_result = PaymentGatewayService.process_payment(
                payment.id, gateway_data, user
            )

            # Handle gateway response
            if transaction_result.status == 'COMPLETED':
                return PaymentResponse(
                    success=True,
                    payment_id=payment.id,
                    payment_number=payment.payment_number,
                    payment_status='COMPLETED',
                    message="Payment processed successfully",
                    gateway_data={'transaction_id': transaction_result.transaction_id}
                )

            elif transaction_result.status == 'PENDING':
                return PaymentResponse(
                    success=True,
                    payment_id=payment.id,
                    payment_number=payment.payment_number,
                    payment_status='PROCESSING',
                    requires_action=True,
                    message="Payment requires additional action",
                    gateway_data=transaction_result.response_data
                )

            else:
                return PaymentResponse(
                    success=False,
                    payment_id=payment.id,
                    payment_number=payment.payment_number,
                    payment_status='FAILED',
                    message=transaction_result.error_message or "Payment processing failed",
                    error_code='GATEWAY_FAILED',
                    error_details=transaction_result.response_data
                )

        except Exception as e:
            logger.error(f"Gateway processing failed: {e}", exc_info=True)

            # Transition payment to FAILED state
            try:
                payment.transition_to_state(
                    'FAILED',
                    f'Gateway processing failed: {str(e)}',
                    f'{gateway_code}_error'
                )
            except:
                pass  # Don't fail if state transition fails

            return PaymentResponse(
                success=False,
                message="Gateway processing failed",
                error_code='GATEWAY_ERROR',
                error_details={'error': str(e)}
            )