# backend/core/utils/models.py
from django.db import models
from django.utils import timezone


class BaseModel(models.Model):
    """Base model with timestamp fields for all models to inherit"""
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        return super(BaseModel, self).save(*args, **kwargs)