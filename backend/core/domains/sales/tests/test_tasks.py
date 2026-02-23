"""
Unit tests for sales domain Celery tasks.

Tests:
- expire_sent_quotes task (quote expiration based on valid_until and event date)
- send_quote_expiry_reminders task (reminder emails for expiring quotes)
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.utils import timezone

import pytest
from freezegun import freeze_time

from core.domains.sales.models import (
    EventQuote,
    QuoteActivity,
    QuoteReminder,
)
from core.domains.sales.tasks import (
    expire_sent_quotes,
    send_quote_expiry_reminders,
)


@pytest.fixture
def admin_user(db, user_factory):
    """Create an admin user for testing."""
    return user_factory(admin=True)


@pytest.fixture
def client_user(db, user_factory):
    """Create a client user for testing."""
    return user_factory(role="CLIENT")


@pytest.fixture
def valid_sent_quote(db, event_factory, admin_user):
    """Create a valid sent quote (not expired)."""
    event = event_factory()
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="SENT",
        subtotal=Decimal("5000.00"),
        total_amount=Decimal("5000.00"),
        valid_until=timezone.now().date() + timedelta(days=30),
        sent_at=timezone.now(),
        created_by=admin_user,
    )


@pytest.fixture
def expired_by_date_quote(db, event_factory, admin_user):
    """Create a quote that expired by valid_until date."""
    event = event_factory()
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="SENT",
        subtotal=Decimal("5000.00"),
        total_amount=Decimal("5000.00"),
        valid_until=timezone.now().date() - timedelta(days=1),  # Expired yesterday
        sent_at=timezone.now() - timedelta(days=10),
        created_by=admin_user,
    )


@pytest.fixture
def expired_by_event_quote(db, event_factory, admin_user):
    """Create a quote where the event date has passed."""
    # Create event that happened yesterday
    event = event_factory(start_date=timezone.now() - timedelta(days=1))
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="SENT",
        subtotal=Decimal("5000.00"),
        total_amount=Decimal("5000.00"),
        valid_until=timezone.now().date() + timedelta(days=30),  # Still valid
        sent_at=timezone.now() - timedelta(days=5),
        created_by=admin_user,
    )


@pytest.fixture
def expiring_soon_quote(db, event_factory, admin_user):
    """Create a quote that expires within 3 days."""
    event = event_factory()
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="SENT",
        subtotal=Decimal("5000.00"),
        total_amount=Decimal("5000.00"),
        valid_until=timezone.now().date() + timedelta(days=2),  # Expires in 2 days
        sent_at=timezone.now() - timedelta(days=5),
        created_by=admin_user,
    )


@pytest.fixture
def accepted_quote(db, event_factory, admin_user):
    """Create an accepted quote (should not be expired)."""
    event = event_factory()
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="ACCEPTED",
        subtotal=Decimal("5000.00"),
        total_amount=Decimal("5000.00"),
        valid_until=timezone.now().date() - timedelta(days=1),  # Past valid_until
        sent_at=timezone.now() - timedelta(days=10),
        accepted_at=timezone.now() - timedelta(days=5),
        created_by=admin_user,
    )


@pytest.fixture
def draft_quote(db, event_factory, admin_user):
    """Create a draft quote (should not be expired)."""
    event = event_factory()
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="DRAFT",
        subtotal=Decimal("5000.00"),
        total_amount=Decimal("5000.00"),
        valid_until=timezone.now().date() - timedelta(days=1),  # Past valid_until
        created_by=admin_user,
    )


# =============================================================================
# EXPIRE SENT QUOTES TASK TESTS
# =============================================================================


@pytest.mark.django_db
class TestExpireSentQuotesTask:
    """Tests for the expire_sent_quotes Celery task."""

    def test_expires_quote_past_valid_until(self, expired_by_date_quote):
        """Test that quotes past valid_until are expired."""
        count = expire_sent_quotes()

        expired_by_date_quote.refresh_from_db()
        assert expired_by_date_quote.status == "EXPIRED"
        assert count >= 1

    def test_expires_quote_past_event_date(self, expired_by_event_quote):
        """Test that quotes past event date are expired."""
        count = expire_sent_quotes()

        expired_by_event_quote.refresh_from_db()
        assert expired_by_event_quote.status == "EXPIRED"
        assert count >= 1

    def test_does_not_expire_valid_quote(self, valid_sent_quote):
        """Test that valid quotes are not expired."""
        expire_sent_quotes()

        valid_sent_quote.refresh_from_db()
        assert valid_sent_quote.status == "SENT"

    def test_does_not_expire_accepted_quote(self, accepted_quote):
        """Test that accepted quotes are not expired."""
        expire_sent_quotes()

        accepted_quote.refresh_from_db()
        assert accepted_quote.status == "ACCEPTED"

    def test_does_not_expire_draft_quote(self, draft_quote):
        """Test that draft quotes are not expired."""
        expire_sent_quotes()

        draft_quote.refresh_from_db()
        assert draft_quote.status == "DRAFT"

    def test_creates_activity_record_on_expire(self, expired_by_date_quote):
        """Test that expiring a quote creates an activity record."""
        initial_count = QuoteActivity.objects.filter(quote=expired_by_date_quote, action="EXPIRED").count()

        expire_sent_quotes()

        new_count = QuoteActivity.objects.filter(quote=expired_by_date_quote, action="EXPIRED").count()
        assert new_count == initial_count + 1

    def test_activity_notes_validity_expired(self, expired_by_date_quote):
        """Test that activity notes mention validity expiration."""
        expire_sent_quotes()

        activity = QuoteActivity.objects.filter(quote=expired_by_date_quote, action="EXPIRED").first()

        assert activity is not None
        assert "validity expired" in activity.notes.lower() or "expired" in activity.notes.lower()

    def test_activity_notes_event_passed(self, expired_by_event_quote):
        """Test that activity notes mention event passed."""
        expire_sent_quotes()

        activity = QuoteActivity.objects.filter(quote=expired_by_event_quote, action="EXPIRED").first()

        assert activity is not None
        assert "occurred" in activity.notes.lower() or "event" in activity.notes.lower()

    def test_returns_count_of_expired_quotes(self, expired_by_date_quote, expired_by_event_quote, valid_sent_quote):
        """Test that the task returns the count of expired quotes."""
        count = expire_sent_quotes()

        # Should have expired at least 2 quotes
        assert count >= 2

    def test_handles_no_quotes_to_expire(self, valid_sent_quote):
        """Test task handles case with no quotes to expire."""
        count = expire_sent_quotes()

        assert count == 0

    @freeze_time("2024-01-15 10:00:00")
    def test_expiration_uses_current_date(self, db, event_factory, admin_user):
        """Test that expiration check uses current date."""
        event = event_factory()

        # Quote expires on 2024-01-14 (yesterday in frozen time)
        quote = EventQuote.objects.create(
            event=event,
            version=1,
            status="SENT",
            subtotal=Decimal("5000.00"),
            total_amount=Decimal("5000.00"),
            valid_until=timezone.datetime(2024, 1, 14).date(),
            sent_at=timezone.now() - timedelta(days=10),
            created_by=admin_user,
        )

        expire_sent_quotes()

        quote.refresh_from_db()
        assert quote.status == "EXPIRED"

    def test_multiple_quotes_expired(self, db, event_factory, admin_user):
        """Test expiring multiple quotes."""
        expired_quotes = []
        for i in range(3):
            event = event_factory()
            quote = EventQuote.objects.create(
                event=event,
                version=1,
                status="SENT",
                subtotal=Decimal("5000.00"),
                total_amount=Decimal("5000.00"),
                valid_until=timezone.now().date() - timedelta(days=i + 1),
                sent_at=timezone.now() - timedelta(days=10),
                created_by=admin_user,
            )
            expired_quotes.append(quote)

        count = expire_sent_quotes()

        assert count == 3
        for quote in expired_quotes:
            quote.refresh_from_db()
            assert quote.status == "EXPIRED"

    def test_handles_exception_gracefully(self, expired_by_date_quote):
        """Test that task handles exceptions and continues processing."""
        with patch.object(EventQuote, "save", side_effect=Exception("Save error")):
            # Should not raise, just log error
            count = expire_sent_quotes()

            # Count should be 0 since save failed
            assert count == 0


# =============================================================================
# SEND QUOTE EXPIRY REMINDERS TASK TESTS
# =============================================================================


@pytest.mark.django_db
class TestSendQuoteExpiryRemindersTask:
    """Tests for the send_quote_expiry_reminders Celery task."""

    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_sends_reminder_for_expiring_quote(self, mock_context, mock_comm, expiring_soon_quote):
        """Test that reminders are sent for quotes expiring within 3 days."""
        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_context.generate_context.return_value = {}

        count = send_quote_expiry_reminders()

        assert count >= 1

    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_creates_reminder_record(self, mock_context, mock_comm, expiring_soon_quote):
        """Test that a reminder record is created."""
        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_context.generate_context.return_value = {}

        send_quote_expiry_reminders()

        reminders = QuoteReminder.objects.filter(quote=expiring_soon_quote, is_sent=True)
        assert reminders.exists()

    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_reminder_marked_as_sent(self, mock_context, mock_comm, expiring_soon_quote):
        """Test that reminder is marked as sent."""
        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_context.generate_context.return_value = {}

        send_quote_expiry_reminders()

        reminder = QuoteReminder.objects.filter(quote=expiring_soon_quote).order_by("-created_at").first()

        assert reminder.is_sent is True
        assert reminder.sent_at is not None

    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_does_not_send_for_valid_quote(self, mock_context, mock_comm, valid_sent_quote):
        """Test that reminders are not sent for quotes not expiring soon."""
        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_context.generate_context.return_value = {}

        count = send_quote_expiry_reminders()

        # No reminder should be sent for quote expiring in 30 days
        assert count == 0

    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_does_not_send_duplicate_reminder(self, mock_context, mock_comm, expiring_soon_quote):
        """Test that duplicate reminders are not sent within 2 days."""
        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_context.generate_context.return_value = {}

        # Create a recent reminder
        QuoteReminder.objects.create(
            quote=expiring_soon_quote,
            scheduled_date=timezone.now(),
            is_sent=True,
            sent_at=timezone.now() - timedelta(days=1),  # Sent yesterday
            message="Recent reminder",
        )

        count = send_quote_expiry_reminders()

        # Should not send another reminder
        assert count == 0

    def test_sends_reminder_after_2_days(self, expiring_soon_quote, mocker):
        """Test that reminder is sent if previous was more than 2 days ago."""
        mock_comm_instance = MagicMock()
        mocker.patch("core.domains.communications.services.CommunicationService", return_value=mock_comm_instance)
        mocker.patch(
            "core.domains.communications.context_service.CommunicationContextService.generate_context", return_value={}
        )

        # Create an old reminder and backdate created_at (auto_now_add prevents direct set)
        old_reminder = QuoteReminder.objects.create(
            quote=expiring_soon_quote,
            scheduled_date=timezone.now() - timedelta(days=3),
            is_sent=True,
            sent_at=timezone.now() - timedelta(days=3),  # Sent 3 days ago
            message="Old reminder",
        )
        # Backdate created_at so it's not considered "recent" by the task
        QuoteReminder.objects.filter(pk=old_reminder.pk).update(created_at=timezone.now() - timedelta(days=3))

        count = send_quote_expiry_reminders()

        # Should send a new reminder
        assert count >= 1

    def test_uses_correct_template(self, expiring_soon_quote, mocker):
        """Test that the correct email template is used."""
        mock_comm_instance = MagicMock()
        mocker.patch("core.domains.communications.services.CommunicationService", return_value=mock_comm_instance)
        mocker.patch(
            "core.domains.communications.context_service.CommunicationContextService.generate_context", return_value={}
        )

        send_quote_expiry_reminders()

        # Verify send_communication was called with correct template
        # The task calls send_communication multiple times (client + admin notifications)
        # so check that at least one call used the client reminder template
        mock_comm_instance.send_communication.assert_called()
        template_names = [call[1]["template_name"] for call in mock_comm_instance.send_communication.call_args_list]
        assert "Quote Expiry Reminder" in template_names

    def test_sends_to_client_email(self, expiring_soon_quote, mocker):
        """Test that reminder is sent to client email."""
        mock_comm_instance = MagicMock()
        mocker.patch("core.domains.communications.services.CommunicationService", return_value=mock_comm_instance)
        mocker.patch(
            "core.domains.communications.context_service.CommunicationContextService.generate_context", return_value={}
        )

        send_quote_expiry_reminders()

        # The task calls send_communication multiple times (client + admin notifications)
        # Find the call that sent the client reminder (with 'Quote Expiry Reminder' template)
        client_email = expiring_soon_quote.event.client.email
        recipients = [call[1]["recipient"] for call in mock_comm_instance.send_communication.call_args_list]
        assert client_email in recipients

    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_does_not_send_for_expired_quote(self, mock_context, mock_comm, expired_by_date_quote):
        """Test that reminders are not sent for already expired quotes."""
        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_context.generate_context.return_value = {}

        count = send_quote_expiry_reminders()

        # Already expired, no reminder needed
        assert count == 0

    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_does_not_send_for_accepted_quote(self, mock_context, mock_comm, accepted_quote):
        """Test that reminders are not sent for accepted quotes."""
        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_context.generate_context.return_value = {}

        count = send_quote_expiry_reminders()

        assert count == 0

    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_handles_client_without_email(self, mock_context, mock_comm, expiring_soon_quote):
        """Test handling of client without email."""
        # Remove client email
        client = expiring_soon_quote.event.client
        client.email = ""
        client.save()

        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_context.generate_context.return_value = {}

        # Should not raise error
        send_quote_expiry_reminders()

        # Should not send (no email)
        mock_comm_instance.send_communication.assert_not_called()

    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_handles_send_error_gracefully(self, mock_context, mock_comm, expiring_soon_quote):
        """Test that send errors are handled gracefully."""
        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_comm_instance.send_communication.side_effect = Exception("Send error")
        mock_context.generate_context.return_value = {}

        # Should not raise
        count = send_quote_expiry_reminders()

        # Count should be 0 since send failed
        assert count == 0

    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_uses_async_send(self, mock_context, mock_comm, expiring_soon_quote):
        """Test that async sending is used."""
        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_context.generate_context.return_value = {}

        send_quote_expiry_reminders()

        call_kwargs = mock_comm_instance.send_communication.call_args
        assert call_kwargs[1]["use_async"] is True

    @freeze_time("2024-01-15 10:00:00")
    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_expiry_threshold_calculation(self, mock_context, mock_comm, db, event_factory, admin_user):
        """Test that 3-day expiry threshold is calculated correctly."""
        event = event_factory()

        # Quote expires on 2024-01-18 (in 3 days)
        EventQuote.objects.create(
            event=event,
            version=1,
            status="SENT",
            subtotal=Decimal("5000.00"),
            total_amount=Decimal("5000.00"),
            valid_until=timezone.datetime(2024, 1, 18).date(),
            sent_at=timezone.now() - timedelta(days=5),
            created_by=admin_user,
        )

        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_context.generate_context.return_value = {}

        count = send_quote_expiry_reminders()

        # Should be included in expiring quotes (within 3 days)
        assert count >= 1

    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_multiple_expiring_quotes(self, mock_context, mock_comm, db, event_factory, admin_user):
        """Test sending reminders for multiple expiring quotes."""
        quotes = []
        for i in range(3):
            event = event_factory()
            quote = EventQuote.objects.create(
                event=event,
                version=1,
                status="SENT",
                subtotal=Decimal("5000.00"),
                total_amount=Decimal("5000.00"),
                valid_until=timezone.now().date() + timedelta(days=i + 1),
                sent_at=timezone.now() - timedelta(days=5),
                created_by=admin_user,
            )
            quotes.append(quote)

        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_context.generate_context.return_value = {}

        count = send_quote_expiry_reminders()

        assert count == 3

    def test_returns_correct_count(self, expiring_soon_quote, mocker):
        """Test that the task returns correct count of reminders sent."""
        mock_comm_instance = MagicMock()
        mocker.patch("core.domains.communications.services.CommunicationService", return_value=mock_comm_instance)
        mocker.patch(
            "core.domains.communications.context_service.CommunicationContextService.generate_context", return_value={}
        )

        count = send_quote_expiry_reminders()

        assert isinstance(count, int)
        assert count >= 1


@pytest.mark.django_db
class TestTaskIntegration:
    """Integration tests for tasks working together."""

    @patch("core.domains.communications.services.CommunicationService")
    @patch("core.domains.communications.context_service.CommunicationContextService")
    def test_expire_before_reminder(self, mock_context, mock_comm, db, event_factory, admin_user):
        """Test that expired quotes don't get reminders."""
        event = event_factory()

        # Quote that should be expired
        quote = EventQuote.objects.create(
            event=event,
            version=1,
            status="SENT",
            subtotal=Decimal("5000.00"),
            total_amount=Decimal("5000.00"),
            valid_until=timezone.now().date() - timedelta(days=1),
            sent_at=timezone.now() - timedelta(days=10),
            created_by=admin_user,
        )

        mock_comm_instance = MagicMock()
        mock_comm.return_value = mock_comm_instance
        mock_context.generate_context.return_value = {}

        # First expire quotes
        expire_sent_quotes()

        # Then try to send reminders
        reminder_count = send_quote_expiry_reminders()

        # Quote should be expired, not reminded
        quote.refresh_from_db()
        assert quote.status == "EXPIRED"
        assert reminder_count == 0

    def test_task_isolation(self, valid_sent_quote, expired_by_date_quote, expiring_soon_quote):
        """Test that tasks process correct subsets of quotes."""
        # Expire task should only affect expired quotes
        expire_sent_quotes()

        valid_sent_quote.refresh_from_db()
        expired_by_date_quote.refresh_from_db()
        expiring_soon_quote.refresh_from_db()

        assert valid_sent_quote.status == "SENT"
        assert expired_by_date_quote.status == "EXPIRED"
        assert expiring_soon_quote.status == "SENT"
