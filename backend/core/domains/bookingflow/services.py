# backend/core/domains/bookingflow/services.py
import logging
import uuid
from datetime import timedelta
from decimal import Decimal
from typing import Dict, List, Any, Optional

from django.db import models, transaction
from django.db.models import Q, Max, Prefetch
from django.utils import timezone
from core.domains.questionnaires.models import Questionnaire
from core.domains.products.models import ProductCategory, ProductOption, Discount
from core.domains.events.models import Event, EventProductOption

from .exceptions import (
    BookingFlowNotFound,
    BookingFlowStepNotFound,
    BookingSessionNotFound,
    InvalidStepConfiguration,
    DuplicateStepType,
    InvalidStepOrder,
    BookingSessionExpired,
    InvalidSessionData,
    StepValidationError,
    QuestionnaireNotFound,
    ProductNotFound,
    BookingFlowNotActive,
    EventCreationFailed,
)
from .models import (
    BookingFlow,
    BookingFlowStep,
    BookingSession,
    BookingFlowAnalytics,
    QuestionnaireStepConfiguration,
    QuestionnaireStepItem,
    PackageSelectionStepConfiguration,
    AddonSelectionStepConfiguration,
    ContactInfoStepConfiguration,
    PaymentInfoStepConfiguration,
    IntroductionStepConfiguration,
    EventDetailsStepConfiguration,
    DateTimeStepConfiguration,
    ConfirmationStepConfiguration,
)

logger = logging.getLogger(__name__)


class BookingFlowService:
    """Service for managing booking flows"""
    
    @staticmethod
    def get_all_flows(search_query=None, event_type_id=None, is_active=None):
        """Get all booking flows with optional filtering"""
        queryset = BookingFlow.objects.select_related('event_type').prefetch_related('steps')
        
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
                'event_type', 'workflow_template',
                'confirmation_email_template', 'reminder_email_template'
            ).prefetch_related(
                'steps__introduction_config',
                'steps__event_details_config',
                'steps__datetime_config',
                'steps__questionnaire_config__questionnaire_items__questionnaire',
                'steps__package_config__available_categories',
                'steps__package_config__available_packages',
                'steps__addon_config__available_categories',
                'steps__addon_config__available_addons',
                'steps__contact_config',
                'steps__payment_config',
                'steps__confirmation_config',
                'available_discounts'
            ).get(id=flow_id)
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotFound()
    
    @staticmethod
    def create_flow(flow_data):
        """Create a new booking flow"""
        with transaction.atomic():
            # Extract steps data if provided
            steps_data = flow_data.pop('steps', [])
            
            # Create the booking flow
            flow = BookingFlow.objects.create(**flow_data)
            
            # Create steps if provided
            for step_data in steps_data:
                BookingFlowStepService.create_step(flow.id, step_data)
            
            logger.info(f"Created new booking flow: {flow.name}")
            return flow
    
    @staticmethod
    def update_flow(flow_id, flow_data):
        """Update an existing booking flow"""
        flow = BookingFlowService.get_flow_by_id(flow_id)
        
        with transaction.atomic():
            # Handle steps separately if provided
            steps_data = flow_data.pop('steps', None)
            
            # Update flow fields
            for key, value in flow_data.items():
                setattr(flow, key, value)
            
            flow.save()
            
            # Update steps if provided
            if steps_data is not None:
                # Clear existing steps and create new ones
                flow.steps.all().delete()
                
                for step_data in steps_data:
                    BookingFlowStepService.create_step(flow.id, step_data)
            
            logger.info(f"Updated booking flow: {flow.name}")
            return flow
    
    @staticmethod
    def delete_flow(flow_id):
        """Delete a booking flow"""
        flow = BookingFlowService.get_flow_by_id(flow_id)
        
        # Check if flow has active sessions
        active_sessions = BookingSession.objects.filter(
            booking_flow=flow,
            is_completed=False,
            is_abandoned=False,
            expires_at__gt=timezone.now()
        ).exists()
        
        if active_sessions:
            # Instead of preventing deletion, mark sessions as abandoned
            BookingSession.objects.filter(
                booking_flow=flow,
                is_completed=False,
                is_abandoned=False
            ).update(
                is_abandoned=True,
                booking_data=models.F('booking_data') | {'abandonment_reason': 'Booking flow deleted'}
            )
        
        with transaction.atomic():
            flow_name = flow.name
            flow.delete()
            logger.info(f"Deleted booking flow: {flow_name}")
            return True
    
    @staticmethod
    def duplicate_flow(flow_id, new_name, copy_steps=True, copy_configuration=True):
        """Duplicate a booking flow"""
        source_flow = BookingFlowService.get_flow_by_id(flow_id)
        
        with transaction.atomic():
            # Create new flow with duplicated data
            new_flow_data = {
                'name': new_name,
                'description': f"Copy of {source_flow.description}",
                'event_type': source_flow.event_type,
                'workflow_template': source_flow.workflow_template,
                'confirmation_email_template': source_flow.confirmation_email_template,
                'reminder_email_template': source_flow.reminder_email_template,
                'is_active': False,  # Start as inactive
                'allow_guest_booking': source_flow.allow_guest_booking,
                'require_account_creation': source_flow.require_account_creation,
                'auto_approve_bookings': source_flow.auto_approve_bookings,
                'enable_progress_saving': source_flow.enable_progress_saving,
                'max_advance_booking_days': source_flow.max_advance_booking_days,
                'min_advance_booking_days': source_flow.min_advance_booking_days,
                'allow_discounts': source_flow.allow_discounts,
                'redirect_url': source_flow.redirect_url,
                'success_message': source_flow.success_message,
                'conversion_tracking_code': source_flow.conversion_tracking_code,
            }
            
            new_flow = BookingFlow.objects.create(**new_flow_data)
            
            # Copy available discounts
            new_flow.available_discounts.set(source_flow.available_discounts.all())
            
            # Copy steps if requested
            if copy_steps:
                for step in source_flow.steps.all().order_by('order'):
                    new_step = BookingFlowStep.objects.create(
                        booking_flow=new_flow,
                        step_type=step.step_type,
                        name=step.name,
                        description=step.description,
                        order=step.order,
                        is_enabled=step.is_enabled,
                        is_required=step.is_required,
                        is_skippable=step.is_skippable,
                        display_conditions=step.display_conditions.copy(),
                        configuration=step.configuration.copy(),
                        validation_rules=step.validation_rules.copy(),
                    )
                    
                    # Copy step configurations if requested
                    if copy_configuration:
                        BookingFlowStepConfigurationService.duplicate_step_configuration(
                            step.id, new_step.id
                        )
            
            logger.info(f"Duplicated booking flow: {source_flow.name} -> {new_name}")
            return new_flow


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
    def create_step(flow_id: int, step_data: dict) -> BookingFlowStep:
        """
        Create a new booking flow step
        """
        from .models import BookingFlow, BookingFlowStep
        
        try:
            # Get the booking flow
            booking_flow = BookingFlow.objects.get(id=flow_id)
            
            # Handle order assignment
            if 'order' not in step_data or step_data['order'] is None:
                # Auto-assign the next available order
                max_order = BookingFlowStep.objects.filter(
                    booking_flow=booking_flow
                ).aggregate(models.Max('order'))['order__max']
                step_data['order'] = (max_order or 0) + 1
            else:
                # Check if the provided order already exists
                existing_step = BookingFlowStep.objects.filter(
                    booking_flow=booking_flow,
                    order=step_data['order']
                ).first()
                
                if existing_step:
                    # Auto-assign the next available order instead
                    max_order = BookingFlowStep.objects.filter(
                        booking_flow=booking_flow
                    ).aggregate(models.Max('order'))['order__max']
                    step_data['order'] = (max_order or 0) + 1
            
            # Create the step
            step = BookingFlowStep.objects.create(
                booking_flow=booking_flow,
                **step_data
            )
            
            logger.info(f"Created booking flow step: {step.name} (ID: {step.id}) for flow: {booking_flow.name}")
            return step
        
        except BookingFlow.DoesNotExist:
            logger.error(f"Booking flow not found: {flow_id}")
            raise BookingFlowNotFound(f"Booking flow with ID {flow_id} not found")
        except Exception as e:
            logger.error(f"Error creating booking flow step: {e}")
            raise e
    
    @staticmethod
    def update_step(step_id, step_data):
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
            # Handle order change specially to maintain sequential ordering
            if 'order' in step_data and step_data['order'] != step.order:
                BookingFlowStepService._reorder_step(step, step_data['order'])
                step_data.pop('order')  # Remove from data as it's handled separately
            
            # Update other fields
            for key, value in step_data.items():
                setattr(step, key, value)
            
            step.save()
            logger.info(f"Updated step: {step.name}")
            return step
    
    @staticmethod
    def delete_step(step_id):
        """Delete a booking flow step"""
        step = BookingFlowStepService.get_step_by_id(step_id)
        
        with transaction.atomic():
            flow = step.booking_flow
            deleted_order = step.order
            step_name = step.name
            
            # Delete the step
            step.delete()
            
            # Reorder remaining steps to maintain sequential ordering
            remaining_steps = BookingFlowStep.objects.filter(
                booking_flow=flow,
                order__gt=deleted_order
            ).select_for_update().order_by('order')
            
            for remaining in remaining_steps:
                remaining.order -= 1
                remaining.save(update_fields=['order'])
            
            logger.info(f"Deleted step: {step_name} and reordered remaining steps")
            return True
    
    @staticmethod
    def reorder_steps(flow_id, order_mapping):
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
            
            # Get maximum order for temporary values
            max_order = steps.aggregate(Max('order'))['order__max'] or 0
            temp_start = max_order + 1000
            
            # Phase 1: Assign temporary high orders
            for i, step in enumerate(steps):
                if step.id in int_order_mapping:
                    step.order = temp_start + i
                    step.save(update_fields=['order'])
            
            # Phase 2: Assign final order values
            for step in steps:
                if step.id in int_order_mapping:
                    step.order = int_order_mapping[step.id]
                    step.save(update_fields=['order'])
            
            logger.info(f"Reordered steps for flow: {flow.name}")
            return steps.order_by('order')
    
    @staticmethod
    def _reorder_step(step, new_order):
        """Helper method to reorder a single step"""
        flow = step.booking_flow
        old_order = step.order
        
        # Get all steps for this flow
        all_steps = BookingFlowStep.objects.filter(
            booking_flow=flow
        ).select_for_update().order_by('order')
        
        # Get maximum order for temporary values
        max_order = all_steps.aggregate(Max('order'))['order__max'] or 0
        temp_start = max_order + 1000
        
        # Assign temporary orders
        for i, s in enumerate(all_steps):
            s.order = temp_start + i
            s.save(update_fields=['order'])
        
        # Create list in desired order
        step_list = [s for s in all_steps if s.id != step.id]
        insert_position = min(new_order - 1, len(step_list))
        step_list.insert(insert_position, step)
        
        # Assign final sequential orders
        for i, s in enumerate(step_list, start=1):
            s.order = i
            s.save(update_fields=['order'])


class BookingFlowStepConfigurationService:
    """Enhanced service for managing step configurations"""
    
    @staticmethod
    def get_step_configuration(step_id):
        """Get configuration for a specific step"""
        try:
            step = BookingFlowStep.objects.get(id=step_id)
        except BookingFlowStep.DoesNotExist:
            raise BookingFlowStepNotFound()
        
        config_map = {
            'introduction': lambda s: getattr(s, 'introduction_config', None),
            'event_details': lambda s: getattr(s, 'event_details_config', None),
            'date_time': lambda s: getattr(s, 'datetime_config', None),
            'questionnaire': lambda s: getattr(s, 'questionnaire_config', None),
            'package_selection': lambda s: getattr(s, 'package_config', None),
            'addon_selection': lambda s: getattr(s, 'addon_config', None),
            'contact_info': lambda s: getattr(s, 'contact_config', None),
            'payment_info': lambda s: getattr(s, 'payment_config', None),
            'confirmation': lambda s: getattr(s, 'confirmation_config', None),
        }
        
        config_getter = config_map.get(step.step_type)
        if config_getter:
            try:
                config = config_getter(step)
                if config is None:
                    # Create default configuration if it doesn't exist
                    config = BookingFlowStepConfigurationService._create_default_configuration(step)
                return config
            except AttributeError:
                # Configuration doesn't exist, create default
                return BookingFlowStepConfigurationService._create_default_configuration(step)
        
        return None
    
    @staticmethod
    def update_step_configuration(step_id, config_data):
        """Update configuration for a specific step"""
        try:
            step = BookingFlowStep.objects.get(id=step_id)
        except BookingFlowStep.DoesNotExist:
            raise BookingFlowStepNotFound()
        
        with transaction.atomic():
            config_updaters = {
                'introduction': BookingFlowStepConfigurationService._update_introduction_config,
                'event_details': BookingFlowStepConfigurationService._update_event_details_config,
                'date_time': BookingFlowStepConfigurationService._update_datetime_config,
                'questionnaire': BookingFlowStepConfigurationService._update_questionnaire_config,
                'package_selection': BookingFlowStepConfigurationService._update_package_config,
                'addon_selection': BookingFlowStepConfigurationService._update_addon_config,
                'contact_info': BookingFlowStepConfigurationService._update_contact_config,
                'payment_info': BookingFlowStepConfigurationService._update_payment_config,
                'confirmation': BookingFlowStepConfigurationService._update_confirmation_config,
            }
            
            updater = config_updaters.get(step.step_type)
            if updater:
                config = updater(step, config_data)
                logger.info(f"Updated configuration for step: {step.name}")
                return config
            else:
                raise InvalidStepConfiguration(f"No configuration handler for step type: {step.step_type}")
    
    @staticmethod
    def duplicate_step_configuration(source_step_id, target_step_id):
        """Duplicate configuration from one step to another"""
        try:
            source_step = BookingFlowStep.objects.get(id=source_step_id)
            target_step = BookingFlowStep.objects.get(id=target_step_id)
        except BookingFlowStep.DoesNotExist:
            raise BookingFlowStepNotFound()
        
        if source_step.step_type != target_step.step_type:
            raise InvalidStepConfiguration("Cannot duplicate configuration between different step types")
        
        source_config = BookingFlowStepConfigurationService.get_step_configuration(source_step_id)
        if not source_config:
            raise InvalidStepConfiguration("Source step has no configuration to duplicate")
        
        # Extract configuration data
        config_data = {}
        for field in source_config._meta.fields:
            if field.name not in ['id', 'step', 'created_at', 'updated_at']:
                config_data[field.name] = getattr(source_config, field.name)
        
        # Handle many-to-many fields
        for field in source_config._meta.many_to_many:
            if field.name != 'step':
                config_data[field.name] = list(getattr(source_config, field.name).values_list('id', flat=True))
        
        # Update target step configuration
        updated_config = BookingFlowStepConfigurationService.update_step_configuration(
            target_step_id, config_data
        )
        
        # Handle special cases like questionnaire items
        if source_step.step_type == 'questionnaire':
            source_items = source_config.questionnaire_items.all()
            questionnaire_ids = [item.questionnaire_id for item in source_items]
            BookingFlowStepConfigurationService.assign_questionnaires(target_step_id, questionnaire_ids)
        
        return updated_config
    
    @staticmethod
    def assign_questionnaires(step_id, questionnaire_ids):
        """Assign questionnaires to a questionnaire step"""
        try:
            step = BookingFlowStep.objects.get(id=step_id)
        except BookingFlowStep.DoesNotExist:
            raise BookingFlowStepNotFound()
        
        if step.step_type != 'questionnaire':
            raise InvalidStepConfiguration("This action is only available for questionnaire steps")
        
        with transaction.atomic():
            config, created = QuestionnaireStepConfiguration.objects.get_or_create(step=step)
            
            # Clear existing questionnaire assignments
            config.questionnaire_items.all().delete()
            
            # Add new assignments
            for order, questionnaire_id in enumerate(questionnaire_ids):
                try:
                    questionnaire = Questionnaire.objects.get(id=questionnaire_id, is_active=True)
                    QuestionnaireStepItem.objects.create(
                        configuration=config,
                        questionnaire=questionnaire,
                        order=order + 1
                    )
                except Questionnaire.DoesNotExist:
                    logger.warning(f"Questionnaire {questionnaire_id} not found or inactive")
                    continue
            
            logger.info(f"Assigned {len(questionnaire_ids)} questionnaires to step: {step.name}")
            return config
    
    @staticmethod
    def _create_default_configuration(step):
        """Create default configuration for a step"""
        config_creators = {
            'introduction': lambda s: IntroductionStepConfiguration.objects.create(
                step=s,
                title=f"Welcome to {s.booking_flow.event_type.name if s.booking_flow.event_type else 'Event'} Booking",
                content="We're excited to help you plan your perfect event!"
            ),
            'event_details': lambda s: EventDetailsStepConfiguration.objects.create(step=s),
            'date_time': lambda s: DateTimeStepConfiguration.objects.create(step=s),
            'questionnaire': lambda s: QuestionnaireStepConfiguration.objects.create(step=s),
            'package_selection': lambda s: PackageSelectionStepConfiguration.objects.create(step=s),
            'addon_selection': lambda s: AddonSelectionStepConfiguration.objects.create(step=s),
            'contact_info': lambda s: ContactInfoStepConfiguration.objects.create(step=s),
            'payment_info': lambda s: PaymentInfoStepConfiguration.objects.create(step=s),
            'confirmation': lambda s: ConfirmationStepConfiguration.objects.create(
                step=s,
                title="Booking Confirmed!",
                message="Thank you for your booking. We'll be in touch soon!"
            ),
        }
        
        creator = config_creators.get(step.step_type)
        return creator(step) if creator else None
    
    @staticmethod
    def _update_introduction_config(step, config_data):
        """Update introduction step configuration"""
        config, created = IntroductionStepConfiguration.objects.get_or_create(
            step=step,
            defaults={
                'title': f"Welcome to {step.booking_flow.event_type.name if step.booking_flow.event_type else 'Event'} Booking",
                'content': "We're excited to help you plan your perfect event!"
            }
        )
        for key, value in config_data.items():
            if hasattr(config, key):
                setattr(config, key, value)
        config.save()
        return config
    
    @staticmethod
    def _update_event_details_config(step, config_data):
        """Update event details step configuration"""
        config, created = EventDetailsStepConfiguration.objects.get_or_create(step=step)
        for key, value in config_data.items():
            if hasattr(config, key):
                setattr(config, key, value)
        config.save()
        return config
    
    @staticmethod
    def _update_datetime_config(step, config_data):
        """Update datetime step configuration"""
        config, created = DateTimeStepConfiguration.objects.get_or_create(step=step)
        for key, value in config_data.items():
            if hasattr(config, key):
                setattr(config, key, value)
        config.save()
        return config
    
    @staticmethod
    def _update_questionnaire_config(step, config_data):
        """Update questionnaire step configuration"""
        config, created = QuestionnaireStepConfiguration.objects.get_or_create(step=step)
        for key, value in config_data.items():
            if hasattr(config, key) and key not in ['questionnaires']:
                setattr(config, key, value)
        config.save()
        return config
    
    @staticmethod
    def _update_package_config(step, config_data):
        """Update package selection step configuration"""
        config, created = PackageSelectionStepConfiguration.objects.get_or_create(step=step)
        
        # Handle many-to-many fields separately
        m2m_fields = ['available_categories', 'available_packages']
        
        for key, value in config_data.items():
            if hasattr(config, key):
                if key in m2m_fields:
                    # Validate the IDs exist
                    if key == 'available_categories':
                        valid_ids = ProductCategory.objects.filter(
                            id__in=value, is_active=True
                        ).values_list('id', flat=True)
                        getattr(config, key).set(valid_ids)
                    elif key == 'available_packages':
                        valid_ids = ProductOption.objects.filter(
                            id__in=value, type='PACKAGE', is_active=True
                        ).values_list('id', flat=True)
                        getattr(config, key).set(valid_ids)
                else:
                    setattr(config, key, value)
        
        config.save()
        return config
    
    @staticmethod
    def _update_addon_config(step, config_data):
        """Update addon selection step configuration"""
        config, created = AddonSelectionStepConfiguration.objects.get_or_create(step=step)
        
        # Handle many-to-many fields separately
        m2m_fields = ['available_categories', 'available_addons']
        
        for key, value in config_data.items():
            if hasattr(config, key):
                if key in m2m_fields:
                    # Validate the IDs exist
                    if key == 'available_categories':
                        valid_ids = ProductCategory.objects.filter(
                            id__in=value, is_active=True
                        ).values_list('id', flat=True)
                        getattr(config, key).set(valid_ids)
                    elif key == 'available_addons':
                        valid_ids = ProductOption.objects.filter(
                            id__in=value, type='PRODUCT', is_active=True
                        ).values_list('id', flat=True)
                        getattr(config, key).set(valid_ids)
                else:
                    setattr(config, key, value)
        
        config.save()
        return config
    
    @staticmethod
    def _update_contact_config(step, config_data):
        """Update contact info step configuration"""
        config, created = ContactInfoStepConfiguration.objects.get_or_create(step=step)
        for key, value in config_data.items():
            if hasattr(config, key):
                setattr(config, key, value)
        config.save()
        return config
    
    @staticmethod
    def _update_payment_config(step, config_data):
        """Update payment info step configuration"""
        config, created = PaymentInfoStepConfiguration.objects.get_or_create(step=step)
        for key, value in config_data.items():
            if hasattr(config, key):
                setattr(config, key, value)
        config.save()
        return config
    
    @staticmethod
    def _update_confirmation_config(step, config_data):
        """Update confirmation step configuration"""
        config, created = ConfirmationStepConfiguration.objects.get_or_create(
            step=step,
            defaults={
                'title': "Booking Confirmed!",
                'message': "Thank you for your booking. We'll be in touch soon!"
            }
        )
        for key, value in config_data.items():
            if hasattr(config, key):
                setattr(config, key, value)
        config.save()
        return config


class BookingSessionService:
    """Service for managing booking sessions"""
    
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
        """Get a booking session by session ID"""
        try:
            session = BookingSession.objects.select_related(
                'booking_flow', 'client', 'current_step'
            ).get(session_id=session_id)
            
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
                raise StepValidationError(detail=validation_errors)
        
        with transaction.atomic():
            # Update booking data
            current_step_key = f"step_{session.current_step.id}" if session.current_step else "general"
            session.booking_data[current_step_key] = step_data
            session.save()
            
            # Mark step as completed if requested
            if mark_completed and session.current_step:
                session.mark_step_completed(session.current_step)
            
            logger.info(f"Updated session data for session: {session.session_id}")
            return session
    
    @staticmethod
    def complete_booking(session_id):
        """Complete the booking and create event"""
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
    def _validate_step_data(step, step_data):
        """Validate step data against step configuration"""
        errors = {}
        
        # Basic validation based on step type
        if step.step_type == 'contact_info':
            config = getattr(step, 'contact_config', None)
            if config:
                if config.require_full_name and not step_data.get('full_name'):
                    errors['full_name'] = 'Full name is required'
                if config.require_email and not step_data.get('email'):
                    errors['email'] = 'Email is required'
                if config.require_phone and not step_data.get('phone'):
                    errors['phone'] = 'Phone number is required'
        
        elif step.step_type == 'package_selection':
            config = getattr(step, 'package_config', None)
            if config:
                selected_packages = step_data.get('selected_packages', [])
                if config.min_selection > 0 and len(selected_packages) < config.min_selection:
                    errors['selected_packages'] = f'Must select at least {config.min_selection} packages'
                if config.max_selection > 0 and len(selected_packages) > config.max_selection:
                    errors['selected_packages'] = f'Cannot select more than {config.max_selection} packages'
        
        elif step.step_type == 'addon_selection':
            config = getattr(step, 'addon_config', None)
            if config:
                selected_addons = step_data.get('selected_addons', [])
                if config.min_selection > 0 and len(selected_addons) < config.min_selection:
                    errors['selected_addons'] = f'Must select at least {config.min_selection} add-ons'
                if config.max_selection > 0 and len(selected_addons) > config.max_selection:
                    errors['selected_addons'] = f'Cannot select more than {config.max_selection} add-ons'
        
        # Apply custom validation rules
        if step.validation_rules:
            # Custom validation logic would go here
            pass
        
        return errors
    
    @staticmethod
    def _create_event_from_session(session):
        """Create an event from booking session data"""
        from core.domains.events.services import EventService
        
        # Extract event data from session
        booking_data = session.booking_data
        
        # Build event data
        event_data = {
            'client': session.client or session.booking_flow.event_type.name,  # Handle guest bookings
            'event_type': session.booking_flow.event_type,
            'status': 'LEAD',
            'workflow_template': session.booking_flow.workflow_template,
        }
        
        # Extract basic event info
        for step_key, step_data in booking_data.items():
            if step_key.startswith('step_'):
                # Extract event name, dates, etc.
                if 'event_name' in step_data:
                    event_data['name'] = step_data['event_name']
                if 'start_date' in step_data:
                    event_data['start_date'] = step_data['start_date']
                if 'end_date' in step_data:
                    event_data['end_date'] = step_data['end_date']
        
        # Prepare event products
        event_products = []
        total_price = Decimal('0.00')
        
        # Add selected packages
        for step_key, step_data in booking_data.items():
            if 'selected_packages' in step_data:
                for package_data in step_data['selected_packages']:
                    product_option = ProductOption.objects.get(id=package_data['id'])
                    event_products.append({
                        'product_option': product_option,
                        'quantity': package_data.get('quantity', 1),
                        'final_price': Decimal(str(package_data.get('price', product_option.base_price))),
                        'num_participants': step_data.get('guest_count'),
                    })
                    total_price += Decimal(str(package_data.get('price', product_option.base_price)))
            
            # Add selected addons
            if 'selected_addons' in step_data:
                for addon_data in step_data['selected_addons']:
                    product_option = ProductOption.objects.get(id=addon_data['id'])
                    event_products.append({
                        'product_option': product_option,
                        'quantity': addon_data.get('quantity', 1),
                        'final_price': Decimal(str(addon_data.get('price', product_option.base_price))),
                    })
                    total_price += Decimal(str(addon_data.get('price', product_option.base_price)))
        
        event_data['total_price'] = total_price
        event_data['event_products'] = event_products
        
        # Create the event
        return EventService.create_event(
            event_data, 
            user=session.client,  # Assuming client is the user
            booking_flow_id=session.booking_flow.id
        )


class BookingFlowAnalyticsService:
    """Service for managing booking flow analytics"""
    
    @staticmethod
    def update_daily_analytics(flow_id, date=None):
        """Update daily analytics for a booking flow"""
        if date is None:
            date = timezone.now().date()
        
        try:
            flow = BookingFlow.objects.get(id=flow_id)
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotFound()
        
        # Get or create analytics record
        analytics, created = BookingFlowAnalytics.objects.get_or_create(
            booking_flow=flow,
            date=date,
            defaults={
                'total_sessions': 0,
                'completed_bookings': 0,
                'abandoned_sessions': 0,
                'conversion_rate': Decimal('0.00'),
                'total_revenue': Decimal('0.00'),
                'average_booking_value': Decimal('0.00'),
            }
        )
        
        # Calculate metrics for the day
        day_sessions = BookingSession.objects.filter(
            booking_flow=flow,
            created_at__date=date
        )
        
        analytics.total_sessions = day_sessions.count()
        analytics.completed_bookings = day_sessions.filter(is_completed=True).count()
        analytics.abandoned_sessions = day_sessions.filter(is_abandoned=True).count()
        
        # Calculate conversion rate
        if analytics.total_sessions > 0:
            analytics.conversion_rate = (analytics.completed_bookings / analytics.total_sessions) * 100
        
        # Calculate revenue
        completed_sessions = day_sessions.filter(is_completed=True, created_event__isnull=False)
        total_revenue = sum(
            session.calculate_total_price() for session in completed_sessions
        )
        analytics.total_revenue = total_revenue
        
        if analytics.completed_bookings > 0:
            analytics.average_booking_value = total_revenue / analytics.completed_bookings
        
        # Calculate step analytics
        step_data = {}
        drop_off_data = {}
        
        for step in flow.enabled_steps:
            step_completions = day_sessions.filter(completed_steps=step).count()
            step_data[str(step.id)] = {
                'completions': step_completions,
                'completion_rate': (step_completions / analytics.total_sessions * 100) if analytics.total_sessions > 0 else 0
            }
            
            # Calculate drop-off rate (sessions that reached this step but didn't complete it)
            sessions_reached = day_sessions.filter(
                current_step__order__gte=step.order
            ).count()
            if sessions_reached > 0:
                drop_off_rate = ((sessions_reached - step_completions) / sessions_reached) * 100
                drop_off_data[str(step.id)] = drop_off_rate
        
        analytics.step_completion_data = step_data
        analytics.step_drop_off_data = drop_off_data
        
        analytics.save()
        logger.info(f"Updated analytics for flow {flow.name} on {date}")
        return analytics
    
    @staticmethod
    def get_flow_analytics(flow_id, start_date=None, end_date=None):
        """Get analytics for a booking flow over a date range"""
        try:
            flow = BookingFlow.objects.get(id=flow_id)
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotFound()
        
        queryset = BookingFlowAnalytics.objects.filter(booking_flow=flow)
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset.order_by('-date')