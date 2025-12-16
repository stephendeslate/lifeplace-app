# backend/core/domains/contracts/tasks.py
"""
Celery tasks for the Contracts domain.

Handles contract expiry processing and expiry reminder notifications.
"""

import logging
from datetime import datetime, timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=1,
)
def expire_contracts(self):
    """
    Hourly task to mark expired contracts as EXPIRED.

    Finds all contracts with passed valid_until dates that are still
    in SENT or PARTIALLY_SIGNED status, and updates them to EXPIRED.

    Runs via Celery beat schedule.
    """
    from .models import EventContract

    logger.info("Starting contract expiry sweep")

    today = timezone.now().date()
    expired_count = 0
    error_count = 0

    # Find contracts past expiry date that are still pending signatures
    expired_contracts = EventContract.objects.filter(
        valid_until__lt=today,
        status__in=['SENT', 'PARTIALLY_SIGNED']
    )

    total_count = expired_contracts.count()
    logger.info(f"Found {total_count} contracts with expired valid_until dates")

    for contract in expired_contracts:
        try:
            logger.info(f"Marking contract {contract.id} as EXPIRED (valid_until: {contract.valid_until})")
            contract.status = 'EXPIRED'
            contract.save(update_fields=['status', 'updated_at'])
            expired_count += 1
        except Exception as e:
            logger.error(f"Error expiring contract {contract.id}: {e}")
            error_count += 1

    logger.info(
        f"Contract expiry sweep completed: "
        f"{expired_count} expired, {error_count} errors, {total_count} total"
    )

    return {
        'total': total_count,
        'expired': expired_count,
        'errors': error_count,
    }


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_contract_expiry_reminder(self, contract_id: int, days_before_expiry: int = 1):
    """
    Send a reminder notification to the client about approaching contract expiry.

    Args:
        contract_id: ID of the contract
        days_before_expiry: Number of days before expiry this reminder is for
    """
    from .models import EventContract
    from core.domains.notifications.services import NotificationService

    try:
        contract = EventContract.objects.select_related('event', 'event__client').get(id=contract_id)

        # Skip if already expired, signed, or voided
        if contract.status in ['EXPIRED', 'SIGNED', 'VOID', 'AMENDED']:
            logger.info(f"Skipping reminder for contract {contract_id}: status is {contract.status}")
            return {'status': 'skipped', 'reason': f'status_{contract.status.lower()}'}

        if not contract.valid_until:
            logger.warning(f"Contract {contract_id} has no valid_until date set")
            return {'status': 'skipped', 'reason': 'no_expiry_date'}

        # Verify contract is actually expiring soon
        today = timezone.now().date()
        days_remaining = (contract.valid_until - today).days

        if days_remaining < 0:
            logger.info(f"Contract {contract_id} already expired")
            return {'status': 'skipped', 'reason': 'already_expired'}

        # Get client from the event
        client = contract.event.client
        if not client:
            logger.warning(f"Contract {contract_id} event has no client")
            return {'status': 'skipped', 'reason': 'no_client'}

        # Determine urgency for notification
        priority = 'CRITICAL' if days_before_expiry <= 1 else 'HIGH'

        # Format the expiry date nicely
        expiry_formatted = contract.valid_until.strftime("%B %d, %Y")
        event_date_formatted = contract.event.start_date.strftime("%B %d, %Y") if contract.event.start_date else "your event"

        # Send reminder notification
        NotificationService.create_notification(
            recipient=client,
            notification_type='CONTRACT_EXPIRING_SOON',
            title=f'Contract Expires in {days_before_expiry} Day(s)',
            message=(
                f'Your contract for {event_date_formatted} expires on {expiry_formatted}. '
                f'Please sign the contract before it expires to secure your booking.'
            ),
            related_event=contract.event,
            priority=priority,
            channels=['IN_APP', 'EMAIL'],
            data={
                'contract_id': contract.id,
                'days_remaining': days_remaining,
                'valid_until': str(contract.valid_until),
            }
        )

        logger.info(f"Sent expiry reminder for contract {contract_id} ({days_before_expiry} days remaining)")
        return {'status': 'sent', 'contract_id': contract_id, 'days_before': days_before_expiry}

    except EventContract.DoesNotExist:
        logger.warning(f"Contract {contract_id} not found for reminder")
        return {'status': 'error', 'reason': 'contract_not_found'}
    except Exception as e:
        logger.error(f"Error sending reminder for contract {contract_id}: {e}")
        raise  # Let Celery retry


@shared_task(
    bind=True,
    max_retries=1,
)
def schedule_contract_expiry_reminders(self):
    """
    Schedule expiry reminders for contracts with upcoming expiry dates.

    Finds contracts expiring in the next few days and schedules
    reminder notifications. Called daily via Celery beat.
    """
    from .models import EventContract

    logger.info("Scheduling contract expiry reminders")

    today = timezone.now().date()
    scheduled_count = 0

    # Define reminder intervals (days before expiry)
    reminder_days = [7, 3, 1]  # 7 days, 3 days, and 1 day before expiry

    for days in reminder_days:
        # Find contracts expiring in exactly X days
        target_date = today + timedelta(days=days)

        contracts = EventContract.objects.filter(
            valid_until=target_date,
            status__in=['SENT', 'PARTIALLY_SIGNED']
        ).select_related('event')

        for contract in contracts:
            try:
                # Schedule reminder
                send_contract_expiry_reminder.delay(contract.id, days)
                scheduled_count += 1
                logger.info(f"Scheduled {days}-day expiry reminder for contract {contract.id}")
            except Exception as e:
                logger.error(f"Error scheduling reminder for contract {contract.id}: {e}")

    logger.info(f"Scheduled {scheduled_count} contract expiry reminders")
    return {'scheduled': scheduled_count}


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def notify_contract_expired(self, contract_id: int):
    """
    Send notification when a contract has expired.

    Called after a contract is marked as EXPIRED to notify
    the client and relevant admin users.

    Args:
        contract_id: ID of the expired contract
    """
    from .models import EventContract
    from core.domains.notifications.services import NotificationService

    try:
        contract = EventContract.objects.select_related('event', 'event__client').get(id=contract_id)

        if contract.status != 'EXPIRED':
            logger.info(f"Contract {contract_id} is not expired (status: {contract.status})")
            return {'status': 'skipped', 'reason': 'not_expired'}

        client = contract.event.client
        if not client:
            logger.warning(f"Contract {contract_id} event has no client")
            return {'status': 'skipped', 'reason': 'no_client'}

        # Format dates
        expiry_formatted = contract.valid_until.strftime("%B %d, %Y") if contract.valid_until else "N/A"
        event_date_formatted = contract.event.start_date.strftime("%B %d, %Y") if contract.event.start_date else "your event"

        # Send notification to client
        NotificationService.create_notification(
            recipient=client,
            notification_type='CONTRACT_EXPIRED',
            title='Contract Has Expired',
            message=(
                f'The contract for {event_date_formatted} expired on {expiry_formatted}. '
                f'Please contact us if you would like to request a new contract.'
            ),
            related_event=contract.event,
            priority='HIGH',
            channels=['IN_APP', 'EMAIL'],
            data={
                'contract_id': contract.id,
                'valid_until': str(contract.valid_until) if contract.valid_until else None,
            }
        )

        logger.info(f"Sent expiry notification for contract {contract_id}")
        return {'status': 'sent', 'contract_id': contract_id}

    except EventContract.DoesNotExist:
        logger.warning(f"Contract {contract_id} not found for expiry notification")
        return {'status': 'error', 'reason': 'contract_not_found'}
    except Exception as e:
        logger.error(f"Error sending expiry notification for contract {contract_id}: {e}")
        raise
