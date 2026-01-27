"""
Versioned cache service base class for efficient cache invalidation.

This module provides a base class for domain-specific cache services that uses
cache versioning instead of pattern-based key deletion. This dramatically reduces
Redis operations and is ideal for Upstash (request-based billing).

How it works:
- Each domain has a version number stored in Redis (e.g., cache:version:users = 5)
- All cache keys include the version: users:v5:list:{hash}
- To invalidate all caches: increment version (1 Redis command)
- Old versioned keys naturally expire via TTL (no cleanup needed)

Benefits:
- Invalidation = 1 INCR operation vs many KEYS/SCAN operations
- No blocking Redis operations
- Scales regardless of cache size
- Minimizes Upstash request count
"""
import logging
from typing import Any, Dict, List, Optional
from django.core.cache import caches

logger = logging.getLogger(__name__)


class VersionedCacheService:
    """
    Base class for domain-specific cache services with version-based invalidation.

    Subclasses should:
    1. Set `domain` class attribute (e.g., 'users', 'products')
    2. Set `version_groups` dict mapping group names to key patterns
    3. Call `_versioned_key()` when generating cache keys
    4. Call `_invalidate_version_group()` instead of pattern-based deletion

    Example:
        class UsersCacheService(VersionedCacheService):
            domain = 'users'
            version_groups = {
                'lists': ['list', 'search', 'stats', 'analytics'],
                'invitations': ['admin_invitations'],
            }

            def cache_user_list(self, data, query_hash):
                key = self._versioned_key('lists', f'list:{query_hash}')
                self.cache.set(key, data, self.TIMEOUT_MEDIUM)

            def invalidate_list_caches(self):
                self._invalidate_version_group('lists')  # 1 Redis INCR
    """

    # Subclasses must override these
    domain: str = None  # e.g., 'users', 'products'
    version_groups: Dict[str, List[str]] = {}  # Group name -> key prefixes in that group

    # Version key pattern
    VERSION_KEY_PATTERN = "cache:version:{domain}:{group}"

    def __init__(self):
        self.cache = caches['default']
        self.sessions = caches['sessions']
        self.analytics = caches['analytics']

        if not self.domain:
            raise ValueError("Subclass must set 'domain' class attribute")

    def _get_version_key(self, group: str) -> str:
        """Get the Redis key that stores the version number for a group."""
        return self.VERSION_KEY_PATTERN.format(domain=self.domain, group=group)

    def _get_version(self, group: str) -> int:
        """
        Get current version number for a cache group.
        Returns 1 if version key doesn't exist (first use).
        """
        version_key = self._get_version_key(group)
        version = self.cache.get(version_key)
        if version is None:
            # Initialize version to 1 (never expires)
            self.cache.set(version_key, 1, timeout=None)
            return 1
        return int(version)

    def _versioned_key(self, group: str, key_suffix: str) -> str:
        """
        Generate a versioned cache key.

        Args:
            group: The version group (e.g., 'lists', 'details')
            key_suffix: The rest of the key after domain:v{n}: (e.g., 'list:abc123')

        Returns:
            Full cache key like 'users:v5:list:abc123'
        """
        version = self._get_version(group)
        return f"{self.domain}:v{version}:{key_suffix}"

    def _invalidate_version_group(self, group: str) -> int:
        """
        Invalidate all caches in a version group by incrementing the version.

        This is O(1) - just one INCR operation regardless of how many keys exist.
        Old versioned keys will naturally expire via their TTL.

        Args:
            group: The version group to invalidate

        Returns:
            The new version number
        """
        version_key = self._get_version_key(group)

        try:
            # Use Django cache's incr, which maps to Redis INCR
            new_version = self.cache.incr(version_key)
            logger.debug(f"Incremented {self.domain}:{group} version to {new_version}")
            return new_version
        except ValueError:
            # Key doesn't exist, initialize it
            self.cache.set(version_key, 2, timeout=None)
            logger.debug(f"Initialized {self.domain}:{group} version to 2")
            return 2

    def _invalidate_all_groups(self) -> Dict[str, int]:
        """
        Invalidate all version groups for this domain.

        Returns:
            Dict mapping group names to their new version numbers
        """
        results = {}
        for group in self.version_groups.keys():
            results[group] = self._invalidate_version_group(group)
        logger.info(f"Invalidated all {self.domain} cache groups: {results}")
        return results

    def _delete_specific_key(self, key: str, cache_backend: str = 'default') -> bool:
        """
        Delete a specific cache key (not pattern-based).

        Use this for keys that are unique to a specific entity (e.g., user detail by ID).
        These don't need versioning since we know the exact key.

        Args:
            key: The exact cache key to delete
            cache_backend: Which cache to use ('default', 'sessions', 'analytics')

        Returns:
            True if key was deleted, False otherwise
        """
        cache = getattr(self, cache_backend if cache_backend != 'default' else 'cache')
        try:
            cache.delete(key)
            logger.debug(f"Deleted cache key: {key}")
            return True
        except Exception as e:
            logger.warning(f"Failed to delete cache key {key}: {e}")
            return False

    def _delete_specific_keys(self, keys: List[str], cache_backend: str = 'default') -> int:
        """
        Delete multiple specific cache keys.

        Args:
            keys: List of exact cache keys to delete
            cache_backend: Which cache to use

        Returns:
            Number of keys deleted
        """
        if not keys:
            return 0

        cache = getattr(self, cache_backend if cache_backend != 'default' else 'cache')
        try:
            cache.delete_many(keys)
            logger.debug(f"Deleted {len(keys)} cache keys")
            return len(keys)
        except Exception as e:
            logger.warning(f"Failed to delete cache keys: {e}")
            return 0

    def get_version_info(self) -> Dict[str, int]:
        """
        Get current version numbers for all groups (for debugging/monitoring).

        Returns:
            Dict mapping group names to their current version numbers
        """
        info = {}
        for group in self.version_groups.keys():
            info[group] = self._get_version(group)
        return info
