# backend/core/domains/workflows/tests/test_tasks.py
"""
Unit tests for workflows domain Celery tasks.

Tests:
- schedule_stage_actions: scheduling delayed stage actions
- execute_delayed_stage_action: executing delayed actions
- schedule_before_event_action: scheduling pre-event actions
- process_before_event_triggers: daily sweep for missed triggers
"""

import pytest
from datetime import date, timedelta
from unittest.mock import patch, MagicMock, call
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache

from core.domains.workflows.models import (
    WorkflowTemplate,
    WorkflowStage,
)
from core.domains.workflows.tasks import (
    schedule_stage_actions,
    execute_delayed_stage_action,
    schedule_before_event_action,
    process_before_event_triggers,
)
from core.domains.events.models import Event, EventType

User = get_user_model()


@pytest.mark.django_db
@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class TestScheduleStageActions:
    """Tests for schedule_stage_actions Celery task."""

    def test_schedule_after_days_trigger(self, event_factory, event_type_factory):
        """Test scheduling action with AFTER_X_DAYS trigger."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='Delayed Stage',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='AFTER_3_DAYS'
        )

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage
        )

        with patch('core.domains.workflows.tasks.execute_delayed_stage_action.apply_async') as mock_async:
            schedule_stage_actions(event.id, stage.id)

            mock_async.assert_called_once()
            call_kwargs = mock_async.call_args
            assert call_kwargs.kwargs['args'] == [event.id, stage.id]
            # Verify eta is approximately 3 days from now
            eta = call_kwargs.kwargs['eta']
            expected_eta = timezone.now() + timedelta(days=3)
            assert abs((eta - expected_eta).total_seconds()) < 60  # Within 1 minute

    def test_schedule_after_hours_trigger(self, event_factory, event_type_factory):
        """Test scheduling action with AFTER_X_HOURS trigger."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='Delayed Stage',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='AFTER_2_HOURS'
        )

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage
        )

        with patch('core.domains.workflows.tasks.execute_delayed_stage_action.apply_async') as mock_async:
            schedule_stage_actions(event.id, stage.id)

            mock_async.assert_called_once()
            call_kwargs = mock_async.call_args
            eta = call_kwargs.kwargs['eta']
            expected_eta = timezone.now() + timedelta(hours=2)
            assert abs((eta - expected_eta).total_seconds()) < 60

    def test_schedule_after_weeks_trigger(self, event_factory, event_type_factory):
        """Test scheduling action with AFTER_X_WEEKS trigger."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='Delayed Stage',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='AFTER_2_WEEKS'
        )

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage
        )

        with patch('core.domains.workflows.tasks.execute_delayed_stage_action.apply_async') as mock_async:
            schedule_stage_actions(event.id, stage.id)

            mock_async.assert_called_once()
            call_kwargs = mock_async.call_args
            eta = call_kwargs.kwargs['eta']
            expected_eta = timezone.now() + timedelta(weeks=2)
            assert abs((eta - expected_eta).total_seconds()) < 60

    def test_schedule_invalid_trigger_format(self, event_factory, event_type_factory):
        """Test handling of invalid trigger time format."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='Invalid Stage',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='INVALID_FORMAT'
        )

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage
        )

        with patch('core.domains.workflows.tasks.execute_delayed_stage_action.apply_async') as mock_async:
            # Should not raise error, just log it
            schedule_stage_actions(event.id, stage.id)
            mock_async.assert_not_called()

    def test_schedule_event_not_found(self):
        """Test handling when event doesn't exist."""
        with patch('core.domains.workflows.tasks.execute_delayed_stage_action.apply_async') as mock_async:
            # Should not raise error
            schedule_stage_actions(99999, 99999)
            mock_async.assert_not_called()

    def test_schedule_stage_not_found(self, event_factory, event_type_factory):
        """Test handling when stage doesn't exist."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        with patch('core.domains.workflows.tasks.execute_delayed_stage_action.apply_async') as mock_async:
            # Should not raise error
            schedule_stage_actions(event.id, 99999)
            mock_async.assert_not_called()


@pytest.mark.django_db
@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class TestExecuteDelayedStageAction:
    """Tests for execute_delayed_stage_action Celery task."""

    def test_execute_action_at_current_stage(self, event_factory, event_type_factory):
        """Test executing action when event is still at the stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='Test Stage',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION'
        )

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage
        )

        with patch('core.domains.notifications.services.NotificationService.create_notification') as mock_notify:
            with patch('core.domains.workflows.engine.WorkflowEngine.progress_workflow') as mock_progress:
                execute_delayed_stage_action(event.id, stage.id)
                mock_notify.assert_called_once()
                mock_progress.assert_called_once()

    def test_execute_action_event_moved_to_different_stage(
        self, event_factory, event_type_factory
    ):
        """Test that action is not executed if event moved to different stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage1 = WorkflowStage.objects.create(
            template=template,
            name='Stage 1',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION'
        )
        stage2 = WorkflowStage.objects.create(
            template=template,
            name='Stage 2',
            stage='LEAD',
            order=2
        )

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage2  # Event has moved to stage 2
        )

        with patch('core.domains.notifications.services.NotificationService.create_notification') as mock_notify:
            # Execute for stage 1, but event is at stage 2
            execute_delayed_stage_action(event.id, stage1.id)
            mock_notify.assert_not_called()

    def test_execute_action_event_not_found(self):
        """Test handling when event doesn't exist."""
        with patch('core.domains.notifications.services.NotificationService.create_notification') as mock_notify:
            # Should not raise error
            execute_delayed_stage_action(99999, 99999)
            mock_notify.assert_not_called()

    def test_execute_action_stage_not_found(self, event_factory, event_type_factory):
        """Test handling when stage doesn't exist."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        with patch('core.domains.notifications.services.NotificationService.create_notification') as mock_notify:
            # Should not raise error
            execute_delayed_stage_action(event.id, 99999)
            mock_notify.assert_not_called()


@pytest.mark.django_db
@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class TestScheduleBeforeEventAction:
    """Tests for schedule_before_event_action Celery task."""

    def test_schedule_before_event_future_date(self, event_factory, event_type_factory):
        """Test scheduling action for future event date."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='Before Event Stage',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='7_DAYS_BEFORE_EVENT'
        )

        # Event in 30 days
        event_start = timezone.now() + timedelta(days=30)
        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage,
            start_date=event_start
        )

        with patch('core.domains.workflows.tasks.execute_delayed_stage_action.apply_async') as mock_async:
            result = schedule_before_event_action(event.id, stage.id)

            mock_async.assert_called_once()
            assert result['status'] == 'scheduled'
            assert result['days_before'] == 7

    def test_schedule_before_event_past_date_executes_immediately(
        self, event_factory, event_type_factory
    ):
        """Test that past trigger dates execute immediately."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='Before Event Stage',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='30_DAYS_BEFORE_EVENT'
        )

        # Event in 5 days (trigger date is in the past)
        event_start = timezone.now() + timedelta(days=5)
        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage,
            start_date=event_start
        )

        with patch('core.domains.workflows.tasks.execute_delayed_stage_action.apply_async') as mock_async:
            result = schedule_before_event_action(event.id, stage.id)

            mock_async.assert_called_once()
            # Should be called without eta (immediate)
            call_kwargs = mock_async.call_args
            assert 'eta' not in call_kwargs.kwargs or call_kwargs.kwargs.get('eta') is None

    def test_schedule_before_event_no_start_date(self, event_factory, event_type_factory):
        """Test handling when event has no start date."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='Before Event Stage',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='7_DAYS_BEFORE_EVENT'
        )

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage,
            start_date=None
        )

        result = schedule_before_event_action(event.id, stage.id)

        assert result['status'] == 'skipped'
        assert result['reason'] == 'no_start_date'

    def test_schedule_before_event_invalid_format(self, event_factory, event_type_factory):
        """Test handling of invalid trigger time format."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='Invalid Stage',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='INVALID_BEFORE_EVENT'
        )

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage,
            start_date=timezone.now() + timedelta(days=30)
        )

        result = schedule_before_event_action(event.id, stage.id)

        assert result['status'] == 'error'
        assert result['reason'] == 'invalid_format'

    def test_schedule_before_event_event_not_found(self):
        """Test handling when event doesn't exist."""
        result = schedule_before_event_action(99999, 99999)

        assert result['status'] == 'error'
        assert result['reason'] == 'event_not_found'

    def test_schedule_before_event_stage_not_found(self, event_factory, event_type_factory):
        """Test handling when stage doesn't exist."""
        event_type = event_type_factory()
        event = event_factory(
            event_type=event_type,
            start_date=timezone.now() + timedelta(days=30)
        )

        result = schedule_before_event_action(event.id, 99999)

        assert result['status'] == 'error'
        assert result['reason'] == 'stage_not_found'

    def test_schedule_before_event_various_day_formats(
        self, event_factory, event_type_factory
    ):
        """Test parsing various day formats (DAY vs DAYS)."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        # Test singular DAY
        stage = WorkflowStage.objects.create(
            template=template,
            name='One Day Before',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='1_DAY_BEFORE_EVENT'
        )

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage,
            start_date=timezone.now() + timedelta(days=30)
        )

        with patch('core.domains.workflows.tasks.execute_delayed_stage_action.apply_async'):
            result = schedule_before_event_action(event.id, stage.id)

        assert result['status'] == 'scheduled'
        assert result['days_before'] == 1


@pytest.mark.django_db
@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class TestProcessBeforeEventTriggers:
    """Tests for process_before_event_triggers Celery task."""

    def test_sweep_finds_matching_events(self, event_factory, event_type_factory):
        """Test that sweep finds events with matching trigger dates."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='7 Days Before',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='7_DAYS_BEFORE_EVENT'
        )

        # Event starting in exactly 7 days
        event_date = timezone.now() + timedelta(days=7)
        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage,
            start_date=event_date,
            status='CONFIRMED'
        )

        with patch('core.domains.workflows.tasks.schedule_before_event_action.delay') as mock_schedule:
            result = process_before_event_triggers()

            mock_schedule.assert_called()

    def test_sweep_skips_cancelled_events(self, event_factory, event_type_factory):
        """Test that sweep skips cancelled events."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='7 Days Before',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='7_DAYS_BEFORE_EVENT'
        )

        # Event starting in 7 days but cancelled
        event_date = timezone.now() + timedelta(days=7)
        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage,
            start_date=event_date,
            status='CANCELLED'
        )

        with patch('core.domains.workflows.tasks.schedule_before_event_action.delay') as mock_schedule:
            result = process_before_event_triggers()

            # Should not be called for cancelled event
            for call_args in mock_schedule.call_args_list:
                assert call_args[0][0] != event.id

    def test_sweep_handles_multiple_stages(self, event_factory, event_type_factory):
        """Test that sweep handles multiple BEFORE_EVENT stages."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage1 = WorkflowStage.objects.create(
            template=template,
            name='7 Days Before',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='7_DAYS_BEFORE_EVENT'
        )

        stage2 = WorkflowStage.objects.create(
            template=template,
            name='30 Days Before',
            stage='LEAD',
            order=2,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='30_DAYS_BEFORE_EVENT'
        )

        with patch('core.domains.workflows.tasks.schedule_before_event_action.delay'):
            result = process_before_event_triggers()

            assert 'processed' in result
            assert 'errors' in result

    def test_sweep_returns_statistics(self, event_factory, event_type_factory):
        """Test that sweep returns processing statistics."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='7 Days Before',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='7_DAYS_BEFORE_EVENT'
        )

        with patch('core.domains.workflows.tasks.schedule_before_event_action.delay'):
            result = process_before_event_triggers()

            assert isinstance(result, dict)
            assert 'processed' in result
            assert 'errors' in result
            assert isinstance(result['processed'], int)
            assert isinstance(result['errors'], int)

    def test_sweep_skips_invalid_trigger_format(self, event_factory, event_type_factory):
        """Test that sweep skips stages with invalid trigger format."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        # Stage with invalid BEFORE_EVENT format
        stage = WorkflowStage.objects.create(
            template=template,
            name='Invalid Before',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='INVALID_BEFORE_EVENT'
        )

        with patch('core.domains.workflows.tasks.schedule_before_event_action.delay') as mock_schedule:
            result = process_before_event_triggers()

            # Should complete without errors for the invalid stage
            assert 'errors' in result


@pytest.mark.django_db
@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class TestTasksIntegration:
    """Integration tests for workflow tasks."""

    def test_full_delayed_action_flow(self, event_factory, event_type_factory):
        """Test the full flow from scheduling to execution."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage1 = WorkflowStage.objects.create(
            template=template,
            name='Stage 1',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='AFTER_1_DAYS'
        )
        stage2 = WorkflowStage.objects.create(
            template=template,
            name='Stage 2',
            stage='LEAD',
            order=2
        )

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage1
        )

        # When the delayed action executes, it should also try to progress
        with patch('core.domains.notifications.services.NotificationService.create_notification') as mock_notify:
            execute_delayed_stage_action(event.id, stage1.id)

            mock_notify.assert_called_once()

            # Event should have attempted to progress
            event.refresh_from_db()
            # If criteria met, it would progress to stage2
            assert event.current_stage in [stage1, stage2]

    def test_before_event_action_with_notification(
        self, event_factory, event_type_factory
    ):
        """Test before-event action with notification automation."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name='Test Workflow',
            event_type=event_type
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name='Reminder Stage',
            stage='LEAD',
            order=1,
            is_automated=True,
            automation_type='NOTIFICATION',
            trigger_time='7_DAYS_BEFORE_EVENT'
        )

        # Event in the past trigger date (executes immediately)
        event_start = timezone.now() + timedelta(days=5)  # Less than 7 days
        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            current_stage=stage,
            start_date=event_start
        )

        with patch('core.domains.workflows.tasks.execute_delayed_stage_action.apply_async') as mock_async:
            schedule_before_event_action(event.id, stage.id)

            # Should execute immediately (no eta)
            mock_async.assert_called_once()
