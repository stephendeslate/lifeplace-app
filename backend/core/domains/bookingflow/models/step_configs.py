import logging
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.domains.products.models import ProductCategory, ProductOption
from core.domains.questionnaires.models import Questionnaire
from core.utils.models import BaseModel

from .flow import BookingFlowStep

logger = logging.getLogger(__name__)


class IntroductionStepConfiguration(BaseModel):
    """Configuration for introduction step"""

    step = models.OneToOneField(BookingFlowStep, on_delete=models.CASCADE, related_name="introduction_config")
    title = models.CharField(max_length=255)
    content = models.TextField()
    show_event_details = models.BooleanField(default=True)
    show_pricing_overview = models.BooleanField(default=False)
    custom_css = models.TextField(blank=True)
    background_image = models.ImageField(upload_to="booking_flow/intro/", null=True, blank=True)

    def __str__(self):
        return f"Intro config for {self.step}"


class VenueSelectionStepConfiguration(BaseModel):
    """Configuration for venue selection step (custom package curation)"""

    step = models.OneToOneField(BookingFlowStep, on_delete=models.CASCADE, related_name="venue_selection_config")

    # Available venues for selection
    available_venues = models.ManyToManyField(
        "venues.Venue",
        blank=True,
        limit_choices_to={"is_rentable_standalone": True, "is_active": True},
        help_text="Specific venues to show (empty = all rentable venues)",
    )

    # Selection constraints
    min_venues = models.PositiveIntegerField(default=1, help_text="Minimum number of venues to select")
    max_venues = models.PositiveIntegerField(default=5, help_text="Maximum number of venues to select")

    # Display options
    show_pricing = models.BooleanField(default=True, help_text="Show standalone pricing for each venue")
    show_included_hours = models.BooleanField(default=True, help_text="Show included hours for each venue")
    show_bundle_discount = models.BooleanField(
        default=True, help_text="Show bundle discount for multi-venue selections"
    )
    bundle_discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("10.00"),
        help_text="Discount percentage for selecting multiple venues",
    )

    # UI customization
    title = models.CharField(max_length=255, default="Select Your Spaces", blank=True)
    description = models.TextField(
        blank=True,
        default="Choose which spaces to include in your booking.",
        help_text="Description text shown at the top of the step",
    )

    # Package recommendation settings
    show_package_recommendations = models.BooleanField(
        default=True, help_text="Show matching pre-made packages when venues are selected"
    )
    show_view_packages_option = models.BooleanField(
        default=True, help_text="Show 'View our packages' link for users who want to browse packages"
    )
    view_packages_button_text = models.CharField(
        max_length=255,
        default="Not sure? View our packages instead",
        blank=True,
        help_text="Text for the 'view packages' button",
    )

    def __str__(self):
        return f"Venue Selection config for {self.step}"

    def get_available_venues_queryset(self):
        """Get the available venues for this step"""
        from core.domains.venues.models import Venue

        if self.available_venues.exists():
            return self.available_venues.filter(
                is_active=True, is_rentable_standalone=True, standalone_base_price__isnull=False
            )
        else:
            return Venue.objects.filter(
                is_active=True, is_bookable=True, is_rentable_standalone=True, standalone_base_price__isnull=False
            )


class DateTimeStepConfiguration(BaseModel):
    """Enhanced configuration for date and time selection step with availability checking."""

    step = models.OneToOneField(BookingFlowStep, on_delete=models.CASCADE, related_name="datetime_config")
    allow_multi_day = models.BooleanField(default=False)
    min_event_days = models.PositiveIntegerField(
        default=1, help_text="Minimum days allowed for event selection (1 enables single-day selection in range mode)"
    )
    max_event_days = models.PositiveIntegerField(
        default=7, help_text="Maximum consecutive days allowed for multi-day events"
    )
    show_calendar_view = models.BooleanField(default=True)

    # Availability settings - Enhanced from availability_check step
    enable_real_time_availability = models.BooleanField(default=True)
    show_availability_status = models.BooleanField(default=True)
    auto_check_conflicts = models.BooleanField(default=True)

    blocked_dates = models.JSONField(
        blank=True, default=list, help_text="Dates that are completely blocked (ISO date strings)"
    )
    available_days_of_week = models.JSONField(
        default=list, blank=True, help_text="Days of week available (0=Monday, 6=Sunday)"
    )
    available_time_slots = models.JSONField(default=list, blank=True, help_text="Available time slots configuration")

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
            ("FULL", "Show Full Availability"),
            ("LIMITED", "Show Limited Availability"),
            ("SIMPLE", "Show Simple Yes/No"),
        ],
        default="FULL",
    )

    # Conflict resolution
    allow_overbooking = models.BooleanField(default=False)
    overbooking_threshold = models.PositiveIntegerField(
        default=0, help_text="Maximum allowed conflicts before blocking"
    )

    # Integration settings
    sync_with_calendar = models.BooleanField(default=False)
    calendar_source = models.CharField(
        max_length=50,
        choices=[
            ("GOOGLE", "Google Calendar"),
            ("OUTLOOK", "Outlook Calendar"),
            ("EXTERNAL", "External System"),
        ],
        blank=True,
        help_text="Calendar system to sync availability with",
    )

    def __str__(self):
        return f"DateTime config for {self.step}"


class QuestionnaireStepConfiguration(BaseModel):
    """Configuration for questionnaire step"""

    step = models.OneToOneField(BookingFlowStep, on_delete=models.CASCADE, related_name="questionnaire_config")
    questionnaires = models.ManyToManyField(
        Questionnaire, through="QuestionnaireStepItem", related_name="booking_flow_steps"
    )
    allow_file_uploads = models.BooleanField(default=False)
    max_file_size_mb = models.PositiveIntegerField(default=10)
    allowed_file_types = models.JSONField(
        default=list, blank=True, help_text="Allowed file extensions (e.g., ['pdf', 'jpg', 'png'])"
    )

    def __str__(self):
        return f"Questionnaire config for {self.step}"


class QuestionnaireStepItem(BaseModel):
    """Junction model for questionnaires in a step"""

    configuration = models.ForeignKey(
        QuestionnaireStepConfiguration, on_delete=models.CASCADE, related_name="questionnaire_items"
    )
    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE, related_name="step_items")
    order = models.PositiveIntegerField(default=0)
    is_conditional = models.BooleanField(default=False)
    show_conditions = models.JSONField(default=dict, blank=True, help_text="Conditions for showing this questionnaire")

    class Meta:
        ordering = ["configuration", "order"]
        unique_together = [["configuration", "questionnaire"]]

    def __str__(self):
        return f"{self.questionnaire.name} in {self.configuration.step}"


class PackageSelectionStepConfiguration(BaseModel):
    """Configuration for package selection step"""

    step = models.OneToOneField(BookingFlowStep, on_delete=models.CASCADE, related_name="package_config")

    # Product filtering
    available_categories = models.ManyToManyField(
        ProductCategory,
        blank=True,
        related_name="package_step_configs",
        help_text="Limit packages to specific categories",
    )
    available_packages = models.ManyToManyField(
        ProductOption,
        blank=True,
        related_name="package_step_configs",
        limit_choices_to={"type": "PACKAGE"},
        help_text="Specific packages to show (overrides categories)",
    )

    # Selection behavior
    selection_type = models.CharField(
        max_length=20,
        choices=[
            ("SINGLE", "Single Selection"),
            ("MULTIPLE", "Multiple Selection"),
        ],
        default="SINGLE",
    )
    min_selection = models.PositiveIntegerField(default=1)
    max_selection = models.PositiveIntegerField(default=1)

    # Display options
    show_pricing = models.BooleanField(default=True)
    show_descriptions = models.BooleanField(default=True)
    show_images = models.BooleanField(default=True)
    enable_comparison = models.BooleanField(default=False)

    # Event type filtering
    filter_by_event_type = models.BooleanField(
        default=False,
        help_text="When enabled, only show packages associated with the booking flow's event type. "
        "Packages with no event types are hidden when this is enabled.",
    )

    # Dynamic pricing
    enable_dynamic_pricing = models.BooleanField(default=False)
    pricing_factors = models.JSONField(
        default=dict, blank=True, help_text="Factors that affect pricing (guest count, date, etc.)"
    )

    def __str__(self):
        return f"Package config for {self.step}"

    def clean(self):
        """Validate the package configuration"""
        super().clean()

        # Ensure max_selection is greater than min_selection
        if self.min_selection > self.max_selection:
            raise ValidationError(
                {"max_selection": "Maximum selection must be greater than or equal to minimum selection"}
            )

    def get_safe_available_categories(self):
        """Safely get available categories list for serialization"""
        try:
            return list(self.available_categories.values_list("id", flat=True))
        except Exception as e:
            logger.warning(f"Error getting available_categories for {self}: {e}")
            return []

    def get_safe_available_packages(self):
        """Safely get available packages list for serialization"""
        try:
            return list(self.available_packages.values_list("id", flat=True))
        except Exception as e:
            logger.warning(f"Error getting available_packages for {self}: {e}")
            return []


class AddonSelectionStepConfiguration(BaseModel):
    """Configuration for add-on selection step"""

    step = models.OneToOneField(BookingFlowStep, on_delete=models.CASCADE, related_name="addon_config")

    # Product filtering
    available_categories = models.ManyToManyField(ProductCategory, blank=True, related_name="addon_step_configs")
    available_addons = models.ManyToManyField(
        ProductOption, blank=True, related_name="addon_step_configs", limit_choices_to={"type": "PRODUCT"}
    )

    # Selection behavior
    min_selection = models.PositiveIntegerField(default=0)
    max_selection = models.PositiveIntegerField(default=0, help_text="0 means unlimited")

    # Event type filtering
    filter_by_event_type = models.BooleanField(
        default=True,
        help_text="When enabled, show all active add-ons associated with the booking flow's event type. "
        "When disabled, only show add-ons explicitly configured in available_addons.",
    )

    # Display options
    group_by_category = models.BooleanField(default=True)
    show_recommendations = models.BooleanField(default=True)
    recommendation_logic = models.JSONField(default=dict, blank=True, help_text="Logic for recommending add-ons")

    def __str__(self):
        return f"Addon config for {self.step}"

    def clean(self):
        """Validate the addon configuration"""
        super().clean()

        # Ensure max_selection is greater than min_selection when both are set
        if self.max_selection > 0 and self.min_selection > self.max_selection:
            raise ValidationError(
                {"max_selection": "Maximum selection must be greater than or equal to minimum selection"}
            )

    def get_safe_available_categories(self):
        """Safely get available categories list for serialization"""
        try:
            return list(self.available_categories.values_list("id", flat=True))
        except Exception as e:
            logger.warning(f"Error getting available_categories for {self}: {e}")
            return []

    def get_safe_available_addons(self):
        """Safely get available addons list for serialization"""
        try:
            return list(self.available_addons.values_list("id", flat=True))
        except Exception as e:
            logger.warning(f"Error getting available_addons for {self}: {e}")
            return []


class PricingSummaryStepConfiguration(BaseModel):
    """Configuration for pricing summary step"""

    step = models.OneToOneField(BookingFlowStep, on_delete=models.CASCADE, related_name="pricing_config")

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
    header_text = models.CharField(max_length=255, blank=True, default="")
    footer_text = models.TextField(blank=True)
    discount_help_text = models.CharField(max_length=255, blank=True, default="Enter discount code")

    # Terms and Legal Configuration
    show_terms_checkbox = models.BooleanField(default=True, help_text="Show terms acceptance checkbox")
    show_marketing_consent = models.BooleanField(default=True, help_text="Show marketing consent checkbox")
    require_terms_acceptance = models.BooleanField(default=True, help_text="Require terms acceptance before proceeding")
    terms_text = models.CharField(
        max_length=500, blank=True, default="", help_text="Custom terms label text (empty = use default)"
    )
    terms_url = models.URLField(blank=True, default="", help_text="Custom Terms of Service URL (empty = use global)")
    privacy_url = models.URLField(blank=True, default="", help_text="Custom Privacy Policy URL (empty = use global)")

    class Meta:
        ordering = ["step"]

    def __str__(self):
        return f"Pricing config for {self.step}"


class ContactInfoStepConfiguration(BaseModel):
    """Configuration for contact information step"""

    step = models.OneToOneField(BookingFlowStep, on_delete=models.CASCADE, related_name="contact_config")
    require_full_name = models.BooleanField(default=True)
    require_email = models.BooleanField(default=True)
    require_phone = models.BooleanField(default=True)
    require_address = models.BooleanField(default=False)
    require_company = models.BooleanField(default=False)

    # Additional fields
    custom_fields = models.JSONField(default=list, blank=True, help_text="Additional custom fields to collect")

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

    step = models.OneToOneField(BookingFlowStep, on_delete=models.CASCADE, related_name="payment_config")

    # UI/UX FLAGS ONLY - what payment options to show
    accept_full_payment = models.BooleanField(default=True, help_text="Show option to pay in full")
    accept_deposit = models.BooleanField(
        default=True, help_text="Show option to pay deposit (amount from PaymentSettings.default_deposit_percentage)"
    )
    allow_quote_request = models.BooleanField(
        default=True, help_text="Allow users to request a quote instead of paying immediately"
    )
    require_immediate_payment = models.BooleanField(
        default=False, help_text="Process payment immediately during booking"
    )

    # UI TEXT CUSTOMIZATION ONLY
    payment_terms = models.TextField(blank=True, help_text="Payment terms text to display to clients")
    quote_request_button_text = models.CharField(
        max_length=100, default="Request Quote", blank=True, help_text="Text displayed on the quote request button"
    )
    quote_request_description = models.TextField(blank=True, help_text="Description shown for the quote request option")

    def __str__(self):
        return f"Payment config for {self.step}"

    def get_available_gateways(self):
        """Get all active payment gateways"""
        try:
            from core.domains.payments.models import PaymentGateway

            return PaymentGateway.objects.filter(is_active=True)
        except ImportError:
            return []


class ConfirmationStepConfiguration(BaseModel):
    """Configuration for confirmation step"""

    step = models.OneToOneField(BookingFlowStep, on_delete=models.CASCADE, related_name="confirmation_config")
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
