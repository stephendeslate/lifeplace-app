"""
Unit tests for contracts domain serializers.

Tests:
- ContractTemplateSerializer and related serializers
- EventContractSerializer and related serializers
- ContractSignatureSerializer (validation, role checking)
- ContractAmendmentSerializer (validation)
- ContractDocumentSerializer
- ContractNoteSerializer
"""

import pytest
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.domains.contracts.serializers import (
    ContractTemplateSerializer,
    ContractTemplateDetailSerializer,
    ContractTemplateCreateUpdateSerializer,
    EventContractSerializer,
    EventContractDetailSerializer,
    EventContractCreateSerializer,
    EventContractUpdateSerializer,
    ContractSignatureSerializer,
    ContractSignatureCreateSerializer,
    ContractAmendmentSerializer,
    ContractAmendmentCreateSerializer,
    ContractDocumentSerializer,
    ContractNoteSerializer,
    PreviewContractSerializer,
)


@pytest.mark.django_db
class TestContractTemplateSerializer:
    """Tests for ContractTemplate serializers."""

    def test_template_serialization(self, contract_template_factory):
        """Test basic template serialization."""
        template = contract_template_factory(
            name='Wedding Contract',
            description='Contract for wedding events'
        )
        serializer = ContractTemplateSerializer(template)
        data = serializer.data

        assert data['name'] == 'Wedding Contract'
        assert data['description'] == 'Contract for wedding events'
        assert 'id' in data
        assert 'created_at' in data

    def test_template_detail_serialization(self, contract_template_factory, event_type_factory):
        """Test detailed template serialization with related objects."""
        event_type = event_type_factory(name='Wedding')
        template = contract_template_factory(
            name='Wedding Contract',
            event_type=event_type,
            content='Sample contract content',
            variables=['client_name', 'event_date'],
            sections=[{'title': 'Terms'}]
        )
        serializer = ContractTemplateDetailSerializer(template)
        data = serializer.data

        assert data['name'] == 'Wedding Contract'
        assert data['content'] == 'Sample contract content'
        assert data['variables'] == ['client_name', 'event_date']
        assert data['sections'] == [{'title': 'Terms'}]
        assert data['event_type']['name'] == 'Wedding'

    def test_template_create_update_validation_valid(self):
        """Test template create serializer with valid data."""
        data = {
            'name': 'New Contract Template',
            'description': 'Test description',
            'content': 'Contract content here',
            'variables': ['client_name', 'event_date'],
            'sections': [{'title': 'Section 1'}],
            'signature_requirements': ['CLIENT', 'COMPANY_REP'],
            'requires_signature': True,
        }
        serializer = ContractTemplateCreateUpdateSerializer(data=data)

        assert serializer.is_valid()

    def test_template_variables_must_be_list(self):
        """Test that variables field must be a list."""
        data = {
            'name': 'Test Template',
            'content': 'Content',
            'variables': 'not a list',  # Invalid
        }
        serializer = ContractTemplateCreateUpdateSerializer(data=data)

        assert not serializer.is_valid()
        assert 'variables' in serializer.errors

    def test_template_sections_must_be_list(self):
        """Test that sections field must be a list."""
        data = {
            'name': 'Test Template',
            'content': 'Content',
            'sections': {'not': 'a list'},  # Invalid
        }
        serializer = ContractTemplateCreateUpdateSerializer(data=data)

        assert not serializer.is_valid()
        assert 'sections' in serializer.errors

    def test_template_invalid_signature_role(self):
        """Test that invalid signature roles are rejected."""
        data = {
            'name': 'Test Template',
            'content': 'Content',
            'signature_requirements': ['CLIENT', 'INVALID_ROLE'],  # Invalid role
        }
        serializer = ContractTemplateCreateUpdateSerializer(data=data)

        assert not serializer.is_valid()
        assert 'signature_requirements' in serializer.errors


@pytest.mark.django_db
class TestEventContractSerializer:
    """Tests for EventContract serializers."""

    def test_contract_serialization(self, event_contract_factory):
        """Test basic contract serialization."""
        contract = event_contract_factory(status='DRAFT')
        serializer = EventContractSerializer(contract)
        data = serializer.data

        assert data['status'] == 'DRAFT'
        assert 'id' in data
        assert 'template_name' in data
        assert 'signature_count' in data

    def test_contract_detail_serialization(
        self, event_contract_factory, contract_signature_factory
    ):
        """Test detailed contract serialization with signatures."""
        contract = event_contract_factory(
            status='SENT',
            contract_value=Decimal('50000.00'),
            currency='PHP'
        )
        contract_signature_factory(contract=contract, role='CLIENT')

        serializer = EventContractDetailSerializer(contract)
        data = serializer.data

        assert data['status'] == 'SENT'
        assert data['contract_value'] == '50000.00'
        assert data['currency'] == 'PHP'
        assert len(data['signatures']) == 1
        assert 'signature_progress' in data

    def test_contract_signature_progress(
        self, event_contract_factory, contract_template_factory, contract_signature_factory
    ):
        """Test signature progress calculation."""
        template = contract_template_factory(
            signature_requirements=['CLIENT', 'COMPANY_REP']
        )
        contract = event_contract_factory(status='SENT', template=template)
        contract_signature_factory(contract=contract, role='CLIENT')

        serializer = EventContractDetailSerializer(contract)
        progress = serializer.data['signature_progress']

        assert progress['total_required'] == 2
        assert progress['signed_count'] == 1
        assert progress['percentage'] == 50.0
        assert 'CLIENT' in progress['signed_roles']
        assert 'COMPANY_REP' in progress['missing_roles']

    def test_contract_is_expired_calculation(self, event_contract_factory):
        """Test is_expired field calculation."""
        # Expired contract
        expired_contract = event_contract_factory(
            status='SENT',
            valid_until=date.today() - timedelta(days=1)
        )
        serializer = EventContractSerializer(expired_contract)

        assert serializer.data['is_expired'] is True

    def test_contract_signed_not_expired(self, event_contract_factory):
        """Test signed contracts never show as expired."""
        contract = event_contract_factory(
            status='SIGNED',
            valid_until=date.today() - timedelta(days=30)  # Past date
        )
        serializer = EventContractSerializer(contract)

        assert serializer.data['is_expired'] is False

    def test_contract_expiry_urgency(self, event_contract_factory):
        """Test expiry urgency levels."""
        # Critical - expires tomorrow
        contract = event_contract_factory(
            status='SENT',
            valid_until=date.today() + timedelta(days=1)
        )
        serializer = EventContractSerializer(contract)

        assert serializer.data['expiry_urgency'] == 'CRITICAL'

    def test_contract_create_serializer(self, event_factory, contract_template_factory):
        """Test contract creation serializer."""
        event = event_factory()
        template = contract_template_factory()

        data = {
            'event': event.id,
            'template': template.id,
            'content': 'Contract content',
            'valid_until': (date.today() + timedelta(days=30)).isoformat(),
        }
        serializer = EventContractCreateSerializer(data=data)

        assert serializer.is_valid(), serializer.errors

    def test_contract_update_valid_status_transition(self, event_contract_factory):
        """Test valid status transitions are allowed."""
        contract = event_contract_factory(status='DRAFT')

        data = {'status': 'SENT'}
        serializer = EventContractUpdateSerializer(contract, data=data, partial=True)

        assert serializer.is_valid()

    def test_contract_update_invalid_status_transition(self, event_contract_factory):
        """Test invalid status transitions are rejected."""
        contract = event_contract_factory(status='DRAFT')

        data = {'status': 'SIGNED'}  # Can't go directly from DRAFT to SIGNED
        serializer = EventContractUpdateSerializer(contract, data=data, partial=True)

        assert not serializer.is_valid()
        assert 'status' in serializer.errors

    def test_contract_update_negative_value_rejected(self, event_contract_factory):
        """Test negative contract value is rejected."""
        contract = event_contract_factory(status='DRAFT')

        data = {'contract_value': Decimal('-1000.00')}
        serializer = EventContractUpdateSerializer(contract, data=data, partial=True)

        assert not serializer.is_valid()
        assert 'contract_value' in serializer.errors


@pytest.mark.django_db
class TestContractSignatureSerializer:
    """Tests for ContractSignature serializers."""

    def test_signature_serialization(self, contract_signature_factory):
        """Test signature serialization."""
        signature = contract_signature_factory(
            role='CLIENT',
            signer_name='John Doe',
            signer_email='john@example.com'
        )
        serializer = ContractSignatureSerializer(signature)
        data = serializer.data

        assert data['role'] == 'CLIENT'
        assert data['role_display'] == 'Client'
        assert data['signer_name'] == 'John Doe'
        assert data['signer_email'] == 'john@example.com'
        assert data['is_signed'] is True
        assert data['is_client_signature'] is True

    def test_signature_is_client_signature_field(self, contract_signature_factory):
        """Test is_client_signature field for different roles."""
        client_sig = contract_signature_factory(role='CLIENT')
        company_sig = contract_signature_factory(role='COMPANY_REP')

        assert ContractSignatureSerializer(client_sig).data['is_client_signature'] is True
        assert ContractSignatureSerializer(company_sig).data['is_client_signature'] is False

    def test_signature_create_validation(
        self, event_contract_factory, contract_template_factory, user_factory
    ):
        """Test signature creation validation."""
        template = contract_template_factory(
            signature_requirements=['CLIENT', 'COMPANY_REP']
        )
        contract = event_contract_factory(status='SENT', template=template)
        user = user_factory()

        data = {
            'contract': contract.id,
            'signer': user.id,
            'role': 'CLIENT',
            'signature_data': 'data:image/png;base64,iVBORw0KGgo=',
            'signer_name': 'John Doe',
            'signer_email': 'john@example.com',
        }
        serializer = ContractSignatureCreateSerializer(data=data)

        assert serializer.is_valid(), serializer.errors

    def test_signature_create_duplicate_role_rejected(
        self, event_contract_factory, contract_signature_factory, user_factory
    ):
        """Test duplicate role signature is rejected."""
        contract = event_contract_factory(status='SENT')
        contract_signature_factory(contract=contract, role='CLIENT')
        user = user_factory()

        data = {
            'contract': contract.id,
            'signer': user.id,
            'role': 'CLIENT',  # Already exists
            'signature_data': 'data:image/png;base64,iVBORw0KGgo=',
            'signer_name': 'Jane Doe',
            'signer_email': 'jane@example.com',
        }
        serializer = ContractSignatureCreateSerializer(data=data)

        assert not serializer.is_valid()
        # Error should indicate role already exists

    def test_signature_create_invalid_role_rejected(
        self, event_contract_factory, contract_template_factory, user_factory
    ):
        """Test invalid role for contract type is rejected."""
        template = contract_template_factory(
            signature_requirements=['CLIENT']  # Only CLIENT required
        )
        contract = event_contract_factory(status='SENT', template=template)
        user = user_factory()

        data = {
            'contract': contract.id,
            'signer': user.id,
            'role': 'WITNESS',  # Not required for this contract
            'signature_data': 'data:image/png;base64,iVBORw0KGgo=',
            'signer_name': 'Witness Name',
            'signer_email': 'witness@example.com',
        }
        serializer = ContractSignatureCreateSerializer(data=data)

        assert not serializer.is_valid()


@pytest.mark.django_db
class TestContractAmendmentSerializer:
    """Tests for ContractAmendment serializers."""

    def test_amendment_serialization(self, contract_amendment_factory, user_factory):
        """Test amendment serialization."""
        user = user_factory()
        amendment = contract_amendment_factory(
            amendment_reason='Change event date',
            changes_description='Updated date',
            original_value=Decimal('50000.00'),
            new_value=Decimal('60000.00'),
            requested_by=user
        )
        serializer = ContractAmendmentSerializer(amendment)
        data = serializer.data

        assert data['amendment_reason'] == 'Change event date'
        assert data['original_value'] == '50000.00'
        assert data['new_value'] == '60000.00'
        assert data['value_change'] == '10000.00'
        assert 'requested_by' in data

    def test_amendment_create_valid(self, event_contract_factory, contract_template_factory):
        """Test amendment creation with valid data."""
        template = contract_template_factory(allows_amendments=True)
        contract = event_contract_factory(status='SIGNED', template=template, is_amendment=False)

        data = {
            'original_contract': contract.id,
            'amendment_reason': 'Price adjustment',
            'changes_description': 'Added extra services',
            'new_value': Decimal('60000.00'),
        }
        serializer = ContractAmendmentCreateSerializer(data=data)

        assert serializer.is_valid(), serializer.errors

    def test_amendment_create_non_amendable_contract(self, event_contract_factory):
        """Test amendment creation rejected for non-amendable contract."""
        contract = event_contract_factory(status='DRAFT')  # Can't amend draft

        data = {
            'original_contract': contract.id,
            'amendment_reason': 'Test',
            'changes_description': 'Test',
        }
        serializer = ContractAmendmentCreateSerializer(data=data)

        assert not serializer.is_valid()
        assert 'original_contract' in serializer.errors


@pytest.mark.django_db
class TestContractDocumentSerializer:
    """Tests for ContractDocument serializer."""

    def test_document_serialization(self, contract_document_factory, user_factory):
        """Test document serialization."""
        user = user_factory()
        document = contract_document_factory(
            name='Schedule A',
            description='Payment schedule',
            document_type='SCHEDULE',
            uploaded_by=user
        )
        serializer = ContractDocumentSerializer(document)
        data = serializer.data

        assert data['name'] == 'Schedule A'
        assert data['description'] == 'Payment schedule'
        assert data['document_type'] == 'SCHEDULE'
        assert data['document_type_display'] == 'Schedule'
        assert 'uploaded_by' in data


@pytest.mark.django_db
class TestContractNoteSerializer:
    """Tests for ContractNote serializer."""

    def test_note_serialization(self, contract_note_factory, user_factory):
        """Test note serialization."""
        user = user_factory()
        note = contract_note_factory(
            note='Important note',
            category='LEGAL',
            is_internal=True,
            created_by=user
        )
        serializer = ContractNoteSerializer(note)
        data = serializer.data

        assert data['note'] == 'Important note'
        assert data['category'] == 'LEGAL'
        assert data['category_display'] == 'Legal'
        assert data['is_internal'] is True
        assert 'created_by' in data


@pytest.mark.django_db
class TestPreviewContractSerializer:
    """Tests for PreviewContract serializer."""

    def test_preview_valid_data(self):
        """Test preview serializer with valid data."""
        data = {
            'context_data': {'client_name': 'John Doe', 'event_date': '2024-06-15'},
        }
        serializer = PreviewContractSerializer(data=data)

        assert serializer.is_valid()

    def test_preview_with_event_id(self):
        """Test preview serializer with event_id."""
        data = {
            'context_data': {},
            'event_id': 123,
        }
        serializer = PreviewContractSerializer(data=data)

        assert serializer.is_valid()

    def test_preview_context_data_must_be_dict(self):
        """Test context_data must be a dictionary."""
        data = {
            'context_data': ['not', 'a', 'dict'],
        }
        serializer = PreviewContractSerializer(data=data)

        assert not serializer.is_valid()
        assert 'context_data' in serializer.errors

    def test_preview_empty_context_data_allowed(self):
        """Test empty context_data is allowed."""
        data = {
            'context_data': {},
        }
        serializer = PreviewContractSerializer(data=data)

        assert serializer.is_valid()


@pytest.mark.django_db
class TestContractSerializerMobileCompatibility:
    """Tests for mobile app compatibility fields."""

    def test_contract_expires_at_alias(self, event_contract_factory):
        """Test expires_at is alias for valid_until."""
        valid_until = date.today() + timedelta(days=30)
        contract = event_contract_factory(valid_until=valid_until)
        serializer = EventContractSerializer(contract)

        assert serializer.data['expires_at'] == valid_until.isoformat()
        assert serializer.data['valid_until'] == valid_until.isoformat()

    def test_contract_signed_at_alias(self, event_contract_factory):
        """Test signed_at is alias for fully_signed_at."""
        signed_time = timezone.now()
        contract = event_contract_factory(
            status='SIGNED',
            fully_signed_at=signed_time
        )
        serializer = EventContractSerializer(contract)

        assert serializer.data['signed_at'] is not None
        assert serializer.data['fully_signed_at'] is not None

    def test_signature_signer_role_alias(self, contract_signature_factory):
        """Test signer_role is alias for role."""
        signature = contract_signature_factory(role='CLIENT')
        serializer = ContractSignatureSerializer(signature)

        assert serializer.data['signer_role'] == 'CLIENT'
        assert serializer.data['role'] == 'CLIENT'
