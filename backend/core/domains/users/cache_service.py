"""
Redis caching service for Users domain
Uses versioned caching for efficient invalidation (no KEYS/SCAN operations)
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Any

from django.db.models import QuerySet

from core.utils.cache import VersionedCacheService

logger = logging.getLogger(__name__)


class UsersCacheService(VersionedCacheService):
    """
    Centralized caching service for Users domain
    Uses versioned caching - invalidation is O(1) via version increment
    """

    # Domain identifier for cache keys
    domain = "users"

    # Version groups - invalidating a group increments its version
    # Old keys naturally expire via TTL
    version_groups = {
        "lists": ["list", "search"],  # User lists and search results
        "stats": ["stats", "analytics", "role_distribution"],  # Analytics data
        "invitations": ["admin_invitations"],  # Admin invitations
    }

    # Cache key patterns (using versioned keys for list/search/stats)
    # Format: {domain}:v{version}:{type}:{identifier}
    USER_LIST_KEY = "list:{query_hash}"
    USER_SEARCH_RESULTS_KEY = "search:{search_hash}"
    USER_STATS_KEY = "stats:global"
    USER_ANALYTICS_KEY = "analytics:{period}"
    ROLE_DISTRIBUTION_KEY = "role_distribution"
    ADMIN_INVITATION_LIST_KEY = "admin_invitations:list:{query_hash}"
    PENDING_INVITATIONS_KEY = "admin_invitations:pending"

    # Non-versioned keys (specific to individual entities - direct deletion)
    USER_DETAIL_KEY = "users:detail:{user_id}"
    USER_BY_EMAIL_KEY = "users:by_email:{email_hash}"
    USER_PROFILE_KEY = "users:profile:{user_id}"
    USER_TOKENS_KEY = "users:tokens:{user_id}"
    USER_PERMISSIONS_KEY = "users:permissions:{user_id}"
    ADMIN_INVITATION_DETAIL_KEY = "users:admin_invitation:detail:{invitation_id}"
    ADMIN_INVITATION_BY_EMAIL_KEY = "users:admin_invitation:by_email:{email_hash}"

    # Session keys (stored in sessions cache)
    AUTH_SESSION_KEY = "users:auth_session:{session_id}"
    ACTIVE_SESSIONS_KEY = "users:active_sessions:{user_id}"
    LOGIN_ATTEMPTS_KEY = "users:login_attempts:{ip_address}"
    PASSWORD_RESET_KEY = "users:password_reset:{token}"

    # Cache timeout configurations (in seconds)
    TIMEOUT_SHORT = 300  # 5 minutes - frequently changing data
    TIMEOUT_MEDIUM = 1800  # 30 minutes - moderate changes
    TIMEOUT_LONG = 3600  # 1 hour - stable data
    TIMEOUT_VERY_LONG = 14400  # 4 hours - very stable data

    # === USER CACHING ===

    def cache_user_list(self, users_data: list[dict], query_params: dict = None) -> str:
        """Cache user list with query parameters (versioned)"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("lists", self.USER_LIST_KEY.format(query_hash=query_hash))
        self.cache.set(key, users_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached user list: {key}")
        return key

    def get_cached_user_list(self, query_params: dict = None) -> list[dict] | None:
        """Get cached user list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("lists", self.USER_LIST_KEY.format(query_hash=query_hash))
        return self.cache.get(key)

    def cache_user_detail(self, user_id: int, user_data: dict) -> str:
        """Cache individual user detail (non-versioned - direct key)"""
        key = self.USER_DETAIL_KEY.format(user_id=user_id)
        self.cache.set(key, user_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached user detail: {key}")
        return key

    def get_cached_user_detail(self, user_id: int) -> dict | None:
        """Get cached user detail"""
        key = self.USER_DETAIL_KEY.format(user_id=user_id)
        return self.cache.get(key)

    def cache_user_by_email(self, email: str, user_data: dict) -> str:
        """Cache user lookup by email (non-versioned - direct key)"""
        email_hash = self._generate_email_hash(email)
        key = self.USER_BY_EMAIL_KEY.format(email_hash=email_hash)
        self.cache.set(key, user_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached user by email: {key}")
        return key

    def get_cached_user_by_email(self, email: str) -> dict | None:
        """Get cached user by email"""
        email_hash = self._generate_email_hash(email)
        key = self.USER_BY_EMAIL_KEY.format(email_hash=email_hash)
        return self.cache.get(key)

    def cache_user_profile(self, user_id: int, profile_data: dict) -> str:
        """Cache user profile data (non-versioned - direct key)"""
        key = self.USER_PROFILE_KEY.format(user_id=user_id)
        self.cache.set(key, profile_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached user profile: {key}")
        return key

    def get_cached_user_profile(self, user_id: int) -> dict | None:
        """Get cached user profile"""
        key = self.USER_PROFILE_KEY.format(user_id=user_id)
        return self.cache.get(key)

    def cache_user_permissions(self, user_id: int, permissions_data: dict) -> str:
        """Cache user permissions (non-versioned - direct key)"""
        key = self.USER_PERMISSIONS_KEY.format(user_id=user_id)
        self.cache.set(key, permissions_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached user permissions: {key}")
        return key

    def get_cached_user_permissions(self, user_id: int) -> dict | None:
        """Get cached user permissions"""
        key = self.USER_PERMISSIONS_KEY.format(user_id=user_id)
        return self.cache.get(key)

    def cache_user_search_results(self, search_query: str, results_data: list[dict]) -> str:
        """Cache user search results (versioned)"""
        search_hash = self._generate_query_hash({"search": search_query})
        key = self._versioned_key("lists", self.USER_SEARCH_RESULTS_KEY.format(search_hash=search_hash))
        self.cache.set(key, results_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached user search results: {key}")
        return key

    def get_cached_user_search_results(self, search_query: str) -> list[dict] | None:
        """Get cached user search results"""
        search_hash = self._generate_query_hash({"search": search_query})
        key = self._versioned_key("lists", self.USER_SEARCH_RESULTS_KEY.format(search_hash=search_hash))
        return self.cache.get(key)

    # === ADMIN INVITATION CACHING ===

    def cache_invitation_list(self, invitations_data: list[dict], query_params: dict = None) -> str:
        """Cache admin invitation list (versioned)"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("invitations", self.ADMIN_INVITATION_LIST_KEY.format(query_hash=query_hash))
        self.cache.set(key, invitations_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached invitation list: {key}")
        return key

    def get_cached_invitation_list(self, query_params: dict = None) -> list[dict] | None:
        """Get cached admin invitation list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("invitations", self.ADMIN_INVITATION_LIST_KEY.format(query_hash=query_hash))
        return self.cache.get(key)

    def cache_invitation_detail(self, invitation_id: str, invitation_data: dict) -> str:
        """Cache individual admin invitation detail (non-versioned)"""
        key = self.ADMIN_INVITATION_DETAIL_KEY.format(invitation_id=invitation_id)
        self.cache.set(key, invitation_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached invitation detail: {key}")
        return key

    def get_cached_invitation_detail(self, invitation_id: str) -> dict | None:
        """Get cached admin invitation detail"""
        key = self.ADMIN_INVITATION_DETAIL_KEY.format(invitation_id=invitation_id)
        return self.cache.get(key)

    def cache_invitation_by_email(self, email: str, invitation_data: dict) -> str:
        """Cache invitation lookup by email (non-versioned)"""
        email_hash = self._generate_email_hash(email)
        key = self.ADMIN_INVITATION_BY_EMAIL_KEY.format(email_hash=email_hash)
        self.cache.set(key, invitation_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached invitation by email: {key}")
        return key

    def get_cached_invitation_by_email(self, email: str) -> dict | None:
        """Get cached invitation by email"""
        email_hash = self._generate_email_hash(email)
        key = self.ADMIN_INVITATION_BY_EMAIL_KEY.format(email_hash=email_hash)
        return self.cache.get(key)

    def cache_pending_invitations(self, invitations_data: list[dict]) -> str:
        """Cache pending admin invitations (versioned)"""
        key = self._versioned_key("invitations", self.PENDING_INVITATIONS_KEY)
        self.cache.set(key, invitations_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached pending invitations: {key}")
        return key

    def get_cached_pending_invitations(self) -> list[dict] | None:
        """Get cached pending invitations"""
        key = self._versioned_key("invitations", self.PENDING_INVITATIONS_KEY)
        return self.cache.get(key)

    # === AUTHENTICATION & SESSION CACHING ===

    def cache_auth_session(self, session_id: str, session_data: dict, timeout: int = None) -> str:
        """Cache authentication session data"""
        if timeout is None:
            timeout = self.TIMEOUT_MEDIUM

        key = self.AUTH_SESSION_KEY.format(session_id=session_id)
        self.sessions.set(key, session_data, timeout)
        logger.debug(f"Cached auth session: {key}")
        return key

    def get_cached_auth_session(self, session_id: str) -> dict | None:
        """Get cached authentication session"""
        key = self.AUTH_SESSION_KEY.format(session_id=session_id)
        return self.sessions.get(key)

    def invalidate_auth_session(self, session_id: str):
        """Invalidate authentication session"""
        key = self.AUTH_SESSION_KEY.format(session_id=session_id)
        self.sessions.delete(key)
        logger.debug(f"Invalidated auth session: {key}")

    def cache_active_user_sessions(self, user_id: int, sessions_data: list[dict]) -> str:
        """Cache active sessions for a user"""
        key = self.ACTIVE_SESSIONS_KEY.format(user_id=user_id)
        self.sessions.set(key, sessions_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached active sessions: {key}")
        return key

    def get_cached_active_user_sessions(self, user_id: int) -> list[dict] | None:
        """Get cached active sessions for a user"""
        key = self.ACTIVE_SESSIONS_KEY.format(user_id=user_id)
        return self.sessions.get(key)

    def cache_user_tokens(self, user_id: int, tokens_data: dict, timeout: int = None) -> str:
        """Cache user JWT tokens"""
        if timeout is None:
            timeout = 86400  # 24 hours for token cache

        key = self.USER_TOKENS_KEY.format(user_id=user_id)
        self.cache.set(key, tokens_data, timeout)
        logger.debug(f"Cached user tokens: {key}")
        return key

    def get_cached_user_tokens(self, user_id: int) -> dict | None:
        """Get cached user tokens"""
        key = self.USER_TOKENS_KEY.format(user_id=user_id)
        return self.cache.get(key)

    def invalidate_user_tokens(self, user_id: int):
        """Invalidate cached user tokens"""
        key = self.USER_TOKENS_KEY.format(user_id=user_id)
        self.cache.delete(key)
        logger.debug(f"Invalidated user tokens: {key}")

    # === SECURITY & RATE LIMITING ===

    def track_login_attempt(self, ip_address: str, success: bool = False) -> dict:
        """Track login attempts for rate limiting"""
        key = self.LOGIN_ATTEMPTS_KEY.format(ip_address=ip_address.replace(".", "_"))

        # Get existing attempts
        attempts_data = self.cache.get(key, {"attempts": 0, "last_attempt": None, "locked_until": None})

        attempts_data["attempts"] += 1
        attempts_data["last_attempt"] = datetime.now().isoformat()

        if success:
            # Reset attempts on successful login
            attempts_data["attempts"] = 0
            attempts_data["locked_until"] = None
        elif attempts_data["attempts"] >= 5:
            # Lock account for 15 minutes after 5 failed attempts
            lock_time = datetime.now() + timedelta(minutes=15)
            attempts_data["locked_until"] = lock_time.isoformat()

        # Cache for 1 hour
        self.cache.set(key, attempts_data, 3600)
        logger.debug(f"Tracked login attempt for IP: {ip_address}")

        return attempts_data

    def get_login_attempts(self, ip_address: str) -> dict:
        """Get login attempts for IP address"""
        key = self.LOGIN_ATTEMPTS_KEY.format(ip_address=ip_address.replace(".", "_"))
        return self.cache.get(key, {"attempts": 0, "locked_until": None})

    def cache_password_reset_token(self, token: str, user_data: dict, timeout: int = 3600) -> str:
        """Cache password reset token (1 hour default)"""
        key = self.PASSWORD_RESET_KEY.format(token=token)
        self.cache.set(key, user_data, timeout)
        logger.debug(f"Cached password reset token: {key}")
        return key

    def get_cached_password_reset_token(self, token: str) -> dict | None:
        """Get cached password reset token data"""
        key = self.PASSWORD_RESET_KEY.format(token=token)
        return self.cache.get(key)

    def invalidate_password_reset_token(self, token: str):
        """Invalidate password reset token"""
        key = self.PASSWORD_RESET_KEY.format(token=token)
        self.cache.delete(key)
        logger.debug(f"Invalidated password reset token: {key}")

    # === ANALYTICS & STATISTICS ===

    def cache_user_stats(self, stats_data: dict) -> str:
        """Cache global user statistics (versioned)"""
        key = self._versioned_key("stats", self.USER_STATS_KEY)
        self.analytics.set(key, stats_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached user stats: {key}")
        return key

    def get_cached_user_stats(self) -> dict | None:
        """Get cached user statistics"""
        key = self._versioned_key("stats", self.USER_STATS_KEY)
        return self.analytics.get(key)

    def cache_user_analytics(self, period: str, analytics_data: dict) -> str:
        """Cache user analytics for specific period (versioned)"""
        key = self._versioned_key("stats", self.USER_ANALYTICS_KEY.format(period=period))
        self.analytics.set(key, analytics_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached user analytics: {key}")
        return key

    def get_cached_user_analytics(self, period: str) -> dict | None:
        """Get cached user analytics"""
        key = self._versioned_key("stats", self.USER_ANALYTICS_KEY.format(period=period))
        return self.analytics.get(key)

    def cache_role_distribution(self, distribution_data: dict) -> str:
        """Cache user role distribution statistics (versioned)"""
        key = self._versioned_key("stats", self.ROLE_DISTRIBUTION_KEY)
        self.analytics.set(key, distribution_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached role distribution: {key}")
        return key

    def get_cached_role_distribution(self) -> dict | None:
        """Get cached role distribution"""
        key = self._versioned_key("stats", self.ROLE_DISTRIBUTION_KEY)
        return self.analytics.get(key)

    # === CACHE INVALIDATION (Version-based - O(1) operations) ===

    def invalidate_user_caches(self, user_id: int = None, email: str = None):
        """
        Invalidate user-related caches.

        Uses version increment for list/search/stats caches (O(1)).
        Uses direct deletion for specific user keys.
        """
        # Increment versions for list and stats caches (2 INCR operations total)
        self._invalidate_version_group("lists")
        self._invalidate_version_group("stats")

        # Delete specific user keys if user_id provided
        if user_id:
            keys_to_delete = [
                self.USER_DETAIL_KEY.format(user_id=user_id),
                self.USER_PROFILE_KEY.format(user_id=user_id),
                self.USER_PERMISSIONS_KEY.format(user_id=user_id),
                self.USER_TOKENS_KEY.format(user_id=user_id),
            ]
            self._delete_specific_keys(keys_to_delete)

            # Delete session keys
            self._delete_specific_key(self.ACTIVE_SESSIONS_KEY.format(user_id=user_id), cache_backend="sessions")

        # Delete email-based key if email provided
        if email:
            email_hash = self._generate_email_hash(email)
            self._delete_specific_key(self.USER_BY_EMAIL_KEY.format(email_hash=email_hash))

        logger.info(f"Invalidated user caches for user_id: {user_id}, email: {email}")

    def invalidate_invitation_caches(self, invitation_id: str = None, email: str = None):
        """
        Invalidate admin invitation-related caches.

        Uses version increment for invitation list caches (O(1)).
        Uses direct deletion for specific invitation keys.
        """
        # Increment version for invitation caches (1 INCR operation)
        self._invalidate_version_group("invitations")

        # Delete specific invitation keys
        if invitation_id:
            self._delete_specific_key(self.ADMIN_INVITATION_DETAIL_KEY.format(invitation_id=invitation_id))

        if email:
            email_hash = self._generate_email_hash(email)
            self._delete_specific_key(self.ADMIN_INVITATION_BY_EMAIL_KEY.format(email_hash=email_hash))

        logger.info(f"Invalidated invitation caches for invitation_id: {invitation_id}")

    def invalidate_all_user_caches(self):
        """Invalidate all user-related caches (3 INCR operations)"""
        self._invalidate_all_groups()
        logger.info("Invalidated all user domain caches")

    # === UTILITY METHODS ===

    def _generate_query_hash(self, query_params: dict) -> str:
        """Generate hash for query parameters"""
        sorted_params = sorted(query_params.items())
        query_string = json.dumps(sorted_params, sort_keys=True, default=str)
        return hashlib.md5(query_string.encode()).hexdigest()[:8]

    def _generate_email_hash(self, email: str) -> str:
        """Generate hash for email address (for privacy)"""
        return hashlib.md5(email.lower().encode()).hexdigest()[:8]

    def cache_queryset(self, queryset: QuerySet, cache_key: str, timeout: int = None) -> list[dict]:
        """
        Cache a Django queryset as JSON data
        Returns the cached data as a list of dictionaries
        """
        if timeout is None:
            timeout = self.TIMEOUT_MEDIUM

        # Serialize queryset to JSON with related data
        cached_data = []
        for obj in queryset.select_related("profile"):  # Optimize for user queries
            if hasattr(obj, "to_dict"):
                cached_data.append(obj.to_dict())
            else:
                # Fallback to model_to_dict
                from django.forms.models import model_to_dict

                item_dict = model_to_dict(obj, exclude=["password"])  # Don't cache passwords

                # Add profile data if available
                if hasattr(obj, "profile") and obj.profile:
                    profile_dict = model_to_dict(obj.profile)
                    item_dict["profile"] = profile_dict

                # Convert datetime fields for JSON serialization
                for key, value in item_dict.items():
                    if hasattr(value, "isoformat"):  # datetime objects
                        item_dict[key] = value.isoformat()
                cached_data.append(item_dict)

        self.cache.set(cache_key, cached_data, timeout)
        logger.debug(f"Cached queryset with {len(cached_data)} items: {cache_key}")
        return cached_data

    def get_or_set(
        self,
        key: str,
        callable_func,
        timeout: int = None,
        use_sessions_cache: bool = False,
        use_analytics_cache: bool = False,
    ) -> Any:
        """
        Get from cache or set if not exists (cache-aside pattern)
        """
        if timeout is None:
            timeout = self.TIMEOUT_MEDIUM

        if use_sessions_cache:
            cache_backend = self.sessions
        elif use_analytics_cache:
            cache_backend = self.analytics
        else:
            cache_backend = self.cache

        data = cache_backend.get(key)
        if data is None:
            data = callable_func()
            cache_backend.set(key, data, timeout)
            logger.debug(f"Set cache key: {key}")
        else:
            logger.debug(f"Cache hit for key: {key}")

        return data

    def warm_cache_for_users(self, user_ids: list[int] = None):
        """
        Warm cache for frequently accessed users
        """
        from .models import User
        from .serializers import UserSerializer

        if user_ids:
            users = User.objects.filter(id__in=user_ids).select_related("profile")
        else:
            # Cache all active admin users and recent clients
            users = User.objects.filter(is_active=True).select_related("profile").order_by("-last_login")[:50]

        for user in users:
            serializer = UserSerializer(user)
            user_data = serializer.data

            self.cache_user_detail(user.id, user_data)
            self.cache_user_by_email(user.email, user_data)

            # Cache user permissions
            permissions_data = {
                "role": user.role,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "is_active": user.is_active,
            }
            self.cache_user_permissions(user.id, permissions_data)

        logger.info(f"Warmed cache for {users.count()} users")

    def get_cache_stats(self) -> dict:
        """Get cache statistics for monitoring"""
        try:
            cache_info = {
                "cache_type": "Redis (Versioned)",
                "domain": self.domain,
                "version_groups": self.version_groups,
                "current_versions": self.get_version_info(),
                "key_patterns": {
                    "versioned": ["list", "search", "stats", "analytics", "invitations"],
                    "direct": ["detail", "profile", "permissions", "tokens", "sessions"],
                },
            }
            return cache_info

        except Exception as e:
            return {"error": f"Could not retrieve cache stats: {e}"}


# Global service instance
users_cache_service = UsersCacheService()
