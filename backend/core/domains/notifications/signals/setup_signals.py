# backend/core/domains/notifications/signals/setup_signals.py
"""
Setup signals for notifications domain

Handles initial data creation and migration-related signals.
"""

import logging
from django.db import ProgrammingError
from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.apps import apps

logger = logging.getLogger(__name__)


@receiver(post_migrate)
def create_notification_types(sender, **kwargs):
    """Create default notification types after migrations"""
    if sender.name != 'core.domains.notifications':
        return
    
    # Dynamically get the NotificationType model
    try:
        NotificationType = apps.get_model('notifications', 'NotificationType')
    except LookupError:
        logger.warning("NotificationType model not found, skipping notification type creation")
        return
    
    # Check if notification types table exists
    try:
        NotificationType.objects.exists()
    except ProgrammingError as e:
        logger.warning(f"Cannot check NotificationType existence, table may not exist: {str(e)}")
        return

    logger.info("Syncing default notification types...")
    
    try:
        from .notification_types_data import get_default_notification_types
        default_types = get_default_notification_types()
        
        created_count = 0
        updated_count = 0
        
        for type_data in default_types:
            notification_type, created = NotificationType.objects.get_or_create(
                code=type_data['code'],
                defaults=type_data
            )
            if created:
                logger.info(f"Created notification type: {type_data['code']}")
                created_count += 1
            else:
                # Update existing type with new fields if needed
                updated = False
                for key, value in type_data.items():
                    if key != 'code' and getattr(notification_type, key, None) != value:
                        setattr(notification_type, key, value)
                        updated = True
                if updated:
                    notification_type.save()
                    logger.info(f"Updated notification type: {type_data['code']}")
                    updated_count += 1
        
        logger.info(f"Notification types synced: {created_count} created, {updated_count} updated")
    
    except Exception as e:
        logger.error(f"Error creating notification types: {str(e)}")
        # Don't raise the exception to avoid breaking migrations
        pass