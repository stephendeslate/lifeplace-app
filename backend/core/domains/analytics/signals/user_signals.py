# backend/core/domains/analytics/signals/user_signals.py
import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from ..services import EventTrackingService, ConversionFunnelService

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=User)
def track_user_events(sender, instance, created, **kwargs):
    """Track user registration and profile changes"""
    if created:
        EventTrackingService.track_event(
            event_name='user_registered',
            event_category='USER_ACTION',
            source_domain='users',
            source_model='User',
            source_id=instance.id,
            user=instance,
            event_data={
                'role': instance.role,
                'email': instance.email,
                'registration_method': getattr(instance, 'registration_method', 'direct'),
                'first_name': instance.first_name,
                'last_name': instance.last_name,
            }
        )
        
        # Track funnel event for user registration
        try:
            ConversionFunnelService.track_funnel_event(
                funnel_id=1,  # Default business funnel
                user=instance,
                event_name='user_registered',
                event_data={'user_id': instance.id}
            )
        except Exception as e:
            logger.debug(f"Could not track funnel event: {e}")
    else:
        # Track profile updates
        old_data = getattr(instance, '_previous_data', {})
        changes = {}
        
        # Check for field changes
        fields_to_track = ['first_name', 'last_name', 'email', 'phone', 'role']
        for field in fields_to_track:
            old_value = old_data.get(field)
            new_value = getattr(instance, field, None)
            if old_value != new_value:
                changes[field] = {'old': old_value, 'new': new_value}
        
        if changes:
            EventTrackingService.track_event(
                event_name='user_profile_updated',
                event_category='USER_ACTION',
                source_domain='users',
                source_model='User',
                source_id=instance.id,
                user=instance,
                event_data={
                    'changes': changes,
                    'role': instance.role,
                }
            )


@receiver(pre_save, sender=User)
def store_user_previous_data(sender, instance, **kwargs):
    """Store previous user data for change detection"""
    if instance.pk:
        try:
            previous = sender.objects.get(pk=instance.pk)
            instance._previous_data = {
                'first_name': previous.first_name,
                'last_name': previous.last_name,
                'email': previous.email,
                'phone': getattr(previous, 'phone', None),
                'role': previous.role,
            }
        except sender.DoesNotExist:
            instance._previous_data = {}