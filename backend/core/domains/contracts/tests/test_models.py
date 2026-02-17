"""
Unit tests for contracts domain models.

Tests:
- ContractTemplate model (templates, variables, signature requirements)
- EventContract model (status transitions, signatures, amendments)
- ContractSignature model (multi-party signing, verification)
- ContractAmendment model (amendments, value changes)
- ContractDocument model (document versioning)
- ContractNote model (internal/external notes)
"""

import pytest
from django.utils import timezone
from django.db import IntegrityError
from datetime import date, timedelta
from decimal import Decimal
from freezegun import freeze_time


@pytest.mark.django_db
class TestContractTemplateModel:
    """Unit tests for the ContractTemplate model."""

    def test_create_contract_template(self, contract_template_factory):
        """Test creating a contract template with required fields."""
        template = contract_template_factory(name='Wedding Contract')

        assert template.name == 'Wedding Contract'
        assert template.requires_signature is True
        assert template.requires_company_signature is True
        assert template.allows_amendments is True

    def test_template_string_representation(self, contract_template_factory):
        """Test ContractTemplate __str__ returns name."""
        template = contract_template_factory(name='Service Agreement')

        assert str(template) == 'Service Agreement'

    def test_get_sections_returns_empty_list_when_empty(self, contract_template_factory):
        """Test get_sections returns empty list when sections is empty.

        The sections field has a NOT NULL constraint (default=list), so it
        cannot be None at the database level. An empty list is the equivalent
        of 'no sections'.
        """
        template = contract_template_factory(sections=[])

        assert template.get_sections() == []

    def test_get_sections_returns_sections_list(self, contract_template_factory):
        """Test get_sections returns the sections list."""
        sections = [{'title': 'Terms'}, {'title': 'Conditions'}]
        template = contract_template_factory(sections=sections)

        assert template.get_sections() == sections

    def test_get_signature_requirements_default(self, contract_template_factory):
        """Test get_signature_requirements returns CLIENT and COMPANY_REP by default."""
        template = contract_template_factory(
            signature_requirements=[],
            requires_company_signature=True,
            requires_witness=False
        )

        requirements = template.get_signature_requirements()
        assert 'CLIENT' in requirements
        assert 'COMPANY_REP' in requirements
        assert 'WITNESS' not in requirements

    def test_get_signature_requirements_with_witness(self, contract_template_factory):
        """Test get_signature_requirements includes WITNESS when required."""
        template = contract_template_factory(
            signature_requirements=[],
            requires_company_signature=True,
            requires_witness=True
        )

        requirements = template.get_signature_requirements()
        assert 'CLIENT' in requirements
        assert 'COMPANY_REP' in requirements
        assert 'WITNESS' in requirements

    def test_get_signature_requirements_custom(self, contract_template_factory):
        """Test get_signature_requirements reflects boolean fields after save.

        The model's save() always rebuilds signature_requirements from the
        boolean fields (requires_company_signature, requires_witness), so
        custom requirements are overwritten. The returned list is based on
        the boolean configuration.
        """
        template = contract_template_factory(
            requires_company_signature=False,
            requires_witness=True,
        )

        requirements = template.get_signature_requirements()
        assert 'CLIENT' in requirements
        assert 'WITNESS' in requirements
        assert 'COMPANY_REP' not in requirements

    def test_template_with_event_type(self, contract_template_factory, event_type_factory):
        """Test template association with event type."""
        event_type = event_type_factory(name='Wedding')
        template = contract_template_factory(event_type=event_type)

        assert template.event_type == event_type
        assert template.event_type.name == 'Wedding'


@pytest.mark.django_db
class TestEventContractModel:
    """Unit tests for the EventContract model."""

    def test_create_event_contract(self, event_contract_factory):
        """Test creating an event contract."""
        contract = event_contract_factory(status='DRAFT')

        assert contract.status == 'DRAFT'
        assert contract.is_amendment is False
        assert contract.amendment_number == 0

    def test_contract_string_representation(self, event_contract_factory):
        """Test EventContract __str__ returns informative string."""
        contract = event_contract_factory(status='DRAFT')

        assert f"Contract for Event {contract.event.id}" in str(contract)
        assert 'DRAFT' in str(contract)

    def test_amendment_contract_string_representation(self, event_contract_factory):
        """Test EventContract __str__ for amendments."""
        original = event_contract_factory(status='SIGNED')
        amendment = event_contract_factory(
            event=original.event,
            is_amendment=True,
            original_contract=original,
            amendment_number=1
        )

        assert f"Amendment #1" in str(amendment)

    def test_is_fully_signed_no_signatures(self, event_contract_factory):
        """Test is_fully_signed returns False when no signatures."""
        contract = event_contract_factory(status='SENT')

        assert contract.is_fully_signed() is False

    def test_is_fully_signed_partial_signatures(
        self, event_contract_factory, contract_signature_factory
    ):
        """Test is_fully_signed returns False with partial signatures."""
        contract = event_contract_factory(status='SENT')
        contract_signature_factory(contract=contract, role='CLIENT')

        # Assuming template requires CLIENT and COMPANY_REP
        assert contract.is_fully_signed() is False

    def test_is_fully_signed_all_signatures(
        self, event_contract_factory, contract_signature_factory, contract_template_factory
    ):
        """Test is_fully_signed returns True when all required signatures present."""
        template = contract_template_factory(
            signature_requirements=['CLIENT'],
            requires_company_signature=False
        )
        contract = event_contract_factory(status='SENT', template=template)
        contract_signature_factory(contract=contract, role='CLIENT')

        assert contract.is_fully_signed() is True

    def test_get_missing_signatures(
        self, event_contract_factory, contract_signature_factory, contract_template_factory
    ):
        """Test get_missing_signatures returns list of missing roles."""
        template = contract_template_factory(
            signature_requirements=['CLIENT', 'COMPANY_REP']
        )
        contract = event_contract_factory(status='SENT', template=template)
        contract_signature_factory(contract=contract, role='CLIENT')

        missing = contract.get_missing_signatures()
        assert 'COMPANY_REP' in missing
        assert 'CLIENT' not in missing

    def test_can_be_amended_signed_contract(self, event_contract_factory, contract_template_factory):
        """Test can_be_amended returns True for signed, non-amendment contract."""
        template = contract_template_factory(allows_amendments=True)
        contract = event_contract_factory(
            status='SIGNED',
            template=template,
            is_amendment=False
        )

        assert contract.can_be_amended() is True

    def test_can_be_amended_draft_contract(self, event_contract_factory):
        """Test can_be_amended returns False for draft contract."""
        contract = event_contract_factory(status='DRAFT')

        assert contract.can_be_amended() is False

    def test_can_be_amended_amendment_contract(self, event_contract_factory, contract_template_factory):
        """Test can_be_amended returns False for amendment contracts."""
        template = contract_template_factory(allows_amendments=True)
        original = event_contract_factory(status='SIGNED', template=template)
        amendment = event_contract_factory(
            status='SIGNED',
            template=template,
            is_amendment=True,
            original_contract=original
        )

        assert amendment.can_be_amended() is False

    def test_can_be_amended_template_disallows(self, event_contract_factory, contract_template_factory):
        """Test can_be_amended returns False when template disallows."""
        template = contract_template_factory(allows_amendments=False)
        contract = event_contract_factory(
            status='SIGNED',
            template=template
        )

        assert contract.can_be_amended() is False

    def test_contract_value_tracking(self, event_contract_factory):
        """Test contract value fields."""
        contract = event_contract_factory(
            contract_value=Decimal('50000.00'),
            currency='PHP'
        )

        assert contract.contract_value == Decimal('50000.00')
        assert contract.currency == 'PHP'

    def test_contract_unique_constraint(self, event_contract_factory):
        """Test unique_together constraint on event and amendment_number."""
        contract1 = event_contract_factory(amendment_number=0)

        with pytest.raises(IntegrityError):
            event_contract_factory(
                event=contract1.event,
                amendment_number=0
            )

    def test_contract_ordering(self, event_contract_factory, event_factory):
        """Test contracts are ordered by created_at descending."""
        event = event_factory()
        contract1 = event_contract_factory(event=event, amendment_number=0)
        contract2 = event_contract_factory(event=event, amendment_number=1)

        from core.domains.contracts.models import EventContract
        contracts = list(EventContract.objects.filter(event=event))

        # Most recent should be first
        assert contracts[0] == contract2


@pytest.mark.django_db
class TestContractSignatureModel:
    """Unit tests for the ContractSignature model."""

    def test_create_signature(self, contract_signature_factory):
        """Test creating a contract signature."""
        signature = contract_signature_factory(
            role='CLIENT',
            signer_name='John Doe',
            signer_email='john@example.com'
        )

        assert signature.role == 'CLIENT'
        assert signature.signer_name == 'John Doe'
        assert signature.signed_at is not None

    def test_signature_string_representation(self, contract_signature_factory):
        """Test ContractSignature __str__ returns informative string."""
        signature = contract_signature_factory(role='CLIENT')

        assert 'Client signature' in str(signature)
        assert f"Contract {signature.contract.id}" in str(signature)

    def test_signature_role_choices(self, contract_signature_factory):
        """Test all role choices can be used."""
        roles = ['CLIENT', 'WITNESS', 'COMPANY_REP', 'GUARDIAN', 'PARTNER', 'OTHER']

        for role in roles:
            signature = contract_signature_factory(role=role)
            assert signature.role == role

    def test_signature_unique_per_role_per_contract(
        self, contract_signature_factory, event_contract_factory, user_factory
    ):
        """Test unique_together constraint on contract and role."""
        contract = event_contract_factory(status='SENT')
        user1 = user_factory()
        user2 = user_factory()

        contract_signature_factory(contract=contract, role='CLIENT', signer=user1)

        with pytest.raises(IntegrityError):
            contract_signature_factory(contract=contract, role='CLIENT', signer=user2)

    def test_signature_updates_contract_status(
        self, event_contract_factory, contract_signature_factory, contract_template_factory
    ):
        """Test that adding signature updates contract status."""
        template = contract_template_factory(
            signature_requirements=['CLIENT'],
            requires_company_signature=False
        )
        contract = event_contract_factory(status='SENT', template=template)

        contract_signature_factory(contract=contract, role='CLIENT')
        contract.refresh_from_db()

        assert contract.status == 'SIGNED'
        assert contract.fully_signed_at is not None

    def test_signature_verification_fields(self, contract_signature_factory):
        """Test signature verification fields."""
        signature = contract_signature_factory(
            is_verified=True,
            verification_method='email_verification'
        )

        assert signature.is_verified is True
        assert signature.verification_method == 'email_verification'

    def test_signature_compliance_fields(self, contract_signature_factory):
        """Test security/compliance fields on signature."""
        signature = contract_signature_factory(
            legal_disclosure_accepted=True,
            signature_intent_confirmed=True,
            device_fingerprint='test-fingerprint',
            signature_confidence_score=Decimal('0.9876')
        )

        assert signature.legal_disclosure_accepted is True
        assert signature.signature_intent_confirmed is True
        assert signature.device_fingerprint == 'test-fingerprint'
        assert signature.signature_confidence_score == Decimal('0.9876')


@pytest.mark.django_db
class TestContractAmendmentModel:
    """Unit tests for the ContractAmendment model."""

    def test_create_amendment(self, contract_amendment_factory):
        """Test creating a contract amendment."""
        amendment = contract_amendment_factory(
            amendment_reason='Change event date',
            changes_description='Updated event date from Jan 1 to Jan 15'
        )

        assert amendment.status == 'REQUESTED'
        assert amendment.amendment_reason == 'Change event date'

    def test_amendment_string_representation(self, contract_amendment_factory):
        """Test ContractAmendment __str__ returns informative string."""
        amendment = contract_amendment_factory()

        assert 'Amendment to Contract' in str(amendment)
        assert amendment.status in str(amendment)

    def test_amendment_value_change_calculation(self, contract_amendment_factory):
        """Test calculate_value_change method."""
        amendment = contract_amendment_factory(
            original_value=Decimal('50000.00'),
            new_value=Decimal('60000.00')
        )

        # Value change should be calculated on save
        assert amendment.value_change == Decimal('10000.00')

    def test_amendment_value_change_decrease(self, contract_amendment_factory):
        """Test calculate_value_change with decrease."""
        amendment = contract_amendment_factory(
            original_value=Decimal('50000.00'),
            new_value=Decimal('40000.00')
        )

        assert amendment.value_change == Decimal('-10000.00')

    def test_amendment_value_change_none_values(self, contract_amendment_factory):
        """Test value_change is None when original/new values are missing.

        The factory has a default value_change=Decimal('5000.00'), so we
        must explicitly pass value_change=None to test this scenario.
        """
        amendment = contract_amendment_factory(
            original_value=None,
            new_value=None,
            value_change=None,
        )

        assert amendment.value_change is None

    def test_amendment_status_choices(self, contract_amendment_factory):
        """Test all status choices can be used."""
        statuses = ['REQUESTED', 'DRAFT', 'SENT_FOR_REVIEW', 'APPROVED', 'SIGNED', 'REJECTED', 'CANCELLED']

        for status in statuses:
            amendment = contract_amendment_factory(status=status)
            assert amendment.status == status

    def test_amendment_ordering(self, contract_amendment_factory, event_contract_factory):
        """Test amendments are ordered by requested_at descending."""
        contract = event_contract_factory(status='SIGNED')
        amendment1 = contract_amendment_factory(original_contract=contract)
        amendment2 = contract_amendment_factory(original_contract=contract)

        from core.domains.contracts.models import ContractAmendment
        amendments = list(ContractAmendment.objects.filter(original_contract=contract))

        # Most recent should be first
        assert amendments[0] == amendment2


@pytest.mark.django_db
class TestContractDocumentModel:
    """Unit tests for the ContractDocument model."""

    def test_create_document(self, contract_document_factory):
        """Test creating a contract document."""
        document = contract_document_factory(
            name='Schedule A',
            document_type='SCHEDULE'
        )

        assert document.name == 'Schedule A'
        assert document.document_type == 'SCHEDULE'
        assert document.version == 1
        assert document.is_active is True

    def test_document_string_representation(self, contract_document_factory):
        """Test ContractDocument __str__ returns informative string."""
        document = contract_document_factory(name='Addendum', version=2)

        assert 'Addendum v2' in str(document)

    def test_document_type_choices(self, contract_document_factory):
        """Test all document type choices can be used."""
        types = ['ATTACHMENT', 'ADDENDUM', 'SCHEDULE', 'TERMS', 'WAIVER', 'OTHER']

        for doc_type in types:
            document = contract_document_factory(document_type=doc_type)
            assert document.document_type == doc_type

    def test_document_versioning(self, contract_document_factory, event_contract_factory):
        """Test document versioning works correctly."""
        contract = event_contract_factory()
        doc_v1 = contract_document_factory(
            contract=contract,
            name='Terms',
            version=1
        )
        doc_v2 = contract_document_factory(
            contract=contract,
            name='Terms',
            version=2
        )

        assert doc_v1.version == 1
        assert doc_v2.version == 2


@pytest.mark.django_db
class TestContractNoteModel:
    """Unit tests for the ContractNote model."""

    def test_create_note(self, contract_note_factory):
        """Test creating a contract note."""
        note = contract_note_factory(
            note='Important client requirement',
            category='GENERAL',
            is_internal=True
        )

        assert note.note == 'Important client requirement'
        assert note.category == 'GENERAL'
        assert note.is_internal is True

    def test_note_string_representation(self, contract_note_factory, user_factory):
        """Test ContractNote __str__ returns informative string."""
        user = user_factory()
        note = contract_note_factory(created_by=user)

        assert f"Note for Contract {note.contract.id}" in str(note)

    def test_note_category_choices(self, contract_note_factory):
        """Test all category choices can be used."""
        categories = ['GENERAL', 'LEGAL', 'NEGOTIATION', 'AMENDMENT', 'ISSUE', 'REMINDER']

        for category in categories:
            note = contract_note_factory(category=category)
            assert note.category == category

    def test_internal_vs_external_notes(self, contract_note_factory):
        """Test internal and external note types."""
        internal_note = contract_note_factory(is_internal=True)
        external_note = contract_note_factory(is_internal=False)

        assert internal_note.is_internal is True
        assert external_note.is_internal is False

    def test_note_ordering(self, contract_note_factory, event_contract_factory):
        """Test notes are ordered by created_at descending."""
        contract = event_contract_factory()
        note1 = contract_note_factory(contract=contract)
        note2 = contract_note_factory(contract=contract)

        from core.domains.contracts.models import ContractNote
        notes = list(ContractNote.objects.filter(contract=contract))

        # Most recent should be first
        assert notes[0] == note2


@pytest.mark.django_db
class TestContractStatusTransitions:
    """Test contract status update logic."""

    def test_partial_signature_updates_status(
        self, event_contract_factory, contract_signature_factory, contract_template_factory
    ):
        """Test that partial signatures update contract to PARTIALLY_SIGNED."""
        template = contract_template_factory(
            signature_requirements=['CLIENT', 'COMPANY_REP']
        )
        contract = event_contract_factory(status='SENT', template=template)

        contract_signature_factory(contract=contract, role='CLIENT')
        contract.refresh_from_db()

        assert contract.status == 'PARTIALLY_SIGNED'

    def test_full_signature_updates_to_signed(
        self, event_contract_factory, contract_signature_factory, contract_template_factory
    ):
        """Test that full signatures update contract to SIGNED."""
        template = contract_template_factory(
            signature_requirements=['CLIENT', 'COMPANY_REP']
        )
        contract = event_contract_factory(status='SENT', template=template)

        contract_signature_factory(contract=contract, role='CLIENT')
        contract_signature_factory(contract=contract, role='COMPANY_REP')
        contract.refresh_from_db()

        assert contract.status == 'SIGNED'
        assert contract.fully_signed_at is not None

    @freeze_time('2024-01-15 10:00:00')
    def test_valid_until_expiration(self, event_contract_factory):
        """Test contract expiration based on valid_until date."""
        # Contract expired yesterday
        contract = event_contract_factory(
            status='SENT',
            valid_until=date(2024, 1, 14)
        )

        # Check expiration (would be used by service layer)
        from datetime import date as date_today
        is_expired = contract.valid_until < date_today.today()

        assert is_expired is True
