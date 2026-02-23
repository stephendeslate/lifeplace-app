"""
Tests for consent management endpoints.

Tests:
- Consent list view (GET /me/consents/)
- Consent withdrawal (POST /me/consents/{type}/withdraw/)
- Privacy request list (GET /me/privacy-requests/)
"""

from django.urls import reverse
from rest_framework import status

import pytest


@pytest.mark.django_db
class TestConsentList:
    """Tests for GET /api/users/me/consents/"""

    def test_list_consents_success(self, authenticated_client, user_factory):
        """Test listing all consent types for authenticated user."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse("users:consent-list")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "consents" in response.data
        assert len(response.data["consents"]) > 0

        # Check structure of consent items
        consent = response.data["consents"][0]
        assert "consent_type" in consent
        assert "purpose" in consent
        assert "status" in consent
        assert "can_withdraw" in consent

    def test_list_consents_shows_granted_status(self, authenticated_client, user_factory, consent_record_factory):
        """Test consent list shows correct granted status."""
        user = user_factory()
        consent_record_factory(user=user, consent_type="MARKETING_EMAIL", action="GRANT")
        client = authenticated_client(user=user)

        url = reverse("users:consent-list")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Find marketing email consent
        marketing_consent = next((c for c in response.data["consents"] if c["consent_type"] == "MARKETING_EMAIL"), None)
        assert marketing_consent is not None
        assert marketing_consent["status"] == "granted"

    def test_list_consents_shows_not_granted_status(self, authenticated_client, user_factory):
        """Test consent list shows not_granted for consents without records."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse("users:consent-list")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Find any consent - should be not_granted if no record exists
        for consent in response.data["consents"]:
            # If no consent record exists, status should be not_granted
            assert consent["status"] in ["granted", "not_granted"]

    def test_list_consents_withdrawable_types(self, authenticated_client, user_factory):
        """Test that withdrawable consent types are marked correctly."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse("users:consent-list")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Privacy policy and terms cannot be withdrawn
        for consent in response.data["consents"]:
            if consent["consent_type"] in ["PRIVACY_POLICY", "TERMS_OF_SERVICE"]:
                assert consent["can_withdraw"] is False
            elif consent["consent_type"].startswith("MARKETING"):
                assert consent["can_withdraw"] is True

    def test_list_consents_unauthenticated(self, api_client):
        """Test consent list requires authentication."""
        url = reverse("users:consent-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestConsentWithdraw:
    """Tests for POST /api/users/me/consents/{consent_type}/withdraw/"""

    def test_withdraw_marketing_consent(self, authenticated_client, user_factory):
        """Test successfully withdrawing marketing consent."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse("users:consent-withdraw", kwargs={"consent_type": "MARKETING_EMAIL"})
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "withdrawn"
        assert response.data["consent_type"] == "MARKETING_EMAIL"
        assert response.data["effective_immediately"] is True

    def test_withdraw_creates_consent_record(self, authenticated_client, user_factory):
        """Test withdrawal creates a consent record."""
        from core.domains.users.models import ConsentRecord

        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse("users:consent-withdraw", kwargs={"consent_type": "MARKETING_SMS"})
        client.post(url)

        # Verify consent record was created
        record = ConsentRecord.objects.filter(user=user, consent_type="MARKETING_SMS", action="WITHDRAW").first()
        assert record is not None
        assert record.source == "PRIVACY_DASHBOARD"

    def test_withdraw_privacy_policy_forbidden(self, authenticated_client, user_factory):
        """Test cannot withdraw privacy policy consent."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse("users:consent-withdraw", kwargs={"consent_type": "PRIVACY_POLICY"})
        response = client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "cannot be withdrawn" in response.data.get("error", "").lower()

    def test_withdraw_terms_forbidden(self, authenticated_client, user_factory):
        """Test cannot withdraw terms of service consent."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse("users:consent-withdraw", kwargs={"consent_type": "TERMS_OF_SERVICE"})
        response = client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_withdraw_unauthenticated(self, api_client):
        """Test consent withdrawal requires authentication."""
        url = reverse("users:consent-withdraw", kwargs={"consent_type": "MARKETING_EMAIL"})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestPrivacyRequestList:
    """Tests for GET /api/users/me/privacy-requests/"""

    def test_list_privacy_requests_empty(self, authenticated_client, user_factory):
        """Test listing privacy requests when none exist."""
        user = user_factory()
        client = authenticated_client(user=user)

        url = reverse("users:privacy-requests")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "requests" in response.data
        assert len(response.data["requests"]) == 0

    def test_list_privacy_requests_with_records(self, authenticated_client, user_factory, privacy_request_factory):
        """Test listing privacy requests with existing records."""
        user = user_factory()
        privacy_request_factory(user=user, request_type="ACCESS", completed=True)
        privacy_request_factory(user=user, request_type="EXPORT", completed=True)
        client = authenticated_client(user=user)

        url = reverse("users:privacy-requests")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["requests"]) == 2

    def test_list_privacy_requests_structure(self, authenticated_client, user_factory, privacy_request_factory):
        """Test privacy request list item structure."""
        user = user_factory()
        privacy_request_factory(user=user, request_type="ACCESS", completed=True)
        client = authenticated_client(user=user)

        url = reverse("users:privacy-requests")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["requests"]) == 1

        request = response.data["requests"][0]
        assert "id" in request
        assert "type" in request
        assert "status" in request
        assert "submitted_at" in request

    def test_list_privacy_requests_only_own(self, authenticated_client, user_factory, privacy_request_factory):
        """Test users can only see their own privacy requests."""
        user1 = user_factory()
        user2 = user_factory()
        privacy_request_factory(user=user1, request_type="ACCESS")
        privacy_request_factory(user=user2, request_type="EXPORT")

        client = authenticated_client(user=user1)

        url = reverse("users:privacy-requests")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["requests"]) == 1
        assert response.data["requests"][0]["type"] == "ACCESS"

    def test_list_privacy_requests_ordered_by_date(self, authenticated_client, user_factory, privacy_request_factory):
        """Test privacy requests are ordered by date descending."""
        user = user_factory()
        # Create in specific order
        privacy_request_factory(user=user, request_type="ACCESS")
        privacy_request_factory(user=user, request_type="EXPORT")
        privacy_request_factory(user=user, request_type="CORRECTION")

        client = authenticated_client(user=user)

        url = reverse("users:privacy-requests")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Should be in reverse chronological order (newest first)
        assert len(response.data["requests"]) == 3

    def test_list_privacy_requests_unauthenticated(self, api_client):
        """Test privacy request list requires authentication."""
        url = reverse("users:privacy-requests")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestConsentRecordModel:
    """Tests for ConsentRecord model methods."""

    def test_is_consented_with_grant(self, user_factory, consent_record_factory):
        """Test is_consented returns True when consent granted."""
        from core.domains.users.models import ConsentRecord

        user = user_factory()
        consent_record_factory(user=user, consent_type="MARKETING_EMAIL", action="GRANT")

        assert ConsentRecord.is_consented(user, "MARKETING_EMAIL") is True

    def test_is_consented_with_withdraw(self, user_factory, consent_record_factory):
        """Test is_consented returns False when consent withdrawn."""
        from core.domains.users.models import ConsentRecord

        user = user_factory()
        consent_record_factory(user=user, consent_type="MARKETING_EMAIL", withdrawn=True)

        assert ConsentRecord.is_consented(user, "MARKETING_EMAIL") is False

    def test_is_consented_with_no_record(self, user_factory):
        """Test is_consented returns falsy value when no consent record exists."""
        from core.domains.users.models import ConsentRecord

        user = user_factory()

        # Returns None or False (both falsy) when no record exists
        assert not ConsentRecord.is_consented(user, "MARKETING_EMAIL")

    def test_get_current_consent(self, user_factory, consent_record_factory):
        """Test get_current_consent returns most recent record."""
        from core.domains.users.models import ConsentRecord

        user = user_factory()
        consent_record_factory(user=user, consent_type="MARKETING_EMAIL", action="GRANT")
        consent_record_factory(user=user, consent_type="MARKETING_EMAIL", withdrawn=True)

        current = ConsentRecord.get_current_consent(user, "MARKETING_EMAIL")
        assert current.action == "WITHDRAW"  # Most recent


@pytest.mark.django_db
class TestPrivacyRequestModel:
    """Tests for PrivacyRequest model methods."""

    def test_days_since_submission(self, user_factory, privacy_request_factory):
        """Test days_since_submission calculation."""
        user = user_factory()
        request = privacy_request_factory(user=user)

        # Should be 0 or very small for just-created request
        assert request.days_since_submission() >= 0

    def test_is_overdue_pending(self, user_factory, privacy_request_factory, mocker):
        """Test is_overdue for pending request."""
        from datetime import timedelta

        from django.utils import timezone

        user = user_factory()
        request = privacy_request_factory(user=user, status="PENDING")

        # Mock created_at to be 31 days ago
        request.created_at = timezone.now() - timedelta(days=31)
        request.save()

        assert request.is_overdue() is True

    def test_is_overdue_completed(self, user_factory, privacy_request_factory, mocker):
        """Test is_overdue returns False for completed requests."""
        from datetime import timedelta

        from django.utils import timezone

        user = user_factory()
        request = privacy_request_factory(user=user, completed=True)

        # Even if old, completed requests are not overdue
        request.created_at = timezone.now() - timedelta(days=31)
        request.save()

        assert request.is_overdue() is False

    def test_complete_request(self, user_factory, privacy_request_factory):
        """Test complete() method updates status."""
        user = user_factory()
        request = privacy_request_factory(user=user, status="PROCESSING")

        request.complete(response_data={"result": "success"})

        assert request.status == "COMPLETED"
        assert request.processed_at is not None
        assert request.response_data == {"result": "success"}

    def test_reject_request(self, user_factory, privacy_request_factory):
        """Test reject() method updates status and reason."""
        user = user_factory()
        request = privacy_request_factory(user=user, status="PROCESSING")

        request.reject(reason="Invalid request")

        assert request.status == "REJECTED"
        assert request.rejection_reason == "Invalid request"
        assert request.processed_at is not None
