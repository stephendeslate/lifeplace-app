# backend/core/settings/auth.py
"""
Authentication: JWT, Google OAuth.
"""
import os
from datetime import timedelta

from .base import IS_COLLECTING_STATIC, IS_PRODUCTION, SECRET_KEY

# JWT settings
JWT_SIGNING_KEY = os.getenv("JWT_SIGNING_KEY")
if not JWT_SIGNING_KEY:
    if IS_PRODUCTION and not IS_COLLECTING_STATIC:
        raise ValueError("JWT_SIGNING_KEY environment variable is required in production")
    else:
        JWT_SIGNING_KEY = SECRET_KEY
        if not IS_COLLECTING_STATIC:
            print("WARNING: Using SECRET_KEY for JWT signing in development. Set JWT_SIGNING_KEY for production.")

SIMPLE_JWT = {
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": JWT_SIGNING_KEY,
    "VERIFYING_KEY": None,
    "AUDIENCE": "lifeplace-api",
    "ISSUER": "lifeplace-backend",
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
    "SLIDING_TOKEN_REFRESH_EXP_CLAIM": "refresh_exp",
    "SLIDING_TOKEN_LIFETIME": timedelta(minutes=5),
    "SLIDING_TOKEN_REFRESH_LIFETIME": timedelta(days=1),
    "USER_AUTHENTICATION_RULE": "rest_framework_simplejwt.authentication.default_user_authentication_rule",
}

# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")
