# backend/core/settings/base.py
"""
Core Django settings: environment, apps, middleware, database, i18n, proxy config.

CRITICAL: Middleware order matters — do not reorder.
TrustedProxy → SecurityMiddleware → WhiteNoise → Custom Security →
Session → Common → CSRF → Auth → AdminLogging → Idempotency → ETag →
Messages → XFrame
"""
import os
import sys
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Environment
ENV = os.getenv("ENV", "development")
IS_PRODUCTION = ENV == "production"

# Deploy secret for CI/CD deployment recording API
DEPLOY_SECRET = os.getenv("DEPLOY_SECRET", "")

# Check if we're running collectstatic during Docker build
IS_COLLECTING_STATIC = len(sys.argv) > 1 and "collectstatic" in sys.argv

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if IS_PRODUCTION and not IS_COLLECTING_STATIC:
        raise ValueError("SECRET_KEY environment variable is required in production")
    else:
        SECRET_KEY = "django-insecure-development-only-key-replace-in-production"
        if not IS_COLLECTING_STATIC:
            print("WARNING: Using temporary SECRET_KEY for development. Set SECRET_KEY environment variable.")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "False") == "True"

# Load test mode: disables rate limiting without enabling DEBUG.
LOAD_TEST_MODE = os.getenv("LOAD_TEST_MODE", "False") == "True"

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",") if os.getenv("ALLOWED_HOSTS") else []

if DEBUG:
    ALLOWED_HOSTS.extend(["localhost", "127.0.0.1", "testserver"])
else:
    if not ALLOWED_HOSTS and IS_PRODUCTION and not IS_COLLECTING_STATIC:
        raise ValueError(
            "ALLOWED_HOSTS environment variable is required in production. "
            "Set it to a comma-separated list of allowed hostnames."
        )
    if ENV == "test":
        ALLOWED_HOSTS.extend(["localhost", "127.0.0.1", "testserver"])
CSRF_TRUSTED_ORIGINS = os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if os.getenv("CSRF_TRUSTED_ORIGINS") else []

# Custom User Model
AUTH_USER_MODEL = "users.User"

# Application definition
INSTALLED_APPS = [
    "core",
    "core.domains.users",
    "core.domains.communications",
    "core.domains.clients",
    "core.domains.events",
    "core.domains.products",
    "core.domains.venues",  # Venue management and operating rules
    "core.domains.vendors",  # Vendor/service provider management
    "core.domains.questionnaires",
    "core.domains.contracts",
    "core.domains.sales",
    "core.domains.payments",
    "core.domains.workflows",
    "core.domains.bookingflow",
    "core.domains.notes",
    "core.domains.notifications",
    "core.domains.analytics",
    "core.domains.settings",  # Currency and application settings management
    "core.domains.messaging",  # Real-time messaging system
    "core.domains.vip",  # VIP & Loyalty program
    "core.domains.security",  # Security & breach management
    "core.infrastructure",  # Infrastructure: DLQ, circuit breakers, health checks
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_celery_beat",
    "corsheaders",
    "channels",  # Django Channels for WebSocket support
    "storages",  # Cloud storage (Cloudflare R2)
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # SECURITY: JWT token blacklisting
    "drf_spectacular",  # OpenAPI schema generation
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "core.utils.api_middleware.TrustedProxyMiddleware",  # SECURITY: Extract real client IP from trusted proxies
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "core.utils.security.SecurityMiddleware",  # Custom security middleware
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "core.utils.security.AdminLoggingMiddleware",  # Admin action logging
    "core.utils.api_middleware.IdempotencyMiddleware",  # Idempotent request handling
    "core.utils.api_middleware.ETagMiddleware",  # ETag caching for GET requests
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# Django Channels ASGI Configuration
ASGI_APPLICATION = "core.asgi.application"

# Database
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if IS_PRODUCTION and not IS_COLLECTING_STATIC:
        raise ValueError("DATABASE_URL environment variable is required in production")
    else:
        DATABASE_URL = "postgres://localhost:5432/lifeplace-app"

DATABASES = {
    "default": {
        **dj_database_url.parse(DATABASE_URL),
        "CONN_MAX_AGE": 600,
        "CONN_HEALTH_CHECKS": True,
    }
}

if IS_PRODUCTION:
    DATABASES["default"]["OPTIONS"] = DATABASES["default"].get("OPTIONS", {})
    if ".flycast" in DATABASE_URL or ".internal" in DATABASE_URL:
        DATABASES["default"]["OPTIONS"]["sslmode"] = "disable"
    else:
        DATABASES["default"]["OPTIONS"]["sslmode"] = "require"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Manila"  # All events happen in the Philippines
USE_I18N = True
USE_TZ = False  # Naive Philippine Time — see ADR-001

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# =============================================================================
# Trusted Proxy Configuration
# =============================================================================
NUM_PROXIES = int(os.getenv("NUM_PROXIES", "1"))
TRUSTED_PROXY_NETWORKS = os.getenv(
    "TRUSTED_PROXY_NETWORKS", "127.0.0.1/32,172.16.0.0/12,10.0.0.0/8,192.168.0.0/16"
).split(",")
USE_X_FORWARDED_HOST = True

# Site and business configuration
SITE_NAME = os.getenv("SITE_NAME", "LifePlace")
BUSINESS_TIMEZONE = "Asia/Manila"
BUSINESS_TIMEZONE_DISPLAY = "PHT"
BUSINESS_TIMEZONE_OFFSET = "+08:00"
MOBILE_APP_IOS_STORE_URL = os.getenv("MOBILE_APP_IOS_STORE_URL", "")
MOBILE_APP_ANDROID_STORE_URL = os.getenv("MOBILE_APP_ANDROID_STORE_URL", "")

# Notification-specific settings
NOTIFICATION_RATE_LIMIT = os.getenv("NOTIFICATION_RATE_LIMIT", "100/hour")
NOTIFICATION_MAX_CONTENT_LENGTH = int(os.getenv("NOTIFICATION_MAX_CONTENT_LENGTH", "1000"))
NOTIFICATION_CLEANUP_DAYS = int(os.getenv("NOTIFICATION_CLEANUP_DAYS", "90"))
NOTIFICATION_AUTO_READ_DAYS = int(os.getenv("NOTIFICATION_AUTO_READ_DAYS", "30"))
