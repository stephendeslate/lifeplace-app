# backend/core/domains/analytics/signals/event_signals.py
import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from ..services import EventTrackingService, ConversionFunnelService

logger = logging.getLogger(__name__)


@receiver(post_save, sender='events.Event')
def track_event_changes(sender, instance, created, **kwargs):
    """Track event creation and status changes"""
    if created:
        EventTrackingService.track_event(
            event_name='event_created',
            event_category='BUSINESS_EVENT',
            source_domain='events',
            source_model='Event',
            source_id=instance.id,
            user=getattr(instance, 'client', None),
            event_data={
                'event_type': instance.event_type.name if instance.event_type else None,
                'status': instance.status,
                'total_price': str(instance.total_price) if instance.total_price else None,
                'start_date': instance.start_date.isoformat() if instance.start_date else None,
            },
            numeric_value=instance.total_price
        )
        
        # Track funnel event for event creation
        try:
            funnel = ConversionFunnelService.get_funnel_by_id(1)  # Default business funnel
            ConversionFunnelService.track_funnel_event(
                funnel_id=1,
                user=getattr(instance, 'client', None),
                event_name='event_created',
                event_data={'event_id': instance.id}
            )
        except Exception as e:
            logger.debug(f"Could not track funnel event: {e}")
    else:
        # Track status changes
        old_status = getattr(instance, '_previous_status', None)
        if old_status and instance.status != old_status:
            EventTrackingService.track_event(
                event_name='event_status_changed',
                event_category='BUSINESS_EVENT',
                source_domain='events',
                source_model='Event',
                source_id=instance.id,
                user=getattr(instance, 'client', None),
                event_data={
                    'old_status': old_status,
                    'new_status': instance.status,
                    'event_type': instance.event_type.name if instance.event_type else None,
                }
            )


@receiver(pre_save, sender='events.Event')
def store_event_previous_status(sender, instance, **kwargs):
    """Store previous status for change detection"""
    if instance.pk:
        try:
            previous = sender.objects.get(pk=instance.pk)
            instance._previous_status = previous.status
        except sender.DoesNotExist:
            instance._previous_status = None


@receiver(post_save, sender='events.EventTask')
def track_task_events(sender, instance, created, **kwargs):
    """Track task creation and completion"""
    if created:
        EventTrackingService.track_event(
            event_name='task_created',
            event_category='SYSTEM_EVENT',
            source_domain='events',
            source_model='EventTask',
            source_id=instance.id,
            user=instance.assigned_to,
            event_data={
                'event_id': instance.event.id,
                'task_name': instance.name,
                'priority': instance.priority,
                'due_date': instance.due_date.isoformat() if instance.due_date else None,
                'status': instance.status,
            }
        )
    else:
        # Track completion
        if instance.status == 'COMPLETED' and not getattr(instance, '_completion_tracked', False):
            EventTrackingService.track_event(
                event_name='task_completed',
                event_category='SYSTEM_EVENT',
                source_domain='events',
                source_model='EventTask',
                source_id=instance.id,
                user=instance.assigned_to,
                event_data={
                    'event_id': instance.event.id,
                    'task_name': instance.name,
                    'priority': instance.priority,
                    'completion_notes': instance.completion_notes or '',
                }
            )
            instance._completion_tracked = True