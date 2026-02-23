# backend/core/utils/url_builder.py
"""
Centralized URL builder for client portal links.
Ensures all template variables use correct, verified frontend routes.

This module provides a single source of truth for all client-facing URLs
used in email templates, contracts, and other communications.
"""

from django.conf import settings


class ClientPortalURLBuilder:
    """
    Builds URLs for the client portal frontend.

    All URL patterns are verified against the actual frontend routes
    defined in frontend/client-portal/src/App.tsx.
    """

    # EventDetail.tsx tab indices (verified from frontend code)
    # These correspond to the tab order in EventDetail component
    TAB_TIMELINE = 0
    TAB_QUESTIONNAIRES = 1
    TAB_CONTRACTS = 2
    TAB_DOCUMENTS = 3
    TAB_TASKS = 4
    TAB_FEEDBACK = 5
    TAB_QUOTES = 6
    TAB_INVOICES = 7
    TAB_CHECKIN = 8
    TAB_NOTES = 9

    @classmethod
    def get_base_url(cls) -> str:
        """Get the base URL for the client portal."""
        return getattr(settings, "CLIENT_FRONTEND_URL", "https://lifeplace.dev")

    # ==================== Navigation URLs ====================

    @classmethod
    def dashboard_url(cls) -> str:
        """Client dashboard page. Route: /dashboard"""
        return f"{cls.get_base_url()}/dashboard"

    @classmethod
    def login_url(cls) -> str:
        """Login page. Route: /login"""
        return f"{cls.get_base_url()}/login"

    @classmethod
    def register_url(cls) -> str:
        """Registration page. Route: /register"""
        return f"{cls.get_base_url()}/register"

    @classmethod
    def support_url(cls) -> str:
        """Support/help page. Route: /support"""
        return f"{cls.get_base_url()}/support"

    @classmethod
    def payments_url(cls) -> str:
        """Financial portal (invoices and payments). Route: /payments"""
        return f"{cls.get_base_url()}/payments"

    @classmethod
    def documents_url(cls) -> str:
        """Documents page. Route: /documents"""
        return f"{cls.get_base_url()}/documents"

    @classmethod
    def profile_url(cls) -> str:
        """User profile/settings page. Route: /profile"""
        return f"{cls.get_base_url()}/profile"

    @classmethod
    def events_url(cls) -> str:
        """Events list page. Route: /events"""
        return f"{cls.get_base_url()}/events"

    @classmethod
    def actions_url(cls) -> str:
        """Action center (messages). Route: /actions"""
        return f"{cls.get_base_url()}/actions"

    # ==================== Legal Pages ====================

    @classmethod
    def terms_of_service_url(cls) -> str:
        """Terms of Service page. Route: /terms"""
        return f"{cls.get_base_url()}/terms"

    @classmethod
    def privacy_policy_url(cls) -> str:
        """Privacy Policy page. Route: /privacy"""
        return f"{cls.get_base_url()}/privacy"

    # ==================== Event URLs with Deep Linking ====================

    @classmethod
    def event_url(cls, event_id: int, tab: int = None) -> str:
        """
        Event detail page with optional tab parameter.
        Route: /events/:id or /events/:id?tab=N

        Args:
            event_id: The event ID
            tab: Optional tab index (0-9) for deep linking
        """
        base = f"{cls.get_base_url()}/events/{event_id}"
        if tab is not None:
            return f"{base}?tab={tab}"
        return base

    @classmethod
    def event_timeline_url(cls, event_id: int) -> str:
        """Event timeline tab. Route: /events/:id?tab=0"""
        return cls.event_url(event_id, cls.TAB_TIMELINE)

    @classmethod
    def event_questionnaires_url(cls, event_id: int) -> str:
        """Event questionnaires tab. Route: /events/:id?tab=1"""
        return cls.event_url(event_id, cls.TAB_QUESTIONNAIRES)

    @classmethod
    def event_contracts_url(cls, event_id: int) -> str:
        """Event contracts tab. Route: /events/:id?tab=2"""
        return cls.event_url(event_id, cls.TAB_CONTRACTS)

    @classmethod
    def event_documents_url(cls, event_id: int) -> str:
        """Event documents tab. Route: /events/:id?tab=3"""
        return cls.event_url(event_id, cls.TAB_DOCUMENTS)

    @classmethod
    def event_tasks_url(cls, event_id: int) -> str:
        """Event tasks tab. Route: /events/:id?tab=4"""
        return cls.event_url(event_id, cls.TAB_TASKS)

    @classmethod
    def event_feedback_url(cls, event_id: int) -> str:
        """Event feedback tab. Route: /events/:id?tab=5"""
        return cls.event_url(event_id, cls.TAB_FEEDBACK)

    @classmethod
    def event_quotes_url(cls, event_id: int) -> str:
        """Event quotes tab. Route: /events/:id?tab=6"""
        return cls.event_url(event_id, cls.TAB_QUOTES)

    @classmethod
    def event_invoices_url(cls, event_id: int) -> str:
        """Event invoices tab. Route: /events/:id?tab=7"""
        return cls.event_url(event_id, cls.TAB_INVOICES)

    @classmethod
    def event_checkin_url(cls, event_id: int) -> str:
        """Event check-in tab. Route: /events/:id?tab=8"""
        return cls.event_url(event_id, cls.TAB_CHECKIN)

    @classmethod
    def event_notes_url(cls, event_id: int) -> str:
        """Event notes tab. Route: /events/:id?tab=9"""
        return cls.event_url(event_id, cls.TAB_NOTES)

    # ==================== Entity-Specific URLs ====================

    @classmethod
    def contract_url(cls, contract_id: int) -> str:
        """
        Contract detail page.
        Route: /contracts/:id

        Note: The frontend route is /contracts/:id (not /contracts/:id/sign).
        Signing is handled within the contract detail page via a dialog.
        """
        return f"{cls.get_base_url()}/contracts/{contract_id}"

    # ==================== API/Download URLs ====================

    @classmethod
    def contract_pdf_url(cls, contract_id: int) -> str:
        """Contract PDF download API endpoint."""
        return f"{cls.get_base_url()}/api/contracts/client/contracts/{contract_id}/download/"

    @classmethod
    def invoice_pdf_url(cls, invoice_id: int) -> str:
        """Invoice PDF download API endpoint."""
        return f"{cls.get_base_url()}/api/payments/client/invoices/{invoice_id}/download_pdf/"

    @classmethod
    def payment_receipt_pdf_url(cls, payment_id: int) -> str:
        """Payment receipt PDF download API endpoint."""
        return f"{cls.get_base_url()}/api/payments/client/payments/{payment_id}/download_receipt/"

    # ==================== Authentication URLs ====================

    @classmethod
    def password_reset_url(cls, token: str) -> str:
        """Password reset page with token. Route: /reset-password/:tokenId"""
        return f"{cls.get_base_url()}/reset-password/{token}"

    @classmethod
    def forgot_password_url(cls) -> str:
        """Forgot password page. Route: /forgot-password"""
        return f"{cls.get_base_url()}/forgot-password"

    @classmethod
    def accept_invitation_url(cls, invitation_id) -> str:
        """Client invitation acceptance page. Route: /accept-invitation/:invitationId"""
        return f"{cls.get_base_url()}/accept-invitation/{invitation_id}"

    # ==================== Public/Booking URLs ====================

    @classmethod
    def booking_url(cls) -> str:
        """Booking flow entry page. Route: /booking"""
        return f"{cls.get_base_url()}/booking"

    @classmethod
    def booking_complete_url(cls) -> str:
        """Booking completion page. Route: /booking/complete"""
        return f"{cls.get_base_url()}/booking/complete"

    @classmethod
    def contact_url(cls) -> str:
        """Contact page. Route: /contact"""
        return f"{cls.get_base_url()}/contact"
