# backend/core/domains/workflows/tasks.py
import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

@shared_task
def schedule_stage_actions(event_id, stage_id):
    """Schedule actions for a workflow stage based on trigger time"""
    from core.domains.events.models import Event
    from core.domains.workflows.engine import WorkflowEngine
    from core.domains.workflows.models import WorkflowStage
    
    try:
        event = Event.objects.get(id=event_id)
        stage = WorkflowStage.objects.get(id=stage_id)
        
        # Parse trigger time (e.g., "AFTER_3_DAYS")
        trigger_parts = stage.trigger_time.split('_')
        
        if len(trigger_parts) >= 3 and trigger_parts[0] == 'AFTER':
            try:
                # Extract the number and unit
                number = int(trigger_parts[1])
                unit = trigger_parts[2].lower()
                
                # Calculate the delay based on unit
                if unit.startswith('day'):
                    execute_at = timezone.now() + timezone.timedelta(days=number)
                elif unit.startswith('hour'):
                    execute_at = timezone.now() + timezone.timedelta(hours=number)
                elif unit.startswith('week'):
                    execute_at = timezone.now() + timezone.timedelta(weeks=number)
                else:
                    # Default to days if unit not recognized
                    execute_at = timezone.now() + timezone.timedelta(days=number)
                
                # Schedule the task
                execute_delayed_stage_action.apply_async(
                    args=[event_id, stage_id],
                    eta=execute_at
                )
                
                logger.info(f"Scheduled delayed action for event {event_id}, stage {stage_id} at {execute_at}")
            except (ValueError, IndexError):
                logger.error(f"Invalid trigger time format: {stage.trigger_time}")
    except (Event.DoesNotExist, WorkflowStage.DoesNotExist) as e:
        logger.error(f"Error scheduling stage actions: {str(e)}")

@shared_task
def execute_delayed_stage_action(event_id, stage_id):
    """Execute a delayed action for a workflow stage"""
    from core.domains.events.models import Event
    from core.domains.workflows.engine import WorkflowEngine
    from core.domains.workflows.models import WorkflowStage
    
    try:
        event = Event.objects.get(id=event_id)
        stage = WorkflowStage.objects.get(id=stage_id)
        
        # Check if the event is still in this stage
        if event.current_stage_id == stage_id:
            # Execute the immediate actions (as if they were delayed)
            WorkflowEngine._execute_immediate_actions(event, stage)
            
            # Check if we should progress to next stage
            WorkflowEngine.progress_workflow(
                event, 
                trigger_type='SCHEDULED_ACTION',
                data={'stage_id': stage_id}
            )
            
            logger.info(f"Executed delayed action for event {event_id}, stage {stage_id}")
    except (Event.DoesNotExist, WorkflowStage.DoesNotExist) as e:
        logger.error(f"Error executing delayed stage action: {str(e)}")