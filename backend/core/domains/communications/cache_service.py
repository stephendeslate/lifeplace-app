"""
Redis caching service for Communications domain
Uses versioned caching for efficient invalidation (no KEYS/SCAN operations)
"""
import json
import logging
import hashlib
from typing import Any, List, Optional, Dict
from django.core.cache import caches
from django.db.models import QuerySet

from core.utils.cache import VersionedCacheService

logger = logging.getLogger(__name__)


class CommunicationsCacheService(VersionedCacheService):
    """
    Centralized caching service for Communications domain
    Uses versioned caching - invalidation is O(1) via version increment
    """

    # Domain identifier for cache keys
    domain = 'communications'

    # Version groups - invalidating a group increments its version
    version_groups = {
        'templates': ['templates', 'by_channel', 'by_category', 'preview', 'rendered'],  # Template lists
        'records': ['records'],  # Communication records
        'analytics': ['analytics'],  # Communication analytics
    }

    # Versioned cache key patterns
    TEMPLATE_LIST_KEY = "templates:list:{query_hash}"
    TEMPLATE_BY_CHANNEL_KEY = "templates:by_channel:{channel}"
    TEMPLATE_BY_CATEGORY_KEY = "templates:by_category:{category}"
    TEMPLATE_PREVIEW_KEY = "templates:preview:{template_id}:{context_hash}"
    TEMPLATE_SCHEMAS_KEY = "templates:variable_schemas"
    RECORD_LIST_KEY = "records:list:{query_hash}"
    RENDERED_CONTENT_KEY = "rendered:{template_id}:{context_hash}"

    # Analytics (versioned)
    ANALYTICS_TEMPLATE_STATS_KEY = "analytics:template:{template_name}:{days}"
    ANALYTICS_CLIENT_STATS_KEY = "analytics:client:{client_id}:{days}"
    ANALYTICS_GLOBAL_STATS_KEY = "analytics:global:{days}"
    ANALYTICS_CHANNEL_STATS_KEY = "analytics:channel:{channel}:{days}"

    # Non-versioned keys (specific to individual entities - direct deletion)
    TEMPLATE_DETAIL_KEY = "communications:template:detail:{template_id}"
    TEMPLATE_BY_NAME_KEY = "communications:template:by_name:{template_name}"
    RECORD_DETAIL_KEY = "communications:record:detail:{record_id}"
    RECORD_BY_CLIENT_KEY = "communications:records:by_client:{client_id}"
    RECORD_BY_TEMPLATE_KEY = "communications:records:by_template:{template_name}"

    def __init__(self):
        super().__init__()
        # Import config for dynamic timeouts
        from .config import communication_config
        self.config = communication_config

    # Cache timeout configurations (in seconds) - now dynamic
    @property
    def TIMEOUT_SHORT(self):
        return self.config.get_cache_timeout('ANALYTICS')

    @property
    def TIMEOUT_MEDIUM(self):
        return self.config.get_cache_timeout('TEMPLATE_LIST')

    @property
    def TIMEOUT_LONG(self):
        return self.config.get_cache_timeout('TEMPLATE_PREVIEW')

    @property
    def TIMEOUT_VERY_LONG(self):
        return self.config.get_cache_timeout('VARIABLE_SCHEMAS')

    # === TEMPLATE CACHING ===

    def cache_template_list(self, templates_data: List[Dict],
                            query_params: Dict = None) -> str:
        """Cache template list with query parameters (versioned)"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key('templates', self.TEMPLATE_LIST_KEY.format(query_hash=query_hash))
        self.cache.set(key, templates_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached template list: {key}")
        return key

    def get_cached_template_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached template list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key('templates', self.TEMPLATE_LIST_KEY.format(query_hash=query_hash))
        return self.cache.get(key)

    def cache_template_detail(self, template_id: int, template_data: Dict) -> str:
        """Cache individual template detail (non-versioned)"""
        key = self.TEMPLATE_DETAIL_KEY.format(template_id=template_id)
        self.cache.set(key, template_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached template detail: {key}")
        return key

    def get_cached_template_detail(self, template_id: int) -> Optional[Dict]:
        """Get cached template detail"""
        key = self.TEMPLATE_DETAIL_KEY.format(template_id=template_id)
        return self.cache.get(key)

    def cache_template_by_name(self, template_name: str, template_data: Dict) -> str:
        """Cache template lookup by name (non-versioned)"""
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
        """Cache template preview result (versioned)"""
        context_hash = self._generate_query_hash(context_data)
        key = self._versioned_key('templates', self.TEMPLATE_PREVIEW_KEY.format(
            template_id=template_id,
            context_hash=context_hash
        ))
        self.cache.set(key, preview_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached template preview: {key}")
        return key

    def get_cached_template_preview(self, template_id: int, context_data: Dict) -> Optional[Dict]:
        """Get cached template preview"""
        context_hash = self._generate_query_hash(context_data)
        key = self._versioned_key('templates', self.TEMPLATE_PREVIEW_KEY.format(
            template_id=template_id,
            context_hash=context_hash
        ))
        return self.cache.get(key)

    def cache_variable_schemas(self, schemas_data: Dict) -> str:
        """Cache variable schemas for templates (versioned)"""
        key = self._versioned_key('templates', self.TEMPLATE_SCHEMAS_KEY)
        self.cache.set(key, schemas_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached variable schemas: {key}")
        return key

    def get_cached_variable_schemas(self) -> Optional[Dict]:
        """Get cached variable schemas"""
        key = self._versioned_key('templates', self.TEMPLATE_SCHEMAS_KEY)
        return self.cache.get(key)

    def cache_templates_by_channel(self, channel: str, templates_data: List[Dict]) -> str:
        """Cache templates filtered by channel (versioned)"""
        key = self._versioned_key('templates', self.TEMPLATE_BY_CHANNEL_KEY.format(channel=channel))
        self.cache.set(key, templates_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached templates by channel: {key}")
        return key

    def get_cached_templates_by_channel(self, channel: str) -> Optional[List[Dict]]:
        """Get cached templates by channel"""
        key = self._versioned_key('templates', self.TEMPLATE_BY_CHANNEL_KEY.format(channel=channel))
        return self.cache.get(key)

    def cache_templates_by_category(self, category: str, templates_data: List[Dict]) -> str:
        """Cache templates filtered by category (versioned)"""
        key = self._versioned_key('templates', self.TEMPLATE_BY_CATEGORY_KEY.format(category=category))
        self.cache.set(key, templates_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached templates by category: {key}")
        return key

    def get_cached_templates_by_category(self, category: str) -> Optional[List[Dict]]:
        """Get cached templates by category"""
        key = self._versioned_key('templates', self.TEMPLATE_BY_CATEGORY_KEY.format(category=category))
        return self.cache.get(key)

    # === RECORD CACHING ===

    def cache_record_list(self, records_data: List[Dict],
                          query_params: Dict = None) -> str:
        """Cache communication records list with query parameters (versioned)"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key('records', self.RECORD_LIST_KEY.format(query_hash=query_hash))
        self.cache.set(key, records_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached record list: {key}")
        return key

    def get_cached_record_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached communication records list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key('records', self.RECORD_LIST_KEY.format(query_hash=query_hash))
        return self.cache.get(key)

    def cache_record_detail(self, record_id: str, record_data: Dict) -> str:
        """Cache individual communication record detail (non-versioned)"""
        key = self.RECORD_DETAIL_KEY.format(record_id=record_id)
        self.cache.set(key, record_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached record detail: {key}")
        return key

    def get_cached_record_detail(self, record_id: str) -> Optional[Dict]:
        """Get cached communication record detail"""
        key = self.RECORD_DETAIL_KEY.format(record_id=record_id)
        return self.cache.get(key)

    def cache_records_by_client(self, client_id: int, records_data: List[Dict]) -> str:
        """Cache communication records for a specific client (non-versioned)"""
        key = self.RECORD_BY_CLIENT_KEY.format(client_id=client_id)
        self.cache.set(key, records_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached records by client: {key}")
        return key

    def get_cached_records_by_client(self, client_id: int) -> Optional[List[Dict]]:
        """Get cached communication records by client"""
        key = self.RECORD_BY_CLIENT_KEY.format(client_id=client_id)
        return self.cache.get(key)

    def cache_records_by_template(self, template_name: str, records_data: List[Dict]) -> str:
        """Cache communication records for a specific template (non-versioned)"""
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
        """Cache template analytics statistics (versioned)"""
        key = self._versioned_key('analytics', self.ANALYTICS_TEMPLATE_STATS_KEY.format(
            template_name=template_name, days=days
        ))
        self.analytics.set(key, analytics_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached template analytics: {key}")
        return key

    def get_cached_template_analytics(self, template_name: str, days: int) -> Optional[Dict]:
        """Get cached template analytics"""
        key = self._versioned_key('analytics', self.ANALYTICS_TEMPLATE_STATS_KEY.format(
            template_name=template_name, days=days
        ))
        return self.analytics.get(key)

    def cache_client_analytics(self, client_id: int, days: int,
                               analytics_data: Dict) -> str:
        """Cache client-specific communication analytics (versioned)"""
        key = self._versioned_key('analytics', self.ANALYTICS_CLIENT_STATS_KEY.format(
            client_id=client_id, days=days
        ))
        self.analytics.set(key, analytics_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached client analytics: {key}")
        return key

    def get_cached_client_analytics(self, client_id: int, days: int) -> Optional[Dict]:
        """Get cached client analytics"""
        key = self._versioned_key('analytics', self.ANALYTICS_CLIENT_STATS_KEY.format(
            client_id=client_id, days=days
        ))
        return self.analytics.get(key)

    def cache_global_analytics(self, days: int, analytics_data: Dict) -> str:
        """Cache global communication analytics (versioned)"""
        key = self._versioned_key('analytics', self.ANALYTICS_GLOBAL_STATS_KEY.format(days=days))
        self.analytics.set(key, analytics_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached global analytics: {key}")
        return key

    def get_cached_global_analytics(self, days: int) -> Optional[Dict]:
        """Get cached global analytics"""
        key = self._versioned_key('analytics', self.ANALYTICS_GLOBAL_STATS_KEY.format(days=days))
        return self.analytics.get(key)

    def cache_channel_analytics(self, channel: str, days: int,
                                analytics_data: Dict) -> str:
        """Cache channel-specific communication analytics (versioned)"""
        key = self._versioned_key('analytics', self.ANALYTICS_CHANNEL_STATS_KEY.format(
            channel=channel, days=days
        ))
        self.analytics.set(key, analytics_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached channel analytics: {key}")
        return key

    def get_cached_channel_analytics(self, channel: str, days: int) -> Optional[Dict]:
        """Get cached channel analytics"""
        key = self._versioned_key('analytics', self.ANALYTICS_CHANNEL_STATS_KEY.format(
            channel=channel, days=days
        ))
        return self.analytics.get(key)

    # === RENDERED CONTENT CACHING ===

    def cache_rendered_content(self, template_id: int, context_data: Dict,
                               rendered_content: Dict) -> str:
        """Cache rendered template content (versioned)"""
        context_hash = self._generate_query_hash(context_data)
        key = self._versioned_key('templates', self.RENDERED_CONTENT_KEY.format(
            template_id=template_id,
            context_hash=context_hash
        ))
        self.cache.set(key, rendered_content, self.TIMEOUT_LONG)
        logger.debug(f"Cached rendered content: {key}")
        return key

    def get_cached_rendered_content(self, template_id: int, context_data: Dict) -> Optional[Dict]:
        """Get cached rendered template content"""
        context_hash = self._generate_query_hash(context_data)
        key = self._versioned_key('templates', self.RENDERED_CONTENT_KEY.format(
            template_id=template_id,
            context_hash=context_hash
        ))
        return self.cache.get(key)

    # === CACHE INVALIDATION (Version-based - O(1) operations) ===

    def invalidate_template_caches(self, template_id: int = None, template_name: str = None):
        """Invalidate template-related caches"""
        # Increment version for template caches (1 INCR operation)
        self._invalidate_version_group('templates')

        # Delete specific keys
        if template_id:
            self._delete_specific_key(
                self.TEMPLATE_DETAIL_KEY.format(template_id=template_id)
            )

        if template_name:
            keys_to_delete = [
                self.TEMPLATE_BY_NAME_KEY.format(template_name=template_name),
                self.RECORD_BY_TEMPLATE_KEY.format(template_name=template_name)
            ]
            self._delete_specific_keys(keys_to_delete)
            # Also invalidate analytics for this template
            self._invalidate_version_group('analytics')

        logger.info(f"Invalidated template caches for template_id: {template_id}, name: {template_name}")

    def invalidate_record_caches(self, record_id: str = None, client_id: int = None,
                                 template_name: str = None):
        """Invalidate communication record-related caches"""
        # Increment versions for record and analytics caches
        self._invalidate_version_group('records')
        self._invalidate_version_group('analytics')

        # Delete specific keys
        if record_id:
            self._delete_specific_key(
                self.RECORD_DETAIL_KEY.format(record_id=record_id)
            )

        if client_id:
            self._delete_specific_key(
                self.RECORD_BY_CLIENT_KEY.format(client_id=client_id)
            )

        if template_name:
            self._delete_specific_key(
                self.RECORD_BY_TEMPLATE_KEY.format(template_name=template_name)
            )

        logger.info(f"Invalidated record caches for record_id: {record_id}, client_id: {client_id}")

    def invalidate_analytics_caches(self, template_name: str = None, client_id: int = None):
        """Invalidate analytics-related caches"""
        self._invalidate_version_group('analytics')
        logger.info(f"Invalidated analytics caches for template: {template_name}, client: {client_id}")

    def invalidate_variable_schemas_cache(self):
        """
        Invalidate variable schemas cache.
        Call this when CompanySettings or other context-affecting settings change.
        """
        self._invalidate_version_group('templates')
        logger.info("Invalidated variable schemas cache")

    def invalidate_all_communication_caches(self):
        """Invalidate all communication-related caches (3 INCR operations)"""
        self._invalidate_all_groups()
        logger.info("Invalidated all communication domain caches")

    # === UTILITY METHODS ===

    def _generate_query_hash(self, query_params: Dict) -> str:
        """Generate hash for query parameters"""
        sorted_params = sorted(query_params.items())
        query_string = json.dumps(sorted_params, sort_keys=True, default=str)
        return hashlib.md5(query_string.encode()).hexdigest()[:8]

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
                from django.forms.models import model_to_dict
                item_dict = model_to_dict(obj)
                for key, value in item_dict.items():
                    if hasattr(value, 'isoformat'):
                        item_dict[key] = value.isoformat()
                    elif hasattr(value, 'hex'):
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
                'cache_type': 'Redis (Versioned)',
                'domain': self.domain,
                'version_groups': self.version_groups,
                'current_versions': self.get_version_info(),
                'key_patterns': {
                    'versioned': ['templates', 'records', 'analytics'],
                    'direct': ['template:detail', 'template:by_name', 'record:detail', 'records:by_client'],
                }
            }
            return cache_info

        except Exception as e:
            return {'error': f'Could not retrieve cache stats: {e}'}


# Global service instance
communications_cache_service = CommunicationsCacheService()
