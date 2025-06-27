# backend/core/domains/analytics/signals/workflow_signals.py
import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from ..services import EventTrackingService

logger = logging.getLogger(__name__)


@receiver(post_save, sender='workflows.WorkflowStage')
def track_workflow_stage_events(sender, instance, created, **kwargs):
    """Track workflow stage creation and updates"""
    if created:
        EventTrackingService.track_event(
            event_name='workflow_stage_created',
            event_category='SYSTEM_EVENT',
            source_domain='workflows',
            source_model='WorkflowStage',
            source_id=instance.id,
            event_data={
                'stage_name': instance.name,
                'stage_type': instance.stage,
                'workflow_template': instance.template.name,
                'order': instance.order,
                'is_automated': instance.is_automated,
                'automation_type': instance.automation_type,
            }
        )


@receiver(post_save, sender='workflows.WorkflowTemplate')
def track_workflow_template_events(sender, instance, created, **kwargs):
    """Track workflow template creation and updates"""
    if created:
        EventTrackingService.track_event(
            event_name='workflow_template_created',
            event_category='SYSTEM_EVENT',
            source_domain='workflows',
            source_model='WorkflowTemplate',
            source_id=instance.id,
            event_data={
                'template_name': instance.name,
                'event_type': instance.event_type.name if instance.event_type else None,
                'is_active': instance.is_active,
                'stage_count': instance.stages.count() if hasattr(instance, 'stages') else 0,
            }
        )


# Track when events change workflow stages
@receiver(post_save, sender='events.Event')
def track_event_workflow_progression(sender, instance, created, **kwargs):
    """Track when events progress through workflow stages"""
    if not created and instance.current_stage:
        old_stage = getattr(instance, '_previous_stage', None)
        if old_stage and instance.current_stage != old_stage:
            EventTrackingService.track_event(
                event_name='event_workflow_progression',
                event_category='BUSINESS_EVENT',
                source_domain='events',
                source_model='Event',
                source_id=instance.id,
                user=instance.client,
                event_data={
                    'event_id': instance.id,
                    'old_stage': old_stage.name if hasattr(old_stage, 'name') else str(old_stage),
                    'new_stage': instance.current_stage.name,
                    'workflow_template': instance.workflow_template.name if instance.workflow_template else None,
                    'progress_percentage': instance.workflow_progress,
                }
            )


@receiver(pre_save, sender='events.Event')
def store_event_previous_stage(sender, instance, **kwargs):
    """Store previous workflow stage for change detection"""
    if instance.pk:
        try:
            previous = sender.objects.get(pk=instance.pk)
            instance._previous_stage = previous.current_stage
        except sender.DoesNotExist:
            instance._previous_stage = None