# backend/core/domains/contracts/views.py
from core.utils.permissions import IsAdmin, IsOwnerOrAdmin
from django.db.models import Prefetch
from django.http import HttpResponse
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    ContractTemplate, 
    EventContract, 
    ContractSignature, 
    ContractAmendment,
    ContractDocument,
    ContractNote
)
from .serializers import (
    ContractSigningSerializer,
    ContractTemplateCreateUpdateSerializer,
    ContractTemplateDetailSerializer,
    ContractTemplateSerializer,
    EventContractCreateSerializer,
    EventContractDetailSerializer,
    EventContractSerializer,
    EventContractUpdateSerializer,
    ContractSignatureSerializer,
    ContractSignatureCreateSerializer,
    ContractAmendmentSerializer,
    ContractAmendmentCreateSerializer,
    ContractDocumentSerializer,
    ContractNoteSerializer,
    PreviewContractSerializer,
)
from .services import (
    ContractTemplateService, 
    EventContractService,
    ContractSignatureService,
    ContractAmendmentService,
    ContractDocumentService,
    ContractNoteService,
    LegacyContractService
)
from .pdf_service import ContractPDFService


class ContractTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for contract templates
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        event_type_id = self.request.query_params.get('event_type', None)
        search = self.request.query_params.get('search', None)
        
        return ContractTemplateService.get_all_templates(
            search_query=search, 
            event_type_id=event_type_id
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ContractTemplateDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ContractTemplateCreateUpdateSerializer
        return ContractTemplateSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        template = ContractTemplateService.create_template(serializer.validated_data)
        
        return Response(
            ContractTemplateDetailSerializer(template).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        template = ContractTemplateService.update_template(
            instance.id, 
            serializer.validated_data
        )
        
        return Response(ContractTemplateDetailSerializer(template).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        ContractTemplateService.delete_template(instance.id)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def for_event_type(self, request):
        """Get templates for a specific event type"""
        event_type_id = request.query_params.get('event_type', None)
        
        if not event_type_id:
            return Response(
                {"detail": "Event type ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        templates = ContractTemplateService.get_all_templates(event_type_id=event_type_id)
        page = self.paginate_queryset(templates)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Preview a contract template with sample data"""
        template = self.get_object()
        serializer = PreviewContractSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        context_data = serializer.validated_data.get('context_data', {})
        event_id = serializer.validated_data.get('event_id', None)
        
        # Generate preview using the service with optional event context
        preview_data = ContractTemplateService.preview_template(
            template.id, 
            context_data, 
            event_id=event_id
        )
        
        return Response(preview_data)


class EventContractViewSet(viewsets.ModelViewSet):
    """
    ViewSet for event contracts with enhanced multi-party signature support
    """
    permission_classes = [IsOwnerOrAdmin]
    
    def get_queryset(self):
        # Prefetch related objects for efficiency
        queryset = EventContract.objects.select_related(
            'event', 'template', 'signed_by', 'original_contract'
        ).prefetch_related(
            'signatures__signer',
            'amendment_requests',
            'documents',
            'notes'
        )
        
        # Admin gets all contracts, clients get only their own
        if self.request.user.role == 'ADMIN':
            return queryset.order_by('-created_at')
        else:
            # Client users only see contracts from their events
            return queryset.filter(
                event__client=self.request.user
            ).order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EventContractDetailSerializer
        if self.action == 'create':
            return EventContractCreateSerializer
        if self.action in ['update', 'partial_update']:
            return EventContractUpdateSerializer
        if self.action == 'sign':
            return ContractSigningSerializer
        return EventContractSerializer
    
    def retrieve(self, request, *args, **kwargs):
        """Enhanced retrieve with calculated fields"""
        instance = self.get_object()
        
        # Add calculated fields
        instance.is_fully_signed = instance.is_fully_signed()
        instance.missing_signatures = instance.get_missing_signatures()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract context data if provided
        context_data = request.data.get('context_data', {})
        
        # Create contract from template
        contract = EventContractService.create_contract_from_template(
            event_id=serializer.validated_data['event'].id,
            template_id=serializer.validated_data['template'].id,
            valid_until=serializer.validated_data.get('valid_until'),
            context_data=context_data,
            contract_value=serializer.validated_data.get('contract_value')
        )
        
        return Response(
            EventContractDetailSerializer(contract).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        contract = EventContractService.update_contract(
            instance.id, 
            serializer.validated_data
        )
        
        return Response(EventContractDetailSerializer(contract).data)
    
    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        """Legacy sign endpoint for backward compatibility"""
        contract = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Use legacy service for backward compatibility
        signed_contract = LegacyContractService.sign_contract(
            contract_id=contract.id,
            user_id=request.user.id,
            signature_data=serializer.validated_data['signature_data'],
            witness_name=serializer.validated_data.get('witness_name'),
            witness_signature=serializer.validated_data.get('witness_signature')
        )
        
        return Response(
            EventContractDetailSerializer(signed_contract).data, 
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def add_signature(self, request, pk=None):
        """Add a signature to the contract"""
        contract = self.get_object()
        serializer = ContractSignatureCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract IP and user agent from request
        signature_details = {
            'ip_address': request.META.get('REMOTE_ADDR'),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'signer_name': serializer.validated_data.get('signer_name'),
            'signer_title': serializer.validated_data.get('signer_title'),
            'signer_email': serializer.validated_data.get('signer_email'),
            'verification_method': serializer.validated_data.get('verification_method')
        }
        
        signature = ContractSignatureService.add_signature(
            contract_id=contract.id,
            user_id=serializer.validated_data['signer'].id,
            signature_data=serializer.validated_data['signature_data'],
            role=serializer.validated_data['role'],
            **signature_details
        )
        
        return Response(
            ContractSignatureSerializer(signature).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def signatures(self, request, pk=None):
        """Get all signatures for a contract"""
        contract = self.get_object()
        signatures = ContractSignatureService.get_signatures_for_contract(contract.id)
        serializer = ContractSignatureSerializer(signatures, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def void(self, request, pk=None):
        """Void a contract"""
        contract = self.get_object()
        reason = request.data.get('reason')
        
        voided_contract = EventContractService.void_contract(
            contract_id=contract.id,
            reason=reason
        )
        
        return Response(
            EventContractDetailSerializer(voided_contract).data, 
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def request_amendment(self, request, pk=None):
        """Request an amendment to the contract"""
        contract = self.get_object()
        serializer = ContractAmendmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        amendment = ContractAmendmentService.request_amendment(
            original_contract_id=contract.id,
            amendment_data=serializer.validated_data,
            requested_by=request.user
        )
        
        return Response(
            ContractAmendmentSerializer(amendment).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def amendments(self, request, pk=None):
        """Get all amendments for a contract"""
        contract = self.get_object()
        amendments = contract.amendment_requests.all()
        serializer = ContractAmendmentSerializer(amendments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_document(self, request, pk=None):
        """Add a document to the contract"""
        contract = self.get_object()
        serializer = ContractDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        document = ContractDocumentService.add_document(
            contract_id=contract.id,
            document_data=serializer.validated_data,
            uploaded_by=request.user
        )
        
        return Response(
            ContractDocumentSerializer(document).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """Get all documents for a contract"""
        contract = self.get_object()
        documents = ContractDocumentService.get_documents_for_contract(contract.id)
        serializer = ContractDocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        """Add a note to the contract"""
        contract = self.get_object()
        serializer = ContractNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        note = ContractNoteService.add_note(
            contract_id=contract.id,
            note_data=serializer.validated_data,
            created_by=request.user
        )
        
        return Response(
            ContractNoteSerializer(note).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def notes(self, request, pk=None):
        """Get all notes for a contract"""
        contract = self.get_object()
        include_internal = request.user.role == 'ADMIN'
        notes = ContractNoteService.get_notes_for_contract(
            contract.id, 
            include_internal=include_internal
        )
        serializer = ContractNoteSerializer(notes, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def for_event(self, request):
        """Get contracts for a specific event"""
        event_id = request.query_params.get('event_id', None)
        
        if not event_id:
            return Response(
                {"detail": "Event ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Apply permissions - check if user has access to this event
        if request.user.role != 'ADMIN':
            # For client users, check if the event belongs to them
            if not request.user.events.filter(id=event_id).exists():
                return Response(
                    {"detail": "You do not have permission to view contracts for this event"},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        contracts = EventContractService.get_contracts_for_event(event_id)
        serializer = EventContractSerializer(contracts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def send_contract(self, request, pk=None):
        """
        Send contract to client (change status from DRAFT to SENT)
        """
        contract = self.get_object()
        
        if contract.status != 'DRAFT':
            return Response(
                {'error': f'Contract is in {contract.status} status and cannot be sent. Only DRAFT contracts can be sent.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update contract status to SENT
            updated_contract = EventContractService.update_contract(
                contract.id, 
                {'status': 'SENT'}
            )
            
            return Response(
                EventContractDetailSerializer(updated_contract).data,
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {'error': f'Failed to send contract: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """
        Download contract as PDF (admin version)
        """
        contract = self.get_object()
        
        try:
            # Generate PDF
            pdf_buffer = ContractPDFService.generate_contract_pdf(contract)
            
            # Create HTTP response with PDF
            response = HttpResponse(pdf_buffer, content_type='application/pdf')
            filename = f"Contract_{contract.id}_{contract.event.name if hasattr(contract.event, 'name') else f'Event_{contract.event.id}'}.pdf"
            # Clean filename to remove unsafe characters
            filename = "".join(c for c in filename if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ContractSignatureViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing contract signatures independently
    """
    permission_classes = [IsOwnerOrAdmin]
    serializer_class = ContractSignatureSerializer
    
    def get_queryset(self):
        # Admin gets all signatures, clients get only their own
        queryset = ContractSignature.objects.select_related(
            'contract',
            'contract__event',
            'contract__template',
            'signer'
        )
        if self.request.user.role == 'ADMIN':
            return queryset.order_by('-signed_at')
        else:
            # Client users only see signatures from their contracts
            return queryset.filter(
                contract__event__client=self.request.user
            ).order_by('-signed_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new signature"""
        serializer = ContractSignatureCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract additional details from request
        signature_details = {
            'ip_address': request.META.get('REMOTE_ADDR'),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'signer_name': serializer.validated_data.get('signer_name'),
            'signer_title': serializer.validated_data.get('signer_title'),
            'signer_email': serializer.validated_data.get('signer_email'),
            'verification_method': serializer.validated_data.get('verification_method')
        }
        
        signature = ContractSignatureService.add_signature(
            contract_id=serializer.validated_data['contract'].id,
            user_id=serializer.validated_data['signer'].id,
            signature_data=serializer.validated_data['signature_data'],
            role=serializer.validated_data['role'],
            **signature_details
        )
        
        return Response(
            ContractSignatureSerializer(signature).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify a signature"""
        signature = self.get_object()
        verification_method = request.data.get('verification_method')
        
        verified_signature = ContractSignatureService.verify_signature(
            signature.id,
            verification_method=verification_method
        )
        
        return Response(
            ContractSignatureSerializer(verified_signature).data,
            status=status.HTTP_200_OK
        )


class ContractAmendmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing contract amendments
    """
    permission_classes = [IsOwnerOrAdmin]
    serializer_class = ContractAmendmentSerializer
    
    def get_queryset(self):
        # Admin gets all amendments, clients get only their own
        queryset = ContractAmendment.objects.select_related(
            'original_contract',
            'original_contract__event',
            'amendment_contract',
            'requested_by',
            'reviewed_by'
        )
        if self.request.user.role == 'ADMIN':
            return queryset.order_by('-requested_at')
        else:
            # Client users only see amendments from their contracts
            return queryset.filter(
                original_contract__event__client=self.request.user
            ).order_by('-requested_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new amendment request"""
        serializer = ContractAmendmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        amendment = ContractAmendmentService.request_amendment(
            original_contract_id=serializer.validated_data['original_contract'].id,
            amendment_data=serializer.validated_data,
            requested_by=request.user
        )
        
        return Response(
            ContractAmendmentSerializer(amendment).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        """Approve an amendment request"""
        amendment = self.get_object()
        review_notes = request.data.get('review_notes')
        
        approved_amendment = ContractAmendmentService.approve_amendment(
            amendment.id,
            reviewed_by=request.user,
            review_notes=review_notes
        )
        
        return Response(
            ContractAmendmentSerializer(approved_amendment).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        """Reject an amendment request"""
        amendment = self.get_object()
        review_notes = request.data.get('review_notes')
        
        rejected_amendment = ContractAmendmentService.reject_amendment(
            amendment.id,
            reviewed_by=request.user,
            review_notes=review_notes
        )
        
        return Response(
            ContractAmendmentSerializer(rejected_amendment).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def create_contract(self, request, pk=None):
        """Create a new contract from approved amendment"""
        amendment = self.get_object()
        context_data = request.data.get('context_data', {})
        
        amendment_contract = ContractAmendmentService.create_amendment_contract(
            amendment.id,
            context_data=context_data
        )
        
        return Response(
            EventContractDetailSerializer(amendment_contract).data,
            status=status.HTTP_201_CREATED
        )


class ContractDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing contract documents
    """
    permission_classes = [IsOwnerOrAdmin]
    serializer_class = ContractDocumentSerializer
    
    def get_queryset(self):
        # Admin gets all documents, clients get only their own
        queryset = ContractDocument.objects.select_related(
            'contract',
            'contract__event',
            'uploaded_by'
        )
        if self.request.user.role == 'ADMIN':
            return queryset.filter(is_active=True).order_by('-created_at')
        else:
            # Client users only see documents from their contracts
            return queryset.filter(
                contract__event__client=self.request.user,
                is_active=True
            ).order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new document"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        document = ContractDocumentService.add_document(
            contract_id=serializer.validated_data['contract'].id,
            document_data=serializer.validated_data,
            uploaded_by=request.user
        )
        
        return Response(
            ContractDocumentSerializer(document).data,
            status=status.HTTP_201_CREATED
        )


class ContractNoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing contract notes
    """
    permission_classes = [IsOwnerOrAdmin]
    serializer_class = ContractNoteSerializer
    
    def get_queryset(self):
        # Admin gets all notes, clients get only non-internal notes from their contracts
        queryset = ContractNote.objects.select_related(
            'contract',
            'contract__event',
            'created_by'
        )
        if self.request.user.role == 'ADMIN':
            return queryset.order_by('-created_at')
        else:
            # Client users only see non-internal notes from their contracts
            return queryset.filter(
                contract__event__client=self.request.user,
                is_internal=False
            ).order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new note"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        note = ContractNoteService.add_note(
            contract_id=serializer.validated_data['contract'].id,
            note_data=serializer.validated_data,
            created_by=request.user
        )
        
        return Response(
            ContractNoteSerializer(note).data,
            status=status.HTTP_201_CREATED
        )