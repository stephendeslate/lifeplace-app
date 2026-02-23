# backend/core/domains/notifications/security.py

import html
import logging
import re
from typing import Any

from django.conf import settings
from django.core.cache import cache
from rest_framework.throttling import UserRateThrottle

logger = logging.getLogger(__name__)


class NotificationSecurityService:
    """Security service for notifications with content sanitization and validation"""

    # Allowed HTML tags for rich notifications (very limited)
    ALLOWED_TAGS = {"b", "strong", "i", "em", "u", "br", "p"}

    # Maximum lengths
    MAX_TITLE_LENGTH = getattr(settings, "NOTIFICATION_MAX_TITLE_LENGTH", 255)
    MAX_CONTENT_LENGTH = getattr(settings, "NOTIFICATION_MAX_CONTENT_LENGTH", 1000)
    MAX_URL_LENGTH = 500

    @classmethod
    def sanitize_content(cls, content: str) -> str:
        """Sanitize notification content to prevent XSS and injection attacks"""
        if not content:
            return ""

        # First, escape all HTML
        sanitized = html.escape(content)

        # Limit length
        if len(sanitized) > cls.MAX_CONTENT_LENGTH:
            sanitized = sanitized[: cls.MAX_CONTENT_LENGTH - 3] + "..."
            logger.warning(f"Notification content truncated to {cls.MAX_CONTENT_LENGTH} characters")

        # Remove or replace potentially dangerous patterns
        dangerous_patterns = [
            r"javascript:",
            r"data:",
            r"vbscript:",
            r"on\w+\s*=",  # Event handlers like onclick=
            r"<script",
            r"</script>",
            r"<iframe",
            r"<object",
            r"<embed",
        ]

        for pattern in dangerous_patterns:
            sanitized = re.sub(pattern, "", sanitized, flags=re.IGNORECASE)

        return sanitized.strip()

    @classmethod
    def sanitize_title(cls, title: str) -> str:
        """Sanitize notification title"""
        if not title:
            return ""

        # Escape HTML and limit length
        sanitized = html.escape(title)

        if len(sanitized) > cls.MAX_TITLE_LENGTH:
            sanitized = sanitized[: cls.MAX_TITLE_LENGTH - 3] + "..."
            logger.warning(f"Notification title truncated to {cls.MAX_TITLE_LENGTH} characters")

        # Remove line breaks from titles
        sanitized = re.sub(r"[\r\n]+", " ", sanitized)

        return sanitized.strip()

    @classmethod
    def validate_action_url(cls, url: str) -> str | None:
        """Validate and sanitize action URLs"""
        if not url:
            return None

        url = url.strip()

        # Length check
        if len(url) > cls.MAX_URL_LENGTH:
            logger.warning(f"Action URL too long: {len(url)} characters")
            return None

        # Only allow specific protocols
        allowed_protocols = ["http:", "https:", "/"]  # Relative URLs are allowed

        if not any(url.startswith(protocol) for protocol in allowed_protocols):
            logger.warning(f"Invalid URL protocol: {url}")
            return None

        # Block suspicious patterns
        suspicious_patterns = [
            r"javascript:",
            r"data:",
            r"vbscript:",
            r"file:",
            r"ftp:",
        ]

        for pattern in suspicious_patterns:
            if re.search(pattern, url, re.IGNORECASE):
                logger.warning(f"Blocked suspicious URL pattern: {pattern}")
                return None

        return url

    @classmethod
    def validate_context_data(cls, context: dict[str, Any]) -> dict[str, Any]:
        """Validate and sanitize context data"""
        if not context:
            return {}

        sanitized_context = {}

        for key, value in context.items():
            # Sanitize key
            clean_key = re.sub(r"[^\w\-_]", "", str(key))
            if clean_key != str(key):
                logger.warning(f"Context key sanitized: {key} -> {clean_key}")

            # Sanitize value based on type
            if isinstance(value, str):
                # For string values, apply content sanitization
                clean_value = cls.sanitize_content(value)
            elif isinstance(value, (int, float, bool)):
                # Numeric and boolean values are safe
                clean_value = value
            elif isinstance(value, (list, tuple)):
                # For lists, sanitize each string element
                clean_value = []
                for item in value:
                    if isinstance(item, str):
                        clean_value.append(cls.sanitize_content(item))
                    elif isinstance(item, (int, float, bool)):
                        clean_value.append(item)
                    else:
                        # Skip complex objects
                        logger.warning(f"Skipped complex object in context list: {type(item)}")
            elif isinstance(value, dict):
                # Recursively sanitize dictionaries (limited depth)
                clean_value = cls._sanitize_dict(value, depth=0, max_depth=2)
            else:
                # Skip other types
                logger.warning(f"Skipped unsupported context value type: {type(value)}")
                continue

            sanitized_context[clean_key] = clean_value

        return sanitized_context

    @classmethod
    def _sanitize_dict(cls, data: dict, depth: int = 0, max_depth: int = 2) -> dict:
        """Recursively sanitize dictionary with depth limit"""
        if depth > max_depth:
            logger.warning("Max context depth reached, truncating")
            return {}

        sanitized = {}
        for key, value in data.items():
            clean_key = re.sub(r"[^\w\-_]", "", str(key))

            if isinstance(value, str):
                sanitized[clean_key] = cls.sanitize_content(value)
            elif isinstance(value, (int, float, bool)):
                sanitized[clean_key] = value
            elif isinstance(value, dict):
                sanitized[clean_key] = cls._sanitize_dict(value, depth + 1, max_depth)
            elif isinstance(value, (list, tuple)):
                clean_list = []
                for item in value[:10]:  # Limit list size
                    if isinstance(item, str):
                        clean_list.append(cls.sanitize_content(item))
                    elif isinstance(item, (int, float, bool)):
                        clean_list.append(item)
                sanitized[clean_key] = clean_list

        return sanitized


class NotificationRateLimiter:
    """Rate limiting for notification creation and actions"""

    @classmethod
    def check_creation_limit(cls, user_id: int, notification_type_code: str) -> tuple[bool, str | None]:
        """Check if user can create a notification of this type"""

        # Skip rate limiting in development/load test mode
        if settings.DEBUG or settings.LOAD_TEST_MODE:
            return True, None

        # Global rate limit (per user per hour)
        global_key = f"notification_rate_global:{user_id}"
        global_count = cache.get(global_key, 0)
        global_limit = getattr(settings, "NOTIFICATION_GLOBAL_RATE_LIMIT", 100)

        if global_count >= global_limit:
            return False, f"Global notification limit exceeded ({global_limit}/hour)"

        # Type-specific rate limit
        type_key = f"notification_rate_type:{user_id}:{notification_type_code}"
        type_count = cache.get(type_key, 0)
        type_limit = getattr(settings, "NOTIFICATION_TYPE_RATE_LIMIT", 20)

        if type_count >= type_limit:
            return False, f"Type-specific notification limit exceeded ({type_limit}/hour)"

        # Check for spam patterns (same content recently)
        spam_key = f"notification_spam:{user_id}:{hash(notification_type_code)}"
        if cache.get(spam_key):
            return False, "Duplicate notification detected (spam protection)"

        return True, None

    @classmethod
    def record_creation(cls, user_id: int, notification_type_code: str, title: str):
        """Record a notification creation for rate limiting"""

        # Increment global counter
        global_key = f"notification_rate_global:{user_id}"
        current_global = cache.get(global_key, 0)
        cache.set(global_key, current_global + 1, timeout=3600)  # 1 hour

        # Increment type-specific counter
        type_key = f"notification_rate_type:{user_id}:{notification_type_code}"
        current_type = cache.get(type_key, 0)
        cache.set(type_key, current_type + 1, timeout=3600)  # 1 hour

        # Set spam protection (prevent exact duplicates for 5 minutes)
        spam_key = f"notification_spam:{user_id}:{hash(notification_type_code + title)}"
        cache.set(spam_key, True, timeout=300)  # 5 minutes

    @classmethod
    def check_bulk_limit(cls, user_id: int, recipient_count: int) -> tuple[bool, str | None]:
        """Check if user can send bulk notifications"""

        # Daily bulk notification limit
        daily_key = f"notification_bulk_daily:{user_id}"
        daily_count = cache.get(daily_key, 0)
        daily_limit = getattr(settings, "NOTIFICATION_BULK_DAILY_LIMIT", 1000)

        if daily_count + recipient_count > daily_limit:
            return False, f"Daily bulk notification limit would be exceeded ({daily_limit}/day)"

        # Hourly bulk notification limit
        hourly_key = f"notification_bulk_hourly:{user_id}"
        hourly_count = cache.get(hourly_key, 0)
        hourly_limit = getattr(settings, "NOTIFICATION_BULK_HOURLY_LIMIT", 200)

        if hourly_count + recipient_count > hourly_limit:
            return False, f"Hourly bulk notification limit would be exceeded ({hourly_limit}/hour)"

        return True, None

    @classmethod
    def record_bulk_creation(cls, user_id: int, recipient_count: int):
        """Record bulk notification creation"""

        # Update daily counter
        daily_key = f"notification_bulk_daily:{user_id}"
        daily_count = cache.get(daily_key, 0)
        cache.set(daily_key, daily_count + recipient_count, timeout=86400)  # 24 hours

        # Update hourly counter
        hourly_key = f"notification_bulk_hourly:{user_id}"
        hourly_count = cache.get(hourly_key, 0)
        cache.set(hourly_key, hourly_count + recipient_count, timeout=3600)  # 1 hour


class NotificationThrottle(UserRateThrottle):
    """Custom throttle for notification API endpoints"""

    scope = "notifications"

    def allow_request(self, request, view):
        """Skip throttling in development/load test mode"""
        if settings.DEBUG or settings.LOAD_TEST_MODE:
            return True
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        """Custom cache key that includes the action"""
        if request.user and request.user.is_authenticated:
            getattr(view, "action", "unknown")
            ident = str(request.user.pk)
        else:
            ident = self.get_ident(request)

        return self.cache_format % {"scope": self.scope, "ident": ident + ":" + getattr(view, "action", "default")}


class NotificationAdminThrottle(UserRateThrottle):
    """Higher rate limits for admin users"""

    scope = "notifications_admin"

    def allow_request(self, request, view):
        """Skip throttling in development/load test mode, allow higher limits for admin users"""
        if settings.DEBUG or settings.LOAD_TEST_MODE:
            return True

        if request.user and request.user.is_authenticated and request.user.is_staff:
            # Use admin-specific rate limit
            original_rate = self.rate
            self.rate = (
                getattr(settings, "REST_FRAMEWORK", {})
                .get("DEFAULT_THROTTLE_RATES", {})
                .get("notifications_admin", "500/hour")
            )
            allowed = super().allow_request(request, view)
            self.rate = original_rate
            return allowed

        return super().allow_request(request, view)


class NotificationContentValidator:
    """Validate notification content for business rules"""

    FORBIDDEN_WORDS = [
        # Add any words that should not appear in notifications
        "password",
        "secret",
        "token",
        "key",
        "private",
    ]

    @classmethod
    def validate_notification_data(cls, data: dict[str, Any]) -> tuple[bool, list[str]]:
        """Validate notification data against business rules"""
        errors = []

        # Check for forbidden content
        title = data.get("title", "")
        content = data.get("content", "")

        for word in cls.FORBIDDEN_WORDS:
            if word.lower() in title.lower() or word.lower() in content.lower():
                errors.append(f"Content contains forbidden word: {word}")

        # Check for excessive capitalization (might indicate spam)
        if title and len([c for c in title if c.isupper()]) / len(title) > 0.7:
            errors.append("Title contains excessive capitalization")

        # Check for suspicious patterns
        if title and title.count("!") > 3:
            errors.append("Title contains excessive exclamation marks")

        # Validate action URL if present
        action_url = data.get("action_url")
        if action_url:
            validated_url = NotificationSecurityService.validate_action_url(action_url)
            if not validated_url:
                errors.append("Invalid action URL")

        return len(errors) == 0, errors
