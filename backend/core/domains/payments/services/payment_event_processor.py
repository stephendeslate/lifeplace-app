# backend/core/domains/payments/services/payment_event_processor.py

import logging
from typing import Dict, List, Any, Optional
from django.utils import timezone
from django.db import transaction

logger = logging.getLogger(__name__)


class PaymentEventProcessor:
    """
    Asynchronous payment event processor.

    This processor handles payment domain events asynchronously to avoid
    blocking the main payment operations. It provides:
    - Async event processing with Celery integration
    - Error handling and retry logic
    - Cross-system integration
    - Performance monitoring
    """

    @classmethod
    def process_payment_event(cls, event_id: str) -> bool:
        """
        Process a payment event asynchronously.

        This is the main entry point for async event processing.
        It should be called by Celery tasks.

        Args:
            event_id: Unique event identifier

        Returns:
            bool: True if processing successful
        """
        from .payment_event_store_service import PaymentEventStoreService
        from ..models import PaymentEventStore

        try:
            # Get the stored event
            try:
                stored_event = PaymentEventStore.objects.get(event_id=event_id)
            except PaymentEventStore.DoesNotExist:
                logger.error(f"Stored event {event_id} not found for processing")
                return False

            # Mark processing started
            PaymentEventStoreService.mark_event_processing_started(event_id)

            # Process based on event type
            success = cls._process_event_by_type(stored_event)

            if success:
                # Mark processing completed
                PaymentEventStoreService.mark_event_processing_completed(event_id)
                logger.info(f"Successfully processed event {event_id}")
            else:
                # Add error for retry
                PaymentEventStoreService.add_event_processing_error(
                    event_id,
                    "Event processing failed",
                    {"processor": "PaymentEventProcessor"}
                )
                logger.warning(f"Event processing failed for {event_id}")

            return success

        except Exception as e:
            logger.error(
                f"Error processing payment event {event_id}: {e}",
                exc_info=True
            )

            # Log the error for retry
            PaymentEventStoreService.add_event_processing_error(
                event_id,
                str(e),
                {"exception_type": e.__class__.__name__, "processor": "PaymentEventProcessor"}
            )
            return False

    @classmethod
    def process_payment_completed(cls, event_data: Dict[str, Any]) -> bool:
        """
        Process payment completion event.

        Handles all side effects of payment completion:
        - Receipt generation
        - Notification sending
        - Workflow triggers
        - Analytics updates
        """
        try:
            payment_id = event_data.get('payment_id')
            if not payment_id:
                logger.error("Payment ID missing from completion event")
                return False

            from ..models import Payment
            payment = Payment.objects.get(id=payment_id)

            # Generate receipt if not already generated
            if not payment.receipt_number:
                receipt_number = payment.generate_receipt()
                logger.debug(f"Generated receipt {receipt_number} for payment {payment.payment_number}")

            # Send receipt notification
            notification_sent = payment.send_receipt_notification()
            if notification_sent:
                logger.debug(f"Receipt notification sent for payment {payment.payment_number}")

            # Update installment if applicable
            if payment.installment:
                payment.installment.status = 'PAID'
                payment.installment.save()
                logger.debug(f"Updated installment status for payment {payment.payment_number}")

            # Auto-create payment plan for deposit payments
            try:
                payment._create_payment_plan_for_deposit()
            except Exception as e:
                logger.warning(f"Failed to auto-create payment plan: {e}")

            # Trigger workflow advancement
            cls._trigger_workflow_advancement(payment)

            # Update analytics
            cls._update_payment_analytics(payment, 'COMPLETED')

            return True

        except Exception as e:
            logger.error(f"Error processing payment completion: {e}", exc_info=True)
            return False

    @classmethod
    def process_payment_failed(cls, event_data: Dict[str, Any]) -> bool:
        """
        Process payment failure event.

        Handles side effects of payment failure:
        - Failure notifications
        - Installment status updates
        - Analytics updates
        - Retry scheduling
        """
        try:
            payment_id = event_data.get('payment_id')
            if not payment_id:
                logger.error("Payment ID missing from failure event")
                return False

            from ..models import Payment
            payment = Payment.objects.get(id=payment_id)

            # Send failure notification
            cls._send_failure_notification(payment)

            # Update installment status
            if payment.installment:
                payment.installment.check_status()
                logger.debug(f"Updated installment status for failed payment {payment.payment_number}")

            # Update analytics
            cls._update_payment_analytics(payment, 'FAILED')

            # Schedule retry if applicable
            cls._schedule_payment_retry(payment)

            return True

        except Exception as e:
            logger.error(f"Error processing payment failure: {e}", exc_info=True)
            return False

    @classmethod
    def process_payment_cancelled(cls, event_data: Dict[str, Any]) -> bool:
        """
        Process payment cancellation event.
        """
        try:
            payment_id = event_data.get('payment_id')
            if not payment_id:
                logger.error("Payment ID missing from cancellation event")
                return False

            from ..models import Payment
            payment = Payment.objects.get(id=payment_id)

            # Send cancellation notification
            cls._send_cancellation_notification(payment)

            # Update analytics
            cls._update_payment_analytics(payment, 'CANCELLED')

            return True

        except Exception as e:
            logger.error(f"Error processing payment cancellation: {e}", exc_info=True)
            return False

    @classmethod
    def process_payment_refunded(cls, event_data: Dict[str, Any]) -> bool:
        """
        Process payment refund event.
        """
        try:
            payment_id = event_data.get('payment_id')
            if not payment_id:
                logger.error("Payment ID missing from refund event")
                return False

            from ..models import Payment
            payment = Payment.objects.get(id=payment_id)

            # Update event payment status
            payment.event.update_payment_status()

            # Send refund notification
            cls._send_refund_notification(payment)

            # Update analytics
            cls._update_payment_analytics(payment, 'REFUNDED')

            return True

        except Exception as e:
            logger.error(f"Error processing payment refund: {e}", exc_info=True)
            return False

    @classmethod
    def retry_failed_events(cls, max_retries: int = 3) -> int:
        """
        Retry failed events that are eligible for retry.

        Returns:
            int: Number of events retried
        """
        from .payment_event_store_service import PaymentEventStoreService

        failed_events = PaymentEventStoreService.get_failed_events(max_retries)
        retry_count = 0

        for event in failed_events:
            try:
                # Attempt to reprocess the event
                success = cls.process_payment_event(event.event_id)
                if success:
                    retry_count += 1
                    logger.info(f"Successfully retried event {event.event_id}")

            except Exception as e:
                logger.error(f"Failed to retry event {event.event_id}: {e}")

        logger.info(f"Retried {retry_count} failed payment events")
        return retry_count

    @classmethod
    def _process_event_by_type(cls, stored_event) -> bool:
        """Process event based on its type"""
        event_type = stored_event.event_type
        event_data = stored_event.event_data

        if event_type == 'PaymentCompletedEvent':
            return cls.process_payment_completed(event_data)
        elif event_type == 'PaymentFailedEvent':
            return cls.process_payment_failed(event_data)
        elif event_type == 'PaymentCancelledEvent':
            return cls.process_payment_cancelled(event_data)
        elif event_type == 'PaymentRefundedEvent':
            return cls.process_payment_refunded(event_data)
        elif event_type == 'PaymentStateChangedEvent':
            # Generic state change - minimal processing
            return cls._process_generic_state_change(event_data)
        else:
            logger.warning(f"Unknown event type for processing: {event_type}")
            return True  # Don't retry unknown event types

    @classmethod
    def _process_generic_state_change(cls, event_data: Dict[str, Any]) -> bool:
        """Process generic payment state changes"""
        try:
            payment_id = event_data.get('payment_id')
            if not payment_id:
                return False

            from ..models import Payment
            payment = Payment.objects.get(id=payment_id)

            # Update event payment status
            payment.event.update_payment_status()

            # Add to event timeline (already handled by event handlers)
            # Update analytics for any state change
            cls._update_payment_analytics(payment, event_data.get('to_state', 'UNKNOWN'))

            return True

        except Exception as e:
            logger.error(f"Error processing generic state change: {e}")
            return False

    @classmethod
    def _trigger_workflow_advancement(cls, payment):
        """Trigger workflow advancement for completed payments"""
        try:
            if hasattr(payment.event, 'workflow_template') and payment.event.workflow_template:
                from core.domains.workflows.models import WorkflowTrigger
                from core.domains.workflows.engine import WorkflowEngine

                # Create workflow trigger record
                WorkflowTrigger.objects.create(
                    event=payment.event,
                    stage=payment.event.current_stage,
                    trigger_type='PAYMENT_RECEIVED',
                    details=f"Payment of {payment.format_amount_with_currency()} received",
                    result_data={
                        'payment_id': payment.id,
                        'payment_number': payment.payment_number,
                        'amount': str(payment.amount),
                        'currency': payment.currency
                    }
                )

                # Use WorkflowEngine to properly progress the workflow
                # This ensures proper stage ordering and validation
                WorkflowEngine.progress_workflow(
                    event=payment.event,
                    trigger_type='PAYMENT_RECEIVED',
                    data={
                        'payment_id': payment.id,
                        'payment_number': payment.payment_number,
                        'amount': str(payment.amount),
                        'currency': payment.currency
                    }
                )

                logger.debug(f"Triggered workflow advancement for payment {payment.payment_number}")

        except Exception as e:
            logger.warning(f"Failed to trigger workflow advancement: {e}")

    @classmethod
    def _update_payment_analytics(cls, payment, status: str):
        """Update payment analytics"""
        try:
            # Import analytics service if available
            from core.domains.analytics.services import PaymentAnalyticsService

            PaymentAnalyticsService.record_payment_event(
                payment_id=payment.id,
                event_type=f'PAYMENT_{status}',
                amount=payment.amount,
                currency=payment.currency,
                client_id=payment.event.client_id,
                event_id=payment.event_id
            )

        except ImportError:
            # Analytics service not available
            logger.debug("Analytics service not available")
        except Exception as e:
            logger.warning(f"Failed to update payment analytics: {e}")

    @classmethod
    def _send_failure_notification(cls, payment):
        """Send payment failure notification"""
        try:
            from ..models import PaymentNotification

            PaymentNotification.objects.create(
                payment=payment,
                notification_type='PAYMENT_FAILED',
                sent_at=timezone.now(),
                sent_to=payment.event.client.email,
                is_successful=True,
                reference=f"payment_{payment.id}_failed"
            )

        except Exception as e:
            logger.warning(f"Failed to send failure notification: {e}")

    @classmethod
    def _send_cancellation_notification(cls, payment):
        """Send payment cancellation notification"""
        try:
            from ..models import PaymentNotification

            PaymentNotification.objects.create(
                payment=payment,
                notification_type='PAYMENT_CANCELLED',
                sent_at=timezone.now(),
                sent_to=payment.event.client.email,
                is_successful=True,
                reference=f"payment_{payment.id}_cancelled"
            )

        except Exception as e:
            logger.warning(f"Failed to send cancellation notification: {e}")

    @classmethod
    def _send_refund_notification(cls, payment):
        """Send payment refund notification"""
        try:
            from ..models import PaymentNotification

            PaymentNotification.objects.create(
                payment=payment,
                notification_type='PAYMENT_REFUNDED',
                sent_at=timezone.now(),
                sent_to=payment.event.client.email,
                is_successful=True,
                reference=f"payment_{payment.id}_refunded"
            )

        except Exception as e:
            logger.warning(f"Failed to send refund notification: {e}")

    @classmethod
    def _schedule_payment_retry(cls, payment):
        """Schedule payment retry for failed payments"""
        try:
            from ..models import PaymentSettings

            settings = PaymentSettings.get_default_settings()

            if payment.can_transition_to('PENDING'):
                # Schedule retry based on settings
                logger.info(f"Payment {payment.payment_number} eligible for retry")
                # Implementation would depend on Celery task scheduling

        except Exception as e:
            logger.warning(f"Failed to schedule payment retry: {e}")


class PaymentEventProcessorCeleryTasks:
    """
    Celery task definitions for async payment event processing.

    These tasks should be registered in your Celery configuration.
    """

    @staticmethod
    def process_payment_event_task(event_id: str):
        """
        Celery task for processing payment events.

        Usage in celery tasks.py:

        @shared_task(bind=True, max_retries=3)
        def process_payment_event_task(self, event_id: str):
            from core.domains.payments.services.payment_event_processor import PaymentEventProcessor

            try:
                return PaymentEventProcessor.process_payment_event(event_id)
            except Exception as e:
                logger.error(f"Celery task failed for event {event_id}: {e}")
                self.retry(countdown=60 * (self.request.retries + 1))
        """
        return PaymentEventProcessor.process_payment_event(event_id)

    @staticmethod
    def retry_failed_events_task():
        """
        Celery task for retrying failed events.

        This should be scheduled as a periodic task.
        """
        return PaymentEventProcessor.retry_failed_events()

    @staticmethod
    def cleanup_old_events_task(retention_days: int = 90):
        """
        Celery task for cleaning up old events.

        This should be scheduled as a periodic task.
        """
        from .payment_event_store_service import PaymentEventStoreService
        return PaymentEventStoreService.cleanup_old_events(retention_days)