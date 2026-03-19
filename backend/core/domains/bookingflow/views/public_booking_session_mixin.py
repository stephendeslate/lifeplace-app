import logging

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from ..serializers import BookingFlowStepSerializer
from ..services import BookingSessionService

logger = logging.getLogger(__name__)


class PublicBookingSessionMixin:
    """Mixin for public session CRUD actions on PublicBookingFlowViewSet."""

    @action(detail=True, methods=["post"])
    def start_session(self, request, pk=None):
        """Start a new booking session for this flow (Public endpoint)"""
        try:
            flow = self.get_object()

            session_data = {
                "ip_address": request.META.get("REMOTE_ADDR"),
                "user_agent": request.META.get("HTTP_USER_AGENT", ""),
                "referrer_url": request.META.get("HTTP_REFERER", ""),
            }

            session = BookingSessionService.create_session(
                booking_flow_id=flow.id,
                client_id=request.user.id if request.user.is_authenticated else None,
                session_data=session_data,
            )

            return Response(
                {
                    "session_id": str(session.session_id),
                    "current_step": BookingFlowStepSerializer(
                        session.current_step, context=self.get_serializer_context()
                    ).data
                    if session.current_step
                    else None,
                    "expires_at": session.expires_at,
                    "progress_percentage": session.progress_percentage,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="session/(?P<session_uuid>[^/.]+)")
    def get_session(self, request, session_uuid=None):
        """Get session data by UUID (Public endpoint)"""
        try:
            session = BookingSessionService.get_session_by_id(session_uuid)

            # Return minimal session data for public access
            return Response(
                {
                    "session_id": str(session.session_id),
                    "booking_flow": session.booking_flow.id,
                    "current_step": BookingFlowStepSerializer(
                        session.current_step, context=self.get_serializer_context()
                    ).data
                    if session.current_step
                    else None,
                    "progress_percentage": session.progress_percentage,
                    "expires_at": session.expires_at,
                    "is_completed": session.is_completed,
                    "is_abandoned": session.is_abandoned,
                    "total_price": str(session.calculate_total_price()),
                }
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["patch"], url_path="session/(?P<session_uuid>[^/.]+)/update")
    def update_session_data(self, request, session_uuid=None):
        """Update session data (Public endpoint)"""
        try:
            step_id = request.data.get("step_id")
            step_data = request.data.get("step_data", {})
            mark_completed = request.data.get("mark_completed", False)

            # SECURITY FIX: Replaced print statements with proper logging
            logger.debug(
                f"update_session_data: step_id={step_id}, mark_completed={mark_completed}, session_uuid={session_uuid}"
            )

            if not step_id:
                return Response({"detail": "step_id is required"}, status=status.HTTP_400_BAD_REQUEST)

            logger.debug("update_session_data: About to call service method")
            session = BookingSessionService.update_session_data(
                session_id=session_uuid, step_data=step_data, mark_completed=mark_completed
            )
            logger.debug("update_session_data: Service method completed")

            # Return minimal session data
            return Response(
                {
                    "session_id": str(session.session_id),
                    "current_step": BookingFlowStepSerializer(
                        session.current_step, context=self.get_serializer_context()
                    ).data
                    if session.current_step
                    else None,
                    "progress_percentage": session.progress_percentage,
                    "validation_errors": session.validation_errors,
                    "total_price": str(session.calculate_total_price()),
                    "updated_at": session.updated_at,
                }
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="session/(?P<session_uuid>[^/.]+)/validate")
    def validate_step_data(self, request, session_uuid=None):
        """Validate step data without saving (Public endpoint)"""
        try:
            step_id = request.data.get("step_id")
            step_data = request.data.get("step_data", {})

            if not step_id:
                return Response({"detail": "step_id is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Get session to access current step for validation
            session = BookingSessionService.get_session_by_id(session_uuid)

            # Find the step
            step = session.booking_flow.steps.filter(id=step_id).first()
            if not step:
                return Response({"detail": "Step not found"}, status=status.HTTP_404_NOT_FOUND)

            # Validate step data with session context for authenticated users
            validation_errors = BookingSessionService._validate_step_data(step, step_data, session)

            return Response({"isValid": len(validation_errors) == 0, "errors": validation_errors})
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["patch"], url_path="session/(?P<session_uuid>[^/.]+)/go-to-step")
    def go_to_step(self, request, session_uuid=None):
        """Navigate to a specific step without updating data"""
        try:
            step_id = request.data.get("step_id")
            if not step_id:
                return Response({"detail": "step_id is required"}, status=status.HTTP_400_BAD_REQUEST)

            session = BookingSessionService.get_session_by_id(session_uuid)

            # Find the step
            step = session.booking_flow.steps.filter(id=step_id, is_enabled=True).first()
            if not step:
                return Response({"detail": "Step not found or not enabled"}, status=status.HTTP_404_NOT_FOUND)

            # Update current step
            session.current_step = step
            session.save()

            return Response(
                {
                    "session_id": str(session.session_id),
                    "current_step": BookingFlowStepSerializer(
                        session.current_step, context=self.get_serializer_context()
                    ).data,
                    "progress_percentage": session.progress_percentage,
                    "updated_at": session.updated_at,
                }
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
