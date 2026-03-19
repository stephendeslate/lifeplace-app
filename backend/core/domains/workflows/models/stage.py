import logging
from datetime import timedelta

from django.db import models
from django.db.models import UniqueConstraint
from django.utils import timezone

from core.utils.models import BaseModel

from .template import WorkflowTemplate

logger = logging.getLogger(__name__)


class WorkflowStage(BaseModel):
    """Individual stages within a workflow template"""

    STAGE_CHOICES = [
        ("LEAD", "Lead"),
        ("PRODUCTION", "Production"),
        ("POST_PRODUCTION", "Post Production"),
    ]

    AUTOMATION_TYPE_CHOICES = [
        ("EMAIL", "Send Email"),
        ("TASK", "Create Task"),
        ("QUOTE", "Generate Quote"),
        ("CONTRACT", "Generate Contract"),
        ("QUESTIONNAIRE", "Send Questionnaire"),
        ("REMINDER", "Send Reminder"),
        ("NOTIFICATION", "Send Notification"),
    ]

    template = models.ForeignKey(WorkflowTemplate, related_name="stages", on_delete=models.CASCADE)
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
        ),
    )
    trigger_after_stage = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dependent_stages",
        help_text=(
            "Optional: Stage to wait for before applying trigger_time delay. "
            "When set, trigger_time is interpreted as delay AFTER this stage completes. "
            "E.g., trigger_after_stage='Job Accepted' + trigger_time='AFTER_5_DAYS' = "
            "5 days after Job Accepted stage is reached."
        ),
    )
    email_template = models.ForeignKey(
        "communications.CommunicationTemplate", on_delete=models.SET_NULL, null=True, blank=True
    )
    contract_template = models.ForeignKey(
        "contracts.ContractTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Contract template to use for CONTRACT automation",
    )
    questionnaire_template = models.ForeignKey(
        "questionnaires.Questionnaire",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workflow_stages",
        help_text="Questionnaire template to send for QUESTIONNAIRE automation",
    )
    task_description = models.TextField(blank=True)

    # New fields for enhanced workflow stages
    progression_condition = models.CharField(
        max_length=255, blank=True, help_text="Condition required to progress (QUOTE_ACCEPTED, PAYMENT_RECEIVED, etc.)"
    )
    required_tasks_completed = models.BooleanField(
        default=False, help_text="Require all associated tasks to be completed before progressing"
    )

    # Trigger conditions (boolean fields for common triggers)
    trigger_on_payment_received = models.BooleanField(
        default=False, help_text="Trigger this stage when payment is received"
    )
    trigger_on_quote_accepted = models.BooleanField(
        default=False, help_text="Trigger this stage when quote is accepted"
    )
    trigger_on_contract_signed = models.BooleanField(
        default=False, help_text="Trigger this stage when contract is signed"
    )
    trigger_on_event_created = models.BooleanField(default=False, help_text="Trigger this stage when event is created")
    trigger_on_quote_sent = models.BooleanField(
        default=False, help_text="Trigger this stage when quote is sent to client"
    )

    # Add a field for custom metadata (for different automation types)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["order"]
        constraints = [
            UniqueConstraint(fields=["template", "stage", "order"], name="unique_stage_order_per_template_and_stage")
        ]

    def __str__(self):
        return f"{self.template.name} - {self.name}"

    def check_advancement_criteria(self, event):
        """Check if event meets criteria to advance to this stage"""
        # Basic checks - can be extended
        if self.required_tasks_completed:
            # Check if all tasks for current stage are completed
            incomplete_tasks = event.tasks.filter(
                workflow_stage=event.current_stage, status__in=["PENDING", "IN_PROGRESS"]
            )
            if incomplete_tasks.exists():
                return False

        # Check progression conditions
        if self.progression_condition:
            condition = self.progression_condition.upper()
            if condition == "PAYMENT_RECEIVED":
                return event.payments.filter(status="COMPLETED").exists()
            elif condition == "QUOTE_ACCEPTED":
                return event.quotes.filter(status="ACCEPTED").exists()
            elif condition == "CONTRACT_SIGNED":
                return event.contracts.filter(status="SIGNED").exists()
            elif condition == "TASKS_COMPLETED":
                # Check if ALL tasks for the current stage are completed
                incomplete_tasks = event.tasks.filter(
                    workflow_stage=event.current_stage, status__in=["PENDING", "IN_PROGRESS", "BLOCKED"]
                )
                return not incomplete_tasks.exists()
            elif condition.startswith("TIME_ELAPSED"):
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

        match = re.match(r"TIME_ELAPSED_(\d+)_(DAYS?|HOURS?|WEEKS?)", condition)
        if not match:
            logger.warning(f"Invalid TIME_ELAPSED format: {condition}")
            return True  # Invalid format - allow progression

        amount = int(match.group(1))
        unit = match.group(2).upper()

        # Calculate required elapsed time
        if unit.startswith("DAY"):
            required_delta = timedelta(days=amount)
        elif unit.startswith("HOUR"):
            required_delta = timedelta(hours=amount)
        elif unit.startswith("WEEK"):
            required_delta = timedelta(weeks=amount)
        else:
            return True  # Unknown unit - allow progression

        # Get the timestamp when this stage was assigned from timeline
        stage_assignment = (
            EventTimeline.objects.filter(event=event, action_type="STAGE_CHANGE").order_by("-created_at").first()
        )

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
        if self.automation_type == "EMAIL" and self.email_template:
            # Skip workflow email for payment completions (booking confirmation email handles it)
            if hasattr(event, "completion_type") and event.completion_type == "payment":
                logger.info(
                    f"Skipping workflow email for event {event.id} - payment completion uses "
                    f"booking confirmation email instead of workflow email"
                )
                return

            # Send email using template
            from core.domains.communications.context_service import CommunicationContextService, ContextType
            from core.domains.communications.services import CommunicationService

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
                context_data["stage_name"] = self.name

                comm_service.send_communication_by_template(
                    template=self.email_template,
                    recipient=event.client.email,
                    context_data=context_data,
                    client=event.client,
                    sent_by=None,
                )
                logger.info(f"Sent workflow email '{self.email_template.name}' for event {event.id}")
            except Exception as e:
                logger.error(f"Failed to send workflow email: {e}")

        elif self.automation_type == "TASK" and self.task_description:
            # Create task
            from core.domains.events.models import EventTask

            try:
                task_due_date = (
                    event.start_date
                    if "event_start_date" in self.metadata.get("task_due_date", "")
                    else timezone.now() + timedelta(days=1)
                )

                EventTask.objects.create(
                    event=event,
                    title=f"Workflow: {self.name}",
                    description=self.task_description,
                    due_date=task_due_date,
                    priority=self.metadata.get("task_priority", "MEDIUM"),
                    workflow_stage=self,
                    status="PENDING",
                )
                logger.info(f"Created workflow task '{self.name}' for event {event.id}")
            except Exception as e:
                logger.error(f"Failed to create workflow task: {e}")

        elif self.automation_type == "CONTRACT":
            # Generate and send contract using proper service (DRY compliance)
            try:
                from core.domains.contracts.models import ContractTemplate, EventContract
                from core.domains.contracts.services import EventContractService

                # Use FK field first, fall back to metadata for backward compatibility
                contract_template_obj = None
                contract_template_id = None

                if self.contract_template:
                    # Use the FK field (preferred)
                    contract_template_obj = self.contract_template
                    contract_template_id = self.contract_template.id
                elif self.metadata.get("contract_template_id"):
                    # Fall back to metadata for backward compatibility
                    contract_template_id = self.metadata.get("contract_template_id")
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
                    event=event, template=contract_template_obj, is_amendment=False
                ).first()

                if existing_contract:
                    logger.info(
                        f"Contract {existing_contract.id} already exists for event {event.id}. "
                        f"Skipping duplicate contract generation."
                    )
                    return

                # Calculate valid_until date
                signature_deadline_hours = self.metadata.get("signature_deadline_hours", 48)
                valid_until = (timezone.now() + timedelta(hours=signature_deadline_hours)).date()

                # Use EventContractService to create properly initialized contract
                # This ensures content is rendered, context is generated, and all fields are set
                contract = EventContractService.create_contract_from_template(
                    event_id=event.id,
                    template_id=contract_template_id,
                    valid_until=valid_until,
                    contract_value=event.total_amount_due or 0,
                )

                # Update status to SENT and set sent_at timestamp
                contract.status = "SENT"
                contract.sent_at = timezone.now()
                contract.save(update_fields=["status", "sent_at"])

                # Send email with contract link (if email template is configured)
                if self.email_template:
                    try:
                        from core.domains.communications.context_service import CommunicationContextService, ContextType
                        from core.domains.communications.services import CommunicationService

                        # Generate context using the unified context service
                        context_data = CommunicationContextService.generate_context(
                            context_type=ContextType.CONTRACT,
                            client=event.client,
                            event=event,
                            contract=contract,
                        )
                        # Add stage-specific context
                        context_data["stage_name"] = self.name

                        CommunicationService.send_communication_by_template(
                            template=self.email_template, recipient=event.client.email, context_data=context_data
                        )
                        logger.info(f"Sent contract email for event {event.id}")
                    except Exception as email_error:
                        logger.warning(f"Contract generated but failed to send email: {email_error}")

                logger.info(f"Successfully generated contract {contract.id} for event {event.id}")

            except Exception as e:
                logger.error(f"Failed to generate/send contract: {e}", exc_info=True)

        elif self.automation_type == "NOTIFICATION":
            # Send notification
            from core.domains.notifications.services import NotificationService

            NotificationService.create_notification(
                recipient=event.client,
                notification_type_code="WORKFLOW_STAGE_CHANGED",
                context={
                    "stage_name": self.name,
                    "event_name": event.name or f"{getattr(event, 'event_type', 'Event')}",
                    "event_id": event.id,
                },
                event=event,
                client=event.client,
            )

        elif self.automation_type == "REMINDER":
            # Send reminder notification
            from core.domains.notifications.services import NotificationService

            try:
                reminder_type = self.metadata.get("reminder_type", "WORKFLOW_REMINDER")
                days_until_due = self.metadata.get("days_until_due", 7)

                NotificationService.create_notification(
                    recipient=event.client,
                    notification_type_code=reminder_type,
                    context={
                        "stage_name": self.name,
                        "event_name": event.name or f"{getattr(event, 'event_type', 'Event')}",
                        "event_id": event.id,
                        "event_date": event.start_date.strftime("%B %d, %Y") if event.start_date else "TBD",
                        "days_until_due": days_until_due,
                        "action_url": f"/events/{event.id}",
                    },
                    event=event,
                    client=event.client,
                )
                logger.info(f"Sent reminder notification for event {event.id}, stage '{self.name}'")
            except Exception as e:
                logger.error(f"Failed to send reminder notification: {e}")

        elif self.automation_type == "QUOTE":
            # Auto-generate quote
            from core.domains.sales.models import EventQuote

            try:
                # Check if a quote already exists for this event
                if EventQuote.objects.filter(event=event).exists():
                    logger.info(f"Quote already exists for event {event.id}, skipping auto-generation")
                    return

                # Find quote template from metadata or by event type
                from core.domains.sales.models import QuoteTemplate

                quote_template_id = self.metadata.get("quote_template_id")
                quote_template = None

                if quote_template_id:
                    try:
                        quote_template = QuoteTemplate.objects.get(id=quote_template_id, is_active=True)
                    except QuoteTemplate.DoesNotExist:
                        logger.warning(f"Quote template ID {quote_template_id} not found or inactive")

                # Fallback to event type template
                if not quote_template and event.event_type:
                    quote_template = QuoteTemplate.objects.filter(event_type=event.event_type, is_active=True).first()

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
                        action_type="QUOTE_CREATED",
                        description=f"Automated quote created via workflow stage '{self.name}'",
                        is_public=True,
                    )
                else:
                    logger.warning(f"No active quote template found for event {event.id}")
            except Exception as e:
                logger.error(f"Failed to generate automated quote: {e}", exc_info=True)

        elif self.automation_type == "QUESTIONNAIRE":
            # Send questionnaire notification/reminder
            self._execute_questionnaire_automation(event)

    def _execute_questionnaire_automation(self, event):
        """
        Execute questionnaire automation for this stage.

        This automation follows the EventContract pattern:
        1. Checks if EventQuestionnaire already exists for this event/questionnaire
        2. If exists and complete → logs and skips
        3. If exists and incomplete → sends reminder notification
        4. If not exists → creates EventQuestionnaire record and sends notification

        The email template should include a link to the client portal where
        they can fill out/complete the questionnaire.
        """
        from core.domains.events.models import EventTimeline
        from core.domains.questionnaires.models import (
            EventQuestionnaire,
            EventQuestionnaireActivity,
        )

        if not self.questionnaire_template:
            logger.warning(
                f"No questionnaire template configured for stage '{self.name}' "
                f"(stage_id={self.id}). Skipping questionnaire automation."
            )
            return

        try:
            questionnaire = self.questionnaire_template

            # Check if EventQuestionnaire already exists for this event/questionnaire
            existing_assignment = EventQuestionnaire.objects.filter(event=event, questionnaire=questionnaire).first()

            if existing_assignment:
                # EventQuestionnaire exists - check status
                if existing_assignment.status == "COMPLETE":
                    # Already complete - skip
                    logger.info(
                        f"EventQuestionnaire for '{questionnaire.name}' already complete for event {event.id}. "
                        f"Skipping automation."
                    )
                    EventTimeline.objects.create(
                        event=event,
                        action_type="SYSTEM_UPDATE",
                        description=f"Questionnaire '{questionnaire.name}' automation skipped (already complete)",
                        action_data={
                            "stage_id": self.id,
                            "questionnaire_id": questionnaire.id,
                            "event_questionnaire_id": existing_assignment.id,
                            "status": "already_complete",
                        },
                        is_public=False,
                    )
                    return

                # Incomplete - send reminder via the EventQuestionnaire notification task
                from core.domains.questionnaires.tasks import send_event_questionnaire_notification

                # Update workflow stage reference if not set
                if not existing_assignment.workflow_stage:
                    existing_assignment.workflow_stage = self
                    existing_assignment.save(update_fields=["workflow_stage", "updated_at"])

                # Record activity
                EventQuestionnaireActivity.objects.create(
                    event_questionnaire=existing_assignment,
                    action="REMINDER_SENT",
                    notes=f"Reminder triggered by workflow stage '{self.name}'",
                )

                # Send reminder notification
                send_event_questionnaire_notification.delay(existing_assignment.id, "reminder")

                stats = existing_assignment.completion_stats
                action_description = (
                    f"Questionnaire reminder sent for '{questionnaire.name}' "
                    f"({stats['completion_percentage']}% complete)"
                )

                logger.info(
                    f"Sent questionnaire reminder for EventQuestionnaire {existing_assignment.id}, event {event.id}"
                )

                EventTimeline.objects.create(
                    event=event,
                    action_type="QUESTIONNAIRE_REMINDER",
                    description=action_description,
                    action_data={
                        "stage_id": self.id,
                        "questionnaire_id": questionnaire.id,
                        "event_questionnaire_id": existing_assignment.id,
                        "notification_type": "reminder",
                        "completion_percentage": stats["completion_percentage"],
                    },
                    is_public=True,
                )
                return

            # No existing assignment - create new EventQuestionnaire
            from django.utils import timezone

            event_questionnaire = EventQuestionnaire.objects.create(
                event=event, questionnaire=questionnaire, status="SENT", sent_at=timezone.now(), workflow_stage=self
            )

            # Record creation activity
            EventQuestionnaireActivity.objects.create(
                event_questionnaire=event_questionnaire,
                action="CREATED",
                notes=f"Created by workflow automation (stage: '{self.name}')",
            )

            # Record sent activity
            EventQuestionnaireActivity.objects.create(
                event_questionnaire=event_questionnaire,
                action="SENT",
                notes=f"Sent via workflow automation (stage: '{self.name}')",
            )

            # Send notification via task
            from core.domains.questionnaires.tasks import send_event_questionnaire_notification

            send_event_questionnaire_notification.delay(event_questionnaire.id, "sent")

            action_description = f"Questionnaire '{questionnaire.name}' assigned and sent to client"

            logger.info(f"Created and sent EventQuestionnaire {event_questionnaire.id} for event {event.id}")

            # Log timeline entry
            EventTimeline.objects.create(
                event=event,
                action_type="QUESTIONNAIRE_SENT",
                description=action_description,
                action_data={
                    "stage_id": self.id,
                    "questionnaire_id": questionnaire.id,
                    "event_questionnaire_id": event_questionnaire.id,
                    "notification_type": "initial",
                },
                is_public=True,
            )

        except Exception as e:
            logger.error(f"Failed to execute questionnaire automation for event {event.id}: {e}", exc_info=True)
