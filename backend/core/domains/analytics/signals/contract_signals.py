# backend/core/domains/analytics/signals/contract_signals.py
import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from ..services import EventTrackingService, ConversionFunnelService

logger = logging.getLogger(__name__)


@receiver(post_save, sender='contracts.EventContract')
def track_contract_events(sender, instance, created, **kwargs):
    """Track contract creation and signing"""
    if created:
        EventTrackingService.track_event(
            event_name='contract_created',
            event_category='BUSINESS_EVENT',
            source_domain='contracts',
            source_model='EventContract',
            source_id=instance.id,
            user=instance.event.client if instance.event else None,
            event_data={
                'event_id': instance.event.id if instance.event else None,
                'template_name': instance.template.name if instance.template else None,
                'status': instance.status,
                'contract_value': str(instance.contract_value) if instance.contract_value else None,
                'is_amendment': instance.is_amendment,
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
                source_model='EventContract',
                source_id=instance.id,
                user=instance.event.client if instance.event else None,
                event_data={
                    'old_status': old_status,
                    'new_status': instance.status,
                    'template_name': instance.template.name if instance.template else None,
                    'event_id': instance.event.id if instance.event else None,
                }
            )
            
            # Track funnel event for contract signing
            if instance.status == 'SIGNED':
                try:
                    ConversionFunnelService.track_funnel_event(
                        funnel_id=1,  # Default business funnel
                        user=instance.event.client if instance.event else None,
                        event_name='contract_signed',
                        event_data={
                            'contract_id': instance.id,
                            'template_name': instance.template.name if instance.template else None
                        }
                    )
                except Exception as e:
                    logger.debug(f"Could not track funnel event: {e}")


@receiver(pre_save, sender='contracts.EventContract')
def store_contract_previous_status(sender, instance, **kwargs):
    """Store previous contract status for change detection"""
    if instance.pk:
        try:
            previous = sender.objects.get(pk=instance.pk)
            instance._previous_status = previous.status
        except sender.DoesNotExist:
            instance._previous_status = None


@receiver(post_save, sender='contracts.ContractSignature')
def track_contract_signature_events(sender, instance, created, **kwargs):
    """Track individual contract signatures"""
    if created:
        EventTrackingService.track_event(
            event_name='contract_signature_added',
            event_category='BUSINESS_EVENT',
            source_domain='contracts',
            source_model='ContractSignature',
            source_id=instance.id,
            user=instance.signer,
            event_data={
                'contract_id': instance.contract.id,
                'signer_role': instance.role,
                'signer_name': instance.signer_name,
                'is_verified': instance.is_verified,
                'event_id': instance.contract.event.id if instance.contract.event else None,
            }
        )