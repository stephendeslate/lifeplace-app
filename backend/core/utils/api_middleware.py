# backend/core/utils/api_middleware.py
"""
API middleware for idempotency, caching, and other HTTP improvements.
"""

import hashlib
import json
import logging

from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest, HttpResponse, JsonResponse, StreamingHttpResponse
from django.utils.http import quote_etag

logger = logging.getLogger(__name__)

# Idempotency key TTL: 24 hours
IDEMPOTENCY_KEY_TTL = 60 * 60 * 24

# Methods that support idempotency
IDEMPOTENT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Header names
IDEMPOTENCY_KEY_HEADER = "HTTP_IDEMPOTENCY_KEY"
ETAG_HEADER = "ETag"
IF_NONE_MATCH_HEADER = "HTTP_IF_NONE_MATCH"


class IdempotencyMiddleware:
    """
    Middleware to handle idempotent requests using the Idempotency-Key header.

    For POST/PUT/PATCH/DELETE requests with an Idempotency-Key header:
    1. Check if we've seen this key before
    2. If yes, return the cached response
    3. If no, process the request and cache the response

    Keys are stored in Redis with a 24-hour TTL.

    Usage:
        Include 'Idempotency-Key: <unique-key>' header in requests.
        The key should be unique per operation (e.g., UUID).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Only apply to write methods
        if request.method not in IDEMPOTENT_METHODS:
            return self.get_response(request)

        # Check for idempotency key header
        idempotency_key = request.META.get(IDEMPOTENCY_KEY_HEADER)

        if not idempotency_key:
            # No key provided, process normally
            return self.get_response(request)

        # Validate key format (should be a reasonable string)
        if len(idempotency_key) > 255 or len(idempotency_key) < 16:
            return JsonResponse(
                {"error": "Invalid Idempotency-Key", "detail": "Idempotency-Key must be between 16 and 255 characters"},
                status=400,
            )

        # Generate cache key including user info for isolation
        cache_key = self._get_cache_key(request, idempotency_key)

        # Check for cached response
        cached_response = self._get_cached_response(cache_key)
        if cached_response is not None:
            logger.info(f"Returning cached response for idempotency key: {idempotency_key[:8]}...")
            return cached_response

        # Process the request
        response = self.get_response(request)

        # Only cache successful responses — caching 4xx errors would prevent
        # clients from recovering by retrying with the same idempotency key.
        if 200 <= response.status_code < 300:
            self._cache_response(cache_key, response, idempotency_key)

        return response

    def _get_cache_key(self, request: HttpRequest, idempotency_key: str) -> str:
        """
        Generate a cache key for the idempotency lookup.

        Includes:
        - The idempotency key
        - User ID (if authenticated) for user isolation
        - Request path for additional safety
        """
        user_id = getattr(request.user, "id", "anonymous")
        path = request.path

        # Hash the components for a predictable key length
        key_data = f"{idempotency_key}:{user_id}:{path}"
        key_hash = hashlib.sha256(key_data.encode()).hexdigest()[:32]

        return f"lifeplace:idempotency:{key_hash}"

    def _get_cached_response(self, cache_key: str) -> HttpResponse | None:
        """
        Retrieve a cached response if available.
        """
        try:
            cached_data = cache.get(cache_key)
            if cached_data is None:
                return None

            # Reconstruct the response
            response = JsonResponse(
                cached_data["body"],
                status=cached_data["status"],
                safe=False,  # Allow non-dict JSON
            )

            # Add headers
            for header, value in cached_data.get("headers", {}).items():
                response[header] = value

            # Add marker header
            response["X-Idempotent-Replay"] = "true"

            return response

        except Exception as e:
            logger.error(f"Error retrieving cached idempotency response: {e}")
            return None

    def _cache_response(self, cache_key: str, response: HttpResponse, idempotency_key: str):
        """
        Cache the response for future idempotent requests.
        """
        try:
            # Skip streaming responses (FileResponse, etc.) — accessing
            # .content would read the entire stream into memory.
            if isinstance(response, StreamingHttpResponse):
                return

            # Only cache JSON responses
            content_type = response.get("Content-Type", "")
            if "application/json" not in content_type:
                logger.debug(f"Not caching non-JSON response for idempotency key: {idempotency_key[:8]}...")
                return

            # Parse the response body
            try:
                body = json.loads(response.content.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                logger.debug(f"Could not parse response body for caching: {idempotency_key[:8]}...")
                return

            # Extract relevant headers
            headers = {
                "Content-Type": content_type,
            }

            # Cache the response data
            cache_data = {
                "status": response.status_code,
                "body": body,
                "headers": headers,
            }

            cache.set(cache_key, cache_data, timeout=IDEMPOTENCY_KEY_TTL)
            logger.debug(f"Cached response for idempotency key: {idempotency_key[:8]}...")

        except Exception as e:
            logger.error(f"Error caching idempotency response: {e}")


class ETagMiddleware:
    """
    Middleware to add ETag headers to GET responses and handle conditional requests.

    For GET requests:
    1. Generate an ETag based on response content
    2. Check If-None-Match header
    3. Return 304 Not Modified if ETag matches

    This reduces bandwidth by allowing clients to cache responses.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Only apply to GET requests
        if request.method != "GET":
            return self.get_response(request)

        # Skip for non-API requests
        if not request.path.startswith("/api/"):
            return self.get_response(request)

        # Get the response
        response = self.get_response(request)

        # Only add ETag to successful JSON responses
        if response.status_code != 200:
            return response

        content_type = response.get("Content-Type", "")
        if "application/json" not in content_type:
            return response

        # Generate ETag from response content
        etag = self._generate_etag(response.content)

        # Check If-None-Match header
        if_none_match = request.META.get(IF_NONE_MATCH_HEADER)
        if if_none_match:
            # Remove quotes and compare
            client_etag = if_none_match.strip('"').strip("'")
            if client_etag == etag.strip('"'):
                # Resource hasn't changed
                return HttpResponse(status=304)

        # Add ETag to response
        response[ETAG_HEADER] = quote_etag(etag)
        response["Cache-Control"] = "private, must-revalidate"

        return response

    def _generate_etag(self, content: bytes) -> str:
        """
        Generate an ETag based on response content.

        Uses MD5 hash of content for fast generation.
        The 'W/' prefix indicates a weak ETag (semantic equivalence).
        """
        content_hash = hashlib.md5(content).hexdigest()
        return f'W/"{content_hash}"'


class TrustedProxyMiddleware:
    """
    Middleware to properly extract client IP from X-Forwarded-For when behind trusted proxies.

    This middleware:
    1. Validates that the direct connection is from a trusted proxy
    2. Extracts the real client IP from X-Forwarded-For header
    3. Sets request.META['REMOTE_ADDR'] to the real client IP

    SECURITY: Only trusts X-Forwarded-For from known proxy networks to prevent
    IP spoofing attacks. Spoofed IPs could bypass rate limiting or IP-based security.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self._init_trusted_networks()

    def _init_trusted_networks(self):
        """Initialize trusted proxy network ranges"""
        import ipaddress

        self.trusted_networks = []

        # Get trusted networks from settings
        trusted_cidr_list = getattr(
            settings,
            "TRUSTED_PROXY_NETWORKS",
            [
                "127.0.0.1/32",
                "172.16.0.0/12",
                "10.0.0.0/8",
                "192.168.0.0/16",
            ],
        )

        for cidr in trusted_cidr_list:
            try:
                cidr = cidr.strip()
                if cidr:
                    self.trusted_networks.append(ipaddress.ip_network(cidr, strict=False))
            except ValueError as e:
                logger.warning(f"Invalid CIDR in TRUSTED_PROXY_NETWORKS: {cidr} - {e}")

        # Get number of proxies to trust
        self.num_proxies = getattr(settings, "NUM_PROXIES", 1)

    def _is_trusted_proxy(self, ip_str: str) -> bool:
        """Check if an IP address belongs to a trusted proxy network"""
        import ipaddress

        try:
            ip = ipaddress.ip_address(ip_str)
            return any(ip in network for network in self.trusted_networks)
        except ValueError:
            return False

    def _get_client_ip(self, request: HttpRequest) -> str:
        """
        Extract the real client IP address from the request.

        Algorithm:
        1. Get the direct connection IP (REMOTE_ADDR)
        2. If it's from a trusted proxy, parse X-Forwarded-For
        3. Return the first untrusted IP in the chain (the real client)
        4. If all IPs are trusted, return the leftmost IP
        """
        remote_addr = request.META.get("REMOTE_ADDR", "")

        # If direct connection isn't from a trusted proxy, use it directly
        if not self._is_trusted_proxy(remote_addr):
            return remote_addr

        # Get X-Forwarded-For header
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if not x_forwarded_for:
            return remote_addr

        # Parse the IP chain (leftmost is client, rightmost is closest proxy)
        # Format: "client_ip, proxy1_ip, proxy2_ip"
        ip_chain = [ip.strip() for ip in x_forwarded_for.split(",") if ip.strip()]

        if not ip_chain:
            return remote_addr

        # Walk from right to left (closest to farthest) and find first untrusted IP
        # This is the real client IP
        for ip in reversed(ip_chain):
            if not self._is_trusted_proxy(ip):
                return ip

        # All IPs are trusted proxies, return the leftmost (original client position)
        return ip_chain[0]

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Store original REMOTE_ADDR for debugging
        original_remote_addr = request.META.get("REMOTE_ADDR", "")

        # Get the real client IP
        client_ip = self._get_client_ip(request)

        # Update REMOTE_ADDR so Django's built-in rate limiting works correctly
        request.META["REMOTE_ADDR"] = client_ip

        # Store original for audit purposes
        request.META["HTTP_X_ORIGINAL_REMOTE_ADDR"] = original_remote_addr

        return self.get_response(request)


# Add Idempotency-Key to CORS allowed headers
def get_cors_allow_headers():
    """
    Returns the list of allowed CORS headers including Idempotency-Key.

    This should be added to CORS_ALLOW_HEADERS in settings.py.
    """
    return [
        "accept",
        "accept-encoding",
        "authorization",
        "content-type",
        "dnt",
        "origin",
        "user-agent",
        "x-csrftoken",
        "x-requested-with",
        "idempotency-key",  # For idempotent requests
        "if-none-match",  # For ETag conditional requests
    ]
