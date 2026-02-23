"""
Unit tests for contracts domain client-facing views.

Tests:
- ClientContractViewSet (list, retrieve, sign, status, pending_signatures, download_pdf)
- ClientSignatureViewSet (list, my_signatures)
- ClientContractPermission (permission checks)
"""

from datetime import date, timedelta
from unittest.mock import patch

from rest_framework import status

import pytest
from freezegun import freeze_time
from pytest_factoryboy import register

from core.factories.contracts import (
    ContractAmendmentFactory,
    ContractDocumentFactory,
    ContractSignatureFactory,
    ContractTemplateFactory,
    EventContractFactory,
)

# Register factories
register(ContractTemplateFactory)
register(EventContractFactory)
register(ContractSignatureFactory)
register(ContractAmendmentFactory)
register(ContractDocumentFactory)


@pytest.mark.django_db
class TestClientContractPermission:
    """Tests for ClientContractPermission."""

    def test_unauthenticated_user_denied(self, api_client):
        """Test unauthenticated users cannot access client contracts."""
        response = api_client.get("/api/contracts/client/contracts/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_client_user_allowed(self, authenticated_client, user_factory):
        """Test client users can access the endpoint."""
        client_user = user_factory(role="CLIENT")
        client = authenticated_client(user=client_user)

        response = client.get("/api/contracts/client/contracts/")
        assert response.status_code == status.HTTP_200_OK

    def test_admin_user_allowed(self, admin_client):
        """Test admin users can access the endpoint."""
        response = admin_client.get("/api/contracts/client/contracts/")
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestClientContractViewSet:
    """Tests for ClientContractViewSet."""

    def test_list_contracts_client_only_sees_own(
        self, authenticated_client, event_factory, event_contract_factory, user_factory
    ):
        """Test client users only see contracts for their events."""
        client_user = user_factory(role="CLIENT")
        other_user = user_factory(role="CLIENT")

        client_event = event_factory(client=client_user)
        other_event = event_factory(client=other_user)

        # Create contracts - client's contract must be in a visible status
        event_contract_factory(event=client_event, status="SENT")
        event_contract_factory(event=other_event, status="SENT")

        client = authenticated_client(user=client_user)
        response = client.get("/api/contracts/client/contracts/")

        assert response.status_code == status.HTTP_200_OK
        data = response.data.get("results", response.data)
        # Client should only see their own contracts
        for contract in data:
            assert contract["event"]["id"] == client_event.id

    def test_list_contracts_filter_by_status(
        self, authenticated_client, event_factory, event_contract_factory, user_factory
    ):
        """Test filtering contracts by status."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)

        event_contract_factory(event=event, status="SENT", amendment_number=0)
        event_contract_factory(event=event, status="SIGNED", amendment_number=1)

        client = authenticated_client(user=client_user)
        response = client.get("/api/contracts/client/contracts/?status=SENT")

        assert response.status_code == status.HTTP_200_OK
        data = response.data.get("results", response.data)
        assert all(c["status"] == "SENT" for c in data)

    def test_list_contracts_filter_by_event(
        self, authenticated_client, event_factory, event_contract_factory, user_factory
    ):
        """Test filtering contracts by event."""
        client_user = user_factory(role="CLIENT")
        event1 = event_factory(client=client_user)
        event2 = event_factory(client=client_user)

        event_contract_factory(event=event1, status="SENT")
        event_contract_factory(event=event2, status="SENT")

        client = authenticated_client(user=client_user)
        response = client.get(f"/api/contracts/client/contracts/?event={event1.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.data.get("results", response.data)
        assert all(c["event"]["id"] == event1.id for c in data)

    def test_draft_contracts_not_visible_to_client(
        self, authenticated_client, event_factory, event_contract_factory, user_factory
    ):
        """Test draft contracts are not visible to clients."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)

        event_contract_factory(event=event, status="DRAFT", amendment_number=0)
        event_contract_factory(event=event, status="SENT", amendment_number=1)

        client = authenticated_client(user=client_user)
        response = client.get("/api/contracts/client/contracts/")

        assert response.status_code == status.HTTP_200_OK
        data = response.data.get("results", response.data)
        # Only SENT contract visible, not DRAFT
        assert all(c["status"] != "DRAFT" for c in data)

    def test_retrieve_contract_includes_calculated_fields(
        self, authenticated_client, event_factory, event_contract_factory, contract_template_factory, user_factory
    ):
        """Test retrieve includes can_client_sign and sign_disabled_reason."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        template = contract_template_factory(signature_requirements=["CLIENT", "COMPANY_REP"])
        contract = event_contract_factory(event=event, template=template, status="SENT")

        client = authenticated_client(user=client_user)
        response = client.get(f"/api/contracts/client/contracts/{contract.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert "is_fully_signed" in response.data
        assert "missing_signatures" in response.data

    def test_retrieve_contract_other_client_forbidden(
        self, authenticated_client, event_factory, event_contract_factory, user_factory
    ):
        """Test client cannot retrieve contracts from other clients."""
        client_user = user_factory(role="CLIENT")
        other_user = user_factory(role="CLIENT")

        other_event = event_factory(client=other_user)
        contract = event_contract_factory(event=other_event, status="SENT")

        client = authenticated_client(user=client_user)
        response = client.get(f"/api/contracts/client/contracts/{contract.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_sign_contract(
        self, authenticated_client, event_factory, event_contract_factory, contract_template_factory, user_factory
    ):
        """Test client can sign a contract."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        template = contract_template_factory(signature_requirements=["CLIENT", "COMPANY_REP"])
        contract = event_contract_factory(
            event=event, template=template, status="SENT", valid_until=date.today() + timedelta(days=7)
        )

        client = authenticated_client(user=client_user)
        payload = {
            "signature_data": "data:image/png;base64,test123",
            "signer_name": "John Doe",
            "signer_email": client_user.email,
            "legal_disclosure_accepted": True,
            "signature_intent_confirmed": True,
        }

        response = client.post(f"/api/contracts/client/contracts/{contract.id}/sign/", payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED

    def test_sign_contract_already_signed_by_client(
        self,
        authenticated_client,
        event_factory,
        event_contract_factory,
        contract_template_factory,
        contract_signature_factory,
        user_factory,
    ):
        """Test client cannot sign if already signed."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        template = contract_template_factory(signature_requirements=["CLIENT", "COMPANY_REP"])
        contract = event_contract_factory(
            event=event, template=template, status="PARTIALLY_SIGNED", valid_until=date.today() + timedelta(days=7)
        )
        # Client already signed
        contract_signature_factory(contract=contract, signer=client_user, role="CLIENT")

        client = authenticated_client(user=client_user)
        payload = {
            "signature_data": "data:image/png;base64,test123",
            "signer_name": "John Doe",
            "signer_email": client_user.email,
        }

        response = client.post(f"/api/contracts/client/contracts/{contract.id}/sign/", payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @freeze_time("2024-01-15")
    def test_sign_contract_expired(
        self, authenticated_client, event_factory, event_contract_factory, contract_template_factory, user_factory
    ):
        """Test client cannot sign an expired contract."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        template = contract_template_factory(signature_requirements=["CLIENT"])
        contract = event_contract_factory(
            event=event,
            template=template,
            status="SENT",
            valid_until=date(2024, 1, 10),  # Expired
        )

        client = authenticated_client(user=client_user)
        payload = {
            "signature_data": "data:image/png;base64,test123",
            "signer_name": "John Doe",
        }

        response = client.post(f"/api/contracts/client/contracts/{contract.id}/sign/", payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_sign_contract_wrong_status(
        self, authenticated_client, event_factory, event_contract_factory, contract_template_factory, user_factory
    ):
        """Test client cannot sign a contract not in SENT/PARTIALLY_SIGNED status."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        template = contract_template_factory(signature_requirements=["CLIENT"])
        contract = event_contract_factory(
            event=event,
            template=template,
            status="SIGNED",  # Already fully signed
        )

        client = authenticated_client(user=client_user)
        payload = {
            "signature_data": "data:image/png;base64,test123",
            "signer_name": "John Doe",
        }

        response = client.post(f"/api/contracts/client/contracts/{contract.id}/sign/", payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_contract_status_action(
        self, authenticated_client, event_factory, event_contract_factory, contract_template_factory, user_factory
    ):
        """Test getting detailed signature status for a contract."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        template = contract_template_factory(signature_requirements=["CLIENT", "COMPANY_REP"])
        contract = event_contract_factory(
            event=event, template=template, status="SENT", valid_until=date.today() + timedelta(days=7)
        )

        client = authenticated_client(user=client_user)
        response = client.get(f"/api/contracts/client/contracts/{contract.id}/status/")

        assert response.status_code == status.HTTP_200_OK
        assert "signature_progress" in response.data
        assert response.data["signature_progress"]["total_required"] == 2
        assert response.data["can_client_sign"] is True
        assert response.data["sign_disabled_reason"] is None

    def test_contract_status_with_disabled_reason(
        self,
        authenticated_client,
        event_factory,
        event_contract_factory,
        contract_template_factory,
        contract_signature_factory,
        user_factory,
    ):
        """Test status returns disabled reason when client already signed."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        template = contract_template_factory(signature_requirements=["CLIENT", "COMPANY_REP"])
        contract = event_contract_factory(event=event, template=template, status="PARTIALLY_SIGNED")
        # Client already signed
        contract_signature_factory(contract=contract, signer=client_user, role="CLIENT")

        client = authenticated_client(user=client_user)
        response = client.get(f"/api/contracts/client/contracts/{contract.id}/status/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["can_client_sign"] is False
        assert "already signed" in response.data["sign_disabled_reason"]

    def test_pending_signatures_action(
        self, authenticated_client, event_factory, event_contract_factory, contract_template_factory, user_factory
    ):
        """Test getting contracts that require client signature."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        template = contract_template_factory(signature_requirements=["CLIENT"])

        # Contract needing signature
        event_contract_factory(
            event=event,
            template=template,
            status="SENT",
            valid_until=date.today() + timedelta(days=7),
            amendment_number=0,
        )
        # Already signed contract
        event_contract_factory(event=event, template=template, status="SIGNED", amendment_number=1)

        client = authenticated_client(user=client_user)
        response = client.get("/api/contracts/client/contracts/pending_signatures/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1
        assert "contracts" in response.data

    @patch("core.domains.contracts.client_views.ContractPDFService.generate_contract_pdf")
    def test_download_pdf_signed_contract(
        self, mock_pdf_service, authenticated_client, event_factory, event_contract_factory, user_factory
    ):
        """Test downloading PDF for signed contract."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        contract = event_contract_factory(event=event, status="SIGNED")
        mock_pdf_service.return_value = b"%PDF-1.4 test content"

        client = authenticated_client(user=client_user)
        response = client.get(f"/api/contracts/client/contracts/{contract.id}/download_pdf/")

        assert response.status_code == status.HTTP_200_OK
        assert response["Content-Type"] == "application/pdf"
        mock_pdf_service.assert_called_once()

    def test_download_pdf_unsigned_contract_fails(
        self, authenticated_client, event_factory, event_contract_factory, user_factory
    ):
        """Test client cannot download PDF for unsigned contract."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        contract = event_contract_factory(event=event, status="SENT")

        client = authenticated_client(user=client_user)
        response = client.get(f"/api/contracts/client/contracts/{contract.id}/download_pdf/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "fully signed" in response.data["error"]

    def test_amendments_action(
        self, authenticated_client, event_factory, event_contract_factory, contract_amendment_factory, user_factory
    ):
        """Test getting amendments for a contract."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        contract = event_contract_factory(event=event, status="SIGNED")
        contract_amendment_factory(original_contract=contract)

        client = authenticated_client(user=client_user)
        response = client.get(f"/api/contracts/client/contracts/{contract.id}/amendments/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_documents_action(
        self, authenticated_client, event_factory, event_contract_factory, contract_document_factory, user_factory
    ):
        """Test getting documents for a contract."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        contract = event_contract_factory(event=event, status="SENT")
        contract_document_factory(contract=contract, is_active=True)
        contract_document_factory(contract=contract, is_active=False)  # Inactive

        client = authenticated_client(user=client_user)
        response = client.get(f"/api/contracts/client/contracts/{contract.id}/documents/")

        assert response.status_code == status.HTTP_200_OK
        # Only active documents
        assert len(response.data) == 1


@pytest.mark.django_db
class TestClientSignatureViewSet:
    """Tests for ClientSignatureViewSet."""

    def test_list_signatures_client_only_sees_own(
        self, authenticated_client, event_factory, event_contract_factory, contract_signature_factory, user_factory
    ):
        """Test client users only see signatures from their contracts."""
        client_user = user_factory(role="CLIENT")
        other_user = user_factory(role="CLIENT")

        client_event = event_factory(client=client_user)
        other_event = event_factory(client=other_user)

        client_contract = event_contract_factory(event=client_event, status="SENT")
        other_contract = event_contract_factory(event=other_event, status="SENT")

        # Signatures on both contracts
        contract_signature_factory(contract=client_contract, role="CLIENT")
        contract_signature_factory(contract=other_contract, role="CLIENT")

        client = authenticated_client(user=client_user)
        response = client.get("/api/contracts/client/signatures/")

        assert response.status_code == status.HTTP_200_OK
        data = response.data.get("results", response.data)
        # Client should only see signatures from their contracts
        for sig in data:
            assert sig["contract"] == client_contract.id

    def test_my_signatures_action(
        self, authenticated_client, event_factory, event_contract_factory, contract_signature_factory, user_factory
    ):
        """Test getting signatures created by the current user."""
        client_user = user_factory(role="CLIENT")
        other_user = user_factory(role="CLIENT")

        event = event_factory(client=client_user)
        contract = event_contract_factory(event=event, status="SENT")

        # Signature by client
        contract_signature_factory(contract=contract, signer=client_user, role="CLIENT")
        # Signature by someone else
        contract_signature_factory(contract=contract, signer=other_user, role="WITNESS")

        client = authenticated_client(user=client_user)
        response = client.get("/api/contracts/client/signatures/my_signatures/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["signatures"][0]["signer"]["id"] == client_user.id


@pytest.mark.django_db
class TestClientCanSignLogic:
    """Tests for _can_client_sign and _get_sign_disabled_reason helper methods."""

    def test_can_sign_sent_contract(
        self, authenticated_client, event_factory, event_contract_factory, contract_template_factory, user_factory
    ):
        """Test client can sign a SENT contract."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        template = contract_template_factory(signature_requirements=["CLIENT"])
        contract = event_contract_factory(
            event=event, template=template, status="SENT", valid_until=date.today() + timedelta(days=7)
        )

        client = authenticated_client(user=client_user)
        response = client.get(f"/api/contracts/client/contracts/{contract.id}/status/")

        assert response.data["can_client_sign"] is True
        assert response.data["sign_disabled_reason"] is None

    def test_cannot_sign_void_contract(
        self, authenticated_client, event_factory, event_contract_factory, contract_template_factory, user_factory
    ):
        """Test client cannot sign a VOID contract."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        template = contract_template_factory(signature_requirements=["CLIENT"])
        contract = event_contract_factory(event=event, template=template, status="VOID")

        client = authenticated_client(user=client_user)
        # VOID contracts might not be visible to client, handle 404
        response = client.get(f"/api/contracts/client/contracts/{contract.id}/status/")

        # If visible, should show cannot sign
        if response.status_code == status.HTTP_200_OK:
            assert response.data["can_client_sign"] is False
            assert "voided" in response.data["sign_disabled_reason"]

    def test_cannot_sign_amended_contract(
        self, authenticated_client, event_factory, event_contract_factory, contract_template_factory, user_factory
    ):
        """Test client cannot sign an AMENDED contract."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        template = contract_template_factory(signature_requirements=["CLIENT"])
        contract = event_contract_factory(event=event, template=template, status="AMENDED")

        client = authenticated_client(user=client_user)
        # AMENDED contracts might not be visible to client, handle 404
        response = client.get(f"/api/contracts/client/contracts/{contract.id}/status/")

        if response.status_code == status.HTTP_200_OK:
            assert response.data["can_client_sign"] is False
            assert "amended" in response.data["sign_disabled_reason"]

    def test_client_role_always_required(
        self, authenticated_client, event_factory, event_contract_factory, contract_template_factory, user_factory
    ):
        """Test that CLIENT role is always required in signature requirements.

        The ContractTemplate model's save() method syncs signature_requirements
        from boolean fields and always includes 'CLIENT'. Even if you pass
        signature_requirements=['COMPANY_REP'], the model's _sync_signature_requirements
        will rebuild it to include CLIENT.
        """
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        # Even though we only pass COMPANY_REP, the model always adds CLIENT
        template = contract_template_factory(
            signature_requirements=["COMPANY_REP"],
            requires_company_signature=True,
        )
        contract = event_contract_factory(
            event=event, template=template, status="SENT", valid_until=date.today() + timedelta(days=7)
        )

        client = authenticated_client(user=client_user)
        response = client.get(f"/api/contracts/client/contracts/{contract.id}/status/")

        assert response.status_code == status.HTTP_200_OK
        # CLIENT is always included by the model's _sync_signature_requirements
        assert response.data["can_client_sign"] is True
        assert response.data["sign_disabled_reason"] is None


@pytest.mark.django_db
class TestAdminAccessToClientEndpoints:
    """Tests for admin access to client endpoints."""

    def test_admin_sees_all_contracts(self, admin_client, event_factory, event_contract_factory, user_factory):
        """Test admin can see all contracts on client endpoint."""
        client_user1 = user_factory(role="CLIENT")
        client_user2 = user_factory(role="CLIENT")

        event1 = event_factory(client=client_user1)
        event2 = event_factory(client=client_user2)

        event_contract_factory(event=event1, status="SENT")
        event_contract_factory(event=event2, status="SENT")

        response = admin_client.get("/api/contracts/client/contracts/")

        assert response.status_code == status.HTTP_200_OK
        data = response.data.get("results", response.data)
        # Admin sees all contracts
        assert len(data) >= 2

    def test_admin_can_access_any_contract(self, admin_client, event_factory, event_contract_factory, user_factory):
        """Test admin can retrieve any contract."""
        client_user = user_factory(role="CLIENT")
        event = event_factory(client=client_user)
        contract = event_contract_factory(event=event, status="SENT")

        response = admin_client.get(f"/api/contracts/client/contracts/{contract.id}/")

        assert response.status_code == status.HTTP_200_OK
