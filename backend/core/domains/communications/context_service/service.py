# backend/core/domains/communications/context_service/service.py
"""
CommunicationContextService — generates standardized context data
for communication templates.
"""
import logging
from typing import Any

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

from . import context_providers
from .constants import (
    PHILIPPINES_TZ_DISPLAY,
    REQUIRED_OBJECTS,
    VARIABLE_GROUPS,
    ContextType,
)

logger = logging.getLogger(__name__)


class CommunicationContextService:
    """
    Service for generating standardized context data for communication templates.
    Supports multiple context types with validation of required objects.
    """

    @staticmethod
    def get_required_objects(context_type: str) -> list[str]:
        """Get list of required objects for a context type."""
        return REQUIRED_OBJECTS.get(context_type, [])

    @staticmethod
    def get_variable_groups() -> dict[str, Any]:
        """Get all variable groups with metadata."""
        return VARIABLE_GROUPS

    @staticmethod
    def get_variables_for_context_type(context_type: str) -> dict[str, dict[str, Any]]:
        """Get all variables available for a specific context type."""
        available_vars = {}
        for group_key, group_data in VARIABLE_GROUPS.items():
            if context_type in group_data.get("available_in", []):
                for var_name, var_meta in group_data["variables"].items():
                    available_vars[var_name] = {
                        **var_meta,
                        "group": group_key,
                        "group_label": group_data["label"],
                    }
        return available_vars

    @classmethod
    def validate_required_objects(
        cls,
        context_type: str,
        client=None,
        event=None,
        booking_session=None,
        quote=None,
        contract=None,
        user=None,
        admin_invitation=None,
        notification=None,
        payment=None,
        invoice=None,
    ) -> None:
        """
        Validate that required objects are provided for the context type.
        Raises ValidationError if any required objects are missing.
        """
        required = cls.get_required_objects(context_type)
        provided = {
            "client": client,
            "event": event,
            "booking_session": booking_session,
            "quote": quote,
            "contract": contract,
            "user": user,
            "admin_invitation": admin_invitation,
            "notification": notification,
            "payment": payment,
            "invoice": invoice,
        }

        missing = [obj for obj in required if not provided.get(obj)]

        if missing:
            raise ValidationError(f"Context type '{context_type}' requires the following objects: {', '.join(missing)}")

    @classmethod
    def generate_context(
        cls,
        context_type: str,
        client=None,
        event=None,
        booking_session=None,
        quote=None,
        contract=None,
        user=None,
        admin_invitation=None,
        notification=None,
        payment=None,
        invoice=None,
        validate: bool = True,
    ) -> dict[str, Any]:
        """
        Generate context data for a communication template.

        Args:
            context_type: The type of context (CLIENT, EVENT, BOOKING, etc.)
            client: User instance for client context
            event: Event instance for event context
            booking_session: BookingSession instance for booking context
            quote: Quote instance for quote context
            contract: Contract instance for contract context
            user: User instance for admin/notification context
            admin_invitation: AdminInvitation instance for admin context
            notification: Notification instance for notification context
            payment: Payment instance for payment context
            invoice: Invoice instance for invoice context
            validate: Whether to validate required objects (default True)

        Returns:
            Dictionary with all available context variables
        """
        if validate:
            cls.validate_required_objects(
                context_type=context_type,
                client=client,
                event=event,
                booking_session=booking_session,
                quote=quote,
                contract=contract,
                user=user,
                admin_invitation=admin_invitation,
                notification=notification,
                payment=payment,
                invoice=invoice,
            )

        context = {}

        # Always include system context
        context.update(cls._get_system_context())

        # Build context based on provided objects
        if client:
            context.update(cls._get_client_context(client))

        if event:
            context.update(cls._get_event_context(event))
            context.update(cls._get_event_url_context(event))

        if booking_session and event:
            context.update(cls._get_booking_context(booking_session, event))

        if quote:
            context.update(context_providers.get_quote_context(quote))

        if contract:
            context.update(context_providers.get_contract_context(contract))

        if user and admin_invitation:
            context.update(context_providers.get_admin_invitation_context(admin_invitation, user))

        if user and notification:
            context.update(context_providers.get_notification_context(notification, user))

        # Add financial context if event has pricing data
        if event and context_type in [
            ContextType.BOOKING,
            ContextType.QUOTE,
            ContextType.CONTRACT,
            ContextType.PAYMENT,
            ContextType.INVOICE,
        ]:
            context.update(context_providers.get_financial_context(event, quote))

        # Add payment context
        if payment:
            context.update(context_providers.get_payment_context(payment))
            context.update(context_providers.get_payment_plan_context(payment))

        # Add invoice context
        if invoice:
            context.update(context_providers.get_invoice_context(invoice))

        logger.info(f"Generated {context_type} context with {len(context)} variables")
        return context

    @staticmethod
    def _get_system_context() -> dict[str, Any]:
        """Get system-level context variables including company info and URLs."""
        from core.utils.company_context import CompanyContextMixin
        from core.utils.url_builder import ClientPortalURLBuilder

        now = timezone.now()

        # Start with base system variables
        context = {
            "site_name": getattr(settings, "SITE_NAME", "LifePlace"),
            "current_date": now.strftime("%B %d, %Y"),
            "current_year": now.year,
            "support_email": getattr(settings, "SUPPORT_EMAIL", "support@lifeplace.com"),
        }

        # Add all URL variables using the centralized URL builder
        context.update(
            {
                "dashboard_url": ClientPortalURLBuilder.dashboard_url(),
                "login_link": ClientPortalURLBuilder.login_url(),
                "support_link": ClientPortalURLBuilder.support_url(),
                "payments_link": ClientPortalURLBuilder.payments_url(),
                "documents_link": ClientPortalURLBuilder.documents_url(),
                "profile_link": ClientPortalURLBuilder.profile_url(),
                "terms_of_service_link": ClientPortalURLBuilder.terms_of_service_url(),
                "privacy_policy_link": ClientPortalURLBuilder.privacy_policy_url(),
                "booking_link": ClientPortalURLBuilder.booking_url(),
                "contact_link": ClientPortalURLBuilder.contact_url(),
            }
        )

        # Add company context from CompanySettings
        context.update(CompanyContextMixin.get_company_context())

        return context

    @staticmethod
    def _get_event_url_context(event) -> dict[str, Any]:
        """Get event-specific URL context with deep linking to tabs."""
        from core.utils.url_builder import ClientPortalURLBuilder

        return {
            "event_link": ClientPortalURLBuilder.event_url(event.id),
            "event_timeline_link": ClientPortalURLBuilder.event_timeline_url(event.id),
            "event_questionnaires_link": ClientPortalURLBuilder.event_questionnaires_url(event.id),
            "event_contracts_link": ClientPortalURLBuilder.event_contracts_url(event.id),
            "event_documents_link": ClientPortalURLBuilder.event_documents_url(event.id),
            "event_tasks_link": ClientPortalURLBuilder.event_tasks_url(event.id),
            "event_feedback_link": ClientPortalURLBuilder.event_feedback_url(event.id),
            "event_quotes_link": ClientPortalURLBuilder.event_quotes_url(event.id),
            "event_invoices_link": ClientPortalURLBuilder.event_invoices_url(event.id),
        }

    @staticmethod
    def _get_client_context(client) -> dict[str, Any]:
        """Get client-related context variables."""
        # Get profile data if available
        profile = getattr(client, "profile", None)
        phone = getattr(profile, "phone", "") if profile else ""
        company = getattr(profile, "company", "") if profile else ""

        # Build address from profile
        address = ""
        if profile:
            address_parts = []
            if getattr(profile, "address", None):
                address_parts.append(profile.address)
            if getattr(profile, "city", None):
                address_parts.append(profile.city)
            if getattr(profile, "state", None):
                address_parts.append(profile.state)
            if getattr(profile, "zip_code", None):
                address_parts.append(profile.zip_code)
            address = ", ".join(address_parts)

        # Build full name
        if client.first_name and client.last_name:
            full_name = f"{client.first_name} {client.last_name}"
        elif client.first_name:
            full_name = client.first_name
        elif client.last_name:
            full_name = client.last_name
        else:
            full_name = client.email or "Valued Client"

        return {
            "client_name": full_name,
            "client_first_name": client.first_name or "",
            "client_last_name": client.last_name or "",
            "client_email": client.email or "",
            "client_phone": phone,
            "client_company": company,
            "client_address": address,
            # Aliases for backwards compatibility
            "first_name": client.first_name or "",
            "last_name": client.last_name or "",
            "email": client.email or "",
        }

    @staticmethod
    def _get_event_context(event) -> dict[str, Any]:
        """Get event-related context variables."""
        now = timezone.now()

        # Event type info
        event_type = event.event_type
        event_type_name = event_type.name if event_type else "Event"

        # Date formatting with timezone display
        # All dates/times are in Philippine Time (Asia/Manila, UTC+8)
        event_date = event.start_date.strftime("%B %d, %Y") if event.start_date else ""
        event_date_short = event.start_date.strftime("%m/%d/%Y") if event.start_date else ""
        start_time = event.start_date.strftime(f"%I:%M %p {PHILIPPINES_TZ_DISPLAY}") if event.start_date else ""
        end_time = event.end_date.strftime(f"%I:%M %p {PHILIPPINES_TZ_DISPLAY}") if event.end_date else ""

        # Days until event
        days_until = None
        if event.start_date:
            delta = event.start_date.date() - now.date()
            days_until = delta.days

        # Duration
        duration = None
        if event.start_date and event.end_date:
            delta = event.end_date - event.start_date
            duration = round(delta.total_seconds() / 3600, 1)

        # Venue
        venue = "LifePlace Retreat & Events Center"
        if event.preferences and isinstance(event.preferences, dict):
            venue = event.preferences.get("venue", venue)

        # Guest count
        guest_count = ""
        if event.preferences and isinstance(event.preferences, dict):
            guest_count = str(event.preferences.get("guest_count", ""))

        return {
            "event_name": event.name or f"Event #{event.id}",
            "event_type": event_type_name,
            "event_date": event_date,
            "event_date_short": event_date_short,
            "event_time": start_time,
            "start_date": event_date,
            "end_date": event.end_date.strftime("%B %d, %Y") if event.end_date else "",
            "start_time": start_time,
            "end_time": end_time,
            "event_location": venue,
            "venue_name": venue,
            "guest_count": guest_count,
            "days_until_event": days_until if days_until is not None else "",
            "event_duration": f"{duration} hours" if duration else "",
        }

    @staticmethod
    def _get_booking_context(booking_session, event) -> dict[str, Any]:
        """Get booking-related context variables."""
        booking_data = booking_session.booking_data or {}

        # Generate booking reference
        booking_reference = str(booking_session.session_id)[-8:].upper()

        # Get selected packages and addons
        selected_packages = booking_data.get("selected_packages", [])
        selected_addons = booking_data.get("selected_addons", [])

        # Build services description
        package_names = []
        if isinstance(selected_packages, list):
            for pkg in selected_packages:
                if isinstance(pkg, dict) and pkg.get("name"):
                    package_names.append(pkg["name"])
                elif isinstance(pkg, str):
                    package_names.append(pkg)
        services_description = ", ".join(package_names) if package_names else "Event services"

        return {
            "booking_reference": booking_reference,
            "selected_packages": selected_packages,
            "selected_addons": selected_addons,
            "services_description": services_description,
        }

    # Keep backward-compatible class method aliases
    _get_quote_context = staticmethod(context_providers.get_quote_context)
    _get_contract_context = staticmethod(context_providers.get_contract_context)
    _get_admin_invitation_context = staticmethod(context_providers.get_admin_invitation_context)
    _get_notification_context = staticmethod(context_providers.get_notification_context)
    _get_financial_context = staticmethod(context_providers.get_financial_context)
    _get_payment_context = staticmethod(context_providers.get_payment_context)
    _get_invoice_context = staticmethod(context_providers.get_invoice_context)
    _get_payment_plan_context = staticmethod(context_providers.get_payment_plan_context)
