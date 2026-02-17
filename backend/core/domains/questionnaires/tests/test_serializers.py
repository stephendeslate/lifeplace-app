"""
Unit tests for questionnaires domain serializers.

Tests:
- QuestionnaireFieldSerializer (field serialization, validation)
- QuestionnaireSerializer (basic questionnaire serialization)
- QuestionnaireDetailSerializer (detailed serialization with fields)
- QuestionnaireFieldCreateSerializer (field creation without questionnaire)
- QuestionnaireWithFieldsSerializer (nested create/update)
- QuestionnaireResponseSerializer (response serialization)
- EventQuestionnaireResponsesSerializer (bulk response serialization)
"""

import pytest
from rest_framework.exceptions import ValidationError

from core.domains.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireResponse,
)
from core.domains.questionnaires.serializers import (
    QuestionnaireFieldSerializer,
    QuestionnaireSerializer,
    QuestionnaireDetailSerializer,
    QuestionnaireFieldCreateSerializer,
    QuestionnaireWithFieldsSerializer,
    QuestionnaireResponseSerializer,
    EventQuestionnaireResponsesSerializer,
)
from core.domains.questionnaires.exceptions import (
    InvalidFieldType,
    OptionsRequired,
)


@pytest.mark.django_db
class TestQuestionnaireFieldSerializer:
    """Unit tests for QuestionnaireFieldSerializer."""

    def test_serialize_text_field(self, questionnaire_field_factory):
        """Test serialization of a text field."""
        field = questionnaire_field_factory(text_field=True)
        serializer = QuestionnaireFieldSerializer(field)
        data = serializer.data

        assert data['name'] == 'Text Field'
        assert data['type'] == 'text'
        assert data['type_display'] == 'Text'
        assert data['required'] is False
        assert 'id' in data
        assert 'created_at' in data
        assert 'updated_at' in data

    def test_serialize_select_field_with_options(self, questionnaire_field_factory):
        """Test serialization of a select field with options."""
        field = questionnaire_field_factory(select_field=True)
        serializer = QuestionnaireFieldSerializer(field)
        data = serializer.data

        assert data['type'] == 'select'
        assert data['options'] == ['Option A', 'Option B', 'Option C']

    def test_serialize_file_field_with_upload_settings(self, questionnaire_field_factory):
        """Test serialization of a file field with upload settings."""
        field = questionnaire_field_factory(file_field=True)
        serializer = QuestionnaireFieldSerializer(field)
        data = serializer.data

        assert data['type'] == 'file'
        assert data['max_file_size_mb'] == 5
        assert data['allowed_file_types'] == ['pdf', 'jpg', 'png']
        assert data['max_files'] == 3

    def test_serialize_field_with_conditions(self, questionnaire_field_factory):
        """Test serialization of a field with show conditions."""
        field = questionnaire_field_factory(with_conditions=True)
        serializer = QuestionnaireFieldSerializer(field)
        data = serializer.data

        assert 'show_conditions' in data
        assert data['show_conditions']['logic'] == 'AND'
        assert len(data['show_conditions']['conditions']) == 1

    def test_validate_select_field_requires_options(self, questionnaire_factory):
        """Test that select field validation requires options."""
        questionnaire = questionnaire_factory()
        data = {
            'questionnaire': questionnaire.id,
            'name': 'Test Select',
            'type': 'select',
            'options': [],  # Empty options should fail
            'order': 1,
        }
        serializer = QuestionnaireFieldSerializer(data=data)

        with pytest.raises(OptionsRequired):
            serializer.is_valid(raise_exception=True)

    def test_validate_multi_select_field_requires_options(self, questionnaire_factory):
        """Test that multi-select field validation requires options."""
        from rest_framework.exceptions import ValidationError
        questionnaire = questionnaire_factory()
        data = {
            'questionnaire': questionnaire.id,
            'name': 'Test Multi-Select',
            'type': 'multi-select',
            'options': None,  # No options should fail
            'order': 1,
        }
        serializer = QuestionnaireFieldSerializer(data=data)

        # DRF may raise ValidationError for null field before our custom OptionsRequired
        with pytest.raises((OptionsRequired, ValidationError)):
            serializer.is_valid(raise_exception=True)

    def test_validate_select_field_with_options_passes(self, questionnaire_factory):
        """Test that select field with options passes validation."""
        questionnaire = questionnaire_factory()
        data = {
            'questionnaire': questionnaire.id,
            'name': 'Test Select',
            'type': 'select',
            'options': ['A', 'B', 'C'],
            'order': 1,
        }
        serializer = QuestionnaireFieldSerializer(data=data)

        assert serializer.is_valid(raise_exception=True)

    def test_validate_invalid_field_type_raises_error(self, questionnaire_factory):
        """Test that invalid field type raises error."""
        from rest_framework.exceptions import ValidationError
        questionnaire = questionnaire_factory()
        data = {
            'questionnaire': questionnaire.id,
            'name': 'Test Field',
            'type': 'invalid_type',
            'order': 1,
        }
        serializer = QuestionnaireFieldSerializer(data=data)

        # DRF's ChoiceField validates before custom validate(), so it raises ValidationError
        with pytest.raises((InvalidFieldType, ValidationError)):
            serializer.is_valid(raise_exception=True)

    def test_validate_text_field_without_options_passes(self, questionnaire_factory):
        """Test that text field without options passes validation."""
        questionnaire = questionnaire_factory()
        data = {
            'questionnaire': questionnaire.id,
            'name': 'Test Text',
            'type': 'text',
            'order': 1,
        }
        serializer = QuestionnaireFieldSerializer(data=data)

        assert serializer.is_valid(raise_exception=True)

    def test_serialize_guests_field(self, questionnaire_field_factory):
        """Test serialization of a guests field with categories."""
        field = questionnaire_field_factory(guests_field=True)
        serializer = QuestionnaireFieldSerializer(field)
        data = serializer.data

        assert data['type'] == 'guests'
        assert data['options'] == ['Adults', 'Children', 'Infants']

    def test_serialize_legacy_guest_count_field(self, questionnaire_field_factory):
        """Test serialization of legacy guest count number field."""
        field = questionnaire_field_factory(guest_count_legacy=True)
        serializer = QuestionnaireFieldSerializer(field)
        data = serializer.data

        assert data['type'] == 'number'
        assert data['is_guest_count'] is True


@pytest.mark.django_db
class TestQuestionnaireSerializer:
    """Unit tests for QuestionnaireSerializer."""

    def test_serialize_questionnaire(self, questionnaire_factory):
        """Test basic questionnaire serialization."""
        questionnaire = questionnaire_factory(name='Test Questionnaire')
        serializer = QuestionnaireSerializer(questionnaire)
        data = serializer.data

        assert data['name'] == 'Test Questionnaire'
        assert data['is_active'] is True
        assert 'fields_count' in data
        assert 'id' in data
        assert 'created_at' in data
        assert 'updated_at' in data

    def test_serialize_questionnaire_with_fields_count(
        self, questionnaire_factory, questionnaire_field_factory
    ):
        """Test fields_count includes related fields."""
        questionnaire = questionnaire_factory()
        questionnaire_field_factory(questionnaire=questionnaire)
        questionnaire_field_factory(questionnaire=questionnaire)
        questionnaire_field_factory(questionnaire=questionnaire)

        serializer = QuestionnaireSerializer(questionnaire)
        data = serializer.data

        assert data['fields_count'] == 3

    def test_serialize_inactive_questionnaire(self, questionnaire_factory):
        """Test serialization of inactive questionnaire."""
        questionnaire = questionnaire_factory(inactive=True)
        serializer = QuestionnaireSerializer(questionnaire)
        data = serializer.data

        assert data['is_active'] is False


@pytest.mark.django_db
class TestQuestionnaireDetailSerializer:
    """Unit tests for QuestionnaireDetailSerializer."""

    def test_serialize_questionnaire_with_fields(
        self, questionnaire_factory, questionnaire_field_factory
    ):
        """Test detailed serialization includes fields."""
        questionnaire = questionnaire_factory(name='Detail Test')
        questionnaire_field_factory(
            questionnaire=questionnaire, name='Field 1', type='text', order=1
        )
        questionnaire_field_factory(
            questionnaire=questionnaire, name='Field 2', type='email', order=2
        )

        serializer = QuestionnaireDetailSerializer(questionnaire)
        data = serializer.data

        assert data['name'] == 'Detail Test'
        assert 'fields' in data
        assert len(data['fields']) == 2
        assert data['fields'][0]['name'] == 'Field 1'
        assert data['fields'][1]['name'] == 'Field 2'

    def test_serialize_questionnaire_with_event_type(
        self, questionnaire_factory, event_type_factory
    ):
        """Test serialization includes event type details."""
        event_type = event_type_factory(name='Wedding')
        questionnaire = questionnaire_factory(event_type=event_type)

        serializer = QuestionnaireDetailSerializer(questionnaire)
        data = serializer.data

        assert 'event_type' in data
        assert data['event_type']['name'] == 'Wedding'

    def test_serialize_questionnaire_without_event_type(self, questionnaire_factory):
        """Test serialization with null event type."""
        questionnaire = questionnaire_factory(event_type=None)

        serializer = QuestionnaireDetailSerializer(questionnaire)
        data = serializer.data

        assert data['event_type'] is None


@pytest.mark.django_db
class TestQuestionnaireFieldCreateSerializer:
    """Unit tests for QuestionnaireFieldCreateSerializer."""

    def test_validate_text_field(self):
        """Test validation of text field data."""
        data = {
            'name': 'Full Name',
            'type': 'text',
            'required': True,
            'order': 1,
        }
        serializer = QuestionnaireFieldCreateSerializer(data=data)

        assert serializer.is_valid(raise_exception=True)
        assert serializer.validated_data['name'] == 'Full Name'
        assert serializer.validated_data['type'] == 'text'

    def test_validate_select_field_requires_options(self):
        """Test that select field requires options."""
        data = {
            'name': 'Preference',
            'type': 'select',
            'order': 1,
            'options': [],
        }
        serializer = QuestionnaireFieldCreateSerializer(data=data)

        with pytest.raises(OptionsRequired):
            serializer.is_valid(raise_exception=True)

    def test_validate_select_field_with_options(self):
        """Test select field with options passes validation."""
        data = {
            'name': 'Preference',
            'type': 'select',
            'order': 1,
            'options': ['Option A', 'Option B'],
        }
        serializer = QuestionnaireFieldCreateSerializer(data=data)

        assert serializer.is_valid(raise_exception=True)

    def test_validate_invalid_type_raises_error(self):
        """Test that invalid field type raises error."""
        from rest_framework.exceptions import ValidationError
        data = {
            'name': 'Test',
            'type': 'nonexistent_type',
            'order': 1,
        }
        serializer = QuestionnaireFieldCreateSerializer(data=data)

        # DRF's ChoiceField validates before custom validate(), so it raises ValidationError
        with pytest.raises((InvalidFieldType, ValidationError)):
            serializer.is_valid(raise_exception=True)

    def test_validate_file_field_settings(self):
        """Test file field with upload settings."""
        data = {
            'name': 'Upload Document',
            'type': 'file',
            'order': 1,
            'max_file_size_mb': 10,
            'allowed_file_types': ['pdf', 'doc'],
            'max_files': 5,
        }
        serializer = QuestionnaireFieldCreateSerializer(data=data)

        assert serializer.is_valid(raise_exception=True)
        assert serializer.validated_data['max_file_size_mb'] == 10
        assert serializer.validated_data['max_files'] == 5


@pytest.mark.django_db
class TestQuestionnaireWithFieldsSerializer:
    """Unit tests for QuestionnaireWithFieldsSerializer."""

    def test_create_questionnaire_without_fields(self):
        """Test creating a questionnaire without nested fields."""
        data = {
            'name': 'Simple Questionnaire',
            'is_active': True,
            'order': 1,
        }
        serializer = QuestionnaireWithFieldsSerializer(data=data)

        assert serializer.is_valid(raise_exception=True)
        questionnaire = serializer.save()

        assert questionnaire.name == 'Simple Questionnaire'
        assert questionnaire.fields.count() == 0

    def test_create_questionnaire_with_fields(self):
        """Test creating a questionnaire with nested fields."""
        data = {
            'name': 'Full Questionnaire',
            'is_active': True,
            'order': 1,
            'fields': [
                {'name': 'Name', 'type': 'text', 'required': True, 'order': 1},
                {'name': 'Email', 'type': 'email', 'required': True, 'order': 2},
            ]
        }
        serializer = QuestionnaireWithFieldsSerializer(data=data)

        assert serializer.is_valid(raise_exception=True)
        questionnaire = serializer.save()

        assert questionnaire.name == 'Full Questionnaire'
        assert questionnaire.fields.count() == 2
        assert questionnaire.fields.filter(name='Name').exists()
        assert questionnaire.fields.filter(name='Email').exists()

    def test_update_questionnaire_replaces_fields(
        self, questionnaire_factory, questionnaire_field_factory
    ):
        """Test updating a questionnaire replaces all fields."""
        questionnaire = questionnaire_factory(name='Original')
        questionnaire_field_factory(questionnaire=questionnaire, name='Old Field')

        data = {
            'name': 'Updated',
            'fields': [
                {'name': 'New Field 1', 'type': 'text', 'order': 1},
                {'name': 'New Field 2', 'type': 'number', 'order': 2},
            ]
        }
        serializer = QuestionnaireWithFieldsSerializer(
            questionnaire, data=data, partial=True
        )

        assert serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        assert updated.name == 'Updated'
        assert updated.fields.count() == 2
        assert not updated.fields.filter(name='Old Field').exists()
        assert updated.fields.filter(name='New Field 1').exists()

    def test_update_questionnaire_without_fields_keeps_existing(
        self, questionnaire_factory, questionnaire_field_factory
    ):
        """Test updating questionnaire without fields data keeps existing fields."""
        questionnaire = questionnaire_factory(name='Original')
        questionnaire_field_factory(questionnaire=questionnaire, name='Existing Field')

        data = {
            'name': 'Updated Name Only',
        }
        serializer = QuestionnaireWithFieldsSerializer(
            questionnaire, data=data, partial=True
        )

        assert serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        assert updated.name == 'Updated Name Only'
        assert updated.fields.count() == 1
        assert updated.fields.filter(name='Existing Field').exists()


@pytest.mark.django_db
class TestQuestionnaireResponseSerializer:
    """Unit tests for QuestionnaireResponseSerializer."""

    def test_serialize_response(
        self, event_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test basic response serialization."""
        event = event_factory()
        field = questionnaire_field_factory(name='Test Field', type='text')
        response = questionnaire_response_factory(
            event=event, field=field, value='Test Answer'
        )

        serializer = QuestionnaireResponseSerializer(response)
        data = serializer.data

        assert data['value'] == 'Test Answer'
        assert data['field_name'] == 'Test Field'
        assert data['field_type'] == 'text'
        assert 'id' in data
        assert 'created_at' in data

    def test_serialize_boolean_response(
        self, event_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test serialization of boolean response."""
        event = event_factory()
        field = questionnaire_field_factory(boolean_field=True)
        response = questionnaire_response_factory(
            event=event, field=field, boolean_yes=True
        )

        serializer = QuestionnaireResponseSerializer(response)
        data = serializer.data

        assert data['value'] == 'yes'
        assert data['field_type'] == 'boolean'

    def test_serialize_guest_count_json_response(
        self, event_factory, questionnaire_field_factory, questionnaire_response_factory
    ):
        """Test serialization of guest count JSON response."""
        event = event_factory()
        field = questionnaire_field_factory(guests_field=True)
        response = questionnaire_response_factory(
            event=event, field=field, guest_count_json=True
        )

        serializer = QuestionnaireResponseSerializer(response)
        data = serializer.data

        assert data['value'] == '{"Adults": 50, "Children": 10, "Infants": 5}'
        assert data['field_type'] == 'guests'


@pytest.mark.django_db
class TestEventQuestionnaireResponsesSerializer:
    """Unit tests for EventQuestionnaireResponsesSerializer."""

    def test_validate_event_responses_data(self, event_factory):
        """Test validation of bulk responses data."""
        event = event_factory()
        data = {
            'event': event.id,
            'responses': [
                {'field': '1', 'value': 'Answer 1'},
                {'field': '2', 'value': 'Answer 2'},
            ]
        }
        serializer = EventQuestionnaireResponsesSerializer(data=data)

        assert serializer.is_valid(raise_exception=True)
        assert serializer.validated_data['event'] == event.id
        assert len(serializer.validated_data['responses']) == 2

    def test_validate_empty_responses(self, event_factory):
        """Test validation of empty responses list."""
        event = event_factory()
        data = {
            'event': event.id,
            'responses': []
        }
        serializer = EventQuestionnaireResponsesSerializer(data=data)

        assert serializer.is_valid(raise_exception=True)
        assert serializer.validated_data['responses'] == []

    def test_validate_missing_event(self):
        """Test validation fails without event."""
        data = {
            'responses': [
                {'field': '1', 'value': 'Answer 1'},
            ]
        }
        serializer = EventQuestionnaireResponsesSerializer(data=data)

        assert not serializer.is_valid()
        assert 'event' in serializer.errors
