# backend/core/domains/contracts/serializers.py
from core.domains.events.basic_serializers import EventTypeSerializer
from core.domains.events.serializers import EventSerializer
from core.domains.users.serializers import UserSerializer
from rest_framework import serializers
from decimal import Decimal

from .basic_serializers import ContractTemplateSerializer, EventContractSerializer
from .models import (
    ContractTemplate, 
    EventContract, 
    ContractSignature, 
    ContractAmendment,
    ContractDocument,
    ContractNote
)


class ContractTemplateDetailSerializer(ContractTemplateSerializer):
    """Detailed serializer for ContractTemplate including related objects"""
    event_type = EventTypeSerializer(read_only=True)
    
    class Meta(ContractTemplateSerializer.Meta):
        fields = ContractTemplateSerializer.Meta.fields + [
            'content', 'variables', 'sections', 'signature_requirements',
            'requires_witness', 'requires_company_signature', 'allows_amendments',
            'amendment_requires_signature'
        ]


class ContractSignatureSerializer(serializers.ModelSerializer):
    """Serializer for contract signatures"""
    signer = UserSerializer(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = ContractSignature
        fields = [
            'id', 'contract', 'signer', 'role', 'role_display', 'signature_data',
            'signed_at', 'signer_name', 'signer_title', 'signer_email',
            'is_verified', 'verification_method', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'signed_at', 'created_at', 'updated_at']


class ContractSignatureCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating contract signatures"""
    
    class Meta:
        model = ContractSignature
        fields = [
            'contract', 'signer', 'role', 'signature_data', 'signer_name',
            'signer_title', 'signer_email', 'verification_method', 'ip_address', 'user_agent'
        ]
    
    def validate(self, data):
        """Validate signature creation"""
        contract = data.get('contract')
        role = data.get('role')
        
        # Check if signature for this role already exists
        if ContractSignature.objects.filter(contract=contract, role=role).exists():
            raise serializers.ValidationError(
                f"A signature for role '{role}' already exists for this contract"
            )
        
        # Check if role is required for this contract
        required_roles = contract.template.get_signature_requirements()
        if role not in required_roles:
            raise serializers.ValidationError(
                f"Role '{role}' is not required for this contract type"
            )
        
        return data


class ContractAmendmentSerializer(serializers.ModelSerializer):
    """Serializer for contract amendments"""
    requested_by = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    value_change = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    
    class Meta:
        model = ContractAmendment
        fields = [
            'id', 'original_contract', 'amendment_contract', 'amendment_reason',
            'changes_description', 'section_changes', 'status', 'status_display',
            'original_value', 'new_value', 'value_change', 'requested_by',
            'requested_at', 'reviewed_by', 'reviewed_at', 'review_notes',
            'requires_new_signatures', 'signature_deadline', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'value_change', 'requested_at', 'reviewed_at', 'created_at', 'updated_at'
        ]


class ContractAmendmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating contract amendments"""
    
    class Meta:
        model = ContractAmendment
        fields = [
            'original_contract', 'amendment_reason', 'changes_description',
            'section_changes', 'new_value', 'requires_new_signatures', 'signature_deadline'
        ]
    
    def validate_original_contract(self, value):
        """Validate that contract can be amended"""
        if not value.can_be_amended():
            raise serializers.ValidationError(
                "This contract cannot be amended. Check contract status and template settings."
            )
        return value


class ContractDocumentSerializer(serializers.ModelSerializer):
    """Serializer for contract documents"""
    uploaded_by = UserSerializer(read_only=True)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    
    class Meta:
        model = ContractDocument
        fields = [
            'id', 'contract', 'name', 'description', 'document_type',
            'document_type_display', 'file', 'version', 'is_active',
            'uploaded_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ContractNoteSerializer(serializers.ModelSerializer):
    """Serializer for contract notes"""
    created_by = UserSerializer(read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = ContractNote
        fields = [
            'id', 'contract', 'note', 'is_internal', 'category',
            'category_display', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EventContractDetailSerializer(EventContractSerializer):
    """Detailed serializer for EventContract including related objects"""
    event = EventSerializer(read_only=True)
    template = ContractTemplateSerializer(read_only=True)
    signatures = ContractSignatureSerializer(many=True, read_only=True)
    amendment_requests = ContractAmendmentSerializer(many=True, read_only=True)
    documents = ContractDocumentSerializer(many=True, read_only=True)
    notes = ContractNoteSerializer(many=True, read_only=True)
    
    # Status information
    is_fully_signed = serializers.BooleanField(read_only=True)
    missing_signatures = serializers.ListField(read_only=True)
    signature_progress = serializers.SerializerMethodField()
    
    # Legacy compatibility
    signed_by = UserSerializer(read_only=True)
    
    class Meta(EventContractSerializer.Meta):
        fields = EventContractSerializer.Meta.fields + [
            'content', 'contract_value', 'payment_schedule_reference', 'currency',
            'is_amendment', 'original_contract', 'amendment_number',
            'signatures', 'amendment_requests', 'documents', 'notes',
            'is_fully_signed', 'missing_signatures', 'signature_progress',
            'signed_by', 'signature_data', 'witness_name', 'witness_signature'
        ]
    
    def get_signature_progress(self, obj):
        """Calculate signature progress"""
        required_roles = obj.template.get_signature_requirements()
        signed_roles = list(obj.signatures.values_list('role', flat=True))
        
        return {
            'total_required': len(required_roles),
            'signed_count': len(signed_roles),
            'percentage': (len(signed_roles) / len(required_roles)) * 100 if required_roles else 0,
            'required_roles': required_roles,
            'signed_roles': signed_roles,
            'missing_roles': [role for role in required_roles if role not in signed_roles]
        }


class ContractSigningSerializer(serializers.Serializer):
    """Serializer for contract signing (legacy support)"""
    signature_data = serializers.CharField(required=True)
    role = serializers.ChoiceField(choices=ContractSignature.ROLE_CHOICES, default='CLIENT')
    signer_name = serializers.CharField(required=True)
    signer_title = serializers.CharField(required=False, allow_blank=True)
    signer_email = serializers.EmailField(required=True)
    verification_method = serializers.CharField(required=False, allow_blank=True)
    
    # Legacy fields for backward compatibility
    witness_name = serializers.CharField(required=False, allow_blank=True)
    witness_signature = serializers.CharField(required=False, allow_blank=True)


class ContractTemplateCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating contract templates"""
    class Meta:
        model = ContractTemplate
        fields = [
            'name', 'description', 'event_type', 'content', 'variables', 
            'requires_signature', 'sections', 'signature_requirements',
            'requires_witness', 'requires_company_signature', 'allows_amendments',
            'amendment_requires_signature'
        ]

    def validate_variables(self, value):
        """Validate variables is a list"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Variables must be a list")
        return value

    def validate_sections(self, value):
        """Validate sections is a list"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Sections must be a list")
        return value
    
    def validate_signature_requirements(self, value):
        """Validate signature requirements"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Signature requirements must be a list")
        
        valid_roles = [choice[0] for choice in ContractSignature.ROLE_CHOICES]
        for role in value:
            if role not in valid_roles:
                raise serializers.ValidationError(f"Invalid signature role: {role}")
        
        return value


class EventContractCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating event contracts"""
    class Meta:
        model = EventContract
        fields = [
            'event', 'template', 'content', 'valid_until', 'contract_value',
            'payment_schedule_reference', 'currency'
        ]
    
    def create(self, validated_data):
        """Create a new event contract always in DRAFT status"""
        validated_data['status'] = 'DRAFT'
        validated_data['amendment_number'] = 0
        return super().create(validated_data)


class EventContractUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating event contracts"""
    class Meta:
        model = EventContract
        fields = [
            'content', 'status', 'valid_until', 'contract_value',
            'payment_schedule_reference', 'currency'
        ]
        
    def validate_status(self, value):
        """Validate status transitions"""
        instance = self.instance
        
        # Define valid transitions from each status
        valid_transitions = {
            'DRAFT': ['SENT', 'VOID'],
            'SENT': ['PARTIALLY_SIGNED', 'SIGNED', 'EXPIRED', 'VOID'],
            'PARTIALLY_SIGNED': ['SIGNED', 'EXPIRED', 'VOID'],
            'SIGNED': ['AMENDED', 'VOID'],  # Allow amendments
            'EXPIRED': ['VOID'],
            'VOID': [],  # Cannot transition from VOID
            'AMENDED': ['VOID']  # Amended contracts can only be voided
        }
        
        current_status = instance.status
        
        if value not in valid_transitions[current_status]:
            raise serializers.ValidationError(
                f"Cannot transition from {current_status} to {value}. "
                f"Valid transitions are: {', '.join(valid_transitions[current_status])}"
            )
        
        return value
    
    def validate_contract_value(self, value):
        """Validate contract value"""
        if value is not None and value < 0:
            raise serializers.ValidationError("Contract value cannot be negative")
        return value