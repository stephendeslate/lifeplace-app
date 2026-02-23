# backend/core/domains/bookingflow/views/booking_flow_views.py
import logging

from django.db import transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

logger = logging.getLogger(__name__)

from ..exceptions import BookingFlowNotFound
from ..models import BookingFlow
from ..serializers import (
    BookingFlowAnalyticsSerializer,
    BookingFlowCreateSerializer,
    BookingFlowDetailSerializer,
    BookingFlowSerializer,
    BookingFlowStepSerializer,
    BookingFlowUpdateSerializer,
    DuplicateFlowSerializer,
)
from ..services import (
    BookingFlowAnalyticsService,
    BookingFlowService,
    BookingFlowStepService,
)


class BookingFlowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing booking flows
    """

    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        try:
            event_type_id = self.request.query_params.get("event_type")
            is_active = self.request.query_params.get("is_active")

            # Convert string to boolean if provided
            if is_active is not None:
                is_active = is_active.lower() == "true"

            return BookingFlowService.get_all_flows(search_query=None, event_type_id=event_type_id, is_active=is_active)
        except Exception as e:
            logger.error(f"Error in BookingFlowViewSet.get_queryset: {e}")
            return BookingFlow.objects.none()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return BookingFlowDetailSerializer
        elif self.action == "create":
            return BookingFlowCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return BookingFlowUpdateSerializer
        elif self.action == "duplicate":
            return DuplicateFlowSerializer
        return BookingFlowSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                flow = BookingFlowService.create_flow(serializer.validated_data)

            return Response(
                BookingFlowDetailSerializer(flow, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                flow = BookingFlowService.update_flow(instance.id, serializer.validated_data)

            return Response(BookingFlowDetailSerializer(flow, context=self.get_serializer_context()).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        try:
            with transaction.atomic():
                BookingFlowService.delete_flow(instance.id)

            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplicate a booking flow"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                new_flow = BookingFlowService.duplicate_flow(
                    pk,
                    serializer.validated_data["name"],
                    serializer.validated_data.get("copy_steps", True),
                    serializer.validated_data.get("copy_configuration", True),
                )

            return Response(
                BookingFlowDetailSerializer(new_flow, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def steps(self, request, pk=None):
        """Get all steps for a booking flow"""
        try:
            steps = BookingFlowStepService.get_steps_for_flow(pk)
            serializer = BookingFlowStepSerializer(steps, many=True, context=self.get_serializer_context())
            return Response(serializer.data)
        except BookingFlowNotFound:
            logger.warning(f"Booking flow {pk} not found when retrieving steps")
            return Response({"detail": "Booking flow not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving steps for booking flow {pk}: {e}")
            return Response(
                {
                    "detail": "An error occurred while retrieving booking flow steps",
                    "error": str(e) if hasattr(e, "__str__") else "Unknown error",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"])
    def analytics(self, request, pk=None):
        """Get analytics for a booking flow"""
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        try:
            analytics = BookingFlowAnalyticsService.get_flow_analytics(pk, start_date, end_date)
            serializer = BookingFlowAnalyticsSerializer(analytics, many=True)
            return Response(serializer.data)
        except BookingFlowNotFound:
            return Response({"detail": "Booking flow not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["get"])
    def active(self, request):
        """Get only active booking flows"""
        flows = BookingFlowService.get_all_flows(is_active=True)
        page = self.paginate_queryset(flows)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(flows, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def payment_gateways(self, request, pk=None):
        """Get available payment gateways for this booking flow"""
        try:
            flow = self.get_object()
            gateways = flow.get_available_payment_gateways()

            from core.domains.payments.serializers import PaymentGatewaySerializer

            serializer = PaymentGatewaySerializer(gateways, many=True, context=self.get_serializer_context())

            # Filter out sensitive config data for security
            gateway_data = []
            for gateway_item in serializer.data:
                safe_gateway = {
                    "id": gateway_item["id"],
                    "name": gateway_item["name"],
                    "code": gateway_item["code"],
                    "description": gateway_item["description"],
                    "is_active": gateway_item["is_active"],
                }

                # Add only public configuration
                gateway = gateways.get(id=gateway_item["id"])
                public_config = {}
                if gateway.code == "stripe":
                    decrypted_config = gateway.get_decrypted_config()
                    public_config["publishable_key"] = decrypted_config.get("publishable_key")
                elif gateway.code == "paypal":
                    decrypted_config = gateway.get_decrypted_config()
                    public_config["client_id"] = decrypted_config.get("client_id")
                # Add other gateways as needed

                safe_gateway["public_config"] = public_config
                gateway_data.append(safe_gateway)

            return Response(
                {
                    "available_gateways": gateway_data,
                    "default_gateway": None,
                    "require_immediate_payment": flow.require_immediate_payment,
                }
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
