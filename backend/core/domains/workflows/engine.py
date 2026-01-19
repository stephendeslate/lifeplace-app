# backend/core/domains/workflows/engine.py
import logging

from core.domains.events.models import Event, EventTimeline
from core.domains.workflows.models import WorkflowStage, EventWorkflowOverride
from core.domains.workflows.tasks import schedule_stage_actions, schedule_before_event_action
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

class WorkflowEngine:
    """
    Central engine for managing workflow transitions and executing
    stage-specific actions for events.
    """
    
    @classmethod
    def assign_initial_workflow(cls, event):
        """Assign the initial workflow stage to a new event with context-aware selection"""
        if not event.workflow_template:
            return

        # Context-aware stage selection based on completion type
        try:
            first_stage = None

            # For quote requests, try to find a quote-specific LEAD stage
            if event.completion_type == 'quote':
                # Look for quote-specific stage (marked in metadata)
                first_stage = event.workflow_template.stages.filter(
                    stage='LEAD',
                    metadata__flow_type='quote'
                ).order_by('order').first()

                if first_stage:
                    logger.info(f"Found quote-specific LEAD stage '{first_stage.name}' for event {event.id}")

            # Fallback: Find the first LEAD stage (for payment or if no quote stage exists)
            if not first_stage:
                first_stage = event.workflow_template.stages.filter(
                    stage='LEAD'
                ).order_by('order').first()

                if first_stage and event.completion_type == 'quote':
                    logger.info(f"No quote-specific stage found, using default LEAD stage '{first_stage.name}' for event {event.id}")

            if first_stage:
                event.current_stage = first_stage
                event.save(update_fields=['current_stage'])

                # Log the stage assignment
                EventTimeline.objects.create(
                    event=event,
                    action_type='STAGE_CHANGE',
                    description=f"Initial workflow stage: {first_stage.name}",
                    is_public=True
                )

                # Execute stage actions
                cls.execute_stage_actions(event, first_stage)

                # Execute automation for any stages with trigger_on_event_created
                # These run in addition to the first stage's automation
                stages_with_event_trigger = event.workflow_template.stages.filter(
                    trigger_on_event_created=True
                ).exclude(id=first_stage.id).order_by('stage', 'order')

                for triggered_stage in stages_with_event_trigger:
                    logger.info(f"Executing trigger_on_event_created automation for stage '{triggered_stage.name}' on event {event.id}")
                    if triggered_stage.is_automated:
                        triggered_stage._execute_automation(event)

                logger.info(f"Assigned initial workflow stage '{first_stage.name}' to event {event.id} (completion_type: {event.completion_type})")
        except Exception as e:
            logger.error(f"Error assigning initial workflow: {str(e)}")
    
    @classmethod
    def progress_workflow(cls, event, trigger_type=None, data=None):
        """
        Progress an event through its workflow based on current state and triggers

        Args:
            event: The event to progress
            trigger_type: The type of trigger (STATUS_CHANGE, PAYMENT, etc.)
            data: Additional data relevant to the trigger

        Returns:
            bool: Whether progression occurred
        """
        if not event.workflow_template or not event.current_stage:
            return False

        current_stage = event.current_stage

        # Determine eligible next stages
        next_stages = cls._get_eligible_next_stages(event, trigger_type, data)

        if not next_stages:
            return False

        # Idempotency check: if next stage is same as current, don't re-progress
        next_stage = next_stages[0]
        if next_stage.id == current_stage.id:
            logger.debug(f"Event {event.id} already at stage '{current_stage.name}' - skipping duplicate progression")
            return False

        with transaction.atomic():
            # Update event stage
            event.current_stage = next_stage
            event.save(update_fields=['current_stage'])

            # Log the stage transition
            EventTimeline.objects.create(
                event=event,
                action_type='STAGE_CHANGE',
                description=f"Moved from '{current_stage.name}' to '{next_stage.name}'",
                action_data={
                    'previous_stage': current_stage.id,
                    'trigger_type': trigger_type
                },
                is_public=True
            )

            # Execute stage actions
            cls.execute_stage_actions(event, next_stage)

            logger.info(f"Event {event.id} progressed from '{current_stage.name}' to '{next_stage.name}'")
            return True
    
    @classmethod
    def _get_eligible_next_stages(cls, event, trigger_type=None, data=None):
        """
        Determine eligible next stages based on current conditions

        This is where business rules for stage progression are defined
        """
        if not event.current_stage:
            return []

        current_stage = event.current_stage

        # Check if current stage is waiting for this specific trigger
        # If so, execute automation but don't progress yet
        # Also check other stages in the workflow that might have the trigger configured
        if trigger_type:
            # Helper to find and execute stage with specific trigger
            def find_and_execute_triggered_stage(trigger_field):
                """Find a stage with the trigger and execute its automation"""
                # First check current stage
                if getattr(current_stage, trigger_field, False):
                    logger.info(f"Current stage '{current_stage.name}' triggered by {trigger_type} - executing automation")
                    current_stage._execute_automation(event)
                    return True

                # Search for any stage in this workflow with the trigger
                triggered_stage = WorkflowStage.objects.filter(
                    template=event.workflow_template,
                    **{trigger_field: True}
                ).first()

                if triggered_stage:
                    logger.info(f"Stage '{triggered_stage.name}' triggered by {trigger_type} - executing automation")
                    triggered_stage._execute_automation(event)
                    return True

                return False

            if trigger_type == 'PAYMENT_RECEIVED':
                find_and_execute_triggered_stage('trigger_on_payment_received')
                # For CONFIRMED events, continue to progression logic below
                # For non-confirmed events, stay on current stage
                if event.status != 'CONFIRMED':
                    return []

            if trigger_type == 'QUOTE_ACCEPTED':
                if find_and_execute_triggered_stage('trigger_on_quote_accepted'):
                    return []  # Stay on current stage

            if trigger_type == 'CONTRACT_SIGNED':
                if find_and_execute_triggered_stage('trigger_on_contract_signed'):
                    return []  # Stay on current stage

            if trigger_type == 'QUOTE_SENT':
                if find_and_execute_triggered_stage('trigger_on_quote_sent'):
                    return []  # Stay on current stage

        # For CONFIRMED events in LEAD stage, skip to PRODUCTION
        # This handles direct-payment bookings that skip quote review
        if current_stage.stage == 'LEAD' and event.status == 'CONFIRMED':
            next_stages = WorkflowStage.objects.filter(
                template=event.workflow_template,
                stage='PRODUCTION'
            ).order_by('order')

            if next_stages.exists():
                next_stage = next_stages.first()
                if next_stage.check_advancement_criteria(event):
                    logger.info(f"CONFIRMED event {event.id} skipping remaining LEAD stages, moving to PRODUCTION '{next_stage.name}'")
                    return [next_stage]

        # Normal sequential flow: next stage in the same category
        next_order = current_stage.order + 1

        next_stages = WorkflowStage.objects.filter(
            template=event.workflow_template,
            stage=current_stage.stage,
            order=next_order
        )

        # If we found a next stage in the same category, check if eligible
        if next_stages.exists():
            next_stage = next_stages.first()
            # Check advancement criteria before progressing
            if next_stage.check_advancement_criteria(event):
                return [next_stage]
            else:
                logger.info(f"Event {event.id} blocked at '{current_stage.name}' - next stage criteria not met")
                return []  # Blocked by progression criteria

        # Cross-category progression: LEAD -> PRODUCTION -> POST_PRODUCTION
        if current_stage.stage == 'LEAD':
            # Move from LEAD to PRODUCTION when:
            # 1. Event status is CONFIRMED, or
            # 2. Payment is received (for paid bookings)
            if trigger_type == 'STATUS_CHANGE' and event.status == 'CONFIRMED':
                next_stages = WorkflowStage.objects.filter(
                    template=event.workflow_template,
                    stage='PRODUCTION'
                ).order_by('order')

                if next_stages.exists():
                    next_stage = next_stages.first()
                    if next_stage.check_advancement_criteria(event):
                        return [next_stage]
                    return []

            elif trigger_type == 'PAYMENT_RECEIVED':
                # Payment received - move to first PRODUCTION stage
                next_stages = WorkflowStage.objects.filter(
                    template=event.workflow_template,
                    stage='PRODUCTION'
                ).order_by('order')

                if next_stages.exists():
                    next_stage = next_stages.first()
                    if next_stage.check_advancement_criteria(event):
                        return [next_stage]
                    else:
                        logger.info(f"Event {event.id} cannot progress to PRODUCTION - criteria not met")
                        return []

        elif current_stage.stage == 'PRODUCTION' and trigger_type == 'STATUS_CHANGE' and event.status == 'COMPLETED':
            # Move from PRODUCTION to POST_PRODUCTION when event is completed
            next_stages = WorkflowStage.objects.filter(
                template=event.workflow_template,
                stage='POST_PRODUCTION'
            ).order_by('order')

            if next_stages.exists():
                return [next_stages.first()]

        # No eligible next stages found
        return []
    
    @classmethod
    def execute_stage_actions(cls, event, stage):
        """
        Execute actions for a workflow stage

        This method dispatches to appropriate action handlers based on stage configuration.

        Supported trigger_time formats:
        - ON_CREATION: Execute immediately when stage is reached
        - AFTER_X_DAYS, AFTER_X_HOURS, AFTER_X_WEEKS: Delay after stage start
        - X_DAYS_BEFORE_EVENT: Execute X days before event.start_date
        """
        if stage.is_automated:
            # Execute the stage's automation (handles all automation types)
            stage._execute_automation(event)

            # Schedule delayed actions if needed
            if stage.trigger_time:
                trigger_upper = stage.trigger_time.upper()

                if trigger_upper.startswith('AFTER_'):
                    # Delay after stage start (existing behavior)
                    schedule_stage_actions.delay(event.id, stage.id)
                elif '_DAYS_BEFORE_EVENT' in trigger_upper or '_BEFORE_EVENT' in trigger_upper:
                    # Schedule to execute X days before event start_date
                    schedule_before_event_action.delay(event.id, stage.id)