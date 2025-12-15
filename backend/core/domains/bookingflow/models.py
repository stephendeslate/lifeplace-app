# backend/core/domains/bookingflow/models.py
from decimal import Decimal

from core.domains.events.models import EventType
from core.domains.products.models import ProductCategory, ProductOption
from core.domains.questionnaires.models import Questionnaire
from core.utils.models import BaseModel
# from django.contrib.postgres.fields import ArrayField  # Removed for SQLite compatibility
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
import logging

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
        related_name='booking_flows',
        null=True,
        blank=True,
        help_text="Leave blank for 'Any Event Type'"
    )
    
    # Integration with other domains
    workflow_template = models.ForeignKey(
        'workflows.WorkflowTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='booking_flows',
        help_text="Workflow template to assign when booking is completed"
    )
    confirmation_email_template = models.ForeignKey(
        'communications.CommunicationTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='booking_flows_confirmation',
        help_text="Email template for booking confirmation"
    )
    reminder_email_template = models.ForeignKey(
        'communications.CommunicationTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='booking_flows_reminder',
        help_text="Email template for booking reminders"
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
    available_discounts = models.ManyToManyField(
        'products.Discount',
        blank=True,
        related_name='booking_flows'
    )
    
    # Payment configuration - NEW
    allowed_payment_gateways = models.ManyToManyField(
        'payments.PaymentGateway',
        blank=True,
        related_name='booking_flows',
        help_text="Payment gateways available for this booking flow"
    )
    default_payment_gateway = models.ForeignKey(
        'payments.PaymentGateway',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_booking_flows',
        help_text="Default payment gateway for this booking flow"
    )
    require_immediate_payment = models.BooleanField(
        default=False,
        help_text="Require payment during booking completion"
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
        ordering = ['name']
        indexes = [
            models.Index(fields=['event_type', 'is_active']),
            models.Index(fields=['is_active']),
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
            existing_flows = BookingFlow.objects.filter(
                event_type=self.event_type,
                is_active=True
            ).exclude(pk=self.pk)
            
            if existing_flows.exists():
                if self.event_type:
                    raise ValidationError({
                        'event_type': f'An active booking flow already exists for {self.event_type.name}. '
                                    'Only one active flow per event type is allowed.'
                    })
                else:
                    raise ValidationError({
                        'event_type': 'An active booking flow already exists for "Any Event Type". '
                                    'Only one active flow for "Any Event Type" is allowed.'
                    })
    
    def save(self, *args, **kwargs):
        """Override save to run full_clean validation"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def enabled_steps(self):
        """Get all enabled steps in order"""
        return self.steps.filter(is_enabled=True).order_by('order')
    
    def get_next_step(self, current_step_id, booking_data=None):
        """Get the next visible enabled step after the given step ID"""
        try:
            current_step = self.steps.get(id=current_step_id)
            next_steps = self.steps.filter(
                order__gt=current_step.order,
                is_enabled=True
            ).order_by('order')
            
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
        return self.event_type.name if self.event_type else 'Any Event Type'
    
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
        ('introduction', 'Introduction'),
        ('date_time', 'Date & Time Selection'),
        ('questionnaire', 'Questionnaire'),
        ('package_selection', 'Package Selection'),
        ('addon_selection', 'Add-on Selection'),
        ('pricing_summary', 'Pricing Summary'),
        ('contact_info', 'Contact Information'),
        ('payment_info', 'Payment Information'),
        ('confirmation', 'Confirmation'),
    ]
    
    booking_flow = models.ForeignKey(
        BookingFlow,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    step_type = models.CharField(max_length=50, choices=STEP_TYPES)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField()
    
    # Step behavior
    is_enabled = models.BooleanField(default=True)
    is_required = models.BooleanField(default=True)
    is_skippable = models.BooleanField(default=False)
    
    # Conditional display
    display_conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON conditions for when to show this step"
    )
    
    # Step configuration
    configuration = models.JSONField(
        default=dict,
        blank=True,
        help_text="Step-specific configuration options"
    )
    
    # Validation rules
    validation_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text="Validation rules for this step"
    )

    class Meta:
        ordering = ['booking_flow', 'order']
        unique_together = [['booking_flow', 'order'], ['booking_flow', 'step_type']]

    def __str__(self):
        return f"{self.booking_flow.name} - {self.name}"
    
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


class IntroductionStepConfiguration(BaseModel):
    """Configuration for introduction step"""
    step = models.OneToOneField(
        BookingFlowStep,
        on_delete=models.CASCADE,
        related_name='introduction_config'
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    show_event_details = models.BooleanField(default=True)
    show_pricing_overview = models.BooleanField(default=False)
    custom_css = models.TextField(blank=True)
    background_image = models.ImageField(upload_to='booking_flow/intro/', null=True, blank=True)

    def __str__(self):
        return f"Intro config for {self.step}"


class DateTimeStepConfiguration(BaseModel):
    """Enhanced configuration for date and time selection step with availability checking"""
    step = models.OneToOneField(
        BookingFlowStep,
        on_delete=models.CASCADE,
        related_name='datetime_config'
    )
    allow_time_selection = models.BooleanField(default=True)
    allow_multi_day = models.BooleanField(default=False)
    show_calendar_view = models.BooleanField(default=True)
    min_duration_hours = models.PositiveIntegerField(default=1)
    max_duration_hours = models.PositiveIntegerField(default=24)
    default_duration_hours = models.PositiveIntegerField(default=4)
    
    # Availability settings - Enhanced from availability_check step
    enable_real_time_availability = models.BooleanField(default=True)
    show_availability_status = models.BooleanField(default=True)
    auto_check_conflicts = models.BooleanField(default=True)
    
    blocked_dates = models.JSONField(
        blank=True,
        default=list,
        help_text="Dates that are completely blocked (ISO date strings)"
    )
    available_days_of_week = models.JSONField(
        default=list,
        blank=True,
        help_text="Days of week available (0=Monday, 6=Sunday)"
    )
    available_time_slots = models.JSONField(
        default=list,
        blank=True,
        help_text="Available time slots configuration"
    )
    
    # Buffer settings
    buffer_before_hours = models.PositiveIntegerField(default=0)
    buffer_after_hours = models.PositiveIntegerField(default=0)
    
    # Availability checking configuration
    check_venue_availability = models.BooleanField(default=True)
    check_resource_availability = models.BooleanField(default=True)
    check_staff_availability = models.BooleanField(default=True)
    
    # Availability display settings
    availability_display_mode = models.CharField(
        max_length=20,
        choices=[
            ('FULL', 'Show Full Availability'),
            ('LIMITED', 'Show Limited Availability'),
            ('SIMPLE', 'Show Simple Yes/No'),
        ],
        default='FULL'
    )
    
    # Conflict resolution
    allow_overbooking = models.BooleanField(default=False)
    overbooking_threshold = models.PositiveIntegerField(
        default=0,
        help_text="Maximum allowed conflicts before blocking"
    )
    
    # Integration settings
    sync_with_calendar = models.BooleanField(default=False)
    calendar_source = models.CharField(
        max_length=50,
        choices=[
            ('GOOGLE', 'Google Calendar'),
            ('OUTLOOK', 'Outlook Calendar'),
            ('EXTERNAL', 'External System'),
        ],
        blank=True,
        help_text="Calendar system to sync availability with"
    )

    def __str__(self):
        return f"DateTime config for {self.step}"


class QuestionnaireStepConfiguration(BaseModel):
    """Configuration for questionnaire step"""
    step = models.OneToOneField(
        BookingFlowStep,
        on_delete=models.CASCADE,
        related_name='questionnaire_config'
    )
    questionnaires = models.ManyToManyField(
        Questionnaire,
        through='QuestionnaireStepItem',
        related_name='booking_flow_steps'
    )
    allow_file_uploads = models.BooleanField(default=False)
    max_file_size_mb = models.PositiveIntegerField(default=10)
    allowed_file_types = models.JSONField(
        default=list,
        blank=True,
        help_text="Allowed file extensions (e.g., ['pdf', 'jpg', 'png'])"
    )

    def __str__(self):
        return f"Questionnaire config for {self.step}"


class QuestionnaireStepItem(BaseModel):
    """Junction model for questionnaires in a step"""
    configuration = models.ForeignKey(
        QuestionnaireStepConfiguration,
        on_delete=models.CASCADE,
        related_name='questionnaire_items'
    )
    questionnaire = models.ForeignKey(
        Questionnaire,
        on_delete=models.CASCADE,
        related_name='step_items'
    )
    order = models.PositiveIntegerField(default=0)
    is_conditional = models.BooleanField(default=False)
    show_conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Conditions for showing this questionnaire"
    )

    class Meta:
        ordering = ['configuration', 'order']
        unique_together = [['configuration', 'questionnaire']]

    def __str__(self):
        return f"{self.questionnaire.name} in {self.configuration.step}"


class PackageSelectionStepConfiguration(BaseModel):
    """Configuration for package selection step"""
    step = models.OneToOneField(
        BookingFlowStep,
        on_delete=models.CASCADE,
        related_name='package_config'
    )
    
    # Product filtering
    available_categories = models.ManyToManyField(
        ProductCategory,
        blank=True,
        related_name='package_step_configs',
        help_text="Limit packages to specific categories"
    )
    available_packages = models.ManyToManyField(
        ProductOption,
        blank=True,
        related_name='package_step_configs',
        limit_choices_to={'type': 'PACKAGE'},
        help_text="Specific packages to show (overrides categories)"
    )
    
    # Selection behavior
    selection_type = models.CharField(
        max_length=20,
        choices=[
            ('SINGLE', 'Single Selection'),
            ('MULTIPLE', 'Multiple Selection'),
        ],
        default='SINGLE'
    )
    min_selection = models.PositiveIntegerField(default=1)
    max_selection = models.PositiveIntegerField(default=1)
    
    # Display options
    show_pricing = models.BooleanField(default=True)
    show_descriptions = models.BooleanField(default=True)
    show_images = models.BooleanField(default=True)
    enable_comparison = models.BooleanField(default=False)
    
    # Dynamic pricing
    enable_dynamic_pricing = models.BooleanField(default=False)
    pricing_factors = models.JSONField(
        default=dict,
        blank=True,
        help_text="Factors that affect pricing (guest count, date, etc.)"
    )

    def __str__(self):
        return f"Package config for {self.step}"
    
    def clean(self):
        """Validate the package configuration"""
        super().clean()
        
        # Ensure max_selection is greater than min_selection
        if self.min_selection > self.max_selection:
            raise ValidationError({
                'max_selection': 'Maximum selection must be greater than or equal to minimum selection'
            })
    
    def get_safe_available_categories(self):
        """Safely get available categories list for serialization"""
        try:
            return list(self.available_categories.values_list('id', flat=True))
        except Exception as e:
            logger.warning(f"Error getting available_categories for {self}: {e}")
            return []
    
    def get_safe_available_packages(self):
        """Safely get available packages list for serialization"""
        try:
            return list(self.available_packages.values_list('id', flat=True))
        except Exception as e:
            logger.warning(f"Error getting available_packages for {self}: {e}")
            return []


class AddonSelectionStepConfiguration(BaseModel):
    """Configuration for add-on selection step"""
    step = models.OneToOneField(
        BookingFlowStep,
        on_delete=models.CASCADE,
        related_name='addon_config'
    )
    
    # Product filtering
    available_categories = models.ManyToManyField(
        ProductCategory,
        blank=True,
        related_name='addon_step_configs'
    )
    available_addons = models.ManyToManyField(
        ProductOption,
        blank=True,
        related_name='addon_step_configs',
        limit_choices_to={'type': 'PRODUCT'}
    )
    
    # Selection behavior
    min_selection = models.PositiveIntegerField(default=0)
    max_selection = models.PositiveIntegerField(default=0, help_text="0 means unlimited")
    
    # Display options
    group_by_category = models.BooleanField(default=True)
    show_recommendations = models.BooleanField(default=True)
    recommendation_logic = models.JSONField(
        default=dict,
        blank=True,
        help_text="Logic for recommending add-ons"
    )

    def __str__(self):
        return f"Addon config for {self.step}"
    
    def clean(self):
        """Validate the addon configuration"""
        super().clean()
        
        # Ensure max_selection is greater than min_selection when both are set
        if self.max_selection > 0 and self.min_selection > self.max_selection:
            raise ValidationError({
                'max_selection': 'Maximum selection must be greater than or equal to minimum selection'
            })
    
    def get_safe_available_categories(self):
        """Safely get available categories list for serialization"""
        try:
            return list(self.available_categories.values_list('id', flat=True))
        except Exception as e:
            logger.warning(f"Error getting available_categories for {self}: {e}")
            return []
    
    def get_safe_available_addons(self):
        """Safely get available addons list for serialization"""
        try:
            return list(self.available_addons.values_list('id', flat=True))
        except Exception as e:
            logger.warning(f"Error getting available_addons for {self}: {e}")
            return []
    
class PricingSummaryStepConfiguration(BaseModel):
    """Configuration for pricing summary step"""
    step = models.OneToOneField(
        BookingFlowStep,
        on_delete=models.CASCADE,
        related_name='pricing_config'
    )
    
    # Display options
    show_package_breakdown = models.BooleanField(default=True)
    show_addon_breakdown = models.BooleanField(default=True)
    show_tax_breakdown = models.BooleanField(default=True)
    show_discount_field = models.BooleanField(default=True)
    show_subtotal = models.BooleanField(default=True)
    
    # Behavior options
    allow_discount_codes = models.BooleanField(default=True)
    calculate_tax = models.BooleanField(default=True)
    
    # Custom messaging
    header_text = models.CharField(max_length=255, blank=True, default="Review your order")
    footer_text = models.TextField(blank=True)
    discount_help_text = models.CharField(
        max_length=255, 
        blank=True,
        default="Enter discount code"
    )

    class Meta:
        ordering = ['step']

    def __str__(self):
        return f"Pricing config for {self.step}"


class ContactInfoStepConfiguration(BaseModel):
    """Configuration for contact information step"""
    step = models.OneToOneField(
        BookingFlowStep,
        on_delete=models.CASCADE,
        related_name='contact_config'
    )
    require_full_name = models.BooleanField(default=True)
    require_email = models.BooleanField(default=True)
    require_phone = models.BooleanField(default=True)
    require_address = models.BooleanField(default=False)
    require_company = models.BooleanField(default=False)
    
    # Additional fields
    custom_fields = models.JSONField(
        default=list,
        blank=True,
        help_text="Additional custom fields to collect"
    )
    
    # Account creation
    offer_account_creation = models.BooleanField(default=True)
    require_account_creation = models.BooleanField(default=False)

    def __str__(self):
        return f"Contact info config for {self.step}"


class PaymentInfoStepConfiguration(BaseModel):
    """Configuration for payment information step

    FULLY CONSOLIDATED: All payment business logic now in PaymentSettings (payments domain).
    This model contains ONLY UI/UX flags and custom text.

    REMOVED and moved to PaymentSettings:
    - deposit_type, deposit_amount, balance_due_days (payment plan calculation)
    - allow_refunds, refund_deadline_hours, refund_percentage, refund_policy_text (refund policy)
    - allowed_gateways, default_gateway (payment gateway defaults)
    """
    step = models.OneToOneField(
        BookingFlowStep,
        on_delete=models.CASCADE,
        related_name='payment_config'
    )

    # UI/UX FLAGS ONLY - what payment options to show
    accept_full_payment = models.BooleanField(
        default=True,
        help_text="Show option to pay in full"
    )
    accept_deposit = models.BooleanField(
        default=True,
        help_text="Show option to pay deposit (amount from PaymentSettings.default_deposit_percentage)"
    )
    allow_payment_plans = models.BooleanField(
        default=False,
        help_text="Show payment plan option in UI"
    )
    allow_quote_request = models.BooleanField(
        default=True,
        help_text="Allow users to request a quote instead of paying immediately"
    )
    require_immediate_payment = models.BooleanField(
        default=False,
        help_text="Process payment immediately during booking"
    )

    # UI TEXT CUSTOMIZATION ONLY
    payment_terms = models.TextField(
        blank=True,
        help_text="Payment terms text to display to clients"
    )
    quote_request_button_text = models.CharField(
        max_length=100,
        default="Request Quote",
        blank=True,
        help_text="Text displayed on the quote request button"
    )
    quote_request_description = models.TextField(
        blank=True,
        help_text="Description shown for the quote request option"
    )

    def __str__(self):
        return f"Payment config for {self.step}"

    def get_available_gateways(self):
        """Get all active payment gateways"""
        try:
            from core.domains.payments.models import PaymentGateway
            return PaymentGateway.objects.filter(is_active=True)
        except ImportError:
            return []


# Choice constants for PaymentTermsConfiguration
DEPOSIT_TYPE_CHOICES = [
    ('PERCENTAGE', 'Percentage of Total'),
    ('FIXED', 'Fixed Amount')
]

LATE_FEE_TYPE_CHOICES = [
    ('FIXED', 'Fixed Amount'),
    ('PERCENTAGE', 'Percentage of Invoice')
]

BALANCE_DUE_TYPE_CHOICES = [
    ('DAYS_BEFORE', 'Specific Days Before Event'),
    ('DAY_BEFORE', 'Day Before Event')
]


class PaymentTermsConfiguration(BaseModel):
    """
    Flow-specific payment terms configuration that overrides global PaymentSettings.

    Fields are nullable - null values mean "use global default from PaymentSettings".
    This allows per-booking-flow customization while maintaining global defaults.
    """
    step = models.OneToOneField(
        BookingFlowStep,
        on_delete=models.CASCADE,
        related_name='payment_terms_config'
    )

    # DEPOSIT CONFIGURATION OVERRIDES
    deposit_type = models.CharField(
        max_length=20,
        choices=DEPOSIT_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Override: Type of deposit calculation (null = use global)"
    )

    deposit_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Deposit as percentage of total (null = use global)"
    )

    deposit_fixed_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Fixed deposit amount (null = use global)"
    )

    deposit_is_refundable = models.BooleanField(
        null=True,
        blank=True,
        help_text="Override: Whether deposit is refundable (null = use global)"
    )

    deposit_is_deductible = models.BooleanField(
        null=True,
        blank=True,
        help_text="Override: Whether deposit is deducted from total (null = use global)"
    )

    deposit_waived_on_full_payment = models.BooleanField(
        null=True,
        blank=True,
        help_text="Override: Whether deposit is waived on full payment (null = use global)"
    )

    # LATE FEE CONFIGURATION OVERRIDES
    late_fee_type = models.CharField(
        max_length=20,
        choices=LATE_FEE_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Override: Type of late fee calculation (null = use global)"
    )

    late_fee_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Fixed late fee amount (null = use global)"
    )

    late_fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Late fee as percentage (null = use global)"
    )

    # SECURITY DEPOSIT CONFIGURATION OVERRIDES
    security_deposit_enabled = models.BooleanField(
        null=True,
        blank=True,
        help_text="Override: Whether security deposit is enabled (null = use global)"
    )

    security_deposit_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Security deposit amount (null = use global)"
    )

    security_deposit_is_refundable = models.BooleanField(
        null=True,
        blank=True,
        help_text="Override: Whether security deposit is refundable (null = use global)"
    )

    security_deposit_description = models.CharField(
        max_length=255,
        blank=True,
        help_text="Override: Security deposit description (empty = use global)"
    )

    # CANCELLATION CONFIGURATION OVERRIDES
    cancellation_admin_fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Admin fee percentage on cancellation (null = use global)"
    )

    # PAYMENT SCHEDULE CONFIGURATION OVERRIDES
    downpayment_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override: Downpayment percentage of TCP (null = use global)"
    )

    downpayment_due_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Override: Days after booking for downpayment (null = use global)"
    )

    balance_due_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Override: Days before event for balance due (null = use global)"
    )

    balance_due_type = models.CharField(
        max_length=20,
        choices=BALANCE_DUE_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Override: When balance is due (null = use global)"
    )

    class Meta:
        verbose_name = "Payment Terms Configuration"
        verbose_name_plural = "Payment Terms Configurations"

    def __str__(self):
        return f"Payment Terms config for {self.step}"

    def get_effective_settings(self):
        """
        Merge flow-specific settings with global defaults from PaymentSettings.
        Returns a dict with all payment terms, using flow values when set,
        falling back to global settings when null.
        """
        from core.domains.payments.models import PaymentSettings
        from core.domains.settings.models import CurrencySettings
        global_settings = PaymentSettings.get_default_settings()
        # Get currency from CurrencySettings (single source of truth)
        currency_settings = CurrencySettings.get_system_settings()
        currency = currency_settings.default_currency if currency_settings else 'PHP'

        def get_value(local_field, global_field):
            """Get local value if set, otherwise global default"""
            local_value = getattr(self, local_field, None)
            if local_value is not None:
                return local_value
            return getattr(global_settings, global_field, None)

        return {
            # Deposit settings
            'deposit_type': get_value('deposit_type', 'deposit_type'),
            'deposit_percentage': get_value('deposit_percentage', 'default_deposit_percentage'),
            'deposit_fixed_amount': get_value('deposit_fixed_amount', 'deposit_fixed_amount'),
            'deposit_is_refundable': get_value('deposit_is_refundable', 'deposit_is_refundable'),
            'deposit_is_deductible': get_value('deposit_is_deductible', 'deposit_is_deductible'),
            'deposit_waived_on_full_payment': get_value('deposit_waived_on_full_payment', 'deposit_waived_on_full_payment'),
            # Late fee settings
            'late_fee_type': get_value('late_fee_type', 'late_fee_type'),
            'late_fee_amount': get_value('late_fee_amount', 'default_late_fee_amount'),
            'late_fee_percentage': get_value('late_fee_percentage', 'late_fee_percentage'),
            'late_fee_enabled': global_settings.late_fee_enabled,  # Always from global
            # Security deposit settings
            'security_deposit_enabled': get_value('security_deposit_enabled', 'security_deposit_enabled'),
            'security_deposit_amount': get_value('security_deposit_amount', 'security_deposit_amount'),
            'security_deposit_is_refundable': get_value('security_deposit_is_refundable', 'security_deposit_is_refundable'),
            'security_deposit_description': self.security_deposit_description or global_settings.security_deposit_description,
            # Cancellation settings
            'cancellation_admin_fee_percentage': get_value('cancellation_admin_fee_percentage', 'cancellation_admin_fee_percentage'),
            'refund_percentage': global_settings.refund_percentage,  # Always from global
            'allow_refunds': global_settings.allow_refunds,  # Always from global
            # Payment schedule settings
            'downpayment_percentage': get_value('downpayment_percentage', 'downpayment_percentage'),
            'downpayment_due_days': get_value('downpayment_due_days', 'downpayment_due_days'),
            'balance_due_days': get_value('balance_due_days', 'balance_due_days'),
            'balance_due_type': get_value('balance_due_type', 'balance_due_type'),
            # Currency (from CurrencySettings - single source of truth)
            'currency': currency,
        }


class ConfirmationStepConfiguration(BaseModel):
    """Configuration for confirmation step"""
    step = models.OneToOneField(
        BookingFlowStep,
        on_delete=models.CASCADE,
        related_name='confirmation_config'
    )
    title = models.CharField(max_length=255, default="Booking Confirmed!")
    message = models.TextField()
    show_booking_summary = models.BooleanField(default=True)
    show_next_steps = models.BooleanField(default=True)
    next_steps_content = models.TextField(blank=True)
    
    # Auto-actions
    send_confirmation_email = models.BooleanField(default=True)
    send_calendar_invite = models.BooleanField(default=False)
    create_event_immediately = models.BooleanField(default=True)

    def __str__(self):
        return f"Confirmation config for {self.step}"


class BookingSession(BaseModel):
    """
    Tracks client progress through a booking flow
    """
    session_id = models.UUIDField(unique=True, db_index=True)
    booking_flow = models.ForeignKey(
        BookingFlow,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    client = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='booking_sessions'
    )
    
    # Progress tracking
    current_step = models.ForeignKey(
        BookingFlowStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_sessions'
    )
    completed_steps = models.ManyToManyField(
        BookingFlowStep,
        blank=True,
        related_name='completed_sessions'
    )
    
    # Data storage
    booking_data = models.JSONField(default=dict)
    validation_errors = models.JSONField(default=dict, blank=True)
    
    # Session metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    referrer_url = models.URLField(blank=True)
    
    # Status
    is_completed = models.BooleanField(default=False)
    is_abandoned = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    
    # Conversion tracking
    created_event = models.ForeignKey(
        'events.Event',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='booking_session'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Session {self.session_id} - {self.booking_flow.name}"
    
    @property
    def progress_percentage(self):
        """Calculate completion percentage"""
        total_steps = self.booking_flow.enabled_steps.count()
        if total_steps == 0:
            return 0
        completed_count = self.completed_steps.count()
        return (completed_count / total_steps) * 100
    
    def is_expired(self):
        """Check if session has expired"""
        return timezone.now() > self.expires_at
    
    def mark_step_completed(self, step):
        """Mark a step as completed"""
        self.completed_steps.add(step)
        
        # Update current step to next step
        next_step = self.booking_flow.get_next_step(step.id)
        if next_step:
            self.current_step = next_step
        else:
            # Flow completed
            self.is_completed = True
            self.completed_at = timezone.now()
        
        self.save()
    
    def calculate_total_price(self):
        """Calculate total price using centralized pricing service"""
        logger.info("=== BOOKING SESSION PRICE CALCULATION (Centralized) ===")
        
        try:
            from core.domains.sales.pricing_service import PricingCalculationService
            
            # Get event duration
            event_duration = self._get_event_duration()
            
            # Use centralized pricing service
            pricing_breakdown = PricingCalculationService.calculate_from_booking_data(
                self.booking_data, 
                event_duration
            )
            
            logger.info(f"Centralized pricing service result: ₱{pricing_breakdown.total_amount}")
            return pricing_breakdown.total_amount
            
        except Exception as e:
            logger.error(f"Error in centralized pricing calculation: {e}")
            # Fallback to basic calculation if centralized service fails
            logger.warning("Falling back to basic calculation")
            return self._calculate_total_price_fallback()
    
    def _calculate_total_price_fallback(self):
        """Fallback calculation method in case centralized service fails"""
        logger.warning("Using fallback pricing calculation")
        
        # Simple fallback - just sum up base prices without excess hours
        total = Decimal('0.00')
        
        # Get packages and addons with single source of truth logic
        selected_packages = self.booking_data.get('selected_packages', [])
        selected_addons = self.booking_data.get('selected_addons', [])
        
        # Fallback to step data if not found at root
        if not selected_packages:
            for step_key, step_data in self.booking_data.items():
                if isinstance(step_data, dict) and 'selected_packages' in step_data:
                    selected_packages = step_data['selected_packages']
                    break
        
        if not selected_addons:
            for step_key, step_data in self.booking_data.items():
                if isinstance(step_data, dict) and 'selected_addons' in step_data:
                    selected_addons = step_data['selected_addons']
                    break
        
        # Sum package prices
        for package_data in selected_packages:
            try:
                price = Decimal(str(package_data.get('price', 0)))
                quantity = int(package_data.get('quantity', 1))
                total += price * Decimal(str(quantity))
            except (ValueError, TypeError):
                continue
        
        # Sum addon prices
        for addon_data in selected_addons:
            try:
                price = Decimal(str(addon_data.get('price', 0)))
                quantity = int(addon_data.get('quantity', 1))
                total += price * Decimal(str(quantity))
            except (ValueError, TypeError):
                continue
        
        logger.info(f"Fallback calculation result: ₱{total}")
        return total
    
    def _get_event_duration(self):
        """Extract event duration from booking data"""
        # Look for duration in various places in booking data
        duration = None
        
        # Check root level first
        if 'duration' in self.booking_data:
            duration = self.booking_data.get('duration')
        
        # Check in step data
        if not duration:
            for step_key, step_data in self.booking_data.items():
                if isinstance(step_data, dict):
                    if 'duration' in step_data:
                        duration = step_data['duration']
                        break
                    # Also check for end_time and start_time to calculate duration
                    elif 'start_time' in step_data and 'end_time' in step_data:
                        try:
                            from datetime import datetime
                            start_time = datetime.strptime(step_data['start_time'], '%H:%M')
                            end_time = datetime.strptime(step_data['end_time'], '%H:%M')
                            duration_seconds = (end_time - start_time).seconds
                            duration = int(duration_seconds // 3600)  # Use integer division instead of float division
                            break
                        except (ValueError, TypeError):
                            continue
        
        try:
            return int(duration) if duration else None
        except (ValueError, TypeError):
            return None


class BookingFlowAnalytics(BaseModel):
    """
    Analytics and tracking for booking flow performance
    """
    booking_flow = models.ForeignKey(
        BookingFlow,
        on_delete=models.CASCADE,
        related_name='analytics'
    )
    date = models.DateField()
    
    # Conversion metrics
    total_sessions = models.PositiveIntegerField(default=0)
    completed_bookings = models.PositiveIntegerField(default=0)
    abandoned_sessions = models.PositiveIntegerField(default=0)
    conversion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    
    # Step analytics
    step_completion_data = models.JSONField(
        default=dict,
        help_text="Completion rates for each step"
    )
    step_drop_off_data = models.JSONField(
        default=dict,
        help_text="Drop-off rates for each step"
    )
    
    # Revenue metrics
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    average_booking_value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Performance metrics
    average_completion_time = models.DurationField(null=True, blank=True)
    bounce_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        ordering = ['-date']
        unique_together = [['booking_flow', 'date']]

    def __str__(self):
        return f"Analytics for {self.booking_flow.name} on {self.date}"