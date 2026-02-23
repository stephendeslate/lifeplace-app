"""
Pytest configuration and fixtures for messaging domain tests.

Registers messaging factories with pytest-factoryboy, making them
available as fixtures throughout the messaging test suite.
"""

import pytest
from channels.layers import get_channel_layer
from pytest_factoryboy import register
from rest_framework_simplejwt.tokens import RefreshToken

# =============================================================================
# IMPORT FACTORIES
# =============================================================================
from core.factories.messaging import (
    MessageAttachmentFactory,
    MessageFactory,
    MessageReadStatusFactory,
    MessageThreadFactory,
)

# =============================================================================
# REGISTER FACTORIES AS FIXTURES
# =============================================================================
# This makes factories available as fixtures:
# - message_thread_factory, message_thread
# - message_factory, message
# - message_read_status_factory, message_read_status
# - message_attachment_factory, message_attachment

register(MessageThreadFactory)
register(MessageFactory)
register(MessageReadStatusFactory)
register(MessageAttachmentFactory)


# =============================================================================
# CONVENIENCE FIXTURES
# =============================================================================


@pytest.fixture
def thread_with_messages(message_thread_factory, message_factory, user_factory):
    """Create a thread with multiple messages."""
    thread = message_thread_factory()
    admin = user_factory(admin=True)

    # Create some messages
    message_factory(thread=thread, sender=thread.client, content="Client message 1")
    message_factory(thread=thread, sender=admin, content="Admin reply 1")
    message_factory(thread=thread, sender=thread.client, content="Client message 2")

    return thread


@pytest.fixture
def thread_with_internal_notes(message_thread_factory, message_factory, user_factory):
    """Create a thread with both regular messages and internal notes."""
    thread = message_thread_factory()
    admin = user_factory(admin=True)

    # Regular messages
    message_factory(thread=thread, sender=thread.client, content="Client message")
    message_factory(thread=thread, sender=admin, content="Admin reply")

    # Internal note (admin only)
    message_factory(thread=thread, sender=admin, content="Internal note - client cannot see", is_internal_note=True)

    return thread


@pytest.fixture
def urgent_thread(message_thread_factory):
    """Create an urgent thread."""
    return message_thread_factory(priority="urgent", status="active")


@pytest.fixture
def resolved_thread(message_thread_factory):
    """Create a resolved thread."""
    return message_thread_factory(status="resolved")


@pytest.fixture
def assigned_thread(message_thread_factory, user_factory):
    """Create a thread assigned to an admin."""
    admin = user_factory(admin=True)
    return message_thread_factory(assigned_admin=admin)


# =============================================================================
# WEBSOCKET TEST FIXTURES
# =============================================================================


@pytest.fixture
def get_jwt_token():
    """Factory for generating JWT tokens for users."""

    def _get_token(user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    return _get_token


@pytest.fixture
def channel_layer():
    """Get the channel layer for WebSocket tests."""
    return get_channel_layer()
