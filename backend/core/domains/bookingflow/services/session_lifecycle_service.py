"""Session lifecycle operations: CRUD and metadata extraction helpers.

Handles session creation, retrieval, update, abandonment, and common
data extraction from booking session data.
"""
import logging
import uuid
from datetime import date, datetime, time, timedelta

from django.db import transaction
from django.utils import timezone

from ..exceptions import (
    BookingFlowNotActive,
    BookingSessionExpired,
    BookingSessionNotFound,
)
from ..models import BookingFlow, BookingSession

logger = logging.getLogger(__name__)


def sanitize_for_json(data):
    """
    Recursively convert datetime/date/time objects to ISO strings for JSON serialization.
    This prevents "Object of type datetime is not JSON serializable" errors when storing
    data in JSONField.

    Args:
        data: Any data structure (dict, list, datetime, etc.)

    Returns:
        Same structure with datetime objects converted to ISO strings
    """
    if isinstance(data, dict):
        return {k: sanitize_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_for_json(item) for item in data]
    elif isinstance(data, (datetime, date, time)):
        return data.isoformat()
    else:
        return data


def create_session(booking_flow_id, client_id=None, session_data=None):
    """Create a new booking session"""
    try:
        flow = BookingFlow.objects.get(id=booking_flow_id, is_active=True)
    except BookingFlow.DoesNotExist:
        raise BookingFlowNotActive()

    # Generate session expiry (24 hours from now)
    expires_at = timezone.now() + timedelta(hours=24)

    # Get first step
    first_step = flow.enabled_steps.first()

    session = BookingSession.objects.create(
        session_id=uuid.uuid4(),
        booking_flow=flow,
        client_id=client_id,
        current_step=first_step,
        booking_data=session_data or {},
        expires_at=expires_at,
        ip_address=session_data.get("ip_address") if session_data else None,
        user_agent=session_data.get("user_agent", "") if session_data else "",
        referrer_url=session_data.get("referrer_url", "") if session_data else "",
    )

    logger.info(f"Created booking session: {session.session_id}")
    return session


def get_session_by_id(session_id):
    """Get a booking session by ID (UUID)"""
    try:
        # Support both UUID and string session IDs
        if isinstance(session_id, str):
            session = (
                BookingSession.objects.select_related(
                    "booking_flow",
                    "client",
                    "current_step",
                    # Add related step configurations
                    "current_step__package_config",
                    "current_step__addon_config",
                    "current_step__pricing_config",
                    "current_step__contact_config",
                    "current_step__payment_config",
                    "current_step__confirmation_config",
                    "current_step__introduction_config",
                    "current_step__datetime_config",
                    "current_step__questionnaire_config",
                )
                .prefetch_related(
                    # Prefetch ManyToMany relationships for package config
                    "current_step__package_config__available_categories",
                    "current_step__package_config__available_packages",
                    # Prefetch ManyToMany relationships for addon config
                    "current_step__addon_config__available_categories",
                    "current_step__addon_config__available_addons",
                    # Prefetch questionnaire items if needed
                    "current_step__questionnaire_config__questionnaire_items__questionnaire",
                )
                .get(session_id=session_id)
            )
        else:
            # Assume it's a numeric ID (for backward compatibility)
            session = (
                BookingSession.objects.select_related(
                    "booking_flow",
                    "client",
                    "current_step",
                    # Add related step configurations
                    "current_step__package_config",
                    "current_step__addon_config",
                    "current_step__pricing_config",
                    "current_step__contact_config",
                    "current_step__payment_config",
                    "current_step__confirmation_config",
                    "current_step__introduction_config",
                    "current_step__datetime_config",
                    "current_step__questionnaire_config",
                )
                .prefetch_related(
                    # Prefetch ManyToMany relationships for package config
                    "current_step__package_config__available_categories",
                    "current_step__package_config__available_packages",
                    # Prefetch ManyToMany relationships for addon config
                    "current_step__addon_config__available_categories",
                    "current_step__addon_config__available_addons",
                    # Prefetch questionnaire items if needed
                    "current_step__questionnaire_config__questionnaire_items__questionnaire",
                )
                .get(id=session_id)
            )

        # Check if session is expired
        if session.is_expired():
            raise BookingSessionExpired()

        return session
    except BookingSession.DoesNotExist:
        raise BookingSessionNotFound()


def update_session_data(session_id, step_data, mark_completed=False):
    """Update booking session data for a step"""
    session = get_session_by_id(session_id)

    # ENHANCED SAFEGUARD: Prevent updating completed sessions
    if session.is_completed:
        logger.warning(f"🔥 UPDATE_BLOCKED: Attempt to update already completed session {session_id}")
        return session

    # Validate step data against current step
    if session.current_step:
        from .step_validation_service import validate_step_data

        validation_errors = validate_step_data(session.current_step, step_data, session)
        if validation_errors:
            # Store validation errors but don't raise exception
            session.validation_errors = validation_errors
            session.save()
            # Still return the session with errors
            return session

    with transaction.atomic():
        # Update booking data
        current_step_key = f"step_{session.current_step.id}" if session.current_step else "general"

        # CRITICAL FIX: Handle packages and addons at root level ONLY to avoid duplication
        # This ensures a single source of truth for pricing calculations
        if "selected_packages" in step_data:
            # Store at root level only (sanitize to prevent JSON serialization errors)
            session.booking_data["selected_packages"] = sanitize_for_json(step_data["selected_packages"])
            # Remove from step_data to prevent duplication
            step_data_copy = step_data.copy()
            step_data_copy.pop("selected_packages", None)
            step_data = step_data_copy

        if "selected_addons" in step_data:
            # Store at root level only (sanitize to prevent JSON serialization errors)
            session.booking_data["selected_addons"] = sanitize_for_json(step_data["selected_addons"])
            # Remove from step_data to prevent duplication
            step_data_copy = step_data.copy()
            step_data_copy.pop("selected_addons", None)
            step_data = step_data_copy

        # Handle venue_additional_hours at root level for pricing calculations
        # Format: {"venue_id": additional_hours, ...} e.g., {"1": 2, "3": 1}
        if "venue_additional_hours" in step_data:
            # Store at root level only (sanitize to prevent JSON serialization errors)
            session.booking_data["venue_additional_hours"] = sanitize_for_json(step_data["venue_additional_hours"])
            # Remove from step_data to prevent duplication
            step_data_copy = step_data.copy()
            step_data_copy.pop("venue_additional_hours", None)
            step_data = step_data_copy

        # Merge remaining step data (excluding packages/addons which are now at root level)
        if current_step_key not in session.booking_data:
            session.booking_data[current_step_key] = {}

        # Sanitize step_data to convert datetime objects to ISO strings before storing in JSONField
        sanitized_step_data = sanitize_for_json(step_data)
        session.booking_data[current_step_key].update(sanitized_step_data)

        # Clear any previous validation errors
        session.validation_errors = {}

        # Handle step progression
        if mark_completed and session.booking_flow:
            # Add current step to completed steps
            if session.current_step and session.current_step not in session.completed_steps.all():
                session.completed_steps.add(session.current_step)

            # Check if this is a contact_info step - create/associate client user
            if (
                session.current_step
                and session.current_step.step_type == "contact_info"
                and "email" in step_data
                and step_data["email"]
            ):
                try:
                    from django.contrib.auth import get_user_model

                    from core.domains.users.services import UserService

                    User = get_user_model()

                    # Check if user already exists
                    existing_user = User.objects.filter(email=step_data["email"], role="CLIENT").first()

                    if existing_user:
                        # Use existing client user
                        user = existing_user
                        session.client = user
                        logger.info(f"Associated existing client user: {user.email} (id: {user.id})")

                        # Log warning if guest tried to create account with existing email
                        if step_data.get("create_account"):
                            logger.warning(
                                f"⚠️ Guest attempted to create account with existing email: {user.email}. "
                                f"Using existing account instead. Password NOT updated for security."
                            )
                    else:
                        # Parse full_name into first_name and last_name
                        # Also support direct first_name/last_name fields as fallback
                        full_name = step_data.get("full_name", "").strip()
                        if full_name:
                            name_parts = full_name.split(" ", 1)
                            first_name = name_parts[0]
                            last_name = name_parts[1] if len(name_parts) > 1 else ""
                        else:
                            # Fallback: use separate first_name/last_name if provided
                            first_name = step_data.get("first_name", "").strip()
                            last_name = step_data.get("last_name", "").strip()

                        # Build base user data
                        user_data = {
                            "email": step_data["email"],
                            "first_name": first_name,
                            "last_name": last_name,
                            "role": "CLIENT",
                            "is_active": True,
                        }

                        # CRITICAL FIX: Add password if account creation requested
                        create_account = step_data.get("create_account", False)
                        password = step_data.get("password", "")

                        if create_account and password:
                            user_data["password"] = password
                            logger.info(f"Creating CLIENT account WITH password for: {user_data['email']}")
                        else:
                            # No password provided - UserService will set unusable password
                            logger.info(
                                f"Creating CLIENT user WITHOUT password (guest booking) for: {user_data['email']}"
                            )

                        # Add profile data if provided
                        profile_data = {}
                        if step_data.get("phone"):
                            profile_data["phone"] = step_data["phone"]
                        if step_data.get("address"):
                            profile_data["address"] = step_data["address"]
                        if step_data.get("company"):
                            profile_data["company"] = step_data["company"]

                        if profile_data:
                            user_data["profile"] = profile_data

                        # Create user
                        user = UserService.create_user(user_data)

                        # Update session with new user
                        session.client = user
                        logger.info(
                            f"✅ Successfully created client user: {user.email} (id: {user.id}, has_password: {create_account and bool(password)})"
                        )

                        # Send welcome email for newly created accounts with passwords
                        if create_account and password:
                            try:
                                from core.domains.communications.context_service import (
                                    CommunicationContextService,
                                    ContextType,
                                )
                                from core.domains.communications.services import CommunicationService

                                # Initialize communication service
                                comm_service = CommunicationService()

                                # Generate context using the unified context service
                                template_data = CommunicationContextService.generate_context(
                                    context_type=ContextType.CLIENT,
                                    client=user,
                                )
                                # Add booking-specific flag
                                template_data["booking_in_progress"] = True

                                # Send welcome email using existing template
                                comm_service.send_communication(
                                    template_name="Welcome Email",
                                    recipient=user.email,
                                    context_data=template_data,
                                    client=user,
                                    sent_by=None,  # System-generated
                                    use_async=True,  # ASYNC: Queue email for background processing
                                )

                                logger.info(f"✅ Sent welcome email to new client account: {user.email}")

                            except Exception as email_error:
                                # Log warning but don't fail booking if email fails
                                logger.warning(f"⚠️ Failed to send welcome email to {user.email}: {email_error}")
                                # Don't raise - email failure shouldn't block booking

                except Exception as e:
                    logger.error(f"Failed to create/associate client user for session {session.session_id}: {e!s}")

            # ENHANCED SAFEGUARD: Check if this is a confirmation step with create_event_immediately=True
            if (
                session.current_step
                and session.current_step.step_type == "confirmation"
                and hasattr(session.current_step, "confirmation_config")
                and session.current_step.confirmation_config
                and session.current_step.confirmation_config.create_event_immediately
            ):
                logger.info(f"🔥 IMMEDIATE_CREATION triggered for session {session.session_id}")

                # CRITICAL SAFEGUARD: Check if session is already completed before creating event
                if session.is_completed or session.created_event:
                    logger.warning(
                        f"🔥 IMMEDIATE_CREATION BLOCKED: Session {session.session_id} already completed (is_completed={session.is_completed}, created_event={session.created_event})"
                    )
                else:
                    try:
                        # Ensure we have a client before creating event
                        if not session.client:
                            raise Exception("No client associated with session")

                        # Create event immediately with completion safeguard
                        logger.info(f"🔥 IMMEDIATE_CREATION proceeding for session {session.session_id}")

                        # Extract completion_type from session data
                        completion_type = "payment"  # Default
                        for step_data in session.booking_data.values():
                            if isinstance(step_data, dict) and "completion_type" in step_data:
                                completion_type = step_data["completion_type"]
                                break

                        from .event_creation_service import create_event_from_session

                        event = create_event_from_session(session, completion_type)

                        # CRITICAL FIX: Link the event to session immediately within transaction
                        session.created_event = event

                        # IMPORTANT: Mark session as completed to prevent duplicate completion
                        session.is_completed = True
                        session.completed_at = timezone.now()

                        # CRITICAL FIX: Save the session with the linked event immediately
                        session.save(update_fields=["created_event", "is_completed", "completed_at"])

                        logger.info(
                            f"🔥 IMMEDIATE_CREATION completed for session {session.session_id}, event {event.id}, linked properly"
                        )
                    except Exception as e:
                        logger.error(f"Failed to create event immediately for session {session.session_id}: {e!s}")

            # Pass booking_data to check display conditions
            next_step = session.booking_flow.get_next_step(session.current_step.id, session.booking_data)

            if next_step:
                session.current_step = next_step
            # No more steps - booking flow is complete
            # ENHANCED SAFEGUARD: Double-check completion status before marking complete
            elif not session.is_completed:
                session.is_completed = True
                session.completed_at = timezone.now()
                logger.info(
                    f"🔥 FLOW_COMPLETION: No more steps - marking session {session.session_id} as completed"
                )
            else:
                logger.warning(f"🔥 FLOW_COMPLETION: Session {session.session_id} already marked completed")

        session.save()

        # Log changes
        logger.info(f"Session updated: step_data for {current_step_key}")

    # CRITICAL: Re-fetch the session with proper prefetching to avoid ManyRelatedManager issues
    return get_session_by_id(session_id)


def abandon_session(session_id, reason=None):
    """Mark a session as abandoned"""
    session = get_session_by_id(session_id)

    session.is_abandoned = True
    if reason:
        session.booking_data["abandonment_reason"] = reason
    session.save()

    logger.info(f"Abandoned booking session: {session.session_id}")
    return session


def extract_booking_metadata(session):
    """DRY: Extract all booking metadata from session in a single place

    Returns a dict with:
        - quote_message: Client message for quote requests
        - special_requests: Additional special requests from pricing summary step
        - combined_message: Combined message from both sources
        - payment_type: Payment preference (FULL/DEPOSIT)
        - completion_type: Flow completion type (payment/quote)
        - marketing_consent: User's marketing consent preference (bool)
        - terms_accepted: User's terms acceptance (bool)
    """
    metadata = {
        "quote_message": "",
        "special_requests": "",
        "combined_message": "",
        "payment_type": "FULL",
        "completion_type": "payment",
        "marketing_consent": False,
        "terms_accepted": False,
    }

    # FIXED: Iterate through step data to find payment and pricing summary step data
    # Session data is stored as step_XX keys, not as step_type keys
    for _step_key, step_data in session.booking_data.items():
        if isinstance(step_data, dict):
            # Extract from payment step (contains quote_message, completion_type, payment_type)
            # Payment step data has quote_message and/or completion_type fields
            if "quote_message" in step_data or "completion_type" in step_data:
                if step_data.get("quote_message"):
                    metadata["quote_message"] = step_data.get("quote_message", "").strip()
                if step_data.get("payment_type"):
                    metadata["payment_type"] = step_data.get("payment_type", "FULL")
                if step_data.get("completion_type"):
                    metadata["completion_type"] = step_data.get("completion_type", "payment")

            # Extract from pricing_summary step (contains special_requests, terms_accepted, marketing_consent)
            if "special_requests" in step_data or "terms_accepted" in step_data or "marketing_consent" in step_data:
                if step_data.get("special_requests"):
                    metadata["special_requests"] = step_data.get("special_requests", "").strip()
                if "terms_accepted" in step_data:
                    metadata["terms_accepted"] = bool(step_data.get("terms_accepted", False))
                if "marketing_consent" in step_data:
                    metadata["marketing_consent"] = bool(step_data.get("marketing_consent", False))

    # Combine messages
    messages = []
    if metadata["quote_message"]:
        messages.append(metadata["quote_message"])
    if metadata["special_requests"]:
        messages.append(f"Additional notes:\n{metadata['special_requests']}")
    metadata["combined_message"] = "\n\n".join(messages)

    return metadata
