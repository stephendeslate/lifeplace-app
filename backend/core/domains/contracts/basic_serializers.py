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
    is_expiring_soon = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    expiry_urgency = serializers.SerializerMethodField()
    sign_disabled_reason = serializers.SerializerMethodField()

    class Meta:
        model = EventContract
        fields = [
            'id', 'event', 'template', 'template_name', 'status',
            'sent_at', 'fully_signed_at', 'valid_until', 'contract_value',
            'currency', 'is_amendment', 'amendment_number', 'signature_count',
            'is_fully_signed', 'contract_type', 'is_expired', 'is_expiring_soon',
            'days_until_expiry', 'expiry_urgency', 'sign_disabled_reason',
            'created_at', 'updated_at'
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

    def get_is_expiring_soon(self, obj):
        """
        Check if contract is expiring within 7 days.
        Returns False for signed contracts or contracts without expiry date.
        """
        if obj.status == 'SIGNED' or not obj.valid_until:
            return False

        from datetime import date
        days = (obj.valid_until - date.today()).days
        return 0 < days <= 7

    def get_days_until_expiry(self, obj):
        """
        Get number of days until contract expires.
        Returns None if no valid_until date or if contract is signed.
        Negative values indicate already expired.
        """
        if obj.status == 'SIGNED' or not obj.valid_until:
            return None

        from datetime import date
        return (obj.valid_until - date.today()).days

    def get_expiry_urgency(self, obj):
        """
        Get expiry urgency level.
        Returns 'CRITICAL' (1 day or less), 'HIGH' (2-3 days), 'NORMAL' (4-7 days), or None.
        """
        if obj.status == 'SIGNED' or not obj.valid_until:
            return None

        from datetime import date
        days = (obj.valid_until - date.today()).days

        if days <= 0:
            return 'CRITICAL'  # Already expired
        elif days <= 1:
            return 'CRITICAL'
        elif days <= 3:
            return 'HIGH'
        elif days <= 7:
            return 'NORMAL'
        return None

    def get_sign_disabled_reason(self, obj):
        """
        Get reason why signing is disabled, if applicable.
        Returns None if signing is allowed.
        """
        # Already signed
        if obj.status == 'SIGNED':
            return 'Contract is already fully signed'

        # Voided
        if obj.status == 'VOID':
            return 'Contract has been voided'

        # Amended
        if obj.status == 'AMENDED':
            return 'Contract has been amended - please sign the new version'

        # Expired
        if obj.status == 'EXPIRED':
            return 'Contract has expired'

        # Check expiry date even if status not yet updated to EXPIRED
        if obj.valid_until:
            from datetime import date
            if date.today() > obj.valid_until:
                return 'Contract validity period has passed'

        # Draft - not yet sent
        if obj.status == 'DRAFT':
            return 'Contract has not been sent yet'

        return None