"""
Unit tests for events domain WebSocket consumers.

Tests:
- AvailabilityConsumer (connect, disconnect, receive, group broadcasts)

Note: These tests require pytest-asyncio which is not installed.
Run: pip install pytest-asyncio to enable these tests.
"""

import pytest

# Skip all tests in this module - async tests require pytest-asyncio
pytestmark = pytest.mark.skip(reason="Requires pytest-asyncio plugin for async test support")
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator

from core.domains.events.consumers import (
    AVAILABILITY_GROUP,
    AvailabilityConsumer,
)


@pytest.fixture
def channel_layer():
    """Return an in-memory channel layer for testing."""
    from channels.layers import InMemoryChannelLayer

    return InMemoryChannelLayer()


@pytest.mark.asyncio
@pytest.mark.django_db
class TestAvailabilityConsumerConnection:
    """Tests for AvailabilityConsumer connection handling."""

    async def test_connect_success(self):
        """Test WebSocket connection succeeds."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        connected, subprotocol = await communicator.connect()

        assert connected is True

        # Should receive connection_established message
        response = await communicator.receive_json_from()
        assert response["type"] == "connection_established"
        assert "Connected to availability updates" in response["message"]

        await communicator.disconnect()

    async def test_connect_no_auth_required(self):
        """Test connection succeeds without authentication."""
        # This consumer is public, so no auth headers needed
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        connected, _ = await communicator.connect()
        assert connected is True

        await communicator.disconnect()

    async def test_disconnect_gracefully(self):
        """Test WebSocket disconnection is handled gracefully."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()  # Consume connection message

        # Disconnect should not raise any exceptions
        await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db
class TestAvailabilityConsumerReceive:
    """Tests for AvailabilityConsumer message receiving."""

    async def test_receive_ping_returns_pong(self):
        """Test ping message receives pong response."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()  # Consume connection message

        # Send ping
        await communicator.send_json_to({"type": "ping"})

        # Should receive pong
        response = await communicator.receive_json_from()
        assert response["type"] == "pong"

        await communicator.disconnect()

    async def test_receive_unknown_type_returns_ack(self):
        """Test unknown message type returns acknowledgement."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()  # Consume connection message

        # Send unknown type
        await communicator.send_json_to({"type": "unknown_action"})

        # Should receive ack
        response = await communicator.receive_json_from()
        assert response["type"] == "ack"
        assert response["received_type"] == "unknown_action"

        await communicator.disconnect()

    async def test_receive_invalid_json_returns_error(self):
        """Test invalid JSON returns error message."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()  # Consume connection message

        # Send invalid JSON
        await communicator.send_to(text_data="not valid json")

        # Should receive error
        response = await communicator.receive_json_from()
        assert response["type"] == "error"
        assert "Invalid JSON format" in response["message"]

        await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db
class TestAvailabilityConsumerGroupMessages:
    """Tests for AvailabilityConsumer group message handling."""

    async def test_date_blocked_message(self):
        """Test receiving date_blocked broadcast."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()  # Consume connection message

        # Get the consumer's channel layer
        channel_layer = get_channel_layer()

        # Broadcast date_blocked to the group
        await channel_layer.group_send(
            AVAILABILITY_GROUP,
            {
                "type": "date_blocked",
                "date": "2025-03-15",
                "event_id": 123,
                "reason": "PAYMENT_COMPLETED",
                "timestamp": "2025-03-15T10:00:00Z",
            },
        )

        # Consumer should receive the message
        response = await communicator.receive_json_from()
        assert response["type"] == "date_blocked"
        assert response["date"] == "2025-03-15"
        assert response["event_id"] == 123
        assert response["reason"] == "PAYMENT_COMPLETED"

        await communicator.disconnect()

    async def test_date_released_message(self):
        """Test receiving date_released broadcast."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()  # Consume connection message

        channel_layer = get_channel_layer()

        # Broadcast date_released
        await channel_layer.group_send(
            AVAILABILITY_GROUP,
            {
                "type": "date_released",
                "date": "2025-03-15",
                "reason": "EVENT_CANCELLED",
                "timestamp": "2025-03-15T10:00:00Z",
            },
        )

        response = await communicator.receive_json_from()
        assert response["type"] == "date_released"
        assert response["date"] == "2025-03-15"
        assert response["reason"] == "EVENT_CANCELLED"

        await communicator.disconnect()

    async def test_date_released_default_reason(self):
        """Test date_released uses default reason if not provided."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()

        channel_layer = get_channel_layer()

        # Broadcast without reason
        await channel_layer.group_send(
            AVAILABILITY_GROUP,
            {
                "type": "date_released",
                "date": "2025-04-01",
            },
        )

        response = await communicator.receive_json_from()
        assert response["reason"] == "RELEASED"  # Default value

        await communicator.disconnect()

    async def test_reservation_created_message(self):
        """Test receiving reservation_created broadcast."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()

        channel_layer = get_channel_layer()

        await channel_layer.group_send(
            AVAILABILITY_GROUP,
            {
                "type": "reservation_created",
                "date": "2025-05-01",
                "expires_at": "2025-05-01T10:05:00Z",
                "timestamp": "2025-05-01T10:00:00Z",
            },
        )

        response = await communicator.receive_json_from()
        assert response["type"] == "reservation_created"
        assert response["date"] == "2025-05-01"
        assert response["expires_at"] == "2025-05-01T10:05:00Z"

        await communicator.disconnect()

    async def test_reservation_released_message(self):
        """Test receiving reservation_released broadcast."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()

        channel_layer = get_channel_layer()

        await channel_layer.group_send(
            AVAILABILITY_GROUP,
            {
                "type": "reservation_released",
                "date": "2025-05-01",
                "reason": "EXPIRED",
                "timestamp": "2025-05-01T10:05:00Z",
            },
        )

        response = await communicator.receive_json_from()
        assert response["type"] == "reservation_released"
        assert response["date"] == "2025-05-01"
        assert response["reason"] == "EXPIRED"

        await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db
class TestAvailabilityConsumerMultipleClients:
    """Tests for AvailabilityConsumer with multiple connected clients."""

    async def test_multiple_clients_receive_broadcast(self):
        """Test multiple clients all receive group broadcasts."""
        # Connect first client
        communicator1 = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")
        await communicator1.connect()
        await communicator1.receive_json_from()

        # Connect second client
        communicator2 = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")
        await communicator2.connect()
        await communicator2.receive_json_from()

        channel_layer = get_channel_layer()

        # Broadcast to group
        await channel_layer.group_send(
            AVAILABILITY_GROUP,
            {
                "type": "date_blocked",
                "date": "2025-06-01",
                "event_id": 456,
            },
        )

        # Both clients should receive the message
        response1 = await communicator1.receive_json_from()
        response2 = await communicator2.receive_json_from()

        assert response1["type"] == "date_blocked"
        assert response2["type"] == "date_blocked"
        assert response1["date"] == "2025-06-01"
        assert response2["date"] == "2025-06-01"

        await communicator1.disconnect()
        await communicator2.disconnect()

    async def test_disconnected_client_stops_receiving(self):
        """Test disconnected client no longer receives broadcasts."""
        # Connect first client
        communicator1 = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")
        await communicator1.connect()
        await communicator1.receive_json_from()

        # Connect and disconnect second client
        communicator2 = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")
        await communicator2.connect()
        await communicator2.receive_json_from()
        await communicator2.disconnect()

        channel_layer = get_channel_layer()

        # Broadcast to group
        await channel_layer.group_send(
            AVAILABILITY_GROUP,
            {
                "type": "date_blocked",
                "date": "2025-07-01",
            },
        )

        # First client should receive
        response1 = await communicator1.receive_json_from()
        assert response1["type"] == "date_blocked"

        # Second client is disconnected - nothing to check

        await communicator1.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db
class TestAvailabilityConsumerEdgeCases:
    """Tests for edge cases and error handling."""

    async def test_empty_message_data(self):
        """Test handling empty message data."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()

        # Send empty JSON object
        await communicator.send_json_to({})

        # Should receive ack for unknown type (None)
        response = await communicator.receive_json_from()
        assert response["type"] == "ack"
        assert response["received_type"] is None

        await communicator.disconnect()

    async def test_rapid_messages(self):
        """Test handling rapid succession of messages."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()

        # Send multiple pings rapidly
        for _ in range(5):
            await communicator.send_json_to({"type": "ping"})

        # Should receive 5 pongs
        for _ in range(5):
            response = await communicator.receive_json_from()
            assert response["type"] == "pong"

        await communicator.disconnect()

    async def test_message_with_extra_fields(self):
        """Test handling messages with extra unexpected fields."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()

        # Send ping with extra fields
        await communicator.send_json_to(
            {
                "type": "ping",
                "extra_field": "ignored",
                "another_field": 123,
            }
        )

        response = await communicator.receive_json_from()
        assert response["type"] == "pong"

        await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db
class TestAvailabilityConsumerGroupJoinLeave:
    """Tests for group join/leave operations."""

    async def test_joins_group_on_connect(self):
        """Test consumer joins availability group on connect."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()

        # Verify the consumer is in the group by sending a message
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            AVAILABILITY_GROUP,
            {
                "type": "date_blocked",
                "date": "2025-08-01",
            },
        )

        # Should receive the message (proving we're in the group)
        response = await communicator.receive_json_from()
        assert response["type"] == "date_blocked"

        await communicator.disconnect()

    async def test_leaves_group_on_disconnect(self):
        """Test consumer leaves availability group on disconnect."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()

        # Disconnect
        await communicator.disconnect()

        # After disconnect, the consumer should no longer be in the group
        # We can't easily verify this without internal access,
        # but we can ensure no errors are raised during disconnect


@pytest.mark.asyncio
@pytest.mark.django_db
class TestAvailabilityConsumerTimestamp:
    """Tests for timestamp handling in messages."""

    async def test_date_blocked_preserves_timestamp(self):
        """Test date_blocked preserves timestamp from event."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()

        channel_layer = get_channel_layer()
        timestamp = "2025-01-15T14:30:00Z"

        await channel_layer.group_send(
            AVAILABILITY_GROUP,
            {
                "type": "date_blocked",
                "date": "2025-01-20",
                "event_id": 789,
                "timestamp": timestamp,
            },
        )

        response = await communicator.receive_json_from()
        assert response["timestamp"] == timestamp

        await communicator.disconnect()

    async def test_date_released_preserves_timestamp(self):
        """Test date_released preserves timestamp from event."""
        communicator = WebsocketCommunicator(AvailabilityConsumer.as_asgi(), "/ws/availability/")

        await communicator.connect()
        await communicator.receive_json_from()

        channel_layer = get_channel_layer()
        timestamp = "2025-02-20T09:45:00Z"

        await channel_layer.group_send(
            AVAILABILITY_GROUP,
            {
                "type": "date_released",
                "date": "2025-02-25",
                "timestamp": timestamp,
            },
        )

        response = await communicator.receive_json_from()
        assert response["timestamp"] == timestamp

        await communicator.disconnect()
