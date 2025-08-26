"""
Redis-based analytics service for high-performance event tracking
Prevents analytics from slowing down the main application
"""
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from django.core.cache import caches
from django.utils import timezone
from django.db import transaction
import uuid

logger = logging.getLogger(__name__)

# Use analytics cache (Redis database 2)
analytics_cache = caches['analytics']

class RedisAnalyticsService:
    """
    High-performance analytics service using Redis
    Buffers events and processes them asynchronously
    """
    
    # Redis keys
    EVENTS_BUFFER = "analytics:events_buffer"
    METRICS_PREFIX = "analytics:metrics"
    REAL_TIME_STATS = "analytics:realtime"
    USER_SESSIONS = "analytics:user_sessions"
    CONVERSION_FUNNEL = "analytics:conversion_funnel"
    
    # Buffer settings
    BUFFER_SIZE = 100  # Flush after 100 events
    BUFFER_TIMEOUT = 60  # Or flush after 60 seconds
    METRICS_TTL = 3600  # Metrics cache for 1 hour
    REALTIME_TTL = 300  # Real-time stats for 5 minutes
    
    @classmethod
    def track_event(cls, event_type: str, properties: Dict = None, 
                   user_id: int = None, session_id: str = None,
                   metadata: Dict = None) -> str:
        """
        Track an analytics event with Redis buffering
        Returns event_id for correlation
        """
        event_id = str(uuid.uuid4())
        
        event_data = {
            'event_id': event_id,
            'event_type': event_type,
            'properties': properties or {},
            'user_id': user_id,
            'session_id': session_id,
            'metadata': metadata or {},
            'timestamp': timezone.now().isoformat(),
            'date': timezone.now().strftime('%Y-%m-%d'),
            'hour': timezone.now().strftime('%Y-%m-%d-%H'),
        }
        
        # Add to buffer
        analytics_cache._cache.get_client().lpush(
            cls.EVENTS_BUFFER,
            json.dumps(event_data)
        )
        
        # Update real-time metrics immediately
        cls._update_realtime_metrics(event_type, properties)
        
        # Check if we should flush
        buffer_size = analytics_cache._cache.get_client().llen(cls.EVENTS_BUFFER)
        if buffer_size >= cls.BUFFER_SIZE:
            cls.flush_events_buffer()
        
        logger.debug(f"Tracked event {event_type} with ID {event_id}")
        return event_id
    
    @classmethod
    def track_page_view(cls, path: str, user_id: int = None, 
                       session_id: str = None, referrer: str = None) -> str:
        """
        Track a page view event
        """
        return cls.track_event(
            'page_view',
            properties={
                'path': path,
                'referrer': referrer,
            },
            user_id=user_id,
            session_id=session_id
        )
    
    @classmethod
    def track_user_action(cls, action: str, user_id: int, 
                         target: str = None, properties: Dict = None) -> str:
        """
        Track a user action (click, submit, etc.)
        """
        return cls.track_event(
            'user_action',
            properties={
                'action': action,
                'target': target,
                **(properties or {})
            },
            user_id=user_id
        )
    
    @classmethod
    def track_booking_flow_event(cls, session_id: str, step: str, 
                                action: str, user_id: int = None,
                                properties: Dict = None) -> str:
        """
        Track booking flow specific events
        """
        return cls.track_event(
            'booking_flow',
            properties={
                'step': step,
                'action': action,
                **(properties or {})
            },
            user_id=user_id,
            session_id=session_id
        )
    
    @classmethod
    def track_conversion_event(cls, funnel_name: str, step: str,
                              user_id: int = None, session_id: str = None,
                              value: float = None) -> str:
        """
        Track conversion funnel events
        """
        event_id = cls.track_event(
            'conversion',
            properties={
                'funnel': funnel_name,
                'step': step,
                'value': value,
            },
            user_id=user_id,
            session_id=session_id
        )
        
        # Update conversion funnel metrics
        cls._update_conversion_funnel(funnel_name, step, session_id)
        
        return event_id
    
    @classmethod
    def get_realtime_stats(cls, metric_name: str = None) -> Dict:
        """
        Get real-time analytics statistics
        """
        if metric_name:
            key = f"{cls.REAL_TIME_STATS}:{metric_name}"
            return analytics_cache.get(key, {})
        
        # Get all real-time stats
        stats = {}
        client = analytics_cache._cache.get_client()
        pattern = f"{analytics_cache.key_prefix}:{cls.REAL_TIME_STATS}:*"
        
        for key in client.scan_iter(match=pattern, count=50):
            metric_name = key.decode().split(':')[-1]
            stats[metric_name] = analytics_cache.get(f"{cls.REAL_TIME_STATS}:{metric_name}", {})
        
        return stats
    
    @classmethod
    def get_metrics_for_period(cls, metric_name: str, start_date: str, 
                              end_date: str = None) -> Dict:
        """
        Get cached metrics for a time period
        """
        if not end_date:
            end_date = start_date
        
        metrics = {}
        current_date = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        
        while current_date <= end:
            date_str = current_date.strftime('%Y-%m-%d')
            key = f"{cls.METRICS_PREFIX}:{metric_name}:{date_str}"
            metrics[date_str] = analytics_cache.get(key, {})
            current_date += timedelta(days=1)
        
        return metrics
    
    @classmethod
    def calculate_conversion_rate(cls, funnel_name: str, 
                                 start_step: str, end_step: str,
                                 date: str = None) -> float:
        """
        Calculate conversion rate between two funnel steps
        """
        if not date:
            date = timezone.now().strftime('%Y-%m-%d')
        
        funnel_key = f"{cls.CONVERSION_FUNNEL}:{funnel_name}:{date}"
        funnel_data = analytics_cache.get(funnel_key, {})
        
        start_count = funnel_data.get(start_step, 0)
        end_count = funnel_data.get(end_step, 0)
        
        if start_count == 0:
            return 0.0
        
        return (end_count / start_count) * 100
    
    @classmethod
    def get_user_journey(cls, user_id: int, session_id: str = None,
                        days_back: int = 7) -> List[Dict]:
        """
        Get user's journey/events from cache
        This is expensive, use sparingly
        """
        # In a real implementation, you'd store user journeys in a more structured way
        # For now, we'll simulate by getting recent events from buffer
        journey = []
        
        # This is a simplified implementation
        # In production, you'd maintain separate user journey caches
        events_data = cls._get_recent_events_for_user(user_id, days_back)
        
        for event in events_data:
            if (not session_id or event.get('session_id') == session_id):
                journey.append({
                    'timestamp': event['timestamp'],
                    'event_type': event['event_type'],
                    'properties': event['properties'],
                    'session_id': event.get('session_id'),
                })
        
        return sorted(journey, key=lambda x: x['timestamp'])
    
    @classmethod
    def flush_events_buffer(cls) -> int:
        """
        Flush buffered events to database and update metrics
        Returns number of events processed
        """
        client = analytics_cache._cache.get_client()
        
        # Get all events from buffer (atomic operation)
        pipe = client.pipeline()
        pipe.lrange(cls.EVENTS_BUFFER, 0, -1)
        pipe.delete(cls.EVENTS_BUFFER)
        events_json, _ = pipe.execute()
        
        if not events_json:
            return 0
        
        # Parse and validate events
        valid_events = []
        for event_json in events_json:
            try:
                event_data = json.loads(event_json)
                valid_events.append(event_data)
            except (json.JSONDecodeError, TypeError) as e:
                logger.error(f"Failed to parse analytics event: {e}")
        
        if not valid_events:
            return 0
        
        # Process events
        cls._process_events_batch(valid_events)
        
        logger.info(f"Flushed {len(valid_events)} analytics events")
        return len(valid_events)
    
    @classmethod
    def warm_metrics_cache(cls, date: str = None) -> None:
        """
        Pre-calculate and cache metrics for faster dashboard loading
        """
        if not date:
            date = timezone.now().strftime('%Y-%m-%d')
        
        # Calculate daily metrics
        metrics = cls._calculate_daily_metrics(date)
        
        # Cache each metric type
        for metric_name, metric_data in metrics.items():
            key = f"{cls.METRICS_PREFIX}:{metric_name}:{date}"
            analytics_cache.set(key, metric_data, cls.METRICS_TTL)
        
        logger.info(f"Warmed metrics cache for {date}")
    
    @classmethod
    def _update_realtime_metrics(cls, event_type: str, properties: Dict):
        """
        Update real-time metrics immediately when event is tracked
        """
        now = timezone.now()
        minute_key = now.strftime('%Y-%m-%d-%H-%M')
        
        # Update general real-time stats
        realtime_key = f"{cls.REAL_TIME_STATS}:general"
        stats = analytics_cache.get(realtime_key, {
            'events_per_minute': {},
            'active_users': set(),
            'popular_pages': {},
            'conversion_events': 0,
        })
        
        # Events per minute
        if minute_key not in stats['events_per_minute']:
            stats['events_per_minute'][minute_key] = 0
        stats['events_per_minute'][minute_key] += 1
        
        # Keep only last 60 minutes
        cutoff = (now - timedelta(hours=1)).strftime('%Y-%m-%d-%H-%M')
        stats['events_per_minute'] = {
            k: v for k, v in stats['events_per_minute'].items() 
            if k >= cutoff
        }
        
        # Update event-specific metrics
        if event_type == 'page_view' and properties.get('path'):
            path = properties['path']
            if path not in stats['popular_pages']:
                stats['popular_pages'][path] = 0
            stats['popular_pages'][path] += 1
        
        elif event_type == 'conversion':
            stats['conversion_events'] += 1
        
        # Convert sets to lists for JSON serialization
        stats['active_users'] = list(stats['active_users'])
        
        analytics_cache.set(realtime_key, stats, cls.REALTIME_TTL)
    
    @classmethod
    def _update_conversion_funnel(cls, funnel_name: str, step: str, session_id: str):
        """
        Update conversion funnel metrics
        """
        date = timezone.now().strftime('%Y-%m-%d')
        funnel_key = f"{cls.CONVERSION_FUNNEL}:{funnel_name}:{date}"
        
        funnel_data = analytics_cache.get(funnel_key, {})
        
        if step not in funnel_data:
            funnel_data[step] = 0
        funnel_data[step] += 1
        
        analytics_cache.set(funnel_key, funnel_data, 86400)  # 24 hours
    
    @classmethod
    def _process_events_batch(cls, events: List[Dict]) -> None:
        """
        Process a batch of events - save to database and update metrics
        """
        from .models import AnalyticsEvent
        
        try:
            # Prepare for bulk insert
            analytics_events = []
            for event_data in events:
                analytics_events.append(AnalyticsEvent(
                    event_id=event_data.get('event_id'),
                    event_type=event_data.get('event_type'),
                    properties=event_data.get('properties', {}),
                    user_id=event_data.get('user_id'),
                    session_id=event_data.get('session_id'),
                    metadata=event_data.get('metadata', {}),
                    timestamp=timezone.datetime.fromisoformat(event_data.get('timestamp')),
                ))
            
            # Bulk insert
            with transaction.atomic():
                AnalyticsEvent.objects.bulk_create(analytics_events, ignore_conflicts=True)
            
            # Update aggregated metrics
            cls._update_aggregated_metrics(events)
            
        except Exception as e:
            logger.error(f"Failed to process events batch: {e}")
    
    @classmethod
    def _update_aggregated_metrics(cls, events: List[Dict]) -> None:
        """
        Update aggregated metrics from processed events
        """
        # Group events by date for efficient processing
        events_by_date = {}
        for event in events:
            date = event.get('date', timezone.now().strftime('%Y-%m-%d'))
            if date not in events_by_date:
                events_by_date[date] = []
            events_by_date[date].append(event)
        
        # Update metrics for each date
        for date, date_events in events_by_date.items():
            metrics = cls._calculate_metrics_for_events(date_events, date)
            
            # Cache the updated metrics
            for metric_name, metric_data in metrics.items():
                key = f"{cls.METRICS_PREFIX}:{metric_name}:{date}"
                
                # Merge with existing metrics
                existing_metrics = analytics_cache.get(key, {})
                merged_metrics = cls._merge_metrics(existing_metrics, metric_data)
                
                analytics_cache.set(key, merged_metrics, cls.METRICS_TTL)
    
    @classmethod
    def _calculate_metrics_for_events(cls, events: List[Dict], date: str) -> Dict:
        """
        Calculate various metrics from a list of events
        """
        metrics = {
            'page_views': {'total': 0, 'unique': set(), 'popular_pages': {}},
            'user_actions': {'total': 0, 'by_action': {}},
            'booking_flow': {'sessions': set(), 'conversions': 0, 'drop_offs': {}},
            'conversions': {'total': 0, 'by_funnel': {}},
        }
        
        for event in events:
            event_type = event.get('event_type')
            properties = event.get('properties', {})
            user_id = event.get('user_id')
            
            if event_type == 'page_view':
                metrics['page_views']['total'] += 1
                if user_id:
                    metrics['page_views']['unique'].add(user_id)
                
                path = properties.get('path')
                if path:
                    if path not in metrics['page_views']['popular_pages']:
                        metrics['page_views']['popular_pages'][path] = 0
                    metrics['page_views']['popular_pages'][path] += 1
            
            elif event_type == 'user_action':
                metrics['user_actions']['total'] += 1
                action = properties.get('action')
                if action:
                    if action not in metrics['user_actions']['by_action']:
                        metrics['user_actions']['by_action'][action] = 0
                    metrics['user_actions']['by_action'][action] += 1
            
            elif event_type == 'booking_flow':
                session_id = event.get('session_id')
                if session_id:
                    metrics['booking_flow']['sessions'].add(session_id)
                
                action = properties.get('action')
                if action == 'completed':
                    metrics['booking_flow']['conversions'] += 1
                elif action == 'abandoned':
                    step = properties.get('step')
                    if step:
                        if step not in metrics['booking_flow']['drop_offs']:
                            metrics['booking_flow']['drop_offs'][step] = 0
                        metrics['booking_flow']['drop_offs'][step] += 1
            
            elif event_type == 'conversion':
                metrics['conversions']['total'] += 1
                funnel = properties.get('funnel')
                if funnel:
                    if funnel not in metrics['conversions']['by_funnel']:
                        metrics['conversions']['by_funnel'][funnel] = 0
                    metrics['conversions']['by_funnel'][funnel] += 1
        
        # Convert sets to counts for JSON serialization
        metrics['page_views']['unique'] = len(metrics['page_views']['unique'])
        metrics['booking_flow']['sessions'] = len(metrics['booking_flow']['sessions'])
        
        return metrics
    
    @classmethod
    def _merge_metrics(cls, existing: Dict, new: Dict) -> Dict:
        """
        Merge two metrics dictionaries
        """
        if not existing:
            return new
        
        merged = existing.copy()
        
        for key, value in new.items():
            if key not in merged:
                merged[key] = value
            elif isinstance(value, dict):
                merged[key] = cls._merge_metrics(merged[key], value)
            elif isinstance(value, (int, float)):
                merged[key] += value
            else:
                merged[key] = value
        
        return merged
    
    @classmethod
    def _get_recent_events_for_user(cls, user_id: int, days_back: int) -> List[Dict]:
        """
        Get recent events for a user (simplified implementation)
        """
        # This is a placeholder - in production you'd query the database
        # or maintain user-specific event caches
        return []
    
    @classmethod
    def _calculate_daily_metrics(cls, date: str) -> Dict:
        """
        Calculate comprehensive daily metrics from database
        """
        from .models import AnalyticsEvent
        from django.db.models import Count, Q
        
        # Query events for the date
        events = AnalyticsEvent.objects.filter(
            timestamp__date=date
        )
        
        metrics = {
            'overview': {
                'total_events': events.count(),
                'unique_users': events.values('user_id').distinct().count(),
                'unique_sessions': events.values('session_id').distinct().count(),
            },
            'page_views': events.filter(event_type='page_view').aggregate(
                total=Count('id'),
                unique_users=Count('user_id', distinct=True)
            ),
            'conversions': events.filter(event_type='conversion').aggregate(
                total=Count('id'),
                unique_users=Count('user_id', distinct=True)
            ),
        }
        
        return metrics