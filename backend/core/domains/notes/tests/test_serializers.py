"""
Unit tests for notes domain serializers.

Tests:
- BasicNoteSerializer
- NoteSerializer (with content type info)
- NoteCreateSerializer (with content type validation)
"""

from django.contrib.contenttypes.models import ContentType

import pytest

from core.domains.notes.basic_serializers import BasicNoteSerializer
from core.domains.notes.exceptions import InvalidContentType
from core.domains.notes.models import Note
from core.domains.notes.serializers import NoteCreateSerializer, NoteSerializer


@pytest.mark.django_db
class TestBasicNoteSerializer:
    """Unit tests for BasicNoteSerializer."""

    def test_serialization_all_fields(self, user_factory, event_factory):
        """Test that all fields are serialized correctly."""
        admin = user_factory(admin=True, first_name="John", last_name="Doe")
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note",
            content="Note content here.",
            created_by=admin,
            content_type=content_type,
            object_id=event.id,
            is_client_visible=True,
        )

        serializer = BasicNoteSerializer(note)
        data = serializer.data

        assert data["id"] == note.id
        assert data["title"] == "Test Note"
        assert data["content"] == "Note content here."
        assert data["created_by"] == admin.id
        assert data["created_by_name"] == "John Doe"
        assert data["is_client_visible"] is True
        assert "created_at" in data
        assert "updated_at" in data

    def test_created_by_name_with_none(self, user_factory, event_factory):
        """Test created_by_name returns None when created_by is None."""
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note", content="Content.", created_by=None, content_type=content_type, object_id=event.id
        )

        serializer = BasicNoteSerializer(note)
        data = serializer.data

        assert data["created_by"] is None
        assert data["created_by_name"] is None

    def test_read_only_fields(self, user_factory, event_factory):
        """Test that read-only fields cannot be set via serializer."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Original",
            content="Original content.",
            created_by=admin,
            content_type=content_type,
            object_id=event.id,
        )

        # Attempt to update read-only fields
        serializer = BasicNoteSerializer(
            note,
            data={
                "id": 999999,
                "title": "Updated Title",
                "content": "Updated content.",
                "created_at": "2020-01-01T00:00:00Z",
                "created_by": 999999,
            },
            partial=True,
        )

        assert serializer.is_valid()
        # Read-only fields should be ignored
        assert "id" not in serializer.validated_data
        assert "created_at" not in serializer.validated_data
        assert "created_by" not in serializer.validated_data


@pytest.mark.django_db
class TestNoteSerializer:
    """Unit tests for NoteSerializer."""

    def test_serialization_includes_content_type_info(self, user_factory, event_factory):
        """Test that NoteSerializer includes content_type fields."""
        admin = user_factory(admin=True)
        event = event_factory(name="Wedding Event")
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        serializer = NoteSerializer(note)
        data = serializer.data

        assert data["content_type"] == content_type.id
        assert data["object_id"] == event.id
        assert data["content_type_name"] == "Event"
        assert "content_object_repr" in data

    def test_content_type_name_capitalized(self, user_factory, event_factory):
        """Test that content_type_name is properly capitalized."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        serializer = NoteSerializer(note)
        data = serializer.data

        # Model name should be capitalized
        assert data["content_type_name"] == "Event"

    def test_content_object_repr_with_str_method(self, user_factory, event_factory):
        """Test content_object_repr uses __str__ when available."""
        admin = user_factory(admin=True)
        event = event_factory(name="My Special Event")
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        serializer = NoteSerializer(note)
        data = serializer.data

        # Should use the event's __str__ representation
        assert "content_object_repr" in data
        assert data["content_object_repr"] is not None

    def test_inherited_fields_from_basic_serializer(self, user_factory, event_factory):
        """Test that NoteSerializer inherits all fields from BasicNoteSerializer."""
        admin = user_factory(admin=True, first_name="Jane", last_name="Smith")
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        serializer = NoteSerializer(note)
        data = serializer.data

        # Fields from BasicNoteSerializer
        assert "id" in data
        assert "title" in data
        assert "content" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert "created_by" in data
        assert "created_by_name" in data
        assert data["created_by_name"] == "Jane Smith"
        assert "is_client_visible" in data


@pytest.mark.django_db
class TestNoteCreateSerializer:
    """Unit tests for NoteCreateSerializer."""

    def test_valid_create_with_event_content_type(self, user_factory, event_factory, request_factory):
        """Test creating a note with event content type."""
        admin = user_factory(admin=True)
        event = event_factory()

        request = request_factory.post("/api/notes/")
        request.user = admin

        data = {
            "title": "New Note",
            "content": "Note content.",
            "content_type_model": "event",
            "object_id": event.id,
            "is_client_visible": False,
        }

        serializer = NoteCreateSerializer(data=data, context={"request": request})
        assert serializer.is_valid(), serializer.errors

        # Check validated data has content_type (converted from content_type_model)
        assert "content_type" in serializer.validated_data
        assert serializer.validated_data["content_type"].model == "event"

    def test_valid_create_with_client_alias(self, user_factory, request_factory):
        """Test creating a note with 'client' alias (maps to 'user')."""
        admin = user_factory(admin=True)
        client = user_factory(role="CLIENT")

        request = request_factory.post("/api/notes/")
        request.user = admin

        data = {
            "title": "Client Note",
            "content": "Note about client.",
            "content_type_model": "client",
            "object_id": client.id,
            "is_client_visible": True,
        }

        serializer = NoteCreateSerializer(data=data, context={"request": request})
        assert serializer.is_valid(), serializer.errors

        # Should map 'client' to 'user' content type
        assert serializer.validated_data["content_type"].model == "user"

    def test_invalid_content_type(self, user_factory, request_factory):
        """Test that invalid content type raises InvalidContentType."""
        admin = user_factory(admin=True)

        request = request_factory.post("/api/notes/")
        request.user = admin

        data = {
            "title": "Invalid Note",
            "content": "Content.",
            "content_type_model": "nonexistent_model",
            "object_id": 1,
        }

        serializer = NoteCreateSerializer(data=data, context={"request": request})

        # Should raise InvalidContentType during validation
        with pytest.raises(InvalidContentType):
            serializer.is_valid(raise_exception=True)

    def test_content_type_case_insensitive(self, user_factory, event_factory, request_factory):
        """Test that content_type_model is case-insensitive."""
        admin = user_factory(admin=True)
        event = event_factory()

        request = request_factory.post("/api/notes/")
        request.user = admin

        # Use uppercase
        data = {"title": "New Note", "content": "Content.", "content_type_model": "EVENT", "object_id": event.id}

        serializer = NoteCreateSerializer(data=data, context={"request": request})
        assert serializer.is_valid(), serializer.errors

    def test_required_fields(self, user_factory, request_factory):
        """Test that required fields are validated."""
        admin = user_factory(admin=True)

        request = request_factory.post("/api/notes/")
        request.user = admin

        # Missing content_type_model and object_id
        data = {"title": "Test Note", "content": "Content."}

        serializer = NoteCreateSerializer(data=data, context={"request": request})
        assert not serializer.is_valid()
        assert "content_type_model" in serializer.errors
        assert "object_id" in serializer.errors

    def test_content_required(self, user_factory, event_factory, request_factory):
        """Test that content field is required."""
        admin = user_factory(admin=True)
        event = event_factory()

        request = request_factory.post("/api/notes/")
        request.user = admin

        data = {"title": "Test Note", "content_type_model": "event", "object_id": event.id}

        serializer = NoteCreateSerializer(data=data, context={"request": request})
        assert not serializer.is_valid()
        assert "content" in serializer.errors

    def test_title_optional(self, user_factory, event_factory, request_factory):
        """Test that title field is optional."""
        admin = user_factory(admin=True)
        event = event_factory()

        request = request_factory.post("/api/notes/")
        request.user = admin

        data = {"content": "Content without title.", "content_type_model": "event", "object_id": event.id}

        serializer = NoteCreateSerializer(data=data, context={"request": request})
        assert serializer.is_valid(), serializer.errors

    def test_is_client_visible_default_false(self, user_factory, event_factory, request_factory):
        """Test that is_client_visible defaults to False."""
        admin = user_factory(admin=True)
        event = event_factory()

        request = request_factory.post("/api/notes/")
        request.user = admin

        data = {"content": "Content.", "content_type_model": "event", "object_id": event.id}

        serializer = NoteCreateSerializer(data=data, context={"request": request})
        assert serializer.is_valid()

        note = serializer.save()
        assert note.is_client_visible is False

    def test_create_sets_created_by(self, user_factory, event_factory, request_factory):
        """Test that create() sets created_by to the request user."""
        admin = user_factory(admin=True)
        event = event_factory()

        request = request_factory.post("/api/notes/")
        request.user = admin

        data = {"title": "Test Note", "content": "Content.", "content_type_model": "event", "object_id": event.id}

        serializer = NoteCreateSerializer(data=data, context={"request": request})
        assert serializer.is_valid()

        note = serializer.save()
        assert note.created_by == admin


@pytest.mark.django_db
class TestNoteSerializerMany:
    """Tests for serializing multiple notes."""

    def test_serialize_multiple_notes(self, user_factory, event_factory):
        """Test serializing a queryset of notes."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        notes = []
        for i in range(3):
            note = Note.objects.create(
                title=f"Note {i + 1}",
                content=f"Content {i + 1}.",
                created_by=admin,
                content_type=content_type,
                object_id=event.id,
            )
            notes.append(note)

        serializer = NoteSerializer(Note.objects.all(), many=True)
        data = serializer.data

        assert len(data) == 3
        # Notes should be ordered by created_at descending
        assert data[0]["title"] == "Note 3"
        assert data[1]["title"] == "Note 2"
        assert data[2]["title"] == "Note 1"
