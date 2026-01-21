"""
Core fixtures and factory registrations.

This file registers all factories with pytest-factoryboy, making them
available as fixtures throughout the test suite.

After registration, factories are available as:
- user_factory (creates User instances)
- user (creates a single User)
- event_factory, event
- payment_factory, payment
- etc.
"""

import pytest
from pytest_factoryboy import register

# =============================================================================
# IMPORT FACTORIES
# =============================================================================

from core.factories.users import (
    UserFactory,
    UserProfileFactory,
    AdminInvitationFactory,
    PasswordResetTokenFactory,
    ConsentRecordFactory,
    PrivacyRequestFactory,
)
from core.factories.events import (
    EventFactory,
    EventTypeFactory,
)
from core.factories.payments import (
    PaymentFactory,
    PaymentGatewayFactory,
    PaymentMethodFactory,
    InvoiceFactory,
)
from core.factories.questionnaires import (
    QuestionnaireFactory,
    QuestionnaireFieldFactory,
    QuestionnaireResponseFactory,
)
from core.factories.products import (
    ProductCategoryFactory,
    ProductOptionFactory,
    DiscountFactory,
)


# =============================================================================
# REGISTER FACTORIES AS FIXTURES
# =============================================================================
# This makes factories available as fixtures:
# - user_factory, user
# - event_factory, event
# - payment_factory, payment
# etc.

# Users domain
register(UserFactory)
register(UserProfileFactory)
register(AdminInvitationFactory)
register(PasswordResetTokenFactory)
register(ConsentRecordFactory)
register(PrivacyRequestFactory)

# Events domain
register(EventFactory)
register(EventTypeFactory)

# Payments domain
register(PaymentFactory)
register(PaymentGatewayFactory)
register(PaymentMethodFactory)
register(InvoiceFactory)

# Questionnaires domain
register(QuestionnaireFactory)
register(QuestionnaireFieldFactory)
register(QuestionnaireResponseFactory)

# Products domain
register(ProductCategoryFactory)
register(ProductOptionFactory)
register(DiscountFactory)


# =============================================================================
# CONVENIENCE FIXTURES
# =============================================================================

@pytest.fixture
def admin_user(user_factory):
    """Create an admin user with full permissions."""
    return user_factory(admin=True)


@pytest.fixture
def client_user(user_factory):
    """Create a client user."""
    return user_factory(role='CLIENT')


@pytest.fixture
def superuser(user_factory):
    """Create a superuser."""
    return user_factory(superuser=True)


@pytest.fixture
def stripe_gateway(payment_gateway_factory):
    """Create a configured Stripe payment gateway."""
    return payment_gateway_factory(stripe=True)


@pytest.fixture
def confirmed_event(event_factory, client_user):
    """Create a confirmed event with a client."""
    return event_factory(
        client=client_user,
        confirmed=True
    )


@pytest.fixture
def paid_event(event_factory, client_user):
    """Create a fully paid event."""
    return event_factory(
        client=client_user,
        confirmed=True,
        paid=True
    )


@pytest.fixture
def completed_payment(payment_factory, confirmed_event):
    """Create a completed payment for an event."""
    return payment_factory(
        event=confirmed_event,
        completed=True
    )


@pytest.fixture
def issued_invoice(invoice_factory, confirmed_event):
    """Create an issued invoice for an event."""
    return invoice_factory(
        event=confirmed_event,
        issued=True
    )
