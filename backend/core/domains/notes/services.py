# core/domains/notes/services.py
import logging

from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from .exceptions import InvalidContentType, NoteNotFound, UnauthorizedNoteAccess
from .models import Note

logger = logging.getLogger(__name__)

class NoteService:
    """Service for working with notes"""
    
    @staticmethod
    def get_notes_for_object(content_type_model, object_id, user=None):
        """Get all notes for a specific object"""
        try:
            # Map content_type_model aliases to actual model names
            content_type_mapping = {
                'client': 'user',  # 'client' is actually a User model with role 'CLIENT'
            }
            
            # Check if we need to map the content type
            if content_type_model in content_type_mapping:
                content_type_model = content_type_mapping[content_type_model]
                
            content_type = ContentType.objects.get(model=content_type_model.lower())
        except ContentType.DoesNotExist:
            raise InvalidContentType(f"Content type '{content_type_model}' does not exist")
        
        notes = Note.objects.filter(
            content_type=content_type,
            object_id=object_id
        )
        
        return notes
    
    @staticmethod
    def get_note_by_id(note_id, user=None):
        """Get a specific note by ID"""
        try:
            note = Note.objects.get(id=note_id)
            
            # Check if user has permission to view this note (admins only)
            if user and not user.role == 'ADMIN':
                raise UnauthorizedNoteAccess()
                
            return note
        except Note.DoesNotExist:
            raise NoteNotFound()
    
    @staticmethod
    def create_note(user, data):
        """Create a new note"""
        with transaction.atomic():
            # Check if content_type was already converted by the serializer
            if 'content_type' in data:
                # Content type already converted by serializer
                content_type = data.pop('content_type')
                object_id = data.pop('object_id', None)
                
                if not object_id:
                    raise InvalidContentType("Object ID is required")
                
                note = Note.objects.create(
                    content_type=content_type,
                    object_id=object_id,
                    created_by=user,
                    **data
                )
                
                logger.info(f"Note created for {content_type.model} with ID {object_id} by user {user.id}")
                return note
            else:
                # Legacy approach (handle mapping here if serializer didn't do it)
                content_type_model = data.pop('content_type_model', None)
                object_id = data.pop('object_id', None)
                
                if not content_type_model or not object_id:
                    raise InvalidContentType("Content type and object ID are required")
                
                # Map content_type_model aliases to actual model names
                content_type_mapping = {
                    'client': 'user',  # 'client' is actually a User model with role 'CLIENT'
                    'event': 'event',  # Keep this for clarity
                }
                
                # Check if we need to map the content type
                if content_type_model in content_type_mapping:
                    content_type_model = content_type_mapping[content_type_model]
                
                try:
                    content_type = ContentType.objects.get(model=content_type_model.lower())
                except ContentType.DoesNotExist:
                    raise InvalidContentType(f"Content type '{content_type_model}' does not exist")
                
                note = Note.objects.create(
                    content_type=content_type,
                    object_id=object_id,
                    created_by=user,
                    **data
                )
                
                logger.info(f"Note created for {content_type_model} with ID {object_id} by user {user.id}")
                return note
    
    @staticmethod
    def update_note(note_id, user, data):
        """Update an existing note"""
        note = NoteService.get_note_by_id(note_id, user)
        
        # Only admins can update notes
        if user.role != 'ADMIN':
            raise UnauthorizedNoteAccess()
        
        with transaction.atomic():
            for key, value in data.items():
                if key in ['title', 'content']:
                    setattr(note, key, value)
            
            note.save()
            logger.info(f"Note {note_id} updated by user {user.id}")
            return note
    
    @staticmethod
    def delete_note(note_id, user):
        """Delete a note"""
        note = NoteService.get_note_by_id(note_id, user)
        
        # Only admins can delete notes
        if user.role != 'ADMIN':
            raise UnauthorizedNoteAccess()
        
        with transaction.atomic():
            note_id = note.id
            note.delete()
            logger.info(f"Note {note_id} deleted by user {user.id}")
            return True