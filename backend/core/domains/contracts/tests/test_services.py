"""
Unit tests for contracts domain services.

Tests:
- ContractTemplateService (CRUD, rendering, preview)
- EventContractService (contract lifecycle, voiding)
- ContractSignatureService (adding, verifying, removing signatures)
- ContractAmendmentService (amendment workflow)
- ContractDocumentService (document management)
- ContractNoteService (note management)
- ContractReportingService (statistics and reporting)
"""

from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from freezegun import freeze_time

from core.domains.contracts.exceptions import (
    AmendmentNotAllowed,
    ContractAlreadySigned,
    ContractExpired,
    ContractTemplateNotFound,
    EventContractNotFound,
    InvalidContractStatus,
    InvalidSignatureRole,
    SignatureAlreadyExists,
    SignatureRequired,
)
from core.domains.contracts.services import (
    ContractAmendmentService,
    ContractDocumentService,
    ContractNoteService,
    ContractReportingService,
    ContractSignatureService,
    ContractTemplateService,
    EventContractService,
)


@pytest.mark.django_db
class TestContractTemplateService:
    """Tests for ContractTemplateService."""

    def test_get_all_templates(self, contract_template_factory):
        """Test retrieving all templates."""
        contract_template_factory(name="Template A")
        contract_template_factory(name="Template B")

        templates = ContractTemplateService.get_all_templates()

        assert templates.count() == 2

    def test_get_all_templates_with_search(self, contract_template_factory):
        """Test filtering templates by search query."""
        contract_template_factory(name="Wedding Contract")
        contract_template_factory(name="Corporate Contract")

        templates = ContractTemplateService.get_all_templates(search_query="Wedding")

        assert templates.count() == 1
        assert templates.first().name == "Wedding Contract"

    def test_get_all_templates_by_event_type(self, contract_template_factory, event_type_factory):
        """Test filtering templates by event type."""
        wedding_type = event_type_factory(name="Wedding")
        corporate_type = event_type_factory(name="Corporate")

        contract_template_factory(name="Wedding Contract", event_type=wedding_type)
        contract_template_factory(name="Corporate Contract", event_type=corporate_type)

        templates = ContractTemplateService.get_all_templates(event_type_id=wedding_type.id)

        assert templates.count() == 1
        assert templates.first().event_type == wedding_type

    def test_get_template_by_id(self, contract_template_factory):
        """Test retrieving a template by ID."""
        template = contract_template_factory(name="Test Template")

        result = ContractTemplateService.get_template_by_id(template.id)

        assert result == template

    def test_get_template_by_id_not_found(self):
        """Test retrieving non-existent template raises exception."""
        with pytest.raises(ContractTemplateNotFound):
            ContractTemplateService.get_template_by_id(99999)

    def test_create_template(self):
        """Test creating a new template."""
        template_data = {
            "name": "New Template",
            "description": "Test description",
            "content": "Contract content here",
            "variables": ["client_name"],
            "sections": [{"title": "Terms"}],
        }

        template = ContractTemplateService.create_template(template_data)

        assert template.name == "New Template"
        assert template.description == "Test description"
        assert template.variables == ["client_name"]

    def test_update_template(self, contract_template_factory):
        """Test updating an existing template."""
        template = contract_template_factory(name="Old Name")

        updated = ContractTemplateService.update_template(
            template.id, {"name": "New Name", "description": "Updated description"}
        )

        assert updated.name == "New Name"
        assert updated.description == "Updated description"

    def test_delete_template(self, contract_template_factory):
        """Test deleting a template (soft-delete sets is_active=False)."""
        template = contract_template_factory(name="To Delete")
        template_id = template.id

        result = ContractTemplateService.delete_template(template_id)

        assert result is True
        # Soft-delete: template still exists but is_active=False
        template.refresh_from_db()
        assert template.is_active is False

    def test_delete_template_with_contracts_soft_deletes(self, contract_template_factory, event_contract_factory):
        """Test deleting template used by contracts soft-deletes it.

        The implementation performs a soft-delete (is_active=False) regardless
        of whether the template has associated contracts, preserving
        historical records.
        """
        template = contract_template_factory()
        event_contract_factory(template=template)

        result = ContractTemplateService.delete_template(template.id)

        assert result is True
        template.refresh_from_db()
        assert template.is_active is False

    def test_render_contract(self, contract_template_factory):
        """Test rendering contract content with variables."""
        template = contract_template_factory(content="Hello {{ client_name }}, your event is on {{ event_date }}.")
        context_data = {"client_name": "John Doe", "event_date": "January 15, 2024"}

        rendered = ContractTemplateService.render_contract(template.id, context_data)

        assert "John Doe" in rendered
        assert "January 15, 2024" in rendered

    def test_render_contract_with_signatures(
        self, contract_template_factory, event_contract_factory, contract_signature_factory
    ):
        """Test rendering contract with signature placeholders."""
        template = contract_template_factory(content="Contract content. {{ SIGNATURE_CLIENT }}")
        contract = event_contract_factory(template=template, status="SENT")
        contract_signature_factory(
            contract=contract,
            role="CLIENT",
            signer_name="John Doe",
            signature_data="data:image/png;base64,iVBORw0KGgo=",
        )

        rendered = ContractTemplateService.render_contract(template.id, {}, contract.signatures.all())

        assert "John Doe" in rendered
        assert "SIGNATURE PENDING" not in rendered

    def test_render_contract_pending_signatures(self, contract_template_factory):
        """Test rendering contract without signatures leaves placeholders.

        When no contract_signatures are provided, the render_contract method
        does not replace signature placeholders - they remain as unreplaced
        template variables in the output.
        """
        template = contract_template_factory(content="Contract content. {{ SIGNATURE_CLIENT }}")

        rendered = ContractTemplateService.render_contract(template.id, {})

        # Without signatures passed, the placeholder remains unreplaced
        assert "SIGNATURE_CLIENT" in rendered

    def test_preview_template(self, contract_template_factory):
        """Test previewing a template."""
        template = contract_template_factory(
            name="Test Template", content="Welcome {{ client_name }}", variables=["client_name"]
        )
        context_data = {"client_name": "Preview Client"}

        preview = ContractTemplateService.preview_template(template.id, context_data)

        assert preview["template_id"] == template.id
        assert preview["template_name"] == "Test Template"
        assert "Preview Client" in preview["rendered_content"]

    def test_preview_template_with_event(self, contract_template_factory, event_factory):
        """Test previewing template with event context."""
        template = contract_template_factory(content="Event: {{ event_name }} for {{ client_name }}")
        event = event_factory(name="Wedding Celebration")

        with patch.object(
            ContractTemplateService, "render_contract", return_value="Event: Wedding Celebration for Test Client"
        ):
            preview = ContractTemplateService.preview_template(template.id, {}, event_id=event.id)

        assert "context_used" in preview


@pytest.mark.django_db
class TestEventContractService:
    """Tests for EventContractService."""

    def test_get_contracts_for_event(self, event_contract_factory, event_factory):
        """Test retrieving contracts for an event."""
        event = event_factory()
        event_contract_factory(event=event, amendment_number=0)
        event_contract_factory(event=event, amendment_number=1)

        contracts = EventContractService.get_contracts_for_event(event.id)

        assert contracts.count() == 2

    def test_get_contract_by_id(self, event_contract_factory):
        """Test retrieving a contract by ID."""
        contract = event_contract_factory()

        result = EventContractService.get_contract_by_id(contract.id)

        assert result == contract

    def test_get_contract_by_id_not_found(self):
        """Test retrieving non-existent contract raises exception."""
        with pytest.raises(EventContractNotFound):
            EventContractService.get_contract_by_id(99999)

    def test_create_contract_from_template(self, event_factory, contract_template_factory):
        """Test creating a contract from a template."""
        event = event_factory(name="Test Event")
        template = contract_template_factory(content="Contract for {{ event_name }}")

        contract = EventContractService.create_contract_from_template(
            event_id=event.id, template_id=template.id, valid_until=date.today() + timedelta(days=30)
        )

        assert contract.status == "DRAFT"
        assert contract.event == event
        assert contract.template == template
        assert contract.amendment_number == 0

    def test_create_contract_increments_amendment_number(
        self, event_factory, contract_template_factory, event_contract_factory
    ):
        """Test that creating new contract increments amendment number."""
        event = event_factory()
        template = contract_template_factory()
        event_contract_factory(event=event, template=template, amendment_number=0)

        contract = EventContractService.create_contract_from_template(event_id=event.id, template_id=template.id)

        assert contract.amendment_number == 1

    def test_create_contract_template_not_found(self, event_factory):
        """Test creating contract with invalid template raises exception."""
        event = event_factory()

        with pytest.raises(ContractTemplateNotFound):
            EventContractService.create_contract_from_template(event_id=event.id, template_id=99999)

    def test_update_contract(self, event_contract_factory):
        """Test updating a contract."""
        contract = event_contract_factory(status="DRAFT")

        updated = EventContractService.update_contract(contract.id, {"status": "SENT"})

        assert updated.status == "SENT"
        assert updated.sent_at is not None

    def test_update_signed_contract_content_fails(self, event_contract_factory):
        """Test updating content of signed contract fails."""
        contract = event_contract_factory(status="SIGNED")

        with pytest.raises(ContractAlreadySigned):
            EventContractService.update_contract(contract.id, {"content": "New content"})

    def test_void_contract(self, event_contract_factory):
        """Test voiding a contract."""
        contract = event_contract_factory(status="SENT")

        voided = EventContractService.void_contract(contract.id, reason="Client requested cancellation")

        assert voided.status == "VOID"
        # Check that note was created
        assert voided.notes.filter(category="GENERAL").exists()

    def test_void_contract_without_reason(self, event_contract_factory):
        """Test voiding a contract without reason."""
        contract = event_contract_factory(status="SENT")

        voided = EventContractService.void_contract(contract.id)

        assert voided.status == "VOID"


@pytest.mark.django_db
class TestContractSignatureService:
    """Tests for ContractSignatureService."""

    def test_add_signature(self, event_contract_factory, contract_template_factory, user_factory):
        """Test adding a signature to a contract."""
        template = contract_template_factory(signature_requirements=["CLIENT", "COMPANY_REP"])
        contract = event_contract_factory(status="SENT", template=template)
        user = user_factory()

        signature = ContractSignatureService.add_signature(
            contract_id=contract.id,
            user_id=user.id,
            signature_data="data:image/png;base64,test",
            role="CLIENT",
            signer_name="John Doe",
            signer_email="john@example.com",
        )

        assert signature.role == "CLIENT"
        assert signature.signer_name == "John Doe"
        assert signature.contract == contract

    def test_add_signature_invalid_status(self, event_contract_factory, user_factory):
        """Test adding signature to draft contract fails."""
        contract = event_contract_factory(status="DRAFT")
        user = user_factory()

        with pytest.raises(InvalidContractStatus):
            ContractSignatureService.add_signature(
                contract_id=contract.id, user_id=user.id, signature_data="data:image/png;base64,test", role="CLIENT"
            )

    @freeze_time("2024-01-15")
    def test_add_signature_expired_contract(self, event_contract_factory, user_factory):
        """Test adding signature to expired contract fails."""
        contract = event_contract_factory(
            status="SENT",
            valid_until=date(2024, 1, 10),  # Expired
        )
        user = user_factory()

        with pytest.raises(ContractExpired):
            ContractSignatureService.add_signature(
                contract_id=contract.id, user_id=user.id, signature_data="data:image/png;base64,test", role="CLIENT"
            )

    def test_add_signature_without_data_fails(self, event_contract_factory, user_factory):
        """Test adding signature without data fails."""
        contract = event_contract_factory(status="SENT")
        user = user_factory()

        with pytest.raises(SignatureRequired):
            ContractSignatureService.add_signature(
                contract_id=contract.id,
                user_id=user.id,
                signature_data="",  # Empty
                role="CLIENT",
            )

    def test_add_duplicate_role_signature_fails(self, event_contract_factory, contract_signature_factory, user_factory):
        """Test adding duplicate role signature fails."""
        contract = event_contract_factory(status="SENT")
        contract_signature_factory(contract=contract, role="CLIENT")
        user = user_factory()

        with pytest.raises(SignatureAlreadyExists):
            ContractSignatureService.add_signature(
                contract_id=contract.id, user_id=user.id, signature_data="data:image/png;base64,test", role="CLIENT"
            )

    def test_add_signature_invalid_role(self, event_contract_factory, contract_template_factory, user_factory):
        """Test adding signature with invalid role fails."""
        template = contract_template_factory(
            signature_requirements=["CLIENT"]  # Only CLIENT required
        )
        contract = event_contract_factory(status="SENT", template=template)
        user = user_factory()

        with pytest.raises(InvalidSignatureRole):
            ContractSignatureService.add_signature(
                contract_id=contract.id,
                user_id=user.id,
                signature_data="data:image/png;base64,test",
                role="WITNESS",  # Not required
            )

    def test_get_signatures_for_contract(self, event_contract_factory, contract_signature_factory):
        """Test retrieving signatures for a contract."""
        contract = event_contract_factory(status="SENT")
        contract_signature_factory(contract=contract, role="CLIENT")
        contract_signature_factory(contract=contract, role="COMPANY_REP")

        signatures = ContractSignatureService.get_signatures_for_contract(contract.id)

        assert signatures.count() == 2

    def test_verify_signature(self, contract_signature_factory):
        """Test verifying a signature."""
        signature = contract_signature_factory(is_verified=False)

        verified = ContractSignatureService.verify_signature(signature.id, verification_method="email_verification")

        assert verified.is_verified is True
        assert verified.verification_method == "email_verification"

    def test_remove_signature(self, event_contract_factory, contract_signature_factory):
        """Test removing a signature."""
        contract = event_contract_factory(status="PARTIALLY_SIGNED")
        signature = contract_signature_factory(contract=contract, role="CLIENT")

        result = ContractSignatureService.remove_signature(signature.id)

        assert result is True
        assert not contract.signatures.filter(role="CLIENT").exists()

    def test_remove_signature_from_signed_contract_fails(self, event_contract_factory, contract_signature_factory):
        """Test removing signature from fully signed contract fails."""
        contract = event_contract_factory(status="SIGNED")
        signature = contract_signature_factory(contract=contract)

        with pytest.raises(InvalidContractStatus):
            ContractSignatureService.remove_signature(signature.id)


@pytest.mark.django_db
class TestContractAmendmentService:
    """Tests for ContractAmendmentService."""

    def test_request_amendment(self, event_contract_factory, contract_template_factory, user_factory):
        """Test requesting an amendment."""
        template = contract_template_factory(allows_amendments=True)
        contract = event_contract_factory(
            status="SIGNED", template=template, is_amendment=False, contract_value=Decimal("50000.00")
        )
        user = user_factory()

        amendment = ContractAmendmentService.request_amendment(
            original_contract_id=contract.id,
            amendment_data={
                "amendment_reason": "Price adjustment",
                "changes_description": "Added services",
                "new_value": Decimal("60000.00"),
            },
            requested_by=user,
        )

        assert amendment.status == "REQUESTED"
        assert amendment.original_value == Decimal("50000.00")
        assert amendment.new_value == Decimal("60000.00")
        assert amendment.value_change == Decimal("10000.00")

    def test_request_amendment_not_allowed(self, event_contract_factory, user_factory):
        """Test requesting amendment on non-amendable contract fails."""
        contract = event_contract_factory(status="DRAFT")
        user = user_factory()

        with pytest.raises(AmendmentNotAllowed):
            ContractAmendmentService.request_amendment(
                original_contract_id=contract.id, amendment_data={"amendment_reason": "Test"}, requested_by=user
            )

    def test_approve_amendment(self, contract_amendment_factory, user_factory):
        """Test approving an amendment."""
        amendment = contract_amendment_factory(status="REQUESTED")
        reviewer = user_factory(admin=True)

        approved = ContractAmendmentService.approve_amendment(
            amendment.id, reviewed_by=reviewer, review_notes="Approved as requested"
        )

        assert approved.status == "APPROVED"
        assert approved.reviewed_by == reviewer
        assert approved.reviewed_at is not None

    def test_approve_amendment_wrong_status(self, contract_amendment_factory, user_factory):
        """Test approving already-approved amendment fails."""
        amendment = contract_amendment_factory(status="APPROVED")
        reviewer = user_factory()

        with pytest.raises(ValueError):
            ContractAmendmentService.approve_amendment(amendment.id, reviewed_by=reviewer)

    def test_reject_amendment(self, contract_amendment_factory, user_factory):
        """Test rejecting an amendment."""
        amendment = contract_amendment_factory(status="REQUESTED")
        reviewer = user_factory(admin=True)

        rejected = ContractAmendmentService.reject_amendment(
            amendment.id, reviewed_by=reviewer, review_notes="Budget constraints"
        )

        assert rejected.status == "REJECTED"
        assert rejected.reviewed_by == reviewer

    def test_create_amendment_contract(
        self, contract_amendment_factory, event_contract_factory, contract_template_factory
    ):
        """Test creating contract from approved amendment."""
        template = contract_template_factory(content="Amendment contract content", allows_amendments=True)
        original = event_contract_factory(status="SIGNED", template=template, is_amendment=False, amendment_number=0)
        amendment = contract_amendment_factory(
            status="APPROVED", original_contract=original, new_value=Decimal("60000.00")
        )

        amendment_contract = ContractAmendmentService.create_amendment_contract(amendment.id)

        assert amendment_contract.is_amendment is True
        assert amendment_contract.original_contract == original
        assert amendment_contract.amendment_number == 1
        assert amendment_contract.status == "DRAFT"

        # Check original contract status
        original.refresh_from_db()
        assert original.status == "AMENDED"

    def test_cancel_amendment(self, contract_amendment_factory, user_factory):
        """Test cancelling an amendment."""
        amendment = contract_amendment_factory(status="REQUESTED")
        user = user_factory()

        cancelled = ContractAmendmentService.cancel_amendment(
            amendment.id, cancelled_by=user, reason="No longer needed"
        )

        assert cancelled.status == "CANCELLED"


@pytest.mark.django_db
class TestContractDocumentService:
    """Tests for ContractDocumentService."""

    def test_add_document(self, event_contract_factory, user_factory):
        """Test adding a document to a contract."""
        from django.core.files.uploadedfile import SimpleUploadedFile

        contract = event_contract_factory()
        user = user_factory()

        uploaded_file = SimpleUploadedFile(
            "test_document.pdf", b"%PDF-1.4 fake pdf content", content_type="application/pdf"
        )

        document_data = {
            "name": "Schedule A",
            "description": "Payment schedule",
            "document_type": "SCHEDULE",
            "file": uploaded_file,
        }

        document = ContractDocumentService.add_document(
            contract_id=contract.id, document_data=document_data, uploaded_by=user
        )

        assert document.name == "Schedule A"
        assert document.version == 1
        assert document.uploaded_by == user

    def test_add_document_creates_new_version(self, event_contract_factory, contract_document_factory, user_factory):
        """Test adding document with same name creates new version."""
        from django.core.files.uploadedfile import SimpleUploadedFile

        contract = event_contract_factory()
        user = user_factory()
        existing = contract_document_factory(contract=contract, name="Terms", version=1, is_active=True)

        uploaded_file = SimpleUploadedFile("terms_v2.pdf", b"%PDF-1.4 updated content", content_type="application/pdf")

        document_data = {"name": "Terms", "file": uploaded_file}

        new_doc = ContractDocumentService.add_document(
            contract_id=contract.id, document_data=document_data, uploaded_by=user
        )

        assert new_doc.version == 2
        existing.refresh_from_db()
        assert existing.is_active is False

    def test_get_documents_for_contract(self, event_contract_factory, contract_document_factory):
        """Test retrieving active documents for a contract."""
        contract = event_contract_factory()
        contract_document_factory(contract=contract, is_active=True)
        contract_document_factory(contract=contract, is_active=True)
        contract_document_factory(contract=contract, is_active=False)  # Inactive

        documents = ContractDocumentService.get_documents_for_contract(contract.id)

        assert documents.count() == 2

    def test_deactivate_document(self, contract_document_factory, user_factory):
        """Test deactivating a document."""
        document = contract_document_factory(is_active=True)
        user = user_factory()

        deactivated = ContractDocumentService.deactivate_document(document.id, deactivated_by=user)

        assert deactivated.is_active is False


@pytest.mark.django_db
class TestContractNoteService:
    """Tests for ContractNoteService."""

    def test_add_note(self, event_contract_factory, user_factory):
        """Test adding a note to a contract."""
        contract = event_contract_factory()
        user = user_factory()

        note = ContractNoteService.add_note(
            contract_id=contract.id,
            note_data={"note": "Important client feedback", "category": "NEGOTIATION", "is_internal": True},
            created_by=user,
        )

        assert note.note == "Important client feedback"
        assert note.category == "NEGOTIATION"
        assert note.created_by == user

    def test_get_notes_for_contract(self, event_contract_factory, contract_note_factory):
        """Test retrieving notes for a contract."""
        contract = event_contract_factory()
        contract_note_factory(contract=contract, is_internal=True)
        contract_note_factory(contract=contract, is_internal=False)

        all_notes = ContractNoteService.get_notes_for_contract(contract.id, include_internal=True)
        external_only = ContractNoteService.get_notes_for_contract(contract.id, include_internal=False)

        assert all_notes.count() == 2
        assert external_only.count() == 1

    def test_update_note(self, contract_note_factory, user_factory):
        """Test updating a note."""
        user = user_factory()
        note = contract_note_factory(note="Original note", created_by=user)

        updated = ContractNoteService.update_note(
            note.id, {"note": "Updated note", "category": "LEGAL"}, updated_by=user
        )

        assert updated.note == "Updated note"
        assert updated.category == "LEGAL"

    def test_update_note_not_owner_fails(self, contract_note_factory, user_factory):
        """Test updating note by non-owner fails."""
        owner = user_factory()
        other_user = user_factory()
        note = contract_note_factory(created_by=owner)

        with pytest.raises(PermissionError):
            ContractNoteService.update_note(note.id, {"note": "Attempted update"}, updated_by=other_user)

    def test_delete_note(self, contract_note_factory, user_factory):
        """Test deleting a note."""
        user = user_factory()
        note = contract_note_factory(created_by=user)
        note_id = note.id

        result = ContractNoteService.delete_note(note_id, deleted_by=user)

        assert result is True
        from core.domains.contracts.models import ContractNote

        assert not ContractNote.objects.filter(id=note_id).exists()


@pytest.mark.django_db
class TestContractReportingService:
    """Tests for ContractReportingService."""

    def test_get_contract_statistics(self, event_contract_factory, contract_template_factory):
        """Test getting contract statistics.

        The service sums contract_value for ALL contracts with a non-null value,
        not just signed ones. Set contract_value=None for DRAFT/SENT contracts
        so only the SIGNED contract contributes to total_value.
        """
        template = contract_template_factory()
        event_contract_factory(status="DRAFT", template=template, contract_value=None)
        event_contract_factory(status="SENT", template=template, contract_value=None)
        event_contract_factory(status="SIGNED", template=template, contract_value=Decimal("50000.00"))

        stats = ContractReportingService.get_contract_statistics()

        assert stats["total_contracts"] == 3
        assert stats["by_status"]["DRAFT"] == 1
        assert stats["by_status"]["SENT"] == 1
        assert stats["by_status"]["SIGNED"] == 1
        assert stats["fully_signed"] == 1
        assert stats["total_value"] == Decimal("50000.00")

    def test_get_pending_signatures(self, event_contract_factory, contract_template_factory):
        """Test getting contracts with pending signatures."""
        template = contract_template_factory()
        event_contract_factory(status="SENT", template=template)
        event_contract_factory(status="PARTIALLY_SIGNED", template=template)
        event_contract_factory(status="SIGNED", template=template)

        pending = ContractReportingService.get_pending_signatures()

        assert pending.count() == 2

    def test_get_expiring_contracts(self, event_contract_factory, contract_template_factory):
        """Test getting contracts expiring soon."""
        template = contract_template_factory()
        # Expiring in 3 days
        event_contract_factory(status="SENT", template=template, valid_until=date.today() + timedelta(days=3))
        # Expiring in 10 days (outside range)
        event_contract_factory(status="SENT", template=template, valid_until=date.today() + timedelta(days=10))

        expiring = ContractReportingService.get_expiring_contracts(days_ahead=7)

        assert expiring.count() == 1

    def test_get_amendment_summary(self, contract_amendment_factory):
        """Test getting amendment statistics."""
        contract_amendment_factory(status="REQUESTED")
        contract_amendment_factory(status="APPROVED")
        contract_amendment_factory(status="REJECTED")

        summary = ContractReportingService.get_amendment_summary()

        assert summary["total_amendments"] == 3
        assert summary["pending_review"] == 1
        assert summary["approved_pending_contract"] == 1
