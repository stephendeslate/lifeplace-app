# backend/core/domains/analytics/signals/sales_signals.py
import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from ..services import EventTrackingService, ConversionFunnelService

logger = logging.getLogger(__name__)


@receiver(post_save, sender='sales.EventQuote')
def track_quote_events(sender, instance, created, **kwargs):
    """Track quote creation and status changes"""
    if created:
        EventTrackingService.track_event(
            event_name='quote_created',
            event_category='BUSINESS_EVENT',
            source_domain='sales',
            source_model='EventQuote',
            source_id=instance.id,
            user=instance.event.client if instance.event else None,
            event_data={
                'event_id': instance.event.id if instance.event else None,
                'total_amount': str(instance.total_amount),
                'status': instance.status,
                'valid_until': instance.valid_until.isoformat() if instance.valid_until else None,
                'version': instance.version,
                'template_name': instance.template.name if instance.template else None,
            },
            numeric_value=instance.total_amount
        )
    else:
        # Track status changes, especially acceptance
        old_status = getattr(instance, '_previous_status', None)
        if old_status and instance.status != old_status:
            EventTrackingService.track_event(
                event_name='quote_status_changed',
                event_category='BUSINESS_EVENT',
                source_domain='sales',
                source_model='EventQuote',
                source_id=instance.id,
                user=instance.event.client if instance.event else None,
                event_data={
                    'old_status': old_status,
                    'new_status': instance.status,
                    'total_amount': str(instance.total_amount),
                    'event_id': instance.event.id if instance.event else None,
                    'version': instance.version,
                }
            )
            
            # Track funnel event for quote acceptance
            if instance.status == 'ACCEPTED':
                try:
                    ConversionFunnelService.track_funnel_event(
                        funnel_id=1,  # Default business funnel
                        user=instance.event.client if instance.event else None,
                        event_name='quote_accepted',
                        event_data={
                            'quote_id': instance.id,
                            'amount': str(instance.total_amount)
                        }
                    )
                except Exception as e:
                    logger.debug(f"Could not track funnel event: {e}")


@receiver(pre_save, sender='sales.EventQuote')
def store_quote_previous_status(sender, instance, **kwargs):
    """Store previous quote status for change detection"""
    if instance.pk:
        try:
            previous = sender.objects.get(pk=instance.pk)
            instance._previous_status = previous.status
        except sender.DoesNotExist:
            instance._previous_status = None


@receiver(post_save, sender='sales.QuoteLineItem')
def track_quote_line_item_events(sender, instance, created, **kwargs):
    """Track quote line item changes"""
    if created:
        EventTrackingService.track_event(
            event_name='quote_line_item_added',
            event_category='BUSINESS_EVENT',
            source_domain='sales',
            source_model='QuoteLineItem',
            source_id=instance.id,
            user=instance.quote.event.client if instance.quote.event else None,
            event_data={
                'quote_id': instance.quote.id,
                'product_name': instance.product.name if instance.product else instance.description,
                'quantity': instance.quantity,
                'unit_price': str(instance.unit_price),
                'total': str(instance.total),
            },
            numeric_value=instance.total
        )