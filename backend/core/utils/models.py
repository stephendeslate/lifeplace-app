# backend/core/utils/models.py
from django.db import models


class BaseModel(models.Model):
    """Base model with automatic timestamp fields for all models to inherit"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True