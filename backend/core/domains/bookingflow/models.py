# backend/core/domains/bookingflow/models.py
from core.domains.events.models import EventType
from core.domains.products.models import ProductOption
from core.domains.questionnaires.models import Questionnaire
from django.db import models
from django.utils.translation import gettext_lazy as _


class BookingFlow(models.Model):
    """
    Main configuration for a booking flow process with fixed steps
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    event_type = models.ForeignKey(
        EventType, 
        on_delete=models.CASCADE, 
        related_name='booking_flows'
    )
    workflow_template = models.ForeignKey(
        'workflows.WorkflowTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='booking_flows',
        help_text="Workflow template to assign to events created through this booking flow"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} for {self.event_type.name}"


class IntroConfiguration(models.Model):
    """
    Configuration for the introduction step
    """
    booking_flow = models.OneToOneField(
        BookingFlow, 
        on_delete=models.CASCADE, 
        related_name='intro_config'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    show_event_details = models.BooleanField(default=True)
    is_required = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Intro config for {self.booking_flow.name}"


class DateConfiguration(models.Model):
    """
    Configuration for date selection step
    """
    booking_flow = models.OneToOneField(
        BookingFlow, 
        on_delete=models.CASCADE, 
        related_name='date_config'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    min_days_in_future = models.PositiveIntegerField(default=1)
    max_days_in_future = models.PositiveIntegerField(default=365)
    allow_time_selection = models.BooleanField(default=True)
    buffer_before_event = models.PositiveIntegerField(
        default=0,
        help_text="Buffer time in minutes before event"
    )
    buffer_after_event = models.PositiveIntegerField(
        default=0,
        help_text="Buffer time in minutes after event"
    )
    allow_multi_day = models.BooleanField(
        default=False, 
        help_text="Allow selection of both start and end dates for multi-day events"
    )
    is_required = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Date config for {self.booking_flow.name}"


class QuestionnaireConfiguration(models.Model):
    """
    Configuration for questionnaire step
    """
    booking_flow = models.OneToOneField(
        BookingFlow, 
        on_delete=models.CASCADE, 
        related_name='questionnaire_config'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    questionnaires = models.ManyToManyField(
        Questionnaire, 
        through='QuestionnaireItem',
        related_name='booking_flows'
    )
    is_required = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Questionnaire config for {self.booking_flow.name}"


class QuestionnaireItem(models.Model):
    """
    Questionnaire item with display order
    """
    config = models.ForeignKey(
        QuestionnaireConfiguration, 
        on_delete=models.CASCADE, 
        related_name='questionnaire_items'
    )
    questionnaire = models.ForeignKey(
        Questionnaire, 
        on_delete=models.CASCADE, 
        related_name='config_items'
    )
    order = models.PositiveIntegerField(default=0)
    is_required = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['config', 'order']
        unique_together = [['config', 'order']]

    def __str__(self):
        return f"{self.questionnaire.name} (Order {self.order}) - {self.config.booking_flow.name}"


class PackageConfiguration(models.Model):
    """
    Configuration for package selection step
    """
    booking_flow = models.OneToOneField(
        BookingFlow, 
        on_delete=models.CASCADE, 
        related_name='package_config'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    packages = models.ManyToManyField(
        ProductOption, 
        through='PackageItem',
        related_name='package_configs'
    )
    min_selection = models.PositiveIntegerField(default=1)
    max_selection = models.PositiveIntegerField(default=1)
    selection_type = models.CharField(
        max_length=20, 
        choices=[
            ('SINGLE', 'Single Selection'),
            ('MULTIPLE', 'Multiple Selection'),
        ],
        default='SINGLE'
    )
    is_required = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Package config for {self.booking_flow.name}"


class PackageItem(models.Model):
    """
    Package item with display order
    """
    config = models.ForeignKey(
        PackageConfiguration, 
        on_delete=models.CASCADE, 
        related_name='package_items'
    )
    product = models.ForeignKey(
        ProductOption, 
        on_delete=models.CASCADE, 
        related_name='package_items'
    )
    order = models.PositiveIntegerField(default=0)
    is_highlighted = models.BooleanField(default=False)
    custom_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="If set, overrides the product's default price"
    )
    custom_description = models.TextField(
        blank=True,
        help_text="If set, overrides the product's default description"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['config', 'order']
        unique_together = [['config', 'order']]

    def __str__(self):
        return f"{self.product.name} (Order {self.order}) - {self.config.booking_flow.name}"


class AddonConfiguration(models.Model):
    """
    Configuration for addon selection step
    """
    booking_flow = models.OneToOneField(
        BookingFlow, 
        on_delete=models.CASCADE, 
        related_name='addon_config'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    addons = models.ManyToManyField(
        ProductOption, 
        through='AddonItem',
        related_name='addon_configs'
    )
    min_selection = models.PositiveIntegerField(default=0)
    max_selection = models.PositiveIntegerField(default=0, help_text="0 means unlimited")
    is_required = models.BooleanField(default=False)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Addon config for {self.booking_flow.name}"


class AddonItem(models.Model):
    """
    Addon item with display order
    """
    config = models.ForeignKey(
        AddonConfiguration, 
        on_delete=models.CASCADE, 
        related_name='addon_items'
    )
    product = models.ForeignKey(
        ProductOption, 
        on_delete=models.CASCADE, 
        related_name='addon_items'
    )
    order = models.PositiveIntegerField(default=0)
    is_highlighted = models.BooleanField(default=False)
    custom_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="If set, overrides the product's default price"
    )
    custom_description = models.TextField(
        blank=True,
        help_text="If set, overrides the product's default description"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['config', 'order']
        unique_together = [['config', 'order']]

    def __str__(self):
        return f"{self.product.name} (Order {self.order}) - {self.config.booking_flow.name}"


class SummaryConfiguration(models.Model):
    """
    Configuration for summary step
    """
    booking_flow = models.OneToOneField(
        BookingFlow, 
        on_delete=models.CASCADE, 
        related_name='summary_config'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    show_date = models.BooleanField(default=True)
    show_packages = models.BooleanField(default=True)
    show_addons = models.BooleanField(default=True)
    show_questionnaire = models.BooleanField(default=True)
    show_total = models.BooleanField(default=True)
    is_required = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Summary config for {self.booking_flow.name}"


class PaymentConfiguration(models.Model):
    """
    Configuration for payment step
    """
    booking_flow = models.OneToOneField(
        BookingFlow, 
        on_delete=models.CASCADE, 
        related_name='payment_config'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    require_deposit = models.BooleanField(default=False)
    deposit_percentage = models.PositiveIntegerField(default=50)
    accept_credit_card = models.BooleanField(default=True)
    accept_paypal = models.BooleanField(default=False)
    accept_bank_transfer = models.BooleanField(default=False)
    payment_instructions = models.TextField(blank=True)
    is_required = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment config for {self.booking_flow.name}"


class ConfirmationConfiguration(models.Model):
    """
    Configuration for confirmation step
    """
    booking_flow = models.OneToOneField(
        BookingFlow, 
        on_delete=models.CASCADE, 
        related_name='confirmation_config'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    success_message = models.TextField(blank=True)
    send_email = models.BooleanField(default=True)
    email_template = models.CharField(max_length=255, blank=True)
    show_summary = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Confirmation config for {self.booking_flow.name}"