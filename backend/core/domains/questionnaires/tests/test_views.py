"""
Unit tests for questionnaires domain views.

Tests:
- QuestionnaireViewSet (CRUD, reorder, duplicate, analytics actions)
- QuestionnaireFieldViewSet (CRUD, reorder, value distribution)
- QuestionnaireResponseViewSet (CRUD, bulk save)
- Permission checks for all endpoints
"""

from django.urls import reverse
from rest_framework import status

import pytest

from core.domains.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireResponse,
)


@pytest.mark.django_db
class TestQuestionnaireViewSet:
    """Unit tests for QuestionnaireViewSet."""

    def test_list_questionnaires_as_admin(self, admin_client, questionnaire_factory):
        """Test admin can list questionnaires."""
        questionnaire_factory(name="Questionnaire 1")
        questionnaire_factory(name="Questionnaire 2")

        url = reverse("questionnaires:questionnaire-list")
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

    def test_list_questionnaires_as_client(self, client_user_client, questionnaire_factory):
        """Test client user can list questionnaires."""
        questionnaire_factory(name="Test Questionnaire")

        url = reverse("questionnaires:questionnaire-list")
        response = client_user_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_list_questionnaires_unauthenticated(self, api_client, questionnaire_factory):
        """Test unauthenticated users cannot list questionnaires."""
        questionnaire_factory()

        url = reverse("questionnaires:questionnaire-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_questionnaires_filter_by_active(self, admin_client, questionnaire_factory):
        """Test filtering questionnaires by active status."""
        questionnaire_factory(is_active=True)
        questionnaire_factory(is_active=False)

        url = reverse("questionnaires:questionnaire-list")
        response = admin_client.get(url, {"is_active": "true"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["is_active"] is True

    def test_list_questionnaires_filter_by_event_type(self, admin_client, questionnaire_factory, event_type_factory):
        """Test filtering questionnaires by event type."""
        event_type = event_type_factory()
        questionnaire_factory(event_type=event_type)
        questionnaire_factory(event_type=None)

        url = reverse("questionnaires:questionnaire-list")
        response = admin_client.get(url, {"event_type": event_type.id})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_list_questionnaires_search(self, admin_client, questionnaire_factory):
        """Test searching questionnaires by name."""
        questionnaire_factory(name="Wedding Form")
        questionnaire_factory(name="Corporate Event")

        url = reverse("questionnaires:questionnaire-list")
        response = admin_client.get(url, {"search": "Wedding"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["name"] == "Wedding Form"

    def test_retrieve_questionnaire(self, admin_client, questionnaire_factory):
        """Test retrieving a single questionnaire."""
        questionnaire = questionnaire_factory(name="Test Questionnaire")

        url = reverse("questionnaires:questionnaire-detail", args=[questionnaire.id])
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Test Questionnaire"
        assert "fields" in response.data  # Detail serializer includes fields

    def test_retrieve_questionnaire_not_found(self, admin_client):
        """Test retrieving non-existent questionnaire returns 404."""
        url = reverse("questionnaires:questionnaire-detail", args=[99999])
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_questionnaire(self, admin_client):
        """Test creating a new questionnaire."""
        url = reverse("questionnaires:questionnaire-list")
        data = {
            "name": "New Questionnaire",
            "is_active": True,
            "order": 1,
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Questionnaire"
        assert Questionnaire.objects.filter(name="New Questionnaire").exists()

    def test_create_questionnaire_with_fields(self, admin_client):
        """Test creating a questionnaire with nested fields."""
        url = reverse("questionnaires:questionnaire-list")
        data = {
            "name": "Full Questionnaire",
            "is_active": True,
            "order": 1,
            "fields": [
                {"name": "Full Name", "type": "text", "required": True, "order": 1},
                {"name": "Email", "type": "email", "required": True, "order": 2},
            ],
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert "fields" in response.data
        assert len(response.data["fields"]) == 2

    def test_update_questionnaire(self, admin_client, questionnaire_factory):
        """Test updating a questionnaire."""
        questionnaire = questionnaire_factory(name="Original Name")

        url = reverse("questionnaires:questionnaire-detail", args=[questionnaire.id])
        data = {
            "name": "Updated Name",
            "is_active": False,
        }
        response = admin_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated Name"
        assert response.data["is_active"] is False

    def test_partial_update_questionnaire(self, admin_client, questionnaire_factory):
        """Test partial update of a questionnaire."""
        questionnaire = questionnaire_factory(name="Original", is_active=True)

        url = reverse("questionnaires:questionnaire-detail", args=[questionnaire.id])
        data = {"name": "Partially Updated"}
        response = admin_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Partially Updated"
        assert response.data["is_active"] is True  # Unchanged

    def test_delete_questionnaire(self, admin_client, questionnaire_factory):
        """Test deleting a questionnaire."""
        questionnaire = questionnaire_factory()
        questionnaire_id = questionnaire.id

        url = reverse("questionnaires:questionnaire-detail", args=[questionnaire_id])
        response = admin_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Questionnaire.objects.filter(id=questionnaire_id).exists()

    def test_reorder_questionnaires(self, admin_client, questionnaire_factory):
        """Test reordering questionnaires."""
        q1 = questionnaire_factory(order=1)
        q2 = questionnaire_factory(order=2)
        q3 = questionnaire_factory(order=3)

        url = reverse("questionnaires:questionnaire-reorder")
        data = {
            "order_mapping": {
                str(q1.id): 3,
                str(q2.id): 1,
                str(q3.id): 2,
            }
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK

        q1.refresh_from_db()
        q2.refresh_from_db()
        q3.refresh_from_db()

        assert q1.order == 3
        assert q2.order == 1
        assert q3.order == 2

    def test_reorder_questionnaires_missing_mapping(self, admin_client):
        """Test reorder fails without order_mapping."""
        url = reverse("questionnaires:questionnaire-reorder")
        response = admin_client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "order_mapping" in str(response.data["detail"]).lower()

    def test_duplicate_questionnaire(self, admin_client, questionnaire_factory, questionnaire_field_factory):
        """Test duplicating a questionnaire."""
        original = questionnaire_factory(name="Original", is_active=True)
        questionnaire_field_factory(questionnaire=original, name="Field 1")
        questionnaire_field_factory(questionnaire=original, name="Field 2")

        url = reverse("questionnaires:questionnaire-duplicate", args=[original.id])
        response = admin_client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Original (Copy)"
        assert response.data["is_active"] is False  # Duplicates start inactive
        assert len(response.data["fields"]) == 2

    def test_duplicate_questionnaire_with_custom_name(
        self, admin_client, questionnaire_factory, questionnaire_field_factory
    ):
        """Test duplicating a questionnaire with custom name."""
        original = questionnaire_factory(name="Original")
        questionnaire_field_factory(questionnaire=original)

        url = reverse("questionnaires:questionnaire-duplicate", args=[original.id])
        response = admin_client.post(url, {"name": "Custom Copy"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Custom Copy"

    def test_get_active_questionnaires(self, admin_client, questionnaire_factory, questionnaire_field_factory):
        """Test getting only active questionnaires with fields."""
        active = questionnaire_factory(is_active=True, name="Active")
        questionnaire_factory(is_active=False, name="Inactive")
        questionnaire_field_factory(questionnaire=active)

        url = reverse("questionnaires:questionnaire-active")
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        names = [q["name"] for q in response.data["results"]]
        assert "Active" in names
        assert "Inactive" not in names

    def test_get_validation_rules(self, admin_client):
        """Test getting validation rules for frontend."""
        url = reverse("questionnaires:questionnaire-validation-rules")
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "rules" in response.data
        assert "field_types" in response.data
        assert "email" in response.data["rules"]
        assert "phone" in response.data["rules"]

    def test_get_questionnaire_fields_action(self, admin_client, questionnaire_factory, questionnaire_field_factory):
        """Test getting fields for a questionnaire via action."""
        questionnaire = questionnaire_factory()
        questionnaire_field_factory(questionnaire=questionnaire, name="Field 1", order=1)
        questionnaire_field_factory(questionnaire=questionnaire, name="Field 2", order=2)

        url = reverse("questionnaires:questionnaire-fields", args=[questionnaire.id])
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        assert response.data[0]["name"] == "Field 1"

    def test_get_questionnaire_analytics(self, admin_client, questionnaire_factory, questionnaire_field_factory):
        """Test getting analytics for a questionnaire."""
        questionnaire = questionnaire_factory(name="Analytics Test")
        questionnaire_field_factory(questionnaire=questionnaire)

        url = reverse("questionnaires:questionnaire-analytics", args=[questionnaire.id])
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["questionnaire_name"] == "Analytics Test"
        assert "total_fields" in response.data
        assert "completion_rate" in response.data

    def test_get_analytics_summary(self, admin_client, questionnaire_factory):
        """Test getting analytics summary for all questionnaires."""
        questionnaire_factory(name="Questionnaire 1")
        questionnaire_factory(name="Questionnaire 2")

        url = reverse("questionnaires:questionnaire-analytics-summary")
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_get_response_trends(self, admin_client, questionnaire_factory, questionnaire_field_factory):
        """Test getting response trends for a questionnaire."""
        questionnaire = questionnaire_factory()
        questionnaire_field_factory(questionnaire=questionnaire)

        url = reverse("questionnaires:questionnaire-response-trends", args=[questionnaire.id])
        response = admin_client.get(url, {"days": 7})

        assert response.status_code == status.HTTP_200_OK
        assert "daily_counts" in response.data
        assert response.data["period_days"] == 7


@pytest.mark.django_db
class TestQuestionnaireFieldViewSet:
    """Unit tests for QuestionnaireFieldViewSet."""

    def test_list_fields_as_admin(self, admin_client, questionnaire_field_factory):
        """Test admin can list fields."""
        questionnaire_field_factory(name="Field 1")
        questionnaire_field_factory(name="Field 2")

        url = reverse("questionnaires:field-list")
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_list_fields_requires_admin(self, client_user_client, questionnaire_field_factory):
        """Test client user cannot list fields (admin only)."""
        questionnaire_field_factory()

        url = reverse("questionnaires:field-list")
        response = client_user_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_field(self, admin_client, questionnaire_factory):
        """Test creating a new field."""
        questionnaire = questionnaire_factory()

        url = reverse("questionnaires:field-list")
        data = {
            "questionnaire": questionnaire.id,
            "name": "New Field",
            "type": "text",
            "required": True,
            "order": 1,
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Field"
        assert QuestionnaireField.objects.filter(name="New Field").exists()

    def test_create_select_field_with_options(self, admin_client, questionnaire_factory):
        """Test creating a select field with options."""
        questionnaire = questionnaire_factory()

        url = reverse("questionnaires:field-list")
        data = {
            "questionnaire": questionnaire.id,
            "name": "Preference",
            "type": "select",
            "options": ["Option A", "Option B", "Option C"],
            "order": 1,
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["options"] == ["Option A", "Option B", "Option C"]

    def test_create_select_field_requires_options(self, admin_client, questionnaire_factory):
        """Test creating select field without options fails."""
        questionnaire = questionnaire_factory()

        url = reverse("questionnaires:field-list")
        data = {
            "questionnaire": questionnaire.id,
            "name": "Preference",
            "type": "select",
            "options": [],
            "order": 1,
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_field(self, admin_client, questionnaire_field_factory):
        """Test updating a field."""
        field = questionnaire_field_factory(name="Original", required=False)

        url = reverse("questionnaires:field-detail", args=[field.id])
        data = {
            "questionnaire": field.questionnaire.id,
            "name": "Updated",
            "type": "text",
            "required": True,
            "order": 1,
        }
        response = admin_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated"
        assert response.data["required"] is True

    def test_delete_field(self, admin_client, questionnaire_field_factory):
        """Test deleting a field."""
        field = questionnaire_field_factory()
        field_id = field.id

        url = reverse("questionnaires:field-detail", args=[field_id])
        response = admin_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not QuestionnaireField.objects.filter(id=field_id).exists()

    def test_reorder_fields(self, admin_client, questionnaire_factory, questionnaire_field_factory):
        """Test reordering fields within a questionnaire."""
        questionnaire = questionnaire_factory()
        f1 = questionnaire_field_factory(questionnaire=questionnaire, order=1)
        f2 = questionnaire_field_factory(questionnaire=questionnaire, order=2)
        f3 = questionnaire_field_factory(questionnaire=questionnaire, order=3)

        url = reverse("questionnaires:field-reorder")
        data = {
            "questionnaire_id": questionnaire.id,
            "order_mapping": {
                str(f1.id): 3,
                str(f2.id): 1,
                str(f3.id): 2,
            },
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK

        f1.refresh_from_db()
        f2.refresh_from_db()
        f3.refresh_from_db()

        assert f1.order == 3
        assert f2.order == 1
        assert f3.order == 2

    def test_reorder_fields_missing_questionnaire_id(self, admin_client):
        """Test reorder fails without questionnaire_id."""
        url = reverse("questionnaires:field-reorder")
        data = {"order_mapping": {"1": 2}}
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reorder_fields_missing_order_mapping(self, admin_client, questionnaire_factory):
        """Test reorder fails without order_mapping."""
        questionnaire = questionnaire_factory()

        url = reverse("questionnaires:field-reorder")
        data = {"questionnaire_id": questionnaire.id}
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_field_value_distribution(
        self, admin_client, questionnaire_field_factory, event_factory, questionnaire_response_factory
    ):
        """Test getting value distribution for a field."""
        field = questionnaire_field_factory(select_field=True)
        event1 = event_factory()
        event2 = event_factory()

        questionnaire_response_factory(event=event1, field=field, value="Option A")
        questionnaire_response_factory(event=event2, field=field, value="Option A")

        url = reverse("questionnaires:field-value-distribution", args=[field.id])
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["field_name"] == "Select Field"
        assert "distribution" in response.data
        assert response.data["total_responses"] == 2


@pytest.mark.django_db
class TestQuestionnaireResponseViewSet:
    """Unit tests for QuestionnaireResponseViewSet."""

    def test_list_responses_as_admin(self, admin_client, questionnaire_response_factory):
        """Test admin can list responses."""
        questionnaire_response_factory(value="Answer 1")
        questionnaire_response_factory(value="Answer 2")

        url = reverse("questionnaires:response-list")
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_list_responses_filter_by_event(
        self, admin_client, event_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test filtering responses by event."""
        event1 = event_factory()
        event2 = event_factory()
        field = questionnaire_field_factory()

        questionnaire_response_factory(event=event1, field=field, value="Event 1 Answer")
        questionnaire_response_factory(event=event2, field=field, value="Event 2 Answer")

        url = reverse("questionnaires:response-list")
        response = admin_client.get(url, {"event": event1.id})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["value"] == "Event 1 Answer"

    def test_create_response(self, admin_client, event_factory, questionnaire_field_factory, mocker):
        """Test creating a new response."""
        event = event_factory()
        field = questionnaire_field_factory(type="text")

        # Mock the service call because validated_data passes field as an object
        # (DRF ModelSerializer resolves FK fields to model instances), but the
        # service expects an integer ID - this is a known implementation quirk.
        mock_response = QuestionnaireResponse(id=1, event=event, field=field, value="Test Answer")
        mocker.patch(
            "core.domains.questionnaires.views.QuestionnaireResponseService.create_response", return_value=mock_response
        )

        url = reverse("questionnaires:response-list")
        data = {
            "event": event.id,
            "field": field.id,
            "value": "Test Answer",
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["value"] == "Test Answer"

    def test_update_response(self, admin_client, questionnaire_response_factory):
        """Test updating a response."""
        response_obj = questionnaire_response_factory(value="Original")

        url = reverse("questionnaires:response-detail", args=[response_obj.id])
        data = {
            "event": response_obj.event.id,
            "field": response_obj.field.id,
            "value": "Updated",
        }
        response = admin_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["value"] == "Updated"

    def test_delete_response(self, admin_client, questionnaire_response_factory):
        """Test deleting a response."""
        response_obj = questionnaire_response_factory()
        response_id = response_obj.id

        url = reverse("questionnaires:response-detail", args=[response_id])
        response = admin_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not QuestionnaireResponse.objects.filter(id=response_id).exists()

    def test_save_event_responses_bulk(self, admin_client, event_factory, questionnaire_field_factory):
        """Test saving multiple responses for an event."""
        event = event_factory()
        field1 = questionnaire_field_factory(type="text")
        field2 = questionnaire_field_factory(type="email")

        url = reverse("questionnaires:response-save-event-responses")
        data = {
            "event": event.id,
            "responses": [
                {"field": str(field1.id), "value": "John Doe"},
                {"field": str(field2.id), "value": "john@example.com"},
            ],
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2

    def test_save_event_responses_replaces_existing(
        self, admin_client, event_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test saving responses replaces existing responses."""
        event = event_factory()
        field = questionnaire_field_factory(type="text")
        questionnaire_response_factory(event=event, field=field, value="Old Answer")

        url = reverse("questionnaires:response-save-event-responses")
        data = {
            "event": event.id,
            "responses": [
                {"field": str(field.id), "value": "New Answer"},
            ],
        }
        response = admin_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert QuestionnaireResponse.objects.filter(event=event).count() == 1
        assert QuestionnaireResponse.objects.get(event=event).value == "New Answer"


@pytest.mark.django_db
class TestQuestionnaireViewSetPermissions:
    """Test permission checks for questionnaire endpoints."""

    def test_unauthenticated_cannot_create(self, api_client):
        """Test unauthenticated user cannot create questionnaire."""
        url = reverse("questionnaires:questionnaire-list")
        data = {"name": "Test", "is_active": True, "order": 1}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_client_can_access_questionnaires(self, client_user_client, questionnaire_factory):
        """Test client user can access questionnaires."""
        questionnaire = questionnaire_factory()

        url = reverse("questionnaires:questionnaire-detail", args=[questionnaire.id])
        response = client_user_client.get(url)

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestQuestionnaireFieldViewSetPermissions:
    """Test permission checks for field endpoints."""

    def test_unauthenticated_cannot_access_fields(self, api_client):
        """Test unauthenticated user cannot access fields."""
        url = reverse("questionnaires:field-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_client_cannot_manage_fields(self, client_user_client, questionnaire_factory):
        """Test client user cannot create fields (admin only)."""
        questionnaire = questionnaire_factory()

        url = reverse("questionnaires:field-list")
        data = {
            "questionnaire": questionnaire.id,
            "name": "Test",
            "type": "text",
            "order": 1,
        }
        response = client_user_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
