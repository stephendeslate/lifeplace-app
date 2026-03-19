# backend/core/settings/redis_conf.py
"""
Redis, Django cache, sessions, and Django Channels layer configuration.

Upstash compatible — single database, key-prefix isolation.

KEY PREFIX REFERENCE:
  Django Cache     → lifeplace:cache:
  Django Sessions  → lifeplace:session:
  Analytics Cache  → lifeplace:analytics:
  Django Channels  → lifeplace:channels:
  Celery Broker    → lifeplace:celery:        (see celery_conf.py)
  Celery Results   → lifeplace:celery-results: (see celery_conf.py)
"""
import os
import ssl
import urllib.parse

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Detect if using SSL (Upstash uses rediss:// for secure connections)
REDIS_USE_SSL = REDIS_URL.startswith("rediss://")

# Base connection pool configuration
REDIS_CONNECTION_POOL_KWARGS = {
    "max_connections": 50,
    "retry_on_timeout": True,
}

if REDIS_USE_SSL:
    REDIS_CONNECTION_POOL_KWARGS["ssl_cert_reqs"] = ssl.CERT_REQUIRED

# Strip any database number from URL for Upstash compatibility
redis_parsed = urllib.parse.urlparse(REDIS_URL)

if redis_parsed.path and redis_parsed.path not in ("", "/"):
    REDIS_URL_CLEAN = f"{redis_parsed.scheme}://"
    if redis_parsed.username:
        REDIS_URL_CLEAN += f"{redis_parsed.username}"
        if redis_parsed.password:
            REDIS_URL_CLEAN += f":{redis_parsed.password}"
        REDIS_URL_CLEAN += "@"
    REDIS_URL_CLEAN += f"{redis_parsed.hostname}"
    if redis_parsed.port:
        REDIS_URL_CLEAN += f":{redis_parsed.port}"
else:
    REDIS_URL_CLEAN = REDIS_URL

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL_CLEAN,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": REDIS_CONNECTION_POOL_KWARGS,
            "SERIALIZER": "django_redis.serializers.json.JSONSerializer",
            "SOCKET_CONNECT_TIMEOUT": 10,
            "SOCKET_TIMEOUT": 10,
            "COMPRESSOR": "django_redis.compressors.zlib.ZlibCompressor",
            "IGNORE_EXCEPTIONS": True,
        },
        "KEY_PREFIX": "lifeplace:cache",
        "TIMEOUT": 600,
    },
    "sessions": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL_CLEAN,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": REDIS_CONNECTION_POOL_KWARGS,
            "SERIALIZER": "django_redis.serializers.json.JSONSerializer",
        },
        "KEY_PREFIX": "lifeplace:session",
        "TIMEOUT": 86400,
    },
    "analytics": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL_CLEAN,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": REDIS_CONNECTION_POOL_KWARGS,
            "SERIALIZER": "django_redis.serializers.json.JSONSerializer",
        },
        "KEY_PREFIX": "lifeplace:analytics",
        "TIMEOUT": 3600,
    },
}

# Database-backed sessions for security
SESSION_ENGINE = "django.contrib.sessions.backends.db"

# Django Channels Layer Configuration
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL_CLEAN],
            "prefix": "lifeplace:channels:",
            "capacity": 1500,
            "expiry": 60,
        },
    },
}
