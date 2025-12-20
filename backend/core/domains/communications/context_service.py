# backend/core/domains/communications/context_service.py
"""
Context service for generating standardized template variables.
Similar to ContractContextService but supports multiple context types.
"""

import logging
from decimal import Decimal
from typing import Dict, Any, Optional, List

from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError


logger = logging.getLogger(__name__)


class ContextType:
    """Context type constants for communication templates."""
    CLIENT = 'CLIENT'
    EVENT = 'EVENT'
    BOOKING = 'BOOKING'
    QUOTE = 'QUOTE'
    CONTRACT = 'CONTRACT'
    ADMIN = 'ADMIN'
    NOTIFICATION = 'NOTIFICATION'
    MANUAL = 'MANUAL'

    CHOICES = [
        (CLIENT, 'Client'),
        (EVENT, 'Event'),
        (BOOKING, 'Booking'),
        (QUOTE, 'Quote'),
        (CONTRACT, 'Contract'),
        (ADMIN, 'Admin'),
        (NOTIFICATION, 'Notification'),
        (MANUAL, 'Manual'),
    ]


# Required objects for each context type
REQUIRED_OBJECTS = {
    ContextType.CLIENT: ['client'],
    ContextType.EVENT: ['client', 'event'],
    ContextType.BOOKING: ['client', 'event', 'booking_session'],
    ContextType.QUOTE: ['client', 'event', 'quote'],
    ContextType.CONTRACT: ['client', 'event', 'contract'],
    ContextType.ADMIN: ['user', 'admin_invitation'],
    ContextType.NOTIFICATION: ['user', 'notification'],
    ContextType.MANUAL: [],  # All optional
}


# Variable groups with metadata for UI organization
VARIABLE_GROUPS = {
    "client": {
        "label": "Client",
        "icon": "person",
        "available_in": [ContextType.CLIENT, ContextType.EVENT, ContextType.BOOKING,
                         ContextType.QUOTE, ContextType.CONTRACT, ContextType.MANUAL],
        "variables": {
            "client_name": {"description": "Full name of the client", "required": True},
            "client_first_name": {"description": "Client's first name", "required": True},
            "client_last_name": {"description": "Client's last name", "required": True},
            "client_email": {"description": "Client's email address", "required": True},
            "client_phone": {"description": "Client's phone number", "required": False},
            "client_company": {"description": "Client's company name", "required": False},
            "client_address": {"description": "Client's full address", "required": False},
        }
    },
    "event": {
        "label": "Event",
        "icon": "event",
        "available_in": [ContextType.EVENT, ContextType.BOOKING, ContextType.QUOTE,
                         ContextType.CONTRACT, ContextType.MANUAL],
        "variables": {
            "event_name": {"description": "Event name or title", "required": True},
            "event_type": {"description": "Type of event (Wedding, Corporate, etc.)", "required": True},
            "event_date": {"description": "Event date (Month Day, Year)", "required": True},
            "event_date_short": {"description": "Event date (MM/DD/YYYY)", "required": True},
            "event_time": {"description": "Event start time (HH:MM AM/PM)", "required": True},
            "start_date": {"description": "Event start date", "required": True},
            "end_date": {"description": "Event end date", "required": False},
            "start_time": {"description": "Event start time", "required": True},
            "end_time": {"description": "Event end time", "required": False},
            "event_location": {"description": "Event venue or location", "required": False},
            "venue_name": {"description": "Venue name (alias for location)", "required": False},
            "guest_count": {"description": "Number of guests", "required": False},
            "days_until_event": {"description": "Days until event", "required": True},
            "event_duration": {"description": "Event duration in hours", "required": False},
        }
    },
    "financial": {
        "label": "Financial",
        "icon": "payments",
        "available_in": [ContextType.BOOKING, ContextType.QUOTE, ContextType.CONTRACT],
        "variables": {
            "total_amount": {"description": "Total amount (numeric)", "required": True},
            "total_amount_formatted": {"description": "Total amount (currency formatted)", "required": True},
            "subtotal": {"description": "Subtotal before tax and discounts", "required": True},
            "tax_amount": {"description": "Tax amount", "required": False},
            "discount_amount": {"description": "Discount amount applied", "required": False},
            "deposit_percentage": {"description": "Deposit percentage required", "required": True},
            "deposit_amount": {"description": "Deposit amount", "required": True},
            "balance_amount": {"description": "Remaining balance after deposit", "required": True},
            "balance_due_date": {"description": "Date when balance is due", "required": False},
            "amount_paid": {"description": "Amount already paid", "required": True},
            "amount_due": {"description": "Amount currently due", "required": True},
        }
    },
    "booking": {
        "label": "Booking",
        "icon": "confirmation_number",
        "available_in": [ContextType.BOOKING],
        "variables": {
            "booking_reference": {"description": "Unique booking reference code", "required": True},
            "selected_packages": {"description": "List of selected packages", "required": True},
            "selected_addons": {"description": "List of selected add-ons", "required": False},
            "services_description": {"description": "Summary of booked services", "required": True},
        }
    },
    "quote": {
        "label": "Quote",
        "icon": "request_quote",
        "available_in": [ContextType.QUOTE],
        "variables": {
            "quote_id": {"description": "Quote ID number", "required": True},
            "quote_version": {"description": "Quote version number", "required": True},
            "quote_valid_until": {"description": "Quote expiration date", "required": True},
            "quote_link": {"description": "Link to view/accept quote", "required": False},
        }
    },
    "contract": {
        "label": "Contract",
        "icon": "description",
        "available_in": [ContextType.CONTRACT],
        "variables": {
            "contract_link": {"description": "Link to sign contract", "required": True},
            "signature_deadline": {"description": "Deadline to sign contract", "required": False},
            "contract_date": {"description": "Contract creation date", "required": True},
            "payment_terms": {"description": "Payment terms text", "required": True},
            "cancellation_policy": {"description": "Cancellation policy text", "required": True},
        }
    },
    "admin": {
        "label": "Admin",
        "icon": "admin_panel_settings",
        "available_in": [ContextType.ADMIN],
        "variables": {
            "first_name": {"description": "Invitee's first name", "required": True},
            "last_name": {"description": "Invitee's last name", "required": True},
            "email": {"description": "Invitee's email address", "required": True},
            "invitation_link": {"description": "Invitation acceptance URL", "required": True},
            "invited_by": {"description": "Name of person who sent invitation", "required": True},
            "expiry_date": {"description": "Invitation expiration date", "required": True},
        }
    },
    "notification": {
        "label": "Notification",
        "icon": "notifications",
        "available_in": [ContextType.NOTIFICATION],
        "variables": {
            "title": {"description": "Notification title", "required": True},
            "content": {"description": "Notification content/message", "required": True},
            "action_url": {"description": "Action link URL", "required": False},
            "notification_count": {"description": "Number of notifications (for digests)", "required": False},
            "frequency": {"description": "Digest frequency (Daily, Weekly)", "required": False},
        }
    },
    "system": {
        "label": "System",
        "icon": "settings",
        "available_in": [ContextType.CLIENT, ContextType.EVENT, ContextType.BOOKING,
                         ContextType.QUOTE, ContextType.CONTRACT, ContextType.ADMIN,
                         ContextType.NOTIFICATION, ContextType.MANUAL],
        "variables": {
            "site_name": {"description": "Platform/site name", "required": True},
            "current_date": {"description": "Today's date", "required": True},
            "current_year": {"description": "Current year", "required": True},
            "support_email": {"description": "Support email address", "required": True},
            "dashboard_url": {"description": "Client portal/dashboard URL", "required": True},
            "login_link": {"description": "Login page URL", "required": False},
            "reset_link": {"description": "Password reset URL (for password reset)", "required": False},
        }
    },
}


class CommunicationContextService:
    """
    Service for generating standardized context data for communication templates.
    Supports multiple context types with validation of required objects.
    """

    @staticmethod
    def get_required_objects(context_type: str) -> List[str]:
        """Get list of required objects for a context type."""
        return REQUIRED_OBJECTS.get(context_type, [])

    @staticmethod
    def get_variable_groups() -> Dict[str, Any]:
        """Get all variable groups with metadata."""
        return VARIABLE_GROUPS

    @staticmethod
    def get_variables_for_context_type(context_type: str) -> Dict[str, Dict[str, Any]]:
        """Get all variables available for a specific context type."""
        available_vars = {}
        for group_key, group_data in VARIABLE_GROUPS.items():
            if context_type in group_data.get('available_in', []):
                for var_name, var_meta in group_data['variables'].items():
                    available_vars[var_name] = {
                        **var_meta,
                        'group': group_key,
                        'group_label': group_data['label'],
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
    ) -> None:
        """
        Validate that required objects are provided for the context type.
        Raises ValidationError if any required objects are missing.
        """
        required = cls.get_required_objects(context_type)
        provided = {
            'client': client,
            'event': event,
            'booking_session': booking_session,
            'quote': quote,
            'contract': contract,
            'user': user,
            'admin_invitation': admin_invitation,
            'notification': notification,
        }

        missing = [obj for obj in required if not provided.get(obj)]

        if missing:
            raise ValidationError(
                f"Context type '{context_type}' requires the following objects: {', '.join(missing)}"
            )

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
        validate: bool = True,
    ) -> Dict[str, Any]:
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
            )

        context = {}

        # Always include system context
        context.update(cls._get_system_context())

        # Build context based on provided objects
        if client:
            context.update(cls._get_client_context(client))

        if event:
            context.update(cls._get_event_context(event))

        if booking_session and event:
            context.update(cls._get_booking_context(booking_session, event))

        if quote:
            context.update(cls._get_quote_context(quote))

        if contract:
            context.update(cls._get_contract_context(contract))

        if user and admin_invitation:
            context.update(cls._get_admin_invitation_context(admin_invitation, user))

        if user and notification:
            context.update(cls._get_notification_context(notification, user))

        # Add financial context if event has pricing data
        if event and context_type in [ContextType.BOOKING, ContextType.QUOTE, ContextType.CONTRACT]:
            context.update(cls._get_financial_context(event, quote))

        logger.info(f"Generated {context_type} context with {len(context)} variables")
        return context

    @staticmethod
    def _get_system_context() -> Dict[str, Any]:
        """Get system-level context variables."""
        now = timezone.now()
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://lifeplacealfonso.com')

        return {
            'site_name': getattr(settings, 'SITE_NAME', 'LifePlace'),
            'current_date': now.strftime('%B %d, %Y'),
            'current_year': now.year,
            'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@lifeplace.com'),
            'dashboard_url': f'{frontend_url}/portal',
            'login_link': f'{frontend_url}/login',
        }

    @staticmethod
    def _get_client_context(client) -> Dict[str, Any]:
        """Get client-related context variables."""
        # Get profile data if available
        profile = getattr(client, 'profile', None)
        phone = getattr(profile, 'phone', '') if profile else ''
        company = getattr(profile, 'company', '') if profile else ''

        # Build address from profile
        address = ''
        if profile:
            address_parts = []
            if getattr(profile, 'address', None):
                address_parts.append(profile.address)
            if getattr(profile, 'city', None):
                address_parts.append(profile.city)
            if getattr(profile, 'state', None):
                address_parts.append(profile.state)
            if getattr(profile, 'zip_code', None):
                address_parts.append(profile.zip_code)
            address = ', '.join(address_parts)

        # Build full name
        if client.first_name and client.last_name:
            full_name = f"{client.first_name} {client.last_name}"
        elif client.first_name:
            full_name = client.first_name
        elif client.last_name:
            full_name = client.last_name
        else:
            full_name = client.email or 'Valued Client'

        return {
            'client_name': full_name,
            'client_first_name': client.first_name or '',
            'client_last_name': client.last_name or '',
            'client_email': client.email or '',
            'client_phone': phone,
            'client_company': company,
            'client_address': address,
            # Aliases for backwards compatibility
            'first_name': client.first_name or '',
            'last_name': client.last_name or '',
            'email': client.email or '',
        }

    @staticmethod
    def _get_event_context(event) -> Dict[str, Any]:
        """Get event-related context variables."""
        now = timezone.now()

        # Event type info
        event_type = event.event_type
        event_type_name = event_type.name if event_type else 'Event'

        # Date formatting
        event_date = event.start_date.strftime('%B %d, %Y') if event.start_date else ''
        event_date_short = event.start_date.strftime('%m/%d/%Y') if event.start_date else ''
        start_time = event.start_date.strftime('%I:%M %p') if event.start_date else ''
        end_time = event.end_date.strftime('%I:%M %p') if event.end_date else ''

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
        venue = 'LifePlace Retreat & Events Center'
        if event.preferences and isinstance(event.preferences, dict):
            venue = event.preferences.get('venue', venue)

        # Guest count
        guest_count = ''
        if event.preferences and isinstance(event.preferences, dict):
            guest_count = str(event.preferences.get('guest_count', ''))

        return {
            'event_name': event.name or f'Event #{event.id}',
            'event_type': event_type_name,
            'event_date': event_date,
            'event_date_short': event_date_short,
            'event_time': start_time,
            'start_date': event_date,
            'end_date': event.end_date.strftime('%B %d, %Y') if event.end_date else '',
            'start_time': start_time,
            'end_time': end_time,
            'event_location': venue,
            'venue_name': venue,
            'guest_count': guest_count,
            'days_until_event': days_until if days_until is not None else '',
            'event_duration': f'{duration} hours' if duration else '',
        }

    @staticmethod
    def _get_booking_context(booking_session, event) -> Dict[str, Any]:
        """Get booking-related context variables."""
        booking_data = booking_session.booking_data or {}

        # Generate booking reference
        booking_reference = str(booking_session.session_id)[-8:].upper()

        # Get selected packages and addons
        selected_packages = booking_data.get('selected_packages', [])
        selected_addons = booking_data.get('selected_addons', [])

        # Build services description
        package_names = []
        if isinstance(selected_packages, list):
            for pkg in selected_packages:
                if isinstance(pkg, dict) and pkg.get('name'):
                    package_names.append(pkg['name'])
                elif isinstance(pkg, str):
                    package_names.append(pkg)
        services_description = ', '.join(package_names) if package_names else 'Event services'

        return {
            'booking_reference': booking_reference,
            'selected_packages': selected_packages,
            'selected_addons': selected_addons,
            'services_description': services_description,
        }

    @staticmethod
    def _get_quote_context(quote) -> Dict[str, Any]:
        """Get quote-related context variables."""
        return {
            'quote_id': quote.id,
            'quote_version': getattr(quote, 'version', 1),
            'quote_valid_until': quote.valid_until.strftime('%B %d, %Y') if quote.valid_until else '',
            'quote_link': '',  # To be filled by caller if needed
        }

    @staticmethod
    def _get_contract_context(contract) -> Dict[str, Any]:
        """Get contract-related context variables."""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://lifeplacealfonso.com')

        # Get signature deadline if available
        signature_deadline = ''
        if hasattr(contract, 'valid_until') and contract.valid_until:
            signature_deadline = contract.valid_until.strftime('%B %d, %Y')

        # Payment terms and cancellation policy
        payment_terms = getattr(contract, 'payment_terms', None)
        if not payment_terms:
            payment_terms = '50% deposit required upon contract signing, remaining balance due 7 days before event date'

        cancellation_policy = getattr(contract, 'cancellation_policy', None)
        if not cancellation_policy:
            cancellation_policy = 'Cancellations made more than 30 days before the event date are eligible for a full refund minus processing fees.'

        return {
            'contract_link': f'{frontend_url}/contracts/{contract.id}/sign',
            'signature_deadline': signature_deadline,
            'contract_date': timezone.now().strftime('%B %d, %Y'),
            'payment_terms': payment_terms,
            'cancellation_policy': cancellation_policy,
        }

    @staticmethod
    def _get_admin_invitation_context(admin_invitation, user) -> Dict[str, Any]:
        """Get admin invitation context variables."""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://lifeplacealfonso.com')

        # Get inviter name
        invited_by = ''
        if hasattr(admin_invitation, 'invited_by') and admin_invitation.invited_by:
            inviter = admin_invitation.invited_by
            if inviter.first_name and inviter.last_name:
                invited_by = f"{inviter.first_name} {inviter.last_name}"
            else:
                invited_by = inviter.email

        return {
            'first_name': admin_invitation.first_name or '',
            'last_name': admin_invitation.last_name or '',
            'email': admin_invitation.email or '',
            'invitation_link': f'{frontend_url}/accept-invitation/{admin_invitation.id}',
            'invited_by': invited_by,
            'expiry_date': admin_invitation.expires_at.strftime('%B %d, %Y at %I:%M %p') if admin_invitation.expires_at else '',
        }

    @staticmethod
    def _get_notification_context(notification, user) -> Dict[str, Any]:
        """Get notification context variables."""
        return {
            'title': notification.title or '',
            'content': notification.content or '',
            'action_url': getattr(notification, 'action_url', '') or '',
            'recipient_name': user.first_name or user.email,
        }

    @staticmethod
    def _get_financial_context(event, quote=None) -> Dict[str, Any]:
        """Get financial context variables."""
        from core.domains.payments.models import PaymentSettings

        # Get price source from quote or event
        if quote:
            price_source = quote.total_amount
            subtotal = getattr(quote, 'subtotal', price_source)
            tax_amount = getattr(quote, 'tax_amount', Decimal('0'))
            discount_amount = getattr(quote, 'discount_amount', Decimal('0'))
        elif hasattr(event, 'accepted_quote') and event.accepted_quote:
            quote = event.accepted_quote
            price_source = quote.total_amount
            subtotal = getattr(quote, 'subtotal', price_source)
            tax_amount = getattr(quote, 'tax_amount', Decimal('0'))
            discount_amount = getattr(quote, 'discount_amount', Decimal('0'))
        else:
            price_source = event.total_price or Decimal('0')
            subtotal = price_source
            tax_amount = Decimal('0')
            discount_amount = Decimal('0')

        # Get payment settings for deposit percentage
        try:
            payment_settings = PaymentSettings.get_default_settings()
            deposit_percentage = payment_settings.default_deposit_percentage
        except Exception:
            deposit_percentage = Decimal('30')

        # Calculate amounts
        deposit_amount = price_source * (deposit_percentage / Decimal('100'))
        balance_amount = price_source - deposit_amount
        amount_paid = event.total_amount_paid or Decimal('0')
        amount_due = (event.total_amount_due or price_source) - amount_paid

        # Get balance due date from invoice if available
        balance_due_date = ''
        try:
            from core.domains.payments.models import Invoice
            invoice = Invoice.objects.filter(event=event).order_by('-created_at').first()
            if invoice and invoice.due_date:
                balance_due_date = invoice.due_date.strftime('%B %d, %Y')
        except Exception:
            pass

        # Format currency
        def format_amount(amount):
            try:
                return f"₱{float(amount):,.2f}"
            except (ValueError, TypeError):
                return "₱0.00"

        return {
            'total_amount': str(price_source),
            'total_amount_formatted': format_amount(price_source),
            'total_price': str(price_source),
            'subtotal': str(subtotal),
            'tax_amount': str(tax_amount),
            'discount_amount': str(discount_amount),
            'deposit_percentage': str(deposit_percentage),
            'deposit_amount': str(deposit_amount),
            'balance_amount': str(balance_amount),
            'balance_due_date': balance_due_date,
            'amount_paid': str(amount_paid),
            'amount_due': str(amount_due),
            # Formatted versions
            'deposit_amount_formatted': format_amount(deposit_amount),
            'balance_amount_formatted': format_amount(balance_amount),
        }
