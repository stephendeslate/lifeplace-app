# backend/core/domains/users/tasks.py

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="core.domains.users.tasks.flush_expired_jwt_tokens")
def flush_expired_jwt_tokens():
    """
    Purge expired blacklisted JWT tokens from the database.

    When BLACKLIST_AFTER_ROTATION is enabled, every token rotation adds a row
    to the OutstandingToken / BlacklistedToken tables.  Without periodic
    cleanup these tables grow unbounded.

    Uses the same logic as Django's `flushexpiredtokens` management command.
    """
    from django.utils import timezone

    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

    expired = OutstandingToken.objects.filter(expires_at__lte=timezone.now())
    count = expired.count()
    expired.delete()

    logger.info(f"Flushed {count} expired JWT blacklist tokens")
    return count
