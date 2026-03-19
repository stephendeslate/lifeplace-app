import logging
from decimal import Decimal

from django.db import OperationalError
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import BookingSession
from ..services import BookingSessionService

logger = logging.getLogger(__name__)


class PublicBookingPricingMixin:
    """Mixin for pricing, payment gateway, and availability actions on PublicBookingFlowViewSet."""

    @action(detail=True, methods=["get"])
    def payment_gateways(self, request, pk=None):
        """Get available payment gateways for this booking flow (public endpoint)"""
        try:
            flow = self.get_object()
            gateways = flow.get_available_payment_gateways()

            # Return only public gateway information
            gateway_data = []
            for gateway in gateways:
                data = {
                    "id": gateway.id,
                    "name": gateway.name,
                    "code": gateway.code,
                    "description": gateway.description,
                }

                # Add only public configuration (never secret keys)
                public_config = {}
                if gateway.code == "stripe":
                    public_config["publishable_key"] = gateway.config.get("publishable_key")
                    public_config["supports_apple_pay"] = True
                    public_config["supports_google_pay"] = True
                elif gateway.code == "paypal":
                    public_config["client_id"] = gateway.config.get("client_id")
                    public_config["environment"] = gateway.config.get("environment", "sandbox")
                # Add other gateways as needed

                data["public_config"] = public_config
                gateway_data.append(data)

            return Response(
                {
                    "available_gateways": gateway_data,
                    "default_gateway": None,
                    "require_immediate_payment": flow.require_immediate_payment,
                }
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="session/(?P<session_uuid>[^/.]+)/calculate-pricing")
    def calculate_pricing(self, request, session_uuid=None):
        """Calculate pricing for current session state using centralized pricing service"""
        try:
            session = BookingSessionService.get_session_by_id(session_uuid)

            # Get booking data
            booking_data = session.booking_data or {}

            # Add discount code to booking data if provided
            discount_code = request.data.get("discount_code", "")
            if discount_code:
                booking_data["applied_discount_code"] = discount_code

            # Extract venue_additional_hours - prefer request body over session data
            # This allows frontend to pass current local state for real-time pricing updates
            venue_additional_hours = request.data.get("venue_additional_hours") or booking_data.get(
                "venue_additional_hours", {}
            )

            # Get event_type_id from booking flow for event-type-specific pricing
            event_type_id = None
            if session.booking_flow and session.booking_flow.event_type:
                event_type_id = session.booking_flow.event_type_id

            # Log for debugging
            logger.info("=== PRICING API USING CENTRALIZED SERVICE ===")
            logger.info(f"Session: {session_uuid}, Discount: '{discount_code}'")
            logger.info(f"Venue Additional Hours: {venue_additional_hours}")
            logger.info(f"Event Type ID: {event_type_id}")

            # Use centralized pricing service for consistent calculations
            from core.domains.sales.pricing_service import PricingCalculationService

            pricing_breakdown = PricingCalculationService.calculate_from_booking_data(
                booking_data=booking_data, venue_additional_hours=venue_additional_hours, event_type_id=event_type_id
            )

            # Prepare discount details if discount was applied
            discount_details = None
            if pricing_breakdown.applied_discount:
                discount_details = {
                    "code": pricing_breakdown.applied_discount.code,
                    "type": pricing_breakdown.applied_discount.discount_type,
                    "value": str(pricing_breakdown.applied_discount.value),
                    "amount_applied": str(pricing_breakdown.discount_amount.quantize(Decimal("0.01"))),
                }

            # Log final results
            logger.info(
                f"CENTRALIZED PRICING RESULT: subtotal=₱{pricing_breakdown.subtotal}, "
                f"tax=₱{pricing_breakdown.tax_amount}, discount=₱{pricing_breakdown.discount_amount}, "
                f"total=₱{pricing_breakdown.total_amount}"
            )

            # Serialize line items with excess hour details
            line_items_data = []
            for item in pricing_breakdown.line_items:
                line_item_dict = {
                    "product_id": item.product_id,
                    "name": item.name,
                    "description": item.description,
                    "quantity": item.quantity,
                    "base_unit_price": str(item.base_unit_price.quantize(Decimal("0.01"))),
                    "total_unit_price": str(item.total_unit_price.quantize(Decimal("0.01"))),
                    "line_total": str(item.line_total.quantize(Decimal("0.01"))),
                    "tax_rate": str(item.tax_rate.quantize(Decimal("0.01"))),
                    "excess_hours": item.excess_hours,
                    "excess_hour_price": str(item.excess_hour_price.quantize(Decimal("0.01")))
                    if item.excess_hour_price
                    else None,
                    "excess_cost": str(item.excess_cost.quantize(Decimal("0.01"))),
                    "pricing_unit": item.pricing_unit,
                    "minimum_guests": item.minimum_guests,
                    "attendee_breakdown": item.attendee_breakdown,
                }
                line_items_data.append(line_item_dict)

            response_data = {
                "subtotal": str(pricing_breakdown.subtotal.quantize(Decimal("0.01"))),
                "tax": str(pricing_breakdown.tax_amount.quantize(Decimal("0.01"))),
                "tax_rate": str(pricing_breakdown.tax_rate.quantize(Decimal("0.01"))),
                "discount": str(pricing_breakdown.discount_amount.quantize(Decimal("0.01"))),
                "total": str(pricing_breakdown.total_amount.quantize(Decimal("0.01"))),
                "discount_details": discount_details,
                "line_items": line_items_data,
            }

            # Include discount validation error if present
            if pricing_breakdown.discount_error:
                response_data["discount_error"] = pricing_breakdown.discount_error
                response_data["discount_error_type"] = pricing_breakdown.discount_error_type

            return Response(response_data)

        except BookingSession.DoesNotExist:
            return Response({"detail": "Booking session not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error calculating pricing: {e!s}", exc_info=True)
            return Response({"detail": "Error calculating pricing"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"], url_path="questionnaires/(?P<questionnaire_id>[^/.]+)")
    def get_questionnaire_detail(self, request, questionnaire_id=None):
        """Get questionnaire details for booking flow (Public endpoint)"""
        from core.domains.questionnaires.models import Questionnaire
        from core.domains.questionnaires.serializers import QuestionnaireDetailSerializer

        try:
            questionnaire = Questionnaire.objects.prefetch_related("fields").get(id=questionnaire_id, is_active=True)

            serializer = QuestionnaireDetailSerializer(questionnaire, context=self.get_serializer_context())
            return Response(serializer.data)
        except Questionnaire.DoesNotExist:
            return Response({"detail": "Questionnaire not found or not active"}, status=status.HTTP_404_NOT_FOUND)

    # NOTE: Step validation is now handled by BookingSessionService._validate_step_data()
    # This provides enhanced validation including authenticated user context

    @action(detail=False, methods=["post"], url_path="session/(?P<session_uuid>[^/]+)/validate-availability")
    def validate_availability(self, request, session_uuid=None):
        """
        Validate date availability and create a temporary reservation.

        This endpoint should be called BEFORE processing payment to ensure the date
        is still available. It creates a 5-minute reservation window during which
        the payment can be processed.

        Request body:
            None required - uses date from session data

        Returns:
            {
                "available": true/false,
                "reservation_token": "uuid" (if available),
                "expires_at": "datetime" (if available),
                "error": "string" (if not available)
            }
        """
        try:
            session = BookingSessionService.get_session_by_id(session_uuid)

            # Extract the event date from booking data
            booking_data = session.booking_data or {}
            event_date = None

            # Check root level first
            if "start_date" in booking_data:
                event_date = booking_data.get("start_date")
            else:
                # Check in step data
                for _step_key, step_data in booking_data.items():
                    if isinstance(step_data, dict) and "start_date" in step_data:
                        event_date = step_data.get("start_date")
                        break

            if not event_date:
                return Response(
                    {"available": False, "error": "No event date found in booking session"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Parse the date
            from datetime import datetime

            if isinstance(event_date, str):
                try:
                    # Handle ISO format with timezone
                    date_obj = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
                    check_date = date_obj.date()
                except ValueError:
                    # Try simple date format
                    check_date = datetime.strptime(event_date[:10], "%Y-%m-%d").date()
            else:
                check_date = event_date

            # Use atomic availability service to validate and reserve
            from core.domains.events.services import AtomicAvailabilityService

            result = AtomicAvailabilityService.validate_and_reserve_date(
                event_date=check_date, booking_session_id=session_uuid
            )

            if result["available"]:
                return Response(
                    {
                        "available": True,
                        "reservation_token": result["reservation_token"],
                        "expires_at": result["expires_at"].isoformat() if result["expires_at"] else None,
                        "message": "Date is available. You have 5 minutes to complete payment.",
                    }
                )
            else:
                return Response(
                    {
                        "available": False,
                        "error": result["error"] or "Date is no longer available",
                        "blocking_event_id": result.get("blocking_event_id"),
                    }
                )

        except OperationalError as e:
            logger.warning(f"Database connection issue during availability check: {e}")
            return Response(
                {"available": False, "error": "Service temporarily unavailable. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            logger.error(f"Error validating availability: {e}")
            return Response({"available": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="session/(?P<session_uuid>[^/]+)/release-reservation")
    def release_reservation(self, request, session_uuid=None):
        """
        Release a date reservation.

        This endpoint should be called if:
        1. Payment fails
        2. User cancels during payment
        3. Any error occurs after reservation was created

        Request body:
            {
                "reservation_token": "uuid"
            }

        Returns:
            {
                "success": true/false,
                "error": "string" (if failed)
            }
        """
        try:
            reservation_token = request.data.get("reservation_token")

            if not reservation_token:
                return Response(
                    {"success": False, "error": "reservation_token is required"}, status=status.HTTP_400_BAD_REQUEST
                )

            # Use atomic availability service to release
            from core.domains.events.services import AtomicAvailabilityService

            result = AtomicAvailabilityService.release_reservation(reservation_token)

            if result["success"]:
                return Response({"success": True, "message": "Reservation released successfully"})
            else:
                return Response({"success": False, "error": result["error"]})

        except Exception as e:
            logger.error(f"Error releasing reservation: {e}")
            return Response({"success": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def _get_session_duration(self, booking_data):
        """Extract event duration from booking session data"""
        # Look for duration in various places in booking data
        duration = None

        # Check root level first
        if "duration" in booking_data:
            duration = booking_data.get("duration")

        # Check in step data
        if not duration:
            for _step_key, step_data in booking_data.items():
                if isinstance(step_data, dict):
                    if "duration" in step_data:
                        duration = step_data["duration"]
                        break
                    # Also check for end_time and start_time to calculate duration
                    elif "start_time" in step_data and "end_time" in step_data:
                        try:
                            from datetime import datetime

                            start_time = datetime.strptime(step_data["start_time"], "%H:%M")
                            end_time = datetime.strptime(step_data["end_time"], "%H:%M")
                            duration_hours = (end_time - start_time).seconds / 3600
                            duration = int(duration_hours)
                            break
                        except (ValueError, TypeError):
                            continue

        try:
            return int(duration) if duration else None
        except (ValueError, TypeError):
            return None
