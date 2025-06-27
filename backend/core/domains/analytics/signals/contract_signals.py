# backend/core/domains/analytics/signals/contract_signals.py
import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from ..services import EventTrackingService, ConversionFunnelService

logger = logging.getLogger(__name__)


@receiver(post_save, sender='contracts.Contract')
def track_contract_events(sender, instance, created, **kwargs):
    """Track contract creation and signing"""
    if created:
        EventTrackingService.track_event(
            event_name='contract_created',
            event_category='BUSINESS_EVENT',
            source_domain='contracts',
            source_model='Contract',
            source_id=instance.id,
            user=getattr(instance.event, 'client', None) if instance.event else None,
            event_data={
                'event_id': instance.event.id if instance.event else None,
                'contract_type': instance.contract_type,
                'status': instance.status,
            }
        )
    else:
        # Track status changes, especially signing
        old_status = getattr(instance, '_previous_status', None)
        if old_status and instance.status != old_status:
            EventTrackingService.track_event(
                event_name='contract_status_changed',
                event_category='BUSINESS_EVENT',
                source_domain='contracts',
                source_model='Contract',
                source_id=instance.id,
                user=getattr(instance.event, 'client', None) if instance.event else None,
                event_data={
                    'old_status': old_status,
                    'new_status': instance.status,
                    'contract_type': instance.contract_type,
                    'event_id': instance.event.id if instance.event else None,
                }
            )
            
            # Track funnel event for contract signing
            if instance.status == 'SIGNED':
                try:
                    ConversionFunnelService.track_funnel_event(
                        funnel_id=1,  # Default business funnel
                        user=getattr(instance.event, 'client', None) if instance.event else None,
                        event_name='contract_signed',
                        event_data={
                            'contract_id': instance.id,
                            'contract_type': instance.contract_type
                        }
                    )
                except Exception as e:
                    logger.debug(f"Could not track funnel event: {e}")


@receiver(pre_save, sender='contracts.Contract')
def store_contract_previous_status(sender, instance, **kwargs):
    """Store previous contract status for change detection"""
    if instance.pk:
        try:
            previous = sender.objects.get(pk=instance.pk)
            instance._previous_status = previous.status
        except sender.DoesNotExist:
            instance._previous_status = None