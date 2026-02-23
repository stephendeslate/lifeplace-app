"""
Unit tests for communications context service.

Tests:
- ContextType constants and choices
- CommunicationContextService (context generation, validation)
- Variable groups and metadata
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import Mock, patch

from django.core.exceptions import ValidationError
from django.utils import timezone

import pytest
from freezegun import freeze_time

from core.domains.communications.context_service import (
    REQUIRED_OBJECTS,
    VARIABLE_GROUPS,
    CommunicationContextService,
    ContextType,
)


@pytest.mark.django_db
class TestContextType:
    """Tests for ContextType constants."""

    def test_context_type_constants_exist(self):
        """Test all context type constants are defined."""
        assert hasattr(ContextType, "CLIENT")
        assert hasattr(ContextType, "EVENT")
        assert hasattr(ContextType, "BOOKING")
        assert hasattr(ContextType, "QUOTE")
        assert hasattr(ContextType, "CONTRACT")
        assert hasattr(ContextType, "ADMIN")
        assert hasattr(ContextType, "NOTIFICATION")
        assert hasattr(ContextType, "MANUAL")
        assert hasattr(ContextType, "PAYMENT")
        assert hasattr(ContextType, "INVOICE")

    def test_context_type_choices(self):
        """Test context type choices are properly formatted."""
        choices = ContextType.CHOICES

        assert isinstance(choices, list)
        assert len(choices) >= 10

        # Each choice should be a tuple of (value, label)
        for choice in choices:
            assert isinstance(choice, tuple)
            assert len(choice) == 2

    def test_context_type_values(self):
        """Test context type values are strings."""
        assert ContextType.CLIENT == "CLIENT"
        assert ContextType.EVENT == "EVENT"
        assert ContextType.BOOKING == "BOOKING"


class TestRequiredObjects:
    """Tests for REQUIRED_OBJECTS configuration."""

    def test_client_context_requires_client(self):
        """Test CLIENT context requires client object."""
        required = REQUIRED_OBJECTS.get(ContextType.CLIENT, [])
        assert "client" in required

    def test_event_context_requires_client_and_event(self):
        """Test EVENT context requires client and event objects."""
        required = REQUIRED_OBJECTS.get(ContextType.EVENT, [])
        assert "client" in required
        assert "event" in required

    def test_booking_context_requires_booking_session(self):
        """Test BOOKING context requires booking_session."""
        required = REQUIRED_OBJECTS.get(ContextType.BOOKING, [])
        assert "booking_session" in required

    def test_payment_context_requires_payment(self):
        """Test PAYMENT context requires payment object."""
        required = REQUIRED_OBJECTS.get(ContextType.PAYMENT, [])
        assert "payment" in required

    def test_invoice_context_requires_invoice(self):
        """Test INVOICE context requires invoice object."""
        required = REQUIRED_OBJECTS.get(ContextType.INVOICE, [])
        assert "invoice" in required

    def test_manual_context_has_no_requirements(self):
        """Test MANUAL context has no required objects."""
        required = REQUIRED_OBJECTS.get(ContextType.MANUAL, [])
        assert len(required) == 0


class TestVariableGroups:
    """Tests for VARIABLE_GROUPS configuration."""

    def test_client_variable_group_exists(self):
        """Test client variable group is defined."""
        assert "client" in VARIABLE_GROUPS
        assert "variables" in VARIABLE_GROUPS["client"]

    def test_event_variable_group_exists(self):
        """Test event variable group is defined."""
        assert "event" in VARIABLE_GROUPS
        assert "variables" in VARIABLE_GROUPS["event"]

    def test_financial_variable_group_exists(self):
        """Test financial variable group is defined."""
        assert "financial" in VARIABLE_GROUPS
        assert "variables" in VARIABLE_GROUPS["financial"]

    def test_payment_variable_group_exists(self):
        """Test payment variable group is defined."""
        assert "payment" in VARIABLE_GROUPS
        assert "variables" in VARIABLE_GROUPS["payment"]

    def test_invoice_variable_group_exists(self):
        """Test invoice variable group is defined."""
        assert "invoice" in VARIABLE_GROUPS
        assert "variables" in VARIABLE_GROUPS["invoice"]

    def test_system_variable_group_exists(self):
        """Test system variable group is defined."""
        assert "system" in VARIABLE_GROUPS
        assert "variables" in VARIABLE_GROUPS["system"]

    def test_variable_groups_have_labels(self):
        """Test all variable groups have labels."""
        for group_name, group_data in VARIABLE_GROUPS.items():
            assert "label" in group_data, f"Group {group_name} missing label"

    def test_variable_groups_have_available_in(self):
        """Test all variable groups specify available_in context types."""
        for group_name, group_data in VARIABLE_GROUPS.items():
            assert "available_in" in group_data, f"Group {group_name} missing available_in"
            assert isinstance(group_data["available_in"], list)

    def test_variable_metadata_includes_description(self):
        """Test variables include description metadata."""
        for group_name, group_data in VARIABLE_GROUPS.items():
            for var_name, var_meta in group_data["variables"].items():
                assert "description" in var_meta, f"Variable {var_name} in {group_name} missing description"


@pytest.mark.django_db
class TestCommunicationContextService:
    """Tests for CommunicationContextService."""

    def test_get_required_objects(self):
        """Test get_required_objects returns correct list."""
        required = CommunicationContextService.get_required_objects(ContextType.EVENT)

        assert isinstance(required, list)
        assert "client" in required
        assert "event" in required

    def test_get_required_objects_unknown_type(self):
        """Test get_required_objects returns empty list for unknown type."""
        required = CommunicationContextService.get_required_objects("UNKNOWN_TYPE")

        assert required == []

    def test_get_variable_groups(self):
        """Test get_variable_groups returns all groups."""
        groups = CommunicationContextService.get_variable_groups()

        assert isinstance(groups, dict)
        assert "client" in groups
        assert "event" in groups
        assert "system" in groups

    def test_get_variables_for_context_type_client(self):
        """Test get_variables_for_context_type returns client variables."""
        variables = CommunicationContextService.get_variables_for_context_type(ContextType.CLIENT)

        assert isinstance(variables, dict)
        assert "client_name" in variables
        assert "site_name" in variables  # System vars available in CLIENT

    def test_get_variables_for_context_type_event(self):
        """Test get_variables_for_context_type returns event variables."""
        variables = CommunicationContextService.get_variables_for_context_type(ContextType.EVENT)

        assert "event_name" in variables
        assert "event_date" in variables
        assert "client_name" in variables

    def test_get_variables_includes_group_metadata(self):
        """Test get_variables_for_context_type includes group metadata."""
        variables = CommunicationContextService.get_variables_for_context_type(ContextType.CLIENT)

        for _var_name, var_meta in variables.items():
            assert "group" in var_meta
            assert "group_label" in var_meta
            assert "description" in var_meta

    def test_validate_required_objects_success(self, user_factory, event_factory):
        """Test validate_required_objects passes with all required objects."""
        client = user_factory()
        event = event_factory(client=client)

        # Should not raise
        CommunicationContextService.validate_required_objects(
            context_type=ContextType.EVENT,
            client=client,
            event=event,
        )

    def test_validate_required_objects_missing_raises_error(self, user_factory):
        """Test validate_required_objects raises error for missing objects."""
        client = user_factory()

        with pytest.raises(ValidationError) as exc_info:
            CommunicationContextService.validate_required_objects(
                context_type=ContextType.EVENT,
                client=client,
                # Missing event!
            )

        assert "event" in str(exc_info.value)

    def test_validate_required_objects_manual_no_requirements(self):
        """Test MANUAL context type has no required objects."""
        # Should not raise even with no objects
        CommunicationContextService.validate_required_objects(
            context_type=ContextType.MANUAL,
        )

    def test_generate_context_includes_system_variables(self, user_factory):
        """Test generate_context always includes system variables."""
        client = user_factory()

        context = CommunicationContextService.generate_context(
            context_type=ContextType.CLIENT,
            client=client,
        )

        assert "site_name" in context
        assert "current_date" in context
        assert "current_year" in context
        assert "support_email" in context

    def test_generate_context_client_variables(self, user_factory):
        """Test generate_context includes client variables."""
        client = user_factory(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )

        context = CommunicationContextService.generate_context(
            context_type=ContextType.CLIENT,
            client=client,
        )

        assert context["client_name"] == "John Doe"
        assert context["client_first_name"] == "John"
        assert context["client_last_name"] == "Doe"
        assert context["client_email"] == "john@example.com"

    def test_generate_context_event_variables(self, user_factory, event_factory):
        """Test generate_context includes event variables."""
        client = user_factory()
        event = event_factory(
            client=client,
            name="Wedding Celebration",
        )

        context = CommunicationContextService.generate_context(
            context_type=ContextType.EVENT,
            client=client,
            event=event,
        )

        assert "event_name" in context
        assert "event_type" in context
        assert "event_date" in context

    def test_generate_context_skips_validation(self, user_factory):
        """Test generate_context can skip validation."""
        client = user_factory()

        # EVENT context normally requires event, but we can skip validation
        context = CommunicationContextService.generate_context(
            context_type=ContextType.EVENT,
            client=client,
            validate=False,  # Skip validation
        )

        # Should succeed even without event
        assert "client_name" in context

    def test_generate_context_client_full_name_fallbacks(self, user_factory):
        """Test client name generation with various name combinations."""
        # Only first name
        client1 = user_factory(first_name="John", last_name="")
        context1 = CommunicationContextService.generate_context(
            context_type=ContextType.CLIENT,
            client=client1,
        )
        assert context1["client_name"] == "John"

        # Only last name
        client2 = user_factory(first_name="", last_name="Doe")
        context2 = CommunicationContextService.generate_context(
            context_type=ContextType.CLIENT,
            client=client2,
        )
        assert context2["client_name"] == "Doe"

        # No name, use email
        client3 = user_factory(first_name="", last_name="", email="anonymous@example.com")
        context3 = CommunicationContextService.generate_context(
            context_type=ContextType.CLIENT,
            client=client3,
        )
        assert "anonymous@example.com" in context3["client_name"] or "Valued Client" in context3["client_name"]

    @freeze_time("2024-06-15 10:00:00")
    def test_generate_context_event_days_until(self, user_factory, event_factory):
        """Test event context includes days until event."""
        client = user_factory()

        # Create event 10 days in the future
        future_date = timezone.now() + timedelta(days=10)
        event = event_factory(
            client=client,
            start_date=future_date,
        )

        context = CommunicationContextService.generate_context(
            context_type=ContextType.EVENT,
            client=client,
            event=event,
        )

        assert context["days_until_event"] == 10

    @patch("core.domains.payments.models.PaymentSettings.get_default_settings")
    def test_generate_context_financial_variables(self, mock_get_defaults, user_factory, event_factory):
        """Test financial context variables are generated."""
        mock_get_defaults.return_value = Mock(default_deposit_percentage=Decimal("30"))

        client = user_factory()
        event = event_factory(
            client=client,
            total_price=Decimal("10000"),
        )

        context = CommunicationContextService.generate_context(
            context_type=ContextType.BOOKING,
            client=client,
            event=event,
            validate=False,  # Skip validation for booking_session
        )

        assert "total_amount" in context
        assert "deposit_amount" in context
        assert "balance_amount" in context


@pytest.mark.django_db
class TestContextServicePrivateMethods:
    """Tests for private helper methods in CommunicationContextService."""

    def test_get_system_context(self):
        """Test _get_system_context returns required system variables."""
        context = CommunicationContextService._get_system_context()

        assert "site_name" in context
        assert "current_date" in context
        assert "current_year" in context
        assert "support_email" in context
        assert "dashboard_url" in context
        assert "login_link" in context

    @freeze_time("2024-06-15")
    def test_get_system_context_date_formatting(self):
        """Test system context date formatting."""
        context = CommunicationContextService._get_system_context()

        assert context["current_year"] == 2024
        assert "June" in context["current_date"]
        assert "15" in context["current_date"]

    def test_get_client_context(self, user_factory):
        """Test _get_client_context returns client variables."""
        client = user_factory(
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com",
        )

        context = CommunicationContextService._get_client_context(client)

        assert context["client_first_name"] == "Jane"
        assert context["client_last_name"] == "Smith"
        assert context["client_email"] == "jane@example.com"
        assert context["client_name"] == "Jane Smith"

    def test_get_client_context_with_profile(self, user_factory):
        """Test _get_client_context includes profile data."""
        client = user_factory()

        # Update the auto-created profile with test data
        # Note: UserProfile has phone and company fields but not address/city/state/zip
        profile = client.profile
        profile.phone = "+1234567890"
        profile.company = "Test Corp"
        profile.save()
        client.refresh_from_db()

        context = CommunicationContextService._get_client_context(client)

        assert context["client_phone"] == "+1234567890"
        assert context["client_company"] == "Test Corp"
        # client_address is built from profile.address/city/state/zip_code (not present on model)
        assert context["client_address"] == ""

    def test_get_event_context(self, event_factory, user_factory):
        """Test _get_event_context returns event variables."""
        client = user_factory()
        event = event_factory(
            client=client,
            name="Birthday Party",
        )

        context = CommunicationContextService._get_event_context(event)

        assert context["event_name"] == "Birthday Party"
        assert "event_type" in context
        assert "event_date" in context
        assert "event_time" in context

    def test_get_booking_context(self, user_factory, event_factory, mocker):
        """Test _get_booking_context returns booking variables."""
        client = user_factory()
        event = event_factory(client=client)

        # Mock booking session
        mock_session = Mock()
        mock_session.session_id = "abc12345-1234-5678-9012-345678901234"
        mock_session.booking_data = {
            "selected_packages": [{"name": "Premium Package"}],
            "selected_addons": ["Photography"],
        }

        context = CommunicationContextService._get_booking_context(mock_session, event)

        assert "booking_reference" in context
        assert context["selected_packages"] == [{"name": "Premium Package"}]
        assert context["selected_addons"] == ["Photography"]

    def test_get_quote_context(self, mocker):
        """Test _get_quote_context returns quote variables."""
        mock_quote = Mock()
        mock_quote.id = 123
        mock_quote.version = 2
        mock_quote.valid_until = timezone.now() + timedelta(days=30)

        context = CommunicationContextService._get_quote_context(mock_quote)

        assert context["quote_id"] == 123
        assert context["quote_version"] == 2
        assert "quote_valid_until" in context

    def test_get_contract_context(self, mocker):
        """Test _get_contract_context returns contract variables."""
        mock_contract = Mock()
        mock_contract.id = 456
        mock_contract.valid_until = timezone.now() + timedelta(days=7)
        mock_contract.payment_terms = "Net 30"
        mock_contract.cancellation_policy = "Full refund within 7 days"

        context = CommunicationContextService._get_contract_context(mock_contract)

        assert "contract_link" in context
        assert context["payment_terms"] == "Net 30"
        assert context["cancellation_policy"] == "Full refund within 7 days"

    def test_get_admin_invitation_context(self, user_factory, mocker):
        """Test _get_admin_invitation_context returns invitation variables."""
        inviter = user_factory(first_name="Admin", last_name="User")

        mock_invitation = Mock()
        mock_invitation.id = 789
        mock_invitation.first_name = "New"
        mock_invitation.last_name = "Admin"
        mock_invitation.email = "newadmin@example.com"
        mock_invitation.invited_by = inviter
        mock_invitation.expires_at = timezone.now() + timedelta(days=7)

        user = Mock()
        context = CommunicationContextService._get_admin_invitation_context(mock_invitation, user)

        assert context["first_name"] == "New"
        assert context["last_name"] == "Admin"
        assert context["email"] == "newadmin@example.com"
        assert "invitation_link" in context
        assert context["invited_by"] == "Admin User"

    def test_get_notification_context(self, user_factory, mocker):
        """Test _get_notification_context returns notification variables."""
        user = user_factory(first_name="John")

        mock_notification = Mock()
        mock_notification.title = "New Message"
        mock_notification.content = "You have a new message."
        mock_notification.action_url = "/messages/123"

        context = CommunicationContextService._get_notification_context(mock_notification, user)

        assert context["title"] == "New Message"
        assert context["content"] == "You have a new message."
        assert context["action_url"] == "/messages/123"
        assert context["recipient_name"] == "John"

    def test_get_payment_context(self, mocker):
        """Test _get_payment_context returns payment variables."""
        mock_payment = Mock()
        mock_payment.payment_number = "PAY-001"
        mock_payment.amount = Decimal("5000")
        mock_payment.currency = "PHP"
        mock_payment.status = "COMPLETED"
        mock_payment.paid_on = timezone.now()
        mock_payment.due_date = timezone.now() + timedelta(days=7)
        mock_payment.receipt_number = "REC-001"
        mock_payment.payment_method = None
        mock_payment.description = "Deposit payment"
        mock_payment.installment = None
        mock_payment.event = Mock(
            total_amount_due=Decimal("10000"),
            total_amount_paid=Decimal("5000"),
        )
        mock_payment.transactions = Mock()
        mock_payment.transactions.order_by.return_value.first.return_value = None

        def format_amount():
            return "5,000"

        mock_payment.format_amount_with_currency = format_amount
        mock_payment.get_status_display = lambda: "Completed"

        context = CommunicationContextService._get_payment_context(mock_payment)

        assert context["payment_number"] == "PAY-001"
        assert context["payment_amount"] == "5000"
        assert "payment_status" in context
        assert context["is_deposit"] is True

    def test_get_invoice_context(self, mocker):
        """Test _get_invoice_context returns invoice variables."""
        mock_invoice = Mock()
        mock_invoice.invoice_id = "INV-001"
        mock_invoice.id = 123
        mock_invoice.currency = "PHP"
        mock_invoice.issue_date = timezone.now()
        mock_invoice.due_date = timezone.now() + timedelta(days=30)
        mock_invoice.status = "ISSUED"
        mock_invoice.subtotal = Decimal("10000")
        mock_invoice.tax_amount = Decimal("1200")
        mock_invoice.total_amount = Decimal("11200")
        mock_invoice.paid_amount = Decimal("0")
        mock_invoice.remaining_amount = Decimal("11200")
        mock_invoice.payment_terms = "Due upon receipt"
        mock_invoice.line_items = Mock()
        mock_invoice.line_items.all.return_value = []
        mock_invoice.get_status_display = lambda: "Issued"

        context = CommunicationContextService._get_invoice_context(mock_invoice)

        assert context["invoice_number"] == "INV-001"
        assert context["invoice_total"] == "11200"
        assert "invoice_link" in context
        assert "invoice_pdf_link" in context
