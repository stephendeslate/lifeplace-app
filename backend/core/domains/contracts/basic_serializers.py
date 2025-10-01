# backend/core/domains/contracts/basic_serializers.py
from rest_framework import serializers

from .models import ContractTemplate, EventContract, ContractSignature

"""
This module contains minimal serializers for the contracts domain models
that are used by other domains to prevent circular imports.
These serializers should be kept simple and only include essential fields.
"""


class ContractTemplateSerializer(serializers.ModelSerializer):
    """Basic serializer for the ContractTemplate model"""
    
    class Meta:
        model = ContractTemplate
        fields = [
            'id', 'name', 'description', 'event_type', 'content', 'variables', 
            'sections', 'signature_requirements', 'requires_signature',
            'requires_witness', 'requires_company_signature', 'allows_amendments',
            'amendment_requires_signature', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ContractSignatureBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for the ContractSignature model"""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    signer_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = ContractSignature
        fields = [
            'id', 'role', 'role_display', 'signer_name', 'signed_at', 'is_verified'
        ]
        read_only_fields = ['id', 'signed_at']


class EventContractSerializer(serializers.ModelSerializer):
    """Basic serializer for the EventContract model"""
    template_name = serializers.CharField(source='template.name', read_only=True)
    signature_count = serializers.SerializerMethodField()
    is_fully_signed = serializers.SerializerMethodField()
    contract_type = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = EventContract
        fields = [
            'id', 'event', 'template', 'template_name', 'status',
            'sent_at', 'fully_signed_at', 'valid_until', 'contract_value',
            'currency', 'is_amendment', 'amendment_number', 'signature_count',
            'is_fully_signed', 'contract_type', 'is_expired', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_signature_count(self, obj):
        """Get count of signatures"""
        return obj.signatures.count()

    def get_is_fully_signed(self, obj):
        """Check if contract is fully signed"""
        return obj.is_fully_signed()

    def get_contract_type(self, obj):
        """Get contract type description"""
        if obj.is_amendment:
            return f"Amendment #{obj.amendment_number}"
        return "Original Contract"

    def get_is_expired(self, obj):
        """
        Check if contract is expired.
        Signed contracts never expire (valid_until only applies to unsigned contracts)
        """
        # Signed contracts don't expire
        if obj.status == 'SIGNED':
            return False

        # For unsigned contracts, check valid_until date
        if obj.valid_until:
            from datetime import date
            return date.today() > obj.valid_until

        return False