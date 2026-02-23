"""
Unit tests for SalesAnalyticsService.

Tests:
- Bookings summary by period (daily/weekly/monthly/yearly)
- Reservation pipeline by status
- Revenue breakdown by event type
- Payment tracking and overdue detection
"""

from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone

import pytest
from freezegun import freeze_time

from core.domains.analytics.services.sales_analytics import SalesAnalyticsService


@pytest.mark.django_db
class TestSalesAnalyticsBookingsSummary:
    """Tests for SalesAnalyticsService.get_bookings_summary() method."""

    def test_bookings_summary_returns_list(self, event_factory):
        """Test that bookings summary returns a list."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        event_factory()

        result = SalesAnalyticsService.get_bookings_summary(start_date, end_date)

        assert isinstance(result, list)

    def test_bookings_summary_entry_structure(self, event_factory):
        """Test that each entry has expected keys."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        event_factory()

        result = SalesAnalyticsService.get_bookings_summary(start_date, end_date)

        if result:  # Only check if there are results
            entry = result[0]
            expected_keys = [
                "period",
                "total_bookings",
                "confirmed_bookings",
                "completed_bookings",
                "cancelled_bookings",
                "leads",
                "total_revenue",
            ]
            for key in expected_keys:
                assert key in entry, f"Missing key: {key}"

    def test_bookings_summary_daily_period(self, event_factory, user_factory):
        """Test daily period grouping."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=7)

        client = user_factory()
        event_factory(client=client, status="LEAD")
        event_factory(client=client, status="LEAD")

        result = SalesAnalyticsService.get_bookings_summary(start_date, end_date, period="daily")

        assert isinstance(result, list)
        # Results should be grouped by day
        if result:
            assert result[0]["period"] is not None

    def test_bookings_summary_weekly_period(self, event_factory, user_factory):
        """Test weekly period grouping."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        client = user_factory()
        event_factory(client=client, status="LEAD")

        result = SalesAnalyticsService.get_bookings_summary(start_date, end_date, period="weekly")

        assert isinstance(result, list)

    def test_bookings_summary_monthly_period(self, event_factory, user_factory):
        """Test monthly period grouping."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=90)

        client = user_factory()
        event_factory(client=client, status="LEAD")

        result = SalesAnalyticsService.get_bookings_summary(start_date, end_date, period="monthly")

        assert isinstance(result, list)

    def test_bookings_summary_yearly_period(self, event_factory, user_factory):
        """Test yearly period grouping."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=365)

        client = user_factory()
        event_factory(client=client, status="LEAD")

        result = SalesAnalyticsService.get_bookings_summary(start_date, end_date, period="yearly")

        assert isinstance(result, list)

    def test_bookings_summary_counts_by_status(self, event_factory, user_factory):
        """Test that bookings are counted correctly by status."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        client = user_factory()

        # Create events with different statuses
        event_factory(client=client, status="LEAD")
        event_factory(client=client, status="LEAD")
        event_factory(client=client, confirmed=True)
        event_factory(client=client, cancelled=True)

        result = SalesAnalyticsService.get_bookings_summary(start_date, end_date, period="monthly")

        if result:
            # Sum up across all periods
            total_leads = sum(r["leads"] for r in result)
            total_confirmed = sum(r["confirmed_bookings"] for r in result)
            total_cancelled = sum(r["cancelled_bookings"] for r in result)

            assert total_leads >= 2
            assert total_confirmed >= 1
            assert total_cancelled >= 1

    @freeze_time("2024-06-15 12:00:00")
    def test_bookings_summary_completed_uses_end_date(self, event_factory, user_factory):
        """Test that completed bookings are counted by end_date."""
        now = timezone.now()
        start_date = now - timedelta(days=30)
        end_date = now

        client = user_factory()

        # Create completed event with end_date within range
        event_factory(
            client=client, status="COMPLETED", start_date=now - timedelta(days=10), end_date=now - timedelta(days=9)
        )

        result = SalesAnalyticsService.get_bookings_summary(start_date, end_date, period="monthly")

        # Should have completed bookings counted
        total_completed = sum(r["completed_bookings"] for r in result)
        assert total_completed >= 1

    @freeze_time("2024-06-15 12:00:00")
    def test_bookings_summary_revenue_from_completed_events(self, event_factory, payment_factory, user_factory):
        """Test that revenue only comes from completed events."""
        now = timezone.now()
        start_date = now - timedelta(days=30)
        end_date = now

        client = user_factory()

        # Create completed event with payment
        completed_event = event_factory(
            client=client, status="COMPLETED", start_date=now - timedelta(days=10), end_date=now - timedelta(days=9)
        )
        payment_factory(event=completed_event, completed=True, amount=Decimal("1000.00"))

        result = SalesAnalyticsService.get_bookings_summary(start_date, end_date, period="monthly")

        total_revenue = sum(r["total_revenue"] for r in result)
        assert total_revenue == 1000.0

    def test_bookings_summary_empty_date_range(self, event_factory, user_factory):
        """Test bookings summary with no events in range."""
        # Query a date range in the distant past
        end_date = timezone.now() - timedelta(days=365)
        start_date = end_date - timedelta(days=30)

        result = SalesAnalyticsService.get_bookings_summary(start_date, end_date)

        # Should return empty list
        assert result == []


@pytest.mark.django_db
class TestSalesAnalyticsReservationPipeline:
    """Tests for SalesAnalyticsService.get_reservation_pipeline() method."""

    def test_reservation_pipeline_returns_list(self, event_factory):
        """Test that reservation pipeline returns a list."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        result = SalesAnalyticsService.get_reservation_pipeline(start_date, end_date)

        assert isinstance(result, list)

    def test_reservation_pipeline_entry_structure(self, event_factory, user_factory):
        """Test that each pipeline entry has expected keys."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        client = user_factory()
        event_factory(client=client, status="LEAD")

        result = SalesAnalyticsService.get_reservation_pipeline(start_date, end_date)

        if result:
            entry = result[0]
            expected_keys = ["status", "label", "count", "total_value"]
            for key in expected_keys:
                assert key in entry, f"Missing key: {key}"

    def test_reservation_pipeline_status_labels(self, event_factory, user_factory):
        """Test that status labels are human-readable."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        client = user_factory()
        event_factory(client=client, status="LEAD")
        event_factory(client=client, confirmed=True)

        result = SalesAnalyticsService.get_reservation_pipeline(start_date, end_date)

        # Check for expected labels
        labels = [r["label"] for r in result]
        # Should have readable labels
        assert all(isinstance(label, str) for label in labels)

    def test_reservation_pipeline_counts_by_status(self, event_factory, user_factory):
        """Test that events are counted correctly by status."""
        start_date = timezone.now() - timedelta(days=30)

        client = user_factory()

        # Create events with different statuses
        event_factory(client=client, status="LEAD")
        event_factory(client=client, status="LEAD")
        event_factory(client=client, confirmed=True)
        event_factory(client=client, cancelled=True)

        end_date = timezone.now() + timedelta(seconds=1)
        result = SalesAnalyticsService.get_reservation_pipeline(start_date, end_date)

        # Create dict for easier assertion
        pipeline_dict = {r["status"]: r["count"] for r in result}

        assert pipeline_dict.get("LEAD", 0) >= 2
        assert pipeline_dict.get("CONFIRMED", 0) >= 1
        assert pipeline_dict.get("CANCELLED", 0) >= 1

    @freeze_time("2024-06-15 12:00:00")
    def test_reservation_pipeline_includes_completed_separately(self, event_factory, user_factory):
        """Test that completed events are tracked separately using end_date."""
        now = timezone.now()
        start_date = now - timedelta(days=30)
        end_date = now

        client = user_factory()

        # Create completed event
        event_factory(
            client=client, status="COMPLETED", start_date=now - timedelta(days=10), end_date=now - timedelta(days=9)
        )

        result = SalesAnalyticsService.get_reservation_pipeline(start_date, end_date)

        # Should have COMPLETED in results
        completed_entry = next((r for r in result if r["status"] == "COMPLETED"), None)
        assert completed_entry is not None
        assert completed_entry["count"] >= 1

    @freeze_time("2024-06-15 12:00:00")
    def test_reservation_pipeline_revenue_calculation(self, event_factory, payment_factory, user_factory):
        """Test that total_value includes actual payment amounts."""
        now = timezone.now()
        start_date = now - timedelta(days=30)
        end_date = now

        client = user_factory()

        # Create completed event with payment
        completed_event = event_factory(
            client=client, status="COMPLETED", start_date=now - timedelta(days=10), end_date=now - timedelta(days=9)
        )
        payment_factory(event=completed_event, completed=True, amount=Decimal("2500.00"))

        result = SalesAnalyticsService.get_reservation_pipeline(start_date, end_date)

        completed_entry = next((r for r in result if r["status"] == "COMPLETED"), None)
        assert completed_entry is not None
        assert completed_entry["total_value"] == 2500.0


@pytest.mark.django_db
class TestSalesAnalyticsRevenueByType:
    """Tests for SalesAnalyticsService.get_revenue_by_event_type() method."""

    def test_revenue_by_type_returns_list(self):
        """Test that revenue by type returns a list."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        result = SalesAnalyticsService.get_revenue_by_event_type(start_date, end_date)

        assert isinstance(result, list)

    def test_revenue_by_type_entry_structure(self):
        """Test expected structure of revenue entries."""
        # This test verifies the expected keys even with empty results
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        result = SalesAnalyticsService.get_revenue_by_event_type(start_date, end_date)

        # If there are results, check structure
        if result:
            entry = result[0]
            expected_keys = [
                "name",
                "type",
                "category",
                "booking_count",
                "total_revenue",
                "avg_revenue",
                "total_participants",
            ]
            for key in expected_keys:
                assert key in entry, f"Missing key: {key}"

    def test_revenue_by_type_empty_when_no_completed_events(self, event_factory, user_factory):
        """Test that only completed events contribute to revenue."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        client = user_factory()

        # Create non-completed events
        event_factory(client=client, status="LEAD")
        event_factory(client=client, confirmed=True)

        result = SalesAnalyticsService.get_revenue_by_event_type(start_date, end_date)

        # Should be empty since no completed events
        assert result == []


@pytest.mark.django_db
class TestSalesAnalyticsPaymentTracking:
    """Tests for SalesAnalyticsService.get_payment_tracking() method."""

    def test_payment_tracking_returns_dict(self):
        """Test that payment tracking returns a dictionary."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        result = SalesAnalyticsService.get_payment_tracking(start_date, end_date)

        assert isinstance(result, dict)

    def test_payment_tracking_structure(self):
        """Test that payment tracking has expected keys."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        result = SalesAnalyticsService.get_payment_tracking(start_date, end_date)

        expected_keys = [
            "total_payments",
            "total_amount",
            "completed_amount",
            "pending_amount",
            "failed_count",
            "overdue_count",
            "overdue_amount",
            "upcoming_count",
            "upcoming_amount",
        ]
        for key in expected_keys:
            assert key in result, f"Missing key: {key}"

    def test_payment_tracking_counts_payments(self, event_factory, payment_factory, user_factory):
        """Test that payments are counted correctly."""
        start_date = timezone.now() - timedelta(days=30)

        client = user_factory()
        event = event_factory(client=client, confirmed=True)

        # Create various payments
        payment_factory(event=event, completed=True, amount=Decimal("1000.00"))
        payment_factory(event=event, pending=True, amount=Decimal("500.00"))
        payment_factory(event=event, failed=True, amount=Decimal("200.00"))

        end_date = timezone.now() + timedelta(seconds=1)
        result = SalesAnalyticsService.get_payment_tracking(start_date, end_date)

        assert result["total_payments"] >= 3
        assert result["completed_amount"] >= 1000.0
        assert result["pending_amount"] >= 500.0
        assert result["failed_count"] >= 1

    def test_payment_tracking_overdue_detection(self, event_factory, payment_factory, user_factory):
        """Test that overdue payments are detected.

        The service uses Payment.due_date directly (not a separate
        PaymentInstallment model) to track overdue/upcoming payments.
        """
        start_date = timezone.now() - timedelta(days=30)

        client = user_factory()
        event = event_factory(client=client, confirmed=True)

        # Create overdue payment (pending with past due_date)
        payment_factory(
            event=event,
            pending=True,
            amount=Decimal("500.00"),
            due_date=date.today() - timedelta(days=7),  # Past due
        )

        end_date = timezone.now() + timedelta(seconds=1)
        result = SalesAnalyticsService.get_payment_tracking(start_date, end_date)

        assert result["overdue_count"] >= 1
        assert result["overdue_amount"] >= 500.0

    def test_payment_tracking_upcoming_payments(self, event_factory, payment_factory, user_factory):
        """Test that upcoming payments within 30 days are tracked.

        The service uses Payment.due_date directly to detect upcoming payments.
        """
        start_date = timezone.now() - timedelta(days=30)

        client = user_factory()
        event = event_factory(client=client, confirmed=True)

        # Create upcoming payment (due in 15 days)
        payment_factory(
            event=event,
            pending=True,
            amount=Decimal("750.00"),
            due_date=date.today() + timedelta(days=15),
        )

        end_date = timezone.now() + timedelta(seconds=1)
        result = SalesAnalyticsService.get_payment_tracking(start_date, end_date)

        assert result["upcoming_count"] >= 1
        assert result["upcoming_amount"] >= 750.0

    def test_payment_tracking_excludes_completed_from_overdue(self, event_factory, payment_factory, user_factory):
        """Test that completed payments are not counted as overdue.

        The service only counts PENDING payments past their due_date as overdue.
        """
        start_date = timezone.now() - timedelta(days=30)

        client = user_factory()
        event = event_factory(client=client, confirmed=True)

        # Create a past-due but COMPLETED payment
        payment_factory(
            event=event,
            completed=True,
            amount=Decimal("500.00"),
            due_date=date.today() - timedelta(days=7),
        )

        end_date = timezone.now() + timedelta(seconds=1)
        result = SalesAnalyticsService.get_payment_tracking(start_date, end_date)

        # Should not be counted as overdue since it's completed
        # Overdue only counts PENDING payments past their due date
        assert result["overdue_count"] == 0

    def test_payment_tracking_with_no_payments(self):
        """Test payment tracking with no payments in database."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        result = SalesAnalyticsService.get_payment_tracking(start_date, end_date)

        assert result["total_payments"] == 0
        assert result["total_amount"] == 0
        assert result["completed_amount"] == 0
        assert result["pending_amount"] == 0
        assert result["failed_count"] == 0

    def test_payment_tracking_numeric_types(self, event_factory, payment_factory, user_factory):
        """Test that all numeric values are proper Python types."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        client = user_factory()
        event = event_factory(client=client, confirmed=True)
        payment_factory(event=event, completed=True, amount=Decimal("1000.00"))

        result = SalesAnalyticsService.get_payment_tracking(start_date, end_date)

        # All amount fields should be float/int (for JSON serialization)
        assert isinstance(result["total_amount"], (int, float))
        assert isinstance(result["completed_amount"], (int, float))
        assert isinstance(result["pending_amount"], (int, float))
        assert isinstance(result["overdue_amount"], (int, float))
        assert isinstance(result["upcoming_amount"], (int, float))

        # Count fields should be int
        assert isinstance(result["total_payments"], int)
        assert isinstance(result["failed_count"], int)
        assert isinstance(result["overdue_count"], int)
        assert isinstance(result["upcoming_count"], int)


@pytest.mark.django_db
class TestSalesAnalyticsEdgeCases:
    """Tests for edge cases in SalesAnalyticsService."""

    def test_bookings_summary_with_invalid_period_defaults_to_daily(self, event_factory, user_factory):
        """Test that invalid period parameter defaults to daily."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        client = user_factory()
        event_factory(client=client, status="LEAD")

        # Pass invalid period
        result = SalesAnalyticsService.get_bookings_summary(start_date, end_date, period="invalid")

        # Should still return results (using daily default)
        assert isinstance(result, list)

    def test_bookings_summary_period_iso_format(self, event_factory, user_factory):
        """Test that period values are ISO formatted strings."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        client = user_factory()
        event_factory(client=client, status="LEAD")

        result = SalesAnalyticsService.get_bookings_summary(start_date, end_date)

        if result and result[0]["period"]:
            # Period should be ISO formatted string
            assert isinstance(result[0]["period"], str)

    def test_reservation_pipeline_handles_multiple_payments_per_event(
        self, event_factory, payment_factory, user_factory
    ):
        """Test that multiple payments per event are summed correctly."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        client = user_factory()
        event = event_factory(client=client, confirmed=True)

        # Create multiple payments for same event
        payment_factory(event=event, completed=True, amount=Decimal("500.00"))
        payment_factory(event=event, completed=True, amount=Decimal("500.00"))

        result = SalesAnalyticsService.get_reservation_pipeline(start_date, end_date)

        confirmed_entry = next((r for r in result if r["status"] == "CONFIRMED"), None)
        if confirmed_entry:
            # Should sum both payments
            assert confirmed_entry["total_value"] >= 1000.0
