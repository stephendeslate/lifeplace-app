"""
Unit tests for LateCheckoutService.

Tests:
- get_late_checkout_settings
- calculate_late_checkout_fee (all fee types)
- apply_late_checkout_fee
- preview_late_checkout_fee
- Grace period handling
- Edge cases
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.utils import timezone

import pytest

from core.domains.events.services.late_checkout_service import LateCheckoutService


@pytest.fixture
def mock_payment_settings():
    """Create mock payment settings for late checkout."""
    settings = MagicMock()
    settings.late_checkout_fee_enabled = True
    settings.late_checkout_fee_type = "HOURLY"
    settings.late_checkout_fee_amount = Decimal("300.00")
    settings.late_checkout_fee_percentage = Decimal("10.00")
    settings.late_checkout_grace_minutes = 15
    settings.late_checkout_max_hours = 4
    return settings


@pytest.fixture
def mock_event(event_factory):
    """Create a mock event with scheduled checkout time."""
    event = event_factory()
    event.scheduled_checkout_time = timezone.now()
    event.end_date = timezone.now()
    event.total_price = Decimal("10000.00")
    event.late_checkout_fee_applied = False
    event.late_checkout_fee_amount = Decimal("0.00")
    return event


# =============================================================================
# get_late_checkout_settings Tests
# =============================================================================


@pytest.mark.django_db
class TestGetLateCheckoutSettings:
    """Tests for getting late checkout settings."""

    @patch("core.domains.payments.models.PaymentSettings.get_default_settings")
    def test_returns_settings_dict(self, mock_get_settings, mock_payment_settings):
        """Test that settings are returned as a dict with expected keys."""
        mock_get_settings.return_value = mock_payment_settings

        settings = LateCheckoutService.get_late_checkout_settings()

        assert isinstance(settings, dict)
        assert "enabled" in settings
        assert "fee_type" in settings
        assert "fee_amount" in settings
        assert "fee_percentage" in settings
        assert "grace_minutes" in settings
        assert "max_hours" in settings

    @patch("core.domains.payments.models.PaymentSettings.get_default_settings")
    def test_returns_correct_values(self, mock_get_settings, mock_payment_settings):
        """Test that correct values are returned."""
        mock_get_settings.return_value = mock_payment_settings

        settings = LateCheckoutService.get_late_checkout_settings()

        assert settings["enabled"] is True
        assert settings["fee_type"] == "HOURLY"
        assert settings["fee_amount"] == Decimal("300.00")
        assert settings["grace_minutes"] == 15
        assert settings["max_hours"] == 4


# =============================================================================
# calculate_late_checkout_fee Tests
# =============================================================================


@pytest.mark.django_db
class TestCalculateLateCheckoutFee:
    """Tests for fee calculation."""

    @patch.object(LateCheckoutService, "get_late_checkout_settings")
    def test_fee_disabled_returns_zero(self, mock_settings, mock_event):
        """Test that disabled fee returns zero."""
        mock_settings.return_value = {
            "enabled": False,
            "fee_type": "HOURLY",
            "fee_amount": Decimal("300.00"),
            "fee_percentage": Decimal("10.00"),
            "grace_minutes": 15,
            "max_hours": 4,
        }

        result = LateCheckoutService.calculate_late_checkout_fee(mock_event)

        assert result["fee_amount"] == Decimal("0.00")
        assert result["is_late"] is False
        assert "not enabled" in result["details"]["reason"].lower()

    @patch.object(LateCheckoutService, "get_late_checkout_settings")
    def test_on_time_checkout_returns_zero(self, mock_settings, mock_event):
        """Test that on-time checkout returns zero fee."""
        mock_settings.return_value = {
            "enabled": True,
            "fee_type": "HOURLY",
            "fee_amount": Decimal("300.00"),
            "fee_percentage": Decimal("10.00"),
            "grace_minutes": 15,
            "max_hours": 4,
        }

        # Checkout before scheduled end
        scheduled_end = timezone.now() + timedelta(hours=1)
        mock_event.scheduled_checkout_time = scheduled_end
        actual_checkout = timezone.now()

        result = LateCheckoutService.calculate_late_checkout_fee(mock_event, actual_checkout)

        assert result["fee_amount"] == Decimal("0.00")
        assert result["is_late"] is False
        assert "on-time" in result["details"]["reason"].lower()

    @patch.object(LateCheckoutService, "get_late_checkout_settings")
    def test_within_grace_period_returns_zero(self, mock_settings, mock_event):
        """Test that checkout within grace period returns zero fee."""
        mock_settings.return_value = {
            "enabled": True,
            "fee_type": "HOURLY",
            "fee_amount": Decimal("300.00"),
            "fee_percentage": Decimal("10.00"),
            "grace_minutes": 15,
            "max_hours": 4,
        }

        # 10 minutes late (within 15 min grace)
        scheduled_end = timezone.now()
        mock_event.scheduled_checkout_time = scheduled_end
        actual_checkout = scheduled_end + timedelta(minutes=10)

        result = LateCheckoutService.calculate_late_checkout_fee(mock_event, actual_checkout)

        assert result["fee_amount"] == Decimal("0.00")
        assert result["is_late"] is True  # Still late, just within grace
        assert "grace" in result["details"]["reason"].lower()

    @patch.object(LateCheckoutService, "get_late_checkout_settings")
    def test_hourly_fee_calculation(self, mock_settings, mock_event):
        """Test hourly fee calculation."""
        mock_settings.return_value = {
            "enabled": True,
            "fee_type": "HOURLY",
            "fee_amount": Decimal("300.00"),
            "fee_percentage": Decimal("10.00"),
            "grace_minutes": 15,
            "max_hours": 4,
        }

        # 2.5 hours late (after 15 min grace = ~2.25 hours billable, rounds to 3)
        scheduled_end = timezone.now()
        mock_event.scheduled_checkout_time = scheduled_end
        actual_checkout = scheduled_end + timedelta(hours=2, minutes=30)

        result = LateCheckoutService.calculate_late_checkout_fee(mock_event, actual_checkout)

        # 2:30 late - 15 min grace = 2:15 billable = 3 hours (rounded up)
        expected_fee = Decimal("300.00") * 3
        assert result["fee_amount"] == expected_fee
        assert result["is_late"] is True
        assert result["details"]["fee_type"] == "HOURLY"

    @patch.object(LateCheckoutService, "get_late_checkout_settings")
    def test_fixed_fee_calculation(self, mock_settings, mock_event):
        """Test fixed fee calculation."""
        mock_settings.return_value = {
            "enabled": True,
            "fee_type": "FIXED",
            "fee_amount": Decimal("500.00"),
            "fee_percentage": Decimal("10.00"),
            "grace_minutes": 15,
            "max_hours": 4,
        }

        # 1 hour late (after grace)
        scheduled_end = timezone.now()
        mock_event.scheduled_checkout_time = scheduled_end
        actual_checkout = scheduled_end + timedelta(hours=1)

        result = LateCheckoutService.calculate_late_checkout_fee(mock_event, actual_checkout)

        assert result["fee_amount"] == Decimal("500.00")
        assert result["details"]["fee_type"] == "FIXED"

    @patch.object(LateCheckoutService, "get_late_checkout_settings")
    def test_percentage_fee_calculation(self, mock_settings, mock_event):
        """Test percentage fee calculation."""
        mock_settings.return_value = {
            "enabled": True,
            "fee_type": "PERCENTAGE",
            "fee_amount": Decimal("300.00"),
            "fee_percentage": Decimal("10.00"),
            "grace_minutes": 15,
            "max_hours": 4,
        }

        mock_event.total_price = Decimal("10000.00")

        # 1 hour late
        scheduled_end = timezone.now()
        mock_event.scheduled_checkout_time = scheduled_end
        actual_checkout = scheduled_end + timedelta(hours=1)

        result = LateCheckoutService.calculate_late_checkout_fee(mock_event, actual_checkout)

        expected_fee = Decimal("10000.00") * Decimal("0.10")  # 10%
        assert result["fee_amount"] == expected_fee
        assert result["details"]["fee_type"] == "PERCENTAGE"

    @patch.object(LateCheckoutService, "get_late_checkout_settings")
    def test_max_hours_cap(self, mock_settings, mock_event):
        """Test that fee is capped at max hours."""
        mock_settings.return_value = {
            "enabled": True,
            "fee_type": "HOURLY",
            "fee_amount": Decimal("300.00"),
            "fee_percentage": Decimal("10.00"),
            "grace_minutes": 15,
            "max_hours": 4,
        }

        # 10 hours late (should be capped at 4)
        scheduled_end = timezone.now()
        mock_event.scheduled_checkout_time = scheduled_end
        actual_checkout = scheduled_end + timedelta(hours=10)

        result = LateCheckoutService.calculate_late_checkout_fee(mock_event, actual_checkout)

        # Should be capped at 4 hours
        expected_fee = Decimal("300.00") * 4
        assert result["fee_amount"] == expected_fee
        assert result["details"]["hours_late"] == 4

    @patch.object(LateCheckoutService, "get_late_checkout_settings")
    def test_no_scheduled_end_time(self, mock_settings, mock_event):
        """Test handling of event with no scheduled end time."""
        mock_settings.return_value = {
            "enabled": True,
            "fee_type": "HOURLY",
            "fee_amount": Decimal("300.00"),
            "fee_percentage": Decimal("10.00"),
            "grace_minutes": 15,
            "max_hours": 4,
        }

        mock_event.scheduled_checkout_time = None
        mock_event.end_date = None

        result = LateCheckoutService.calculate_late_checkout_fee(mock_event)

        assert result["fee_amount"] == Decimal("0.00")
        assert "no scheduled" in result["details"]["reason"].lower()


# =============================================================================
# apply_late_checkout_fee Tests
# =============================================================================


@pytest.mark.django_db
class TestApplyLateCheckoutFee:
    """Tests for applying late checkout fees."""

    @patch.object(LateCheckoutService, "calculate_late_checkout_fee")
    def test_apply_fee_success(self, mock_calculate, mock_event):
        """Test successful fee application."""
        mock_calculate.return_value = {
            "fee_amount": Decimal("600.00"),
            "is_late": True,
            "details": {"description": "Test fee"},
        }

        result = LateCheckoutService.apply_late_checkout_fee(mock_event)

        assert result["success"] is True
        assert result["fee_applied"] is True
        assert result["fee_amount"] == Decimal("600.00")
        assert mock_event.late_checkout_fee_applied is True
        assert mock_event.late_checkout_fee_amount == Decimal("600.00")

    @patch.object(LateCheckoutService, "calculate_late_checkout_fee")
    def test_apply_fee_already_applied(self, mock_calculate, mock_event):
        """Test that fee is not applied twice."""
        mock_event.late_checkout_fee_applied = True

        result = LateCheckoutService.apply_late_checkout_fee(mock_event)

        assert result["success"] is True
        assert result["fee_applied"] is False
        assert "already applied" in result["details"]["reason"].lower()
        mock_calculate.assert_not_called()

    @patch.object(LateCheckoutService, "calculate_late_checkout_fee")
    def test_apply_zero_fee(self, mock_calculate, mock_event):
        """Test that zero fee is not applied."""
        mock_calculate.return_value = {
            "fee_amount": Decimal("0.00"),
            "is_late": False,
            "details": {"reason": "On-time"},
        }

        result = LateCheckoutService.apply_late_checkout_fee(mock_event)

        assert result["success"] is True
        assert result["fee_applied"] is False
        assert result["fee_amount"] == Decimal("0.00")


# =============================================================================
# preview_late_checkout_fee Tests
# =============================================================================


@pytest.mark.django_db
class TestPreviewLateCheckoutFee:
    """Tests for fee preview functionality."""

    @patch.object(LateCheckoutService, "calculate_late_checkout_fee")
    def test_preview_returns_calculation(self, mock_calculate, mock_event):
        """Test that preview returns calculation without modifications."""
        mock_calculate.return_value = {"fee_amount": Decimal("300.00"), "is_late": True, "details": {"hours_late": 1}}

        result = LateCheckoutService.preview_late_checkout_fee(mock_event)

        assert result["fee_amount"] == Decimal("300.00")
        assert result["is_late"] is True

    @patch.object(LateCheckoutService, "calculate_late_checkout_fee")
    def test_preview_uses_current_time_by_default(self, mock_calculate, mock_event):
        """Test that preview uses current time if not specified."""
        mock_calculate.return_value = {"fee_amount": Decimal("0.00")}

        LateCheckoutService.preview_late_checkout_fee(mock_event)

        # Check that calculate was called with a datetime close to now
        call_args = mock_calculate.call_args
        checkout_time = call_args[0][1]  # Second positional arg
        assert checkout_time is not None
        assert (timezone.now() - checkout_time).total_seconds() < 5

    @patch.object(LateCheckoutService, "calculate_late_checkout_fee")
    def test_preview_uses_specified_time(self, mock_calculate, mock_event):
        """Test that preview uses specified checkout time."""
        mock_calculate.return_value = {"fee_amount": Decimal("0.00")}

        custom_time = timezone.now() + timedelta(hours=5)
        LateCheckoutService.preview_late_checkout_fee(mock_event, custom_time)

        call_args = mock_calculate.call_args
        checkout_time = call_args[0][1]
        assert checkout_time == custom_time
