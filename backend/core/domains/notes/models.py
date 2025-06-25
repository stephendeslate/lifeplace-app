# core/domains/notes/models.py
from core.utils.models import BaseModel
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class Note(BaseModel):
    """Polymorphic note model that can be attached to any object"""
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    created_by = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_notes'
    )
    
    # Generic relationship
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]

    def __str__(self):
        return f"Note: {self.title or self.content[:50]}"