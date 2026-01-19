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
            # Execute the stage automation
            if stage.is_automated:
                stage._execute_automation(event)

            # Check if we should progress to next stage
            WorkflowEngine.progress_workflow(
                event,
                trigger_type='SCHEDULED_ACTION',
                data={'stage_id': stage_id}
            )

            logger.info(f"Executed delayed action for event {event_id}, stage {stage_id}")
    except (Event.DoesNotExist, WorkflowStage.DoesNotExist) as e:
        logger.error(f"Error executing delayed stage action: {str(e)}")


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def schedule_before_event_action(self, event_id: int, stage_id: int):
    """
    Schedule a workflow stage action to execute X days before event start_date.

    Parses trigger_time formats like:
    - "30_DAYS_BEFORE_EVENT"
    - "7_DAYS_BEFORE_EVENT"
    - "1_DAY_BEFORE_EVENT"

    Args:
        event_id: ID of the event
        stage_id: ID of the workflow stage
    """
    import re
    from core.domains.events.models import Event
    from core.domains.workflows.models import WorkflowStage

    try:
        event = Event.objects.get(id=event_id)
        stage = WorkflowStage.objects.get(id=stage_id)

        # Check if event has a start_date
        if not event.start_date:
            logger.warning(
                f"Event {event_id} has no start_date - cannot schedule BEFORE_EVENT action "
                f"for stage '{stage.name}'"
            )
            return {'status': 'skipped', 'reason': 'no_start_date'}

        # Parse trigger time (e.g., "30_DAYS_BEFORE_EVENT" or "7_DAYS_BEFORE_EVENT")
        trigger_time = stage.trigger_time.upper()

        # Extract the number of days using regex
        # Matches patterns like: 30_DAYS_BEFORE_EVENT, 7_DAY_BEFORE_EVENT
        match = re.match(r'(\d+)_DAYS?_BEFORE_EVENT', trigger_time)

        if not match:
            logger.error(f"Invalid BEFORE_EVENT trigger time format: {stage.trigger_time}")
            return {'status': 'error', 'reason': 'invalid_format'}

        days_before = int(match.group(1))

        # Calculate execution time (event.start_date - X days)
        execute_at = event.start_date - timezone.timedelta(days=days_before)

        # If calculated time is in the past, execute immediately
        now = timezone.now()
        if execute_at <= now:
            logger.info(
                f"Trigger time for stage '{stage.name}' is in past ({execute_at}), "
                f"executing immediately"
            )
            execute_delayed_stage_action.apply_async(
                args=[event_id, stage_id]
            )
        else:
            # Schedule for future execution
            execute_delayed_stage_action.apply_async(
                args=[event_id, stage_id],
                eta=execute_at
            )
            logger.info(
                f"Scheduled BEFORE_EVENT action for event {event_id}, stage '{stage.name}' "
                f"at {execute_at} ({days_before} days before event)"
            )

        return {
            'status': 'scheduled',
            'event_id': event_id,
            'stage_id': stage_id,
            'execute_at': execute_at.isoformat(),
            'days_before': days_before,
        }

    except Event.DoesNotExist:
        logger.error(f"Event {event_id} not found for BEFORE_EVENT scheduling")
        return {'status': 'error', 'reason': 'event_not_found'}
    except WorkflowStage.DoesNotExist:
        logger.error(f"WorkflowStage {stage_id} not found for BEFORE_EVENT scheduling")
        return {'status': 'error', 'reason': 'stage_not_found'}
    except Exception as e:
        logger.error(f"Error scheduling BEFORE_EVENT action: {e}")
        raise  # Let Celery retry


@shared_task(
    bind=True,
    max_retries=1,
)
def process_before_event_triggers(self):
    """
    Daily sweep to catch any missed BEFORE_EVENT triggers.

    Finds workflow stages with BEFORE_EVENT triggers and events that
    should have had their actions executed. This is a safety net for
    stages that might have been missed during initial workflow assignment.

    Called daily via Celery beat.
    """
    import re
    from datetime import timedelta
    from core.domains.events.models import Event
    from core.domains.workflows.models import WorkflowStage

    logger.info("Starting BEFORE_EVENT trigger sweep")

    now = timezone.now()
    processed_count = 0
    error_count = 0

    # Find all stages with BEFORE_EVENT triggers that are automated
    before_event_stages = WorkflowStage.objects.filter(
        trigger_time__icontains='BEFORE_EVENT',
        is_automated=True,
    ).select_related('template')

    for stage in before_event_stages:
        # Parse days before from trigger_time
        match = re.match(r'(\d+)_DAYS?_BEFORE_EVENT', stage.trigger_time.upper())
        if not match:
            continue

        days_before = int(match.group(1))

        # Calculate the target date (events starting in exactly X days)
        target_date = (now + timedelta(days=days_before)).date()

        # Find events at this stage with start_date on target_date
        events = Event.objects.filter(
            workflow_template=stage.template,
            current_stage=stage,
            start_date__date=target_date,
            status__in=['LEAD', 'CONFIRMED'],
        ).exclude(status='CANCELLED')

        for event in events:
            try:
                # Schedule the action (the task will handle duplicate prevention)
                schedule_before_event_action.delay(event.id, stage.id)
                processed_count += 1
                logger.info(
                    f"Scheduled BEFORE_EVENT action from sweep for event {event.id}, "
                    f"stage '{stage.name}'"
                )

            except Exception as e:
                logger.error(
                    f"Error processing BEFORE_EVENT trigger for event {event.id}: {e}"
                )
                error_count += 1

    logger.info(
        f"BEFORE_EVENT trigger sweep completed: "
        f"{processed_count} scheduled, {error_count} errors"
    )
    return {'processed': processed_count, 'errors': error_count}


@shared_task(
    bind=True,
    max_retries=1,
)
def process_time_elapsed_triggers(self):
    """
    Hourly sweep to check for events that meet TIME_ELAPSED progression conditions.

    Finds events with stages that have TIME_ELAPSED progression conditions
    and triggers workflow progression if the time requirement is met.

    Called hourly via Celery beat.
    """
    from core.domains.events.models import Event
    from core.domains.workflows.engine import WorkflowEngine
    from core.domains.workflows.models import WorkflowStage

    logger.info("Starting TIME_ELAPSED trigger sweep")

    processed_count = 0
    error_count = 0

    # Find all stages with TIME_ELAPSED progression conditions
    time_elapsed_stages = WorkflowStage.objects.filter(
        progression_condition__istartswith='TIME_ELAPSED'
    ).select_related('template')

    for stage in time_elapsed_stages:
        # Find events currently at this stage
        events = Event.objects.filter(
            workflow_template=stage.template,
            current_stage=stage,
        ).exclude(status='CANCELLED')

        for event in events:
            try:
                # Check if the stage's criteria are now met
                if stage.check_advancement_criteria(event):
                    # Attempt to progress the workflow
                    progressed = WorkflowEngine.progress_workflow(
                        event,
                        trigger_type='TIME_ELAPSED',
                        data={'stage_id': stage.id}
                    )
                    if progressed:
                        processed_count += 1
                        logger.info(
                            f"TIME_ELAPSED triggered progression for event {event.id} "
                            f"from stage '{stage.name}'"
                        )
            except Exception as e:
                logger.error(
                    f"Error processing TIME_ELAPSED trigger for event {event.id}: {e}"
                )
                error_count += 1

    logger.info(
        f"TIME_ELAPSED trigger sweep completed: "
        f"{processed_count} progressions, {error_count} errors"
    )
    return {'processed': processed_count, 'errors': error_count}