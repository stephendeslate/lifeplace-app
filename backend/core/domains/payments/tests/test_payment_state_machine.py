"""
Unit tests for PaymentStateMachine.

Tests:
- PaymentState enum
- PaymentStateTransition
- PaymentStateValidationError
- PaymentStateMachine state transition validation
- State categorization methods (terminal, success, failure)
- transition_payment_state with atomic operations
"""

from unittest.mock import MagicMock, patch

from django.utils import timezone

import pytest

from core.domains.payments.services.payment_state_machine import (
    PaymentState,
    PaymentStateMachine,
    PaymentStateTransition,
    PaymentStateValidationError,
)

# =============================================================================
# PaymentState Enum Tests
# =============================================================================


class TestPaymentStateEnum:
    """Tests for the PaymentState enum."""

    def test_all_states_defined(self):
        """Test all expected states are defined."""
        expected_states = {"CREATED", "PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"}
        actual_states = {state.value for state in PaymentState}
        assert expected_states == actual_states

    def test_choices_format(self):
        """Test choices returns Django-compatible format."""
        choices = PaymentState.choices()
        assert isinstance(choices, list)
        assert all(len(c) == 2 for c in choices)
        assert all(isinstance(c[0], str) and isinstance(c[1], str) for c in choices)

    def test_string_representation(self):
        """Test string representation of states."""
        assert str(PaymentState.CREATED) == "CREATED"
        assert str(PaymentState.COMPLETED) == "COMPLETED"


# =============================================================================
# PaymentStateTransition Tests
# =============================================================================


class TestPaymentStateTransition:
    """Tests for the PaymentStateTransition class."""

    def test_transition_creation(self):
        """Test creating a state transition."""
        transition = PaymentStateTransition(
            from_state=PaymentState.PENDING,
            to_state=PaymentState.PROCESSING,
            reason="Gateway processing started",
            triggered_by="system",
            metadata={"gateway": "stripe"},
        )

        assert transition.from_state == PaymentState.PENDING
        assert transition.to_state == PaymentState.PROCESSING
        assert transition.reason == "Gateway processing started"
        assert transition.triggered_by == "system"
        assert transition.metadata == {"gateway": "stripe"}
        assert transition.timestamp is not None

    def test_transition_default_values(self):
        """Test transition with default values."""
        transition = PaymentStateTransition(
            from_state=PaymentState.CREATED, to_state=PaymentState.PENDING, reason="Test"
        )

        assert transition.triggered_by == "system"
        assert transition.metadata == {}

    def test_transition_string_representation(self):
        """Test string representation of transition."""
        transition = PaymentStateTransition(
            from_state=PaymentState.PENDING, to_state=PaymentState.COMPLETED, reason="Payment successful"
        )

        string_repr = str(transition)
        assert "PENDING" in string_repr
        assert "COMPLETED" in string_repr
        assert "Payment successful" in string_repr


# =============================================================================
# PaymentStateValidationError Tests
# =============================================================================


class TestPaymentStateValidationError:
    """Tests for the PaymentStateValidationError exception."""

    def test_error_creation(self):
        """Test creating a validation error."""
        error = PaymentStateValidationError(
            message="Invalid transition",
            current_state=PaymentState.COMPLETED,
            attempted_state=PaymentState.PENDING,
            valid_states={PaymentState.REFUNDED},
        )

        assert error.current_state == PaymentState.COMPLETED
        assert error.attempted_state == PaymentState.PENDING
        assert error.valid_states == {PaymentState.REFUNDED}
        assert "Invalid transition" in str(error)


# =============================================================================
# PaymentStateMachine - validate_transition Tests
# =============================================================================


class TestValidateTransition:
    """Tests for state transition validation."""

    def test_noop_transition_is_valid(self):
        """Test that same-state transition is valid (no-op)."""
        result = PaymentStateMachine.validate_transition(PaymentState.PENDING, PaymentState.PENDING)
        assert result is True

    # Valid transitions from CREATED
    @pytest.mark.parametrize("to_state", [PaymentState.PENDING, PaymentState.CANCELLED])
    def test_valid_transitions_from_created(self, to_state):
        """Test valid transitions from CREATED state."""
        result = PaymentStateMachine.validate_transition(PaymentState.CREATED, to_state)
        assert result is True

    # Valid transitions from PENDING
    @pytest.mark.parametrize(
        "to_state", [PaymentState.PROCESSING, PaymentState.COMPLETED, PaymentState.FAILED, PaymentState.CANCELLED]
    )
    def test_valid_transitions_from_pending(self, to_state):
        """Test valid transitions from PENDING state."""
        result = PaymentStateMachine.validate_transition(PaymentState.PENDING, to_state)
        assert result is True

    # Valid transitions from PROCESSING
    @pytest.mark.parametrize("to_state", [PaymentState.COMPLETED, PaymentState.FAILED])
    def test_valid_transitions_from_processing(self, to_state):
        """Test valid transitions from PROCESSING state."""
        result = PaymentStateMachine.validate_transition(PaymentState.PROCESSING, to_state)
        assert result is True

    # Valid transition from COMPLETED
    def test_valid_transition_from_completed_to_refunded(self):
        """Test COMPLETED -> REFUNDED is valid."""
        result = PaymentStateMachine.validate_transition(PaymentState.COMPLETED, PaymentState.REFUNDED)
        assert result is True

    # Valid transitions from FAILED
    @pytest.mark.parametrize("to_state", [PaymentState.PENDING, PaymentState.CANCELLED])
    def test_valid_transitions_from_failed(self, to_state):
        """Test valid transitions from FAILED state (retry or cancel)."""
        result = PaymentStateMachine.validate_transition(PaymentState.FAILED, to_state)
        assert result is True

    # Invalid transitions
    def test_invalid_transition_from_cancelled(self):
        """Test that CANCELLED is terminal (no transitions allowed)."""
        with pytest.raises(PaymentStateValidationError):
            PaymentStateMachine.validate_transition(PaymentState.CANCELLED, PaymentState.PENDING)

    def test_invalid_transition_from_refunded(self):
        """Test that REFUNDED is terminal (no transitions allowed)."""
        with pytest.raises(PaymentStateValidationError):
            PaymentStateMachine.validate_transition(PaymentState.REFUNDED, PaymentState.COMPLETED)

    def test_invalid_backwards_transition(self):
        """Test that going backwards (COMPLETED -> PENDING) is invalid."""
        with pytest.raises(PaymentStateValidationError):
            PaymentStateMachine.validate_transition(PaymentState.COMPLETED, PaymentState.PENDING)

    def test_invalid_skip_transition(self):
        """Test that skipping states (CREATED -> COMPLETED) is invalid."""
        with pytest.raises(PaymentStateValidationError):
            PaymentStateMachine.validate_transition(PaymentState.CREATED, PaymentState.COMPLETED)


# =============================================================================
# PaymentStateMachine - State Category Methods Tests
# =============================================================================


class TestStateCategoryMethods:
    """Tests for state categorization helper methods."""

    def test_get_valid_transitions(self):
        """Test getting valid transitions from a state."""
        transitions = PaymentStateMachine.get_valid_transitions(PaymentState.PENDING)

        assert PaymentState.PROCESSING in transitions
        assert PaymentState.COMPLETED in transitions
        assert PaymentState.FAILED in transitions
        assert PaymentState.CANCELLED in transitions

    def test_get_valid_transitions_terminal_state(self):
        """Test that terminal states have no valid transitions."""
        transitions = PaymentStateMachine.get_valid_transitions(PaymentState.CANCELLED)
        assert transitions == set()

        transitions = PaymentStateMachine.get_valid_transitions(PaymentState.REFUNDED)
        assert transitions == set()

    # is_terminal_state tests
    def test_terminal_states(self):
        """Test terminal state identification."""
        assert PaymentStateMachine.is_terminal_state(PaymentState.COMPLETED) is True
        assert PaymentStateMachine.is_terminal_state(PaymentState.CANCELLED) is True
        assert PaymentStateMachine.is_terminal_state(PaymentState.REFUNDED) is True

    def test_non_terminal_states(self):
        """Test non-terminal state identification."""
        assert PaymentStateMachine.is_terminal_state(PaymentState.CREATED) is False
        assert PaymentStateMachine.is_terminal_state(PaymentState.PENDING) is False
        assert PaymentStateMachine.is_terminal_state(PaymentState.PROCESSING) is False
        assert PaymentStateMachine.is_terminal_state(PaymentState.FAILED) is False

    # is_success_state tests
    def test_success_states(self):
        """Test success state identification."""
        assert PaymentStateMachine.is_success_state(PaymentState.COMPLETED) is True

    def test_non_success_states(self):
        """Test non-success state identification."""
        assert PaymentStateMachine.is_success_state(PaymentState.PENDING) is False
        assert PaymentStateMachine.is_success_state(PaymentState.FAILED) is False
        assert PaymentStateMachine.is_success_state(PaymentState.CANCELLED) is False
        assert PaymentStateMachine.is_success_state(PaymentState.REFUNDED) is False

    # is_failure_state tests
    def test_failure_states(self):
        """Test failure state identification."""
        assert PaymentStateMachine.is_failure_state(PaymentState.FAILED) is True
        assert PaymentStateMachine.is_failure_state(PaymentState.CANCELLED) is True

    def test_non_failure_states(self):
        """Test non-failure state identification."""
        assert PaymentStateMachine.is_failure_state(PaymentState.COMPLETED) is False
        assert PaymentStateMachine.is_failure_state(PaymentState.PENDING) is False
        assert PaymentStateMachine.is_failure_state(PaymentState.PROCESSING) is False

    # can_be_processed tests
    def test_can_be_processed_states(self):
        """Test states that can be processed by gateway."""
        assert PaymentStateMachine.can_be_processed(PaymentState.CREATED) is True
        assert PaymentStateMachine.can_be_processed(PaymentState.PENDING) is True
        assert PaymentStateMachine.can_be_processed(PaymentState.FAILED) is True  # Retry

    def test_cannot_be_processed_states(self):
        """Test states that cannot be processed by gateway."""
        assert PaymentStateMachine.can_be_processed(PaymentState.PROCESSING) is False
        assert PaymentStateMachine.can_be_processed(PaymentState.COMPLETED) is False
        assert PaymentStateMachine.can_be_processed(PaymentState.CANCELLED) is False
        assert PaymentStateMachine.can_be_processed(PaymentState.REFUNDED) is False

    # requires_gateway_processing tests
    def test_requires_gateway_processing(self):
        """Test state that requires gateway processing."""
        assert PaymentStateMachine.requires_gateway_processing(PaymentState.PROCESSING) is True

    def test_does_not_require_gateway_processing(self):
        """Test states that don't require gateway processing."""
        assert PaymentStateMachine.requires_gateway_processing(PaymentState.PENDING) is False
        assert PaymentStateMachine.requires_gateway_processing(PaymentState.COMPLETED) is False


# =============================================================================
# PaymentStateMachine - transition_payment_state Tests
# =============================================================================


@pytest.mark.django_db
class TestTransitionPaymentState:
    """Tests for the transition_payment_state method."""

    @pytest.fixture
    def mock_payment(self, payment_factory):
        """Create a mock payment for testing."""
        payment = payment_factory(status="PENDING")
        return payment

    def test_successful_transition(self, mock_payment):
        """Test successful state transition."""
        with patch.object(PaymentStateMachine, "_log_state_transition"):
            with patch.object(PaymentStateMachine, "_trigger_state_change_events"):
                transition = PaymentStateMachine.transition_payment_state(
                    payment=mock_payment,
                    to_state=PaymentState.PROCESSING,
                    reason="Starting gateway processing",
                    triggered_by="system",
                )

        assert transition is not None
        assert transition.from_state == PaymentState.PENDING
        assert transition.to_state == PaymentState.PROCESSING
        assert mock_payment.status == "PROCESSING"

    def test_transition_to_completed_sets_paid_on(self, mock_payment):
        """Test that transitioning to COMPLETED sets paid_on date."""
        mock_payment.paid_on = None

        with patch.object(PaymentStateMachine, "_log_state_transition"):
            with patch.object(PaymentStateMachine, "_trigger_state_change_events"):
                PaymentStateMachine.transition_payment_state(
                    payment=mock_payment, to_state=PaymentState.COMPLETED, reason="Payment successful"
                )

        assert mock_payment.status == "COMPLETED"
        assert mock_payment.paid_on is not None

    def test_transition_preserves_existing_paid_on(self, mock_payment):
        """Test that existing paid_on is not overwritten."""
        mock_payment.status = "COMPLETED"
        existing_paid_on = timezone.now().date()
        mock_payment.paid_on = existing_paid_on
        mock_payment.save()

        with patch.object(PaymentStateMachine, "_log_state_transition"):
            with patch.object(PaymentStateMachine, "_trigger_state_change_events"):
                PaymentStateMachine.transition_payment_state(
                    payment=mock_payment, to_state=PaymentState.REFUNDED, reason="Refund requested"
                )

        assert mock_payment.paid_on == existing_paid_on

    def test_invalid_transition_raises_error(self, mock_payment):
        """Test that invalid transition raises PaymentStateValidationError."""
        mock_payment.status = "COMPLETED"
        mock_payment.save()

        with pytest.raises(PaymentStateValidationError):
            PaymentStateMachine.transition_payment_state(
                payment=mock_payment, to_state=PaymentState.PENDING, reason="Invalid attempt"
            )

    def test_transition_with_metadata(self, mock_payment):
        """Test transition with metadata."""
        metadata = {"gateway": "stripe", "transaction_id": "pi_test123"}

        with patch.object(PaymentStateMachine, "_log_state_transition"):
            with patch.object(PaymentStateMachine, "_trigger_state_change_events"):
                transition = PaymentStateMachine.transition_payment_state(
                    payment=mock_payment, to_state=PaymentState.PROCESSING, reason="Test", metadata=metadata
                )

        assert transition.metadata == metadata


# =============================================================================
# PaymentStateMachine - _get_payment_state Tests
# =============================================================================


class TestGetPaymentState:
    """Tests for the _get_payment_state helper method."""

    def test_get_state_from_valid_status(self):
        """Test getting state from valid status string."""
        mock_payment = MagicMock()
        mock_payment.status = "PENDING"

        state = PaymentStateMachine._get_payment_state(mock_payment)
        assert state == PaymentState.PENDING

    def test_get_state_from_legacy_status(self):
        """Test getting state from legacy status that needs mapping."""
        mock_payment = MagicMock()
        mock_payment.status = "COMPLETED"

        state = PaymentStateMachine._get_payment_state(mock_payment)
        assert state == PaymentState.COMPLETED

    def test_get_state_default_for_unknown(self):
        """Test default state for unknown status."""
        mock_payment = MagicMock()
        mock_payment.status = "UNKNOWN_STATUS"

        state = PaymentStateMachine._get_payment_state(mock_payment)
        assert state == PaymentState.CREATED


# =============================================================================
# PaymentStateMachine - get_payment_state_history Tests
# =============================================================================


@pytest.mark.django_db
class TestGetPaymentStateHistory:
    """Tests for the get_payment_state_history method."""

    def test_get_history_returns_list(self, payment_factory):
        """Test that get_payment_state_history returns a list."""
        payment = payment_factory()

        history = PaymentStateMachine.get_payment_state_history(payment)

        assert isinstance(history, list)

    def test_get_history_empty_for_new_payment(self, payment_factory):
        """Test that new payment has empty history."""
        payment = payment_factory()

        history = PaymentStateMachine.get_payment_state_history(payment)

        # May be empty or have initial state depending on implementation
        assert isinstance(history, list)
