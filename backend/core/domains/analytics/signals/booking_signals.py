# backend/core/domains/analytics/signals/booking_signals.py
import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from ..services import EventTrackingService, ConversionFunnelService

logger = logging.getLogger(__name__)


@receiver(post_save, sender='bookingflow.BookingSession')
def track_booking_session_events(sender, instance, created, **kwargs):
    """Track booking session events"""
    if created:
        EventTrackingService.track_event(
            event_name='booking_session_started',
            event_category='USER_ACTION',
            source_domain='bookingflow',
            source_model='BookingSession',
            source_id=instance.id,
            user=instance.client,
            session_id=str(instance.session_id),
            event_data={
                'booking_flow_id': instance.booking_flow.id,
                'booking_flow_name': instance.booking_flow.name,
                'event_type': instance.booking_flow.event_type.name if instance.booking_flow.event_type else None,
                'current_step': instance.current_step.name if instance.current_step else None,
            }
        )
        
        # Track funnel event
        try:
            ConversionFunnelService.track_funnel_event(
                funnel_id=1,  # Default business funnel
                user=instance.client,
                session_id=str(instance.session_id),
                event_name='booking_session_started',
                event_data={'session_id': str(instance.session_id)}
            )
        except Exception as e:
            logger.debug(f"Could not track funnel event: {e}")
    
    elif instance.is_completed and not getattr(instance, '_completion_tracked', False):
        # Track completion
        EventTrackingService.track_event(
            event_name='booking_session_completed',
            event_category='BUSINESS_EVENT',
            source_domain='bookingflow',
            source_model='BookingSession',
            source_id=instance.id,
            user=instance.client,
            session_id=str(instance.session_id),
            event_data={
                'booking_flow_id': instance.booking_flow.id,
                'booking_flow_name': instance.booking_flow.name,
                'total_price': str(instance.total_price),
                'created_event_id': instance.created_event.id if instance.created_event else None,
            },
            numeric_value=instance.total_price
        )
        
        # Track funnel event
        try:
            ConversionFunnelService.track_funnel_event(
                funnel_id=1,  # Default business funnel
                user=instance.client,
                session_id=str(instance.session_id),
                event_name='booking_completed',
                event_data={
                    'session_id': str(instance.session_id),
                    'total_price': str(instance.total_price)
                }
            )
        except Exception as e:
            logger.debug(f"Could not track funnel event: {e}")
        
        # Mark as tracked to avoid duplicate tracking
        instance._completion_tracked = True
    
    elif instance.is_abandoned and not getattr(instance, '_abandonment_tracked', False):
        # Track abandonment
        EventTrackingService.track_event(
            event_name='booking_session_abandoned',
            event_category='USER_ACTION',
            source_domain='bookingflow',
            source_model='BookingSession',
            source_id=instance.id,
            user=instance.client,
            session_id=str(instance.session_id),
            event_data={
                'booking_flow_id': instance.booking_flow.id,
                'booking_flow_name': instance.booking_flow.name,
                'current_step': instance.current_step.name if instance.current_step else None,
                'abandonment_reason': instance.booking_data.get('abandonment_reason'),
                'progress_percentage': instance.progress_percentage,
            }
        )
        
        # Mark as tracked
        instance._abandonment_tracked = True


@receiver(post_save, sender='bookingflow.BookingFlow')
def track_booking_flow_events(sender, instance, created, **kwargs):
    """Track booking flow creation and changes"""
    if created:
        EventTrackingService.track_event(
            event_name='booking_flow_created',
            event_category='SYSTEM_EVENT',
            source_domain='bookingflow',
            source_model='BookingFlow',
            source_id=instance.id,
            event_data={
                'flow_name': instance.name,
                'event_type': instance.event_type.name if instance.event_type else None,
                'is_active': instance.is_active,
                'total_steps': instance.total_steps,
            }
        )
    else:
        # Track activation/deactivation
        old_status = getattr(instance, '_previous_is_active', None)
        if old_status is not None and instance.is_active != old_status:
            event_name = 'booking_flow_activated' if instance.is_active else 'booking_flow_deactivated'
            EventTrackingService.track_event(
                event_name=event_name,
                event_category='SYSTEM_EVENT',
                source_domain='bookingflow',
                source_model='BookingFlow',
                source_id=instance.id,
                event_data={
                    'flow_name': instance.name,
                    'event_type': instance.event_type.name if instance.event_type else None,
                    'is_active': instance.is_active,
                }
            )


@receiver(pre_save, sender='bookingflow.BookingFlow')
def store_booking_flow_previous_status(sender, instance, **kwargs):
    """Store previous active status for change detection"""
    if instance.pk:
        try:
            previous = sender.objects.get(pk=instance.pk)
            instance._previous_is_active = previous.is_active
        except sender.DoesNotExist:
            instance._previous_is_active = None


@receiver(post_save, sender='bookingflow.BookingFlowStep')
def track_booking_step_events(sender, instance, created, **kwargs):
    """Track booking flow step changes"""
    if created:
        EventTrackingService.track_event(
            event_name='booking_step_created',
            event_category='SYSTEM_EVENT',
            source_domain='bookingflow',
            source_model='BookingFlowStep',
            source_id=instance.id,
            event_data={
                'step_name': instance.name,
                'step_type': instance.step_type,
                'booking_flow': instance.booking_flow.name,
                'order': instance.order,
                'is_enabled': instance.is_enabled,
            }
        )