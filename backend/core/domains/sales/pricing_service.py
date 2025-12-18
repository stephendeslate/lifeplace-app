# backend/core/domains/sales/services/pricing_service.py
import logging
import math
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass

from core.domains.products.models import ProductOption, Discount
from core.domains.payments.models import TaxRate

logger = logging.getLogger(__name__)


@dataclass
class PricingLineItem:
    """Standardized pricing line item"""
    product_id: Optional[int]
    name: str
    description: str
    quantity: int
    base_unit_price: Decimal
    excess_hours: Optional[int] = None
    excess_hour_price: Optional[Decimal] = None
    excess_cost: Decimal = Decimal('0.00')
    total_unit_price: Decimal = Decimal('0.00')  # base_unit_price + excess per unit
    line_total: Decimal = Decimal('0.00')  # total_unit_price * quantity
    tax_rate: Decimal = Decimal('0.00')
    
    def __post_init__(self):
        """Calculate derived fields after initialization"""
        self.excess_cost = (self.excess_hour_price or Decimal('0')) * (self.excess_hours or 0)
        self.total_unit_price = self.base_unit_price + (self.excess_cost / max(self.quantity, 1))
        self.line_total = self.total_unit_price * self.quantity


@dataclass
class PricingBreakdown:
    """Complete pricing breakdown"""
    line_items: List[PricingLineItem]
    subtotal: Decimal = Decimal('0.00')
    discount_amount: Decimal = Decimal('0.00')
    vip_discount_amount: Decimal = Decimal('0.00')
    service_charge_amount: Decimal = Decimal('0.00')
    tax_amount: Decimal = Decimal('0.00')
    total_amount: Decimal = Decimal('0.00')
    applied_discount: Optional[Discount] = None
    applied_vip_benefits: List[str] = None  # List of applied VIP benefit descriptions

    def __post_init__(self):
        """Calculate totals from line items"""
        self.subtotal = sum(item.line_total for item in self.line_items)
        if self.applied_vip_benefits is None:
            self.applied_vip_benefits = []
        # Tax, service charge, and discount calculations happen separately via apply_* methods
        self.total_amount = self.subtotal - self.discount_amount - self.vip_discount_amount + self.service_charge_amount + self.tax_amount


class PricingCalculationService:
    """
    Centralized service for all pricing calculations in the system.
    Provides a single source of truth for pricing logic, including excess hours.
    """
    
    @staticmethod
    def calculate_from_booking_data(booking_data: Dict[str, Any], event_duration_hours: Optional[int] = None, client=None) -> PricingBreakdown:
        """
        Calculate pricing from booking session data.

        Args:
            booking_data: Booking session data containing selected packages and addons
            event_duration_hours: Event duration in hours for excess calculations
            client: Optional client User object for VIP benefit application

        Returns:
            PricingBreakdown: Complete pricing breakdown
        """
        logger.info("=== CENTRALIZED PRICING CALCULATION ===")
        logger.info(f"Event duration: {event_duration_hours} hours")
        
        line_items = []
        
        # Get selected packages and addons from booking data (single source of truth approach)
        selected_packages = PricingCalculationService._extract_selected_items(booking_data, 'selected_packages')
        selected_addons = PricingCalculationService._extract_selected_items(booking_data, 'selected_addons')
        
        logger.info(f"Found {len(selected_packages)} packages and {len(selected_addons)} addons")
        
        # Debug: Log the booking data structure to understand addon location
        if len(selected_addons) == 0:
            logger.warning("No addons found! Booking data keys: " + str(list(booking_data.keys())))
            # Try to find addons with different key variations
            for key, value in booking_data.items():
                if 'addon' in key.lower() or 'add_on' in key.lower():
                    logger.info(f"Found potential addon key: {key} = {value}")
                if isinstance(value, dict):
                    for sub_key in value.keys():
                        if 'addon' in sub_key.lower() or 'add_on' in sub_key.lower():
                            logger.info(f"Found potential addon in {key}.{sub_key} = {value[sub_key]}")
        
        # Process packages (which can have excess hours)
        for package_data in selected_packages:
            line_item = PricingCalculationService._create_package_line_item(
                package_data, event_duration_hours
            )
            if line_item:
                line_items.append(line_item)
                logger.info(f"Package line item: {line_item.name} - ₱{line_item.line_total}")
        
        # Process addons (typically no excess hours)
        for addon_data in selected_addons:
            line_item = PricingCalculationService._create_addon_line_item(addon_data)
            if line_item:
                line_items.append(line_item)
                logger.info(f"Addon line item: {line_item.name} - ₱{line_item.line_total}")
        
        # Create pricing breakdown
        breakdown = PricingBreakdown(line_items=line_items)
        
        # Apply discount if present
        discount_code = PricingCalculationService._extract_discount_code(booking_data)
        if discount_code:
            try:
                discount = Discount.objects.get(code=discount_code, is_active=True)
                PricingCalculationService.apply_discount(breakdown, discount)
                logger.info(f"Applied discount: {discount_code} - ₱{breakdown.discount_amount}")
            except Discount.DoesNotExist:
                logger.warning(f"Discount code not found: {discount_code}")

        # Apply VIP benefits if client is provided
        if client:
            PricingCalculationService.apply_vip_benefits(breakdown, client, event_duration_hours)
            if breakdown.vip_discount_amount > 0:
                logger.info(f"Applied VIP benefits: ₱{breakdown.vip_discount_amount}")

        # Apply service charge (applied to subtotal - discount - vip_discount, before tax)
        PricingCalculationService.apply_service_charge(breakdown)
        if breakdown.service_charge_amount > 0:
            logger.info(f"Applied service charge: ₱{breakdown.service_charge_amount}")

        # Apply tax using single-source-of-truth logic
        tax_rate = PricingCalculationService.get_applicable_tax_rate(line_items)
        if tax_rate > 0:
            PricingCalculationService.apply_tax(breakdown, tax_rate)
            logger.info(f"Applied tax: {tax_rate}% - ₱{breakdown.tax_amount}")

        logger.info(f"Final total: ₱{breakdown.total_amount}")
        return breakdown
    
    @staticmethod
    def _extract_selected_items(booking_data: Dict[str, Any], item_type: str) -> List[Dict[str, Any]]:
        """Extract selected packages or addons from booking data with single source of truth logic"""
        # First check root level (preferred location)
        if item_type in booking_data:
            return booking_data[item_type]
        
        # Fallback: search in step data (take first occurrence only)
        for step_key, step_data in booking_data.items():
            if isinstance(step_data, dict) and item_type in step_data:
                return step_data[item_type]
        
        # Additional fallback: check for alternative naming conventions
        alternative_keys = []
        if item_type == 'selected_addons':
            alternative_keys = ['selected_add_ons', 'addons', 'add_ons', 'add_on_selections']
        elif item_type == 'selected_packages':
            alternative_keys = ['packages', 'package_selections']
            
        # Check root level for alternatives
        for alt_key in alternative_keys:
            if alt_key in booking_data:
                logger.info(f"Found {item_type} using alternative key: {alt_key}")
                return booking_data[alt_key]
        
        # Check in step data for alternatives
        for step_key, step_data in booking_data.items():
            if isinstance(step_data, dict):
                for alt_key in alternative_keys:
                    if alt_key in step_data:
                        logger.info(f"Found {item_type} in step {step_key} using alternative key: {alt_key}")
                        return step_data[alt_key]
        
        return []
    
    @staticmethod
    def _extract_discount_code(booking_data: Dict[str, Any]) -> Optional[str]:
        """Extract discount code from booking data"""
        # Check root level first
        if 'applied_discount_code' in booking_data:
            return booking_data['applied_discount_code']
        
        # Check in step data
        for step_key, step_data in booking_data.items():
            if isinstance(step_data, dict) and 'applied_discount_code' in step_data:
                return step_data['applied_discount_code']
        
        return None
    
    @staticmethod
    def _create_package_line_item(package_data: Dict[str, Any], event_duration_hours: Optional[int]) -> Optional[PricingLineItem]:
        """Create a line item for a package, including excess hours calculation"""
        try:
            name = package_data.get('name', 'Package')
            quantity = int(package_data.get('quantity', 1))
            base_price = Decimal(str(package_data.get('price', 0)))
            product_id = package_data.get('product_id')
            
            logger.info(f"Processing package: {name}, base_price: ₱{base_price}, quantity: {quantity}")
            
            # Calculate excess hours
            excess_hours = None
            excess_hour_price = None
            
            # Priority 1: Use frontend-provided excess data if available
            if 'excess_hours' in package_data and 'excess_hour_price' in package_data:
                excess_hours = int(package_data['excess_hours'])
                excess_hour_price = Decimal(str(package_data['excess_hour_price']))
                logger.info(f"Using frontend excess data: {excess_hours}h @ ₱{excess_hour_price}/h")
            
            # Priority 2: Calculate from event duration and package data
            elif event_duration_hours:
                package_hours = package_data.get('hours_included', 0)
                
                # If not in package data, try to get from ProductOption
                if package_hours == 0 and product_id:
                    try:
                        product = ProductOption.objects.get(id=product_id)
                        package_hours = product.included_hours or 0
                        logger.info(f"Got package hours from ProductOption: {package_hours}")
                    except ProductOption.DoesNotExist:
                        logger.warning(f"ProductOption {product_id} not found")
                
                # Calculate excess hours
                if package_hours > 0 and event_duration_hours > package_hours:
                    excess_hours = math.ceil(event_duration_hours - package_hours)
                    
                    # Determine excess hour price
                    excess_hour_price = Decimal('0')
                    
                    # Try package data first
                    if 'excess_hour_price' in package_data:
                        excess_hour_price = Decimal(str(package_data['excess_hour_price']))
                    # Try ProductOption
                    elif product_id:
                        try:
                            product = ProductOption.objects.get(id=product_id)
                            if product.excess_hour_price:
                                excess_hour_price = Decimal(str(product.excess_hour_price))
                        except ProductOption.DoesNotExist:
                            pass
                    
                    # Fallback: 50% of base hourly rate
                    if excess_hour_price == 0:
                        base_hourly_rate = base_price / Decimal(str(package_hours))
                        excess_hour_price = base_hourly_rate * Decimal('0.5')
                    
                    logger.info(f"Calculated excess: {excess_hours}h @ ₱{excess_hour_price}/h")
            
            # Create description
            description = name
            if excess_hours and excess_hours > 0:
                description += f" (includes {excess_hours}h excess @ ₱{excess_hour_price}/h)"
            
            return PricingLineItem(
                product_id=product_id,
                name=name,
                description=description,
                quantity=quantity,
                base_unit_price=base_price,
                excess_hours=excess_hours,
                excess_hour_price=excess_hour_price,
                tax_rate=Decimal('0.00')  # Tax handling can be added later
            )
            
        except (ValueError, TypeError, KeyError) as e:
            logger.warning(f"Error creating package line item: {e}")
            return None
    
    @staticmethod
    def _create_addon_line_item(addon_data: Dict[str, Any]) -> Optional[PricingLineItem]:
        """Create a line item for an addon"""
        try:
            name = addon_data.get('name', 'Add-on')
            quantity = int(addon_data.get('quantity', 1))
            price = Decimal(str(addon_data.get('price', 0)))
            product_id = addon_data.get('product_id')
            
            return PricingLineItem(
                product_id=product_id,
                name=name,
                description=name,
                quantity=quantity,
                base_unit_price=price,
                tax_rate=Decimal('0.00')
            )
            
        except (ValueError, TypeError, KeyError) as e:
            logger.warning(f"Error creating addon line item: {e}")
            return None
    
    @staticmethod
    def get_applicable_tax_rate(line_items: List[PricingLineItem]) -> Decimal:
        """
        Get applicable tax rate from system default (Currency & Taxes settings only).

        Tax source: System TaxRate with is_default=True
        Fallback: 0% if no default configured

        Note: Individual line items may have tax_rate=0 if the product is tax-inclusive.
        """
        try:
            default_tax_rate = TaxRate.objects.filter(is_default=True).first()
            if default_tax_rate:
                logger.info(f"Using default tax rate: {default_tax_rate.rate}% ({default_tax_rate.name})")
                return default_tax_rate.rate
        except Exception as e:
            logger.warning(f"Error fetching default tax rate: {e}")

        # No default configured - return 0%
        logger.info("No default tax rate configured, using 0%")
        return Decimal('0')

    @staticmethod
    def apply_discount(breakdown: PricingBreakdown, discount: Discount):
        """Apply a discount to the pricing breakdown"""
        if discount.discount_type == 'PERCENTAGE':
            breakdown.discount_amount = breakdown.subtotal * (discount.value / 100)
        elif discount.discount_type == 'FIXED':
            breakdown.discount_amount = min(discount.value, breakdown.subtotal)
        elif discount.discount_type == 'FREE_HOURS':
            # Handle free hours discount - this would need more complex logic
            # For now, treat as fixed amount
            breakdown.discount_amount = min(discount.value, breakdown.subtotal)

        breakdown.applied_discount = discount
        breakdown.total_amount = breakdown.subtotal - breakdown.discount_amount - breakdown.vip_discount_amount + breakdown.service_charge_amount + breakdown.tax_amount

    @staticmethod
    def apply_vip_benefits(breakdown: PricingBreakdown, client, event_duration_hours: Optional[int] = None):
        """
        Apply VIP benefits to the pricing breakdown.

        VIP benefits are applied after regular discounts.
        """
        try:
            from core.domains.vip.services import VIPPricingIntegrationService

            # Get the amount available for VIP discounts (after regular discount)
            available_for_vip = breakdown.subtotal - breakdown.discount_amount

            # Get automatic benefits and apply them
            vip_discount, applied_benefits = VIPPricingIntegrationService.calculate_vip_discount(
                client, available_for_vip
            )

            # Check for service charge waiver
            if VIPPricingIntegrationService.should_waive_fee(client, 'SERVICE_CHARGE'):
                applied_benefits.append("Service charge waived")

            breakdown.vip_discount_amount = min(vip_discount, available_for_vip)
            breakdown.applied_vip_benefits = applied_benefits

            # Recalculate total
            breakdown.total_amount = (
                breakdown.subtotal
                - breakdown.discount_amount
                - breakdown.vip_discount_amount
                + breakdown.service_charge_amount
                + breakdown.tax_amount
            )

        except ImportError:
            # VIP module not available
            logger.debug("VIP module not available, skipping VIP benefits")
        except Exception as e:
            logger.warning(f"Error applying VIP benefits: {e}")

    @staticmethod
    def apply_service_charge(breakdown: PricingBreakdown):
        """
        Apply service charge to the pricing breakdown.

        Service charge is calculated as a percentage of (subtotal - discount - vip_discount).
        Configuration comes from PaymentSettings singleton.
        May be waived for VIP clients.
        """
        from core.domains.payments.models import PaymentSettings

        try:
            settings = PaymentSettings.get_default_settings()

            if not settings.service_charge_enabled:
                breakdown.service_charge_amount = Decimal('0.00')
                return

            # Check if service charge is waived via VIP
            if 'Service charge waived' in (breakdown.applied_vip_benefits or []):
                breakdown.service_charge_amount = Decimal('0.00')
                logger.info("Service charge waived for VIP client")
                return

            # Calculate service charge on (subtotal - discount - vip_discount)
            chargeable_amount = breakdown.subtotal - breakdown.discount_amount - breakdown.vip_discount_amount
            service_charge_rate = settings.service_charge_percentage / Decimal('100')
            breakdown.service_charge_amount = (chargeable_amount * service_charge_rate).quantize(Decimal('0.01'))

            # Recalculate total
            breakdown.total_amount = (
                breakdown.subtotal
                - breakdown.discount_amount
                - breakdown.vip_discount_amount
                + breakdown.service_charge_amount
                + breakdown.tax_amount
            )

            logger.info(f"Service charge applied: {settings.service_charge_percentage}% = ₱{breakdown.service_charge_amount}")

        except Exception as e:
            logger.warning(f"Error applying service charge: {e}")
            breakdown.service_charge_amount = Decimal('0.00')

    @staticmethod
    def apply_tax(breakdown: PricingBreakdown, tax_rate: Decimal):
        """Apply tax to the pricing breakdown"""
        taxable_amount = breakdown.subtotal - breakdown.discount_amount - breakdown.vip_discount_amount
        breakdown.tax_amount = (taxable_amount * (tax_rate / 100)).quantize(Decimal('0.01'))
        # Recalculate total after applying tax (includes service charge)
        breakdown.total_amount = (
            breakdown.subtotal
            - breakdown.discount_amount
            - breakdown.vip_discount_amount
            + breakdown.service_charge_amount
            + breakdown.tax_amount
        )
    
    @staticmethod
    def calculate_pricing_breakdown(pricing_line_items: List[PricingLineItem]) -> PricingBreakdown:
        """Calculate pricing breakdown from PricingLineItem objects"""
        subtotal = sum(item.line_total for item in pricing_line_items)
        tax_amount = sum(item.line_total * (item.tax_rate / 100) for item in pricing_line_items)
        total_amount = subtotal + tax_amount
        
        return PricingBreakdown(
            line_items=pricing_line_items,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount
        )
    
    @staticmethod
    def calculate_from_quote_line_items(line_items) -> PricingBreakdown:
        """Calculate pricing breakdown from existing quote line items"""
        pricing_line_items = []
        
        for item in line_items:
            pricing_line_items.append(PricingLineItem(
                product_id=item.product_id if hasattr(item, 'product_id') else None,
                name=item.description,
                description=item.description,
                quantity=item.quantity,
                base_unit_price=item.unit_price,
                tax_rate=item.tax_rate if hasattr(item, 'tax_rate') else Decimal('0.00')
            ))
        
        return PricingBreakdown(line_items=pricing_line_items)