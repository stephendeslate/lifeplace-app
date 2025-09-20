# backend/core/domains/bookingflow/services/booking_session_service.py
import logging
import uuid
from datetime import timedelta
from decimal import Decimal
from typing import Dict, Any

from django.db import transaction
from django.utils import timezone
from core.domains.events.models import Event, EventProductOption
from core.domains.products.models import ProductOption
from core.domains.sales.models import EventQuote, QuoteLineItem

# FIX: Simplified import approach to avoid potential path issues
from core.domains.payments.services import PaymentService
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
        print(f"SERVICE DEBUG: current_step={session.current_step.name if session.current_step else 'None'}")
        
        # Validate step data against current step
        if session.current_step:
            validation_errors = BookingSessionService._validate_step_data(
                session.current_step, step_data, session
            )
            if validation_errors:
                print(f"SERVICE DEBUG: Validation errors found: {validation_errors}")
                # Store validation errors but don't raise exception
                session.validation_errors = validation_errors
                session.save()
                # Still return the session with errors
                return session
            else:
                print(f"SERVICE DEBUG: No validation errors")
        
        with transaction.atomic():
            # Update booking data
            current_step_key = f"step_{session.current_step.id}" if session.current_step else "general"
            
            # CRITICAL FIX: Handle packages and addons at root level ONLY to avoid duplication
            # This ensures a single source of truth for pricing calculations
            if 'selected_packages' in step_data:
                # Store at root level only
                session.booking_data['selected_packages'] = step_data['selected_packages']
                # Remove from step_data to prevent duplication
                step_data_copy = step_data.copy()
                step_data_copy.pop('selected_packages', None)
                step_data = step_data_copy
            
            if 'selected_addons' in step_data:
                # Store at root level only
                session.booking_data['selected_addons'] = step_data['selected_addons']
                # Remove from step_data to prevent duplication
                step_data_copy = step_data.copy()
                step_data_copy.pop('selected_addons', None)
                step_data = step_data_copy
            
            # Merge remaining step data (excluding packages/addons which are now at root level)
            if current_step_key not in session.booking_data:
                session.booking_data[current_step_key] = {}
            
            session.booking_data[current_step_key].update(step_data)
            
            # Clear any previous validation errors
            session.validation_errors = {}
            
            # Handle step progression
            print(f"DEBUG: mark_completed={mark_completed}, session.booking_flow={bool(session.booking_flow)}")
            if mark_completed and session.booking_flow:
                # Add current step to completed steps
                if session.current_step and session.current_step not in session.completed_steps.all():
                    session.completed_steps.add(session.current_step)
                    print(f"DEBUG: Added step {session.current_step.name} to completed_steps")
                
                # Check if this is a contact_info step - create/associate client user
                if (session.current_step and 
                    session.current_step.step_type == 'contact_info' and 
                    'email' in step_data and step_data['email']):
                    
                    print(f"DEBUG: Contact info step completed - creating/associating client user")
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
                            print(f"DEBUG: Associated existing client user: {user.email}")
                        else:
                            # Create new user record
                            user_data = {
                                'email': step_data['email'],
                                'first_name': step_data.get('first_name', ''),
                                'last_name': step_data.get('last_name', ''),
                                'role': 'CLIENT',
                                'is_active': True,
                                # Don't set password - UserService will set unusable password
                            }
                            
                            user = UserService.create_user(user_data)
                            
                            # Update session with new user
                            session.client = user
                            print(f"DEBUG: Created new client user: {user.email}")
                        
                    except Exception as e:
                        print(f"DEBUG: Failed to create/associate client user: {str(e)}")
                        logger.error(f"Failed to create/associate client user for session {session.session_id}: {str(e)}")
                
                # Check if this is a confirmation step with create_event_immediately=True
                if (session.current_step and 
                    session.current_step.step_type == 'confirmation' and 
                    hasattr(session.current_step, 'confirmation_config') and 
                    session.current_step.confirmation_config and
                    session.current_step.confirmation_config.create_event_immediately):
                    
                    print(f"DEBUG: Confirmation step completed with create_event_immediately=True - creating event")
                    try:
                        # Ensure we have a client before creating event
                        if not session.client:
                            raise Exception("No client associated with session")
                        
                        # Create event immediately
                        event = BookingSessionService._create_event_from_session(session)
                        session.created_event = event
                        print(f"DEBUG: Event created immediately: {event.id}")
                    except Exception as e:
                        print(f"DEBUG: Failed to create event immediately: {str(e)}")
                        logger.error(f"Failed to create event immediately for session {session.session_id}: {str(e)}")
                
                # Pass booking_data to check display conditions
                next_step = session.booking_flow.get_next_step(
                    session.current_step.id,
                    session.booking_data  # ADD THIS
                )
                print(f"DEBUG: Current step: {session.current_step.name if session.current_step else 'None'}, Next step: {next_step.name if next_step else 'None'}")
                
                if next_step:
                    session.current_step = next_step
                else:
                    # No more steps - booking flow is complete
                    session.is_completed = True
                    session.completed_at = timezone.now()
                    logger.info(f"No more steps - marking session as completed")
            
            session.save()
            
            # Log changes
            logger.info(f"Session updated: step_data for {current_step_key}")
            
        # CRITICAL: Re-fetch the session with proper prefetching to avoid ManyRelatedManager issues
        return BookingSessionService.get_session_by_id(session_id)
    
    
    @staticmethod
    def complete_booking(session_id, completion_type='payment'):
        """Complete the booking and create event with payment processing or quote generation

        Args:
            session_id: The booking session ID
            completion_type: 'payment' for immediate payment, 'quote' for quote request
        """
        # ENHANCED DEBUGGING: Log the received completion type
        logger.info(f"🔥 COMPLETE_BOOKING CALLED: session_id={session_id}, completion_type='{completion_type}'")

        session = BookingSessionService.get_session_by_id(session_id)

        # Log session booking data to see what completion_type is stored
        logger.info(f"🔥 SESSION BOOKING DATA: {session.booking_data}")

        if session.is_completed:
            logger.info(f"🔥 Session already completed, returning existing event: {session.created_event}")
            return session.created_event
        
        # Validate all required steps are completed
        required_steps = session.booking_flow.steps.filter(is_required=True, is_enabled=True)
        completed_step_ids = set(session.completed_steps.values_list('id', flat=True))
        
        for step in required_steps:
            if step.id not in completed_step_ids:
                raise StepValidationError(f"Required step '{step.name}' is not completed")
        
        # Validate completion type against payment step configuration
        payment_step = session.booking_flow.steps.filter(step_type='payment_info').first()
        if payment_step and hasattr(payment_step, 'payment_config'):
            payment_config = payment_step.payment_config
            if completion_type == 'quote' and not payment_config.allow_quote_request:
                raise StepValidationError("Quote requests are not allowed for this booking flow")
            if completion_type == 'payment' and payment_config.require_immediate_payment:
                payment_data = BookingSessionService._extract_payment_data(session)
                if not payment_data:
                    raise StepValidationError("Payment is required but no payment data provided")
        
        with transaction.atomic():
            try:
                # Create event from booking data
                event = BookingSessionService._create_event_from_session(session)

                # NEW QUOTE-FIRST APPROACH: Always create quote first
                logger.info(f"Creating quote from booking session for event {event.id}")
                quote = BookingSessionService.create_quote_from_booking_session(session, event, completion_type)

                # Create invoice from the accepted quote
                logger.info(f"Creating invoice from quote {quote.id}")
                from core.domains.payments.services.invoice_service import InvoiceService
                invoice = InvoiceService.create_from_quote(quote)
                logger.info(f"Created invoice {invoice.invoice_id} from quote")

                # FIXED: Handle quote requests FIRST to avoid payment processing

                if completion_type == 'quote':
                    logger.info(f"Processing quote completion for session {session.session_id}")
                    # For quote requests, issue the invoice but don't process payment
                    invoice.issue()  # Changes status from DRAFT to ISSUED

                    # Event stays as LEAD status for quote requests
                    logger.info(f"Quote request completed - event {event.id} remains as LEAD, invoice {invoice.invoice_id} issued")

                    # Send quote notification
                    try:
                        BookingSessionService._send_quote_notification(session, quote)
                        logger.info(f"Quote notification sent for session {session.session_id}")
                    except Exception as e:
                        logger.warning(f"Failed to send quote notification: {e}")

                elif completion_type == 'payment':
                    logger.info(f"Processing payment completion for session {session.session_id}")
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
                        # Payment successful - confirm the event and mark invoice as paid
                        event.status = 'CONFIRMED'
                        event.save()

                        # Update invoice status
                        invoice.status = 'PAID'
                        invoice.save()

                        logger.info(f"Event {event.id} confirmed and invoice {invoice.invoice_id} marked as paid")
                    else:
                        logger.error(f"Payment processing failed - payment status: {payment.status}")
                        raise EventCreationFailed("Payment processing failed")

                else:
                    # Default case: issue invoice but don't process payment immediately
                    logger.info(f"Processing default completion type for session {session.session_id}")
                    invoice.issue()  # Changes status from DRAFT to ISSUED
                    logger.info(f"Invoice {invoice.invoice_id} issued for later payment")
                
                # Mark session as completed
                session.is_completed = True
                session.completed_at = timezone.now()
                session.created_event = event
                session.save()
                
                logger.info(f"Completed booking session: {session.session_id} with {completion_type}, created event: {event.id}")
                return event
                
            except Exception as e:
                logger.error(f"Failed to create event from session {session.session_id}: {str(e)}")
                raise EventCreationFailed(f"Failed to create event: {str(e)}")
    
    @staticmethod
    def _send_quote_notification(session, quote):
        """Send quote notification to client"""
        from core.domains.communications.services import CommunicationService
        
        # Create notification for quote generation
        try:
            # Send email notification about quote
            template_data = {
                'client_name': session.client.get_full_name(),
                'quote_amount': quote.total_amount,
                'quote_valid_until': quote.valid_until,
                'quote_id': quote.id
            }
            
            # Use a generic email template for now - this should be configurable
            CommunicationService.send_system_email(
                recipient=session.client.email,
                template_name='quote_request_confirmation',
                context_data=template_data,
                subject='Your Quote Request - LifePlace'
            )
            
            logger.info(f"Sent quote notification to {session.client.email} for quote {quote.id}")
            
        except Exception as e:
            logger.error(f"Failed to send quote notification: {e}")
            # Don't raise exception as quote was created successfully
    
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
        logger.info(f"Payment data received: {payment_data}")
        
        gateway_id = payment_data.get('gateway_id') or payment_data.get('payment_gateway_id')
        logger.info(f"Gateway ID from payment data: {gateway_id}")
        
        # If no gateway specified in payment data, use booking flow default
        if not gateway_id:
            if session.booking_flow.default_payment_gateway and session.booking_flow.default_payment_gateway.is_active:
                gateway_id = session.booking_flow.default_payment_gateway.id
                logger.info(f"Using default payment gateway: {gateway_id}")
            elif session.booking_flow.allowed_payment_gateways.filter(is_active=True).exists():
                # Use first available allowed gateway as fallback
                gateway_id = session.booking_flow.allowed_payment_gateways.filter(is_active=True).first().id
                logger.info(f"Using first allowed payment gateway: {gateway_id}")
            else:
                logger.error("No payment gateway specified and no default gateway configured")
                raise ValueError("No payment gateway specified and no default gateway configured")
        
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
            # Get deposit configuration from payment step
            payment_step = session.booking_flow.steps.filter(step_type='payment_info').first()
            payment_config = getattr(payment_step, 'paymentinfo_config', None) if payment_step else None
            
            if payment_config and payment_config.accept_deposit:
                if payment_config.deposit_type == 'PERCENTAGE':
                    deposit_percentage = Decimal(str(payment_config.deposit_amount or 30))  # Default 30%
                    amount_to_charge = full_amount * (deposit_percentage / Decimal('100'))
                else:  # FIXED amount
                    amount_to_charge = Decimal(str(payment_config.deposit_amount)) if payment_config.deposit_amount else (full_amount * Decimal('0.30'))
            else:
                # Fallback to 30% if no config found
                amount_to_charge = full_amount * Decimal('0.30')
            
            logger.info(f"Payment type: DEPOSIT - Charging {amount_to_charge} out of total {full_amount}")
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
        
        logger.info(f"Creating payment record with data: {payment_record_data}")
        
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
        
        logger.info(f"Gateway data for processing: {gateway_data}")
        
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

        # SAFETY GUARD: This method should never be called for quote requests
        # This is a defensive check to prevent quote requests from accidentally triggering payment processing
        current_booking_data = session.booking_data or {}
        for step_key, step_data in current_booking_data.items():
            if isinstance(step_data, dict) and step_data.get('completion_type') == 'quote':
                logger.error(f"CRITICAL ERROR: Payment processing called for quote request! Session: {session.session_id}")
                raise ValueError("Payment processing should not be called for quote requests")
        
        gateway_id = payment_data.get('gateway_id') or payment_data.get('payment_gateway_id')
        logger.info(f"Gateway ID from payment data: {gateway_id}")
        
        # If no gateway specified in payment data, use booking flow default
        if not gateway_id:
            if session.booking_flow.default_payment_gateway and session.booking_flow.default_payment_gateway.is_active:
                gateway_id = session.booking_flow.default_payment_gateway.id
                logger.info(f"Using default payment gateway: {gateway_id}")
            elif session.booking_flow.allowed_payment_gateways.filter(is_active=True).exists():
                # Use first available allowed gateway as fallback
                gateway_id = session.booking_flow.allowed_payment_gateways.filter(is_active=True).first().id
                logger.info(f"Using first allowed payment gateway: {gateway_id}")
            else:
                logger.error("No payment gateway specified and no default gateway configured")
                raise ValueError("No payment gateway specified and no default gateway configured")
        
        if not gateway_id:
            raise ValueError("No payment gateway specified")
        
        try:
            gateway = PaymentGateway.objects.get(id=gateway_id, is_active=True)
            logger.info(f"Found payment gateway: {gateway.name} (code: {gateway.code})")
        except PaymentGateway.DoesNotExist:
            logger.error(f"Payment gateway {gateway_id} not found or inactive")
            raise ValueError(f"Payment gateway {gateway_id} not found or inactive")
        
        # Calculate amount to charge based on payment type
        full_amount = invoice.total_amount
        payment_type = payment_data.get('payment_type', 'FULL')
        
        if payment_type == 'DEPOSIT':
            # Get deposit configuration from payment step
            payment_step = session.booking_flow.steps.filter(step_type='payment_info').first()
            payment_config = getattr(payment_step, 'payment_config', None) if payment_step else None
            
            if payment_config and payment_config.accept_deposit:
                if payment_config.deposit_type == 'PERCENTAGE':
                    deposit_percentage = Decimal(str(payment_config.deposit_amount or 30))  # Default 30%
                    amount_to_charge = full_amount * (deposit_percentage / Decimal('100'))
                else:  # FIXED amount
                    amount_to_charge = Decimal(str(payment_config.deposit_amount)) if payment_config.deposit_amount else (full_amount * Decimal('0.30'))
            else:
                # Fallback to 30% if no config found
                amount_to_charge = full_amount * Decimal('0.30')
            
            logger.info(f"Payment type: DEPOSIT - Charging {amount_to_charge} out of total {full_amount}")
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
        
        payment = Payment.objects.create(
            event=event,
            amount=amount_to_charge,
            currency=invoice.currency or 'PHP',
            status='PENDING',
            due_date=timezone.now().date() + timedelta(days=due_days),
            payment_method=None,  # Will be determined by gateway
            description=description,
            invoice=invoice,  # Link to invoice
            quote=invoice.quote,  # Link to quote if available
            is_manual=False
        )
        
        logger.info(f"Created payment record: {payment.payment_number}")
        
        # Process the payment through the gateway
        try:
            # Prepare gateway data
            gateway_data = {
                'amount': float(amount_to_charge),
                'currency': payment.currency,
                'description': description,
                'payment_method_token': payment_data.get('payment_method_token'),
                'payment_method_id': payment_data.get('payment_method_id'),
                'client_email': session.client.email,
                'client_name': session.client.get_full_name(),
                'invoice_id': invoice.invoice_id,
                'event_id': event.id
            }
            
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
    def _generate_quote_from_session(session, event):
        """Generate a quote from booking session data"""
        from core.domains.sales.services import QuoteService
        from datetime import date, timedelta
        from decimal import Decimal
        
        # Calculate pricing from session
        total_amount = session.calculate_total_price()
        
        # Create quote data
        quote_data = {
            'event': event,
            'status': 'DRAFT',
            'total_amount': total_amount,
            'subtotal': total_amount,  # Base calculation - will be recalculated by quote service
            'valid_until': (date.today() + timedelta(days=30)),  # Valid for 30 days
            'notes': f'Quote generated from booking session {session.session_id}',
            'terms_and_conditions': 'Standard terms and conditions apply.',
            'created_by': None  # System generated
        }
        
        # Create the quote
        from core.domains.sales.models import EventQuote
        quote = EventQuote.objects.create(**quote_data)
        
        # Add line items from session booking data
        BookingSessionService._add_line_items_to_quote(quote, session)
        
        # Recalculate totals after line items are added
        quote.calculate_totals()
        
        return quote
    
    @staticmethod
    def _add_line_items_to_quote(quote, session):
        """Add line items to quote from session booking data"""
        from core.domains.sales.models import QuoteLineItem
        from core.domains.products.models import ProductOption
        
        # Extract selected products/packages from booking data
        for step_key, step_data in session.booking_data.items():
            if isinstance(step_data, dict):
                # Handle package selections
                if 'selected_packages' in step_data:
                    packages = step_data['selected_packages']
                    if isinstance(packages, list):
                        for package_id in packages:
                            try:
                                package = ProductOption.objects.get(id=package_id)
                                QuoteLineItem.objects.create(
                                    quote=quote,
                                    product=package,
                                    quantity=1,
                                    unit_price=package.base_price,
                                    total=package.base_price,
                                    description=f'Package: {package.name}'
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
                                QuoteLineItem.objects.create(
                                    quote=quote,
                                    product=addon,
                                    quantity=1,
                                    unit_price=addon.base_price,
                                    total=addon.base_price,
                                    description=f'Add-on: {addon.name}'
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
    def _create_event_from_session(session):
        """Create an event from booking session data"""
        from core.domains.events.services import EventService
        
        # Extract event data from session
        booking_data = session.booking_data
        
        # Build event data with required fields
        event_data = {
            'client': session.client,
            'event_type': session.booking_flow.event_type,
            'status': 'LEAD',
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
                        from datetime import datetime, time
                        if isinstance(start_date, str):
                            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                        if isinstance(start_time, str):
                            start_time = datetime.strptime(start_time, '%H:%M').time()
                        
                        event_data['start_date'] = datetime.combine(start_date, start_time)
                    else:
                        # CRITICAL FIX: Ensure start_date is datetime even without time
                        from datetime import datetime
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
                                    event_data['start_date'] = timezone.now()
                            except Exception:
                                # Any other parsing error, use current time
                                event_data['start_date'] = timezone.now()
                        elif hasattr(start_date, 'isoformat'):
                            # Already a datetime or date object
                            event_data['start_date'] = start_date
                        else:
                            # Fallback to current time if invalid format or empty string
                            event_data['start_date'] = timezone.now()
                
                if 'end_date' in step_data:
                    end_date = step_data['end_date']
                    end_time = step_data.get('end_time')
                    
                    if end_time:
                        # Combine date and time into datetime
                        from datetime import datetime, time
                        if isinstance(end_date, str):
                            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                        if isinstance(end_time, str):
                            end_time = datetime.strptime(end_time, '%H:%M').time()
                        
                        event_data['end_date'] = datetime.combine(end_date, end_time)
                    else:
                        # CRITICAL FIX: Ensure end_date is datetime even without time
                        from datetime import datetime
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
        
        # Prepare event products with correct structure
        event_products = []
        total_price = Decimal('0.00')

        # FIX: Get packages and addons from root level first (single source of truth)
        selected_packages = booking_data.get('selected_packages', [])
        selected_addons = booking_data.get('selected_addons', [])

        # If not found at root, look in step data (but only take first occurrence)
        if not selected_packages:
            for step_key, step_data in booking_data.items():
                if isinstance(step_data, dict) and 'selected_packages' in step_data:
                    selected_packages = step_data['selected_packages']
                    break  # CRITICAL: Only take the first occurrence

        if not selected_addons:
            for step_key, step_data in booking_data.items():
                if isinstance(step_data, dict) and 'selected_addons' in step_data:
                    selected_addons = step_data['selected_addons']
                    break  # CRITICAL: Only take the first occurrence

        # Process packages
        for package_data in selected_packages:
            try:
                product_option = ProductOption.objects.get(id=package_data['product_id'])
                quantity = package_data.get('quantity', 1)
                price = Decimal(str(package_data.get('price', product_option.base_price)))
                
                # Calculate excess hours if applicable
                excess_hours = None
                excess_cost = Decimal('0')
                event_duration = BookingSessionService._get_event_duration_from_booking_data(booking_data)
                if product_option.has_excess_hours and product_option.included_hours and event_duration:
                    if event_duration > product_option.included_hours:
                        import math
                        excess_hours = math.ceil(event_duration - product_option.included_hours)
                        
                        # Calculate excess cost
                        if product_option.excess_hour_price:
                            excess_hour_price = Decimal(str(product_option.excess_hour_price))
                            excess_cost = excess_hour_price * Decimal(str(excess_hours))
                
                # Calculate final price including excess hours
                final_price = price + excess_cost
                
                event_product_data = {
                    'product_option': product_option.id,  # Pass ID, not object
                    'quantity': quantity,
                    'final_price': final_price,
                    'num_participants': event_data.get('guest_count'),
                }
                
                # Only add excess_hours if there are any
                if excess_hours:
                    event_product_data['excess_hours'] = excess_hours
                
                event_products.append(event_product_data)
                total_price += final_price * Decimal(str(quantity))
            except (ProductOption.DoesNotExist, KeyError, ValueError) as e:
                logger.warning(f"Error processing package {package_data}: {e}")

        # Process addons
        for addon_data in selected_addons:  
            try:
                product_option = ProductOption.objects.get(id=addon_data['product_id'])
                quantity = addon_data.get('quantity', 1)
                price = Decimal(str(addon_data.get('price', product_option.base_price)))
                
                event_products.append({
                    'product_option': product_option.id,  # Pass ID, not object
                    'quantity': quantity,
                    'final_price': price,
                })
                total_price += price * Decimal(str(quantity))
            except (ProductOption.DoesNotExist, KeyError, ValueError) as e:
                logger.warning(f"Error processing addon {addon_data}: {e}")
        
        event_data['total_price'] = total_price
        event_data['event_products'] = event_products
        
        # CRITICAL VALIDATION: Only allow known Event model fields
        # NOTE: 'id' is explicitly excluded since Django auto-generates it
        allowed_event_fields = {
            'client', 'event_type', 'status', 'name', 'start_date', 'end_date',
            'workflow_template', 'current_stage', 'lead_source', 'last_contacted',
            'total_price', 'event_products', 'payment_status', 'total_amount_due',
            'total_amount_paid', 'preferences', 'guest_count', 'description'
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
        
        # ADD: Create a note for the event after it's created
        # This is the proper way to add notes to an event
        try:
            from django.contrib.contenttypes.models import ContentType
            Note = ContentType.objects.get(app_label='notes', model='note').model_class()
            
            note_text = f"Created from booking session {session.session_id}"
            if session.booking_flow.is_test_mode:
                note_text += " (Test Mode)"
                
            Note.objects.create(
                content_type=ContentType.objects.get_for_model(event),
                object_id=event.id,
                text=note_text,
                created_by=session.client,
                is_private=False
            )
        except Exception as e:
            logger.warning(f"Could not create note for event: {e}")

        try:
            from core.domains.questionnaires.services import QuestionnaireResponseService
            
            # Extract questionnaire responses from booking data
            questionnaire_responses = []
            
            # Check for questionnaire data in various possible locations
            # 1. Direct questionnaire key
            if 'questionnaire' in session.booking_data:
                questionnaire_responses = session.booking_data['questionnaire']
            
            # 2. Step-specific questionnaire data
            for step_key, step_data in session.booking_data.items():
                if isinstance(step_data, dict) and step_key.startswith('step_'):
                    # Check if this step contains questionnaire responses
                    if 'responses' in step_data:
                        questionnaire_responses.extend(step_data['responses'])
                    
                    # FIXED: Check for individual field responses at the correct level
                    # Look through all keys in step_data for field_ prefix
                    for field_key, value in step_data.items():
                        if field_key.startswith('field_'):
                            field_id = field_key.replace('field_', '')
                            try:
                                questionnaire_responses.append({
                                    'field': int(field_id),
                                    'value': value
                                })
                            except (ValueError, TypeError):
                                logger.warning(f"Invalid field ID in key: {field_key}")
                                continue
            
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
        
        # Add validation for pricing summary step
        if step.step_type == 'pricing_summary':
            # Pricing summary only stores the discount code
            # All calculations are done server-side
            if 'applied_discount_code' in step_data and step_data['applied_discount_code']:
                # Validate discount code if provided
                try:
                    from core.domains.products.services import DiscountService
                    discount_code = step_data['applied_discount_code']
                    discount = DiscountService.validate_discount_code(discount_code)
                    if not discount or not discount.is_active:
                        errors['applied_discount_code'] = ["Invalid or expired discount code"]
                except Exception as e:
                    errors['applied_discount_code'] = ["Unable to validate discount code"]
        
        # Common validation for all step types
        if hasattr(step, f"{step.step_type}_config"):
            config = getattr(step, f"{step.step_type}_config")
            
            # Step-specific validation based on configuration
            if step.step_type == 'introduction':
                if step_data.get('acknowledged') is not True:
                    errors['acknowledged'] = ["Acknowledgment is required"]
                    
            elif step.step_type == 'date_time':
                if not step_data.get('date'):
                    errors['date'] = ["Date selection is required"]
                if config.allow_time_selection and not step_data.get('time'):
                    errors['time'] = ["Time selection is required"]
                    
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
                            
                            # FIXED: Validate selected packages are in available packages (if configured)
                            if config.available_packages.exists():  # Check if any packages are configured
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
        
        # Use centralized pricing service for consistent calculations
        from core.domains.sales.pricing_service import PricingCalculationService
        
        # Get event duration for pricing calculations
        event_duration = BookingSessionService._get_event_duration_from_booking_data(session.booking_data)
        
        # Calculate pricing using centralized service
        pricing_breakdown = PricingCalculationService.calculate_from_booking_data(
            session.booking_data, 
            event_duration
        )
        
        logger.info(f"Centralized pricing calculated: ₱{pricing_breakdown.total_amount}")

        # Determine quote status based on completion type
        if completion_type == 'quote':
            # Quote requests should be pending client acceptance
            quote_status = 'SENT'
            accepted_at = None
            status_note = "Quote sent to client for review"
        else:
            # Payment completions auto-accept the quote
            quote_status = 'ACCEPTED'
            accepted_at = timezone.now()
            status_note = "Quote auto-accepted from booking completion"

        logger.info(f"Creating quote with status '{quote_status}' for completion_type '{completion_type}'")

        # Create the quote with conditional status
        # Initialize with basic values, will be recalculated after line items are added
        quote = EventQuote.objects.create(
            event=event,
            version=1,
            status=quote_status,
            subtotal=Decimal('0.00'),  # Will be recalculated
            tax_amount=Decimal('0.00'),  # Will be recalculated
            discount_amount=pricing_breakdown.discount_amount,
            total_amount=Decimal('0.00'),  # Will be recalculated
            valid_until=timezone.now().date() + timedelta(days=30),
            accepted_at=accepted_at,
            created_by=session.client,
            notes=f"Quote generated from booking session {session.session_id} - {status_note}",
            discount=pricing_breakdown.applied_discount
        )
        
        logger.info(f"Created quote {quote.id} with status {quote.status}")
        
        # Create line items from pricing breakdown
        BookingSessionService._create_quote_line_items_from_pricing_breakdown(quote, pricing_breakdown, session)
        
        # IMPORTANT: Recalculate totals after line items are created (includes tax calculation)
        quote.calculate_totals()

        logger.info(f"Quote {quote.id} final total after recalculation: ₱{quote.total_amount}")

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
            QuoteLineItem.objects.create(
                quote=quote,
                description=pricing_item.description,
                quantity=pricing_item.quantity,
                unit_price=pricing_item.total_unit_price,  # Already includes excess hours
                tax_rate=pricing_item.tax_rate,
                total=pricing_item.line_total,
                product_id=pricing_item.product_id,
                notes=f"Generated from booking session {session.session_id}"
            )
            
            logger.info(
                f"Created line item: {pricing_item.name} "
                f"x{pricing_item.quantity} @ ₱{pricing_item.total_unit_price} = ₱{pricing_item.line_total}"
            )
        
        logger.info(f"Completed creating line items for quote {quote.id}")
    
    @staticmethod
    def _create_quote_line_items_from_booking_data(quote, session):
        """DEPRECATED: Create quote line items from booking session data
        
        This method is deprecated in favor of the centralized PricingCalculationService.
        Use _create_quote_line_items_from_pricing_breakdown() instead.
        
        Args:
            quote: EventQuote instance
            session: BookingSession instance
        """
        booking_data = session.booking_data
        logger.info(f"Creating line items from booking data keys: {list(booking_data.keys())}")
        
        # Get selected packages and addons from booking data
        selected_packages = booking_data.get('selected_packages', [])
        selected_addons = booking_data.get('selected_addons', [])
        
        # If not found at root level, search in step data
        if not selected_packages:
            for step_key, step_data in booking_data.items():
                if isinstance(step_data, dict) and 'selected_packages' in step_data:
                    selected_packages = step_data['selected_packages']
                    break
        
        if not selected_addons:
            for step_key, step_data in booking_data.items():
                if isinstance(step_data, dict) and 'selected_addons' in step_data:
                    selected_addons = step_data['selected_addons']
                    break
        
        logger.info(f"Found {len(selected_packages)} packages and {len(selected_addons)} addons")
        
        # Get event duration for excess hours calculation
        event_duration = BookingSessionService._get_event_duration_from_booking_data(session.booking_data)
        logger.info(f"Event duration: {event_duration} hours")
        
        # Create line items for packages
        for package_data in selected_packages:
            try:
                name = package_data.get('name', 'Package')
                quantity = int(package_data.get('quantity', 1))
                base_price = Decimal(str(package_data.get('price', 0)))
                
                # Calculate total price including excess hours
                total_item_price = base_price * Decimal(str(quantity))
                
                # Handle excess hours if applicable
                excess_hours = Decimal('0')
                excess_cost = Decimal('0')
                
                if event_duration:
                    package_hours = package_data.get('hours_included', 0)
                    if package_hours and event_duration > package_hours:
                        import math
                        excess_hours = Decimal(str(math.ceil(event_duration - package_hours)))
                        
                        # Get excess hour price
                        excess_hour_price = Decimal('0')
                        if 'excess_hour_price' in package_data:
                            excess_hour_price = Decimal(str(package_data['excess_hour_price']))
                        elif package_hours > 0:
                            # Fallback: 50% of base hourly rate
                            base_hourly_rate = base_price / Decimal(str(package_hours))
                            excess_hour_price = base_hourly_rate * Decimal('0.5')
                        
                        excess_cost = excess_hour_price * excess_hours * Decimal(str(quantity))
                        total_item_price += excess_cost
                
                # Create line item for base package
                description = name
                if excess_hours > 0:
                    description += f" (includes {excess_hours}h excess @ {excess_cost/excess_hours/Decimal(str(quantity)):.2f}/h)"
                
                QuoteLineItem.objects.create(
                    quote=quote,
                    description=description,
                    quantity=quantity,
                    unit_price=total_item_price / Decimal(str(quantity)),  # Unit price including excess
                    tax_rate=Decimal('0.00'),  # Tax handling can be added later
                    total=total_item_price,
                    product_id=package_data.get('product_id'),
                    notes=f"Package from booking session {session.session_id}"
                )
                
                logger.info(f"Created line item: {name} x{quantity} = {total_item_price}")
                
            except (ValueError, TypeError) as e:
                logger.warning(f"Error creating package line item: {e}")
                continue
        
        # Create line items for addons
        for addon_data in selected_addons:
            try:
                name = addon_data.get('name', 'Add-on')
                quantity = int(addon_data.get('quantity', 1))
                price = Decimal(str(addon_data.get('price', 0)))
                total_price = price * Decimal(str(quantity))
                
                QuoteLineItem.objects.create(
                    quote=quote,
                    description=name,
                    quantity=quantity,
                    unit_price=price,
                    tax_rate=Decimal('0.00'),  # Tax handling can be added later
                    total=total_price,
                    product_id=addon_data.get('product_id'),
                    notes=f"Add-on from booking session {session.session_id}"
                )
                
                logger.info(f"Created addon line item: {name} x{quantity} = {total_price}")
                
            except (ValueError, TypeError) as e:
                logger.warning(f"Error creating addon line item: {e}")
                continue
        
        # Apply discount if present in booking data
        discount_code = None
        for step_key, step_data in booking_data.items():
            if isinstance(step_data, dict) and 'applied_discount_code' in step_data:
                discount_code = step_data['applied_discount_code']
                break
        
        if discount_code:
            try:
                from core.domains.products.models import Discount
                discount = Discount.objects.get(code=discount_code, is_active=True)
                quote.discount = discount
                quote.save()
                logger.info(f"Applied discount code: {discount_code}")
            except Discount.DoesNotExist:
                logger.warning(f"Discount code not found: {discount_code}")
            except Exception as e:
                logger.warning(f"Error applying discount: {e}")
        
        logger.info(f"Completed creating line items for quote {quote.id}")