"""
Unit tests for questionnaires domain services.

Tests:
- QuestionnaireService (CRUD, filtering, duplication, reordering)
- QuestionnaireFieldService (CRUD, reordering, duplicate detection)
- QuestionnaireResponseService (CRUD, bulk save, guest count sync)
"""

import pytest

from core.domains.questionnaires.exceptions import (
    DuplicateQuestionnaireField,
    InvalidResponseValue,
    QuestionnaireFieldNotFound,
    QuestionnaireNotFound,
    QuestionnaireResponseNotFound,
)
from core.domains.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireResponse,
)
from core.domains.questionnaires.services import (
    QuestionnaireFieldService,
    QuestionnaireResponseService,
    QuestionnaireService,
)


@pytest.mark.django_db
class TestQuestionnaireService:
    """Unit tests for the QuestionnaireService."""

    def test_get_all_questionnaires(self, questionnaire_factory):
        """Test retrieving all questionnaires."""
        q1 = questionnaire_factory(name="Questionnaire A", order=1)
        q2 = questionnaire_factory(name="Questionnaire B", order=2)

        questionnaires = QuestionnaireService.get_all_questionnaires()

        assert questionnaires.count() == 2
        assert list(questionnaires) == [q1, q2]

    def test_get_all_questionnaires_with_search(self, questionnaire_factory):
        """Test filtering questionnaires by search query."""
        questionnaire_factory(name="Wedding Questionnaire")
        questionnaire_factory(name="Corporate Event Form")

        results = QuestionnaireService.get_all_questionnaires(search_query="Wedding")

        assert results.count() == 1
        assert results.first().name == "Wedding Questionnaire"

    def test_get_all_questionnaires_filter_by_active(self, questionnaire_factory):
        """Test filtering questionnaires by active status."""
        questionnaire_factory(is_active=True)
        questionnaire_factory(is_active=False)

        active = QuestionnaireService.get_all_questionnaires(is_active=True)
        inactive = QuestionnaireService.get_all_questionnaires(is_active=False)

        assert active.count() == 1
        assert inactive.count() == 1

    def test_get_all_questionnaires_filter_by_event_type(self, questionnaire_factory, event_type_factory):
        """Test filtering questionnaires by event type."""
        event_type = event_type_factory(name="Wedding")
        questionnaire_factory(event_type=event_type)
        questionnaire_factory(event_type=None)

        results = QuestionnaireService.get_all_questionnaires(event_type_id=event_type.id)

        assert results.count() == 1

    def test_get_questionnaire_by_id(self, questionnaire_factory):
        """Test retrieving a questionnaire by ID."""
        questionnaire = questionnaire_factory(name="Test Questionnaire")

        result = QuestionnaireService.get_questionnaire_by_id(questionnaire.id)

        assert result == questionnaire

    def test_get_questionnaire_by_id_not_found(self):
        """Test exception when questionnaire not found."""
        with pytest.raises(QuestionnaireNotFound):
            QuestionnaireService.get_questionnaire_by_id(99999)

    def test_create_questionnaire(self):
        """Test creating a new questionnaire."""
        data = {
            "name": "New Questionnaire",
            "is_active": True,
            "order": 1,
        }

        questionnaire = QuestionnaireService.create_questionnaire(data)

        assert questionnaire.name == "New Questionnaire"
        assert questionnaire.is_active is True
        assert Questionnaire.objects.filter(id=questionnaire.id).exists()

    def test_create_questionnaire_with_fields(self, questionnaire_factory):
        """Test creating a questionnaire with nested fields."""
        data = {
            "name": "Questionnaire with Fields",
            "is_active": True,
            "order": 1,
            "fields": [
                {"name": "Full Name", "type": "text", "required": True, "order": 1},
                {"name": "Email", "type": "email", "required": True, "order": 2},
            ],
        }

        questionnaire = QuestionnaireService.create_questionnaire(data)

        assert questionnaire.fields.count() == 2
        assert questionnaire.fields.filter(name="Full Name").exists()
        assert questionnaire.fields.filter(name="Email").exists()

    def test_update_questionnaire(self, questionnaire_factory):
        """Test updating an existing questionnaire."""
        questionnaire = questionnaire_factory(name="Original Name", is_active=True)

        updated = QuestionnaireService.update_questionnaire(
            questionnaire.id, {"name": "Updated Name", "is_active": False}
        )

        assert updated.name == "Updated Name"
        assert updated.is_active is False

    def test_update_questionnaire_with_fields(self, questionnaire_factory, questionnaire_field_factory):
        """Test updating a questionnaire replaces all fields."""
        questionnaire = questionnaire_factory()
        questionnaire_field_factory(questionnaire=questionnaire, name="Old Field")

        QuestionnaireService.update_questionnaire(
            questionnaire.id,
            {
                "name": "Updated",
                "fields": [
                    {"name": "New Field 1", "type": "text", "order": 1},
                    {"name": "New Field 2", "type": "email", "order": 2},
                ],
            },
        )

        questionnaire.refresh_from_db()
        assert questionnaire.fields.count() == 2
        assert not questionnaire.fields.filter(name="Old Field").exists()
        assert questionnaire.fields.filter(name="New Field 1").exists()

    def test_delete_questionnaire(self, questionnaire_factory):
        """Test deleting a questionnaire."""
        questionnaire = questionnaire_factory()
        questionnaire_id = questionnaire.id

        result = QuestionnaireService.delete_questionnaire(questionnaire_id)

        assert result is True
        assert not Questionnaire.objects.filter(id=questionnaire_id).exists()

    def test_delete_questionnaire_not_found(self):
        """Test exception when deleting non-existent questionnaire."""
        with pytest.raises(QuestionnaireNotFound):
            QuestionnaireService.delete_questionnaire(99999)

    def test_reorder_questionnaires(self, questionnaire_factory):
        """Test reordering questionnaires."""
        q1 = questionnaire_factory(order=1)
        q2 = questionnaire_factory(order=2)
        q3 = questionnaire_factory(order=3)

        order_mapping = {
            str(q1.id): 3,
            str(q2.id): 1,
            str(q3.id): 2,
        }

        QuestionnaireService.reorder_questionnaires(order_mapping)

        q1.refresh_from_db()
        q2.refresh_from_db()
        q3.refresh_from_db()

        assert q1.order == 3
        assert q2.order == 1
        assert q3.order == 2

    def test_duplicate_questionnaire(self, questionnaire_factory, questionnaire_field_factory):
        """Test duplicating a questionnaire with all its fields."""
        original = questionnaire_factory(name="Original Questionnaire", is_active=True)
        questionnaire_field_factory(
            questionnaire=original,
            name="Field 1",
            type="text",
            required=True,
            description="Test description",
            placeholder="Enter text",
        )
        questionnaire_field_factory(questionnaire=original, name="Field 2", type="select", options=["A", "B", "C"])

        duplicate = QuestionnaireService.duplicate_questionnaire(original.id)

        assert duplicate.name == "Original Questionnaire (Copy)"
        assert duplicate.is_active is False  # Duplicates start inactive
        assert duplicate.id != original.id
        assert duplicate.fields.count() == 2

        # Verify field properties are copied
        copied_field = duplicate.fields.get(name="Field 1")
        assert copied_field.type == "text"
        assert copied_field.required is True
        assert copied_field.description == "Test description"

    def test_duplicate_questionnaire_with_custom_name(self, questionnaire_factory, questionnaire_field_factory):
        """Test duplicating a questionnaire with a custom name."""
        original = questionnaire_factory(name="Original")
        questionnaire_field_factory(questionnaire=original)

        duplicate = QuestionnaireService.duplicate_questionnaire(original.id, new_name="Custom Copy Name")

        assert duplicate.name == "Custom Copy Name"


@pytest.mark.django_db
class TestQuestionnaireFieldService:
    """Unit tests for the QuestionnaireFieldService."""

    def test_get_fields_for_questionnaire(self, questionnaire_factory, questionnaire_field_factory):
        """Test retrieving all fields for a questionnaire."""
        questionnaire = questionnaire_factory()
        f1 = questionnaire_field_factory(questionnaire=questionnaire, order=2)
        f2 = questionnaire_field_factory(questionnaire=questionnaire, order=1)

        fields = QuestionnaireFieldService.get_fields_for_questionnaire(questionnaire.id)

        assert fields.count() == 2
        assert list(fields) == [f2, f1]  # Ordered by order field

    def test_get_fields_for_questionnaire_not_found(self):
        """Test exception when questionnaire not found."""
        with pytest.raises(QuestionnaireNotFound):
            QuestionnaireFieldService.get_fields_for_questionnaire(99999)

    def test_get_field_by_id(self, questionnaire_field_factory):
        """Test retrieving a field by ID."""
        field = questionnaire_field_factory(name="Test Field")

        result = QuestionnaireFieldService.get_field_by_id(field.id)

        assert result == field

    def test_get_field_by_id_not_found(self):
        """Test exception when field not found."""
        with pytest.raises(QuestionnaireFieldNotFound):
            QuestionnaireFieldService.get_field_by_id(99999)

    def test_create_field(self, questionnaire_factory):
        """Test creating a new field."""
        questionnaire = questionnaire_factory()
        data = {
            "name": "New Field",
            "type": "text",
            "required": True,
            "order": 1,
        }

        field = QuestionnaireFieldService.create_field(questionnaire.id, data)

        assert field.name == "New Field"
        assert field.type == "text"
        assert field.required is True
        assert field.questionnaire == questionnaire

    def test_create_field_auto_assigns_order(self, questionnaire_factory, questionnaire_field_factory):
        """Test field order is auto-assigned if not provided."""
        questionnaire = questionnaire_factory()
        questionnaire_field_factory(questionnaire=questionnaire, order=1)
        questionnaire_field_factory(questionnaire=questionnaire, order=2)

        field = QuestionnaireFieldService.create_field(questionnaire.id, {"name": "New Field", "type": "text"})

        assert field.order == 3

    def test_create_field_duplicate_name_raises_error(self, questionnaire_factory, questionnaire_field_factory):
        """Test creating a field with duplicate name raises exception."""
        questionnaire = questionnaire_factory()
        questionnaire_field_factory(questionnaire=questionnaire, name="Existing Field")

        with pytest.raises(DuplicateQuestionnaireField):
            QuestionnaireFieldService.create_field(questionnaire.id, {"name": "Existing Field", "type": "text"})

    def test_create_field_questionnaire_not_found(self):
        """Test exception when questionnaire not found."""
        with pytest.raises(QuestionnaireNotFound):
            QuestionnaireFieldService.create_field(99999, {"name": "Field", "type": "text"})

    def test_update_field(self, questionnaire_field_factory):
        """Test updating an existing field."""
        field = questionnaire_field_factory(name="Original", type="text", required=False)

        updated = QuestionnaireFieldService.update_field(field.id, {"name": "Updated", "required": True})

        assert updated.name == "Updated"
        assert updated.required is True

    def test_update_field_duplicate_name_raises_error(self, questionnaire_factory, questionnaire_field_factory):
        """Test updating field to duplicate name raises exception."""
        questionnaire = questionnaire_factory()
        questionnaire_field_factory(questionnaire=questionnaire, name="Field A")
        field_b = questionnaire_field_factory(questionnaire=questionnaire, name="Field B")

        with pytest.raises(DuplicateQuestionnaireField):
            QuestionnaireFieldService.update_field(field_b.id, {"name": "Field A"})

    def test_update_field_same_name_allowed(self, questionnaire_field_factory):
        """Test updating field with same name doesn't raise error."""
        field = questionnaire_field_factory(name="Same Name")

        updated = QuestionnaireFieldService.update_field(field.id, {"name": "Same Name", "required": True})

        assert updated.name == "Same Name"

    def test_delete_field(self, questionnaire_field_factory):
        """Test deleting a field."""
        field = questionnaire_field_factory()
        field_id = field.id

        result = QuestionnaireFieldService.delete_field(field_id)

        assert result is True
        assert not QuestionnaireField.objects.filter(id=field_id).exists()

    def test_delete_field_reorders_remaining(self, questionnaire_factory, questionnaire_field_factory):
        """Test deleting a field reorders remaining fields."""
        questionnaire = questionnaire_factory()
        f1 = questionnaire_field_factory(questionnaire=questionnaire, order=1)
        f2 = questionnaire_field_factory(questionnaire=questionnaire, order=2)
        f3 = questionnaire_field_factory(questionnaire=questionnaire, order=3)

        QuestionnaireFieldService.delete_field(f2.id)

        f1.refresh_from_db()
        f3.refresh_from_db()

        assert f1.order == 1
        assert f3.order == 2

    def test_reorder_fields(self, questionnaire_factory, questionnaire_field_factory):
        """Test reordering fields within a questionnaire."""
        questionnaire = questionnaire_factory()
        f1 = questionnaire_field_factory(questionnaire=questionnaire, order=1)
        f2 = questionnaire_field_factory(questionnaire=questionnaire, order=2)
        f3 = questionnaire_field_factory(questionnaire=questionnaire, order=3)

        order_mapping = {
            str(f1.id): 3,
            str(f2.id): 1,
            str(f3.id): 2,
        }

        QuestionnaireFieldService.reorder_fields(questionnaire.id, order_mapping)

        f1.refresh_from_db()
        f2.refresh_from_db()
        f3.refresh_from_db()

        assert f1.order == 3
        assert f2.order == 1
        assert f3.order == 2


@pytest.mark.django_db
class TestQuestionnaireResponseService:
    """Unit tests for the QuestionnaireResponseService."""

    def test_get_responses_for_event(self, event_factory, questionnaire_field_factory, questionnaire_response_factory):
        """Test retrieving all responses for an event."""
        event = event_factory()
        field1 = questionnaire_field_factory()
        field2 = questionnaire_field_factory()
        questionnaire_response_factory(event=event, field=field1, value="Answer 1")
        questionnaire_response_factory(event=event, field=field2, value="Answer 2")

        responses = QuestionnaireResponseService.get_responses_for_event(event.id)

        assert responses.count() == 2

    def test_get_response_by_id(self, questionnaire_response_factory):
        """Test retrieving a response by ID."""
        response = questionnaire_response_factory(value="Test Value")

        result = QuestionnaireResponseService.get_response_by_id(response.id)

        assert result == response

    def test_get_response_by_id_not_found(self):
        """Test exception when response not found."""
        with pytest.raises(QuestionnaireResponseNotFound):
            QuestionnaireResponseService.get_response_by_id(99999)

    def test_create_response(self, event_factory, questionnaire_field_factory):
        """Test creating a new response."""
        event = event_factory()
        field = questionnaire_field_factory(type="text")

        response = QuestionnaireResponseService.create_response(
            {"event_id": event.id, "field_id": field.id, "value": "Test answer"}
        )

        assert response.value == "Test answer"
        assert response.event == event
        assert response.field == field

    def test_create_response_validates_boolean(self, event_factory, questionnaire_field_factory):
        """Test boolean field value validation."""
        event = event_factory()
        field = questionnaire_field_factory(type="boolean")

        # Valid boolean values
        response = QuestionnaireResponseService.create_response(
            {"event_id": event.id, "field_id": field.id, "value": "yes"}
        )
        assert response.value == "yes"

    def test_create_response_invalid_boolean_raises_error(self, event_factory, questionnaire_field_factory):
        """Test invalid boolean value raises exception."""
        event = event_factory()
        field = questionnaire_field_factory(type="boolean")

        with pytest.raises(InvalidResponseValue):
            QuestionnaireResponseService.create_response(
                {"event_id": event.id, "field_id": field.id, "value": "invalid"}
            )

    def test_create_response_validates_select(self, event_factory, questionnaire_field_factory):
        """Test select field value validation."""
        event = event_factory()
        field = questionnaire_field_factory(type="select", options=["A", "B", "C"])

        response = QuestionnaireResponseService.create_response(
            {"event_id": event.id, "field_id": field.id, "value": "B"}
        )
        assert response.value == "B"

    def test_create_response_invalid_select_raises_error(self, event_factory, questionnaire_field_factory):
        """Test invalid select option raises exception."""
        event = event_factory()
        field = questionnaire_field_factory(type="select", options=["A", "B", "C"])

        with pytest.raises(InvalidResponseValue):
            QuestionnaireResponseService.create_response({"event_id": event.id, "field_id": field.id, "value": "D"})

    def test_create_response_validates_multi_select(self, event_factory, questionnaire_field_factory):
        """Test multi-select field value validation."""
        event = event_factory()
        field = questionnaire_field_factory(type="multi-select", options=["X", "Y", "Z"])

        response = QuestionnaireResponseService.create_response(
            {"event_id": event.id, "field_id": field.id, "value": "X,Y"}
        )
        assert response.value == "X,Y"

    def test_create_response_invalid_multi_select_raises_error(self, event_factory, questionnaire_field_factory):
        """Test invalid multi-select option raises exception."""
        event = event_factory()
        field = questionnaire_field_factory(type="multi-select", options=["X", "Y", "Z"])

        with pytest.raises(InvalidResponseValue):
            QuestionnaireResponseService.create_response(
                {
                    "event_id": event.id,
                    "field_id": field.id,
                    "value": "X,W",  # W is invalid
                }
            )

    def test_update_response(self, questionnaire_response_factory):
        """Test updating an existing response."""
        response = questionnaire_response_factory(value="Original")

        updated = QuestionnaireResponseService.update_response(response.id, {"value": "Updated"})

        assert updated.value == "Updated"

    def test_update_response_validates_value(
        self, event_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test response value is validated on update."""
        field = questionnaire_field_factory(type="boolean")
        response = questionnaire_response_factory(field=field, value="yes")

        with pytest.raises(InvalidResponseValue):
            QuestionnaireResponseService.update_response(response.id, {"value": "invalid"})

    def test_delete_response(self, questionnaire_response_factory):
        """Test deleting a response."""
        response = questionnaire_response_factory()
        response_id = response.id

        result = QuestionnaireResponseService.delete_response(response_id)

        assert result is True
        assert not QuestionnaireResponse.objects.filter(id=response_id).exists()

    def test_save_event_responses(self, event_factory, questionnaire_factory, questionnaire_field_factory):
        """Test saving multiple responses for an event."""
        event = event_factory()
        questionnaire = questionnaire_factory()
        field1 = questionnaire_field_factory(questionnaire=questionnaire, type="text")
        field2 = questionnaire_field_factory(questionnaire=questionnaire, type="text")

        responses_data = [
            {"field": field1.id, "value": "Answer 1"},
            {"field": field2.id, "value": "Answer 2"},
        ]

        responses = QuestionnaireResponseService.save_event_responses(event.id, responses_data)

        assert len(responses) == 2
        assert QuestionnaireResponse.objects.filter(event=event).count() == 2

    def test_save_event_responses_replaces_existing(
        self, event_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test saving responses replaces existing responses for the event."""
        event = event_factory()
        field = questionnaire_field_factory(type="text")
        questionnaire_response_factory(event=event, field=field, value="Old Answer")

        responses_data = [
            {"field": field.id, "value": "New Answer"},
        ]

        QuestionnaireResponseService.save_event_responses(event.id, responses_data)

        responses = QuestionnaireResponse.objects.filter(event=event)
        assert responses.count() == 1
        assert responses.first().value == "New Answer"

    def test_sync_event_guest_count_with_guests_type(
        self, event_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test syncing guest count from guests type field."""
        event = event_factory()
        field = questionnaire_field_factory(type="guests", options=["Adults", "Children", "Infants"])
        questionnaire_response_factory(event=event, field=field, value='{"Adults": 50, "Children": 10, "Infants": 5}')

        QuestionnaireResponseService.sync_event_guest_count(event.id)

        event.refresh_from_db()
        assert event.num_participants == 65

    def test_sync_event_guest_count_with_legacy_flag(
        self, event_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test syncing guest count from legacy is_guest_count number field."""
        event = event_factory()
        field = questionnaire_field_factory(type="number", is_guest_count=True)
        questionnaire_response_factory(event=event, field=field, value="75")

        QuestionnaireResponseService.sync_event_guest_count(event.id)

        event.refresh_from_db()
        assert event.num_participants == 75

    def test_sync_event_guest_count_multiple_sources(
        self, event_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test syncing guest count from multiple sources."""
        event = event_factory()

        # Legacy number field
        field1 = questionnaire_field_factory(type="number", is_guest_count=True)
        questionnaire_response_factory(event=event, field=field1, value="25")

        # Guests type field
        field2 = questionnaire_field_factory(type="guests", options=["VIP", "Regular"])
        questionnaire_response_factory(event=event, field=field2, value='{"VIP": 10, "Regular": 15}')

        QuestionnaireResponseService.sync_event_guest_count(event.id)

        event.refresh_from_db()
        assert event.num_participants == 50  # 25 + 10 + 15

    def test_sync_event_guest_count_nonexistent_event(self):
        """Test syncing guest count for non-existent event doesn't raise error."""
        # Should not raise, just log a warning
        QuestionnaireResponseService.sync_event_guest_count(99999)

    def test_save_event_responses_skips_empty_values(self, event_factory, questionnaire_field_factory):
        """Test saving responses skips entries with empty values."""
        event = event_factory()
        field1 = questionnaire_field_factory(type="text")
        field2 = questionnaire_field_factory(type="text")

        responses_data = [
            {"field": field1.id, "value": "Valid answer"},
            {"field": field2.id, "value": None},  # Should be skipped
        ]

        responses = QuestionnaireResponseService.save_event_responses(event.id, responses_data)

        assert len(responses) == 1
