from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsOwnerOrAdmin

from ..models import ContractSignature
from ..serializers import (
    ContractSignatureCreateSerializer,
    ContractSignatureSerializer,
)
from ..services import ContractSignatureService


class ContractSignatureViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing contract signatures independently
    """

    permission_classes = [IsOwnerOrAdmin]
    serializer_class = ContractSignatureSerializer

    def get_queryset(self):
        # Admin gets all signatures, clients get only their own
        queryset = ContractSignature.objects.select_related(
            "contract", "contract__event", "contract__template", "signer"
        )
        if self.request.user.role == "ADMIN":
            return queryset.order_by("-signed_at")
        else:
            # Client users only see signatures from their contracts
            return queryset.filter(contract__event__client=self.request.user).order_by("-signed_at")

    def create(self, request, *args, **kwargs):
        """Create a new signature"""
        serializer = ContractSignatureCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Extract additional details from request
        signature_details = {
            "ip_address": request.META.get("REMOTE_ADDR"),
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            "signer_name": serializer.validated_data.get("signer_name"),
            "signer_title": serializer.validated_data.get("signer_title"),
            "signer_email": serializer.validated_data.get("signer_email"),
            "verification_method": serializer.validated_data.get("verification_method"),
        }

        signature = ContractSignatureService.add_signature(
            contract_id=serializer.validated_data["contract"].id,
            user_id=serializer.validated_data["signer"].id,
            signature_data=serializer.validated_data["signature_data"],
            role=serializer.validated_data["role"],
            **signature_details,
        )

        # Re-render contract content with the new signature
        from ..services import ContractTemplateService

        ContractTemplateService.render_contract_with_signatures(serializer.validated_data["contract"].id)

        return Response(ContractSignatureSerializer(signature).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        """Verify a signature"""
        signature = self.get_object()
        verification_method = request.data.get("verification_method")

        verified_signature = ContractSignatureService.verify_signature(
            signature.id, verification_method=verification_method
        )

        return Response(ContractSignatureSerializer(verified_signature).data, status=status.HTTP_200_OK)
