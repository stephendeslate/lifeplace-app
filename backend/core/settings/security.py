# backend/core/settings/security.py
"""
Production security headers, DPA compliance, Sentry, and ReportLab security.
"""
import logging
import os

from .base import DEBUG, ENV, IS_PRODUCTION

# Production-specific security settings
if IS_PRODUCTION:
    SECURE_SSL_REDIRECT = False  # Proxy handles SSL termination
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# DPA Compliance Configuration
DPO_EMAIL = os.getenv("DPO_EMAIL", "dpo@lifeplace.com")
DPO_PHONE = os.getenv("DPO_PHONE", "")
SECURITY_TEAM_EMAIL = os.getenv("SECURITY_TEAM_EMAIL", "")

# Data Retention (in years) — Philippines DPA and BIR requirements
DATA_RETENTION_FINANCIAL = int(os.getenv("DATA_RETENTION_FINANCIAL", "10"))
DATA_RETENTION_CONTRACTS = int(os.getenv("DATA_RETENTION_CONTRACTS", "10"))
DATA_RETENTION_ACCOUNT = int(os.getenv("DATA_RETENTION_ACCOUNT", "7"))
DATA_RETENTION_SECURITY_LOGS = int(os.getenv("DATA_RETENTION_SECURITY_LOGS", "1"))

# Sentry Error Tracking (Production Only)
SENTRY_DSN = os.getenv("SENTRY_DSN")

if SENTRY_DSN and IS_PRODUCTION:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.redis import RedisIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
        ],
        traces_sample_rate=0.2,
        sample_rate=1.0,
        environment=ENV,
        release=os.getenv("SENTRY_RELEASE", "unknown"),
        send_default_pii=False,
        profiles_sample_rate=0.2,
    )

    print(f"✅ Sentry initialized for environment: {ENV}")

# =============================================================================
# REPORTLAB SECURITY CONFIGURATION
# =============================================================================
try:
    from reportlab.lib import pdfencrypt
    from reportlab.rl_settings import trustedHosts, trustedSchemes

    trustedSchemes[:] = ["https", "data"]

    ALLOWED_PDF_HOSTS = [
        "lifeplace.dev",
        "admin.lifeplace.dev",
        "*.lifeplace.dev",
    ]

    trustedHosts[:] = ALLOWED_PDF_HOSTS

except ImportError:
    pass
except (AttributeError, TypeError):
    logging.getLogger(__name__).warning(
        "ReportLab version does not support trustedSchemes/trustedHosts. "
        "Consider upgrading for improved SSRF protection."
    )
