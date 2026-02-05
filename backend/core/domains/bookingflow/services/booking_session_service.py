# backend/core/domains/bookingflow/services/booking_session_service.py
import logging
import uuid
from datetime import timedelta, datetime, date, time
from django.utils import timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional

from django.db import transaction
from core.domains.events.models import Event, EventProductOption
from core.domains.products.models import ProductOption
from core.domains.sales.models import EventQuote, QuoteLineItem

# FIX: Simplified import approach to avoid potential path issues
from core.domains.payments.services import PaymentService


def sanitize_for_json(data):
    """
    Recursively convert datetime/date/time objects to ISO strings for JSON serialization.
    This prevents "Object of type datetime is not JSON serializable" errors when storing
    data in JSONField.

    Args:
        data: Any data structure (dict, list, datetime, etc.)

    Returns:
        Same structure with datetime objects converted to ISO strings
    """
    if isinstance(data, dict):
        return {k: sanitize_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_for_json(item) for item in data]
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, date):
        return data.isoformat()
    elif isinstance(data, time):
        return data.isoformat()
    else:
        return data
from core.domains.payments.services.gateway_service import PaymentGatewayService
from core.domains.payments.models import PaymentGateway
from core.domains.payments.exceptions import PaymentGatewayException

from ..exceptions import (
    BookingFlowNotActive,
    BookingSessionNotFound,
    BookingSessionExpired,
    StepValidationError,
    EventCreationFailed,
)
from ..models import BookingFlow, BookingSession

logger = logging.getLogger(__name__)


class BookingSessionService:
    """Service for managing booking sessions with payment processing"""
    
    @staticmethod
    def create_session(booking_flow_id, client_id=None, session_data=None):
        """Create a new booking session"""
        try:
            flow = BookingFlow.objects.get(id=booking_flow_id, is_active=True)
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotActive()
        
        # Generate session expiry (24 hours from now)
        expires_at = timezone.now() + timedelta(hours=24)
        
        # Get first step
        first_step = flow.enabled_steps.first()
        
        session = BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=flow,
            client_id=client_id,
            current_step=first_step,
            booking_data=session_data or {},
            expires_at=expires_at,
            ip_address=session_data.get('ip_address') if session_data else None,
            user_agent=session_data.get('user_agent', '') if session_data else '',
            referrer_url=session_data.get('referrer_url', '') if session_data else '',
        )
        
        logger.info(f"Created booking session: {session.session_id}")
        return session
    
    @staticmethod
    def get_session_by_id(session_id):
        """Get a booking session by ID (UUID)"""
        try:
            # Support both UUID and string session IDs
            if isinstance(session_id, str):
                session = BookingSession.objects.select_related(
                    'booking_flow', 
                    'client', 
                    'current_step',
                    # Add related step configurations
                    'current_step__package_config',
                    'current_step__addon_config',
                    'current_step__pricing_config',
                    'current_step__contact_config',
                    'current_step__payment_config',
                    'current_step__confirmation_config',
                    'current_step__introduction_config',
                    'current_step__datetime_config',
                    'current_step__questionnaire_config',
                ).prefetch_related(
                    # Prefetch ManyToMany relationships for package config
                    'current_step__package_config__available_categories',
                    'current_step__package_config__available_packages',
                    # Prefetch ManyToMany relationships for addon config
                    'current_step__addon_config__available_categories',
                    'current_step__addon_config__available_addons',
                    # Prefetch questionnaire items if needed
                    'current_step__questionnaire_config__questionnaire_items__questionnaire',
                ).get(session_id=session_id)
            else:
                # Assume it's a numeric ID (for backward compatibility)
                session = BookingSession.objects.select_related(
                    'booking_flow', 
                    'client', 
                    'current_step',
                    # Add related step configurations
                    'current_step__package_config',
                    'current_step__addon_config',
                    'current_step__pricing_config',
                    'current_step__contact_config',
                    'current_step__payment_config',
                    'current_step__confirmation_config',
                    'current_step__introduction_config',
                    'current_step__datetime_config',
                    'current_step__questionnaire_config',
                ).prefetch_related(
                    # Prefetch ManyToMany relationships for package config
                    'current_step__package_config__available_categories',
                    'current_step__package_config__available_packages',
                    # Prefetch ManyToMany relationships for addon config
                    'current_step__addon_config__available_categories',
                    'current_step__addon_config__available_addons',
                    # Prefetch questionnaire items if needed
                    'current_step__questionnaire_config__questionnaire_items__questionnaire',
                ).get(id=session_id)
            
            # Check if session is expired
            if session.is_expired():
                raise BookingSessionExpired()
            
            return session
        except BookingSession.DoesNotExist:
            raise BookingSessionNotFound()
    
    @staticmethod
    def update_session_data(session_id, step_data, mark_completed=False):
        """Update booking session data for a step"""
        session = BookingSessionService.get_session_by_id(session_id)

        # ENHANCED SAFEGUARD: Prevent updating completed sessions
        if session.is_completed:
            logger.warning(f"🔥 UPDATE_BLOCKED: Attempt to update already completed session {session_id}")
            return session

        # Validate step data against current step
        if session.current_step:
            validation_errors = BookingSessionService._validate_step_data(
                session.current_step, step_data, session
            )
            if validation_errors:
                # Store validation errors but don't raise exception
                session.validation_errors = validation_errors
                session.save()
                # Still return the session with errors
                return session
        
        with transaction.atomic():
            # Update booking data
            current_step_key = f"step_{session.current_step.id}" if session.current_step else "general"
            
            # CRITICAL FIX: Handle packages and addons at root level ONLY to avoid duplication
            # This ensures a single source of truth for pricing calculations
            if 'selected_packages' in step_data:
                # Store at root level only (sanitize to prevent JSON serialization errors)
                session.booking_data['selected_packages'] = sanitize_for_json(step_data['selected_packages'])
                # Remove from step_data to prevent duplication
                step_data_copy = step_data.copy()
                step_data_copy.pop('selected_packages', None)
                step_data = step_data_copy

            if 'selected_addons' in step_data:
                # Store at root level only (sanitize to prevent JSON serialization errors)
                session.booking_data['selected_addons'] = sanitize_for_json(step_data['selected_addons'])
                # Remove from step_data to prevent duplication
                step_data_copy = step_data.copy()
                step_data_copy.pop('selected_addons', None)
                step_data = step_data_copy

            # Handle venue_additional_hours at root level for pricing calculations
            # Format: {"venue_id": additional_hours, ...} e.g., {"1": 2, "3": 1}
            if 'venue_additional_hours' in step_data:
                # Store at root level only (sanitize to prevent JSON serialization errors)
                session.booking_data['venue_additional_hours'] = sanitize_for_json(step_data['venue_additional_hours'])
                # Remove from step_data to prevent duplication
                step_data_copy = step_data.copy()
                step_data_copy.pop('venue_additional_hours', None)
                step_data = step_data_copy

            # Merge remaining step data (excluding packages/addons which are now at root level)
            if current_step_key not in session.booking_data:
                session.booking_data[current_step_key] = {}

            # Sanitize step_data to convert datetime objects to ISO strings before storing in JSONField
            sanitized_step_data = sanitize_for_json(step_data)
            session.booking_data[current_step_key].update(sanitized_step_data)
            
            # Clear any previous validation errors
            session.validation_errors = {}
            
            # Handle step progression
            if mark_completed and session.booking_flow:
                # Add current step to completed steps
                if session.current_step and session.current_step not in session.completed_steps.all():
                    session.completed_steps.add(session.current_step)

                # Check if this is a contact_info step - create/associate client user
                if (session.current_step and
                    session.current_step.step_type == 'contact_info' and
                    'email' in step_data and step_data['email']):
                    try:
                        from core.domains.users.services import UserService
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        
                        # Check if user already exists
                        existing_user = User.objects.filter(
                            email=step_data['email'],
                            role='CLIENT'
                        ).first()

                        if existing_user:
                            # Use existing client user
                            user = existing_user
                            session.client = user
                            logger.info(f"Associated existing client user: {user.email} (id: {user.id})")

                            # Log warning if guest tried to create account with existing email
                            if step_data.get('create_account'):
                                logger.warning(
                                    f"⚠️ Guest attempted to create account with existing email: {user.email}. "
                                    f"Using existing account instead. Password NOT updated for security."
                                )
                        else:
                            # Parse full_name into first_name and last_name
                            # Also support direct first_name/last_name fields as fallback
                            full_name = step_data.get('full_name', '').strip()
                            if full_name:
                                name_parts = full_name.split(' ', 1)
                                first_name = name_parts[0]
                                last_name = name_parts[1] if len(name_parts) > 1 else ''
                            else:
                                # Fallback: use separate first_name/last_name if provided
                                first_name = step_data.get('first_name', '').strip()
                                last_name = step_data.get('last_name', '').strip()

                            # Build base user data
                            user_data = {
                                'email': step_data['email'],
                                'first_name': first_name,
                                'last_name': last_name,
                                'role': 'CLIENT',
                                'is_active': True,
                            }

                            # CRITICAL FIX: Add password if account creation requested
                            create_account = step_data.get('create_account', False)
                            password = step_data.get('password', '')

                            if create_account and password:
                                user_data['password'] = password
                                logger.info(f"Creating CLIENT account WITH password for: {user_data['email']}")
                            else:
                                # No password provided - UserService will set unusable password
                                logger.info(f"Creating CLIENT user WITHOUT password (guest booking) for: {user_data['email']}")

                            # Add profile data if provided
                            profile_data = {}
                            if step_data.get('phone'):
                                profile_data['phone'] = step_data['phone']
                            if step_data.get('address'):
                                profile_data['address'] = step_data['address']
                            if step_data.get('company'):
                                profile_data['company'] = step_data['company']

                            if profile_data:
                                user_data['profile'] = profile_data

                            # Create user
                            user = UserService.create_user(user_data)

                            # Update session with new user
                            session.client = user
                            logger.info(f"✅ Successfully created client user: {user.email} (id: {user.id}, has_password: {create_account and bool(password)})")

                            # Send welcome email for newly created accounts with passwords
                            if create_account and password:
                                try:
                                    from core.domains.communications.services import CommunicationService
                                    from core.domains.communications.context_service import (
                                        CommunicationContextService, ContextType
                                    )

                                    # Initialize communication service
                                    comm_service = CommunicationService()

                                    # Generate context using the unified context service
                                    template_data = CommunicationContextService.generate_context(
                                        context_type=ContextType.CLIENT,
                                        client=user,
                                    )
                                    # Add booking-specific flag
                                    template_data['booking_in_progress'] = True

                                    # Send welcome email using existing template
                                    comm_service.send_communication(
                                        template_name='Welcome Email',
                                        recipient=user.email,
                                        context_data=template_data,
                                        client=user,
                                        sent_by=None,  # System-generated
                                        use_async=True  # ASYNC: Queue email for background processing
                                    )

                                    logger.info(f"✅ Sent welcome email to new client account: {user.email}")

                                except Exception as email_error:
                                    # Log warning but don't fail booking if email fails
                                    logger.warning(f"⚠️ Failed to send welcome email to {user.email}: {email_error}")
                                    # Don't raise - email failure shouldn't block booking
                        
                    except Exception as e:
                        logger.error(f"Failed to create/associate client user for session {session.session_id}: {str(e)}")
                
                # ENHANCED SAFEGUARD: Check if this is a confirmation step with create_event_immediately=True
                if (session.current_step and
                    session.current_step.step_type == 'confirmation' and
                    hasattr(session.current_step, 'confirmation_config') and
                    session.current_step.confirmation_config and
                    session.current_step.confirmation_config.create_event_immediately):

                    logger.info(f"🔥 IMMEDIATE_CREATION triggered for session {session.session_id}")

                    # CRITICAL SAFEGUARD: Check if session is already completed before creating event
                    if session.is_completed or session.created_event:
                        logger.warning(f"🔥 IMMEDIATE_CREATION BLOCKED: Session {session.session_id} already completed (is_completed={session.is_completed}, created_event={session.created_event})")
                    else:
                        try:
                            # Ensure we have a client before creating event
                            if not session.client:
                                raise Exception("No client associated with session")

                            # Create event immediately with completion safeguard
                            logger.info(f"🔥 IMMEDIATE_CREATION proceeding for session {session.session_id}")

                            # Extract completion_type from session data
                            completion_type = 'payment'  # Default
                            for step_data in session.booking_data.values():
                                if isinstance(step_data, dict) and 'completion_type' in step_data:
                                    completion_type = step_data['completion_type']
                                    break

                            event = BookingSessionService._create_event_from_session(session, completion_type)

                            # CRITICAL FIX: Link the event to session immediately within transaction
                            session.created_event = event

                            # IMPORTANT: Mark session as completed to prevent duplicate completion
                            session.is_completed = True
                            session.completed_at = timezone.now()

                            # CRITICAL FIX: Save the session with the linked event immediately
                            session.save(update_fields=['created_event', 'is_completed', 'completed_at'])

                            logger.info(f"🔥 IMMEDIATE_CREATION completed for session {session.session_id}, event {event.id}, linked properly")
                        except Exception as e:
                            logger.error(f"Failed to create event immediately for session {session.session_id}: {str(e)}")
                
                # Pass booking_data to check display conditions
                next_step = session.booking_flow.get_next_step(
                    session.current_step.id,
                    session.booking_data
                )
                
                if next_step:
                    session.current_step = next_step
                else:
                    # No more steps - booking flow is complete
                    # ENHANCED SAFEGUARD: Double-check completion status before marking complete
                    if not session.is_completed:
                        session.is_completed = True
                        session.completed_at = timezone.now()
                        logger.info(f"🔥 FLOW_COMPLETION: No more steps - marking session {session.session_id} as completed")
                    else:
                        logger.warning(f"🔥 FLOW_COMPLETION: Session {session.session_id} already marked completed")
            
            session.save()
            
            # Log changes
            logger.info(f"Session updated: step_data for {current_step_key}")
            
        # CRITICAL: Re-fetch the session with proper prefetching to avoid ManyRelatedManager issues
        return BookingSessionService.get_session_by_id(session_id)
    
    
    @staticmethod
    def complete_booking(session_id, completion_type='payment', reservation_token=None):
        """Complete the booking and create event with payment processing or quote generation

        Args:
            session_id: The booking session ID
            completion_type: 'payment' for immediate payment, 'quote' for quote request
            reservation_token: Optional reservation token from pre-payment availability validation
        """
        # Log completion request (sanitized - no tokens)
        import time
        completion_attempt_time = time.time()
        logger.info(f"Complete booking: session_id={session_id}, completion_type='{completion_type}', has_token={bool(reservation_token)}")

        # ENHANCED SAFEGUARD: Use atomic transaction with row-level locking to prevent race conditions
        with transaction.atomic():
            try:
                # Get session with SELECT FOR UPDATE to prevent concurrent modifications
                session = BookingSession.objects.select_for_update().get(
                    session_id=session_id if isinstance(session_id, str) else session_id
                )
                logger.info(f"🔥 ACQUIRED LOCK on session {session_id} at {time.time()}")
            except BookingSession.DoesNotExist:
                logger.error(f"🔥 CRITICAL: Session {session_id} not found during completion attempt")
                raise BookingSessionNotFound()

            # ENHANCED DUPLICATE PROTECTION: Check completion status with detailed logging
            if session.is_completed:
                logger.warning(f"🔥 DUPLICATE COMPLETION ATTEMPT BLOCKED: session_id={session_id}, "f"completion_type='{completion_type}', original_completed_at={session.completed_at}, "f"existing_event={session.created_event.id if session.created_event else 'None'}")

                # CRITICAL FIX: Check if event exists but link is missing (repair scenario)
                if not session.created_event:
                    # Try to find orphaned event created from this session
                    potential_event = None
                    completion_result = session.booking_data.get('booking_completion_result', {})

                    # Also check in step data for booking_completion_result
                    if not completion_result:
                        for step_key, step_data in session.booking_data.items():
                            if isinstance(step_data, dict) and 'booking_completion_result' in step_data:
                                completion_result = step_data['booking_completion_result']
                                break

                    if completion_result and 'event' in completion_result:
                        event_id = completion_result['event'].get('id')
                        if event_id:
                            try:
                                from core.domains.events.models import Event
                                potential_event = Event.objects.get(id=event_id)
                                logger.info(f"🔧 LINK REPAIR: Found orphaned event {event_id} for session {session_id}")

                                # Repair the link
                                session.created_event = potential_event
                                session.save(update_fields=['created_event'])
                                logger.info(f"🔧 LINK REPAIR: Successfully linked session {session_id} to event {event_id}")

                                return potential_event
                            except Event.DoesNotExist:
                                logger.warning(f"🔧 LINK REPAIR FAILED: Event {event_id} referenced in session data no longer exists")

                # Log which endpoint/path triggered this duplicate attempt
                import traceback
                stack_trace = traceback.format_stack()
                completion_caller = "unknown"
                for frame in reversed(stack_trace):
                    if "complete_booking_public" in frame:
                        completion_caller = "PUBLIC_ENDPOINT"
                        break
                    elif "complete_booking" in frame and "views" in frame:
                        completion_caller = "AUTHENTICATED_ENDPOINT"
                        break
                    elif "update_session_data" in frame:
                        completion_caller = "UPDATE_ENDPOINT_IMMEDIATE_CREATION"
                        break

                logger.warning(f"🔥 DUPLICATE ATTEMPT SOURCE: {completion_caller}")

                # Return existing event to maintain idempotency
                return session.created_event

            # Log session info (sanitized - no full data)
            logger.debug(f"Session booking data keys: {list(session.booking_data.keys()) if session.booking_data else []}")
        
        # Validate all required steps are completed
        required_steps = session.booking_flow.steps.filter(is_required=True, is_enabled=True)
        completed_step_ids = set(session.completed_steps.values_list('id', flat=True))
        
        for step in required_steps:
            if step.id not in completed_step_ids:
                raise StepValidationError(f"Required step '{step.get_step_type_display()}' is not completed")
        
        # Validate completion type against payment step configuration
        payment_step = session.booking_flow.steps.filter(step_type='payment_info').first()
        if payment_step and hasattr(payment_step, 'payment_config'):
            payment_config = payment_step.payment_config
            if completion_type == 'quote' and not payment_config.allow_quote_request:
                raise StepValidationError("Quote requests are not allowed for this booking flow")
            # FIX: Only require payment data for payment completion, not for quote requests
            if completion_type == 'payment' and payment_config.require_immediate_payment:
                payment_data = BookingSessionService._extract_payment_data(session)
                if not payment_data:
                    raise StepValidationError("Payment is required but no payment data provided")
            # Quote requests don't require payment data - they just need the quote message

        # ENHANCED SAFEGUARD: Final completion status check before event creation
        # This prevents any remaining race conditions
        if session.is_completed or session.created_event:
            logger.warning(f"🔥 FINAL SAFEGUARD TRIGGERED: Session {session_id} already completed "f"during event creation phase (is_completed={session.is_completed}, "f"created_event_id={session.created_event.id if session.created_event else 'None'})")
            return session.created_event

        with transaction.atomic():
            # ENHANCED ATOMIC PROTECTION: Mark session as being completed to prevent concurrent access
            session.is_completed = True
            session.completed_at = timezone.now()

            # Store the reservation token in booking_data for payment signal processing
            if reservation_token:
                session.booking_data['_reservation_token'] = reservation_token
                logger.info(f"🔥 Stored reservation_token in booking_data for later use: {reservation_token}")

            session.save()
            logger.info(f"🔥 COMPLETION_LOCK: Session {session_id} marked as completed at {session.completed_at}")

            try:
                # Create event from booking data, passing completion_type for workflow context
                event = BookingSessionService._create_event_from_session(session, completion_type)

                # NEW QUOTE-FIRST APPROACH: Always create quote first
                logger.info(f"Creating quote from booking session for event {event.id} (current event status: {event.status})")
                quote = BookingSessionService.create_quote_from_booking_session(session, event, completion_type)
                logger.info(f"Quote {quote.id} created with status '{quote.status}' for event {event.id} (event status: {event.status})")

                # FIXED: Only create invoice when appropriate based on completion_type
                # For quote requests, invoice will be created later when quote is accepted (via signal)

                if completion_type == 'quote':
                    logger.info(f"Processing quote completion for session {session.session_id}")
                    # For quote requests, do NOT create invoice yet - it will be created when quote is accepted
                    # Event stays as LEAD status for quote requests
                    logger.info(f"Quote request completed - event {event.id} remains as LEAD, no invoice created yet")

                    # Send quote request acknowledgment email (not the final quote) (async)
                    try:
                        BookingSessionService._send_quote_request_acknowledgment(session, event)
                        logger.info(f"Quote request acknowledgment queued for session {session.session_id}")
                    except Exception as e:
                        logger.warning(f"Failed to queue quote request acknowledgment: {e}")

                    # Notify admin users about the new lead (async)
                    try:
                        BookingSessionService._send_admin_new_lead_notification(session, event)
                    except Exception as e:
                        logger.warning(f"Failed to queue admin new lead notification: {e}")

                elif completion_type == 'payment':
                    logger.info(f"Processing payment completion for session {session.session_id}")

                    # Handle quote acceptance - quote may already be ACCEPTED if created via create_quote_from_booking_session
                    logger.info(f"Processing quote {quote.id} for payment completion (quote status: {quote.status}, event status: {event.status})")

                    if quote.status == 'ACCEPTED':
                        # Quote was auto-accepted during creation - just ensure event fields are set
                        if event.status != 'CONFIRMED':
                            event.status = 'CONFIRMED'
                        if event.accepted_quote != quote:
                            event.accepted_quote = quote
                        event.save()
                        logger.info(f"Quote {quote.id} already accepted - ensured event fields are set (event status: {event.status})")
                    elif quote.status == 'SENT':
                        # Standard flow - accept the quote which sets event status and accepted_quote
                        quote.accept()
                        event.refresh_from_db()
                        logger.info(f"Quote {quote.id} accepted via standard flow - event status: {event.status}")
                    else:
                        # Unexpected status - log warning and try to proceed
                        logger.warning(f"Quote {quote.id} has unexpected status '{quote.status}' - attempting to set event fields")
                        event.status = 'CONFIRMED'
                        event.accepted_quote = quote
                        event.save()

                    # Create invoice from the accepted quote
                    # Pass booking_flow_id so invoice due date uses flow-specific payment terms
                    logger.info(f"Creating invoice from accepted quote {quote.id}")
                    from core.domains.payments.services.invoice_service import InvoiceService
                    invoice = InvoiceService.create_from_quote(quote, booking_flow_id=session.booking_flow_id)
                    logger.info(f"Created invoice {invoice.invoice_id} from quote")

                    # FIX: Synchronize invoice total with correct event pricing
                    if event.total_price and event.total_price > 0:
                        original_total = invoice.total_amount
                        invoice.total_amount = event.total_price
                        invoice.save(update_fields=['total_amount'])
                        logger.info(f"Synchronized invoice total: {invoice.total_amount} (was {original_total}) to match event.total_price")
                    else:
                        logger.warning(f"Event total_price is invalid: {event.total_price}, keeping invoice.total_amount: {invoice.total_amount}")

                    # Handle payment completion - process payment against invoice
                    payment_data = BookingSessionService._extract_payment_data(session)

                    # If no payment data found, create empty dict to trigger fallback to default gateway
                    if payment_data is None:
                        payment_data = {}

                    # Process payment against the invoice
                    payment = BookingSessionService._process_booking_payment_for_invoice(
                        session, event, invoice, payment_data
                    )

                    # Refresh payment from database to get updated status
                    payment.refresh_from_db()
                    logger.info(f"Payment status after processing: {payment.status}")

                    # Check if payment completed or if we have a successful transaction
                    payment_successful = (
                        payment.status == 'COMPLETED' or
                        payment.transactions.filter(status='COMPLETED').exists()
                    )

                    if payment_successful:
                        # Payment successful - update invoice payment status intelligently
                        # This will set status to PAID or PARTIALLY_PAID based on actual payment amount
                        invoice.mark_as_paid()

                        logger.info(f"Invoice {invoice.invoice_id} payment status updated to '{invoice.status}' "
                                   f"(paid: {invoice.paid_amount}, remaining: {invoice.remaining_amount}) "
                                   f"for event {event.id}")

                        # Send booking confirmation email after successful payment (async)
                        try:
                            BookingSessionService._send_booking_confirmation(session, event)
                            logger.info(f"Booking confirmation email queued for session {session.session_id}")
                        except Exception as e:
                            logger.warning(f"Failed to queue booking confirmation email: {e}")
                    else:
                        logger.error(f"Payment processing failed - payment status: {payment.status}")
                        raise EventCreationFailed("Payment processing failed")

                else:
                    # Default case: create invoice and issue it but don't process payment immediately
                    # Pass booking_flow_id so invoice due date uses flow-specific payment terms
                    logger.info(f"Processing default completion type for session {session.session_id}")
                    from core.domains.payments.services.invoice_service import InvoiceService
                    invoice = InvoiceService.create_from_quote(quote, booking_flow_id=session.booking_flow_id)
                    invoice.issue()  # Changes status from DRAFT to ISSUED
                    logger.info(f"Invoice {invoice.invoice_id} created and issued for later payment")

                # FINALIZE: Link the created event to the session
                session.created_event = event
                session.save()

                # Apply marketing consent from booking to user's preferences
                try:
                    metadata = BookingSessionService._extract_booking_metadata(session)
                    marketing_consent = metadata.get('marketing_consent', False)
                    if session.client:
                        BookingSessionService._apply_marketing_consent(session.client, marketing_consent)
                        logger.info(f"Applied marketing consent ({marketing_consent}) for user {session.client.id}")
                except Exception as e:
                    # Don't fail the booking if marketing consent update fails
                    logger.warning(f"Failed to apply marketing consent: {e}")

                # ASYNC: Update analytics in background
                try:
                    from core.domains.analytics.tasks import update_funnel_analytics
                    if hasattr(session.booking_flow, 'conversion_funnel_id') and session.booking_flow.conversion_funnel_id:
                        update_funnel_analytics.delay(
                            funnel_id=session.booking_flow.conversion_funnel_id,
                            date_str=timezone.now().date().isoformat()
                        )
                        logger.info(f"Queued funnel analytics update for session {session.session_id}")
                except ImportError:
                    logger.warning("Analytics tasks not available - skipping async analytics update")
                except Exception as e:
                    logger.warning(f"Failed to queue analytics update: {e}")

                logger.info(f"🔥 COMPLETION_SUCCESS: Completed booking session {session.session_id} with {completion_type}, created event: {event.id}")
                return event

            except Exception as e:
                logger.error(f"🔥 COMPLETION_FAILED: Failed to create event from session {session.session_id}: {str(e)}")
                # Note: No manual rollback needed - the atomic block automatically rolls back
                # all changes (including is_completed=True) when an exception is raised
                raise EventCreationFailed(f"Failed to create event: {str(e)}")
    
    @staticmethod
    def _send_quote_request_acknowledgment(session, event):
        """Send acknowledgment email when client submits a quote request

        This is NOT the final quote email - this is just acknowledging receipt of the request.
        The actual quote email will be sent later when admin reviews and sends the quote.
        """
        from core.domains.communications.services import CommunicationService
        from core.domains.communications.context_service import (
            CommunicationContextService, ContextType
        )

        try:
            # Initialize communication service
            comm_service = CommunicationService()

            # Extract client message from booking session
            metadata = BookingSessionService._extract_booking_metadata(session)

            # Generate context using the centralized context service
            context_data = CommunicationContextService.generate_context(
                context_type=ContextType.EVENT,
                client=session.client,
                event=event,
            )

            # Add custom context specific to this template
            context_data['client_message'] = metadata.get('combined_message', '')

            # Send acknowledgment using "Events - Welcome New Lead" template
            # This template is designed for initial inquiry acknowledgments
            comm_service.send_communication(
                template_name='Events - Welcome New Lead',
                recipient=session.client.email,
                context_data=context_data,
                client=session.client,
                sent_by=None,
                use_async=True,  # ASYNC: Queue email for background processing
                event=event
            )

            logger.info(f"Sent quote request acknowledgment to {session.client.email} for event {event.id}")

        except Exception as e:
            logger.error(f"Failed to send quote request acknowledgment: {e}")
            # Don't raise exception as quote was created successfully

    @staticmethod
    def _send_admin_new_lead_notification(session, event):
        """Send email notification to admin users when a new quote request is submitted.

        This ensures admins are directly notified about new leads via email,
        complementing the in-app notification created by the EVENT_CREATED signal.
        """
        from core.domains.communications.services import CommunicationService
        from core.domains.communications.context_service import (
            CommunicationContextService, ContextType
        )
        from core.domains.users.models import User

        try:
            admin_emails = list(
                User.objects.filter(role='ADMIN', is_active=True)
                .exclude(email='')
                .values_list('email', flat=True)
            )

            if not admin_emails:
                logger.warning("No admin users found to notify about new lead")
                return

            comm_service = CommunicationService()

            # Generate context using the centralized context service
            context_data = CommunicationContextService.generate_context(
                context_type=ContextType.EVENT,
                client=session.client,
                event=event,
            )

            # Add custom context specific to admin notification
            metadata = BookingSessionService._extract_booking_metadata(session)
            context_data['client_message'] = metadata.get('combined_message', '')

            for admin_email in admin_emails:
                try:
                    comm_service.send_communication(
                        template_name='New Lead Admin Notification',
                        recipient=admin_email,
                        context_data=context_data,
                        use_async=True,
                        event=event,
                    )
                except Exception as e:
                    logger.warning(f"Failed to send new lead admin notification to {admin_email}: {e}")

            logger.info(f"Queued new lead admin notifications to {len(admin_emails)} admin(s) for event {event.id}")

        except Exception as e:
            logger.error(f"Failed to send admin new lead notifications: {e}")
            # Don't raise - admin notification failure should not block the booking flow

    @staticmethod
    def _send_booking_confirmation(session, event):
        """Send booking confirmation email after successful payment

        This sends a detailed confirmation email with all booking details including
        event info, packages, addons, pricing, and dates.
        """
        from core.domains.communications.services import CommunicationService
        from core.domains.communications.context_service import (
            CommunicationContextService, ContextType
        )

        try:
            # Check if confirmation email template is configured
            if not session.booking_flow.confirmation_email_template:
                logger.info(
                    f"No confirmation email template configured for booking flow {session.booking_flow.id} "
                    f"('{session.booking_flow.name}'). To enable confirmation emails, assign a template in "
                    f"Django admin: BookingFlow > confirmation_email_template"
                )
                return

            # Instantiate communication service
            comm_service = CommunicationService()

            # Get invoice for financial context
            from core.domains.payments.models import Invoice
            invoice = None
            try:
                invoice = Invoice.objects.filter(event=event).first()
            except Exception as e:
                logger.warning(f"Could not fetch invoice for email context: {e}")

            # Generate context using the unified context service
            context_data = CommunicationContextService.generate_context(
                context_type=ContextType.BOOKING,
                client=session.client,
                event=event,
                booking_session=session,
                invoice=invoice,
            )

            # Add booking-specific extras not covered by context service
            booking_data = session.booking_data
            selected_packages = booking_data.get('selected_packages', [])
            selected_addons = booking_data.get('selected_addons', [])

            context_data['selected_packages'] = selected_packages
            context_data['selected_addons'] = selected_addons
            context_data['services_description'] = ', '.join(
                [pkg.get('name', '') for pkg in selected_packages if isinstance(pkg, dict)]
            ) if selected_packages else ''

            # Send confirmation email
            comm_service.send_communication(
                template_name=session.booking_flow.confirmation_email_template.name,
                recipient=session.client.email,
                context_data=context_data,
                client=session.client,
                sent_by=None,
                use_async=True,  # ASYNC: Queue email for background processing
                event=event
            )

            logger.info(f"Sent booking confirmation email to {session.client.email} for event {event.id}")

        except Exception as e:
            logger.error(f"Failed to send booking confirmation email: {e}")
            # Don't raise exception as booking was created successfully

    @staticmethod
    def abandon_session(session_id, reason=None):
        """Mark a session as abandoned"""
        session = BookingSessionService.get_session_by_id(session_id)
        
        session.is_abandoned = True
        if reason:
            session.booking_data['abandonment_reason'] = reason
        session.save()
        
        logger.info(f"Abandoned booking session: {session.session_id}")
        return session
    
    @staticmethod
    def _extract_booking_metadata(session):
        """DRY: Extract all booking metadata from session in a single place

        Returns a dict with:
            - quote_message: Client message for quote requests
            - special_requests: Additional special requests from review step
            - combined_message: Combined message from both sources
            - payment_type: Payment preference (FULL/DEPOSIT)
            - completion_type: Flow completion type (payment/quote)
            - marketing_consent: User's marketing consent preference (bool)
            - terms_accepted: User's terms acceptance (bool)
        """
        metadata = {
            'quote_message': '',
            'special_requests': '',
            'combined_message': '',
            'payment_type': 'FULL',
            'completion_type': 'payment',
            'marketing_consent': False,
            'terms_accepted': False,
        }

        # FIXED: Iterate through step data to find payment and review step data
        # Session data is stored as step_XX keys, not as step_type keys
        for step_key, step_data in session.booking_data.items():
            if isinstance(step_data, dict):
                # Extract from payment step (contains quote_message, completion_type, payment_type)
                # Payment step data has quote_message and/or completion_type fields
                if 'quote_message' in step_data or 'completion_type' in step_data:
                    if step_data.get('quote_message'):
                        metadata['quote_message'] = step_data.get('quote_message', '').strip()
                    if step_data.get('payment_type'):
                        metadata['payment_type'] = step_data.get('payment_type', 'FULL')
                    if step_data.get('completion_type'):
                        metadata['completion_type'] = step_data.get('completion_type', 'payment')

                # Extract from pricing_summary step (contains special_requests, terms_accepted, marketing_consent)
                if 'special_requests' in step_data or 'terms_accepted' in step_data or 'marketing_consent' in step_data:
                    if step_data.get('special_requests'):
                        metadata['special_requests'] = step_data.get('special_requests', '').strip()
                    if 'terms_accepted' in step_data:
                        metadata['terms_accepted'] = bool(step_data.get('terms_accepted', False))
                    if 'marketing_consent' in step_data:
                        metadata['marketing_consent'] = bool(step_data.get('marketing_consent', False))

        # Combine messages
        messages = []
        if metadata['quote_message']:
            messages.append(metadata['quote_message'])
        if metadata['special_requests']:
            messages.append(f"Additional notes:\n{metadata['special_requests']}")
        metadata['combined_message'] = '\n\n'.join(messages)

        return metadata

    @staticmethod
    def _apply_marketing_consent(user, marketing_consent: bool):
        """Apply marketing consent preference to user's NotificationPreference

        This updates the user's marketing preferences based on their consent during booking.
        Per GDPR/CAN-SPAM requirements, marketing defaults to opt-out (False), and this
        method sets the preference based on explicit user consent.

        Args:
            user: The User instance to update
            marketing_consent: Boolean indicating whether user consented to marketing

        Returns:
            bool: True if preference was updated, False if skipped
        """
        if user is None:
            logger.info("Cannot apply marketing consent: no user provided")
            return False

        try:
            from core.domains.notifications.models import NotificationPreference

            # Get or create notification preference for user
            preference, created = NotificationPreference.objects.get_or_create(user=user)

            # Update marketing preferences based on consent
            # "Latest wins" policy: each booking updates the preference to current selection
            preference.marketing_email = marketing_consent
            preference.marketing_sms = marketing_consent  # Apply to both email and SMS
            preference.save(update_fields=['marketing_email', 'marketing_sms', 'updated_at'])

            if created:
                logger.info(f"Created NotificationPreference for user {user.id} with marketing_consent={marketing_consent}")
            else:
                logger.info(f"Updated NotificationPreference for user {user.id}: marketing_consent={marketing_consent}")

            return True

        except Exception as e:
            logger.warning(f"Failed to apply marketing consent for user {user.id if user else 'None'}: {e}")
            return False

    @staticmethod
    def _extract_payment_data(session):
        """Extract payment data from session booking data"""
        # Look for payment data in any step
        for step_key, step_data in session.booking_data.items():
            if isinstance(step_data, dict):
                # Check if this step has payment-related data
                if any(key in step_data for key in ['gateway_id', 'payment_gateway_id', 'payment_method_token', 'payment_method_id']):
                    return step_data
        return None
    
    @staticmethod
    def _process_booking_payment(session, event, payment_data):
        """Process payment for completed booking"""
        logger.info(f"Starting payment processing for session {session.session_id}")
        # Log only non-sensitive fields
        logger.debug(f"Payment data keys: {list(payment_data.keys()) if payment_data else []}")

        gateway_id = payment_data.get('gateway_id') or payment_data.get('payment_gateway_id')
        logger.debug(f"Gateway ID from payment data: {gateway_id}")

        # If no gateway specified in payment data, use first available active gateway
        if not gateway_id:
            # First check if booking flow has allowed gateways configured
            if session.booking_flow.allowed_payment_gateways.filter(is_active=True).exists():
                gateway_id = session.booking_flow.allowed_payment_gateways.filter(is_active=True).first().id
                logger.info(f"Using first allowed payment gateway from booking flow: {gateway_id}")
            else:
                # Fall back to any active gateway
                first_active = PaymentGateway.objects.filter(is_active=True).first()
                if first_active:
                    gateway_id = first_active.id
                    logger.info(f"Using first active payment gateway: {gateway_id}")
                else:
                    logger.error("No payment gateway specified and no active gateways available")
                    raise ValueError("No payment gateway specified and no active gateways available")

        if not gateway_id:
            raise ValueError("No payment gateway specified")
        
        try:
            gateway = PaymentGateway.objects.get(id=gateway_id, is_active=True)
            logger.info(f"Found payment gateway: {gateway.name} (code: {gateway.code})")
        except PaymentGateway.DoesNotExist:
            logger.error(f"Payment gateway {gateway_id} not found or inactive")
            raise ValueError(f"Payment gateway {gateway_id} not found or inactive")
        
        # Calculate amount to charge based on payment type
        full_amount = session.calculate_total_price()
        payment_type = payment_data.get('payment_type', 'FULL')

        if payment_type == 'DEPOSIT':
            # CONSOLIDATED: Use global PaymentSettings for deposit percentage
            from core.domains.payments.models import PaymentSettings
            payment_settings = PaymentSettings.get_default_settings()

            deposit_percentage = payment_settings.default_deposit_percentage
            amount_to_charge = full_amount * (deposit_percentage / Decimal('100'))

            logger.info(f"Payment type: DEPOSIT - Charging {amount_to_charge} ({deposit_percentage}% of {full_amount}) "
                       f"using global PaymentSettings")
        else:
            amount_to_charge = full_amount
            logger.info(f"Payment type: FULL - Charging full amount {amount_to_charge}")
        
        logger.info(f"Final amount to charge: {amount_to_charge}")
        
        # FIX: Create payment record with proper data structure
        from datetime import timedelta
        
        # Get due date from payment step configuration
        payment_step = session.booking_flow.steps.filter(step_type='payment_info').first()
        payment_config = getattr(payment_step, 'paymentinfo_config', None) if payment_step else None
        
        # Calculate due date from configuration or use default
        if payment_config and hasattr(payment_config, 'balance_due_days'):
            due_days = payment_config.balance_due_days or 30
        else:
            due_days = 30  # Default to 30 days
        
        logger.info(f"Payment due in {due_days} days")
        
        # Create appropriate description based on payment type
        if payment_type == 'DEPOSIT':
            description = f'Deposit payment for booking session {session.session_id}'
        else:
            description = f'Full payment for booking session {session.session_id}'
        
        payment_record_data = {
            'event': event.id,  # Pass ID, not object
            'amount': amount_to_charge,  # Use calculated amount, not full total
            'status': 'PENDING',
            'due_date': timezone.now().date() + timedelta(days=due_days),
            'description': description,
            'is_manual': False,
            'currency': 'PHP',  # Ensure currency is set
        }
        
        logger.debug(f"Creating payment record: amount={payment_record_data.get('amount')}, event_id={payment_record_data.get('event')}")
        
        # Create initial payment record
        try:
            payment = PaymentService.create_payment(payment_record_data, session.client)
            logger.info(f"Payment record created successfully: {payment.id}")
        except Exception as e:
            logger.error(f"Failed to create payment record: {e}")
            raise
        
        # Process payment through appropriate gateway
        gateway_data = {
            'gateway_id': gateway.id,
            'is_test': session.booking_flow.is_test_mode,
        }
        
        # Add gateway-specific data
        if payment_data.get('payment_method_token'):
            gateway_data['payment_method_token'] = payment_data['payment_method_token']
        if payment_data.get('payment_method_id'):
            gateway_data['payment_method_id'] = payment_data['payment_method_id']
        if payment_data.get('billing_address'):
            gateway_data['billing_address'] = payment_data['billing_address']
        
        logger.debug(f"Gateway data for processing: gateway_id={gateway_data.get('gateway_id')}, has_token={bool(gateway_data.get('payment_method_token'))}")
        
        # FIX: Use correct service method
        try:
            logger.info(f"Calling PaymentGatewayService.process_gateway_payment with payment_id={payment.id}, gateway_code={gateway.code}")
            transaction_result = PaymentGatewayService.process_gateway_payment(
                payment.id,
                gateway.code,
                gateway_data,
                session.client
            )
            logger.info(f"Payment gateway processing result: {transaction_result}")
        except Exception as e:
            logger.error(f"Payment gateway processing failed: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            raise
        
        return payment
    
    @staticmethod
    def _process_booking_payment_for_invoice(session, event, invoice, payment_data):
        """Process payment for completed booking against an invoice

        Args:
            session: BookingSession instance
            event: Event instance
            invoice: Invoice instance
            payment_data: Payment data from session

        Returns:
            Payment: The created payment record
        """
        logger.info(f"Starting payment processing for invoice {invoice.invoice_id}")
        logger.info(f"Payment data received: {payment_data}")

        # NOTE: Removed incorrect safety guard that checked session.booking_data for completion_type
        # BUG: When users navigate back/forward in booking flow (e.g., first click "Request Quote",
        # then go back and click "Pay Deposit"), the completion_type stored in step data becomes stale
        # and doesn't represent the current completion attempt. The actual completion_type is passed
        # as a parameter to complete_booking() method and is validated there - that's the source of truth.

        gateway_id = payment_data.get('gateway_id') or payment_data.get('payment_gateway_id')
        logger.info(f"Gateway ID from payment data: {gateway_id}")

        # If no gateway specified in payment data, use first available active gateway
        if not gateway_id:
            # First check if booking flow has allowed gateways configured
            if session.booking_flow.allowed_payment_gateways.filter(is_active=True).exists():
                gateway_id = session.booking_flow.allowed_payment_gateways.filter(is_active=True).first().id
                logger.info(f"Using first allowed payment gateway from booking flow: {gateway_id}")
            else:
                # Fall back to any active gateway
                first_active = PaymentGateway.objects.filter(is_active=True).first()
                if first_active:
                    gateway_id = first_active.id
                    logger.info(f"Using first active payment gateway: {gateway_id}")
                else:
                    logger.error("No payment gateway specified and no active gateways available")
                    raise ValueError("No payment gateway specified and no active gateways available")

        if not gateway_id:
            raise ValueError("No payment gateway specified")
        
        try:
            gateway = PaymentGateway.objects.get(id=gateway_id, is_active=True)
            logger.info(f"Found payment gateway: {gateway.name} (code: {gateway.code})")
        except PaymentGateway.DoesNotExist:
            logger.error(f"Payment gateway {gateway_id} not found or inactive")
            raise ValueError(f"Payment gateway {gateway_id} not found or inactive")
        
        # Calculate amount to charge based on payment type
        # NOTE: invoice.total_amount is now synchronized with event.total_price during invoice creation
        full_amount = invoice.total_amount
        logger.info(f"Payment amount source - invoice.total_amount: {invoice.total_amount} (synchronized with event.total_price: {event.total_price})")

        # Validation: Ensure we have a valid amount
        if not full_amount or full_amount <= 0:
            logger.error(f"Invalid payment amount: invoice.total_amount={invoice.total_amount}, event.total_price={event.total_price}")
            raise ValueError("Invalid payment amount: invoice total amount is zero or missing")

        payment_type = payment_data.get('payment_type', 'FULL')

        if payment_type == 'DEPOSIT':
            # CONSOLIDATED: Use global PaymentSettings for deposit percentage
            from core.domains.payments.models import PaymentSettings
            payment_settings = PaymentSettings.get_default_settings()

            deposit_percentage = payment_settings.default_deposit_percentage
            amount_to_charge = full_amount * (deposit_percentage / Decimal('100'))

            logger.info(f"Payment type: DEPOSIT - Charging {amount_to_charge} ({deposit_percentage}% of {full_amount}) "
                       f"using global PaymentSettings")
        else:
            amount_to_charge = full_amount
            logger.info(f"Payment type: FULL - Charging full amount {amount_to_charge}")
        
        logger.info(f"Final amount to charge: {amount_to_charge}")
        
        # Create payment record linked to invoice
        from datetime import timedelta
        from core.domains.payments.models import Payment
        
        # Get due date from payment step configuration
        payment_step = session.booking_flow.steps.filter(step_type='payment_info').first()
        payment_config = getattr(payment_step, 'payment_config', None) if payment_step else None
        
        # Calculate due date from configuration or use default
        if payment_config and hasattr(payment_config, 'balance_due_days'):
            due_days = payment_config.balance_due_days or 30
        else:
            due_days = 30  # Default to 30 days
        
        logger.info(f"Payment due in {due_days} days")
        
        # Create appropriate description based on payment type
        if payment_type == 'DEPOSIT':
            description = f'Deposit payment for invoice {invoice.invoice_id}'
        else:
            description = f'Full payment for invoice {invoice.invoice_id}'

        # Create payment using PaymentOrchestrator
        from core.domains.payments.services.payment_orchestrator import PaymentOrchestrator, PaymentRequest

        request = PaymentRequest(
            event_id=event.id,
            amount=amount_to_charge,
            currency=invoice.currency or 'PHP',
            due_date=timezone.now().date() + timedelta(days=due_days),
            description=description,
            invoice_id=invoice.id,
            quote_id=invoice.quote.id if invoice.quote else None,
            payment_type=payment_type,
            is_deposit=(payment_type == 'DEPOSIT'),
            created_by='booking_session_service'
        )

        response = PaymentOrchestrator.create_payment(request)
        if not response.success:
            raise ValueError(f"Failed to create payment for booking: {response.message}")

        payment = Payment.objects.get(id=response.payment_id)
        logger.info(f"Created payment record: {payment.payment_number}")
        
        # Process the payment through the gateway
        try:
            # Prepare gateway data with proper payment method resolution
            gateway_data = {
                'amount': float(amount_to_charge),
                'currency': payment.currency,
                'description': description,
                'client_email': session.client.email,
                'client_name': session.client.get_full_name(),
                'invoice_id': invoice.invoice_id,
                'event_id': event.id
            }

            # Handle payment method data properly - distinguish between saved methods and tokens
            if payment_data.get('payment_method_token'):
                # Direct Stripe token provided
                gateway_data['payment_method_token'] = payment_data['payment_method_token']
            elif payment_data.get('payment_method_id'):
                # Check if this is a database ID (numeric string) or Stripe token (starts with pm_)
                payment_method_id = payment_data['payment_method_id']
                if isinstance(payment_method_id, str) and payment_method_id.isdigit():
                    # This is a database ID for saved payment method - pass to gateway service as 'payment_method'
                    gateway_data['payment_method'] = int(payment_method_id)
                    logger.info(f"Using saved payment method database ID: {payment_method_id}")
                elif isinstance(payment_method_id, str) and payment_method_id.startswith('pm_'):
                    # This is a Stripe payment method token - pass as payment_method_id
                    gateway_data['payment_method_id'] = payment_method_id
                    logger.info(f"Using Stripe payment method token: {payment_method_id}")
                else:
                    # Assume it's a database ID if numeric, otherwise treat as token
                    try:
                        db_id = int(payment_method_id)
                        gateway_data['payment_method'] = db_id
                        logger.info(f"Converted payment method to database ID: {db_id}")
                    except (ValueError, TypeError):
                        gateway_data['payment_method_id'] = payment_method_id
                        logger.info(f"Using payment method as token: {payment_method_id}")

            logger.info(f"Gateway data prepared: {gateway_data}")
            
            # Process payment via gateway service
            transaction_result = PaymentGatewayService.process_gateway_payment(
                payment.id,
                gateway.code,
                gateway_data,
                session.client
            )
            logger.info(f"Payment gateway processing result: {transaction_result}")
        except Exception as e:
            logger.error(f"Payment gateway processing failed: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            raise
        
        return payment
    
    
    @staticmethod
    def _get_tax_rate_for_product(product) -> Decimal:
        """
        Get appropriate tax rate for a product.

        Logic:
        - If tax-inclusive, return 0 (tax already in price)
        - Otherwise, use global default TaxRate
        """
        from core.domains.payments.models import TaxRate

        # If tax is already included in price, no additional tax
        if getattr(product, 'is_tax_inclusive', False):
            return Decimal('0')

        # Use global default TaxRate
        default_tax = TaxRate.objects.filter(is_default=True).first()
        return default_tax.rate if default_tax else Decimal('0')

    @staticmethod
    def _add_line_items_to_quote(quote, session):
        """Add line items to quote from session booking data"""
        from core.domains.sales.models import QuoteLineItem
        from core.domains.products.models import ProductOption

        for step_key, step_data in session.booking_data.items():
            if isinstance(step_data, dict):
                # Handle package selections
                if 'selected_packages' in step_data:
                    packages = step_data['selected_packages']
                    if isinstance(packages, list):
                        for package_id in packages:
                            try:
                                package = ProductOption.objects.get(id=package_id)
                                # Get tax_rate using product's tax_rate with global fallback
                                tax_rate = BookingSessionService._get_tax_rate_for_product(package)
                                QuoteLineItem.objects.create(
                                    quote=quote,
                                    product=package,
                                    quantity=1,
                                    unit_price=package.base_price,
                                    total=package.base_price,
                                    description=f'Package: {package.name}',
                                    tax_rate=tax_rate,
                                    item_type='PACKAGE',
                                    base_unit_price=package.base_price
                                )
                            except ProductOption.DoesNotExist:
                                continue

                # Handle addon selections
                if 'selected_addons' in step_data:
                    addons = step_data['selected_addons']
                    if isinstance(addons, list):
                        for addon_id in addons:
                            try:
                                addon = ProductOption.objects.get(id=addon_id)
                                # Get tax_rate using product's tax_rate with global fallback
                                tax_rate = BookingSessionService._get_tax_rate_for_product(addon)
                                QuoteLineItem.objects.create(
                                    quote=quote,
                                    product=addon,
                                    quantity=1,
                                    unit_price=addon.base_price,
                                    total=addon.base_price,
                                    description=f'Add-on: {addon.name}',
                                    tax_rate=tax_rate,
                                    item_type='ADDON',
                                    base_unit_price=addon.base_price
                                )
                            except ProductOption.DoesNotExist:
                                continue
    
    @staticmethod
    def _get_event_duration_from_booking_data(booking_data):
        """Extract event duration from booking data"""
        # Check root level first
        if 'duration' in booking_data:
            return booking_data.get('duration')
        
        # Check in step data
        for step_key, step_data in booking_data.items():
            if isinstance(step_data, dict):
                if 'duration' in step_data:
                    return step_data['duration']
                # Also check for end_time and start_time to calculate duration
                elif 'start_time' in step_data and 'end_time' in step_data:
                    try:
                        from datetime import datetime
                        start_time = datetime.strptime(step_data['start_time'], '%H:%M')
                        end_time = datetime.strptime(step_data['end_time'], '%H:%M')
                        duration_seconds = (end_time - start_time).seconds
                        return int(duration_seconds // 3600)  # Return hours
                    except (ValueError, TypeError):
                        continue
        return None
    
    @staticmethod
    def _create_event_from_session(session, completion_type='payment'):
        """Create an event from booking session data

        Args:
            session: BookingSession instance
            completion_type: 'payment' for immediate payment, 'quote' for quote request
        """
        from core.domains.events.services import EventService

        # IDEMPOTENCY CHECK: If session already has a linked event, return it
        # This handles race conditions where event creation is triggered multiple times
        if session.created_event:
            logger.warning(f"🔧 EVENT_DUPLICATE_PREVENTED: Session {session.session_id} already has event "
                          f"{session.created_event.id}. Returning existing event.")
            return session.created_event

        # Extract event data from session
        booking_data = session.booking_data

        # Build event data with required fields
        event_data = {
            'client': session.client,
            'event_type': session.booking_flow.event_type,
            'status': 'LEAD',
            'completion_type': completion_type,  # Track how event was completed (payment/quote)
            'workflow_template': session.booking_flow.workflow_template,
            'name': 'Booking from Client Portal',  # Default name
            'start_date': timezone.now(),  # Default start date - will be overridden if provided
        }
        
        # Extract basic event info from various steps (only whitelisted fields)
        # CRITICAL FIX: Only extract specific event-related fields to prevent
        # payment or other step data from contaminating event creation
        allowed_event_fields = {
            'event_name': 'name',
            'start_date': 'start_date', 
            'end_date': 'end_date',
            'start_time': 'start_time',
            'end_time': 'end_time', 
            'guest_count': 'guest_count',
            'description': 'description'
        }
        
        for step_key, step_data in booking_data.items():
            if isinstance(step_data, dict):
                # Only extract allowed fields for event creation
                for field_name, event_field in allowed_event_fields.items():
                    if field_name in step_data:
                        if field_name == 'event_name':
                            event_data['name'] = step_data['event_name']
                        elif field_name in ['guest_count', 'description']:
                            event_data[event_field] = step_data[field_name]
                        # Date/time fields will be handled below
                
                # Handle date/time properly - combine date and time if both provided
                if 'start_date' in step_data:
                    start_date = step_data['start_date']
                    start_time = step_data.get('start_time')

                    if start_time:
                        # Combine date and time into datetime
                        if isinstance(start_date, str):
                            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                        if isinstance(start_time, str):
                            start_time = datetime.strptime(start_time, '%H:%M').time()

                        event_data['start_date'] = datetime.combine(start_date, start_time)
                    else:
                        # CRITICAL FIX: Ensure start_date is datetime even without time
                        if isinstance(start_date, str) and start_date.strip():
                            try:
                                # Try multiple date formats
                                for date_format in ['%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%S.%f']:
                                    try:
                                        if 'T' in date_format:
                                            # Full datetime string
                                            event_data['start_date'] = datetime.strptime(start_date, date_format)
                                        else:
                                            # Date only string
                                            parsed_date = datetime.strptime(start_date, date_format).date()
                                            event_data['start_date'] = datetime.combine(parsed_date, datetime.min.time())
                                        break
                                    except ValueError:
                                        continue
                                else:
                                    # No format matched, fallback to current time
                                    logger.warning(f"Start date parsing failed (no format matched): {start_date}, using current time as fallback")
                                    event_data['start_date'] = timezone.now()
                            except Exception as e:
                                # Any other parsing error, use current time
                                logger.warning(f"Start date parsing exception: {e}, using current time as fallback")
                                event_data['start_date'] = timezone.now()
                        elif hasattr(start_date, 'isoformat'):
                            # Already a datetime or date object
                            event_data['start_date'] = start_date
                        else:
                            # Fallback to current time if invalid format or empty string
                            logger.warning(f"Invalid start_date format or empty: {start_date}, using current time as fallback")
                            event_data['start_date'] = timezone.now()
                
                if 'end_date' in step_data:
                    end_date = step_data['end_date']
                    end_time = step_data.get('end_time')

                    if end_time:
                        # Combine date and time into datetime
                        if isinstance(end_date, str):
                            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                        if isinstance(end_time, str):
                            end_time = datetime.strptime(end_time, '%H:%M').time()

                        event_data['end_date'] = datetime.combine(end_date, end_time)
                    else:
                        # CRITICAL FIX: Ensure end_date is datetime even without time
                        if isinstance(end_date, str) and end_date.strip():
                            try:
                                # Try multiple date formats
                                for date_format in ['%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%S.%f']:
                                    try:
                                        if 'T' in date_format:
                                            # Full datetime string
                                            event_data['end_date'] = datetime.strptime(end_date, date_format)
                                        else:
                                            # Date only string - use end of day
                                            parsed_date = datetime.strptime(end_date, date_format).date()
                                            event_data['end_date'] = datetime.combine(parsed_date, datetime.max.time().replace(microsecond=0))
                                        break
                                    except ValueError:
                                        continue
                                # If no format matched, don't set end_date (let it be optional)
                            except Exception:
                                # Any other parsing error, don't set end_date
                                pass
                        elif hasattr(end_date, 'isoformat'):
                            # Already a datetime or date object
                            event_data['end_date'] = end_date
                        # If invalid format or empty string, don't set end_date (optional field)

        # AUTO-GENERATE EVENT NAME: "First Name Last Name Event Type Date"
        # Only generate if event_name was not explicitly provided in booking data
        if event_data.get('name') == 'Booking from Client Portal':
            name_parts = []

            # Get client name (first name + last name)
            if session.client:
                client_name = session.client.get_full_name()
                if client_name:
                    name_parts.append(client_name)

            # Get event type name
            if session.booking_flow and session.booking_flow.event_type:
                event_type_name = session.booking_flow.event_type.name
                if event_type_name:
                    name_parts.append(event_type_name)

            # Get formatted date (e.g., "January 15, 2026")
            start_date = event_data.get('start_date')
            if start_date:
                if hasattr(start_date, 'strftime'):
                    formatted_date = start_date.strftime('%B %d, %Y')
                    name_parts.append(formatted_date)

            # Combine parts into final name
            if name_parts:
                event_data['name'] = ' '.join(name_parts)
                logger.info(f"AUTO_EVENT_NAME: Generated event name: '{event_data['name']}'")

        # Use centralized calculation instead of manual calculation
        # This ensures consistency with BookingSession.calculate_total_price() and includes tax
        total_price = session.calculate_total_price()
        logger.info(f"PREPARE_EVENT_DATA: session.calculate_total_price() returned: ₱{total_price}")

        # Extract event products for junction table creation
        event_products = BookingSessionService._extract_event_products(booking_data)
        logger.info(f"PREPARE_EVENT_DATA: extracted {len(event_products)} event products")

        event_data['total_price'] = total_price
        # NOTE: total_amount_due is now automatically computed from invoices, no manual setting needed
        event_data['event_products'] = event_products
        logger.info(f"PREPARE_EVENT_DATA: setting event_data total_price to ₱{total_price} (total_amount_due computed from invoices)")

        # AUTO-POPULATE SCHEDULED CHECK-IN/CHECKOUT TIMES FROM VENUE RULES
        # Extract venue_id from booking data and calculate times using VenueService
        venue_id = BookingSessionService._extract_venue_id_from_booking_data(booking_data)
        if venue_id:
            try:
                from core.domains.venues.models import Venue
                from core.domains.venues.services import VenueService
                from decimal import Decimal

                venue = Venue.objects.get(id=venue_id)
                event_data['venue'] = venue

                # Get start_date for calculation
                start_date = event_data.get('start_date')
                if start_date:
                    # Ensure start_date is a datetime
                    if isinstance(start_date, str):
                        start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))

                    program_date = start_date.date()
                    program_start_time = start_date.time()

                    # Calculate duration from end_date or use default
                    end_date = event_data.get('end_date')
                    if end_date:
                        if isinstance(end_date, str):
                            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                        duration_hours = (end_date - start_date).total_seconds() / 3600
                    else:
                        duration_hours = 4  # Default 4 hours

                    # Calculate event times using venue service
                    calculated_times = VenueService.calculate_event_times(
                        venue=venue,
                        program_date=program_date,
                        program_start_time=program_start_time,
                        program_hours=Decimal(str(max(1, duration_hours))),
                    )

                    # Set scheduled check-in/checkout times
                    event_data['scheduled_check_in_time'] = calculated_times.ingress_start
                    event_data['scheduled_checkout_time'] = calculated_times.scheduled_checkout

                    logger.info(
                        f"AUTO_SCHEDULED_TIMES: venue={venue.name}, "
                        f"check_in={calculated_times.ingress_start}, "
                        f"checkout={calculated_times.scheduled_checkout}"
                    )

            except Venue.DoesNotExist:
                logger.warning(f"Venue with id={venue_id} not found. Skipping scheduled time calculation.")
            except Exception as e:
                logger.warning(f"Could not calculate venue times: {e}")

        # CRITICAL VALIDATION: Only allow known Event model fields
        # NOTE: 'id' is explicitly excluded since Django auto-generates it
        allowed_event_fields = {
            'client', 'event_type', 'status', 'completion_type', 'name', 'start_date', 'end_date',
            'workflow_template', 'current_stage', 'lead_source', 'last_contacted',
            'total_price', 'event_products', 'payment_status', 'total_amount_due',
            'total_amount_paid', 'preferences', 'guest_count', 'description',
            # Check-in/checkout scheduled times (auto-populated from venue rules)
            'scheduled_check_in_time', 'scheduled_checkout_time', 'venue'
        }
        
        # Filter out any fields that shouldn't be in event creation
        filtered_event_data = {}
        for key, value in event_data.items():
            if key in allowed_event_fields:
                filtered_event_data[key] = value
            else:
                logger.warning(f"Filtering out invalid field '{key}' with value '{value}' from event creation")
        
        event_data = filtered_event_data
        
        
        # Create the event with detailed error logging
        try:
            logger.info(f"About to create event with data keys: {list(event_data.keys())}")
            logger.info(f"Event data contents: {event_data}")
            logger.info(f"Event products data: {event_products}")
            logger.info(f"Total price: {total_price} (type: {type(total_price)})")
            logger.info(f"Full booking data: {booking_data}")
            
            event = EventService.create_event(
                event_data,
                user=session.client,
                booking_flow_id=session.booking_flow.id
            )
            logger.info(f"Successfully created event: {event.id}")
        except Exception as e:
            logger.error(f"Detailed error during event creation: {e}")
            logger.error(f"Error type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

        # DATE BLOCKING: Apply date blocking policy based on booking flow configuration
        try:
            from core.domains.events.services.date_blocking_service import DateBlockingService

            # Check if this event should block the date
            should_block, policy = DateBlockingService.should_block_on_booking_completion(event)
            logger.info(f"Date blocking policy for event {event.id}: {policy} (should_block={should_block})")

            if should_block:
                # IMMEDIATE policy: Block date now (but first check if already blocked)
                if DateBlockingService.is_date_blocked(event.start_date, exclude_event_id=event.id):
                    # Date is already blocked by another event
                    logger.warning(
                        f"Date {event.start_date.date()} is already blocked. "
                        f"Event {event.id} created but date not blocked."
                    )
                    # Don't raise exception - event was created, just won't block the date
                    # This handles race conditions gracefully
                else:
                    DateBlockingService.block_date(event, reason="Immediate blocking on booking completion")
                    logger.info(f"Date blocked immediately for event {event.id}")
            else:
                # ON_DOWNPAYMENT policy: Set deadline but don't block yet
                terms = DateBlockingService.get_effective_payment_terms(event)
                deadline_days = terms.get('downpayment_deadline_days', 7)

                DateBlockingService.set_downpayment_deadline(event, deadline_days)
                logger.info(
                    f"Set downpayment deadline for event {event.id}: "
                    f"{deadline_days} days from now ({event.downpayment_deadline})"
                )

                # Schedule deadline check task (will be handled by Celery)
                try:
                    from core.domains.events.tasks import check_downpayment_deadline
                    check_downpayment_deadline.apply_async(
                        args=[event.id],
                        eta=event.downpayment_deadline
                    )
                    logger.info(f"Scheduled deadline check task for event {event.id}")
                except ImportError:
                    logger.warning("Celery tasks not available - deadline check not scheduled")
                except Exception as task_error:
                    logger.warning(f"Could not schedule deadline task: {task_error}")

        except Exception as blocking_error:
            logger.error(f"Error applying date blocking policy: {blocking_error}")
            # Don't fail event creation due to blocking logic error

        # REBOOK: Handle rebook completion if this is a reboooked event
        try:
            if booking_data.get('is_rebook') and booking_data.get('original_event_id'):
                from core.domains.events.services.rebook_service import EventRebookService
                EventRebookService.complete_rebook(event, booking_data['original_event_id'])
                logger.info(f"Completed rebook for event {event.id} from original {booking_data['original_event_id']}")
        except Exception as rebook_error:
            logger.warning(f"Error completing rebook: {rebook_error}")
            # Don't fail event creation due to rebook linking error

        # ADD: Create a note for the event after it's created
        # This is the proper way to add notes to an event
        try:
            from django.contrib.contenttypes.models import ContentType
            Note = ContentType.objects.get(app_label='notes', model='note').model_class()
            event_content_type = ContentType.objects.get_for_model(event)

            note_text = f"Created from booking session {session.session_id}"
            if session.booking_flow.is_test_mode:
                note_text += " (Test Mode)"

            Note.objects.create(
                content_type=event_content_type,
                object_id=event.id,
                content=note_text,
                created_by=session.client,
                is_client_visible=False,  # Internal system note, not shown to clients
            )

            # Create a separate note for client special requests if provided
            metadata = BookingSessionService._extract_booking_metadata(session)
            special_requests = metadata.get('special_requests', '').strip()

            if special_requests:
                Note.objects.create(
                    content_type=event_content_type,
                    object_id=event.id,
                    title="Client Special Requests",
                    content=special_requests,
                    created_by=session.client,
                    is_client_visible=True,  # Client's own message, visible to them
                )
                logger.info(f"Created special requests note for event {event.id}")

        except Exception as e:
            logger.warning(f"Could not create note for event: {e}")

        try:
            from core.domains.questionnaires.services import QuestionnaireResponseService

            # Extract questionnaire responses from booking data
            # Use a dict to deduplicate by field_id (keeps last occurrence)
            questionnaire_responses_dict = {}

            # Check for questionnaire data in various possible locations
            # 1. Direct questionnaire key
            if 'questionnaire' in session.booking_data:
                questionnaire_data = session.booking_data['questionnaire']
                if isinstance(questionnaire_data, list):
                    for response in questionnaire_data:
                        if isinstance(response, dict) and 'field' in response:
                            questionnaire_responses_dict[response['field']] = response

            # 2. Get all questionnaire step IDs from the booking flow
            questionnaire_step_ids = set(
                session.booking_flow.steps.filter(step_type='questionnaire')
                .values_list('id', flat=True)
            )
            logger.info(f"Found {len(questionnaire_step_ids)} questionnaire steps: {questionnaire_step_ids}")

            # 3. Extract field responses ONLY from questionnaire steps to avoid duplicates
            for step_key, step_data in session.booking_data.items():
                if isinstance(step_data, dict) and step_key.startswith('step_'):
                    # Extract step ID from step_key (format: "step_12")
                    try:
                        step_id = int(step_key.replace('step_', ''))
                    except (ValueError, TypeError):
                        continue

                    # Only process if this is a questionnaire step
                    if step_id not in questionnaire_step_ids:
                        continue

                    logger.info(f"Processing questionnaire step {step_id}")

                    # Check if this step contains responses array
                    if 'responses' in step_data and isinstance(step_data['responses'], list):
                        for response in step_data['responses']:
                            if isinstance(response, dict) and 'field' in response:
                                questionnaire_responses_dict[response['field']] = response

                    # Check for individual field responses (field_<id>: value format)
                    for field_key, value in step_data.items():
                        if field_key.startswith('field_'):
                            field_id = field_key.replace('field_', '')
                            try:
                                field_id_int = int(field_id)
                                # Use dict to automatically deduplicate by field_id
                                questionnaire_responses_dict[field_id_int] = {
                                    'field': field_id_int,
                                    'value': value
                                }
                            except (ValueError, TypeError):
                                logger.warning(f"Invalid field ID in key: {field_key}")
                                continue

            # Convert dict back to list for processing
            questionnaire_responses = list(questionnaire_responses_dict.values())
            logger.info(f"Extracted {len(questionnaire_responses)} unique questionnaire responses")

            # Save the questionnaire responses if any were found
            if questionnaire_responses:
                responses_data = []
                for response in questionnaire_responses:
                    if isinstance(response, dict) and 'field' in response and 'value' in response:
                        responses_data.append({
                            'field': response['field'],
                            'value': str(response['value'])
                        })

                if responses_data:
                    QuestionnaireResponseService.save_event_responses(
                        event.id,
                        responses_data
                    )
                    logger.info(f"Created {len(responses_data)} questionnaire responses for event {event.id}")

                    # Auto-populate num_participants from guest count fields
                    try:
                        from core.domains.questionnaires.models import QuestionnaireField

                        total_guests = 0
                        for response in responses_data:
                            field_id = response.get('field')
                            value = response.get('value')

                            if field_id and value:
                                try:
                                    field = QuestionnaireField.objects.get(id=field_id)
                                    if field.is_guest_count and field.type == 'number':
                                        total_guests += int(value)
                                except (QuestionnaireField.DoesNotExist, ValueError, TypeError):
                                    continue

                        if total_guests > 0:
                            event.num_participants = total_guests
                            event.save(update_fields=['num_participants'])
                            logger.info(f"Set num_participants={total_guests} for event {event.id} from questionnaire")

                            # Also update EventProductOptions
                            for epo in event.event_products.all():
                                epo.num_participants = total_guests
                                epo.save(update_fields=['num_participants'])
                    except Exception as guest_err:
                        logger.warning(f"Could not auto-populate guest count: {guest_err}")

        except Exception as e:
            logger.warning(f"Could not create questionnaire responses for event: {e}")
        
        return event
    
    @staticmethod
    def _validate_step_data(step, step_data, session=None):
        """Validate step data against step configuration
        
        Args:
            step: BookingFlowStep instance
            step_data: Data to validate
            session: BookingSession instance (optional, used for authenticated user validation)
        """
        errors = {}
        
        # Block validation for removed step types
        if step.step_type == 'availability_check':
            errors['step_type'] = (
                "Availability check step type is no longer supported. "
                "Use date_time step with availability checking enabled instead."
            )
            return errors
        
        # Add validation for pricing summary step (now includes review fields)
        if step.step_type == 'pricing_summary':
            # Validate discount code if provided
            if 'applied_discount_code' in step_data and step_data['applied_discount_code']:
                try:
                    from core.domains.products.services import DiscountService
                    discount_code = step_data['applied_discount_code']
                    discount = DiscountService.validate_discount_code(discount_code)
                    if not discount or not discount.is_active:
                        errors['applied_discount_code'] = ["Invalid or expired discount code"]
                except Exception as e:
                    errors['applied_discount_code'] = ["Unable to validate discount code"]

            # Validate terms acceptance (consolidated from review step)
            config = getattr(step, 'pricing_config', None)
            if config:
                show_terms = getattr(config, 'show_terms_checkbox', True)
                require_terms = getattr(config, 'require_terms_acceptance', True)
                if show_terms and require_terms:
                    if not step_data.get('terms_accepted'):
                        errors['terms_accepted'] = ["You must accept the terms and conditions"]
        
        # Common validation for all step types
        if hasattr(step, f"{step.step_type}_config"):
            config = getattr(step, f"{step.step_type}_config")
            
            # Step-specific validation based on configuration
            if step.step_type == 'introduction':
                if step_data.get('acknowledged') is not True:
                    errors['acknowledged'] = ["Acknowledgment is required"]
                    
            elif step.step_type == 'date_time':
                # Basic validation
                start_date_str = step_data.get('start_date')
                if not start_date_str:
                    errors['start_date'] = ["Date selection is required"]

                # Availability validation - check if date conflicts with CONFIRMED events
                if start_date_str and not errors.get('start_date'):
                    try:
                        from datetime import datetime
                        from core.domains.events.services.availability_service import availability_service, AvailabilityRequest

                        # Parse the date
                        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()

                        # Get event type and booking flow info
                        booking_flow_id = session.booking_flow.id if session and session.booking_flow else None
                        event_type_id = session.booking_flow.event_type_id if session and session.booking_flow and session.booking_flow.event_type else None

                        # Create availability request
                        availability_request = AvailabilityRequest(
                            start_date=start_date,
                            event_type_id=event_type_id,
                            booking_flow_id=booking_flow_id,
                            duration_hours=step_data.get('duration', 4),
                            buffer_before_hours=getattr(config, 'buffer_before_hours', 0),
                            buffer_after_hours=getattr(config, 'buffer_after_hours', 0),
                        )

                        # Check availability
                        availability_info = availability_service.check_date_availability(availability_request)

                        # If date is not available for booking, add error
                        if not availability_info.can_book_event:
                            error_message = "This date is not available for booking"
                            if availability_info.reasons:
                                error_message = availability_info.reasons[0]
                            errors['start_date'] = [error_message]

                    except ValueError:
                        errors['start_date'] = ["Invalid date format"]
                    except Exception as e:
                        logger.error(f"Error checking date availability: {e}")
                        # Don't block booking if availability check fails
                        pass

            elif step.step_type == 'venue_selection':
                # Venue selection validation - validate against min_venues and max_venues
                selected_venue_ids = step_data.get('selected_venue_ids', [])

                # Get configuration for venue constraints
                try:
                    venue_config = getattr(step, 'venue_selection_config', None)
                except Exception:
                    venue_config = None

                if venue_config:
                    # If step is skippable, use 0 as effective minimum (allow empty selection)
                    config_min_venues = getattr(venue_config, 'min_venues', 1)
                    min_venues = 0 if step.is_skippable else config_min_venues
                    max_venues = getattr(venue_config, 'max_venues', 10)

                    if len(selected_venue_ids) < min_venues:
                        errors['selected_venue_ids'] = [f"Please select at least {min_venues} venue{'s' if min_venues > 1 else ''}"]
                    elif len(selected_venue_ids) > max_venues:
                        errors['selected_venue_ids'] = [f"You can select up to {max_venues} venue{'s' if max_venues > 1 else ''}"]

                    # Validate selected venues are in available venues (if configured)
                    try:
                        if venue_config.available_venues.exists():
                            available_venue_ids = list(venue_config.available_venues.all().values_list('id', flat=True))
                            invalid_venues = [v_id for v_id in selected_venue_ids if v_id not in available_venue_ids]
                            if invalid_venues:
                                errors['selected_venue_ids'] = errors.get('selected_venue_ids', [])
                                errors['selected_venue_ids'].append(f"Venue(s) {invalid_venues} are not available for selection")
                    except Exception as e:
                        # Log but don't fail validation if venue lookup fails
                        logger.warning(f"Could not validate available venues: {e}")
                # If no configuration exists, skip validation (allow any selection)

            elif step.step_type == 'questionnaire':
                # Questionnaire validation is handled at the field level
                # The frontend sends data as field_<id>: value
                # We don't need to validate at the questionnaire level
                
                # Optional: Add field-level validation if needed
                config = step.questionnaire_config
                if config and hasattr(config, 'questionnaire_items'):
                    questionnaire_items = config.questionnaire_items.all()
                    
                    # Collect all fields from all questionnaires
                    all_fields = []
                    for item in questionnaire_items:
                        questionnaire = item.questionnaire
                        all_fields.extend(questionnaire.fields.all())
                    
                    # Validate individual fields
                    for field in all_fields:
                        field_key = f'field_{field.id}'
                        field_value = step_data.get(field_key)

                        # Only validate if field is required and empty
                        if field.required and not field_value:
                            errors[field_key] = [f"{field.name} is required"]

            elif step.step_type == 'package_selection':
                selected = step_data.get('selected_packages', [])
                if config.min_selection and len(selected) < config.min_selection:
                    errors['selected_packages'] = [f"Select at least {config.min_selection} package(s)"]
                if config.max_selection and len(selected) > config.max_selection:
                    errors['selected_packages'] = [f"Select at most {config.max_selection} package(s)"]

                # Validate selected packages are in available packages (if configured)
                if config.available_packages.exists():
                    available_package_ids = list(config.available_packages.all().values_list('id', flat=True))
                    for package in selected:
                        if 'product_id' in package and package['product_id'] not in available_package_ids:
                            errors['selected_packages'] = errors.get('selected_packages', [])
                            errors['selected_packages'].append(f"Package {package['product_id']} is not available for selection")

            elif step.step_type == 'addon_selection':
                selected = step_data.get('selected_addons', [])
                if config.min_selection and len(selected) < config.min_selection:
                    errors['selected_addons'] = [f"Select at least {config.min_selection} addon(s)"]
                if config.max_selection and len(selected) > config.max_selection:
                    errors['selected_addons'] = [f"Select at most {config.max_selection} addon(s)"]
                
                # FIXED: Validate selected addons are in available addons (if configured)
                if config.available_addons.exists():  # Check if any addons are configured
                    available_addon_ids = list(config.available_addons.all().values_list('id', flat=True))
                    for addon in selected:
                        if 'product_id' in addon and addon['product_id'] not in available_addon_ids:
                            errors['selected_addons'] = errors.get('selected_addons', [])
                            errors['selected_addons'].append(f"Addon {addon['product_id']} is not available for selection")
                            
            elif step.step_type == 'contact_info':
                # Enhanced validation for contact_info that considers authenticated users
                
                # Check if user is authenticated and has required data
                user = session.client if session else None
                is_authenticated = user is not None
                
                # Full name validation
                if config.require_full_name and not step_data.get('full_name'):
                    # For authenticated users, check if we can use their profile data
                    if is_authenticated and user.first_name and user.last_name:
                        # Authenticated user has name in profile - validation passes
                        pass
                    else:
                        errors['full_name'] = ["Full name is required"]
                
                # Email validation - CRITICAL FIX for authenticated users
                if config.require_email and not step_data.get('email'):
                    # For authenticated users, check if we can use their email
                    if is_authenticated and user.email:
                        # Authenticated user email available - validation passes
                        pass
                    else:
                        errors['email'] = ["Email is required"]
                
                # Phone validation
                if config.require_phone and not step_data.get('phone'):
                    # For authenticated users, check profile phone
                    if is_authenticated and hasattr(user, 'profile') and user.profile and getattr(user.profile, 'phone', ''):
                        # Authenticated user has phone in profile - validation passes
                        pass
                    else:
                        errors['phone'] = ["Phone number is required"]
                
                # Address validation (typically not in user profile, so still required)
                if config.require_address and not step_data.get('address'):
                    errors['address'] = ["Address is required"]
                
                # Company validation
                if config.require_company and not step_data.get('company'):
                    # For authenticated users, check profile company
                    if is_authenticated and hasattr(user, 'profile') and user.profile and getattr(user.profile, 'company', ''):
                        # Authenticated user has company in profile - validation passes
                        pass
                    else:
                        errors['company'] = ["Company name is required"]
                    
            elif step.step_type == 'payment_info':
                # Validate payment data
                if not step_data.get('gateway_id'):
                    errors['gateway_id'] = ["Payment gateway selection is required"]
                if config.require_immediate_payment and not step_data.get('payment_method_id'):
                    errors['payment_method_id'] = ["Payment method is required"]
        
        return errors
    
    @staticmethod
    def _check_availability(step_data, config):
        """Check availability for date/time step with enhanced availability features"""
        # This is a placeholder for actual availability checking logic
        # In a real implementation, this would integrate with:
        # - Resource management systems
        # - Staff scheduling systems
        
        start_date = step_data.get('start_date')
        start_time = step_data.get('start_time')
        end_date = step_data.get('end_date')
        end_time = step_data.get('end_time')
        
        if not start_date:
            return {'available': False, 'message': 'Start date is required'}
        
        # Check blocked dates
        from datetime import datetime
        if isinstance(start_date, str):
            check_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        else:
            check_date = start_date
        
        if config.blocked_dates and check_date in config.blocked_dates:
            return {'available': False, 'message': 'Selected date is not available'}
        
        # Check available days of week
        if config.available_days_of_week:
            weekday = check_date.weekday()  # 0=Monday, 6=Sunday
            if weekday not in config.available_days_of_week:
                return {'available': False, 'message': 'Selected day of the week is not available'}
        
        # Check time slots if time is provided
        if start_time and config.available_time_slots:
            # This would check against configured time slots
            # For now, assume availability
            pass
        
        # Check resource availability if enabled
        if config.check_resource_availability:
            # This would integrate with resource management system
            # For now, assume available
            pass
        
        # Check staff availability if enabled
        if config.check_staff_availability:
            # This would integrate with staff scheduling system
            # For now, assume available
            pass
        
        # Check for overbooking limits
        if not config.allow_overbooking:
            # This would check existing bookings for conflicts
            # For now, assume no conflicts
            pass
        
        return {'available': True, 'message': 'Time slot is available'}

    @staticmethod
    def create_quote_from_booking_session(session, event, completion_type='payment'):
        """Create a quote from booking session data using centralized pricing service

        Args:
            session: BookingSession instance
            event: Event instance
            completion_type: 'payment' for auto-accepted quotes, 'quote' for pending quotes

        Returns:
            EventQuote: The created quote
        """
        logger.info(f"Creating quote from booking session {session.session_id} for event {event.id}")

        # DEBUG: Log booking data structure to diagnose empty line items issue
        booking_data_keys = list(session.booking_data.keys()) if session.booking_data else []
        has_packages = 'selected_packages' in session.booking_data if session.booking_data else False
        packages_count = len(session.booking_data.get('selected_packages', [])) if session.booking_data else 0
        has_addons = 'selected_addons' in session.booking_data if session.booking_data else False
        addons_count = len(session.booking_data.get('selected_addons', [])) if session.booking_data else 0
        logger.info(f"DEBUG booking_data keys: {booking_data_keys}")
        logger.info(f"DEBUG has_packages: {has_packages}, count: {packages_count}")
        logger.info(f"DEBUG has_addons: {has_addons}, count: {addons_count}")
        if has_packages:
            logger.info(f"DEBUG selected_packages: {session.booking_data.get('selected_packages')}")

        # IDEMPOTENCY CHECK: Check if quote exists and has line items
        # If quote exists but is empty (created by workflow automation), populate it with booking session line items
        existing_quote = EventQuote.objects.filter(event=event, version=1).first()
        if existing_quote:
            existing_line_items_count = existing_quote.line_items.count()
            if existing_line_items_count > 0:
                logger.warning(f"🔧 QUOTE_DUPLICATE_PREVENTED: Quote already exists for event {event.id} "
                              f"(quote_id={existing_quote.id}, status={existing_quote.status}, "
                              f"line_items={existing_line_items_count}). Returning existing quote.")
                return existing_quote
            else:
                logger.info(f"🔧 QUOTE_EMPTY_DETECTED: Quote {existing_quote.id} exists but has no line items. "
                           f"Will populate with booking session line items.")

        # Use centralized pricing service for consistent calculations
        from core.domains.sales.pricing_service import PricingCalculationService

        # Get event duration for pricing calculations
        event_duration = BookingSessionService._get_event_duration_from_booking_data(session.booking_data)

        # Get event_type_id from booking flow for event-type-specific pricing
        event_type_id = None
        if session.booking_flow and session.booking_flow.event_type:
            event_type_id = session.booking_flow.event_type_id

        # Calculate pricing using centralized service
        pricing_breakdown = PricingCalculationService.calculate_from_booking_data(
            booking_data=session.booking_data,
            event_type_id=event_type_id
        )

        logger.info(f"Centralized pricing calculated: ₱{pricing_breakdown.total_amount}")

        # Extract booking metadata including client message
        metadata = BookingSessionService._extract_booking_metadata(session)

        # Determine quote status based on completion type
        if completion_type == 'quote':
            # Quote requests stay DRAFT until admin reviews and sends
            quote_status = 'DRAFT'
            accepted_at = None

            # Store client message in notes field
            notes = f"Quote Request from {session.client.get_full_name()}\n"
            notes += f"Booking Session: {session.session_id}\n\n"
            notes += f"CLIENT MESSAGE:\n{metadata['combined_message']}\n\n" if metadata['combined_message'] else ""
            notes += f"Status: Awaiting admin review and customization"

            # Also store in client_message field (first 500 chars)
            client_message = metadata['combined_message'][:500] if metadata['combined_message'] else ""

            status_note = "Quote request - awaiting admin review"
        else:
            # Payment completions auto-accept the quote
            quote_status = 'ACCEPTED'
            accepted_at = timezone.now()

            notes = f"Auto-accepted quote from booking session {session.session_id}"
            client_message = ""
            status_note = "Quote auto-accepted from booking completion"

        logger.info(f"Creating quote with status '{quote_status}' for completion_type '{completion_type}'")

        # Calculate valid_until bounded by event date to prevent quotes being valid after the event
        default_valid_until = timezone.now().date() + timedelta(days=30)
        event_date = event.start_date.date() if hasattr(event.start_date, 'date') else event.start_date
        max_valid_until = event_date - timedelta(days=1)  # At least 1 day before event
        quote_valid_until = min(default_valid_until, max_valid_until)

        # Either use existing empty quote or create new one
        if existing_quote and existing_quote.line_items.count() == 0:
            # Populate the existing empty quote with booking session data
            quote = existing_quote
            quote.status = quote_status
            quote.discount_amount = pricing_breakdown.discount_amount
            quote.valid_until = quote_valid_until
            quote.accepted_at = accepted_at
            quote.created_by = session.client
            quote.notes = notes
            quote.client_message = client_message
            quote.discount = pricing_breakdown.applied_discount
            quote.save()
            logger.info(f"Updated existing empty quote {quote.id} with booking session data")
        else:
            # Create new quote with conditional status
            # Initialize with basic values, will be recalculated after line items are added
            quote = EventQuote.objects.create(
                event=event,
                version=1,
                status=quote_status,
                subtotal=Decimal('0.00'),  # Will be recalculated
                tax_amount=Decimal('0.00'),  # Will be recalculated
                discount_amount=pricing_breakdown.discount_amount,
                total_amount=Decimal('0.00'),  # Will be recalculated
                valid_until=quote_valid_until,
                accepted_at=accepted_at,
                created_by=session.client,
                notes=notes,  # Use client message in notes
                client_message=client_message,  # Also store in client_message field
                discount=pricing_breakdown.applied_discount
            )
            logger.info(f"Created quote {quote.id} with status {quote.status}")
        
        # Create line items from pricing breakdown
        BookingSessionService._create_quote_line_items_from_pricing_breakdown(quote, pricing_breakdown, session)

        # DRY APPROACH: Directly assign totals from centralized pricing service
        # This preserves the correct calculations and prevents double taxation
        quote.subtotal = pricing_breakdown.subtotal
        quote.tax_amount = pricing_breakdown.tax_amount
        quote.total_amount = pricing_breakdown.total_amount
        quote.save(update_fields=['subtotal', 'tax_amount', 'total_amount'])

        logger.info(f"Quote {quote.id} final total from pricing breakdown: ₱{quote.total_amount} (subtotal: ₱{quote.subtotal}, tax: ₱{quote.tax_amount})")

        # Record quote activity based on status
        from core.domains.sales.models import QuoteActivity
        if quote.status == 'SENT':
            activity_action = 'SENT'
            activity_notes = f"Quote sent to client for review from booking session {session.session_id}"
        else:
            activity_action = 'ACCEPTED'
            activity_notes = f"Quote auto-accepted from booking completion {session.session_id}"

        QuoteActivity.objects.create(
            quote=quote,
            action=activity_action,
            action_by=session.client,
            notes=activity_notes
        )
        logger.info(f"Quote activity '{activity_action}' recorded for quote {quote.id}")

        return quote
    
    @staticmethod
    def _create_quote_line_items_from_pricing_breakdown(quote, pricing_breakdown, session):
        """Create quote line items from centralized pricing breakdown
        
        Args:
            quote: EventQuote instance
            pricing_breakdown: PricingBreakdown from PricingCalculationService
            session: BookingSession instance (for reference notes)
        """
        from core.domains.sales.models import QuoteLineItem
        
        logger.info(f"Creating {len(pricing_breakdown.line_items)} line items from pricing breakdown")
        
        for pricing_item in pricing_breakdown.line_items:
            # Handle custom bundles (product_id=-1) by setting to None
            # Custom bundles don't have a valid product reference
            product_id = pricing_item.product_id
            if product_id == -1:
                product_id = None

            QuoteLineItem.objects.create(
                quote=quote,
                description=pricing_item.description,
                quantity=pricing_item.quantity,
                unit_price=pricing_item.total_unit_price,  # Already includes excess hours
                tax_rate=pricing_item.tax_rate,
                total=pricing_item.line_total,
                product_id=product_id,
                notes=f"Generated from booking session {session.session_id}",
                # Enhanced pricing fields for DRY compliance
                item_type=getattr(pricing_item, 'item_type', 'PACKAGE'),
                base_unit_price=getattr(pricing_item, 'base_unit_price', None),
                excess_hours=getattr(pricing_item, 'excess_hours', None),
                excess_hour_price=getattr(pricing_item, 'excess_hour_price', None),
                excess_cost=getattr(pricing_item, 'excess_cost', Decimal('0.00'))
            )
            
            logger.info(
                f"Created line item: {pricing_item.name} "
                f"x{pricing_item.quantity} @ ₱{pricing_item.total_unit_price} = ₱{pricing_item.line_total}"
            )
        
        logger.info(f"Completed creating line items for quote {quote.id}")

    @staticmethod
    def _extract_event_products(booking_data: Dict[str, Any]) -> list[Dict[str, Any]]:
        """Extract event products from booking data for EventProductOption creation"""
        from core.domains.sales.pricing_service import PricingCalculationService

        # Use the same extraction logic as the pricing service
        selected_packages = PricingCalculationService._extract_selected_items(booking_data, 'selected_packages')
        selected_addons = PricingCalculationService._extract_selected_items(booking_data, 'selected_addons')

        event_products = []

        # Process packages
        for package_data in selected_packages:
            try:
                product_id = package_data.get('product_id')
                if not product_id:
                    continue  # Skip items without product_id

                event_product = {
                    'product_option_id': product_id,
                    'quantity': int(package_data.get('quantity', 1)),
                    'final_price': Decimal(str(package_data.get('price', 0))),
                    'num_participants': package_data.get('num_participants'),
                    'num_nights': package_data.get('num_nights'),
                    'excess_hours': package_data.get('excess_hours'),
                }
                event_products.append(event_product)
            except (ValueError, TypeError) as e:
                logger.warning(f"Error processing package data: {e}")
                continue

        # Process addons
        for addon_data in selected_addons:
            try:
                product_id = addon_data.get('product_id')
                if not product_id:
                    continue  # Skip items without product_id

                event_product = {
                    'product_option_id': product_id,
                    'quantity': int(addon_data.get('quantity', 1)),
                    'final_price': Decimal(str(addon_data.get('price', 0))),
                    'num_participants': addon_data.get('num_participants'),
                    'num_nights': addon_data.get('num_nights'),
                    'excess_hours': addon_data.get('excess_hours'),
                }
                event_products.append(event_product)
            except (ValueError, TypeError) as e:
                logger.warning(f"Error processing addon data: {e}")
                continue

        return event_products

    @staticmethod
    def _extract_venue_id_from_booking_data(booking_data: Dict[str, Any]) -> Optional[int]:
        """
        Extract venue ID from booking session data.

        Looks in multiple locations where venue might be stored:
        1. package_selection step data
        2. selected_packages with venue_id
        3. venue_additional_hours keys
        4. datetime step data
        """
        # Check package_selection step
        package_selection = booking_data.get('package_selection', {})
        if isinstance(package_selection, dict):
            venue_id = package_selection.get('venue_id')
            if venue_id:
                try:
                    return int(venue_id)
                except (ValueError, TypeError):
                    pass

        # Check selected_packages for venue_id
        selected_packages = booking_data.get('selected_packages', [])
        if isinstance(selected_packages, list) and selected_packages:
            for pkg in selected_packages:
                if isinstance(pkg, dict) and pkg.get('venue_id'):
                    try:
                        return int(pkg['venue_id'])
                    except (ValueError, TypeError):
                        pass

        # Check venue_additional_hours keys (stores venue_id as key)
        venue_hours = booking_data.get('venue_additional_hours', {})
        if isinstance(venue_hours, dict) and venue_hours:
            try:
                # Get first venue_id from the keys
                first_key = next(iter(venue_hours.keys()))
                return int(first_key)
            except (ValueError, TypeError, StopIteration):
                pass

        # Check datetime step data
        datetime_data = booking_data.get('datetime', {})
        if isinstance(datetime_data, dict):
            venue_id = datetime_data.get('venue_id')
            if venue_id:
                try:
                    return int(venue_id)
                except (ValueError, TypeError):
                    pass

        return None