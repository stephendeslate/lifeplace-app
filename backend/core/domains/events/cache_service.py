"""
Redis caching service for Events domain
Handles caching, invalidation, and performance optimization
"""
import json
import logging
from typing import Any, List, Optional, Dict
from django.core.cache import cache, caches
from django.db.models import QuerySet, Model
from django.core.serializers import serialize
from django.utils.functional import SimpleLazyObject
import hashlib

logger = logging.getLogger(__name__)

# Use the default Redis cache
redis_cache = caches['default']
analytics_cache = caches['analytics']


class EventCacheService:
    """
    Centralized caching service for Events domain
    Handles caching strategies, invalidation, and warming
    """
    
    def __init__(self):
        self.cache = redis_cache
        self.analytics = analytics_cache
    
    # Cache key patterns
    EVENT_DETAIL_KEY = "event:detail:{event_id}"
    EVENT_LIST_KEY = "event:list:{query_hash}"
    EVENT_WORKFLOW_PROGRESS_KEY = "event:workflow_progress:{event_id}"
    EVENT_NEXT_TASK_KEY = "event:next_task:{event_id}"
    EVENT_TYPE_ALL_KEY = "event_type:all:active"
    EVENT_STATS_KEY = "event:stats:{client_id}"
    
    # Cache timeouts (in seconds)
    TIMEOUT_SHORT = 60  # 1 minute for frequently changing data
    TIMEOUT_MEDIUM = 300  # 5 minutes for normal data
    TIMEOUT_LONG = 3600  # 1 hour for rarely changing data
    TIMEOUT_VERY_LONG = 86400  # 24 hours for static data
    
    @classmethod
    def get_event_detail(cls, event_id: int) -> Optional[Dict]:
        """
        Get cached event details or None if not cached
        """
        key = cls.EVENT_DETAIL_KEY.format(event_id=event_id)
        return redis_cache.get(key)
    
    @classmethod
    def set_event_detail(cls, event_id: int, event_data: Dict, timeout: int = None) -> None:
        """
        Cache event details
        """
        key = cls.EVENT_DETAIL_KEY.format(event_id=event_id)
        timeout = timeout or cls.TIMEOUT_MEDIUM
        redis_cache.set(key, event_data, timeout)
        logger.debug(f"Cached event detail for event {event_id}")
    
    @classmethod
    def invalidate_event(cls, event_id: int) -> None:
        """
        Invalidate all caches related to a specific event
        """
        keys_to_delete = [
            cls.EVENT_DETAIL_KEY.format(event_id=event_id),
            cls.EVENT_WORKFLOW_PROGRESS_KEY.format(event_id=event_id),
            cls.EVENT_NEXT_TASK_KEY.format(event_id=event_id),
        ]
        
        # Delete all related keys
        redis_cache.delete_many(keys_to_delete)
        
        # Also invalidate any list caches that might contain this event
        # Using Redis pattern matching (careful with this in production)
        pattern = f"event:list:*"
        cls._invalidate_pattern(pattern)
        
        logger.info(f"Invalidated all caches for event {event_id}")
    
    @classmethod
    def get_workflow_progress(cls, event_id: int) -> Optional[float]:
        """
        Get cached workflow progress
        """
        key = cls.EVENT_WORKFLOW_PROGRESS_KEY.format(event_id=event_id)
        return redis_cache.get(key)
    
    @classmethod
    def set_workflow_progress(cls, event_id: int, progress: float) -> None:
        """
        Cache workflow progress with medium timeout
        """
        key = cls.EVENT_WORKFLOW_PROGRESS_KEY.format(event_id=event_id)
        redis_cache.set(key, progress, cls.TIMEOUT_MEDIUM)
    
    @classmethod
    def get_or_set(cls, key: str, callable_fn, timeout: int = None) -> Any:
        """
        Get from cache or set if not exists (cache-aside pattern)
        """
        value = redis_cache.get(key)
        if value is None:
            value = callable_fn()
            if value is not None:
                redis_cache.set(key, value, timeout or cls.TIMEOUT_MEDIUM)
        return value
    
    @classmethod
    def cache_queryset(cls, queryset: QuerySet, key: str = None, timeout: int = None) -> str:
        """
        Cache a queryset and return the cache key
        Useful for caching filtered lists
        """
        if not key:
            # Generate key from queryset SQL
            query_str = str(queryset.query)
            key = f"queryset:{hashlib.md5(query_str.encode()).hexdigest()}"
        
        # Serialize and cache
        data = list(queryset.values())
        redis_cache.set(key, data, timeout or cls.TIMEOUT_MEDIUM)
        return key
    
    @classmethod
    def get_cached_queryset(cls, key: str) -> Optional[List]:
        """
        Retrieve a cached queryset
        """
        return redis_cache.get(key)
    
    @classmethod
    def cache_event_list(cls, events: QuerySet, filters: Dict) -> None:
        """
        Cache event list with filter hash as key
        """
        # Create unique key from filters
        filter_str = json.dumps(filters, sort_keys=True)
        query_hash = hashlib.md5(filter_str.encode()).hexdigest()[:12]
        key = cls.EVENT_LIST_KEY.format(query_hash=query_hash)
        
        # Cache the event IDs only (lighter weight)
        event_ids = list(events.values_list('id', flat=True))
        redis_cache.set(key, event_ids, cls.TIMEOUT_SHORT)
    
    @classmethod
    def get_cached_event_list(cls, filters: Dict) -> Optional[List[int]]:
        """
        Get cached event list by filters
        """
        filter_str = json.dumps(filters, sort_keys=True)
        query_hash = hashlib.md5(filter_str.encode()).hexdigest()[:12]
        key = cls.EVENT_LIST_KEY.format(query_hash=query_hash)
        return redis_cache.get(key)
    
    @classmethod
    def warm_cache_for_event(cls, event_id: int) -> None:
        """
        Pre-warm cache for an event (useful after updates)
        """
        from .models import Event
        try:
            event = Event.objects.select_related(
                'client', 'event_type', 'workflow_template', 'current_stage'
            ).prefetch_related(
                'tasks', 'event_products', 'timeline', 'files'
            ).get(id=event_id)
            
            # Cache workflow progress
            progress = event.workflow_progress
            cls.set_workflow_progress(event_id, progress)
            
            # Cache next task
            next_task = event.get_next_task()
            if next_task:
                key = cls.EVENT_NEXT_TASK_KEY.format(event_id=event_id)
                redis_cache.set(key, next_task.id, cls.TIMEOUT_SHORT)
            
            logger.info(f"Warmed cache for event {event_id}")
        except Event.DoesNotExist:
            pass
    
    @classmethod
    def cache_event_types(cls, active_only: bool = True) -> None:
        """
        Cache all event types (they rarely change)
        """
        from .models import EventType
        
        queryset = EventType.objects.filter(is_active=True) if active_only else EventType.objects.all()
        event_types = list(queryset.values('id', 'name', 'description'))
        
        key = cls.EVENT_TYPE_ALL_KEY if active_only else "event_type:all"
        redis_cache.set(key, event_types, cls.TIMEOUT_VERY_LONG)
    
    @classmethod
    def get_cached_event_types(cls, active_only: bool = True) -> Optional[List[Dict]]:
        """
        Get cached event types
        """
        key = cls.EVENT_TYPE_ALL_KEY if active_only else "event_type:all"
        return redis_cache.get(key)
    
    @classmethod
    def invalidate_event_types(cls) -> None:
        """
        Invalidate event type cache
        """
        redis_cache.delete_many([cls.EVENT_TYPE_ALL_KEY, "event_type:all"])
    
    @classmethod
    def cache_client_event_stats(cls, client_id: int, stats: Dict) -> None:
        """
        Cache client event statistics
        """
        key = cls.EVENT_STATS_KEY.format(client_id=client_id)
        redis_cache.set(key, stats, cls.TIMEOUT_LONG)
    
    @classmethod
    def get_client_event_stats(cls, client_id: int) -> Optional[Dict]:
        """
        Get cached client event statistics
        """
        key = cls.EVENT_STATS_KEY.format(client_id=client_id)
        return redis_cache.get(key)
    
    @classmethod
    def _invalidate_pattern(cls, pattern: str) -> int:
        """
        Invalidate all keys matching a pattern
        WARNING: Use carefully as this can be slow with many keys
        """
        if hasattr(redis_cache, '_cache'):
            # Access the raw Redis client
            client = redis_cache._cache.get_client()
            keys = client.keys(f"{redis_cache.key_prefix}:{pattern}")
            if keys:
                deleted = client.delete(*keys)
                logger.info(f"Invalidated {deleted} keys matching pattern {pattern}")
                return deleted
        return 0
    
    @classmethod
    def bulk_cache_events(cls, event_ids: List[int]) -> None:
        """
        Cache multiple events at once (batch operation)
        """
        from .models import Event
        
        events = Event.objects.filter(id__in=event_ids).select_related(
            'client', 'event_type', 'workflow_template', 'current_stage'
        )
        
        cache_dict = {}
        for event in events:
            key = cls.EVENT_DETAIL_KEY.format(event_id=event.id)
            cache_dict[key] = {
                'id': event.id,
                'name': event.name,
                'status': event.status,
                'client_name': f"{event.client.first_name} {event.client.last_name}" if event.client else None,
                'event_type_name': event.event_type.name if event.event_type else None,
                'start_date': event.start_date.isoformat() if event.start_date else None,
                'workflow_progress': event.workflow_progress,
            }
        
        # Set many at once (more efficient)
        redis_cache.set_many(cache_dict, cls.TIMEOUT_MEDIUM)
        logger.info(f"Bulk cached {len(cache_dict)} events")


class CacheInvalidator:
    """
    Handles cache invalidation on model changes
    Connect this to Django signals for automatic invalidation
    """
    
    @staticmethod
    def on_event_save(sender, instance, created, **kwargs):
        """
        Invalidate cache when an event is saved
        """
        EventCacheService.invalidate_event(instance.id)
        
        # Warm the cache for frequently accessed events
        if instance.status in ['CONFIRMED', 'LEAD']:
            EventCacheService.warm_cache_for_event(instance.id)
    
    @staticmethod
    def on_event_delete(sender, instance, **kwargs):
        """
        Invalidate cache when an event is deleted
        """
        EventCacheService.invalidate_event(instance.id)
    
    @staticmethod
    def on_event_task_change(sender, instance, created, **kwargs):
        """
        Invalidate event cache when a task changes
        """
        if instance.event_id:
            # Only invalidate the next task cache
            key = EventCacheService.EVENT_NEXT_TASK_KEY.format(event_id=instance.event_id)
            redis_cache.delete(key)
    
    @staticmethod
    def on_event_type_change(sender, instance, created, **kwargs):
        """
        Invalidate event type cache when changed
        """
        EventCacheService.invalidate_event_types()


class RedisAnalyticsBuffer:
    """
    Buffer analytics events in Redis before writing to database
    This prevents analytics from slowing down the main application
    """
    
    BUFFER_KEY = "analytics:buffer:events"
    BUFFER_SIZE = 100  # Flush after 100 events
    BUFFER_TIMEOUT = 60  # Or flush after 60 seconds
    
    @classmethod
    def add_event(cls, event_data: Dict) -> None:
        """
        Add an analytics event to the buffer
        """
        # Add timestamp if not present
        if 'timestamp' not in event_data:
            from django.utils import timezone
            event_data['timestamp'] = timezone.now().isoformat()
        
        # Push to Redis list
        analytics_cache._cache.get_client().rpush(
            cls.BUFFER_KEY,
            json.dumps(event_data)
        )
        
        # Check if we should flush
        buffer_size = analytics_cache._cache.get_client().llen(cls.BUFFER_KEY)
        if buffer_size >= cls.BUFFER_SIZE:
            cls.flush_buffer()
    
    @classmethod
    def flush_buffer(cls) -> int:
        """
        Flush buffered events to database
        """
        from core.domains.analytics.models import AnalyticsEvent
        
        client = analytics_cache._cache.get_client()
        
        # Get all events from buffer
        events_json = client.lrange(cls.BUFFER_KEY, 0, -1)
        if not events_json:
            return 0
        
        # Parse events
        events = []
        for event_json in events_json:
            try:
                event_data = json.loads(event_json)
                events.append(AnalyticsEvent(**event_data))
            except (json.JSONDecodeError, TypeError) as e:
                logger.error(f"Failed to parse analytics event: {e}")
        
        # Bulk create in database
        if events:
            AnalyticsEvent.objects.bulk_create(events, ignore_conflicts=True)
            
            # Clear the buffer
            client.delete(cls.BUFFER_KEY)
            logger.info(f"Flushed {len(events)} analytics events to database")
            
        return len(events)