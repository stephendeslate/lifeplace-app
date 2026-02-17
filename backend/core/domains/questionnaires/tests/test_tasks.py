"""
Unit tests for questionnaires domain Celery tasks.

Tests:
- send_questionnaire_reminder task
- notify_questionnaire_completed task
- notify_admin_questionnaire_submission task
- schedule_questionnaire_reminders task
- check_questionnaire_completion task
"""

import pytest
from datetime import timedelta
from unittest.mock import patch, MagicMock

from django.utils import timezone
from freezegun import freeze_time

from core.domains.questionnaires.tasks import (
    send_questionnaire_reminder,
    notify_questionnaire_completed,
    notify_admin_questionnaire_submission,
    schedule_questionnaire_reminders,
    check_questionnaire_completion,
    _get_reminder_count,
    _increment_reminder_count,
    _get_reminder_count_key,
    MAX_REMINDERS_PER_EVENT,
)


@pytest.mark.django_db
class TestSendQuestionnaireReminder:
    """Unit tests for send_questionnaire_reminder task."""

    def test_reminder_event_not_found(self, mocker):
        """Test reminder skips when event not found."""
        result = send_questionnaire_reminder(99999)

        assert result['status'] == 'error'
        assert result['reason'] == 'event_not_found'

    def test_reminder_no_client(self, mocker, event_factory):
        """Test reminder skips when event has no client."""
        event = event_factory()
        # Simulate missing client by patching the query result
        mock_event = mocker.MagicMock()
        mock_event.id = event.id
        mock_event.client = None
        mock_event.status = event.status
        mock_qs = mocker.patch(
            'core.domains.events.models.Event.objects.select_related',
        )
        mock_qs.return_value.get.return_value = mock_event

        result = send_questionnaire_reminder(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'no_client'

    def test_reminder_event_cancelled(self, mocker, event_factory, user_factory):
        """Test reminder skips when event is cancelled."""
        client = user_factory(role='CLIENT')
        event = event_factory(client=client, status='CANCELLED')

        result = send_questionnaire_reminder(event.id)

        assert result['status'] == 'skipped'
        assert 'cancelled' in result['reason'].lower()

    def test_reminder_event_completed(self, mocker, event_factory, user_factory):
        """Test reminder skips when event is completed."""
        client = user_factory(role='CLIENT')
        event = event_factory(client=client, status='COMPLETED')

        result = send_questionnaire_reminder(event.id)

        assert result['status'] == 'skipped'
        assert 'completed' in result['reason'].lower()

    def test_reminder_no_questionnaire(
        self, mocker, event_factory, user_factory, event_type_factory
    ):
        """Test reminder skips when no questionnaire found."""
        client = user_factory(role='CLIENT')
        event_type = event_type_factory()
        event = event_factory(client=client, event_type=event_type, status='CONFIRMED')

        result = send_questionnaire_reminder(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'no_questionnaire'

    def test_reminder_already_complete(
        self, mocker, event_factory, user_factory, event_type_factory,
        questionnaire_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test reminder skips when questionnaire is already complete."""
        client = user_factory(role='CLIENT')
        event_type = event_type_factory()
        event = event_factory(client=client, event_type=event_type, status='CONFIRMED')

        questionnaire = questionnaire_factory(event_type=event_type, is_active=True)
        field = questionnaire_field_factory(questionnaire=questionnaire, required=True)

        # Create response for the required field
        questionnaire_response_factory(event=event, field=field, value='Complete answer')

        result = send_questionnaire_reminder(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'already_complete'

    def test_reminder_sent_successfully(
        self, mocker, event_factory, user_factory, event_type_factory,
        questionnaire_factory, questionnaire_field_factory, clear_cache
    ):
        """Test reminder is sent successfully."""
        mock_notification = mocker.patch(
            'core.domains.notifications.services.NotificationService.create_notification'
        )

        client = user_factory(role='CLIENT')
        event_type = event_type_factory()
        event = event_factory(
            client=client,
            event_type=event_type,
            status='CONFIRMED',
            start_date=timezone.now() + timedelta(days=14)
        )

        questionnaire = questionnaire_factory(event_type=event_type, is_active=True)
        questionnaire_field_factory(questionnaire=questionnaire, required=True)

        result = send_questionnaire_reminder(event.id)

        assert result['status'] == 'sent'
        assert result['event_id'] == event.id
        assert result['missing_fields'] == 1
        assert result['reminder_number'] == 1
        mock_notification.assert_called_once()

    def test_reminder_max_reminders_reached(
        self, mocker, event_factory, user_factory, event_type_factory,
        questionnaire_factory, questionnaire_field_factory
    ):
        """Test reminder skips when max reminders reached."""
        # Mock cache to return max reminders
        mocker.patch(
            'core.domains.questionnaires.tasks._get_reminder_count',
            return_value=MAX_REMINDERS_PER_EVENT
        )

        client = user_factory(role='CLIENT')
        event_type = event_type_factory()
        event = event_factory(client=client, event_type=event_type, status='CONFIRMED')

        questionnaire = questionnaire_factory(event_type=event_type, is_active=True)
        questionnaire_field_factory(questionnaire=questionnaire, required=True)

        result = send_questionnaire_reminder(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'max_reminders_reached'


@pytest.mark.django_db
class TestNotifyQuestionnaireCompleted:
    """Unit tests for notify_questionnaire_completed task."""

    def test_completion_notification_event_not_found(self, mocker):
        """Test completion notification skips when event not found."""
        result = notify_questionnaire_completed(99999)

        assert result['status'] == 'error'
        assert result['reason'] == 'event_not_found'

    def test_completion_notification_no_client(self, mocker, event_factory):
        """Test completion notification skips when no client."""
        event = event_factory()
        # Simulate missing client by patching the query result
        mock_event = mocker.MagicMock()
        mock_event.id = event.id
        mock_event.client = None
        mock_event.status = event.status
        mock_qs = mocker.patch(
            'core.domains.events.models.Event.objects.select_related',
        )
        mock_qs.return_value.get.return_value = mock_event

        result = notify_questionnaire_completed(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'no_client'

    def test_completion_notification_sent(self, mocker, event_factory, user_factory):
        """Test completion notification is sent successfully."""
        mock_notification = mocker.patch(
            'core.domains.notifications.services.NotificationService.create_notification'
        )

        client = user_factory(role='CLIENT')
        event = event_factory(
            client=client,
            start_date=timezone.now() + timedelta(days=14)
        )

        result = notify_questionnaire_completed(event.id)

        assert result['status'] == 'sent'
        assert result['event_id'] == event.id
        mock_notification.assert_called_once()


@pytest.mark.django_db
class TestNotifyAdminQuestionnaireSubmission:
    """Unit tests for notify_admin_questionnaire_submission task."""

    def test_admin_notification_event_not_found(self, mocker):
        """Test admin notification skips when event not found."""
        result = notify_admin_questionnaire_submission(99999)

        assert result['status'] == 'error'
        assert result['reason'] == 'event_not_found'

    def test_admin_notification_no_admin_users(
        self, mocker, event_factory, user_factory
    ):
        """Test admin notification skips when no admin users exist."""
        client = user_factory(role='CLIENT')
        event = event_factory(client=client)

        result = notify_admin_questionnaire_submission(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'no_admin_users'

    def test_admin_notification_sent(
        self, mocker, event_factory, user_factory, event_type_factory
    ):
        """Test admin notification is sent successfully."""
        mock_notification = mocker.patch(
            'core.domains.notifications.services.NotificationService.create_notification'
        )

        client = user_factory(role='CLIENT')
        admin = user_factory(role='ADMIN', is_active=True)
        event_type = event_type_factory(name='Wedding')
        event = event_factory(
            client=client,
            event_type=event_type,
            start_date=timezone.now() + timedelta(days=14)
        )

        # Reset mock after event creation (which triggers EVENT_CREATED notification)
        mock_notification.reset_mock()

        result = notify_admin_questionnaire_submission(event.id)

        assert result['status'] == 'sent'
        assert result['event_id'] == event.id
        assert result['admins_notified'] == 1
        mock_notification.assert_called_once()

    def test_admin_notification_multiple_admins(
        self, mocker, event_factory, user_factory
    ):
        """Test admin notification is sent to multiple admins."""
        mock_notification = mocker.patch(
            'core.domains.notifications.services.NotificationService.create_notification'
        )

        client = user_factory(role='CLIENT')
        user_factory(role='ADMIN', is_active=True)
        user_factory(role='ADMIN', is_active=True)
        event = event_factory(client=client)

        # Reset mock after event creation (which triggers EVENT_CREATED notification)
        mock_notification.reset_mock()

        result = notify_admin_questionnaire_submission(event.id)

        assert result['status'] == 'sent'
        assert result['admins_notified'] == 2
        assert mock_notification.call_count == 2


@pytest.mark.django_db
class TestScheduleQuestionnaireReminders:
    """Unit tests for schedule_questionnaire_reminders task."""

    @freeze_time('2024-06-15 10:00:00')
    def test_schedule_no_events(self, mocker):
        """Test scheduling with no upcoming events."""
        result = schedule_questionnaire_reminders()

        assert result['scheduled'] == 0

    @freeze_time('2024-06-15 10:00:00')
    def test_schedule_upcoming_event_incomplete_questionnaire(
        self, mocker, event_factory, user_factory, event_type_factory,
        questionnaire_factory, questionnaire_field_factory, clear_cache
    ):
        """Test scheduling reminder for event with incomplete questionnaire."""
        mock_send_reminder = mocker.patch(
            'core.domains.questionnaires.tasks.send_questionnaire_reminder.delay'
        )

        client = user_factory(role='CLIENT')
        event_type = event_type_factory()
        # Event in 10 days - should trigger reminder (21 days check, reminder_count < 1)
        event = event_factory(
            client=client,
            event_type=event_type,
            status='CONFIRMED',
            start_date=timezone.now() + timedelta(days=10)
        )

        questionnaire = questionnaire_factory(event_type=event_type, is_active=True)
        questionnaire_field_factory(questionnaire=questionnaire, required=True)

        result = schedule_questionnaire_reminders()

        assert result['scheduled'] == 1
        mock_send_reminder.assert_called_once_with(event.id, 'incomplete')

    @freeze_time('2024-06-15 10:00:00')
    def test_schedule_event_too_far_away(
        self, mocker, event_factory, user_factory, event_type_factory,
        questionnaire_factory, questionnaire_field_factory
    ):
        """Test no reminder scheduled for event more than 30 days away."""
        mock_send_reminder = mocker.patch(
            'core.domains.questionnaires.tasks.send_questionnaire_reminder.delay'
        )

        client = user_factory(role='CLIENT')
        event_type = event_type_factory()
        # Event in 45 days - outside 30 day window
        event = event_factory(
            client=client,
            event_type=event_type,
            status='CONFIRMED',
            start_date=timezone.now() + timedelta(days=45)
        )

        questionnaire = questionnaire_factory(event_type=event_type, is_active=True)
        questionnaire_field_factory(questionnaire=questionnaire, required=True)

        result = schedule_questionnaire_reminders()

        assert result['scheduled'] == 0
        mock_send_reminder.assert_not_called()

    @freeze_time('2024-06-15 10:00:00')
    def test_schedule_event_complete_questionnaire(
        self, mocker, event_factory, user_factory, event_type_factory,
        questionnaire_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test no reminder scheduled for event with complete questionnaire."""
        mock_send_reminder = mocker.patch(
            'core.domains.questionnaires.tasks.send_questionnaire_reminder.delay'
        )

        client = user_factory(role='CLIENT')
        event_type = event_type_factory()
        event = event_factory(
            client=client,
            event_type=event_type,
            status='CONFIRMED',
            start_date=timezone.now() + timedelta(days=14)
        )

        questionnaire = questionnaire_factory(event_type=event_type, is_active=True)
        field = questionnaire_field_factory(questionnaire=questionnaire, required=True)

        # Complete the questionnaire
        questionnaire_response_factory(event=event, field=field, value='Complete')

        result = schedule_questionnaire_reminders()

        assert result['scheduled'] == 0
        mock_send_reminder.assert_not_called()


@pytest.mark.django_db
class TestCheckQuestionnaireCompletion:
    """Unit tests for check_questionnaire_completion task."""

    def test_check_completion_event_not_found(self, mocker):
        """Test completion check returns error when event not found."""
        result = check_questionnaire_completion(99999)

        assert result['status'] == 'error'
        assert result['reason'] == 'event_not_found'

    def test_check_completion_no_questionnaire(
        self, mocker, event_factory, event_type_factory
    ):
        """Test completion check skips when no questionnaire found."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        result = check_questionnaire_completion(event.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'no_questionnaire'

    def test_check_completion_no_required_fields(
        self, mocker, event_factory, event_type_factory,
        questionnaire_factory, questionnaire_field_factory
    ):
        """Test completion check returns complete when no required fields."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        questionnaire = questionnaire_factory(event_type=event_type, is_active=True)
        # Only optional fields
        questionnaire_field_factory(questionnaire=questionnaire, required=False)

        result = check_questionnaire_completion(event.id)

        assert result['status'] == 'complete'
        assert result['reason'] == 'no_required_fields'

    def test_check_completion_incomplete(
        self, mocker, event_factory, event_type_factory,
        questionnaire_factory, questionnaire_field_factory
    ):
        """Test completion check returns incomplete when missing required fields."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        questionnaire = questionnaire_factory(event_type=event_type, is_active=True)
        questionnaire_field_factory(questionnaire=questionnaire, required=True)
        questionnaire_field_factory(questionnaire=questionnaire, required=True)

        result = check_questionnaire_completion(event.id)

        assert result['status'] == 'incomplete'
        assert result['missing_fields'] == 2

    def test_check_completion_complete_triggers_notifications(
        self, mocker, event_factory, event_type_factory,
        questionnaire_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test completion check triggers notifications when complete."""
        mock_client_notify = mocker.patch(
            'core.domains.questionnaires.tasks.notify_questionnaire_completed.delay'
        )
        mock_admin_notify = mocker.patch(
            'core.domains.questionnaires.tasks.notify_admin_questionnaire_submission.delay'
        )

        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        questionnaire = questionnaire_factory(event_type=event_type, is_active=True)
        field1 = questionnaire_field_factory(questionnaire=questionnaire, required=True)
        field2 = questionnaire_field_factory(questionnaire=questionnaire, required=True)

        # Complete all required fields
        questionnaire_response_factory(event=event, field=field1, value='Answer 1')
        questionnaire_response_factory(event=event, field=field2, value='Answer 2')

        result = check_questionnaire_completion(event.id)

        assert result['status'] == 'complete'
        assert result['notifications_triggered'] is True
        mock_client_notify.assert_called_once_with(event.id)
        mock_admin_notify.assert_called_once_with(event.id)

    def test_check_completion_partial_answers(
        self, mocker, event_factory, event_type_factory,
        questionnaire_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test completion check with partial answers."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        questionnaire = questionnaire_factory(event_type=event_type, is_active=True)
        field1 = questionnaire_field_factory(questionnaire=questionnaire, required=True)
        field2 = questionnaire_field_factory(questionnaire=questionnaire, required=True)
        field3 = questionnaire_field_factory(questionnaire=questionnaire, required=False)

        # Only answer one required field
        questionnaire_response_factory(event=event, field=field1, value='Answer 1')

        result = check_questionnaire_completion(event.id)

        assert result['status'] == 'incomplete'
        assert result['missing_fields'] == 1  # field2 is missing


@pytest.mark.django_db
class TestReminderCountHelpers:
    """Unit tests for reminder count helper functions."""

    def test_get_reminder_count_key(self):
        """Test reminder count key generation."""
        key = _get_reminder_count_key(123)

        assert 'questionnaire_reminder' in key
        assert '123' in key

    def test_get_reminder_count_default(self, clear_cache):
        """Test getting reminder count with no cached value."""
        count = _get_reminder_count(12345)

        assert count == 0

    def test_increment_reminder_count(self, clear_cache):
        """Test incrementing reminder count."""
        event_id = 54321

        count1 = _increment_reminder_count(event_id)
        count2 = _increment_reminder_count(event_id)
        count3 = _increment_reminder_count(event_id)

        assert count1 == 1
        assert count2 == 2
        assert count3 == 3

        # Verify the count is persisted
        assert _get_reminder_count(event_id) == 3


@pytest.mark.django_db
class TestTaskRetryBehavior:
    """Unit tests for task retry behavior."""

    def test_reminder_task_raises_on_exception(
        self, mocker, event_factory, user_factory, event_type_factory,
        questionnaire_factory, questionnaire_field_factory, clear_cache
    ):
        """Test reminder task raises exception for Celery retry."""
        mocker.patch(
            'core.domains.notifications.services.NotificationService.create_notification',
            side_effect=Exception('Notification service error')
        )

        client = user_factory(role='CLIENT')
        event_type = event_type_factory()
        event = event_factory(
            client=client,
            event_type=event_type,
            status='CONFIRMED',
            start_date=timezone.now() + timedelta(days=14)
        )

        questionnaire = questionnaire_factory(event_type=event_type, is_active=True)
        questionnaire_field_factory(questionnaire=questionnaire, required=True)

        with pytest.raises(Exception, match='Notification service error'):
            send_questionnaire_reminder(event.id)

    def test_completion_notification_raises_on_exception(
        self, mocker, event_factory, user_factory
    ):
        """Test completion notification raises exception for Celery retry."""
        mocker.patch(
            'core.domains.notifications.services.NotificationService.create_notification',
            side_effect=Exception('Notification service error')
        )

        client = user_factory(role='CLIENT')
        event = event_factory(client=client)

        with pytest.raises(Exception, match='Notification service error'):
            notify_questionnaire_completed(event.id)
