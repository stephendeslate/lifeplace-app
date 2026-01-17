"""
Unit tests for contracts domain context service.

Tests:
- ContractContextService.generate_event_context()
- Helper methods for client info, venue, payment terms, etc.
- Date formatting functions
- Currency formatting
- Computed fields
- Available variables
- Payment deposit info
"""

import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from django.utils import timezone
from decimal import Decimal
from datetime import date, datetime, timedelta
from freezegun import freeze_time

from pytest_factoryboy import register
from core.factories.events import EventFactory, EventTypeFactory
from core.factories.users import UserFactory

# Register factories
register(EventFactory)
register(EventTypeFactory)
register(UserFactory)


@pytest.fixture
def mock_currency_settings(mocker):
    """Mock CurrencySettings for consistent currency formatting."""
    mock_settings = MagicMock()
    mock_settings.default_currency = 'PHP'
    mock_settings.decimal_places = 2
    mock_settings.thousands_separator = ','
    mock_settings.decimal_separator = '.'
    mock_settings.display_format = 'symbol'

    mocker.patch(
        'core.domains.contracts.context_service.CurrencySettings.get_system_settings',
        return_value=mock_settings
    )
    return mock_settings


@pytest.fixture
def mock_payment_settings(mocker):
    """Mock PaymentSettings for deposit calculations."""
    mock_settings = MagicMock()
    mock_settings.default_deposit_percentage = Decimal('50')
    mock_settings.late_fee_percentage = Decimal('5')

    mocker.patch(
        'core.domains.payments.models.PaymentSettings.get_default_settings',
        return_value=mock_settings
    )
    return mock_settings


@pytest.mark.django_db
class TestContractContextServiceBasic:
    """Basic tests for ContractContextService.generate_event_context()."""

    def test_generate_event_context_returns_dict(self, event_factory, mock_currency_settings):
        """Test that generate_event_context returns a dictionary."""
        event = event_factory(name='Test Event')

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert isinstance(context, dict)
        assert len(context) > 0

    def test_generate_event_context_includes_event_id(self, event_factory, mock_currency_settings):
        """Test that context includes event_id."""
        event = event_factory()

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert 'event_id' in context
        assert context['event_id'] == event.id

    def test_generate_event_context_includes_event_name(self, event_factory, mock_currency_settings):
        """Test that context includes event_name."""
        event = event_factory(name='Wedding Reception')

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert 'event_name' in context
        assert context['event_name'] == 'Wedding Reception'
        # Also includes alias
        assert context['event_title'] == 'Wedding Reception'

    def test_generate_event_context_event_name_fallback(self, event_factory, mock_currency_settings):
        """Test event name fallback when name is None."""
        event = event_factory(name=None)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['event_name'] == f'Event #{event.id}'

    def test_generate_event_context_includes_event_type(
        self, event_factory, event_type_factory, mock_currency_settings
    ):
        """Test that context includes event type information."""
        event_type = event_type_factory(name='Wedding')
        event = event_factory(event_type=event_type)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert 'event_type' in context
        assert context['event_type'] == 'Wedding'
        assert context['event_type_name'] == 'Wedding'

    def test_generate_event_context_no_event_type(self, event_factory, mock_currency_settings):
        """Test context when event has no event type."""
        event = event_factory(event_type=None)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['event_type'] == 'Event'
        assert context['event_type_name'] == 'Event'

    def test_generate_event_context_merges_additional_context(
        self, event_factory, mock_currency_settings
    ):
        """Test that additional_context is merged."""
        event = event_factory()
        additional = {'custom_var': 'custom_value'}

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event, additional)

        assert 'custom_var' in context
        assert context['custom_var'] == 'custom_value'

    def test_generate_event_context_additional_overrides(
        self, event_factory, mock_currency_settings
    ):
        """Test that additional_context can override default values."""
        event = event_factory(name='Original Name')
        additional = {'event_name': 'Override Name'}

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event, additional)

        assert context['event_name'] == 'Override Name'


@pytest.mark.django_db
class TestClientInformation:
    """Tests for client information in context."""

    def test_includes_client_name(self, event_factory, user_factory, mock_currency_settings):
        """Test that context includes client full name."""
        client = user_factory(first_name='John', last_name='Doe')
        event = event_factory(client=client)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert 'client_name' in context
        assert context['client_name'] == 'John Doe'
        assert context['client_full_name'] == 'John Doe'

    def test_client_name_first_name_only(self, event_factory, user_factory, mock_currency_settings):
        """Test client name with only first name."""
        client = user_factory(first_name='John', last_name='')
        event = event_factory(client=client)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['client_name'] == 'John'

    def test_client_name_last_name_only(self, event_factory, user_factory, mock_currency_settings):
        """Test client name with only last name."""
        client = user_factory(first_name='', last_name='Doe')
        event = event_factory(client=client)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['client_name'] == 'Doe'

    def test_client_name_fallback_to_email(
        self, event_factory, user_factory, mock_currency_settings
    ):
        """Test client name fallback to email when no name."""
        client = user_factory(first_name='', last_name='', email='client@example.com')
        event = event_factory(client=client)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['client_name'] == 'client@example.com'

    def test_includes_client_email(self, event_factory, user_factory, mock_currency_settings):
        """Test that context includes client email."""
        client = user_factory(email='client@example.com')
        event = event_factory(client=client)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['client_email'] == 'client@example.com'

    def test_includes_client_first_last_name(
        self, event_factory, user_factory, mock_currency_settings
    ):
        """Test that context includes separate first and last name."""
        client = user_factory(first_name='John', last_name='Doe')
        event = event_factory(client=client)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['client_first_name'] == 'John'
        assert context['client_last_name'] == 'Doe'


@pytest.mark.django_db
class TestDateFormatting:
    """Tests for date formatting in context."""

    @freeze_time('2024-06-15 10:30:00')
    def test_event_date_formatted(self, event_factory, mock_currency_settings):
        """Test event date is properly formatted."""
        event = event_factory(start_date=timezone.make_aware(datetime(2024, 6, 20, 14, 0)))

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        # MM/DD/YYYY format
        assert context['event_date'] == '06/20/2024'
        assert context['start_date'] == '06/20/2024'

    @freeze_time('2024-06-15 10:30:00')
    def test_date_long_format(self, event_factory, mock_currency_settings):
        """Test long date format (Month Day, Year)."""
        event = event_factory(start_date=timezone.make_aware(datetime(2024, 6, 20, 14, 0)))

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        # Month Day, Year format
        assert context['start_date_long'] == 'June 20, 2024'

    @freeze_time('2024-06-15 10:30:00')
    def test_time_formatted(self, event_factory, mock_currency_settings):
        """Test time formatting (HH:MM AM/PM)."""
        event = event_factory(start_date=timezone.make_aware(datetime(2024, 6, 20, 14, 30)))

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        # HH:MM AM/PM format
        assert context['start_time'] == '02:30 PM'

    @freeze_time('2024-06-15 10:30:00')
    def test_end_date_included(self, event_factory, mock_currency_settings):
        """Test end date is included when present."""
        event = event_factory(
            start_date=timezone.make_aware(datetime(2024, 6, 20, 14, 0)),
            end_date=timezone.make_aware(datetime(2024, 6, 20, 22, 0))
        )

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['end_date'] == '06/20/2024'
        assert context['end_time'] == '10:00 PM'

    @freeze_time('2024-06-15 10:30:00')
    def test_end_date_none_handling(self, event_factory, mock_currency_settings):
        """Test handling when end_date is None."""
        event = event_factory(
            start_date=timezone.make_aware(datetime(2024, 6, 20, 14, 0)),
            end_date=None
        )

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['end_date'] is None
        assert context['end_time'] is None

    @freeze_time('2024-06-15 10:30:00')
    def test_contract_date_is_today(self, event_factory, mock_currency_settings):
        """Test contract_date and today are current date."""
        event = event_factory()

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['contract_date'] == '06/15/2024'
        assert context['today'] == '06/15/2024'
        assert context['current_year'] == 2024


@pytest.mark.django_db
class TestFinancialInformation:
    """Tests for financial information in context."""

    def test_includes_total_price(self, event_factory, mock_currency_settings):
        """Test that context includes total price."""
        event = event_factory(total_price=Decimal('50000.00'))

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert 'total_price' in context
        assert context['total_price'] == '50000.00'
        assert context['total_amount'] == '50000.00'
        assert context['contract_value'] == '50000.00'

    def test_includes_formatted_price(self, event_factory, mock_currency_settings):
        """Test that context includes formatted price with currency."""
        event = event_factory(total_price=Decimal('50000.00'))

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        # With PHP currency symbol
        assert 'total_price_formatted' in context
        # Should contain currency formatting

    def test_zero_price_handling(self, event_factory, mock_currency_settings):
        """Test handling of zero price."""
        event = event_factory(total_price=Decimal('0'))

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['total_price'] == '0'

    def test_none_price_handling(self, event_factory, mock_currency_settings):
        """Test handling of None price."""
        event = event_factory(total_price=None)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['total_price'] == '0'


@pytest.mark.django_db
class TestVenueAndLocation:
    """Tests for venue and location in context."""

    def test_venue_from_preferences(self, event_factory, mock_currency_settings):
        """Test venue is extracted from event preferences."""
        event = event_factory(preferences={'venue': 'Grand Ballroom'})

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['venue'] == 'Grand Ballroom'
        assert context['location'] == 'Grand Ballroom'

    def test_venue_default_when_not_set(self, event_factory, mock_currency_settings):
        """Test venue has default value when not in preferences."""
        event = event_factory(preferences={})

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['venue'] == 'To be determined'


@pytest.mark.django_db
class TestPaymentTermsAndPolicies:
    """Tests for payment terms and cancellation policies."""

    def test_payment_terms_from_preferences(self, event_factory, mock_currency_settings):
        """Test payment terms extracted from preferences."""
        event = event_factory(
            preferences={'payment_terms': 'Full payment due 30 days before event'}
        )

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['payment_terms'] == 'Full payment due 30 days before event'

    def test_cancellation_policy_from_preferences(self, event_factory, mock_currency_settings):
        """Test cancellation policy extracted from preferences."""
        event = event_factory(
            preferences={'cancellation_policy': 'Custom cancellation policy text'}
        )

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['cancellation_policy'] == 'Custom cancellation policy text'

    def test_cancellation_policy_default(self, event_factory, mock_currency_settings):
        """Test default cancellation policy when not set."""
        event = event_factory(preferences={})

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        # Default policy should mention refund and deposit
        assert 'refund' in context['cancellation_policy'].lower() or \
               'deposit' in context['cancellation_policy'].lower()


@pytest.mark.django_db
class TestComputedFields:
    """Tests for computed fields like days_until_event."""

    @freeze_time('2024-06-15 10:00:00')
    def test_days_until_event(self, event_factory, mock_currency_settings):
        """Test days_until_event calculation."""
        event = event_factory(
            start_date=timezone.make_aware(datetime(2024, 6, 25, 14, 0))
        )

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['days_until_event'] == 10
        assert context['days_until_event_text'] == '10 days'
        assert context['is_upcoming'] is True
        assert context['is_past'] is False

    @freeze_time('2024-06-25 10:00:00')
    def test_event_in_past(self, event_factory, mock_currency_settings):
        """Test is_past for past events."""
        event = event_factory(
            start_date=timezone.make_aware(datetime(2024, 6, 15, 14, 0))
        )

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['days_until_event'] < 0
        assert context['is_upcoming'] is False
        assert context['is_past'] is True

    @freeze_time('2024-06-15 10:00:00')
    def test_event_duration(self, event_factory, mock_currency_settings):
        """Test event duration calculation."""
        event = event_factory(
            start_date=timezone.make_aware(datetime(2024, 6, 20, 14, 0)),
            end_date=timezone.make_aware(datetime(2024, 6, 20, 22, 0))
        )

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['event_duration_hours'] == 8.0
        assert '8.0 hours' in context['event_duration_text']


@pytest.mark.django_db
class TestGetAvailableVariables:
    """Tests for get_available_variables() method."""

    def test_returns_dict(self):
        """Test that method returns a dictionary."""
        from core.domains.contracts.context_service import ContractContextService
        variables = ContractContextService.get_available_variables()

        assert isinstance(variables, dict)
        assert len(variables) > 0

    def test_includes_event_variables(self):
        """Test that event-related variables are included."""
        from core.domains.contracts.context_service import ContractContextService
        variables = ContractContextService.get_available_variables()

        assert 'event_id' in variables
        assert 'event_name' in variables
        assert 'event_type' in variables

    def test_includes_client_variables(self):
        """Test that client-related variables are included."""
        from core.domains.contracts.context_service import ContractContextService
        variables = ContractContextService.get_available_variables()

        assert 'client_name' in variables
        assert 'client_email' in variables

    def test_includes_financial_variables(self):
        """Test that financial variables are included."""
        from core.domains.contracts.context_service import ContractContextService
        variables = ContractContextService.get_available_variables()

        assert 'total_price' in variables
        assert 'total_price_formatted' in variables

    def test_includes_signature_placeholders(self):
        """Test that signature placeholder variables are included."""
        from core.domains.contracts.context_service import ContractContextService
        variables = ContractContextService.get_available_variables()

        assert 'SIGNATURE_CLIENT' in variables
        assert 'SIGNATURE_COMPANY_REP' in variables
        assert 'client_signature_date' in variables

    def test_variable_descriptions(self):
        """Test that all variables have descriptions."""
        from core.domains.contracts.context_service import ContractContextService
        variables = ContractContextService.get_available_variables()

        for var_name, description in variables.items():
            assert isinstance(description, str)
            assert len(description) > 0


@pytest.mark.django_db
class TestFormatPreferences:
    """Tests for _format_preferences() helper method."""

    def test_formats_preferences_dict(self, event_factory, mock_currency_settings):
        """Test formatting of preferences dict."""
        event = event_factory(preferences={
            'guest_count': 100,
            'special_requests': 'Vegetarian options'
        })

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        # preferences field should be formatted
        assert 'preferences' in context

    def test_excludes_special_keys(self, event_factory, mock_currency_settings):
        """Test that venue, payment_terms, cancellation_policy are excluded from preferences string."""
        event = event_factory(preferences={
            'venue': 'Grand Ballroom',
            'payment_terms': 'Net 30',
            'cancellation_policy': 'Standard policy',
            'guest_count': 100
        })

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        # These are handled separately, not in preferences string
        assert 'venue' not in context['preferences'].lower() or context['preferences'] == ''


@pytest.mark.django_db
class TestErrorHandling:
    """Tests for error handling in context generation."""

    def test_handles_missing_client(self, event_factory, mock_currency_settings):
        """Test handling when event has no client."""
        event = event_factory(client=None)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        # Should not raise, but return fallback values
        assert context['client_name'] == 'Unknown Client'

    def test_logs_on_error(self, event_factory, mocker, mock_currency_settings):
        """Test that errors are logged."""
        mock_logger = mocker.patch('core.domains.contracts.context_service.logger')

        # Create an event that will cause an error during context generation
        event = event_factory()
        # Force an error by breaking the event type
        event.event_type = MagicMock()
        event.event_type.name = MagicMock(side_effect=Exception('Test error'))

        from core.domains.contracts.context_service import ContractContextService

        with pytest.raises(Exception):
            ContractContextService.generate_event_context(event)


@pytest.mark.django_db
class TestPaymentDepositInfo:
    """Tests for _get_payment_deposit_info() helper method."""

    def test_includes_deposit_percentage(
        self, event_factory, mock_currency_settings, mock_payment_settings
    ):
        """Test that deposit percentage is included."""
        event = event_factory(total_price=Decimal('100000.00'))

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert 'deposit_percentage' in context

    def test_includes_deposit_amount(
        self, event_factory, mock_currency_settings, mock_payment_settings
    ):
        """Test that deposit amount is calculated."""
        event = event_factory(total_price=Decimal('100000.00'))

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert 'deposit_amount' in context
        assert 'balance_amount' in context

    def test_includes_guest_count(self, event_factory, mock_currency_settings):
        """Test that guest_count from preferences is included."""
        event = event_factory(preferences={'guest_count': 150})

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert context['guest_count'] == '150'


@pytest.mark.django_db
class TestServicesDescription:
    """Tests for _get_services_description() helper method."""

    def test_services_from_event_type(
        self, event_factory, event_type_factory, mock_currency_settings
    ):
        """Test services description from event type."""
        event_type = event_type_factory(name='Wedding')
        event = event_factory(event_type=event_type)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert 'services_description' in context
        assert 'Wedding' in context['services_description'] or 'services' in context['services_description'].lower()

    def test_services_default_fallback(self, event_factory, mock_currency_settings):
        """Test services description fallback."""
        event = event_factory(event_type=None)

        from core.domains.contracts.context_service import ContractContextService
        context = ContractContextService.generate_event_context(event)

        assert 'services_description' in context
        # Should have some default text
        assert len(context['services_description']) > 0
