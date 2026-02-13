# backend/core/domains/payments/services/auto_refund_service.py
"""
Auto-Refund Service

Handles automatic refunds when race conditions occur during booking completion.
This service is triggered when:
1. Payment was successfully processed
2. Date blocking failed because another event blocked the date first
3. The customer needs to be refunded automatically

This implements a graceful failure mechanism for the edge case where
two payments complete nearly simultaneously for the same date.
"""

import logging
from decimal import Decimal
from typing import Dict

from django.db import transaction
from django.utils import timezone

from core.domains.events.models import Event, EventTimeline

logger = logging.getLogger(__name__)


class AutoRefundService:
    """
    Service for handling automatic refunds when race conditions occur.

    This service processes full refunds for all completed payments on an event
    when the date blocking fails due to a race condition (another booking
    took the date first).
    """

    @staticmethod
    @transaction.atomic
    def initiate_refund_for_race_condition(event: Event, reason: str = 'DATE_RACE_CONDITION') -> Dict:
        """
        Initiate full refund when a booking loses the race condition.

        This is called when:
        1. Payment was successfully processed
        2. Date blocking failed because another event blocked the date first

        Steps:
        1. Find all completed payments for this event
        2. Process refunds via gateway
        3. Update event status to CANCELLED with reason
        4. Create timeline entry
        5. Notify customer

        Args:
            event: The event that needs to be refunded
            reason: Reason for the refund (default: DATE_RACE_CONDITION)

        Returns:
            dict: {
                'success': bool,
                'refunds_processed': list of refund IDs,
                'total_refunded': Decimal,
                'error': str or None
            }
        """
        from ..models import Payment, Refund

        result = {
            'success': False,
            'refunds_processed': [],
            'total_refunded': Decimal('0'),
            'error': None
        }

        try:
            # Lock the event
            # Use all_objects to bypass OptimizedEventManager's select_related,
            # which adds LEFT JOINs on nullable FKs incompatible with FOR UPDATE
            locked_event = Event.all_objects.select_for_update().get(id=event.id)

            # Find all completed payments
            payments = Payment.objects.filter(
                event=locked_event,
                status='COMPLETED'
            ).select_for_update()

            if not payments.exists():
                result['success'] = True
                result['error'] = 'No payments to refund'
                logger.info(f"No payments found to refund for event {event.id}")
                return result

            total_refunded = Decimal('0')
            refunds_processed = []

            for payment in payments:
                try:
                    # Process refund through gateway
                    refund_result = AutoRefundService._process_single_refund(
                        payment=payment,
                        reason=reason,
                        event=locked_event
                    )

                    if refund_result['success']:
                        total_refunded += payment.amount
                        refunds_processed.append(refund_result['refund_id'])

                        logger.info(
                            f"Auto-refund processed for payment {payment.id}: "
                            f"{payment.format_amount_with_currency()} refunded"
                        )
                    else:
                        logger.error(
                            f"Failed to refund payment {payment.id}: "
                            f"{refund_result['error']}"
                        )
                except Exception as e:
                    logger.error(f"Error processing refund for payment {payment.id}: {e}")
                    continue

            # Update event status
            locked_event.status = 'CANCELLED'
            locked_event.cancelled_reason = 'DATE_TAKEN'
            locked_event.cancelled_at = timezone.now()
            locked_event.save(update_fields=['status', 'cancelled_reason', 'cancelled_at'])

            # Create timeline entry
            EventTimeline.objects.create(
                event=locked_event,
                action_type='SYSTEM_UPDATE',
                description=(
                    f'Booking automatically cancelled and refunded. '
                    f'Reason: Date was booked by another customer first. '
                    f'Total refunded: {total_refunded}'
                ),
                is_public=True,
                action_data={
                    'reason': reason,
                    'refunds_processed': refunds_processed,
                    'total_refunded': str(total_refunded)
                }
            )

            result['success'] = True
            result['refunds_processed'] = refunds_processed
            result['total_refunded'] = total_refunded

            # Send notification to customer
            AutoRefundService._notify_customer_of_refund(locked_event, total_refunded)

            logger.info(
                f"Auto-refund completed for event {event.id}: "
                f"total refunded {total_refunded}, {len(refunds_processed)} payments"
            )

        except Event.DoesNotExist:
            result['error'] = f"Event {event.id} not found"
            logger.error(result['error'])
        except Exception as e:
            result['error'] = str(e)
            logger.error(f"Error in auto-refund process for event {event.id}: {e}")

        return result

    @staticmethod
    def _process_single_refund(payment, reason: str, event: Event) -> Dict:
        """
        Process a single payment refund.

        Args:
            payment: The Payment object to refund
            reason: Reason for the refund
            event: The Event this payment belongs to

        Returns:
            dict: {'success': bool, 'refund_id': int or None, 'error': str or None}
        """
        from ..models import Refund
        from .refund_service import RefundService

        result = {'success': False, 'refund_id': None, 'error': None}

        try:
            # Check if payment can be refunded
            if payment.status != 'COMPLETED':
                result['error'] = f"Payment {payment.id} is not in COMPLETED status"
                return result

            # Check for existing refunds
            existing_refunds = payment.refunds.filter(status='COMPLETED').aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0')

            if existing_refunds >= payment.amount:
                result['error'] = f"Payment {payment.id} is already fully refunded"
                return result

            refund_amount = payment.amount - existing_refunds

            # Create refund record
            refund = Refund.objects.create(
                payment=payment,
                amount=refund_amount,
                reason=f"Auto-refund: {reason}",
                status='PENDING'
            )

            # Process through gateway
            stripe_transaction = payment.transactions.filter(
                gateway__code='stripe',
                status='COMPLETED'
            ).first()

            if stripe_transaction:
                # Use existing RefundService for Stripe processing
                try:
                    processed_refund = RefundService.process_gateway_refund(
                        refund.id,
                        'stripe'
                    )
                    result['success'] = processed_refund.status == 'COMPLETED'
                    result['refund_id'] = processed_refund.id
                except Exception as e:
                    # If gateway refund fails, mark as pending for manual review
                    refund.status = 'PENDING'
                    refund.gateway_response = {'error': str(e)}
                    refund.save()
                    result['error'] = str(e)
                    logger.warning(
                        f"Gateway refund failed for payment {payment.id}, "
                        f"marked for manual review: {e}"
                    )
            else:
                # No Stripe transaction, create manual refund record
                refund.status = 'PENDING'
                refund.gateway_response = {'note': 'Manual refund required - no gateway transaction found'}
                refund.save()
                result['success'] = True
                result['refund_id'] = refund.id
                logger.warning(
                    f"No gateway transaction found for payment {payment.id}, "
                    f"created manual refund record"
                )

        except Exception as e:
            result['error'] = str(e)
            logger.error(f"Error processing refund for payment {payment.id}: {e}")

        return result

    @staticmethod
    def _notify_customer_of_refund(event: Event, amount: Decimal):
        """
        Send notification to customer about the refund.

        Args:
            event: The cancelled event
            amount: Total refund amount
        """
        try:
            from core.domains.notifications.services import NotificationService

            NotificationService.create_notification(
                recipient=event.client,
                notification_type_code='EVENT_CANCELLED',
                context={
                    'event_name': event.name or event.start_date.strftime("%B %d, %Y"),
                    'event_date': event.start_date.strftime("%B %d, %Y"),
                    'reason': (
                        f'Another customer completed their booking for this date just before you. '
                        f'A full refund of {event.client.default_currency or "PHP"} {amount} has been '
                        f'processed and will appear in your account within 5-10 business days.'
                    ),
                },
                delivery_methods=['IN_APP', 'EMAIL'],
                event=event,
                client=event.client,
            )
            logger.info(f"Refund notification sent to client {event.client_id} for event {event.id}")

        except Exception as e:
            logger.error(f"Failed to send refund notification for event {event.id}: {e}")

        # Also try to send email via communication service
        try:
            from core.domains.communications.services import CommunicationService

            CommunicationService.send_race_condition_refund_email(
                event=event,
                refund_amount=amount
            )
        except ImportError:
            logger.debug("CommunicationService.send_race_condition_refund_email not available")
        except Exception as e:
            logger.warning(f"Failed to send refund email for event {event.id}: {e}")


# Import models at module level for _process_single_refund
from django.db import models
