# backend/core/domains/workflows/models.py
import logging
from datetime import timedelta
from core.utils.models import BaseModel
from django.db import models
from django.db.models import UniqueConstraint
from django.utils import timezone

logger = logging.getLogger(__name__)


class WorkflowTemplate(BaseModel):
    """Templates for standardized event workflows"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    event_type = models.ForeignKey('events.EventType', on_delete=models.PROTECT, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    # Lead Stage Auto-Stop: When enabled, all remaining LEAD stage automations
    # are automatically cancelled when an event transitions to PRODUCTION stage.
    # This prevents follow-up/nurturing emails from being sent after booking.
    lead_stage_auto_stop = models.BooleanField(
        default=True,
        help_text="Stop remaining LEAD automations when event enters PRODUCTION stage"
    )

    def __str__(self):
        return self.name


class WorkflowStage(BaseModel):
    """Individual stages within a workflow template"""
    STAGE_CHOICES = [
        ('LEAD', 'Lead'),
        ('PRODUCTION', 'Production'),
        ('POST_PRODUCTION', 'Post Production'),
    ]
    
    AUTOMATION_TYPE_CHOICES = [
        ('EMAIL', 'Send Email'),
        ('TASK', 'Create Task'),
        ('QUOTE', 'Generate Quote'),
        ('CONTRACT', 'Generate Contract'),
        ('QUESTIONNAIRE', 'Send Questionnaire'),
        ('REMINDER', 'Send Reminder'),
        ('NOTIFICATION', 'Send Notification'),
    ]
    
    template = models.ForeignKey(WorkflowTemplate, related_name='stages', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES)
    order = models.PositiveIntegerField()
    is_automated = models.BooleanField(default=False)
    automation_type = models.CharField(max_length=50, choices=AUTOMATION_TYPE_CHOICES, blank=True)
    trigger_time = models.CharField(
        max_length=255,
        blank=True,
        help_text=(
            "When to trigger automation. Supported formats: "
            "ON_CREATION (immediate), "
            "AFTER_X_DAYS/AFTER_X_HOURS/AFTER_X_WEEKS (delay after stage start or after trigger_after_stage if set), "
            "X_DAYS_BEFORE_EVENT (e.g., 30_DAYS_BEFORE_EVENT, 7_DAYS_BEFORE_EVENT)"
        )
    )
    trigger_after_stage = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dependent_stages',
        help_text=(
            "Optional: Stage to wait for before applying trigger_time delay. "
            "When set, trigger_time is interpreted as delay AFTER this stage completes. "
            "E.g., trigger_after_stage='Job Accepted' + trigger_time='AFTER_5_DAYS' = "
            "5 days after Job Accepted stage is reached."
        )
    )
    email_template = models.ForeignKey('communications.CommunicationTemplate', on_delete=models.SET_NULL, null=True, blank=True)
    contract_template = models.ForeignKey(
        'contracts.ContractTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Contract template to use for CONTRACT automation"
    )
    questionnaire_template = models.ForeignKey(
        'questionnaires.Questionnaire',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workflow_stages',
        help_text="Questionnaire template to send for QUESTIONNAIRE automation"
    )
    task_description = models.TextField(blank=True)
    
    # New fields for enhanced workflow stages
    progression_condition = models.CharField(
        max_length=255, 
        blank=True,
        help_text="Condition required to progress (QUOTE_ACCEPTED, PAYMENT_RECEIVED, etc.)"
    )
    required_tasks_completed = models.BooleanField(
        default=False,
        help_text="Require all associated tasks to be completed before progressing"
    )
    
    # Trigger conditions (boolean fields for common triggers)
    trigger_on_payment_received = models.BooleanField(
        default=False,
        help_text="Trigger this stage when payment is received"
    )
    trigger_on_quote_accepted = models.BooleanField(
        default=False,
        help_text="Trigger this stage when quote is accepted"
    )
    trigger_on_contract_signed = models.BooleanField(
        default=False,
        help_text="Trigger this stage when contract is signed"
    )
    trigger_on_event_created = models.BooleanField(
        default=False,
        help_text="Trigger this stage when event is created"
    )
    trigger_on_quote_sent = models.BooleanField(
        default=False,
        help_text="Trigger this stage when quote is sent to client"
    )

    # Add a field for custom metadata (for different automation types)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['order']
        constraints = [
            UniqueConstraint(
                fields=['template', 'stage', 'order'],
                name='unique_stage_order_per_template_and_stage'
            )
        ]

    def __str__(self):
        return f"{self.template.name} - {self.name}"
    
    def check_advancement_criteria(self, event):
        """Check if event meets criteria to advance to this stage"""
        # Basic checks - can be extended
        if self.required_tasks_completed:
            # Check if all tasks for current stage are completed
            incomplete_tasks = event.tasks.filter(
                workflow_stage=event.current_stage,
                status__in=['PENDING', 'IN_PROGRESS']
            )
            if incomplete_tasks.exists():
                return False

        # Check progression conditions
        if self.progression_condition:
            condition = self.progression_condition.upper()
            if condition == 'PAYMENT_RECEIVED':
                return event.payments.filter(status='COMPLETED').exists()
            elif condition == 'QUOTE_ACCEPTED':
                return event.quotes.filter(status='ACCEPTED').exists()
            elif condition == 'CONTRACT_SIGNED':
                return event.contracts.filter(status='SIGNED').exists()
            elif condition == 'TASKS_COMPLETED':
                # Check if ALL tasks for the current stage are completed
                incomplete_tasks = event.tasks.filter(
                    workflow_stage=event.current_stage,
                    status__in=['PENDING', 'IN_PROGRESS', 'BLOCKED']
                )
                return not incomplete_tasks.exists()
            elif condition.startswith('TIME_ELAPSED'):
                return self._check_time_elapsed(event, condition)

        return True

    def _check_time_elapsed(self, event, condition):
        """
        Check if enough time has elapsed since stage was assigned.

        Supported formats:
        - TIME_ELAPSED_X_DAYS
        - TIME_ELAPSED_X_HOURS
        - TIME_ELAPSED_X_WEEKS
        """
        import re
        from core.domains.events.models import EventTimeline

        match = re.match(r'TIME_ELAPSED_(\d+)_(DAYS?|HOURS?|WEEKS?)', condition)
        if not match:
            logger.warning(f"Invalid TIME_ELAPSED format: {condition}")
            return True  # Invalid format - allow progression

        amount = int(match.group(1))
        unit = match.group(2).upper()

        # Calculate required elapsed time
        if unit.startswith('DAY'):
            required_delta = timedelta(days=amount)
        elif unit.startswith('HOUR'):
            required_delta = timedelta(hours=amount)
        elif unit.startswith('WEEK'):
            required_delta = timedelta(weeks=amount)
        else:
            return True  # Unknown unit - allow progression

        # Get the timestamp when this stage was assigned from timeline
        stage_assignment = EventTimeline.objects.filter(
            event=event,
            action_type='STAGE_CHANGE'
        ).order_by('-created_at').first()

        # Use timeline entry timestamp, or fall back to event creation time
        stage_assigned_at = stage_assignment.created_at if stage_assignment else event.created_at

        # Check if enough time has elapsed
        return timezone.now() >= stage_assigned_at + required_delta
    
    def apply_to_event(self, event):
        """Apply this stage to an event with validation"""
        # Validation: prevent moving backwards within the same category
        if event.current_stage:
            current_order = event.current_stage.order
            current_category = event.current_stage.stage

            # Prevent moving backwards within same category
            if self.stage == current_category and self.order < current_order:
                logger.warning(
                    f"Attempted to move event {event.id} backwards from "
                    f"'{event.current_stage.name}' (order {current_order}) to "
                    f"'{self.name}' (order {self.order}). Ignoring."
                )
                return

            # Prevent skipping to same stage
            if event.current_stage.id == self.id:
                logger.debug(f"Event {event.id} already at stage '{self.name}'")
                return

        # Update event's current stage
        event.current_stage = self
        event.save()

        # Execute automation if configured
        if self.is_automated:
            self._execute_automation(event)
    
    def _execute_automation(self, event):
        """Execute automation for this stage"""
        if self.automation_type == 'EMAIL' and self.email_template:
            # Skip workflow email for payment completions (booking confirmation email handles it)
            if hasattr(event, 'completion_type') and event.completion_type == 'payment':
                logger.info(
                    f"Skipping workflow email for event {event.id} - payment completion uses "
                    f"booking confirmation email instead of workflow email"
                )
                return

            # Send email using template
            from core.domains.communications.services import CommunicationService
            from core.domains.communications.context_service import (
                CommunicationContextService, ContextType
            )
            try:
                # Instantiate communication service
                comm_service = CommunicationService()

                # Generate context using the unified context service
                context_data = CommunicationContextService.generate_context(
                    context_type=ContextType.EVENT,
                    client=event.client,
                    event=event,
                )
                # Add workflow-specific context
                context_data['stage_name'] = self.name

                comm_service.send_communication_by_template(
                    template=self.email_template,
                    recipient=event.client.email,
                    context_data=context_data,
                    client=event.client,
                    sent_by=None
                )
                logger.info(f"Sent workflow email '{self.email_template.name}' for event {event.id}")
            except Exception as e:
                logger.error(f"Failed to send workflow email: {e}")
        
        elif self.automation_type == 'TASK' and self.task_description:
            # Create task
            from core.domains.events.models import EventTask
            try:
                task_due_date = event.start_date if 'event_start_date' in self.metadata.get('task_due_date', '') else timezone.now() + timedelta(days=1)
                
                EventTask.objects.create(
                    event=event,
                    title=f"Workflow: {self.name}",
                    description=self.task_description,
                    due_date=task_due_date,
                    priority=self.metadata.get('task_priority', 'MEDIUM'),
                    workflow_stage=self,
                    status='PENDING'
                )
                logger.info(f"Created workflow task '{self.name}' for event {event.id}")
            except Exception as e:
                logger.error(f"Failed to create workflow task: {e}")
        
        elif self.automation_type == 'CONTRACT':
            # Generate and send contract using proper service (DRY compliance)
            try:
                from core.domains.contracts.models import EventContract, ContractTemplate
                from core.domains.contracts.services import EventContractService

                # Use FK field first, fall back to metadata for backward compatibility
                contract_template_obj = None
                contract_template_id = None

                if self.contract_template:
                    # Use the FK field (preferred)
                    contract_template_obj = self.contract_template
                    contract_template_id = self.contract_template.id
                elif self.metadata.get('contract_template_id'):
                    # Fall back to metadata for backward compatibility
                    contract_template_id = self.metadata.get('contract_template_id')
                    try:
                        contract_template_obj = ContractTemplate.objects.get(id=contract_template_id)
                    except ContractTemplate.DoesNotExist:
                        logger.error(
                            f"Contract template ID {contract_template_id} not found for stage '{self.name}'. "
                            f"Available templates: {list(ContractTemplate.objects.values_list('id', 'name'))}. "
                            f"Skipping contract generation."
                        )
                        return
                else:
                    logger.error(
                        f"No contract template configured for stage '{self.name}' "
                        f"(stage_id={self.id}). Skipping contract generation."
                    )
                    return

                # Check if contract already exists for this event
                existing_contract = EventContract.objects.filter(
                    event=event,
                    template=contract_template_obj,
                    is_amendment=False
                ).first()

                if existing_contract:
                    logger.info(
                        f"Contract {existing_contract.id} already exists for event {event.id}. "
                        f"Skipping duplicate contract generation."
                    )
                    return

                # Calculate valid_until date
                signature_deadline_hours = self.metadata.get('signature_deadline_hours', 48)
                valid_until = (timezone.now() + timedelta(hours=signature_deadline_hours)).date()

                # Use EventContractService to create properly initialized contract
                # This ensures content is rendered, context is generated, and all fields are set
                contract = EventContractService.create_contract_from_template(
                    event_id=event.id,
                    template_id=contract_template_id,
                    valid_until=valid_until,
                    contract_value=event.total_amount_due or 0
                )

                # Update status to SENT and set sent_at timestamp
                contract.status = 'SENT'
                contract.sent_at = timezone.now()
                contract.save(update_fields=['status', 'sent_at'])

                # Send email with contract link (if email template is configured)
                if self.email_template:
                    try:
                        from core.domains.communications.services import CommunicationService
                        from core.domains.communications.context_service import (
                            CommunicationContextService, ContextType
                        )

                        # Generate context using the unified context service
                        context_data = CommunicationContextService.generate_context(
                            context_type=ContextType.CONTRACT,
                            client=event.client,
                            event=event,
                            contract=contract,
                        )
                        # Add stage-specific context
                        context_data['stage_name'] = self.name

                        CommunicationService.send_communication_by_template(
                            template=self.email_template,
                            recipient=event.client.email,
                            context_data=context_data
                        )
                        logger.info(f"Sent contract email for event {event.id}")
                    except Exception as email_error:
                        logger.warning(f"Contract generated but failed to send email: {email_error}")

                logger.info(f"Successfully generated contract {contract.id} for event {event.id}")

            except Exception as e:
                logger.error(f"Failed to generate/send contract: {e}", exc_info=True)

        elif self.automation_type == 'NOTIFICATION':
            # Send notification
            from core.domains.notifications.services import NotificationService
            NotificationService.create_notification(
                recipient=event.client,
                notification_type_code='WORKFLOW_STAGE_CHANGED',
                context={
                    'stage_name': self.name,
                    'event_name': event.name or f"{getattr(event, 'event_type', 'Event')}",
                    'event_id': event.id,
                },
                event=event,
                client=event.client
            )

        elif self.automation_type == 'REMINDER':
            # Send reminder notification
            from core.domains.notifications.services import NotificationService
            try:
                reminder_type = self.metadata.get('reminder_type', 'WORKFLOW_REMINDER')
                days_until_due = self.metadata.get('days_until_due', 7)

                NotificationService.create_notification(
                    recipient=event.client,
                    notification_type_code=reminder_type,
                    context={
                        'stage_name': self.name,
                        'event_name': event.name or f"{getattr(event, 'event_type', 'Event')}",
                        'event_id': event.id,
                        'event_date': event.start_date.strftime('%B %d, %Y') if event.start_date else 'TBD',
                        'days_until_due': days_until_due,
                        'action_url': f'/events/{event.id}',
                    },
                    event=event,
                    client=event.client
                )
                logger.info(f"Sent reminder notification for event {event.id}, stage '{self.name}'")
            except Exception as e:
                logger.error(f"Failed to send reminder notification: {e}")

        elif self.automation_type == 'QUOTE':
            # Auto-generate quote
            from core.domains.sales.models import EventQuote
            try:
                # Check if a quote already exists for this event
                if EventQuote.objects.filter(event=event).exists():
                    logger.info(f"Quote already exists for event {event.id}, skipping auto-generation")
                    return

                # Find quote template from metadata or by event type
                from core.domains.sales.models import QuoteTemplate
                quote_template_id = self.metadata.get('quote_template_id')
                quote_template = None

                if quote_template_id:
                    try:
                        quote_template = QuoteTemplate.objects.get(id=quote_template_id, is_active=True)
                    except QuoteTemplate.DoesNotExist:
                        logger.warning(f"Quote template ID {quote_template_id} not found or inactive")

                # Fallback to event type template
                if not quote_template and event.event_type:
                    quote_template = QuoteTemplate.objects.filter(
                        event_type=event.event_type,
                        is_active=True
                    ).first()

                # Fallback to any active template
                if not quote_template:
                    quote_template = QuoteTemplate.objects.filter(is_active=True).first()

                if quote_template:
                    # Apply template to create quote
                    quote = quote_template.apply_to_event(event)
                    logger.info(f"Created automated quote {quote.id} for event {event.id}")

                    # Log timeline entry
                    from core.domains.events.models import EventTimeline
                    EventTimeline.objects.create(
                        event=event,
                        action_type='QUOTE_CREATED',
                        description=f"Automated quote created via workflow stage '{self.name}'",
                        is_public=True
                    )
                else:
                    logger.warning(f"No active quote template found for event {event.id}")
            except Exception as e:
                logger.error(f"Failed to generate automated quote: {e}", exc_info=True)

        elif self.automation_type == 'QUESTIONNAIRE':
            # Send questionnaire notification/reminder
            self._execute_questionnaire_automation(event)

    def _execute_questionnaire_automation(self, event):
        """
        Execute questionnaire automation for this stage.

        This automation:
        1. Checks if the questionnaire is already completed for this event
        2. If complete → logs and skips (no action needed)
        3. If incomplete or no responses → sends email notification with portal link

        The email template should include a link to the client portal where
        they can fill out/complete the questionnaire.
        """
        from core.domains.questionnaires.models import Questionnaire, QuestionnaireResponse
        from core.domains.events.models import EventTimeline

        if not self.questionnaire_template:
            logger.warning(
                f"No questionnaire template configured for stage '{self.name}' "
                f"(stage_id={self.id}). Skipping questionnaire automation."
            )
            return

        try:
            questionnaire = self.questionnaire_template

            # Get all required fields for this questionnaire
            required_fields = questionnaire.fields.filter(required=True)
            required_field_ids = set(required_fields.values_list('id', flat=True))

            # Get existing responses for this event and questionnaire
            existing_responses = QuestionnaireResponse.objects.filter(
                event=event,
                field__questionnaire=questionnaire
            )
            answered_field_ids = set(existing_responses.values_list('field_id', flat=True))

            # Check if all required fields have been answered
            is_complete = required_field_ids.issubset(answered_field_ids)

            if is_complete and required_field_ids:
                # Questionnaire is already complete - log and skip
                logger.info(
                    f"Questionnaire '{questionnaire.name}' already complete for event {event.id}. "
                    f"Skipping automation."
                )
                EventTimeline.objects.create(
                    event=event,
                    action_type='SYSTEM_UPDATE',
                    description=f"Questionnaire '{questionnaire.name}' automation skipped (already complete)",
                    action_data={
                        'stage_id': self.id,
                        'questionnaire_id': questionnaire.id,
                        'status': 'already_complete'
                    },
                    is_public=False
                )
                return

            # Determine if this is a reminder or initial notification
            has_partial_responses = existing_responses.exists()
            notification_type = 'reminder' if has_partial_responses else 'initial'

            # Calculate completion percentage for context
            total_fields = questionnaire.fields.count()
            answered_count = existing_responses.count()
            completion_percentage = (
                round((answered_count / total_fields) * 100) if total_fields > 0 else 0
            )

            # Send email notification if email template is configured
            if self.email_template:
                from core.domains.communications.services import CommunicationService
                from core.domains.communications.context_service import (
                    CommunicationContextService, ContextType
                )

                try:
                    comm_service = CommunicationService()

                    # Generate context using the unified context service
                    context_data = CommunicationContextService.generate_context(
                        context_type=ContextType.EVENT,
                        client=event.client,
                        event=event,
                    )

                    # Add questionnaire-specific context
                    context_data.update({
                        'questionnaire_name': questionnaire.name,
                        'questionnaire_id': questionnaire.id,
                        'is_reminder': has_partial_responses,
                        'completion_percentage': completion_percentage,
                        'answered_count': answered_count,
                        'total_fields': total_fields,
                        'remaining_fields': total_fields - answered_count,
                        'stage_name': self.name,
                        # Portal link for completing questionnaire
                        'questionnaire_url': f'/portal/events/{event.id}/questionnaires',
                    })

                    comm_service.send_communication_by_template(
                        template=self.email_template,
                        recipient=event.client.email,
                        context_data=context_data,
                        client=event.client,
                        sent_by=None
                    )

                    action_description = (
                        f"Questionnaire reminder sent for '{questionnaire.name}' "
                        f"({completion_percentage}% complete)"
                        if has_partial_responses
                        else f"Questionnaire request sent for '{questionnaire.name}'"
                    )

                    logger.info(
                        f"Sent questionnaire {notification_type} email "
                        f"'{self.email_template.name}' for event {event.id}"
                    )

                    # Log timeline entry
                    EventTimeline.objects.create(
                        event=event,
                        action_type='QUESTIONNAIRE_SENT' if not has_partial_responses else 'QUESTIONNAIRE_REMINDER',
                        description=action_description,
                        action_data={
                            'stage_id': self.id,
                            'questionnaire_id': questionnaire.id,
                            'notification_type': notification_type,
                            'completion_percentage': completion_percentage
                        },
                        is_public=True
                    )

                except Exception as email_error:
                    logger.error(
                        f"Failed to send questionnaire email for event {event.id}: {email_error}"
                    )
            else:
                # No email template - just create in-app notification
                from core.domains.notifications.services import NotificationService

                NotificationService.create_notification(
                    recipient=event.client,
                    notification_type_code='QUESTIONNAIRE_REQUEST',
                    context={
                        'questionnaire_name': questionnaire.name,
                        'event_name': event.name or f"{getattr(event, 'event_type', 'Event')}",
                        'event_id': event.id,
                        'is_reminder': has_partial_responses,
                        'completion_percentage': completion_percentage,
                        'action_url': f'/portal/events/{event.id}/questionnaires',
                    },
                    event=event,
                    client=event.client
                )

                logger.info(
                    f"Created questionnaire {notification_type} notification for event {event.id}"
                )

        except Exception as e:
            logger.error(
                f"Failed to execute questionnaire automation for event {event.id}: {e}",
                exc_info=True
            )


class WorkflowTrigger(BaseModel):
    """Records of workflow trigger events for automation"""
    TRIGGER_TYPE_CHOICES = [
        # Payment triggers
        ('PAYMENT_RECEIVED', 'Payment Received'),
        ('PAYMENT_PLAN_CREATED', 'Payment Plan Created'),
        ('PAYMENT_OVERDUE', 'Payment Overdue'),
        # Quote triggers
        ('QUOTE_SENT', 'Quote Sent'),
        ('QUOTE_ACCEPTED', 'Quote Accepted'),
        ('QUOTE_REJECTED', 'Quote Rejected'),
        ('QUOTE_EXPIRED', 'Quote Expired'),
        # Contract triggers
        ('CONTRACT_SENT', 'Contract Sent'),
        ('CONTRACT_SIGNED', 'Contract Signed'),
        ('CONTRACT_EXPIRED', 'Contract Expired'),
        # Invoice triggers
        ('INVOICE_SENT', 'Invoice Sent'),
        ('INVOICE_OVERDUE', 'Invoice Overdue'),
        # Event triggers
        ('EVENT_CREATED', 'Event Created'),
        ('EVENT_COMPLETED', 'Event Completed'),
        # Other triggers
        ('TASK_COMPLETED', 'Task Completed'),
        ('DATE_TRIGGER', 'Date/Time Trigger'),
        ('MANUAL_TRIGGER', 'Manual Trigger'),
    ]
    
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='workflow_triggers')
    stage = models.ForeignKey(WorkflowStage, on_delete=models.CASCADE, null=True, blank=True)
    trigger_type = models.CharField(max_length=50, choices=TRIGGER_TYPE_CHOICES)
    details = models.TextField(blank=True, help_text="Description of what triggered this event")
    result_data = models.JSONField(default=dict, blank=True, help_text="Data associated with the trigger")
    processed = models.BooleanField(default=False, help_text="Whether this trigger has been processed")
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event} - {self.get_trigger_type_display()}"


class EventWorkflowOverride(BaseModel):
    """
    Per-event workflow customization overrides.

    Allows individual events to have customized workflow behavior:
    - Skip/disable specific stages
    - Add custom one-off stages
    - Modify stage properties for this event only

    This enables StudioNinja-style per-job workflow customization where
    you can remove certain automated emails or add extra steps for
    specific clients without modifying the template.
    """
    OVERRIDE_TYPE_CHOICES = [
        ('SKIP', 'Skip Stage'),           # Don't execute this stage for this event
        ('DISABLE_AUTOMATION', 'Disable Automation'),  # Run stage but skip automation
        ('CUSTOM_TIMING', 'Custom Timing'),  # Override trigger_time for this event
        ('ADD_STAGE', 'Add Custom Stage'),   # Add a one-off stage just for this event
    ]

    event = models.ForeignKey(
        'events.Event',
        on_delete=models.CASCADE,
        related_name='workflow_overrides',
        help_text="The event this override applies to"
    )
    stage = models.ForeignKey(
        WorkflowStage,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='event_overrides',
        help_text="The template stage being overridden (null for ADD_STAGE)"
    )
    override_type = models.CharField(
        max_length=20,
        choices=OVERRIDE_TYPE_CHOICES,
        help_text="Type of override to apply"
    )

    # For CUSTOM_TIMING overrides
    custom_trigger_time = models.CharField(
        max_length=255,
        blank=True,
        help_text="Custom trigger time for this event (overrides stage.trigger_time)"
    )

    # For ADD_STAGE overrides - custom stage properties
    custom_stage_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Name for custom added stage"
    )
    custom_stage_category = models.CharField(
        max_length=20,
        choices=[
            ('LEAD', 'Lead'),
            ('PRODUCTION', 'Production'),
            ('POST_PRODUCTION', 'Post Production'),
        ],
        blank=True,
        help_text="Stage category for custom added stage"
    )
    custom_order = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Order position for custom stage"
    )
    custom_is_automated = models.BooleanField(
        default=False,
        help_text="Whether custom stage has automation"
    )
    custom_automation_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="Automation type for custom stage"
    )
    custom_email_template = models.ForeignKey(
        'communications.CommunicationTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='event_override_emails',
        help_text="Email template for custom stage"
    )
    custom_task_description = models.TextField(
        blank=True,
        help_text="Task description for custom stage"
    )

    # Tracking
    reason = models.TextField(
        blank=True,
        help_text="Reason for this override (for audit trail)"
    )
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workflow_overrides_created',
        help_text="User who created this override"
    )

    # Execution tracking
    executed = models.BooleanField(
        default=False,
        help_text="Whether this override has been applied/executed"
    )
    executed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this override was applied"
    )

    class Meta:
        ordering = ['event', 'custom_order']
        constraints = [
            # Only one override per stage per event (except for ADD_STAGE which has no stage)
            models.UniqueConstraint(
                fields=['event', 'stage'],
                condition=models.Q(stage__isnull=False),
                name='unique_event_stage_override'
            ),
        ]
        indexes = [
            models.Index(fields=['event', 'override_type']),
            models.Index(fields=['stage', 'override_type']),
        ]

    def __str__(self):
        if self.stage:
            return f"{self.event} - {self.override_type} - {self.stage.name}"
        return f"{self.event} - {self.override_type} - {self.custom_stage_name}"

    def is_stage_skipped(self):
        """Check if this override skips the stage entirely"""
        return self.override_type == 'SKIP'

    def is_automation_disabled(self):
        """Check if automation is disabled for this stage"""
        return self.override_type in ['SKIP', 'DISABLE_AUTOMATION']


class WorkflowWebhook(BaseModel):
    """
    Configuration for outgoing webhooks triggered by workflow events.

    Allows external systems to be notified when workflow events occur:
    - Stage entered/completed
    - Automation executed
    - Workflow completed

    Includes HMAC signature verification for security.
    """
    WEBHOOK_EVENT_CHOICES = [
        ('STAGE_ENTERED', 'Stage Entered'),
        ('STAGE_COMPLETED', 'Stage Completed'),
        ('AUTOMATION_EXECUTED', 'Automation Executed'),
        ('WORKFLOW_COMPLETED', 'Workflow Completed'),
    ]

    name = models.CharField(
        max_length=255,
        help_text="Friendly name for this webhook"
    )
    url = models.URLField(
        max_length=2048,
        help_text="URL to send webhook payloads to"
    )
    secret = models.CharField(
        max_length=255,
        help_text="Secret key for HMAC signature verification"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this webhook is active"
    )
    events = models.JSONField(
        default=list,
        help_text="List of event types to trigger this webhook"
    )
    workflow_template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='webhooks',
        help_text="Optional: Limit to specific workflow template"
    )
    headers = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional headers to include in webhook requests"
    )
    last_triggered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this webhook was last triggered"
    )
    failure_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of consecutive failures (reset on success)"
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.url})"


class WorkflowWebhookDelivery(BaseModel):
    """
    Record of individual webhook delivery attempts.

    Tracks success/failure status and enables retry logic.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('RETRYING', 'Retrying'),
    ]

    webhook = models.ForeignKey(
        WorkflowWebhook,
        on_delete=models.CASCADE,
        related_name='deliveries',
        help_text="The webhook this delivery is for"
    )
    event_type = models.CharField(
        max_length=50,
        help_text="The type of event that triggered this delivery"
    )
    payload = models.JSONField(
        help_text="The JSON payload sent to the webhook"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        help_text="Current status of the delivery"
    )
    response_status_code = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="HTTP status code from the response"
    )
    response_body = models.TextField(
        blank=True,
        help_text="Response body from the webhook endpoint"
    )
    error_message = models.TextField(
        blank=True,
        help_text="Error message if delivery failed"
    )
    attempt_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of delivery attempts"
    )
    next_retry_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When to next retry delivery (if failed)"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Workflow webhook deliveries'

    def __str__(self):
        return f"{self.webhook.name} - {self.event_type} - {self.status}"