"""
Unit tests for questionnaires domain models.

Tests:
- Questionnaire model (collections of fields, ordering, event type association)
- QuestionnaireField model (field types, options, validation settings)
- QuestionnaireResponse model (event responses, value storage)
"""

import pytest
from django.db import IntegrityError

from core.domains.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireResponse,
)


@pytest.mark.django_db
class TestQuestionnaireModel:
    """Unit tests for the Questionnaire model."""

    def test_create_questionnaire(self, questionnaire_factory):
        """Test creating a basic questionnaire."""
        questionnaire = questionnaire_factory(name='Wedding Questionnaire')

        assert questionnaire.name == 'Wedding Questionnaire'
        assert questionnaire.is_active is True
        assert questionnaire.order >= 1

    def test_questionnaire_string_representation(self, questionnaire_factory):
        """Test Questionnaire __str__ returns the name."""
        questionnaire = questionnaire_factory(name='Client Information')

        assert str(questionnaire) == 'Client Information'

    def test_questionnaire_default_ordering(self, questionnaire_factory):
        """Test questionnaires are ordered by the order field."""
        q1 = questionnaire_factory(order=3)
        q2 = questionnaire_factory(order=1)
        q3 = questionnaire_factory(order=2)

        questionnaires = list(Questionnaire.objects.all())

        assert questionnaires[0] == q2
        assert questionnaires[1] == q3
        assert questionnaires[2] == q1

    def test_questionnaire_inactive_trait(self, questionnaire_factory):
        """Test creating an inactive questionnaire."""
        questionnaire = questionnaire_factory(inactive=True)

        assert questionnaire.is_active is False

    def test_questionnaire_with_event_type(self, questionnaire_factory, event_type_factory):
        """Test questionnaire associated with an event type."""
        event_type = event_type_factory(name='Corporate Event')
        questionnaire = questionnaire_factory(event_type=event_type)

        assert questionnaire.event_type == event_type
        assert questionnaire.event_type.name == 'Corporate Event'

    def test_questionnaire_without_event_type(self, questionnaire_factory):
        """Test questionnaire can be created without an event type (global questionnaire)."""
        questionnaire = questionnaire_factory(event_type=None)

        assert questionnaire.event_type is None

    def test_questionnaire_has_basemodel_fields(self, questionnaire_factory):
        """Test questionnaire inherits BaseModel fields."""
        questionnaire = questionnaire_factory()

        assert questionnaire.id is not None
        assert questionnaire.created_at is not None
        assert questionnaire.updated_at is not None


@pytest.mark.django_db
class TestQuestionnaireFieldModel:
    """Unit tests for the QuestionnaireField model."""

    def test_create_text_field(self, questionnaire_field_factory):
        """Test creating a basic text field."""
        field = questionnaire_field_factory(text_field=True)

        assert field.type == 'text'
        assert field.name == 'Text Field'
        assert field.required is False

    def test_create_required_field(self, questionnaire_field_factory):
        """Test creating a required field."""
        field = questionnaire_field_factory(required_field=True)

        assert field.required is True

    def test_field_string_representation(self, questionnaire_factory, questionnaire_field_factory):
        """Test QuestionnaireField __str__ returns informative string."""
        questionnaire = questionnaire_factory(name='Test Questionnaire')
        field = questionnaire_field_factory(
            questionnaire=questionnaire,
            name='Email Address'
        )

        assert str(field) == 'Test Questionnaire - Email Address'

    def test_field_default_ordering(self, questionnaire_factory, questionnaire_field_factory):
        """Test fields are ordered by the order field within a questionnaire."""
        questionnaire = questionnaire_factory()
        f1 = questionnaire_field_factory(questionnaire=questionnaire, order=3)
        f2 = questionnaire_field_factory(questionnaire=questionnaire, order=1)
        f3 = questionnaire_field_factory(questionnaire=questionnaire, order=2)

        fields = list(questionnaire.fields.all())

        assert fields[0] == f2
        assert fields[1] == f3
        assert fields[2] == f1

    def test_field_belongs_to_questionnaire(self, questionnaire_factory, questionnaire_field_factory):
        """Test field has a relationship with its questionnaire."""
        questionnaire = questionnaire_factory(name='Parent Questionnaire')
        field = questionnaire_field_factory(questionnaire=questionnaire)

        assert field.questionnaire == questionnaire
        assert field in questionnaire.fields.all()

    def test_select_field_with_options(self, questionnaire_field_factory):
        """Test select field has options."""
        field = questionnaire_field_factory(select_field=True)

        assert field.type == 'select'
        assert field.options == ['Option A', 'Option B', 'Option C']

    def test_multi_select_field_with_options(self, questionnaire_field_factory):
        """Test multi-select field has options."""
        field = questionnaire_field_factory(multi_select_field=True)

        assert field.type == 'multi-select'
        assert field.options == ['Choice 1', 'Choice 2', 'Choice 3']

    def test_email_field_type(self, questionnaire_field_factory):
        """Test email field type."""
        field = questionnaire_field_factory(email_field=True)

        assert field.type == 'email'

    def test_phone_field_type(self, questionnaire_field_factory):
        """Test phone field type."""
        field = questionnaire_field_factory(phone_field=True)

        assert field.type == 'phone'

    def test_date_field_type(self, questionnaire_field_factory):
        """Test date field type."""
        field = questionnaire_field_factory(date_field=True)

        assert field.type == 'date'

    def test_time_field_type(self, questionnaire_field_factory):
        """Test time field type."""
        field = questionnaire_field_factory(time_field=True)

        assert field.type == 'time'

    def test_boolean_field_type(self, questionnaire_field_factory):
        """Test boolean field type."""
        field = questionnaire_field_factory(boolean_field=True)

        assert field.type == 'boolean'

    def test_number_field_type(self, questionnaire_field_factory):
        """Test number field type."""
        field = questionnaire_field_factory(number_field=True)

        assert field.type == 'number'

    def test_file_field_with_settings(self, questionnaire_field_factory):
        """Test file field has upload settings."""
        field = questionnaire_field_factory(file_field=True)

        assert field.type == 'file'
        assert field.max_file_size_mb == 5
        assert field.allowed_file_types == ['pdf', 'jpg', 'png']
        assert field.max_files == 3

    def test_guests_field_with_categories(self, questionnaire_field_factory):
        """Test guests field type with category options."""
        field = questionnaire_field_factory(guests_field=True)

        assert field.type == 'guests'
        assert field.options == ['Adults', 'Children', 'Infants']

    def test_legacy_guest_count_field(self, questionnaire_field_factory):
        """Test legacy is_guest_count flag on number fields."""
        field = questionnaire_field_factory(guest_count_legacy=True)

        assert field.type == 'number'
        assert field.is_guest_count is True

    def test_field_with_description_and_placeholder(self, questionnaire_field_factory):
        """Test field description and placeholder fields."""
        field = questionnaire_field_factory(
            description='Please enter your full legal name',
            placeholder='John Doe'
        )

        assert field.description == 'Please enter your full legal name'
        assert field.placeholder == 'John Doe'

    def test_field_with_conditional_display(self, questionnaire_field_factory):
        """Test field with show_conditions for conditional display."""
        field = questionnaire_field_factory(with_conditions=True)

        assert field.show_conditions == {
            'logic': 'AND',
            'conditions': [
                {'field_id': '1', 'operator': 'equals', 'value': 'yes'}
            ]
        }

    def test_field_cascade_delete_with_questionnaire(self, questionnaire_factory, questionnaire_field_factory):
        """Test fields are deleted when questionnaire is deleted."""
        questionnaire = questionnaire_factory()
        field = questionnaire_field_factory(questionnaire=questionnaire)
        field_id = field.id

        questionnaire.delete()

        assert not QuestionnaireField.objects.filter(id=field_id).exists()

    def test_all_field_types_available(self):
        """Test all expected field types are defined in FIELD_TYPES."""
        expected_types = [
            'text', 'number', 'date', 'time', 'boolean',
            'select', 'multi-select', 'email', 'phone', 'file', 'guests'
        ]

        actual_types = [choice[0] for choice in QuestionnaireField.FIELD_TYPES]

        for expected in expected_types:
            assert expected in actual_types, f"Missing field type: {expected}"


@pytest.mark.django_db
class TestQuestionnaireResponseModel:
    """Unit tests for the QuestionnaireResponse model."""

    def test_create_response(self, questionnaire_response_factory):
        """Test creating a basic response."""
        response = questionnaire_response_factory(value='Test answer')

        assert response.value == 'Test answer'
        assert response.event is not None
        assert response.field is not None

    def test_response_string_representation(
        self, event_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test QuestionnaireResponse __str__ returns informative string."""
        event = event_factory(name='Wedding Reception')
        field = questionnaire_field_factory(name='Guest Name')
        response = questionnaire_response_factory(
            event=event,
            field=field,
            value='John Smith'
        )

        str_repr = str(response)
        assert 'Guest Name' in str_repr
        assert 'John Smith' in str_repr

    def test_response_belongs_to_event(self, event_factory, questionnaire_response_factory):
        """Test response is associated with an event."""
        event = event_factory()
        response = questionnaire_response_factory(event=event)

        assert response.event == event
        assert response in event.questionnaire_responses.all()

    def test_response_belongs_to_field(self, questionnaire_field_factory, questionnaire_response_factory):
        """Test response is associated with a field."""
        field = questionnaire_field_factory(name='Email')
        response = questionnaire_response_factory(field=field)

        assert response.field == field

    def test_response_cascade_delete_with_event(self, event_factory, questionnaire_response_factory):
        """Test responses are deleted when event is deleted."""
        event = event_factory()
        response = questionnaire_response_factory(event=event)
        response_id = response.id

        event.delete()

        assert not QuestionnaireResponse.objects.filter(id=response_id).exists()

    def test_response_cascade_delete_with_field(self, questionnaire_field_factory, questionnaire_response_factory):
        """Test responses are deleted when field is deleted."""
        field = questionnaire_field_factory()
        response = questionnaire_response_factory(field=field)
        response_id = response.id

        field.delete()

        assert not QuestionnaireResponse.objects.filter(id=response_id).exists()

    def test_boolean_response_values(self, questionnaire_response_factory):
        """Test boolean response value traits."""
        yes_response = questionnaire_response_factory(boolean_yes=True)
        no_response = questionnaire_response_factory(boolean_no=True)

        assert yes_response.value == 'yes'
        assert no_response.value == 'no'

    def test_numeric_response_value(self, questionnaire_response_factory):
        """Test numeric response value trait."""
        response = questionnaire_response_factory(numeric=True)

        assert response.value == '42'

    def test_email_response_value(self, questionnaire_response_factory):
        """Test email response value trait."""
        response = questionnaire_response_factory(email_value=True)

        assert response.value == 'test@example.com'

    def test_phone_response_value(self, questionnaire_response_factory):
        """Test phone response value trait."""
        response = questionnaire_response_factory(phone_value=True)

        assert response.value == '09123456789'

    def test_date_response_value(self, questionnaire_response_factory):
        """Test date response value trait."""
        response = questionnaire_response_factory(date_value=True)

        assert response.value == '2024-06-15'

    def test_time_response_value(self, questionnaire_response_factory):
        """Test time response value trait."""
        response = questionnaire_response_factory(time_value=True)

        assert response.value == '14:30'

    def test_guest_count_json_response(self, questionnaire_response_factory):
        """Test guest count JSON response value trait."""
        response = questionnaire_response_factory(guest_count_json=True)

        assert response.value == '{"Adults": 50, "Children": 10, "Infants": 5}'

    def test_multiple_responses_for_event(self, event_factory, questionnaire_field_factory, questionnaire_response_factory):
        """Test an event can have multiple questionnaire responses."""
        event = event_factory()
        field1 = questionnaire_field_factory(name='Name')
        field2 = questionnaire_field_factory(name='Email')

        response1 = questionnaire_response_factory(event=event, field=field1, value='John')
        response2 = questionnaire_response_factory(event=event, field=field2, value='john@test.com')

        assert event.questionnaire_responses.count() == 2
        assert response1 in event.questionnaire_responses.all()
        assert response2 in event.questionnaire_responses.all()

    def test_response_value_can_be_empty_string(self, questionnaire_response_factory):
        """Test response value can be an empty string for optional fields."""
        response = questionnaire_response_factory(value='')

        assert response.value == ''

    def test_response_has_basemodel_fields(self, questionnaire_response_factory):
        """Test response inherits BaseModel fields."""
        response = questionnaire_response_factory()

        assert response.id is not None
        assert response.created_at is not None
        assert response.updated_at is not None
