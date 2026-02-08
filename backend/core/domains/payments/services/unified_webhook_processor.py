# backend/core/domains/payments/services/unified_webhook_processor.py

import logging
import json
from decimal import Decimal
from typing import Dict, List, Optional, Any, Tuple

import stripe

from django.db import transaction
from django.utils import timezone
from django.http import HttpRequest

logger = logging.getLogger(__name__)


class WebhookProcessingResult:
    """Result of webhook processing"""
    def __init__(self, success: bool, message: str = None,
                 payment_id: int = None, transaction_id: str = None,
                 action_taken: str = None, error_code: str = None):
        self.success = success
        self.message = message
        self.payment_id = payment_id
        self.transaction_id = transaction_id
        self.action_taken = action_taken
        self.error_code = error_code
        self.processed_at = timezone.now()

    def to_dict(self) -> Dict[str, Any]:
        return {
            'success': self.success,
            'message': self.message,
            'payment_id': self.payment_id,
            'transaction_id': self.transaction_id,
            'action_taken': self.action_taken,
            'error_code': self.error_code,
            'processed_at': self.processed_at.isoformat()
        }


class WebhookEvent:
    """Standardized webhook event representation"""
    def __init__(self, gateway_code: str, event_type: str, event_id: str,
                 transaction_id: str, raw_data: Dict[str, Any]):
        self.gateway_code = gateway_code
        self.event_type = event_type
        self.event_id = event_id
        self.transaction_id = transaction_id
        self.raw_data = raw_data
        self.received_at = timezone.now()

    def to_dict(self) -> Dict[str, Any]:
        return {
            'gateway_code': self.gateway_code,
            'event_type': self.event_type,
            'event_id': self.event_id,
            'transaction_id': self.transaction_id,
            'raw_data': self.raw_data,
            'received_at': self.received_at.isoformat()
        }


class BaseWebhookHandler:
    """Base class for gateway-specific webhook handlers"""

    def __init__(self, gateway_code: str):
        self.gateway_code = gateway_code

    def parse_webhook(self, request: HttpRequest) -> Optional[WebhookEvent]:
        """
        Parse incoming webhook request into standardized WebhookEvent.

        Args:
            request: Django HttpRequest object

        Returns:
            WebhookEvent or None if parsing fails
        """
        raise NotImplementedError("Subclasses must implement parse_webhook")

    def verify_signature(self, request: HttpRequest, raw_body: bytes) -> bool:
        """
        Verify webhook signature for authenticity.

        Args:
            request: Django HttpRequest object
            raw_body: Raw request body bytes

        Returns:
            bool: True if signature is valid
        """
        raise NotImplementedError("Subclasses must implement verify_signature")

    def process_webhook_event(self, webhook_event: WebhookEvent) -> WebhookProcessingResult:
        """
        Process the parsed webhook event.

        Args:
            webhook_event: Parsed webhook event

        Returns:
            WebhookProcessingResult with processing outcome
        """
        raise NotImplementedError("Subclasses must implement process_webhook_event")


class StripeWebhookHandler(BaseWebhookHandler):
    """Stripe-specific webhook handler"""

    def __init__(self):
        super().__init__('stripe')

    def parse_webhook(self, request: HttpRequest) -> Optional[WebhookEvent]:
        """Parse Stripe webhook"""
        try:
            payload = request.body.decode('utf-8')
            webhook_data = json.loads(payload)

            # Extract standard fields from Stripe webhook
            event_type = webhook_data.get('type')
            event_id = webhook_data.get('id')

            # Get transaction ID from different event types
            transaction_id = self._extract_transaction_id(webhook_data)

            if not all([event_type, event_id, transaction_id]):
                logger.warning("Missing required fields in Stripe webhook")
                return None

            return WebhookEvent(
                gateway_code='stripe',
                event_type=event_type,
                event_id=event_id,
                transaction_id=transaction_id,
                raw_data=webhook_data
            )

        except json.JSONDecodeError:
            logger.error("Failed to parse Stripe webhook JSON")
            return None
        except Exception as e:
            logger.error(f"Error parsing Stripe webhook: {e}")
            return None

    def verify_signature(self, request: HttpRequest, raw_body: bytes) -> bool:
        """Verify Stripe webhook signature"""
        try:
            from ..services.payment_gateway_factory import PaymentGatewayFactory

            # Get Stripe gateway configuration
            gateway = PaymentGatewayFactory.create_gateway('stripe')
            webhook_secret = gateway.config.get('webhook_secret')

            if not webhook_secret:
                logger.error("No webhook secret configured for Stripe - rejecting webhook")
                return False  # Fail closed: reject webhooks when no secret is configured

            # Get signature from header
            signature = request.META.get('HTTP_STRIPE_SIGNATURE')
            if not signature:
                logger.error("Missing Stripe signature header")
                return False

            # Verify the signature
            stripe.Webhook.construct_event(
                raw_body,
                signature,
                webhook_secret
            )

            return True

        except stripe.error.SignatureVerificationError:
            logger.error("Invalid Stripe webhook signature")
            return False
        except Exception as e:
            logger.error(f"Error verifying Stripe webhook signature: {e}")
            return False

    def process_webhook_event(self, webhook_event: WebhookEvent) -> WebhookProcessingResult:
        """Process Stripe webhook event"""
        try:
            event_type = webhook_event.event_type
            transaction_id = webhook_event.transaction_id
            raw_data = webhook_event.raw_data

            # Map Stripe events to actions
            if event_type == 'payment_intent.succeeded':
                return self._handle_payment_succeeded(transaction_id, raw_data)
            elif event_type == 'payment_intent.payment_failed':
                return self._handle_payment_failed(transaction_id, raw_data)
            elif event_type == 'payment_intent.canceled':
                return self._handle_payment_cancelled(transaction_id, raw_data)
            elif event_type == 'charge.dispute.created':
                return self._handle_chargeback_created(transaction_id, raw_data)
            elif event_type.startswith('payment_method'):
                return self._handle_payment_method_event(event_type, raw_data)
            else:
                # Log unknown event but don't fail
                logger.info(f"Unhandled Stripe event type: {event_type}")
                return WebhookProcessingResult(
                    success=True,
                    message=f"Event {event_type} received but not processed",
                    action_taken='ignored'
                )

        except Exception as e:
            logger.error(f"Error processing Stripe webhook event: {e}", exc_info=True)
            return WebhookProcessingResult(
                success=False,
                message=str(e),
                error_code='processing_error'
            )

    def _extract_transaction_id(self, webhook_data: Dict) -> Optional[str]:
        """Extract transaction ID from Stripe webhook data"""
        data_object = webhook_data.get('data', {}).get('object', {})

        # Different event types have different structures
        if 'payment_intent' in data_object:
            return data_object.get('payment_intent')
        elif data_object.get('object') == 'payment_intent':
            return data_object.get('id')
        elif 'id' in data_object:
            return data_object.get('id')

        return None

    def _handle_payment_succeeded(self, transaction_id: str, raw_data: Dict) -> WebhookProcessingResult:
        """Handle successful payment"""
        try:
            from ..models import PaymentTransaction

            # Find the payment transaction
            # SECURITY FIX (P0-WEBHOOK-001): Renamed variable to avoid shadowing
            # django.db.transaction (imported at module level), which caused
            # AttributeError at runtime when calling transaction.atomic()
            payment_txn = PaymentTransaction.objects.filter(
                transaction_id=transaction_id,
                gateway__code='stripe'
            ).first()

            if not payment_txn:
                logger.warning(f"No payment transaction found for Stripe intent {transaction_id}")
                return WebhookProcessingResult(
                    success=True,
                    message="Payment transaction not found (possibly already processed)",
                    transaction_id=transaction_id,
                    action_taken='ignored'
                )

            # Update transaction status
            with transaction.atomic():
                # Re-fetch with lock to prevent concurrent webhook processing
                payment_txn = PaymentTransaction.objects.select_for_update().get(pk=payment_txn.pk)
                if payment_txn.status == 'COMPLETED':
                    return WebhookProcessingResult(
                        success=True,
                        message="Payment already completed",
                        payment_id=payment_txn.payment_id,
                        transaction_id=transaction_id,
                        action_taken='duplicate_ignored'
                    )
                payment_txn.status = 'COMPLETED'
                payment_txn.response_data = raw_data
                payment_txn.save()

                # This will trigger payment completion via model save method
                # which handles state machine transitions

            logger.info(f"Updated payment transaction {transaction_id} to COMPLETED")

            return WebhookProcessingResult(
                success=True,
                message="Payment marked as completed",
                payment_id=payment_txn.payment_id,
                transaction_id=transaction_id,
                action_taken='payment_completed'
            )

        except Exception as e:
            logger.error(f"Error handling payment success webhook: {e}")
            return WebhookProcessingResult(
                success=False,
                message=str(e),
                error_code='payment_completion_error'
            )

    def _handle_payment_failed(self, transaction_id: str, raw_data: Dict) -> WebhookProcessingResult:
        """Handle failed payment"""
        try:
            from ..models import PaymentTransaction

            # SECURITY FIX (P0-WEBHOOK-001): Renamed to avoid shadowing
            # django.db.transaction module import
            payment_txn = PaymentTransaction.objects.filter(
                transaction_id=transaction_id,
                gateway__code='stripe'
            ).first()

            if not payment_txn:
                return WebhookProcessingResult(
                    success=True,
                    message="Payment transaction not found",
                    action_taken='ignored'
                )

            # Extract failure reason
            failure_reason = self._extract_failure_reason(raw_data)

            with transaction.atomic():
                payment_txn = PaymentTransaction.objects.select_for_update().get(pk=payment_txn.pk)
                if payment_txn.status == 'FAILED':
                    return WebhookProcessingResult(
                        success=True,
                        message="Payment already marked as failed",
                        payment_id=payment_txn.payment_id,
                        transaction_id=transaction_id,
                        action_taken='duplicate_ignored'
                    )
                payment_txn.status = 'FAILED'
                payment_txn.error_message = failure_reason
                payment_txn.response_data = raw_data
                payment_txn.save()

            return WebhookProcessingResult(
                success=True,
                message="Payment marked as failed",
                payment_id=payment_txn.payment_id,
                transaction_id=transaction_id,
                action_taken='payment_failed'
            )

        except Exception as e:
            logger.error(f"Error handling payment failure webhook: {e}")
            return WebhookProcessingResult(
                success=False,
                message=str(e),
                error_code='failure_handling_error'
            )

    def _handle_payment_cancelled(self, transaction_id: str, raw_data: Dict) -> WebhookProcessingResult:
        """Handle cancelled payment"""
        try:
            from ..models import PaymentTransaction

            # SECURITY FIX (P0-WEBHOOK-001): Renamed to avoid shadowing
            # django.db.transaction module import
            payment_txn = PaymentTransaction.objects.filter(
                transaction_id=transaction_id,
                gateway__code='stripe'
            ).first()

            if not payment_txn:
                return WebhookProcessingResult(
                    success=True,
                    message="Payment transaction not found",
                    action_taken='ignored'
                )

            with transaction.atomic():
                payment_txn = PaymentTransaction.objects.select_for_update().get(pk=payment_txn.pk)
                if payment_txn.status == 'CANCELLED':
                    return WebhookProcessingResult(
                        success=True,
                        message="Payment already cancelled",
                        payment_id=payment_txn.payment_id,
                        transaction_id=transaction_id,
                        action_taken='duplicate_ignored'
                    )
                payment_txn.status = 'CANCELLED'
                payment_txn.response_data = raw_data
                payment_txn.save()

            return WebhookProcessingResult(
                success=True,
                message="Payment marked as cancelled",
                payment_id=payment_txn.payment_id,
                transaction_id=transaction_id,
                action_taken='payment_cancelled'
            )

        except Exception as e:
            return WebhookProcessingResult(
                success=False,
                message=str(e),
                error_code='cancellation_error'
            )

    def _handle_chargeback_created(self, transaction_id: str, raw_data: Dict) -> WebhookProcessingResult:
        """Handle chargeback/dispute creation"""
        logger.warning(f"Chargeback created for transaction {transaction_id}")

        try:
            from ..models import PaymentTransaction, PaymentDispute, PaymentGateway

            # Extract dispute data from Stripe webhook
            data_object = raw_data.get('data', {}).get('object', {})
            dispute_id = data_object.get('id', '')
            charge_id = data_object.get('charge', '')
            amount = data_object.get('amount', 0)
            currency = data_object.get('currency', 'usd').upper()
            reason = data_object.get('reason', 'other')
            status = data_object.get('status', 'needs_response')
            evidence_details = data_object.get('evidence_details', {})
            evidence_due_by = evidence_details.get('due_by')

            # Map Stripe reason to our choices
            reason_mapping = {
                'duplicate': 'DUPLICATE',
                'fraudulent': 'FRAUDULENT',
                'subscription_canceled': 'SUBSCRIPTION_CANCELED',
                'product_unacceptable': 'PRODUCT_UNACCEPTABLE',
                'product_not_received': 'PRODUCT_NOT_RECEIVED',
                'unrecognized': 'UNRECOGNIZED',
                'credit_not_processed': 'CREDIT_NOT_PROCESSED',
                'general': 'GENERAL',
            }
            mapped_reason = reason_mapping.get(reason, 'OTHER')

            # Find the related payment transaction
            payment = None
            payment_txn = PaymentTransaction.objects.filter(
                transaction_id__in=[transaction_id, charge_id],
                gateway__code='stripe'
            ).first()

            if payment_txn:
                payment = payment_txn.payment

            # Get or create the gateway
            gateway = PaymentGateway.objects.filter(code='stripe').first()
            if not gateway:
                logger.error("Stripe gateway not found in database")
                return WebhookProcessingResult(
                    success=False,
                    message="Stripe gateway not configured",
                    error_code='gateway_not_found'
                )

            # Check for duplicate dispute
            if PaymentDispute.objects.filter(gateway_dispute_id=dispute_id).exists():
                logger.info(f"Dispute {dispute_id} already exists, skipping")
                return WebhookProcessingResult(
                    success=True,
                    message="Dispute already recorded",
                    transaction_id=transaction_id,
                    action_taken='duplicate_ignored'
                )

            # Create dispute record
            dispute = PaymentDispute.objects.create(
                payment=payment,
                gateway=gateway,
                gateway_dispute_id=dispute_id,
                gateway_transaction_id=charge_id or transaction_id,
                amount=Decimal(amount) / 100,  # Stripe amounts are in cents
                currency=currency,
                reason=mapped_reason,
                reason_description=f"Stripe dispute: {reason}",
                status='OPEN' if status == 'needs_response' else 'UNDER_REVIEW',
                evidence_due_by=timezone.datetime.fromtimestamp(evidence_due_by, tz=timezone.utc) if evidence_due_by else None,
                gateway_data=raw_data
            )

            logger.info(f"Created dispute record {dispute.id} for transaction {transaction_id}")

            # Send admin notification
            self._notify_admins_of_dispute(dispute, payment)

            # Update payment status to indicate dispute
            if payment and payment.status == 'COMPLETED':
                # Add to event timeline
                from core.domains.events.models import EventTimeline
                EventTimeline.objects.create(
                    event=payment.event,
                    action_type='SYSTEM_UPDATE',
                    description=f"Payment dispute opened for {payment.format_amount_with_currency()}",
                    is_public=False,
                    action_data={
                        'payment_id': payment.id,
                        'dispute_id': dispute.id,
                        'reason': mapped_reason
                    }
                )

            return WebhookProcessingResult(
                success=True,
                message="Chargeback/dispute recorded and admin notified",
                payment_id=payment.id if payment else None,
                transaction_id=transaction_id,
                action_taken='dispute_created'
            )

        except Exception as e:
            logger.error(f"Error handling chargeback webhook: {e}", exc_info=True)
            return WebhookProcessingResult(
                success=False,
                message=str(e),
                error_code='chargeback_processing_error'
            )

    def _notify_admins_of_dispute(self, dispute, payment):
        """Send notification to admins about new dispute"""
        try:
            from core.domains.users.models import User
            from core.domains.notifications.services import NotificationService

            # Get all admin users
            admin_users = User.objects.filter(role='ADMIN', is_active=True)

            for admin in admin_users:
                try:
                    NotificationService.create_notification(
                        user=admin,
                        title="Payment Dispute Alert",
                        message=f"A chargeback/dispute has been opened for {dispute.currency} {dispute.amount}. "
                                f"Reason: {dispute.get_reason_display()}. "
                                f"Evidence due by: {dispute.evidence_due_by.strftime('%Y-%m-%d') if dispute.evidence_due_by else 'N/A'}",
                        notification_type='ALERT',
                        priority='HIGH',
                        action_url=f"/admin/payments/disputes/{dispute.id}/",
                        metadata={
                            'dispute_id': dispute.id,
                            'payment_id': payment.id if payment else None,
                            'amount': str(dispute.amount),
                            'currency': dispute.currency
                        }
                    )
                except Exception as e:
                    logger.warning(f"Failed to notify admin {admin.id} of dispute: {e}")

            # Mark dispute as admin notified
            dispute.admin_notified = True
            dispute.admin_notified_at = timezone.now()
            dispute.save(update_fields=['admin_notified', 'admin_notified_at'])

            logger.info(f"Notified {admin_users.count()} admins of dispute {dispute.id}")

        except Exception as e:
            logger.error(f"Error notifying admins of dispute: {e}")

    def _handle_payment_method_event(self, event_type: str, raw_data: Dict) -> WebhookProcessingResult:
        """Handle payment method events"""
        # TODO: Implement payment method webhook handling
        # - Payment method attached/detached
        # - Payment method updated

        return WebhookProcessingResult(
            success=True,
            message=f"Payment method event {event_type} received",
            action_taken='payment_method_event_logged'
        )

    def _extract_failure_reason(self, raw_data: Dict) -> str:
        """Extract failure reason from Stripe webhook data"""
        data_object = raw_data.get('data', {}).get('object', {})

        # Look for failure reasons in different locations
        if 'last_payment_error' in data_object:
            error = data_object['last_payment_error']
            return error.get('message', 'Payment failed')

        return 'Payment failed (reason not specified)'


class PayPalWebhookHandler(BaseWebhookHandler):
    """PayPal-specific webhook handler (placeholder)"""

    def __init__(self):
        super().__init__('paypal')

    def parse_webhook(self, request: HttpRequest) -> Optional[WebhookEvent]:
        # TODO: Implement PayPal webhook parsing
        return None

    def verify_signature(self, request: HttpRequest, raw_body: bytes) -> bool:
        # TODO: Implement PayPal signature verification
        return False

    def process_webhook_event(self, webhook_event: WebhookEvent) -> WebhookProcessingResult:
        return WebhookProcessingResult(
            success=False,
            message="PayPal webhook processing not yet implemented",
            error_code='not_implemented'
        )


class UnifiedWebhookProcessor:
    """
    Unified webhook processor for all payment gateways.

    This service provides centralized webhook handling with:
    - Multi-gateway support
    - Signature verification
    - Standardized event processing
    - Error handling and retry logic
    - Webhook logging and monitoring
    """

    _handlers = {
        'stripe': StripeWebhookHandler,
        'paypal': PayPalWebhookHandler,
    }

    @classmethod
    def process_webhook(cls, request: HttpRequest, gateway_code: str) -> WebhookProcessingResult:
        """
        Process webhook from specified gateway.

        Args:
            request: Django HttpRequest containing webhook data
            gateway_code: Gateway identifier (stripe, paypal, etc.)

        Returns:
            WebhookProcessingResult with processing outcome
        """
        try:
            # Get appropriate handler
            handler_class = cls._handlers.get(gateway_code)
            if not handler_class:
                return WebhookProcessingResult(
                    success=False,
                    message=f"Unsupported gateway: {gateway_code}",
                    error_code='unsupported_gateway'
                )

            handler = handler_class()

            # Parse the webhook
            webhook_event = handler.parse_webhook(request)
            if not webhook_event:
                return WebhookProcessingResult(
                    success=False,
                    message="Failed to parse webhook",
                    error_code='parse_error'
                )

            # Verify signature
            raw_body = request.body
            if not handler.verify_signature(request, raw_body):
                return WebhookProcessingResult(
                    success=False,
                    message="Invalid webhook signature",
                    error_code='signature_verification_failed'
                )

            # Log the webhook
            cls._log_webhook(webhook_event)

            # Check for duplicate processing
            if cls._is_duplicate_webhook(webhook_event):
                return WebhookProcessingResult(
                    success=True,
                    message="Webhook already processed",
                    action_taken='duplicate_ignored'
                )

            # Process the webhook
            result = handler.process_webhook_event(webhook_event)

            # Log the result
            cls._log_webhook_result(webhook_event, result)

            return result

        except Exception as e:
            logger.error(f"Error in unified webhook processor: {e}", exc_info=True)
            return WebhookProcessingResult(
                success=False,
                message=str(e),
                error_code='processor_error'
            )

    @classmethod
    def get_webhook_statistics(cls, gateway_code: str = None,
                             days: int = 7) -> Dict[str, Any]:
        """
        Get webhook processing statistics.

        Args:
            gateway_code: Filter by gateway (None for all)
            days: Number of days to analyze

        Returns:
            Dictionary with webhook statistics
        """
        try:
            from ..models import PaymentWebhookLog

            cutoff_date = timezone.now() - timezone.timedelta(days=days)

            queryset = PaymentWebhookLog.objects.filter(received_at__gte=cutoff_date)
            if gateway_code:
                queryset = queryset.filter(gateway_code=gateway_code)

            stats = {
                'total_webhooks': queryset.count(),
                'successful_webhooks': queryset.filter(processed_successfully=True).count(),
                'failed_webhooks': queryset.filter(processed_successfully=False).count(),
                'gateway_breakdown': {}
            }

            # Gateway breakdown
            gateway_stats = queryset.values('gateway_code').annotate(
                count=models.Count('id'),
                success_count=models.Count('id', filter=models.Q(processed_successfully=True))
            )

            for stat in gateway_stats:
                gateway = stat['gateway_code']
                stats['gateway_breakdown'][gateway] = {
                    'total': stat['count'],
                    'successful': stat['success_count'],
                    'failed': stat['count'] - stat['success_count']
                }

            return stats

        except Exception as e:
            logger.error(f"Error getting webhook statistics: {e}")
            return {'error': str(e)}

    @classmethod
    def retry_failed_webhooks(cls, gateway_code: str = None,
                            max_age_hours: int = 24) -> int:
        """
        Retry failed webhook processing.

        Args:
            gateway_code: Gateway to retry (None for all)
            max_age_hours: Maximum age of failed webhooks to retry

        Returns:
            Number of webhooks retried
        """
        try:
            from ..models import PaymentWebhookLog

            cutoff_time = timezone.now() - timezone.timedelta(hours=max_age_hours)

            queryset = PaymentWebhookLog.objects.filter(
                processed_successfully=False,
                received_at__gte=cutoff_time,
                retry_count__lt=3  # Maximum 3 retries
            )

            if gateway_code:
                queryset = queryset.filter(gateway_code=gateway_code)

            retried_count = 0

            for webhook_log in queryset:
                try:
                    # Reconstruct webhook event
                    webhook_event = WebhookEvent(
                        gateway_code=webhook_log.gateway_code,
                        event_type=webhook_log.event_type,
                        event_id=webhook_log.event_id,
                        transaction_id=webhook_log.transaction_id,
                        raw_data=webhook_log.raw_data
                    )

                    # Get handler and retry processing
                    handler_class = cls._handlers.get(webhook_log.gateway_code)
                    if handler_class:
                        handler = handler_class()
                        result = handler.process_webhook_event(webhook_event)

                        # Update webhook log
                        webhook_log.processed_successfully = result.success
                        webhook_log.retry_count += 1
                        webhook_log.error_message = result.message if not result.success else None
                        webhook_log.save()

                        if result.success:
                            retried_count += 1

                except Exception as e:
                    logger.error(f"Error retrying webhook {webhook_log.id}: {e}")

            logger.info(f"Retried {retried_count} failed webhooks")
            return retried_count

        except Exception as e:
            logger.error(f"Error in retry_failed_webhooks: {e}")
            return 0

    @classmethod
    def _log_webhook(cls, webhook_event: WebhookEvent):
        """Log received webhook"""
        try:
            from ..models import PaymentWebhookLog

            PaymentWebhookLog.objects.create(
                gateway_code=webhook_event.gateway_code,
                event_type=webhook_event.event_type,
                event_id=webhook_event.event_id,
                transaction_id=webhook_event.transaction_id,
                raw_data=webhook_event.raw_data,
                received_at=webhook_event.received_at
            )

        except Exception as e:
            logger.error(f"Error logging webhook: {e}")

    @classmethod
    def _log_webhook_result(cls, webhook_event: WebhookEvent, result: WebhookProcessingResult):
        """Log webhook processing result"""
        try:
            from ..models import PaymentWebhookLog

            webhook_log = PaymentWebhookLog.objects.filter(
                event_id=webhook_event.event_id
            ).first()

            if webhook_log:
                webhook_log.processed_successfully = result.success
                webhook_log.processed_at = result.processed_at
                webhook_log.action_taken = result.action_taken
                webhook_log.error_message = result.message if not result.success else None
                webhook_log.save()

        except Exception as e:
            logger.error(f"Error logging webhook result: {e}")

    @classmethod
    def _is_duplicate_webhook(cls, webhook_event: WebhookEvent) -> bool:
        """Check if webhook has already been processed successfully"""
        try:
            from ..models import PaymentWebhookLog

            return PaymentWebhookLog.objects.filter(
                event_id=webhook_event.event_id,
                processed_successfully=True
            ).exists()

        except Exception as e:
            logger.error(f"Error checking for duplicate webhook: {e}")
            return False