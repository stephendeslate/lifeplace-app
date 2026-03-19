from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdmin, IsOwnerOrAdmin

from ..models import ContractAmendment
from ..serializers import (
    ContractAmendmentCreateSerializer,
    ContractAmendmentSerializer,
    EventContractDetailSerializer,
)
from ..services import ContractAmendmentService


class ContractAmendmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing contract amendments
    """

    permission_classes = [IsOwnerOrAdmin]
    serializer_class = ContractAmendmentSerializer

    def get_queryset(self):
        # Admin gets all amendments, clients get only their own
        queryset = ContractAmendment.objects.select_related(
            "original_contract", "original_contract__event", "amendment_contract", "requested_by", "reviewed_by"
        )
        if self.request.user.role == "ADMIN":
            return queryset.order_by("-requested_at")
        else:
            # Client users only see amendments from their contracts
            return queryset.filter(original_contract__event__client=self.request.user).order_by("-requested_at")

    def create(self, request, *args, **kwargs):
        """Create a new amendment request"""
        serializer = ContractAmendmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        amendment = ContractAmendmentService.request_amendment(
            original_contract_id=serializer.validated_data["original_contract"].id,
            amendment_data=serializer.validated_data,
            requested_by=request.user,
        )

        return Response(ContractAmendmentSerializer(amendment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        """Approve an amendment request"""
        amendment = self.get_object()
        review_notes = request.data.get("review_notes")

        approved_amendment = ContractAmendmentService.approve_amendment(
            amendment.id, reviewed_by=request.user, review_notes=review_notes
        )

        return Response(ContractAmendmentSerializer(approved_amendment).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        """Reject an amendment request"""
        amendment = self.get_object()
        review_notes = request.data.get("review_notes")

        rejected_amendment = ContractAmendmentService.reject_amendment(
            amendment.id, reviewed_by=request.user, review_notes=review_notes
        )

        return Response(ContractAmendmentSerializer(rejected_amendment).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def create_contract(self, request, pk=None):
        """Create a new contract from approved amendment"""
        amendment = self.get_object()
        context_data = request.data.get("context_data", {})

        amendment_contract = ContractAmendmentService.create_amendment_contract(amendment.id, context_data=context_data)

        return Response(EventContractDetailSerializer(amendment_contract).data, status=status.HTTP_201_CREATED)
