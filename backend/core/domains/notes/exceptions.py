# core/domains/notes/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class NoteNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Note not found."
    default_code = "note_not_found"

class InvalidContentType(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid content type for note."
    default_code = "invalid_content_type"

class UnauthorizedNoteAccess(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You don't have permission to access this note."
    default_code = "unauthorized_note_access"