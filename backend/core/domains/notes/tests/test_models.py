"""
Unit tests for notes domain models.

Tests:
- Note model (polymorphic note with GenericForeignKey)
- Note string representation
- Note ordering
- Note relationship to content objects
"""

import pytest
from django.contrib.contenttypes.models import ContentType

from core.domains.notes.models import Note


@pytest.mark.django_db
class TestNoteModel:
    """Unit tests for the Note model."""

    def test_create_note_with_event(self, user_factory, event_factory):
        """Test creating a note attached to an event."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title='Test Note',
            content='This is a test note content.',
            created_by=admin,
            content_type=content_type,
            object_id=event.id,
            is_client_visible=False
        )

        assert note.id is not None
        assert note.title == 'Test Note'
        assert note.content == 'This is a test note content.'
        assert note.created_by == admin
        assert note.content_object == event
        assert not note.is_client_visible

    def test_create_note_with_user(self, user_factory):
        """Test creating a note attached to a user (client)."""
        admin = user_factory(admin=True)
        client = user_factory(role='CLIENT')
        content_type = ContentType.objects.get_for_model(client)

        note = Note.objects.create(
            title='Client Note',
            content='Note about the client.',
            created_by=admin,
            content_type=content_type,
            object_id=client.id,
            is_client_visible=True
        )

        assert note.content_object == client
        assert note.is_client_visible

    def test_note_without_title(self, user_factory, event_factory):
        """Test creating a note without a title (blank is allowed)."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title='',
            content='Note without title.',
            created_by=admin,
            content_type=content_type,
            object_id=event.id
        )

        assert note.title == ''
        assert note.content == 'Note without title.'

    def test_note_string_representation_with_title(self, user_factory, event_factory):
        """Test Note __str__ returns title when available."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title='Important Meeting Notes',
            content='Content here.',
            created_by=admin,
            content_type=content_type,
            object_id=event.id
        )

        assert str(note) == 'Note: Important Meeting Notes'

    def test_note_string_representation_without_title(self, user_factory, event_factory):
        """Test Note __str__ returns truncated content when no title."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title='',
            content='This is a note without a title and has long content.',
            created_by=admin,
            content_type=content_type,
            object_id=event.id
        )

        # Should show first 50 characters of content
        assert str(note) == 'Note: This is a note without a title and has long c'

    def test_note_ordering(self, user_factory, event_factory):
        """Test notes are ordered by created_at descending."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note1 = Note.objects.create(
            title='First Note',
            content='Created first.',
            created_by=admin,
            content_type=content_type,
            object_id=event.id
        )
        note2 = Note.objects.create(
            title='Second Note',
            content='Created second.',
            created_by=admin,
            content_type=content_type,
            object_id=event.id
        )
        note3 = Note.objects.create(
            title='Third Note',
            content='Created third.',
            created_by=admin,
            content_type=content_type,
            object_id=event.id
        )

        notes = list(Note.objects.all())
        # Most recent first
        assert notes[0] == note3
        assert notes[1] == note2
        assert notes[2] == note1

    def test_note_created_by_null_on_user_delete(self, user_factory, event_factory):
        """Test that created_by is set to null when user is deleted."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title='Test Note',
            content='Content.',
            created_by=admin,
            content_type=content_type,
            object_id=event.id
        )

        admin_id = admin.id
        admin.delete()

        note.refresh_from_db()
        assert note.created_by is None

    def test_note_is_client_visible_default(self, user_factory, event_factory):
        """Test that is_client_visible defaults to False."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            content='Test content.',
            created_by=admin,
            content_type=content_type,
            object_id=event.id
        )

        assert note.is_client_visible is False

    def test_note_timestamps(self, user_factory, event_factory):
        """Test that created_at and updated_at are set automatically."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title='Test Note',
            content='Content.',
            created_by=admin,
            content_type=content_type,
            object_id=event.id
        )

        assert note.created_at is not None
        assert note.updated_at is not None

    def test_note_update_changes_updated_at(self, user_factory, event_factory):
        """Test that updating a note changes updated_at."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        note = Note.objects.create(
            title='Test Note',
            content='Original content.',
            created_by=admin,
            content_type=content_type,
            object_id=event.id
        )
        original_updated_at = note.updated_at

        note.content = 'Updated content.'
        note.save()

        note.refresh_from_db()
        assert note.updated_at >= original_updated_at


@pytest.mark.django_db
class TestNoteIndexes:
    """Tests for Note model indexes."""

    def test_content_type_object_id_index_exists(self):
        """Test that the composite index on content_type and object_id exists."""
        # This is a meta test - the index is defined in Meta.indexes
        from core.domains.notes.models import Note

        index_names = [index.name for index in Note._meta.indexes]
        # Check that we have an index (Django auto-generates index names)
        assert len(Note._meta.indexes) >= 1

        # Check index fields
        index_fields = Note._meta.indexes[0].fields
        assert 'content_type' in index_fields
        assert 'object_id' in index_fields


@pytest.mark.django_db
class TestNoteGenericRelation:
    """Tests for Note generic relation functionality."""

    def test_multiple_notes_for_same_object(self, user_factory, event_factory):
        """Test that multiple notes can be attached to the same object."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)

        for i in range(3):
            Note.objects.create(
                title=f'Note {i+1}',
                content=f'Content for note {i+1}.',
                created_by=admin,
                content_type=content_type,
                object_id=event.id
            )

        notes = Note.objects.filter(
            content_type=content_type,
            object_id=event.id
        )
        assert notes.count() == 3

    def test_notes_for_different_objects(self, user_factory, event_factory):
        """Test notes for different objects are properly isolated."""
        admin = user_factory(admin=True)
        event1 = event_factory()
        event2 = event_factory()
        content_type = ContentType.objects.get_for_model(event1)

        Note.objects.create(
            title='Note for Event 1',
            content='Content.',
            created_by=admin,
            content_type=content_type,
            object_id=event1.id
        )
        Note.objects.create(
            title='Note for Event 2',
            content='Content.',
            created_by=admin,
            content_type=content_type,
            object_id=event2.id
        )

        event1_notes = Note.objects.filter(
            content_type=content_type,
            object_id=event1.id
        )
        event2_notes = Note.objects.filter(
            content_type=content_type,
            object_id=event2.id
        )

        assert event1_notes.count() == 1
        assert event2_notes.count() == 1
        assert event1_notes.first().title == 'Note for Event 1'
        assert event2_notes.first().title == 'Note for Event 2'

    def test_note_deletion_does_not_affect_content_object(
        self, user_factory, event_factory
    ):
        """Test that deleting a note does not delete the content object."""
        admin = user_factory(admin=True)
        event = event_factory()
        content_type = ContentType.objects.get_for_model(event)
        event_id = event.id

        note = Note.objects.create(
            title='Test Note',
            content='Content.',
            created_by=admin,
            content_type=content_type,
            object_id=event.id
        )

        note.delete()

        # Event should still exist
        from core.domains.events.models import Event
        assert Event.objects.filter(id=event_id).exists()
