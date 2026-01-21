# backend/core/domains/contracts/context_service.py
import datetime
import logging
from decimal import Decimal
from typing import Dict, Any, Optional

from django.utils import timezone
from core.domains.events.models import Event
from core.domains.users.models import User
from core.utils.url_builder import ClientPortalURLBuilder
from core.utils.company_context import CompanyContextMixin

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

            # Get price source from accepted quote (preferred) or event.total_price (fallback)
            # This ensures contract shows the accepted quote price, including any discounts
            if hasattr(event, 'accepted_quote') and event.accepted_quote:
                quote = event.accepted_quote
                price_source = quote.total_amount
                subtotal = quote.subtotal
                tax_amount = quote.tax_amount
                discount_amount = quote.discount_amount
            else:
                price_source = event.total_price or Decimal('0')
                subtotal = price_source
                tax_amount = Decimal('0')
                discount_amount = Decimal('0')

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
                # Uses accepted quote pricing when available to ensure contract shows correct price
                'total_price': str(price_source),
                'total_amount': str(price_source),
                'contract_value': str(price_source),
                'event_price': str(price_source),
                'subtotal': str(subtotal),
                'tax_amount': str(tax_amount),
                'discount_amount': str(discount_amount),
                'amount_due': str(event.total_amount_due or price_source),
                'amount_paid': str(event.total_amount_paid or 0),
                'amount_remaining': str((event.total_amount_due or price_source) - (event.total_amount_paid or 0)),
                
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

            # Add payment/deposit information for contract templates
            context.update(ContractContextService._get_payment_deposit_info(event))

            # Add company context from CompanySettings
            context.update(CompanyContextMixin.get_company_context())

            # Add URL context for links in contracts
            context.update({
                'dashboard_url': ClientPortalURLBuilder.dashboard_url(),
                'login_link': ClientPortalURLBuilder.login_url(),
                'support_link': ClientPortalURLBuilder.support_url(),
                'payments_link': ClientPortalURLBuilder.payments_url(),
                'documents_link': ClientPortalURLBuilder.documents_url(),
                'profile_link': ClientPortalURLBuilder.profile_url(),
                'terms_of_service_link': ClientPortalURLBuilder.terms_of_service_url(),
                'privacy_policy_link': ClientPortalURLBuilder.privacy_policy_url(),
                'event_link': ClientPortalURLBuilder.event_url(event.id),
                'event_timeline_link': ClientPortalURLBuilder.event_timeline_url(event.id),
                'event_questionnaires_link': ClientPortalURLBuilder.event_questionnaires_url(event.id),
                'event_contracts_link': ClientPortalURLBuilder.event_contracts_url(event.id),
                'event_documents_link': ClientPortalURLBuilder.event_documents_url(event.id),
                'event_tasks_link': ClientPortalURLBuilder.event_tasks_url(event.id),
                'event_quotes_link': ClientPortalURLBuilder.event_quotes_url(event.id),
                'event_invoices_link': ClientPortalURLBuilder.event_invoices_url(event.id),
            })

            # Merge additional context if provided
            if additional_context:
                context.update(additional_context)
                
            logger.info(f"Generated contract context for event {event.id} with {len(context)} variables")

            return context

        except Exception as e:
            logger.error(f"Error generating contract context for event {event.id}: {e}")
            raise

    @staticmethod
    def get_contract_specific_context(contract) -> Dict[str, Any]:
        """
        Get context variables specific to an existing contract instance.
        Call this when rendering a contract that already exists (has an ID).

        Args:
            contract: Contract instance with id and valid_until attributes

        Returns:
            Dictionary with contract-specific variables
        """
        # Get signature deadline if available
        signature_deadline = ''
        if hasattr(contract, 'valid_until') and contract.valid_until:
            signature_deadline = contract.valid_until.strftime('%B %d, %Y')

        return {
            'contract_link': ClientPortalURLBuilder.contract_url(contract.id),
            'contract_pdf_link': ClientPortalURLBuilder.contract_pdf_url(contract.id),
            'signature_deadline': signature_deadline,
        }

    @staticmethod
    def generate_full_context(event: Event, contract=None, additional_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate complete context including contract-specific variables if contract is provided.

        This is the recommended method when rendering an existing contract, as it includes
        contract_link, contract_pdf_link, and signature_deadline variables.

        Args:
            event: Event instance
            contract: Optional contract instance (for contract-specific URLs)
            additional_context: Optional additional context data to merge

        Returns:
            Complete context dictionary
        """
        # Get base event context
        context = ContractContextService.generate_event_context(event, additional_context)

        # Add contract-specific context if contract provided
        if contract:
            context.update(ContractContextService.get_contract_specific_context(contract))

        return context

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
        """
        Get payment terms with fallback hierarchy:
        1. Event preferences (custom override for this specific event)
        2. Booking flow's PaymentTermsConfiguration (flow-specific)
        3. Global PaymentSettings defaults
        """
        # Check event preferences for custom payment terms (highest priority)
        if event.preferences and isinstance(event.preferences, dict):
            payment_terms = event.preferences.get('payment_terms')
            if payment_terms:
                return payment_terms

        # Use PaymentTermsResolver to get structured terms and generate text
        try:
            from core.domains.payments.services import PaymentTermsResolver

            # Get payment terms for this event (traces back to booking flow)
            terms = PaymentTermsResolver.get_terms_for_event(event.id)

            # Generate human-readable payment terms text from structured config
            return PaymentTermsResolver.generate_terms_text(terms)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error generating payment terms for event {event.id}: {e}")

        # Ultimate fallback
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

        # Get price source from accepted quote (preferred) or event.total_price (fallback)
        if hasattr(event, 'accepted_quote') and event.accepted_quote:
            quote = event.accepted_quote
            price_source = quote.total_amount
            subtotal = quote.subtotal
            tax_amount = quote.tax_amount
            discount_amount = quote.discount_amount
        else:
            price_source = event.total_price or Decimal('0')
            subtotal = price_source
            tax_amount = Decimal('0')
            discount_amount = Decimal('0')

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
            'total_price_formatted': format_currency(price_source),
            'total_amount_formatted': format_currency(price_source),
            'contract_value_formatted': format_currency(price_source),
            'subtotal_formatted': format_currency(subtotal),
            'tax_amount_formatted': format_currency(tax_amount),
            'discount_amount_formatted': format_currency(discount_amount),
            'amount_due_formatted': format_currency(event.total_amount_due or price_source),
            'amount_paid_formatted': format_currency(event.total_amount_paid),
            'amount_remaining_formatted': format_currency(
                (event.total_amount_due or price_source or 0) - (event.total_amount_paid or 0)
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
            
            # Financial Information (uses accepted quote pricing when available)
            'total_price': 'Total price from accepted quote (numeric)',
            'total_amount': 'Total amount from accepted quote (alias)',
            'contract_value': 'Contract value from accepted quote (alias)',
            'subtotal': 'Subtotal before tax and discounts (numeric)',
            'tax_amount': 'Tax amount (numeric)',
            'discount_amount': 'Discount amount applied (numeric)',
            'total_price_formatted': 'Total price (currency formatted)',
            'subtotal_formatted': 'Subtotal (currency formatted)',
            'tax_amount_formatted': 'Tax amount (currency formatted)',
            'discount_amount_formatted': 'Discount amount (currency formatted)',
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

            # Company Information
            'company_name': 'Official company name',
            'company_tagline': 'Company tagline/slogan',
            'company_email': 'Primary company email',
            'company_phone': 'Company phone number',
            'company_support_email': 'Support email address',
            'company_support_phone': 'Support phone number',
            'company_address': 'Full company address',
            'company_city': 'Company city',
            'company_province': 'Company province/state',
            'company_country': 'Company country',
            'company_website': 'Company website URL',
            'company_facebook': 'Facebook page URL',
            'company_instagram': 'Instagram profile URL',
            'bank_name': 'Bank name for payments',
            'bank_account_name': 'Bank account holder name',
            'bank_account_number': 'Bank account number',
            'bank_branch': 'Bank branch name',
            'bank_swift_code': 'SWIFT/BIC code for international transfers',
            'business_registration_number': 'Business registration/TIN number',
            'vat_number': 'VAT registration number',
            'invoice_terms': 'Default invoice payment terms',

            # URL Variables
            'dashboard_url': 'Client dashboard URL',
            'login_link': 'Login page URL',
            'support_link': 'Support/help page URL',
            'payments_link': 'Payments portal URL',
            'documents_link': 'Documents page URL',
            'profile_link': 'Profile settings URL',
            'terms_of_service_link': 'Terms of Service URL',
            'privacy_policy_link': 'Privacy Policy URL',
            'event_link': 'Event detail page URL',
            'event_timeline_link': 'Event timeline tab URL',
            'event_questionnaires_link': 'Event questionnaires tab URL',
            'event_contracts_link': 'Event contracts tab URL',
            'event_documents_link': 'Event documents tab URL',
            'event_tasks_link': 'Event tasks tab URL',
            'event_quotes_link': 'Event quotes tab URL',
            'event_invoices_link': 'Event invoices tab URL',

            # Contract-Specific URLs (available when rendering existing contract)
            'contract_link': 'Direct link to this contract',
            'contract_pdf_link': 'Direct link to download contract PDF',
            'signature_deadline': 'Deadline date for signing the contract',
        }

    @staticmethod
    def _get_payment_deposit_info(event: Event) -> Dict[str, Any]:
        """
        Get payment and deposit information for contract templates.
        This includes deposit percentages, amounts, balance due dates, etc.
        """
        try:
            from core.domains.payments.models import PaymentSettings, Invoice

            # Get payment settings for deposit percentage
            payment_settings = PaymentSettings.get_default_settings()
            deposit_percentage = payment_settings.default_deposit_percentage

            # Get price source from accepted quote (preferred) or event.total_price (fallback)
            if hasattr(event, 'accepted_quote') and event.accepted_quote:
                price_source = event.accepted_quote.total_amount
            else:
                price_source = event.total_price or Decimal('0')

            # Calculate deposit and balance amounts
            deposit_amount = Decimal('0')
            balance_amount = Decimal('0')
            balance_due_date = ''
            balance_due_days = 0
            late_fee_amount = '0'

            if price_source:
                deposit_amount = price_source * (deposit_percentage / Decimal('100'))
                balance_amount = price_source - deposit_amount

            # Get invoice for due date information
            invoice = Invoice.objects.filter(event=event).order_by('-created_at').first()
            if invoice and invoice.due_date:
                balance_due_date = invoice.due_date.strftime('%B %d, %Y')
                days_diff = (invoice.due_date - timezone.now().date()).days
                balance_due_days = max(0, days_diff)  # Don't show negative days

            # Get late fee info if available
            if hasattr(payment_settings, 'late_fee_percentage'):
                late_fee_amount = str(payment_settings.late_fee_percentage)
            elif hasattr(payment_settings, 'late_fee_amount'):
                late_fee_amount = str(payment_settings.late_fee_amount)

            # Get guest count from preferences
            guest_count = ''
            if event.preferences and isinstance(event.preferences, dict):
                guest_count = str(event.preferences.get('guest_count', ''))

            # Get services description
            services_description = ContractContextService._get_services_description(event)

            # Get refund policy (same as cancellation policy)
            refund_policy_text = ContractContextService._get_cancellation_policy(event)

            return {
                # Event time (in addition to start_time/end_time that already exist)
                'event_time': ContractContextService._format_time(event.start_date),

                # Guest information
                'guest_count': guest_count,

                # Deposit and payment information
                'deposit_percentage': str(deposit_percentage),
                'deposit_amount': str(deposit_amount),
                'balance_amount': str(balance_amount),
                'balance_due_date': balance_due_date,
                'balance_due_days': str(balance_due_days),

                # Fee and policy information
                'late_fee_amount': late_fee_amount,
                'refund_policy_text': refund_policy_text,

                # Services description
                'services_description': services_description,
            }

        except Exception as e:
            logger.warning(f"Error getting payment/deposit info for event {event.id}: {e}")
            # Return defaults to prevent template errors
            return {
                'event_time': '',
                'guest_count': '',
                'deposit_percentage': '50',
                'deposit_amount': '0',
                'balance_amount': '0',
                'balance_due_date': '',
                'balance_due_days': '0',
                'late_fee_amount': '0',
                'refund_policy_text': 'Please contact us regarding our refund policy.',
                'services_description': 'Event services as agreed',
            }

    @staticmethod
    def _get_services_description(event: Event) -> str:
        """Get description of services/packages for event"""
        try:
            # Try to get from accepted quote
            if hasattr(event, 'accepted_quote') and event.accepted_quote:
                quote = event.accepted_quote
                line_items = quote.line_items.all()
                if line_items.exists():
                    descriptions = []
                    for item in line_items:
                        if item.description:
                            qty_str = f"({item.quantity}x) " if item.quantity > 1 else ""
                            descriptions.append(f"{qty_str}{item.description}")
                    if descriptions:
                        return '; '.join(descriptions)

            # Try to get from event type
            if event.event_type:
                return f"{event.event_type.name} event services"

            # Final fallback
            return "Event services as agreed"

        except Exception as e:
            logger.warning(f"Error getting services description for event {event.id}: {e}")
            return "Event services as agreed"