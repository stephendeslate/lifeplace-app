# core/domains/notes/selectors.py
"""
Read-only query logic for the notes domain.

Selectors contain all read operations (queries, lookups, filtering).
They never mutate data. All functions use keyword-only arguments (*)
for clarity at call sites.

This is the reference implementation for the selector pattern.
See ADR-002: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

from django.contrib.contenttypes.models import ContentType
from django.db.models import QuerySet

from .exceptions import InvalidContentType, NoteNotFound, UnauthorizedNoteAccess
from .models import Note

# Map UI-facing content type names to actual Django model names
_CONTENT_TYPE_ALIASES: dict[str, str] = {
    "client": "user",  # 'client' is a User with role 'CLIENT'
}


def _resolve_content_type(content_type_model: str) -> ContentType:
    """Resolve a content type model name (with alias support) to a ContentType."""
    mapped = _CONTENT_TYPE_ALIASES.get(content_type_model, content_type_model)
    try:
        return ContentType.objects.get(model=mapped.lower())
    except ContentType.DoesNotExist:
        raise InvalidContentType(f"Content type '{content_type_model}' does not exist")


def get_notes_for_object(
    *,
    content_type_model: str,
    object_id: int,
    client_visible_only: bool = False,
) -> QuerySet[Note]:
    """Get all notes attached to a specific object.

    Args:
        content_type_model: The content type model name (e.g., 'event', 'client').
        object_id: The ID of the object to get notes for.
        client_visible_only: If True, only return client-visible notes.
    """
    content_type = _resolve_content_type(content_type_model)
    notes = Note.objects.filter(content_type=content_type, object_id=object_id)

    if client_visible_only:
        notes = notes.filter(is_client_visible=True)

    return notes


def get_note_by_id(*, note_id: int, user: object | None = None) -> Note:
    """Get a specific note by ID.

    Args:
        note_id: The note's primary key.
        user: If provided, checks the user has permission (admin only).

    Raises:
        NoteNotFound: If the note does not exist.
        UnauthorizedNoteAccess: If the user is not an admin.
    """
    try:
        note = Note.objects.get(id=note_id)
    except Note.DoesNotExist:
        raise NoteNotFound()

    if user and not getattr(user, "role", None) == "ADMIN":
        raise UnauthorizedNoteAccess()

    return note
