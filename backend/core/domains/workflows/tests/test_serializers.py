# backend/core/domains/workflows/tests/test_serializers.py
"""
Unit tests for workflows domain serializers.

Tests:
- WorkflowTemplateSerializer (basic serialization)
- WorkflowStageSerializer (basic serialization)
- WorkflowTriggerSerializer (trigger data serialization)
- WorkflowStageDetailSerializer (detailed serialization with relations)
- WorkflowTemplateDetailSerializer (detailed serialization with stages)
- WorkflowTemplateWithStagesSerializer (create/update with nested stages)
"""

from django.contrib.auth import get_user_model

import pytest

from core.domains.workflows.basic_serializers import (
    WorkflowStageSerializer,
    WorkflowTemplateSerializer,
)
from core.domains.workflows.models import (
    WorkflowStage,
    WorkflowTemplate,
    WorkflowTrigger,
)
from core.domains.workflows.serializers import (
    WorkflowStageDetailSerializer,
    WorkflowTemplateDetailSerializer,
    WorkflowTemplateWithStagesSerializer,
    WorkflowTriggerSerializer,
)

User = get_user_model()


@pytest.mark.django_db
class TestWorkflowTemplateSerializer:
    """Tests for WorkflowTemplateSerializer."""

    def test_serialize_workflow_template(self, event_type_factory):
        """Test basic workflow template serialization."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name="Wedding Workflow", description="Standard wedding workflow", event_type=event_type, is_active=True
        )

        serializer = WorkflowTemplateSerializer(template)
        data = serializer.data

        assert data["id"] == template.id
        assert data["name"] == "Wedding Workflow"
        assert data["description"] == "Standard wedding workflow"
        assert data["event_type"] == event_type.id
        assert data["is_active"] is True
        assert "stages_count" in data
        assert "events_using_count" in data

    def test_serialize_template_stages_count(self, event_type_factory):
        """Test stages_count field in serialized output."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)

        serializer = WorkflowTemplateSerializer(template)
        data = serializer.data

        assert data["stages_count"] == 2

    def test_deserialize_workflow_template(self, event_type_factory):
        """Test workflow template deserialization."""
        event_type = event_type_factory()

        data = {
            "name": "New Workflow",
            "description": "A new workflow description",
            "event_type": event_type.id,
            "is_active": True,
        }

        serializer = WorkflowTemplateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        validated = serializer.validated_data
        assert validated["name"] == "New Workflow"
        assert validated["description"] == "A new workflow description"

    def test_deserialize_template_invalid_data(self):
        """Test validation errors for invalid template data."""
        data = {"description": "Missing required name field"}

        serializer = WorkflowTemplateSerializer(data=data)
        assert not serializer.is_valid()
        assert "name" in serializer.errors


@pytest.mark.django_db
class TestWorkflowStageSerializer:
    """Tests for WorkflowStageSerializer."""

    def test_serialize_workflow_stage(self, event_type_factory):
        """Test basic workflow stage serialization."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage = WorkflowStage.objects.create(
            template=template,
            name="Initial Contact",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="EMAIL",
            trigger_time="ON_CREATION",
        )

        serializer = WorkflowStageSerializer(stage)
        data = serializer.data

        assert data["id"] == stage.id
        assert data["template"] == template.id
        assert data["name"] == "Initial Contact"
        assert data["stage"] == "LEAD"
        assert data["stage_display"] == "Lead"
        assert data["order"] == 1
        assert data["is_automated"] is True
        assert data["automation_type"] == "EMAIL"
        assert data["trigger_time"] == "ON_CREATION"

    def test_serialize_stage_with_trigger_flags(self, event_type_factory):
        """Test serialization of trigger flags."""
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

        serializer = WorkflowStageSerializer(stage)
        data = serializer.data

        assert data["trigger_on_payment_received"] is True
        assert data["trigger_on_quote_accepted"] is True
        assert data["trigger_on_contract_signed"] is False
        assert data["trigger_on_event_created"] is False
        assert data["trigger_on_quote_sent"] is True

    def test_serialize_stage_with_metadata(self, event_type_factory):
        """Test serialization of metadata field."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        metadata = {"task_priority": "HIGH", "reminder_type": "WORKFLOW_REMINDER", "days_until_due": 7}

        stage = WorkflowStage.objects.create(
            template=template, name="Task Stage", stage="LEAD", order=1, metadata=metadata
        )

        serializer = WorkflowStageSerializer(stage)
        data = serializer.data

        assert data["metadata"] == metadata

    def test_deserialize_workflow_stage(self, event_type_factory):
        """Test workflow stage deserialization."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        data = {"template": template.id, "name": "New Stage", "stage": "LEAD", "order": 1, "is_automated": False}

        serializer = WorkflowStageSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        validated = serializer.validated_data
        assert validated["name"] == "New Stage"
        assert validated["stage"] == "LEAD"
        assert validated["order"] == 1

    def test_deserialize_stage_invalid_stage_type(self, event_type_factory):
        """Test validation error for invalid stage type."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        data = {"template": template.id, "name": "Invalid Stage", "stage": "INVALID_TYPE", "order": 1}

        serializer = WorkflowStageSerializer(data=data)
        assert not serializer.is_valid()
        assert "stage" in serializer.errors


@pytest.mark.django_db
class TestWorkflowStageDetailSerializer:
    """Tests for WorkflowStageDetailSerializer."""

    def test_serialize_stage_with_email_template_name(self, event_type_factory):
        """Test serialization includes email template name."""
        from core.domains.communications.models import CommunicationTemplate

        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        email_template = CommunicationTemplate.objects.create(
            name="Welcome Email",
            subject_template="Welcome",
            body_template="<p>Welcome</p>",
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

        serializer = WorkflowStageDetailSerializer(stage)
        data = serializer.data

        assert data["email_template_name"] == "Welcome Email"

    def test_serialize_stage_with_contract_template_name(self, event_type_factory):
        """Test serialization includes contract template name."""
        from core.domains.contracts.models import ContractTemplate

        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        contract_template = ContractTemplate.objects.create(
            name="Standard Contract", content="Contract content here", is_active=True
        )

        stage = WorkflowStage.objects.create(
            template=template,
            name="Contract Stage",
            stage="LEAD",
            order=1,
            is_automated=True,
            automation_type="CONTRACT",
            contract_template=contract_template,
        )

        serializer = WorkflowStageDetailSerializer(stage)
        data = serializer.data

        assert data["contract_template_name"] == "Standard Contract"

    def test_serialize_stage_null_templates(self, event_type_factory):
        """Test serialization handles null template names."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(template=template, name="Simple Stage", stage="LEAD", order=1)

        serializer = WorkflowStageDetailSerializer(stage)
        data = serializer.data

        assert data["email_template_name"] is None
        assert data["contract_template_name"] is None


@pytest.mark.django_db
class TestWorkflowTemplateDetailSerializer:
    """Tests for WorkflowTemplateDetailSerializer."""

    def test_serialize_template_with_stages(self, event_type_factory):
        """Test detailed template serialization includes stages."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)

        serializer = WorkflowTemplateDetailSerializer(template)
        data = serializer.data

        assert "stages" in data
        assert len(data["stages"]) == 2
        assert data["stages"][0]["name"] == "Stage 1"
        assert data["stages"][1]["name"] == "Stage 2"

    def test_serialize_template_with_event_type_name(self, event_type_factory):
        """Test serialization includes event type name."""
        event_type = event_type_factory(name="Wedding")
        template = WorkflowTemplate.objects.create(name="Wedding Workflow", event_type=event_type)

        serializer = WorkflowTemplateDetailSerializer(template)
        data = serializer.data

        assert data["event_type_name"] == "Wedding"


@pytest.mark.django_db
class TestWorkflowTemplateWithStagesSerializer:
    """Tests for WorkflowTemplateWithStagesSerializer."""

    def test_create_template_with_stages(self, event_type_factory):
        """Test creating template with nested stages via serializer.create().

        The WorkflowStageSerializer requires a 'template' FK during validation,
        but the parent's create() method assigns the template explicitly after
        creation. We test create() directly with pre-validated data to verify
        the nested creation logic works correctly.
        """
        event_type = event_type_factory()

        # Build validated_data structure as it would appear after validation
        validated_data = {
            "name": "New Workflow",
            "description": "A workflow with stages",
            "event_type": event_type,
            "is_active": True,
            "stages": [
                {
                    "name": "Stage 1",
                    "stage": "LEAD",
                    "order": 1,
                    "is_automated": False,
                },
                {
                    "name": "Stage 2",
                    "stage": "LEAD",
                    "order": 2,
                    "is_automated": False,
                },
            ],
        }

        serializer = WorkflowTemplateWithStagesSerializer()
        template = serializer.create(validated_data)

        assert template.name == "New Workflow"
        assert template.stages.count() == 2

    def test_create_template_without_stages(self, event_type_factory):
        """Test creating template without nested stages."""
        event_type = event_type_factory()

        data = {"name": "Simple Workflow", "event_type": event_type.id, "is_active": True}

        serializer = WorkflowTemplateWithStagesSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        template = serializer.save()

        assert template.name == "Simple Workflow"
        assert template.stages.count() == 0

    def test_update_template_replaces_stages(self, event_type_factory):
        """Test updating template replaces all existing stages via update().

        The WorkflowStageSerializer requires a 'template' FK during validation,
        but the parent's update() method assigns the template explicitly. We
        test update() directly with pre-validated data to verify the stage
        replacement logic works correctly.
        """
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Original Workflow", event_type=event_type)

        # Create initial stages
        WorkflowStage.objects.create(template=template, name="Old Stage 1", stage="LEAD", order=1)
        WorkflowStage.objects.create(template=template, name="Old Stage 2", stage="LEAD", order=2)

        # Build validated_data as it would appear after validation
        validated_data = {
            "name": "Updated Workflow",
            "event_type": event_type,
            "is_active": True,
            "stages": [
                {
                    "name": "New Stage 1",
                    "stage": "LEAD",
                    "order": 1,
                    "is_automated": False,
                },
                {
                    "name": "New Stage 2",
                    "stage": "PRODUCTION",
                    "order": 1,
                    "is_automated": False,
                },
                {
                    "name": "New Stage 3",
                    "stage": "POST_PRODUCTION",
                    "order": 1,
                    "is_automated": False,
                },
            ],
        }

        serializer = WorkflowTemplateWithStagesSerializer(instance=template)
        updated_template = serializer.update(template, validated_data)

        assert updated_template.name == "Updated Workflow"
        assert updated_template.stages.count() == 3

        stage_names = list(updated_template.stages.values_list("name", flat=True))
        assert "New Stage 1" in stage_names
        assert "New Stage 2" in stage_names
        assert "New Stage 3" in stage_names
        assert "Old Stage 1" not in stage_names

    def test_update_template_without_stages_preserves_existing(self, event_type_factory):
        """Test updating template without stages field preserves existing stages."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Original Workflow", event_type=event_type)

        WorkflowStage.objects.create(template=template, name="Existing Stage", stage="LEAD", order=1)

        update_data = {
            "name": "Updated Name",
            "event_type": event_type.id,
            "is_active": True,
            # No 'stages' field
        }

        serializer = WorkflowTemplateWithStagesSerializer(template, data=update_data)
        assert serializer.is_valid(), serializer.errors

        updated_template = serializer.save()

        assert updated_template.name == "Updated Name"
        assert updated_template.stages.count() == 1
        assert updated_template.stages.first().name == "Existing Stage"


@pytest.mark.django_db
class TestWorkflowTriggerSerializer:
    """Tests for WorkflowTriggerSerializer."""

    def test_serialize_workflow_trigger(self, event_factory, event_type_factory):
        """Test workflow trigger serialization."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage = WorkflowStage.objects.create(template=template, name="Test Stage", stage="LEAD", order=1)

        event = event_factory(event_type=event_type, workflow_template=template, name="Test Event")

        trigger = WorkflowTrigger.objects.create(
            event=event,
            stage=stage,
            trigger_type="PAYMENT_RECEIVED",
            details="Payment of $500 received",
            result_data={"amount": 500},
            processed=True,
        )

        serializer = WorkflowTriggerSerializer(trigger)
        data = serializer.data

        assert data["id"] == trigger.id
        assert data["event"] == event.id
        assert data["event_name"] == "Test Event"
        assert data["stage"] == stage.id
        assert data["stage_name"] == "Test Stage"
        assert data["trigger_type"] == "PAYMENT_RECEIVED"
        assert data["trigger_type_display"] == "Payment Received"
        assert data["details"] == "Payment of $500 received"
        assert data["result_data"] == {"amount": 500}
        assert data["processed"] is True

    def test_serialize_trigger_without_stage(self, event_factory, event_type_factory):
        """Test serialization of trigger without associated stage."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type, name="Test Event")

        trigger = WorkflowTrigger.objects.create(
            event=event, stage=None, trigger_type="EVENT_CREATED", details="Event was created"
        )

        serializer = WorkflowTriggerSerializer(trigger)
        data = serializer.data

        assert data["stage"] is None
        assert data["stage_name"] is None

    def test_serialize_trigger_event_name_method(self, event_factory, event_type_factory):
        """Test get_event_name method returns correct value."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type, name="My Wedding")

        trigger = WorkflowTrigger.objects.create(event=event, trigger_type="QUOTE_ACCEPTED")

        serializer = WorkflowTriggerSerializer(trigger)
        data = serializer.data

        assert data["event_name"] == "My Wedding"

    def test_serialize_trigger_event_name_fallback(self, event_factory, event_type_factory):
        """Test get_event_name falls back to Event #ID if no name."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type, name="")

        trigger = WorkflowTrigger.objects.create(event=event, trigger_type="QUOTE_ACCEPTED")

        serializer = WorkflowTriggerSerializer(trigger)
        data = serializer.data

        assert data["event_name"] == f"Event #{event.id}"

    def test_serialize_multiple_triggers(self, event_factory, event_type_factory):
        """Test serialization of multiple triggers."""
        event_type = event_type_factory()
        event = event_factory(event_type=event_type)

        WorkflowTrigger.objects.create(event=event, trigger_type="EVENT_CREATED")
        WorkflowTrigger.objects.create(event=event, trigger_type="PAYMENT_RECEIVED")
        WorkflowTrigger.objects.create(event=event, trigger_type="CONTRACT_SIGNED")

        triggers = WorkflowTrigger.objects.filter(event=event)
        serializer = WorkflowTriggerSerializer(triggers, many=True)
        data = serializer.data

        assert len(data) == 3

    def test_deserialize_workflow_trigger(self, event_factory, event_type_factory):
        """Test workflow trigger deserialization."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage = WorkflowStage.objects.create(template=template, name="Test Stage", stage="LEAD", order=1)

        event = event_factory(event_type=event_type)

        data = {
            "event": event.id,
            "stage": stage.id,
            "trigger_type": "MANUAL_TRIGGER",
            "details": "Manually triggered by admin",
            "result_data": {"triggered_by": 1},
            "processed": False,
        }

        serializer = WorkflowTriggerSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        validated = serializer.validated_data
        assert validated["trigger_type"] == "MANUAL_TRIGGER"
        assert validated["details"] == "Manually triggered by admin"
