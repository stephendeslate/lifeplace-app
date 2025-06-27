# backend/core/domains/analytics/signals/workflow_signals.py
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from ..services import EventTrackingService

logger = logging.getLogger(__name__)


@receiver(post_save, sender='workflows.WorkflowStage')
def track_workflow_stage_progression(sender, instance, created, **kwargs):
    """Track workflow stage changes for events"""
    if not created:
        # Find events that use this workflow stage
        try:
            from core.domains.events.models import Event
            
            events_with_stage = Event.objects.filter(current_stage=instance)
            for event in events_with_stage:
                EventTrackingService.track_event(
                    event_name='workflow_stage_updated',
                    event_category='SYSTEM_EVENT',
                    source_domain='workflows',
                    source_model='WorkflowStage',
                    source_id=instance.id,
                    user=getattr(event, 'client', None),
                    event_data={
                        'event_id': event.id,
                        'stage_name': instance.name,
                        'stage_type': instance.stage,
                        'workflow_template': instance.template.name,
                        'order': instance.order,
                    }
                )
        except Exception as e:
            logger.debug(f"Error tracking workflow stage progression: {e}")