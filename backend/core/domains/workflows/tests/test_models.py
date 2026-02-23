# backend/core/domains/workflows/tests/test_models.py
"""
Unit tests for workflows domain models.

Tests:
- WorkflowTemplate model (CRUD, relationships)
- WorkflowStage model (ordering, automation types, constraints)
- WorkflowTrigger model (trigger types, state management)
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone

import pytest

from core.domains.events.models import Event
from core.domains.workflows.models import (
    WorkflowStage,
    WorkflowTemplate,
    WorkflowTrigger,
)

User = get_user_model()


@pytest.mark.django_db
class TestWorkflowTemplateModel:
    """Unit tests for WorkflowTemplate model."""

    def test_create_workflow_template(self, event_type_factory):
        """Test creating a workflow template with all fields."""
        event_type = event_type_factory()

        template = WorkflowTemplate.objects.create(
            name="Wedding Workflow", description="Standard workflow for weddings", event_type=event_type, is_active=True
        )

        assert template.name == "Wedding Workflow"
        assert template.description == "Standard workflow for weddings"
        assert template.event_type == event_type
        assert template.is_active is True

    def test_workflow_template_string_representation(self, event_type_factory):
        """Test WorkflowTemplate __str__ returns the name."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Corporate Event Workflow", event_type=event_type)

        assert str(template) == "Corporate Event Workflow"

    def test_workflow_template_without_event_type(self):
        """Test creating a workflow template without event type."""
        template = WorkflowTemplate.objects.create(
            name="Generic Workflow", description="A workflow that can apply to any event type", is_active=True
        )

        assert template.name == "Generic Workflow"
        assert template.event_type is None

    def test_workflow_template_default_is_active(self):
        """Test that is_active defaults to True."""
        template = WorkflowTemplate.objects.create(name="Test Workflow")

        assert template.is_active is True

    def test_workflow_template_stages_relationship(self, event_type_factory):
        """Test the stages relationship on workflow template."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage1 = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        stage2 = WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)

        assert template.stages.count() == 2
        assert stage1 in template.stages.all()
        assert stage2 in template.stages.all()

    def test_workflow_template_cascade_delete_stages(self, event_type_factory):
        """Test that deleting a template cascades to stages."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)

        template_id = template.id
        template.delete()

        assert WorkflowStage.objects.filter(template_id=template_id).count() == 0


@pytest.mark.django_db
class TestWorkflowStageModel:
    """Unit tests for WorkflowStage model."""

    def test_create_workflow_stage(self, event_type_factory):
        """Test creating a basic workflow stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(template=template, name="Initial Contact", stage="LEAD", order=1)

        assert stage.name == "Initial Contact"
        assert stage.stage == "LEAD"
        assert stage.order == 1
        assert stage.is_automated is False

    def test_workflow_stage_string_representation(self, event_type_factory):
        """Test WorkflowStage __str__ returns template name - stage name."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Wedding Workflow", event_type=event_type)
        stage = WorkflowStage.objects.create(template=template, name="Send Quote", stage="LEAD", order=1)

        assert str(stage) == "Wedding Workflow - Send Quote"

    def test_workflow_stage_choices(self, event_type_factory):
        """Test all valid stage type choices."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        # LEAD stage
        lead_stage = WorkflowStage.objects.create(template=template, name="Lead Stage", stage="LEAD", order=1)
        assert lead_stage.get_stage_display() == "Lead"

        # PRODUCTION stage
        production_stage = WorkflowStage.objects.create(
            template=template, name="Production Stage", stage="PRODUCTION", order=1
        )
        assert production_stage.get_stage_display() == "Production"

        # POST_PRODUCTION stage
        post_stage = WorkflowStage.objects.create(
            template=template, name="Post Production Stage", stage="POST_PRODUCTION", order=1
        )
        assert post_stage.get_stage_display() == "Post Production"

    def test_workflow_stage_automation_types(self, event_type_factory):
        """Test all valid automation type choices."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        automation_types = ["EMAIL", "TASK", "QUOTE", "CONTRACT", "REMINDER", "NOTIFICATION"]

        for i, auto_type in enumerate(automation_types):
            stage = WorkflowStage.objects.create(
                template=template,
                name=f"{auto_type} Stage",
                stage="LEAD",
                order=i + 1,
                is_automated=True,
                automation_type=auto_type,
            )
            assert stage.automation_type == auto_type

    def test_workflow_stage_unique_constraint(self, event_type_factory):
        """Test unique constraint on template, stage, and order."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)

        # Attempting to create another stage with same template, stage type, and order
        with pytest.raises(IntegrityError):
            WorkflowStage.objects.create(template=template, name="Stage 1 Duplicate", stage="LEAD", order=1)

    def test_workflow_stage_ordering(self, event_type_factory):
        """Test default ordering of stages by order field."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage3 = WorkflowStage.objects.create(template=template, name="Stage 3", stage="LEAD", order=3)
        stage1 = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        stage2 = WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)

        stages = list(template.stages.all())
        assert stages[0] == stage1
        assert stages[1] == stage2
        assert stages[2] == stage3

    def test_workflow_stage_trigger_flags(self, event_type_factory):
        """Test trigger condition flags."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(
            template=template,
            name="Payment Stage",
            stage="LEAD",
            order=1,
            trigger_on_payment_received=True,
            trigger_on_quote_accepted=True,
            trigger_on_contract_signed=False,
            trigger_on_event_created=False,
            trigger_on_quote_sent=True,
        )

        assert stage.trigger_on_payment_received is True
        assert stage.trigger_on_quote_accepted is True
        assert stage.trigger_on_contract_signed is False
        assert stage.trigger_on_event_created is False
        assert stage.trigger_on_quote_sent is True

    def test_workflow_stage_metadata_field(self, event_type_factory):
        """Test the metadata JSONField."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        metadata = {
            "task_priority": "HIGH",
            "task_due_date": "event_start_date",
            "reminder_type": "WORKFLOW_REMINDER",
            "days_until_due": 7,
        }

        stage = WorkflowStage.objects.create(
            template=template, name="Task Stage", stage="LEAD", order=1, metadata=metadata
        )

        assert stage.metadata == metadata
        assert stage.metadata["task_priority"] == "HIGH"


@pytest.mark.django_db
class TestWorkflowStageCheckAdvancementCriteria:
    """Tests for WorkflowStage.check_advancement_criteria method."""

    def test_check_advancement_no_criteria(self, event_factory, event_type_factory):
        """Test advancement check with no special criteria."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage = WorkflowStage.objects.create(template=template, name="Simple Stage", stage="LEAD", order=1)

        event = event_factory(event_type=event_type)

        result = stage.check_advancement_criteria(event)
        assert result is True

    def test_check_advancement_payment_received_condition(self, event_factory, event_type_factory):
        """Test advancement check with PAYMENT_RECEIVED condition."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage = WorkflowStage.objects.create(
            template=template,
            name="Payment Required Stage",
            stage="LEAD",
            order=1,
            progression_condition="PAYMENT_RECEIVED",
        )

        event = event_factory(event_type=event_type)

        # No payment - should fail
        result = stage.check_advancement_criteria(event)
        assert result is False

    def test_check_advancement_quote_accepted_condition(self, event_factory, event_type_factory):
        """Test advancement check with QUOTE_ACCEPTED condition."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage = WorkflowStage.objects.create(
            template=template,
            name="Quote Required Stage",
            stage="LEAD",
            order=1,
            progression_condition="QUOTE_ACCEPTED",
        )

        event = event_factory(event_type=event_type)

        # No quote - should fail
        result = stage.check_advancement_criteria(event)
        assert result is False


@pytest.mark.django_db
class TestWorkflowStageApplyToEvent:
    """Tests for WorkflowStage.apply_to_event method."""

    def test_apply_to_event_updates_stage(self, event_factory, event_type_factory):
        """Test that apply_to_event updates the event's current stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage1 = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        stage2 = WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)

        event = event_factory(event_type=event_type, workflow_template=template, current_stage=stage1)

        stage2.apply_to_event(event)
        event.refresh_from_db()

        assert event.current_stage == stage2

    def test_apply_to_event_prevents_backward_movement(self, event_factory, event_type_factory):
        """Test that apply_to_event prevents moving backwards in same category.

        The post_save signal resets current_stage to the first LEAD stage on
        creation, so we use .update() to set stage2 after creation.
        """
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage1 = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        stage2 = WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)

        event = event_factory(
            event_type=event_type,
            workflow_template=template,
        )
        # Bypass post_save signal by using .update()
        Event.objects.filter(id=event.id).update(current_stage=stage2)
        event.refresh_from_db()

        # Try to move backwards
        stage1.apply_to_event(event)
        event.refresh_from_db()

        # Should still be at stage 2
        assert event.current_stage == stage2

    def test_apply_to_event_same_stage_no_change(self, event_factory, event_type_factory):
        """Test that applying the same stage has no effect."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage1 = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)

        event = event_factory(event_type=event_type, workflow_template=template, current_stage=stage1)

        # Apply same stage
        stage1.apply_to_event(event)
        event.refresh_from_db()

        assert event.current_stage == stage1


@pytest.mark.django_db
class TestWorkflowStageExecuteAutomation:
    """Tests for WorkflowStage._execute_automation method."""

    def test_execute_email_automation(self, event_factory, event_type_factory):
        """Test EMAIL automation type execution."""
        from core.domains.communications.models import CommunicationTemplate

        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        email_template = CommunicationTemplate.objects.create(
            name="Test Email",
            subject_template="Test Subject",
            body_template="<p>Test Body</p>",
            channel="EMAIL",
            category="SYSTEM",
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name="Email Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="EMAIL",
            email_template=email_template,
        )

        event = event_factory(event_type=event_type)

        with patch(
            "core.domains.communications.services.CommunicationService.send_communication_by_template"
        ) as mock_send:
            mock_send.return_value = True
            stage._execute_automation(event)
            mock_send.assert_called_once()

    def test_execute_task_automation(self, event_factory, event_type_factory):
        """Test TASK automation type execution."""
        from core.domains.events.models import EventTask

        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(
            template=template,
            name="Task Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="TASK",
            task_description="Follow up with the client",
        )

        event = event_factory(event_type=event_type)

        stage._execute_automation(event)

        task = EventTask.objects.filter(event=event).first()
        assert task is not None
        assert "Follow up with the client" in task.description

    def test_execute_notification_automation(self, event_factory, event_type_factory):
        """Test NOTIFICATION automation type execution."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(
            template=template,
            name="Notification Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
        )

        event = event_factory(event_type=event_type)

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            stage._execute_automation(event)
            mock_notify.assert_called_once()

    def test_execute_reminder_automation(self, event_factory, event_type_factory):
        """Test REMINDER automation type execution."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(
            template=template,
            name="Reminder Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="REMINDER",
            metadata={"reminder_type": "WORKFLOW_REMINDER", "days_until_due": 7},
        )

        event = event_factory(event_type=event_type)

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            stage._execute_automation(event)
            mock_notify.assert_called_once()
            call_kwargs = mock_notify.call_args.kwargs
            assert call_kwargs["notification_type_code"] == "WORKFLOW_REMINDER"

    def test_execute_automation_skips_for_payment_completion(self, event_factory, event_type_factory):
        """Test that EMAIL automation is skipped for payment completion events."""
        from core.domains.communications.models import CommunicationTemplate

        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        email_template = CommunicationTemplate.objects.create(
            name="Test Email",
            subject_template="Test Subject",
            body_template="<p>Test Body</p>",
            channel="EMAIL",
            category="SYSTEM",
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name="Email Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="EMAIL",
            email_template=email_template,
        )

        event = event_factory(event_type=event_type)
        event.completion_type = "payment"

        with patch(
            "core.domains.communications.services.CommunicationService.send_communication_by_template"
        ) as mock_send:
            stage._execute_automation(event)
            mock_send.assert_not_called()


@pytest.mark.django_db
class TestWorkflowTriggerModel:
    """Unit tests for WorkflowTrigger model."""

    def test_create_workflow_trigger(self, event_factory, event_type_factory):
        """Test creating a workflow trigger record."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage = WorkflowStage.objects.create(template=template, name="Test Stage", stage="LEAD", order=1)

        event = event_factory(event_type=event_type, workflow_template=template)

        trigger = WorkflowTrigger.objects.create(
            event=event,
            stage=stage,
            trigger_type="PAYMENT_RECEIVED",
            details="Payment of $500 received",
            result_data={"amount": 500, "currency": "USD"},
            processed=False,
        )

        assert trigger.event == event
        assert trigger.stage == stage
        assert trigger.trigger_type == "PAYMENT_RECEIVED"
        assert trigger.details == "Payment of $500 received"
        assert trigger.result_data == {"amount": 500, "currency": "USD"}
        assert trigger.processed is False

    def test_workflow_trigger_string_representation(self, event_factory, event_type_factory):
        """Test WorkflowTrigger __str__ returns event and trigger type."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type, name="Test Event")

        trigger = WorkflowTrigger.objects.create(event=event, trigger_type="CONTRACT_SIGNED")

        assert "Contract Signed" in str(trigger)

    def test_workflow_trigger_types(self, event_factory, event_type_factory):
        """Test all valid trigger types."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        valid_types = [
            "PAYMENT_RECEIVED",
            "PAYMENT_PLAN_CREATED",
            "PAYMENT_OVERDUE",
            "QUOTE_ACCEPTED",
            "CONTRACT_SIGNED",
            "EVENT_CREATED",
            "EVENT_COMPLETED",
            "TASK_COMPLETED",
            "DATE_TRIGGER",
            "MANUAL_TRIGGER",
        ]

        for trigger_type in valid_types:
            trigger = WorkflowTrigger(event=event, trigger_type=trigger_type)
            # Should not raise validation error
            trigger.full_clean()

    def test_workflow_trigger_ordering(self, event_factory, event_type_factory):
        """Test default ordering of triggers by created_at descending."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        trigger1 = WorkflowTrigger.objects.create(event=event, trigger_type="PAYMENT_RECEIVED")
        trigger2 = WorkflowTrigger.objects.create(event=event, trigger_type="QUOTE_ACCEPTED")
        trigger3 = WorkflowTrigger.objects.create(event=event, trigger_type="CONTRACT_SIGNED")

        triggers = list(WorkflowTrigger.objects.all())
        # Most recent first
        assert triggers[0] == trigger3
        assert triggers[1] == trigger2
        assert triggers[2] == trigger1

    def test_workflow_trigger_processed_at(self, event_factory, event_type_factory):
        """Test processed_at timestamp is set when trigger is marked processed."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        trigger = WorkflowTrigger.objects.create(event=event, trigger_type="PAYMENT_RECEIVED", processed=False)

        assert trigger.processed_at is None

        # Mark as processed
        trigger.processed = True
        trigger.processed_at = timezone.now()
        trigger.save()

        trigger.refresh_from_db()
        assert trigger.processed is True
        assert trigger.processed_at is not None

    def test_workflow_trigger_without_stage(self, event_factory, event_type_factory):
        """Test that workflow trigger can be created without a stage."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        trigger = WorkflowTrigger.objects.create(event=event, trigger_type="EVENT_CREATED", details="Event was created")

        assert trigger.stage is None
        assert trigger.trigger_type == "EVENT_CREATED"

    def test_workflow_trigger_cascade_delete_from_event(self, event_factory, event_type_factory):
        """Test that triggers are deleted when event is deleted."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        WorkflowTrigger.objects.create(event=event, trigger_type="PAYMENT_RECEIVED")
        WorkflowTrigger.objects.create(event=event, trigger_type="QUOTE_ACCEPTED")

        event_id = event.id
        assert WorkflowTrigger.objects.filter(event_id=event_id).count() == 2

        event.delete()

        assert WorkflowTrigger.objects.filter(event_id=event_id).count() == 0
