# backend/core/domains/payments/services/payment_state_machine.py

import logging
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class PaymentState(Enum):
    """
    Payment state enumeration with clear progression.

    Designed to replace the current PENDING/COMPLETED/FAILED chaos
    with a proper state machine that tracks payment lifecycle.
    """
    CREATED = 'CREATED'          # Payment record created, not yet processed
    PENDING = 'PENDING'          # Awaiting processing or user action
    PROCESSING = 'PROCESSING'    # Currently being processed by gateway
    COMPLETED = 'COMPLETED'      # Successfully completed
    FAILED = 'FAILED'           # Processing failed, can be retried
    CANCELLED = 'CANCELLED'      # Cancelled by user or system
    REFUNDED = 'REFUNDED'       # Completed payment that was refunded

    @classmethod
    def choices(cls):
        """Django choices format"""
        return [(state.value, state.value.title()) for state in cls]

    def __str__(self):
        return self.value


class PaymentStateTransition:
    """
    Represents a state transition with metadata.
    Used for logging and rollback capability.
    """
    def __init__(self, from_state: PaymentState, to_state: PaymentState,
                 reason: str, triggered_by: str = 'system', metadata: Optional[Dict] = None):
        self.from_state = from_state
        self.to_state = to_state
        self.reason = reason
        self.triggered_by = triggered_by
        self.metadata = metadata or {}
        self.timestamp = timezone.now()

    def __str__(self):
        return f"{self.from_state.value} → {self.to_state.value}: {self.reason}"


class PaymentStateValidationError(Exception):
    """Raised when an invalid state transition is attempted"""
    def __init__(self, message: str, current_state: PaymentState,
                 attempted_state: PaymentState, valid_states: Set[PaymentState]):
        self.current_state = current_state
        self.attempted_state = attempted_state
        self.valid_states = valid_states
        super().__init__(message)


class PaymentStateMachine:
    """
    Atomic payment state management service.

    This service replaces the scattered manual status updates throughout
    the codebase with a centralized, validated state management system.

    Key Features:
    - Atomic state transitions with rollback capability
    - Comprehensive state history logging
    - Business rule validation before state changes
    - Domain event publishing for side effects
    """

    # Define valid state transitions
    # This matrix prevents invalid state changes and ensures business rules
    STATE_TRANSITIONS: Dict[PaymentState, Set[PaymentState]] = {
        PaymentState.CREATED: {
            PaymentState.PENDING,      # Ready for processing
            PaymentState.CANCELLED,    # Cancelled before processing
        },
        PaymentState.PENDING: {
            PaymentState.PROCESSING,   # Gateway processing started
            PaymentState.COMPLETED,    # Direct completion (manual payments)
            PaymentState.FAILED,       # Validation failure before processing
            PaymentState.CANCELLED,    # User cancellation
        },
        PaymentState.PROCESSING: {
            PaymentState.COMPLETED,    # Successful gateway processing
            PaymentState.FAILED,       # Gateway processing failed
        },
        PaymentState.COMPLETED: {
            PaymentState.REFUNDED,     # Only completed payments can be refunded
        },
        PaymentState.FAILED: {
            PaymentState.PENDING,      # Allow retry
            PaymentState.CANCELLED,    # Give up on failed payment
        },
        PaymentState.CANCELLED: set(),  # Terminal state
        PaymentState.REFUNDED: set(),   # Terminal state
    }

    # States that are considered "final" - no further processing expected
    TERMINAL_STATES = {PaymentState.COMPLETED, PaymentState.CANCELLED, PaymentState.REFUNDED}

    # States that represent successful completion
    SUCCESS_STATES = {PaymentState.COMPLETED}

    # States that represent failure
    FAILURE_STATES = {PaymentState.FAILED, PaymentState.CANCELLED}

    @classmethod
    def validate_transition(cls, from_state: PaymentState, to_state: PaymentState) -> bool:
        """
        Validate if a state transition is allowed.

        Args:
            from_state: Current state
            to_state: Desired state

        Returns:
            bool: True if transition is valid

        Raises:
            PaymentStateValidationError: If transition is invalid
        """
        if from_state == to_state:
            return True  # No-op transition is always valid

        valid_states = cls.STATE_TRANSITIONS.get(from_state, set())

        if to_state not in valid_states:
            raise PaymentStateValidationError(
                f"Invalid transition from {from_state.value} to {to_state.value}. "
                f"Valid transitions from {from_state.value}: {[s.value for s in valid_states]}",
                current_state=from_state,
                attempted_state=to_state,
                valid_states=valid_states
            )

        return True

    @classmethod
    def get_valid_transitions(cls, from_state: PaymentState) -> Set[PaymentState]:
        """Get all valid state transitions from the given state"""
        return cls.STATE_TRANSITIONS.get(from_state, set())

    @classmethod
    def is_terminal_state(cls, state: PaymentState) -> bool:
        """Check if state is terminal (no further transitions possible)"""
        return state in cls.TERMINAL_STATES

    @classmethod
    def is_success_state(cls, state: PaymentState) -> bool:
        """Check if state represents successful completion"""
        return state in cls.SUCCESS_STATES

    @classmethod
    def is_failure_state(cls, state: PaymentState) -> bool:
        """Check if state represents failure"""
        return state in cls.FAILURE_STATES

    @classmethod
    def can_be_processed(cls, state: PaymentState) -> bool:
        """Check if payment in this state can be processed by gateway"""
        return state in {PaymentState.CREATED, PaymentState.PENDING, PaymentState.FAILED}

    @classmethod
    def requires_gateway_processing(cls, state: PaymentState) -> bool:
        """Check if state indicates gateway processing is needed"""
        return state == PaymentState.PROCESSING

    @classmethod
    def transition_payment_state(cls, payment, to_state: PaymentState,
                                reason: str, triggered_by: str = 'system',
                                metadata: Optional[Dict] = None) -> PaymentStateTransition:
        """
        Atomically transition a payment to a new state.

        This is the main entry point for all payment state changes.
        It ensures atomic transitions with proper validation and logging.

        Args:
            payment: Payment model instance
            to_state: Target state
            reason: Human-readable reason for transition
            triggered_by: Who/what triggered the transition
            metadata: Additional context data

        Returns:
            PaymentStateTransition: The completed transition

        Raises:
            PaymentStateValidationError: If transition is invalid
        """
        # Convert current status to PaymentState enum
        current_state = cls._get_payment_state(payment)

        # Validate transition
        cls.validate_transition(current_state, to_state)

        # Create transition record
        transition = PaymentStateTransition(
            from_state=current_state,
            to_state=to_state,
            reason=reason,
            triggered_by=triggered_by,
            metadata=metadata
        )

        try:
            with transaction.atomic():
                # Update payment state
                old_status = payment.status
                payment.status = to_state.value

                # Update state-specific fields
                if to_state == PaymentState.COMPLETED and not payment.paid_on:
                    payment.paid_on = timezone.now().date()

                # Save the payment
                payment.save(update_fields=['status', 'paid_on', 'updated_at'])

                # Log the state transition
                cls._log_state_transition(payment, transition)

                # Trigger side effects asynchronously
                cls._trigger_state_change_events(payment, transition)

                logger.info(
                    f"Payment {payment.payment_number} transitioned: {transition}",
                    extra={
                        'payment_id': payment.id,
                        'payment_number': payment.payment_number,
                        'from_state': current_state.value,
                        'to_state': to_state.value,
                        'reason': reason,
                        'triggered_by': triggered_by
                    }
                )

                return transition

        except Exception as e:
            logger.error(
                f"Failed to transition payment {payment.payment_number} "
                f"from {current_state.value} to {to_state.value}: {e}",
                extra={
                    'payment_id': payment.id,
                    'payment_number': payment.payment_number,
                    'error': str(e)
                },
                exc_info=True
            )
            raise

    @classmethod
    def _get_payment_state(cls, payment) -> PaymentState:
        """Convert Payment.status to PaymentState enum"""
        try:
            return PaymentState(payment.status)
        except ValueError:
            # Handle legacy states that don't match enum
            status_mapping = {
                'PENDING': PaymentState.PENDING,
                'COMPLETED': PaymentState.COMPLETED,
                'FAILED': PaymentState.FAILED,
            }
            return status_mapping.get(payment.status, PaymentState.CREATED)

    @classmethod
    def _log_state_transition(cls, payment, transition: PaymentStateTransition):
        """
        Log state transition for audit trail.

        This creates a permanent record of all state changes for
        debugging, compliance, and rollback capability.
        """
        # Import here to avoid circular imports
        from ..models import PaymentStateHistory

        try:
            PaymentStateHistory.objects.create(
                payment=payment,
                from_state=transition.from_state.value,
                to_state=transition.to_state.value,
                reason=transition.reason,
                triggered_by=transition.triggered_by,
                metadata=transition.metadata,
                timestamp=transition.timestamp
            )
        except Exception as e:
            logger.error(
                f"Failed to log state transition for payment {payment.payment_number}: {e}",
                exc_info=True
            )
            # Don't fail the transition if logging fails

    @classmethod
    def _trigger_state_change_events(cls, payment, transition: PaymentStateTransition):
        """
        Trigger domain events for state changes.

        This decouples side effects (workflow triggers, notifications, etc.)
        from the core payment state logic.
        """
        try:
            # Import here to avoid circular imports
            from .payment_events import PaymentEventPublisher

            # Publish state change event
            PaymentEventPublisher.publish_state_change(payment, transition)

        except ImportError:
            # PaymentEventPublisher not yet implemented
            logger.debug("PaymentEventPublisher not available, skipping event publication")
        except Exception as e:
            logger.error(
                f"Failed to publish state change event for payment {payment.payment_number}: {e}",
                exc_info=True
            )
            # Don't fail the transition if event publishing fails

    @classmethod
    def rollback_payment_state(cls, payment, to_previous_state: bool = True):
        """
        Rollback payment to previous state or specific state.

        This provides recovery mechanism for failed operations.

        Args:
            payment: Payment model instance
            to_previous_state: If True, rollback to immediately previous state
        """
        try:
            # Import here to avoid circular imports
            from ..models import PaymentStateHistory

            if to_previous_state:
                # Get the most recent previous state
                previous_transition = PaymentStateHistory.objects.filter(
                    payment=payment
                ).exclude(
                    to_state=payment.status  # Exclude current state
                ).order_by('-timestamp').first()

                if previous_transition:
                    target_state = PaymentState(previous_transition.from_state)
                    cls.transition_payment_state(
                        payment=payment,
                        to_state=target_state,
                        reason=f"Rollback from failed {payment.status} state",
                        triggered_by='system_rollback'
                    )

                    logger.info(
                        f"Rolled back payment {payment.payment_number} to {target_state.value}"
                    )
                    return target_state
                else:
                    logger.warning(
                        f"No previous state found for payment {payment.payment_number} rollback"
                    )

        except Exception as e:
            logger.error(
                f"Failed to rollback payment {payment.payment_number}: {e}",
                exc_info=True
            )
            raise

    @classmethod
    def get_payment_state_history(cls, payment) -> List[Dict]:
        """
        Get complete state transition history for a payment.

        Useful for debugging, auditing, and analytics.
        """
        try:
            # Import here to avoid circular imports
            from ..models import PaymentStateHistory

            history = PaymentStateHistory.objects.filter(
                payment=payment
            ).order_by('timestamp')

            return [
                {
                    'from_state': h.from_state,
                    'to_state': h.to_state,
                    'reason': h.reason,
                    'triggered_by': h.triggered_by,
                    'timestamp': h.timestamp,
                    'metadata': h.metadata
                }
                for h in history
            ]

        except ImportError:
            # PaymentStateHistory not yet implemented
            return []
        except Exception as e:
            logger.error(
                f"Failed to get state history for payment {payment.payment_number}: {e}",
                exc_info=True
            )
            return []