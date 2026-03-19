# backend/core/domains/bookingflow/views/booking_session_views.py

import logging

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdminOrClient

from ..models import BookingSession
from ..serializers import (
    BookingSessionCreateSerializer,
    BookingSessionSerializer,
    BookingSessionUpdateSerializer,
)
from ..services import BookingSessionService

logger = logging.getLogger(__name__)


class BookingSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing booking sessions (Admin/Authenticated users only)
    """

    permission_classes = [IsAdminOrClient]
    serializer_class = BookingSessionSerializer

    def get_queryset(self):
        user = self.request.user

        # Admin can see all sessions
        if user.is_staff or getattr(user, "role", None) == "ADMIN":
            queryset = BookingSession.objects.all()
        else:
            # Clients can only see their own sessions
            queryset = BookingSession.objects.filter(client=user)

        # Add select_related and prefetch_related for optimization
        queryset = queryset.select_related(
            "booking_flow",
            "booking_flow__event_type",
            "client",
            "current_step",
            "created_event",
        ).prefetch_related(
            "completed_steps",
        )

        # Apply filters
        booking_flow_id = self.request.query_params.get("booking_flow")
        is_completed = self.request.query_params.get("is_completed")
        is_abandoned = self.request.query_params.get("is_abandoned")

        if booking_flow_id:
            queryset = queryset.filter(booking_flow_id=booking_flow_id)

        if is_completed is not None:
            is_completed = is_completed.lower() == "true"
            queryset = queryset.filter(is_completed=is_completed)

        if is_abandoned is not None:
            is_abandoned = is_abandoned.lower() == "true"
            queryset = queryset.filter(is_abandoned=is_abandoned)

        return queryset.order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return BookingSessionCreateSerializer
        elif self.action == "update_data":
            return BookingSessionUpdateSerializer
        return BookingSessionSerializer

    def create(self, request, *args, **kwargs):
        """Create a new booking session (Authenticated users only)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            session_data = {
                "ip_address": serializer.validated_data.get("ip_address"),
                "user_agent": serializer.validated_data.get("user_agent"),
                "referrer_url": serializer.validated_data.get("referrer_url"),
            }

            session = BookingSessionService.create_session(
                booking_flow_id=serializer.validated_data["booking_flow"],
                client_id=request.user.id if request.user.is_authenticated else None,
                session_data=session_data,
            )

            return Response(
                BookingSessionSerializer(session, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            logger.error(f"Booking session error: {e}", exc_info=True)
            return Response(
                {"detail": "An error occurred processing your request. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["patch"])
    def update_data(self, request, pk=None):
        """Update session data for a step (Authenticated users only)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            session = BookingSessionService.update_session_data(
                session_id=serializer.validated_data["session_id"],
                step_data=serializer.validated_data["step_data"],
                mark_completed=serializer.validated_data.get("mark_completed", False),
            )

            return Response(BookingSessionSerializer(session, context=self.get_serializer_context()).data)
        except Exception as e:
            logger.error(f"Booking session update error: {e}", exc_info=True)
            return Response(
                {"detail": "An error occurred processing your request. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def complete_booking(self, request, pk=None):
        """Complete the booking and create event (Authenticated users only)"""
        try:
            session = self.get_object()
            completion_type = request.data.get("completion_type", "payment")

            # Validate completion_type
            if completion_type not in ["payment", "quote"]:
                return Response(
                    {"detail": "completion_type must be 'payment' or 'quote'"}, status=status.HTTP_400_BAD_REQUEST
                )

            event = BookingSessionService.complete_booking(str(session.session_id), completion_type)

            from core.domains.events.serializers import EventSerializer

            response_message = "Booking completed successfully"
            if completion_type == "quote":
                response_message = "Quote request submitted successfully"

            return Response(
                {
                    "detail": response_message,
                    "event": EventSerializer(event, context=self.get_serializer_context()).data,
                    "session": BookingSessionSerializer(session, context=self.get_serializer_context()).data,
                    "completion_type": completion_type,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def abandon(self, request, pk=None):
        """Mark session as abandoned"""
        reason = request.data.get("reason", "User abandoned")

        try:
            session = self.get_object()
            abandoned_session = BookingSessionService.abandon_session(str(session.session_id), reason)

            return Response(BookingSessionSerializer(abandoned_session, context=self.get_serializer_context()).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
