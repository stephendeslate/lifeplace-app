"""
Unit tests for notes domain services.

Tests:
- NoteService.get_notes_for_object
- NoteService.get_note_by_id
- NoteService.create_note
- NoteService.update_note
- NoteService.delete_note
"""

from django.contrib.contenttypes.models import ContentType

import pytest

from core.domains.notes.exceptions import (
    InvalidContentType,
    NoteNotFound,
    UnauthorizedNoteAccess,
)
from core.domains.notes.models import Note
from core.domains.notes.services import NoteService


@pytest.mark.django_db
class TestNoteServiceGetNotesForObject:
    """Tests for NoteService.get_notes_for_object."""

    def test_get_notes_for_event(self, user_factory, event_factory):
        """Test retrieving notes for an event."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        # Create some notes
        Note.objects.create(
            title="Note 1", content="Content 1.", created_by=admin, content_type=content_type, object_id=event.id
        )
        Note.objects.create(
            title="Note 2", content="Content 2.", created_by=admin, content_type=content_type, object_id=event.id
        )

        notes = NoteService.get_notes_for_object("event", event.id, admin)

        assert notes.count() == 2

    def test_get_notes_for_client_alias(self, user_factory):
        """Test retrieving notes using 'client' alias (maps to 'user')."""
        admin = user_factory(admin=True)
        client = user_factory(role="CLIENT")
        content_type = ContentType.objects.get_for_model(client)

        Note.objects.create(
            title="Client Note", content="Content.", created_by=admin, content_type=content_type, object_id=client.id
        )

        # Use 'client' alias
        notes = NoteService.get_notes_for_object("client", client.id, admin)

        assert notes.count() == 1
        assert notes.first().title == "Client Note"

    def test_get_notes_client_visible_only(self, user_factory, event_factory):
        """Test filtering to only client-visible notes."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        # Create visible and non-visible notes
        Note.objects.create(
            title="Visible Note",
            content="Content.",
            created_by=admin,
            content_type=content_type,
            object_id=event.id,
            is_client_visible=True,
        )
        Note.objects.create(
            title="Hidden Note",
            content="Content.",
            created_by=admin,
            content_type=content_type,
            object_id=event.id,
            is_client_visible=False,
        )

        # Get all notes
        all_notes = NoteService.get_notes_for_object("event", event.id)
        assert all_notes.count() == 2

        # Get only client-visible notes
        visible_notes = NoteService.get_notes_for_object("event", event.id, client_visible_only=True)
        assert visible_notes.count() == 1
        assert visible_notes.first().title == "Visible Note"

    def test_get_notes_for_invalid_content_type(self, user_factory):
        """Test that invalid content type raises InvalidContentType."""
        admin = user_factory(admin=True)

        with pytest.raises(InvalidContentType) as exc_info:
            NoteService.get_notes_for_object("nonexistent_model", 1, admin)

        assert "does not exist" in str(exc_info.value.detail)

    def test_get_notes_empty_result(self, user_factory, event_factory):
        """Test getting notes when none exist for the object."""
        admin = user_factory(admin=True)
        event = event_factory()

        notes = NoteService.get_notes_for_object("event", event.id, admin)

        assert notes.count() == 0

    def test_get_notes_case_insensitive_content_type(self, user_factory, event_factory):
        """Test that content type lookup is case-insensitive."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        Note.objects.create(
            title="Test Note", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        # Try with different cases
        notes_upper = NoteService.get_notes_for_object("EVENT", event.id)
        notes_lower = NoteService.get_notes_for_object("event", event.id)
        notes_mixed = NoteService.get_notes_for_object("Event", event.id)

        assert notes_upper.count() == 1
        assert notes_lower.count() == 1
        assert notes_mixed.count() == 1


@pytest.mark.django_db
class TestNoteServiceGetNoteById:
    """Tests for NoteService.get_note_by_id."""

    def test_get_note_by_id_success(self, user_factory, event_factory):
        """Test retrieving a note by its ID."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        retrieved_note = NoteService.get_note_by_id(note.id, admin)

        assert retrieved_note.id == note.id
        assert retrieved_note.title == "Test Note"

    def test_get_note_by_id_not_found(self, user_factory):
        """Test retrieving a non-existent note raises NoteNotFound."""
        admin = user_factory(admin=True)

        with pytest.raises(NoteNotFound):
            NoteService.get_note_by_id(999999, admin)

    def test_get_note_by_id_unauthorized_client(self, user_factory, event_factory):
        """Test that non-admin users cannot access notes."""
        admin = user_factory(admin=True)
        client = user_factory(role="CLIENT")
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        with pytest.raises(UnauthorizedNoteAccess):
            NoteService.get_note_by_id(note.id, client)

    def test_get_note_by_id_without_user(self, user_factory, event_factory):
        """Test retrieving a note without user (no permission check)."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        # No user provided - should succeed
        retrieved_note = NoteService.get_note_by_id(note.id)

        assert retrieved_note.id == note.id


@pytest.mark.django_db
class TestNoteServiceCreateNote:
    """Tests for NoteService.create_note."""

    def test_create_note_with_content_type_object(self, user_factory, event_factory):
        """Test creating a note when content_type is already a ContentType object."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        data = {
            "title": "New Note",
            "content": "Note content.",
            "content_type": content_type,
            "object_id": event.id,
            "is_client_visible": False,
        }

        note = NoteService.create_note(admin, data)

        assert note.id is not None
        assert note.title == "New Note"
        assert note.content == "Note content."
        assert note.created_by == admin
        assert note.content_type == content_type
        assert note.object_id == event.id

    def test_create_note_with_content_type_model_string(self, user_factory, event_factory):
        """Test creating a note using content_type_model string (legacy)."""
        admin = user_factory(admin=True)
        event = event_factory()

        data = {"title": "New Note", "content": "Note content.", "content_type_model": "event", "object_id": event.id}

        note = NoteService.create_note(admin, data)

        assert note.id is not None
        assert note.content_type.model == "event"

    def test_create_note_with_client_alias(self, user_factory):
        """Test creating a note with 'client' content type alias."""
        admin = user_factory(admin=True)
        client = user_factory(role="CLIENT")

        data = {
            "title": "Client Note",
            "content": "About the client.",
            "content_type_model": "client",
            "object_id": client.id,
        }

        note = NoteService.create_note(admin, data)

        assert note.content_type.model == "user"

    def test_create_note_missing_content_type_raises_error(self, user_factory):
        """Test that missing content type raises InvalidContentType."""
        admin = user_factory(admin=True)

        data = {"title": "Note", "content": "Content.", "object_id": 1}

        with pytest.raises(InvalidContentType) as exc_info:
            NoteService.create_note(admin, data)

        assert "required" in str(exc_info.value.detail)

    def test_create_note_missing_object_id_with_content_type(self, user_factory):
        """Test that missing object_id with content_type raises error."""
        admin = user_factory(admin=True)
        from django.contrib.contenttypes.models import ContentType

        content_type = ContentType.objects.get(model="event")

        data = {"title": "Note", "content": "Content.", "content_type": content_type}

        with pytest.raises(InvalidContentType) as exc_info:
            NoteService.create_note(admin, data)

        assert "Object ID is required" in str(exc_info.value.detail)

    def test_create_note_invalid_content_type_model(self, user_factory):
        """Test that invalid content_type_model raises InvalidContentType."""
        admin = user_factory(admin=True)

        data = {"title": "Note", "content": "Content.", "content_type_model": "nonexistent", "object_id": 1}

        with pytest.raises(InvalidContentType):
            NoteService.create_note(admin, data)

    def test_create_note_with_is_client_visible(self, user_factory, event_factory):
        """Test creating a client-visible note."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        data = {
            "title": "Visible Note",
            "content": "Content.",
            "content_type": content_type,
            "object_id": event.id,
            "is_client_visible": True,
        }

        note = NoteService.create_note(admin, data)

        assert note.is_client_visible is True


@pytest.mark.django_db
class TestNoteServiceUpdateNote:
    """Tests for NoteService.update_note."""

    def test_update_note_title(self, user_factory, event_factory):
        """Test updating a note's title."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Original Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        updated_note = NoteService.update_note(note.id, admin, {"title": "Updated Title"})

        assert updated_note.title == "Updated Title"

    def test_update_note_content(self, user_factory, event_factory):
        """Test updating a note's content."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title", content="Original content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        updated_note = NoteService.update_note(note.id, admin, {"content": "Updated content."})

        assert updated_note.content == "Updated content."

    def test_update_note_is_client_visible(self, user_factory, event_factory):
        """Test updating a note's is_client_visible flag."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title",
            content="Content.",
            created_by=admin,
            content_type=content_type,
            object_id=event.id,
            is_client_visible=False,
        )

        updated_note = NoteService.update_note(note.id, admin, {"is_client_visible": True})

        assert updated_note.is_client_visible is True

    def test_update_note_multiple_fields(self, user_factory, event_factory):
        """Test updating multiple fields at once."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Original Title",
            content="Original content.",
            created_by=admin,
            content_type=content_type,
            object_id=event.id,
            is_client_visible=False,
        )

        updated_note = NoteService.update_note(
            note.id, admin, {"title": "New Title", "content": "New content.", "is_client_visible": True}
        )

        assert updated_note.title == "New Title"
        assert updated_note.content == "New content."
        assert updated_note.is_client_visible is True

    def test_update_note_ignores_non_editable_fields(self, user_factory, event_factory):
        """Test that update ignores fields that shouldn't be editable."""
        admin = user_factory(admin=True)
        another_admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        # Attempt to update created_by (should be ignored)
        updated_note = NoteService.update_note(note.id, admin, {"title": "New Title", "created_by": another_admin})

        # created_by should remain unchanged
        assert updated_note.created_by == admin

    def test_update_note_not_found(self, user_factory):
        """Test updating a non-existent note raises NoteNotFound."""
        admin = user_factory(admin=True)

        with pytest.raises(NoteNotFound):
            NoteService.update_note(999999, admin, {"title": "New"})

    def test_update_note_unauthorized_client(self, user_factory, event_factory):
        """Test that non-admin users cannot update notes."""
        admin = user_factory(admin=True)
        client = user_factory(role="CLIENT")
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        with pytest.raises(UnauthorizedNoteAccess):
            NoteService.update_note(note.id, client, {"title": "New"})


@pytest.mark.django_db
class TestNoteServiceDeleteNote:
    """Tests for NoteService.delete_note."""

    def test_delete_note_success(self, user_factory, event_factory):
        """Test successfully deleting a note."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="To Delete", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )
        note_id = note.id

        result = NoteService.delete_note(note_id, admin)

        assert result is True
        assert not Note.objects.filter(id=note_id).exists()

    def test_delete_note_not_found(self, user_factory):
        """Test deleting a non-existent note raises NoteNotFound."""
        admin = user_factory(admin=True)

        with pytest.raises(NoteNotFound):
            NoteService.delete_note(999999, admin)

    def test_delete_note_unauthorized_client(self, user_factory, event_factory):
        """Test that non-admin users cannot delete notes."""
        admin = user_factory(admin=True)
        client = user_factory(role="CLIENT")
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        with pytest.raises(UnauthorizedNoteAccess):
            NoteService.delete_note(note.id, client)

    def test_delete_note_does_not_affect_content_object(self, user_factory, event_factory):
        """Test that deleting a note does not delete the content object."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)
        event_id = event.id

        note = Note.objects.create(
            title="Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        NoteService.delete_note(note.id, admin)

        # Event should still exist
        from core.domains.events.models import Event

        assert Event.objects.filter(id=event_id).exists()


@pytest.mark.django_db
class TestNoteServiceTransactionBehavior:
    """Tests for transaction behavior in NoteService."""

    def test_create_note_atomic(self, user_factory, event_factory, mocker):
        """Test that create_note uses atomic transaction."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        # Mock Note.objects.create to raise an exception after creation
        original_create = Note.objects.create
        call_count = [0]

        def failing_create(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                original_create(*args, **kwargs)
                raise Exception("Simulated failure")
            return original_create(*args, **kwargs)

        mocker.patch.object(Note.objects, "create", side_effect=failing_create)

        data = {"title": "Test", "content": "Content.", "content_type": content_type, "object_id": event.id}

        with pytest.raises(Exception, match="Simulated failure"):
            NoteService.create_note(admin, data)

        # Due to atomic transaction, note should not be persisted
        assert Note.objects.filter(title="Test").count() == 0

    def test_update_note_atomic(self, user_factory, event_factory, mocker):
        """Test that update_note uses atomic transaction."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Original", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )
        original_title = note.title

        # Mock save to raise an exception
        def failing_save(*args, **kwargs):
            raise Exception("Simulated save failure")

        mocker.patch.object(Note, "save", side_effect=failing_save)

        with pytest.raises(Exception, match="Simulated save failure"):
            NoteService.update_note(note.id, admin, {"title": "New Title"})

        # Refresh from DB - title should be unchanged due to rollback
        note.refresh_from_db()
        assert note.title == original_title
