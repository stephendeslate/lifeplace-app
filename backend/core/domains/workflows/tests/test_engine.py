# backend/core/domains/workflows/tests/test_engine.py
"""
Unit tests for workflows domain engine.

Tests:
- WorkflowEngine: initial workflow assignment, progression, stage actions
"""

from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model

import pytest

from core.domains.events.models import Event, EventTimeline
from core.domains.workflows.engine import WorkflowEngine
from core.domains.workflows.models import (
    WorkflowStage,
    WorkflowTemplate,
)

User = get_user_model()


@pytest.mark.django_db
class TestWorkflowEngineAssignInitialWorkflow:
    """Tests for WorkflowEngine.assign_initial_workflow method."""

    def test_assign_initial_workflow_no_template(self, event_factory, event_type_factory):
        """Test that assign_initial_workflow does nothing when event has no template."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type, workflow_template=None)

        WorkflowEngine.assign_initial_workflow(event)

        event.refresh_from_db()
        assert event.current_stage is None

    def test_assign_initial_workflow_sets_first_lead_stage(self, event_factory, event_type_factory):
        """Test that initial workflow assigns first LEAD stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type, is_active=True)

        lead_stage1 = WorkflowStage.objects.create(
            template=template, name="Lead Stage 1", stage="LEAD", order=1, is_automated=False
        )
        WorkflowStage.objects.create(template=template, name="Lead Stage 2", stage="LEAD", order=2)

        event = event_factory(event_type=event_type, workflow_template=template, current_stage=None)

        WorkflowEngine.assign_initial_workflow(event)

        event.refresh_from_db()
        assert event.current_stage == lead_stage1

    def test_assign_initial_workflow_creates_timeline_entry(self, event_factory, event_type_factory):
        """Test that initial workflow creates a timeline entry."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        WorkflowStage.objects.create(template=template, name="Initial Stage", stage="LEAD", order=1, is_automated=False)

        event = event_factory(event_type=event_type, workflow_template=template)

        WorkflowEngine.assign_initial_workflow(event)

        timeline = EventTimeline.objects.filter(event=event, action_type="STAGE_CHANGE").first()

        assert timeline is not None
        assert "Initial Stage" in timeline.description

    def test_assign_initial_workflow_executes_automation(self, event_factory, event_type_factory):
        """Test that initial workflow executes automation for the first stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        WorkflowStage.objects.create(
            template=template,
            name="Initial Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
        )

        event = event_factory(event_type=event_type, workflow_template=template)

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            WorkflowEngine.assign_initial_workflow(event)
            mock_notify.assert_called_once()

    def test_assign_initial_workflow_with_quote_completion_type(self, event_factory, event_type_factory):
        """Test initial workflow with quote completion type seeks quote-specific stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        # Default lead stage
        WorkflowStage.objects.create(
            template=template, name="Default Lead", stage="LEAD", order=1, is_automated=False
        )

        # Quote-specific stage
        quote_stage = WorkflowStage.objects.create(
            template=template,
            name="Quote Lead",
            stage="LEAD",
            order=2,
            is_automated=False,
            metadata={"flow_type": "quote"},
        )

        event = event_factory(event_type=event_type, workflow_template=template)
        event.completion_type = "quote"
        event.save()

        WorkflowEngine.assign_initial_workflow(event)

        event.refresh_from_db()
        assert event.current_stage == quote_stage

    def test_assign_initial_workflow_executes_trigger_on_event_created(self, event_factory, event_type_factory):
        """Test that trigger_on_event_created stages execute their automation."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        # First stage
        WorkflowStage.objects.create(
            template=template,
            name="Initial Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
        )

        # Stage with trigger_on_event_created
        WorkflowStage.objects.create(
            template=template,
            name="Auto Triggered Stage",
            stage="LEAD",
            order=2,
            is_automated=True,
            automation_type="NOTIFICATION",
            trigger_on_event_created=True,
        )

        event = event_factory(event_type=event_type, workflow_template=template)

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            WorkflowEngine.assign_initial_workflow(event)
            # Should be called twice: once for first stage, once for trigger_on_event_created
            assert mock_notify.call_count == 2


@pytest.mark.django_db
class TestWorkflowEngineProgressWorkflow:
    """Tests for WorkflowEngine.progress_workflow method."""

    def test_progress_workflow_no_template(self, event_factory, event_type_factory):
        """Test that progress_workflow returns False when no template."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type, workflow_template=None)

        result = WorkflowEngine.progress_workflow(event)

        assert result is False

    def test_progress_workflow_no_current_stage(self, event_factory, event_type_factory):
        """Test that progress_workflow returns False when no current stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        event = event_factory(event_type=event_type, workflow_template=template, current_stage=None)

        result = WorkflowEngine.progress_workflow(event)

        assert result is False

    def test_progress_workflow_within_same_stage_type(self, event_factory, event_type_factory):
        """Test progression within the same stage type (LEAD to LEAD)."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage1 = WorkflowStage.objects.create(template=template, name="Lead 1", stage="LEAD", order=1)
        stage2 = WorkflowStage.objects.create(template=template, name="Lead 2", stage="LEAD", order=2)

        event = event_factory(event_type=event_type, workflow_template=template, current_stage=stage1)

        result = WorkflowEngine.progress_workflow(event, trigger_type="STATUS_CHANGE")

        assert result is True
        event.refresh_from_db()
        assert event.current_stage == stage2

    def test_progress_workflow_creates_timeline_entry(self, event_factory, event_type_factory):
        """Test that progression creates a timeline entry."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage1 = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)

        event = event_factory(event_type=event_type, workflow_template=template, current_stage=stage1)

        WorkflowEngine.progress_workflow(event, trigger_type="STATUS_CHANGE")

        timeline = EventTimeline.objects.filter(event=event, action_type="STAGE_CHANGE").order_by("-created_at").first()

        assert timeline is not None
        assert "Stage 1" in timeline.description
        assert "Stage 2" in timeline.description

    def test_progress_workflow_idempotent(self, event_factory, event_type_factory):
        """Test that duplicate progression to same stage is prevented.

        The post_save signal resets current_stage to the first LEAD stage,
        so we use .update() to set stage2 after creation.
        """
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        stage2 = WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
        )
        # Bypass post_save signal by using .update()
        Event.objects.filter(id=event.id).update(current_stage=stage2)
        event.refresh_from_db()

        # Try to progress - already at stage 2 and no stage 3 exists
        result = WorkflowEngine.progress_workflow(event, trigger_type="STATUS_CHANGE")

        # Should be False because already at stage 2 and no stage 3 exists
        assert result is False

    def test_progress_workflow_cross_stage_type_lead_to_production(self, event_factory, event_type_factory):
        """Test progression from LEAD to PRODUCTION on status change."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        lead_stage = WorkflowStage.objects.create(template=template, name="Lead Stage", stage="LEAD", order=1)
        production_stage = WorkflowStage.objects.create(
            template=template, name="Production Stage", stage="PRODUCTION", order=1
        )

        event = event_factory(
            event_type=event_type, workflow_template=template, current_stage=lead_stage, status="CONFIRMED"
        )

        result = WorkflowEngine.progress_workflow(event, trigger_type="STATUS_CHANGE")

        assert result is True
        event.refresh_from_db()
        assert event.current_stage == production_stage

    def test_progress_workflow_payment_trigger_to_production(self, event_factory, event_type_factory):
        """Test progression from LEAD to PRODUCTION on payment received.

        The engine requires event.status == 'CONFIRMED' for PAYMENT_RECEIVED
        to trigger cross-category progression (LEAD -> PRODUCTION). The
        post_save signal resets current_stage, so we use .update() to set it.
        """
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        lead_stage = WorkflowStage.objects.create(template=template, name="Lead Stage", stage="LEAD", order=1)
        production_stage = WorkflowStage.objects.create(
            template=template, name="Production Stage", stage="PRODUCTION", order=1
        )

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
            status="CONFIRMED",
        )
        # Bypass post_save signal that resets current_stage to first LEAD stage
        Event.objects.filter(id=event.id).update(current_stage=lead_stage)
        event.refresh_from_db()

        result = WorkflowEngine.progress_workflow(event, trigger_type="PAYMENT_RECEIVED")

        assert result is True
        event.refresh_from_db()
        assert event.current_stage == production_stage

    def test_progress_workflow_production_to_post_production(self, event_factory, event_type_factory):
        """Test progression from PRODUCTION to POST_PRODUCTION on event completed."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        production_stage = WorkflowStage.objects.create(
            template=template, name="Production Stage", stage="PRODUCTION", order=1
        )
        post_production_stage = WorkflowStage.objects.create(
            template=template, name="Post Production Stage", stage="POST_PRODUCTION", order=1
        )

        event = event_factory(
            event_type=event_type, workflow_template=template, current_stage=production_stage, status="COMPLETED"
        )

        result = WorkflowEngine.progress_workflow(event, trigger_type="STATUS_CHANGE")

        assert result is True
        event.refresh_from_db()
        assert event.current_stage == post_production_stage


@pytest.mark.django_db
class TestWorkflowEngineTriggers:
    """Tests for WorkflowEngine trigger-based progression."""

    def test_payment_received_trigger_executes_automation(self, event_factory, event_type_factory):
        """Test PAYMENT_RECEIVED trigger executes automation on matching stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(
            template=template,
            name="Payment Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
            trigger_on_payment_received=True,
        )

        event = event_factory(event_type=event_type, workflow_template=template, current_stage=stage)

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            result = WorkflowEngine.progress_workflow(event, trigger_type="PAYMENT_RECEIVED")
            mock_notify.assert_called_once()

        # Should not progress (stays on current stage after trigger)
        assert result is False

    def test_quote_accepted_trigger_executes_automation(self, event_factory, event_type_factory):
        """Test QUOTE_ACCEPTED trigger executes automation on matching stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(
            template=template,
            name="Quote Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
            trigger_on_quote_accepted=True,
        )

        event = event_factory(event_type=event_type, workflow_template=template, current_stage=stage)

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            WorkflowEngine.progress_workflow(event, trigger_type="QUOTE_ACCEPTED")
            mock_notify.assert_called_once()

    def test_contract_signed_trigger_executes_automation(self, event_factory, event_type_factory):
        """Test CONTRACT_SIGNED trigger executes automation on matching stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(
            template=template,
            name="Contract Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
            trigger_on_contract_signed=True,
        )

        event = event_factory(event_type=event_type, workflow_template=template, current_stage=stage)

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            WorkflowEngine.progress_workflow(event, trigger_type="CONTRACT_SIGNED")
            mock_notify.assert_called_once()

    def test_quote_sent_trigger_executes_automation(self, event_factory, event_type_factory):
        """Test QUOTE_SENT trigger executes automation on matching stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(
            template=template,
            name="Quote Sent Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
            trigger_on_quote_sent=True,
        )

        event = event_factory(event_type=event_type, workflow_template=template, current_stage=stage)

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            WorkflowEngine.progress_workflow(event, trigger_type="QUOTE_SENT")
            mock_notify.assert_called_once()

    def test_trigger_searches_all_workflow_stages(self, event_factory, event_type_factory):
        """Test that trigger searches for matching stage in entire workflow."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        # Current stage without trigger
        current_stage = WorkflowStage.objects.create(
            template=template, name="Current Stage", stage="LEAD", order=1, is_automated=False
        )

        # Another stage with trigger
        WorkflowStage.objects.create(
            template=template,
            name="Payment Trigger Stage",
            stage="LEAD",
            order=2,
            is_automated=True,
            automation_type="NOTIFICATION",
            trigger_on_payment_received=True,
        )

        event = event_factory(event_type=event_type, workflow_template=template, current_stage=current_stage)

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            WorkflowEngine.progress_workflow(event, trigger_type="PAYMENT_RECEIVED")
            mock_notify.assert_called_once()


@pytest.mark.django_db
class TestWorkflowEngineAdvancementCriteria:
    """Tests for advancement criteria checks."""

    def test_progress_blocked_by_progression_condition(self, event_factory, event_type_factory):
        """Test that progression is blocked when criteria not met."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage1 = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        WorkflowStage.objects.create(
            template=template, name="Stage 2", stage="LEAD", order=2, progression_condition="PAYMENT_RECEIVED"
        )

        event = event_factory(event_type=event_type, workflow_template=template, current_stage=stage1)

        # Try to progress (should be blocked by payment condition on stage2)
        result = WorkflowEngine.progress_workflow(event, trigger_type="STATUS_CHANGE")

        # Should fail because next stage requires payment
        assert result is False


@pytest.mark.django_db
class TestWorkflowEngineExecuteStageActions:
    """Tests for WorkflowEngine.execute_stage_actions method."""

    def test_execute_stage_actions_immediate(self, event_factory, event_type_factory):
        """Test immediate execution of stage actions."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(
            template=template,
            name="Test Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
            trigger_time="ON_CREATION",
        )

        event = event_factory(event_type=event_type, workflow_template=template)

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            WorkflowEngine.execute_stage_actions(event, stage)
            mock_notify.assert_called_once()

    def test_execute_stage_actions_schedules_delayed_action(self, event_factory, event_type_factory):
        """Test that delayed actions are scheduled via Celery."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(
            template=template,
            name="Test Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
            trigger_time="AFTER_3_DAYS",
        )

        event = event_factory(event_type=event_type, workflow_template=template)

        with patch("core.domains.workflows.tasks.schedule_stage_actions.delay") as mock_schedule:
            with patch("core.domains.notifications.services.NotificationService.create_notification"):
                # on_commit callbacks don't fire in TestCase (transaction never commits),
                # so execute them immediately to test the dispatch logic
                with patch(
                    "core.domains.workflows.engine.transaction.on_commit", side_effect=lambda func, **kw: func()
                ):
                    WorkflowEngine.execute_stage_actions(event, stage)
                mock_schedule.assert_called_once_with(event.id, stage.id)

    def test_execute_stage_actions_schedules_before_event_action(self, event_factory, event_type_factory):
        """Test that BEFORE_EVENT actions are scheduled via Celery."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(
            template=template,
            name="Test Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
            trigger_time="7_DAYS_BEFORE_EVENT",
        )

        event = event_factory(
            event_type=event_type, workflow_template=template, start_date=date.today() + timedelta(days=30)
        )

        with patch("core.domains.workflows.tasks.schedule_before_event_action.delay") as mock_schedule:
            with patch("core.domains.notifications.services.NotificationService.create_notification"):
                # on_commit callbacks don't fire in TestCase (transaction never commits),
                # so execute them immediately to test the dispatch logic
                with patch(
                    "core.domains.workflows.engine.transaction.on_commit", side_effect=lambda func, **kw: func()
                ):
                    WorkflowEngine.execute_stage_actions(event, stage)
                mock_schedule.assert_called_once_with(event.id, stage.id)

    def test_execute_stage_actions_not_automated(self, event_factory, event_type_factory):
        """Test that non-automated stages don't execute automation."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(
            template=template,
            name="Manual Stage",
            stage="LEAD",
            order=1,
            is_automated=False,  # Not automated
        )

        event = event_factory(event_type=event_type, workflow_template=template)

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            WorkflowEngine.execute_stage_actions(event, stage)
            mock_notify.assert_not_called()
