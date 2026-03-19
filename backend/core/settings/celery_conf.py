# backend/core/settings/celery_conf.py
"""
Celery task queue configuration.
"""
import ssl

from .base import TIME_ZONE
from .redis_conf import REDIS_URL_CLEAN, REDIS_USE_SSL

CELERY_BROKER_URL = REDIS_URL_CLEAN
CELERY_RESULT_BACKEND = REDIS_URL_CLEAN
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_RESULT_SERIALIZER = "json"
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_WORKER_SEND_TASK_EVENTS = True
CELERY_TASK_SEND_SENT_EVENT = True
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes
CELERY_TASK_SOFT_TIME_LIMIT = 270  # 4.5 minutes

# Key prefix configuration (Upstash compatibility)
CELERY_BROKER_TRANSPORT_OPTIONS = {
    "global_keyprefix": "lifeplace:celery:",
}
CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS = {
    "global_keyprefix": "lifeplace:celery-results:",
}

# SSL configuration for Celery if using rediss://
if REDIS_USE_SSL:
    CELERY_BROKER_USE_SSL = {
        "ssl_cert_reqs": ssl.CERT_REQUIRED,
        "ssl_ca_certs": None,
    }
    CELERY_REDIS_BACKEND_USE_SSL = {
        "ssl_cert_reqs": ssl.CERT_REQUIRED,
        "ssl_ca_certs": None,
    }
