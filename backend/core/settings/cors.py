# backend/core/settings/cors.py
"""
CORS and cookie security settings.
"""
import os

from .base import DEBUG, IS_PRODUCTION

# CORS settings
if IS_PRODUCTION:
    CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if os.getenv("CORS_ALLOWED_ORIGINS") else []
    CORS_ALLOW_CREDENTIALS = True
else:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",  # admin-crm
        "http://localhost:5174",  # client-portal
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://192.168.1.76:5173",
        "http://192.168.1.76:5174",
    ]
    CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
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

CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

# Cookie security settings
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
