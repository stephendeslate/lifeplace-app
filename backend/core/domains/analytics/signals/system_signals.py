# backend/core/domains/analytics/signals/system_signals.py
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone

from ..services import EventTrackingService

logger = logging.getLogger(__name__)


@receiver(post_save, sender='products.ProductOption')
def track_product_events(sender, instance, created, **kwargs):
    """Track product creation and updates"""
    if created:
        EventTrackingService.track_event(
            event_name='product_created',
            event_category='SYSTEM_EVENT',
            source_domain='products',
            source_model='ProductOption',
            source_id=instance.id,
            event_data={
                'product_name': instance.name,
                'product_type': instance.type,
                'base_price': str(instance.base_price),
                'category': instance.category.name if instance.category else None,
                'is_active': instance.is_active,
                'pricing_model': instance.pricing_model,
            },
            numeric_value=instance.base_price
        )


@receiver(post_save, sender='notes.Note')
def track_note_events(sender, instance, created, **kwargs):
    """Track note creation for analytics"""
    if created:
        EventTrackingService.track_event(
            event_name='note_created',
            event_category='USER_ACTION',
            source_domain='notes',
            source_model='Note',
            source_id=instance.id,
            user=instance.created_by,
            event_data={
                'content_type': instance.content_type.model if instance.content_type else None,
                'object_id': instance.object_id,
                'title': instance.title,
                'content_length': len(instance.content),
            }
        )


@receiver(post_save, sender='notifications.Notification')
def track_notification_events(sender, instance, created, **kwargs):
    """Track notification creation and delivery"""
    if created:
        EventTrackingService.track_event(
            event_name='notification_created',
            event_category='SYSTEM_EVENT',
            source_domain='notifications',
            source_model='Notification',
            source_id=instance.id,
            user=instance.recipient,
            event_data={
                'notification_type': instance.notification_type.code if instance.notification_type else None,
                'title': instance.title,
                'event_id': instance.event.id if instance.event else None,
                'client_id': instance.client.id if instance.client else None,
                'is_read': instance.is_read,
            }
        )