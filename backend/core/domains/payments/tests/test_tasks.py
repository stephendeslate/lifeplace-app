"""
Unit tests for payments domain Celery tasks.

Tests:
- check_gateway_health
- retry_failed_webhook
- process_failed_webhooks
- detect_orphaned_payments
- reconcile_payments_with_stripe
- Helper functions
"""

from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.utils import timezone

import pytest

from core.domains.payments.tasks import (
    MAX_WEBHOOK_RETRIES,
    WEBHOOK_RETRY_BASE_DELAY,
    WEBHOOK_RETRY_MAX_DELAY,
    _calculate_retry_delay,
    _move_to_dead_letter,
    check_gateway_health,
    detect_orphaned_payments,
    payments_health_check,
    process_failed_webhooks,
    reconcile_payments_with_stripe,
    retry_failed_webhook,
)


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before and after each test."""
    cache.clear()
    yield
    cache.clear()


# =============================================================================
# check_gateway_health Tests
# =============================================================================


@pytest.mark.django_db
class TestCheckGatewayHealth:
    """Tests for the check_gateway_health task."""

    @patch("core.domains.payments.tasks._check_gateway_status")
    def test_check_all_active_gateways(self, mock_check_status, payment_gateway_factory):
        """Test that health check runs for all active gateways."""
        # Create multiple active gateways
        payment_gateway_factory(code="stripe", is_active=True)
        payment_gateway_factory(code="paymongo", is_active=True)

        # Create inactive gateway (should be skipped)
        payment_gateway_factory(code="inactive", is_active=False)

        mock_check_status.return_value = (True, "Connected")

        result = check_gateway_health()

        assert result["status"] == "success"
        assert result["all_healthy"] is True
        assert len(result["gateways"]) == 2

    @patch("core.domains.payments.tasks._check_gateway_status")
    def test_unhealthy_gateway_reported(self, mock_check_status, payment_gateway_factory):
        """Test that unhealthy gateway is properly reported."""
        payment_gateway_factory(code="stripe", is_active=True)

        mock_check_status.return_value = (False, "Connection failed")

        result = check_gateway_health()

        assert result["status"] == "success"
        assert result["all_healthy"] is False
        assert result["gateways"]["stripe"]["is_healthy"] is False
        assert result["gateways"]["stripe"]["message"] == "Connection failed"

    @patch("core.domains.payments.tasks._check_gateway_status")
    def test_health_results_cached(self, mock_check_status, payment_gateway_factory):
        """Test that health results are stored in cache."""
        payment_gateway_factory(code="stripe", is_active=True)
        mock_check_status.return_value = (True, "OK")

        check_gateway_health()

        # Verify individual gateway health cached
        cached_health = cache.get("gateway_health:stripe")
        assert cached_health is not None
        assert cached_health["is_healthy"] is True

        # Verify summary cached
        cached_summary = cache.get("gateway_health_summary")
        assert cached_summary is not None
        assert cached_summary["all_healthy"] is True


# =============================================================================
# _calculate_retry_delay Tests
# =============================================================================


class TestCalculateRetryDelay:
    """Tests for retry delay calculation with exponential backoff."""

    def test_first_retry_uses_base_delay(self):
        """Test that first retry uses approximately base delay."""
        delay = _calculate_retry_delay(1)

        # Should be around base delay with jitter
        min_expected = WEBHOOK_RETRY_BASE_DELAY * (1 - 0.3)  # -30% jitter
        max_expected = WEBHOOK_RETRY_BASE_DELAY * (1 + 0.3)  # +30% jitter

        assert delay >= min_expected * 0.9  # Allow some variance
        assert delay <= max_expected * 1.1

    def test_delay_increases_exponentially(self):
        """Test that delay increases with each retry."""
        delay1 = _calculate_retry_delay(1)
        delay2 = _calculate_retry_delay(2)
        delay3 = _calculate_retry_delay(3)

        # Each delay should roughly double (with some jitter)
        assert delay2 > delay1
        assert delay3 > delay2

    def test_delay_capped_at_max(self):
        """Test that delay is capped at maximum value."""
        # Use very high retry count
        delay = _calculate_retry_delay(20)

        # Should not exceed max delay plus jitter
        max_with_jitter = WEBHOOK_RETRY_MAX_DELAY * (1 + 0.3)
        assert delay <= max_with_jitter * 1.1

    def test_minimum_delay_enforced(self):
        """Test that minimum delay of 10 seconds is enforced."""
        # Even with 0 retry count (edge case)
        delay = _calculate_retry_delay(0)
        assert delay >= 10


# =============================================================================
# detect_orphaned_payments Tests
# =============================================================================


@pytest.mark.django_db
class TestDetectOrphanedPayments:
    """Tests for orphaned payment detection."""

    def test_detect_stale_pending_payments(self, payment_factory, confirmed_event):
        """Test detection of payments stuck in PENDING state."""
        # Create old pending payment
        old_payment = payment_factory(event=confirmed_event, status="PENDING")
        # Manually set created time to 2 hours ago
        from core.domains.payments.models import Payment

        Payment.objects.filter(id=old_payment.id).update(created_at=timezone.now() - timedelta(hours=2))

        result = detect_orphaned_payments()

        assert result["status"] == "success"
        assert len(result["stale_pending"]) >= 1
        assert any(p["payment_id"] == old_payment.id for p in result["stale_pending"])

    def test_detect_stale_processing_payments(self, payment_factory, confirmed_event):
        """Test detection of payments stuck in PROCESSING state."""
        # Create old processing payment
        old_payment = payment_factory(event=confirmed_event, status="PROCESSING")
        from core.domains.payments.models import Payment

        Payment.objects.filter(id=old_payment.id).update(created_at=timezone.now() - timedelta(hours=1))

        result = detect_orphaned_payments()

        assert result["status"] == "success"
        assert len(result["stale_processing"]) >= 1

    def test_recent_payments_not_flagged(self, payment_factory, confirmed_event):
        """Test that recent pending payments are not flagged as orphaned."""
        # Create recent pending payment
        recent_payment = payment_factory(event=confirmed_event, status="PENDING")

        result = detect_orphaned_payments()

        assert not any(p["payment_id"] == recent_payment.id for p in result["stale_pending"])

    def test_results_cached_when_orphans_found(self, payment_factory, confirmed_event):
        """Test that results are cached when orphans are found."""
        # Create orphaned payment
        old_payment = payment_factory(event=confirmed_event, status="PENDING")
        from core.domains.payments.models import Payment

        Payment.objects.filter(id=old_payment.id).update(created_at=timezone.now() - timedelta(hours=2))

        detect_orphaned_payments()

        cached_report = cache.get("orphaned_payments_report")
        assert cached_report is not None
        assert cached_report["total_orphaned"] >= 1


# =============================================================================
# reconcile_payments_with_stripe Tests
# =============================================================================


@pytest.mark.django_db
class TestReconcilePaymentsWithStripe:
    """Tests for Stripe payment reconciliation."""

    def test_skips_when_no_stripe_gateway(self):
        """Test that reconciliation skips when no active Stripe gateway."""
        result = reconcile_payments_with_stripe()

        assert result["status"] == "skipped"
        assert "No active Stripe" in result["reason"]

    @patch("stripe.PaymentIntent.retrieve")
    def test_matches_successful_transactions(self, mock_retrieve, payment_factory, stripe_gateway, confirmed_event):
        """Test that matching transactions are counted."""
        from core.domains.payments.models import PaymentTransaction

        payment = payment_factory(event=confirmed_event, status="COMPLETED")
        PaymentTransaction.objects.create(
            payment=payment,
            gateway=stripe_gateway,
            transaction_id="pi_test123",
            amount=payment.amount,
            currency=payment.currency,
            status="COMPLETED",
        )

        mock_retrieve.return_value = MagicMock(status="succeeded")

        result = reconcile_payments_with_stripe()

        assert result["status"] == "success"
        assert result["checked"] >= 1
        assert result["matched"] >= 1

    @patch("stripe.PaymentIntent.retrieve")
    def test_detects_status_discrepancy(self, mock_retrieve, payment_factory, stripe_gateway, confirmed_event):
        """Test that status discrepancies are detected."""
        from core.domains.payments.models import PaymentTransaction

        payment = payment_factory(event=confirmed_event, status="COMPLETED")
        PaymentTransaction.objects.create(
            payment=payment,
            gateway=stripe_gateway,
            transaction_id="pi_test456",
            amount=payment.amount,
            currency=payment.currency,
            status="COMPLETED",  # Local says completed
        )

        # Stripe says it's still processing
        mock_retrieve.return_value = MagicMock(status="processing")

        result = reconcile_payments_with_stripe()

        assert result["status"] == "success"
        assert len(result["discrepancies"]) >= 1


# =============================================================================
# process_failed_webhooks Tests
# =============================================================================


@pytest.mark.django_db
class TestProcessFailedWebhooks:
    """Tests for processing failed webhooks."""

    def test_queues_failed_webhooks(self, stripe_gateway):
        """Test that failed webhooks are queued for retry."""
        from core.domains.payments.models import PaymentWebhookLog

        # Create failed webhook
        PaymentWebhookLog.objects.create(
            gateway_code="stripe",
            event_type="payment_intent.succeeded",
            event_id="evt_test123",
            processed_successfully=False,
            retry_count=0,
            raw_data={"test": "data"},
        )

        with patch.object(retry_failed_webhook, "apply_async") as mock_apply:
            result = process_failed_webhooks()

        assert result["status"] == "success"
        assert result["queued_count"] >= 1
        mock_apply.assert_called()

    def test_skips_max_retried_webhooks(self, stripe_gateway):
        """Test that webhooks at max retries are not queued."""
        from core.domains.payments.models import PaymentWebhookLog

        # Create webhook at max retries
        PaymentWebhookLog.objects.create(
            gateway_code="stripe",
            event_type="payment_intent.succeeded",
            event_id="evt_maxretries",
            processed_successfully=False,
            retry_count=MAX_WEBHOOK_RETRIES,
            raw_data={"test": "data"},
        )

        with patch.object(retry_failed_webhook, "apply_async"):
            result = process_failed_webhooks()

        # Should not queue the max-retried webhook
        assert result["queued_count"] == 0


# =============================================================================
# _move_to_dead_letter Tests
# =============================================================================


@pytest.mark.django_db
class TestMoveToDeadLetter:
    """Tests for moving webhooks to dead letter queue."""

    def test_creates_dead_letter_record(self, stripe_gateway):
        """Test that dead letter record is created."""
        from core.domains.payments.models import PaymentWebhookLog, WebhookDeadLetter

        webhook = PaymentWebhookLog.objects.create(
            gateway_code="stripe",
            event_type="payment_intent.failed",
            event_id="evt_deadletter",
            processed_successfully=False,
            retry_count=5,
            raw_data={"error": "test"},
        )

        _move_to_dead_letter(webhook, error="Max retries exceeded")

        # Verify dead letter record exists
        dead_letter = WebhookDeadLetter.objects.filter(event_id="evt_deadletter").first()

        assert dead_letter is not None
        assert dead_letter.gateway_code == "stripe"
        assert dead_letter.retry_count == 5
        assert "Max retries" in dead_letter.final_error


# =============================================================================
# payments_health_check Tests
# =============================================================================


class TestPaymentsHealthCheck:
    """Tests for payments system health check."""

    def test_returns_healthy_status(self):
        """Test that health check returns healthy status."""
        result = payments_health_check()

        assert result["status"] == "healthy"
        assert "timestamp" in result
        assert "operational" in result["message"].lower()
