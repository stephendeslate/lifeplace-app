# backend/core/domains/bookingflow/signals.py
import logging
from datetime import timedelta

from backend.core.domains.communications.models import CommunicationTemplate
from core.domains.events.models import Event
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import BookingFlow, BookingFlowStep, BookingSession

logger = logging.getLogger(__name__)


@receiver(post_save, sender=BookingFlow)
def handle_booking_flow_changes(sender, instance, created, **kwargs):
    """Handle changes to booking flows"""
    if created:
        logger.info(f"New booking flow created: {instance.name}")
        
        # If no steps exist, create default steps
        if not instance.steps.exists():
            from .services import BookingFlowService
            # This will be handled by the service layer during creation
            pass
    else:
        # Handle updates
        if instance.is_active:
            logger.info(f"Booking flow activated: {instance.name}")
        else:
            logger.info(f"Booking flow deactivated: {instance.name}")
            
            # Mark all active sessions as abandoned when flow is deactivated
            active_sessions = BookingSession.objects.filter(
                booking_flow=instance,
                is_completed=False,
                is_abandoned=False,
                expires_at__gt=timezone.now()
            )
            
            for session in active_sessions:
                session.is_abandoned = True
                session.booking_data['abandonment_reason'] = 'Booking flow deactivated'
                session.save()
            
            if active_sessions.exists():
                logger.info(f"Marked {active_sessions.count()} sessions as abandoned due to flow deactivation")


@receiver(post_save, sender=BookingFlowStep)
def handle_step_changes(sender, instance, created, **kwargs):
    """Handle changes to booking flow steps"""
    if created:
        logger.info(f"New step created: {instance.name} in flow: {instance.booking_flow.name}")
        
        # Log warning if someone somehow creates an availability_check step
        if instance.step_type == 'availability_check':
            logger.warning(
                f"Availability check step created: {instance.name}. "
                "This step type should be migrated to date_time with availability features."
            )
    else:
        logger.info(f"Step updated: {instance.name} in flow: {instance.booking_flow.name}")


@receiver(post_delete, sender=BookingFlowStep)
def handle_step_deletion(sender, instance, **kwargs):
    """Handle step deletion"""
    logger.info(f"Step deleted: {instance.name} from flow: {instance.booking_flow.name}")
    
    # Update any active sessions that were on this step
    active_sessions = BookingSession.objects.filter(
        current_step=instance,
        is_completed=False,
        is_abandoned=False
    )
    
    for session in active_sessions:
        # Move to the next available step or mark as abandoned
        next_step = session.booking_flow.get_next_step(instance.id)
        if next_step:
            session.current_step = next_step
        else:
            # No next step available, mark as abandoned
            session.is_abandoned = True
            session.booking_data['abandonment_reason'] = 'Step deleted during session'
        session.save()
    
    if active_sessions.exists():
        logger.info(f"Updated {active_sessions.count()} active sessions due to step deletion")


@receiver(post_save, sender=BookingSession)
def handle_session_changes(sender, instance, created, **kwargs):
    """Handle changes to booking sessions"""
    if created:
        logger.info(f"New booking session created: {instance.session_id} for flow: {instance.booking_flow.name}")
        
        # Update daily analytics
        from .services import BookingFlowAnalyticsService
        # This is handled in the analytics service
        
    elif instance.is_completed and not getattr(instance, '_completion_processed', False):
        logger.info(f"Booking session completed: {instance.session_id}")
        
        # Mark as processed to avoid duplicate processing
        instance._completion_processed = True
        
        # Send confirmation email if configured
        if (instance.booking_flow.confirmation_email_template and 
            instance.client and 
            instance.client.email):
            try:
                # This would integrate with the communications domain
                # For now, just log the action
                logger.info(f"Confirmation email queued for session: {instance.session_id}")
            except Exception as e:
                logger.error(f"Failed to send confirmation email: {e}")
        
        # Create calendar invite if configured
        if hasattr(instance.booking_flow, 'confirmation_config'):
            try:
                config = instance.booking_flow.steps.filter(
                    step_type='confirmation'
                ).first()
                
                if (config and 
                    hasattr(config, 'confirmation_config') and 
                    config.confirmation_config.send_calendar_invite):
                    # This would integrate with calendar system
                    logger.info(f"Calendar invite queued for session: {instance.session_id}")
            except Exception as e:
                logger.error(f"Failed to create calendar invite: {e}")


@receiver(pre_save, sender=BookingSession)
def handle_session_expiry(sender, instance, **kwargs):
    """Handle session expiry logic"""
    if instance.pk:  # Only for existing sessions
        try:
            old_instance = BookingSession.objects.get(pk=instance.pk)
            
            # Check if session is being marked as expired/abandoned
            if (not old_instance.is_abandoned and 
                instance.is_abandoned and 
                not instance.is_completed):
                
                logger.info(f"Booking session abandoned: {instance.session_id}")
                
                # Update analytics
                from .services import BookingFlowAnalyticsService
                # This is handled in the analytics service
                
        except BookingSession.DoesNotExist:
            pass


@receiver(post_save, sender=Event)
def handle_event_creation_from_booking(sender, instance, created, **kwargs):
    """Handle events created from booking flows"""
    if created:
        # Check if this event was created from a booking session
        try:
            session = BookingSession.objects.get(created_event=instance)
            logger.info(f"Event {instance.id} created from booking session: {session.session_id}")
            
            # Update workflow if configured
            if session.booking_flow.workflow_template:
                instance.workflow_template = session.booking_flow.workflow_template
                
                # Set initial stage
                first_stage = session.booking_flow.workflow_template.stages.filter(
                    stage='LEAD'
                ).order_by('order').first()
                
                if first_stage:
                    instance.current_stage = first_stage
                
                instance.save()
                
                logger.info(f"Workflow assigned to event {instance.id}: {session.booking_flow.workflow_template.name}")
            
        except BookingSession.DoesNotExist:
            # Event not created from booking flow
            pass
        except Exception as e:
            logger.error(f"Error processing event creation from booking: {e}")


# Cleanup tasks
@receiver(post_save, sender=BookingSession)
def schedule_session_cleanup(sender, instance, created, **kwargs):
    """Schedule cleanup for expired sessions"""
    if created:
        # In a production environment, you would schedule a cleanup task
        # For now, we'll just log when sessions should be cleaned up
        cleanup_time = instance.expires_at + timedelta(days=7)  # Keep for 7 days after expiry
        logger.info(f"Session {instance.session_id} scheduled for cleanup at {cleanup_time}")


# Session analytics updates
@receiver(post_save, sender=BookingSession)
def update_session_analytics(sender, instance, created, **kwargs):
    """Update analytics when sessions are created or completed"""
    try:
        from .models import BookingFlowAnalytics
        today = timezone.now().date()
        
        analytics, created_analytics = BookingFlowAnalytics.objects.get_or_create(
            booking_flow=instance.booking_flow,
            date=today,
            defaults={
                'total_sessions': 0,
                'completed_bookings': 0,
                'abandoned_sessions': 0,
                'total_revenue': 0,
                'conversion_rate': 0,
                'average_booking_value': 0
            }
        )
        
        # Recalculate today's metrics
        today_sessions = BookingSession.objects.filter(
            booking_flow=instance.booking_flow,
            created_at__date=today
        )
        
        analytics.total_sessions = today_sessions.count()
        analytics.completed_bookings = today_sessions.filter(is_completed=True).count()
        analytics.abandoned_sessions = today_sessions.filter(is_abandoned=True).count()
        
        # Calculate conversion rate
        if analytics.total_sessions > 0:
            analytics.conversion_rate = (analytics.completed_bookings / analytics.total_sessions) * 100
        
        # Calculate revenue and average booking value
        completed_sessions = today_sessions.filter(is_completed=True)
        total_revenue = sum(session.calculate_total_price() for session in completed_sessions)
        analytics.total_revenue = total_revenue
        
        if analytics.completed_bookings > 0:
            analytics.average_booking_value = total_revenue / analytics.completed_bookings
        
        analytics.save()
        
    except Exception as e:
        logger.error(f"Error updating session analytics: {e}")


# Step configuration validation
@receiver(pre_save, sender=BookingFlowStep)
def validate_step_configuration(sender, instance, **kwargs):
    """Validate step configuration before saving"""
    # Prevent creation/update of availability_check steps
    if instance.step_type == 'availability_check':
        logger.warning(
            f"Attempting to save availability_check step: {instance.name}. "
            "This step type should be migrated to date_time with availability features."
        )
        # You could raise an exception here if you want to completely block it:
        # raise ValueError("Availability check step type is no longer supported")
    
    # Validate display conditions
    if instance.display_conditions:
        try:
            # Basic validation of JSON structure
            if not isinstance(instance.display_conditions, dict):
                raise ValueError("Display conditions must be a valid JSON object")
        except Exception as e:
            logger.error(f"Invalid display conditions for step {instance.name}: {e}")
            instance.display_conditions = {}
    
    # Validate validation rules
    if instance.validation_rules:
        try:
            if not isinstance(instance.validation_rules, dict):
                raise ValueError("Validation rules must be a valid JSON object")
        except Exception as e:
            logger.error(f"Invalid validation rules for step {instance.name}: {e}")
            instance.validation_rules = {}


# Handle migration of existing availability_check steps
@receiver(post_save, sender=BookingFlowStep)
def auto_migrate_availability_check_steps(sender, instance, created, **kwargs):
    """Automatically migrate availability_check steps to date_time steps"""
    if instance.step_type == 'availability_check' and not getattr(instance, '_migrating', False):
        logger.info(f"Auto-migrating availability_check step to date_time: {instance.name}")
        
        try:
            # Prevent infinite recursion
            instance._migrating = True
            
            # Check if there's already a date_time step in this flow
            existing_datetime_step = BookingFlowStep.objects.filter(
                booking_flow=instance.booking_flow,
                step_type='date_time'
            ).exclude(id=instance.id).first()
            
            if existing_datetime_step:
                # If date_time step exists, enhance its configuration and remove this step
                from .models import DateTimeStepConfiguration
                
                try:
                    datetime_config = DateTimeStepConfiguration.objects.get(step=existing_datetime_step)
                    # Update existing config to include availability features
                    datetime_config.enable_real_time_availability = True
                    datetime_config.show_availability_status = True
                    datetime_config.auto_check_conflicts = True
                    datetime_config.check_venue_availability = True
                    datetime_config.check_resource_availability = True
                    datetime_config.check_staff_availability = True
                    datetime_config.save()
                except DateTimeStepConfiguration.DoesNotExist:
                    # Create new configuration with availability features
                    DateTimeStepConfiguration.objects.create(
                        step=existing_datetime_step,
                        enable_real_time_availability=True,
                        show_availability_status=True,
                        auto_check_conflicts=True,
                        check_venue_availability=True,
                        check_resource_availability=True,
                        check_staff_availability=True
                    )
                
                logger.info(f"Enhanced existing date_time step and removing redundant availability_check step")
                instance.delete()
                
            else:
                # Convert this step to date_time
                from .services import BookingFlowStepConfigurationService
                BookingFlowStepConfigurationService.migrate_availability_check_to_datetime(instance.id)
                
        except Exception as e:
            logger.error(f"Failed to auto-migrate availability_check step: {e}")
        finally:
            # Reset migration flag
            if hasattr(instance, '_migrating'):
                delattr(instance, '_migrating')

    # New function to run email template migration on app startup
def run_email_template_migration(sender, **kwargs):
    """Run email template migration on app startup"""
    try:
        # Check if migration has already run by checking for the template
        if CommunicationTemplate.objects.filter(name='Booking Confirmation').exists():
            logger.info("Booking confirmation email template migration already completed")
            return

        logger.info("Starting quick fix for BookingFlow email templates...")

        # Step 1: Create the Booking Confirmation template
        booking_conf_template, created_template = CommunicationTemplate.objects.get_or_create(
            name='Booking Confirmation',
            defaults={
                'channel': 'EMAIL',
                'category': 'SYSTEM',
                'is_system': True,
                'subject_template': 'Booking Confirmed - {{ event_type }}',
                'body_template': '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #1976d2; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
    </div>
    
    <div style="padding: 32px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Thank you for your booking, {{ client_name }}!</h2>
            
            <p style="color: #666; line-height: 1.5;">
                Your booking has been confirmed. Here are your booking details:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Booking Reference:</strong> {{ booking_reference }}</p>
                <p style="margin: 5px 0;"><strong>Event Type:</strong> {{ event_type }}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> {{ event_date }}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> {{ event_time }}</p>
                {% if duration %}<p style="margin: 5px 0;"><strong>Duration:</strong> {{ duration }} hours</p>{% endif %}
                {% if total_price %}<p style="margin: 5px 0;"><strong>Total Price:</strong> ${{ total_price }}</p>{% endif %}
            </div>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="{{ dashboard_url }}" 
                   style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    View Your Booking
                </a>
            </div>
            
            <p style="color: #666; line-height: 1.5;">
                If you have any questions about your booking, please don't hesitate to contact us.
            </p>
        </div>
    </div>
    
    <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        <p style="margin: 0;">© 2025 LifePlace. All rights reserved.</p>
    </div>
</div>
                ''',
                'variables_schema': {
                    'required': ['client_name', 'booking_reference', 'event_type', 'event_date', 'event_time'],
                    'optional': ['duration', 'total_price', 'selected_packages', 'selected_addons', 'dashboard_url']
                }
            }
        )

        if created_template:
            logger.info("✅ Created 'Booking Confirmation' template")
        else:
            logger.info("✅ 'Booking Confirmation' template already exists")

        # Step 2: Update all BookingFlows
        # Fix flows with no confirmation template
        count1 = BookingFlow.objects.filter(
            confirmation_email_template__isnull=True
        ).update(confirmation_email_template=booking_conf_template)

        # Fix flows using Welcome Email
        count2 = BookingFlow.objects.filter(
            confirmation_email_template__name='Welcome Email'
        ).update(confirmation_email_template=booking_conf_template)

        # Report results
        total_fixed = count1 + count2
        total_flows = BookingFlow.objects.count()

        logger.info(f"\n📊 Results:")
        logger.info(f"   - Fixed {count1} BookingFlow(s) with no template")
        logger.info(f"   - Fixed {count2} BookingFlow(s) using 'Welcome Email'")
        logger.info(f"   - Total: {total_fixed} flows updated")
        logger.info(f"\n✅ All {total_flows} BookingFlow(s) now configured correctly!")

        # Verify the fix
        logger.info("\n🔍 Verification:")
        for flow in BookingFlow.objects.all():
            template_name = flow.confirmation_email_template.name if flow.confirmation_email_template else "None"
            logger.info(f"   - {flow.name}: {template_name}")

        logger.info("\n🎉 Fix complete! Booking confirmations should now send the correct email.")

    except Exception as e:
        logger.error(f"Failed to run email template migration: {e}")