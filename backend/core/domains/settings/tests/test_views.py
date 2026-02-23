"""
Unit tests for settings domain API views.

Tests:
- CurrencySettingsView (user currency settings)
- SystemCurrencySettingsView (system-wide currency settings)
- supported_currencies_view (supported currencies list)
- currency_format_settings_view (format settings)
- LegalDocumentViewSet (legal document management)
- PublicLegalDocumentView (public legal document access)
- CompanySettingsView (company settings management)
- PublicCompanySettingsView (public company information)
- MobileVersionCheckView (mobile app version checking)
"""

from datetime import date, timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status

import pytest

from core.domains.settings.models import (
    CompanySettings,
    CurrencySettings,
    LegalDocument,
    MobileAppVersion,
)


@pytest.mark.django_db
class TestCurrencySettingsView:
    """Tests for CurrencySettingsView API endpoints."""

    def test_get_currency_settings_authenticated(self, authenticated_client):
        """Test authenticated user can get currency settings."""
        client = authenticated_client()
        url = reverse("settings:currency-settings")

        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "data" in response.data
        assert "default_currency" in response.data["data"]

    def test_get_currency_settings_unauthenticated(self, api_client):
        """Test unauthenticated user cannot get currency settings."""
        url = reverse("settings:currency-settings")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_specific_settings(self, authenticated_client, user_factory):
        """Test get returns user-specific settings if they exist."""
        user = user_factory()
        CurrencySettings.objects.create(user=user, default_currency="EUR", enabled_currencies=["EUR", "USD"])
        client = authenticated_client(user=user)
        url = reverse("settings:currency-settings")

        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["default_currency"] == "EUR"

    def test_put_creates_new_settings(self, authenticated_client, user_factory):
        """Test PUT creates new settings for user who has none."""
        user = user_factory()
        client = authenticated_client(user=user)
        url = reverse("settings:currency-settings")
        data = {
            "default_currency": "USD",
            "enabled_currencies": ["USD", "PHP"],
            "display_format": "code",
        }

        response = client.put(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["success"] is True
        assert response.data["data"]["default_currency"] == "USD"

    def test_put_updates_existing_settings(self, authenticated_client, user_factory):
        """Test PUT updates existing settings."""
        user = user_factory()
        CurrencySettings.objects.create(user=user, default_currency="PHP", enabled_currencies=["PHP"])
        client = authenticated_client(user=user)
        url = reverse("settings:currency-settings")
        data = {
            "default_currency": "EUR",
            "display_format": "both",
        }

        response = client.put(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["default_currency"] == "EUR"

    def test_put_invalid_data(self, authenticated_client, user_factory):
        """Test PUT with invalid data returns 400."""
        user = user_factory()
        client = authenticated_client(user=user)
        url = reverse("settings:currency-settings")
        data = {
            "default_currency": "INVALID_CURRENCY",
        }

        response = client.put(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["success"] is False

    def test_delete_resets_to_defaults(self, authenticated_client, user_factory):
        """Test DELETE resets user settings to defaults."""
        user = user_factory()
        CurrencySettings.objects.create(user=user, default_currency="EUR", enabled_currencies=["EUR"])
        # Ensure system settings exist for fallback (may already exist from signals)
        if not CurrencySettings.objects.filter(user__isnull=True).exists():
            CurrencySettings.objects.create(default_currency="PHP", enabled_currencies=["PHP"])
        client = authenticated_client(user=user)
        url = reverse("settings:currency-settings")

        response = client.delete(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        # User settings should be deleted, falls back to system
        assert not CurrencySettings.objects.filter(user=user).exists()


@pytest.mark.django_db
class TestSystemCurrencySettingsView:
    """Tests for SystemCurrencySettingsView API endpoints."""

    @pytest.fixture
    def financial_admin_client(self, authenticated_client, user_factory):
        """Return an admin client with financial settings permissions."""
        user = user_factory(role="ADMIN", is_staff=True, admin_permissions={"can_manage_financial_settings": True})
        return authenticated_client(user=user)

    def test_get_system_settings_authenticated(self, financial_admin_client):
        """Test admin with financial permissions can get system currency settings."""
        url = reverse("settings:system-currency-settings")

        response = financial_admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "data" in response.data

    def test_get_system_settings_unauthenticated(self, api_client):
        """Test unauthenticated user cannot get system settings."""
        url = reverse("settings:system-currency-settings")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_put_system_settings(self, financial_admin_client):
        """Test PUT updates system currency settings."""
        # Ensure system settings exist (may already exist from signals)
        if not CurrencySettings.objects.filter(user__isnull=True).exists():
            CurrencySettings.objects.create(default_currency="PHP", enabled_currencies=["PHP"])
        url = reverse("settings:system-currency-settings")
        data = {
            "default_currency": "USD",
            "decimal_places": 2,
        }

        response = financial_admin_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["default_currency"] == "USD"

    def test_put_system_settings_invalid_data(self, financial_admin_client):
        """Test PUT with invalid currency returns 400."""
        if not CurrencySettings.objects.filter(user__isnull=True).exists():
            CurrencySettings.objects.create()
        url = reverse("settings:system-currency-settings")
        data = {
            "enabled_currencies": ["INVALID"],
        }

        response = financial_admin_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["success"] is False


@pytest.mark.django_db
class TestSupportedCurrenciesView:
    """Tests for supported_currencies_view."""

    def test_get_supported_currencies(self, authenticated_client):
        """Test getting list of supported currencies."""
        client = authenticated_client()
        url = reverse("settings:supported-currencies")

        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert isinstance(response.data["data"], list)
        assert len(response.data["data"]) == 5

        # Check PHP is in the list
        codes = [c["code"] for c in response.data["data"]]
        assert "PHP" in codes
        assert "USD" in codes

    def test_get_supported_currencies_unauthenticated(self, api_client):
        """Test unauthenticated user cannot get supported currencies."""
        url = reverse("settings:supported-currencies")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestCurrencyFormatSettingsView:
    """Tests for currency_format_settings_view."""

    def test_get_format_settings(self, authenticated_client, user_factory):
        """Test getting currency format settings."""
        user = user_factory()
        CurrencySettings.objects.create(user=user, default_currency="USD", display_format="code", decimal_places=2)
        client = authenticated_client(user=user)
        url = reverse("settings:currency-format-settings")

        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["default_currency"] == "USD"
        assert response.data["data"]["display_format"] == "code"

    def test_get_format_settings_unauthenticated(self, api_client):
        """Test unauthenticated user cannot get format settings."""
        url = reverse("settings:currency-format-settings")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestLegalDocumentViewSet:
    """Tests for LegalDocumentViewSet API endpoints."""

    def test_get_all_legal_documents(self, admin_client):
        """Test getting list of all legal documents."""
        url = reverse("settings:legal-documents-list")

        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert isinstance(response.data["data"], list)
        # Both document types should be auto-created
        assert len(response.data["data"]) == 2

    def test_get_all_legal_documents_unauthenticated(self, api_client):
        """Test unauthenticated user cannot get legal documents."""
        url = reverse("settings:legal-documents-list")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_specific_document_type(self, admin_client):
        """Test getting a specific legal document by type."""
        url = reverse("settings:legal-document-detail", kwargs={"document_type": "TERMS_OF_SERVICE"})

        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["document_type"] == "TERMS_OF_SERVICE"

    def test_get_invalid_document_type(self, admin_client):
        """Test getting invalid document type returns 400."""
        url = reverse("settings:legal-document-detail", kwargs={"document_type": "INVALID_TYPE"})

        response = admin_client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["success"] is False

    def test_put_update_legal_document(self, admin_client):
        """Test updating a legal document."""
        url = reverse("settings:legal-document-detail", kwargs={"document_type": "TERMS_OF_SERVICE"})
        data = {
            "title": "Updated Terms of Service",
            "content": "<p>Updated content</p>",
            "version": "2.0",
            "is_published": True,
        }

        response = admin_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["title"] == "Updated Terms of Service"
        assert response.data["data"]["version"] == "2.0"

    def test_put_requires_document_type(self, admin_client):
        """Test PUT without document_type returns 400."""
        url = reverse("settings:legal-documents-list")
        data = {"title": "Test"}

        response = admin_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Document type is required" in response.data["message"]

    def test_put_invalid_document_type(self, admin_client):
        """Test PUT with invalid document_type returns 400."""
        url = reverse("settings:legal-document-detail", kwargs={"document_type": "INVALID"})
        data = {"title": "Test"}

        response = admin_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid document type" in response.data["message"]

    def test_put_invalid_data(self, admin_client):
        """Test PUT with invalid data returns 400."""
        url = reverse("settings:legal-document-detail", kwargs={"document_type": "TERMS_OF_SERVICE"})
        data = {
            "version": "",  # Invalid - version cannot be empty
        }

        response = admin_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPublicLegalDocumentView:
    """Tests for PublicLegalDocumentView API endpoints."""

    def test_get_published_document(self, api_client):
        """Test getting a published legal document (public endpoint)."""
        LegalDocument.objects.create(
            document_type="TERMS_OF_SERVICE",
            title="Terms of Service",
            content="<p>Terms content</p>",
            is_published=True,
        )
        url = reverse("settings:public-legal-document", kwargs={"document_type": "TERMS_OF_SERVICE"})

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["document_type"] == "TERMS_OF_SERVICE"

    def test_get_unpublished_document_returns_404(self, api_client):
        """Test getting unpublished document returns 404."""
        LegalDocument.objects.create(document_type="PRIVACY_POLICY", title="Privacy Policy", is_published=False)
        url = reverse("settings:public-legal-document", kwargs={"document_type": "PRIVACY_POLICY"})

        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data["success"] is False
        assert "not published" in response.data["message"]

    def test_get_nonexistent_document_returns_404(self, api_client):
        """Test getting nonexistent document returns 404."""
        url = reverse("settings:public-legal-document", kwargs={"document_type": "TERMS_OF_SERVICE"})

        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data["success"] is False
        assert "not found" in response.data["message"]


@pytest.mark.django_db
class TestCompanySettingsView:
    """Tests for CompanySettingsView API endpoints."""

    @pytest.fixture
    def company_admin_client(self, authenticated_client, user_factory):
        """Return an admin client with company settings permissions."""
        user = user_factory(role="ADMIN", is_staff=True, admin_permissions={"can_manage_company_settings": True})
        return authenticated_client(user=user)

    def test_get_company_settings(self, company_admin_client):
        """Test getting company settings."""
        url = reverse("settings:company-settings")

        response = company_admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "company_name" in response.data["data"]

    def test_get_company_settings_unauthenticated(self, api_client):
        """Test unauthenticated user cannot get company settings."""
        url = reverse("settings:company-settings")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_put_update_company_settings(self, company_admin_client):
        """Test updating company settings."""
        # Ensure settings exist
        CompanySettings.get_settings()
        url = reverse("settings:company-settings")
        data = {
            "company_name": "Updated Company Name",
            "email": "updated@example.com",
            "primary_color": "#ff0000",
        }

        response = company_admin_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["company_name"] == "Updated Company Name"

    def test_put_partial_update(self, company_admin_client):
        """Test partial update of company settings."""
        CompanySettings.get_settings()
        url = reverse("settings:company-settings")
        data = {
            "phone": "+1234567890",
        }

        response = company_admin_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["phone"] == "+1234567890"

    def test_put_invalid_data(self, company_admin_client):
        """Test PUT with invalid data returns 400."""
        CompanySettings.get_settings()
        url = reverse("settings:company-settings")
        data = {
            "email": "not-an-email",  # Invalid email format
        }

        response = company_admin_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["success"] is False


@pytest.mark.django_db
class TestPublicCompanySettingsView:
    """Tests for PublicCompanySettingsView API endpoints."""

    def test_get_public_company_settings(self, api_client):
        """Test getting public company settings (no auth required)."""
        # Use get_or_create with pk=1 to match the singleton pattern used by the view.
        # CompanySettings.get_settings() always fetches pk=1, so we must ensure
        # pk=1 has our test data (not a default-values record).
        settings = CompanySettings.get_settings()
        settings.company_name = "Test Company"
        settings.email = "public@example.com"
        settings.save()
        url = reverse("settings:public-company-settings")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["company_name"] == "Test Company"
        # Should not include sensitive data like bank details
        assert "bank_account_number" not in response.data["data"]

    def test_public_settings_excludes_sensitive_fields(self, api_client):
        """Test public settings don't include sensitive fields."""
        settings = CompanySettings.get_settings()
        settings.company_name = "Test Company"
        settings.bank_name = "Secret Bank"
        settings.bank_account_number = "1234567890"
        settings.save()
        url = reverse("settings:public-company-settings")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "bank_name" not in response.data["data"]
        assert "bank_account_number" not in response.data["data"]


@pytest.mark.django_db
class TestMobileVersionCheckView:
    """Tests for MobileVersionCheckView API endpoints."""

    def test_version_check_no_config(self, api_client):
        """Test version check when no config exists."""
        response = api_client.get("/api/mobile/version/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "ok"
        assert response.data["update_required"] is False
        assert response.data["force_update"] is False

    def test_version_check_current_version_ok(self, api_client):
        """Test version check when current version is acceptable."""
        MobileAppVersion.objects.create(
            platform="ios",
            minimum_required_version="1.0.0",
            recommended_version="1.2.0",
            latest_version="1.3.0",
            is_active=True,
        )

        response = api_client.get("/api/mobile/version/", {"platform": "ios", "current_version": "1.1.0"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "ok"
        assert response.data["update_required"] is False
        assert response.data["update_recommended"] is True

    def test_version_check_update_required(self, api_client):
        """Test version check when update is required."""
        MobileAppVersion.objects.create(
            platform="ios",
            minimum_required_version="2.0.0",
            recommended_version="2.1.0",
            latest_version="2.2.0",
            is_active=True,
        )

        response = api_client.get("/api/mobile/version/", {"platform": "ios", "current_version": "1.0.0"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "update_required"
        assert response.data["update_required"] is True
        assert response.data["force_update"] is True

    def test_version_check_maintenance_mode(self, api_client):
        """Test version check during maintenance mode."""
        maintenance_end = timezone.now() + timedelta(hours=2)
        MobileAppVersion.objects.create(
            platform="all",
            minimum_required_version="1.0.0",
            recommended_version="1.0.0",
            latest_version="1.0.0",
            is_active=True,
            is_maintenance_mode=True,
            maintenance_message="Scheduled maintenance",
            maintenance_end=maintenance_end,
        )

        response = api_client.get("/api/mobile/version/", {"platform": "ios", "current_version": "1.0.0"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "maintenance"
        assert response.data["maintenance"]["is_maintenance"] is True
        assert response.data["maintenance"]["message"] == "Scheduled maintenance"

    def test_version_check_deprecated(self, api_client):
        """Test version check when version is deprecated."""
        MobileAppVersion.objects.create(
            platform="ios",
            minimum_required_version="1.0.0",
            recommended_version="2.0.0",
            latest_version="2.0.0",
            is_active=True,
            deprecation_date=date.today() - timedelta(days=1),  # Already deprecated
            deprecation_message="This version is deprecated",
        )

        response = api_client.get("/api/mobile/version/", {"platform": "ios", "current_version": "1.0.0"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "deprecated"
        assert response.data["deprecation"]["is_deprecated"] is True

    def test_version_check_invalid_version_format(self, api_client):
        """Test version check with invalid version format."""
        MobileAppVersion.objects.create(
            platform="ios",
            minimum_required_version="1.0.0",
            recommended_version="1.0.0",
            latest_version="1.0.0",
            is_active=True,
        )

        response = api_client.get("/api/mobile/version/", {"platform": "ios", "current_version": "invalid"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["status"] == "error"
        assert "Invalid version format" in response.data["message"]

    def test_version_check_platform_all(self, api_client):
        """Test version check with 'all' platform config."""
        MobileAppVersion.objects.create(
            platform="all",
            minimum_required_version="1.0.0",
            recommended_version="1.5.0",
            latest_version="2.0.0",
            is_active=True,
        )

        response = api_client.get("/api/mobile/version/", {"platform": "android", "current_version": "1.2.0"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "ok"
        assert response.data["update_recommended"] is True

    def test_version_check_feature_flags(self, api_client):
        """Test version check returns feature flags."""
        MobileAppVersion.objects.create(
            platform="ios",
            minimum_required_version="1.0.0",
            recommended_version="1.0.0",
            latest_version="1.0.0",
            is_active=True,
            feature_flags={"dark_mode": True, "beta_features": False},
        )

        response = api_client.get("/api/mobile/version/", {"platform": "ios", "current_version": "1.0.0"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["feature_flags"]["dark_mode"] is True
        assert response.data["feature_flags"]["beta_features"] is False

    def test_version_check_store_urls(self, api_client):
        """Test version check returns store URLs."""
        MobileAppVersion.objects.create(
            platform="ios",
            minimum_required_version="2.0.0",
            recommended_version="2.0.0",
            latest_version="2.0.0",
            is_active=True,
            ios_store_url="https://apps.apple.com/app/test",
            android_store_url="https://play.google.com/store/apps/test",
        )

        response = api_client.get("/api/mobile/version/", {"platform": "ios", "current_version": "1.0.0"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["update_urls"]["ios"] == "https://apps.apple.com/app/test"
        assert response.data["update_urls"]["android"] == "https://play.google.com/store/apps/test"

    def test_version_check_defaults_to_ios(self, api_client):
        """Test version check defaults to iOS platform."""
        MobileAppVersion.objects.create(
            platform="ios",
            minimum_required_version="1.0.0",
            recommended_version="1.0.0",
            latest_version="1.0.0",
            is_active=True,
        )

        # No platform specified
        response = api_client.get("/api/mobile/version/", {"current_version": "1.0.0"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["platform"] == "ios"


@pytest.mark.django_db
class TestViewErrorHandling:
    """Tests for error handling in views."""

    def test_currency_settings_get_handles_exception(self, authenticated_client, mocker):
        """Test CurrencySettingsView GET handles exceptions gracefully."""
        mocker.patch(
            "core.domains.settings.services.CurrencySettingsService.get_user_settings",
            side_effect=Exception("Database error"),
        )
        client = authenticated_client()
        url = reverse("settings:currency-settings")

        response = client.get(url)

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.data["success"] is False

    def test_currency_settings_delete_handles_exception(self, authenticated_client, mocker):
        """Test CurrencySettingsView DELETE handles exceptions gracefully."""
        mocker.patch(
            "core.domains.settings.services.CurrencySettingsService.reset_to_defaults",
            side_effect=Exception("Database error"),
        )
        client = authenticated_client()
        url = reverse("settings:currency-settings")

        response = client.delete(url)

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.data["success"] is False

    def test_system_currency_settings_get_handles_exception(self, authenticated_client, user_factory, mocker):
        """Test SystemCurrencySettingsView GET handles exceptions gracefully."""
        mocker.patch(
            "core.domains.settings.services.CurrencySettingsService.get_system_settings",
            side_effect=Exception("Database error"),
        )
        user = user_factory(role="ADMIN", is_staff=True, admin_permissions={"can_manage_financial_settings": True})
        client = authenticated_client(user=user)
        url = reverse("settings:system-currency-settings")

        response = client.get(url)

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.data["success"] is False

    def test_supported_currencies_handles_exception(self, authenticated_client, mocker):
        """Test supported_currencies_view handles exceptions gracefully."""
        mocker.patch(
            "core.domains.settings.services.CurrencySettingsService.get_supported_currencies",
            side_effect=Exception("Service error"),
        )
        client = authenticated_client()
        url = reverse("settings:supported-currencies")

        response = client.get(url)

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.data["success"] is False

    def test_currency_format_settings_handles_exception(self, authenticated_client, mocker):
        """Test currency_format_settings_view handles exceptions gracefully."""
        mocker.patch(
            "core.domains.settings.services.CurrencySettingsService.get_currency_format_settings",
            side_effect=Exception("Service error"),
        )
        client = authenticated_client()
        url = reverse("settings:currency-format-settings")

        response = client.get(url)

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.data["success"] is False

    def test_legal_document_get_handles_exception(self, admin_client, mocker):
        """Test LegalDocumentViewSet GET handles exceptions gracefully."""
        mocker.patch.object(LegalDocument, "get_terms_of_service", side_effect=Exception("Database error"))
        url = reverse("settings:legal-documents-list")

        response = admin_client.get(url)

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.data["success"] is False

    def test_company_settings_get_handles_exception(self, authenticated_client, user_factory, mocker):
        """Test CompanySettingsView GET handles exceptions gracefully."""
        mocker.patch.object(CompanySettings, "get_settings", side_effect=Exception("Database error"))
        user = user_factory(role="ADMIN", is_staff=True, admin_permissions={"can_manage_company_settings": True})
        client = authenticated_client(user=user)
        url = reverse("settings:company-settings")

        response = client.get(url)

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.data["success"] is False

    def test_public_company_settings_handles_exception(self, api_client, mocker):
        """Test PublicCompanySettingsView handles exceptions gracefully."""
        mocker.patch.object(CompanySettings, "get_settings", side_effect=Exception("Database error"))
        url = reverse("settings:public-company-settings")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.data["success"] is False

    def test_public_legal_document_handles_exception(self, api_client, mocker):
        """Test PublicLegalDocumentView handles exceptions gracefully."""
        mocker.patch.object(LegalDocument.objects, "get", side_effect=Exception("Database error"))
        url = reverse("settings:public-legal-document", kwargs={"document_type": "TERMS_OF_SERVICE"})

        response = api_client.get(url)

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.data["success"] is False
