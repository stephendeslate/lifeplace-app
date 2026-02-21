# backend/core/domains/vip/signals.py
"""
VIP domain signals for automatic tier upgrades and points awarding.
Connects to payment and event signals to track client activity.
"""
import logging
from decimal import Decimal

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import VIPSettings, ClientVIPStatus
from .services import VIPService, VIPPointsService

logger = logging.getLogger(__name__)


@receiver(post_save, sender='payments.Payment')
def handle_payment_completed(sender, instance, created, **kwargs):
    """
    Handle payment completion:
    1. Award VIP points if points system is enabled
    2. Update client's total spent amount
    3. Check for tier upgrade eligibility
    """
    # Only process completed payments
    if instance.status != 'COMPLETED':
        return

    # Get settings
    settings = VIPSettings.get_settings()
    if not settings.is_program_enabled:
        return

    # Get client from payment -> event -> client
    # Check _id fields first to avoid RelatedObjectDoesNotExist on non-nullable FKs
    if not instance.event_id or not instance.event.client_id:
        logger.debug("Payment has no associated event or client, skipping VIP processing")
        return

    client = instance.event.client
    if client.role != 'CLIENT':
        return

    try:
        # Get or create VIP status
        client_status = VIPService.get_or_create_client_status(client)

        # Update total spent
        client_status.total_spent += instance.amount
        client_status.save(update_fields=['total_spent', 'last_activity_at', 'updated_at'])

        logger.info(f"Updated total spent for {client.email}: {client_status.total_spent}")

        # Award points if enabled
        if settings.earning_points_enabled:
            VIPPointsService.award_points_for_payment(instance)

        # Check for tier upgrade if automatic earning is enabled
        if settings.earning_automatic_enabled:
            upgraded = VIPService.upgrade_tier_if_eligible(client_status)
            if upgraded:
                logger.info(f"Client {client.email} was upgraded to {client_status.current_tier.name}")

    except Exception as e:
        logger.error(f"Error processing VIP for payment {instance.id}: {str(e)}")


@receiver(post_save, sender='events.Event')
def handle_event_status_change(sender, instance, created, **kwargs):
    """
    Handle event status changes:
    - When event is COMPLETED, update completed bookings count
    - Check for tier upgrade eligibility
    """
    # Only process completed events
    if instance.status != 'COMPLETED':
        return

    # Get settings
    settings = VIPSettings.get_settings()
    if not settings.is_program_enabled:
        return

    # Get client — check _id to avoid RelatedObjectDoesNotExist
    if not instance.client_id:
        return

    client = instance.client
    if client.role != 'CLIENT':
        return

    try:
        # Get or create VIP status
        client_status = VIPService.get_or_create_client_status(client)

        # Update completed bookings count
        from core.domains.events.models import Event
        completed_count = Event.objects.filter(
            client=client,
            status='COMPLETED'
        ).count()

        client_status.completed_bookings_count = completed_count
        client_status.save(update_fields=['completed_bookings_count', 'last_activity_at', 'updated_at'])

        logger.info(f"Updated completed bookings for {client.email}: {completed_count}")

        # Check for tier upgrade if automatic earning is enabled
        if settings.earning_automatic_enabled:
            upgraded = VIPService.upgrade_tier_if_eligible(client_status)
            if upgraded:
                logger.info(f"Client {client.email} was upgraded to {client_status.current_tier.name}")

    except Exception as e:
        logger.error(f"Error processing VIP for event {instance.id}: {str(e)}")

