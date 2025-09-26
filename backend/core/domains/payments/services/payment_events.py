# backend/core/domains/payments/services/payment_events.py

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from django.dispatch import Signal
from django.utils import timezone

logger = logging.getLogger(__name__)


# Domain Event Signals
# These signals decouple payment state changes from their side effects
payment_state_changed = Signal()
payment_completed = Signal()
payment_failed = Signal()
payment_cancelled = Signal()
payment_refunded = Signal()


class PaymentDomainEvent:
    """
    Base class for payment domain events.

    Domain events represent important business events that have occurred
    and allow other parts of the system to react asynchronously.
    """
    def __init__(self, payment, transition, timestamp: datetime = None):
        self.payment = payment
        self.transition = transition
        self.timestamp = timestamp or timezone.now()
        self.event_id = f"payment_{payment.id}_{transition.to_state.value}_{self.timestamp.isoformat()}"

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization"""
        return {
            'event_id': self.event_id,
            'event_type': self.__class__.__name__,
            'payment_id': self.payment.id,
            'payment_number': self.payment.payment_number,
            'event_id_fk': self.payment.event_id,
            'from_state': self.transition.from_state.value,
            'to_state': self.transition.to_state.value,
            'reason': self.transition.reason,
            'triggered_by': self.transition.triggered_by,
            'amount': str(self.payment.amount),
            'currency': self.payment.currency,
            'timestamp': self.timestamp.isoformat(),
            'metadata': self.transition.metadata
        }

    def __str__(self):
        return f"{self.__class__.__name__}: Payment {self.payment.payment_number} → {self.transition.to_state.value}"


class PaymentStateChangedEvent(PaymentDomainEvent):
    """Published whenever a payment changes state"""
    pass


class PaymentCompletedEvent(PaymentDomainEvent):
    """Published when a payment is successfully completed"""
    pass


class PaymentFailedEvent(PaymentDomainEvent):
    """Published when a payment fails"""
    pass


class PaymentCancelledEvent(PaymentDomainEvent):
    """Published when a payment is cancelled"""
    pass


class PaymentRefundedEvent(PaymentDomainEvent):
    """Published when a payment is refunded"""
    pass


class PaymentEventPublisher:
    """
    Publishes domain events for payment state changes.

    This decouples payment state logic from side effects like:
    - Workflow triggers
    - Notifications
    - Analytics
    - Cache invalidation
    """

    @classmethod
    def publish_state_change(cls, payment, transition):
        """
        Publish domain events for payment state changes.

        This method publishes both a generic state change event
        and specific events for important state transitions.

        Enhanced in Phase 3 to include persistent event storage
        and async event processing.
        """
        try:
            # Always publish generic state change event
            state_change_event = PaymentStateChangedEvent(payment, transition)

            # Store event persistently for async processing
            cls._store_and_queue_event(state_change_event)

            # Still send synchronous signals for immediate effects
            payment_state_changed.send(
                sender=cls,
                payment=payment,
                transition=transition,
                event=state_change_event
            )

            # Publish and store specific events for important states
            if transition.to_state.value == 'COMPLETED':
                completed_event = PaymentCompletedEvent(payment, transition)
                cls._store_and_queue_event(completed_event)
                payment_completed.send(
                    sender=cls,
                    payment=payment,
                    transition=transition,
                    event=completed_event
                )

            elif transition.to_state.value == 'FAILED':
                failed_event = PaymentFailedEvent(payment, transition)
                cls._store_and_queue_event(failed_event)
                payment_failed.send(
                    sender=cls,
                    payment=payment,
                    transition=transition,
                    event=failed_event
                )

            elif transition.to_state.value == 'CANCELLED':
                cancelled_event = PaymentCancelledEvent(payment, transition)
                cls._store_and_queue_event(cancelled_event)
                payment_cancelled.send(
                    sender=cls,
                    payment=payment,
                    transition=transition,
                    event=cancelled_event
                )

            elif transition.to_state.value == 'REFUNDED':
                refunded_event = PaymentRefundedEvent(payment, transition)
                cls._store_and_queue_event(refunded_event)
                payment_refunded.send(
                    sender=cls,
                    payment=payment,
                    transition=transition,
                    event=refunded_event
                )

            logger.debug(
                f"Published domain events for payment {payment.payment_number} "
                f"state change: {transition.from_state.value} → {transition.to_state.value}"
            )

        except Exception as e:
            logger.error(
                f"Failed to publish domain events for payment {payment.payment_number}: {e}",
                exc_info=True
            )
            # Don't fail the payment transition if event publishing fails

    @classmethod
    def _store_and_queue_event(cls, event):
        """
        Store event persistently and queue for async processing.

        This provides the integration between synchronous payment operations
        and asynchronous event processing.
        """
        try:
            from .payment_event_store_service import PaymentEventStoreService

            # Store the event persistently
            stored_event = PaymentEventStoreService.store_event(event)

            # Queue for async processing
            cls._queue_event_for_processing(stored_event.event_id)

        except Exception as e:
            logger.error(
                f"Failed to store and queue event {event.event_id}: {e}",
                exc_info=True
            )

    @classmethod
    def _queue_event_for_processing(cls, event_id: str):
        """
        Queue event for async processing via Celery.

        This provides the bridge to Celery async processing.
        """
        try:
            # Import Celery task - this should be configured in your Celery setup
            from core.celery import app as celery_app

            # Queue the event processing task
            # The actual task implementation should be in your tasks.py
            celery_app.send_task(
                'payments.process_payment_event',
                args=[event_id],
                countdown=5  # Process after 5 seconds to allow transaction to complete
            )

            logger.debug(f"Queued event {event_id} for async processing")

        except ImportError:
            # Celery not available - process synchronously as fallback
            logger.warning("Celery not available, falling back to synchronous processing")
            cls._fallback_sync_processing(event_id)

        except Exception as e:
            logger.error(f"Failed to queue event {event_id}: {e}")
            # Try fallback sync processing
            cls._fallback_sync_processing(event_id)

    @classmethod
    def _fallback_sync_processing(cls, event_id: str):
        """
        Fallback to synchronous event processing when async is not available.
        """
        try:
            from .payment_event_processor import PaymentEventProcessor

            # Process immediately in the same thread
            PaymentEventProcessor.process_payment_event(event_id)

        except Exception as e:
            logger.error(f"Fallback sync processing failed for event {event_id}: {e}")


class PaymentEventHandlers:
    """
    Event handlers that respond to payment domain events.

    These handlers implement the side effects that should occur
    when payment states change, keeping them decoupled from
    the core payment logic.
    """

    @classmethod
    def setup_event_handlers(cls):
        """Connect event handlers to domain events"""
        payment_state_changed.connect(cls.handle_state_change, sender=PaymentEventPublisher)
        payment_completed.connect(cls.handle_payment_completed, sender=PaymentEventPublisher)
        payment_failed.connect(cls.handle_payment_failed, sender=PaymentEventPublisher)
        payment_cancelled.connect(cls.handle_payment_cancelled, sender=PaymentEventPublisher)
        payment_refunded.connect(cls.handle_payment_refunded, sender=PaymentEventPublisher)

        logger.info("Payment domain event handlers connected")

    @classmethod
    def handle_state_change(cls, sender, payment, transition, event, **kwargs):
        """Handle any payment state change"""
        try:
            logger.debug(f"Handling payment state change: {event}")

            # Update event payment status
            payment.event.update_payment_status()

            # Log to event timeline
            cls._add_to_event_timeline(payment, transition)

            # Invalidate related caches
            cls._invalidate_caches(payment)

        except Exception as e:
            logger.error(
                f"Error handling payment state change for {payment.payment_number}: {e}",
                exc_info=True
            )

    @classmethod
    def handle_payment_completed(cls, sender, payment, transition, event, **kwargs):
        """Handle payment completion side effects"""
        try:
            logger.debug(f"Handling payment completion: {event}")

            # Generate receipt
            if not payment.receipt_number:
                payment.generate_receipt()

            # Send notification
            payment.send_receipt_notification()

            # Update installment if applicable
            if payment.installment:
                payment.installment.status = 'PAID'
                payment.installment.save()

            # Auto-create payment plan for deposit payments
            payment._create_payment_plan_for_deposit()

            # Trigger workflow advancement
            cls._trigger_workflow_advancement(payment)

        except Exception as e:
            logger.error(
                f"Error handling payment completion for {payment.payment_number}: {e}",
                exc_info=True
            )

    @classmethod
    def handle_payment_failed(cls, sender, payment, transition, event, **kwargs):
        """Handle payment failure side effects"""
        try:
            logger.debug(f"Handling payment failure: {event}")

            # Send failure notification (if configured)
            cls._send_failure_notification(payment, transition)

            # Update related records
            if payment.installment:
                payment.installment.check_status()

        except Exception as e:
            logger.error(
                f"Error handling payment failure for {payment.payment_number}: {e}",
                exc_info=True
            )

    @classmethod
    def handle_payment_cancelled(cls, sender, payment, transition, event, **kwargs):
        """Handle payment cancellation side effects"""
        try:
            logger.debug(f"Handling payment cancellation: {event}")

            # Send cancellation notification (if configured)
            cls._send_cancellation_notification(payment, transition)

        except Exception as e:
            logger.error(
                f"Error handling payment cancellation for {payment.payment_number}: {e}",
                exc_info=True
            )

    @classmethod
    def handle_payment_refunded(cls, sender, payment, transition, event, **kwargs):
        """Handle payment refund side effects"""
        try:
            logger.debug(f"Handling payment refund: {event}")

            # Update event payment status
            payment.event.update_payment_status()

            # Send refund notification
            cls._send_refund_notification(payment, transition)

        except Exception as e:
            logger.error(
                f"Error handling payment refund for {payment.payment_number}: {e}",
                exc_info=True
            )

    @classmethod
    def _add_to_event_timeline(cls, payment, transition):
        """Add payment state change to event timeline"""
        try:
            from core.domains.events.models import EventTimeline

            action_type = 'PAYMENT_RECEIVED' if transition.to_state.value == 'COMPLETED' else 'SYSTEM_UPDATE'

            EventTimeline.objects.create(
                event=payment.event,
                action_type=action_type,
                description=f"Payment {payment.payment_number} {transition.to_state.value.lower()}",
                is_public=transition.to_state.value == 'COMPLETED',
                action_data={
                    'payment_id': payment.id,
                    'payment_number': payment.payment_number,
                    'amount': str(payment.amount),
                    'currency': payment.currency,
                    'from_state': transition.from_state.value,
                    'to_state': transition.to_state.value,
                    'reason': transition.reason
                }
            )

        except Exception as e:
            logger.warning(f"Failed to add payment event to timeline: {e}")

    @classmethod
    def _trigger_workflow_advancement(cls, payment):
        """Trigger workflow advancement for completed payments"""
        try:
            # Only trigger workflow for completed payments
            if hasattr(payment.event, 'workflow_template') and payment.event.workflow_template:
                from core.domains.workflows.models import WorkflowTrigger

                # Create workflow trigger
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

                # Check for stages triggered by payment
                next_stages = payment.event.workflow_template.stages.filter(
                    trigger_on_payment_received=True
                ).order_by('stage', 'order')

                if next_stages.exists():
                    next_stage = next_stages.first()
                    # Check if the event meets all criteria for this stage
                    if next_stage.check_advancement_criteria(payment.event):
                        next_stage.apply_to_event(payment.event)

        except Exception as e:
            logger.warning(f"Failed to trigger workflow advancement: {e}")

    @classmethod
    def _invalidate_caches(cls, payment):
        """Invalidate related caches when payment state changes"""
        try:
            # Import cache service if available
            from ..cache_service import PaymentCacheService
            PaymentCacheService.invalidate_payment_cache(payment)
        except ImportError:
            # Cache service not available
            pass
        except Exception as e:
            logger.warning(f"Failed to invalidate payment caches: {e}")

    @classmethod
    def _send_failure_notification(cls, payment, transition):
        """Send notification for payment failure"""
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
    def _send_cancellation_notification(cls, payment, transition):
        """Send notification for payment cancellation"""
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
    def _send_refund_notification(cls, payment, transition):
        """Send notification for payment refund"""
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