from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsOwnerOrAdmin

from ..models import EventContract
from ..pdf_service import ContractPDFService
from ..serializers import (
    ContractAmendmentCreateSerializer,
    ContractAmendmentSerializer,
    ContractDocumentSerializer,
    ContractNoteSerializer,
    ContractSignatureCreateSerializer,
    ContractSignatureSerializer,
    EventContractCreateSerializer,
    EventContractDetailSerializer,
    EventContractSerializer,
    EventContractUpdateSerializer,
)
from ..services import (
    ContractAmendmentService,
    ContractDocumentService,
    ContractNoteService,
    ContractSignatureService,
    EventContractService,
)
from ..tasks import send_contract_sent_notification


class EventContractViewSet(viewsets.ModelViewSet):
    """
    ViewSet for event contracts with enhanced multi-party signature support
    """

    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        # Prefetch related objects for efficiency
        queryset = EventContract.objects.select_related("event", "template", "original_contract").prefetch_related(
            "signatures__signer", "amendment_requests", "documents", "notes"
        )

        # Admin gets all contracts, clients get only their own
        if self.request.user.role == "ADMIN":
            queryset = queryset.order_by("-created_at")
        else:
            # Client users only see contracts from their events
            queryset = queryset.filter(event__client=self.request.user).order_by("-created_at")

        # Apply query parameter filters
        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)

        event_id = self.request.query_params.get("event_id")
        if event_id:
            queryset = queryset.filter(event_id=event_id)

        # Filter by client_id (for client profile page)
        client_id = self.request.query_params.get("client_id")
        if client_id:
            queryset = queryset.filter(event__client_id=client_id)

        template = self.request.query_params.get("template")
        if template:
            queryset = queryset.filter(template_id=template)

        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return EventContractDetailSerializer
        if self.action == "create":
            return EventContractCreateSerializer
        if self.action in ["update", "partial_update"]:
            return EventContractUpdateSerializer
        return EventContractSerializer

    def retrieve(self, request, *args, **kwargs):
        """Enhanced retrieve with calculated fields and signature rendering"""
        instance = self.get_object()

        # Add calculated fields
        instance.is_fully_signed = instance.is_fully_signed()
        instance.missing_signatures = instance.get_missing_signatures()

        # Re-render contract content with signatures if any exist
        if instance.signatures.exists():
            from ..services import ContractTemplateService

            ContractTemplateService.render_contract_with_signatures(instance.id)
            # Refresh the instance to get updated content
            instance.refresh_from_db(fields=["content"])

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Extract context data if provided
        context_data = request.data.get("context_data", {})

        # Create contract from template
        contract = EventContractService.create_contract_from_template(
            event_id=serializer.validated_data["event"].id,
            template_id=serializer.validated_data["template"].id,
            valid_until=serializer.validated_data.get("valid_until"),
            context_data=context_data,
            contract_value=serializer.validated_data.get("contract_value"),
        )

        return Response(EventContractDetailSerializer(contract).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        contract = EventContractService.update_contract(instance.id, serializer.validated_data)

        return Response(EventContractDetailSerializer(contract).data)

    @action(detail=True, methods=["post"])
    def add_signature(self, request, pk=None):
        """Add a signature to the contract"""
        contract = self.get_object()
        serializer = ContractSignatureCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Extract IP and user agent from request
        signature_details = {
            "ip_address": request.META.get("REMOTE_ADDR"),
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            "signer_name": serializer.validated_data.get("signer_name"),
            "signer_title": serializer.validated_data.get("signer_title"),
            "signer_email": serializer.validated_data.get("signer_email"),
            "verification_method": serializer.validated_data.get("verification_method"),
        }

        signature = ContractSignatureService.add_signature(
            contract_id=contract.id,
            user_id=serializer.validated_data["signer"].id,
            signature_data=serializer.validated_data["signature_data"],
            role=serializer.validated_data["role"],
            **signature_details,
        )

        # Re-render contract content with the new signature
        from ..services import ContractTemplateService

        ContractTemplateService.render_contract_with_signatures(contract.id)

        return Response(ContractSignatureSerializer(signature).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def signatures(self, request, pk=None):
        """Get all signatures for a contract"""
        contract = self.get_object()
        signatures = ContractSignatureService.get_signatures_for_contract(contract.id)
        serializer = ContractSignatureSerializer(signatures, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        """Void a contract"""
        contract = self.get_object()
        reason = request.data.get("reason")

        voided_contract = EventContractService.void_contract(contract_id=contract.id, reason=reason)

        return Response(EventContractDetailSerializer(voided_contract).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def request_amendment(self, request, pk=None):
        """Request an amendment to the contract"""
        contract = self.get_object()
        serializer = ContractAmendmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        amendment = ContractAmendmentService.request_amendment(
            original_contract_id=contract.id, amendment_data=serializer.validated_data, requested_by=request.user
        )

        return Response(ContractAmendmentSerializer(amendment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def amendments(self, request, pk=None):
        """Get all amendments for a contract"""
        contract = self.get_object()
        amendments = contract.amendment_requests.all()
        serializer = ContractAmendmentSerializer(amendments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_document(self, request, pk=None):
        """Add a document to the contract"""
        contract = self.get_object()
        serializer = ContractDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document = ContractDocumentService.add_document(
            contract_id=contract.id, document_data=serializer.validated_data, uploaded_by=request.user
        )

        return Response(ContractDocumentSerializer(document).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def documents(self, request, pk=None):
        """Get all documents for a contract"""
        contract = self.get_object()
        documents = ContractDocumentService.get_documents_for_contract(contract.id)
        serializer = ContractDocumentSerializer(documents, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_note(self, request, pk=None):
        """Add a note to the contract"""
        contract = self.get_object()
        serializer = ContractNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        note = ContractNoteService.add_note(
            contract_id=contract.id, note_data=serializer.validated_data, created_by=request.user
        )

        return Response(ContractNoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def notes(self, request, pk=None):
        """Get all notes for a contract"""
        contract = self.get_object()
        include_internal = request.user.role == "ADMIN"
        notes = ContractNoteService.get_notes_for_contract(contract.id, include_internal=include_internal)
        serializer = ContractNoteSerializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def for_event(self, request):
        """Get contracts for a specific event"""
        event_id = request.query_params.get("event_id", None)

        if not event_id:
            return Response({"detail": "Event ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Apply permissions - check if user has access to this event
        if request.user.role != "ADMIN":
            # For client users, check if the event belongs to them
            if not request.user.events.filter(id=event_id).exists():
                return Response(
                    {"detail": "You do not have permission to view contracts for this event"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        contracts = EventContractService.get_contracts_for_event(event_id)

        # Add calculated fields for each contract
        for contract in contracts:
            contract.is_fully_signed = contract.is_fully_signed()
            contract.missing_signatures = contract.get_missing_signatures()

        # Use detailed serializer to include content field needed for signing
        serializer = EventContractDetailSerializer(contracts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def send_contract(self, request, pk=None):
        """
        Send contract to client (change status from DRAFT to SENT)
        """
        contract = self.get_object()

        if contract.status != "DRAFT":
            return Response(
                {
                    "error": f"Contract is in {contract.status} status and cannot be sent. Only DRAFT contracts can be sent."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Update contract status to SENT
            updated_contract = EventContractService.update_contract(contract.id, {"status": "SENT"})

            # Send notification to client about the new contract
            send_contract_sent_notification.delay(updated_contract.id)

            return Response(EventContractDetailSerializer(updated_contract).data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Failed to send contract: {e!s}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["get"])
    def download_pdf(self, request, pk=None):
        """
        Download contract as PDF (admin version)
        """
        contract = self.get_object()

        try:
            # Generate PDF
            pdf_buffer = ContractPDFService.generate_contract_pdf(contract)

            # Create HTTP response with PDF
            response = HttpResponse(pdf_buffer, content_type="application/pdf")
            filename = f"Contract_{contract.id}_{contract.event.name if hasattr(contract.event, 'name') else f'Event_{contract.event.id}'}.pdf"
            # Clean filename to remove unsafe characters
            filename = "".join(c for c in filename if c.isalnum() or c in (" ", "-", "_", ".")).rstrip()
            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            return response

        except Exception as e:
            return Response(
                {"error": f"Failed to generate PDF: {e!s}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
