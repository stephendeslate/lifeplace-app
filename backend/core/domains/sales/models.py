# backend/core/domains/sales/models.py
from decimal import Decimal

from core.utils.models import BaseModel
from django.db import models
from django.utils import timezone


class EventQuote(BaseModel):
    """Quote/proposal for an event with pricing options"""
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='quotes')
    template = models.ForeignKey('QuoteTemplate', on_delete=models.SET_NULL, null=True, blank=True)
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=[
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired')
    ])
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    service_charge_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    valid_until = models.DateField()
    sent_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    terms_and_conditions = models.TextField(blank=True)
    client_message = models.TextField(blank=True)
    signature_data = models.TextField(blank=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='created_quotes')
    pdf_file = models.FileField(upload_to='quotes/', null=True, blank=True)
    discount = models.ForeignKey('products.Discount', on_delete=models.SET_NULL, null=True, blank=True, related_name='quotes')
    
    class Meta:
        ordering = ['-created_at', '-version']
        unique_together = ['event', 'version']
    
    def __str__(self):
        return f"Quote {self.version} for Event {self.event.id}"
    
    
    def accept(self, signature_data=None):
        """Mark quote as accepted and create contract/invoice if needed.

        Raises:
            ValueError: If quote cannot be accepted (wrong status or expired)
        """
        # Validate quote can be accepted
        if self.status != 'SENT':
            raise ValueError(f"Cannot accept quote with status '{self.status}'. Quote must be in SENT status.")

        # Check if quote has expired
        if self.valid_until and self.valid_until < timezone.now().date():
            raise ValueError(
                f"Cannot accept expired quote. This quote expired on {self.valid_until}."
            )

        self.status = 'ACCEPTED'
        self.accepted_at = timezone.now()
        if signature_data:
            self.signature_data = signature_data

        # IMPORTANT: Update event BEFORE saving quote to ensure the signal handler
        # can access event.accepted_quote for correct pricing in contract generation
        self.event.status = 'CONFIRMED'
        self.event.accepted_quote = self
        self.event.save()

        # Now save the quote - this triggers the post_save signal which creates
        # contract and invoice. The signal can now access event.accepted_quote
        self.save()

        # Record activity
        QuoteActivity.objects.create(
            quote=self,
            action='ACCEPTED',
            action_by=self.event.client,
            notes=f"Quote accepted by {self.event.client}"
        )

        # Contract and invoice creation is handled via signals (handle_quote_acceptance)
        
    def reject(self, reason=None):
        """Mark quote as rejected"""
        self.status = 'REJECTED'
        self.rejected_at = timezone.now()
        if reason:
            self.rejection_reason = reason
        self.save()
        
        # Record activity
        QuoteActivity.objects.create(
            quote=self,
            action='REJECTED',
            action_by=self.event.client,
            notes=f"Quote rejected: {reason}"
        )
    
    def send_to_client(self, user=None):
        """Mark quote as sent, send email notification, and trigger workflow"""
        import logging
        logger = logging.getLogger(__name__)

        self.status = 'SENT'
        self.sent_at = timezone.now()
        self.save()  # This triggers the signal which fires workflow

        # Record activity
        QuoteActivity.objects.create(
            quote=self,
            action='SENT',
            action_by=user,
            notes=f"Quote sent to client {self.event.client}"
        )

        # Set a reminder for follow-up
        if self.valid_until:
            reminder_date = self.sent_at + timezone.timedelta(days=3)
            if reminder_date.date() < self.valid_until:
                QuoteReminder.objects.create(
                    quote=self,
                    scheduled_date=reminder_date,
                    message="Follow up on quote sent 3 days ago"
                )

        # Send email notification to client
        try:
            from core.domains.communications.services import CommunicationService
            from core.domains.communications.context_service import (
                CommunicationContextService, ContextType
            )

            client = self.event.client
            if client and client.email:
                # Initialize communication service
                comm_service = CommunicationService()

                # Generate context using the unified context service
                template_data = CommunicationContextService.generate_context(
                    context_type=ContextType.QUOTE,
                    client=client,
                    event=self.event,
                    quote=self,
                )

                comm_service.send_communication(
                    template_name='quote_sent_to_client',
                    recipient=client.email,
                    context_data=template_data,
                    client=client,
                    sent_by=None,
                    use_async=False,
                    event=self.event
                )

                logger.info(f"Sent quote notification email to {client.email} for quote {self.id}")
        except Exception as e:
            logger.error(f"Failed to send quote notification email: {e}")
            # Don't fail the quote send operation if email fails
    
    def create_next_version(self):
        """Create a new version based on this quote"""
        # Calculate valid_until bounded by event date to prevent quotes being valid after the event
        default_valid_until = timezone.now().date() + timezone.timedelta(days=30)
        event_date = self.event.start_date.date() if hasattr(self.event.start_date, 'date') else self.event.start_date
        max_valid_until = event_date - timezone.timedelta(days=1)  # At least 1 day before event
        quote_valid_until = min(default_valid_until, max_valid_until)

        new_quote = EventQuote.objects.create(
            event=self.event,
            template=self.template,
            version=self.version + 1,
            status='DRAFT',
            total_amount=self.total_amount,
            valid_until=quote_valid_until,
            terms_and_conditions=self.terms_and_conditions,
            notes=self.notes,
            created_by=self.created_by
        )
        
        # Copy line items
        for item in self.line_items.all():
            QuoteLineItem.objects.create(
                quote=new_quote,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                tax_rate=item.tax_rate,
                total=item.total,
                product=item.product,
                notes=item.notes,
                item_type=item.item_type,
                base_unit_price=item.base_unit_price,
                excess_hours=item.excess_hours,
                excess_hour_price=item.excess_hour_price,
                excess_cost=item.excess_cost,
                venue_hours_breakdown=item.venue_hours_breakdown
            )
        
        # Copy options if they exist
        for option in self.options.all():
            new_option = QuoteOption.objects.create(
                quote=new_quote,
                name=option.name,
                description=option.description,
                total_price=option.total_price,
                is_selected=option.is_selected
            )
            
            # Copy option items
            for item in option.items.all():
                QuoteOptionItem.objects.create(
                    option=new_option,
                    description=item.description,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    total=item.total,
                    product=item.product
                )
        
        # Record activity
        QuoteActivity.objects.create(
            quote=new_quote,
            action='CREATED',
            action_by=self.created_by,
            notes=f"New version {new_quote.version} created based on version {self.version}"
        )
        
        return new_quote



class QuoteTemplate(BaseModel):
    """Template for standardized quotes that can be applied to events"""
    name = models.CharField(max_length=255)
    introduction = models.TextField(blank=True, help_text="Introduction text to appear at beginning of quotes")
    event_type = models.ForeignKey('events.EventType', on_delete=models.PROTECT, null=True, blank=True)
    products = models.ManyToManyField('products.ProductOption', through='QuoteTemplateProduct')
    contract_templates = models.ManyToManyField('contracts.ContractTemplate', blank=True)
    questionnaires = models.ManyToManyField('questionnaires.Questionnaire', blank=True)
    terms_and_conditions = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    default_validity_days = models.PositiveIntegerField(default=30)
    has_multiple_options = models.BooleanField(default=False)
    default_tax_rate = models.ForeignKey('payments.TaxRate', on_delete=models.SET_NULL, null=True, blank=True)
    workflow_template = models.ForeignKey('workflows.WorkflowTemplate', on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return self.name
    
    def apply_to_event(self, event, created_by=None):
        """
        Creates a new quote for an event based on this template
        Returns the newly created quote
        """
        # Calculate valid_until bounded by event date to prevent quotes being valid after the event
        default_valid_until = timezone.now().date() + timezone.timedelta(days=self.default_validity_days)
        event_date = event.start_date.date() if hasattr(event.start_date, 'date') else event.start_date
        max_valid_until = event_date - timezone.timedelta(days=1)  # At least 1 day before event
        quote_valid_until = min(default_valid_until, max_valid_until)

        # Create the quote
        quote = EventQuote.objects.create(
            event=event,
            template=self,
            version=1,
            status='DRAFT',
            total_amount=0,  # Will be calculated after adding items
            valid_until=quote_valid_until,
            terms_and_conditions=self.terms_and_conditions,
            created_by=created_by
        )
        
        # Add products from template
        for template_product in self.quotetemplateproduct_set.all():
            # Get tax rate: use product's tax_rate with template/global fallback
            product = template_product.product
            if getattr(product, 'is_tax_inclusive', False):
                tax_rate = Decimal('0')
            elif product.tax_rate and Decimal(str(product.tax_rate)) > 0:
                tax_rate = Decimal(str(product.tax_rate))
            elif self.default_tax_rate:
                tax_rate = self.default_tax_rate.rate
            else:
                # Fall back to global TaxRate (no hardcoded fallback)
                from core.domains.payments.models import TaxRate
                default_tax = TaxRate.objects.filter(is_default=True).first()
                tax_rate = default_tax.rate if default_tax else Decimal('0')

            QuoteLineItem.objects.create(
                quote=quote,
                description=product.name,
                quantity=template_product.quantity,
                unit_price=product.base_price,
                tax_rate=tax_rate,
                product=product
            )
        
        # Calculate totals manually (legacy template quotes don't go through booking flow)
        line_items = quote.line_items.all()
        subtotal = sum(item.total for item in line_items)
        tax_amount = sum(item.total * (item.tax_rate / 100) for item in line_items)
        total_amount = subtotal + tax_amount

        quote.subtotal = subtotal
        quote.tax_amount = tax_amount
        quote.total_amount = total_amount
        quote.save(update_fields=['subtotal', 'tax_amount', 'total_amount'])
        
        # Record activity
        QuoteActivity.objects.create(
            quote=quote,
            action='CREATED',
            action_by=created_by,
            notes=f"Quote created from template {self.name}"
        )
        
        return quote


class QuoteTemplateProduct(BaseModel):
    """Junction model for products in a quote template"""
    template = models.ForeignKey(QuoteTemplate, on_delete=models.CASCADE)
    product = models.ForeignKey('products.ProductOption', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    is_required = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('template', 'product')
    
    def __str__(self):
        return f"{self.product.name} - {self.template.name}"


class QuoteLineItem(BaseModel):
    """Individual line item in a quote"""
    quote = models.ForeignKey(EventQuote, on_delete=models.CASCADE, related_name='line_items')
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    product = models.ForeignKey('products.ProductOption', on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)

    # Enhanced pricing fields for DRY compliance (same as InvoiceLineItem)
    item_type = models.CharField(
        max_length=20,
        choices=[('PACKAGE', 'Package'), ('ADDON', 'Add-on')],
        default='PACKAGE',
        help_text='Type of item to distinguish packages from addons'
    )
    base_unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Base price before excess hours (unit_price = base_unit_price + excess per unit)'
    )
    excess_hours = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Number of excess hours for this item'
    )
    excess_hour_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Price per excess hour'
    )
    excess_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Total excess cost (excess_hours * excess_hour_price)'
    )
    venue_hours_breakdown = models.JSONField(
        null=True,
        blank=True,
        help_text='Per-venue hours breakdown: [{venue_id, venue_name, included_hours, additional_hours, excess_hour_price, venue_cost}]'
    )

    @property
    def item_type_display(self):
        """Get display name for item type"""
        return dict(self._meta.get_field('item_type').choices).get(self.item_type, self.item_type)
    
    def save(self, *args, **kwargs):
        # Auto-calculate total if not set
        if not self.total:
            self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)

        # Note: Quote totals are now directly assigned from PricingCalculationService
        # No need to recalculate as it violates DRY principle
    
    def __str__(self):
        return f"{self.description} - Quote {self.quote.id}"


class QuoteOption(BaseModel):
    """Package option within a quote (for quotes with multiple options)"""
    quote = models.ForeignKey(EventQuote, on_delete=models.CASCADE, related_name='options')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_selected = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.name} - Quote {self.quote.id}"
    
    def calculate_total(self):
        """Calculate total price from option items"""
        items = self.items.all()
        self.total_price = sum(item.total for item in items)
        self.save(update_fields=['total_price'])


class QuoteOptionItem(BaseModel):
    """Line item within a quote option"""
    option = models.ForeignKey(QuoteOption, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    product = models.ForeignKey('products.ProductOption', on_delete=models.SET_NULL, null=True)
    
    def save(self, *args, **kwargs):
        # Auto-calculate total if not set
        if not self.total:
            self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        
        # Update option total
        self.option.calculate_total()
    
    def __str__(self):
        return f"{self.description} - {self.option.name}"


class QuoteActivity(BaseModel):
    """Tracks actions and activity related to quotes"""
    quote = models.ForeignKey(EventQuote, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=50, choices=[
        ('CREATED', 'Created'),
        ('UPDATED', 'Updated'),
        ('SENT', 'Sent'),
        ('VIEWED', 'Viewed by client'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
        ('REMINDER_SENT', 'Reminder sent')
    ])
    action_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.get_action_display()} - Quote {self.quote.id}"
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Quote activities"


class QuoteReminder(BaseModel):
    """Scheduled reminders for sent quotes"""
    quote = models.ForeignKey(EventQuote, on_delete=models.CASCADE, related_name='reminders')
    scheduled_date = models.DateTimeField()
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    message = models.TextField(blank=True)
    
    def __str__(self):
        return f"Reminder for Quote {self.quote.id} - {self.scheduled_date.strftime('%Y-%m-%d')}"
    
    class Meta:
        ordering = ['scheduled_date']