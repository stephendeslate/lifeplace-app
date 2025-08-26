"""
Redis caching service for Users domain
Handles user data, profiles, authentication, admin invitations, and user sessions
"""
import json
import logging
import hashlib
from typing import Any, List, Optional, Dict, Union
from django.core.cache import caches
from django.db.models import QuerySet
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Use the default Redis cache and sessions cache
redis_cache = caches['default']
sessions_cache = caches['sessions']
analytics_cache = caches['analytics']


class UsersCacheService:
    """
    Centralized caching service for Users domain
    Handles users, profiles, authentication, invitations, and user sessions
    """
    
    def __init__(self):
        self.cache = redis_cache
        self.sessions = sessions_cache
        self.analytics = analytics_cache
    
    # Cache key patterns
    USER_LIST_KEY = "users:list:{query_hash}"
    USER_DETAIL_KEY = "users:detail:{user_id}"
    USER_BY_EMAIL_KEY = "users:by_email:{email_hash}"
    USER_PROFILE_KEY = "users:profile:{user_id}"
    USER_TOKENS_KEY = "users:tokens:{user_id}"
    USER_PERMISSIONS_KEY = "users:permissions:{user_id}"
    USER_SEARCH_RESULTS_KEY = "users:search:{search_hash}"
    
    ADMIN_INVITATION_LIST_KEY = "users:admin_invitations:list:{query_hash}"
    ADMIN_INVITATION_DETAIL_KEY = "users:admin_invitation:detail:{invitation_id}"
    ADMIN_INVITATION_BY_EMAIL_KEY = "users:admin_invitation:by_email:{email_hash}"
    PENDING_INVITATIONS_KEY = "users:admin_invitations:pending"
    
    AUTH_SESSION_KEY = "users:auth_session:{session_id}"
    ACTIVE_SESSIONS_KEY = "users:active_sessions:{user_id}"
    LOGIN_ATTEMPTS_KEY = "users:login_attempts:{ip_address}"
    PASSWORD_RESET_KEY = "users:password_reset:{token}"
    
    USER_STATS_KEY = "users:stats:global"
    USER_ANALYTICS_KEY = "users:analytics:{period}"
    ROLE_DISTRIBUTION_KEY = "users:role_distribution"
    
    # Cache timeout configurations (in seconds)
    TIMEOUT_SHORT = 300      # 5 minutes - frequently changing data (sessions, login attempts)
    TIMEOUT_MEDIUM = 1800    # 30 minutes - moderate changes (user data, profiles)
    TIMEOUT_LONG = 3600      # 1 hour - stable data (permissions, invitations)
    TIMEOUT_VERY_LONG = 14400  # 4 hours - very stable data (user stats, analytics)
    
    # === USER CACHING ===
    
    def cache_user_list(self, users_data: List[Dict], 
                       query_params: Dict = None) -> str:
        """Cache user list with query parameters"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.USER_LIST_KEY.format(query_hash=query_hash)
        self.cache.set(key, users_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached user list: {key}")
        return key
    
    def get_cached_user_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached user list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.USER_LIST_KEY.format(query_hash=query_hash)
        return self.cache.get(key)
    
    def cache_user_detail(self, user_id: int, user_data: Dict) -> str:
        """Cache individual user detail"""
        key = self.USER_DETAIL_KEY.format(user_id=user_id)
        self.cache.set(key, user_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached user detail: {key}")
        return key
    
    def get_cached_user_detail(self, user_id: int) -> Optional[Dict]:
        """Get cached user detail"""
        key = self.USER_DETAIL_KEY.format(user_id=user_id)
        return self.cache.get(key)
    
    def cache_user_by_email(self, email: str, user_data: Dict) -> str:
        """Cache user lookup by email"""
        email_hash = self._generate_email_hash(email)
        key = self.USER_BY_EMAIL_KEY.format(email_hash=email_hash)
        self.cache.set(key, user_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached user by email: {key}")
        return key
    
    def get_cached_user_by_email(self, email: str) -> Optional[Dict]:
        """Get cached user by email"""
        email_hash = self._generate_email_hash(email)
        key = self.USER_BY_EMAIL_KEY.format(email_hash=email_hash)
        return self.cache.get(key)
    
    def cache_user_profile(self, user_id: int, profile_data: Dict) -> str:
        """Cache user profile data"""
        key = self.USER_PROFILE_KEY.format(user_id=user_id)
        self.cache.set(key, profile_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached user profile: {key}")
        return key
    
    def get_cached_user_profile(self, user_id: int) -> Optional[Dict]:
        """Get cached user profile"""
        key = self.USER_PROFILE_KEY.format(user_id=user_id)
        return self.cache.get(key)
    
    def cache_user_permissions(self, user_id: int, permissions_data: Dict) -> str:
        """Cache user permissions and role information"""
        key = self.USER_PERMISSIONS_KEY.format(user_id=user_id)
        self.cache.set(key, permissions_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached user permissions: {key}")
        return key
    
    def get_cached_user_permissions(self, user_id: int) -> Optional[Dict]:
        """Get cached user permissions"""
        key = self.USER_PERMISSIONS_KEY.format(user_id=user_id)
        return self.cache.get(key)
    
    def cache_user_search_results(self, search_query: str, results_data: List[Dict]) -> str:
        """Cache user search results"""
        search_hash = self._generate_query_hash({'search': search_query})
        key = self.USER_SEARCH_RESULTS_KEY.format(search_hash=search_hash)
        self.cache.set(key, results_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached user search results: {key}")
        return key
    
    def get_cached_user_search_results(self, search_query: str) -> Optional[List[Dict]]:
        """Get cached user search results"""
        search_hash = self._generate_query_hash({'search': search_query})
        key = self.USER_SEARCH_RESULTS_KEY.format(search_hash=search_hash)
        return self.cache.get(key)
    
    # === ADMIN INVITATION CACHING ===
    
    def cache_invitation_list(self, invitations_data: List[Dict], 
                             query_params: Dict = None) -> str:
        """Cache admin invitation list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.ADMIN_INVITATION_LIST_KEY.format(query_hash=query_hash)
        self.cache.set(key, invitations_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached invitation list: {key}")
        return key
    
    def get_cached_invitation_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached admin invitation list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.ADMIN_INVITATION_LIST_KEY.format(query_hash=query_hash)
        return self.cache.get(key)
    
    def cache_invitation_detail(self, invitation_id: str, invitation_data: Dict) -> str:
        """Cache individual admin invitation detail"""
        key = self.ADMIN_INVITATION_DETAIL_KEY.format(invitation_id=invitation_id)
        self.cache.set(key, invitation_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached invitation detail: {key}")
        return key
    
    def get_cached_invitation_detail(self, invitation_id: str) -> Optional[Dict]:
        """Get cached admin invitation detail"""
        key = self.ADMIN_INVITATION_DETAIL_KEY.format(invitation_id=invitation_id)
        return self.cache.get(key)
    
    def cache_invitation_by_email(self, email: str, invitation_data: Dict) -> str:
        """Cache invitation lookup by email"""
        email_hash = self._generate_email_hash(email)
        key = self.ADMIN_INVITATION_BY_EMAIL_KEY.format(email_hash=email_hash)
        self.cache.set(key, invitation_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached invitation by email: {key}")
        return key
    
    def get_cached_invitation_by_email(self, email: str) -> Optional[Dict]:
        """Get cached invitation by email"""
        email_hash = self._generate_email_hash(email)
        key = self.ADMIN_INVITATION_BY_EMAIL_KEY.format(email_hash=email_hash)
        return self.cache.get(key)
    
    def cache_pending_invitations(self, invitations_data: List[Dict]) -> str:
        """Cache pending admin invitations"""
        key = self.PENDING_INVITATIONS_KEY
        self.cache.set(key, invitations_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached pending invitations: {key}")
        return key
    
    def get_cached_pending_invitations(self) -> Optional[List[Dict]]:
        """Get cached pending invitations"""
        return self.cache.get(self.PENDING_INVITATIONS_KEY)
    
    # === AUTHENTICATION & SESSION CACHING ===
    
    def cache_auth_session(self, session_id: str, session_data: Dict, 
                          timeout: int = None) -> str:
        """Cache authentication session data"""
        if timeout is None:
            timeout = self.TIMEOUT_MEDIUM
            
        key = self.AUTH_SESSION_KEY.format(session_id=session_id)
        self.sessions.set(key, session_data, timeout)
        logger.debug(f"Cached auth session: {key}")
        return key
    
    def get_cached_auth_session(self, session_id: str) -> Optional[Dict]:
        """Get cached authentication session"""
        key = self.AUTH_SESSION_KEY.format(session_id=session_id)
        return self.sessions.get(key)
    
    def invalidate_auth_session(self, session_id: str):
        """Invalidate authentication session"""
        key = self.AUTH_SESSION_KEY.format(session_id=session_id)
        self.sessions.delete(key)
        logger.debug(f"Invalidated auth session: {key}")
    
    def cache_active_user_sessions(self, user_id: int, sessions_data: List[Dict]) -> str:
        """Cache active sessions for a user"""
        key = self.ACTIVE_SESSIONS_KEY.format(user_id=user_id)
        self.sessions.set(key, sessions_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached active sessions: {key}")
        return key
    
    def get_cached_active_user_sessions(self, user_id: int) -> Optional[List[Dict]]:
        """Get cached active sessions for a user"""
        key = self.ACTIVE_SESSIONS_KEY.format(user_id=user_id)
        return self.sessions.get(key)
    
    def cache_user_tokens(self, user_id: int, tokens_data: Dict, 
                         timeout: int = None) -> str:
        """Cache user JWT tokens"""
        if timeout is None:
            timeout = 86400  # 24 hours for token cache
            
        key = self.USER_TOKENS_KEY.format(user_id=user_id)
        self.cache.set(key, tokens_data, timeout)
        logger.debug(f"Cached user tokens: {key}")
        return key
    
    def get_cached_user_tokens(self, user_id: int) -> Optional[Dict]:
        """Get cached user tokens"""
        key = self.USER_TOKENS_KEY.format(user_id=user_id)
        return self.cache.get(key)
    
    def invalidate_user_tokens(self, user_id: int):
        """Invalidate cached user tokens"""
        key = self.USER_TOKENS_KEY.format(user_id=user_id)
        self.cache.delete(key)
        logger.debug(f"Invalidated user tokens: {key}")
    
    # === SECURITY & RATE LIMITING ===
    
    def track_login_attempt(self, ip_address: str, success: bool = False) -> Dict:
        """Track login attempts for rate limiting"""
        key = self.LOGIN_ATTEMPTS_KEY.format(ip_address=ip_address.replace('.', '_'))
        
        # Get existing attempts
        attempts_data = self.cache.get(key, {
            'attempts': 0,
            'last_attempt': None,
            'locked_until': None
        })
        
        attempts_data['attempts'] += 1
        attempts_data['last_attempt'] = datetime.now().isoformat()
        
        if success:
            # Reset attempts on successful login
            attempts_data['attempts'] = 0
            attempts_data['locked_until'] = None
        elif attempts_data['attempts'] >= 5:
            # Lock account for 15 minutes after 5 failed attempts
            lock_time = datetime.now() + timedelta(minutes=15)
            attempts_data['locked_until'] = lock_time.isoformat()
        
        # Cache for 1 hour
        self.cache.set(key, attempts_data, 3600)
        logger.debug(f"Tracked login attempt for IP: {ip_address}")
        
        return attempts_data
    
    def get_login_attempts(self, ip_address: str) -> Dict:
        """Get login attempts for IP address"""
        key = self.LOGIN_ATTEMPTS_KEY.format(ip_address=ip_address.replace('.', '_'))
        return self.cache.get(key, {'attempts': 0, 'locked_until': None})
    
    def cache_password_reset_token(self, token: str, user_data: Dict, 
                                  timeout: int = 3600) -> str:
        """Cache password reset token (1 hour default)"""
        key = self.PASSWORD_RESET_KEY.format(token=token)
        self.cache.set(key, user_data, timeout)
        logger.debug(f"Cached password reset token: {key}")
        return key
    
    def get_cached_password_reset_token(self, token: str) -> Optional[Dict]:
        """Get cached password reset token data"""
        key = self.PASSWORD_RESET_KEY.format(token=token)
        return self.cache.get(key)
    
    def invalidate_password_reset_token(self, token: str):
        """Invalidate password reset token"""
        key = self.PASSWORD_RESET_KEY.format(token=token)
        self.cache.delete(key)
        logger.debug(f"Invalidated password reset token: {key}")
    
    # === ANALYTICS & STATISTICS ===
    
    def cache_user_stats(self, stats_data: Dict) -> str:
        """Cache global user statistics"""
        key = self.USER_STATS_KEY
        self.analytics.set(key, stats_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached user stats: {key}")
        return key
    
    def get_cached_user_stats(self) -> Optional[Dict]:
        """Get cached user statistics"""
        return self.analytics.get(self.USER_STATS_KEY)
    
    def cache_user_analytics(self, period: str, analytics_data: Dict) -> str:
        """Cache user analytics for specific period"""
        key = self.USER_ANALYTICS_KEY.format(period=period)
        self.analytics.set(key, analytics_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached user analytics: {key}")
        return key
    
    def get_cached_user_analytics(self, period: str) -> Optional[Dict]:
        """Get cached user analytics"""
        key = self.USER_ANALYTICS_KEY.format(period=period)
        return self.analytics.get(key)
    
    def cache_role_distribution(self, distribution_data: Dict) -> str:
        """Cache user role distribution statistics"""
        key = self.ROLE_DISTRIBUTION_KEY
        self.analytics.set(key, distribution_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached role distribution: {key}")
        return key
    
    def get_cached_role_distribution(self) -> Optional[Dict]:
        """Get cached role distribution"""
        return self.analytics.get(self.ROLE_DISTRIBUTION_KEY)
    
    # === CACHE INVALIDATION ===
    
    def invalidate_user_caches(self, user_id: int = None, email: str = None):
        """Invalidate user-related caches"""
        patterns_to_invalidate = [
            f"users:list:*",
            f"users:search:*",
            f"users:stats:*",
            f"users:analytics:*",
            f"users:role_distribution"
        ]
        
        if user_id:
            patterns_to_invalidate.extend([
                self.USER_DETAIL_KEY.format(user_id=user_id),
                self.USER_PROFILE_KEY.format(user_id=user_id),
                self.USER_PERMISSIONS_KEY.format(user_id=user_id),
                self.USER_TOKENS_KEY.format(user_id=user_id),
                self.ACTIVE_SESSIONS_KEY.format(user_id=user_id)
            ])
        
        if email:
            email_hash = self._generate_email_hash(email)
            patterns_to_invalidate.append(
                self.USER_BY_EMAIL_KEY.format(email_hash=email_hash)
            )
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated user caches for user_id: {user_id}, email: {email}")
    
    def invalidate_invitation_caches(self, invitation_id: str = None, email: str = None):
        """Invalidate admin invitation-related caches"""
        patterns_to_invalidate = [
            f"users:admin_invitations:list:*",
            self.PENDING_INVITATIONS_KEY
        ]
        
        if invitation_id:
            patterns_to_invalidate.append(
                self.ADMIN_INVITATION_DETAIL_KEY.format(invitation_id=invitation_id)
            )
        
        if email:
            email_hash = self._generate_email_hash(email)
            patterns_to_invalidate.append(
                self.ADMIN_INVITATION_BY_EMAIL_KEY.format(email_hash=email_hash)
            )
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated invitation caches for invitation_id: {invitation_id}")
    
    def invalidate_all_user_caches(self):
        """Invalidate all user-related caches"""
        patterns_to_invalidate = [f"users:*"]
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info("Invalidated all user domain caches")
    
    # === UTILITY METHODS ===
    
    def _generate_query_hash(self, query_params: Dict) -> str:
        """Generate hash for query parameters"""
        sorted_params = sorted(query_params.items())
        query_string = json.dumps(sorted_params, sort_keys=True, default=str)
        return hashlib.md5(query_string.encode()).hexdigest()[:8]
    
    def _generate_email_hash(self, email: str) -> str:
        """Generate hash for email address (for privacy)"""
        return hashlib.md5(email.lower().encode()).hexdigest()[:8]
    
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
                    
                    # Also check sessions and analytics caches
                    if 'sessions' in pattern or 'auth_session' in pattern:
                        session_keys = self.sessions.keys(pattern)
                        if session_keys:
                            self.sessions.delete_many(session_keys)
                            logger.debug(f"Invalidated {len(session_keys)} session keys matching {pattern}")
                    
                    if 'analytics' in pattern or 'stats' in pattern:
                        analytics_keys = self.analytics.keys(pattern)
                        if analytics_keys:
                            self.analytics.delete_many(analytics_keys)
                            logger.debug(f"Invalidated {len(analytics_keys)} analytics keys matching {pattern}")
                            
                except Exception as e:
                    logger.warning(f"Could not invalidate pattern {pattern}: {e}")
            else:
                # Direct key deletion
                self.cache.delete(pattern)
                if 'auth_session' in pattern or 'active_sessions' in pattern:
                    self.sessions.delete(pattern)
                if 'stats' in pattern or 'analytics' in pattern or 'role_distribution' in pattern:
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
            
        # Serialize queryset to JSON with related data
        cached_data = []
        for obj in queryset.select_related('profile'):  # Optimize for user queries
            if hasattr(obj, 'to_dict'):
                cached_data.append(obj.to_dict())
            else:
                # Fallback to model_to_dict
                from django.forms.models import model_to_dict
                item_dict = model_to_dict(obj, exclude=['password'])  # Don't cache passwords
                
                # Add profile data if available
                if hasattr(obj, 'profile') and obj.profile:
                    profile_dict = model_to_dict(obj.profile)
                    item_dict['profile'] = profile_dict
                
                # Convert datetime fields for JSON serialization
                for key, value in item_dict.items():
                    if hasattr(value, 'isoformat'):  # datetime objects
                        item_dict[key] = value.isoformat()
                cached_data.append(item_dict)
        
        self.cache.set(cache_key, cached_data, timeout)
        logger.debug(f"Cached queryset with {len(cached_data)} items: {cache_key}")
        return cached_data
    
    def get_or_set(self, key: str, callable_func, timeout: int = None, 
                   use_sessions_cache: bool = False, 
                   use_analytics_cache: bool = False) -> Any:
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
    
    def warm_cache_for_users(self, user_ids: List[int] = None):
        """
        Warm cache for frequently accessed users
        """
        from .models import User
        from .serializers import UserSerializer
        
        if user_ids:
            users = User.objects.filter(id__in=user_ids).select_related('profile')
        else:
            # Cache all active admin users and recent clients
            users = User.objects.filter(
                is_active=True
            ).select_related('profile').order_by('-last_login')[:50]
        
        for user in users:
            serializer = UserSerializer(user)
            user_data = serializer.data
            
            self.cache_user_detail(user.id, user_data)
            self.cache_user_by_email(user.email, user_data)
            
            # Cache user permissions
            permissions_data = {
                'role': user.role,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'is_active': user.is_active
            }
            self.cache_user_permissions(user.id, permissions_data)
        
        logger.info(f"Warmed cache for {users.count()} users")
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics for monitoring"""
        try:
            cache_info = {
                'cache_type': 'Redis',
                'backend': str(self.cache.__class__),
                'sessions_backend': str(self.sessions.__class__),
                'analytics_backend': str(self.analytics.__class__),
                'key_patterns': {
                    'users': ['users:list:*', 'users:detail:*', 'users:by_email:*'],
                    'profiles': ['users:profile:*', 'users:permissions:*'],
                    'invitations': ['users:admin_invitations:*'],
                    'auth': ['users:auth_session:*', 'users:active_sessions:*', 'users:tokens:*'],
                    'security': ['users:login_attempts:*', 'users:password_reset:*'],
                    'analytics': ['users:stats:*', 'users:analytics:*', 'users:role_distribution']
                }
            }
            
            # Try to get some sample keys
            sample_keys = []
            for pattern in ['users:stats:global', 'users:role_distribution']:
                if self.analytics.get(pattern) is not None:
                    sample_keys.append(pattern)
            
            cache_info['sample_cached_keys'] = sample_keys
            cache_info['sample_keys_count'] = len(sample_keys)
            
            return cache_info
            
        except Exception as e:
            return {'error': f'Could not retrieve cache stats: {e}'}


# Global service instance
users_cache_service = UsersCacheService()