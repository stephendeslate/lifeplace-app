# backend/core/domains/payments/tasks.py
"""
Celery tasks for the payments domain.

Includes:
- Gateway health monitoring
- Webhook retry with exponential backoff
- Orphaned payment detection
- Payment reconciliation
"""

import logging
import random
from datetime import timedelta
from typing import Dict, Any, List

from celery import shared_task
from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

logger = logging.getLogger(__name__)


# =============================================================================
# Constants
# =============================================================================

# Maximum number of webhook retry attempts before moving to dead letter
MAX_WEBHOOK_RETRIES = 5

# Base delay for exponential backoff (in seconds)
WEBHOOK_RETRY_BASE_DELAY = 60  # 1 minute

# Maximum delay between retries (in seconds)
WEBHOOK_RETRY_MAX_DELAY = 3600  # 1 hour

# Jitter factor (0.0 to 1.0) - adds randomness to prevent thundering herd
WEBHOOK_RETRY_JITTER = 0.3


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
# Webhook Retry Tasks
# =============================================================================

@shared_task(bind=True, max_retries=MAX_WEBHOOK_RETRIES)
def retry_failed_webhook(self, webhook_log_id: int):
    """
    Retry a single failed webhook with exponential backoff.

    Uses Celery's built-in retry mechanism with exponential backoff
    and jitter to prevent thundering herd.

    Args:
        webhook_log_id: ID of the PaymentWebhookLog to retry
    """
    from .models import PaymentWebhookLog, WebhookDeadLetter
    from .services.unified_webhook_processor import UnifiedWebhookProcessor, WebhookEvent

    try:
        webhook_log = PaymentWebhookLog.objects.get(id=webhook_log_id)

        # Check if already processed successfully
        if webhook_log.processed_successfully:
            logger.info(f"Webhook {webhook_log_id} already processed successfully, skipping retry")
            return {'status': 'already_processed', 'webhook_id': webhook_log_id}

        # Check if max retries exceeded
        if webhook_log.retry_count >= MAX_WEBHOOK_RETRIES:
            logger.warning(f"Webhook {webhook_log_id} exceeded max retries, moving to dead letter")
            _move_to_dead_letter(webhook_log)
            return {'status': 'moved_to_dead_letter', 'webhook_id': webhook_log_id}

        # Reconstruct webhook event from stored data
        webhook_event = WebhookEvent(
            gateway_code=webhook_log.gateway_code,
            event_type=webhook_log.event_type,
            event_id=webhook_log.event_id,
            transaction_id=webhook_log.transaction_id,
            raw_data=webhook_log.raw_data
        )

        # Get the appropriate handler
        handler = UnifiedWebhookProcessor._get_handler(webhook_log.gateway_code)
        if not handler:
            logger.error(f"No handler found for gateway: {webhook_log.gateway_code}")
            _move_to_dead_letter(webhook_log, error="No handler found for gateway")
            return {'status': 'no_handler', 'webhook_id': webhook_log_id}

        # Process the webhook
        result = handler.process_webhook_event(webhook_event)

        # Update the webhook log
        webhook_log.retry_count += 1
        if result.success:
            webhook_log.mark_processed(success=True, action=result.action_taken)
            logger.info(f"Webhook {webhook_log_id} retry successful on attempt {webhook_log.retry_count}")
            return {
                'status': 'success',
                'webhook_id': webhook_log_id,
                'attempt': webhook_log.retry_count
            }
        else:
            webhook_log.mark_processed(success=False, error=result.message)
            webhook_log.save()

            # Calculate delay with exponential backoff and jitter
            delay = _calculate_retry_delay(webhook_log.retry_count)
            logger.warning(
                f"Webhook {webhook_log_id} retry failed on attempt {webhook_log.retry_count}, "
                f"scheduling retry in {delay}s"
            )

            # Schedule next retry
            raise self.retry(countdown=delay, exc=Exception(result.message))

    except PaymentWebhookLog.DoesNotExist:
        logger.error(f"Webhook log {webhook_log_id} not found")
        return {'status': 'not_found', 'webhook_id': webhook_log_id}

    except self.MaxRetriesExceededError:
        logger.error(f"Webhook {webhook_log_id} max retries exceeded")
        try:
            webhook_log = PaymentWebhookLog.objects.get(id=webhook_log_id)
            _move_to_dead_letter(webhook_log, error="Max retries exceeded")
        except PaymentWebhookLog.DoesNotExist:
            pass
        return {'status': 'max_retries_exceeded', 'webhook_id': webhook_log_id}

    except Exception as e:
        logger.error(f"Error retrying webhook {webhook_log_id}: {e}")
        raise


@shared_task
def process_failed_webhooks():
    """
    Find and queue failed webhooks for retry.

    This task runs periodically to find failed webhooks that haven't
    exceeded their retry limit and queue them for processing.
    """
    from .models import PaymentWebhookLog

    try:
        # Find failed webhooks from the last 24 hours that haven't exceeded retry limit
        cutoff_time = timezone.now() - timedelta(hours=24)

        failed_webhooks = PaymentWebhookLog.objects.filter(
            processed_successfully=False,
            retry_count__lt=MAX_WEBHOOK_RETRIES,
            received_at__gte=cutoff_time
        ).exclude(
            # Exclude webhooks that are currently being processed
            # (have processed_at set recently)
            processed_at__gte=timezone.now() - timedelta(minutes=5)
        ).order_by('retry_count', 'received_at')[:50]  # Process max 50 at a time

        queued_count = 0
        for webhook_log in failed_webhooks:
            # Calculate delay based on retry count
            delay = _calculate_retry_delay(webhook_log.retry_count)

            # Queue the retry task
            retry_failed_webhook.apply_async(
                args=[webhook_log.id],
                countdown=delay
            )
            queued_count += 1

        logger.info(f"Queued {queued_count} failed webhooks for retry")
        return {
            'status': 'success',
            'queued_count': queued_count
        }

    except Exception as e:
        logger.error(f"Error processing failed webhooks: {e}")
        return {'status': 'error', 'message': str(e)}


def _calculate_retry_delay(retry_count: int) -> int:
    """
    Calculate delay for retry with exponential backoff and jitter.

    Uses exponential backoff: delay = base_delay * 2^(retry_count - 1)
    Adds jitter to prevent thundering herd.

    Args:
        retry_count: Current retry attempt number (1-indexed)

    Returns:
        Delay in seconds
    """
    # Exponential backoff
    base_delay = WEBHOOK_RETRY_BASE_DELAY * (2 ** max(0, retry_count - 1))

    # Cap at maximum delay
    base_delay = min(base_delay, WEBHOOK_RETRY_MAX_DELAY)

    # Add jitter (random value between -jitter% and +jitter%)
    jitter_range = base_delay * WEBHOOK_RETRY_JITTER
    jitter = random.uniform(-jitter_range, jitter_range)

    delay = int(base_delay + jitter)

    # Ensure minimum delay of 10 seconds
    return max(10, delay)


def _move_to_dead_letter(webhook_log, error: str = None):
    """
    Move a permanently failed webhook to the dead letter queue.

    Args:
        webhook_log: PaymentWebhookLog instance
        error: Optional error message
    """
    from .models import WebhookDeadLetter

    try:
        WebhookDeadLetter.objects.create(
            original_webhook=webhook_log,
            gateway_code=webhook_log.gateway_code,
            event_type=webhook_log.event_type,
            event_id=webhook_log.event_id,
            transaction_id=webhook_log.transaction_id,
            raw_data=webhook_log.raw_data,
            original_received_at=webhook_log.received_at,
            retry_count=webhook_log.retry_count,
            final_error=error or webhook_log.error_message,
        )

        logger.warning(
            f"Webhook {webhook_log.event_id} moved to dead letter queue "
            f"after {webhook_log.retry_count} retries"
        )

    except Exception as e:
        logger.error(f"Error moving webhook to dead letter: {e}")


# =============================================================================
# Orphaned Payment Detection Tasks
# =============================================================================

@shared_task
def detect_orphaned_payments():
    """
    Detect and report orphaned payment records.

    Orphaned payments are payments that:
    1. Have been in PENDING or PROCESSING state for too long
    2. Have no associated transaction records
    3. Have mismatched status with their Stripe records
    """
    from .models import Payment, PaymentTransaction
    from .services.gateway_service import PaymentGatewayService

    try:
        results = {
            'stale_pending': [],
            'stale_processing': [],
            'missing_transactions': [],
            'total_orphaned': 0
        }

        now = timezone.now()

        # 1. Find payments stuck in PENDING for more than 1 hour
        stale_pending_cutoff = now - timedelta(hours=1)
        stale_pending = Payment.objects.filter(
            status='PENDING',
            created__lt=stale_pending_cutoff
        ).select_related('event', 'invoice')

        for payment in stale_pending:
            results['stale_pending'].append({
                'payment_id': payment.id,
                'payment_number': payment.payment_number,
                'amount': str(payment.amount),
                'created': payment.created.isoformat(),
                'event_id': payment.event_id,
            })

        # 2. Find payments stuck in PROCESSING for more than 30 minutes
        stale_processing_cutoff = now - timedelta(minutes=30)
        stale_processing = Payment.objects.filter(
            status='PROCESSING',
            created__lt=stale_processing_cutoff
        ).select_related('event', 'invoice')

        for payment in stale_processing:
            results['stale_processing'].append({
                'payment_id': payment.id,
                'payment_number': payment.payment_number,
                'amount': str(payment.amount),
                'created': payment.created.isoformat(),
                'event_id': payment.event_id,
            })

        # 3. Find completed payments without transaction records
        missing_transactions_cutoff = now - timedelta(hours=2)
        completed_without_transactions = Payment.objects.filter(
            status='COMPLETED',
            created__lt=missing_transactions_cutoff
        ).exclude(
            id__in=PaymentTransaction.objects.values_list('payment_id', flat=True)
        )

        for payment in completed_without_transactions:
            results['missing_transactions'].append({
                'payment_id': payment.id,
                'payment_number': payment.payment_number,
                'amount': str(payment.amount),
                'created': payment.created.isoformat(),
            })

        # Calculate totals
        results['total_orphaned'] = (
            len(results['stale_pending']) +
            len(results['stale_processing']) +
            len(results['missing_transactions'])
        )

        # Log results
        if results['total_orphaned'] > 0:
            logger.warning(
                f"Orphaned payment detection found {results['total_orphaned']} issues: "
                f"{len(results['stale_pending'])} stale pending, "
                f"{len(results['stale_processing'])} stale processing, "
                f"{len(results['missing_transactions'])} missing transactions"
            )

            # Store in cache for admin dashboard
            cache.set(
                'orphaned_payments_report',
                {
                    **results,
                    'detected_at': now.isoformat()
                },
                timeout=86400  # 24 hours
            )
        else:
            logger.info("Orphaned payment detection: No issues found")

        return {
            'status': 'success',
            **results
        }

    except Exception as e:
        logger.error(f"Error detecting orphaned payments: {e}")
        return {'status': 'error', 'message': str(e)}


# =============================================================================
# Payment Reconciliation Tasks
# =============================================================================

@shared_task
def reconcile_payments_with_stripe():
    """
    Reconcile local payment records with Stripe API.

    Compares local payment transaction records with Stripe's records
    to identify discrepancies.
    """
    from .models import Payment, PaymentTransaction, PaymentGateway

    try:
        import stripe

        results = {
            'checked': 0,
            'matched': 0,
            'discrepancies': [],
            'errors': []
        }

        # Get Stripe gateway config
        try:
            stripe_gateway = PaymentGateway.objects.get(code='stripe', is_active=True)
            config = stripe_gateway.get_decrypted_config()
            stripe.api_key = config.get('secret_key')
        except PaymentGateway.DoesNotExist:
            logger.warning("Stripe gateway not found or inactive, skipping reconciliation")
            return {'status': 'skipped', 'reason': 'No active Stripe gateway'}

        # Get transactions from the last 24 hours
        cutoff_time = timezone.now() - timedelta(hours=24)
        transactions = PaymentTransaction.objects.filter(
            gateway=stripe_gateway,
            created__gte=cutoff_time,
            transaction_id__isnull=False
        ).select_related('payment')[:100]  # Limit to 100 per run

        for txn in transactions:
            results['checked'] += 1
            try:
                # Retrieve the payment intent from Stripe
                if txn.transaction_id.startswith('pi_'):
                    stripe_intent = stripe.PaymentIntent.retrieve(txn.transaction_id)

                    # Compare status
                    stripe_status = stripe_intent.status
                    local_status = txn.status

                    # Map Stripe status to local status
                    status_map = {
                        'succeeded': 'COMPLETED',
                        'requires_payment_method': 'FAILED',
                        'requires_confirmation': 'PENDING',
                        'requires_action': 'PENDING',
                        'processing': 'PROCESSING',
                        'canceled': 'CANCELLED',
                    }

                    expected_local_status = status_map.get(stripe_status, 'UNKNOWN')

                    if local_status == expected_local_status:
                        results['matched'] += 1
                    else:
                        results['discrepancies'].append({
                            'transaction_id': txn.transaction_id,
                            'payment_id': txn.payment_id,
                            'local_status': local_status,
                            'stripe_status': stripe_status,
                            'expected_local_status': expected_local_status,
                            'amount': str(txn.amount),
                        })

            except stripe.error.StripeError as e:
                results['errors'].append({
                    'transaction_id': txn.transaction_id,
                    'error': str(e)
                })
            except Exception as e:
                results['errors'].append({
                    'transaction_id': txn.transaction_id,
                    'error': str(e)
                })

        # Log results
        if results['discrepancies']:
            logger.warning(
                f"Payment reconciliation found {len(results['discrepancies'])} discrepancies "
                f"out of {results['checked']} checked"
            )

            # Store in cache for admin dashboard
            cache.set(
                'payment_reconciliation_report',
                {
                    **results,
                    'reconciled_at': timezone.now().isoformat()
                },
                timeout=86400  # 24 hours
            )
        else:
            logger.info(
                f"Payment reconciliation: {results['matched']}/{results['checked']} matched, "
                f"{len(results['errors'])} errors"
            )

        return {
            'status': 'success',
            **results
        }

    except Exception as e:
        logger.error(f"Error reconciling payments: {e}")
        return {'status': 'error', 'message': str(e)}


# =============================================================================
# Helper Functions
# =============================================================================

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


@shared_task(name='payments.send_overdue_payment_notices')
def send_overdue_payment_notices():
    """
    Send Payment Overdue Notice for invoices past their due date.

    This task runs daily to notify clients about overdue invoices.
    """
    from .models import Invoice
    from core.domains.communications.services import CommunicationService
    from core.domains.communications.context_service import (
        CommunicationContextService, ContextType
    )

    try:
        today = timezone.now().date()

        # Find unpaid invoices past their due date
        overdue_invoices = Invoice.objects.filter(
            status__in=['PENDING', 'PARTIALLY_PAID'],
            due_date__lt=today
        ).select_related('event', 'event__client')

        count = 0
        for invoice in overdue_invoices:
            try:
                client = invoice.event.client if invoice.event else None
                if not client or not client.email:
                    logger.warning(f"Invoice {invoice.id} has no client email for overdue notice")
                    continue

                # Check if we already sent an overdue notice recently (within 7 days)
                from .models import PaymentNotificationHistory
                recent_notice = PaymentNotificationHistory.objects.filter(
                    invoice=invoice,
                    notification_type='PAYMENT_OVERDUE',
                    sent_at__gte=timezone.now() - timedelta(days=7)
                ).exists()

                if recent_notice:
                    logger.debug(f"Skipping invoice {invoice.id} - recent overdue notice already sent")
                    continue

                comm_service = CommunicationService()
                template_data = CommunicationContextService.generate_context(
                    context_type=ContextType.INVOICE,
                    client=client,
                    event=invoice.event,
                    invoice=invoice,
                )

                # Add overdue-specific context
                days_overdue = (today - invoice.due_date).days
                template_data['days_overdue'] = days_overdue
                template_data['due_date_formatted'] = invoice.due_date.strftime("%B %d, %Y")

                comm_service.send_communication(
                    template_name='Payment Overdue Notice',
                    recipient=client.email,
                    context_data=template_data,
                    client=client,
                    event=invoice.event,
                    use_async=True,
                )

                # Record the notification
                PaymentNotificationHistory.objects.create(
                    invoice=invoice,
                    notification_type='PAYMENT_OVERDUE',
                    recipient_email=client.email,
                    sent_at=timezone.now(),
                )

                logger.info(f"Sent Payment Overdue Notice for invoice {invoice.id} ({days_overdue} days overdue)")
                count += 1

            except Exception as e:
                logger.error(f"Failed to send overdue notice for invoice {invoice.id}: {e}")

        logger.info(f"Payment overdue task completed: sent {count} notices")
        return {'status': 'success', 'notices_sent': count}

    except Exception as e:
        logger.error(f"Error in send_overdue_payment_notices task: {e}")
        return {'status': 'error', 'message': str(e)}
