# backend/core/domains/sales/services/pricing_service.py
import logging
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass

from core.domains.products.models import Discount
from core.domains.payments.models import TaxRate
from core.domains.venues.models import PackageVenue, VenueEventTypeConfiguration

logger = logging.getLogger(__name__)


def get_default_tax_rate() -> Decimal:
    """
    Get tax rate from system default (global TaxRate with is_default=True).

    Returns:
        Decimal: Default tax rate from TaxRate table, or 0 if none configured.
                 TaxRate is the ultimate source of truth - no hardcoded fallback.
    """
    default_tax = TaxRate.objects.filter(is_default=True).first()
    return default_tax.rate if default_tax else Decimal('0')


def get_tax_rate_for_product(product) -> Decimal:
    """
    Get appropriate tax rate for a product/addon.

    Logic:
    - If tax-inclusive, return 0 (tax already in price)
    - Otherwise, use global default TaxRate

    Args:
        product: ProductOption instance with is_tax_inclusive field

    Returns:
        Decimal: The applicable tax rate percentage (e.g., 12.00 for 12%)
    """
    # If tax is already included in price, no additional tax
    if getattr(product, 'is_tax_inclusive', False):
        return Decimal('0')

    # Use global default tax rate
    return get_default_tax_rate()


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
    item_type: str = 'PACKAGE'  # 'PACKAGE' or 'ADDON'

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
    tax_rate: Decimal = Decimal('0.00')  # Tax rate as percentage (e.g., 12.00 for 12%)
    total_amount: Decimal = Decimal('0.00')
    applied_discount: Optional[Discount] = None
    applied_vip_benefits: List[str] = None  # List of applied VIP benefit descriptions
    discount_error: Optional[str] = None
    discount_error_type: Optional[str] = None

    def __post_init__(self):
        """Calculate totals from line items"""
        self.subtotal = sum((item.line_total for item in self.line_items), Decimal('0.00'))
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
    def get_venue_hours_info(
        product_id: int,
        venue_additional_hours: Dict[str, int],
        event_type_id: Optional[int] = None,
        venue_ids: Optional[List[int]] = None
    ) -> Tuple[Decimal, List[Dict[str, Any]]]:
        """
        Calculate venue-based excess hours pricing.

        Args:
            product_id: The package/product ID
            venue_additional_hours: Dict mapping venue_id (as string) -> additional hours (int)
            event_type_id: Optional event type ID for event-type-specific pricing
            venue_ids: Optional list of venue IDs for custom bundles (used when product_id is -1)

        Returns:
            Tuple of (total_cost: Decimal, venue_details: list of dicts)
        """
        if not venue_additional_hours:
            return Decimal('0.00'), []

        from core.domains.venues.models import Venue

        # For custom bundles (product_id = -1), use venue_ids directly
        if product_id == -1 and venue_ids:
            venues = list(Venue.objects.filter(id__in=venue_ids))
            logger.info(f"Custom bundle: fetching {len(venues)} venues directly from venue_ids")
        else:
            # Query PackageVenue to get venues for this package
            package_venues = PackageVenue.objects.filter(
                package_id=product_id
            ).select_related('venue')
            venues = [pv.venue for pv in package_venues]

        # Pre-fetch event type configurations if event_type_id is provided
        event_type_configs = {}
        if event_type_id and venues:
            configs = VenueEventTypeConfiguration.objects.filter(
                venue__in=venues,
                event_type_id=event_type_id
            ).select_related('venue')
            event_type_configs = {config.venue_id: config for config in configs}

        total_cost = Decimal('0.00')
        venue_details = []

        for venue in venues:
            venue_id_str = str(venue.id)
            additional_hours = venue_additional_hours.get(venue_id_str, 0)

            if additional_hours > 0:
                # Check for event-type-specific configuration
                event_config = event_type_configs.get(venue.id)

                if event_config:
                    # Use event-type-specific pricing
                    included_hours = event_config.get_effective_included_hours() or Decimal('0')
                    excess_hour_price = event_config.get_effective_excess_hour_price() or Decimal('0')
                    is_all_day = event_config.is_all_day_access
                    logger.info(
                        f"Using event-type config for {venue.name}: "
                        f"included={included_hours}h, excess_price=₱{excess_hour_price}, all_day={is_all_day}"
                    )
                else:
                    # Fall back to venue defaults
                    included_hours = venue.standalone_included_hours or Decimal('0')
                    excess_hour_price = venue.standalone_excess_hour_price or Decimal('0')
                    is_all_day = False

                # For all-day access, no excess charges apply
                if is_all_day:
                    venue_cost = Decimal('0.00')
                    logger.info(f"Venue {venue.name}: All-day access - no excess charges")
                else:
                    # Calculate cost for this venue
                    venue_cost = Decimal(str(additional_hours)) * excess_hour_price
                    total_cost += venue_cost
                    logger.info(
                        f"Venue {venue.name}: {additional_hours}h additional @ ₱{excess_hour_price}/h = ₱{venue_cost}"
                    )

                venue_details.append({
                    'venue_id': venue.id,
                    'venue_name': venue.name,
                    'included_hours': float(included_hours),
                    'additional_hours': additional_hours,
                    'excess_hour_price': float(excess_hour_price),
                    'venue_cost': float(venue_cost),
                    'is_all_day_access': is_all_day,
                    'has_event_type_config': event_config is not None
                })

        return total_cost, venue_details

    @staticmethod
    def calculate_from_booking_data(
        booking_data: Dict[str, Any],
        client=None,
        venue_additional_hours: Optional[Dict[str, int]] = None,
        event_type_id: Optional[int] = None
    ) -> PricingBreakdown:
        """
        Calculate pricing from booking session data.

        Args:
            booking_data: Booking session data containing selected packages and addons
            client: Optional client User object for VIP benefit application
            venue_additional_hours: Optional dict mapping venue_id (string) -> additional hours (int)
            event_type_id: Optional event type ID for event-type-specific pricing

        Returns:
            PricingBreakdown: Complete pricing breakdown
        """
        # Extract venue_additional_hours from booking_data if not provided explicitly
        if venue_additional_hours is None:
            venue_additional_hours = booking_data.get('venue_additional_hours', {})

        # Extract event_type_id from booking_data if not provided explicitly
        if event_type_id is None:
            event_type_id = booking_data.get('event_type_id')
            # Also check in root-level booking flow info
            if event_type_id is None:
                event_type_id = booking_data.get('booking_flow', {}).get('event_type_id')

        line_items = []

        # DEBUG: Log booking_data structure
        logger.info(f"DEBUG calculate_from_booking_data: booking_data keys = {list(booking_data.keys()) if booking_data else 'None'}")

        # Get selected packages and addons from booking data (single source of truth approach)
        selected_packages = PricingCalculationService._extract_selected_items(booking_data, 'selected_packages')
        selected_addons = PricingCalculationService._extract_selected_items(booking_data, 'selected_addons')

        logger.info(f"DEBUG: extracted {len(selected_packages)} packages, {len(selected_addons)} addons")

        # Process packages (which can have excess hours)
        for package_data in selected_packages:
            line_item = PricingCalculationService._create_package_line_item(
                package_data, venue_additional_hours, event_type_id
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
            from core.domains.products.services import DiscountService
            discount, error_msg, error_type = DiscountService.validate_discount_code(
                code=discount_code,
                order_amount=breakdown.subtotal,
            )
            if discount:
                PricingCalculationService.apply_discount(breakdown, discount)
                logger.info(f"Applied discount: {discount_code} - ₱{breakdown.discount_amount}")
            else:
                breakdown.discount_error = error_msg
                breakdown.discount_error_type = error_type
                logger.warning(f"Discount validation failed for '{discount_code}': {error_msg}")

        # Apply VIP benefits if client is provided
        if client:
            PricingCalculationService.apply_vip_benefits(breakdown, client)
            if breakdown.vip_discount_amount > 0:
                logger.info(f"Applied VIP benefits: ₱{breakdown.vip_discount_amount}")

        # Apply service charge (applied to subtotal - discount - vip_discount, before tax)
        PricingCalculationService.apply_service_charge(breakdown)
        if breakdown.service_charge_amount > 0:
            logger.info(f"Applied service charge: ₱{breakdown.service_charge_amount}")

        # Apply tax using per-item tax rates
        PricingCalculationService.apply_item_based_tax(breakdown)
        if breakdown.tax_amount > 0:
            logger.info(f"Applied per-item tax: ₱{breakdown.tax_amount}")

        logger.info(f"Final total: ₱{breakdown.total_amount}")
        return breakdown
    
    @staticmethod
    def _extract_selected_items(booking_data: Dict[str, Any], item_type: str) -> List[Dict[str, Any]]:
        """Extract selected packages or addons from booking data with single source of truth logic"""
        # First check root level (preferred location)
        if item_type in booking_data:
            logger.info(f"DEBUG _extract_selected_items: Found {item_type} at root level with {len(booking_data[item_type])} items")
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

        logger.warning(f"DEBUG _extract_selected_items: {item_type} NOT FOUND in booking_data. Keys present: {list(booking_data.keys())}")
        return []
    
    @staticmethod
    def _extract_discount_code(booking_data: Dict[str, Any]) -> Optional[str]:
        """Extract discount code from booking data"""
        # Check root level first (preferred field name)
        if booking_data.get('applied_discount_code'):
            return booking_data['applied_discount_code']

        # Fallback: check promo_code at root level (mobile-app compat)
        if booking_data.get('promo_code'):
            return booking_data['promo_code']

        # Check in step data
        for step_key, step_data in booking_data.items():
            if isinstance(step_data, dict):
                if step_data.get('applied_discount_code'):
                    return step_data['applied_discount_code']
                if step_data.get('promo_code'):
                    return step_data['promo_code']

        return None
    
    @staticmethod
    def _create_package_line_item(
        package_data: Dict[str, Any],
        venue_additional_hours: Optional[Dict[str, int]] = None,
        event_type_id: Optional[int] = None
    ) -> Optional[PricingLineItem]:
        """Create a line item for a package, including venue-based excess hours calculation"""
        try:
            from core.domains.products.models import ProductOption

            name = package_data.get('name', 'Package')
            quantity = int(package_data.get('quantity', 1))
            base_price = Decimal(str(package_data.get('price', 0)))
            product_id = package_data.get('product_id')

            # For custom bundles, get venue_ids from package data
            is_custom_bundle = package_data.get('is_custom_bundle', False)
            venue_ids = package_data.get('venue_ids', []) if is_custom_bundle else None

            # Determine tax rate using product's tax_rate with global fallback
            tax_rate = Decimal('0.00')
            # Ensure product_id is an integer for comparison (handles JSON string "24" -> 24)
            if product_id is not None:
                try:
                    product_id = int(product_id)
                except (ValueError, TypeError):
                    logger.warning(f"Could not convert product_id to int: {product_id}")
                    product_id = None
            if product_id is not None and product_id > 0:
                try:
                    product = ProductOption.objects.get(id=product_id)
                    tax_rate = get_tax_rate_for_product(product)
                    logger.info(f"Package {name}: tax_rate={tax_rate}% (is_tax_inclusive={product.is_tax_inclusive})")
                    # Defensive quantity clamping based on product constraints
                    if not product.allow_multiple and quantity > 1:
                        logger.warning(f"Package {name}: quantity {quantity} clamped to 1 (allow_multiple=False)")
                        quantity = 1
                    elif product.allow_multiple and product.maximum_quantity and quantity > product.maximum_quantity:
                        logger.warning(f"Package {name}: quantity {quantity} clamped to {product.maximum_quantity}")
                        quantity = product.maximum_quantity
                except ProductOption.DoesNotExist:
                    tax_rate = get_default_tax_rate()
                    logger.warning(f"Product {product_id} not found, using default tax_rate={tax_rate}%")
            else:
                # Custom bundle - check if is_tax_inclusive is in package_data
                if package_data.get('is_tax_inclusive', False):
                    tax_rate = Decimal('0.00')
                    logger.info(f"Custom bundle {name}: tax-inclusive, tax_rate=0%")
                else:
                    # Use product's tax_rate from package_data if available, else global default
                    pkg_tax_rate = package_data.get('tax_rate')
                    if pkg_tax_rate is not None and Decimal(str(pkg_tax_rate)) > 0:
                        tax_rate = Decimal(str(pkg_tax_rate))
                    else:
                        tax_rate = get_default_tax_rate()
                    logger.info(f"Custom bundle {name}: tax_rate={tax_rate}%")

            # Calculate excess hours using venue-based hours system
            excess_hours = None
            excess_hour_price = None

            if venue_additional_hours and (product_id or venue_ids):
                total_cost, venue_details = PricingCalculationService.get_venue_hours_info(
                    product_id or -1, venue_additional_hours, event_type_id, venue_ids
                )

                if total_cost > 0:
                    # Calculate total additional hours across all venues
                    total_additional_hours = sum(venue_additional_hours.values())
                    # Use weighted average price for display purposes
                    avg_price = total_cost / Decimal(str(total_additional_hours)) if total_additional_hours > 0 else Decimal('0')

                    excess_hours = total_additional_hours
                    excess_hour_price = avg_price

                    logger.info(f"Venue-based hours: {total_additional_hours}h total, ₱{total_cost} total cost")
                    logger.info(f"Venue breakdown: {venue_details}")

            # Create description
            description = name
            if excess_hours and excess_hours > 0:
                description += f" (+{excess_hours}h additional @ ₱{excess_hour_price}/h avg)"

            return PricingLineItem(
                product_id=product_id,
                name=name,
                description=description,
                quantity=quantity,
                base_unit_price=base_price,
                excess_hours=excess_hours,
                excess_hour_price=excess_hour_price,
                tax_rate=tax_rate
            )

        except (ValueError, TypeError, KeyError) as e:
            logger.warning(f"Error creating package line item: {e}")
            return None
    
    @staticmethod
    def _create_addon_line_item(addon_data: Dict[str, Any]) -> Optional[PricingLineItem]:
        """Create a line item for an addon"""
        try:
            from core.domains.products.models import ProductOption

            name = addon_data.get('name', 'Add-on')
            quantity = int(addon_data.get('quantity', 1))
            price = Decimal(str(addon_data.get('price', 0)))
            product_id = addon_data.get('product_id')

            # Determine tax rate and validate quantity using product constraints
            tax_rate = Decimal('0.00')
            if product_id and product_id != -1:
                try:
                    product = ProductOption.objects.get(id=product_id)
                    tax_rate = get_tax_rate_for_product(product)
                    logger.info(f"Add-on {name}: tax_rate={tax_rate}% (from product)")
                    # Defensive quantity clamping based on product constraints
                    if not product.allow_multiple and quantity > 1:
                        logger.warning(f"Add-on {name}: quantity {quantity} clamped to 1 (allow_multiple=False)")
                        quantity = 1
                    elif product.allow_multiple and product.maximum_quantity and quantity > product.maximum_quantity:
                        logger.warning(f"Add-on {name}: quantity {quantity} clamped to {product.maximum_quantity}")
                        quantity = product.maximum_quantity
                except ProductOption.DoesNotExist:
                    tax_rate = get_default_tax_rate()
                    logger.warning(f"Product {product_id} not found, using default tax_rate={tax_rate}%")
            else:
                # No product_id - check addon_data for tax info, else use global default
                if addon_data.get('is_tax_inclusive', False):
                    tax_rate = Decimal('0.00')
                    logger.info(f"Add-on {name}: tax-inclusive, tax_rate=0%")
                else:
                    addon_tax_rate = addon_data.get('tax_rate')
                    if addon_tax_rate is not None and Decimal(str(addon_tax_rate)) > 0:
                        tax_rate = Decimal(str(addon_tax_rate))
                    else:
                        tax_rate = get_default_tax_rate()
                    logger.info(f"Add-on {name}: tax_rate={tax_rate}%")

            return PricingLineItem(
                product_id=product_id,
                name=name,
                description=name,
                quantity=quantity,
                base_unit_price=price,
                tax_rate=tax_rate,
                item_type='ADDON'
            )

        except (ValueError, TypeError, KeyError) as e:
            logger.warning(f"Error creating addon line item: {e}")
            return None
    
    @staticmethod
    def get_applicable_tax_rate(line_items: List[PricingLineItem]) -> Decimal:
        """
        Get applicable tax rate from system default.

        Tax source: System TaxRate with is_default=True (ultimate source of truth)
        Fallback: 0% if no default configured (no hardcoded assumptions)

        Note: Individual line items may have tax_rate=0 if the product is tax-inclusive.
        """
        return get_default_tax_rate()

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
    def apply_vip_benefits(breakdown: PricingBreakdown, client):
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
        """Apply tax to the pricing breakdown (legacy single-rate method)"""
        breakdown.tax_rate = tax_rate  # Store the tax rate for frontend use
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
    def apply_item_based_tax(breakdown: PricingBreakdown):
        """
        Apply tax based on each line item's individual tax rate.

        Tax-inclusive products have tax_rate=0 (price already includes tax).
        Non-tax-inclusive products have the default system tax rate.

        Discounts are applied proportionally to reduce the taxable amount per item.
        """
        if not breakdown.line_items:
            breakdown.tax_amount = Decimal('0.00')
            breakdown.tax_rate = Decimal('0.00')
            return

        # Calculate discount ratio to apply proportionally
        total_discount = breakdown.discount_amount + breakdown.vip_discount_amount
        discount_ratio = Decimal('0')
        if breakdown.subtotal > 0:
            discount_ratio = total_discount / breakdown.subtotal

        # Calculate tax per line item and track weighted tax rate
        total_tax = Decimal('0.00')
        weighted_tax_rate_sum = Decimal('0.00')
        total_taxable_amount = Decimal('0.00')

        for item in breakdown.line_items:
            # Item's taxable amount after proportional discount
            item_discount = (item.line_total * discount_ratio).quantize(Decimal('0.01'))
            item_taxable = item.line_total - item_discount

            # Apply item's specific tax rate
            item_tax = (item_taxable * (item.tax_rate / 100)).quantize(Decimal('0.01'))
            total_tax += item_tax

            # Track for weighted average tax rate calculation
            if item.tax_rate > 0:
                weighted_tax_rate_sum += item_taxable * item.tax_rate
                total_taxable_amount += item_taxable
                logger.info(
                    f"Item tax: {item.name} - taxable ₱{item_taxable} @ {item.tax_rate}% = ₱{item_tax}"
                )

        breakdown.tax_amount = total_tax

        # Calculate effective tax rate for display
        # Use weighted average if there are taxable items, otherwise use global default
        if total_taxable_amount > 0:
            breakdown.tax_rate = (weighted_tax_rate_sum / total_taxable_amount).quantize(Decimal('0.01'))
        else:
            # All items are tax-inclusive, use global default for display
            breakdown.tax_rate = get_default_tax_rate()

        # Recalculate total
        breakdown.total_amount = (
            breakdown.subtotal
            - breakdown.discount_amount
            - breakdown.vip_discount_amount
            + breakdown.service_charge_amount
            + breakdown.tax_amount
        )

        logger.info(f"Per-item tax calculated: ₱{breakdown.tax_amount} (effective rate: {breakdown.tax_rate}%)")

    @staticmethod
    def calculate_pricing_breakdown(pricing_line_items: List[PricingLineItem]) -> PricingBreakdown:
        """Calculate pricing breakdown from PricingLineItem objects"""
        subtotal = sum((item.line_total for item in pricing_line_items), Decimal('0.00'))
        tax_amount = sum((item.line_total * (item.tax_rate / 100) for item in pricing_line_items), Decimal('0.00'))
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