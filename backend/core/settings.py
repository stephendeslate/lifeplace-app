# backend/core/settings.py

from datetime import timedelta
import os
import logging
import ssl
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

# Load environment variables
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Environment
ENV = os.getenv('ENV', 'development')
IS_PRODUCTION = ENV == 'production'

# Deploy secret for CI/CD deployment recording API
DEPLOY_SECRET = os.getenv('DEPLOY_SECRET', '')

# Check if we're running collectstatic during Docker build
import sys
IS_COLLECTING_STATIC = len(sys.argv) > 1 and 'collectstatic' in sys.argv

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if IS_PRODUCTION and not IS_COLLECTING_STATIC:
        raise ValueError("SECRET_KEY environment variable is required in production")
    else:
        # Generate a temporary key for development if not set
        SECRET_KEY = 'django-insecure-development-only-key-replace-in-production'
        if not IS_COLLECTING_STATIC:
            print("WARNING: Using temporary SECRET_KEY for development. Set SECRET_KEY environment variable.")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',') if os.getenv('ALLOWED_HOSTS') else []

# Add common development hosts
if DEBUG:
    ALLOWED_HOSTS.extend(['localhost', '127.0.0.1', 'testserver'])
else:
    # Ensure production has at least localhost
    if not ALLOWED_HOSTS:
        ALLOWED_HOSTS = ['localhost', '127.0.0.1']
CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if os.getenv('CSRF_TRUSTED_ORIGINS') else []

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Application definition

INSTALLED_APPS = [
    'core',
    'core.domains.users',
    'core.domains.communications',
    'core.domains.clients',
    'core.domains.events',
    'core.domains.products',
    'core.domains.venues',  # Venue management and operating rules
    'core.domains.vendors',  # Vendor/service provider management
    'core.domains.questionnaires',
    'core.domains.contracts',
    'core.domains.sales',
    'core.domains.payments',
    'core.domains.workflows',
    'core.domains.bookingflow',
    'core.domains.notes',
    'core.domains.notifications',
    'core.domains.analytics',
    'core.domains.settings',  # Currency and application settings management
    'core.domains.messaging',  # Real-time messaging system
    'core.domains.vip',  # VIP & Loyalty program
    'core.domains.security',  # Security & breach management
    'core.infrastructure',  # Infrastructure: DLQ, circuit breakers, health checks
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_celery_beat',
    'corsheaders',
    'channels',  # Django Channels for WebSocket support
    'storages',  # Cloud storage (Cloudflare R2)
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # SECURITY: JWT token blacklisting
    'drf_spectacular',  # OpenAPI schema generation
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'core.utils.api_middleware.TrustedProxyMiddleware',  # SECURITY: Extract real client IP from trusted proxies
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'core.utils.security.SecurityMiddleware',  # Custom security middleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.utils.security.AdminLoggingMiddleware',  # Admin action logging
    'core.utils.api_middleware.IdempotencyMiddleware',  # Idempotent request handling
    'core.utils.api_middleware.ETagMiddleware',  # ETag caching for GET requests
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# Django Channels ASGI Configuration
ASGI_APPLICATION = 'core.asgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    if IS_PRODUCTION and not IS_COLLECTING_STATIC:
        raise ValueError("DATABASE_URL environment variable is required in production")
    else:
        DATABASE_URL = 'postgres://localhost:5432/lifeplace-app'

DATABASES = {
    'default': {
        **dj_database_url.parse(DATABASE_URL),
        'CONN_MAX_AGE': 600,  # Keep connections alive for 10 minutes
        'CONN_HEALTH_CHECKS': True,  # Verify connections before use (Django 4.1+)
    }
}

# SECURITY: Require SSL for database connections in production
# Exception: Fly.io internal networking (.flycast/.internal) uses WireGuard encryption
if IS_PRODUCTION:
    DATABASES['default']['OPTIONS'] = DATABASES['default'].get('OPTIONS', {})
    # Fly Postgres internal connections don't need SSL (already encrypted via WireGuard)
    if '.flycast' in DATABASE_URL or '.internal' in DATABASE_URL:
        DATABASES['default']['OPTIONS']['sslmode'] = 'disable'
    else:
        DATABASES['default']['OPTIONS']['sslmode'] = 'require'


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Manila'  # All events happen in the Philippines

USE_I18N = True

# Disable timezone support - all datetimes are treated as Asia/Manila local time
# This simplifies the codebase since the business operates entirely in one timezone
USE_TZ = False


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files (uploaded images)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Cloud Storage Configuration (Production - Cloudflare R2)
# Django 5.x uses STORAGES dict instead of deprecated DEFAULT_FILE_STORAGE
if IS_PRODUCTION:
    AWS_ACCESS_KEY_ID = os.getenv('R2_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.getenv('R2_BUCKET_NAME', 'lifeplace-media')
    AWS_S3_ENDPOINT_URL = os.getenv('R2_ENDPOINT_URL')
    AWS_S3_REGION_NAME = 'auto'
    AWS_DEFAULT_ACL = 'public-read'
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_CUSTOM_DOMAIN = os.getenv('R2_PUBLIC_URL')
    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'

    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
else:
    # Development - use local filesystem storage
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings
if IS_PRODUCTION:
    # Production CORS origins - will be set via environment variables
    CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') if os.getenv('CORS_ALLOWED_ORIGINS') else []
    CORS_ALLOW_CREDENTIALS = True
else:
    # Development CORS origins
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",   # admin-crm
        "http://localhost:5174",   # client-portal
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://192.168.1.76:5173",
        "http://192.168.1.76:5174",
    ]
    CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'idempotency-key',  # For idempotent requests (Section 10.2)
    'if-none-match',    # For ETag conditional requests (Section 10.3)
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET', 
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Cookie security settings (apply to all environments)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'

# Production-specific settings
if IS_PRODUCTION:
    # Security settings - proxy handles SSL termination
    SECURE_SSL_REDIRECT = False  # Proxy handles SSL termination
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # Trust proxy headers
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# =============================================================================
# Trusted Proxy Configuration
# =============================================================================
# For rate limiting and logging to work correctly behind a reverse proxy,
# we need to trust the X-Forwarded-For header from known load balancers.
#
# Fly.io proxy IPs are in the 172.16.0.0/12 range (internal network)
# Only trust headers from these known proxies to prevent IP spoofing.
# =============================================================================

# Number of proxies to trust in X-Forwarded-For chain
# Set to 1 for Fly.io (single proxy layer)
# Increase if you add more proxy layers (e.g., Cloudflare + Fly.io = 2)
NUM_PROXIES = int(os.getenv('NUM_PROXIES', '1'))

# Custom setting for trusted proxy networks (used by custom middleware)
# Format: comma-separated CIDR ranges
# Fly.io internal network uses 172.16.0.0/12 for proxy-to-app communication
TRUSTED_PROXY_NETWORKS = os.getenv(
    'TRUSTED_PROXY_NETWORKS',
    '127.0.0.1/32,172.16.0.0/12,10.0.0.0/8,192.168.0.0/16'
).split(',')

# Use X-Forwarded-For header for determining client IP
# This is handled by our custom TrustedProxyMiddleware
USE_X_FORWARDED_HOST = True

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # OpenAPI Schema Generation
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    # Pagination
    'DEFAULT_PAGINATION_CLASS': 'core.utils.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 25,  # Default page size
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',  # This enables the browsable API
    ],
    # SECURITY FIX: Default throttle classes - ensures ALL endpoints have rate limiting
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    # Throttling rates - disabled in development
    'DEFAULT_THROTTLE_RATES': {
        'analytics': '999999/hour' if DEBUG else '1000/hour',
        'public_tracking': '999999/hour' if DEBUG else '100/hour',
        'admin_analytics': '999999/hour' if DEBUG else '2000/hour',
        'anon': '999999/hour' if DEBUG else '100/hour',
        'user': '999999/hour' if DEBUG else '1000/hour',
        'notifications': '999999/hour' if DEBUG else '200/hour',
        'notifications_admin': '999999/hour' if DEBUG else '500/hour',
        # Communications domain throttle rates
        'communications_manual_send': '999999/min' if DEBUG else '60/min',
        'communications_bulk_send': '999999/hour' if DEBUG else '10/hour',
        'communications_preview': '999999/min' if DEBUG else '30/min',
        'communications_admin': '999999/hour' if DEBUG else '500/hour',
        'communications_webhook': '999999/hour' if DEBUG else '200/hour',
        # DPA Compliance throttle rates
        'data_export': '999999/day' if DEBUG else '1/day',  # Limit data exports to 1/day
        'data_access': '999999/hour' if DEBUG else '10/hour',  # Limit data access requests
        'account_deletion': '999999/day' if DEBUG else '1/day',  # Limit deletion requests
        'data_correction': '999999/day' if DEBUG else '5/day',  # Limit correction requests
        'processing_objection': '999999/day' if DEBUG else '3/day',  # Limit objection requests
        'consent_management': '999999/hour' if DEBUG else '20/hour',  # Limit consent operations
    },
}

# Communications throttle disabled in debug mode by default
COMMUNICATION_THROTTLE_DISABLED = DEBUG

# =============================================================================
# DRF-SPECTACULAR (OpenAPI) SETTINGS
# =============================================================================
SPECTACULAR_SETTINGS = {
    'TITLE': 'LifePlace API',
    'DESCRIPTION': '''API documentation for the LifePlace event management platform.

## Timezone Handling

**IMPORTANT:** All datetime fields in this API use **Philippine Time (PHT / Asia/Manila / UTC+8)**.

- All event datetimes represent times at the physical venue in the Philippines
- The Philippines does NOT observe daylight saving time (constant UTC+8 year-round)
- All API responses include `timezone` and `timezone_offset` fields for clarity
- When sending datetime values, send in ISO 8601 format (timezone will be interpreted as PHT)

### Example Response
```json
{
  "id": 123,
  "start_date": "2026-03-15T18:00:00",
  "end_date": "2026-03-16T02:00:00",
  "timezone": "Asia/Manila",
  "timezone_offset": "+08:00"
}
```

For clients in different timezones, convert to your local time on the client side using the provided timezone information.
    ''',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
    },
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': r'/api/',
    # Authentication
    'SECURITY': [
        {'Bearer': []},
    ],
    'APPEND_COMPONENTS': {
        'securitySchemes': {
            'Bearer': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
                'description': 'JWT Authorization header using the Bearer scheme',
            }
        }
    },
    # Tags for organization
    'TAGS': [
        {'name': 'users', 'description': 'User authentication and management'},
        {'name': 'clients', 'description': 'Client management'},
        {'name': 'events', 'description': 'Event management'},
        {'name': 'payments', 'description': 'Payment processing'},
        {'name': 'bookingflow', 'description': 'Booking flow management'},
        {'name': 'contracts', 'description': 'Contract management'},
        {'name': 'communications', 'description': 'Email and messaging'},
        {'name': 'notifications', 'description': 'Push and in-app notifications'},
        {'name': 'analytics', 'description': 'Analytics and reporting'},
        {'name': 'settings', 'description': 'Application settings'},
    ],
    # Enum naming for better schema
    'ENUM_NAME_OVERRIDES': {},
    # Exclude certain paths
    'PREPROCESSING_HOOKS': [],
    'POSTPROCESSING_HOOKS': [],
}

# Communications daily recipient limit for bulk sends
COMMUNICATION_DAILY_RECIPIENT_LIMIT = 1000

# Communications webhook security settings
# In production, require webhook signature verification (default: True in production)
COMMUNICATIONS_ENFORCE_WEBHOOK_SIGNATURE = not DEBUG

# Brevo webhook secret (should be set in environment for production)
BREVO_WEBHOOK_SECRET = os.getenv('BREVO_WEBHOOK_SECRET', None)

# =============================================================================
# REDIS CONFIGURATION (Upstash Compatible - Single Database)
# =============================================================================
# Upstash only supports a single Redis database (DB 0). All isolation is
# achieved through key prefixes instead of separate databases.
#
# KEY PREFIX REFERENCE:
# ┌─────────────────────────────────────────────────────────────────────────┐
# │ Service              │ Key Prefix                  │ Purpose            │
# ├─────────────────────────────────────────────────────────────────────────┤
# │ Django Cache         │ lifeplace:cache:            │ General app cache  │
# │ Django Sessions      │ lifeplace:session:          │ User sessions      │
# │ Analytics Cache      │ lifeplace:analytics:        │ Analytics data     │
# │ Django Channels      │ lifeplace:channels:         │ WebSocket layers   │
# │ Celery Broker        │ lifeplace:celery:           │ Task queue         │
# │ Celery Results       │ lifeplace:celery-results:   │ Task results       │
# └─────────────────────────────────────────────────────────────────────────┘
#
# All services use the same REDIS_URL without database suffix (e.g., /0, /1).
# =============================================================================

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

# Detect if using SSL (Upstash uses rediss:// for secure connections)
REDIS_USE_SSL = REDIS_URL.startswith('rediss://')

# Base connection pool configuration
REDIS_CONNECTION_POOL_KWARGS = {
    'max_connections': 50,
    'retry_on_timeout': True,  # Automatically retry on timeout errors
}

# Add SSL configuration for Upstash (production with rediss://)
if REDIS_USE_SSL:
    # SECURITY: Require certificate verification in production
    # For Upstash, certificates are valid and should be verified
    REDIS_CONNECTION_POOL_KWARGS['ssl_cert_reqs'] = ssl.CERT_REQUIRED

# Parse Redis URL for additional config if needed
import urllib.parse
redis_parsed = urllib.parse.urlparse(REDIS_URL)

# Ensure REDIS_URL doesn't have a database suffix (Upstash compatibility)
# Strip any existing database number from the URL
if redis_parsed.path and redis_parsed.path not in ('', '/'):
    # URL has a database number, strip it for Upstash compatibility
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
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL_CLEAN,  # Upstash: No database suffix needed
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': REDIS_CONNECTION_POOL_KWARGS,
            # Note: HiRedis is auto-detected in redis-py 5.x+ when installed
            # Use JSON serializer instead of pickle to prevent insecure deserialization attacks
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'SOCKET_CONNECT_TIMEOUT': 10,  # Increased from 5 to 10 seconds for production
            'SOCKET_TIMEOUT': 10,  # Increased from 5 to 10 seconds for production
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',  # Compress cached data
            'IGNORE_EXCEPTIONS': True,  # Fallback gracefully if Redis is down
        },
        'KEY_PREFIX': 'lifeplace:cache',  # Isolates general cache keys
        'TIMEOUT': 600,  # Default timeout 10 minutes
    },
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL_CLEAN,  # Upstash: No database suffix needed
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': REDIS_CONNECTION_POOL_KWARGS,
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
        },
        'KEY_PREFIX': 'lifeplace:session',  # Isolates session keys
        'TIMEOUT': 86400,  # Sessions last 24 hours
    },
    'analytics': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL_CLEAN,  # Upstash: No database suffix needed
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': REDIS_CONNECTION_POOL_KWARGS,
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
        },
        'KEY_PREFIX': 'lifeplace:analytics',  # Isolates analytics keys
        'TIMEOUT': 3600,  # Analytics cache for 1 hour
    },
}

# SECURITY: Use database-backed sessions for better security
# Database sessions are more secure than cache-based sessions as they:
# 1. Don't rely on serialization formats that could be vulnerable
# 2. Provide audit trails
# 3. Are not susceptible to cache-specific attack vectors
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
# Note: Run 'python manage.py migrate' to create the sessions table

# Django Channels Layer Configuration (Upstash Compatible)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL_CLEAN],  # Upstash: No database suffix needed
            'prefix': 'lifeplace:channels:',  # Isolates WebSocket channel keys
            'capacity': 1500,  # Maximum number of messages to buffer in each channel
            'expiry': 60,  # How long to keep message in seconds
        },
    },
}


# JWT settings - SECURITY ENHANCED
# SECURITY FIX: Use dedicated JWT signing key
JWT_SIGNING_KEY = os.getenv('JWT_SIGNING_KEY')
if not JWT_SIGNING_KEY:
    if IS_PRODUCTION and not IS_COLLECTING_STATIC:
        raise ValueError("JWT_SIGNING_KEY environment variable is required in production")
    else:
        JWT_SIGNING_KEY = SECRET_KEY  # Fallback for development
        if not IS_COLLECTING_STATIC:
            print("WARNING: Using SECRET_KEY for JWT signing in development. Set JWT_SIGNING_KEY for production.")

SIMPLE_JWT = {
    "AUTH_HEADER_TYPES": ('Bearer',),
    # SECURITY FIX: Reasonable token lifetimes for better UX
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),  # Increased from 30 minutes
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),   # Increased from 1 day for better UX

    # SECURITY ENHANCEMENT: Enable token rotation for better security
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,  # Track login activity

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': JWT_SIGNING_KEY,  # Use dedicated key
    'VERIFYING_KEY': None,
    'AUDIENCE': 'lifeplace-api',      # Set audience for token validation
    'ISSUER': 'lifeplace-backend',    # Set issuer for token validation

    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',

    'JTI_CLAIM': 'jti',

    # Sliding token settings (not used but configured properly)
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
    
    # SECURITY ENHANCEMENT: Additional claims for better security
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
}

# Frontend URLs for email templates
ADMIN_FRONTEND_URL = os.getenv('ADMIN_FRONTEND_URL', 'https://admin.lifeplace.dev')  # admin-crm
CLIENT_FRONTEND_URL = os.getenv('CLIENT_FRONTEND_URL', 'https://lifeplace.dev')  # client-portal

# Brevo Configuration
BREVO_API_KEY = os.getenv('BREVO_API_KEY')
BREVO_WEBHOOK_SECRET = os.getenv('BREVO_WEBHOOK_SECRET')  # Secret for webhook signature verification
DEFAULT_FROM_NAME = os.getenv('DEFAULT_FROM_NAME', 'LifePlace')

# Encryption Configuration
FIELD_ENCRYPTION_KEY = os.getenv('FIELD_ENCRYPTION_KEY')  # Dedicated encryption key for sensitive fields
ENCRYPTION_SALT = os.getenv('ENCRYPTION_SALT')  # Unique salt for encryption

# Email configuration
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'stephendeslate@gmail.com')
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')

# Email configuration for development
if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')

# If using SMTP for email (production)
if EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend':
    EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
    EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')

# Logging configuration for development
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'communications': {
            'format': '📧 {asctime} - {message}',
            'style': '{',
        },
        'products': {
            'format': '🛍️ {asctime} - {message}',
            'style': '{',
        },
        'security': {
            'format': '🔒 SECURITY {asctime} {levelname} {message}',
            'style': '{',
        },
        'notifications': {
            'format': '🔔 {asctime} - {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'communications_console': {
            'class': 'logging.StreamHandler',
            'formatter': 'communications',
        },
        'products_console': {
            'class': 'logging.StreamHandler',
            'formatter': 'products',
        },
        'security_console': {
            'class': 'logging.StreamHandler',
            'formatter': 'security',
            'level': 'INFO',
        },
        'notifications_console': {
            'class': 'logging.StreamHandler',
            'formatter': 'notifications',
        },
    },
    'loggers': {
        'core.domains.communications': {
            'handlers': ['communications_console'],
            'level': 'INFO',
            'propagate': False,
        },
        'core.domains.products': {
            'handlers': ['products_console'],
            'level': 'INFO',
            'propagate': False,
        },
        'core.domains.users': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'security': {
            'handlers': ['security_console'],
            'level': 'INFO',
            'propagate': False,
        },
        'core.domains.notifications': {
            'handlers': ['notifications_console'],
            'level': 'INFO',
            'propagate': False,
        },
        'core.utils.security_logging': {
            'handlers': ['security_console'],
            'level': 'INFO',
            'propagate': False,
        },
        '': {  # Root logger
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

if DEBUG:
    # In development, make logging more verbose
    LOGGING['loggers']['core.domains.communications']['level'] = 'DEBUG'
    LOGGING['loggers']['core.domains.products']['level'] = 'DEBUG'
    LOGGING['loggers']['core.domains.notifications']['level'] = 'DEBUG'
    LOGGING['loggers']['']['level'] = 'INFO'

# Celery Configuration (Upstash Compatible - Single Database)
# All Celery keys are isolated via key prefixes instead of separate databases.
# See Redis key prefix reference at the top of the Redis configuration section.
CELERY_BROKER_URL = REDIS_URL_CLEAN  # Upstash: No database suffix needed
CELERY_RESULT_BACKEND = REDIS_URL_CLEAN  # Upstash: No database suffix needed
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TASK_ALWAYS_EAGER = False  # Set to True for synchronous testing
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_WORKER_SEND_TASK_EVENTS = True
CELERY_TASK_SEND_SENT_EVENT = True
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes max execution time per task
CELERY_TASK_SOFT_TIME_LIMIT = 270  # 4.5 minutes soft limit (raises SoftTimeLimitExceeded)

# Celery key prefix configuration (Upstash compatibility)
# These prefixes isolate Celery keys from other Redis data in the same database
CELERY_BROKER_TRANSPORT_OPTIONS = {
    'global_keyprefix': 'lifeplace:celery:',  # Prefix for all broker keys
}
CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS = {
    'global_keyprefix': 'lifeplace:celery-results:',  # Prefix for all result keys
}

# Add SSL configuration for Celery if using rediss://
if REDIS_USE_SSL:
    import ssl
    # Use CERT_REQUIRED for production security (validates SSL certificates)
    CELERY_BROKER_USE_SSL = {
        'ssl_cert_reqs': ssl.CERT_REQUIRED,
        'ssl_ca_certs': None,  # Use system CA bundle
    }
    CELERY_REDIS_BACKEND_USE_SSL = {
        'ssl_cert_reqs': ssl.CERT_REQUIRED,
        'ssl_ca_certs': None,  # Use system CA bundle
    }

# Notification-specific settings
NOTIFICATION_RATE_LIMIT = os.getenv('NOTIFICATION_RATE_LIMIT', '100/hour')
NOTIFICATION_MAX_CONTENT_LENGTH = int(os.getenv('NOTIFICATION_MAX_CONTENT_LENGTH', '1000'))
NOTIFICATION_CLEANUP_DAYS = int(os.getenv('NOTIFICATION_CLEANUP_DAYS', '90'))
NOTIFICATION_AUTO_READ_DAYS = int(os.getenv('NOTIFICATION_AUTO_READ_DAYS', '30'))

# Site configuration
SITE_NAME = os.getenv('SITE_NAME', 'LifePlace')

# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID = os.getenv('GOOGLE_OAUTH_CLIENT_ID', '')

# Business timezone configuration
BUSINESS_TIMEZONE = 'Asia/Manila'  # Primary business location (Philippines)
BUSINESS_TIMEZONE_DISPLAY = 'PHT'  # Display abbreviation
BUSINESS_TIMEZONE_OFFSET = '+08:00'  # UTC offset

# Mobile App Configuration
MOBILE_APP_IOS_STORE_URL = os.getenv('MOBILE_APP_IOS_STORE_URL', '')
MOBILE_APP_ANDROID_STORE_URL = os.getenv('MOBILE_APP_ANDROID_STORE_URL', '')

# DPA Compliance Configuration
DPO_EMAIL = os.getenv('DPO_EMAIL', 'dpo@lifeplace.com')
DPO_PHONE = os.getenv('DPO_PHONE', '')
SECURITY_TEAM_EMAIL = os.getenv('SECURITY_TEAM_EMAIL', '')

# Data Retention (in years) - Philippines DPA and BIR requirements
DATA_RETENTION_FINANCIAL = int(os.getenv('DATA_RETENTION_FINANCIAL', '10'))  # BIR requirement
DATA_RETENTION_CONTRACTS = int(os.getenv('DATA_RETENTION_CONTRACTS', '10'))  # Legal evidence
DATA_RETENTION_ACCOUNT = int(os.getenv('DATA_RETENTION_ACCOUNT', '7'))  # Post-deletion
DATA_RETENTION_SECURITY_LOGS = int(os.getenv('DATA_RETENTION_SECURITY_LOGS', '1'))

# Sentry Error Tracking (Production Only)
SENTRY_DSN = os.getenv('SENTRY_DSN')

if SENTRY_DSN and IS_PRODUCTION:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
        ],
        # Set traces_sample_rate to 1.0 to capture 100% of transactions for performance monitoring.
        # Adjust this value in production to reduce overhead.
        traces_sample_rate=0.2,  # 20% of requests for performance monitoring

        # Capture 100% of errors
        sample_rate=1.0,

        # Environment
        environment=ENV,

        # Release tracking (optional - set via CI/CD)
        release=os.getenv('SENTRY_RELEASE', 'unknown'),

        # Send PII (Personally Identifiable Information) - set to False for privacy
        send_default_pii=False,

        # Performance monitoring
        profiles_sample_rate=0.2,  # 20% of transactions for profiling
    )

    print(f"✅ Sentry initialized for environment: {ENV}")

# =============================================================================
# REPORTLAB SECURITY CONFIGURATION
# =============================================================================
# Prevent SSRF attacks by restricting allowed URL schemes and hosts in PDFs
# This mitigates CVE-2020-28463 and related SSRF vulnerabilities
#
# trustedSchemes: Only allow these URL schemes for external resources
# trustedHosts: Whitelist of allowed hosts for external resources
# =============================================================================

# Import reportlab and configure security settings
try:
    from reportlab.lib import pdfencrypt
    from reportlab.rl_settings import trustedSchemes, trustedHosts

    # Only allow HTTPS and data URIs (no file://, ftp://, etc.)
    trustedSchemes[:] = ['https', 'data']

    # Whitelist of trusted hosts for external resources in PDFs
    # Add your own CDN/image hosting domains here
    ALLOWED_PDF_HOSTS = [
        'lifeplace.dev',
        'admin.lifeplace.dev',
        '*.lifeplace.dev',
        # Add CDN domains if using external image hosting
    ]

    # Clear existing trusted hosts and set our whitelist
    trustedHosts[:] = ALLOWED_PDF_HOSTS

except ImportError:
    # ReportLab not installed, skip configuration
    pass
except (AttributeError, TypeError):
    # Older version of ReportLab without these settings or trustedHosts is None
    import logging
    logging.getLogger(__name__).warning(
        "ReportLab version does not support trustedSchemes/trustedHosts. "
        "Consider upgrading for improved SSRF protection."
    )

