# backend/core/domains/workflows/tests/test_client_views.py

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.domains.events.models import Event, EventType
from core.domains.workflows.models import WorkflowStage, WorkflowTemplate

User = get_user_model()


class ClientWorkflowProgressAPITestCase(TestCase):
    """Test cases for client workflow progress API"""

    def setUp(self):
        """Set up test data"""
        self.client_user = User.objects.create_user(
            email="client@test.com", first_name="Test", last_name="Client", role="CLIENT"
        )

        self.other_client = User.objects.create_user(
            email="other@test.com", first_name="Other", last_name="Client", role="CLIENT"
        )

        self.event_type = EventType.objects.create(name="Wedding")

        self.workflow_template = WorkflowTemplate.objects.create(
            name="Wedding Workflow", event_type=self.event_type, is_active=True
        )

        # Create stages
        self.lead_stage_1 = WorkflowStage.objects.create(
            template=self.workflow_template, name="Initial Contact", stage="LEAD", order=1
        )

        self.lead_stage_2 = WorkflowStage.objects.create(
            template=self.workflow_template, name="Quote Review", stage="LEAD", order=2
        )

        self.production_stage = WorkflowStage.objects.create(
            template=self.workflow_template, name="Event Preparation", stage="PRODUCTION", order=1
        )

        self.post_production_stage = WorkflowStage.objects.create(
            template=self.workflow_template, name="Follow-up", stage="POST_PRODUCTION", order=1
        )

        self.event = Event.objects.create(
            client=self.client_user,
            event_type=self.event_type,
            workflow_template=self.workflow_template,
            name="Test Wedding",
            start_date=date.today() + timedelta(days=30),
        )
        # The post_save signal resets current_stage to the first LEAD stage,
        # so we use .update() to set it to lead_stage_2 after creation.
        Event.objects.filter(id=self.event.id).update(current_stage=self.lead_stage_2)
        self.event.refresh_from_db()

        self.api_client = APIClient()

    def test_get_event_progress_authenticated(self):
        """Test getting workflow progress for authenticated client"""
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.get(f"/api/workflows/client/workflows/events/{self.event.id}/progress/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data["current_stage_id"], self.lead_stage_2.id)
        self.assertEqual(data["current_stage_name"], "Quote Review")
        self.assertEqual(data["current_stage_type"], "LEAD")
        self.assertEqual(data["total_stages"], 4)
        self.assertEqual(data["completed_stages"], 1)  # First LEAD stage is completed
        self.assertGreater(data["progress_percentage"], 0)
        self.assertEqual(len(data["stages"]), 4)

    def test_get_event_progress_unauthenticated(self):
        """Test that unauthenticated access is denied"""
        response = self.api_client.get(f"/api/workflows/client/workflows/events/{self.event.id}/progress/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_event_progress_wrong_client(self):
        """Test that other clients cannot access event progress"""
        self.api_client.force_authenticate(user=self.other_client)

        response = self.api_client.get(f"/api/workflows/client/workflows/events/{self.event.id}/progress/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_event_progress_no_workflow(self):
        """Test error when event has no workflow"""
        event_no_workflow = Event.objects.create(
            client=self.client_user,
            event_type=self.event_type,
            name="No Workflow Event",
            start_date=date.today() + timedelta(days=30),
        )

        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.get(f"/api/workflows/client/workflows/events/{event_no_workflow.id}/progress/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_stage_status_calculation(self):
        """Test that stage statuses are calculated correctly"""
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.get(f"/api/workflows/client/workflows/events/{self.event.id}/progress/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stages = response.json()["stages"]

        # Find stages by name
        stage_statuses = {s["name"]: s["status"] for s in stages}

        self.assertEqual(stage_statuses["Initial Contact"], "completed")
        self.assertEqual(stage_statuses["Quote Review"], "current")
        self.assertEqual(stage_statuses["Event Preparation"], "pending")
        self.assertEqual(stage_statuses["Follow-up"], "pending")

    def test_progress_percentage_at_completion(self):
        """Test progress percentage when at last stage"""
        # Move to last stage
        self.event.current_stage = self.post_production_stage
        self.event.save()

        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.get(f"/api/workflows/client/workflows/events/{self.event.id}/progress/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # All previous stages should be completed
        self.assertEqual(data["completed_stages"], 3)
        self.assertEqual(data["progress_percentage"], 75.0)  # 3/4 = 75%

    def test_event_not_found(self):
        """Test error for non-existent event"""
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.get("/api/workflows/client/workflows/events/99999/progress/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
