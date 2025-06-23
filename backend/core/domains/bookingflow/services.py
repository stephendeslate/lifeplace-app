# backend/core/domains/bookingflow/services.py
import logging
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from core.domains.events.models import Event, EventProductOption, EventTimeline
from core.domains.events.services import EventService
from core.domains.products.models import Discount, ProductOption
from core.domains.questionnaires.models import QuestionnaireResponse
from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone

from .exceptions import (
    AvailabilityCheckFailed,
    BookingCreationFailed,
    BookingFlowInactive,
    BookingFlowNotFound,
    BookingFlowStepNotFound,
    BookingSessionExpired,
    BookingSessionNotFound,
    ConditionalLogicError,
    DiscountNotApplicable,
    DuplicateStepType,
    InvalidBookingData,
    InvalidStepConfiguration,
    InvalidStepTransition,
    MaxAdvanceBookingExceeded,
    MinAdvanceBookingNotMet,
    ProductNotAvailable,
    StepValidationError,
)
from .models import (
    AddonSelectionStepConfiguration,
    BookingFlow,
    BookingFlowAnalytics,
    BookingFlowStep,
    BookingSession,
    ConfirmationStepConfiguration,
    ContactInfoStepConfiguration,
    DateTimeStepConfiguration,
    EventDetailsStepConfiguration,
    IntroductionStepConfiguration,
    PackageSelectionStepConfiguration,
    PaymentInfoStepConfiguration,
    QuestionnaireStepConfiguration,
    QuestionnaireStepItem,
)

logger = logging.getLogger(__name__)


class BookingFlowService:
    """Service for managing booking flows"""
    
    @staticmethod
    def get_all_flows(search_query=None, event_type_id=None, is_active=None):
        """Get all booking flows with optional filtering"""
        queryset = BookingFlow.objects.select_related('event_type', 'workflow_template').all()
        
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        if event_type_id:
            queryset = queryset.filter(event_type_id=event_type_id)
            
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
            
        return queryset.order_by('name')
    
    @staticmethod
    def get_flow_by_id(flow_id):
        """Get a booking flow by ID"""
        try:
            return BookingFlow.objects.select_related(
                'event_type', 'workflow_template'
            ).prefetch_related(
                'steps', 'available_discounts'
            ).get(id=flow_id)
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotFound()
    
    @staticmethod
    def create_flow(flow_data, user):
        """Create a new booking flow with default steps"""
        with transaction.atomic():
            # Extract nested data
            steps_data = flow_data.pop('steps', [])
            available_discounts = flow_data.pop('available_discounts', [])
            
            # Create the flow
            flow = BookingFlow.objects.create(**flow_data)
            
            # Set available discounts
            if available_discounts:
                flow.available_discounts.set(available_discounts)
            
            # Create steps or use default steps if none provided
            if steps_data:
                for step_data in steps_data:
                    BookingFlowStepService.create_step(flow.id, step_data, user)
            else:
                BookingFlowService._create_default_steps(flow, user)
            
            logger.info(f"Created booking flow: {flow.name} by {user}")
            return flow
    
    @staticmethod
    def update_flow(flow_id, flow_data, user):
        """Update an existing booking flow"""
        flow = BookingFlowService.get_flow_by_id(flow_id)
        
        with transaction.atomic():
            # Extract nested data
            steps_data = flow_data.pop('steps', None)
            available_discounts = flow_data.pop('available_discounts', None)
            
            # Update main fields
            for key, value in flow_data.items():
                setattr(flow, key, value)
            flow.save()
            
            # Update available discounts
            if available_discounts is not None:
                flow.available_discounts.set(available_discounts)
            
            # Update steps if provided
            if steps_data is not None:
                # Delete existing steps and create new ones
                flow.steps.all().delete()
                for step_data in steps_data:
                    BookingFlowStepService.create_step(flow.id, step_data, user)
            
            logger.info(f"Updated booking flow: {flow.name} by {user}")
            return flow
    
    @staticmethod
    def delete_flow(flow_id, user):
        """Delete a booking flow"""
        flow = BookingFlowService.get_flow_by_id(flow_id)
        
        # Check if flow has active sessions
        active_sessions = BookingSession.objects.filter(
            booking_flow=flow,
            is_completed=False,
            expires_at__gt=timezone.now()
        ).count()
        
        if active_sessions > 0:
            raise InvalidStepTransition(
                detail=f"Cannot delete flow with {active_sessions} active booking sessions"
            )
        
        with transaction.atomic():
            flow_name = flow.name
            flow.delete()
            logger.info(f"Deleted booking flow: {flow_name} by {user}")
            return True
    
    @staticmethod
    def duplicate_flow(flow_id, new_name, user):
        """Create a duplicate of an existing booking flow"""
        original_flow = BookingFlowService.get_flow_by_id(flow_id)
        
        with transaction.atomic():
            # Create new flow
            new_flow = BookingFlow.objects.create(
                name=new_name,
                description=f"Copy of {original_flow.description}",
                event_type=original_flow.event_type,
                workflow_template=original_flow.workflow_template,
                confirmation_email_template=original_flow.confirmation_email_template,
                reminder_email_template=original_flow.reminder_email_template,
                is_active=False,  # Start as inactive
                allow_guest_booking=original_flow.allow_guest_booking,
                require_account_creation=original_flow.require_account_creation,
                auto_approve_bookings=original_flow.auto_approve_bookings,
                enable_progress_saving=original_flow.enable_progress_saving,
                max_advance_booking_days=original_flow.max_advance_booking_days,
                min_advance_booking_days=original_flow.min_advance_booking_days,
                allow_discounts=original_flow.allow_discounts,
                redirect_url=original_flow.redirect_url,
                success_message=original_flow.success_message,
                is_test_mode=True  # Start in test mode
            )
            
            # Copy available discounts
            new_flow.available_discounts.set(original_flow.available_discounts.all())
            
            # Copy steps
            for step in original_flow.steps.all():
                new_step = BookingFlowStep.objects.create(
                    booking_flow=new_flow,
                    step_type=step.step_type,
                    name=step.name,
                    description=step.description,
                    order=step.order,
                    is_enabled=step.is_enabled,
                    is_required=step.is_required,
                    is_skippable=step.is_skippable,
                    display_conditions=step.display_conditions,
                    configuration=step.configuration,
                    validation_rules=step.validation_rules
                )
                
                # Copy step configurations
                BookingFlowStepService._copy_step_configuration(step, new_step)
            
            logger.info(f"Duplicated booking flow: {original_flow.name} -> {new_name} by {user}")
            return new_flow
    
    @staticmethod
    def _create_default_steps(flow, user):
        """Create default steps for a new booking flow"""
        default_steps = [
            {
                'step_type': 'introduction',
                'name': 'Welcome',
                'description': 'Introduction to the booking process',
                'order': 1,
                'is_enabled': True,
                'is_required': True
            },
            {
                'step_type': 'event_details',
                'name': 'Event Details',
                'description': 'Basic event information',
                'order': 2,
                'is_enabled': True,
                'is_required': True
            },
            {
                'step_type': 'date_time',
                'name': 'Date & Time',
                'description': 'Select event date and time',
                'order': 3,
                'is_enabled': True,
                'is_required': True
            },
            {
                'step_type': 'package_selection',
                'name': 'Select Package',
                'description': 'Choose your event package',
                'order': 4,
                'is_enabled': True,
                'is_required': True
            },
            {
                'step_type': 'addon_selection',
                'name': 'Add-ons',
                'description': 'Optional add-ons',
                'order': 5,
                'is_enabled': True,
                'is_required': False
            },
            {
                'step_type': 'contact_info',
                'name': 'Contact Information',
                'description': 'Your contact details',
                'order': 6,
                'is_enabled': True,
                'is_required': True
            },
            {
                'step_type': 'review_booking',
                'name': 'Review Booking',
                'description': 'Review your booking details',
                'order': 7,
                'is_enabled': True,
                'is_required': True
            },
            {
                'step_type': 'confirmation',
                'name': 'Confirmation',
                'description': 'Booking confirmation',
                'order': 8,
                'is_enabled': True,
                'is_required': True
            }
        ]
        
        for step_data in default_steps:
            BookingFlowStepService.create_step(flow.id, step_data, user)


class BookingFlowStepService:
    """Service for managing booking flow steps"""
    
    @staticmethod
    def get_steps_for_flow(flow_id):
        """Get all steps for a booking flow"""
        try:
            flow = BookingFlow.objects.get(id=flow_id)
            return flow.steps.all().order_by('order')
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotFound()
    
    @staticmethod
    def get_step_by_id(step_id):
        """Get a booking flow step by ID"""
        try:
            return BookingFlowStep.objects.select_related('booking_flow').get(id=step_id)
        except BookingFlowStep.DoesNotExist:
            raise BookingFlowStepNotFound()
    
    @staticmethod
    def create_step(flow_id, step_data, user):
        """Create a new booking flow step"""
        try:
            flow = BookingFlow.objects.get(id=flow_id)
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotFound()
        
        # Check for duplicate step type
        if BookingFlowStep.objects.filter(
            booking_flow=flow,
            step_type=step_data['step_type']
        ).exists():
            raise DuplicateStepType()
        
        # Auto-assign order if not provided
        if 'order' not in step_data:
            max_order = BookingFlowStep.objects.filter(
                booking_flow=flow
            ).aggregate(models.Max('order'))['order__max'] or 0
            step_data['order'] = max_order + 1
        
        with transaction.atomic():
            step = BookingFlowStep.objects.create(booking_flow=flow, **step_data)
            
            # Create default configuration for the step
            BookingFlowStepService._create_default_configuration(step)
            
            logger.info(f"Created step: {step.name} for flow: {flow.name} by {user}")
            return step
    
    @staticmethod
    def update_step(step_id, step_data, user):
        """Update an existing booking flow step"""
        step = BookingFlowStepService.get_step_by_id(step_id)
        
        # Check for duplicate step type if changing
        if 'step_type' in step_data and step_data['step_type'] != step.step_type:
            if BookingFlowStep.objects.filter(
                booking_flow=step.booking_flow,
                step_type=step_data['step_type']
            ).exclude(id=step.id).exists():
                raise DuplicateStepType()
        
        with transaction.atomic():
            # Update step fields
            for key, value in step_data.items():
                setattr(step, key, value)
            step.save()
            
            logger.info(f"Updated step: {step.name} by {user}")
            return step
    
    @staticmethod
    def delete_step(step_id, user):
        """Delete a booking flow step"""
        step = BookingFlowStepService.get_step_by_id(step_id)
        
        with transaction.atomic():
            step_name = step.name
            flow_name = step.booking_flow.name
            step.delete()
            logger.info(f"Deleted step: {step_name} from flow: {flow_name} by {user}")
            return True
    
    @staticmethod
    def reorder_steps(flow_id, order_mapping, user):
        """Reorder steps within a booking flow"""
        try:
            flow = BookingFlow.objects.get(id=flow_id)
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotFound()
        
        with transaction.atomic():
            steps = BookingFlowStep.objects.filter(
                booking_flow=flow
            ).select_for_update()
            
            # Convert string IDs to integers
            int_order_mapping = {int(k): v for k, v in order_mapping.items()}
            
            # Update orders
            for step in steps:
                if step.id in int_order_mapping:
                    step.order = int_order_mapping[step.id]
                    step.save(update_fields=['order'])
            
            logger.info(f"Reordered steps for flow: {flow.name} by {user}")
            return steps.order_by('order')
    
    @staticmethod
    def _create_default_configuration(step):
        """Create default configuration for a step based on its type"""
        if step.step_type == 'introduction':
            IntroductionStepConfiguration.objects.create(
                step=step,
                title=f"Welcome to {step.booking_flow.event_type.name} Booking",
                content="We're excited to help you plan your perfect event!"
            )
        elif step.step_type == 'event_details':
            EventDetailsStepConfiguration.objects.create(
                step=step,
                require_event_name=True,
                require_guest_count=True
            )
        elif step.step_type == 'date_time':
            DateTimeStepConfiguration.objects.create(
                step=step,
                allow_time_selection=True,
                show_calendar_view=True,
                default_duration_hours=4
            )
        elif step.step_type == 'questionnaire':
            QuestionnaireStepConfiguration.objects.create(step=step)
        elif step.step_type == 'package_selection':
            PackageSelectionStepConfiguration.objects.create(step=step)
        elif step.step_type == 'addon_selection':
            AddonSelectionStepConfiguration.objects.create(step=step)
        elif step.step_type == 'contact_info':
            ContactInfoStepConfiguration.objects.create(
                step=step,
                require_full_name=True,
                require_email=True,
                require_phone=True
            )
        elif step.step_type == 'payment_info':
            PaymentInfoStepConfiguration.objects.create(
                step=step,
                accept_full_payment=True,
                accept_deposit=True
            )
        elif step.step_type == 'confirmation':
            ConfirmationStepConfiguration.objects.create(
                step=step,
                title="Booking Confirmed!",
                message="Thank you for your booking. We'll be in touch soon!"
            )
    
    @staticmethod
    def _copy_step_configuration(original_step, new_step):
        """Copy step configuration from original to new step"""
        try:
            if original_step.step_type == 'introduction' and hasattr(original_step, 'introduction_config'):
                config = original_step.introduction_config
                IntroductionStepConfiguration.objects.create(
                    step=new_step,
                    title=config.title,
                    content=config.content,
                    show_event_details=config.show_event_details,
                    show_pricing_overview=config.show_pricing_overview,
                    custom_css=config.custom_css
                )
            # Add similar copying logic for other step types...
        except AttributeError:
            # If no configuration exists, create default
            BookingFlowStepService._create_default_configuration(new_step)


class BookingSessionService:
    """Service for managing booking sessions"""
    
    @staticmethod
    def create_session(flow_id, client=None, client_ip=None, user_agent=None, referrer_url=None):
        """Create a new booking session"""
        try:
            flow = BookingFlow.objects.get(id=flow_id, is_active=True)
        except BookingFlow.DoesNotExist:
            raise BookingFlowInactive()
        
        # Create session
        session = BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=flow,
            client=client,
            current_step=flow.enabled_steps.first(),
            ip_address=client_ip,
            user_agent=user_agent or '',
            referrer_url=referrer_url or '',
            expires_at=timezone.now() + timedelta(hours=24)  # 24-hour expiry
        )
        
        logger.info(f"Created booking session: {session.session_id} for flow: {flow.name}")
        return session
    
    @staticmethod
    def get_session_by_id(session_id):
        """Get a booking session by session ID"""
        try:
            session = BookingSession.objects.select_related(
                'booking_flow', 'current_step', 'client'
            ).get(session_id=session_id)
            
            if session.is_expired():
                raise BookingSessionExpired()
            
            return session
        except BookingSession.DoesNotExist:
            raise BookingSessionNotFound()
    
    @staticmethod
    def update_session_data(session_id, step_id, step_data, mark_completed=False):
        """Update booking session data for a specific step"""
        session = BookingSessionService.get_session_by_id(session_id)
        
        try:
            step = BookingFlowStep.objects.get(id=step_id, booking_flow=session.booking_flow)
        except BookingFlowStep.DoesNotExist:
            raise BookingFlowStepNotFound()
        
        # Validate step data
        validation_errors = BookingSessionService._validate_step_data(step, step_data)
        if validation_errors:
            session.validation_errors[step.step_type] = validation_errors
            session.save()
            raise StepValidationError(detail=validation_errors)
        
        with transaction.atomic():
            # Update booking data
            if step.step_type not in session.booking_data:
                session.booking_data[step.step_type] = {}
            
            session.booking_data[step.step_type].update(step_data)
            
            # Clear validation errors for this step
            if step.step_type in session.validation_errors:
                del session.validation_errors[step.step_type]
            
            # Mark step as completed if requested
            if mark_completed:
                session.mark_step_completed(step)
            
            session.save()
            
            logger.info(f"Updated session data: {session_id} for step: {step.name}")
            return session
    
    @staticmethod
    def complete_booking(session_id, final_data=None, create_event=True, send_confirmation=True):
        """Complete a booking session and create the event"""
        session = BookingSessionService.get_session_by_id(session_id)
        
        if session.is_completed:
            raise InvalidStepTransition(detail="Booking session is already completed")
        
        # Validate all required steps are completed
        required_steps = session.booking_flow.steps.filter(is_required=True, is_enabled=True)
        completed_step_ids = set(session.completed_steps.values_list('id', flat=True))
        
        for step in required_steps:
            if step.id not in completed_step_ids:
                raise StepValidationError(detail=f"Required step '{step.name}' not completed")
        
        with transaction.atomic():
            # Add final data if provided
            if final_data:
                session.booking_data.update(final_data)
            
            # Create event if requested
            if create_event:
                event = BookingSessionService._create_event_from_session(session)
                session.created_event = event
            
            # Mark session as completed
            session.is_completed = True
            session.completed_at = timezone.now()
            session.save()
            
            # Send confirmation if requested
            if send_confirmation and session.booking_flow.confirmation_email_template:
                BookingSessionService._send_confirmation_email(session)
            
            # Update analytics
            BookingFlowAnalyticsService.record_completion(session.booking_flow, session)
            
            logger.info(f"Completed booking session: {session_id}")
            return session
    
    @staticmethod
    def abandon_session(session_id, reason=None):
        """Mark a session as abandoned"""
        session = BookingSessionService.get_session_by_id(session_id)
        
        session.is_abandoned = True
        if reason:
            session.booking_data['abandonment_reason'] = reason
        session.save()
        
        # Update analytics
        BookingFlowAnalyticsService.record_abandonment(session.booking_flow, session)
        
        logger.info(f"Abandoned booking session: {session_id}")
        return session
    
    @staticmethod
    def _validate_step_data(step, step_data):
        """Validate step data against step validation rules"""
        errors = {}
        
        # Check required fields based on step type
        if step.step_type == 'event_details':
            if hasattr(step, 'event_details_config'):
                config = step.event_details_config
                if config.require_event_name and not step_data.get('event_name'):
                    errors['event_name'] = 'Event name is required'
                if config.require_guest_count and not step_data.get('guest_count'):
                    errors['guest_count'] = 'Guest count is required'
                if config.max_guest_count and step_data.get('guest_count', 0) > config.max_guest_count:
                    errors['guest_count'] = f'Guest count cannot exceed {config.max_guest_count}'
        
        elif step.step_type == 'date_time':
            if not step_data.get('event_date'):
                errors['event_date'] = 'Event date is required'
            else:
                # Validate advance booking limits
                event_date = datetime.fromisoformat(step_data['event_date'].replace('Z', '+00:00')).date()
                today = timezone.now().date()
                days_advance = (event_date - today).days
                
                flow = step.booking_flow
                if days_advance < flow.min_advance_booking_days:
                    errors['event_date'] = f'Event must be at least {flow.min_advance_booking_days} days in advance'
                if days_advance > flow.max_advance_booking_days:
                    errors['event_date'] = f'Event cannot be more than {flow.max_advance_booking_days} days in advance'
        
        elif step.step_type == 'contact_info':
            if hasattr(step, 'contact_config'):
                config = step.contact_config
                if config.require_full_name and not step_data.get('full_name'):
                    errors['full_name'] = 'Full name is required'
                if config.require_email and not step_data.get('email'):
                    errors['email'] = 'Email is required'
                if config.require_phone and not step_data.get('phone'):
                    errors['phone'] = 'Phone number is required'
        
        # Add custom validation rules
        for rule_name, rule_config in step.validation_rules.items():
            # Implement custom validation logic here
            pass
        
        return errors
    
    @staticmethod
    def _create_event_from_session(session):
        """Create an event from a completed booking session"""
        booking_data = session.booking_data
        flow = session.booking_flow
        
        # Prepare event data
        event_data = {
            'client': session.client,
            'event_type': flow.event_type,
            'status': 'CONFIRMED' if flow.auto_approve_bookings else 'LEAD',
            'workflow_template': flow.workflow_template,
        }
        
        # Extract data from booking
        if 'event_details' in booking_data:
            event_details = booking_data['event_details']
            event_data.update({
                'name': event_details.get('event_name', ''),
                'description': event_details.get('description', ''),
            })
        
        if 'date_time' in booking_data:
            date_time = booking_data['date_time']
            event_data.update({
                'start_date': date_time.get('event_date'),
                'end_date': date_time.get('end_date'),
            })
        
        # Calculate total price
        total_price = session.calculate_total_price()
        event_data['total_price'] = total_price
        
        # Prepare products data
        event_products = []
        
        if 'package_selection' in booking_data:
            for package_data in booking_data['package_selection'].get('selected_packages', []):
                event_products.append({
                    'product_option': package_data['id'],
                    'quantity': package_data.get('quantity', 1),
                    'final_price': Decimal(str(package_data.get('price', 0)))
                })
        
        if 'addon_selection' in booking_data:
            for addon_data in booking_data['addon_selection'].get('selected_addons', []):
                event_products.append({
                    'product_option': addon_data['id'],
                    'quantity': addon_data.get('quantity', 1),
                    'final_price': Decimal(str(addon_data.get('price', 0)))
                })
        
        event_data['event_products'] = event_products
        
        # Create the event
        event = EventService.create_event(
            event_data, 
            session.client or session.booking_flow.created_by,
            booking_flow_id=flow.id
        )
        
        # Save questionnaire responses
        if 'questionnaire' in booking_data:
            BookingSessionService._save_questionnaire_responses(event, booking_data['questionnaire'])
        
        # Record in timeline
        EventTimeline.objects.create(
            event=event,
            action_type='SYSTEM_UPDATE',
            description=f"Event created from booking flow: {flow.name}",
            is_public=True,
            action_data={
                'booking_session_id': str(session.session_id),
                'booking_flow_id': flow.id
            }
        )
        
        return event
    
    @staticmethod
    def _save_questionnaire_responses(event, questionnaire_data):
        """Save questionnaire responses from booking data"""
        for field_id, value in questionnaire_data.items():
            if field_id.startswith('field_'):
                try:
                    field_id_int = int(field_id.replace('field_', ''))
                    QuestionnaireResponse.objects.create(
                        event=event,
                        field_id=field_id_int,
                        value=str(value)
                    )
                except (ValueError, Exception) as e:
                    logger.warning(f"Failed to save questionnaire response: {e}")
    
    @staticmethod
    def _send_confirmation_email(session):
        """Send confirmation email to client"""
        # This would integrate with the communications domain
        # For now, just log the action
        logger.info(f"Confirmation email sent for session: {session.session_id}")


class BookingFlowAnalyticsService:
    """Service for tracking booking flow analytics"""
    
    @staticmethod
    def record_completion(booking_flow, session):
        """Record a completed booking for analytics"""
        today = timezone.now().date()
        
        analytics, created = BookingFlowAnalytics.objects.get_or_create(
            booking_flow=booking_flow,
            date=today,
            defaults={
                'total_sessions': 0,
                'completed_bookings': 0,
                'abandoned_sessions': 0,
                'total_revenue': Decimal('0.00')
            }
        )
        
        analytics.completed_bookings += 1
        analytics.total_revenue += session.calculate_total_price()
        analytics.total_sessions = BookingSession.objects.filter(
            booking_flow=booking_flow,
            created_at__date=today
        ).count()
        
        # Calculate conversion rate
        if analytics.total_sessions > 0:
            analytics.conversion_rate = (analytics.completed_bookings / analytics.total_sessions) * 100
        
        # Calculate average booking value
        if analytics.completed_bookings > 0:
            analytics.average_booking_value = analytics.total_revenue / analytics.completed_bookings
        
        analytics.save()
    
    @staticmethod
    def record_abandonment(booking_flow, session):
        """Record an abandoned session for analytics"""
        today = timezone.now().date()
        
        analytics, created = BookingFlowAnalytics.objects.get_or_create(
            booking_flow=booking_flow,
            date=today,
            defaults={
                'total_sessions': 0,
                'completed_bookings': 0,
                'abandoned_sessions': 0,
                'total_revenue': Decimal('0.00')
            }
        )
        
        analytics.abandoned_sessions += 1
        analytics.total_sessions = BookingSession.objects.filter(
            booking_flow=booking_flow,
            created_at__date=today
        ).count()
        
        # Calculate conversion rate
        if analytics.total_sessions > 0:
            analytics.conversion_rate = (analytics.completed_bookings / analytics.total_sessions) * 100
        
        analytics.save()


class AvailabilityService:
    """Service for checking availability during booking"""
    
    @staticmethod
    def check_date_availability(booking_flow, event_date, duration_hours=None):
        """Check if a date is available for booking"""
        # This would integrate with calendar/scheduling system
        # For now, implement basic checks
        
        # Check if date is blocked
        if hasattr(booking_flow, 'datetime_config'):
            datetime_config = None
            for step in booking_flow.steps.filter(step_type='date_time'):
                if hasattr(step, 'datetime_config'):
                    datetime_config = step.datetime_config
                    break
            
            if datetime_config and datetime_config.blocked_dates:
                if event_date in datetime_config.blocked_dates:
                    raise AvailabilityCheckFailed(detail="Selected date is blocked")
            
            if datetime_config and datetime_config.available_days_of_week:
                weekday = event_date.weekday()  # 0=Monday, 6=Sunday
                if weekday not in datetime_config.available_days_of_week:
                    raise AvailabilityCheckFailed(detail="Selected day of week is not available")
        
        # Check against existing events (basic conflict detection)
        existing_events = Event.objects.filter(
            event_type=booking_flow.event_type,
            start_date__date=event_date,
            status__in=['CONFIRMED', 'LEAD']
        )
        
        # This is a simplified check - in reality, you'd check time conflicts
        if existing_events.exists():
            logger.warning(f"Potential scheduling conflict on {event_date}")
        
        return True
    
    @staticmethod
    def get_available_time_slots(booking_flow, event_date):
        """Get available time slots for a specific date"""
        # This would integrate with calendar/scheduling system
        # Return sample time slots for now
        return [
            {'time': '09:00', 'available': True},
            {'time': '10:00', 'available': True},
            {'time': '11:00', 'available': False},
            {'time': '12:00', 'available': True},
            {'time': '13:00', 'available': True},
            {'time': '14:00', 'available': True},
            {'time': '15:00', 'available': False},
            {'time': '16:00', 'available': True},
            {'time': '17:00', 'available': True},
        ]


class PricingService:
    """Service for calculating dynamic pricing during booking"""
    
    @staticmethod
    def calculate_package_price(package_id, booking_data):
        """Calculate price for a package based on booking data"""
        try:
            package = ProductOption.objects.get(id=package_id)
            base_price = package.base_price
            
            # Apply dynamic pricing factors
            if 'event_details' in booking_data:
                guest_count = booking_data['event_details'].get('guest_count', 1)
                # Example: charge per guest for certain packages
                if package.pricing_model == 'TIERED':
                    base_price = base_price * guest_count
            
            return base_price
        except ProductOption.DoesNotExist:
            raise ProductNotAvailable()
    
    @staticmethod
    def apply_discount(total_amount, discount_code, booking_data):
        """Apply a discount to the booking total"""
        try:
            discount = Discount.objects.get(code=discount_code, is_active=True)
            
            if not discount.is_valid():
                raise DiscountNotApplicable(detail="Discount code is not valid")
            
            # Check if discount can be applied to this booking
            if discount.minimum_order_amount and total_amount < discount.minimum_order_amount:
                raise DiscountNotApplicable(detail="Order does not meet minimum amount for this discount")
            
            # Calculate discount amount
            if discount.discount_type == 'PERCENTAGE':
                discount_amount = total_amount * (discount.value / 100)
            else:  # FIXED
                discount_amount = min(discount.value, total_amount)
            
            return discount_amount, discount
        except Discount.DoesNotExist:
            raise DiscountNotApplicable(detail="Invalid discount code")