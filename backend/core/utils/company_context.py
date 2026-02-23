# backend/core/utils/company_context.py
"""
Mixin for extracting CompanySettings into template context.
Used by both CommunicationContextService and ContractContextService.

This module provides a unified way to include company information
in email templates, contracts, and other communications.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)


class CompanyContextMixin:
    """
    Provides company settings context for templates.

    This mixin extracts all relevant fields from the CompanySettings model
    and provides them as template variables with the 'company_' prefix.
    """

    @staticmethod
    def get_company_context() -> dict[str, Any]:
        """
        Extract all company settings into template variables.

        Returns empty strings for missing optional fields to ensure
        templates render cleanly even when some data is not configured.

        Returns:
            Dictionary with all company-related template variables
        """
        from core.domains.settings.models import CompanySettings

        try:
            company = CompanySettings.get_settings()
        except Exception as e:
            logger.warning(f"Could not load CompanySettings: {e}")
            return CompanyContextMixin._get_default_company_context()

        return {
            # ==================== Basic Company Info ====================
            "company_name": company.company_name or "",
            "company_tagline": company.company_tagline or "",
            # ==================== Contact Information ====================
            "company_email": company.email or "",
            "company_phone": company.phone or "",
            "company_phone_secondary": company.phone_secondary or "",
            "company_support_email": company.support_email or "",
            "company_support_phone": company.support_phone or "",
            # ==================== Address ====================
            "company_address": company.get_full_address() or "",
            "company_address_line1": company.address_line1 or "",
            "company_address_line2": company.address_line2 or "",
            "company_city": company.city or "",
            "company_province": company.province or "",
            "company_postal_code": company.postal_code or "",
            "company_country": company.country or "",
            # ==================== Online Presence ====================
            "company_website": company.website or "",
            "company_facebook": company.facebook_url or "",
            "company_instagram": company.instagram_url or "",
            # ==================== Bank Details ====================
            "bank_name": company.bank_name or "",
            "bank_account_name": company.bank_account_name or "",
            "bank_account_number": company.bank_account_number or "",
            "bank_branch": company.bank_branch or "",
            "bank_swift_code": company.bank_swift_code or "",
            # ==================== Business Registration ====================
            "business_registration_number": company.business_registration_number or "",
            "vat_number": company.vat_number or "",
            # ==================== Document Terms ====================
            "invoice_terms": company.invoice_terms or "",
            "receipt_terms": company.receipt_terms or "",
            "pdf_footer_text": company.pdf_footer_text or "",
            # ==================== Branding ====================
            "company_logo_url": company.get_logo_url() or "",
            "primary_color": company.primary_color or "#2c5aa0",
            "secondary_color": company.secondary_color or "#1a365d",
            "accent_color": getattr(company, "accent_color", "") or "#38a169",
        }

    @staticmethod
    def _get_default_company_context() -> dict[str, Any]:
        """
        Fallback context when CompanySettings is unavailable.

        Returns sensible defaults based on the CompanySettings model defaults.
        """
        return {
            # Basic company info
            "company_name": "LifePlace Retreat & Events Center",
            "company_tagline": "",
            # Contact
            "company_email": "info@lifeplace.dev",
            "company_phone": "",
            "company_phone_secondary": "",
            "company_support_email": "support@lifeplace.dev",
            "company_support_phone": "",
            # Address
            "company_address": "",
            "company_address_line1": "",
            "company_address_line2": "",
            "company_city": "Alfonso",
            "company_province": "Cavite",
            "company_postal_code": "",
            "company_country": "Philippines",
            # Online presence
            "company_website": "https://lifeplace.dev",
            "company_facebook": "",
            "company_instagram": "",
            # Bank details
            "bank_name": "",
            "bank_account_name": "",
            "bank_account_number": "",
            "bank_branch": "",
            "bank_swift_code": "",
            # Business registration
            "business_registration_number": "",
            "vat_number": "",
            # Document terms
            "invoice_terms": "",
            "receipt_terms": "",
            "pdf_footer_text": "Thank you for choosing LifePlace Retreat & Events Center!",
            # Branding
            "company_logo_url": "",
            "primary_color": "#2c5aa0",
            "secondary_color": "#1a365d",
            "accent_color": "#38a169",
        }

    @staticmethod
    def get_company_variable_definitions() -> dict[str, dict[str, Any]]:
        """
        Get variable definitions for the company group.

        Used by variable_schemas endpoints to document available variables.

        Returns:
            Dictionary mapping variable names to their metadata
        """
        return {
            "company_name": {"description": "Official company name", "required": True},
            "company_tagline": {"description": "Company tagline/slogan", "required": False},
            "company_email": {"description": "Primary company email", "required": True},
            "company_phone": {"description": "Primary phone number", "required": False},
            "company_phone_secondary": {"description": "Secondary phone number", "required": False},
            "company_support_email": {"description": "Support email address", "required": True},
            "company_support_phone": {"description": "Support phone number", "required": False},
            "company_address": {"description": "Full formatted company address", "required": False},
            "company_address_line1": {"description": "Street address line 1", "required": False},
            "company_address_line2": {"description": "Street address line 2", "required": False},
            "company_city": {"description": "City", "required": False},
            "company_province": {"description": "Province/State", "required": False},
            "company_postal_code": {"description": "Postal/ZIP code", "required": False},
            "company_country": {"description": "Country", "required": False},
            "company_website": {"description": "Company website URL", "required": True},
            "company_facebook": {"description": "Facebook page URL", "required": False},
            "company_instagram": {"description": "Instagram profile URL", "required": False},
            "bank_name": {"description": "Bank name for payments", "required": False},
            "bank_account_name": {"description": "Bank account holder name", "required": False},
            "bank_account_number": {"description": "Bank account number", "required": False},
            "bank_branch": {"description": "Bank branch name", "required": False},
            "bank_swift_code": {"description": "SWIFT/BIC code for international transfers", "required": False},
            "business_registration_number": {"description": "Business registration/TIN number", "required": False},
            "vat_number": {"description": "VAT registration number", "required": False},
            "invoice_terms": {"description": "Default invoice payment terms", "required": False},
            "receipt_terms": {"description": "Terms printed on receipts", "required": False},
            "pdf_footer_text": {"description": "Footer text for PDF documents", "required": False},
            "company_logo_url": {"description": "Company logo image URL", "required": False},
            "primary_color": {"description": "Primary brand color (hex)", "required": False},
            "secondary_color": {"description": "Secondary brand color (hex)", "required": False},
            "accent_color": {"description": "Accent color for highlights (hex)", "required": False},
        }
