# backend/core/domains/payments/services/payment_event_store_service.py

import logging
from datetime import datetime, timedelta
from typing import Any

from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

logger = logging.getLogger(__name__)


class PaymentEventStoreService:
    """
    Service for managing persistent payment domain events.

    This service provides event sourcing capabilities including:
    - Persistent event storage
    - Event replay functionality
    - Cross-system integration support
    - Event processing tracking and retry logic
    """

    @classmethod
    def store_event(cls, event) -> "PaymentEventStore":
        """
        Store a payment domain event persistently.

        Args:
            event: PaymentDomainEvent instance

        Returns:
            PaymentEventStore: Stored event record
        """
        from ..models import PaymentEventStore

        try:
            with transaction.atomic():
                stored_event = PaymentEventStore.objects.create(
                    event_id=event.event_id,
                    event_type=event.__class__.__name__,
                    payment=event.payment,
                    payment_number=event.payment.payment_number,
                    event_data=event.to_dict(),
                    from_state=event.transition.from_state.value,
                    to_state=event.transition.to_state.value,
                    transition_reason=event.transition.reason,
                    triggered_by=event.transition.triggered_by,
                    external_system_refs=cls._generate_external_refs(event),
                )

                logger.debug(f"Stored domain event: {stored_event.event_id} for payment {stored_event.payment_number}")

                return stored_event

        except Exception as e:
            logger.error(f"Failed to store domain event {event.event_id}: {e}", exc_info=True)
            raise

    @classmethod
    def get_payment_events(cls, payment_id: int, event_types: list[str] = None) -> QuerySet:
        """
        Get all stored events for a payment.

        Args:
            payment_id: Payment ID
            event_types: Optional filter by event types

        Returns:
            QuerySet of PaymentEventStore records
        """
        from ..models import PaymentEventStore

        queryset = PaymentEventStore.objects.filter(payment_id=payment_id)

        if event_types:
            queryset = queryset.filter(event_type__in=event_types)

        return queryset.order_by("created_at")

    @classmethod
    def get_unprocessed_events(cls, max_age_hours: int = 24) -> QuerySet:
        """
        Get events that haven't been fully processed.

        Args:
            max_age_hours: Maximum age of events to consider

        Returns:
            QuerySet of unprocessed events
        """
        from ..models import PaymentEventStore

        cutoff_time = timezone.now() - timedelta(hours=max_age_hours)

        return PaymentEventStore.objects.filter(processed=False, created_at__gte=cutoff_time).order_by("created_at")

    @classmethod
    def replay_events(
        cls, payment_id: int, from_timestamp: datetime = None, to_timestamp: datetime = None
    ) -> list[dict[str, Any]]:
        """
        Replay events for a payment within a time range.

        This is useful for debugging, data recovery, and understanding
        the complete payment lifecycle.

        Args:
            payment_id: Payment ID to replay events for
            from_timestamp: Start of replay window
            to_timestamp: End of replay window

        Returns:
            List of event data dictionaries in chronological order
        """
        from ..models import PaymentEventStore

        try:
            queryset = PaymentEventStore.objects.filter(payment_id=payment_id)

            if from_timestamp:
                queryset = queryset.filter(created_at__gte=from_timestamp)

            if to_timestamp:
                queryset = queryset.filter(created_at__lte=to_timestamp)

            events = queryset.order_by("created_at")

            replay_data = []
            for event in events:
                replay_entry = {
                    "event_id": event.event_id,
                    "event_type": event.event_type,
                    "timestamp": event.created_at,
                    "from_state": event.from_state,
                    "to_state": event.to_state,
                    "reason": event.transition_reason,
                    "triggered_by": event.triggered_by,
                    "event_data": event.event_data,
                    "processed": event.processed,
                    "processing_errors": event.processing_errors,
                }
                replay_data.append(replay_entry)

            logger.info(f"Replayed {len(replay_data)} events for payment {payment_id}")

            return replay_data

        except Exception as e:
            logger.error(f"Failed to replay events for payment {payment_id}: {e}", exc_info=True)
            return []

    @classmethod
    def get_event_stream(cls, filters: dict[str, Any] = None, limit: int = 1000) -> QuerySet:
        """
        Get an event stream with optional filters.

        Useful for analytics, monitoring, and cross-system integration.

        Args:
            filters: Dictionary of filter criteria
            limit: Maximum number of events to return

        Returns:
            QuerySet of PaymentEventStore records
        """
        from ..models import PaymentEventStore

        queryset = PaymentEventStore.objects.all()

        if filters:
            # Event type filter
            if "event_types" in filters:
                queryset = queryset.filter(event_type__in=filters["event_types"])

            # State transition filters
            if "from_states" in filters:
                queryset = queryset.filter(from_state__in=filters["from_states"])

            if "to_states" in filters:
                queryset = queryset.filter(to_state__in=filters["to_states"])

            # Time range filters
            if "from_date" in filters:
                queryset = queryset.filter(created_at__gte=filters["from_date"])

            if "to_date" in filters:
                queryset = queryset.filter(created_at__lte=filters["to_date"])

            # Processing status filter
            if "processed" in filters:
                queryset = queryset.filter(processed=filters["processed"])

            # Payment filters
            if "payment_ids" in filters:
                queryset = queryset.filter(payment_id__in=filters["payment_ids"])

            if "event_ids" in filters:
                queryset = queryset.filter(event_id__in=filters["event_ids"])

        return queryset.order_by("-created_at")[:limit]

    @classmethod
    def mark_event_processing_started(cls, event_id: str) -> bool:
        """Mark an event as starting processing"""
        from ..models import PaymentEventStore

        try:
            stored_event = PaymentEventStore.objects.get(event_id=event_id)
            stored_event.mark_processing_started()
            return True
        except PaymentEventStore.DoesNotExist:
            logger.warning(f"Event {event_id} not found for processing start")
            return False

    @classmethod
    def mark_event_processing_completed(cls, event_id: str) -> bool:
        """Mark an event as fully processed"""
        from ..models import PaymentEventStore

        try:
            stored_event = PaymentEventStore.objects.get(event_id=event_id)
            stored_event.mark_processing_completed()
            return True
        except PaymentEventStore.DoesNotExist:
            logger.warning(f"Event {event_id} not found for processing completion")
            return False

    @classmethod
    def add_event_processing_error(
        cls, event_id: str, error_message: str, error_details: dict[str, Any] = None
    ) -> bool:
        """Add processing error to an event"""
        from ..models import PaymentEventStore

        try:
            stored_event = PaymentEventStore.objects.get(event_id=event_id)
            stored_event.add_processing_error(error_message, error_details)
            return True
        except PaymentEventStore.DoesNotExist:
            logger.warning(f"Event {event_id} not found for error logging")
            return False

    @classmethod
    def get_failed_events(cls, max_retries: int = 3) -> QuerySet:
        """
        Get events that have failed processing and can be retried.

        Args:
            max_retries: Maximum number of retries allowed

        Returns:
            QuerySet of failed events that can be retried
        """
        from ..models import PaymentEventStore

        return PaymentEventStore.objects.filter(
            processed=False, retry_count__lt=max_retries, processing_errors__isnull=False
        ).order_by("created_at")

    @classmethod
    def cleanup_old_events(cls, retention_days: int = 90) -> int:
        """
        Clean up old processed events beyond retention period.

        Args:
            retention_days: Number of days to retain events

        Returns:
            Number of events deleted
        """
        from ..models import PaymentEventStore

        cutoff_date = timezone.now() - timedelta(days=retention_days)

        deleted_count = PaymentEventStore.objects.filter(processed=True, created_at__lt=cutoff_date).delete()[0]

        logger.info(f"Cleaned up {deleted_count} old payment events")
        return deleted_count

    @classmethod
    def get_event_statistics(cls, days: int = 30) -> dict[str, Any]:
        """
        Get event statistics for monitoring and analytics.

        Args:
            days: Number of days to analyze

        Returns:
            Dictionary with event statistics
        """
        from django.db.models import Avg, Count

        from ..models import PaymentEventStore

        cutoff_date = timezone.now() - timedelta(days=days)

        stats = PaymentEventStore.objects.filter(created_at__gte=cutoff_date).aggregate(
            total_events=Count("id"),
            processed_events=Count("id", filter={"processed": True}),
            failed_events=Count("id", filter={"retry_count__gt": 0}),
            avg_retry_count=Avg("retry_count"),
        )

        # Event type breakdown
        event_type_stats = (
            PaymentEventStore.objects.filter(created_at__gte=cutoff_date)
            .values("event_type")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        # State transition breakdown
        state_transition_stats = (
            PaymentEventStore.objects.filter(created_at__gte=cutoff_date)
            .values("to_state")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return {
            "period_days": days,
            "total_events": stats["total_events"] or 0,
            "processed_events": stats["processed_events"] or 0,
            "failed_events": stats["failed_events"] or 0,
            "processing_rate": (
                (stats["processed_events"] / stats["total_events"]) * 100 if stats["total_events"] else 0
            ),
            "avg_retry_count": stats["avg_retry_count"] or 0,
            "event_type_breakdown": list(event_type_stats),
            "state_transition_breakdown": list(state_transition_stats),
        }

    @classmethod
    def _generate_external_refs(cls, event) -> dict[str, Any]:
        """
        Generate external system references for cross-system integration.

        This identifies which external systems need to be notified
        about this payment event.
        """
        external_refs = {}

        # Workflow system integration
        if hasattr(event.payment.event, "workflow_template"):
            external_refs["workflow_system"] = {
                "event_id": event.payment.event_id,
                "workflow_template_id": event.payment.event.workflow_template.id,
            }

        # Analytics system integration
        external_refs["analytics_system"] = {
            "payment_id": event.payment.id,
            "client_id": event.payment.event.client_id,
            "event_type": event.__class__.__name__,
        }

        # Notification system integration
        if event.transition.to_state.value in ["COMPLETED", "FAILED", "REFUNDED"]:
            external_refs["notification_system"] = {
                "client_email": event.payment.event.client.email,
                "notification_type": f"PAYMENT_{event.transition.to_state.value}",
                "template_context": {
                    "payment_number": event.payment.payment_number,
                    "amount": str(event.payment.amount),
                    "currency": event.payment.currency,
                },
            }

        return external_refs
