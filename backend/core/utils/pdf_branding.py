# backend/core/utils/pdf_branding.py
"""
PDF Branding Service - Provides dynamic branding context for PDF generation.

Uses CompanySettings to provide consistent branding across all PDF documents:
- Invoices
- Receipts
- Contracts
- Quotes
"""

import logging
import os
from dataclasses import dataclass

from reportlab.lib import colors

logger = logging.getLogger(__name__)


@dataclass
class PDFBrandingContext:
    """Immutable branding context for PDF generation."""

    # Company Info
    company_name: str
    company_tagline: str
    email: str
    support_email: str
    phone: str
    phone_secondary: str
    website: str
    full_address: str

    # Colors (as hex strings)
    primary_color: str
    secondary_color: str
    accent_color: str

    # Colors (as reportlab color objects)
    primary_color_rgb: colors.Color
    secondary_color_rgb: colors.Color
    accent_color_rgb: colors.Color

    # Logo paths
    logo_path: str | None
    logo_dark_path: str | None

    # Document text
    pdf_footer_text: str
    invoice_terms: str
    receipt_terms: str

    # Business info
    business_registration_number: str
    vat_number: str

    # Bank details
    bank_name: str
    bank_account_name: str
    bank_account_number: str
    bank_branch: str
    bank_swift_code: str


class PDFBrandingService:
    """
    Service for providing dynamic branding to PDF documents.

    Usage:
        context = PDFBrandingService.get_branding_context()

        # Use in PDF generation:
        colors.HexColor(context.primary_color)
        # or use pre-converted:
        context.primary_color_rgb
    """

    # Default values (fallback if CompanySettings not available)
    DEFAULT_COMPANY_NAME = "LifePlace Retreat & Events Center"
    DEFAULT_PRIMARY_COLOR = "#2c5aa0"
    DEFAULT_SECONDARY_COLOR = "#1a365d"
    DEFAULT_ACCENT_COLOR = "#38a169"
    DEFAULT_EMAIL = os.getenv("DEFAULT_COMPANY_EMAIL", "info@lifeplace.dev")
    DEFAULT_WEBSITE = os.getenv("DEFAULT_COMPANY_WEBSITE", "https://lifeplace.dev")
    DEFAULT_FOOTER = "Thank you for choosing LifePlace Retreat & Events Center!"

    @classmethod
    def get_branding_context(cls) -> PDFBrandingContext:
        """
        Get the current branding context from CompanySettings.

        Falls back to defaults if settings are not available.
        """
        try:
            from core.domains.settings.models import CompanySettings

            settings = CompanySettings.get_settings()

            # Get logo paths safely
            logo_path = None
            logo_dark_path = None
            try:
                if settings.logo:
                    logo_path = settings.logo.path
            except Exception:
                pass
            try:
                if settings.logo_dark:
                    logo_dark_path = settings.logo_dark.path
            except Exception:
                pass

            return PDFBrandingContext(
                # Company info
                company_name=settings.company_name or cls.DEFAULT_COMPANY_NAME,
                company_tagline=settings.company_tagline or "",
                email=settings.email or cls.DEFAULT_EMAIL,
                support_email=settings.support_email or settings.email or cls.DEFAULT_EMAIL,
                phone=settings.phone or "",
                phone_secondary=settings.phone_secondary or "",
                website=settings.website or cls.DEFAULT_WEBSITE,
                full_address=settings.get_full_address(),
                # Colors
                primary_color=settings.primary_color or cls.DEFAULT_PRIMARY_COLOR,
                secondary_color=settings.secondary_color or cls.DEFAULT_SECONDARY_COLOR,
                accent_color=settings.accent_color or cls.DEFAULT_ACCENT_COLOR,
                primary_color_rgb=cls._hex_to_color(settings.primary_color or cls.DEFAULT_PRIMARY_COLOR),
                secondary_color_rgb=cls._hex_to_color(settings.secondary_color or cls.DEFAULT_SECONDARY_COLOR),
                accent_color_rgb=cls._hex_to_color(settings.accent_color or cls.DEFAULT_ACCENT_COLOR),
                # Logos
                logo_path=logo_path,
                logo_dark_path=logo_dark_path,
                # Document text
                pdf_footer_text=settings.pdf_footer_text or cls.DEFAULT_FOOTER,
                invoice_terms=settings.invoice_terms or "",
                receipt_terms=settings.receipt_terms or "",
                # Business info
                business_registration_number=settings.business_registration_number or "",
                vat_number=settings.vat_number or "",
                # Bank details
                bank_name=settings.bank_name or "",
                bank_account_name=settings.bank_account_name or "",
                bank_account_number=settings.bank_account_number or "",
                bank_branch=settings.bank_branch or "",
                bank_swift_code=settings.bank_swift_code or "",
            )

        except Exception as e:
            logger.warning(f"Failed to get CompanySettings for PDF branding: {e}")
            return cls._get_default_context()

    @classmethod
    def _get_default_context(cls) -> PDFBrandingContext:
        """Get default branding context when settings are unavailable."""
        return PDFBrandingContext(
            company_name=cls.DEFAULT_COMPANY_NAME,
            company_tagline="",
            email=cls.DEFAULT_EMAIL,
            support_email=cls.DEFAULT_EMAIL,
            phone="",
            phone_secondary="",
            website=cls.DEFAULT_WEBSITE,
            full_address="Alfonso, Cavite\nPhilippines",
            primary_color=cls.DEFAULT_PRIMARY_COLOR,
            secondary_color=cls.DEFAULT_SECONDARY_COLOR,
            accent_color=cls.DEFAULT_ACCENT_COLOR,
            primary_color_rgb=cls._hex_to_color(cls.DEFAULT_PRIMARY_COLOR),
            secondary_color_rgb=cls._hex_to_color(cls.DEFAULT_SECONDARY_COLOR),
            accent_color_rgb=cls._hex_to_color(cls.DEFAULT_ACCENT_COLOR),
            logo_path=None,
            logo_dark_path=None,
            pdf_footer_text=cls.DEFAULT_FOOTER,
            invoice_terms="",
            receipt_terms="",
            business_registration_number="",
            vat_number="",
            bank_name="",
            bank_account_name="",
            bank_account_number="",
            bank_branch="",
            bank_swift_code="",
        )

    @staticmethod
    def _hex_to_color(hex_color: str) -> colors.Color:
        """Convert hex color string to reportlab Color object."""
        try:
            return colors.HexColor(hex_color)
        except Exception:
            return colors.HexColor("#2c5aa0")  # Fallback to default blue

    @classmethod
    def get_company_header_data(cls) -> dict:
        """
        Get formatted data for company header section in PDFs.

        Returns a dict ready to be used in PDF header rendering.
        """
        ctx = cls.get_branding_context()

        # Build contact line
        contact_parts = []
        if ctx.email:
            contact_parts.append(ctx.email)
        if ctx.phone:
            contact_parts.append(ctx.phone)
        if ctx.website:
            contact_parts.append(ctx.website)

        return {
            "company_name": ctx.company_name,
            "tagline": ctx.company_tagline,
            "contact_line": " | ".join(contact_parts),
            "address": ctx.full_address,
            "logo_path": ctx.logo_path,
            "primary_color": ctx.primary_color_rgb,
            "secondary_color": ctx.secondary_color_rgb,
        }

    @classmethod
    def get_footer_data(cls) -> dict:
        """Get formatted data for PDF footer section."""
        ctx = cls.get_branding_context()
        return {
            "footer_text": ctx.pdf_footer_text,
            "company_name": ctx.company_name,
            "website": ctx.website,
        }

    @classmethod
    def get_bank_details_for_invoice(cls) -> dict:
        """Get bank details formatted for invoice display."""
        ctx = cls.get_branding_context()

        # Only return if bank info is configured
        if not ctx.bank_name or not ctx.bank_account_number:
            return {}

        return {
            "bank_name": ctx.bank_name,
            "account_name": ctx.bank_account_name,
            "account_number": ctx.bank_account_number,
            "branch": ctx.bank_branch,
            "swift_code": ctx.bank_swift_code,
        }
