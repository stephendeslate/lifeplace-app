"""
Unit tests for events domain Celery tasks.

Tests:
- check_downpayment_deadline
- daily_deadline_sweep
- send_deadline_reminder
- schedule_deadline_reminders
- notify_competing_event_cancelled
- expire_date_holds
- send_hold_expired_notification
- send_hold_expiring_soon_reminders
- send_hold_expiring_reminder
- send_event_date_reminder
- schedule_event_date_reminders
- cleanup_expired_reservations
"""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from freezegun import freeze_time

from core.domains.events.models import (
    Event,
    EventDateReminder,
    DateReservation,
)
from core.domains.events.tasks import (
    check_downpayment_deadline,
    daily_deadline_sweep,
    send_deadline_reminder,
    schedule_deadline_reminders,
    notify_competing_event_cancelled,
    expire_date_holds,
    send_hold_expired_notification,
    send_hold_expiring_soon_reminders,
    send_hold_expiring_reminder,
    send_event_date_reminder,
    schedule_event_date_reminders,
    cleanup_expired_reservations,
)


# =============================================================================
# check_downpayment_deadline Tests
# =============================================================================


@pytest.mark.django_db
class TestCheckDownpaymentDeadline:
    """Tests for check_downpayment_deadline task."""

    def test_skip_already_cancelled_event(self, event_factory):
        """Test task skips already cancelled events."""
        event = event_factory(cancelled=True)

        result = check_downpayment_deadline(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'already_cancelled'

    def test_skip_already_date_blocked(self, event_factory):
        """Test task skips events with date already blocked."""
        event = event_factory(date_blocked_trait=True)

        result = check_downpayment_deadline(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'date_already_blocked'

    def test_skip_no_deadline_set(self, event_factory):
        """Test task skips events without deadline."""
        event = event_factory()
        event.downpayment_deadline = None
        event.save()

        result = check_downpayment_deadline(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'no_deadline_set'

    @freeze_time('2025-01-15 10:00:00')
    def test_cancel_unpaid_past_deadline(self, event_factory):
        """Test task cancels unpaid event past deadline."""
        event = event_factory(
            confirmed=True,
            payment_status='UNPAID',
        )
        event.downpayment_deadline = datetime(2025, 1, 15, 9, 0)  # 1 hour ago
        event.save()

        with patch(
            'core.domains.events.services.date_blocking_service.DateBlockingService.cancel_event_for_timeout'
        ) as mock_cancel:
            result = check_downpayment_deadline(event.id)

        assert result['status'] == 'cancelled'
        assert result['reason'] == 'payment_timeout'
        mock_cancel.assert_called_once()

    @freeze_time('2025-01-15 10:00:00')
    def test_skip_paid_past_deadline(self, event_factory):
        """Test task skips paid events past deadline."""
        event = event_factory(
            confirmed=True,
            paid=True,
        )
        event.downpayment_deadline = datetime(2025, 1, 15, 9, 0)
        event.save()

        result = check_downpayment_deadline(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'payment_received'
        assert result['payment_status'] == 'PAID'

    @freeze_time('2025-01-15 10:00:00')
    def test_skip_deadline_not_reached(self, event_factory):
        """Test task skips if deadline not yet reached."""
        event = event_factory(
            confirmed=True,
            payment_status='UNPAID',
        )
        event.downpayment_deadline = datetime(2025, 1, 15, 11, 0)  # 1 hour from now
        event.save()

        result = check_downpayment_deadline(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'deadline_not_reached'

    def test_event_not_found(self):
        """Test task handles nonexistent event."""
        result = check_downpayment_deadline(999999)

        assert result['status'] == 'error'
        assert result['reason'] == 'event_not_found'


# =============================================================================
# daily_deadline_sweep Tests
# =============================================================================


@pytest.mark.django_db
class TestDailyDeadlineSweep:
    """Tests for daily_deadline_sweep task."""

    @freeze_time('2025-01-15 10:00:00')
    def test_sweep_finds_expired_events(self, event_factory):
        """Test sweep finds and cancels expired events."""
        # Create expired unpaid event
        event = event_factory(
            confirmed=True,
            payment_status='UNPAID',
            date_blocked=False,
        )
        event.downpayment_deadline = datetime(2025, 1, 14, 12, 0)  # Yesterday
        event.save()

        with patch(
            'core.domains.events.services.date_blocking_service.DateBlockingService.cancel_event_for_timeout'
        ) as mock_cancel:
            result = daily_deadline_sweep()

        assert result['total'] >= 1
        assert result['cancelled'] >= 1
        mock_cancel.assert_called()

    @freeze_time('2025-01-15 10:00:00')
    def test_sweep_skips_paid_events(self, event_factory):
        """Test sweep skips events with payment received."""
        event = event_factory(
            confirmed=True,
            paid=True,
            date_blocked=False,
        )
        event.downpayment_deadline = datetime(2025, 1, 14, 12, 0)
        event.save()

        result = daily_deadline_sweep()

        # Paid event should not be in the list
        assert result['cancelled'] == 0

    @freeze_time('2025-01-15 10:00:00')
    def test_sweep_handles_errors(self, event_factory, mocker):
        """Test sweep handles individual event errors."""
        event = event_factory(
            confirmed=True,
            payment_status='UNPAID',
            date_blocked=False,
        )
        event.downpayment_deadline = datetime(2025, 1, 14, 12, 0)
        event.save()

        # Make cancel raise an exception
        mocker.patch(
            'core.domains.events.services.date_blocking_service.DateBlockingService.cancel_event_for_timeout',
            side_effect=Exception('Cancel failed'),
        )

        result = daily_deadline_sweep()

        assert result['errors'] >= 1


# =============================================================================
# send_deadline_reminder Tests
# =============================================================================


@pytest.mark.django_db
class TestSendDeadlineReminder:
    """Tests for send_deadline_reminder task."""

    def test_skip_cancelled_event(self, event_factory):
        """Test reminder skips cancelled events."""
        event = event_factory(cancelled=True)
        event.downpayment_deadline = timezone.now() + timedelta(days=1)
        event.save()

        result = send_deadline_reminder(event.id, days_before_deadline=1)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'cancelled_or_blocked'

    def test_skip_paid_event(self, event_factory):
        """Test reminder skips paid events."""
        event = event_factory(paid=True)
        event.downpayment_deadline = timezone.now() + timedelta(days=1)
        event.save()

        result = send_deadline_reminder(event.id, days_before_deadline=1)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'payment_received'

    def test_skip_no_deadline(self, event_factory):
        """Test reminder skips events without deadline."""
        event = event_factory(payment_status='UNPAID')
        event.downpayment_deadline = None
        event.save()

        result = send_deadline_reminder(event.id, days_before_deadline=1)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'no_deadline'

    def test_send_reminder_success(self, event_factory):
        """Test successful reminder sending."""
        event = event_factory(confirmed=True, payment_status='UNPAID')
        event.downpayment_deadline = timezone.now() + timedelta(days=1)
        event.save()

        with patch(
            'core.domains.notifications.services.NotificationService.create_notification'
        ) as mock_notify:
            mock_notify.return_value = MagicMock()

            result = send_deadline_reminder(event.id, days_before_deadline=1)

        assert result['status'] == 'sent'
        assert result['event_id'] == event.id
        mock_notify.assert_called_once()

    def test_event_not_found(self):
        """Test reminder handles nonexistent event."""
        result = send_deadline_reminder(999999, days_before_deadline=1)

        assert result['status'] == 'error'
        assert result['reason'] == 'event_not_found'


# =============================================================================
# schedule_deadline_reminders Tests
# =============================================================================


@pytest.mark.django_db
class TestScheduleDeadlineReminders:
    """Tests for schedule_deadline_reminders task."""

    @freeze_time('2025-01-15 10:00:00')
    def test_schedule_reminders_for_upcoming_deadlines(self, event_factory):
        """Test scheduling reminders for events with upcoming deadlines."""
        # Create event with deadline in 3 days
        event = event_factory(
            confirmed=True,
            payment_status='UNPAID',
            date_blocked=False,
        )
        event.downpayment_deadline = datetime(2025, 1, 18, 12, 0)  # 3 days from now
        event.save()

        with patch(
            'core.domains.events.tasks.send_deadline_reminder.delay'
        ) as mock_delay:
            result = schedule_deadline_reminders()

        assert result['scheduled'] >= 1
        mock_delay.assert_called()


# =============================================================================
# notify_competing_event_cancelled Tests
# =============================================================================


@pytest.mark.django_db
class TestNotifyCompetingEventCancelled:
    """Tests for notify_competing_event_cancelled task."""

    def test_send_cancellation_notification(self, event_factory, user_factory):
        """Test sending cancellation notification."""
        client = user_factory()
        cancelled_event = event_factory(client=client)
        blocking_event = event_factory()

        with patch(
            'core.domains.notifications.services.NotificationService.create_notification'
        ) as mock_notify:
            mock_notify.return_value = MagicMock()

            result = notify_competing_event_cancelled(
                cancelled_event.id,
                blocking_event.id,
            )

        assert result['status'] == 'sent'
        mock_notify.assert_called_once()
        call_kwargs = mock_notify.call_args[1]
        assert call_kwargs['notification_type'] == 'EVENT_CANCELLED'
        assert call_kwargs['recipient'] == client

    def test_event_not_found(self):
        """Test handling nonexistent events."""
        result = notify_competing_event_cancelled(999999, 888888)

        assert result['status'] == 'error'
        assert result['reason'] == 'event_not_found'


# =============================================================================
# expire_date_holds Tests
# =============================================================================


@pytest.mark.django_db
class TestExpireDateHolds:
    """Tests for expire_date_holds task."""

    @freeze_time('2025-01-15 10:00:00')
    def test_expire_temporary_holds(self, event_factory):
        """Test expiring temporary date holds."""
        event = event_factory(
            confirmed=True,
            temporary_hold=True,
        )
        # Set hold to have expired
        event.date_hold_expires_at = datetime(2025, 1, 15, 9, 0)  # 1 hour ago
        event.save()

        with patch(
            'core.domains.events.services.date_holding_service.DateHoldingService.release_hold'
        ) as mock_release:
            with patch(
                'core.domains.events.tasks.send_hold_expired_notification.delay'
            ) as mock_notify:
                result = expire_date_holds()

        assert result['total'] >= 1
        assert result['expired'] >= 1
        mock_release.assert_called()
        mock_notify.assert_called()

    @freeze_time('2025-01-15 10:00:00')
    def test_skip_non_expired_holds(self, event_factory):
        """Test skipping non-expired holds."""
        event = event_factory(
            confirmed=True,
            temporary_hold=True,
        )
        # Set hold to expire in the future
        event.date_hold_expires_at = datetime(2025, 1, 16, 10, 0)  # Tomorrow
        event.save()

        with patch(
            'core.domains.events.services.date_holding_service.DateHoldingService.release_hold'
        ) as mock_release:
            result = expire_date_holds()

        mock_release.assert_not_called()


# =============================================================================
# send_hold_expired_notification Tests
# =============================================================================


@pytest.mark.django_db
class TestSendHoldExpiredNotification:
    """Tests for send_hold_expired_notification task."""

    def test_send_notification_success(self, event_factory, user_factory):
        """Test sending hold expiration notification."""
        client = user_factory()
        event = event_factory(client=client)

        with patch(
            'core.domains.notifications.services.NotificationService.create_notification'
        ) as mock_notify:
            mock_notify.return_value = MagicMock()

            result = send_hold_expired_notification(event.id)

        assert result['status'] == 'sent'
        mock_notify.assert_called_once()
        call_kwargs = mock_notify.call_args[1]
        assert call_kwargs['notification_type'] == 'DATE_HOLD_EXPIRED'

    def test_event_not_found(self):
        """Test handling nonexistent event."""
        result = send_hold_expired_notification(999999)

        assert result['status'] == 'error'
        assert result['reason'] == 'event_not_found'


# =============================================================================
# send_hold_expiring_soon_reminders Tests
# =============================================================================


@pytest.mark.django_db
class TestSendHoldExpiringSoonReminders:
    """Tests for send_hold_expiring_soon_reminders task."""

    @freeze_time('2025-01-15 10:00:00')
    def test_schedule_reminders_for_expiring_holds(self, event_factory):
        """Test scheduling reminders for holds expiring soon."""
        event = event_factory(
            confirmed=True,
            temporary_hold=True,
        )
        # Hold expires in 12 hours (within 24 hour threshold)
        event.date_hold_expires_at = datetime(2025, 1, 15, 22, 0)
        event.save()

        with patch(
            'core.domains.events.tasks.send_hold_expiring_reminder.delay'
        ) as mock_delay:
            result = send_hold_expiring_soon_reminders()

        assert result['scheduled'] >= 1
        mock_delay.assert_called_with(event.id)


# =============================================================================
# send_hold_expiring_reminder Tests
# =============================================================================


@pytest.mark.django_db
class TestSendHoldExpiringReminder:
    """Tests for send_hold_expiring_reminder task."""

    @freeze_time('2025-01-15 10:00:00')
    def test_send_reminder_success(self, event_factory, user_factory):
        """Test sending hold expiring reminder."""
        client = user_factory()
        event = event_factory(
            client=client,
            confirmed=True,
            temporary_hold=True,
        )
        event.date_hold_expires_at = datetime(2025, 1, 15, 22, 0)  # 12 hours from now
        event.save()

        with patch(
            'core.domains.notifications.services.NotificationService.create_notification'
        ) as mock_notify:
            mock_notify.return_value = MagicMock()

            result = send_hold_expiring_reminder(event.id)

        assert result['status'] == 'sent'
        assert result['hours_remaining'] == 12
        mock_notify.assert_called_once()

    def test_skip_not_held(self, event_factory):
        """Test skipping event not held."""
        event = event_factory()
        event.date_hold_status = 'NONE'
        event.save()

        result = send_hold_expiring_reminder(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'not_held'

    def test_event_not_found(self):
        """Test handling nonexistent event."""
        result = send_hold_expiring_reminder(999999)

        assert result['status'] == 'error'
        assert result['reason'] == 'event_not_found'


# =============================================================================
# send_event_date_reminder Tests
# =============================================================================


@pytest.mark.django_db
class TestSendEventDateReminder:
    """Tests for send_event_date_reminder task."""

    def test_skip_cancelled_event(self, event_factory):
        """Test reminder skips cancelled events."""
        event = event_factory(cancelled=True)

        result = send_event_date_reminder(event.id, days_before_event=7)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'event_cancelled'

    def test_skip_already_sent(self, event_factory):
        """Test reminder skips if already sent."""
        event = event_factory()

        # Create existing reminder record
        EventDateReminder.objects.create(
            event=event,
            days_before=7,
        )

        result = send_event_date_reminder(event.id, days_before_event=7)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'already_sent'

    @pytest.mark.skip(reason="Event.client is now NOT NULL - events always have a client")
    def test_skip_no_client(self, event_factory, user_factory, mocker):
        """Test reminder skips events without client.

        Note: This test is obsolete as Event.client is now a required field (NOT NULL).
        Events are always created with a client.
        """
        pass

    def test_skip_no_booking_flow(self, event_factory):
        """Test reminder skips if no booking flow found."""
        event = event_factory()

        result = send_event_date_reminder(event.id, days_before_event=7)

        assert result['status'] == 'skipped'
        assert result['reason'] in ['no_booking_flow', 'no_client']

    def test_event_not_found(self):
        """Test handling nonexistent event."""
        result = send_event_date_reminder(999999, days_before_event=7)

        assert result['status'] == 'error'
        assert result['reason'] == 'event_not_found'


# =============================================================================
# schedule_event_date_reminders Tests
# =============================================================================


@pytest.mark.django_db
class TestScheduleEventDateReminders:
    """Tests for schedule_event_date_reminders task."""

    @freeze_time('2025-01-15 10:00:00')
    def test_schedule_reminders(self, event_factory, user_factory):
        """Test scheduling event date reminders."""
        client = user_factory()

        # Create event starting in 7 days
        event_date = timezone.now() + timedelta(days=7)
        event = event_factory(
            client=client,
            confirmed=True,
            start_date=event_date,
        )

        with patch(
            'core.domains.events.tasks.send_event_date_reminder.delay'
        ) as mock_delay:
            result = schedule_event_date_reminders()

        # Result depends on whether booking flow exists
        assert 'scheduled' in result
        assert 'skipped' in result


# =============================================================================
# cleanup_expired_reservations Tests
# =============================================================================


@pytest.mark.django_db
class TestCleanupExpiredReservations:
    """Tests for cleanup_expired_reservations task."""

    def test_cleanup_expired_reservations(self):
        """Test cleaning up expired reservations."""
        # Create an expired reservation
        target_date = timezone.now().date() + timedelta(days=30)
        DateReservation.objects.create(
            target_date=target_date,
            booking_session_id='test-session',
            status='PENDING',
            expires_at=timezone.now() - timedelta(minutes=10),  # Expired
        )

        with patch(
            'core.domains.events.services.AtomicAvailabilityService.cleanup_expired_reservations'
        ) as mock_cleanup:
            mock_cleanup.return_value = 1

            with patch(
                'core.domains.events.services.websocket_service.AvailabilityWebSocketService.broadcast_reservation_released'
            ) as mock_broadcast:
                result = cleanup_expired_reservations()

        assert 'expired_count' in result
        mock_cleanup.assert_called_once()

    def test_cleanup_handles_errors(self, mocker):
        """Test cleanup handles errors gracefully."""
        mocker.patch(
            'core.domains.events.services.AtomicAvailabilityService.cleanup_expired_reservations',
            side_effect=Exception('Database error'),
        )

        result = cleanup_expired_reservations()

        assert result['expired_count'] == 0
        assert 'error' in result


# =============================================================================
# Integration Tests
# =============================================================================


@pytest.mark.django_db
class TestTaskIntegration:
    """Integration tests for Celery tasks."""

    @freeze_time('2025-01-15 10:00:00')
    def test_full_deadline_workflow(self, event_factory, user_factory):
        """Test complete deadline checking workflow."""
        client = user_factory()

        # Create event with deadline that will expire
        event = event_factory(
            client=client,
            confirmed=True,
            payment_status='UNPAID',
            date_blocked=False,
        )
        event.downpayment_deadline = datetime(2025, 1, 14, 12, 0)  # Yesterday
        event.save()

        # First, run the daily sweep
        with patch(
            'core.domains.events.services.date_blocking_service.DateBlockingService.cancel_event_for_timeout'
        ) as mock_cancel:
            result = daily_deadline_sweep()

        assert result['total'] >= 1
        mock_cancel.assert_called()

    @freeze_time('2025-01-15 10:00:00')
    def test_full_hold_expiration_workflow(self, event_factory, user_factory):
        """Test complete hold expiration workflow."""
        client = user_factory()

        # Create event with expired hold
        event = event_factory(
            client=client,
            confirmed=True,
            temporary_hold=True,
        )
        event.date_hold_expires_at = datetime(2025, 1, 15, 9, 0)  # 1 hour ago
        event.save()

        # Run hold expiration
        with patch(
            'core.domains.events.services.date_holding_service.DateHoldingService.release_hold'
        ) as mock_release:
            with patch(
                'core.domains.events.tasks.send_hold_expired_notification.delay'
            ) as mock_notify:
                result = expire_date_holds()

        assert result['expired'] >= 1
        mock_release.assert_called()
        mock_notify.assert_called_with(event.id)
