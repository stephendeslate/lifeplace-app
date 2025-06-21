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
    
    def calculate_totals(self):
        """Calculate quote totals from line items and options"""
        # Calculate from line items
        line_items = self.line_items.all()
        self.subtotal = sum(item.total for item in line_items)
        
        # Apply discount if present
        if self.discount:
            if self.discount.discount_type == 'PERCENTAGE':
                self.discount_amount = self.subtotal * (self.discount.value / 100)
            else:  # FIXED
                self.discount_amount = min(self.discount.value, self.subtotal)
        
        # Calculate taxes
        tax_rate = Decimal('0.1')  # Default tax rate
        if hasattr(self, 'template') and self.template and self.template.default_tax_rate:
            tax_rate = self.template.default_tax_rate.rate / 100
        
        self.tax_amount = (self.subtotal - self.discount_amount) * tax_rate
        
        # Calculate total
        self.total_amount = self.subtotal - self.discount_amount + self.tax_amount
        self.save(update_fields=['subtotal', 'discount_amount', 'tax_amount', 'total_amount'])
    
    def accept(self, signature_data=None):
        """Mark quote as accepted and create contract/invoice if needed"""
        self.status = 'ACCEPTED'
        self.accepted_at = timezone.now()
        if signature_data:
            self.signature_data = signature_data
        self.save()
        
        # Update event status
        self.event.status = 'CONFIRMED'
        self.event.accepted_quote = self
        self.event.save()
        
        # Record activity
        QuoteActivity.objects.create(
            quote=self,
            action='ACCEPTED',
            action_by=self.event.client,
            notes=f"Quote accepted by {self.event.client}"
        )
        
        # This would typically trigger creation of contract and initial invoice via signals
        
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
        """Mark quote as sent"""
        self.status = 'SENT'
        self.sent_at = timezone.now()
        self.save()
        
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
    
    def create_next_version(self):
        """Create a new version based on this quote"""
        new_quote = EventQuote.objects.create(
            event=self.event,
            template=self.template,
            version=self.version + 1,
            status='DRAFT',
            total_amount=self.total_amount,
            valid_until=timezone.now().date() + timezone.timedelta(days=30),
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
                notes=item.notes
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
        # Create the quote
        quote = EventQuote.objects.create(
            event=event,
            template=self,
            version=1,
            status='DRAFT',
            total_amount=0,  # Will be calculated after adding items
            valid_until=timezone.now().date() + timezone.timedelta(days=self.default_validity_days),
            terms_and_conditions=self.terms_and_conditions,
            created_by=created_by
        )
        
        # Add products from template
        for template_product in self.quotetemplateplateproduct_set.all():
            QuoteLineItem.objects.create(
                quote=quote,
                description=template_product.product.name,
                quantity=template_product.quantity,
                unit_price=template_product.product.base_price,
                tax_rate=self.default_tax_rate.rate if self.default_tax_rate else Decimal('0'),
                product=template_product.product
            )
        
        # Calculate totals
        quote.calculate_totals()
        
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
    
    def save(self, *args, **kwargs):
        # Auto-calculate total if not set
        if not self.total:
            self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        
        # Update quote totals
        self.quote.calculate_totals()
    
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