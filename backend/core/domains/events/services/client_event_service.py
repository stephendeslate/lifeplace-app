# backend/core/domains/events/services/client_event_service.py
import logging

from django.db import transaction
from django.db.models import Prefetch
from django.utils import timezone

from ..exceptions import EventNotFound
from ..models import Event, EventFile, EventTimeline

logger = logging.getLogger(__name__)


class ClientEventService:
    """Service for client-specific event operations"""

    @staticmethod
    def get_client_events(client_id, status=None, upcoming_only=False):
        """
        Get all events for a specific client with filtering
        """
        queryset = Event.objects.filter(client_id=client_id)

        if status:
            queryset = queryset.filter(status=status)

        if upcoming_only:
            queryset = queryset.filter(start_date__gte=timezone.now())

        # Prefetch related data for optimization
        queryset = queryset.select_related("event_type", "workflow_template", "current_stage").prefetch_related(
            "product_options",
            "tasks",
            Prefetch("timeline", queryset=EventTimeline.objects.filter(is_public=True), to_attr="public_timeline"),
            Prefetch(
                "files",
                queryset=EventFile.objects.filter(is_public=True),  # Using existing is_public field
                to_attr="client_files",
            ),
        )

        return queryset.order_by("start_date")

    @staticmethod
    def get_client_event_detail(event_id, client_id):
        """
        Get detailed event information for a client's own event
        """
        try:
            event = (
                Event.objects.select_related("event_type", "workflow_template", "current_stage")
                .prefetch_related(
                    "event_products__product_option",
                    "tasks",
                    Prefetch(
                        "timeline", queryset=EventTimeline.objects.filter(is_public=True), to_attr="public_timeline"
                    ),
                    Prefetch(
                        "files",
                        queryset=EventFile.objects.filter(is_public=True),  # Using existing is_public field
                        to_attr="client_files",
                    ),
                )
                .get(id=event_id, client_id=client_id)
            )

            return event
        except Event.DoesNotExist:
            raise EventNotFound()

    @staticmethod
    def get_event_timeline(event_id, client_id):
        """
        Get public timeline entries for a client's event
        """
        try:
            event = Event.objects.get(id=event_id, client_id=client_id)
        except Event.DoesNotExist:
            raise EventNotFound()

        return EventTimeline.objects.filter(event=event, is_public=True).order_by("-created_at")

    @staticmethod
    def get_client_accessible_documents(event_id, client_id):
        """
        Get documents accessible to the client for their event
        """
        try:
            event = Event.objects.get(id=event_id, client_id=client_id)
        except Event.DoesNotExist:
            raise EventNotFound()

        return EventFile.objects.filter(
            event=event,
            is_public=True,  # Using existing is_public field
        ).order_by("-created_at")

    @staticmethod
    def update_client_preferences(event_id, client_id, preferences_data):
        """
        Update client preferences for their event
        """
        try:
            event = Event.objects.get(id=event_id, client_id=client_id)
        except Event.DoesNotExist:
            raise EventNotFound()

        with transaction.atomic():
            # Update only preferences field
            if "preferences" in preferences_data:
                event.preferences = preferences_data["preferences"]
                event.save(update_fields=["preferences"])

            # Log the update
            EventTimeline.objects.create(
                event=event,
                action_type="CLIENT_MESSAGE",
                description="Client updated preferences",
                actor_id=client_id,
                is_public=True,
            )

            logger.info(f"Client {client_id} updated preferences for event {event_id}")
            return event

    @staticmethod
    def request_cancellation(event_id, client_id, reason=""):
        """
        Submit a cancellation request for a client's event.
        Does not directly cancel — creates a request for admin review.
        """
        try:
            event = Event.objects.get(id=event_id, client_id=client_id)
        except Event.DoesNotExist:
            raise EventNotFound()

        if event.status not in ("LEAD", "CONFIRMED"):
            raise ValueError("Only active events can be submitted for cancellation.")

        if event.cancellation_requested:
            raise ValueError("A cancellation request has already been submitted for this event.")

        with transaction.atomic():
            event.cancellation_requested = True
            event.cancellation_requested_at = timezone.now()
            event.cancellation_request_reason = reason
            event.save(
                update_fields=[
                    "cancellation_requested",
                    "cancellation_requested_at",
                    "cancellation_request_reason",
                ]
            )

            EventTimeline.objects.create(
                event=event,
                action_type="CANCELLATION_REQUESTED",
                description=f"Client requested cancellation: {reason}" if reason else "Client requested cancellation",
                actor_id=client_id,
                is_public=True,
            )

            logger.info(f"Client {client_id} requested cancellation for event {event_id}")

        # Notify all admins asynchronously
        try:
            from core.domains.notifications.services import NotificationService
            from core.domains.users.models import User

            admin_users = User.objects.filter(role="ADMIN", is_active=True)
            for admin in admin_users:
                NotificationService.create_notification(
                    recipient=admin,
                    notification_type_code="EVENT_CANCELLED",
                    context={
                        "event_id": event.id,
                        "event_name": event.name or f"Event #{event.id}",
                        "reason": reason or "Not provided",
                        "action": "cancellation_request",
                    },
                    event=event,
                )
        except Exception as e:
            logger.warning(f"Failed to send cancellation request notification: {e}")

        return event
