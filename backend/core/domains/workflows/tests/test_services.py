# backend/core/domains/workflows/tests/test_services.py
"""
Unit tests for workflows domain services.

Tests:
- WorkflowTemplateService: CRUD operations, filtering
- WorkflowStageService: CRUD operations, reordering, deletion
"""


from django.contrib.auth import get_user_model

import pytest

from core.domains.workflows.exceptions import (
    DuplicateStageOrder,
    WorkflowStageNotFound,
    WorkflowTemplateNotFound,
)
from core.domains.workflows.models import WorkflowStage, WorkflowTemplate
from core.domains.workflows.services import (
    WorkflowStageService,
    WorkflowTemplateService,
)

User = get_user_model()


@pytest.mark.django_db
class TestWorkflowTemplateService:
    """Tests for WorkflowTemplateService."""

    def test_get_all_templates(self, event_type_factory):
        """Test retrieving all workflow templates."""
        event_type = event_type_factory()

        WorkflowTemplate.objects.create(name="Template 1", event_type=event_type, is_active=True)
        WorkflowTemplate.objects.create(name="Template 2", event_type=event_type, is_active=True)
        WorkflowTemplate.objects.create(name="Template 3", event_type=event_type, is_active=False)

        templates = WorkflowTemplateService.get_all_templates()

        assert templates.count() == 3

    def test_get_all_templates_with_search_query(self, event_type_factory):
        """Test filtering templates by search query."""
        event_type = event_type_factory()

        WorkflowTemplate.objects.create(name="Wedding Workflow", description="For weddings", event_type=event_type)
        WorkflowTemplate.objects.create(
            name="Corporate Event", description="For corporate events", event_type=event_type
        )
        WorkflowTemplate.objects.create(name="Birthday Party", description="For birthdays", event_type=event_type)

        # Search by name
        templates = WorkflowTemplateService.get_all_templates(search_query="Wedding")
        assert templates.count() == 1
        assert templates.first().name == "Wedding Workflow"

        # Search by description
        templates = WorkflowTemplateService.get_all_templates(search_query="corporate")
        assert templates.count() == 1
        assert templates.first().name == "Corporate Event"

    def test_get_all_templates_by_event_type(self, event_type_factory):
        """Test filtering templates by event type."""
        event_type1 = event_type_factory(name="Wedding")
        event_type2 = event_type_factory(name="Corporate")

        WorkflowTemplate.objects.create(name="Wedding Workflow", event_type=event_type1)
        WorkflowTemplate.objects.create(name="Corporate Workflow", event_type=event_type2)

        templates = WorkflowTemplateService.get_all_templates(event_type_id=event_type1.id)

        assert templates.count() == 1
        assert templates.first().name == "Wedding Workflow"

    def test_get_all_templates_by_active_status(self, event_type_factory):
        """Test filtering templates by active status."""
        event_type = event_type_factory()

        WorkflowTemplate.objects.create(name="Active Template", event_type=event_type, is_active=True)
        WorkflowTemplate.objects.create(name="Inactive Template", event_type=event_type, is_active=False)

        active_templates = WorkflowTemplateService.get_all_templates(is_active=True)
        assert active_templates.count() == 1
        assert active_templates.first().name == "Active Template"

        inactive_templates = WorkflowTemplateService.get_all_templates(is_active=False)
        assert inactive_templates.count() == 1
        assert inactive_templates.first().name == "Inactive Template"

    def test_get_template_by_id_success(self, event_type_factory):
        """Test retrieving a template by ID."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Template", event_type=event_type)

        retrieved = WorkflowTemplateService.get_template_by_id(template.id)

        assert retrieved == template
        assert retrieved.name == "Test Template"

    def test_get_template_by_id_not_found(self):
        """Test WorkflowTemplateNotFound exception for non-existent ID."""
        with pytest.raises(WorkflowTemplateNotFound):
            WorkflowTemplateService.get_template_by_id(99999)

    def test_create_template_without_stages(self, event_type_factory):
        """Test creating a template without stages."""
        event_type = event_type_factory()

        template_data = {
            "name": "New Workflow",
            "description": "A new workflow",
            "event_type": event_type,
            "is_active": True,
        }

        template = WorkflowTemplateService.create_template(template_data)

        assert template.name == "New Workflow"
        assert template.description == "A new workflow"
        assert template.event_type == event_type
        assert template.is_active is True
        assert template.stages.count() == 0

    def test_create_template_with_stages(self, event_type_factory):
        """Test creating a template with nested stages."""
        event_type = event_type_factory()

        template_data = {
            "name": "Workflow With Stages",
            "event_type": event_type,
            "is_active": True,
            "stages": [
                {"name": "Stage 1", "stage": "LEAD", "order": 1, "is_automated": False},
                {"name": "Stage 2", "stage": "PRODUCTION", "order": 1, "is_automated": False},
            ],
        }

        template = WorkflowTemplateService.create_template(template_data)

        assert template.name == "Workflow With Stages"
        assert template.stages.count() == 2

    def test_create_template_with_duplicate_stage_order_raises_error(self, event_type_factory):
        """Test that duplicate stage order raises DuplicateStageOrder."""
        event_type = event_type_factory()

        template_data = {
            "name": "Workflow",
            "event_type": event_type,
            "is_active": True,
            "stages": [
                {"name": "Stage 1", "stage": "LEAD", "order": 1, "is_automated": False},
                {
                    "name": "Stage 2",
                    "stage": "LEAD",
                    "order": 1,  # Duplicate order for same stage type
                    "is_automated": False,
                },
            ],
        }

        with pytest.raises(DuplicateStageOrder):
            WorkflowTemplateService.create_template(template_data)

    def test_update_template_basic_fields(self, event_type_factory):
        """Test updating basic template fields."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(
            name="Original Name", description="Original Description", event_type=event_type, is_active=True
        )

        update_data = {"name": "Updated Name", "description": "Updated Description", "is_active": False}

        updated = WorkflowTemplateService.update_template(template.id, update_data)

        assert updated.name == "Updated Name"
        assert updated.description == "Updated Description"
        assert updated.is_active is False

    def test_update_template_with_stages(self, event_type_factory):
        """Test updating template replaces existing stages."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Original", event_type=event_type)

        WorkflowStage.objects.create(template=template, name="Old Stage", stage="LEAD", order=1)

        update_data = {
            "name": "Updated",
            "stages": [
                {"name": "New Stage 1", "stage": "LEAD", "order": 1, "is_automated": False},
                {"name": "New Stage 2", "stage": "PRODUCTION", "order": 1, "is_automated": False},
            ],
        }

        updated = WorkflowTemplateService.update_template(template.id, update_data)

        assert updated.stages.count() == 2
        stage_names = list(updated.stages.values_list("name", flat=True))
        assert "New Stage 1" in stage_names
        assert "New Stage 2" in stage_names
        assert "Old Stage" not in stage_names

    def test_delete_template_success(self, event_type_factory):
        """Test deleting a workflow template."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="To Delete", event_type=event_type)
        template_id = template.id

        result = WorkflowTemplateService.delete_template(template_id)

        assert result is True
        with pytest.raises(WorkflowTemplateNotFound):
            WorkflowTemplateService.get_template_by_id(template_id)

    def test_delete_template_not_found(self):
        """Test deleting non-existent template raises error."""
        with pytest.raises(WorkflowTemplateNotFound):
            WorkflowTemplateService.delete_template(99999)


@pytest.mark.django_db
class TestWorkflowStageService:
    """Tests for WorkflowStageService."""

    def test_get_stages_for_template(self, event_type_factory):
        """Test retrieving all stages for a template."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        WorkflowStage.objects.create(template=template, name="Lead Stage 1", stage="LEAD", order=1)
        WorkflowStage.objects.create(template=template, name="Lead Stage 2", stage="LEAD", order=2)
        WorkflowStage.objects.create(template=template, name="Production Stage", stage="PRODUCTION", order=1)

        stages = WorkflowStageService.get_stages_for_template(template.id)

        assert stages.count() == 3
        # Check ordering by stage type and order
        stage_list = list(stages)
        assert stage_list[0].name == "Lead Stage 1"
        assert stage_list[1].name == "Lead Stage 2"

    def test_get_stages_for_template_not_found(self):
        """Test that non-existent template raises error."""
        with pytest.raises(WorkflowTemplateNotFound):
            WorkflowStageService.get_stages_for_template(99999)

    def test_get_stage_by_id_success(self, event_type_factory):
        """Test retrieving a stage by ID."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage = WorkflowStage.objects.create(template=template, name="Test Stage", stage="LEAD", order=1)

        retrieved = WorkflowStageService.get_stage_by_id(stage.id)

        assert retrieved == stage
        assert retrieved.name == "Test Stage"

    def test_get_stage_by_id_not_found(self):
        """Test WorkflowStageNotFound exception."""
        with pytest.raises(WorkflowStageNotFound):
            WorkflowStageService.get_stage_by_id(99999)

    def test_create_stage_success(self, event_type_factory):
        """Test creating a new stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage_data = {
            "name": "New Stage",
            "stage": "LEAD",
            "order": 1,
            "is_automated": True,
            "automation_type": "EMAIL",
        }

        stage = WorkflowStageService.create_stage(template.id, stage_data)

        assert stage.name == "New Stage"
        assert stage.stage == "LEAD"
        assert stage.order == 1
        assert stage.is_automated is True
        assert stage.automation_type == "EMAIL"
        assert stage.template == template

    def test_create_stage_auto_assigns_order(self, event_type_factory):
        """Test that order is auto-assigned if not provided."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)

        stage_data = {
            "name": "Stage 2",
            "stage": "LEAD",
            "is_automated": False,
            # No order specified
        }

        stage = WorkflowStageService.create_stage(template.id, stage_data)

        assert stage.order == 2

    def test_create_stage_template_not_found(self):
        """Test creating stage for non-existent template."""
        with pytest.raises(WorkflowTemplateNotFound):
            WorkflowStageService.create_stage(99999, {"name": "Test", "stage": "LEAD", "order": 1})

    def test_create_stage_duplicate_order_raises_error(self, event_type_factory):
        """Test that duplicate order raises error."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)

        stage_data = {
            "name": "Stage 2",
            "stage": "LEAD",
            "order": 1,  # Duplicate order
        }

        with pytest.raises(DuplicateStageOrder):
            WorkflowStageService.create_stage(template.id, stage_data)

    def test_update_stage_basic_fields(self, event_type_factory):
        """Test updating basic stage fields."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage = WorkflowStage.objects.create(
            template=template, name="Original Name", stage="LEAD", order=1, is_automated=False
        )

        update_data = {
            "name": "Updated Name",
            "is_automated": True,
            "automation_type": "TASK",
            "task_description": "Follow up with client",
        }

        updated = WorkflowStageService.update_stage(stage.id, update_data)

        assert updated.name == "Updated Name"
        assert updated.is_automated is True
        assert updated.automation_type == "TASK"
        assert updated.task_description == "Follow up with client"

    def test_update_stage_reorder(self, event_type_factory):
        """Test reordering a stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage1 = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        stage2 = WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)
        stage3 = WorkflowStage.objects.create(template=template, name="Stage 3", stage="LEAD", order=3)

        # Move stage3 to position 1
        WorkflowStageService.update_stage(stage3.id, {"order": 1})

        stage1.refresh_from_db()
        stage2.refresh_from_db()
        stage3.refresh_from_db()

        # Stage 3 should now be order 1
        assert stage3.order == 1

    def test_update_stage_not_found(self):
        """Test updating non-existent stage raises error."""
        with pytest.raises(WorkflowStageNotFound):
            WorkflowStageService.update_stage(99999, {"name": "Updated"})

    def test_reorder_stages(self, event_type_factory):
        """Test reordering multiple stages at once."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage1 = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        stage2 = WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)
        stage3 = WorkflowStage.objects.create(template=template, name="Stage 3", stage="LEAD", order=3)

        order_mapping = {str(stage1.id): 3, str(stage2.id): 1, str(stage3.id): 2}

        WorkflowStageService.reorder_stages(template.id, "LEAD", order_mapping)

        stage1.refresh_from_db()
        stage2.refresh_from_db()
        stage3.refresh_from_db()

        assert stage1.order == 3
        assert stage2.order == 1
        assert stage3.order == 2

    def test_reorder_stages_template_not_found(self):
        """Test reordering for non-existent template raises error."""
        with pytest.raises(WorkflowTemplateNotFound):
            WorkflowStageService.reorder_stages(99999, "LEAD", {})

    def test_delete_stage_success(self, event_type_factory):
        """Test deleting a workflow stage."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)
        stage = WorkflowStage.objects.create(template=template, name="To Delete", stage="LEAD", order=1)
        stage_id = stage.id

        result = WorkflowStageService.delete_stage(stage_id)

        assert result is True
        with pytest.raises(WorkflowStageNotFound):
            WorkflowStageService.get_stage_by_id(stage_id)

    def test_delete_stage_reorders_remaining(self, event_type_factory):
        """Test that deleting a stage reorders remaining stages."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage1 = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        stage2 = WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)
        stage3 = WorkflowStage.objects.create(template=template, name="Stage 3", stage="LEAD", order=3)

        # Delete stage 2
        WorkflowStageService.delete_stage(stage2.id)

        stage1.refresh_from_db()
        stage3.refresh_from_db()

        # Stage 1 should stay at order 1
        assert stage1.order == 1
        # Stage 3 should now be order 2
        assert stage3.order == 2

    def test_delete_stage_not_found(self):
        """Test deleting non-existent stage raises error."""
        with pytest.raises(WorkflowStageNotFound):
            WorkflowStageService.delete_stage(99999)


@pytest.mark.django_db
class TestWorkflowStageServiceEdgeCases:
    """Tests for edge cases in WorkflowStageService."""

    def test_create_first_stage_in_category(self, event_type_factory):
        """Test creating the first stage in a stage category."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        # Create LEAD stages
        WorkflowStage.objects.create(template=template, name="Lead Stage", stage="LEAD", order=1)

        # Create first PRODUCTION stage without specifying order
        stage_data = {"name": "Production Stage", "stage": "PRODUCTION", "is_automated": False}

        stage = WorkflowStageService.create_stage(template.id, stage_data)

        assert stage.stage == "PRODUCTION"
        assert stage.order == 1

    def test_update_stage_change_stage_type(self, event_type_factory):
        """Test changing a stage's stage type."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)

        update_data = {"stage": "PRODUCTION", "order": 1}

        updated = WorkflowStageService.update_stage(stage.id, update_data)

        assert updated.stage == "PRODUCTION"

    def test_delete_middle_stage_reorders_correctly(self, event_type_factory):
        """Test deleting a middle stage correctly reorders remaining ones."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage1 = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        stage2 = WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)
        stage3 = WorkflowStage.objects.create(template=template, name="Stage 3", stage="LEAD", order=3)
        stage4 = WorkflowStage.objects.create(template=template, name="Stage 4", stage="LEAD", order=4)

        # Delete stage 2 (middle stage)
        WorkflowStageService.delete_stage(stage2.id)

        stage1.refresh_from_db()
        stage3.refresh_from_db()
        stage4.refresh_from_db()

        assert stage1.order == 1
        assert stage3.order == 2
        assert stage4.order == 3

    def test_delete_last_stage_no_reordering_needed(self, event_type_factory):
        """Test deleting the last stage doesn't affect other stages."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        stage1 = WorkflowStage.objects.create(template=template, name="Stage 1", stage="LEAD", order=1)
        stage2 = WorkflowStage.objects.create(template=template, name="Stage 2", stage="LEAD", order=2)
        stage3 = WorkflowStage.objects.create(template=template, name="Stage 3", stage="LEAD", order=3)

        # Delete last stage
        WorkflowStageService.delete_stage(stage3.id)

        stage1.refresh_from_db()
        stage2.refresh_from_db()

        assert stage1.order == 1
        assert stage2.order == 2
        assert template.stages.count() == 2

    def test_reorder_only_affects_specified_stage_type(self, event_type_factory):
        """Test reordering only affects stages of the specified type."""
        event_type = event_type_factory()
        template = WorkflowTemplate.objects.create(name="Test Workflow", event_type=event_type)

        lead_stage1 = WorkflowStage.objects.create(template=template, name="Lead 1", stage="LEAD", order=1)
        lead_stage2 = WorkflowStage.objects.create(template=template, name="Lead 2", stage="LEAD", order=2)
        production_stage = WorkflowStage.objects.create(
            template=template, name="Production 1", stage="PRODUCTION", order=1
        )

        # Reorder only LEAD stages
        order_mapping = {str(lead_stage1.id): 2, str(lead_stage2.id): 1}

        WorkflowStageService.reorder_stages(template.id, "LEAD", order_mapping)

        lead_stage1.refresh_from_db()
        lead_stage2.refresh_from_db()
        production_stage.refresh_from_db()

        assert lead_stage1.order == 2
        assert lead_stage2.order == 1
        # Production stage should be unaffected
        assert production_stage.order == 1
