import logging

from django.core.exceptions import ValidationError
from django.db import models

from core.domains.events.models import EventType
from core.utils.models import BaseModel

logger = logging.getLogger(__name__)


class BookingFlow(BaseModel):
    """
    Main booking flow configuration that defines the client booking experience
    """

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    event_type = models.ForeignKey(
        EventType,
        on_delete=models.CASCADE,
        related_name="booking_flows",
        null=True,
        blank=True,
        help_text="Leave blank for 'Any Event Type'",
    )

    # Integration with other domains
    workflow_template = models.ForeignKey(
        "workflows.WorkflowTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_flows",
        help_text="Workflow template to assign when booking is completed",
    )
    confirmation_email_template = models.ForeignKey(
        "communications.CommunicationTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_flows_confirmation",
        help_text="Email template for booking confirmation",
    )
    reminder_email_template = models.ForeignKey(
        "communications.CommunicationTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_flows_reminder",
        help_text="Email template for booking reminders",
    )

    # Flow configuration
    is_active = models.BooleanField(default=True)
    allow_guest_booking = models.BooleanField(default=True)
    require_account_creation = models.BooleanField(default=False)
    auto_approve_bookings = models.BooleanField(default=False)
    enable_progress_saving = models.BooleanField(default=True)
    max_advance_booking_days = models.PositiveIntegerField(default=365)
    min_advance_booking_days = models.PositiveIntegerField(default=1)

    # Pricing and discounts
    allow_discounts = models.BooleanField(default=True)
    available_discounts = models.ManyToManyField("products.Discount", blank=True, related_name="booking_flows")

    # Payment configuration - NEW
    allowed_payment_gateways = models.ManyToManyField(
        "payments.PaymentGateway",
        blank=True,
        related_name="booking_flows",
        help_text="Payment gateways available for this booking flow",
    )
    default_payment_gateway = models.ForeignKey(
        "payments.PaymentGateway",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="default_booking_flows",
        help_text="Default payment gateway for this booking flow",
    )
    require_immediate_payment = models.BooleanField(
        default=False, help_text="Require payment during booking completion"
    )

    # Completion actions
    redirect_url = models.URLField(blank=True, help_text="URL to redirect after successful booking")
    success_message = models.TextField(blank=True)

    # Analytics and testing
    is_test_mode = models.BooleanField(default=False)
    conversion_tracking_code = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["event_type", "is_active"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        if self.event_type:
            return f"{self.name} - {self.event_type.name}"
        return f"{self.name} - Any Event Type"

    def clean(self):
        """Custom validation for business rules"""
        super().clean()

        # Check for active flows with same event type (including null)
        if self.is_active:
            existing_flows = BookingFlow.objects.filter(event_type=self.event_type, is_active=True).exclude(pk=self.pk)

            if existing_flows.exists():
                if self.event_type:
                    raise ValidationError(
                        {
                            "event_type": f"An active booking flow already exists for {self.event_type.name}. "
                            "Only one active flow per event type is allowed."
                        }
                    )
                else:
                    raise ValidationError(
                        {
                            "event_type": 'An active booking flow already exists for "Any Event Type". '
                            'Only one active flow for "Any Event Type" is allowed.'
                        }
                    )

    def save(self, *args, **kwargs):
        """Override save to run full_clean validation"""
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def enabled_steps(self):
        """Get all enabled steps in order"""
        return self.steps.filter(is_enabled=True).order_by("order")

    def get_next_step(self, current_step_id, booking_data=None):
        """Get the next visible enabled step after the given step ID"""
        try:
            current_step = self.steps.get(id=current_step_id)
            next_steps = self.steps.filter(order__gt=current_step.order, is_enabled=True).order_by("order")

            # Check visibility conditions if booking_data provided
            for step in next_steps:
                if booking_data is None or step.is_visible_for_data(booking_data):
                    return step

            return None
        except BookingFlowStep.DoesNotExist:
            return None

    def calculate_total_steps(self):
        """Calculate total number of enabled steps"""
        return self.enabled_steps.count()

    @property
    def event_type_name(self):
        """Get event type name or 'Any Event Type'"""
        return self.event_type.name if self.event_type else "Any Event Type"

    def get_available_payment_gateways(self):
        """Get available payment gateways for this flow"""
        if self.allowed_payment_gateways.exists():
            return self.allowed_payment_gateways.filter(is_active=True)
        else:
            # FIX: Import here to avoid circular imports
            try:
                from core.domains.payments.models import PaymentGateway

                return PaymentGateway.objects.filter(is_active=True)
            except ImportError:
                # Return empty queryset if payments domain not available
                return self.allowed_payment_gateways.none()


class BookingFlowStep(BaseModel):
    """
    Individual steps within a booking flow with flexible configuration
    """

    STEP_TYPES = [
        ("introduction", "Introduction"),
        ("venue_selection", "Venue Selection"),
        ("date_time", "Date & Time Selection"),
        ("questionnaire", "Questionnaire"),
        ("package_selection", "Package Selection"),
        ("addon_selection", "Add-on Selection"),
        ("pricing_summary", "Pricing Summary"),
        ("contact_info", "Contact Information"),
        ("payment_info", "Payment Information"),
        ("confirmation", "Confirmation"),
    ]

    booking_flow = models.ForeignKey(BookingFlow, on_delete=models.CASCADE, related_name="steps")
    step_type = models.CharField(max_length=50, choices=STEP_TYPES)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField()

    # Step behavior
    is_enabled = models.BooleanField(default=True)
    is_required = models.BooleanField(default=True)
    is_skippable = models.BooleanField(default=False)

    # Conditional display
    display_conditions = models.JSONField(
        default=dict, blank=True, help_text="JSON conditions for when to show this step"
    )

    # Step configuration
    configuration = models.JSONField(default=dict, blank=True, help_text="Step-specific configuration options")

    # Validation rules
    validation_rules = models.JSONField(default=dict, blank=True, help_text="Validation rules for this step")

    class Meta:
        ordering = ["booking_flow", "order"]
        unique_together = [["booking_flow", "order"], ["booking_flow", "step_type"]]

    def __str__(self):
        return f"{self.booking_flow.name} - {self.get_step_type_display()}"

    def is_visible_for_data(self, booking_data):
        """Check if this step should be visible based on booking data"""
        if not self.display_conditions:
            return True

        # Implement condition checking logic
        for condition_key, condition_value in self.display_conditions.items():
            if condition_key in booking_data:
                if booking_data[condition_key] != condition_value:
                    return False

        return True
