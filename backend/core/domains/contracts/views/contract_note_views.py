from rest_framework import status, viewsets
from rest_framework.response import Response

from core.utils.permissions import IsOwnerOrAdmin

from ..models import ContractNote
from ..serializers import ContractNoteSerializer
from ..services import ContractNoteService


class ContractNoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing contract notes
    """

    permission_classes = [IsOwnerOrAdmin]
    serializer_class = ContractNoteSerializer

    def get_queryset(self):
        # Admin gets all notes, clients get only non-internal notes from their contracts
        queryset = ContractNote.objects.select_related("contract", "contract__event", "created_by")
        if self.request.user.role == "ADMIN":
            return queryset.order_by("-created_at")
        else:
            # Client users only see non-internal notes from their contracts
            return queryset.filter(contract__event__client=self.request.user, is_internal=False).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        """Create a new note"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        note = ContractNoteService.add_note(
            contract_id=serializer.validated_data["contract"].id,
            note_data=serializer.validated_data,
            created_by=request.user,
        )

        return Response(ContractNoteSerializer(note).data, status=status.HTTP_201_CREATED)
