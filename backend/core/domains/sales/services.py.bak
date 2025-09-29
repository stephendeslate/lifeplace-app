# backend/core/domains/sales/services.py
import logging
from datetime import timedelta
from decimal import Decimal

from core.domains.events.models import Event
from django.db import models, transaction
from django.utils import timezone

from .exceptions import (
    EventNotFoundException,
    InvalidQuoteStatusTransition,
    LineItemNotFoundException,
    QuoteNotFoundException,
    QuoteTemplateNotFound,
    TemplateProductAlreadyExists,
)
from .models import (
    EventQuote,
    QuoteActivity,
    QuoteLineItem,
    QuoteOption,
    QuoteOptionItem,
    QuoteReminder,
    QuoteTemplate,
    QuoteTemplateProduct,
)

logger = logging.getLogger(__name__)


class QuoteTemplateService:
    @staticmethod
    def create_template(data, user):
        """Create a new quote template"""
        with transaction.atomic():
            # Extract related objects
            contract_templates = data.pop('contract_templates', [])
            questionnaires = data.pop('questionnaires', [])
            products = data.pop('products', [])
            
            # Create template
            template = QuoteTemplate.objects.create(**data)
            
            # Add related objects
            if contract_templates:
                template.contract_templates.set(contract_templates)
            
            if questionnaires:
                template.questionnaires.set(questionnaires)
            
            # Add products
            for product_data in products:
                QuoteTemplateProduct.objects.create(
                    template=template,
                    **product_data
                )
            
            return template
    
    @staticmethod
    def update_template(template_id, data, user):
        """Update an existing quote template"""
        try:
            template = QuoteTemplate.objects.get(pk=template_id)
        except QuoteTemplate.DoesNotExist:
            raise QuoteTemplateNotFound(f"Template with ID {template_id} not found")
        
        with transaction.atomic():
            # Extract related objects
            contract_templates = data.pop('contract_templates', None)
            questionnaires = data.pop('questionnaires', None)
            
            # Update simple fields
            for key, value in data.items():
                setattr(template, key, value)
            template.save()
            
            # Update related objects if provided
            if contract_templates is not None:
                template.contract_templates.set(contract_templates)
            
            if questionnaires is not None:
                template.questionnaires.set(questionnaires)
            
            return template
    
    @staticmethod
    def delete_template(template_id):
        """Delete a quote template"""
        try:
            template = QuoteTemplate.objects.get(pk=template_id)
            template.delete()
        except QuoteTemplate.DoesNotExist:
            raise QuoteTemplateNotFound(f"Template with ID {template_id} not found")
    
    @staticmethod
    def add_product_to_template(template_id, product_data):
        """Add a product to a quote template"""
        try:
            template = QuoteTemplate.objects.get(pk=template_id)
        except QuoteTemplate.DoesNotExist:
            raise QuoteTemplateNotFound(f"Template with ID {template_id} not found")
        
        # Check if product already exists
        if QuoteTemplateProduct.objects.filter(
            template=template,
            product_id=product_data['product']
        ).exists():
            raise TemplateProductAlreadyExists("This product is already in the template")
        
        # Remove template from product_data if it exists
        product_data_copy = product_data.copy()
        if 'template' in product_data_copy:
            del product_data_copy['template']
        
        # Get the ProductOption instance using the ID
        from core.domains.products.models import ProductOption
        try:
            product_instance = ProductOption.objects.get(pk=product_data_copy['product'])
        except ProductOption.DoesNotExist:
            raise ValueError(f"Product with ID {product_data_copy['product']} not found")
        
        # Replace the product ID with the actual instance
        product_data_copy['product'] = product_instance
        
        product = QuoteTemplateProduct.objects.create(
            template=template,
            **product_data_copy
        )
        return product
    
    @staticmethod
    def update_template_product(product_id, product_data):
        """Update a product in a quote template"""
        try:
            product = QuoteTemplateProduct.objects.get(pk=product_id)
            for key, value in product_data.items():
                setattr(product, key, value)
            product.save()
            return product
        except QuoteTemplateProduct.DoesNotExist:
            raise TemplateProductAlreadyExists(f"Template product with ID {product_id} not found")
    
    @staticmethod
    def remove_template_product(product_id):
        """Remove a product from a quote template"""
        try:
            product = QuoteTemplateProduct.objects.get(pk=product_id)
            product.delete()
        except QuoteTemplateProduct.DoesNotExist:
            raise TemplateProductAlreadyExists(f"Template product with ID {product_id} not found")


class QuoteService:
    @staticmethod
    def create_quote(data, user):
        """Create a new quote for an event"""
        # Verify event exists
        try:
            event = Event.objects.get(pk=data['event'])
        except Event.DoesNotExist:
            raise EventNotFoundException(f"Event with ID {data['event']} not found")
        
        with transaction.atomic():
            # Set default valid until date if not provided
            if 'valid_until' not in data or not data['valid_until']:
                data['valid_until'] = timezone.now().date() + timedelta(days=30)
            
            # Get next version number for this event
            max_version = EventQuote.objects.filter(event=event).aggregate(
                max_version=models.Max('version')
            )['max_version'] or 0
            
            # Create quote
            quote = EventQuote.objects.create(
                event=event,
                template=data.get('template'),
                version=max_version + 1,
                status='DRAFT',
                total_amount=data.get('total_amount', 0),
                valid_until=data['valid_until'],
                notes=data.get('notes', ''),
                terms_and_conditions=data.get('terms_and_conditions', ''),
                client_message=data.get('client_message', ''),
                created_by=user
            )
            
            # Record activity
            QuoteActivity.objects.create(
                quote=quote,
                action='CREATED',
                action_by=user,
                notes="Quote created"
            )
            
            # If a template was used, copy its products as line items
            if quote.template:
                template_products = QuoteTemplateProduct.objects.filter(template=quote.template)
                for template_product in template_products:
                    QuoteLineItem.objects.create(
                        quote=quote,
                        description=template_product.product.name,
                        quantity=template_product.quantity,
                        unit_price=template_product.product.base_price,
                        tax_rate=getattr(template_product.product, 'tax_rate', Decimal('0')),
                        total=template_product.product.base_price * template_product.quantity,
                        product=template_product.product,
                        notes=""
                    )
                
                # Copy terms and conditions from template if not provided
                if quote.template.terms_and_conditions and not quote.terms_and_conditions:
                    quote.terms_and_conditions = quote.template.terms_and_conditions
                    quote.save(update_fields=['terms_and_conditions'])
            
            # Calculate totals
            quote.calculate_totals()
            
            logger.info(f"Created new quote for event {event.id}")
            return quote
    
    @staticmethod
    def update_quote(quote_id, data, user):
        """Update an existing quote"""
        try:
            quote = EventQuote.objects.get(pk=quote_id)
        except EventQuote.DoesNotExist:
            raise QuoteNotFoundException(f"Quote with ID {quote_id} not found")
        
        # Don't allow updating accepted/rejected quotes
        if quote.status in ['ACCEPTED', 'REJECTED']:
            raise InvalidQuoteStatusTransition(
                f"Cannot update a quote with status {quote.status}"
            )
        
        with transaction.atomic():
            # Track what changed
            changes = []
            
            # Update simple fields
            for key, value in data.items():
                if key == 'status' and value != quote.status:
                    # Status change requires special handling
                    old_status = quote.status
                    quote.status = value
                    
                    # Handle status transitions
                    if value == 'SENT':
                        quote.sent_at = timezone.now()
                        QuoteActivity.objects.create(
                            quote=quote,
                            action='SENT',
                            action_by=user,
                            notes=f"Quote sent to client"
                        )
                        
                        # Create a reminder for 3 days later
                        QuoteReminder.objects.create(
                            quote=quote,
                            scheduled_date=timezone.now() + timedelta(days=3),
                            message="Follow up on quote sent 3 days ago"
                        )
                    
                    elif value == 'ACCEPTED':
                        quote.accepted_at = timezone.now()
                        QuoteActivity.objects.create(
                            quote=quote,
                            action='ACCEPTED',
                            action_by=user,
                            notes=f"Quote accepted"
                        )
                    
                    elif value == 'REJECTED':
                        quote.rejected_at = timezone.now()
                        QuoteActivity.objects.create(
                            quote=quote,
                            action='REJECTED',
                            action_by=user,
                            notes=f"Quote rejected"
                        )
                    
                    changes.append(f"Status changed from {old_status} to {value}")
                
                elif hasattr(quote, key) and getattr(quote, key) != value:
                    setattr(quote, key, value)
                    changes.append(f"{key} updated")
            
            quote.save()
            
            # If there were changes other than status, record general update activity
            if changes and not any(change.startswith("Status changed") for change in changes):
                QuoteActivity.objects.create(
                    quote=quote,
                    action='UPDATED',
                    action_by=user,
                    notes=f"Quote updated: {', '.join(changes)}"
                )
            
            # Recalculate totals if needed
            quote.calculate_totals()
            
            logger.info(f"Updated quote: {quote}")
            return quote
    
    @staticmethod
    def delete_quote(quote_id):
        """Delete a quote"""
        try:
            quote = EventQuote.objects.get(pk=quote_id)
            
            # Don't allow deleting accepted quotes
            if quote.status == 'ACCEPTED':
                raise InvalidQuoteStatusTransition("Cannot delete an accepted quote")
            
            quote.delete()
        except EventQuote.DoesNotExist:
            raise QuoteNotFoundException(f"Quote with ID {quote_id} not found")
    
    @staticmethod
    def duplicate_quote(quote_id, user):
        """Create a duplicate of an existing quote"""
        try:
            original_quote = EventQuote.objects.get(pk=quote_id)
        except EventQuote.DoesNotExist:
            raise QuoteNotFoundException(f"Quote with ID {quote_id} not found")
        
        return original_quote.create_next_version()
    
    @staticmethod
    def add_line_item(quote_id, line_item_data, user):
        """Add a line item to a quote"""
        try:
            quote = EventQuote.objects.get(pk=quote_id)
        except EventQuote.DoesNotExist:
            raise QuoteNotFoundException(f"Quote with ID {quote_id} not found")
        
        # Don't allow updating accepted/rejected quotes
        if quote.status in ['ACCEPTED', 'REJECTED']:
            raise InvalidQuoteStatusTransition(
                f"Cannot update a quote with status {quote.status}"
            )
        
        with transaction.atomic():
            # Create line item
            if 'total' not in line_item_data:
                line_item_data['total'] = (
                    Decimal(str(line_item_data['unit_price'])) * int(line_item_data['quantity'])
                )
            
            line_item = QuoteLineItem.objects.create(
                quote=quote,
                **line_item_data
            )
            
            # Auto calculate quote totals (the line_item save() will trigger this)
            
            # Record activity
            QuoteActivity.objects.create(
                quote=quote,
                action='UPDATED',
                action_by=user,
                notes=f"Added line item: {line_item.description}"
            )
            
            return line_item
    
    @staticmethod
    def update_line_item(line_item_id, line_item_data, user):
        """Update a line item in a quote"""
        try:
            line_item = QuoteLineItem.objects.get(pk=line_item_id)
        except QuoteLineItem.DoesNotExist:
            raise LineItemNotFoundException(f"Line item with ID {line_item_id} not found")
        
        quote = line_item.quote
        
        # Don't allow updating accepted/rejected quotes
        if quote.status in ['ACCEPTED', 'REJECTED']:
            raise InvalidQuoteStatusTransition(
                f"Cannot update a quote with status {quote.status}"
            )
        
        with transaction.atomic():
            # Track changes
            description = line_item.description
            
            # Update line item
            for key, value in line_item_data.items():
                setattr(line_item, key, value)
            
            # Auto calculate total if quantity or unit_price changed
            if 'quantity' in line_item_data or 'unit_price' in line_item_data:
                line_item.total = line_item.quantity * line_item.unit_price
            
            line_item.save()
            
            # Record activity
            QuoteActivity.objects.create(
                quote=quote,
                action='UPDATED',
                action_by=user,
                notes=f"Updated line item: {description}"
            )
            
            return line_item
    
    @staticmethod
    def remove_line_item(line_item_id, user):
        """Remove a line item from a quote"""
        try:
            line_item = QuoteLineItem.objects.get(pk=line_item_id)
        except QuoteLineItem.DoesNotExist:
            raise LineItemNotFoundException(f"Line item with ID {line_item_id} not found")
        
        quote = line_item.quote
        
        # Don't allow updating accepted/rejected quotes
        if quote.status in ['ACCEPTED', 'REJECTED']:
            raise InvalidQuoteStatusTransition(
                f"Cannot update a quote with status {quote.status}"
            )
        
        with transaction.atomic():
            description = line_item.description
            line_item.delete()
            
            # Recalculate totals
            quote.calculate_totals()
            
            # Record activity
            QuoteActivity.objects.create(
                quote=quote,
                action='UPDATED',
                action_by=user,
                notes=f"Removed line item: {description}"
            )