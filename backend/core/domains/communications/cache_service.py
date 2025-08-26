"""
Redis caching service for Communications domain
Handles communication templates, records, analytics, and rendered content
"""
import json
import logging
import hashlib
from typing import Any, List, Optional, Dict, Union
from django.core.cache import caches
from django.db.models import QuerySet
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Use the default Redis cache and analytics cache
redis_cache = caches['default']
analytics_cache = caches['analytics']


class CommunicationsCacheService:
    """
    Centralized caching service for Communications domain
    Handles templates, records, analytics, and rendered content
    """
    
    def __init__(self):
        self.cache = redis_cache
        self.analytics = analytics_cache
    
    # Cache key patterns
    TEMPLATE_LIST_KEY = "communications:templates:list:{query_hash}"
    TEMPLATE_DETAIL_KEY = "communications:template:detail:{template_id}"
    TEMPLATE_BY_NAME_KEY = "communications:template:by_name:{template_name}"
    TEMPLATE_PREVIEW_KEY = "communications:template:preview:{template_id}:{context_hash}"
    TEMPLATE_SCHEMAS_KEY = "communications:templates:variable_schemas"
    TEMPLATE_BY_CHANNEL_KEY = "communications:templates:by_channel:{channel}"
    TEMPLATE_BY_CATEGORY_KEY = "communications:templates:by_category:{category}"
    
    RECORD_LIST_KEY = "communications:records:list:{query_hash}"
    RECORD_DETAIL_KEY = "communications:record:detail:{record_id}"
    RECORD_BY_CLIENT_KEY = "communications:records:by_client:{client_id}"
    RECORD_BY_TEMPLATE_KEY = "communications:records:by_template:{template_name}"
    
    ANALYTICS_TEMPLATE_STATS_KEY = "communications:analytics:template:{template_name}:{days}"
    ANALYTICS_CLIENT_STATS_KEY = "communications:analytics:client:{client_id}:{days}"
    ANALYTICS_GLOBAL_STATS_KEY = "communications:analytics:global:{days}"
    ANALYTICS_CHANNEL_STATS_KEY = "communications:analytics:channel:{channel}:{days}"
    
    RENDERED_CONTENT_KEY = "communications:rendered:{template_id}:{context_hash}"
    
    # Cache timeout configurations (in seconds)
    TIMEOUT_SHORT = 300      # 5 minutes - frequently changing data (records, analytics)
    TIMEOUT_MEDIUM = 1800    # 30 minutes - moderate changes (templates)
    TIMEOUT_LONG = 3600      # 1 hour - stable data (schemas, rendered content)
    TIMEOUT_VERY_LONG = 14400  # 4 hours - very stable data (variable schemas)
    
    # === TEMPLATE CACHING ===
    
    def cache_template_list(self, templates_data: List[Dict], 
                           query_params: Dict = None) -> str:
        """Cache template list with query parameters"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.TEMPLATE_LIST_KEY.format(query_hash=query_hash)
        self.cache.set(key, templates_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached template list: {key}")
        return key
    
    def get_cached_template_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached template list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.TEMPLATE_LIST_KEY.format(query_hash=query_hash)
        return self.cache.get(key)
    
    def cache_template_detail(self, template_id: int, template_data: Dict) -> str:
        """Cache individual template detail"""
        key = self.TEMPLATE_DETAIL_KEY.format(template_id=template_id)
        self.cache.set(key, template_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached template detail: {key}")
        return key
    
    def get_cached_template_detail(self, template_id: int) -> Optional[Dict]:
        """Get cached template detail"""
        key = self.TEMPLATE_DETAIL_KEY.format(template_id=template_id)
        return self.cache.get(key)
    
    def cache_template_by_name(self, template_name: str, template_data: Dict) -> str:
        """Cache template lookup by name"""
        key = self.TEMPLATE_BY_NAME_KEY.format(template_name=template_name)
        self.cache.set(key, template_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached template by name: {key}")
        return key
    
    def get_cached_template_by_name(self, template_name: str) -> Optional[Dict]:
        """Get cached template by name"""
        key = self.TEMPLATE_BY_NAME_KEY.format(template_name=template_name)
        return self.cache.get(key)
    
    def cache_template_preview(self, template_id: int, context_data: Dict, 
                              preview_data: Dict) -> str:
        """Cache template preview result"""
        context_hash = self._generate_query_hash(context_data)
        key = self.TEMPLATE_PREVIEW_KEY.format(
            template_id=template_id, 
            context_hash=context_hash
        )
        self.cache.set(key, preview_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached template preview: {key}")
        return key
    
    def get_cached_template_preview(self, template_id: int, context_data: Dict) -> Optional[Dict]:
        """Get cached template preview"""
        context_hash = self._generate_query_hash(context_data)
        key = self.TEMPLATE_PREVIEW_KEY.format(
            template_id=template_id, 
            context_hash=context_hash
        )
        return self.cache.get(key)
    
    def cache_variable_schemas(self, schemas_data: Dict) -> str:
        """Cache variable schemas for templates"""
        key = self.TEMPLATE_SCHEMAS_KEY
        self.cache.set(key, schemas_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached variable schemas: {key}")
        return key
    
    def get_cached_variable_schemas(self) -> Optional[Dict]:
        """Get cached variable schemas"""
        return self.cache.get(self.TEMPLATE_SCHEMAS_KEY)
    
    def cache_templates_by_channel(self, channel: str, templates_data: List[Dict]) -> str:
        """Cache templates filtered by channel"""
        key = self.TEMPLATE_BY_CHANNEL_KEY.format(channel=channel)
        self.cache.set(key, templates_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached templates by channel: {key}")
        return key
    
    def get_cached_templates_by_channel(self, channel: str) -> Optional[List[Dict]]:
        """Get cached templates by channel"""
        key = self.TEMPLATE_BY_CHANNEL_KEY.format(channel=channel)
        return self.cache.get(key)
    
    def cache_templates_by_category(self, category: str, templates_data: List[Dict]) -> str:
        """Cache templates filtered by category"""
        key = self.TEMPLATE_BY_CATEGORY_KEY.format(category=category)
        self.cache.set(key, templates_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached templates by category: {key}")
        return key
    
    def get_cached_templates_by_category(self, category: str) -> Optional[List[Dict]]:
        """Get cached templates by category"""
        key = self.TEMPLATE_BY_CATEGORY_KEY.format(category=category)
        return self.cache.get(key)
    
    # === RECORD CACHING ===
    
    def cache_record_list(self, records_data: List[Dict], 
                         query_params: Dict = None) -> str:
        """Cache communication records list with query parameters"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.RECORD_LIST_KEY.format(query_hash=query_hash)
        self.cache.set(key, records_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached record list: {key}")
        return key
    
    def get_cached_record_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached communication records list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.RECORD_LIST_KEY.format(query_hash=query_hash)
        return self.cache.get(key)
    
    def cache_record_detail(self, record_id: str, record_data: Dict) -> str:
        """Cache individual communication record detail"""
        key = self.RECORD_DETAIL_KEY.format(record_id=record_id)
        self.cache.set(key, record_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached record detail: {key}")
        return key
    
    def get_cached_record_detail(self, record_id: str) -> Optional[Dict]:
        """Get cached communication record detail"""
        key = self.RECORD_DETAIL_KEY.format(record_id=record_id)
        return self.cache.get(key)
    
    def cache_records_by_client(self, client_id: int, records_data: List[Dict]) -> str:
        """Cache communication records for a specific client"""
        key = self.RECORD_BY_CLIENT_KEY.format(client_id=client_id)
        self.cache.set(key, records_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached records by client: {key}")
        return key
    
    def get_cached_records_by_client(self, client_id: int) -> Optional[List[Dict]]:
        """Get cached communication records by client"""
        key = self.RECORD_BY_CLIENT_KEY.format(client_id=client_id)
        return self.cache.get(key)
    
    def cache_records_by_template(self, template_name: str, records_data: List[Dict]) -> str:
        """Cache communication records for a specific template"""
        key = self.RECORD_BY_TEMPLATE_KEY.format(template_name=template_name)
        self.cache.set(key, records_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached records by template: {key}")
        return key
    
    def get_cached_records_by_template(self, template_name: str) -> Optional[List[Dict]]:
        """Get cached communication records by template"""
        key = self.RECORD_BY_TEMPLATE_KEY.format(template_name=template_name)
        return self.cache.get(key)
    
    # === ANALYTICS CACHING ===
    
    def cache_template_analytics(self, template_name: str, days: int, 
                                analytics_data: Dict) -> str:
        """Cache template analytics statistics"""
        key = self.ANALYTICS_TEMPLATE_STATS_KEY.format(
            template_name=template_name, days=days
        )
        self.analytics.set(key, analytics_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached template analytics: {key}")
        return key
    
    def get_cached_template_analytics(self, template_name: str, days: int) -> Optional[Dict]:
        """Get cached template analytics"""
        key = self.ANALYTICS_TEMPLATE_STATS_KEY.format(
            template_name=template_name, days=days
        )
        return self.analytics.get(key)
    
    def cache_client_analytics(self, client_id: int, days: int, 
                              analytics_data: Dict) -> str:
        """Cache client-specific communication analytics"""
        key = self.ANALYTICS_CLIENT_STATS_KEY.format(
            client_id=client_id, days=days
        )
        self.analytics.set(key, analytics_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached client analytics: {key}")
        return key
    
    def get_cached_client_analytics(self, client_id: int, days: int) -> Optional[Dict]:
        """Get cached client analytics"""
        key = self.ANALYTICS_CLIENT_STATS_KEY.format(
            client_id=client_id, days=days
        )
        return self.analytics.get(key)
    
    def cache_global_analytics(self, days: int, analytics_data: Dict) -> str:
        """Cache global communication analytics"""
        key = self.ANALYTICS_GLOBAL_STATS_KEY.format(days=days)
        self.analytics.set(key, analytics_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached global analytics: {key}")
        return key
    
    def get_cached_global_analytics(self, days: int) -> Optional[Dict]:
        """Get cached global analytics"""
        key = self.ANALYTICS_GLOBAL_STATS_KEY.format(days=days)
        return self.analytics.get(key)
    
    def cache_channel_analytics(self, channel: str, days: int, 
                               analytics_data: Dict) -> str:
        """Cache channel-specific communication analytics"""
        key = self.ANALYTICS_CHANNEL_STATS_KEY.format(
            channel=channel, days=days
        )
        self.analytics.set(key, analytics_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached channel analytics: {key}")
        return key
    
    def get_cached_channel_analytics(self, channel: str, days: int) -> Optional[Dict]:
        """Get cached channel analytics"""
        key = self.ANALYTICS_CHANNEL_STATS_KEY.format(
            channel=channel, days=days
        )
        return self.analytics.get(key)
    
    # === RENDERED CONTENT CACHING ===
    
    def cache_rendered_content(self, template_id: int, context_data: Dict, 
                              rendered_content: Dict) -> str:
        """Cache rendered template content (subject and body)"""
        context_hash = self._generate_query_hash(context_data)
        key = self.RENDERED_CONTENT_KEY.format(
            template_id=template_id, 
            context_hash=context_hash
        )
        self.cache.set(key, rendered_content, self.TIMEOUT_LONG)
        logger.debug(f"Cached rendered content: {key}")
        return key
    
    def get_cached_rendered_content(self, template_id: int, context_data: Dict) -> Optional[Dict]:
        """Get cached rendered template content"""
        context_hash = self._generate_query_hash(context_data)
        key = self.RENDERED_CONTENT_KEY.format(
            template_id=template_id, 
            context_hash=context_hash
        )
        return self.cache.get(key)
    
    # === CACHE INVALIDATION ===
    
    def invalidate_template_caches(self, template_id: int = None, template_name: str = None):
        """Invalidate template-related caches"""
        patterns_to_invalidate = [
            f"communications:templates:list:*",
            f"communications:templates:by_channel:*",
            f"communications:templates:by_category:*",
            f"communications:template:preview:*",
            f"communications:rendered:*"
        ]
        
        if template_id:
            patterns_to_invalidate.extend([
                self.TEMPLATE_DETAIL_KEY.format(template_id=template_id),
                f"communications:template:preview:{template_id}:*",
                f"communications:rendered:{template_id}:*"
            ])
        
        if template_name:
            patterns_to_invalidate.extend([
                self.TEMPLATE_BY_NAME_KEY.format(template_name=template_name),
                self.RECORD_BY_TEMPLATE_KEY.format(template_name=template_name),
                f"communications:analytics:template:{template_name}:*"
            ])
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated template caches for template_id: {template_id}, name: {template_name}")
    
    def invalidate_record_caches(self, record_id: str = None, client_id: int = None, 
                                template_name: str = None):
        """Invalidate communication record-related caches"""
        patterns_to_invalidate = [
            f"communications:records:list:*",
            f"communications:analytics:*"  # Records affect analytics
        ]
        
        if record_id:
            patterns_to_invalidate.append(
                self.RECORD_DETAIL_KEY.format(record_id=record_id)
            )
        
        if client_id:
            patterns_to_invalidate.extend([
                self.RECORD_BY_CLIENT_KEY.format(client_id=client_id),
                f"communications:analytics:client:{client_id}:*"
            ])
        
        if template_name:
            patterns_to_invalidate.extend([
                self.RECORD_BY_TEMPLATE_KEY.format(template_name=template_name),
                f"communications:analytics:template:{template_name}:*"
            ])
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated record caches for record_id: {record_id}, client_id: {client_id}")
    
    def invalidate_analytics_caches(self, template_name: str = None, client_id: int = None):
        """Invalidate analytics-related caches"""
        patterns_to_invalidate = [
            f"communications:analytics:global:*",
            f"communications:analytics:channel:*"
        ]
        
        if template_name:
            patterns_to_invalidate.append(
                f"communications:analytics:template:{template_name}:*"
            )
        
        if client_id:
            patterns_to_invalidate.append(
                f"communications:analytics:client:{client_id}:*"
            )
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated analytics caches for template: {template_name}, client: {client_id}")
    
    def invalidate_all_communication_caches(self):
        """Invalidate all communication-related caches"""
        patterns_to_invalidate = [f"communications:*"]
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info("Invalidated all communication domain caches")
    
    # === UTILITY METHODS ===
    
    def _generate_query_hash(self, query_params: Dict) -> str:
        """Generate hash for query parameters"""
        # Sort parameters for consistent hashing
        sorted_params = sorted(query_params.items())
        query_string = json.dumps(sorted_params, sort_keys=True, default=str)
        return hashlib.md5(query_string.encode()).hexdigest()[:8]
    
    def _invalidate_cache_patterns(self, patterns: List[str]):
        """Invalidate cache keys matching patterns"""
        for pattern in patterns:
            if '*' in pattern:
                # For pattern matching, we'd need to use Redis SCAN
                try:
                    keys = self.cache.keys(pattern)
                    if keys:
                        self.cache.delete_many(keys)
                        logger.debug(f"Invalidated {len(keys)} keys matching {pattern}")
                    
                    # Also check analytics cache for analytics patterns
                    if 'analytics' in pattern:
                        analytics_keys = self.analytics.keys(pattern)
                        if analytics_keys:
                            self.analytics.delete_many(analytics_keys)
                            logger.debug(f"Invalidated {len(analytics_keys)} analytics keys matching {pattern}")
                            
                except Exception as e:
                    logger.warning(f"Could not invalidate pattern {pattern}: {e}")
            else:
                # Direct key deletion
                self.cache.delete(pattern)
                if 'analytics' in pattern:
                    self.analytics.delete(pattern)
                logger.debug(f"Invalidated cache key: {pattern}")
    
    def cache_queryset(self, queryset: QuerySet, cache_key: str, 
                      timeout: int = None) -> List[Dict]:
        """
        Cache a Django queryset as JSON data
        Returns the cached data as a list of dictionaries
        """
        if timeout is None:
            timeout = self.TIMEOUT_MEDIUM
            
        # Serialize queryset to JSON
        cached_data = []
        for obj in queryset:
            if hasattr(obj, 'to_dict'):
                cached_data.append(obj.to_dict())
            else:
                # Fallback to model_to_dict
                from django.forms.models import model_to_dict
                item_dict = model_to_dict(obj)
                # Convert UUID and datetime fields for JSON serialization
                for key, value in item_dict.items():
                    if hasattr(value, 'isoformat'):  # datetime objects
                        item_dict[key] = value.isoformat()
                    elif hasattr(value, 'hex'):  # UUID objects
                        item_dict[key] = str(value)
                cached_data.append(item_dict)
        
        self.cache.set(cache_key, cached_data, timeout)
        logger.debug(f"Cached queryset with {len(cached_data)} items: {cache_key}")
        return cached_data
    
    def get_or_set(self, key: str, callable_func, timeout: int = None, 
                   use_analytics_cache: bool = False) -> Any:
        """
        Get from cache or set if not exists (cache-aside pattern)
        """
        if timeout is None:
            timeout = self.TIMEOUT_MEDIUM
            
        cache_backend = self.analytics if use_analytics_cache else self.cache
        
        data = cache_backend.get(key)
        if data is None:
            data = callable_func()
            cache_backend.set(key, data, timeout)
            logger.debug(f"Set cache key: {key}")
        else:
            logger.debug(f"Cache hit for key: {key}")
        
        return data
    
    def warm_cache_for_templates(self, template_ids: List[int] = None):
        """
        Warm cache for frequently accessed templates
        """
        from .models import CommunicationTemplate
        from .serializers import CommunicationTemplateSerializer
        
        if template_ids:
            templates = CommunicationTemplate.objects.filter(id__in=template_ids)
        else:
            # Cache all active templates
            templates = CommunicationTemplate.objects.filter(is_system=True)
        
        for template in templates:
            serializer = CommunicationTemplateSerializer(template)
            self.cache_template_detail(template.id, serializer.data)
            self.cache_template_by_name(template.name, serializer.data)
        
        logger.info(f"Warmed cache for {templates.count()} communication templates")
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics for monitoring"""
        try:
            cache_info = {
                'cache_type': 'Redis',
                'backend': str(self.cache.__class__),
                'analytics_backend': str(self.analytics.__class__),
                'key_patterns': {
                    'templates': ['templates:list:*', 'template:detail:*', 'template:by_name:*'],
                    'records': ['records:list:*', 'record:detail:*', 'records:by_client:*'],
                    'analytics': ['analytics:template:*', 'analytics:client:*', 'analytics:global:*'],
                    'rendered': ['rendered:*', 'template:preview:*']
                }
            }
            
            # Try to get some sample keys
            sample_keys = []
            for pattern in ['communications:templates:variable_schemas']:
                if self.cache.get(pattern) is not None:
                    sample_keys.append(pattern)
            
            cache_info['sample_cached_keys'] = sample_keys
            cache_info['sample_keys_count'] = len(sample_keys)
            
            return cache_info
            
        except Exception as e:
            return {'error': f'Could not retrieve cache stats: {e}'}


# Global service instance
communications_cache_service = CommunicationsCacheService()