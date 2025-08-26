# backend/core/domains/users/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import logging

from .models import User, UserProfile, AdminInvitation

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create a UserProfile when a new User is created"""
    if created:
        UserProfile.objects.create(user=instance)


# === CACHE INVALIDATION SIGNALS ===

@receiver([post_save, post_delete], sender=User)
def invalidate_user_caches(sender, instance, **kwargs):
    """Invalidate user-related caches when users are modified"""
    try:
        from .cache_service import users_cache_service
        users_cache_service.invalidate_user_caches(
            user_id=instance.id, 
            email=instance.email
        )
        logger.info(f"Invalidated user caches for: {instance.email}")
    except Exception as e:
        logger.error(f"Failed to invalidate user caches: {e}")


@receiver([post_save, post_delete], sender=UserProfile)
def invalidate_profile_caches(sender, instance, **kwargs):
    """Invalidate user profile caches when profiles are modified"""
    try:
        from .cache_service import users_cache_service
        users_cache_service.invalidate_user_caches(
            user_id=instance.user.id,
            email=instance.user.email
        )
        logger.info(f"Invalidated profile caches for: {instance.user.email}")
    except Exception as e:
        logger.error(f"Failed to invalidate profile caches: {e}")


@receiver([post_save, post_delete], sender=AdminInvitation)
def invalidate_invitation_caches(sender, instance, **kwargs):
    """Invalidate admin invitation caches when invitations are modified"""
    try:
        from .cache_service import users_cache_service
        users_cache_service.invalidate_invitation_caches(
            invitation_id=str(instance.id),
            email=instance.email
        )
        logger.info(f"Invalidated invitation caches for: {instance.email}")
    except Exception as e:
        logger.error(f"Failed to invalidate invitation caches: {e}")


def connect_user_signals():
    """Connect all user domain cache invalidation signals"""
    logger.info("Successfully connected all user domain signals")