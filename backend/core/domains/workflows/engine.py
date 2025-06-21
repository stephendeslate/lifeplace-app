# backend/core/domains/workflows/engine.py
import logging

from core.domains.events.models import Event, EventTask, EventTimeline
from core.domains.sales.models import EventQuote
from core.domains.workflows.models import WorkflowStage
from core.domains.workflows.tasks import schedule_stage_actions
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
        """Assign the initial workflow stage to a new event"""
        if not event.workflow_template:
            return
            
        # Find the first LEAD stage
        try:
            first_stage = event.workflow_template.stages.filter(
                stage='LEAD'
            ).order_by('order').first()
            
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
                
                logger.info(f"Assigned initial workflow stage '{first_stage.name}' to event {event.id}")
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
            
        # Move to next stage
        next_stage = next_stages[0]  # Take the first eligible stage
        
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
        
        # Find stages in the same category with the next order
        next_order = current_stage.order + 1
        
        # Normal flow: next stage in the same category
        next_stages = WorkflowStage.objects.filter(
            template=event.workflow_template,
            stage=current_stage.stage,
            order=next_order
        )
        
        # If we found a next stage in the same category, return it
        if next_stages.exists():
            return list(next_stages)
        
        # If we've reached the end of a category, try moving to the next category
        if current_stage.stage == 'LEAD' and trigger_type == 'STATUS_CHANGE' and event.status == 'CONFIRMED':
            # Move from LEAD to PRODUCTION when status becomes CONFIRMED
            next_stages = WorkflowStage.objects.filter(
                template=event.workflow_template,
                stage='PRODUCTION'
            ).order_by('order')
            
            if next_stages.exists():
                return [next_stages.first()]
                
        elif current_stage.stage == 'PRODUCTION' and trigger_type == 'STATUS_CHANGE' and event.status == 'COMPLETED':
            # Move from PRODUCTION to POST_PRODUCTION when status becomes COMPLETED
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
        
        This method dispatches to appropriate action handlers based on stage configuration
        """
        if stage.is_automated:
            # Immediate actions
            cls._execute_immediate_actions(event, stage)
            
            # Schedule delayed actions if needed
            if stage.trigger_time and stage.trigger_time.startswith('AFTER_'):
                schedule_stage_actions.delay(event.id, stage.id)
    
    @classmethod
    def _execute_immediate_actions(cls, event, stage):
        """Execute immediate actions for a stage"""
        if not stage.is_automated:
            return
            
        # Create a task for the stage if it has a task description
        if stage.task_description:
            # Calculate due date (default to 3 days from now)
            due_date = timezone.now() + timezone.timedelta(days=3)
            
            # Create the task
            EventTask.objects.create(
                event=event,
                title=stage.name,
                description=stage.task_description,
                due_date=due_date,
                priority='MEDIUM',
                status='PENDING',
                workflow_stage=stage,
                is_visible_to_client=False
            )
            
            logger.info(f"Created task '{stage.name}' for event {event.id}")
        
        # Handle different automation types
        if stage.automation_type == 'EMAIL' and stage.email_template:
            cls._handle_email_automation(event, stage)
        elif stage.automation_type == 'QUOTE' and stage.stage == 'LEAD':
            cls._handle_quote_automation(event, stage)
            
    @classmethod
    def _handle_email_automation(cls, event, stage):
        """Handle email automation for a stage"""
        # Implementation would connect to communications service
        # to send emails using the specified template
        logger.info(f"Trigger email for event {event.id} using template {stage.email_template}")
        
        # In a real implementation, you would:
        # 1. Get the email template
        # 2. Render it with event context
        # 3. Send the email to the client or staff
        # 4. Log the communication
        
        # Log the action
        EventTimeline.objects.create(
            event=event,
            action_type='CLIENT_MESSAGE',
            description=f"Automated email sent: {stage.name}",
            is_public=True
        )
    
    @classmethod
    def _handle_quote_automation(cls, event, stage):
        """Handle quote generation automation"""
        # Check if a quote already exists
        if EventQuote.objects.filter(event=event).exists():
            logger.info(f"Quote already exists for event {event.id}")
            return
            
        # Find an appropriate quote template
        # This could be based on event type or other criteria
        from core.domains.sales.models import QuoteTemplate
        
        try:
            quote_template = None
            
            # Try to find a template matching the event type
            if event.event_type:
                quote_template = QuoteTemplate.objects.filter(
                    event_type=event.event_type,
                    is_active=True
                ).first()
            
            # Fall back to any active template if none found
            if not quote_template:
                quote_template = QuoteTemplate.objects.filter(
                    is_active=True
                ).first()
            
            if quote_template:
                # Create quote from template
                quote = quote_template.apply_to_event(event)
                
                logger.info(f"Created automated quote for event {event.id}")
                
                # Log the action
                EventTimeline.objects.create(
                    event=event,
                    action_type='QUOTE_CREATED',
                    description=f"Automated quote created",
                    is_public=True
                )
        except Exception as e:
            logger.error(f"Error creating automated quote: {str(e)}")