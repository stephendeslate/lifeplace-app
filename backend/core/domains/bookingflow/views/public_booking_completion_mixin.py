import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from .... import settings
from ..services import BookingSessionService

logger = logging.getLogger(__name__)


class PublicBookingCompletionMixin:
    """Mixin for booking completion and confirmation actions on PublicBookingFlowViewSet."""

    @action(detail=False, methods=["post"], url_path="session/(?P<session_uuid>[^/]+)/complete")
    def complete_booking_public(self, request, session_uuid=None):
        """Complete booking (Public endpoint - requires contact info)"""
        try:
            session = BookingSessionService.get_session_by_id(session_uuid)

            # For guest bookings, we need to ensure they provided contact info
            contact_data = None
            for _step_key, step_data in session.booking_data.items():
                if isinstance(step_data, dict) and "email" in step_data:
                    contact_data = step_data
                    break

            if not contact_data or not contact_data.get("email"):
                return Response(
                    {"detail": "Contact information is required to complete booking"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Always create a user for guest bookings if session doesn't have a client
            user = None
            user_created = False

            # Handle case where user logged in during booking flow but session wasn't updated
            if request.user.is_authenticated and not session.client:
                # Associate the authenticated user with the session
                session.client = request.user
                session.save()
                logger.info(f"Associated authenticated user {request.user.email} with session {session_uuid}")

            if not request.user.is_authenticated and not session.client:
                from django.db import IntegrityError

                from core.domains.users.services import UserService

                try:
                    # Check if user already exists with this email
                    from django.contrib.auth import get_user_model

                    User = get_user_model()

                    existing_user = User.objects.filter(email=contact_data["email"], role="CLIENT").first()

                    if existing_user:
                        # Use existing client user
                        user = existing_user
                        session.client = user
                        session.save()
                    else:
                        # Create new user record
                        user_data = {
                            "email": contact_data["email"],
                            "first_name": contact_data.get("full_name", "").split(" ")[0]
                            if contact_data.get("full_name")
                            else "",
                            "last_name": " ".join(contact_data.get("full_name", "").split(" ")[1:])
                            if contact_data.get("full_name")
                            else "",
                            "role": "CLIENT",
                            "profile": {
                                "phone": contact_data.get("phone", ""),
                                "company": contact_data.get("company", ""),
                            },
                        }

                        # Determine if this should be an active account or guest account
                        if contact_data.get("create_account"):
                            # User wants an active account with password
                            user_data["password"] = contact_data.get("password")
                            user_data["is_active"] = True
                            user_created = True
                        else:
                            # Guest booking - create inactive user without usable password
                            user_data["is_active"] = False
                            # Don't set password - UserService will set unusable password

                        try:
                            user = UserService.create_user(user_data)
                        except IntegrityError:
                            # A concurrent request created this user between our
                            # check and insert. Fetch the user that was created.
                            user = User.objects.get(email=contact_data["email"], role="CLIENT")

                        # Update session with new user
                        session.client = user
                        session.save()
                        user_created = contact_data.get("create_account", False)

                except Exception as e:
                    # Log error and return specific error message
                    logger.error(f"Failed to create user account for guest booking: {e}")
                    return Response(
                        {"detail": f"Failed to create user account: {e!s}"}, status=status.HTTP_400_BAD_REQUEST
                    )

            # Ensure session has a client before completing booking
            if not session.client:
                return Response(
                    {"detail": "Unable to complete booking: no client associated with session"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            completion_type = request.data.get("completion_type", "payment")
            reservation_token = request.data.get("reservation_token")

            # Log request info (sanitized - no sensitive data)
            logger.debug(f"Public completion endpoint: session_uuid={session_uuid}, completion_type={completion_type}")

            # Validate completion_type
            if completion_type not in ["payment", "quote"]:
                return Response(
                    {"detail": "completion_type must be 'payment' or 'quote'"}, status=status.HTTP_400_BAD_REQUEST
                )

            event = BookingSessionService.complete_booking(
                session_uuid, completion_type, reservation_token=reservation_token
            )

            from core.domains.events.serializers import EventSerializer

            response_message = "Booking completed successfully"
            if completion_type == "quote":
                response_message = "Quote request submitted successfully"

            return Response(
                {
                    "detail": response_message,
                    "event": EventSerializer(event, context=self.get_serializer_context()).data,
                    "session_id": session_uuid,
                    "user_created": user_created,
                    "completion_type": completion_type,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.error(f"Error completing booking: {e}")
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="session/(?P<session_uuid>[^/]+)/send-confirmation")
    def send_confirmation(self, request, session_uuid=None):
        """Send confirmation email for completed booking"""
        try:
            session = BookingSessionService.get_session_by_id(session_uuid)

            # Validations
            if not session.is_completed:
                return Response({"detail": "Booking must be completed first"}, status=status.HTTP_400_BAD_REQUEST)

            if not session.client or not session.client.email:
                return Response({"detail": "No email address available"}, status=status.HTTP_400_BAD_REQUEST)

            # Check if already sent (optional - prevent duplicates)
            if session.booking_data.get("confirmation_email_sent"):
                return Response({"detail": "Confirmation already sent"}, status=status.HTTP_200_OK)

            # Import the communication service
            from core.domains.communications.services import CommunicationService

            comm_service = CommunicationService()

            # Build comprehensive context from booking data
            booking_data = session.booking_data

            # FIXED: Extract date/time info from correct location
            # Look for date/time data at root level first
            event_date = booking_data.get("start_date")
            event_time = booking_data.get("start_time")
            booking_data.get("end_date")
            booking_data.get("end_time")
            duration = booking_data.get("duration")

            # If not found at root, check under step keys
            if not event_date:
                for _step_key, step_data in booking_data.items():
                    if isinstance(step_data, dict):
                        if "start_date" in step_data:
                            event_date = step_data.get("start_date")
                            event_time = step_data.get("start_time", "")
                            step_data.get("end_date", "")
                            step_data.get("end_time", "")
                            duration = step_data.get("duration")
                            break

            # Format the date and time for display
            event_date_formatted, event_time_formatted = self._format_event_datetime(event_date, event_time)

            # Extract contact info - look at root level first, then in step data
            contact_phone = booking_data.get("phone")
            if not contact_phone:
                contact_info = booking_data.get("contact_info", {})
                if isinstance(contact_info, dict):
                    contact_phone = contact_info.get("phone")

                # Also check under step keys
                if not contact_phone:
                    for _step_key, step_data in booking_data.items():
                        if isinstance(step_data, dict) and "phone" in step_data:
                            contact_phone = step_data.get("phone")
                            break

            # Extract packages and addons from root level (consistent with pricing calculation)
            selected_packages = booking_data.get("selected_packages", [])
            selected_addons = booking_data.get("selected_addons", [])

            # If not found at root, check under step keys
            if not selected_packages:
                for _step_key, step_data in booking_data.items():
                    if isinstance(step_data, dict) and "selected_packages" in step_data:
                        selected_packages = step_data["selected_packages"]
                        break

            if not selected_addons:
                for _step_key, step_data in booking_data.items():
                    if isinstance(step_data, dict) and "selected_addons" in step_data:
                        selected_addons = step_data["selected_addons"]
                        break

            # Build the context for the email template
            context = {
                "client_name": f"{session.client.first_name} {session.client.last_name}",
                "booking_reference": str(session.session_id)[-8:].upper(),
                "event_type": session.booking_flow.event_type.name if session.booking_flow.event_type else "Event",
                # Use formatted date/time values
                "event_date": event_date_formatted,
                "event_time": event_time_formatted,
                "duration": duration,
                # Contact info
                "email": session.client.email,
                "phone": contact_phone,
                # Packages and pricing
                "selected_packages": selected_packages,
                "selected_addons": selected_addons,
                "total_price": str(session.calculate_total_price()),
                # Add any questionnaire responses
                "questionnaire_responses": booking_data.get("questionnaire", {}),
                # Links
                "dashboard_url": settings.CLIENT_FRONTEND_URL,
            }

            # Log for debugging
            logger.info(f"Sending confirmation email for session {session.session_id}")
            logger.debug(f"Email context - Date: {event_date_formatted}, Time: {event_time_formatted}")

            # Try to find the event associated with this session
            from core.domains.events.models import Event

            event = None
            try:
                # Look for the most recent event for this client created around the session completion time
                event = Event.objects.filter(client=session.client).order_by("-created_at").first()
            except Exception as e:
                logger.warning(f"Could not find event for session {session.session_id}: {e}")

            # Send the email
            if session.booking_flow.confirmation_email_template:
                comm_service.send_communication(
                    template_name=session.booking_flow.confirmation_email_template.name,
                    recipient=session.client.email,
                    context_data=context,
                    client=session.client,
                    event=event,
                )

                # Mark as sent in session data
                session.booking_data["confirmation_email_sent"] = True
                session.booking_data["confirmation_email_sent_at"] = timezone.now().isoformat()
                session.save()

                logger.info(f"Confirmation email sent for session: {session.session_id}")

                return Response({"detail": "Confirmation email sent successfully"}, status=status.HTTP_200_OK)
            else:
                return Response({"detail": "No confirmation template configured"}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Failed to send confirmation: {e}")
            return Response({"detail": f"Failed to send email: {e!s}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @staticmethod
    def _format_event_datetime(event_date, event_time):
        """Format event date and time for display in confirmation emails."""
        if event_date:
            try:
                from datetime import datetime

                # Parse the date
                date_obj = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
                event_date_formatted = date_obj.strftime("%B %d, %Y")  # e.g., "September 11, 2025"

                # Format time if available
                if event_time:
                    # If time is in HH:MM format
                    if ":" in event_time:
                        time_parts = event_time.split(":")
                        hour = int(time_parts[0])
                        minute = time_parts[1]
                        am_pm = "AM" if hour < 12 else "PM"
                        if hour > 12:
                            hour -= 12
                        elif hour == 0:
                            hour = 12
                        event_time_formatted = f"{hour}:{minute} {am_pm}"
                    else:
                        event_time_formatted = event_time
                else:
                    event_time_formatted = "TBD"
            except (ValueError, AttributeError, TypeError, IndexError):
                # Fallback to raw values if parsing fails
                event_date_formatted = event_date
                event_time_formatted = event_time or "TBD"
        else:
            event_date_formatted = "TBD"
            event_time_formatted = "TBD"

        return event_date_formatted, event_time_formatted
