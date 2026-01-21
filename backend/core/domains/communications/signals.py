# backend/core/domains/communications/signals.py
"""
Communications domain signals.

Note: Seed data is now handled by the `seed_production_data` management command.
Run `python manage.py seed_production_data` after migrations to seed default data.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


# === CACHE INVALIDATION SIGNALS ===

@receiver([post_save, post_delete], sender='communications.CommunicationTemplate')
def invalidate_template_caches(sender, instance, **kwargs):
    """Invalidate template-related caches when templates are modified"""
    try:
        from .cache_service import communications_cache_service
        communications_cache_service.invalidate_template_caches(
            template_id=instance.id,
            template_name=instance.name
        )
        logger.info(f"Invalidated template caches for: {instance.name}")
    except Exception as e:
        logger.error(f"Failed to invalidate template caches: {e}")


@receiver([post_save, post_delete], sender='communications.CommunicationRecord')
def invalidate_record_caches(sender, instance, **kwargs):
    """Invalidate record-related caches when records are modified"""
    try:
        from .cache_service import communications_cache_service
        communications_cache_service.invalidate_record_caches(
            record_id=str(instance.id),
            client_id=instance.client.id if instance.client else None,
            template_name=instance.template_name
        )
        logger.info(f"Invalidated record caches for: {instance.template_name}")
    except Exception as e:
        logger.error(f"Failed to invalidate record caches: {e}")


def connect_communication_signals():
    """Connect all communication domain cache invalidation signals"""
    logger.info("Successfully connected all communication domain signals")
