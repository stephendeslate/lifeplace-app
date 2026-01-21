"""
Root-level pytest configuration and fixtures.

This file is automatically loaded by pytest and provides:
- Database configuration
- Common fixtures available to all tests
- Plugin configuration
"""

import pytest
from django.conf import settings


# =============================================================================
# DJANGO SETTINGS OVERRIDES (applied before test collection)
# =============================================================================

def pytest_configure():
    """
    Configure Django settings for testing.
    This runs before any test collection or setup.
    """
    # Use local memory cache for all cache backends to avoid Redis dependency
    # The actual settings.py defines: default, sessions, analytics
    settings.CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'default-cache',
        },
        'sessions': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'sessions-cache',
        },
        'analytics': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'analytics-cache',
        },
    }

    # Use database-backed sessions instead of cache
    settings.SESSION_ENGINE = 'django.contrib.sessions.backends.db'

    # Celery eager mode
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True

    # Disable Channels layer for testing
    settings.CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        }
    }


# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

# Note: We don't override django_db_setup - pytest-django handles this
# automatically based on DJANGO_SETTINGS_MODULE. The test database will
# be created from the existing PostgreSQL configuration.
#
# If you need SQLite for faster tests, create a separate test settings file.


# =============================================================================
# CELERY CONFIGURATION
# =============================================================================

@pytest.fixture(autouse=True)
def celery_eager_mode(settings):
    """Force Celery tasks to execute synchronously in tests."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True


# =============================================================================
# CACHE CONFIGURATION
# =============================================================================

@pytest.fixture(autouse=True)
def use_dummy_cache(settings):
    """Use local memory cache in tests to avoid Redis dependency."""
    settings.CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'default-cache',
        },
        'sessions': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'sessions-cache',
        },
        'analytics': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'analytics-cache',
        },
    }
    settings.SESSION_ENGINE = 'django.contrib.sessions.backends.db'


@pytest.fixture
def clear_cache():
    """Explicitly clear cache when needed."""
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()


# =============================================================================
# SECURITY LOGGING MOCK
# =============================================================================

@pytest.fixture(autouse=True)
def mock_security_logging(mocker):
    """
    Mock security logging to avoid database errors when security_events table
    doesn't exist (when using --no-migrations).
    """
    # Mock the class method
    mocker.patch(
        'core.utils.security_logging.SecurityLogger.log_event',
        return_value=None
    )
    # Mock the module-level function
    mocker.patch(
        'core.utils.security_logging.log_security_event',
        return_value=None
    )
    # Mock the security_logger instance used in views
    mocker.patch.object(
        __import__('core.domains.users.views', fromlist=['security_logger']).security_logger,
        'log_security_event',
        return_value=None,
        create=True
    )


# =============================================================================
# API CLIENT FIXTURES
# =============================================================================

@pytest.fixture
def api_client():
    """Return a DRF API client instance."""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_client(api_client):
    """
    Return a factory function for creating authenticated API clients.

    Usage:
        def test_something(authenticated_client, user_factory):
            user = user_factory()
            client = authenticated_client(user=user)
            response = client.get('/api/endpoint/')
    """
    from rest_framework_simplejwt.tokens import RefreshToken

    def _get_client(user=None, role='CLIENT'):
        from core.factories.users import UserFactory

        if user is None:
            user = UserFactory(role=role, is_staff=(role == 'ADMIN'))

        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        api_client.user = user
        return api_client

    return _get_client


@pytest.fixture
def admin_client(authenticated_client):
    """Return an authenticated admin API client."""
    return authenticated_client(role='ADMIN')


@pytest.fixture
def client_user_client(authenticated_client):
    """Return an authenticated client user API client."""
    return authenticated_client(role='CLIENT')


# =============================================================================
# EXTERNAL SERVICE MOCKS
# =============================================================================

@pytest.fixture
def mock_stripe(mocker):
    """Mock Stripe PaymentIntent.create API call."""
    mock = mocker.patch('stripe.PaymentIntent.create')
    mock.return_value = mocker.Mock(
        id='pi_test_123456',
        status='succeeded',
        amount=250000,
        currency='php',
        metadata={}
    )
    return mock


@pytest.fixture
def mock_stripe_webhook(mocker):
    """Mock Stripe webhook signature verification."""
    mock = mocker.patch('stripe.Webhook.construct_event')
    return mock


@pytest.fixture
def mock_brevo_email(mocker):
    """Mock Brevo/SendinBlue email sending."""
    return mocker.patch(
        'core.domains.communications.services.CommunicationService.send_communication',
        return_value=mocker.Mock(
            id='test-record-id',
            delivery_status='SENT'
        )
    )


@pytest.fixture
def mock_expo_push(mocker):
    """Mock Expo push notifications."""
    return mocker.patch(
        'exponent_server_sdk.PushClient.publish',
        return_value=mocker.Mock(status='ok')
    )


# =============================================================================
# TIME FREEZING
# =============================================================================

@pytest.fixture
def frozen_time():
    """
    Fixture for freezing time in tests.

    Usage:
        def test_expiration(frozen_time):
            with frozen_time('2024-01-15 10:00:00'):
                # Test code here
    """
    from freezegun import freeze_time
    return freeze_time


# =============================================================================
# REQUEST FACTORY
# =============================================================================

@pytest.fixture
def request_factory():
    """Return a DRF API request factory."""
    from rest_framework.test import APIRequestFactory
    return APIRequestFactory()
