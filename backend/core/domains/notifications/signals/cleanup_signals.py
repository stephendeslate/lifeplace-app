# backend/core/domains/notifications/signals/cleanup_signals.py
"""
Cleanup and maintenance signals

Handles automatic cleanup, scheduling, and maintenance tasks for notifications.
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save)
def schedule_notification_cleanup(sender, instance, **kwargs):
    """Schedule cleanup tasks when notification types are updated"""
    # Only run for NotificationType instances
    if sender._meta.label != 'notifications.NotificationType':
        return
        
    try:
        # Import here to avoid circular imports
        from django.core.management import call_command
        
        # Schedule cleanup of old notifications (can be done via Celery in production)
        if hasattr(instance, 'auto_read_after_days') and instance.auto_read_after_days:
            logger.info(f"Scheduling cleanup for notification type: {instance.code}")
            # In production, you would schedule this with Celery
            # cleanup_old_notifications.apply_async(args=[instance.auto_read_after_days])
    except Exception as e:
        logger.error(f"Failed to schedule notification cleanup: {str(e)}")
