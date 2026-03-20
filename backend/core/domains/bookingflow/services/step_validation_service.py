"""Step validation operations: data validation and availability checking.

Handles validation of step data against step configuration and
availability checking for date/time steps.
"""
import logging

from core.domains.products.models import ProductOption

logger = logging.getLogger(__name__)


def validate_step_data(step, step_data, session=None):
    """Validate step data against step configuration

    Args:
        step: BookingFlowStep instance
        step_data: Data to validate
        session: BookingSession instance (optional, used for authenticated user validation)
    """
    errors = {}

    # Block validation for removed step types
    if step.step_type == "availability_check":
        errors["step_type"] = (
            "Availability check step type is no longer supported. "
            "Use date_time step with availability checking enabled instead."
        )
        return errors

    # Add validation for pricing summary step
    if step.step_type == "pricing_summary":
        # Validate discount code if provided
        if step_data.get("applied_discount_code"):
            try:
                from core.domains.products.services import DiscountService

                discount_code = step_data["applied_discount_code"]
                discount, error_msg, _ = DiscountService.validate_discount_code(discount_code)
                if not discount:
                    errors["applied_discount_code"] = [error_msg or "Invalid or expired discount code"]
            except Exception as e:
                logger.error(f"Error validating discount code: {e}", exc_info=True)
                errors["applied_discount_code"] = ["Unable to validate discount code"]

        # Validate terms acceptance
        config = getattr(step, "pricing_config", None)
        if config:
            show_terms = getattr(config, "show_terms_checkbox", True)
            require_terms = getattr(config, "require_terms_acceptance", True)
            if show_terms and require_terms:
                if not step_data.get("terms_accepted"):
                    errors["terms_accepted"] = ["You must accept the terms and conditions"]

    # Common validation for all step types
    if hasattr(step, f"{step.step_type}_config"):
        config = getattr(step, f"{step.step_type}_config")

        # Step-specific validation based on configuration
        if step.step_type == "introduction":
            if step_data.get("acknowledged") is not True:
                errors["acknowledged"] = ["Acknowledgment is required"]

        elif step.step_type == "date_time":
            # Basic validation
            start_date_str = step_data.get("start_date")
            if not start_date_str:
                errors["start_date"] = ["Date selection is required"]

            # Availability validation - check if date conflicts with CONFIRMED events
            if start_date_str and not errors.get("start_date"):
                try:
                    from datetime import datetime

                    from core.domains.events.services.availability_service import (
                        AvailabilityRequest,
                        availability_service,
                    )

                    # Parse the date
                    start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()

                    # Get event type and booking flow info
                    booking_flow_id = session.booking_flow.id if session and session.booking_flow else None
                    event_type_id = (
                        session.booking_flow.event_type_id
                        if session and session.booking_flow and session.booking_flow.event_type
                        else None
                    )

                    # Create availability request
                    availability_request = AvailabilityRequest(
                        start_date=start_date,
                        event_type_id=event_type_id,
                        booking_flow_id=booking_flow_id,
                        duration_hours=step_data.get("duration", 4),
                        buffer_before_hours=getattr(config, "buffer_before_hours", 0),
                        buffer_after_hours=getattr(config, "buffer_after_hours", 0),
                    )

                    # Check availability
                    availability_info = availability_service.check_date_availability(availability_request)

                    # If date is not available for booking, add error
                    if not availability_info.can_book_event:
                        error_message = "This date is not available for booking"
                        if availability_info.reasons:
                            error_message = availability_info.reasons[0]
                        errors["start_date"] = [error_message]

                except ValueError:
                    errors["start_date"] = ["Invalid date format"]
                except Exception as e:
                    logger.error(f"Error checking date availability: {e}")
                    # Don't block booking if availability check fails
                    pass

        elif step.step_type == "venue_selection":
            # Venue selection validation - validate against min_venues and max_venues
            selected_venue_ids = step_data.get("selected_venue_ids", [])

            # Get configuration for venue constraints
            try:
                venue_config = getattr(step, "venue_selection_config", None)
            except Exception:
                venue_config = None

            if venue_config:
                # If step is skippable, use 0 as effective minimum (allow empty selection)
                config_min_venues = getattr(venue_config, "min_venues", 1)
                min_venues = 0 if step.is_skippable else config_min_venues
                max_venues = getattr(venue_config, "max_venues", 10)

                if len(selected_venue_ids) < min_venues:
                    errors["selected_venue_ids"] = [
                        f"Please select at least {min_venues} venue{'s' if min_venues > 1 else ''}"
                    ]
                elif len(selected_venue_ids) > max_venues:
                    errors["selected_venue_ids"] = [
                        f"You can select up to {max_venues} venue{'s' if max_venues > 1 else ''}"
                    ]

                # Validate selected venues are in available venues (if configured)
                try:
                    if venue_config.available_venues.exists():
                        available_venue_ids = list(venue_config.available_venues.all().values_list("id", flat=True))
                        invalid_venues = [v_id for v_id in selected_venue_ids if v_id not in available_venue_ids]
                        if invalid_venues:
                            errors["selected_venue_ids"] = errors.get("selected_venue_ids", [])
                            errors["selected_venue_ids"].append(
                                f"Venue(s) {invalid_venues} are not available for selection"
                            )
                except Exception as e:
                    # Log but don't fail validation if venue lookup fails
                    logger.warning(f"Could not validate available venues: {e}")
            # If no configuration exists, skip validation (allow any selection)

        elif step.step_type == "questionnaire":
            # Questionnaire validation is handled at the field level
            # The frontend sends data as field_<id>: value
            # We don't need to validate at the questionnaire level

            # Optional: Add field-level validation if needed
            config = step.questionnaire_config
            if config and hasattr(config, "questionnaire_items"):
                questionnaire_items = config.questionnaire_items.all()

                # Collect all fields from all questionnaires
                all_fields = []
                for item in questionnaire_items:
                    questionnaire = item.questionnaire
                    all_fields.extend(questionnaire.fields.all())

                # Validate individual fields
                for field in all_fields:
                    field_key = f"field_{field.id}"
                    field_value = step_data.get(field_key)

                    # Only validate if field is required and empty
                    if field.required and not field_value:
                        errors[field_key] = [f"{field.name} is required"]

        elif step.step_type == "package_selection":
            selected = step_data.get("selected_packages", [])
            if config.min_selection and len(selected) < config.min_selection:
                errors["selected_packages"] = [f"Select at least {config.min_selection} package(s)"]
            if config.max_selection and len(selected) > config.max_selection:
                errors["selected_packages"] = [f"Select at most {config.max_selection} package(s)"]

            # Validate selected packages are in available packages (if configured)
            if config.available_packages.exists():
                available_package_ids = list(config.available_packages.all().values_list("id", flat=True))
                for package in selected:
                    if "product_id" in package and package["product_id"] not in available_package_ids:
                        errors["selected_packages"] = errors.get("selected_packages", [])
                        errors["selected_packages"].append(
                            f"Package {package['product_id']} is not available for selection"
                        )

            # Per-package quantity validation against allow_multiple and maximum_quantity
            for package in selected:
                product_id = package.get("product_id")
                quantity = package.get("quantity", 1)
                if product_id and quantity > 1:
                    try:
                        product = ProductOption.objects.get(id=product_id)
                        if not product.allow_multiple:
                            errors["selected_packages"] = errors.get("selected_packages", [])
                            errors["selected_packages"].append(
                                f"'{product.name}' does not allow multiple quantities"
                            )
                        elif product.maximum_quantity and quantity > product.maximum_quantity:
                            errors["selected_packages"] = errors.get("selected_packages", [])
                            errors["selected_packages"].append(
                                f"'{product.name}' allows a maximum quantity of {product.maximum_quantity}"
                            )
                    except ProductOption.DoesNotExist:
                        pass

        elif step.step_type == "addon_selection":
            selected = step_data.get("selected_addons", [])
            if config.min_selection and len(selected) < config.min_selection:
                errors["selected_addons"] = [f"Select at least {config.min_selection} addon(s)"]
            if config.max_selection and len(selected) > config.max_selection:
                errors["selected_addons"] = [f"Select at most {config.max_selection} addon(s)"]

            # FIXED: Validate selected addons are in available addons (if configured)
            if config.available_addons.exists():  # Check if any addons are configured
                available_addon_ids = list(config.available_addons.all().values_list("id", flat=True))
                for addon in selected:
                    if "product_id" in addon and addon["product_id"] not in available_addon_ids:
                        errors["selected_addons"] = errors.get("selected_addons", [])
                        errors["selected_addons"].append(
                            f"Addon {addon['product_id']} is not available for selection"
                        )

            # Per-addon quantity validation against allow_multiple and maximum_quantity
            for addon in selected:
                product_id = addon.get("product_id")
                quantity = addon.get("quantity", 1)
                if product_id and quantity > 1:
                    try:
                        product = ProductOption.objects.get(id=product_id)
                        if not product.allow_multiple:
                            errors["selected_addons"] = errors.get("selected_addons", [])
                            errors["selected_addons"].append(f"'{product.name}' does not allow multiple quantities")
                        elif product.maximum_quantity and quantity > product.maximum_quantity:
                            errors["selected_addons"] = errors.get("selected_addons", [])
                            errors["selected_addons"].append(
                                f"'{product.name}' allows a maximum quantity of {product.maximum_quantity}"
                            )
                    except ProductOption.DoesNotExist:
                        pass

        elif step.step_type == "contact_info":
            # Enhanced validation for contact_info that considers authenticated users

            # Check if user is authenticated and has required data
            user = session.client if session else None
            is_authenticated = user is not None

            # Full name validation
            if config.require_full_name and not step_data.get("full_name"):
                # For authenticated users, check if we can use their profile data
                if is_authenticated and user.first_name and user.last_name:
                    # Authenticated user has name in profile - validation passes
                    pass
                else:
                    errors["full_name"] = ["Full name is required"]

            # Email validation - CRITICAL FIX for authenticated users
            if config.require_email and not step_data.get("email"):
                # For authenticated users, check if we can use their email
                if is_authenticated and user.email:
                    # Authenticated user email available - validation passes
                    pass
                else:
                    errors["email"] = ["Email is required"]

            # Phone validation
            from core.utils.validators import normalize_phone_number, validate_phone_number

            phone_value = step_data.get("phone", "").strip() if step_data.get("phone") else ""
            if config.require_phone and not phone_value:
                # For authenticated users, check profile phone
                if (
                    is_authenticated
                    and hasattr(user, "profile")
                    and user.profile
                    and getattr(user.profile, "phone", "")
                ):
                    # Authenticated user has phone in profile - validation passes
                    pass
                else:
                    errors["phone"] = ["Phone number is required"]
            elif phone_value:
                # Validate format if a phone was provided (even if not required)
                if not validate_phone_number(phone_value):
                    errors["phone"] = ["Please enter a valid phone number (e.g., 09123456789 or +639123456789)"]
                else:
                    # Normalize to E.164 in step_data for consistent storage
                    normalized = normalize_phone_number(phone_value)
                    if normalized:
                        step_data["phone"] = normalized

            # Address validation (typically not in user profile, so still required)
            if config.require_address and not step_data.get("address"):
                errors["address"] = ["Address is required"]

            # Company validation
            if config.require_company and not step_data.get("company"):
                # For authenticated users, check profile company
                if (
                    is_authenticated
                    and hasattr(user, "profile")
                    and user.profile
                    and getattr(user.profile, "company", "")
                ):
                    # Authenticated user has company in profile - validation passes
                    pass
                else:
                    errors["company"] = ["Company name is required"]

        elif step.step_type == "payment_info":
            # Validate payment data
            if not step_data.get("gateway_id"):
                errors["gateway_id"] = ["Payment gateway selection is required"]
            if config.require_immediate_payment and not step_data.get("payment_method_id"):
                errors["payment_method_id"] = ["Payment method is required"]

    return errors


def check_availability(step_data, config):
    """Check availability for date/time step with enhanced availability features"""
    # This is a placeholder for actual availability checking logic
    # In a real implementation, this would integrate with:
    # - Resource management systems
    # - Staff scheduling systems

    start_date = step_data.get("start_date")
    start_time = step_data.get("start_time")
    step_data.get("end_date")
    step_data.get("end_time")

    if not start_date:
        return {"available": False, "message": "Start date is required"}

    # Check blocked dates
    from datetime import datetime

    if isinstance(start_date, str):
        check_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    else:
        check_date = start_date

    if config.blocked_dates and check_date in config.blocked_dates:
        return {"available": False, "message": "Selected date is not available"}

    # Check available days of week
    if config.available_days_of_week:
        weekday = check_date.weekday()  # 0=Monday, 6=Sunday
        if weekday not in config.available_days_of_week:
            return {"available": False, "message": "Selected day of the week is not available"}

    # Check time slots if time is provided
    if start_time and config.available_time_slots:
        # This would check against configured time slots
        # For now, assume availability
        pass

    # Check resource availability if enabled
    if config.check_resource_availability:
        # This would integrate with resource management system
        # For now, assume available
        pass

    # Check staff availability if enabled
    if config.check_staff_availability:
        # This would integrate with staff scheduling system
        # For now, assume available
        pass

    # Check for overbooking limits
    if not config.allow_overbooking:
        # This would check existing bookings for conflicts
        # For now, assume no conflicts
        pass

    return {"available": True, "message": "Time slot is available"}
