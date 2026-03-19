"""Event creation operations for booking flow.

Handles creating events from booking session data, including date/time parsing,
venue time calculation, product extraction, questionnaire response saving,
date blocking, and rebook completion.
"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any

from django.utils import timezone

logger = logging.getLogger(__name__)


def get_event_duration_from_booking_data(booking_data):
    """Extract event duration from booking data"""
    if "duration" in booking_data:
        return booking_data.get("duration")

    for _step_key, step_data in booking_data.items():
        if isinstance(step_data, dict):
            if "duration" in step_data:
                return step_data["duration"]
            elif "start_time" in step_data and "end_time" in step_data:
                try:
                    start_time = datetime.strptime(step_data["start_time"], "%H:%M")
                    end_time = datetime.strptime(step_data["end_time"], "%H:%M")
                    duration_seconds = (end_time - start_time).seconds
                    return int(duration_seconds // 3600)
                except (ValueError, TypeError):
                    continue
    return None


def extract_event_products(booking_data: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract event products from booking data for EventProductOption creation"""
    from core.domains.sales.pricing_service import PricingCalculationService

    selected_packages = PricingCalculationService._extract_selected_items(booking_data, "selected_packages")
    selected_addons = PricingCalculationService._extract_selected_items(booking_data, "selected_addons")

    event_products = []

    for package_data in selected_packages:
        try:
            product_id = package_data.get("product_id")
            if not product_id:
                continue

            event_product = {
                "product_option_id": product_id,
                "quantity": int(package_data.get("quantity", 1)),
                "final_price": Decimal(str(package_data.get("price", 0))),
                "num_participants": package_data.get("num_participants"),
                "num_nights": package_data.get("num_nights"),
                "excess_hours": package_data.get("excess_hours"),
            }
            event_products.append(event_product)
        except (ValueError, TypeError) as e:
            logger.warning(f"Error processing package data: {e}")
            continue

    for addon_data in selected_addons:
        try:
            product_id = addon_data.get("product_id")
            if not product_id:
                continue

            event_product = {
                "product_option_id": product_id,
                "quantity": int(addon_data.get("quantity", 1)),
                "final_price": Decimal(str(addon_data.get("price", 0))),
                "num_participants": addon_data.get("num_participants"),
                "num_nights": addon_data.get("num_nights"),
                "excess_hours": addon_data.get("excess_hours"),
            }
            event_products.append(event_product)
        except (ValueError, TypeError) as e:
            logger.warning(f"Error processing addon data: {e}")
            continue

    return event_products


def extract_venue_id_from_booking_data(booking_data: dict[str, Any]) -> int | None:
    """
    Extract venue ID from booking session data.

    Looks in multiple locations where venue might be stored:
    1. package_selection step data
    2. selected_packages with venue_id
    3. venue_additional_hours keys
    4. datetime step data
    """
    package_selection = booking_data.get("package_selection", {})
    if isinstance(package_selection, dict):
        venue_id = package_selection.get("venue_id")
        if venue_id:
            try:
                return int(venue_id)
            except (ValueError, TypeError):
                pass

    selected_packages = booking_data.get("selected_packages", [])
    if isinstance(selected_packages, list) and selected_packages:
        for pkg in selected_packages:
            if isinstance(pkg, dict) and pkg.get("venue_id"):
                try:
                    return int(pkg["venue_id"])
                except (ValueError, TypeError):
                    pass

    venue_hours = booking_data.get("venue_additional_hours", {})
    if isinstance(venue_hours, dict) and venue_hours:
        try:
            first_key = next(iter(venue_hours.keys()))
            return int(first_key)
        except (ValueError, TypeError, StopIteration):
            pass

    datetime_data = booking_data.get("datetime", {})
    if isinstance(datetime_data, dict):
        venue_id = datetime_data.get("venue_id")
        if venue_id:
            try:
                return int(venue_id)
            except (ValueError, TypeError):
                pass

    return None


def _parse_date_field(date_value, field_name, use_end_of_day=False):
    """Parse a date string or object into a datetime.

    Args:
        date_value: String or date/datetime object
        field_name: Field name for logging
        use_end_of_day: If True, use end of day for date-only strings

    Returns:
        datetime or None
    """
    if isinstance(date_value, str) and date_value.strip():
        try:
            for date_format in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"]:
                try:
                    if "T" in date_format:
                        return datetime.strptime(date_value, date_format)
                    else:
                        parsed_date = datetime.strptime(date_value, date_format).date()
                        if use_end_of_day:
                            return datetime.combine(parsed_date, datetime.max.time().replace(microsecond=0))
                        else:
                            return datetime.combine(parsed_date, datetime.min.time())
                except ValueError:
                    continue
            logger.warning(f"{field_name} parsing failed (no format matched): {date_value}")
            return None
        except Exception as e:
            logger.warning(f"{field_name} parsing exception: {e}")
            return None
    elif hasattr(date_value, "isoformat"):
        return date_value
    return None


def _extract_event_data_from_steps(booking_data, session):
    """Extract event data from booking session step data.

    Args:
        booking_data: Session booking data dict
        session: BookingSession instance

    Returns:
        dict of event field data
    """
    event_data = {
        "client": session.client,
        "event_type": session.booking_flow.event_type,
        "status": "LEAD",
        "workflow_template": session.booking_flow.workflow_template,
        "name": "Booking from Client Portal",
        "start_date": timezone.now(),
    }

    allowed_event_fields = {
        "event_name": "name",
        "start_date": "start_date",
        "end_date": "end_date",
        "start_time": "start_time",
        "end_time": "end_time",
        "guest_count": "guest_count",
        "description": "description",
    }

    for _step_key, step_data in booking_data.items():
        if isinstance(step_data, dict):
            for field_name, event_field in allowed_event_fields.items():
                if field_name in step_data:
                    if field_name == "event_name":
                        event_data["name"] = step_data["event_name"]
                    elif field_name in ["guest_count", "description"]:
                        event_data[event_field] = step_data[field_name]

            # Handle date/time properly
            if "start_date" in step_data:
                start_date = step_data["start_date"]
                start_time = step_data.get("start_time")

                if start_time:
                    if isinstance(start_date, str):
                        start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
                    if isinstance(start_time, str):
                        start_time = datetime.strptime(start_time, "%H:%M").time()
                    event_data["start_date"] = datetime.combine(start_date, start_time)
                else:
                    parsed = _parse_date_field(start_date, "Start date")
                    if parsed:
                        event_data["start_date"] = parsed
                    elif not hasattr(start_date, "isoformat"):
                        logger.warning(
                            f"Invalid start_date format or empty: {start_date}, using current time as fallback"
                        )
                        event_data["start_date"] = timezone.now()

            if "end_date" in step_data:
                end_date = step_data["end_date"]
                end_time = step_data.get("end_time")

                if end_time:
                    if isinstance(end_date, str):
                        end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
                    if isinstance(end_time, str):
                        end_time = datetime.strptime(end_time, "%H:%M").time()
                    event_data["end_date"] = datetime.combine(end_date, end_time)
                else:
                    parsed = _parse_date_field(end_date, "End date", use_end_of_day=True)
                    if parsed:
                        event_data["end_date"] = parsed

    return event_data


def _auto_generate_event_name(event_data, session):
    """Auto-generate event name if not explicitly provided."""
    if event_data.get("name") != "Booking from Client Portal":
        return

    name_parts = []

    if session.client:
        client_name = session.client.get_full_name()
        if client_name:
            name_parts.append(client_name)

    if session.booking_flow and session.booking_flow.event_type:
        event_type_name = session.booking_flow.event_type.name
        if event_type_name:
            name_parts.append(event_type_name)

    start_date = event_data.get("start_date")
    if start_date and hasattr(start_date, "strftime"):
        formatted_date = start_date.strftime("%B %d, %Y")
        name_parts.append(formatted_date)

    if name_parts:
        event_data["name"] = " ".join(name_parts)
        logger.info(f"AUTO_EVENT_NAME: Generated event name: '{event_data['name']}'")


def _apply_venue_times(event_data, booking_data):
    """Auto-populate scheduled check-in/checkout times from venue rules."""
    venue_id = extract_venue_id_from_booking_data(booking_data)
    if not venue_id:
        return

    try:
        from core.domains.venues.models import Venue
        from core.domains.venues.services import VenueService

        venue = Venue.objects.get(id=venue_id)
        event_data["venue"] = venue

        start_date = event_data.get("start_date")
        if start_date:
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace("Z", "+00:00"))

            program_date = start_date.date()
            program_start_time = start_date.time()

            end_date = event_data.get("end_date")
            if end_date:
                if isinstance(end_date, str):
                    end_date = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                duration_hours = (end_date - start_date).total_seconds() / 3600
            else:
                duration_hours = 4

            calculated_times = VenueService.calculate_event_times(
                venue=venue,
                program_date=program_date,
                program_start_time=program_start_time,
                program_hours=Decimal(str(max(1, duration_hours))),
            )

            event_data["scheduled_check_in_time"] = calculated_times.ingress_start
            event_data["scheduled_checkout_time"] = calculated_times.scheduled_checkout

            logger.info(
                f"AUTO_SCHEDULED_TIMES: venue={venue.name}, "
                f"check_in={calculated_times.ingress_start}, "
                f"checkout={calculated_times.scheduled_checkout}"
            )

    except Exception as e:
        if "DoesNotExist" in type(e).__name__:
            logger.warning(f"Venue with id={venue_id} not found. Skipping scheduled time calculation.")
        else:
            logger.warning(f"Could not calculate venue times: {e}")


def _filter_event_fields(event_data):
    """Filter event data to only allowed Event model fields."""
    allowed_event_fields = {
        "client",
        "event_type",
        "status",
        "completion_type",
        "name",
        "start_date",
        "end_date",
        "workflow_template",
        "current_stage",
        "lead_source",
        "last_contacted",
        "total_price",
        "event_products",
        "payment_status",
        "total_amount_due",
        "total_amount_paid",
        "preferences",
        "guest_count",
        "description",
        "scheduled_check_in_time",
        "scheduled_checkout_time",
        "venue",
    }

    filtered = {}
    for key, value in event_data.items():
        if key in allowed_event_fields:
            filtered[key] = value
        else:
            logger.warning(f"Filtering out invalid field '{key}' with value '{value}' from event creation")

    return filtered


def _apply_date_blocking(event, booking_data):
    """Apply date blocking policy based on booking flow configuration."""
    try:
        from core.domains.events.services.date_blocking_service import DateBlockingService

        should_block, policy = DateBlockingService.should_block_on_booking_completion(event)
        logger.info(f"Date blocking policy for event {event.id}: {policy} (should_block={should_block})")

        if should_block:
            if DateBlockingService.is_date_blocked(event.start_date, exclude_event_id=event.id):
                logger.warning(
                    f"Date {event.start_date.date()} is already blocked. "
                    f"Event {event.id} created but date not blocked."
                )
            else:
                DateBlockingService.block_date(event, reason="Immediate blocking on booking completion")
                logger.info(f"Date blocked immediately for event {event.id}")
        else:
            terms = DateBlockingService.get_effective_payment_terms(event)
            deadline_days = terms.get("downpayment_deadline_days", 7)

            DateBlockingService.set_downpayment_deadline(event, deadline_days)
            logger.info(
                f"Set downpayment deadline for event {event.id}: "
                f"{deadline_days} days from now ({event.downpayment_deadline})"
            )

            try:
                from core.domains.events.tasks import check_downpayment_deadline

                check_downpayment_deadline.apply_async(args=[event.id], eta=event.downpayment_deadline)
                logger.info(f"Scheduled deadline check task for event {event.id}")
            except ImportError:
                logger.warning("Celery tasks not available - deadline check not scheduled")
            except Exception as task_error:
                logger.warning(f"Could not schedule deadline task: {task_error}")

    except Exception as blocking_error:
        logger.error(f"Error applying date blocking policy: {blocking_error}")


def _handle_rebook(event, booking_data):
    """Handle rebook completion if this is a rebooked event."""
    try:
        if booking_data.get("is_rebook") and booking_data.get("original_event_id"):
            from core.domains.events.services.rebook_service import EventRebookService

            EventRebookService.complete_rebook(event, booking_data["original_event_id"])
            logger.info(f"Completed rebook for event {event.id} from original {booking_data['original_event_id']}")
    except Exception as rebook_error:
        logger.warning(f"Error completing rebook: {rebook_error}")


def _create_event_notes(event, session):
    """Create notes for the event after creation."""
    from .session_lifecycle_service import extract_booking_metadata

    try:
        from django.contrib.contenttypes.models import ContentType

        Note = ContentType.objects.get(app_label="notes", model="note").model_class()
        event_content_type = ContentType.objects.get_for_model(event)

        note_text = f"Created from booking session {session.session_id}"
        if session.booking_flow.is_test_mode:
            note_text += " (Test Mode)"

        Note.objects.create(
            content_type=event_content_type,
            object_id=event.id,
            content=note_text,
            created_by=session.client,
            is_client_visible=False,
        )

        metadata = extract_booking_metadata(session)
        special_requests = metadata.get("special_requests", "").strip()

        if special_requests:
            Note.objects.create(
                content_type=event_content_type,
                object_id=event.id,
                title="Client Special Requests",
                content=special_requests,
                created_by=session.client,
                is_client_visible=True,
            )
            logger.info(f"Created special requests note for event {event.id}")

    except Exception as e:
        logger.warning(f"Could not create note for event: {e}")


def _save_questionnaire_responses(event, session):
    """Save questionnaire responses from booking data to the event."""
    try:
        from core.domains.questionnaires.services import QuestionnaireResponseService

        questionnaire_responses_dict = {}

        if "questionnaire" in session.booking_data:
            questionnaire_data = session.booking_data["questionnaire"]
            if isinstance(questionnaire_data, list):
                for response in questionnaire_data:
                    if isinstance(response, dict) and "field" in response:
                        questionnaire_responses_dict[response["field"]] = response

        questionnaire_step_ids = set(
            session.booking_flow.steps.filter(step_type="questionnaire").values_list("id", flat=True)
        )
        logger.info(f"Found {len(questionnaire_step_ids)} questionnaire steps: {questionnaire_step_ids}")

        for step_key, step_data in session.booking_data.items():
            if isinstance(step_data, dict) and step_key.startswith("step_"):
                try:
                    step_id = int(step_key.replace("step_", ""))
                except (ValueError, TypeError):
                    continue

                if step_id not in questionnaire_step_ids:
                    continue

                logger.info(f"Processing questionnaire step {step_id}")

                if "responses" in step_data and isinstance(step_data["responses"], list):
                    for response in step_data["responses"]:
                        if isinstance(response, dict) and "field" in response:
                            questionnaire_responses_dict[response["field"]] = response

                for field_key, value in step_data.items():
                    if field_key.startswith("field_"):
                        field_id = field_key.replace("field_", "")
                        try:
                            field_id_int = int(field_id)
                            questionnaire_responses_dict[field_id_int] = {"field": field_id_int, "value": value}
                        except (ValueError, TypeError):
                            logger.warning(f"Invalid field ID in key: {field_key}")
                            continue

        questionnaire_responses = list(questionnaire_responses_dict.values())
        logger.info(f"Extracted {len(questionnaire_responses)} unique questionnaire responses")

        if questionnaire_responses:
            responses_data = []
            for response in questionnaire_responses:
                if isinstance(response, dict) and "field" in response and "value" in response:
                    responses_data.append({"field": response["field"], "value": str(response["value"])})

            if responses_data:
                QuestionnaireResponseService.save_event_responses(event.id, responses_data)
                logger.info(f"Created {len(responses_data)} questionnaire responses for event {event.id}")

                # Auto-populate num_participants from guest count fields
                try:
                    from core.domains.questionnaires.models import QuestionnaireField

                    total_guests = 0
                    for response in responses_data:
                        field_id = response.get("field")
                        value = response.get("value")

                        if field_id and value:
                            try:
                                field = QuestionnaireField.objects.get(id=field_id)
                                if field.is_guest_count and field.type == "number":
                                    total_guests += int(value)
                            except (QuestionnaireField.DoesNotExist, ValueError, TypeError):
                                continue

                    if total_guests > 0:
                        event.num_participants = total_guests
                        event.save(update_fields=["num_participants"])
                        logger.info(f"Set num_participants={total_guests} for event {event.id} from questionnaire")

                        for epo in event.event_products.all():
                            epo.num_participants = total_guests
                            epo.save(update_fields=["num_participants"])
                except Exception as guest_err:
                    logger.warning(f"Could not auto-populate guest count: {guest_err}")

    except Exception as e:
        logger.warning(f"Could not create questionnaire responses for event: {e}")


def create_event_from_session(session, completion_type="payment"):
    """Create an event from booking session data

    Args:
        session: BookingSession instance
        completion_type: 'payment' for immediate payment, 'quote' for quote request
    """
    from core.domains.events.services import EventService

    # IDEMPOTENCY CHECK
    if session.created_event:
        logger.warning(
            f"🔧 EVENT_DUPLICATE_PREVENTED: Session {session.session_id} already has event "
            f"{session.created_event.id}. Returning existing event."
        )
        return session.created_event

    booking_data = session.booking_data

    # Extract event data from steps
    event_data = _extract_event_data_from_steps(booking_data, session)
    event_data["completion_type"] = completion_type

    # Auto-generate event name
    _auto_generate_event_name(event_data, session)

    # Use centralized calculation
    total_price = session.calculate_total_price()
    logger.info(f"PREPARE_EVENT_DATA: session.calculate_total_price() returned: ₱{total_price}")

    # Extract event products
    event_products = extract_event_products(booking_data)
    logger.info(f"PREPARE_EVENT_DATA: extracted {len(event_products)} event products")

    event_data["total_price"] = total_price
    event_data["event_products"] = event_products
    logger.info(
        f"PREPARE_EVENT_DATA: setting event_data total_price to ₱{total_price} (total_amount_due computed from invoices)"
    )

    # Apply venue times
    _apply_venue_times(event_data, booking_data)

    # Filter to allowed fields
    event_data = _filter_event_fields(event_data)

    # Create the event
    try:
        logger.info(f"About to create event with data keys: {list(event_data.keys())}")
        logger.info(f"Event data contents: {event_data}")
        logger.info(f"Event products data: {event_products}")
        logger.info(f"Total price: {total_price} (type: {type(total_price)})")
        logger.info(f"Full booking data: {booking_data}")

        event = EventService.create_event(event_data, user=session.client, booking_flow_id=session.booking_flow.id)
        logger.info(f"Successfully created event: {event.id}")
    except Exception as e:
        logger.error(f"Detailed error during event creation: {e}")
        logger.error(f"Error type: {type(e)}")
        import traceback

        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

    # Post-creation operations
    _apply_date_blocking(event, booking_data)
    _handle_rebook(event, booking_data)
    _create_event_notes(event, session)
    _save_questionnaire_responses(event, session)

    return event
