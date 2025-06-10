# backend/core/domains/clients/models.py
from core.utils.models import BaseModel
from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone

User = get_user_model()


class ClientInvitation(BaseModel):
    """Invitations for clients to create accounts"""
    id = models.UUIDField(primary_key=True, default=None, editable=False)
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invitations')
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='sent_client_invitations')
    is_accepted = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    
    def __str__(self):
        return f"Invitation for {self.client.email}"
    
    def is_expired(self):
        """Check if the invitation has expired"""
        return timezone.now() > self.expires_at
    
    def save(self, *args, **kwargs):
        # Generate UUID if not provided
        if not self.id:
            self.id = models.UUIDField().get_default()
        super().save(*args, **kwargs)