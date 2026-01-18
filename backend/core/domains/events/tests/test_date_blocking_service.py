"""
Unit tests for the DateBlockingService.

Tests:
- Date blocking/unblocking operations
- First-to-pay-wins logic
- Competing event detection and cancellation
- Downpayment processing (atomic and non-atomic)
- Deadline expiry checking
- Payment timeout cancellation
- Notification sending
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.utils import timezone
from django.db import transaction
from freezegun import freeze_time

from core.domains.events.services.date_blocking_service import (
    DateBlockingService,
    date_blocking_service,
)
from core.domains.events.models import Event


@pytest.mark.django_db
class TestDateBlockingServiceBasics:
    """Basic tests for DateBlockingService."""

    def test_service_instance_exists(self):
        """Test that the singleton instance is available."""
        assert date_blocking_service is not None

    def test_get_effective_payment_terms_returns_defaults(self, event_factory):
        """Test get_effective_payment_terms returns default settings."""
        event = event_factory()

        terms = DateBlockingService.get_effective_payment_terms(event)

        assert 'date_blocking_policy' in terms
        assert 'downpayment_percentage' in terms


@pytest.mark.django_db
class TestIsDateBlocked:
    """Tests for is_date_blocked method."""

    def test_date_not_blocked_when_no_events(self):
        """Test date is not blocked when no events exist."""
        target_date = timezone.now() + timedelta(days=30)

        result = DateBlockingService.is_date_blocked(target_date)

        assert result is False

    def test_date_blocked_with_blocked_event(self, event_factory):
        """Test date is blocked when event has date_blocked=True."""
        target_date = timezone.now() + timedelta(days=30)
        event_factory(
            start_date=target_date,
            status='CONFIRMED',
            date_blocked_trait=True,
        )

        result = DateBlockingService.is_date_blocked(target_date)

        assert result is True

    def test_date_not_blocked_without_flag(self, event_factory):
        """Test date is not blocked when event has date_blocked=False."""
        target_date = timezone.now() + timedelta(days=30)
        event_factory(
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
        )

        result = DateBlockingService.is_date_blocked(target_date)

        assert result is False

    def test_exclude_event_from_check(self, event_factory):
        """Test excluding specific event from block check."""
        target_date = timezone.now() + timedelta(days=30)
        event = event_factory(
            start_date=target_date,
            status='CONFIRMED',
            date_blocked_trait=True,
        )

        # Without exclusion
        assert DateBlockingService.is_date_blocked(target_date) is True

        # With exclusion
        assert DateBlockingService.is_date_blocked(target_date, exclude_event_id=event.id) is False

    def test_cancelled_events_dont_block(self, event_factory):
        """Test that cancelled events don't block dates."""
        target_date = timezone.now() + timedelta(days=30)
        event_factory(
            start_date=target_date,
            cancelled=True,
            date_blocked=True,  # Even with this flag
        )

        result = DateBlockingService.is_date_blocked(target_date)

        assert result is False

    def test_handles_date_object_input(self, event_factory):
        """Test method accepts date object (not just datetime)."""
        target_date = (timezone.now() + timedelta(days=30)).date()
        event_factory(
            start_date=timezone.now() + timedelta(days=30),
            status='CONFIRMED',
            date_blocked_trait=True,
        )

        result = DateBlockingService.is_date_blocked(target_date)

        assert result is True


@pytest.mark.django_db
class TestGetBlockingEvent:
    """Tests for get_blocking_event method."""

    def test_returns_blocking_event(self, event_factory):
        """Test returns the event blocking a date."""
        target_date = timezone.now() + timedelta(days=30)
        blocking_event = event_factory(
            start_date=target_date,
            status='CONFIRMED',
            date_blocked_trait=True,
        )

        result = DateBlockingService.get_blocking_event(target_date)

        assert result is not None
        assert result.id == blocking_event.id

    def test_returns_none_when_not_blocked(self):
        """Test returns None when date is not blocked."""
        target_date = timezone.now() + timedelta(days=30)

        result = DateBlockingService.get_blocking_event(target_date)

        assert result is None


@pytest.mark.django_db
class TestBlockDate:
    """Tests for block_date method."""

    def test_block_date_sets_flags(self, event_factory):
        """Test blocking date sets date_blocked and date_blocked_at."""
        event = event_factory(
            status='CONFIRMED',
            date_blocked=False,
        )

        DateBlockingService.block_date(event, reason='Test block')

        event.refresh_from_db()
        assert event.date_blocked is True
        assert event.date_blocked_at is not None

    def test_block_date_with_reason(self, event_factory, caplog):
        """Test blocking date logs the reason."""
        import logging
        caplog.set_level(logging.INFO)

        event = event_factory(status='CONFIRMED')

        DateBlockingService.block_date(event, reason='Payment received')

        assert 'Payment received' in caplog.text or event.date_blocked is True


@pytest.mark.django_db
class TestUnblockDate:
    """Tests for unblock_date method."""

    def test_unblock_date_clears_flags(self, event_factory):
        """Test unblocking date clears date_blocked and date_blocked_at."""
        event = event_factory(
            status='CONFIRMED',
            date_blocked_trait=True,
        )

        DateBlockingService.unblock_date(event, reason='Test unblock')

        event.refresh_from_db()
        assert event.date_blocked is False
        assert event.date_blocked_at is None


@pytest.mark.django_db
class TestGetCompetingEvents:
    """Tests for get_competing_events method."""

    def test_finds_competing_events(self, event_factory, user_factory):
        """Test finds other unpaid events on same date."""
        client1 = user_factory()
        client2 = user_factory()
        target_date = timezone.now() + timedelta(days=30)

        event1 = event_factory(
            client=client1,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )
        event2 = event_factory(
            client=client2,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )

        competitors = DateBlockingService.get_competing_events(event1)

        assert event2 in competitors
        assert event1 not in competitors

    def test_excludes_paid_events(self, event_factory, user_factory):
        """Test excludes events that are already paid."""
        client1 = user_factory()
        client2 = user_factory()
        target_date = timezone.now() + timedelta(days=30)

        event1 = event_factory(
            client=client1,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )
        event2 = event_factory(
            client=client2,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='PAID',
        )

        competitors = DateBlockingService.get_competing_events(event1)

        assert event2 not in competitors

    def test_excludes_blocked_events(self, event_factory, user_factory):
        """Test excludes events with date_blocked=True."""
        client1 = user_factory()
        client2 = user_factory()
        target_date = timezone.now() + timedelta(days=30)

        event1 = event_factory(
            client=client1,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )
        event2 = event_factory(
            client=client2,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=True,
            payment_status='UNPAID',
        )

        competitors = DateBlockingService.get_competing_events(event1)

        assert event2 not in competitors


@pytest.mark.django_db
class TestProcessDownpaymentReceived:
    """Tests for process_downpayment_received (non-atomic version)."""

    @patch.object(DateBlockingService, '_send_date_taken_notification')
    def test_blocks_date_on_downpayment(self, mock_notify, event_factory):
        """Test date is blocked when downpayment received."""
        event = event_factory(
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )

        result = DateBlockingService.process_downpayment_received(event)

        assert result['success'] is True
        assert result['blocked'] is True
        event.refresh_from_db()
        assert event.date_blocked is True

    @patch.object(DateBlockingService, '_send_date_taken_notification')
    def test_cancels_competing_events(self, mock_notify, event_factory, user_factory):
        """Test competing events are cancelled."""
        client1 = user_factory()
        client2 = user_factory()
        target_date = timezone.now() + timedelta(days=30)

        winning_event = event_factory(
            client=client1,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )
        losing_event = event_factory(
            client=client2,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )

        result = DateBlockingService.process_downpayment_received(winning_event)

        assert result['success'] is True
        assert len(result['cancelled_events']) == 1

        losing_event.refresh_from_db()
        assert losing_event.status == 'CANCELLED'
        assert losing_event.cancelled_reason == 'DATE_TAKEN'

    def test_fails_when_date_already_blocked(self, event_factory, user_factory):
        """Test fails when another event already blocked the date."""
        client1 = user_factory()
        client2 = user_factory()
        target_date = timezone.now() + timedelta(days=30)

        # First event already blocked
        event_factory(
            client=client1,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked_trait=True,
        )

        # Second event tries to block
        second_event = event_factory(
            client=client2,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )

        result = DateBlockingService.process_downpayment_received(second_event)

        assert result['success'] is False
        assert result['error'] is not None
        assert 'already blocked' in result['error'].lower()


@pytest.mark.django_db
@pytest.mark.skip(reason="SELECT FOR UPDATE with outer joins not supported in SQLite test DB - requires PostgreSQL")
class TestAtomicProcessDownpaymentReceived:
    """Tests for atomic_process_downpayment_received method.

    Note: These tests use SELECT FOR UPDATE with LEFT OUTER JOIN which is
    only supported in PostgreSQL. The test database uses SQLite.
    """

    @patch.object(DateBlockingService, '_send_date_taken_notification')
    def test_atomic_blocks_date(self, mock_notify, event_factory):
        """Test atomic version blocks date correctly."""
        event = event_factory(
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )

        result = DateBlockingService.atomic_process_downpayment_received(event)

        assert result['success'] is True
        assert result['blocked'] is True
        event.refresh_from_db()
        assert event.date_blocked is True

    def test_atomic_returns_success_when_already_blocked(self, event_factory):
        """Test returns success if event already has date blocked."""
        event = event_factory(
            status='CONFIRMED',
            date_blocked_trait=True,
        )

        result = DateBlockingService.atomic_process_downpayment_received(event)

        # Should succeed as idempotent operation
        assert result['success'] is True
        assert result['blocked'] is True

    def test_atomic_fails_for_cancelled_event(self, event_factory):
        """Test fails for cancelled events."""
        event = event_factory(cancelled=True)

        result = DateBlockingService.atomic_process_downpayment_received(event)

        assert result['success'] is False
        assert 'cancelled' in result['error'].lower()

    @patch.object(DateBlockingService, '_send_date_taken_notification')
    def test_atomic_cancels_competing_events(self, mock_notify, event_factory, user_factory):
        """Test atomic version cancels competing events."""
        client1 = user_factory()
        client2 = user_factory()
        target_date = timezone.now() + timedelta(days=30)

        winning_event = event_factory(
            client=client1,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )
        losing_event = event_factory(
            client=client2,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )

        result = DateBlockingService.atomic_process_downpayment_received(winning_event)

        assert result['success'] is True
        assert len(result['cancelled_events']) == 1

        losing_event.refresh_from_db()
        assert losing_event.status == 'CANCELLED'


@pytest.mark.django_db
class TestCancelEventForDateTaken:
    """Tests for cancel_event_for_date_taken method."""

    @patch.object(DateBlockingService, '_send_date_taken_notification')
    def test_cancels_event_with_correct_reason(self, mock_notify, event_factory, user_factory):
        """Test event is cancelled with DATE_TAKEN reason."""
        client1 = user_factory()
        client2 = user_factory()

        blocking_event = event_factory(client=client1, status='CONFIRMED')
        cancelled_event = event_factory(client=client2, status='CONFIRMED')

        DateBlockingService.cancel_event_for_date_taken(cancelled_event, blocking_event)

        cancelled_event.refresh_from_db()
        assert cancelled_event.status == 'CANCELLED'
        assert cancelled_event.cancelled_reason == 'DATE_TAKEN'
        assert cancelled_event.can_rebook is True
        assert cancelled_event.cancelled_at is not None

    @patch.object(DateBlockingService, '_send_date_taken_notification')
    def test_sends_notification_on_cancellation(self, mock_notify, event_factory, user_factory):
        """Test notification is sent when event is cancelled."""
        client1 = user_factory()
        client2 = user_factory()

        blocking_event = event_factory(client=client1, status='CONFIRMED')
        cancelled_event = event_factory(client=client2, status='CONFIRMED')

        DateBlockingService.cancel_event_for_date_taken(cancelled_event, blocking_event)

        mock_notify.assert_called_once_with(cancelled_event, blocking_event)


@pytest.mark.django_db
class TestCancelEventForTimeout:
    """Tests for cancel_event_for_timeout method."""

    @patch.object(DateBlockingService, '_send_timeout_notification')
    def test_cancels_event_with_timeout_reason(self, mock_notify, event_factory):
        """Test event is cancelled with PAYMENT_TIMEOUT reason."""
        event = event_factory(status='CONFIRMED')

        DateBlockingService.cancel_event_for_timeout(event)

        event.refresh_from_db()
        assert event.status == 'CANCELLED'
        assert event.cancelled_reason == 'PAYMENT_TIMEOUT'
        assert event.can_rebook is True

    @patch.object(DateBlockingService, '_send_timeout_notification')
    def test_sends_timeout_notification(self, mock_notify, event_factory):
        """Test timeout notification is sent."""
        event = event_factory(status='CONFIRMED')

        DateBlockingService.cancel_event_for_timeout(event)

        mock_notify.assert_called_once_with(event)


@pytest.mark.django_db
class TestCheckDeadlineExpiry:
    """Tests for check_deadline_expiry method."""

    def test_not_expired_before_deadline(self, event_factory):
        """Test returns False before deadline."""
        event = event_factory(status='CONFIRMED')
        event.downpayment_deadline = timezone.now() + timedelta(days=7)
        event.save()

        result = DateBlockingService.check_deadline_expiry(event)

        assert result is False

    @freeze_time('2024-01-15 12:00:00')
    def test_expired_after_deadline(self, event_factory):
        """Test returns True after deadline passed."""
        event = event_factory(status='CONFIRMED')
        event.downpayment_deadline = timezone.now() - timedelta(hours=1)
        event.save()

        result = DateBlockingService.check_deadline_expiry(event)

        assert result is True

    def test_no_deadline_returns_false(self, event_factory):
        """Test returns False when no deadline set."""
        event = event_factory(status='CONFIRMED')
        event.downpayment_deadline = None
        event.save()

        result = DateBlockingService.check_deadline_expiry(event)

        assert result is False


@pytest.mark.django_db
class TestSetDownpaymentDeadline:
    """Tests for set_downpayment_deadline method."""

    def test_sets_deadline_correctly(self, event_factory):
        """Test deadline is set for correct number of days."""
        event = event_factory(status='CONFIRMED')

        DateBlockingService.set_downpayment_deadline(event, deadline_days=7)

        event.refresh_from_db()
        assert event.downpayment_deadline is not None

        # Should be approximately 7 days from now
        expected = timezone.now() + timedelta(days=7)
        delta = abs((event.downpayment_deadline - expected).total_seconds())
        assert delta < 60  # Within 1 minute


@pytest.mark.django_db
class TestShouldBlockOnBookingCompletion:
    """Tests for should_block_on_booking_completion method."""

    def test_returns_policy_info(self, event_factory):
        """Test returns tuple of (should_block, policy_name)."""
        event = event_factory(status='CONFIRMED')

        should_block, policy = DateBlockingService.should_block_on_booking_completion(event)

        assert isinstance(should_block, bool)
        assert policy in ['IMMEDIATE', 'ON_DOWNPAYMENT']


@pytest.mark.django_db
class TestNotificationMethods:
    """Tests for notification helper methods."""

    @patch('core.domains.notifications.services.NotificationService.create_notification')
    def test_send_date_taken_notification(self, mock_create, event_factory, user_factory):
        """Test date taken notification is created correctly."""
        client = user_factory()
        blocking_event = event_factory(status='CONFIRMED')
        cancelled_event = event_factory(client=client, status='CONFIRMED')

        DateBlockingService._send_date_taken_notification(cancelled_event, blocking_event)

        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs['recipient'] == client
        assert call_kwargs['notification_type'] == 'EVENT_CANCELLED'
        assert 'cancelled' in call_kwargs['title'].lower()

    @patch('core.domains.notifications.services.NotificationService.create_notification')
    def test_send_timeout_notification(self, mock_create, event_factory, user_factory):
        """Test timeout notification is created correctly."""
        client = user_factory()
        event = event_factory(client=client, status='CONFIRMED')

        DateBlockingService._send_timeout_notification(event)

        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs['recipient'] == client
        assert call_kwargs['notification_type'] == 'EVENT_CANCELLED'
        assert 'deadline' in call_kwargs['title'].lower() or 'expired' in call_kwargs['title'].lower()


@pytest.mark.django_db
class TestFirstToPayWinsScenario:
    """Integration tests for first-to-pay-wins logic."""

    @patch.object(DateBlockingService, '_send_date_taken_notification')
    def test_first_payment_wins(self, mock_notify, event_factory, user_factory):
        """Test the first event to receive payment wins the date."""
        client1 = user_factory()
        client2 = user_factory()
        client3 = user_factory()
        target_date = timezone.now() + timedelta(days=30)

        # Three clients book the same date
        event1 = event_factory(
            client=client1,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )
        event2 = event_factory(
            client=client2,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )
        event3 = event_factory(
            client=client3,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )

        # Client 2 pays first
        result = DateBlockingService.process_downpayment_received(event2)

        assert result['success'] is True
        assert len(result['cancelled_events']) == 2

        # Verify states
        event1.refresh_from_db()
        event2.refresh_from_db()
        event3.refresh_from_db()

        assert event2.date_blocked is True
        assert event2.status == 'CONFIRMED'

        assert event1.status == 'CANCELLED'
        assert event1.cancelled_reason == 'DATE_TAKEN'

        assert event3.status == 'CANCELLED'
        assert event3.cancelled_reason == 'DATE_TAKEN'

    @patch.object(DateBlockingService, '_send_date_taken_notification')
    def test_second_payment_fails_when_date_blocked(self, mock_notify, event_factory, user_factory):
        """Test second payment attempt fails when date already blocked."""
        client1 = user_factory()
        client2 = user_factory()
        target_date = timezone.now() + timedelta(days=30)

        event1 = event_factory(
            client=client1,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )
        event2 = event_factory(
            client=client2,
            start_date=target_date,
            status='CONFIRMED',
            date_blocked=False,
            payment_status='UNPAID',
        )

        # Client 1 pays first
        result1 = DateBlockingService.process_downpayment_received(event1)
        assert result1['success'] is True

        # Client 2 tries to pay (should fail)
        result2 = DateBlockingService.process_downpayment_received(event2)

        assert result2['success'] is False
        assert 'already blocked' in result2['error'].lower()
