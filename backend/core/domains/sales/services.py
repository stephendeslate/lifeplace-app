# backend/core/domains/sales/services.py
import logging
from datetime import timedelta
from decimal import Decimal

from core.domains.events.models import Event
from core.domains.payments.models import TaxRate
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


def get_default_tax_rate():
    """Get tax rate from system default (Currency & Taxes settings only)"""
    default_tax = TaxRate.objects.filter(is_default=True).first()
    return default_tax.rate if default_tax else Decimal('0')


def get_tax_rate_for_product(product):
    """Get appropriate tax rate for a product - 0 if tax-inclusive, system default otherwise"""
    if getattr(product, 'is_tax_inclusive', False):
        return Decimal('0')  # Tax already included in price
    return get_default_tax_rate()


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
            # Bound by event date to prevent quotes being valid after the event
            if 'valid_until' not in data or not data['valid_until']:
                default_valid_until = timezone.now().date() + timedelta(days=30)
                event_date = event.start_date.date() if hasattr(event.start_date, 'date') else event.start_date
                max_valid_until = event_date - timedelta(days=1)  # At least 1 day before event
                data['valid_until'] = min(default_valid_until, max_valid_until)
            
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
                from core.domains.sales.pricing_service import PricingCalculationService

                template_products = QuoteTemplateProduct.objects.filter(template=quote.template)
                event_duration = event.get_duration_hours()

                for template_product in template_products:
                    product = template_product.product

                    # Build package data for pricing service to calculate excess hours
                    package_data = {
                        'product_id': product.id,
                        'name': product.name,
                        'price': float(product.base_price),
                        'quantity': template_product.quantity,
                        'hours_included': product.included_hours or 0,
                    }

                    # Add excess_hour_price if product has it configured
                    if product.excess_hour_price:
                        package_data['excess_hour_price'] = float(product.excess_hour_price)

                    # Use pricing service to calculate with excess hours
                    pricing_item = PricingCalculationService._create_package_line_item(
                        package_data,
                        event_duration
                    )

                    if pricing_item:
                        # Determine item type based on product type
                        item_type = 'ADDON' if getattr(product, 'type', 'PACKAGE') == 'ADDON' else 'PACKAGE'

                        QuoteLineItem.objects.create(
                            quote=quote,
                            description=pricing_item.description,
                            quantity=pricing_item.quantity,
                            unit_price=pricing_item.total_unit_price,
                            tax_rate=get_tax_rate_for_product(product),
                            total=pricing_item.line_total,
                            product=product,
                            notes="",
                            item_type=item_type,
                            base_unit_price=pricing_item.base_unit_price,
                            excess_hours=pricing_item.excess_hours,
                            excess_hour_price=pricing_item.excess_hour_price,
                            excess_cost=pricing_item.excess_cost
                        )
                    else:
                        logger.warning(f"Failed to calculate pricing for product {product.id} ({product.name})")
                
                # Copy terms and conditions from template if not provided
                if quote.template.terms_and_conditions and not quote.terms_and_conditions:
                    quote.terms_and_conditions = quote.template.terms_and_conditions
                    quote.save(update_fields=['terms_and_conditions'])

            # Signal handler automatically recalculates quote totals when line items are created
            # Refresh quote from database to get the signal-calculated totals
            quote.refresh_from_db()

            logger.info(f"Created quote {quote.id} for event {event.id}: subtotal=₱{quote.subtotal}, tax=₱{quote.tax_amount}, total=₱{quote.total_amount}")
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

            # Extract line_items if present (handle separately)
            line_items_data = data.pop('line_items', None)

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

            # Handle line items updates if provided
            if line_items_data is not None:
                from core.domains.sales.models import QuoteLineItem
                from core.domains.sales.pricing_service import PricingCalculationService
                from core.domains.products.models import ProductOption

                # Get list of IDs from incoming data
                incoming_ids = [item.get('id') for item in line_items_data if item.get('id')]

                # Delete line items that are no longer in the list
                if incoming_ids:
                    quote.line_items.exclude(id__in=incoming_ids).delete()
                else:
                    # If no IDs provided, delete all existing line items
                    quote.line_items.all().delete()

                event_duration = quote.event.get_duration_hours()

                # Update or create line items
                for item_data in line_items_data:
                    item_id = item_data.pop('id', None)
                    product_id = item_data.get('product_id') or item_data.get('product')

                    if item_id:
                        # Update existing line item
                        try:
                            line_item = QuoteLineItem.objects.get(id=item_id, quote=quote)

                            # Check if recalculation should be skipped (user override)
                            skip_recalculation = item_data.pop('skip_recalculation', False)

                            # Check if we should recalculate pricing
                            # Skip if user explicitly overrode values
                            should_recalculate = not skip_recalculation and (
                                (product_id and product_id != line_item.product_id) or
                                ('quantity' in item_data and item_data.get('quantity') != line_item.quantity and (product_id or line_item.product_id))
                            )

                            if should_recalculate:
                                pid = product_id or line_item.product_id
                                try:
                                    product = ProductOption.objects.get(pk=pid)
                                    package_data = {
                                        'product_id': product.id,
                                        'name': product.name,
                                        'price': float(product.base_price),
                                        'quantity': int(item_data.get('quantity', line_item.quantity)),
                                        'hours_included': product.included_hours or 0,
                                    }
                                    if product.excess_hour_price:
                                        package_data['excess_hour_price'] = float(product.excess_hour_price)

                                    pricing_item = PricingCalculationService._create_package_line_item(
                                        package_data, event_duration
                                    )

                                    if pricing_item:
                                        item_type = 'ADDON' if getattr(product, 'type', 'PACKAGE') == 'ADDON' else 'PACKAGE'
                                        line_item.description = pricing_item.description
                                        line_item.quantity = pricing_item.quantity
                                        line_item.unit_price = pricing_item.total_unit_price
                                        line_item.tax_rate = get_tax_rate_for_product(product)
                                        line_item.total = pricing_item.line_total
                                        line_item.product = product
                                        line_item.item_type = item_type
                                        line_item.base_unit_price = pricing_item.base_unit_price
                                        line_item.excess_hours = pricing_item.excess_hours
                                        line_item.excess_hour_price = pricing_item.excess_hour_price
                                        line_item.excess_cost = pricing_item.excess_cost
                                        if 'notes' in item_data:
                                            line_item.notes = item_data['notes']
                                except ProductOption.DoesNotExist:
                                    logger.warning(f"Product {pid} not found, updating without recalculation")
                                    for key, value in item_data.items():
                                        setattr(line_item, key, value)
                            else:
                                # No recalculation needed
                                for key, value in item_data.items():
                                    setattr(line_item, key, value)

                            line_item.save()
                        except QuoteLineItem.DoesNotExist:
                            logger.warning(f"Line item {item_id} not found for quote {quote.id}")
                    else:
                        # Create new line item
                        if product_id:
                            # Use pricing service for product-based items
                            try:
                                product = ProductOption.objects.get(pk=product_id)
                                package_data = {
                                    'product_id': product.id,
                                    'name': product.name,
                                    'price': float(product.base_price),
                                    'quantity': int(item_data.get('quantity', 1)),
                                    'hours_included': product.included_hours or 0,
                                }
                                if product.excess_hour_price:
                                    package_data['excess_hour_price'] = float(product.excess_hour_price)

                                pricing_item = PricingCalculationService._create_package_line_item(
                                    package_data, event_duration
                                )

                                if pricing_item:
                                    item_type = 'ADDON' if getattr(product, 'type', 'PACKAGE') == 'ADDON' else 'PACKAGE'
                                    QuoteLineItem.objects.create(
                                        quote=quote,
                                        description=pricing_item.description,
                                        quantity=pricing_item.quantity,
                                        unit_price=pricing_item.total_unit_price,
                                        tax_rate=get_tax_rate_for_product(product),
                                        total=pricing_item.line_total,
                                        product=product,
                                        notes=item_data.get('notes', ''),
                                        item_type=item_type,
                                        base_unit_price=pricing_item.base_unit_price,
                                        excess_hours=pricing_item.excess_hours,
                                        excess_hour_price=pricing_item.excess_hour_price,
                                        excess_cost=pricing_item.excess_cost
                                    )
                            except ProductOption.DoesNotExist:
                                logger.warning(f"Product {product_id} not found, creating without product")
                                QuoteLineItem.objects.create(quote=quote, **item_data)
                        else:
                            # Free-form line item
                            QuoteLineItem.objects.create(quote=quote, **item_data)

                changes.append(f"Updated {len(line_items_data)} line items")

            # If there were changes other than status, record general update activity
            if changes and not any(change.startswith("Status changed") for change in changes):
                QuoteActivity.objects.create(
                    quote=quote,
                    action='UPDATED',
                    action_by=user,
                    notes=f"Quote updated: {', '.join(changes)}"
                )

            # Signal handler automatically recalculates quote totals when line items change
            # Refresh quote from database to get the signal-calculated totals
            quote.refresh_from_db()

            logger.info(f"Updated quote {quote.id}: subtotal=₱{quote.subtotal}, tax=₱{quote.tax_amount}, total=₱{quote.total_amount}")
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
        """Add a line item to a quote

        If product_id is provided, uses PricingCalculationService to calculate
        excess hours based on event duration.
        """
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
            # Check if product_id is provided for auto-calculation
            product_id = line_item_data.get('product_id') or line_item_data.get('product')

            if product_id:
                # Use PricingCalculationService to calculate with excess hours
                from core.domains.sales.pricing_service import PricingCalculationService
                from core.domains.products.models import ProductOption

                try:
                    product = ProductOption.objects.get(pk=product_id)
                    event_duration = quote.event.get_duration_hours()

                    # Build package data for pricing calculation
                    package_data = {
                        'product_id': product.id,
                        'name': product.name,
                        'price': float(product.base_price),
                        'quantity': int(line_item_data.get('quantity', 1)),
                        'hours_included': product.included_hours or 0,
                    }

                    if product.excess_hour_price:
                        package_data['excess_hour_price'] = float(product.excess_hour_price)

                    pricing_item = PricingCalculationService._create_package_line_item(
                        package_data,
                        event_duration
                    )

                    if pricing_item:
                        item_type = 'ADDON' if getattr(product, 'type', 'PACKAGE') == 'ADDON' else 'PACKAGE'

                        line_item = QuoteLineItem.objects.create(
                            quote=quote,
                            description=pricing_item.description,
                            quantity=pricing_item.quantity,
                            unit_price=pricing_item.total_unit_price,
                            tax_rate=get_tax_rate_for_product(product),
                            total=pricing_item.line_total,
                            product=product,
                            notes=line_item_data.get('notes', ''),
                            item_type=item_type,
                            base_unit_price=pricing_item.base_unit_price,
                            excess_hours=pricing_item.excess_hours,
                            excess_hour_price=pricing_item.excess_hour_price,
                            excess_cost=pricing_item.excess_cost
                        )
                    else:
                        logger.warning(f"Failed to calculate pricing for product {product.id}")
                        raise ValueError(f"Failed to calculate pricing for product {product.name}")

                except ProductOption.DoesNotExist:
                    raise ValueError(f"Product with ID {product_id} not found")
            else:
                # No product - use provided values directly (free-form entry)
                if 'total' not in line_item_data:
                    line_item_data['total'] = (
                        Decimal(str(line_item_data['unit_price'])) * int(line_item_data['quantity'])
                    )

                line_item = QuoteLineItem.objects.create(
                    quote=quote,
                    **line_item_data
                )

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
        """Update a line item in a quote

        If product_id is provided/changed, recalculates pricing using
        PricingCalculationService with excess hours.
        """
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

            # Check if product is being set/changed
            new_product_id = line_item_data.get('product_id') or line_item_data.get('product')
            current_product_id = line_item.product_id
            quantity_changed = 'quantity' in line_item_data

            # Recalculate if product changed or quantity changed with existing product
            should_recalculate = (
                (new_product_id and new_product_id != current_product_id) or
                (quantity_changed and (new_product_id or current_product_id))
            )

            if should_recalculate:
                from core.domains.sales.pricing_service import PricingCalculationService
                from core.domains.products.models import ProductOption

                product_id_to_use = new_product_id or current_product_id

                try:
                    product = ProductOption.objects.get(pk=product_id_to_use)
                    event_duration = quote.event.get_duration_hours()

                    package_data = {
                        'product_id': product.id,
                        'name': product.name,
                        'price': float(product.base_price),
                        'quantity': int(line_item_data.get('quantity', line_item.quantity)),
                        'hours_included': product.included_hours or 0,
                    }

                    if product.excess_hour_price:
                        package_data['excess_hour_price'] = float(product.excess_hour_price)

                    pricing_item = PricingCalculationService._create_package_line_item(
                        package_data,
                        event_duration
                    )

                    if pricing_item:
                        item_type = 'ADDON' if getattr(product, 'type', 'PACKAGE') == 'ADDON' else 'PACKAGE'

                        line_item.description = pricing_item.description
                        line_item.quantity = pricing_item.quantity
                        line_item.unit_price = pricing_item.total_unit_price
                        line_item.tax_rate = get_tax_rate_for_product(product)
                        line_item.total = pricing_item.line_total
                        line_item.product = product
                        line_item.item_type = item_type
                        line_item.base_unit_price = pricing_item.base_unit_price
                        line_item.excess_hours = pricing_item.excess_hours
                        line_item.excess_hour_price = pricing_item.excess_hour_price
                        line_item.excess_cost = pricing_item.excess_cost

                        # Apply any additional overrides from line_item_data (e.g., notes)
                        if 'notes' in line_item_data:
                            line_item.notes = line_item_data['notes']
                    else:
                        logger.warning(f"Failed to calculate pricing for product {product.id}")
                        raise ValueError(f"Failed to calculate pricing for product {product.name}")

                except ProductOption.DoesNotExist:
                    raise ValueError(f"Product with ID {product_id_to_use} not found")
            else:
                # No product recalculation needed - update fields directly
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
            
            # DRY: Use centralized pricing calculation service
            from core.domains.sales.pricing_service import PricingCalculationService

            # Convert quote line items to booking data format for centralized calculation
            booking_data = {
                'selected_packages': [],
                'selected_addons': []
            }

            for item in quote.line_items.all():
                if item.product:
                    item_data = {
                        'product_id': item.product.id,
                        'name': item.description,
                        'price': item.unit_price,
                        'quantity': item.quantity
                    }

                    # Determine if package or addon based on product type
                    if item.product.type == 'PACKAGE':
                        booking_data['selected_packages'].append(item_data)
                    else:
                        booking_data['selected_addons'].append(item_data)

            # Use centralized pricing calculation
            event_duration = quote.event.get_duration_hours() if quote.event else 8
            breakdown = PricingCalculationService.calculate_from_booking_data(
                booking_data,
                event_duration
            )

            quote.subtotal = breakdown.subtotal
            quote.tax_amount = breakdown.tax_amount
            quote.total_amount = breakdown.total_amount
            quote.save(update_fields=["subtotal", "tax_amount", "total_amount"])
            
            # Record activity
            QuoteActivity.objects.create(
                quote=quote,
                action='UPDATED',
                action_by=user,
                notes=f"Removed line item: {description}"
            )