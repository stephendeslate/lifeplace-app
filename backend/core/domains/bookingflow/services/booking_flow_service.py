# backend/core/domains/bookingflow/services/booking_flow_service.py
import logging

from django.db import models, transaction
from django.db.models import Count, Q

from ..exceptions import BookingFlowNotFound
from ..models import BookingFlow, BookingFlowStep, BookingSession
from .booking_step_service import BookingFlowStepService
from .step_configuration_service import BookingFlowStepConfigurationService

logger = logging.getLogger(__name__)


class BookingFlowService:
    """Service for managing booking flows"""

    @staticmethod
    def get_all_flows(search_query=None, event_type_id=None, is_active=None):
        """Get all booking flows with optional filtering and optimized annotations"""
        queryset = (
            BookingFlow.objects.select_related("event_type")
            .prefetch_related("steps", "allowed_payment_gateways", "default_payment_gateway")
            .annotate(
                # Annotate step counts to avoid N+1 queries in serializers
                _total_steps=Count("steps"),
                _enabled_steps_count=Count("steps", filter=Q(steps__is_enabled=True)),
            )
        )

        if search_query:
            queryset = queryset.filter(Q(name__icontains=search_query) | Q(description__icontains=search_query))

        if event_type_id:
            queryset = queryset.filter(event_type_id=event_type_id)

        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)

        return queryset.order_by("name")

    @staticmethod
    def get_flow_by_id(flow_id):
        """Get a booking flow by ID"""
        try:
            return (
                BookingFlow.objects.select_related(
                    "event_type",
                    "workflow_template",
                    "confirmation_email_template",
                    "reminder_email_template",
                    "default_payment_gateway",
                )
                .prefetch_related(
                    "steps__introduction_config",
                    "steps__datetime_config",
                    "steps__questionnaire_config__questionnaire_items__questionnaire",
                    "steps__package_config__available_categories",
                    "steps__package_config__available_packages",
                    "steps__addon_config__available_categories",
                    "steps__addon_config__available_addons",
                    "steps__contact_config",
                    "steps__payment_config",
                    "steps__payment_terms_config",
                    "steps__confirmation_config",
                    "available_discounts",
                    "allowed_payment_gateways",
                )
                .get(id=flow_id)
            )
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotFound()

    @staticmethod
    def create_flow(flow_data):
        """Create a new booking flow with proper data handling"""
        with transaction.atomic():
            # Extract steps data and many-to-many fields
            steps_data = flow_data.pop("steps", [])
            available_discounts = flow_data.pop("available_discounts", [])
            allowed_payment_gateways = flow_data.pop("allowed_payment_gateways", [])

            # Handle event_type conversion
            event_type = flow_data.get("event_type")
            if event_type in {"", "null"} or event_type is None:
                flow_data["event_type"] = None

            # Create the booking flow
            flow = BookingFlow.objects.create(**flow_data)

            # Set many-to-many relationships
            if available_discounts:
                flow.available_discounts.set(available_discounts)

            if allowed_payment_gateways:
                flow.allowed_payment_gateways.set(allowed_payment_gateways)

            # Create steps if provided
            for step_data in steps_data:
                BookingFlowStepService.create_step(flow.id, step_data)

            logger.info(f"Created new booking flow: {flow.name}")
            return flow

    @staticmethod
    def update_flow(flow_id, flow_data):
        """Update an existing booking flow with proper data handling"""
        flow = BookingFlowService.get_flow_by_id(flow_id)

        with transaction.atomic():
            # Handle steps separately if provided
            steps_data = flow_data.pop("steps", None)
            available_discounts = flow_data.pop("available_discounts", None)
            allowed_payment_gateways = flow_data.pop("allowed_payment_gateways", None)

            # Handle event_type conversion
            if "event_type" in flow_data:
                event_type = flow_data["event_type"]
                if event_type in {"", "null"}:
                    flow_data["event_type"] = None

            # Update flow fields
            for key, value in flow_data.items():
                setattr(flow, key, value)

            flow.save()

            # Update many-to-many relationships if provided
            if available_discounts is not None:
                flow.available_discounts.set(available_discounts)

            if allowed_payment_gateways is not None:
                flow.allowed_payment_gateways.set(allowed_payment_gateways)

            # Update steps if provided
            if steps_data is not None:
                # Clear existing steps and create new ones
                flow.steps.all().delete()

                for step_data in steps_data:
                    BookingFlowStepService.create_step(flow.id, step_data)

            logger.info(f"Updated booking flow: {flow.name}")
            return flow

    @staticmethod
    def delete_flow(flow_id):
        """Delete a booking flow"""
        flow = BookingFlowService.get_flow_by_id(flow_id)

        # Check if flow has active sessions
        from django.utils import timezone

        active_sessions = BookingSession.objects.filter(
            booking_flow=flow, is_completed=False, is_abandoned=False, expires_at__gt=timezone.now()
        ).exists()

        if active_sessions:
            # Instead of preventing deletion, mark sessions as abandoned
            BookingSession.objects.filter(booking_flow=flow, is_completed=False, is_abandoned=False).update(
                is_abandoned=True,
                booking_data=models.F("booking_data") | {"abandonment_reason": "Booking flow deleted"},
            )

        with transaction.atomic():
            flow_name = flow.name
            flow.delete()
            logger.info(f"Deleted booking flow: {flow_name}")
            return True

    @staticmethod
    def duplicate_flow(flow_id, new_name, copy_steps=True, copy_configuration=True):
        """Duplicate a booking flow"""
        source_flow = BookingFlowService.get_flow_by_id(flow_id)

        with transaction.atomic():
            # Create new flow with duplicated data
            new_flow_data = {
                "name": new_name,
                "description": f"Copy of {source_flow.description}",
                "event_type": source_flow.event_type,
                "workflow_template": source_flow.workflow_template,
                "confirmation_email_template": source_flow.confirmation_email_template,
                "reminder_email_template": source_flow.reminder_email_template,
                "is_active": False,  # Start as inactive
                "allow_guest_booking": source_flow.allow_guest_booking,
                "require_account_creation": source_flow.require_account_creation,
                "auto_approve_bookings": source_flow.auto_approve_bookings,
                "enable_progress_saving": source_flow.enable_progress_saving,
                "max_advance_booking_days": source_flow.max_advance_booking_days,
                "min_advance_booking_days": source_flow.min_advance_booking_days,
                "allow_discounts": source_flow.allow_discounts,
                "redirect_url": source_flow.redirect_url,
                "success_message": source_flow.success_message,
                "conversion_tracking_code": source_flow.conversion_tracking_code,
                "default_payment_gateway": source_flow.default_payment_gateway,
                "require_immediate_payment": source_flow.require_immediate_payment,
            }

            new_flow = BookingFlow.objects.create(**new_flow_data)

            # Copy available discounts and payment gateways
            new_flow.available_discounts.set(source_flow.available_discounts.all())
            new_flow.allowed_payment_gateways.set(source_flow.allowed_payment_gateways.all())

            # Copy steps if requested
            if copy_steps:
                for step in source_flow.steps.all().order_by("order"):
                    new_step = BookingFlowStep.objects.create(
                        booking_flow=new_flow,
                        step_type=step.step_type,
                        description=step.description,
                        order=step.order,
                        is_enabled=step.is_enabled,
                        is_required=step.is_required,
                        is_skippable=step.is_skippable,
                        display_conditions=step.display_conditions.copy(),
                        configuration=step.configuration.copy(),
                        validation_rules=step.validation_rules.copy(),
                    )

                    # Copy step configurations if requested
                    if copy_configuration:
                        BookingFlowStepConfigurationService.duplicate_step_configuration(step.id, new_step.id)

            logger.info(f"Duplicated booking flow: {source_flow.name} -> {new_name}")
            return new_flow
