# backend/core/domains/events/consumers.py
"""
Availability WebSocket Consumer

Provides real-time availability updates for booking calendars.
This is a PUBLIC WebSocket - no authentication required.

Use Case:
- When Client A completes payment and blocks a date
- Client B's calendar instantly receives the update
- Prevents Client B from attempting to book an unavailable date
"""

import json
import logging
import time
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

# Group name for all availability subscribers
AVAILABILITY_GROUP = 'availability_updates'

# Rate limiting settings
MAX_MESSAGES_PER_SECOND = 10
MAX_MESSAGE_SIZE = 65536  # 64KB max message size


class AvailabilityConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time date availability updates.

    This consumer is PUBLIC (no authentication) because:
    1. Availability data is not sensitive
    2. Clients need updates even before login/registration
    3. Reduces friction in the booking flow

    Message Types Received:
    - ping: Heartbeat check
    - subscribe_date: Subscribe to specific date updates (optional)

    Message Types Sent:
    - connection_established: Successful connection
    - date_blocked: A date has been blocked
    - date_released: A date has been released
    - pong: Heartbeat response
    """

    async def connect(self):
        """
        Handle WebSocket connection.
        No authentication required - public endpoint.
        """
        # Initialize rate limiting state
        self.message_count = 0
        self.rate_limit_window_start = time.time()

        # Join the global availability updates group
        self.group_name = AVAILABILITY_GROUP

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        # Send connection success message
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to availability updates'
        }))

        logger.debug(f"Availability WebSocket connected: {self.channel_name}")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Leave the availability group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

        logger.debug(f"Availability WebSocket disconnected: {self.channel_name} (code: {close_code})")

    def _check_rate_limit(self):
        """Check if the connection is within rate limits. Returns True if allowed."""
        current_time = time.time()

        # Reset counter if window has passed
        if current_time - self.rate_limit_window_start >= 1.0:
            self.message_count = 0
            self.rate_limit_window_start = current_time

        self.message_count += 1
        return self.message_count <= MAX_MESSAGES_PER_SECOND

    async def receive(self, text_data):
        """
        Handle incoming WebSocket messages.

        Currently supports:
        - ping: Heartbeat check (important for mobile apps)
        """
        # Check message size limit
        if len(text_data) > MAX_MESSAGE_SIZE:
            logger.warning(f"WebSocket message too large: {len(text_data)} bytes")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Message too large'
            }))
            return

        # Check rate limit
        if not self._check_rate_limit():
            logger.warning(f"WebSocket rate limit exceeded for {self.channel_name}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Rate limit exceeded'
            }))
            return

        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'ping':
                # Respond to heartbeat
                await self.send(text_data=json.dumps({'type': 'pong'}))
            else:
                # Unknown message type - just acknowledge
                await self.send(text_data=json.dumps({
                    'type': 'ack',
                    'received_type': message_type
                }))

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error in AvailabilityConsumer.receive: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Error processing message'
            }))

    # === Group Message Handlers ===
    # These are called when messages are broadcast to the group

    async def date_blocked(self, event):
        """
        Handle date_blocked broadcast.

        Sent when a date becomes unavailable due to:
        - Successful payment blocking the date
        - Admin manually blocking the date

        Event structure:
        {
            'type': 'date_blocked',
            'date': '2025-03-15',
            'event_id': 123,  # The event that blocked it
            'reason': 'PAYMENT_COMPLETED'  # Optional
        }
        """
        await self.send(text_data=json.dumps({
            'type': 'date_blocked',
            'date': event.get('date'),
            'event_id': event.get('event_id'),
            'reason': event.get('reason', 'PAYMENT_COMPLETED'),
            'timestamp': event.get('timestamp')
        }))

        logger.debug(f"Sent date_blocked for {event.get('date')} to {self.channel_name}")

    async def date_released(self, event):
        """
        Handle date_released broadcast.

        Sent when a date becomes available again due to:
        - Event cancellation
        - Reservation timeout
        - Admin releasing the date

        Event structure:
        {
            'type': 'date_released',
            'date': '2025-03-15',
            'reason': 'EVENT_CANCELLED'  # Optional
        }
        """
        await self.send(text_data=json.dumps({
            'type': 'date_released',
            'date': event.get('date'),
            'reason': event.get('reason', 'RELEASED'),
            'timestamp': event.get('timestamp')
        }))

        logger.debug(f"Sent date_released for {event.get('date')} to {self.channel_name}")

    async def reservation_created(self, event):
        """
        Handle reservation_created broadcast (optional).

        Sent when a temporary reservation is created.
        This informs other clients that a date is being held
        during someone else's payment process.

        Event structure:
        {
            'type': 'reservation_created',
            'date': '2025-03-15',
            'expires_at': '2025-03-15T10:05:00Z'
        }
        """
        await self.send(text_data=json.dumps({
            'type': 'reservation_created',
            'date': event.get('date'),
            'expires_at': event.get('expires_at'),
            'timestamp': event.get('timestamp')
        }))

    async def reservation_released(self, event):
        """
        Handle reservation_released broadcast (optional).

        Sent when a temporary reservation expires or is released.
        This informs other clients that the date is available again.

        Event structure:
        {
            'type': 'reservation_released',
            'date': '2025-03-15',
            'reason': 'EXPIRED' or 'PAYMENT_FAILED' or 'USER_CANCELLED'
        }
        """
        await self.send(text_data=json.dumps({
            'type': 'reservation_released',
            'date': event.get('date'),
            'reason': event.get('reason', 'RELEASED'),
            'timestamp': event.get('timestamp')
        }))
