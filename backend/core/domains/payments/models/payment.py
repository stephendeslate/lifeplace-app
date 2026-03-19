import logging
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from core.utils.models import BaseModel

logger = logging.getLogger(__name__)


class Payment(BaseModel):
    """Records of payments for events"""

    # Updated to include all state machine states
    PAYMENT_STATUS_CHOICES = [
        ("CREATED", "Created"),
        ("PENDING", "Pending"),
        ("PROCESSING", "Processing"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
        ("CANCELLED", "Cancelled"),
        ("REFUNDED", "Refunded"),
    ]

    # Changed from invoice_id to payment_number to avoid conflict with invoice ForeignKey
    payment_number = models.CharField(max_length=50, unique=True)
    event = models.ForeignKey("events.Event", on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="PHP", help_text="Payment currency (ISO 4217 code)")
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="CREATED")
    due_date = models.DateField()
    paid_on = models.DateField(null=True, blank=True)
    payment_method = models.ForeignKey(
        "payments.PaymentMethod", on_delete=models.SET_NULL, null=True, related_name="payments"
    )
    description = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    reference_number = models.CharField(max_length=100, blank=True)
    is_manual = models.BooleanField(default=False)
    processed_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, related_name="processed_payments"
    )

    # Receipt fields (from PaymentReceipt)
    receipt_number = models.CharField(max_length=50, blank=True, null=True, unique=True)
    receipt_generated_on = models.DateTimeField(null=True, blank=True)
    receipt_sent = models.BooleanField(default=False)
    receipt_sent_on = models.DateTimeField(null=True, blank=True)
    receipt_pdf = models.FileField(upload_to="receipts/", null=True, blank=True)

    # Link to quote and invoice
    quote = models.ForeignKey(
        "sales.EventQuote", on_delete=models.SET_NULL, null=True, blank=True, related_name="payments"
    )
    invoice = models.ForeignKey(
        "payments.Invoice", on_delete=models.SET_NULL, null=True, blank=True, related_name="related_payments"
    )

    def save(self, *args, **kwargs):
        # Use the new atomic payment number service for generation
        if not self.payment_number:
            from ..services.payment_number_service import PaymentNumberService

            self.payment_number = PaymentNumberService.generate_unique_payment_number(
                event_id=self.event_id if self.event_id else None
            )

        is_new = self.pk is None
        old_status = None
        old_amount = None

        # Track status and amount changes for existing records
        if not is_new:
            try:
                old_instance = Payment.objects.get(pk=self.pk)
                old_status = old_instance.status
                old_amount = old_instance.amount
            except Payment.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # Only update event payment status when payment-relevant fields change
        status_changed = is_new or old_status != self.status
        amount_changed = is_new or old_amount != self.amount
        if status_changed or amount_changed:
            self.event.update_payment_status()

        # Trigger workflow ONLY when payment transitions to COMPLETED
        # (not on every save, and not if already was completed)
        if (
            self.status == "COMPLETED"
            and old_status != "COMPLETED"
            and hasattr(self.event, "workflow_template")
            and self.event.workflow_template
        ):
            import logging

            from core.domains.workflows.engine import WorkflowEngine

            logger = logging.getLogger(__name__)

            logger.info(
                f"Payment {self.payment_number} completed - triggering workflow progression for event {self.event.id}"
            )

            # Use WorkflowEngine directly - it has built-in idempotency protection
            WorkflowEngine.progress_workflow(
                event=self.event,
                trigger_type="PAYMENT_RECEIVED",
                data={
                    "payment_id": self.id,
                    "payment_number": self.payment_number,
                    "amount": str(self.amount),
                    "currency": self.currency,
                },
            )

    def complete_payment(self):
        """Mark payment as complete and handle related processes"""
        # Idempotency check: refresh from database and check if already completed
        self.refresh_from_db()
        if self.status == "COMPLETED" and self.paid_on:
            # Already completed, skip to avoid duplicate timeline entries
            return

        self.status = "COMPLETED"
        self.paid_on = timezone.now().date()
        self.save()

        # Generate receipt if payment completed
        if not self.receipt_number:
            self.generate_receipt()

        # Record in event timeline
        from core.domains.events.models import EventTimeline

        EventTimeline.objects.create(
            event=self.event,
            action_type="PAYMENT_RECEIVED",
            description=f"Payment of {self.format_amount_with_currency()} received",
            is_public=True,
            action_data={
                "payment_id": self.id,
                "amount": str(self.amount),
                "payment_method": self.payment_method.type if self.payment_method else "Unknown",
            },
        )

        # Send payment notification
        self.send_receipt_notification()

    def generate_receipt(self):
        """Generate receipt number and update receipt fields with row-level locking"""
        with transaction.atomic():
            # Re-fetch with lock to prevent concurrent receipt number generation
            locked_payment = Payment.objects.select_for_update().get(pk=self.pk)

            if not locked_payment.receipt_number and locked_payment.status == "COMPLETED":
                locked_payment.receipt_number = f"REC-{timezone.now().strftime('%Y%m%d')}-{locked_payment.id}"
                locked_payment.receipt_generated_on = timezone.now()
                locked_payment.save(update_fields=["receipt_number", "receipt_generated_on"])

                # Sync self with locked instance
                self.receipt_number = locked_payment.receipt_number
                self.receipt_generated_on = locked_payment.receipt_generated_on

        return self.receipt_number

    def send_receipt_notification(self):
        """Send receipt notification to the client via email"""
        if self.status == "COMPLETED" and not self.receipt_sent:
            from .notifications import PaymentNotification

            client = self.event.client
            is_successful = False
            template_used = None

            try:
                # Send receipt email via CommunicationService
                from core.domains.communications.services import CommunicationService

                comm_service = CommunicationService()
                record = comm_service.send_communication(
                    template_name="Payment Receipt",
                    recipient=client.email,
                    client=client,
                    event=self.event,
                    payment=self,
                    skip_preference_check=True,  # Receipts are transactional, always send
                )

                is_successful = record is not None and record.delivery_status == "SENT"

                if record and record.id:
                    # Get the template used
                    from core.domains.communications.models import CommunicationTemplate

                    try:
                        template_used = CommunicationTemplate.objects.get(name="Payment Receipt")
                    except CommunicationTemplate.DoesNotExist:
                        pass

                logger.info(f"Payment receipt email sent for payment {self.payment_number}")

                # Also send SMS receipt if client has phone number
                client_phone = (
                    getattr(client.profile, "phone", None) if hasattr(client, "profile") and client.profile else None
                )
                if client_phone:
                    try:
                        comm_service.send_communication(
                            template_name="Payment Receipt SMS",
                            recipient=client_phone,
                            client=client,
                            event=self.event,
                            payment=self,
                            skip_preference_check=True,  # Receipts are transactional
                        )
                        logger.info(f"Payment receipt SMS sent for payment {self.payment_number}")
                    except Exception as sms_error:
                        logger.warning(f"Failed to send payment receipt SMS for {self.payment_number}: {sms_error}")
                        # Don't fail the overall process if SMS fails

            except Exception as e:
                logger.error(f"Failed to send payment receipt email for {self.payment_number}: {e}")
                is_successful = False

            # Create notification record
            PaymentNotification.objects.create(
                payment=self,
                notification_type="PAYMENT_RECEIVED",
                sent_at=timezone.now(),
                sent_to=client.email,
                is_successful=is_successful,
                template_used=template_used,
            )

            # Update receipt sent status
            self.receipt_sent = True
            self.receipt_sent_on = timezone.now()
            self.save(update_fields=["receipt_sent", "receipt_sent_on"])

            return is_successful
        return False

    def send_reminder_notification(self):
        """Send payment reminder notification to the client via email"""
        if self.status not in ["PENDING", "CREATED"]:
            return False

        from .notifications import PaymentNotification

        client = self.event.client
        is_successful = False
        template_used = None

        try:
            # Send reminder email via CommunicationService
            from core.domains.communications.services import CommunicationService

            comm_service = CommunicationService()
            record = comm_service.send_communication(
                template_name="Payment Reminder",
                recipient=client.email,
                client=client,
                event=self.event,
                payment=self,
                skip_preference_check=False,
            )

            is_successful = record is not None and record.delivery_status == "SENT"

            if record and record.id:
                # Get the template used
                from core.domains.communications.models import CommunicationTemplate

                try:
                    template_used = CommunicationTemplate.objects.get(name="Payment Reminder")
                except CommunicationTemplate.DoesNotExist:
                    pass

            logger.info(f"Payment reminder email sent for payment {self.payment_number}")

        except Exception as e:
            logger.error(f"Failed to send payment reminder email for {self.payment_number}: {e}")
            is_successful = False

        # Create notification record
        PaymentNotification.objects.create(
            payment=self,
            notification_type="PAYMENT_REMINDER",
            sent_at=timezone.now(),
            sent_to=client.email,
            is_successful=is_successful,
            template_used=template_used,
        )

        return is_successful

    def format_amount_with_currency(self, user=None):
        """
        Format the payment amount with appropriate currency symbol and formatting
        Uses the centralized currency settings from the settings domain
        """
        try:
            # Import CurrencySettings from settings domain
            from core.domains.settings.models import CurrencySettings

            # Get currency settings (user-specific or system-wide)
            if user:
                settings = CurrencySettings.get_user_settings(user)
            else:
                settings = CurrencySettings.get_system_settings()

            # Use the centralized format_amount method
            return settings.format_amount(self.amount, self.currency)

        except ImportError as e:
            # CurrencySettings not available
            logger.debug(f"CurrencySettings not available for payment {self.id}: {e}")
        except Exception as e:
            # Any other error
            logger.warning(f"Failed to format currency for payment {self.id}: {e}")

        # Fallback formatting if settings domain is not available
        currency_symbols = {
            "PHP": "\u20b1",
            "USD": "$",
            "EUR": "\u20ac",
            "SGD": "S$",
            "HKD": "HK$",
        }

        symbol = currency_symbols.get(self.currency, f"{self.currency} ")

        # Use appropriate decimal places
        if self.currency == "PHP":
            return f"{symbol}{int(self.amount):,}"
        else:
            return f"{symbol}{float(self.amount):,.2f}"

    def __str__(self):
        return f"Payment {self.payment_number} for Event {self.event.id}"

    # State Machine Integration Methods
    def transition_to_state(self, new_state: str, reason: str, triggered_by: str = "system", metadata: dict = None):
        """
        Transition payment to new state using PaymentStateMachine.

        This is the preferred method for changing payment status.
        It provides atomic transitions, validation, and audit logging.
        """
        from ..services.payment_state_machine import PaymentState, PaymentStateMachine

        try:
            target_state = PaymentState(new_state)
            return PaymentStateMachine.transition_payment_state(
                payment=self, to_state=target_state, reason=reason, triggered_by=triggered_by, metadata=metadata
            )
        except ValueError:
            raise ValidationError(f"Invalid payment state: {new_state}")

    def can_transition_to(self, new_state: str) -> bool:
        """Check if payment can transition to the specified state"""
        from ..services.payment_state_machine import PaymentState, PaymentStateMachine

        try:
            current_state = PaymentState(self.status)
            target_state = PaymentState(new_state)
            return target_state in PaymentStateMachine.get_valid_transitions(current_state)
        except ValueError:
            return False

    def get_valid_transitions(self) -> list:
        """Get list of valid state transitions from current state"""
        from ..services.payment_state_machine import PaymentState, PaymentStateMachine

        try:
            current_state = PaymentState(self.status)
            valid_states = PaymentStateMachine.get_valid_transitions(current_state)
            return [state.value for state in valid_states]
        except ValueError:
            return []

    def is_terminal_state(self) -> bool:
        """Check if payment is in a terminal state (no further processing possible)"""
        from ..services.payment_state_machine import PaymentState, PaymentStateMachine

        try:
            current_state = PaymentState(self.status)
            return PaymentStateMachine.is_terminal_state(current_state)
        except ValueError:
            return False

    def get_state_history(self) -> list:
        """Get complete state transition history"""
        from ..services.payment_state_machine import PaymentStateMachine

        return PaymentStateMachine.get_payment_state_history(self)

    class Meta:
        ordering = ["-due_date"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["due_date"]),
            models.Index(fields=["event", "status"]),
            models.Index(fields=["invoice", "status"]),  # For invoice-payment queries
        ]


class PaymentNumberSequence(BaseModel):
    """
    Atomic sequence counter for generating unique payment numbers.

    This model ensures payment numbers are globally unique by maintaining
    a per-year counter that's incremented atomically using select_for_update.
    """

    year = models.PositiveIntegerField(unique=True, help_text="Year for which this sequence applies")
    next_number = models.PositiveIntegerField(default=1, help_text="Next sequence number to use for this year")

    def __str__(self):
        return f"Payment sequence for {self.year}: next number {self.next_number}"

    class Meta:
        verbose_name = "Payment Number Sequence"
        verbose_name_plural = "Payment Number Sequences"
        ordering = ["-year"]


class PaymentStateHistory(BaseModel):
    """
    State transition history for payments.

    Provides audit trail and rollback capability for payment state changes.
    Part of the PaymentStateMachine service architecture.
    """

    payment = models.ForeignKey("payments.Payment", on_delete=models.CASCADE, related_name="state_history")
    from_state = models.CharField(max_length=20, help_text="Previous payment state")
    to_state = models.CharField(max_length=20, help_text="New payment state")
    reason = models.CharField(max_length=255, help_text="Reason for state transition")
    triggered_by = models.CharField(
        max_length=100, default="system", help_text="Who or what triggered the state change"
    )
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional context data for the transition")
    timestamp = models.DateTimeField(default=timezone.now, help_text="When the state transition occurred")

    def __str__(self):
        return f"Payment {self.payment.payment_number}: {self.from_state} \u2192 {self.to_state}"

    class Meta:
        verbose_name = "Payment State History"
        verbose_name_plural = "Payment State Histories"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["payment", "-timestamp"]),
            models.Index(fields=["to_state", "-timestamp"]),
        ]
