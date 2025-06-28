# backend/core/domains/analytics/signals/communication_signals.py
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from ..services import EventTrackingService

logger = logging.getLogger(__name__)


@receiver(post_save, sender='communications.CommunicationRecord')
def track_communication_events(sender, instance, created, **kwargs):
    """Track communication events"""
    if created:
        EventTrackingService.track_event(
            event_name='communication_sent',
            event_category='SYSTEM_EVENT',
            source_domain='communications',
            source_model='CommunicationRecord',
            source_id=instance.id,
            user=instance.client,
            event_data={
                'channel': instance.channel,
                'template_name': instance.template_name,
                'recipient': instance.recipient,
                'subject': instance.subject,
                'delivery_status': instance.delivery_status,
                'category': instance.category,
            }
        )