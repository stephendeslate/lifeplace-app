"""
Unit tests for payments domain signals.

Tests:
- Cache invalidation signals (payment, invoice, transaction, etc.)
- Event financial total updates
- Downpayment processing triggers
"""

from decimal import Decimal
from unittest.mock import patch

import pytest

from core.domains.payments.models import (
    InvoiceLineItem,
    PaymentTransaction,
    Refund,
    TaxRate,
)

# =============================================================================
# Cache Invalidation Signal Tests
# =============================================================================


@pytest.mark.django_db
class TestPaymentCacheInvalidationSignals:
    """Tests for payment cache invalidation signals."""

    @patch("core.domains.payments.cache_service.payments_cache_service")
    def test_payment_save_invalidates_cache(self, mock_cache_service, payment_factory, confirmed_event):
        """Test that saving a payment invalidates payment caches."""
        # Create payment (triggers signal)
        payment_factory(event=confirmed_event)

        # Verify cache invalidation was called
        mock_cache_service.invalidate_payment_caches.assert_called()

    @patch("core.domains.payments.cache_service.payments_cache_service")
    @patch("core.domains.payments.signals.update_event_financial_totals")
    def test_payment_delete_invalidates_cache(
        self, mock_update_totals, mock_cache_service, payment_factory, confirmed_event
    ):
        """Test that deleting a payment invalidates caches."""
        payment = payment_factory(event=confirmed_event)

        # Delete payment
        payment.delete()

        # Verify cache invalidation was called
        mock_cache_service.invalidate_payment_caches.assert_called()


@pytest.mark.django_db
class TestInvoiceCacheInvalidationSignals:
    """Tests for invoice cache invalidation signals."""

    @patch("core.domains.payments.cache_service.payments_cache_service")
    def test_invoice_save_invalidates_cache(self, mock_cache_service, invoice_factory, confirmed_event):
        """Test that saving an invoice invalidates invoice caches."""
        invoice_factory(event=confirmed_event)

        mock_cache_service.invalidate_invoice_caches.assert_called()

    @patch("core.domains.payments.cache_service.payments_cache_service")
    def test_invoice_line_item_save_invalidates_cache(self, mock_cache_service, invoice_factory, confirmed_event):
        """Test that saving invoice line item invalidates caches."""
        invoice = invoice_factory(event=confirmed_event)

        # Create line item (tax_rate is a required DecimalField)
        InvoiceLineItem.objects.create(
            invoice=invoice,
            description="Test item",
            quantity=1,
            unit_price=Decimal("100.00"),
            total=Decimal("100.00"),
            tax_rate=Decimal("12.00"),
        )

        # The signal invalidates parent invoice caches (not a separate line item cache)
        mock_cache_service.invalidate_invoice_caches.assert_called()


@pytest.mark.django_db
class TestPaymentMethodCacheInvalidationSignals:
    """Tests for payment method cache invalidation signals."""

    @patch("core.domains.payments.cache_service.payments_cache_service")
    def test_payment_method_save_invalidates_cache(self, mock_cache_service, payment_method_factory):
        """Test that saving a payment method invalidates caches."""
        payment_method_factory()

        mock_cache_service.invalidate_payment_method_caches.assert_called()


@pytest.mark.django_db
class TestPaymentGatewayCacheInvalidationSignals:
    """Tests for payment gateway cache invalidation signals."""

    @patch("core.domains.payments.cache_service.payments_cache_service")
    def test_gateway_save_invalidates_cache(self, mock_cache_service, payment_gateway_factory):
        """Test that saving a payment gateway invalidates caches."""
        payment_gateway_factory()

        mock_cache_service.invalidate_payment_gateway_caches.assert_called()


# =============================================================================
# Event Financial Totals Update Tests
# =============================================================================


@pytest.mark.django_db
class TestEventFinancialTotalsUpdate:
    """Tests for event financial totals updates."""

    @patch("core.domains.payments.signals.update_event_financial_totals")
    def test_payment_save_updates_event_totals(self, mock_update_totals, payment_factory, confirmed_event):
        """Test that saving a payment updates event financial totals."""
        payment_factory(event=confirmed_event, status="COMPLETED")

        # Verify update was called with the event
        mock_update_totals.assert_called()
        call_args = mock_update_totals.call_args
        assert call_args[0][0] == confirmed_event

    @patch("core.domains.payments.signals.update_event_financial_totals")
    def test_invoice_save_updates_event_totals(self, mock_update_totals, invoice_factory, confirmed_event):
        """Test that saving an invoice updates event financial totals."""
        invoice_factory(event=confirmed_event)

        mock_update_totals.assert_called()


# =============================================================================
# Refund Signal Tests
# =============================================================================


@pytest.mark.django_db
class TestRefundSignals:
    """Tests for refund-related signals."""

    @patch("core.domains.payments.cache_service.payments_cache_service")
    def test_refund_save_invalidates_cache(self, mock_cache_service, completed_payment, admin_user):
        """Test that saving a refund invalidates caches."""
        Refund.objects.create(
            payment=completed_payment, amount=Decimal("50.00"), status="COMPLETED", refunded_by=admin_user
        )

        mock_cache_service.invalidate_refund_caches.assert_called()


# =============================================================================
# Tax Rate Signal Tests
# =============================================================================


@pytest.mark.django_db
class TestTaxRateSignals:
    """Tests for tax rate-related signals."""

    @patch("core.domains.payments.cache_service.payments_cache_service")
    def test_tax_rate_save_invalidates_cache(self, mock_cache_service):
        """Test that saving a tax rate invalidates caches.

        Note: TaxRate model has name, rate, region, is_default fields
        but no is_active field.
        """
        TaxRate.objects.create(name="Test Tax", rate=Decimal("12.00"), is_default=False)

        # The signal calls invalidate_all_financial_analytics_caches for tax rate changes
        mock_cache_service.invalidate_all_financial_analytics_caches.assert_called()


# =============================================================================
# Transaction Signal Tests
# =============================================================================


@pytest.mark.django_db
class TestTransactionSignals:
    """Tests for transaction-related signals."""

    @patch("core.domains.payments.cache_service.payments_cache_service")
    def test_transaction_save_invalidates_cache(self, mock_cache_service, completed_payment, stripe_gateway):
        """Test that saving a transaction invalidates caches."""
        PaymentTransaction.objects.create(
            payment=completed_payment,
            gateway=stripe_gateway,
            transaction_id="txn_test123",
            amount=completed_payment.amount,
            status="COMPLETED",
            currency=completed_payment.currency,
        )

        mock_cache_service.invalidate_transaction_caches.assert_called()
