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
    
    # Also invalidate availability cache when event changes
    _invalidate_availability_cache_for_event(instance)

@receiver(post_delete, sender=Event)
def invalidate_event_cache_on_delete(sender, instance, **kwargs):
    """Invalidate event cache when deleted"""
    CacheInvalidator.on_event_delete(sender, instance, **kwargs)
    
    # Also invalidate availability cache when event is deleted
    _invalidate_availability_cache_for_event(instance)

def _invalidate_availability_cache_for_event(event):
    """Invalidate availability cache for dates affected by this event"""
    try:
        from .services.availability_service import availability_service
        
        # Calculate date range to invalidate
        start_date = event.start_date.date() if event.start_date else None
        end_date = event.end_date.date() if event.end_date else start_date
        
        if start_date:
            # Extend range by buffer days to catch potential conflicts
            from datetime import timedelta
            buffer_start = start_date - timedelta(days=1)
            buffer_end = (end_date or start_date) + timedelta(days=1)
            
            availability_service.invalidate_cache((buffer_start, buffer_end))
    except Exception:
        # Don't let cache invalidation break event operations
        pass

@receiver(post_save, sender=EventTask)
def invalidate_task_cache_on_save(sender, instance, created, **kwargs):
    """Invalidate task-related cache when task changes"""
    CacheInvalidator.on_event_task_change(sender, instance, created, **kwargs)

@receiver(post_save, sender=EventType)
def invalidate_event_type_cache_on_save(sender, instance, created, **kwargs):
    """Invalidate event type cache when saved"""
    CacheInvalidator.on_event_type_change(sender, instance, created, **kwargs)

@receiver(post_delete, sender=EventType)
def invalidate_event_type_cache_on_delete(sender, instance, **kwargs):
    """Invalidate event type cache when deleted"""
    CacheInvalidator.on_event_type_change(sender, instance, False, **kwargs)