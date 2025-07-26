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

# FIX: Simplified import approach to avoid potential path issues
from core.domains.payments.services import PaymentService, PaymentGatewayService
from core.domains.payments.models import PaymentGateway
from core.domains.payments.exceptions import PaymentGatewayException

from ..exceptions import (
    BookingFlowNotActive,
    BookingSessionNotFound,
    BookingSessionExpired,
    StepValidationError,
    EventCreationFailed,
    ValidationFailed,  # Added import for ValidationFailed
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
        """Get a booking session by session ID (UUID)"""
        try:
            # Support both UUID and string session IDs
            if isinstance(session_id, str):
                session = BookingSession.objects.select_related(
                    'booking_flow', 'client', 'current_step'
                ).get(session_id=session_id)
            else:
                # Assume it's a numeric ID (for backward compatibility)
                session = BookingSession.objects.select_related(
                    'booking_flow', 'client', 'current_step'
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
        
        # Validate step data against current step
        if session.current_step:
            validation_errors = BookingSessionService._validate_step_data(
                session.current_step, step_data
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
            
            # Merge with existing data for this step
            if current_step_key not in session.booking_data:
                session.booking_data[current_step_key] = {}
            
            session.booking_data[current_step_key].update(step_data)
            
            # ADDED: Recalculate total price after any data update
            session.total_price = session.calculate_total_price()
            
            # Clear validation errors on successful update
            session.validation_errors = {}
            session.save()
            
            # Mark step as completed if requested
            if mark_completed and session.current_step:
                session.mark_step_completed(session.current_step)
            
            logger.info(f"Updated session data for session: {session.session_id} with new total: {session.total_price}")
            return session
    
    
    @staticmethod
    def complete_booking(session_id):
        """Complete the booking and create event with payment processing"""
        session = BookingSessionService.get_session_by_id(session_id)
        
        if session.is_completed:
            return session.created_event
        
        # Validate all required steps are completed
        required_steps = session.booking_flow.steps.filter(is_required=True, is_enabled=True)
        completed_step_ids = set(session.completed_steps.values_list('id', flat=True))
        
        for step in required_steps:
            if step.id not in completed_step_ids:
                raise StepValidationError(f"Required step '{step.name}' is not completed")
        
        with transaction.atomic():
            try:
                # Create event from booking data
                event = BookingSessionService._create_event_from_session(session)
                
                # Process payment if required and payment data exists
                if session.booking_flow.require_immediate_payment:
                    payment_data = BookingSessionService._extract_payment_data(session)
                    if payment_data:
                        payment = BookingSessionService._process_booking_payment(
                            session, event, payment_data
                        )
                        
                        if payment.status != 'COMPLETED':
                            raise EventCreationFailed("Payment processing failed")
                
                # Mark session as completed
                session.is_completed = True
                session.completed_at = timezone.now()
                session.created_event = event
                session.save()
                
                logger.info(f"Completed booking session: {session.session_id}, created event: {event.id}")
                return event
                
            except Exception as e:
                logger.error(f"Failed to create event from session {session.session_id}: {str(e)}")
                raise EventCreationFailed(f"Failed to create event: {str(e)}")
    
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
                if any(key in step_data for key in ['gateway_id', 'payment_method_token', 'payment_method_id']):
                    return step_data
        return None
    
    @staticmethod
    def _process_booking_payment(session, event, payment_data):
        """Process payment for completed booking"""
        gateway_id = payment_data.get('gateway_id')
        if not gateway_id:
            raise ValueError("No payment gateway specified")
        
        try:
            gateway = PaymentGateway.objects.get(id=gateway_id, is_active=True)
        except PaymentGateway.DoesNotExist:
            raise ValueError(f"Payment gateway {gateway_id} not found or inactive")
        
        # Calculate total amount from session
        total_amount = session.calculate_total_price()
        
        # FIX: Create payment record with proper data structure
        payment_record_data = {
            'event': event.id,  # Pass ID, not object
            'amount': total_amount,
            'status': 'PENDING',
            'due_date': timezone.now().date(),
            'description': f'Booking payment for session {session.session_id}',
            'is_manual': False,
        }
        
        # Create initial payment record
        payment = PaymentService.create_payment(payment_record_data, session.client)
        
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
        
        # FIX: Use correct service method
        transaction_result = PaymentGatewayService.process_gateway_payment(
            payment.id,
            gateway.code,
            gateway_data,
            session.client
        )
        
        return payment
    
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
            'start_date': timezone.now(),  # FIX: Default start date - will be overridden if provided
        }
        
        # Extract basic event info from various steps
        for step_key, step_data in booking_data.items():
            if isinstance(step_data, dict):
                # Extract event name, dates, etc.
                if 'event_name' in step_data:
                    event_data['name'] = step_data['event_name']
                
                # FIX: Handle date/time properly - combine date and time if both provided
                if 'start_date' in step_data:
                    start_date = step_data['start_date']
                    start_time = step_data.get('start_time')
                    
                    if start_time:
                        # Combine date and time into datetime
                        from datetime import datetime, time
                        if isinstance(start_date, str):
                            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                        if isinstance(start_time, str):
                            start_time = datetime.strptime(start_time, '%H:%M:%S').time()
                        
                        event_data['start_date'] = datetime.combine(start_date, start_time)
                    else:
                        event_data['start_date'] = start_date
                
                if 'end_date' in step_data:
                    end_date = step_data['end_date']
                    end_time = step_data.get('end_time')
                    
                    if end_time:
                        # Combine date and time into datetime
                        from datetime import datetime, time
                        if isinstance(end_date, str):
                            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                        if isinstance(end_time, str):
                            end_time = datetime.strptime(end_time, '%H:%M:%S').time()
                        
                        event_data['end_date'] = datetime.combine(end_date, end_time)
                    else:
                        event_data['end_date'] = end_date
                
                # Extract other event info that might be in various steps
                if 'guest_count' in step_data:
                    event_data['guest_count'] = step_data['guest_count']
                if 'description' in step_data:
                    event_data['description'] = step_data['description']
                if 'venue_preference' in step_data:
                    event_data['venue'] = step_data['venue_preference']
        
        # FIX: Prepare event products with correct structure
        event_products = []
        total_price = Decimal('0.00')
        
        # Add selected packages
        for step_key, step_data in booking_data.items():
            if isinstance(step_data, dict):
                if 'selected_packages' in step_data:
                    for package_data in step_data['selected_packages']:
                        try:
                            product_option = ProductOption.objects.get(id=package_data['id'])
                            quantity = package_data.get('quantity', 1)
                            price = Decimal(str(package_data.get('price', product_option.base_price)))
                            
                            event_products.append({
                                'product_option': product_option.id,  # Pass ID, not object
                                'quantity': quantity,
                                'final_price': price,
                                'num_participants': event_data.get('guest_count'),
                            })
                            total_price += price * quantity
                        except (ProductOption.DoesNotExist, KeyError, ValueError) as e:
                            logger.warning(f"Error processing package {package_data}: {e}")
                
                # Add selected addons
                if 'selected_addons' in step_data:
                    for addon_data in step_data['selected_addons']:
                        try:
                            product_option = ProductOption.objects.get(id=addon_data['id'])
                            quantity = addon_data.get('quantity', 1)
                            price = Decimal(str(addon_data.get('price', product_option.base_price)))
                            
                            event_products.append({
                                'product_option': product_option.id,  # Pass ID, not object
                                'quantity': quantity,
                                'final_price': price,
                            })
                            total_price += price * quantity
                        except (ProductOption.DoesNotExist, KeyError, ValueError) as e:
                            logger.warning(f"Error processing addon {addon_data}: {e}")
        
        event_data['total_price'] = total_price
        event_data['event_products'] = event_products
        
        # Add session metadata
        event_data['notes'] = f"Created from booking session {session.session_id}"
        if session.booking_flow.is_test_mode:
            event_data['notes'] += " (Test Mode)"
        
        # Create the event
        return EventService.create_event(
            event_data,
            user=session.client,
            booking_flow_id=session.booking_flow.id
        )
    
    @staticmethod
    def _validate_step_data(step, step_data):
        """Validate step data against step configuration"""
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
                # Validate questionnaire responses
                questionnaire_items = config.questionnaire_items.all()
                for item in questionnaire_items:
                    questionnaire = item.questionnaire
                    response_key = f'questionnaire_{questionnaire.id}'
                    if questionnaire.is_required and not step_data.get(response_key):
                        errors[response_key] = [f"{questionnaire.name} is required"]
                        
            elif step.step_type == 'package_selection':
                selected = step_data.get('selected_packages', [])
                if config.min_selection and len(selected) < config.min_selection:
                    errors['selected_packages'] = [f"Select at least {config.min_selection} package(s)"]
                if config.max_selection and len(selected) > config.max_selection:
                    errors['selected_packages'] = [f"Select at most {config.max_selection} package(s)"]
                    
            elif step.step_type == 'addon_selection':
                selected = step_data.get('selected_addons', [])
                if config.min_selection and len(selected) < config.min_selection:
                    errors['selected_addons'] = [f"Select at least {config.min_selection} addon(s)"]
                if config.max_selection and len(selected) > config.max_selection:
                    errors['selected_addons'] = [f"Select at most {config.max_selection} addon(s)"]
                    
            elif step.step_type == 'contact_info':
                if config.require_full_name and not step_data.get('full_name'):
                    errors['full_name'] = ["Full name is required"]
                if config.require_email and not step_data.get('email'):
                    errors['email'] = ["Email is required"]
                if config.require_phone and not step_data.get('phone'):
                    errors['phone'] = ["Phone number is required"]
                    
            elif step.step_type == 'payment_info':
                if not step_data.get('payment_method'):
                    errors['payment_method'] = ["Payment method is required"]
        
        return errors
    
    @staticmethod
    def _check_availability(step_data, config):
        """Check availability for date/time step with enhanced availability features"""
        # This is a placeholder for actual availability checking logic
        # In a real implementation, this would integrate with:
        # - Venue availability systems
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
        
        # Check venue availability if enabled
        if config.check_venue_availability:
            # This would integrate with venue management system
            # For now, assume available
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