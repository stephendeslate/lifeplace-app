# backend/core/domains/contracts/client_views.py
from django.db.models import Q
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import EventContract, ContractSignature
from .serializers import (
    EventContractDetailSerializer,
    EventContractSerializer,
    ContractSignatureCreateSerializer,
    ContractSignatureSerializer,
)
from .services import ContractSignatureService, EventContractService
from .pdf_service import ContractPDFService


class ClientContractPermission(IsAuthenticated):
    """
    Custom permission for client contract access
    """
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        # Only allow authenticated users with client role
        return hasattr(request.user, 'role') and request.user.role in ['CLIENT', 'ADMIN']
    
    def has_object_permission(self, request, view, obj):
        # Admin can access all contracts
        if hasattr(request.user, 'role') and request.user.role == 'ADMIN':
            return True
        
        # Clients can only access contracts from their own events
        if isinstance(obj, EventContract):
            return obj.event.client == request.user
        elif isinstance(obj, ContractSignature):
            return obj.contract.event.client == request.user
        
        return False


class ClientContractViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Client-facing contract viewset with restricted permissions and functionality
    """
    permission_classes = [ClientContractPermission]
    serializer_class = EventContractSerializer
    
    def get_queryset(self):
        """Get contracts accessible to the current client"""
        user = self.request.user
        
        # Admin users can see all contracts
        if hasattr(user, 'role') and user.role == 'ADMIN':
            return EventContract.objects.select_related(
                'event', 'template', 'signed_by'
            ).prefetch_related(
                'signatures__signer',
                'documents',
                'notes'
            ).order_by('-created_at')
        
        # Client users only see contracts from their events that are ready for signing
        return EventContract.objects.filter(
            event__client=user,
            status__in=['SENT', 'PARTIALLY_SIGNED', 'SIGNED']
        ).select_related(
            'event', 'template', 'signed_by'
        ).prefetch_related(
            'signatures__signer',
            'documents',
            'notes'
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EventContractDetailSerializer
        return EventContractSerializer
    
    def retrieve(self, request, *args, **kwargs):
        """Enhanced retrieve with calculated signature fields"""
        instance = self.get_object()
        
        # Add calculated fields for client display
        instance.is_fully_signed = instance.is_fully_signed()
        instance.missing_signatures = instance.get_missing_signatures()
        instance.can_client_sign = self._can_client_sign(instance, request.user)
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def _can_client_sign(self, contract, user):
        """Check if the current client can sign this contract"""
        if contract.status not in ['SENT', 'PARTIALLY_SIGNED']:
            return False
        
        # Check if client signature already exists
        if contract.signatures.filter(role='CLIENT').exists():
            return False
        
        # Check if CLIENT role is required
        required_roles = contract.template.get_signature_requirements()
        return 'CLIENT' in required_roles
    
    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        """
        Submit a client signature for the contract
        """
        contract = self.get_object()
        
        # Validate that client can sign
        if not self._can_client_sign(contract, request.user):
            return Response(
                {'error': 'You cannot sign this contract at this time'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prepare signature data
        signature_data = {
            'contract': contract.id,
            'signer': request.user.id,
            'role': 'CLIENT',
            'signature_data': request.data.get('signature_data', ''),
            'signer_name': request.data.get('signer_name', ''),
            'signer_title': request.data.get('signer_title', ''),
            'signer_email': request.data.get('signer_email', request.user.email),
            'verification_method': request.data.get('verification_method', 'electronic_signature'),
        }
        
        # Additional metadata
        signature_metadata = {
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'ip_address': request.META.get('REMOTE_ADDR', ''),
            'device_fingerprint': request.data.get('device_fingerprint', ''),
            'signature_timestamp': request.data.get('signature_timestamp', ''),
            'screen_resolution': request.data.get('screen_resolution', ''),
        }
        
        # Validate signature data
        serializer = ContractSignatureCreateSerializer(data=signature_data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create the signature
            signature = ContractSignatureService.add_signature(
                contract_id=contract.id,
                user_id=request.user.id,
                signature_data=signature_data['signature_data'],
                role='CLIENT',
                signer_name=signature_data['signer_name'],
                signer_title=signature_data['signer_title'],
                signer_email=signature_data['signer_email'],
                verification_method=signature_data['verification_method'],
                ip_address=signature_metadata['ip_address'],
                user_agent=signature_metadata['user_agent']
            )
            
            # Return updated contract with signature
            contract.refresh_from_db()
            contract.is_fully_signed = contract.is_fully_signed()
            contract.missing_signatures = contract.get_missing_signatures()
            
            return Response(
                EventContractDetailSerializer(contract).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """
        Get detailed signature status for a contract
        """
        contract = self.get_object()
        required_roles = contract.template.get_signature_requirements()
        signatures = contract.signatures.all()
        
        signature_status = {}
        for role in required_roles:
            signature = signatures.filter(role=role).first()
            signature_status[role] = {
                'required': True,
                'signed': signature is not None,
                'signed_at': signature.signed_at if signature else None,
                'signer_name': signature.signer_name if signature else None,
                'is_current_user': signature and signature.signer == request.user if signature else False
            }
        
        return Response({
            'contract_id': contract.id,
            'status': contract.status,
            'is_fully_signed': contract.is_fully_signed(),
            'signature_progress': {
                'total_required': len(required_roles),
                'completed': len([s for s in signature_status.values() if s['signed']]),
                'percentage': (len([s for s in signature_status.values() if s['signed']]) / len(required_roles)) * 100 if required_roles else 0
            },
            'signatures': signature_status,
            'can_client_sign': self._can_client_sign(contract, request.user),
            'expires_at': contract.valid_until.isoformat() if contract.valid_until else None
        })
    
    @action(detail=False, methods=['get'])
    def pending_signatures(self, request):
        """
        Get contracts that require the client's signature
        """
        user = request.user
        
        # Get contracts where client signature is required and missing
        pending_contracts = []
        for contract in self.get_queryset():
            if self._can_client_sign(contract, user):
                pending_contracts.append(contract)
        
        serializer = EventContractSerializer(pending_contracts, many=True)
        return Response({
            'count': len(pending_contracts),
            'contracts': serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """
        Download signed contract as PDF
        """
        contract = self.get_object()
        
        if contract.status != 'SIGNED':
            return Response(
                {'error': 'Contract must be fully signed before download'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
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


class ClientSignatureViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Client-facing signature viewset for viewing signature history
    """
    permission_classes = [ClientContractPermission]
    serializer_class = ContractSignatureSerializer
    
    def get_queryset(self):
        """Get signatures accessible to the current client"""
        user = self.request.user
        
        # Admin users can see all signatures
        if hasattr(user, 'role') and user.role == 'ADMIN':
            return ContractSignature.objects.select_related(
                'contract', 'contract__event', 'signer'
            ).order_by('-signed_at')
        
        # Client users only see signatures from their contracts
        return ContractSignature.objects.filter(
            contract__event__client=user
        ).select_related(
            'contract', 'contract__event', 'signer'
        ).order_by('-signed_at')
    
    @action(detail=False, methods=['get'])
    def my_signatures(self, request):
        """
        Get signatures created by the current user
        """
        signatures = self.get_queryset().filter(signer=request.user)
        serializer = ContractSignatureSerializer(signatures, many=True)
        return Response({
            'count': signatures.count(),
            'signatures': serializer.data
        })