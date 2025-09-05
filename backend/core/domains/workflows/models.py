# backend/core/domains/workflows/models.py
from core.utils.models import BaseModel
from django.db import models
from django.db.models import UniqueConstraint


class WorkflowTemplate(BaseModel):
    """Templates for standardized event workflows"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    event_type = models.ForeignKey('events.EventType', on_delete=models.PROTECT, null=True, blank=True)
    is_active = models.BooleanField(default=True)

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
        help_text="When to trigger automation (ON_CREATION, AFTER_1_DAY, AFTER_3_DAYS, etc.)"
    )
    email_template = models.ForeignKey('communications.CommunicationTemplate', on_delete=models.SET_NULL, null=True, blank=True)
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
        
        return True
    
    def apply_to_event(self, event):
        """Apply this stage to an event"""
        # Update event's current stage
        event.current_stage = self
        event.save()
        
        # Execute automation if configured
        if self.is_automated:
            self._execute_automation(event)
    
    def _execute_automation(self, event):
        """Execute automation for this stage"""
        if self.automation_type == 'EMAIL' and self.email_template:
            # Send email using template
            from core.domains.communications.services import CommunicationService
            try:
                CommunicationService.send_templated_email(
                    recipient=event.client.email,
                    template=self.email_template,
                    context={'event': event, 'stage': self}
                )
            except Exception as e:
                logger.error(f"Failed to send workflow email: {e}")
        
        elif self.automation_type == 'TASK' and self.task_description:
            # Create task
            from core.domains.events.models import EventTask
            EventTask.objects.create(
                event=event,
                title=f"Workflow: {self.name}",
                description=self.task_description,
                workflow_stage=self,
                status='PENDING'
            )
        
        elif self.automation_type == 'NOTIFICATION':
            # Send notification
            from core.domains.notifications.services import NotificationService
            NotificationService.create_notification(
                user=event.client,
                title=f"Workflow Update: {self.name}",
                message=f"Your event has progressed to: {self.name}",
                category='WORKFLOW',
                related_object=event
            )


class WorkflowTrigger(BaseModel):
    """Records of workflow trigger events for automation"""
    TRIGGER_TYPE_CHOICES = [
        ('PAYMENT_RECEIVED', 'Payment Received'),
        ('QUOTE_ACCEPTED', 'Quote Accepted'),
        ('CONTRACT_SIGNED', 'Contract Signed'),
        ('EVENT_CREATED', 'Event Created'),
        ('EVENT_COMPLETED', 'Event Completed'),
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