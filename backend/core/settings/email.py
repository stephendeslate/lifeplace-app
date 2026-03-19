# backend/core/settings/email.py
"""
Email, Brevo, communications, and frontend URL configuration.
"""
import os

from .base import DEBUG

# Frontend URLs for email templates
ADMIN_FRONTEND_URL = os.getenv("ADMIN_FRONTEND_URL", "https://admin.lifeplace.dev")
CLIENT_FRONTEND_URL = os.getenv("CLIENT_FRONTEND_URL", "https://lifeplace.dev")

# Brevo Configuration
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
DEFAULT_FROM_NAME = os.getenv("DEFAULT_FROM_NAME", "LifePlace")

# Encryption Configuration
FIELD_ENCRYPTION_KEY = os.getenv("FIELD_ENCRYPTION_KEY")
ENCRYPTION_SALT = os.getenv("ENCRYPTION_SALT")

# Email configuration
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@lifeplace.com")
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")

if DEBUG:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
else:
    EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")

# SMTP settings (production)
if EMAIL_BACKEND == "django.core.mail.backends.smtp.EmailBackend":
    EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 587))
    EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True").lower() == "true"
    EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")

# Communications settings
COMMUNICATION_DAILY_RECIPIENT_LIMIT = 1000
COMMUNICATIONS_ENFORCE_WEBHOOK_SIGNATURE = os.getenv(
    "COMMUNICATIONS_ENFORCE_WEBHOOK_SIGNATURE", str(not DEBUG)
).lower() in ("true", "1", "yes")
BREVO_WEBHOOK_SECRET = os.getenv("BREVO_WEBHOOK_SECRET", None)
