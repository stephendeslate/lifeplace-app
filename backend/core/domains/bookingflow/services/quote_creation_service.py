"""Quote creation operations for booking flow.

Handles creating quotes from booking session data using the centralized
pricing service, including line item generation and quote activity recording.
"""
import logging
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from core.domains.sales.models import EventQuote, QuoteLineItem

logger = logging.getLogger(__name__)


def create_quote_from_booking_session(session, event, completion_type="payment"):
    """Create a quote from booking session data using centralized pricing service

    Args:
        session: BookingSession instance
        event: Event instance
        completion_type: 'payment' for auto-accepted quotes, 'quote' for pending quotes

    Returns:
        EventQuote: The created quote
    """
    from .event_creation_service import get_event_duration_from_booking_data
    from .session_lifecycle_service import extract_booking_metadata

    logger.info(f"Creating quote from booking session {session.session_id} for event {event.id}")

    # DEBUG: Log booking data structure
    booking_data_keys = list(session.booking_data.keys()) if session.booking_data else []
    has_packages = "selected_packages" in session.booking_data if session.booking_data else False
    packages_count = len(session.booking_data.get("selected_packages", [])) if session.booking_data else 0
    has_addons = "selected_addons" in session.booking_data if session.booking_data else False
    addons_count = len(session.booking_data.get("selected_addons", [])) if session.booking_data else 0
    logger.info(f"DEBUG booking_data keys: {booking_data_keys}")
    logger.info(f"DEBUG has_packages: {has_packages}, count: {packages_count}")
    logger.info(f"DEBUG has_addons: {has_addons}, count: {addons_count}")
    if has_packages:
        logger.info(f"DEBUG selected_packages: {session.booking_data.get('selected_packages')}")

    # IDEMPOTENCY CHECK: Check if quote exists and has line items
    existing_quote = EventQuote.objects.filter(event=event, version=1).first()
    if existing_quote:
        existing_line_items_count = existing_quote.line_items.count()
        if existing_line_items_count > 0:
            logger.warning(
                f"🔧 QUOTE_DUPLICATE_PREVENTED: Quote already exists for event {event.id} "
                f"(quote_id={existing_quote.id}, status={existing_quote.status}, "
                f"line_items={existing_line_items_count}). Returning existing quote."
            )
            return existing_quote
        else:
            logger.info(
                f"🔧 QUOTE_EMPTY_DETECTED: Quote {existing_quote.id} exists but has no line items. "
                f"Will populate with booking session line items."
            )

    # Use centralized pricing service for consistent calculations
    from core.domains.sales.pricing_service import PricingCalculationService

    get_event_duration_from_booking_data(session.booking_data)

    event_type_id = None
    if session.booking_flow and session.booking_flow.event_type:
        event_type_id = session.booking_flow.event_type_id

    pricing_breakdown = PricingCalculationService.calculate_from_booking_data(
        booking_data=session.booking_data, client=session.client, event_type_id=event_type_id
    )

    logger.info(f"Centralized pricing calculated: ₱{pricing_breakdown.total_amount}")

    metadata = extract_booking_metadata(session)

    # Determine quote status based on completion type
    if completion_type == "quote":
        quote_status = "DRAFT"
        accepted_at = None

        notes = f"Quote Request from {session.client.get_full_name()}\n"
        notes += f"Booking Session: {session.session_id}\n\n"
        notes += f"CLIENT MESSAGE:\n{metadata['combined_message']}\n\n" if metadata["combined_message"] else ""
        notes += "Status: Awaiting admin review and customization"

        client_message = metadata["combined_message"][:500] if metadata["combined_message"] else ""

    else:
        quote_status = "ACCEPTED"
        accepted_at = timezone.now()

        notes = f"Auto-accepted quote from booking session {session.session_id}"
        client_message = ""

    logger.info(f"Creating quote with status '{quote_status}' for completion_type '{completion_type}'")

    # Calculate valid_until bounded by event date
    default_valid_until = timezone.now().date() + timedelta(days=30)
    event_date = event.start_date.date() if hasattr(event.start_date, "date") else event.start_date
    max_valid_until = event_date - timedelta(days=1)
    quote_valid_until = min(default_valid_until, max_valid_until)

    # Either use existing empty quote or create new one
    if existing_quote and existing_quote.line_items.count() == 0:
        quote = existing_quote
        quote.status = quote_status
        quote.discount_amount = pricing_breakdown.discount_amount
        quote.vip_discount_amount = pricing_breakdown.vip_discount_amount
        quote.applied_vip_benefits = pricing_breakdown.applied_vip_benefits or []
        quote.valid_until = quote_valid_until
        quote.accepted_at = accepted_at
        quote.created_by = session.client
        quote.notes = notes
        quote.client_message = client_message
        quote.discount = pricing_breakdown.applied_discount
        quote.save()
        logger.info(f"Updated existing empty quote {quote.id} with booking session data")
    else:
        quote = EventQuote.objects.create(
            event=event,
            version=1,
            status=quote_status,
            subtotal=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            discount_amount=pricing_breakdown.discount_amount,
            vip_discount_amount=pricing_breakdown.vip_discount_amount,
            applied_vip_benefits=pricing_breakdown.applied_vip_benefits or [],
            total_amount=Decimal("0.00"),
            valid_until=quote_valid_until,
            accepted_at=accepted_at,
            created_by=session.client,
            notes=notes,
            client_message=client_message,
            discount=pricing_breakdown.applied_discount,
        )
        logger.info(f"Created quote {quote.id} with status {quote.status}")

    # Create line items from pricing breakdown
    _create_quote_line_items_from_pricing_breakdown(quote, pricing_breakdown, session)

    # Assign totals from centralized pricing service
    quote.subtotal = pricing_breakdown.subtotal
    quote.tax_amount = pricing_breakdown.tax_amount
    quote.total_amount = pricing_breakdown.total_amount
    quote.save(
        update_fields=["subtotal", "tax_amount", "total_amount", "vip_discount_amount", "applied_vip_benefits"]
    )

    logger.info(
        f"Quote {quote.id} final total from pricing breakdown: ₱{quote.total_amount} (subtotal: ₱{quote.subtotal}, tax: ₱{quote.tax_amount})"
    )

    # Record quote activity
    from core.domains.sales.models import QuoteActivity

    if quote.status == "SENT":
        activity_action = "SENT"
        activity_notes = f"Quote sent to client for review from booking session {session.session_id}"
    else:
        activity_action = "ACCEPTED"
        activity_notes = f"Quote auto-accepted from booking completion {session.session_id}"

    QuoteActivity.objects.create(
        quote=quote, action=activity_action, action_by=session.client, notes=activity_notes
    )
    logger.info(f"Quote activity '{activity_action}' recorded for quote {quote.id}")

    return quote


def _create_quote_line_items_from_pricing_breakdown(quote, pricing_breakdown, session):
    """Create quote line items from centralized pricing breakdown

    Args:
        quote: EventQuote instance
        pricing_breakdown: PricingBreakdown from PricingCalculationService
        session: BookingSession instance (for reference notes)
    """

    logger.info(f"Creating {len(pricing_breakdown.line_items)} line items from pricing breakdown")

    for pricing_item in pricing_breakdown.line_items:
        product_id = pricing_item.product_id
        if product_id == -1:
            product_id = None

        line_item_metadata = None
        attendee_breakdown = getattr(pricing_item, "attendee_breakdown", None)
        if attendee_breakdown:
            line_item_metadata = {"attendee_breakdown": attendee_breakdown}

        QuoteLineItem.objects.create(
            quote=quote,
            description=pricing_item.description,
            quantity=pricing_item.quantity,
            unit_price=pricing_item.total_unit_price,
            tax_rate=pricing_item.tax_rate,
            total=pricing_item.line_total,
            product_id=product_id,
            notes=f"Generated from booking session {session.session_id}",
            item_type=getattr(pricing_item, "item_type", "PACKAGE"),
            base_unit_price=getattr(pricing_item, "base_unit_price", None),
            excess_hours=getattr(pricing_item, "excess_hours", None),
            excess_hour_price=getattr(pricing_item, "excess_hour_price", None),
            excess_cost=getattr(pricing_item, "excess_cost", Decimal("0.00")),
            metadata=line_item_metadata,
        )

        logger.info(
            f"Created line item: {pricing_item.name} "
            f"x{pricing_item.quantity} @ ₱{pricing_item.total_unit_price} = ₱{pricing_item.line_total}"
        )

    logger.info(f"Completed creating line items for quote {quote.id}")


def add_line_items_to_quote(quote, session):
    """Add line items to quote from session booking data (legacy method)"""
    from .payment_processing_service import get_tax_rate_for_product

    from core.domains.products.models import ProductOption

    for _step_key, step_data in session.booking_data.items():
        if isinstance(step_data, dict):
            if "selected_packages" in step_data:
                packages = step_data["selected_packages"]
                if isinstance(packages, list):
                    for package_id in packages:
                        try:
                            package = ProductOption.objects.get(id=package_id)
                            tax_rate = get_tax_rate_for_product(package)
                            QuoteLineItem.objects.create(
                                quote=quote,
                                product=package,
                                quantity=1,
                                unit_price=package.base_price,
                                total=package.base_price,
                                description=f"Package: {package.name}",
                                tax_rate=tax_rate,
                                item_type="PACKAGE",
                                base_unit_price=package.base_price,
                            )
                        except ProductOption.DoesNotExist:
                            continue

            if "selected_addons" in step_data:
                addons = step_data["selected_addons"]
                if isinstance(addons, list):
                    for addon_id in addons:
                        try:
                            addon = ProductOption.objects.get(id=addon_id)
                            tax_rate = get_tax_rate_for_product(addon)
                            QuoteLineItem.objects.create(
                                quote=quote,
                                product=addon,
                                quantity=1,
                                unit_price=addon.base_price,
                                total=addon.base_price,
                                description=f"Add-on: {addon.name}",
                                tax_rate=tax_rate,
                                item_type="ADDON",
                                base_unit_price=addon.base_price,
                            )
                        except ProductOption.DoesNotExist:
                            continue
