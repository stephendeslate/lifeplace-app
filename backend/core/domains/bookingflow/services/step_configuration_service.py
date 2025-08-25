# backend/core/domains/bookingflow/services/step_configuration_service.py
import logging

from django.db import transaction
from core.domains.questionnaires.models import Questionnaire
from core.domains.products.models import ProductCategory, ProductOption

from ..exceptions import (
    BookingFlowStepNotFound,
    InvalidStepConfiguration,
)
from ..models import (
    BookingFlowStep,
    QuestionnaireStepConfiguration,
    QuestionnaireStepItem,
    PackageSelectionStepConfiguration,
    AddonSelectionStepConfiguration,
    PricingSummaryStepConfiguration,
    ContactInfoStepConfiguration,
    PaymentInfoStepConfiguration,
    IntroductionStepConfiguration,
    DateTimeStepConfiguration,
    ConfirmationStepConfiguration,
)

logger = logging.getLogger(__name__)


class BookingFlowStepConfigurationService:
    """Enhanced service for managing step configurations"""
    
    @staticmethod
    def get_step_configuration(step_id):
        """Get configuration for a specific step"""
        try:
            step = BookingFlowStep.objects.get(id=step_id)
        except BookingFlowStep.DoesNotExist:
            raise BookingFlowStepNotFound()
        
        # Prevent access to removed step types
        if step.step_type == 'availability_check':
            raise InvalidStepConfiguration(
                "Availability check step type is no longer supported. "
                "Use date_time step with availability checking enabled instead."
            )
        
        config_map = {
            'introduction': lambda s: getattr(s, 'introduction_config', None),
            'date_time': lambda s: getattr(s, 'datetime_config', None),
            'questionnaire': lambda s: getattr(s, 'questionnaire_config', None),
            'package_selection': lambda s: getattr(s, 'package_config', None),
            'addon_selection': lambda s: getattr(s, 'addon_config', None),
            'pricing_summary': lambda s: getattr(s, 'pricing_config', None),
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
        
        # Prevent updating removed step types
        if step.step_type == 'availability_check':
            raise InvalidStepConfiguration(
                "Availability check step type is no longer supported. "
                "Use date_time step with availability checking enabled instead."
            )
        
        with transaction.atomic():
            config_updaters = {
                'introduction': BookingFlowStepConfigurationService._update_introduction_config,
                'date_time': BookingFlowStepConfigurationService._update_datetime_config,
                'questionnaire': BookingFlowStepConfigurationService._update_questionnaire_config,
                'package_selection': BookingFlowStepConfigurationService._update_package_config,
                'addon_selection': BookingFlowStepConfigurationService._update_addon_config,
                'pricing_summary': BookingFlowStepConfigurationService._update_pricing_summary_config,
                'contact_info': BookingFlowStepConfigurationService._update_contact_config,
                'payment_info': BookingFlowStepConfigurationService._update_payment_config,
                'review_booking': BookingFlowStepConfigurationService._update_review_booking_config,
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
        
        # Prevent operations on removed step types
        if source_step.step_type == 'availability_check' or target_step.step_type == 'availability_check':
            raise InvalidStepConfiguration(
                "Availability check step type is no longer supported. "
                "Use date_time step with availability checking enabled instead."
            )
        
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
    def migrate_availability_check_to_datetime(step_id):
        """Migrate an availability_check step to a date_time step with availability features"""
        try:
            step = BookingFlowStep.objects.get(id=step_id)
        except BookingFlowStep.DoesNotExist:
            raise BookingFlowStepNotFound()
        
        if step.step_type != 'availability_check':
            raise InvalidStepConfiguration("This migration is only for availability_check steps")
        
        with transaction.atomic():
            # Update step type
            step.step_type = 'date_time'
            step.name = step.name.replace('Availability Check', 'Date & Time Selection')
            step.save()
            
            # Create enhanced datetime configuration with availability features
            datetime_config = DateTimeStepConfiguration.objects.create(
                step=step,
                allow_time_selection=True,
                show_calendar_view=True,
                enable_real_time_availability=True,
                show_availability_status=True,
                auto_check_conflicts=True,
                check_venue_availability=True,
                check_resource_availability=True,
                check_staff_availability=True,
                availability_display_mode='FULL',
                allow_overbooking=False,
                overbooking_threshold=0
            )
            
            logger.info(f"Migrated availability_check step to date_time: {step.name}")
            return datetime_config
    
    @staticmethod
    def _create_default_configuration(step):
        """Create default configuration for a step"""
        # Block creation of availability_check configurations
        if step.step_type == 'availability_check':
            raise InvalidStepConfiguration(
                "Availability check step type is no longer supported. "
                "Use date_time step with availability checking enabled instead."
            )
        
        config_creators = {
            'introduction': lambda s: IntroductionStepConfiguration.objects.create(
                step=s,
                title=f"Welcome to {s.booking_flow.event_type.name if s.booking_flow.event_type else 'Event'} Booking",
                content="We're excited to help you plan your perfect event!"
            ),
            'date_time': lambda s: DateTimeStepConfiguration.objects.create(
                step=s,
                enable_real_time_availability=True,
                show_availability_status=True,
                auto_check_conflicts=True
            ),
            'questionnaire': lambda s: QuestionnaireStepConfiguration.objects.create(step=s),
            'package_selection': lambda s: PackageSelectionStepConfiguration.objects.create(step=s),
            'addon_selection': lambda s: AddonSelectionStepConfiguration.objects.create(step=s),
            'pricing_summary': lambda s: PricingSummaryStepConfiguration.objects.create(step=s),
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
    def _update_datetime_config(step, config_data):
        """Update datetime step configuration with enhanced availability features"""
        config, created = DateTimeStepConfiguration.objects.get_or_create(
            step=step,
            defaults={
                'enable_real_time_availability': True,
                'show_availability_status': True,
                'auto_check_conflicts': True
            }
        )
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
        """Update payment info step configuration - FIXED"""
        config, created = PaymentInfoStepConfiguration.objects.get_or_create(step=step)
        
        # Handle many-to-many and foreign key fields separately
        m2m_fields = ['allowed_gateways']
        fk_fields = ['default_gateway']
        
        for key, value in config_data.items():
            if hasattr(config, key):
                if key in m2m_fields:
                    # Handle many-to-many fields - validate IDs exist
                    if key == 'allowed_gateways':
                        try:
                            from core.domains.payments.models import PaymentGateway
                            valid_ids = PaymentGateway.objects.filter(
                                id__in=value, is_active=True
                            ).values_list('id', flat=True)
                            getattr(config, key).set(valid_ids)
                            logger.debug(f"Set allowed_gateways to {list(valid_ids)}")
                        except ImportError:
                            logger.warning("Payment domain not available, skipping gateway validation")
                        except Exception as e:
                            logger.error(f"Error setting allowed_gateways: {e}")
                            # Skip this field if there's an error
                            continue
                
                elif key in fk_fields:
                    # Handle foreign key fields - convert ID to instance
                    if key == 'default_gateway':
                        if value is not None:
                            try:
                                from core.domains.payments.models import PaymentGateway
                                gateway_instance = PaymentGateway.objects.get(
                                    id=value, is_active=True
                                )
                                setattr(config, key, gateway_instance)
                                logger.debug(f"Set default_gateway to {gateway_instance}")
                            except ImportError:
                                logger.warning("Payment domain not available, skipping gateway assignment")
                                continue
                            except PaymentGateway.DoesNotExist:
                                logger.error(f"Payment gateway with ID {value} not found or inactive")
                                # Set to None if gateway doesn't exist
                                setattr(config, key, None)
                            except Exception as e:
                                logger.error(f"Error setting default_gateway: {e}")
                                continue
                        else:
                            # Value is None, set to None
                            setattr(config, key, None)
                            logger.debug("Set default_gateway to None")
                
                else:
                    # Handle regular fields
                    setattr(config, key, value)
        
        try:
            config.save()
            logger.info(f"Successfully updated payment configuration for step: {step.name}")
        except Exception as e:
            logger.error(f"Error saving payment configuration: {e}")
            raise InvalidStepConfiguration(f"Failed to save payment configuration: {str(e)}")
        
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
    
    @staticmethod
    def _update_pricing_summary_config(step, config_data):
        """Update pricing summary step configuration"""
        config, created = PricingSummaryStepConfiguration.objects.get_or_create(step=step)
        for key, value in config_data.items():
            if hasattr(config, key):
                setattr(config, key, value)
        config.save()
        return config
    
    @staticmethod
    def _update_review_booking_config(step, config_data):
        """Update review booking step configuration using generic configuration field"""
        # Since review_booking doesn't have a specific configuration model,
        # we store the configuration in the step's generic configuration JSONField
        step.configuration.update(config_data)
        step.save()
        return step.configuration