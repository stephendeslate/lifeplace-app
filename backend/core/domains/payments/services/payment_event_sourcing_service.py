# backend/core/domains/payments/services/payment_event_sourcing_service.py

import logging
from datetime import datetime
from typing import Any

from django.utils import timezone

logger = logging.getLogger(__name__)


class PaymentEventSourcingService:
    """
    Event sourcing service for payment domain events.

    Provides advanced event sourcing capabilities including:
    - Event replay for debugging and data recovery
    - Event stream analysis and aggregation
    - Payment state reconstruction from events
    - Time-travel debugging capabilities
    """

    @classmethod
    def replay_payment_lifecycle(cls, payment_id: int, target_timestamp: datetime = None) -> dict[str, Any]:
        """
        Replay complete payment lifecycle up to a specific point in time.

        This reconstructs the payment state by replaying all events
        in chronological order, useful for debugging and understanding
        payment behavior.

        Args:
            payment_id: Payment to replay
            target_timestamp: Replay up to this point (default: now)

        Returns:
            Dict containing payment state reconstruction
        """
        try:
            from ..models import Payment
            from .payment_event_store_service import PaymentEventStoreService

            # Get the payment
            try:
                payment = Payment.objects.get(id=payment_id)
            except Payment.DoesNotExist:
                return {"success": False, "error": f"Payment {payment_id} not found", "payment_id": payment_id}

            # Get events for replay
            events = PaymentEventStoreService.get_payment_events(payment_id)

            if target_timestamp:
                events = events.filter(created_at__lte=target_timestamp)

            # Perform the replay
            replay_result = cls._perform_event_replay(payment, events.all())

            logger.info(f"Replayed {replay_result['events_processed']} events for payment {payment.payment_number}")

            return {
                "success": True,
                "payment_id": payment_id,
                "payment_number": payment.payment_number,
                **replay_result,
            }

        except Exception as e:
            logger.error(f"Failed to replay payment lifecycle {payment_id}: {e}", exc_info=True)
            return {"success": False, "error": str(e), "payment_id": payment_id}

    @classmethod
    def reconstruct_payment_state_at_time(cls, payment_id: int, timestamp: datetime) -> dict[str, Any]:
        """
        Reconstruct what the payment state was at a specific point in time.

        This is useful for time-travel debugging and understanding
        how the payment looked at different points in its lifecycle.
        """
        try:
            from .payment_event_store_service import PaymentEventStoreService

            # Get events up to the timestamp
            events = (
                PaymentEventStoreService.get_payment_events(payment_id)
                .filter(created_at__lte=timestamp)
                .order_by("created_at")
            )

            if not events.exists():
                return {
                    "success": False,
                    "error": "No events found for the specified timestamp",
                    "payment_id": payment_id,
                    "timestamp": timestamp.isoformat(),
                }

            # Reconstruct state from events
            state_reconstruction = cls._reconstruct_state_from_events(events.all())

            return {
                "success": True,
                "payment_id": payment_id,
                "timestamp": timestamp.isoformat(),
                "reconstructed_state": state_reconstruction,
                "events_used": len(events),
            }

        except Exception as e:
            logger.error(f"Failed to reconstruct payment state: {e}", exc_info=True)
            return {"success": False, "error": str(e), "payment_id": payment_id}

    @classmethod
    def analyze_payment_journey(cls, payment_id: int) -> dict[str, Any]:
        """
        Analyze the complete payment journey with insights and metrics.

        Provides detailed analysis of payment lifecycle including:
        - State transition timeline
        - Processing times and bottlenecks
        - Error patterns and retry analysis
        - Cross-system integration timeline
        """
        try:
            from ..models import Payment
            from .payment_event_store_service import PaymentEventStoreService

            payment = Payment.objects.get(id=payment_id)
            events = PaymentEventStoreService.get_payment_events(payment_id).all()

            if not events:
                return {"success": False, "error": "No events found for payment", "payment_id": payment_id}

            # Analyze the journey
            analysis = {
                "payment_info": {
                    "id": payment_id,
                    "payment_number": payment.payment_number,
                    "amount": str(payment.amount),
                    "currency": payment.currency,
                    "current_status": payment.status,
                    "created_at": payment.created_at.isoformat(),
                },
                "lifecycle_analysis": cls._analyze_lifecycle_timeline(events),
                "performance_metrics": cls._analyze_performance_metrics(events),
                "error_analysis": cls._analyze_error_patterns(events),
                "cross_system_integration": cls._analyze_cross_system_events(events),
                "state_transitions": cls._analyze_state_transitions(events),
            }

            return {"success": True, "analysis": analysis}

        except Exception as e:
            logger.error(f"Failed to analyze payment journey: {e}", exc_info=True)
            return {"success": False, "error": str(e), "payment_id": payment_id}

    @classmethod
    def find_similar_payment_patterns(cls, payment_id: int, similarity_threshold: float = 0.8) -> list[dict[str, Any]]:
        """
        Find payments with similar event patterns.

        Useful for identifying common failure modes, success patterns,
        and comparative analysis.
        """
        try:
            from ..models import Payment
            from .payment_event_store_service import PaymentEventStoreService

            # Get the reference payment's event pattern
            reference_payment = Payment.objects.get(id=payment_id)
            reference_events = PaymentEventStoreService.get_payment_events(payment_id).all()

            if not reference_events:
                return []

            reference_pattern = cls._extract_event_pattern(reference_events)

            # Find other payments with similar patterns
            # This is a simplified implementation - could be enhanced with ML
            similar_payments = []

            # Get recent payments for comparison
            recent_payments = Payment.objects.exclude(id=payment_id).order_by("-created_at")[:100]

            for payment in recent_payments:
                payment_events = PaymentEventStoreService.get_payment_events(payment.id).all()

                if payment_events:
                    pattern = cls._extract_event_pattern(payment_events)
                    similarity = cls._calculate_pattern_similarity(reference_pattern, pattern)

                    if similarity >= similarity_threshold:
                        similar_payments.append(
                            {
                                "payment_id": payment.id,
                                "payment_number": payment.payment_number,
                                "similarity_score": similarity,
                                "status": payment.status,
                                "amount": str(payment.amount),
                                "created_at": payment.created_at.isoformat(),
                            }
                        )

            # Sort by similarity score
            similar_payments.sort(key=lambda x: x["similarity_score"], reverse=True)

            logger.info(f"Found {len(similar_payments)} similar payments to {reference_payment.payment_number}")
            return similar_payments

        except Exception as e:
            logger.error(f"Failed to find similar payment patterns: {e}", exc_info=True)
            return []

    @classmethod
    def generate_event_stream_report(
        cls, filters: dict[str, Any] = None, report_type: str = "summary"
    ) -> dict[str, Any]:
        """
        Generate comprehensive report from event stream.

        Report types:
        - 'summary': High-level statistics and trends
        - 'detailed': Detailed breakdown by event types and states
        - 'performance': Performance and timing analysis
        - 'errors': Error patterns and failure analysis
        """
        try:
            from .payment_event_store_service import PaymentEventStoreService

            # Get events based on filters
            events = PaymentEventStoreService.get_event_stream(filters or {})

            if report_type == "summary":
                return cls._generate_summary_report(events)
            elif report_type == "detailed":
                return cls._generate_detailed_report(events)
            elif report_type == "performance":
                return cls._generate_performance_report(events)
            elif report_type == "errors":
                return cls._generate_error_report(events)
            else:
                return {"success": False, "error": f"Unknown report type: {report_type}"}

        except Exception as e:
            logger.error(f"Failed to generate event stream report: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    @classmethod
    def _perform_event_replay(cls, payment, events) -> dict[str, Any]:
        """Perform actual event replay and track state changes"""
        initial_state = {
            "status": "CREATED",
            "amount": str(payment.amount),
            "currency": payment.currency,
            "created_at": payment.created_at.isoformat(),
        }

        replay_log = []
        current_state = initial_state.copy()
        events_processed = 0

        for event in events:

            # Track state change
            state_change = {
                "timestamp": event.created_at.isoformat(),
                "event_type": event.event_type,
                "from_state": event.from_state,
                "to_state": event.to_state,
                "reason": event.transition_reason,
                "triggered_by": event.triggered_by,
                "processing_status": "processed" if event.processed else "pending",
            }

            if event.processing_errors:
                state_change["errors"] = event.processing_errors

            replay_log.append(state_change)
            current_state["status"] = event.to_state
            events_processed += 1

        return {
            "initial_state": initial_state,
            "final_state": current_state,
            "replay_log": replay_log,
            "events_processed": events_processed,
            "replay_timestamp": timezone.now().isoformat(),
        }

    @classmethod
    def _reconstruct_state_from_events(cls, events) -> dict[str, Any]:
        """Reconstruct payment state from event sequence"""
        state = {"status": "CREATED", "transitions": [], "processing_attempts": 0, "error_count": 0}

        for event in events:
            state["status"] = event.to_state
            state["transitions"].append(
                {
                    "from": event.from_state,
                    "to": event.to_state,
                    "reason": event.transition_reason,
                    "timestamp": event.created_at.isoformat(),
                }
            )

            if event.processing_errors:
                state["error_count"] += len(event.processing_errors)

            if event.retry_count > 0:
                state["processing_attempts"] += event.retry_count

        return state

    @classmethod
    def _analyze_lifecycle_timeline(cls, events) -> dict[str, Any]:
        """Analyze payment lifecycle timeline"""
        if not events:
            return {}

        first_event = events[0]
        last_event = events[len(events) - 1]

        timeline = []
        for event in events:
            timeline.append(
                {
                    "timestamp": event.created_at.isoformat(),
                    "event_type": event.event_type,
                    "state_change": f"{event.from_state} → {event.to_state}",
                    "processed": event.processed,
                }
            )

        total_duration = (last_event.created_at - first_event.created_at).total_seconds()

        return {
            "start_time": first_event.created_at.isoformat(),
            "end_time": last_event.created_at.isoformat(),
            "total_duration_seconds": total_duration,
            "total_events": len(events),
            "timeline": timeline,
        }

    @classmethod
    def _analyze_performance_metrics(cls, events) -> dict[str, Any]:
        """Analyze performance metrics from events"""
        processing_times = []
        total_retries = 0
        failed_events = 0

        for event in events:
            if event.processing_started_at and event.processing_completed_at:
                processing_time = (event.processing_completed_at - event.processing_started_at).total_seconds()
                processing_times.append(processing_time)

            total_retries += event.retry_count
            if event.processing_errors:
                failed_events += 1

        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0

        return {
            "avg_processing_time_seconds": avg_processing_time,
            "total_retries": total_retries,
            "failed_events": failed_events,
            "success_rate": ((len(events) - failed_events) / len(events)) * 100 if events else 0,
        }

    @classmethod
    def _analyze_error_patterns(cls, events) -> list[dict[str, Any]]:
        """Analyze error patterns in events"""
        error_patterns = {}

        for event in events:
            if event.processing_errors:
                for error in event.processing_errors:
                    error_type = error.get("message", "Unknown error")
                    if error_type not in error_patterns:
                        error_patterns[error_type] = {
                            "count": 0,
                            "first_seen": event.created_at.isoformat(),
                            "events": [],
                        }

                    error_patterns[error_type]["count"] += 1
                    error_patterns[error_type]["events"].append(event.event_id)
                    error_patterns[error_type]["last_seen"] = event.created_at.isoformat()

        return [
            {
                "error_type": error_type,
                "count": data["count"],
                "first_seen": data["first_seen"],
                "last_seen": data.get("last_seen"),
                "affected_events": len(data["events"]),
            }
            for error_type, data in error_patterns.items()
        ]

    @classmethod
    def _analyze_cross_system_events(cls, events) -> dict[str, Any]:
        """Analyze cross-system integration events"""
        external_systems = set()
        integration_points = []

        for event in events:
            if event.external_system_refs:
                for system, refs in event.external_system_refs.items():
                    external_systems.add(system)
                    integration_points.append(
                        {
                            "timestamp": event.created_at.isoformat(),
                            "system": system,
                            "event_type": event.event_type,
                            "references": refs,
                        }
                    )

        return {
            "external_systems": list(external_systems),
            "integration_points": integration_points,
            "total_integrations": len(integration_points),
        }

    @classmethod
    def _analyze_state_transitions(cls, events) -> dict[str, Any]:
        """Analyze state transition patterns"""
        transitions = {}
        state_durations = {}
        current_state = None
        state_start_time = None

        for event in events:
            transition_key = f"{event.from_state} → {event.to_state}"

            if transition_key not in transitions:
                transitions[transition_key] = 0
            transitions[transition_key] += 1

            # Calculate time spent in each state
            if current_state and state_start_time:
                duration = (event.created_at - state_start_time).total_seconds()
                if current_state not in state_durations:
                    state_durations[current_state] = []
                state_durations[current_state].append(duration)

            current_state = event.to_state
            state_start_time = event.created_at

        # Calculate average durations
        avg_state_durations = {}
        for state, durations in state_durations.items():
            avg_state_durations[state] = sum(durations) / len(durations)

        return {
            "transition_counts": transitions,
            "avg_state_durations_seconds": avg_state_durations,
            "total_unique_transitions": len(transitions),
        }

    @classmethod
    def _extract_event_pattern(cls, events) -> list[str]:
        """Extract event pattern for similarity comparison"""
        return [f"{event.event_type}:{event.to_state}" for event in events]

    @classmethod
    def _calculate_pattern_similarity(cls, pattern1: list[str], pattern2: list[str]) -> float:
        """Calculate similarity between two event patterns"""
        # Simple Jaccard similarity - could be enhanced with more sophisticated algorithms
        set1 = set(pattern1)
        set2 = set(pattern2)

        if not set1 and not set2:
            return 1.0

        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))

        return intersection / union if union > 0 else 0.0

    @classmethod
    def _generate_summary_report(cls, events) -> dict[str, Any]:
        """Generate summary report from events"""
        from django.db.models import Count

        event_stats = events.aggregate(total_events=Count("id"))

        event_type_breakdown = events.values("event_type").annotate(count=Count("id")).order_by("-count")

        state_breakdown = events.values("to_state").annotate(count=Count("id")).order_by("-count")

        return {
            "success": True,
            "report_type": "summary",
            "generated_at": timezone.now().isoformat(),
            "total_events": event_stats["total_events"],
            "event_type_breakdown": list(event_type_breakdown),
            "state_breakdown": list(state_breakdown),
        }

    @classmethod
    def _generate_detailed_report(cls, events) -> dict[str, Any]:
        """Generate detailed report from events"""
        # Implementation for detailed report
        return {"success": True, "report_type": "detailed", "message": "Detailed report generation not yet implemented"}

    @classmethod
    def _generate_performance_report(cls, events) -> dict[str, Any]:
        """Generate performance report from events"""
        # Implementation for performance report
        return {
            "success": True,
            "report_type": "performance",
            "message": "Performance report generation not yet implemented",
        }

    @classmethod
    def _generate_error_report(cls, events) -> dict[str, Any]:
        """Generate error report from events"""
        # Implementation for error report
        return {"success": True, "report_type": "errors", "message": "Error report generation not yet implemented"}
