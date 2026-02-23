# backend/core/domains/settings/urls.py

from django.urls import path

from .views import (
    CompanySettingsView,
    CurrencySettingsView,
    LegalDocumentViewSet,
    PublicCompanySettingsView,
    PublicLegalDocumentView,
    SystemCurrencySettingsView,
    currency_format_settings_view,
    supported_currencies_view,
)

app_name = "settings"

urlpatterns = [
    # Currency settings
    path("currency/", CurrencySettingsView.as_view(), name="currency-settings"),
    path("currency/system/", SystemCurrencySettingsView.as_view(), name="system-currency-settings"),
    path("currency/supported/", supported_currencies_view, name="supported-currencies"),
    path("currency/format/", currency_format_settings_view, name="currency-format-settings"),
    # Legal documents (admin)
    path("legal/", LegalDocumentViewSet.as_view(), name="legal-documents-list"),
    path("legal/<str:document_type>/", LegalDocumentViewSet.as_view(), name="legal-document-detail"),
    # Public legal documents
    path("public/legal/<str:document_type>/", PublicLegalDocumentView.as_view(), name="public-legal-document"),
    # Company settings (admin)
    path("company/", CompanySettingsView.as_view(), name="company-settings"),
    # Public company settings (client-facing)
    path("public/company/", PublicCompanySettingsView.as_view(), name="public-company-settings"),
]
