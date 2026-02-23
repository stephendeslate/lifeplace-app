"""
Unit tests for RefundService.

Tests:
- create_refund (validation, creation, timeline recording)
- process_gateway_refund
- Stripe refund integration
- Exception handling
"""

from decimal import Decimal
from unittest.mock import patch

import pytest

from core.domains.events.models import EventTimeline
from core.domains.payments.exceptions import (
    InvalidPaymentAmountException,
    InvalidRefundStatusException,
    PaymentNotFoundException,
    RefundExceedsPaymentException,
)
from core.domains.payments.models import Refund
from core.domains.payments.services.refund_service import RefundService

# =============================================================================
# create_refund Tests
# =============================================================================


@pytest.mark.django_db
class TestCreateRefund:
    """Tests for the create_refund method."""

    def test_create_refund_success(self, completed_payment, admin_user):
        """Test successful refund creation."""
        refund_data = {"amount": str(completed_payment.amount / 2), "reason": "Customer request"}

        refund = RefundService.create_refund(payment_id=completed_payment.id, refund_data=refund_data, user=admin_user)

        assert refund is not None
        assert refund.payment == completed_payment
        assert refund.amount == Decimal(refund_data["amount"])
        assert refund.reason == "Customer request"
        assert refund.status == "COMPLETED"
        assert refund.refunded_by == admin_user
        assert refund.refund_transaction_id is not None

    def test_create_refund_records_timeline(self, completed_payment, admin_user):
        """Test that refund creation records event in timeline."""
        refund_data = {"amount": "100.00", "reason": "Test refund"}

        RefundService.create_refund(payment_id=completed_payment.id, refund_data=refund_data, user=admin_user)

        # Check timeline was created
        timeline_entry = EventTimeline.objects.filter(
            event=completed_payment.event, action_type="SYSTEM_UPDATE"
        ).first()

        assert timeline_entry is not None
        assert "refund" in timeline_entry.description.lower()
        assert timeline_entry.actor == admin_user

    def test_create_refund_payment_not_found(self, admin_user):
        """Test refund creation with invalid payment ID."""
        with pytest.raises(PaymentNotFoundException):
            RefundService.create_refund(payment_id=999999, refund_data={"amount": "100.00"}, user=admin_user)

    def test_create_refund_non_completed_payment(self, payment_factory, admin_user):
        """Test refund creation fails for non-completed payment."""
        pending_payment = payment_factory(status="PENDING")

        with pytest.raises(InvalidRefundStatusException) as exc_info:
            RefundService.create_refund(
                payment_id=pending_payment.id, refund_data={"amount": "100.00"}, user=admin_user
            )

        assert "completed" in str(exc_info.value).lower()

    def test_create_refund_zero_amount(self, completed_payment, admin_user):
        """Test refund creation fails for zero amount."""
        with pytest.raises(InvalidPaymentAmountException):
            RefundService.create_refund(payment_id=completed_payment.id, refund_data={"amount": "0"}, user=admin_user)

    def test_create_refund_negative_amount(self, completed_payment, admin_user):
        """Test refund creation fails for negative amount."""
        with pytest.raises(InvalidPaymentAmountException):
            RefundService.create_refund(
                payment_id=completed_payment.id, refund_data={"amount": "-50.00"}, user=admin_user
            )

    def test_create_refund_exceeds_payment(self, completed_payment, admin_user):
        """Test refund creation fails when amount exceeds payment."""
        excess_amount = str(completed_payment.amount + Decimal("100.00"))

        with pytest.raises(RefundExceedsPaymentException):
            RefundService.create_refund(
                payment_id=completed_payment.id, refund_data={"amount": excess_amount}, user=admin_user
            )

    def test_create_partial_refunds_track_total(self, completed_payment, admin_user):
        """Test that partial refunds are tracked against total."""
        # First refund - half the amount
        first_amount = str(completed_payment.amount / 2)
        RefundService.create_refund(
            payment_id=completed_payment.id, refund_data={"amount": first_amount}, user=admin_user
        )

        # Second refund - try to exceed remaining
        excess_amount = str(completed_payment.amount)  # Full amount, but half already refunded

        with pytest.raises(RefundExceedsPaymentException):
            RefundService.create_refund(
                payment_id=completed_payment.id, refund_data={"amount": excess_amount}, user=admin_user
            )

    def test_create_refund_default_reason(self, completed_payment, admin_user):
        """Test refund creation with empty reason defaults to empty string."""
        refund = RefundService.create_refund(
            payment_id=completed_payment.id, refund_data={"amount": "50.00"}, user=admin_user
        )

        assert refund.reason == ""


# =============================================================================
# process_gateway_refund Tests
# =============================================================================


@pytest.mark.django_db
class TestProcessGatewayRefund:
    """Tests for the process_gateway_refund method."""

    @pytest.fixture
    def pending_refund(self, completed_payment, admin_user):
        """Create a pending refund for testing."""
        return Refund.objects.create(
            payment=completed_payment,
            amount=Decimal("50.00"),
            reason="Test refund",
            status="PENDING",
            refunded_by=admin_user,
        )

    def test_process_refund_not_found(self):
        """Test processing non-existent refund."""
        with pytest.raises(ValueError) as exc_info:
            RefundService.process_gateway_refund(999999, "stripe")

        assert "not found" in str(exc_info.value).lower()

    def test_process_already_completed_refund(self, pending_refund):
        """Test processing already completed refund fails."""
        pending_refund.status = "COMPLETED"
        pending_refund.save()

        with pytest.raises(InvalidRefundStatusException):
            RefundService.process_gateway_refund(pending_refund.id, "stripe")

    def test_process_unsupported_gateway(self, pending_refund):
        """Test processing with unsupported gateway."""
        with pytest.raises(ValueError) as exc_info:
            RefundService.process_gateway_refund(pending_refund.id, "unsupported_gateway")

        assert "unsupported" in str(exc_info.value).lower()

    def test_process_paypal_refund_not_implemented(self, pending_refund):
        """Test PayPal refund returns not implemented error."""
        with pytest.raises(ValueError) as exc_info:
            RefundService.process_gateway_refund(pending_refund.id, "paypal")

        assert "not yet implemented" in str(exc_info.value).lower()


# =============================================================================
# Stripe Refund Integration Tests
# =============================================================================


@pytest.mark.django_db
class TestStripeRefundIntegration:
    """Tests for Stripe refund processing."""

    @pytest.fixture
    def payment_with_stripe_transaction(self, completed_payment, stripe_gateway):
        """Create a payment with a completed Stripe transaction."""
        from core.domains.payments.models import PaymentTransaction

        PaymentTransaction.objects.create(
            payment=completed_payment,
            gateway=stripe_gateway,
            transaction_id="pi_test123456",
            amount=completed_payment.amount,
            currency=completed_payment.currency,
            status="COMPLETED",
        )

        return completed_payment

    @pytest.fixture
    def pending_stripe_refund(self, payment_with_stripe_transaction, admin_user):
        """Create a pending refund for Stripe payment."""
        return Refund.objects.create(
            payment=payment_with_stripe_transaction,
            amount=Decimal("50.00"),
            reason="Test Stripe refund",
            status="PENDING",
            refunded_by=admin_user,
        )

    @patch("stripe.Refund.create")
    def test_stripe_refund_success(self, mock_stripe_create, pending_stripe_refund, stripe_gateway):
        """Test successful Stripe refund."""

        # Use a dict subclass with attribute access so it can be stored in JSONField
        class MockStripeRefund(dict):
            def __getattr__(self, name):
                try:
                    return self[name]
                except KeyError:
                    raise AttributeError(name)

        mock_stripe_create.return_value = MockStripeRefund(id="re_test123", status="succeeded")

        result = RefundService.process_gateway_refund(pending_stripe_refund.id, "stripe")

        assert result.status == "COMPLETED"
        assert result.refund_transaction_id == "re_test123"

        # Verify Stripe was called correctly
        mock_stripe_create.assert_called_once()
        call_kwargs = mock_stripe_create.call_args[1]
        assert call_kwargs["payment_intent"] == "pi_test123456"
        assert call_kwargs["amount"] == 5000  # 50.00 in cents

    @patch("stripe.Refund.create")
    def test_stripe_refund_failure(self, mock_stripe_create, pending_stripe_refund, stripe_gateway):
        """Test failed Stripe refund."""
        import stripe

        mock_stripe_create.side_effect = stripe.error.StripeError("Insufficient funds")

        with pytest.raises(ValueError) as exc_info:
            RefundService.process_gateway_refund(pending_stripe_refund.id, "stripe")

        assert "Stripe refund failed" in str(exc_info.value)

        # Verify refund status was updated to FAILED
        pending_stripe_refund.refresh_from_db()
        assert pending_stripe_refund.status == "FAILED"

    def test_stripe_refund_no_transaction(self, completed_payment, admin_user):
        """Test Stripe refund fails when no Stripe transaction exists."""
        refund = Refund.objects.create(
            payment=completed_payment, amount=Decimal("50.00"), status="PENDING", refunded_by=admin_user
        )

        with pytest.raises(ValueError) as exc_info:
            RefundService.process_gateway_refund(refund.id, "stripe")

        assert "no completed stripe transaction" in str(exc_info.value).lower()
