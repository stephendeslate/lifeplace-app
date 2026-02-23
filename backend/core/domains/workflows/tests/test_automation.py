# backend/core/domains/workflows/tests/test_automation.py

from datetime import date, timedelta
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from core.domains.events.models import Event, EventTimeline, EventType
from core.domains.workflows.engine import WorkflowEngine
from core.domains.workflows.models import WorkflowStage, WorkflowTemplate, WorkflowTrigger

User = get_user_model()


class WorkflowAutomationTestCase(TestCase):
    """Test cases for workflow automation handlers"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email="client@test.com", first_name="Test", last_name="Client", role="CLIENT"
        )

        self.event_type = EventType.objects.create(name="Wedding")

        self.workflow_template = WorkflowTemplate.objects.create(
            name="Wedding Workflow", description="Standard wedding workflow", event_type=self.event_type, is_active=True
        )

        self.event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            workflow_template=self.workflow_template,
            name="Test Wedding",
            start_date=timezone.now() + timedelta(days=30),
            status="PENDING",
        )

    def test_email_automation(self):
        """Test EMAIL automation type"""
        from core.domains.communications.models import CommunicationTemplate

        email_template = CommunicationTemplate.objects.create(
            name="Test Email",
            subject_template="Test Subject",
            body_template="<p>Hello {{client_name}}</p>",
            channel="EMAIL",
            category="SYSTEM",
        )

        stage = WorkflowStage.objects.create(
            template=self.workflow_template,
            name="Send Welcome Email",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="EMAIL",
            email_template=email_template,
        )

        with patch(
            "core.domains.communications.services.CommunicationService.send_communication_by_template"
        ) as mock_send:
            mock_send.return_value = True
            stage._execute_automation(self.event)
            mock_send.assert_called_once()

    def test_task_automation(self):
        """Test TASK automation type"""
        stage = WorkflowStage.objects.create(
            template=self.workflow_template,
            name="Create Follow-up Task",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="TASK",
            task_description="Follow up with client about requirements",
        )

        stage._execute_automation(self.event)

        # Check that EventTask was created
        from core.domains.events.models import EventTask

        task = EventTask.objects.filter(event=self.event).first()
        self.assertIsNotNone(task)
        self.assertIn("Follow up", task.description)

    def test_notification_automation(self):
        """Test NOTIFICATION automation type"""
        stage = WorkflowStage.objects.create(
            template=self.workflow_template,
            name="Send Notification",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
        )

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            stage._execute_automation(self.event)
            mock_notify.assert_called_once()

    def test_reminder_automation(self):
        """Test REMINDER automation type"""
        stage = WorkflowStage.objects.create(
            template=self.workflow_template,
            name="Send Reminder",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="REMINDER",
            metadata={"reminder_type": "WORKFLOW_REMINDER", "days_until_due": 7},
        )

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            stage._execute_automation(self.event)
            mock_notify.assert_called_once()
            # Verify the notification type matches metadata
            call_args = mock_notify.call_args
            self.assertEqual(call_args.kwargs["notification_type_code"], "WORKFLOW_REMINDER")

    def test_quote_automation_creates_quote(self):
        """Test QUOTE automation creates a quote"""
        from core.domains.sales.models import QuoteTemplate

        quote_template = QuoteTemplate.objects.create(name="Standard Quote", event_type=self.event_type, is_active=True)

        stage = WorkflowStage.objects.create(
            template=self.workflow_template,
            name="Generate Quote",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="QUOTE",
            metadata={"quote_template_id": quote_template.id},
        )

        with patch.object(quote_template, "apply_to_event") as mock_apply:
            mock_quote = Mock()
            mock_quote.id = 1
            mock_apply.return_value = mock_quote

            # Temporarily patch QuoteTemplate.objects.get
            with patch("core.domains.sales.models.QuoteTemplate.objects.get", return_value=quote_template):
                stage._execute_automation(self.event)

    def test_quote_automation_skips_duplicate(self):
        """Test QUOTE automation skips if quote already exists"""
        from decimal import Decimal

        from core.domains.sales.models import EventQuote

        # Create existing quote (total_amount and valid_until are required)
        EventQuote.objects.create(
            event=self.event,
            status="DRAFT",
            total_amount=Decimal("0"),
            valid_until=date.today() + timedelta(days=30),
        )

        stage = WorkflowStage.objects.create(
            template=self.workflow_template,
            name="Generate Quote",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="QUOTE",
        )

        with patch("core.domains.sales.models.QuoteTemplate.objects") as mock_qs:
            stage._execute_automation(self.event)
            # Should not try to create another quote
            mock_qs.filter.assert_not_called()

    def test_contract_automation(self):
        """Test CONTRACT automation type"""
        from core.domains.communications.models import CommunicationTemplate
        from core.domains.contracts.models import ContractTemplate

        contract_template = ContractTemplate.objects.create(
            name="Wedding Contract", content="Contract content here", is_active=True
        )

        email_template = CommunicationTemplate.objects.create(
            name="Contract Email",
            subject_template="Your Contract",
            body_template="<p>Please sign</p>",
            channel="EMAIL",
            category="SYSTEM",
        )

        stage = WorkflowStage.objects.create(
            template=self.workflow_template,
            name="Generate Contract",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="CONTRACT",
            email_template=email_template,
            metadata={"contract_template_id": contract_template.id},
        )

        with patch("core.domains.contracts.services.EventContractService.create_contract_from_template") as mock_create:
            mock_contract = Mock()
            mock_contract.id = 1
            mock_create.return_value = mock_contract

            with patch("core.domains.communications.services.CommunicationService.send_communication_by_template"):
                stage._execute_automation(self.event)
                mock_create.assert_called_once()


class WorkflowEngineTestCase(TestCase):
    """Test cases for WorkflowEngine"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email="client@test.com", first_name="Test", last_name="Client", role="CLIENT"
        )

        self.event_type = EventType.objects.create(name="Wedding")

        self.workflow_template = WorkflowTemplate.objects.create(
            name="Wedding Workflow", description="Standard wedding workflow", event_type=self.event_type, is_active=True
        )

        # Create stages
        self.lead_stage_1 = WorkflowStage.objects.create(
            template=self.workflow_template,
            name="Initial Contact",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
        )

        self.lead_stage_2 = WorkflowStage.objects.create(
            template=self.workflow_template, name="Quote Stage", stage="LEAD", order=2, is_automated=False
        )

        self.production_stage = WorkflowStage.objects.create(
            template=self.workflow_template, name="Event Preparation", stage="PRODUCTION", order=1, is_automated=False
        )

    def test_assign_initial_workflow(self):
        """Test initial workflow assignment"""
        event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            workflow_template=self.workflow_template,
            name="Test Wedding",
            start_date=date.today() + timedelta(days=30),
        )

        with patch("core.domains.notifications.services.NotificationService.create_notification"):
            WorkflowEngine.assign_initial_workflow(event)

        event.refresh_from_db()
        self.assertEqual(event.current_stage, self.lead_stage_1)

        # Check timeline was created
        timeline = EventTimeline.objects.filter(event=event, action_type="STAGE_CHANGE").first()
        self.assertIsNotNone(timeline)

    def test_trigger_on_event_created(self):
        """Test trigger_on_event_created executes automation"""
        # Create a stage with trigger_on_event_created
        WorkflowStage.objects.create(
            template=self.workflow_template,
            name="Auto Notification",
            stage="LEAD",
            order=3,
            is_automated=True,
            automation_type="NOTIFICATION",
            trigger_on_event_created=True,
        )

        event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            workflow_template=self.workflow_template,
            name="Test Wedding",
            start_date=date.today() + timedelta(days=30),
        )

        with patch("core.domains.notifications.services.NotificationService.create_notification") as mock_notify:
            WorkflowEngine.assign_initial_workflow(event)
            # Should be called twice: once for first stage, once for trigger_on_event_created stage
            self.assertEqual(mock_notify.call_count, 2)

    def test_progress_workflow_within_stage_type(self):
        """Test progression within the same stage type"""
        event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            workflow_template=self.workflow_template,
            name="Test Wedding",
            start_date=date.today() + timedelta(days=30),
            current_stage=self.lead_stage_1,
        )

        result = WorkflowEngine.progress_workflow(event, trigger_type="STATUS_CHANGE")

        event.refresh_from_db()
        self.assertTrue(result)
        self.assertEqual(event.current_stage, self.lead_stage_2)

    def test_progress_workflow_cross_stage_type(self):
        """Test progression from LEAD to PRODUCTION"""
        event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            workflow_template=self.workflow_template,
            name="Test Wedding",
            start_date=date.today() + timedelta(days=30),
            current_stage=self.lead_stage_2,
            status="CONFIRMED",
        )

        result = WorkflowEngine.progress_workflow(event, trigger_type="STATUS_CHANGE")

        event.refresh_from_db()
        self.assertTrue(result)
        self.assertEqual(event.current_stage, self.production_stage)

    def test_progress_workflow_payment_trigger(self):
        """Test progression triggered by payment"""
        # Create a stage that triggers on payment
        payment_stage = WorkflowStage.objects.create(
            template=self.workflow_template,
            name="Payment Received",
            stage="LEAD",
            order=3,
            is_automated=True,
            automation_type="NOTIFICATION",
            trigger_on_payment_received=True,
        )

        event = Event.objects.create(
            client=self.user,
            event_type=self.event_type,
            workflow_template=self.workflow_template,
            name="Test Wedding",
            start_date=date.today() + timedelta(days=30),
            current_stage=payment_stage,
        )

        with patch("core.domains.notifications.services.NotificationService.create_notification"):
            result = WorkflowEngine.progress_workflow(event, trigger_type="PAYMENT_RECEIVED")

        # Should execute automation but not progress (stay on current stage)
        self.assertFalse(result)

    def test_idempotent_progression(self):
        """Test that progression returns False when no eligible next stage.

        The post_save signal assigns the event to lead_stage_1 on create.
        First progress moves to lead_stage_2. When reset to lead_stage_2,
        there is no next LEAD stage and the event isn't CONFIRMED, so
        cross-category progression to PRODUCTION is not eligible.
        """
        with patch("core.domains.notifications.services.NotificationService.create_notification"):
            event = Event.objects.create(
                client=self.user,
                event_type=self.event_type,
                workflow_template=self.workflow_template,
                name="Test Wedding",
                start_date=timezone.now() + timedelta(days=30),
                current_stage=self.lead_stage_2,
            )

        # Signal has set current_stage to lead_stage_1
        event.refresh_from_db()

        # First progression: lead_stage_1 -> lead_stage_2
        result1 = WorkflowEngine.progress_workflow(event, trigger_type="STATUS_CHANGE")

        # Reset to lead_stage_2 and try again
        event.current_stage = self.lead_stage_2
        event.save()
        result2 = WorkflowEngine.progress_workflow(event, trigger_type="STATUS_CHANGE")

        self.assertTrue(result1)
        # No eligible next stage (not CONFIRMED for cross-category, no more LEAD stages)
        self.assertFalse(result2)


class WorkflowTriggerAPITestCase(TestCase):
    """Test cases for WorkflowTrigger API"""

    def setUp(self):
        """Set up test data"""
        self.admin_user = User.objects.create_user(
            email="admin@test.com", first_name="Admin", last_name="User", role="ADMIN", is_staff=True
        )

        self.client_user = User.objects.create_user(
            email="client@test.com", first_name="Test", last_name="Client", role="CLIENT"
        )

        self.event_type = EventType.objects.create(name="Wedding")

        self.workflow_template = WorkflowTemplate.objects.create(
            name="Wedding Workflow", event_type=self.event_type, is_active=True
        )

        self.stage = WorkflowStage.objects.create(
            template=self.workflow_template,
            name="Test Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="NOTIFICATION",
        )

        self.event = Event.objects.create(
            client=self.client_user,
            event_type=self.event_type,
            workflow_template=self.workflow_template,
            name="Test Wedding",
            start_date=date.today() + timedelta(days=30),
            current_stage=self.stage,
        )

    def test_create_trigger_record(self):
        """Test WorkflowTrigger record creation"""
        trigger = WorkflowTrigger.objects.create(
            event=self.event,
            stage=self.stage,
            trigger_type="PAYMENT_RECEIVED",
            details="Payment of 5000 PHP received",
            processed=True,
        )

        self.assertEqual(trigger.event, self.event)
        self.assertEqual(trigger.stage, self.stage)
        self.assertEqual(trigger.trigger_type, "PAYMENT_RECEIVED")
        self.assertTrue(trigger.processed)

    def test_trigger_types(self):
        """Test all trigger types are valid"""
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
            trigger = WorkflowTrigger(event=self.event, trigger_type=trigger_type)
            # Should not raise
            trigger.full_clean()
