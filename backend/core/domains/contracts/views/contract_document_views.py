from rest_framework import status, viewsets
from rest_framework.response import Response

from core.utils.permissions import IsOwnerOrAdmin

from ..models import ContractDocument
from ..serializers import ContractDocumentSerializer
from ..services import ContractDocumentService


class ContractDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing contract documents
    """

    permission_classes = [IsOwnerOrAdmin]
    serializer_class = ContractDocumentSerializer

    def get_queryset(self):
        # Admin gets all documents, clients get only their own
        queryset = ContractDocument.objects.select_related("contract", "contract__event", "uploaded_by")
        if self.request.user.role == "ADMIN":
            return queryset.filter(is_active=True).order_by("-created_at")
        else:
            # Client users only see documents from their contracts
            return queryset.filter(contract__event__client=self.request.user, is_active=True).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        """Create a new document"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document = ContractDocumentService.add_document(
            contract_id=serializer.validated_data["contract"].id,
            document_data=serializer.validated_data,
            uploaded_by=request.user,
        )

        return Response(ContractDocumentSerializer(document).data, status=status.HTTP_201_CREATED)
