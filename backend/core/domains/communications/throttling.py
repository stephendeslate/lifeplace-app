# backend/core/domains/communications/throttling.py
"""
Rate limiting and throttling for communications domain.

This module implements DRF throttle classes to enforce the rate limits
defined in config.py and prevent abuse of communication endpoints.
"""

import logging
from django.conf import settings
from django.core.cache import cache
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

from .config import CommunicationConfig

logger = logging.getLogger(__name__)


class CommunicationBaseThrottle(UserRateThrottle):
    """Base throttle class for communication endpoints with debug mode support"""

    def allow_request(self, request, view):
        """Skip throttling in development mode if configured"""
        if settings.DEBUG and getattr(settings, 'COMMUNICATION_THROTTLE_DISABLED', True):
            return True
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        """Custom cache key that includes the action for granular rate limiting"""
        if request.user and request.user.is_authenticated:
            action = getattr(view, 'action', 'unknown')
            ident = str(request.user.pk)
        else:
            ident = self.get_ident(request)

        return self.cache_format % {
            'scope': self.scope,
            'ident': f"{ident}:{getattr(view, 'action', 'default')}"
        }


class ManualSendThrottle(CommunicationBaseThrottle):
    """
    Throttle for manual send operations.
    Limits: 60 requests per minute per user.
    """
    scope = 'communications_manual_send'

    def get_rate(self):
        """Get rate from configuration"""
        limit = CommunicationConfig.get_rate_limit('NOTIFICATIONS_PER_MINUTE')
        return f'{limit}/min'


class BulkSendThrottle(CommunicationBaseThrottle):
    """
    Throttle for bulk send operations.
    This applies per-request limits, not per-recipient.
    """
    scope = 'communications_bulk_send'

    def allow_request(self, request, view):
        """
        Check both the request rate and the recipient count.
        """
        # First check base rate limiting
        if not super().allow_request(request, view):
            return False

        # Then check recipient count limit
        recipients = request.data.get('recipients', [])
        max_recipients = CommunicationConfig.get_rate_limit('BULK_SEND_LIMIT')

        if len(recipients) > max_recipients:
            logger.warning(
                f"Bulk send rejected: {len(recipients)} recipients exceeds limit of {max_recipients}"
            )
            # Set a message for the throttle wait time
            self.wait_seconds = 0
            return False

        return True

    def get_rate(self):
        """Allow limited bulk operations per hour"""
        return '10/hour'


class TemplatePreviewThrottle(CommunicationBaseThrottle):
    """
    Throttle for template preview operations.
    Limits: 30 requests per minute per user.
    """
    scope = 'communications_preview'

    def get_rate(self):
        """Get rate from configuration"""
        limit = CommunicationConfig.get_rate_limit('TEMPLATE_PREVIEW_PER_MINUTE')
        return f'{limit}/min'


class CommunicationAdminThrottle(CommunicationBaseThrottle):
    """
    Higher rate limits for admin users.
    Admins get 5x the normal rate for most operations.
    """
    scope = 'communications_admin'

    def allow_request(self, request, view):
        """Allow higher limits for admin users"""
        if settings.DEBUG:
            return True

        # Staff users get higher limits
        if request.user and request.user.is_authenticated and request.user.is_staff:
            # Use admin-specific rate from settings
            admin_rate = (
                getattr(settings, 'REST_FRAMEWORK', {})
                .get('DEFAULT_THROTTLE_RATES', {})
                .get('communications_admin', '500/hour')
            )
            self.rate = admin_rate

        return super().allow_request(request, view)


class WebhookThrottle(AnonRateThrottle):
    """
    Throttle for webhook endpoints.
    Uses IP-based throttling since webhooks are typically from external services.
    """
    scope = 'communications_webhook'
    rate = '200/hour'

    def allow_request(self, request, view):
        """Skip throttling in development mode"""
        if settings.DEBUG:
            return True
        return super().allow_request(request, view)


class CommunicationRateLimiter:
    """
    Custom rate limiter for advanced scenarios not covered by DRF throttles.
    Uses Django cache for tracking.
    """

    # Cache key prefixes
    CACHE_PREFIX = 'communication_rate'

    @classmethod
    def check_global_rate(cls, limit_name: str) -> tuple[bool, str]:
        """
        Check if a global rate limit has been exceeded.

        Args:
            limit_name: The name of the rate limit to check

        Returns:
            tuple: (is_allowed: bool, message: str)
        """
        limit = CommunicationConfig.get_rate_limit(limit_name)
        cache_key = f"{cls.CACHE_PREFIX}:global:{limit_name}"

        current_count = cache.get(cache_key, 0)

        if current_count >= limit:
            logger.warning(f"Global rate limit exceeded for {limit_name}: {current_count}/{limit}")
            return False, f"Rate limit exceeded. Please try again later."

        return True, ""

    @classmethod
    def increment_global_counter(cls, limit_name: str, timeout: int = 60):
        """
        Increment a global rate counter.

        Args:
            limit_name: The name of the rate limit
            timeout: Cache timeout in seconds (default 60 for per-minute limits)
        """
        cache_key = f"{cls.CACHE_PREFIX}:global:{limit_name}"
        try:
            cache.incr(cache_key)
        except ValueError:
            # Key doesn't exist, create it
            cache.set(cache_key, 1, timeout=timeout)

    @classmethod
    def check_user_rate(cls, user_id: int, limit_name: str) -> tuple[bool, str]:
        """
        Check if a user-specific rate limit has been exceeded.

        Args:
            user_id: The user's ID
            limit_name: The name of the rate limit to check

        Returns:
            tuple: (is_allowed: bool, message: str)
        """
        limit = CommunicationConfig.get_rate_limit(limit_name)
        cache_key = f"{cls.CACHE_PREFIX}:user:{user_id}:{limit_name}"

        current_count = cache.get(cache_key, 0)

        if current_count >= limit:
            logger.warning(
                f"User rate limit exceeded for user {user_id}, {limit_name}: {current_count}/{limit}"
            )
            return False, f"You have exceeded the rate limit. Please try again later."

        return True, ""

    @classmethod
    def increment_user_counter(cls, user_id: int, limit_name: str, timeout: int = 60):
        """
        Increment a user-specific rate counter.

        Args:
            user_id: The user's ID
            limit_name: The name of the rate limit
            timeout: Cache timeout in seconds
        """
        cache_key = f"{cls.CACHE_PREFIX}:user:{user_id}:{limit_name}"
        try:
            cache.incr(cache_key)
        except ValueError:
            cache.set(cache_key, 1, timeout=timeout)

    @classmethod
    def check_daily_bulk_limit(cls, user_id: int, recipient_count: int) -> tuple[bool, str]:
        """
        Check if user can send to the specified number of recipients.

        Enforces a daily limit on total recipients across all bulk operations.
        """
        daily_limit = getattr(settings, 'COMMUNICATION_DAILY_RECIPIENT_LIMIT', 1000)
        cache_key = f"{cls.CACHE_PREFIX}:daily_bulk:{user_id}"

        current_count = cache.get(cache_key, 0)

        if current_count + recipient_count > daily_limit:
            remaining = max(0, daily_limit - current_count)
            return False, f"Daily recipient limit would be exceeded. You can send to {remaining} more recipients today."

        return True, ""

    @classmethod
    def record_bulk_send(cls, user_id: int, recipient_count: int):
        """
        Record a bulk send operation for rate limiting.
        """
        cache_key = f"{cls.CACHE_PREFIX}:daily_bulk:{user_id}"
        current_count = cache.get(cache_key, 0)
        # 24 hour timeout
        cache.set(cache_key, current_count + recipient_count, timeout=86400)

    @classmethod
    def get_user_stats(cls, user_id: int) -> dict:
        """
        Get rate limit statistics for a user.
        """
        stats = {}

        # Get daily bulk count
        bulk_key = f"{cls.CACHE_PREFIX}:daily_bulk:{user_id}"
        stats['daily_recipients_sent'] = cache.get(bulk_key, 0)
        stats['daily_recipient_limit'] = getattr(settings, 'COMMUNICATION_DAILY_RECIPIENT_LIMIT', 1000)

        # Get per-minute counts
        for limit_name in ['NOTIFICATIONS_PER_MINUTE', 'TEMPLATE_PREVIEW_PER_MINUTE']:
            key = f"{cls.CACHE_PREFIX}:user:{user_id}:{limit_name}"
            stats[f'{limit_name.lower()}_current'] = cache.get(key, 0)
            stats[f'{limit_name.lower()}_limit'] = CommunicationConfig.get_rate_limit(limit_name)

        return stats
