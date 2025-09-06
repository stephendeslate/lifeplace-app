# backend/core/domains/contracts/context_service.py
import datetime
import logging
from decimal import Decimal
from typing import Dict, Any, Optional

from django.utils import timezone
from core.domains.events.models import Event
from core.domains.users.models import User

logger = logging.getLogger(__name__)


class ContractContextService:
    """
    Service for generating standardized contract template context data from events.
    This ensures consistent variable naming and complete data for contract generation.
    """
    
    @staticmethod
    def generate_event_context(event: Event, additional_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate standardized context data for contract templates from an event.
        
        Args:
            event: Event instance to generate context from
            additional_context: Optional additional context data to merge
            
        Returns:
            Dictionary with standardized variable names for contract templates
        """
        try:
            # Get related data
            client = event.client
            event_type = event.event_type
            
            # Generate standardized context
            context = {
                # Event Information (standardized naming)
                'event_id': event.id,
                'event_name': event.name or f'Event #{event.id}',
                'event_title': event.name or f'Event #{event.id}',
                'event_status': event.status,
                'event_status_display': dict(Event.EVENT_STATUSES).get(event.status, event.status),
                
                # Event Type Information
                'event_type': event_type.name if event_type else 'Event',
                'event_type_name': event_type.name if event_type else 'Event',
                'event_type_id': event_type.id if event_type else None,
                'event_type_description': event_type.description if event_type else '',
                
                # Date Information (formatted for contracts)
                'event_date': ContractContextService._format_date(event.start_date),
                'start_date': ContractContextService._format_date(event.start_date),
                'end_date': ContractContextService._format_date(event.end_date) if event.end_date else None,
                'event_start_date': ContractContextService._format_date(event.start_date),
                'event_end_date': ContractContextService._format_date(event.end_date) if event.end_date else None,
                
                # Date variations
                'start_date_long': ContractContextService._format_date_long(event.start_date),
                'end_date_long': ContractContextService._format_date_long(event.end_date) if event.end_date else None,
                'start_time': ContractContextService._format_time(event.start_date),
                'end_time': ContractContextService._format_time(event.end_date) if event.end_date else None,
                'signature_date': ContractContextService._format_date(timezone.now()),
                'signature_date_long': ContractContextService._format_date_long(timezone.now()),
                
                # Contract meta information
                'contract_date': ContractContextService._format_date(timezone.now()),
                'contract_date_long': ContractContextService._format_date_long(timezone.now()),
                'today': ContractContextService._format_date(timezone.now()),
                'current_date': timezone.now().date().isoformat(),
                'current_year': timezone.now().year,
                
                # Client Information (standardized naming)
                'client_id': client.id if client else None,
                'client_name': ContractContextService._get_client_full_name(client),
                'client_full_name': ContractContextService._get_client_full_name(client),
                'client_first_name': client.first_name if client else '',
                'client_last_name': client.last_name if client else '',
                'client_email': client.email if client else '',
                
                # Client profile information (if available)
                'client_phone': ContractContextService._get_client_phone(client),
                'client_company': ContractContextService._get_client_company(client),
                'client_address': ContractContextService._get_client_address(client),
                
                # Financial Information (standardized naming)
                'total_price': str(event.total_price or 0),
                'total_amount': str(event.total_price or 0),
                'contract_value': str(event.total_price or 0),
                'event_price': str(event.total_price or 0),
                'amount_due': str(event.total_amount_due or event.total_price or 0),
                'amount_paid': str(event.total_amount_paid or 0),
                'amount_remaining': str((event.total_amount_due or event.total_price or 0) - (event.total_amount_paid or 0)),
                
                # Payment Information
                'payment_status': event.payment_status,
                'payment_status_display': dict(Event.PAYMENT_STATUS_CHOICES).get(event.payment_status, event.payment_status),
                
                # Event specific information
                'lead_source': event.lead_source or '',
                'preferences': ContractContextService._format_preferences(event.preferences),
                
                # Venue and logistics (with defaults)
                'venue': ContractContextService._get_venue(event),
                'venue_name': ContractContextService._get_venue(event),
                'location': ContractContextService._get_venue(event),
                'event_location': ContractContextService._get_venue(event),
                
                # Payment terms and conditions (with defaults)
                'payment_terms': ContractContextService._get_payment_terms(event),
                'cancellation_policy': ContractContextService._get_cancellation_policy(event),
                
                # Workflow information
                'current_stage': event.current_stage.name if event.current_stage else None,
                'workflow_template': event.workflow_template.name if event.workflow_template else None,
            }
            
            # Add currency formatting
            context.update(ContractContextService._get_currency_formatted_amounts(event))
            
            # Add computed fields
            context.update(ContractContextService._get_computed_fields(event))
            
            # Merge additional context if provided
            if additional_context:
                context.update(additional_context)
                
            logger.info(f"Generated contract context for event {event.id} with {len(context)} variables")
            
            return context
            
        except Exception as e:
            logger.error(f"Error generating contract context for event {event.id}: {e}")
            raise
    
    @staticmethod
    def _get_client_full_name(client: Optional[User]) -> str:
        """Get client full name with fallback"""
        if not client:
            return 'Unknown Client'
        
        if client.first_name and client.last_name:
            return f"{client.first_name} {client.last_name}"
        elif client.first_name:
            return client.first_name
        elif client.last_name:
            return client.last_name
        else:
            return client.email or 'Unknown Client'
    
    @staticmethod
    def _get_client_phone(client: Optional[User]) -> str:
        """Get client phone with fallback"""
        if not client or not hasattr(client, 'profile'):
            return ''
        
        profile = getattr(client, 'profile', None)
        return getattr(profile, 'phone', '') if profile else ''
    
    @staticmethod
    def _get_client_company(client: Optional[User]) -> str:
        """Get client company with fallback"""
        if not client or not hasattr(client, 'profile'):
            return ''
        
        profile = getattr(client, 'profile', None)
        return getattr(profile, 'company', '') if profile else ''
    
    @staticmethod
    def _get_client_address(client: Optional[User]) -> str:
        """Get client address with fallback"""
        if not client or not hasattr(client, 'profile'):
            return ''
        
        profile = getattr(client, 'profile', None)
        if not profile:
            return ''
        
        address_parts = []
        if hasattr(profile, 'address') and profile.address:
            address_parts.append(profile.address)
        if hasattr(profile, 'city') and profile.city:
            address_parts.append(profile.city)
        if hasattr(profile, 'state') and profile.state:
            address_parts.append(profile.state)
        if hasattr(profile, 'zip_code') and profile.zip_code:
            address_parts.append(profile.zip_code)
        
        return ', '.join(address_parts)
    
    @staticmethod
    def _get_venue(event: Event) -> str:
        """Get event venue with fallback"""
        # Check event preferences for venue
        if event.preferences and isinstance(event.preferences, dict):
            venue = event.preferences.get('venue')
            if venue:
                return venue
        
        # Default venue text for contracts
        return 'To be determined'
    
    @staticmethod
    def _get_payment_terms(event: Event) -> str:
        """Get payment terms with fallback"""
        # Check event preferences for custom payment terms
        if event.preferences and isinstance(event.preferences, dict):
            payment_terms = event.preferences.get('payment_terms')
            if payment_terms:
                return payment_terms
        
        # Default payment terms
        return '50% deposit required upon contract signing, remaining balance due 7 days before event date'
    
    @staticmethod
    def _get_cancellation_policy(event: Event) -> str:
        """Get cancellation policy with fallback"""
        # Check event preferences for custom cancellation policy
        if event.preferences and isinstance(event.preferences, dict):
            cancellation = event.preferences.get('cancellation_policy')
            if cancellation:
                return cancellation
        
        # Default cancellation policy
        return 'Cancellations made more than 30 days before the event date are eligible for a full refund minus processing fees. Cancellations made within 30 days are subject to forfeiture of deposit.'
    
    @staticmethod
    def _format_preferences(preferences: Dict[str, Any]) -> str:
        """Format preferences for display in contracts"""
        if not preferences or not isinstance(preferences, dict):
            return ''
        
        # Format key preferences for contract display
        formatted = []
        for key, value in preferences.items():
            if key not in ['venue', 'payment_terms', 'cancellation_policy'] and value:
                formatted.append(f"{key.replace('_', ' ').title()}: {value}")
        
        return '; '.join(formatted)
    
    @staticmethod
    def _format_date(date_value: datetime.datetime) -> str:
        """Format date for contract display (MM/DD/YYYY)"""
        if not date_value:
            return ''
        return date_value.strftime('%m/%d/%Y')
    
    @staticmethod
    def _format_date_long(date_value: datetime.datetime) -> str:
        """Format date for contract display (Month Day, Year)"""
        if not date_value:
            return ''
        return date_value.strftime('%B %d, %Y')
    
    @staticmethod
    def _format_time(date_value: datetime.datetime) -> str:
        """Format time for contract display (HH:MM AM/PM)"""
        if not date_value:
            return ''
        return date_value.strftime('%I:%M %p')
    
    @staticmethod
    def _get_currency_formatted_amounts(event: Event) -> Dict[str, str]:
        """Get currency-formatted amount fields using system currency settings"""
        from core.domains.settings.models import CurrencySettings
        
        # Get system currency settings
        currency_settings = CurrencySettings.get_system_settings()
        
        # Get currency symbol mapping
        currency_symbols = {
            'PHP': '₱',
            'USD': '$',
            'EUR': '€',
            'SGD': 'S$',
            'HKD': 'HK$',
        }
        
        def format_currency(amount):
            if not amount:
                amount = 0
            
            try:
                amount_float = float(amount)
            except (ValueError, TypeError):
                amount_float = 0
            
            # Get currency symbol
            currency_code = currency_settings.default_currency
            symbol = currency_symbols.get(currency_code, currency_code)
            
            # Format based on decimal places setting
            decimal_places = currency_settings.decimal_places
            thousands_sep = currency_settings.thousands_separator
            decimal_sep = currency_settings.decimal_separator
            
            # Format the number
            if decimal_places == 0:
                formatted_amount = f"{amount_float:,.0f}".replace(',', '|').replace('.', decimal_sep).replace('|', thousands_sep)
            else:
                formatted_amount = f"{amount_float:,.{decimal_places}f}".replace(',', '|').replace('.', decimal_sep).replace('|', thousands_sep)
            
            # Apply display format
            display_format = currency_settings.display_format
            if display_format == 'symbol':
                return f"{symbol}{formatted_amount}"
            elif display_format == 'code':
                return f"{formatted_amount} {currency_code}"
            elif display_format == 'both':
                return f"{symbol}{formatted_amount} {currency_code}"
            else:
                return f"{symbol}{formatted_amount}"
        
        return {
            'total_price_formatted': format_currency(event.total_price),
            'total_amount_formatted': format_currency(event.total_price),
            'contract_value_formatted': format_currency(event.total_price),
            'amount_due_formatted': format_currency(event.total_amount_due or event.total_price),
            'amount_paid_formatted': format_currency(event.total_amount_paid),
            'amount_remaining_formatted': format_currency(
                (event.total_amount_due or event.total_price or 0) - (event.total_amount_paid or 0)
            ),
        }
    
    @staticmethod
    def _get_computed_fields(event: Event) -> Dict[str, Any]:
        """Get computed fields for contracts"""
        now = timezone.now()
        
        # Days until event
        days_until = None
        if event.start_date:
            delta = event.start_date.date() - now.date()
            days_until = delta.days
        
        # Event duration
        duration_hours = None
        if event.start_date and event.end_date:
            delta = event.end_date - event.start_date
            duration_hours = delta.total_seconds() / 3600
        
        return {
            'days_until_event': days_until,
            'days_until_event_text': f"{days_until} days" if days_until is not None else '',
            'event_duration_hours': duration_hours,
            'event_duration_text': f"{duration_hours:.1f} hours" if duration_hours is not None else '',
            'is_upcoming': days_until > 0 if days_until is not None else False,
            'is_past': days_until < 0 if days_until is not None else False,
        }
    
    @staticmethod
    def get_available_variables() -> Dict[str, str]:
        """
        Get a dictionary of all available template variables with descriptions.
        This is useful for template creation and documentation.
        """
        return {
            # Event Information
            'event_id': 'Unique event ID',
            'event_name': 'Event name or title',
            'event_title': 'Event name or title (alias)',
            'event_status': 'Event status code (LEAD, CONFIRMED, etc.)',
            'event_status_display': 'Human-readable event status',
            'event_type': 'Type of event (Wedding, Corporate, etc.)',
            'event_type_name': 'Type of event (alias)',
            
            # Date Information
            'event_date': 'Event date (MM/DD/YYYY)',
            'start_date': 'Event start date (MM/DD/YYYY)',
            'end_date': 'Event end date (MM/DD/YYYY)',
            'start_date_long': 'Event start date (Month Day, Year)',
            'end_date_long': 'Event end date (Month Day, Year)',
            'start_time': 'Event start time (HH:MM AM/PM)',
            'end_time': 'Event end time (HH:MM AM/PM)',
            
            # Contract Dates
            'contract_date': 'Contract creation date (MM/DD/YYYY)',
            'contract_date_long': 'Contract creation date (Month Day, Year)',
            'today': 'Current date (MM/DD/YYYY)',
            'current_year': 'Current year',
            
            # Client Information
            'client_name': 'Client full name',
            'client_full_name': 'Client full name (alias)',
            'client_first_name': 'Client first name',
            'client_last_name': 'Client last name',
            'client_email': 'Client email address',
            'client_phone': 'Client phone number',
            'client_company': 'Client company name',
            'client_address': 'Client address',
            
            # Financial Information
            'total_price': 'Total price (numeric)',
            'total_amount': 'Total amount (alias)',
            'contract_value': 'Contract value (alias)',
            'total_price_formatted': 'Total price (currency formatted)',
            'amount_due': 'Amount due (numeric)',
            'amount_paid': 'Amount paid (numeric)',
            'amount_remaining': 'Remaining balance (numeric)',
            
            # Event Details
            'venue': 'Event venue or location',
            'location': 'Event location (alias)',
            'payment_terms': 'Payment terms and conditions',
            'cancellation_policy': 'Cancellation policy text',
            'lead_source': 'How client found the business',
            
            # Computed Fields
            'days_until_event': 'Number of days until event',
            'event_duration_hours': 'Event duration in hours',
            'is_upcoming': 'Whether event is in the future',
            
            # Signature Placeholders
            'SIGNATURE_CLIENT': 'Client signature image (displays when signed)',
            'SIGNATURE_COMPANY_REP': 'Company representative signature image (displays when signed)',
            'SIGNATURE_WITNESS': 'Witness signature image (displays when signed)',
            'SIGNATURE_GUARDIAN': 'Legal guardian signature image (displays when signed)',
            'SIGNATURE_PARTNER': 'Business partner signature image (displays when signed)',
            'SIGNATURE_OTHER': 'Other signature image (displays when signed)',
            
            # Signature Date Placeholders
            'client_signature_date': 'Date when client signed (displays when signed)',
            'company_rep_signature_date': 'Date when company rep signed (displays when signed)',
            'witness_signature_date': 'Date when witness signed (displays when signed)',
            'guardian_signature_date': 'Date when guardian signed (displays when signed)',
            'partner_signature_date': 'Date when partner signed (displays when signed)',
            'other_signature_date': 'Date when other party signed (displays when signed)',
            
            # Signature Name Placeholders
            'client_signer_name': 'Name of client signer (displays when signed)',
            'company_rep_signer_name': 'Name of company representative signer (displays when signed)',
            'witness_signer_name': 'Name of witness signer (displays when signed)',
            'guardian_signer_name': 'Name of guardian signer (displays when signed)',
            'partner_signer_name': 'Name of partner signer (displays when signed)',
            'other_signer_name': 'Name of other signer (displays when signed)',
            
            # Signature Title Placeholders
            'client_signer_title': 'Title of client signer (displays when signed)',
            'company_rep_signer_title': 'Title of company representative signer (displays when signed)',
            'witness_signer_title': 'Title of witness signer (displays when signed)',
            'guardian_signer_title': 'Title of guardian signer (displays when signed)',
            'partner_signer_title': 'Title of partner signer (displays when signed)',
            'other_signer_title': 'Title of other signer (displays when signed)',
        }