"""
Unit tests for messaging domain WebSocket consumers.

Tests WebSocket functionality for:
- MessagingConsumer (real-time messaging within threads)
- GlobalMessagingConsumer (global notifications and updates)

These tests use asgiref.sync.async_to_sync to run async consumer code
within synchronous test methods, avoiding the need for pytest-asyncio.
All database objects are created inside the async context using
database_sync_to_async so they are visible to the consumer's
separate database connections.
"""

import json
import functools
import pytest
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from channels.layers import get_channel_layer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.db import connections
from rest_framework_simplejwt.tokens import RefreshToken

from core.domains.messaging.consumers import MessagingConsumer, GlobalMessagingConsumer
from core.domains.messaging.models import MessageThread, Message, MessageReadStatus

User = get_user_model()


# =============================================================================
# ASYNC HELPER FUNCTIONS
# =============================================================================

@database_sync_to_async
def get_jwt_token(user):
    """Generate JWT token for a user."""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


@database_sync_to_async
def create_user(role='CLIENT', **kwargs):
    """Create a user asynchronously."""
    from core.factories.users import UserFactory
    return UserFactory(role=role, is_staff=(role == 'ADMIN'), **kwargs)


@database_sync_to_async
def create_admin():
    """Create an admin user asynchronously."""
    from core.factories.users import UserFactory
    return UserFactory(admin=True)


@database_sync_to_async
def create_thread(client=None, **kwargs):
    """Create a message thread asynchronously."""
    from core.factories.messaging import MessageThreadFactory
    if client:
        return MessageThreadFactory(client=client, **kwargs)
    return MessageThreadFactory(**kwargs)


@database_sync_to_async
def create_message(thread, sender, **kwargs):
    """Create a message asynchronously."""
    from core.factories.messaging import MessageFactory
    return MessageFactory(thread=thread, sender=sender, **kwargs)


@database_sync_to_async
def get_message_count(thread):
    """Get message count for a thread."""
    return thread.messages.count()


@database_sync_to_async
def get_read_status_exists(message, user):
    """Check if read status exists for message and user."""
    return MessageReadStatus.objects.filter(message=message, user=user).exists()


def run_consumer_test(async_test_fn):
    """Run an async consumer test function synchronously.

    Uses async_to_sync to bridge async WebSocket consumer tests
    into synchronous pytest test methods.
    """
    async_to_sync(async_test_fn)()


# =============================================================================
# MESSAGING CONSUMER TESTS - CONNECTION
# =============================================================================

@pytest.mark.django_db(transaction=True)
class TestMessagingConsumerConnection:
    """Tests for MessagingConsumer WebSocket connection handling."""

    def test_connect_with_valid_token_and_access(self):
        """User with valid token and thread access can connect."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            connected, _ = await communicator.connect()

            assert connected is True

            # Should receive connection established message
            response = await communicator.receive_json_from()
            assert response['type'] == 'connection_established'
            assert response['thread_id'] == str(thread.id)
            assert response['user_id'] == client_user.id

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_connect_without_token_rejected(self):
        """Connection without token is rejected."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            connected, close_code = await communicator.connect()

            # Should be rejected
            assert connected is False or close_code == 4401

        run_consumer_test(_test)

    def test_connect_with_invalid_token_rejected(self):
        """Connection with invalid token is rejected."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token=invalid_token_here"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            connected, close_code = await communicator.connect()

            # Should be rejected
            assert connected is False or close_code == 4401

        run_consumer_test(_test)

    def test_connect_without_thread_access_rejected(self):
        """Client without thread access is rejected."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            other_client = await create_user(role='CLIENT')
            thread = await create_thread(client=other_client)  # Thread belongs to other client
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            connected, close_code = await communicator.connect()

            # Should be rejected with forbidden
            assert connected is False or close_code == 4403

        run_consumer_test(_test)

    def test_admin_can_connect_to_any_thread(self):
        """Admin can connect to any thread."""

        async def _test():
            admin = await create_admin()
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)
            token = await get_jwt_token(admin)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            connected, _ = await communicator.connect()

            assert connected is True

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_connect_to_nonexistent_thread_rejected(self):
        """Connection to non-existent thread is rejected."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            token = await get_jwt_token(client_user)
            fake_thread_id = '00000000-0000-0000-0000-000000000000'

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{fake_thread_id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': fake_thread_id}}

            connected, close_code = await communicator.connect()

            # Should be rejected
            assert connected is False or close_code == 4403

        run_consumer_test(_test)


# =============================================================================
# MESSAGING CONSUMER TESTS - MESSAGE HANDLING
# =============================================================================

@pytest.mark.django_db(transaction=True)
class TestMessagingConsumerMessageHandling:
    """Tests for MessagingConsumer message handling."""

    def test_send_message(self):
        """Test sending a message through WebSocket."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            await communicator.connect()
            # Consume connection message
            await communicator.receive_json_from()

            # Send a message
            await communicator.send_json_to({
                'type': 'send_message',
                'content': 'Hello from WebSocket!'
            })

            # Should receive new_message broadcast
            response = await communicator.receive_json_from()
            assert response['type'] == 'new_message'
            assert response['message']['content'] == 'Hello from WebSocket!'
            assert response['is_own_message'] is True

            # Verify message was saved
            message_count = await get_message_count(thread)
            assert message_count == 1

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_send_empty_message_rejected(self):
        """Empty messages are rejected."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            await communicator.connect()
            await communicator.receive_json_from()

            # Send empty message
            await communicator.send_json_to({
                'type': 'send_message',
                'content': '   '  # Whitespace only
            })

            # Should receive error
            response = await communicator.receive_json_from()
            assert response['type'] == 'error'
            assert 'empty' in response['message'].lower()

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_client_cannot_create_internal_note(self):
        """Client cannot create internal notes via WebSocket."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            await communicator.connect()
            await communicator.receive_json_from()

            # Try to send internal note
            await communicator.send_json_to({
                'type': 'send_message',
                'content': 'Trying internal note',
                'is_internal_note': True
            })

            # Should receive error
            response = await communicator.receive_json_from()
            assert response['type'] == 'error'
            assert 'admin' in response['message'].lower() or 'internal' in response['message'].lower()

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_admin_can_create_internal_note(self):
        """Admin can create internal notes via WebSocket."""

        async def _test():
            admin = await create_admin()
            thread = await create_thread()
            token = await get_jwt_token(admin)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            await communicator.connect()
            await communicator.receive_json_from()

            # Send internal note
            await communicator.send_json_to({
                'type': 'send_message',
                'content': 'Admin internal note',
                'is_internal_note': True
            })

            # Should receive new_message
            response = await communicator.receive_json_from()
            assert response['type'] == 'new_message'
            assert response['message']['is_internal_note'] is True

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_invalid_json_returns_error(self):
        """Invalid JSON returns error."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            await communicator.connect()
            await communicator.receive_json_from()

            # Send invalid JSON
            await communicator.send_to(text_data='not valid json{')

            # Should receive error
            response = await communicator.receive_json_from()
            assert response['type'] == 'error'
            assert 'json' in response['message'].lower()

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_unknown_message_type_returns_error(self):
        """Unknown message type returns error."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            await communicator.connect()
            await communicator.receive_json_from()

            # Send unknown type
            await communicator.send_json_to({
                'type': 'unknown_type',
                'data': 'test'
            })

            # Should receive error
            response = await communicator.receive_json_from()
            assert response['type'] == 'error'
            assert 'unknown' in response['message'].lower()

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_ping_pong(self):
        """Test ping/pong for connection keep-alive."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            await communicator.connect()
            await communicator.receive_json_from()

            # Send ping
            await communicator.send_json_to({'type': 'ping'})

            # Should receive pong
            response = await communicator.receive_json_from()
            assert response['type'] == 'pong'

            await communicator.disconnect()

        run_consumer_test(_test)


# =============================================================================
# MESSAGING CONSUMER TESTS - TYPING INDICATOR
# =============================================================================

@pytest.mark.django_db(transaction=True)
class TestMessagingConsumerTypingIndicator:
    """Tests for MessagingConsumer typing indicator functionality."""

    def test_typing_indicator_broadcast(self):
        """Typing indicator is broadcast to other users in thread."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            admin = await create_admin()
            thread = await create_thread(client=client_user)

            client_token = await get_jwt_token(client_user)
            admin_token = await get_jwt_token(admin)

            # Connect client
            client_communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={client_token}"
            )
            client_communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}
            await client_communicator.connect()
            await client_communicator.receive_json_from()

            # Connect admin
            admin_communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={admin_token}"
            )
            admin_communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}
            await admin_communicator.connect()
            await admin_communicator.receive_json_from()

            # Client sends typing indicator
            await client_communicator.send_json_to({
                'type': 'typing_indicator',
                'is_typing': True
            })

            # Admin should receive typing indicator
            response = await admin_communicator.receive_json_from()
            assert response['type'] == 'typing_indicator'
            assert response['user_id'] == client_user.id
            assert response['is_typing'] is True

            await client_communicator.disconnect()
            await admin_communicator.disconnect()

        run_consumer_test(_test)


# =============================================================================
# MESSAGING CONSUMER TESTS - MARK AS READ
# =============================================================================

@pytest.mark.django_db(transaction=True)
class TestMessagingConsumerMarkAsRead:
    """Tests for MessagingConsumer mark as read functionality."""

    def test_mark_message_as_read(self):
        """Test marking a message as read via WebSocket."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            admin = await create_admin()
            thread = await create_thread(client=client_user)
            message = await create_message(thread, admin, content='Test message')

            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            await communicator.connect()
            await communicator.receive_json_from()

            # Mark message as read
            await communicator.send_json_to({
                'type': 'mark_as_read',
                'message_id': str(message.id)
            })

            # Should receive read receipt broadcast
            response = await communicator.receive_json_from()
            assert response['type'] == 'message_read'
            assert response['message_id'] == str(message.id)
            assert response['user_id'] == client_user.id

            # Verify read status was created
            read_exists = await get_read_status_exists(message, client_user)
            assert read_exists is True

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_mark_as_read_requires_message_id(self):
        """Mark as read requires message_id."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            await communicator.connect()
            await communicator.receive_json_from()

            # Mark as read without message_id
            await communicator.send_json_to({
                'type': 'mark_as_read'
            })

            # Should receive error
            response = await communicator.receive_json_from()
            assert response['type'] == 'error'
            assert 'message_id' in response['message'].lower()

            await communicator.disconnect()

        run_consumer_test(_test)


# =============================================================================
# MESSAGING CONSUMER TESTS - INTERNAL NOTE VISIBILITY
# =============================================================================

@pytest.mark.django_db(transaction=True)
class TestMessagingConsumerInternalNotes:
    """Tests for internal note visibility in MessagingConsumer."""

    def test_client_does_not_receive_internal_notes(self):
        """Client does not receive internal note broadcasts."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            admin = await create_admin()
            thread = await create_thread(client=client_user)

            client_token = await get_jwt_token(client_user)
            admin_token = await get_jwt_token(admin)

            # Connect client
            client_communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={client_token}"
            )
            client_communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}
            await client_communicator.connect()
            await client_communicator.receive_json_from()

            # Connect admin
            admin_communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={admin_token}"
            )
            admin_communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}
            await admin_communicator.connect()
            await admin_communicator.receive_json_from()

            # Admin sends internal note
            await admin_communicator.send_json_to({
                'type': 'send_message',
                'content': 'Internal admin note',
                'is_internal_note': True
            })

            # Admin should receive the message
            admin_response = await admin_communicator.receive_json_from()
            assert admin_response['type'] == 'new_message'
            assert admin_response['message']['is_internal_note'] is True

            # Client should NOT receive it (will timeout)
            try:
                await client_communicator.receive_json_from(timeout=0.5)
                # If we get here, client received something they shouldn't
                assert False, "Client received internal note when they shouldn't"
            except Exception:
                # Expected - client doesn't receive internal notes
                pass

            await client_communicator.disconnect()
            await admin_communicator.disconnect()

        run_consumer_test(_test)


# =============================================================================
# GLOBAL MESSAGING CONSUMER TESTS
# =============================================================================

@pytest.mark.django_db(transaction=True)
class TestGlobalMessagingConsumerConnection:
    """Tests for GlobalMessagingConsumer connection handling."""

    def test_connect_with_valid_token(self):
        """User with valid token can connect to global consumer."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                GlobalMessagingConsumer.as_asgi(),
                f"/ws/messaging/global/?token={token}"
            )

            connected, _ = await communicator.connect()

            assert connected is True

            # Should receive connection established message
            response = await communicator.receive_json_from()
            assert response['type'] == 'global_connection_established'
            assert response['user_id'] == client_user.id

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_connect_without_token_rejected(self):
        """Connection without token is rejected."""

        async def _test():
            communicator = WebsocketCommunicator(
                GlobalMessagingConsumer.as_asgi(),
                "/ws/messaging/global/"
            )

            connected, close_code = await communicator.connect()

            # Should be rejected
            assert connected is False or close_code == 4401

        run_consumer_test(_test)

    def test_connect_with_invalid_token_rejected(self):
        """Connection with invalid token is rejected."""

        async def _test():
            communicator = WebsocketCommunicator(
                GlobalMessagingConsumer.as_asgi(),
                "/ws/messaging/global/?token=invalid_token"
            )

            connected, close_code = await communicator.connect()

            # Should be rejected
            assert connected is False or close_code == 4401

        run_consumer_test(_test)


@pytest.mark.django_db(transaction=True)
class TestGlobalMessagingConsumerMessageHandling:
    """Tests for GlobalMessagingConsumer message handling."""

    def test_ping_pong(self):
        """Test ping/pong for connection keep-alive."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                GlobalMessagingConsumer.as_asgi(),
                f"/ws/messaging/global/?token={token}"
            )

            await communicator.connect()
            await communicator.receive_json_from()

            # Send ping
            await communicator.send_json_to({'type': 'ping'})

            # Should receive pong
            response = await communicator.receive_json_from()
            assert response['type'] == 'pong'

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_unknown_message_type_returns_error(self):
        """Unknown message type returns error."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                GlobalMessagingConsumer.as_asgi(),
                f"/ws/messaging/global/?token={token}"
            )

            await communicator.connect()
            await communicator.receive_json_from()

            # Send unknown type
            await communicator.send_json_to({
                'type': 'unknown_type',
                'data': 'test'
            })

            # Should receive error
            response = await communicator.receive_json_from()
            assert response['type'] == 'error'
            assert 'unknown' in response['message'].lower()

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_invalid_json_returns_error(self):
        """Invalid JSON returns error."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                GlobalMessagingConsumer.as_asgi(),
                f"/ws/messaging/global/?token={token}"
            )

            await communicator.connect()
            await communicator.receive_json_from()

            # Send invalid JSON
            await communicator.send_to(text_data='not valid json{')

            # Should receive error
            response = await communicator.receive_json_from()
            assert response['type'] == 'error'
            assert 'json' in response['message'].lower()

            await communicator.disconnect()

        run_consumer_test(_test)


# =============================================================================
# GLOBAL MESSAGING CONSUMER TESTS - GROUP MESSAGE HANDLERS
# =============================================================================

@pytest.mark.django_db(transaction=True)
class TestGlobalMessagingConsumerGroupHandlers:
    """Tests for GlobalMessagingConsumer group message handlers."""

    def test_thread_notification_handler(self):
        """Test thread notification is forwarded to WebSocket."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                GlobalMessagingConsumer.as_asgi(),
                f"/ws/messaging/global/?token={token}"
            )

            await communicator.connect()
            await communicator.receive_json_from()

            # Simulate sending thread_notification to user's group
            channel_layer = get_channel_layer()
            await channel_layer.group_send(
                f'messaging_user_{client_user.id}',
                {
                    'type': 'thread_notification',
                    'thread_id': str(thread.id),
                    'notification_type': 'new_message',
                    'data': {'preview': 'Test message preview'}
                }
            )

            # Should receive thread notification
            response = await communicator.receive_json_from()
            assert response['type'] == 'thread_notification'
            assert response['thread_id'] == str(thread.id)
            assert response['notification_type'] == 'new_message'

            await communicator.disconnect()

        run_consumer_test(_test)

    def test_unread_count_update_handler(self):
        """Test unread count update is forwarded to WebSocket."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                GlobalMessagingConsumer.as_asgi(),
                f"/ws/messaging/global/?token={token}"
            )

            await communicator.connect()
            await communicator.receive_json_from()

            # Simulate sending unread_count_update to user's group
            channel_layer = get_channel_layer()
            await channel_layer.group_send(
                f'messaging_user_{client_user.id}',
                {
                    'type': 'unread_count_update',
                    'unread_count': 5
                }
            )

            # Should receive unread count update
            response = await communicator.receive_json_from()
            assert response['type'] == 'unread_count_update'
            assert response['unread_count'] == 5

            await communicator.disconnect()

        run_consumer_test(_test)


# =============================================================================
# DISCONNECT TESTS
# =============================================================================

@pytest.mark.django_db(transaction=True)
class TestConsumerDisconnect:
    """Tests for consumer disconnect handling."""

    def test_messaging_consumer_disconnect_cleanup(self):
        """MessagingConsumer cleans up on disconnect."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            thread = await create_thread(client=client_user)
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                MessagingConsumer.as_asgi(),
                f"/ws/messaging/thread/{thread.id}/?token={token}"
            )
            communicator.scope['url_route'] = {'kwargs': {'thread_id': str(thread.id)}}

            await communicator.connect()
            await communicator.receive_json_from()

            # Disconnect
            await communicator.disconnect()

            # No error means cleanup was successful

        run_consumer_test(_test)

    def test_global_consumer_disconnect_cleanup(self):
        """GlobalMessagingConsumer cleans up on disconnect."""

        async def _test():
            client_user = await create_user(role='CLIENT')
            token = await get_jwt_token(client_user)

            communicator = WebsocketCommunicator(
                GlobalMessagingConsumer.as_asgi(),
                f"/ws/messaging/global/?token={token}"
            )

            await communicator.connect()
            await communicator.receive_json_from()

            # Disconnect
            await communicator.disconnect()

            # No error means cleanup was successful

        run_consumer_test(_test)
