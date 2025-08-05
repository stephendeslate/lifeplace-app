# backend/core/domains/bookingflow/models.py
from decimal import Decimal

from core.domains.events.models import EventType
from core.domains.products.models import ProductCategory, ProductOption
from core.domains.questionnaires.models import Questionnaire
from core.utils.models import BaseModel
from django.contrib.postgres.fields import ArrayField
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
    
    @property
    def enabled_steps(self):
        """Get all enabled steps in order"""
        return self.steps.filter(is_enabled=True).order_by('order')
    
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
        ('review_booking', 'Review Booking'),
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
    
    blocked_dates = ArrayField(
        models.DateField(),
        blank=True,
        default=list,
        help_text="Dates that are completely blocked"
    )
    available_days_of_week = ArrayField(
        models.IntegerField(),
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
    allowed_file_types = ArrayField(
        models.CharField(max_length=10),
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
    """Configuration for payment information step - UPDATED"""
    step = models.OneToOneField(
        BookingFlowStep,
        on_delete=models.CASCADE,
        related_name='payment_config'
    )
    
    # Payment options
    accept_full_payment = models.BooleanField(default=True)
    accept_deposit = models.BooleanField(default=True)
    deposit_type = models.CharField(
        max_length=20,
        choices=[
            ('PERCENTAGE', 'Percentage'),
            ('FIXED', 'Fixed Amount'),
        ],
        default='PERCENTAGE'
    )
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50.00'))
    
    # Payment methods
    available_payment_methods = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        help_text="Available payment methods"
    )
    
    # Payment processing - FIXED
    require_immediate_payment = models.BooleanField(
        default=False,
        help_text="Process payment immediately during booking"
    )
    
    # FIX: Use string references to avoid import issues
    allowed_gateways = models.ManyToManyField(
        'payments.PaymentGateway',
        blank=True,
        related_name='payment_step_configs',
        help_text="Payment gateways available for this step"
    )
    default_gateway = models.ForeignKey(
        'payments.PaymentGateway',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_payment_steps',
        help_text="Default payment gateway for this step"
    )
    
    allow_payment_plans = models.BooleanField(default=False)
    payment_terms = models.TextField(blank=True)

    def __str__(self):
        return f"Payment config for {self.step}"
    
    def get_available_gateways(self):
        """Get available payment gateways for this step"""
        if self.allowed_gateways.exists():
            return self.allowed_gateways.filter(is_active=True)
        elif self.default_gateway and self.default_gateway.is_active:
            return [self.default_gateway]
        elif self.step.booking_flow.allowed_payment_gateways.exists():
            return self.step.booking_flow.allowed_payment_gateways.filter(is_active=True)
        elif self.step.booking_flow.default_payment_gateway and self.step.booking_flow.default_payment_gateway.is_active:
            return [self.step.booking_flow.default_payment_gateway]
        else:
            # Fallback to all active gateways
            try:
                from core.domains.payments.models import PaymentGateway
                return PaymentGateway.objects.filter(is_active=True)
            except ImportError:
                return []


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
        """Calculate total price from booking data"""
        total = Decimal('0.00')
        
        # FIXED: Get packages and addons from root level first (single source of truth)
        selected_packages = self.booking_data.get('selected_packages', [])
        selected_addons = self.booking_data.get('selected_addons', [])
        
        # If not found at root, look in step data (but only take the first occurrence)
        if not selected_packages:
            for step_key, step_data in self.booking_data.items():
                if isinstance(step_data, dict) and 'selected_packages' in step_data:
                    selected_packages = step_data['selected_packages']
                    break  # CRITICAL: Only take the first occurrence to avoid duplication
        
        if not selected_addons:
            for step_key, step_data in self.booking_data.items():
                if isinstance(step_data, dict) and 'selected_addons' in step_data:
                    selected_addons = step_data['selected_addons']
                    break  # CRITICAL: Only take the first occurrence to avoid duplication
        
        # Calculate packages total
        for package_data in selected_packages:
            try:
                price = Decimal(str(package_data.get('price', 0)))
                quantity = int(package_data.get('quantity', 1))
                total += price * quantity
                
                # Handle excess hours for packages
                if 'excess_hours' in package_data and 'excess_hour_price' in package_data:
                    excess_hours = int(package_data['excess_hours'])
                    excess_hour_price = Decimal(str(package_data['excess_hour_price']))
                    excess_cost = excess_hour_price * excess_hours * quantity
                    total += excess_cost
            except (ValueError, TypeError) as e:
                logger.warning(f"Error calculating package price: {e}")
                continue
        
        # Calculate addons total
        for addon_data in selected_addons:
            try:
                price = Decimal(str(addon_data.get('price', 0)))
                quantity = int(addon_data.get('quantity', 1))
                total += price * quantity
            except (ValueError, TypeError) as e:
                logger.warning(f"Error calculating addon price: {e}")
                continue
        
        return total


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