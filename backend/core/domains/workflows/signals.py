# backend/core/domains/workflows/signals.py
from core.domains.events.models import Event
from core.domains.sales.models import EventQuote
from core.domains.workflows.engine import WorkflowEngine
from django.db.models.signals import post_init, post_save
from django.dispatch import receiver


@receiver(post_save, sender=Event)
def handle_event_changes(sender, instance, created, **kwargs):
    """Handle workflow transitions based on event changes"""
    if created:
        # Assign initial workflow stage for new events
        WorkflowEngine.assign_initial_workflow(instance)
    else:
        # Get the old status if available
        old_status = getattr(instance, '_previous_status', None)
        
        # If status changed, notify the workflow engine
        if old_status and instance.status != old_status:
            WorkflowEngine.progress_workflow(
                instance, 
                trigger_type='STATUS_CHANGE',
                data={'old_status': old_status, 'new_status': instance.status}
            )

@receiver(post_init, sender=Event)
def store_initial_status(sender, instance, **kwargs):
    """Store the initial status of an event for change detection"""
    instance._previous_status = instance.status

@receiver(post_save, sender=EventQuote)
def handle_quote_changes(sender, instance, created, **kwargs):
    """Handle workflow transitions based on quote changes"""
    if not created:
        # Get associated event
        event = instance.event
        
        # If quote was accepted
        if instance.status == 'ACCEPTED':
            # Progress workflow based on quote acceptance
            WorkflowEngine.progress_workflow(
                event, 
                trigger_type='QUOTE_ACCEPTED',
                data={'quote_id': instance.id}
            )