"""
Unit tests for notes domain views.

Tests:
- NoteViewSet (CRUD endpoints)
- NoteViewSet.for_object custom action
- Permission checks
"""

from django.contrib.contenttypes.models import ContentType
from rest_framework import status

import pytest

from core.domains.notes.models import Note


@pytest.mark.django_db
class TestNoteViewSetList:
    """Tests for NoteViewSet list endpoint."""

    def test_list_notes_as_admin(self, admin_client, user_factory, event_factory):
        """Test listing notes as admin."""
        admin = admin_client.user
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note1 = Note.objects.create(
            title="Note 1", content="Content 1", created_by=admin, content_type=content_type, object_id=event.id
        )
        note2 = Note.objects.create(
            title="Note 2", content="Content 2", created_by=admin, content_type=content_type, object_id=event.id
        )

        response = admin_client.get("/api/notes/")

        assert response.status_code == status.HTTP_200_OK
        # Check notes are in response (may be paginated)
        if "results" in response.data:
            note_ids = [n["id"] for n in response.data["results"]]
        else:
            note_ids = [n["id"] for n in response.data]
        assert note1.id in note_ids
        assert note2.id in note_ids

    def test_list_notes_unauthorized(self, api_client, user_factory, event_factory):
        """Test listing notes without authentication."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        Note.objects.create(
            title="Note 1", content="Content 1", created_by=admin, content_type=content_type, object_id=event.id
        )

        response = api_client.get("/api/notes/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_notes_as_client_forbidden(self, client_user_client, user_factory, event_factory):
        """Test listing notes as CLIENT user is forbidden."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        Note.objects.create(
            title="Note 1", content="Content 1", created_by=admin, content_type=content_type, object_id=event.id
        )

        response = client_user_client.get("/api/notes/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_notes_ordered_by_created_at_descending(self, admin_client, user_factory, event_factory):
        """Test notes are ordered by created_at descending."""
        admin = admin_client.user
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note1 = Note.objects.create(
            title="First Note",
            content="Created first.",
            created_by=admin,
            content_type=content_type,
            object_id=event.id,
        )
        note2 = Note.objects.create(
            title="Second Note",
            content="Created second.",
            created_by=admin,
            content_type=content_type,
            object_id=event.id,
        )
        note3 = Note.objects.create(
            title="Third Note",
            content="Created third.",
            created_by=admin,
            content_type=content_type,
            object_id=event.id,
        )

        response = admin_client.get("/api/notes/")

        assert response.status_code == status.HTTP_200_OK
        if "results" in response.data:
            notes = response.data["results"]
        else:
            notes = response.data

        # Most recent should be first
        note_ids = [n["id"] for n in notes]
        assert note_ids.index(note3.id) < note_ids.index(note2.id)
        assert note_ids.index(note2.id) < note_ids.index(note1.id)


@pytest.mark.django_db
class TestNoteViewSetRetrieve:
    """Tests for NoteViewSet retrieve endpoint."""

    def test_retrieve_note_as_admin(self, admin_client, user_factory, event_factory):
        """Test retrieving a note as admin."""
        admin = admin_client.user
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note",
            content="Test content.",
            created_by=admin,
            content_type=content_type,
            object_id=event.id,
            is_client_visible=True,
        )

        response = admin_client.get(f"/api/notes/{note.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == note.id
        assert response.data["title"] == "Test Note"
        assert response.data["content"] == "Test content."
        assert response.data["is_client_visible"] is True
        assert "created_by" in response.data
        assert "content_type_name" in response.data
        assert "content_object_repr" in response.data

    def test_retrieve_nonexistent_note(self, admin_client):
        """Test retrieving nonexistent note returns 404."""
        response = admin_client.get("/api/notes/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_note_unauthorized(self, api_client, user_factory, event_factory):
        """Test retrieving note without authentication."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note", content="Test content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        response = api_client.get(f"/api/notes/{note.id}/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_note_as_client_forbidden(self, client_user_client, user_factory, event_factory):
        """Test retrieving note as CLIENT user is forbidden."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note", content="Test content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        response = client_user_client.get(f"/api/notes/{note.id}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestNoteViewSetCreate:
    """Tests for NoteViewSet create endpoint."""

    def test_create_note_as_admin(self, admin_client, event_factory):
        """Test creating a note as admin."""
        event = event_factory()

        data = {
            "title": "New Note",
            "content": "This is new note content.",
            "content_type_model": "event",
            "object_id": event.id,
            "is_client_visible": False,
        }

        response = admin_client.post("/api/notes/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "New Note"
        assert response.data["content"] == "This is new note content."
        assert response.data["is_client_visible"] is False
        assert Note.objects.filter(title="New Note").exists()

    def test_create_note_with_client_alias(self, admin_client, user_factory):
        """Test creating a note with 'client' as content_type_model."""
        client_user = user_factory(role="CLIENT")

        data = {
            "title": "Client Note",
            "content": "Note about the client.",
            "content_type_model": "client",
            "object_id": client_user.id,
            "is_client_visible": True,
        }

        response = admin_client.post("/api/notes/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Client Note"
        # Verify the note was created with 'user' content type (mapped from 'client')
        note = Note.objects.get(title="Client Note", object_id=client_user.id)
        assert note.content_type.model == "user"

    def test_create_note_without_title(self, admin_client, event_factory):
        """Test creating a note without title (blank title is allowed)."""
        event = event_factory()

        data = {"title": "", "content": "Note without a title.", "content_type_model": "event", "object_id": event.id}

        response = admin_client.post("/api/notes/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == ""
        assert response.data["content"] == "Note without a title."

    def test_create_note_client_visible(self, admin_client, event_factory):
        """Test creating a client-visible note."""
        event = event_factory()

        data = {
            "title": "Visible Note",
            "content": "This is visible to clients.",
            "content_type_model": "event",
            "object_id": event.id,
            "is_client_visible": True,
        }

        response = admin_client.post("/api/notes/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["is_client_visible"] is True

    def test_create_note_invalid_content_type(self, admin_client):
        """Test creating note with invalid content type fails."""
        data = {"title": "Test Note", "content": "Content.", "content_type_model": "nonexistent_model", "object_id": 1}

        response = admin_client.post("/api/notes/", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_note_missing_content_type(self, admin_client):
        """Test creating note without content_type_model fails."""
        data = {"title": "Test Note", "content": "Content.", "object_id": 1}

        response = admin_client.post("/api/notes/", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_note_missing_object_id(self, admin_client):
        """Test creating note without object_id fails."""
        data = {"title": "Test Note", "content": "Content.", "content_type_model": "event"}

        response = admin_client.post("/api/notes/", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_note_unauthorized(self, api_client, event_factory):
        """Test creating note without authentication."""
        event = event_factory()

        data = {"title": "Test Note", "content": "Content.", "content_type_model": "event", "object_id": event.id}

        response = api_client.post("/api/notes/", data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_note_as_client_forbidden(self, client_user_client, event_factory):
        """Test creating note as CLIENT user is forbidden."""
        event = event_factory()

        data = {"title": "Test Note", "content": "Content.", "content_type_model": "event", "object_id": event.id}

        response = client_user_client.post("/api/notes/", data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_note_sets_created_by(self, admin_client, event_factory):
        """Test that created_by is set to the current user."""
        event = event_factory()

        data = {
            "title": "Created By Test Note",
            "content": "Content.",
            "content_type_model": "event",
            "object_id": event.id,
        }

        response = admin_client.post("/api/notes/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        note = Note.objects.get(title="Created By Test Note", object_id=event.id)
        assert note.created_by == admin_client.user


@pytest.mark.django_db
class TestNoteViewSetUpdate:
    """Tests for NoteViewSet update endpoint."""

    def test_partial_update_note_title(self, admin_client, user_factory, event_factory):
        """Test updating a note's title using PATCH."""
        admin = admin_client.user
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Original Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        data = {"title": "Updated Title"}

        response = admin_client.patch(f"/api/notes/{note.id}/", data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated Title"
        assert response.data["content"] == "Content."

    def test_partial_update_note_content(self, admin_client, user_factory, event_factory):
        """Test updating a note's content using PATCH."""
        admin = admin_client.user
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title", content="Original content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        data = {"content": "Updated content."}

        response = admin_client.patch(f"/api/notes/{note.id}/", data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["content"] == "Updated content."
        assert response.data["title"] == "Title"

    def test_partial_update_note_multiple_fields(self, admin_client, user_factory, event_factory):
        """Test partial update of multiple note fields."""
        admin = admin_client.user
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Original Title",
            content="Original content.",
            created_by=admin,
            content_type=content_type,
            object_id=event.id,
        )

        data = {"title": "Updated Title", "content": "Updated content."}

        response = admin_client.patch(f"/api/notes/{note.id}/", data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated Title"
        assert response.data["content"] == "Updated content."

    def test_partial_update_note_is_client_visible(self, admin_client, user_factory, event_factory):
        """Test updating a note's is_client_visible flag using PATCH."""
        admin = admin_client.user
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

        data = {"is_client_visible": True}

        response = admin_client.patch(f"/api/notes/{note.id}/", data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_client_visible"] is True

    def test_full_update_requires_content_type_and_object_id(self, admin_client, user_factory, event_factory):
        """Test that PUT requires content_type and object_id fields."""
        admin = admin_client.user
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        # PUT without content_type and object_id should fail
        data = {"title": "Updated Title", "content": "Updated content."}

        response = admin_client.put(f"/api/notes/{note.id}/", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "content_type" in response.data
        assert "object_id" in response.data

    def test_full_update_with_all_fields(self, admin_client, user_factory, event_factory):
        """Test that PUT works when all required fields are provided."""
        admin = admin_client.user
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        data = {
            "title": "Updated Title",
            "content": "Updated content.",
            "content_type": content_type.id,
            "object_id": event.id,
            "is_client_visible": True,
        }

        response = admin_client.put(f"/api/notes/{note.id}/", data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated Title"
        assert response.data["content"] == "Updated content."
        assert response.data["is_client_visible"] is True

    def test_update_nonexistent_note(self, admin_client):
        """Test updating nonexistent note returns 404."""
        data = {"title": "New Title"}

        response = admin_client.patch("/api/notes/99999/", data, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_note_unauthorized(self, api_client, user_factory, event_factory):
        """Test updating note without authentication."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        data = {"title": "Updated"}

        response = api_client.patch(f"/api/notes/{note.id}/", data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_note_as_client_forbidden(self, client_user_client, user_factory, event_factory):
        """Test updating note as CLIENT user is forbidden."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        data = {"title": "Updated"}

        response = client_user_client.patch(f"/api/notes/{note.id}/", data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestNoteViewSetDestroy:
    """Tests for NoteViewSet destroy endpoint."""

    def test_delete_note(self, admin_client, user_factory, event_factory):
        """Test deleting a note."""
        admin = admin_client.user
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="To Delete", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )
        note_id = note.id

        response = admin_client.delete(f"/api/notes/{note_id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Note.objects.filter(id=note_id).exists()

    def test_delete_nonexistent_note(self, admin_client):
        """Test deleting nonexistent note returns 404."""
        response = admin_client.delete("/api/notes/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_note_unauthorized(self, api_client, user_factory, event_factory):
        """Test deleting note without authentication."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        response = api_client.delete(f"/api/notes/{note.id}/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_note_as_client_forbidden(self, client_user_client, user_factory, event_factory):
        """Test deleting note as CLIENT user is forbidden."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        response = client_user_client.delete(f"/api/notes/{note.id}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_note_does_not_affect_content_object(self, admin_client, user_factory, event_factory):
        """Test that deleting a note does not delete the content object."""
        admin = admin_client.user
        event = event_factory()
        event_id = event.id
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Title", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        response = admin_client.delete(f"/api/notes/{note.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        # Event should still exist
        from core.domains.events.models import Event

        assert Event.objects.filter(id=event_id).exists()


@pytest.mark.django_db
class TestNoteViewSetForObject:
    """Tests for NoteViewSet for_object action."""

    def test_get_notes_for_event(self, admin_client, user_factory, event_factory):
        """Test getting notes for a specific event."""
        admin = admin_client.user
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note1 = Note.objects.create(
            title="Event Note 1", content="Content 1.", created_by=admin, content_type=content_type, object_id=event.id
        )
        note2 = Note.objects.create(
            title="Event Note 2", content="Content 2.", created_by=admin, content_type=content_type, object_id=event.id
        )

        response = admin_client.get(f"/api/notes/for_object/?content_type=event&object_id={event.id}")

        assert response.status_code == status.HTTP_200_OK
        note_ids = [n["id"] for n in response.data]
        assert note1.id in note_ids
        assert note2.id in note_ids
        assert len(response.data) == 2

    def test_get_notes_for_client(self, admin_client, user_factory):
        """Test getting notes for a client (user)."""
        admin = admin_client.user
        client_user = user_factory(role="CLIENT")
        content_type = ContentType.objects.get_for_model(client_user)

        note = Note.objects.create(
            title="Client Note",
            content="About the client.",
            created_by=admin,
            content_type=content_type,
            object_id=client_user.id,
        )

        # Use 'client' alias
        response = admin_client.get(f"/api/notes/for_object/?content_type=client&object_id={client_user.id}")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["id"] == note.id

    def test_get_notes_for_object_missing_content_type(self, admin_client):
        """Test for_object without content_type returns 400."""
        response = admin_client.get("/api/notes/for_object/?object_id=1")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "content_type" in response.data["detail"]

    def test_get_notes_for_object_missing_object_id(self, admin_client):
        """Test for_object without object_id returns 400."""
        response = admin_client.get("/api/notes/for_object/?content_type=event")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "object_id" in response.data["detail"]

    def test_get_notes_for_object_missing_both_params(self, admin_client):
        """Test for_object without any params returns 400."""
        response = admin_client.get("/api/notes/for_object/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_notes_for_object_invalid_content_type(self, admin_client):
        """Test for_object with invalid content_type returns error."""
        response = admin_client.get("/api/notes/for_object/?content_type=nonexistent&object_id=1")

        # Service raises InvalidContentType which should result in an error response
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]

    def test_get_notes_for_object_empty_result(self, admin_client, event_factory):
        """Test for_object returns empty list when no notes exist."""
        event = event_factory()

        response = admin_client.get(f"/api/notes/for_object/?content_type=event&object_id={event.id}")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_get_notes_for_object_filters_by_object(self, admin_client, user_factory, event_factory):
        """Test for_object only returns notes for the specified object."""
        admin = admin_client.user
        event1 = event_factory()
        event2 = event_factory()
        content_type = ContentType.objects.get_for_model(event1)

        note1 = Note.objects.create(
            title="Event 1 Note", content="Content.", created_by=admin, content_type=content_type, object_id=event1.id
        )
        note2 = Note.objects.create(
            title="Event 2 Note", content="Content.", created_by=admin, content_type=content_type, object_id=event2.id
        )

        response = admin_client.get(f"/api/notes/for_object/?content_type=event&object_id={event1.id}")

        assert response.status_code == status.HTTP_200_OK
        note_ids = [n["id"] for n in response.data]
        assert note1.id in note_ids
        assert note2.id not in note_ids

    def test_get_notes_for_object_unauthorized(self, api_client, event_factory):
        """Test for_object without authentication."""
        event = event_factory()

        response = api_client.get(f"/api/notes/for_object/?content_type=event&object_id={event.id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_notes_for_object_as_client_forbidden(self, client_user_client, event_factory):
        """Test for_object as CLIENT user is forbidden."""
        event = event_factory()

        response = client_user_client.get(f"/api/notes/for_object/?content_type=event&object_id={event.id}")

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestNoteViewSetPermissions:
    """Tests for NoteViewSet permission checks."""

    def test_all_actions_require_admin(self, client_user_client, user_factory, event_factory):
        """Test that all note management actions require admin role."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        # List
        assert client_user_client.get("/api/notes/").status_code == status.HTTP_403_FORBIDDEN

        # Create
        assert (
            client_user_client.post(
                "/api/notes/",
                {"title": "New Note", "content": "Content.", "content_type_model": "event", "object_id": event.id},
                format="json",
            ).status_code
            == status.HTTP_403_FORBIDDEN
        )

        # Retrieve
        assert client_user_client.get(f"/api/notes/{note.id}/").status_code == status.HTTP_403_FORBIDDEN

        # Update
        assert (
            client_user_client.patch(f"/api/notes/{note.id}/", {"title": "Updated"}, format="json").status_code
            == status.HTTP_403_FORBIDDEN
        )

        # Delete
        assert client_user_client.delete(f"/api/notes/{note.id}/").status_code == status.HTTP_403_FORBIDDEN

        # For object
        assert (
            client_user_client.get(f"/api/notes/for_object/?content_type=event&object_id={event.id}").status_code
            == status.HTTP_403_FORBIDDEN
        )

    def test_superuser_has_access(self, authenticated_client, user_factory, event_factory):
        """Test that superuser has access to notes."""
        superuser = user_factory(superuser=True)
        client = authenticated_client(user=superuser)
        event = event_factory()

        data = {
            "title": "Superuser Note",
            "content": "Created by superuser.",
            "content_type_model": "event",
            "object_id": event.id,
        }

        response = client.post("/api/notes/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestNoteViewSetSerializers:
    """Tests for NoteViewSet serializer selection."""

    def test_create_uses_note_create_serializer(self, admin_client, event_factory):
        """Test that create action uses NoteCreateSerializer."""
        event = event_factory()

        data = {
            "title": "Test Note",
            "content": "Content.",
            "content_type_model": "event",  # This field is from NoteCreateSerializer
            "object_id": event.id,
        }

        response = admin_client.post("/api/notes/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve_uses_note_serializer(self, admin_client, user_factory, event_factory):
        """Test that retrieve action uses NoteSerializer with additional fields."""
        admin = admin_client.user
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title="Test Note", content="Content.", created_by=admin, content_type=content_type, object_id=event.id
        )

        response = admin_client.get(f"/api/notes/{note.id}/")

        assert response.status_code == status.HTTP_200_OK
        # These fields come from NoteSerializer
        assert "content_type_name" in response.data
        assert "content_object_repr" in response.data
        assert response.data["content_type_name"] == "Event"


@pytest.mark.django_db
class TestNoteViewSetSelectRelated:
    """Tests for NoteViewSet query optimization."""

    def test_list_uses_select_related(self, admin_client, user_factory, event_factory, django_assert_num_queries):
        """Test that list endpoint uses select_related to optimize queries."""
        admin = admin_client.user
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        # Create multiple notes
        for i in range(5):
            Note.objects.create(
                title=f"Note {i}",
                content=f"Content {i}.",
                created_by=admin,
                content_type=content_type,
                object_id=event.id,
            )

        # The number of queries should be constant regardless of the number of notes
        # due to select_related on 'created_by' and 'content_type'
        response = admin_client.get("/api/notes/")

        assert response.status_code == status.HTTP_200_OK
