# backend/core/domains/products/signals.py
"""
Products domain signals.

Note: Seed data is now handled by the `seed_production_data` management command.
Run `python manage.py seed_production_data` after migrations to seed default data.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


# === CACHE INVALIDATION SIGNALS ===

@receiver([post_save, post_delete], sender='products.ProductCategory')
def invalidate_category_caches(sender, instance, **kwargs):
    """Invalidate category-related caches when categories are modified"""
    try:
        from .cache_service import product_cache_service
        product_cache_service.invalidate_category_caches(instance.id)
        logger.info(f"Invalidated category caches for: {instance.name}")
    except Exception as e:
        logger.error(f"Failed to invalidate category caches: {e}")


@receiver([post_save, post_delete], sender='products.ProductOption')
def invalidate_product_caches(sender, instance, **kwargs):
    """Invalidate product-related caches when products are modified"""
    try:
        from .cache_service import product_cache_service
        product_cache_service.invalidate_product_caches(instance.id)
        logger.info(f"Invalidated product caches for: {instance.name}")
    except Exception as e:
        logger.error(f"Failed to invalidate product caches: {e}")


@receiver([post_save, post_delete], sender='products.Discount')
def invalidate_discount_caches(sender, instance, **kwargs):
    """Invalidate discount-related caches when discounts are modified"""
    try:
        from .cache_service import product_cache_service
        product_cache_service.invalidate_discount_caches(instance.id)
        logger.info(f"Invalidated discount caches for: {instance.name}")
    except Exception as e:
        logger.error(f"Failed to invalidate discount caches: {e}")


def connect_product_signals():
    """Connect all product domain cache invalidation signals"""
    logger.info("Successfully connected all product domain signals")
