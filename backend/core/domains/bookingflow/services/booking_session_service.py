# backend/core/domains/bookingflow/services/booking_session_service.py
"""Facade for booking session operations.

Delegates to focused submodules while preserving the original
BookingSessionService class interface for all external callers.

Submodules:
    - session_lifecycle_service: CRUD, metadata extraction
    - step_validation_service: Step data validation, availability checks
    - booking_completion_service: complete_booking orchestration
    - event_creation_service: Event creation from session data
    - quote_creation_service: Quote and line item creation
    - payment_processing_service: Payment intent, tax, invoice
    - booking_notifications_service: Confirmation emails, admin alerts
"""

from .booking_completion_service import (
    apply_marketing_consent,
    complete_booking,
    extract_payment_data,
)
from .booking_notifications_service import (
    send_admin_new_lead_notification,
    send_booking_confirmation,
    send_quote_request_acknowledgment,
)
from .event_creation_service import (
    create_event_from_session,
    extract_event_products,
    extract_venue_id_from_booking_data,
    get_event_duration_from_booking_data,
)
from .payment_processing_service import (
    get_tax_rate_for_product,
    process_booking_payment,
    process_booking_payment_for_invoice,
)
from .quote_creation_service import (
    add_line_items_to_quote,
    create_quote_from_booking_session,
)
from .session_lifecycle_service import (
    abandon_session,
    create_session,
    extract_booking_metadata,
    get_session_by_id,
    sanitize_for_json,
    update_session_data,
)
from .step_validation_service import check_availability, validate_step_data


class BookingSessionService:
    """Service for managing booking sessions with payment processing.

    This is a thin facade that delegates to focused submodules.
    All methods are preserved as static methods for backward compatibility.
    """

    # Session lifecycle
    create_session = staticmethod(create_session)
    get_session_by_id = staticmethod(get_session_by_id)
    update_session_data = staticmethod(update_session_data)
    abandon_session = staticmethod(abandon_session)

    # Booking completion
    complete_booking = staticmethod(complete_booking)

    # Validation
    _validate_step_data = staticmethod(validate_step_data)
    check_availability = staticmethod(check_availability)

    # Event creation
    _create_event_from_session = staticmethod(create_event_from_session)
    _extract_event_products = staticmethod(extract_event_products)
    _extract_venue_id_from_booking_data = staticmethod(extract_venue_id_from_booking_data)
    _get_event_duration_from_booking_data = staticmethod(get_event_duration_from_booking_data)

    # Quote creation
    create_quote_from_booking_session = staticmethod(create_quote_from_booking_session)
    _add_line_items_to_quote = staticmethod(add_line_items_to_quote)

    # Payment processing
    _process_booking_payment = staticmethod(process_booking_payment)
    _process_booking_payment_for_invoice = staticmethod(process_booking_payment_for_invoice)
    _get_tax_rate_for_product = staticmethod(get_tax_rate_for_product)

    # Notifications
    _send_quote_request_acknowledgment = staticmethod(send_quote_request_acknowledgment)
    _send_admin_new_lead_notification = staticmethod(send_admin_new_lead_notification)
    _send_booking_confirmation = staticmethod(send_booking_confirmation)

    # Metadata
    _extract_booking_metadata = staticmethod(extract_booking_metadata)
    _extract_payment_data = staticmethod(extract_payment_data)
    _apply_marketing_consent = staticmethod(apply_marketing_consent)


# Module-level exports for direct imports
__all__ = [
    "BookingSessionService",
    "sanitize_for_json",
    "create_session",
    "get_session_by_id",
    "update_session_data",
    "abandon_session",
    "complete_booking",
    "validate_step_data",
    "create_event_from_session",
    "create_quote_from_booking_session",
    "process_booking_payment",
    "extract_booking_metadata",
]
