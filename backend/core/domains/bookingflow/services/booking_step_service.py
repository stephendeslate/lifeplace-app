# backend/core/domains/bookingflow/services/booking_step_service.py
import logging

from django.db import models, transaction

from ..exceptions import (
    BookingFlowNotFound,
    BookingFlowStepNotFound,
    DuplicateStepType,
)
from ..models import BookingFlow, BookingFlowStep

logger = logging.getLogger(__name__)


class BookingFlowStepService:
    """Service for managing booking flow steps"""

    @staticmethod
    def get_steps_for_flow(flow_id):
        """Get all steps for a booking flow"""
        try:
            flow = BookingFlow.objects.get(id=flow_id)
            return flow.steps.all().order_by("order")
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotFound()

    @staticmethod
    def get_step_by_id(step_id):
        """Get a booking flow step by ID"""
        try:
            return BookingFlowStep.objects.select_related("booking_flow").get(id=step_id)
        except BookingFlowStep.DoesNotExist:
            raise BookingFlowStepNotFound()

    @staticmethod
    def create_step(flow_id: int, step_data: dict) -> BookingFlowStep:
        """
        Create a new booking flow step with robust order handling
        """
        try:
            # Get the booking flow
            booking_flow = BookingFlow.objects.get(id=flow_id)

            # Handle order assignment more robustly
            order = step_data.get("order")
            if order is None or order in {0, ""}:
                # Auto-assign the next available order
                max_order = BookingFlowStep.objects.filter(booking_flow=booking_flow).aggregate(models.Max("order"))[
                    "order__max"
                ]
                step_data["order"] = (max_order or 0) + 1
            else:
                # Ensure order is an integer
                try:
                    order = int(order)
                    step_data["order"] = order
                except (ValueError, TypeError):
                    # Invalid order, auto-assign
                    max_order = BookingFlowStep.objects.filter(booking_flow=booking_flow).aggregate(
                        models.Max("order")
                    )["order__max"]
                    step_data["order"] = (max_order or 0) + 1

                # Check if the provided order already exists
                existing_step = BookingFlowStep.objects.filter(
                    booking_flow=booking_flow, order=step_data["order"]
                ).first()

                if existing_step:
                    # Auto-assign the next available order instead
                    max_order = BookingFlowStep.objects.filter(booking_flow=booking_flow).aggregate(
                        models.Max("order")
                    )["order__max"]
                    step_data["order"] = (max_order or 0) + 1

            # Create the step
            step = BookingFlowStep.objects.create(booking_flow=booking_flow, **step_data)

            logger.info(
                f"Created booking flow step: {step.get_step_type_display()} (ID: {step.id}) for flow: {booking_flow.name}"
            )
            return step

        except BookingFlow.DoesNotExist:
            logger.error(f"Booking flow not found: {flow_id}")
            raise BookingFlowNotFound(f"Booking flow with ID {flow_id} not found")
        except Exception as e:
            logger.error(f"Error creating booking flow step: {e}")
            raise e

    @staticmethod
    def update_step(step_id, step_data):
        """Update an existing booking flow step"""
        step = BookingFlowStepService.get_step_by_id(step_id)

        # Check for duplicate step type if changing
        if "step_type" in step_data and step_data["step_type"] != step.step_type:
            if (
                BookingFlowStep.objects.filter(booking_flow=step.booking_flow, step_type=step_data["step_type"])
                .exclude(id=step.id)
                .exists()
            ):
                raise DuplicateStepType()

        with transaction.atomic():
            # Handle order change specially to maintain sequential ordering
            if "order" in step_data and step_data["order"] != step.order:
                try:
                    new_order = int(step_data["order"])
                    BookingFlowStepService._reorder_step(step, new_order)
                    step_data.pop("order")  # Remove from data as it's handled separately
                except (ValueError, TypeError):
                    # Invalid order, ignore
                    step_data.pop("order", None)

            # Update other fields
            for key, value in step_data.items():
                setattr(step, key, value)

            step.save()
            logger.info(f"Updated step: {step.get_step_type_display()}")
            return step

    @staticmethod
    def delete_step(step_id):
        """Delete a booking flow step"""
        step = BookingFlowStepService.get_step_by_id(step_id)

        with transaction.atomic():
            flow = step.booking_flow
            deleted_order = step.order
            step_name = step.get_step_type_display()

            # Delete the step
            step.delete()

            # Reorder remaining steps to maintain sequential ordering
            remaining_steps = list(
                BookingFlowStep.objects.filter(booking_flow=flow, order__gt=deleted_order)
                .select_for_update()
                .order_by("order")
            )

            for remaining in remaining_steps:
                remaining.order -= 1
                remaining.save(update_fields=["order"])

            logger.info(f"Deleted step: {step_name} and reordered remaining steps")
            return True

    @staticmethod
    def reorder_steps(flow_id, order_mapping):
        """Reorder steps within a booking flow"""
        try:
            flow = BookingFlow.objects.get(id=flow_id)
        except BookingFlow.DoesNotExist:
            raise BookingFlowNotFound()

        with transaction.atomic():
            # Lock all steps for this flow
            steps = list(BookingFlowStep.objects.filter(booking_flow=flow).select_for_update().order_by("order"))

            # Convert string IDs to integers
            int_order_mapping = {int(k): v for k, v in order_mapping.items()}

            # Get maximum order for temporary values (from in-memory list)
            max_order = max((s.order for s in steps), default=0)
            temp_start = max_order + 1000

            # Phase 1: Assign temporary high orders
            for i, step in enumerate(steps):
                if step.id in int_order_mapping:
                    step.order = temp_start + i
                    step.save(update_fields=["order"])

            # Phase 2: Assign final order values
            for step in steps:
                if step.id in int_order_mapping:
                    step.order = int_order_mapping[step.id]
                    step.save(update_fields=["order"])

            logger.info(f"Reordered steps for flow: {flow.name}")

            # Return evaluated list (not lazy queryset) to avoid transaction issues
            return list(BookingFlowStep.objects.filter(booking_flow=flow).order_by("order"))

    @staticmethod
    def _reorder_step(step, new_order):
        """Helper method to reorder a single step"""
        flow = step.booking_flow

        # Get all steps for this flow and lock them (evaluate to list)
        all_steps = list(BookingFlowStep.objects.filter(booking_flow=flow).select_for_update().order_by("order"))

        # Get maximum order for temporary values (from in-memory list)
        max_order = max((s.order for s in all_steps), default=0)
        temp_start = max_order + 1000

        # Assign temporary orders
        for i, s in enumerate(all_steps):
            s.order = temp_start + i
            s.save(update_fields=["order"])

        # Create list in desired order
        step_list = [s for s in all_steps if s.id != step.id]
        insert_position = min(new_order - 1, len(step_list))
        step_list.insert(insert_position, step)

        # Assign final sequential orders
        for i, s in enumerate(step_list, start=1):
            s.order = i
            s.save(update_fields=["order"])
