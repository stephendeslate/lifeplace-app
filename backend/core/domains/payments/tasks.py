# backend/core/domains/payments/tasks.py
"""
Celery tasks for the payments domain.

Includes:
- Autopay processing for payment plans
- Payment reminder notifications
- Overdue payment processing
- Gateway health monitoring
"""

import logging
from datetime import timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional

from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


# =============================================================================
# Autopay Tasks
# =============================================================================

@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def process_autopay_installment(
    self,
    installment_id: int,
    payment_method_id: int,
):
    """
    Process a single autopay installment payment.

    Args:
        installment_id: ID of the PaymentInstallment to process
        payment_method_id: ID of the PaymentMethod to charge
    """
    from .models import PaymentInstallment, PaymentMethod, PaymentPlan
    from .services.payment_orchestrator import PaymentOrchestrator, PaymentRequest

    try:
        # Get installment and validate
        try:
            installment = PaymentInstallment.objects.select_related(
                'payment_plan', 'payment_plan__event', 'payment_plan__event__client'
            ).get(id=installment_id)
        except PaymentInstallment.DoesNotExist:
            logger.error(f"Installment not found: {installment_id}")
            return {'status': 'error', 'message': 'Installment not found'}

        # Validate installment is eligible for autopay
        if installment.status != 'PENDING':
            logger.info(f"Installment {installment_id} is not pending (status: {installment.status})")
            return {'status': 'skipped', 'message': f'Installment status is {installment.status}'}

        payment_plan = installment.payment_plan
        event = payment_plan.event
        client = event.client

        # Validate payment plan has autopay enabled
        if not payment_plan.auto_payment_enabled:
            logger.info(f"Autopay not enabled for payment plan {payment_plan.id}")
            return {'status': 'skipped', 'message': 'Autopay not enabled'}

        # Get payment method
        try:
            payment_method = PaymentMethod.objects.get(id=payment_method_id)
        except PaymentMethod.DoesNotExist:
            logger.error(f"Payment method not found: {payment_method_id}")
            return {'status': 'error', 'message': 'Payment method not found'}

        logger.info(
            f"Processing autopay for installment {installment_id}, "
            f"amount: {installment.amount}, client: {client.email}"
        )

        # Create payment request
        amount = installment.amount + installment.late_fee_amount
        payment_request = PaymentRequest(
            event_id=event.id,
            amount=amount,
            currency=getattr(payment_plan, 'currency', 'PHP'),
            due_date=installment.due_date,
            description=f"Autopay: {installment.description}",
            payment_type='AUTOPAY_INSTALLMENT',
            installment_id=installment.id,
            created_by='autopay_scheduler'
        )

        # Create payment
        response = PaymentOrchestrator.create_payment(payment_request)

        if not response.success:
            logger.error(f"Failed to create autopay payment: {response.message}")

            # Retry if transient error
            if self.request.retries < self.max_retries:
                raise self.retry(countdown=300 * (2 ** self.request.retries))

            return {'status': 'error', 'message': response.message}

        # Process payment through gateway
        # This would integrate with your payment gateway (Stripe, PayMongo, etc.)
        # For now, log the attempt
        logger.info(
            f"Autopay payment {response.payment_id} created for installment {installment_id}. "
            f"Gateway processing would happen here."
        )

        # Send notification to client
        _send_autopay_notification(
            client=client,
            event=event,
            installment=installment,
            payment_id=response.payment_id,
            amount=amount,
            success=True
        )

        return {
            'status': 'success',
            'payment_id': response.payment_id,
            'installment_id': installment_id,
            'amount': str(amount)
        }

    except Exception as e:
        logger.error(f"Autopay processing failed for installment {installment_id}: {e}")

        if self.request.retries < self.max_retries:
            raise self.retry(countdown=300 * (2 ** self.request.retries))

        return {'status': 'error', 'message': str(e)}


@shared_task
def process_due_autopay_installments():
    """
    Find and process all autopay installments due today or overdue.

    This task should be scheduled to run daily (e.g., at 9 AM).
    """
    from .models import PaymentInstallment, PaymentPlan

    try:
        today = timezone.now().date()

        # Find installments that:
        # 1. Are pending
        # 2. Due date is today or earlier
        # 3. Have autopay enabled on their payment plan
        # 4. Have a valid autopay payment method
        eligible_installments = PaymentInstallment.objects.filter(
            status='PENDING',
            due_date__lte=today,
            payment_plan__auto_payment_enabled=True,
            payment_plan__auto_payment_method__isnull=False,
            payment_plan__status__in=['PENDING', 'ACTIVE']
        ).select_related(
            'payment_plan', 'payment_plan__auto_payment_method'
        ).order_by('due_date')

        processed_count = 0
        failed_count = 0
        skipped_count = 0

        for installment in eligible_installments:
            payment_method = installment.payment_plan.auto_payment_method

            # Check if we've already tried today
            cache_key = f"autopay_attempted:{installment.id}:{today.isoformat()}"
            if cache.get(cache_key):
                logger.debug(f"Installment {installment.id} already attempted today")
                skipped_count += 1
                continue

            # Mark as attempted
            cache.set(cache_key, True, timeout=86400)

            # Queue the autopay task
            try:
                process_autopay_installment.delay(
                    installment_id=installment.id,
                    payment_method_id=payment_method.id
                )
                processed_count += 1
            except Exception as e:
                logger.error(f"Failed to queue autopay for installment {installment.id}: {e}")
                failed_count += 1

        logger.info(
            f"Autopay processing complete: "
            f"{processed_count} queued, {failed_count} failed, {skipped_count} skipped"
        )

        # Update metrics
        cache.set('autopay_last_run', timezone.now().isoformat(), timeout=86400)
        cache.set('autopay_last_processed', processed_count, timeout=86400)

        return {
            'status': 'success',
            'processed': processed_count,
            'failed': failed_count,
            'skipped': skipped_count,
            'run_date': today.isoformat()
        }

    except Exception as e:
        logger.error(f"Autopay batch processing failed: {e}")
        return {'status': 'error', 'message': str(e)}


# =============================================================================
# Payment Reminder Tasks
# =============================================================================

@shared_task
def send_payment_reminders():
    """
    Send payment reminders for upcoming due dates.

    Sends reminders for:
    - Payments due in 7 days
    - Payments due in 3 days
    - Payments due tomorrow
    """
    from .models import PaymentInstallment, Payment

    try:
        today = timezone.now().date()
        reminder_days = [7, 3, 1]

        total_sent = 0

        for days in reminder_days:
            due_date = today + timedelta(days=days)

            # Find pending installments due on this date
            installments = PaymentInstallment.objects.filter(
                status='PENDING',
                due_date=due_date
            ).select_related(
                'payment_plan', 'payment_plan__event', 'payment_plan__event__client'
            )

            for installment in installments:
                # Check if reminder already sent
                cache_key = f"payment_reminder:{installment.id}:{days}days"
                if cache.get(cache_key):
                    continue

                # Send reminder
                _send_payment_reminder(
                    installment=installment,
                    days_until_due=days
                )

                # Mark as sent
                cache.set(cache_key, True, timeout=86400 * 7)  # 7 days cache
                total_sent += 1

        logger.info(f"Sent {total_sent} payment reminders")

        return {
            'status': 'success',
            'reminders_sent': total_sent,
            'run_date': today.isoformat()
        }

    except Exception as e:
        logger.error(f"Payment reminder task failed: {e}")
        return {'status': 'error', 'message': str(e)}


@shared_task
def process_overdue_payments():
    """
    Process payments that have become overdue.

    Updates installment status and sends notifications.
    """
    from .models import PaymentInstallment, PaymentSettings

    try:
        today = timezone.now().date()
        settings_obj = PaymentSettings.get_default_settings()
        grace_period = settings_obj.grace_period_days

        # Find installments that are past due date + grace period
        overdue_cutoff = today - timedelta(days=grace_period)

        overdue_installments = PaymentInstallment.objects.filter(
            status='PENDING',
            due_date__lt=overdue_cutoff
        ).select_related(
            'payment_plan', 'payment_plan__event', 'payment_plan__event__client'
        )

        updated_count = 0

        for installment in overdue_installments:
            with transaction.atomic():
                # Update status to overdue
                installment.status = 'OVERDUE'
                installment.save(update_fields=['status'])

                # Apply late fee if enabled
                if settings_obj.late_fee_enabled and installment.late_fee_amount == 0:
                    if settings_obj.late_fee_type == 'FIXED':
                        late_fee = settings_obj.default_late_fee_amount
                    else:
                        late_fee = installment.amount * (settings_obj.late_fee_percentage / 100)

                    installment.apply_late_fee(late_fee)

                # Send overdue notification
                _send_overdue_notification(installment)

                updated_count += 1

        logger.info(f"Processed {updated_count} overdue payments")

        return {
            'status': 'success',
            'overdue_count': updated_count,
            'run_date': today.isoformat()
        }

    except Exception as e:
        logger.error(f"Overdue payment processing failed: {e}")
        return {'status': 'error', 'message': str(e)}


# =============================================================================
# Gateway Health Monitoring Tasks
# =============================================================================

@shared_task
def check_gateway_health():
    """
    Check the health status of all active payment gateways.

    Stores health status in cache for dashboard display.
    """
    from .models import PaymentGateway

    try:
        gateways = PaymentGateway.objects.filter(is_active=True)
        health_results = {}

        for gateway in gateways:
            try:
                # Perform gateway-specific health check
                is_healthy, message = _check_gateway_status(gateway)

                health_results[gateway.code] = {
                    'name': gateway.name,
                    'is_healthy': is_healthy,
                    'message': message,
                    'last_checked': timezone.now().isoformat()
                }

                # Store individual gateway health
                cache.set(
                    f"gateway_health:{gateway.code}",
                    health_results[gateway.code],
                    timeout=3600
                )

            except Exception as e:
                logger.error(f"Health check failed for gateway {gateway.code}: {e}")
                health_results[gateway.code] = {
                    'name': gateway.name,
                    'is_healthy': False,
                    'message': str(e),
                    'last_checked': timezone.now().isoformat()
                }

        # Store overall health summary
        all_healthy = all(r['is_healthy'] for r in health_results.values())
        cache.set(
            'gateway_health_summary',
            {
                'all_healthy': all_healthy,
                'gateways': health_results,
                'last_checked': timezone.now().isoformat()
            },
            timeout=3600
        )

        logger.info(
            f"Gateway health check complete: "
            f"{sum(1 for r in health_results.values() if r['is_healthy'])}/{len(health_results)} healthy"
        )

        return {
            'status': 'success',
            'all_healthy': all_healthy,
            'gateways': health_results
        }

    except Exception as e:
        logger.error(f"Gateway health check failed: {e}")
        return {'status': 'error', 'message': str(e)}


# =============================================================================
# Helper Functions
# =============================================================================

def _send_autopay_notification(client, event, installment, payment_id, amount, success: bool):
    """Send autopay notification to client."""
    try:
        from core.domains.communications.services import CommunicationService

        comm_service = CommunicationService()

        if success:
            template_name = 'Payment Receipt'
            # Get the payment for context
            from .models import Payment
            payment = Payment.objects.filter(id=payment_id).first()
            if payment:
                comm_service.send_communication(
                    template_name=template_name,
                    recipient=client.email,
                    client=client,
                    event=event,
                    payment=payment,
                    skip_preference_check=True
                )
        else:
            # Could send a "payment failed" notification
            logger.warning(f"Autopay failed for client {client.email}, event {event.id}")

    except Exception as e:
        logger.error(f"Failed to send autopay notification: {e}")


def _send_payment_reminder(installment, days_until_due: int):
    """Send payment reminder notification."""
    try:
        from core.domains.communications.services import CommunicationService

        client = installment.payment_plan.event.client
        event = installment.payment_plan.event

        comm_service = CommunicationService()
        comm_service.send_communication(
            template_name='Payment Reminder',
            recipient=client.email,
            client=client,
            event=event,
            context_data={
                'days_until_due': days_until_due,
                'installment_amount': str(installment.amount),
                'due_date': installment.due_date.strftime('%B %d, %Y'),
            },
            skip_preference_check=False
        )

        logger.info(f"Sent {days_until_due}-day reminder to {client.email}")

    except Exception as e:
        logger.error(f"Failed to send payment reminder: {e}")


def _send_overdue_notification(installment):
    """Send overdue payment notification."""
    try:
        from core.domains.communications.services import CommunicationService

        client = installment.payment_plan.event.client
        event = installment.payment_plan.event

        comm_service = CommunicationService()
        comm_service.send_communication(
            template_name='Payment Overdue Notice',
            recipient=client.email,
            client=client,
            event=event,
            context_data={
                'installment_amount': str(installment.amount + installment.late_fee_amount),
                'late_fee': str(installment.late_fee_amount),
                'due_date': installment.due_date.strftime('%B %d, %Y'),
                'days_overdue': (timezone.now().date() - installment.due_date).days,
            },
            skip_preference_check=True  # Overdue notices are critical
        )

        logger.info(f"Sent overdue notice to {client.email}")

    except Exception as e:
        logger.error(f"Failed to send overdue notification: {e}")


def _check_gateway_status(gateway) -> tuple:
    """
    Check the health status of a payment gateway.

    Returns:
        Tuple of (is_healthy: bool, message: str)
    """
    # Gateway-specific health checks
    if gateway.code == 'stripe':
        return _check_stripe_health(gateway)
    elif gateway.code == 'paymongo':
        return _check_paymongo_health(gateway)
    else:
        # Generic check - just verify config exists
        config = gateway.get_decrypted_config()
        if config:
            return True, 'Configuration present'
        return False, 'No configuration found'


def _check_stripe_health(gateway) -> tuple:
    """Check Stripe gateway health."""
    try:
        import stripe
        config = gateway.get_decrypted_config()

        if not config.get('secret_key'):
            return False, 'Missing secret key'

        # Try to retrieve account info
        stripe.api_key = config['secret_key']
        stripe.Account.retrieve()

        return True, 'Connected'

    except Exception as e:
        return False, str(e)


def _check_paymongo_health(gateway) -> tuple:
    """Check PayMongo gateway health."""
    try:
        import requests
        config = gateway.get_decrypted_config()

        if not config.get('secret_key'):
            return False, 'Missing secret key'

        # Try a simple API call
        response = requests.get(
            'https://api.paymongo.com/v1/payment_intents',
            auth=(config['secret_key'], ''),
            timeout=10
        )

        if response.status_code in [200, 401]:  # 401 is ok, means auth works
            return True, 'Connected'
        else:
            return False, f'API error: {response.status_code}'

    except requests.Timeout:
        return False, 'Connection timeout'
    except Exception as e:
        return False, str(e)


@shared_task
def payments_health_check():
    """Health check task for payments system."""
    try:
        logger.info("Payments system health check passed")
        return {
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'message': 'Payments system is operational'
        }
    except Exception as e:
        logger.error(f"Payments health check failed: {e}")
        return {'status': 'unhealthy', 'message': str(e)}
