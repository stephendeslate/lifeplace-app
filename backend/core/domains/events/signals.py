# backend/core/domains/events/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Event, EventTask, EventType
from .cache_service import CacheInvalidator

# Connect cache invalidation signals
@receiver(post_save, sender=Event)
def invalidate_event_cache_on_save(sender, instance, created, **kwargs):
    """Invalidate event cache when saved"""
    CacheInvalidator.on_event_save(sender, instance, created, **kwargs)

@receiver(post_delete, sender=Event)
def invalidate_event_cache_on_delete(sender, instance, **kwargs):
    """Invalidate event cache when deleted"""
    CacheInvalidator.on_event_delete(sender, instance, **kwargs)

@receiver(post_save, sender=EventTask)
def invalidate_task_cache_on_save(sender, instance, created, **kwargs):
    """Invalidate task-related cache when task changes"""
    CacheInvalidator.on_event_task_change(sender, instance, created, **kwargs)

@receiver([post_save, post_delete], sender=EventType)
def invalidate_event_type_cache(sender, instance, **kwargs):
    """Invalidate event type cache when changed"""
    CacheInvalidator.on_event_type_change(sender, instance, None, **kwargs)