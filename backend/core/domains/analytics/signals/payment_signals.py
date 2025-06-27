# backend/core/domains/analytics/signals/payment_signals.py
import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from ..services import EventTrackingService, ConversionFunnelService

logger = logging.getLogger(__name__)


@receiver(post_save, sender='payments.Payment')
def track_payment_events(sender, instance, created, **kwargs):
    """Track payment creation and status changes"""
    if created:
        EventTrackingService.track_event(
            event_name='payment_created',
            event_category='BUSINESS_EVENT',
            source_domain='payments',
            source_model='Payment',
            source_id=instance.id,
            user=getattr(instance.event, 'client', None) if instance.event else None,
            event_data={
                'amount': str(instance.amount),
                'status': instance.status,
                'payment_method': instance.payment_method.type if instance.payment_method else None,
                'event_id': instance.event.id if instance.event else None,
            },
            numeric_value=instance.amount
        )
    else:
        # Track status changes, especially completion
        old_status = getattr(instance, '_previous_status', None)
        if old_status and instance.status != old_status:
            if instance.status == 'COMPLETED':
                EventTrackingService.track_event(
                    event_name='payment_completed',
                    event_category='BUSINESS_EVENT',
                    source_domain='payments',
                    source_model='Payment',
                    source_id=instance.id,
                    user=getattr(instance.event, 'client', None) if instance.event else None,
                    event_data={
                        'amount': str(instance.amount),
                        'payment_method': instance.payment_method.type if instance.payment_method else None,
                        'event_id': instance.event.id if instance.event else None,
                    },
                    numeric_value=instance.amount
                )
                
                # Track funnel event for payment completion
                try:
                    ConversionFunnelService.track_funnel_event(
                        funnel_id=1,  # Default business funnel
                        user=getattr(instance.event, 'client', None) if instance.event else None,
                        event_name='payment_completed',
                        event_data={
                            'payment_id': instance.id,
                            'amount': str(instance.amount)
                        }
                    )
                except Exception as e:
                    logger.debug(f"Could not track funnel event: {e}")
            else:
                # Track other status changes
                EventTrackingService.track_event(
                    event_name='payment_status_changed',
                    event_category='BUSINESS_EVENT',
                    source_domain='payments',
                    source_model='Payment',
                    source_id=instance.id,
                    user=getattr(instance.event, 'client', None) if instance.event else None,
                    event_data={
                        'old_status': old_status,
                        'new_status': instance.status,
                        'amount': str(instance.amount),
                        'event_id': instance.event.id if instance.event else None,
                    }
                )


@receiver(pre_save, sender='payments.Payment')
def store_payment_previous_status(sender, instance, **kwargs):
    """Store previous status for change detection"""
    if instance.pk:
        try:
            previous = sender.objects.get(pk=instance.pk)
            instance._previous_status = previous.status
        except sender.DoesNotExist:
            instance._previous_status = None


@receiver(post_save, sender='payments.Refund')
def track_refund_events(sender, instance, created, **kwargs):
    """Track refund creation and processing"""
    if created:
        EventTrackingService.track_event(
            event_name='refund_created',
            event_category='BUSINESS_EVENT',
            source_domain='payments',
            source_model='Refund',
            source_id=instance.id,
            user=getattr(instance.payment.event, 'client', None) if instance.payment.event else None,
            event_data={
                'amount': str(instance.amount),
                'reason': instance.reason,
                'payment_id': instance.payment.id,
                'status': instance.status,
            },
            numeric_value=instance.amount
        )
    else:
        # Track refund processing
        if instance.status == 'COMPLETED' and not getattr(instance, '_completion_tracked', False):
            EventTrackingService.track_event(
                event_name='refund_completed',
                event_category='BUSINESS_EVENT',
                source_domain='payments',
                source_model='Refund',
                source_id=instance.id,
                user=getattr(instance.payment.event, 'client', None) if instance.payment.event else None,
                event_data={
                    'amount': str(instance.amount),
                    'reason': instance.reason,
                    'payment_id': instance.payment.id,
                    'refund_transaction_id': instance.refund_transaction_id,
                },
                numeric_value=instance.amount
            )
            instance._completion_tracked = True